import type { VehicleStatusBreakdown } from "@/lib/metrics";
import { VehicleStatus } from "@/lib/generated/prisma/enums";
import type { StatusColorToken } from "@/lib/status";
import { cn } from "@/lib/utils";

const ROWS: { status: VehicleStatus; label: string; color: StatusColorToken }[] = [
  { status: VehicleStatus.AVAILABLE, label: "Available", color: "green" },
  { status: VehicleStatus.ON_TRIP, label: "On Trip", color: "blue" },
  { status: VehicleStatus.IN_SHOP, label: "In Shop", color: "orange" },
  { status: VehicleStatus.RETIRED, label: "Retired", color: "red" },
];

const BAR_CLASSES: Record<StatusColorToken, string> = {
  green: "bg-status-green",
  blue: "bg-status-blue",
  orange: "bg-status-orange",
  gray: "bg-status-gray",
  red: "bg-status-red",
};

export function VehicleStatusBars({
  breakdown,
}: {
  breakdown: VehicleStatusBreakdown;
}) {
  const total = ROWS.reduce((sum, row) => sum + breakdown[row.status], 0);

  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No vehicles match these filters.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {ROWS.map((row) => {
        const count = breakdown[row.status];
        const pct = total === 0 ? 0 : Math.round((count / total) * 100);
        return (
          <div key={row.status} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-foreground">
                {count}
                <span className="ml-1 text-xs text-muted-foreground">({pct}%)</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", BAR_CLASSES[row.color])}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
