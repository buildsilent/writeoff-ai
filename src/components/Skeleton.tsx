'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[8px] bg-white/[0.06] ${className}`}
      aria-hidden
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex-1 w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-[16px]" />
        <Skeleton className="h-28 rounded-[16px]" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-14 w-24 rounded-[12px]" />
        <Skeleton className="h-14 w-40 rounded-[12px]" />
      </div>
      <Skeleton className="h-20 w-full rounded-[12px]" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-[12px]" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-[12px]" />
    </div>
  );
}

export function ReceiptsSkeleton() {
  return (
    <div className="mx-auto flex-1 w-full max-w-4xl space-y-4 px-4 py-8 sm:px-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-12 w-full rounded-[12px]" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}

export function ScanSkeleton() {
  return (
    <div className="mx-auto flex-1 max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Skeleton className="h-[320px] rounded-[12px]" />
        <Skeleton className="h-[320px] rounded-[12px]" />
      </div>
    </div>
  );
}
