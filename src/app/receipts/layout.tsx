import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Receipts',
  description:
    'View and manage your scanned receipts. TaxSnapper — Find Hidden Tax Deductions Instantly.',
};

export default function ReceiptsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
