import Link from 'next/link';
import { Header } from '@/components/Header';
import { Check } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#080B14]">
      <Header />
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4F46E5]/20">
            <Check className="h-8 w-8 text-[#4F46E5]" />
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-white">
          You&apos;re now a Pro member!
        </h1>
        <p className="mt-2 text-zinc-500">
          Enjoy unlimited receipt scans and all Pro features.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary mt-8 inline-flex rounded-xl bg-[#4F46E5] px-8 py-3.5 font-bold text-white"
        >
          Back to dashboard
        </Link>
      </main>
    </div>
  );
}
