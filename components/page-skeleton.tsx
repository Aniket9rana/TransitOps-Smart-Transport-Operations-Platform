import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/**
 * Generic loading skeleton for data-heavy routes: a header, a KPI row, and a
 * content block. Rendered by each segment's loading.tsx during data fetch.
 */
export function PageSkeleton({ kpis = 4 }: { kpis?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Shimmer className="h-7 w-48" />
        <Shimmer className="h-4 w-64" />
      </div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(kpis, 4)}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: kpis }).map((_, i) => (
          <Shimmer key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Shimmer className="h-72 lg:col-span-2" />
        <Shimmer className="h-72" />
      </div>
    </div>
  );
}
