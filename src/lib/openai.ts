import OpenAI from 'openai';

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey: key });
}

export interface ReceiptAnalysis {
  merchant_name: string;
  amount: number;
  date: string;
  category: string;
  is_deductible: boolean;
  irs_category: string | null;
  confidence: number;
}

const ANALYSIS_PROMPT = `You are a tax deduction expert. Analyze this receipt (image or text) and extract:

Return a JSON object with exactly these fields (no markdown, no extra text):
{
  "merchant_name": "string - business name",
  "amount": number - total amount in dollars,
  "date": "YYYY-MM-DD" or null if not found,
  "category": "string - e.g. Office Supplies, Meals, Travel, Equipment",
  "is_deductible": boolean - true if this purchase is typically tax deductible for business/self-employed,
  "irs_category": "string or null - IRS category if deductible (e.g. 'Section 162 - Ordinary Business Expenses', 'Meals and Entertainment - 50% deductible')",
  "confidence": number 0-1
}

Common deductible categories: Office supplies, business meals (50%), travel, equipment, software, professional services, home office.`;

export async function analyzeReceiptImage(base64Image: string): Promise<ReceiptAnalysis> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: ANALYSIS_PROMPT,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned) as ReceiptAnalysis;
}

export async function analyzeReceiptText(text: string): Promise<ReceiptAnalysis> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Receipt text:\n${text}\n\n${ANALYSIS_PROMPT}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned) as ReceiptAnalysis;
}
