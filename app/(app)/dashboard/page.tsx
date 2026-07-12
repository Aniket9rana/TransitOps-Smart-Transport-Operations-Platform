import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import {
  dashboardKpis,
  vehicleStatusBreakdown,
  type VehicleFilter,
} from "@/lib/metrics";
import { estimateEtaMinutes } from "@/lib/trip-lifecycle";
import {
  VehicleType,
  VehicleStatus,
  TripStatus,
} from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { DashboardFilters } from "./dashboard-filters";
import { LicenseBanner } from "./license-banner";
import { VehicleStatusBars } from "./vehicle-status-bars";

/** Derived ETA — never stored (mirrors the Phase 4 rule). */
function tripEta(status: TripStatus, plannedDistanceKm: number): string {
  if (status === TripStatus.DISPATCHED) return `${estimateEtaMinutes(plannedDistanceKm)} min`;
  if (status === TripStatus.DRAFT) return "Awaiting vehicle/driver";
  return "—";
}

function parseFilter(params: Record<string, string | string[] | undefined>): VehicleFilter {
  const type = typeof params.type === "string" ? params.type : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const region = typeof params.region === "string" ? params.region : undefined;
  return {
    type: type && (Object.values(VehicleType) as string[]).includes(type)
      ? (type as VehicleType)
      : null,
    status: status && (Object.values(VehicleStatus) as string[]).includes(status)
      ? (status as VehicleStatus)
      : null,
    region: region || null,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = parseFilter(await searchParams);

  // Recent Trips are scoped by the same filter set: a trip is shown when its
  // vehicle matches the active Type / Status / Region. With no filter, every
  // recent trip (incl. unassigned DRAFTs) shows.
  const hasVehicleFilter = Boolean(filter.type || filter.status || filter.region);
  const tripWhere: Prisma.TripWhereInput = hasVehicleFilter
    ? {
        vehicle: {
          is: {
            ...(filter.type ? { type: filter.type } : {}),
            ...(filter.status ? { status: filter.status } : {}),
            ...(filter.region ? { region: filter.region } : {}),
          },
        },
      }
    : {};

  const licenseThreshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [kpis, breakdown, regionRows, recentTrips, expiringLicenses] = await Promise.all([
    dashboardKpis(filter),
    vehicleStatusBreakdown(filter),
    prisma.vehicle.findMany({
      where: { region: { not: null } },
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" },
    }),
    prisma.trip.findMany({
      where: tripWhere,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { vehicle: true, driver: true },
    }),
    prisma.driver.count({ where: { licenseExpiry: { lte: licenseThreshold } } }),
  ]);

  const regions = regionRows.map((r) => r.region).filter((r): r is string => Boolean(r));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live fleet operations overview.
        </p>
      </div>

      <LicenseBanner count={expiringLicenses} />

      <DashboardFilters regions={regions} />

      {/* KPI row — all seven computed by lib/metrics.ts */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Active Vehicles" value={kpis.activeVehicles} accent="blue" />
        <KpiCard label="Available Vehicles" value={kpis.availableVehicles} accent="green" />
        <KpiCard label="In Maintenance" value={kpis.inMaintenance} accent="orange" />
        <KpiCard label="Active Trips" value={kpis.activeTrips} accent="blue" />
        <KpiCard label="Pending Trips" value={kpis.pendingTrips} accent="gray" />
        <KpiCard label="Drivers on Duty" value={kpis.driversOnDuty} accent="blue" />
        <KpiCard
          label="Fleet Utilization"
          value={`${kpis.fleetUtilizationPct}%`}
          accent="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">ETA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium text-foreground">{trip.code}</TableCell>
                    <TableCell>{trip.vehicle?.name ?? "—"}</TableCell>
                    <TableCell>{trip.driver?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={trip.status} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tripEta(trip.status, trip.plannedDistanceKm)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentTrips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No trips match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Status</CardTitle>
          </CardHeader>
          <CardContent>
            <VehicleStatusBars breakdown={breakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
