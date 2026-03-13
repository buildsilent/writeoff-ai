// IRS Schedule C category emoji mapping
export const IRS_CATEGORY_EMOJI: Record<string, string> = {
  'Meals & Entertainment': '🍽️',
  'Meals and Entertainment': '🍽️',
  'Home Office': '🏠',
  'Travel': '✈️',
  'Vehicle & Mileage': '🚗',
  'Vehicle and Mileage': '🚗',
  'Software & Subscriptions': '💻',
  'Software and Subscriptions': '💻',
  'Advertising & Marketing': '📢',
  'Advertising and Marketing': '📢',
  'Office Supplies': '📦',
  'Professional Services': '⚖️',
  'Phone & Internet': '📱',
  'Phone and Internet': '📱',
  'Health Insurance': '🏥',
};

export function getCategoryEmoji(irsCategory: string | null): string {
  if (!irsCategory) return '';
  for (const [key, emoji] of Object.entries(IRS_CATEGORY_EMOJI)) {
    if (irsCategory.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '📄';
}

export function getConfidenceLabel(confidence: number): 'High' | 'Medium' | 'Low' {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-[#4F46E5]';
  if (confidence >= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}
