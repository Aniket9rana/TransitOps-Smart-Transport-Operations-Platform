export type StatusColorToken = "green" | "blue" | "orange" | "gray" | "red";

export const STATUS_COLOR_HEX: Record<StatusColorToken, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  orange: "#f97316",
  gray: "#6b7280",
  red: "#ef4444",
};

type StatusKey =
  // VehicleStatus / DriverStatus
  | "AVAILABLE"
  | "ON_TRIP"
  | "IN_SHOP"
  | "RETIRED"
  | "OFF_DUTY"
  | "SUSPENDED"
  // TripStatus
  | "DRAFT"
  | "DISPATCHED"
  | "COMPLETED"
  | "CANCELLED"
  // MaintenanceStatus
  | "ACTIVE";

/**
 * Single source of truth mapping every status enum value (across Vehicle,
 * Driver, Trip, and Maintenance) to its display label and color token.
 * Values that mean the same real-world state share the same color
 * (e.g. AVAILABLE and COMPLETED are both "green").
 */
export const STATUS_MAP: Record<StatusKey, { label: string; color: StatusColorToken }> = {
  AVAILABLE: { label: "Available", color: "green" },
  COMPLETED: { label: "Completed", color: "green" },
  ON_TRIP: { label: "On Trip", color: "blue" },
  DISPATCHED: { label: "Dispatched", color: "blue" },
  IN_SHOP: { label: "In Shop", color: "orange" },
  SUSPENDED: { label: "Suspended", color: "orange" },
  ACTIVE: { label: "Active", color: "orange" },
  OFF_DUTY: { label: "Off Duty", color: "gray" },
  DRAFT: { label: "Draft", color: "gray" },
  RETIRED: { label: "Retired", color: "red" },
  CANCELLED: { label: "Cancelled", color: "red" },
};

export function getStatusInfo(status: string) {
  return (
    STATUS_MAP[status as StatusKey] ?? { label: status, color: "gray" as StatusColorToken }
  );
}
