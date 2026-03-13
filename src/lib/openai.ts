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
  audit_risk_score?: number; // 0-100, higher = IRS scrutinizes more; common triggers: home office >50%, meals >$10k/yr, vehicle 100% business
}

export interface ReceiptAnalysis {
  merchant_name: string;
  date: string | null;
  total_amount: number;
  line_items: LineItemAnalysis[];
  read_successfully?: boolean;
}

const CPA_SYSTEM = `You are a senior CPA with 20 years of experience specializing in Schedule C deductions for freelancers, content creators, gig workers, and small business owners. You are analyzing receipts for real people whose money depends on your accuracy. ACCURACY IS NON-NEGOTIABLE — this is people's real money. All rules below are current for TAX YEAR 2025.

EXTRACT EVERY LINE ITEM INDIVIDUALLY. Never group unrelated items. Each product or service = its own line item. Missing a deduction costs the taxpayer real money.

EXACT IRS DEDUCTION RULES (2025) — APPLY PRECISELY:
- Meals & Entertainment: 50% deductible when business purpose is documented (IRC §274(n)). 100% deductible for company events (e.g., holiday party, team lunch for employees only). Document: who, what, when, business purpose.
- Home Office: Calculate both simplified ($5/sqft up to 300 sqft max = $1,500) and actual expense (rent, utilities, insurance × business %). Show which saves more. Requires exclusive and regular use.
- Vehicle & Mileage: 2025 IRS standard mileage rate = 70 cents per mile. Track business vs personal mileage. 100% business use commonly triggers audit — flag if no personal use documented.
- Software & Subscriptions: 100% deductible if used for business.
- Phone & Internet: Percentage deductible based on business-use percentage (e.g., 70% business = 70% deductible).
- Travel: 100% deductible for business travel — must be overnight and away from tax home. Transportation, lodging, 50% of meals while traveling. Commuting is NOT deductible.
- Education: Deductible if maintains or improves skills for current job (not for new career).
- Health Insurance: 100% deductible for self-employed (Schedule 1).
- Retirement (SEP-IRA): Up to 25% of net self-employment income deductible.
- Startup Costs: Up to $5,000 deductible in first year (IRC §195).
- Office Supplies, Advertising, Professional Services: 100% when business-related.
- Gifts: Up to $25 per person per year. Document recipient and business purpose.
- Equipment: 100% deductible; Section 179 may allow full deduction under $2,500; larger items may need depreciation.
- Not Deductible: Personal items, commuting, entertainment (no business discussion).

AUDIT PROTECTION — For each line item, set "audit_risk_score" 0-100:
- 0-20: Low (routine office supplies, software, travel)
- 21-50: Medium (meals, phone %, home office)
- 51-80: Higher (vehicle 100% business, home office >50% of home, large equipment)
- 81-100: Highest (meals >$10k/year aggregate, aggressive home office, unusual categories)
Show friendly warnings for score ≥ 50: "IRS scrutinizes this category — ensure you have documentation."

SMART QUESTIONS — If you need ONE critical piece of info to determine deductibility, ask maximum ONE question. Examples:
- Meal: "Was this a business meal? If yes, who did you meet with and what was the business purpose?"
- Electronics: "What percentage of the time do you use this for business?"
- Home expenses: "Do you have a dedicated home office space used exclusively for business?"
Store answers mentally for future accuracy. Ask only when necessary.

OUTPUT RULES:
- Assign EXACT IRS Schedule C category from the list below.
- State EXACT deduction_percent: 100, 50, or 0 (or actual business-use % for phone/internet).
- Explain in plain English with IRS code when relevant.
- Confidence 0.0–1.0 based on receipt clarity and applicable rules.
- needs_more_context: true ONLY when one smart question would resolve deductibility.
- Never miss a deduction. When uncertain, err toward potentially deductible with lower confidence.

IRS Schedule C categories (use exactly these names):
Office Supplies, Meals & Entertainment, Travel, Vehicle & Mileage, Software & Subscriptions, Advertising & Marketing, Professional Services, Phone & Internet, Home Office, Health Insurance, Equipment, Education, Retirement Contributions, Startup Costs, Gifts to Clients, Not Deductible

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
      "deduction_percent": 100 or 50 or 0 or business-use %,
      "is_deductible": true or false,
      "confidence": 0.0 to 1.0,
      "explanation": "Plain English explanation with IRS reference when relevant",
      "needs_more_context": true or false,
      "audit_risk_score": 0 to 100
    }
  ]
}

Set "read_successfully": false ONLY when the image is blurry, too dark, rotated, or otherwise unreadable.`;

