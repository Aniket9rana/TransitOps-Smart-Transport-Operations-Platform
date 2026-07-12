"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VehicleType, VehicleStatus } from "@/lib/generated/prisma/enums";

const TYPE_LABELS: Record<VehicleType, string> = {
  VAN: "Van",
  TRUCK: "Truck",
  MINI: "Mini",
  BUS: "Bus",
  CAR: "Car",
};

const STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  IN_SHOP: "In Shop",
  RETIRED: "Retired",
};

const ALL = "ALL";

export function DashboardFilters({ regions }: { regions: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const type = searchParams.get("type") ?? ALL;
  const status = searchParams.get("status") ?? ALL;
  const region = searchParams.get("region") ?? ALL;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={type} onValueChange={(v) => v && setParam("type", v as string)}>
        <SelectTrigger className="w-40">
          <SelectValue>
            {(v: string | null) =>
              !v || v === ALL ? "All Types" : (TYPE_LABELS[v as VehicleType] ?? v)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Types</SelectItem>
          {Object.values(VehicleType).map((t) => (
            <SelectItem key={t} value={t}>
              {TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => v && setParam("status", v as string)}>
        <SelectTrigger className="w-40">
          <SelectValue>
            {(v: string | null) =>
              !v || v === ALL ? "All Statuses" : (STATUS_LABELS[v as VehicleStatus] ?? v)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Statuses</SelectItem>
          {Object.values(VehicleStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={region} onValueChange={(v) => v && setParam("region", v as string)}>
        <SelectTrigger className="w-40">
          <SelectValue>
            {(v: string | null) => (!v || v === ALL ? "All Regions" : v)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Regions</SelectItem>
          {regions.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
