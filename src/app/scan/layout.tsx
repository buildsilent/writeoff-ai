import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scan Receipt',
  description:
    'Snap a photo or type your receipt — AI finds every tax deduction. TaxSnapper for freelancers and small business owners.',
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
