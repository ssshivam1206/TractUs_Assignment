'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-[1.25rem] border border-slate-200 bg-white/85 p-4 shadow-sm ${className}`}>
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-4 h-8 w-2/3 rounded-2xl" />
      <Skeleton className="mt-3 h-4 w-full rounded-full" />
      <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[1.1fr_1.1fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 rounded-[1.1rem] border border-slate-200 bg-white/80 px-5 py-4 sm:px-6"
        >
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTimeline({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-[1.25rem] border border-slate-200 bg-white/85 p-4 shadow-sm">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="mt-4 h-5 w-5/6 rounded-2xl" />
          <Skeleton className="mt-3 h-4 w-full rounded-full" />
          <Skeleton className="mt-2 h-4 w-2/3 rounded-full" />
        </div>
      ))}
    </div>
  );
}
