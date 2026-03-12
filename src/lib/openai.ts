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
}

export interface ReceiptAnalysis {
  merchant_name: string;
  date: string | null;
  total_amount: number;
  line_items: LineItemAnalysis[];
}

const ANALYSIS_PROMPT = `You are a senior CPA with 20 years of experience specializing in Schedule C and self-employment taxes. You are analyzing receipts for real people whose money depends on your accuracy. ACCURACY IS NON-NEGOTIABLE.

CRITICAL RULES—FOLLOW EXACTLY:
1. Extract EVERY SINGLE line item from the receipt. Never skip an item. Never lump items together. Each product, service, or line = its own line item. Missing a deduction costs the taxpayer real money.
2. Assign the EXACT IRS Schedule C category for each item. Use only the categories listed below.
3. State the EXACT deduction percentage: 100% for most business expenses, 50% for business meals/entertainment (IRC §274(n)), 0% for personal/non-deductible items.
4. Give a confidence score 0.0–1.0 based on receipt clarity and applicable tax rules. Be conservative if uncertain.
5. Explain WHY each item is or isn't deductible in plain English. Reference IRS rules when relevant (e.g., "50% deductible under IRC §274(n) for business meals").
6. Never miss a deduction. When in doubt about business use, err toward identifying it as potentially deductible with lower confidence rather than missing it entirely.
7. Do NOT simply repeat receipt text. ANALYZE each item through a senior CPA lens. Provide actionable tax guidance.

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

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{
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
      "explanation": "Plain English explanation of why deductible or not"
    }
  ]
}

If the receipt has only one line or a single total with no breakdown, create one line item with that total.`;

export async function analyzeReceiptImage(base64Image: string): Promise<ReceiptAnalysis> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a senior CPA with 20 years of experience. Extract every line item, assign exact IRS categories, state deduction percentages, and explain in plain English. Return only valid JSON. Accuracy is non-negotiable—this is people\'s real money.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
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

export async function analyzeReceiptText(text: string): Promise<ReceiptAnalysis> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a senior CPA with 20 years of experience. Extract every line item, assign exact IRS categories, state deduction percentages, and explain in plain English. Return only valid JSON. Accuracy is non-negotiable—this is people\'s real money.',
      },
      {
        role: 'user',
        content: `Receipt text to analyze:\n\n${text}\n\n${ANALYSIS_PROMPT}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return normalizeAnalysis(parsed);
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
  };
}
