import { Card } from "@/components/ui/card";
import type { StatusColorToken } from "@/lib/status";
import { cn } from "@/lib/utils";

const ACCENT_BORDER_CLASSES: Record<StatusColorToken, string> = {
  green: "border-l-status-green",
  blue: "border-l-status-blue",
  orange: "border-l-status-orange",
  gray: "border-l-status-gray",
  red: "border-l-status-red",
};

export function KpiCard({
  label,
  value,
  accent = "gray",
  className,
}: {
  label: string;
  value: string | number;
  accent?: StatusColorToken;
  className?: string;
}) {
  return (
    <Card
      className={cn("border-l-4", ACCENT_BORDER_CLASSES[accent], className)}
    >
      <div className="px-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </Card>
  );
}
