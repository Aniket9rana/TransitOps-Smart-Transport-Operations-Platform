import type { CostliestVehicle } from "@/lib/metrics";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Horizontal cost bars — length ∝ operational cost. The costliest vehicle is
 * flagged red (attention), the rest amber. Each bar is directly labelled with
 * vehicle name + cost, so identity never relies on colour alone.
 */
export function CostliestVehicles({ vehicles }: { vehicles: CostliestVehicle[] }) {
  const withCost = vehicles.filter((v) => v.operational > 0);

  if (withCost.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No operational costs recorded yet.
      </p>
    );
  }

  const max = Math.max(...withCost.map((v) => v.operational));

  return (
    <div className="flex flex-col gap-3">
      {withCost.map((row, index) => {
        const pct = max === 0 ? 0 : Math.round((row.operational / max) * 100);
        const isTop = index === 0;
        return (
          <div key={row.vehicle.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{row.vehicle.name}</span>
              <span className="text-muted-foreground">{formatINR(row.operational)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  isTop ? "bg-status-red" : "bg-status-orange"
                )}
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
