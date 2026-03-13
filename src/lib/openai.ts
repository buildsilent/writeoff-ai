import OpenAI from 'openai';

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey: key });
}

export interface LineItemAnalysis {
  description: string;
  amount: number;
  irs_category: string;
  deduction_percent: number;
  is_deductible: boolean;
  confidence: number;
  explanation: string;
  needs_more_context?: boolean;
}

export interface ReceiptAnalysis {
  merchant_name: string;
  date: string | null;
  total_amount: number;
  line_items: LineItemAnalysis[];
  read_successfully?: boolean;
}

const CPA_SYSTEM = `You are a senior CPA with 20 years of experience specializing in Schedule C deductions for freelancers, content creators, gig workers, and small business owners. You are analyzing receipts for real people whose money depends on your accuracy. ACCURACY IS NON-NEGOTIABLE — this is people's real money.

CRITICAL RULES — FOLLOW EXACTLY:
1. Extract EVERY line item individually. Never group unrelated items together. Each product or service = its own line item. Missing a deduction costs the taxpayer real money.
2. Assign the EXACT IRS Schedule C category for each item. Use only the categories listed below.
3. State the EXACT deduction percentage: 100% for most business expenses, 50% for business meals/entertainment (IRC §274(n)), 0% for personal/non-deductible items.
4. Explain in plain English WHY each item is or isn't deductible. Include the specific IRS code reference when relevant (e.g., "50% deductible under IRC §274(n) for business meals").
5. Give a confidence score 0.0–1.0 for each item based on clarity and applicable tax rules.
6. Flag items that need more context from the user: set "needs_more_context": true when you cannot determine deductibility without additional information (e.g., business vs personal use unclear).
7. Never miss a deduction. When in doubt about business use, err toward identifying it as potentially deductible with lower confidence rather than missing it entirely.
8. Do NOT simply repeat receipt text. ANALYZE each item through a senior CPA lens.

IRS Schedule C categories (use exactly these names):
- Office Supplies (100%)
- Meals & Entertainment (50% - client/business meals)
- Travel (100% - transportation, lodging while away)
- Vehicle & Mileage (100% or actual expenses)
- Software & Subscriptions (100%)
- Advertising & Marketing (100%)
- Professional Services (100%)
- Phone & Internet (100% business portion)
- Home Office (100% allocable portion)
- Health Insurance (100% for self-employed)
- Equipment (100%, may need to depreciate)
- Not Deductible (personal items, commuting)

Return ONLY valid JSON (no markdown):`;

const IMAGE_PROMPT = `${CPA_SYSTEM}
{
  "read_successfully": true or false,
  "merchant_name": "string",
  "date": "YYYY-MM-DD or null",
  "total_amount": number,
  "line_items": [
    {
      "description": "exact item from receipt",
      "amount": number,
      "irs_category": "IRS category name",
      "deduction_percent": 100 or 50 or 0,
      "is_deductible": true or false,
      "confidence": 0.0 to 1.0,
      "explanation": "Plain English explanation with IRS reference when relevant",
      "needs_more_context": true or false (only if critical info missing)
    }
  ]
}

Set "read_successfully": false ONLY when the image is blurry, too dark, rotated, or otherwise unreadable. If you can extract any items, set true.`;

const TEXT_PROMPT = `${CPA_SYSTEM}
If you need ONE critical piece of information to determine deductibility (e.g., "Was this for business or personal use?"), include "follow_up_question" and minimal line_items. Otherwise return full analysis.
{
  "follow_up_question": "optional - only if critical info missing, e.g. Was this purchase for your business or personal use?",
  "merchant_name": "string",
  "date": "YYYY-MM-DD or null",
  "total_amount": number,
  "line_items": [
    {
      "description": "item description",
      "amount": number,
      "irs_category": "IRS category name",
      "deduction_percent": 100 or 50 or 0,
      "is_deductible": true or false,
      "confidence": 0.0 to 1.0,
      "explanation": "Plain English explanation with IRS reference when relevant",
      "needs_more_context": true or false
    }
  ]
}

Convert the user's plain English into properly formatted line items. Infer merchant, date, and amounts from their description.`;

const FOLLOW_UP_PROMPT = `The user previously said: "{text}"
They answered your follow-up: "{answer}"

Using both, generate the complete receipt analysis. Return the same JSON format.`;

export async function analyzeReceiptImage(base64Image: string): Promise<ReceiptAnalysis> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a senior CPA. Extract every line item, assign exact IRS Schedule C categories, state deduction percentages, explain in plain English with IRS codes. Set read_successfully false only when image is unreadable. Return only valid JSON.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: IMAGE_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return normalizeAnalysis(parsed);
}

export async function analyzeReceiptText(
  text: string,
  followUpAnswer?: string
): Promise<{ result: ReceiptAnalysis; followUpQuestion?: string }> {
  const openai = getOpenAI();
  const userContent = followUpAnswer
    ? FOLLOW_UP_PROMPT.replace('{text}', text).replace('{answer}', followUpAnswer)
    : `User's plain English receipt description:\n\n"${text}"\n\n${TEXT_PROMPT}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a senior CPA. Convert plain English to receipt line items. If critical information is missing to determine deductibility (e.g., business vs personal use), return a single follow-up question. Ask maximum ONE question. Never ask for non-essential info. Return only valid JSON.',
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (parsed.follow_up_question) {
    return {
      result: normalizeAnalysis(parsed),
      followUpQuestion: String(parsed.follow_up_question),
    };
  }

  return { result: normalizeAnalysis(parsed) };
}

function normalizeAnalysis(parsed: Record<string, unknown>): ReceiptAnalysis {
  const lineItems = Array.isArray(parsed.line_items) ? parsed.line_items : [];
  const normalized = lineItems.map((item: Record<string, unknown>) => ({
    description: String(item.description ?? ''),
    amount: Number(item.amount ?? 0),
    irs_category: String(item.irs_category ?? 'Other'),
    deduction_percent: Number(item.deduction_percent ?? 0),
    is_deductible: Boolean(item.is_deductible),
    confidence: Math.min(1, Math.max(0, Number(item.confidence ?? 0.5))),
    explanation: String(item.explanation ?? ''),
    needs_more_context: Boolean(item.needs_more_context),
  }));

  const totalAmount = normalized.reduce((sum, i) => sum + i.amount, 0) || Number(parsed.total_amount ?? parsed.amount ?? 0);

  return {
    merchant_name: String(parsed.merchant_name ?? 'Unknown'),
    date: parsed.date ? String(parsed.date) : null,
    total_amount: totalAmount,
    line_items: normalized.length > 0 ? normalized : [{
      description: 'Receipt total',
      amount: totalAmount,
      irs_category: 'Other',
      deduction_percent: 0,
      is_deductible: false,
      confidence: 0.5,
      explanation: 'Unable to parse line items.',
    }],
    read_successfully: parsed.read_successfully !== false,
  };
}
