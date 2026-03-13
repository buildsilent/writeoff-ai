import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Go Pro',
  description:
    'Unlock unlimited receipt scans with TaxSnapper Pro. Find every tax deduction.',
};

export default function GoProLayout({ children }: { children: React.ReactNode }) {
  return children;
}
