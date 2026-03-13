const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxsnapper.com';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'TaxSnapper',
  url: appUrl,
  description:
    'AI-powered receipt scanner that finds and categorizes tax deductions for freelancers, creators, and small business owners.',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
