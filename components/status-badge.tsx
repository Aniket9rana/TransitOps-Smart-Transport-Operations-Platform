import { Badge } from "@/components/ui/badge";
import { getStatusInfo, type StatusColorToken } from "@/lib/status";
import { cn } from "@/lib/utils";

const COLOR_CLASSES: Record<StatusColorToken, string> = {
  green: "bg-status-green/15 text-status-green border-status-green/30",
  blue: "bg-status-blue/15 text-status-blue border-status-blue/30",
  orange: "bg-status-orange/15 text-status-orange border-status-orange/30",
  gray: "bg-status-gray/15 text-status-gray border-status-gray/30",
  red: "bg-status-red/15 text-status-red border-status-red/30",
};

const DOT_CLASSES: Record<StatusColorToken, string> = {
  green: "bg-status-green",
  blue: "bg-status-blue",
  orange: "bg-status-orange",
  gray: "bg-status-gray",
  red: "bg-status-red",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { label, color } = getStatusInfo(status);

  return (
    <Badge
      variant="outline"
      className={cn(COLOR_CLASSES[color], className)}
    >
      <span className={cn("size-1.5 rounded-full", DOT_CLASSES[color])} />
      {label}
    </Badge>
  );
}
