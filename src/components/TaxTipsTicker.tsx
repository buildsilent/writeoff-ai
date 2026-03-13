'use client';

import { useState, useEffect } from 'react';

const TAX_TIPS = [
  'Did you know? Your home office can be up to 100% deductible',
  'Freelancers miss an average of $2,400 in deductions per year',
  'Meals with clients are 50% tax deductible',
  'Software and subscriptions used for work are 100% deductible',
  'Track every business mile — the IRS loves documentation',
  'Health insurance premiums are deductible for self-employed',
  'Equipment under $2,500 can often be deducted in year one',
  'Phone and internet: deduct your business-use percentage',
  'Continuing education for your business is fully deductible',
  'Gifts to clients are deductible up to $25 per person per year',
];

export function TaxTipsTicker() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % TAX_TIPS.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-y border-white/[0.06] bg-white/[0.02] py-3">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p
          className={`text-center text-sm text-zinc-400 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}
        >
          💡 {TAX_TIPS[index]}
        </p>
      </div>
    </div>
  );
}