function withCategoryHint(prompt: string, hint?: string): string {
  if (!hint || hint === 'not_sure') return prompt;
  return `${prompt}\n\nADDITIONAL CONTEXT (user indicated purchase type - use to improve categorization): "${hint}"`;
}

const TEXT_PROMPT = `${CPA_SYSTEM}
If you need ONE critical piece of information to determine deductibility, include "follow_up_question" and minimal line_items. Otherwise return full analysis.
{
  "follow_up_question": "optional - ONE smart question only if critical info missing",
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
      "needs_more_context": true or false,
      "audit_risk_score": 0 to 100
    }
  ]
}

Convert the user's plain English into properly formatted line items. Infer merchant, date, and amounts.`;

const FOLLOW_UP_PROMPT = `The user previously said: "{text}"
They answered your follow-up: "{answer}"

Using both, generate the complete receipt analysis. Return the same JSON format.`;

export async function analyzeReceiptImage(base64Image: string, hint?: string): Promise<ReceiptAnalysis> {
  const openai = getOpenAI();
  const prompt = withCategoryHint(IMAGE_PROMPT, hint);
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
          { type: 'text', text: prompt },
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
  followUpAnswer?: string,
  hint?: string
): Promise<{ result: ReceiptAnalysis; followUpQuestion?: string }> {
  const openai = getOpenAI();
  const prompt = withCategoryHint(TEXT_PROMPT, hint);
  const userContent = followUpAnswer
    ? FOLLOW_UP_PROMPT.replace('{text}', text).replace('{answer}', followUpAnswer)
    : `User's plain English receipt description:\n\n"${text}"\n\n${prompt}`;

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

export async function* analyzeReceiptImageStream(
  base64Image: string,
  hint?: string
): AsyncGenerator<ReceiptAnalysis> {
  const openai = getOpenAI();
  const prompt = withCategoryHint(IMAGE_PROMPT, hint);
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    stream: true,
    messages: [
      { role: 'system', content: 'You are a senior CPA. Return only valid JSON. No markdown.' },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
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

  let content = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    content += delta;
  }
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned || '{}');
  yield normalizeAnalysis(parsed);
}

export async function* analyzeReceiptTextStream(
  text: string,
  followUpAnswer?: string,
  hint?: string
): AsyncGenerator<{ result: ReceiptAnalysis; followUpQuestion?: string }> {
  const openai = getOpenAI();
  const prompt = withCategoryHint(TEXT_PROMPT, hint);
  const userContent = followUpAnswer
    ? FOLLOW_UP_PROMPT.replace('{text}', text).replace('{answer}', followUpAnswer)
    : `User's plain English receipt description:\n\n"${text}"\n\n${prompt}`;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    stream: true,
    messages: [
      { role: 'system', content: 'You are a senior CPA. Return only valid JSON. No markdown.' },
      { role: 'user', content: userContent },
    ],
  });

  let content = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    content += delta;
  }
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned || '{}');

  if (parsed.follow_up_question) {
    yield { result: normalizeAnalysis(parsed), followUpQuestion: String(parsed.follow_up_question) };
  } else {
    yield { result: normalizeAnalysis(parsed) };
  }
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
    audit_risk_score: typeof item.audit_risk_score === 'number' ? Math.min(100, Math.max(0, item.audit_risk_score)) : undefined,
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
