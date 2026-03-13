import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'View your tax deduction insights, total deductions, and estimated tax savings. TaxSnapper — Find Hidden Tax Deductions Instantly.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
