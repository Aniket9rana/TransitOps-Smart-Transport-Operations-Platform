import { prisma } from "./prisma";
import { fleetCostSummary, totalOperationalCost } from "./costs";
import {
  VehicleStatus,
  VehicleType,
  DriverStatus,
  TripStatus,
} from "./generated/prisma/enums";
import type { Prisma, Vehicle } from "./generated/prisma/client";

/**
 * METRICS ENGINE — the single source of truth for every KPI on the live
 * Dashboard (Screen 1) and the Reports & Analytics screen (Screen 7).
 *
 * Nothing here is hardcoded: the wireframe's 53 / 81% / 34,070 / 8.4 / 14.2%
 * are illustrative only. Both screens import THESE functions, so a number
 * (e.g. Fleet Utilization) that appears in two places is computed once and
 * always agrees. Money figures reuse lib/costs.ts (Fuel + Maintenance).
 */

/** Round to a single decimal place (e.g. 8.42 -> 8.4). */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * ROI for one vehicle, per the spec formula
 *   ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost × 100
 * where operational cost = Maintenance + Fuel. Guards divide-by-zero -> 0.
 */
function roiPctFor(revenue: number, operational: number, acquisitionCost: number): number {
  if (acquisitionCost <= 0) return 0;
  return round1(((revenue - operational) / acquisitionCost) * 100);
}

/** Dashboard scoping filter — drives the three Screen-1 dropdowns. */
export type VehicleFilter = {
  type?: VehicleType | null;
  status?: VehicleStatus | null;
  region?: string | null;
};

/** Translates a VehicleFilter into a Prisma where-clause. */
function vehicleWhere(filter?: VehicleFilter): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};
  if (filter?.type) where.type = filter.type;
  if (filter?.status) where.status = filter.status;
  if (filter?.region) where.region = filter.region;
  return where;
}

export type DashboardKpis = {
  activeVehicles: number;
  availableVehicles: number;
  inMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilizationPct: number;
};

/**
 * All seven Screen-1 KPI counts.
 *
 * Vehicle-based KPIs recompute over the FILTERED vehicle set (the dashboard
 * dropdowns scope them); trip and driver KPIs are fleet-wide.
 *   activeVehicles       = vehicles where status != RETIRED
 *   availableVehicles    = status == AVAILABLE
 *   inMaintenance        = status == IN_SHOP
 *   activeTrips          = trips where status == DISPATCHED
 *   pendingTrips         = trips where status == DRAFT
 *   driversOnDuty        = drivers where status in (AVAILABLE, ON_TRIP)
 *   fleetUtilizationPct  = round(onTrip / nonRetired * 100), 0 when no vehicles
 *                          onTrip = vehicles ON_TRIP, nonRetired = status != RETIRED
 */
export async function dashboardKpis(filter?: VehicleFilter): Promise<DashboardKpis> {
  const [vehicles, activeTrips, pendingTrips, driversOnDuty] = await Promise.all([
    prisma.vehicle.findMany({ where: vehicleWhere(filter), select: { status: true } }),
    prisma.trip.count({ where: { status: TripStatus.DISPATCHED } }),
    prisma.trip.count({ where: { status: TripStatus.DRAFT } }),
    prisma.driver.count({
      where: { status: { in: [DriverStatus.AVAILABLE, DriverStatus.ON_TRIP] } },
    }),
  ]);

  const activeVehicles = vehicles.filter((v) => v.status !== VehicleStatus.RETIRED).length;
  const availableVehicles = vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length;
  const inMaintenance = vehicles.filter((v) => v.status === VehicleStatus.IN_SHOP).length;
  const onTrip = vehicles.filter((v) => v.status === VehicleStatus.ON_TRIP).length;
  const nonRetired = activeVehicles; // status != RETIRED
  const fleetUtilizationPct = nonRetired === 0 ? 0 : Math.round((onTrip / nonRetired) * 100);

  return {
    activeVehicles,
    availableVehicles,
    inMaintenance,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilizationPct,
  };
}

export type VehicleStatusBreakdown = Record<VehicleStatus, number>;

/**
 * Count of vehicles per VehicleStatus over the filtered set — drives the
 * Screen-1 "Vehicle Status" proportion bars (Available / On Trip / In Shop /
 * Retired). Shares the same filter as dashboardKpis so the two never disagree.
 */
export async function vehicleStatusBreakdown(
  filter?: VehicleFilter
): Promise<VehicleStatusBreakdown> {
  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere(filter),
    select: { status: true },
  });
  const breakdown: VehicleStatusBreakdown = {
    [VehicleStatus.AVAILABLE]: 0,
    [VehicleStatus.ON_TRIP]: 0,
    [VehicleStatus.IN_SHOP]: 0,
    [VehicleStatus.RETIRED]: 0,
  };
  for (const v of vehicles) breakdown[v.status] += 1;
  return breakdown;
}

/**
 * Fleet fuel efficiency (km/l).
 *   totalDistance = sum(plannedDistanceKm of COMPLETED trips)
 *   totalFuel     = sum(fuelConsumedLiters of COMPLETED trips)
 *   efficiency    = totalDistance / totalFuel  (0 when no fuel), 1 decimal
 */
export async function fuelEfficiencyKmPerL(): Promise<number> {
  const trips = await prisma.trip.findMany({
    where: { status: TripStatus.COMPLETED },
    select: { plannedDistanceKm: true, fuelConsumedLiters: true },
  });
  let totalDistance = 0;
  let totalFuel = 0;
  for (const t of trips) {
    totalDistance += t.plannedDistanceKm;
    totalFuel += t.fuelConsumedLiters ?? 0;
  }
  if (totalFuel === 0) return 0;
  return round1(totalDistance / totalFuel);
}

/**
 * Fleet-wide ROI (%), the aggregate of the per-vehicle formula:
 *   (sum revenue of COMPLETED trips − totalOperationalCost()) /
 *   sum(acquisitionCost of all vehicles) × 100
 * Guards divide-by-zero -> 0, rounded to 1 decimal.
 */
export async function fleetROIPct(): Promise<number> {
  const [revenueAgg, operational, acqAgg] = await Promise.all([
    prisma.trip.aggregate({
      where: { status: TripStatus.COMPLETED },
      _sum: { revenue: true },
    }),
    totalOperationalCost(),
    prisma.vehicle.aggregate({ _sum: { acquisitionCost: true } }),
  ]);
  const revenue = revenueAgg._sum.revenue ?? 0;
  const acquisition = acqAgg._sum.acquisitionCost ?? 0;
  return roiPctFor(revenue, operational, acquisition);
}

export type MonthlyRevenuePoint = { month: string; revenue: number };

/**
 * Revenue grouped by the completedAt month of COMPLETED trips, over the last
 * 7 months (inclusive of the current month). Missing months are filled with 0
 * so the bar chart always shows a continuous axis.
 */
export async function monthlyRevenue(): Promise<MonthlyRevenuePoint[]> {
  const trips = await prisma.trip.findMany({
    where: { status: TripStatus.COMPLETED, completedAt: { not: null } },
    select: { completedAt: true, revenue: true },
  });

  const MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const now = new Date();
  const buckets: { key: string; month: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
      revenue: 0,
    });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));

  for (const t of trips) {
    if (!t.completedAt) continue;
    const key = `${t.completedAt.getFullYear()}-${t.completedAt.getMonth()}`;
    const bucket = index.get(key);
    if (bucket) bucket.revenue += t.revenue ?? 0;
  }

  return buckets.map(({ month, revenue }) => ({ month, revenue }));
}

export type PerVehicleROI = { vehicle: Vehicle; roiPct: number };

/**
 * Per-vehicle ROI (%). Reuses fleetCostSummary() (a single grouped query pass)
 * so revenue/operational cost match the Fuel & Expenses cost summary exactly.
 */
export async function perVehicleROI(): Promise<PerVehicleROI[]> {
  const summary = await fleetCostSummary();
  return summary.map((row) => ({
    vehicle: row.vehicle,
    roiPct: roiPctFor(row.revenue, row.operational, row.vehicle.acquisitionCost),
  }));
}

export type CostliestVehicle = { vehicle: Vehicle; operational: number };

/**
 * Vehicles ranked by operational cost (Fuel + Maintenance) descending.
 * Reuses fleetCostSummary(); returns the top `n` (default 5).
 */
export async function costliestVehicles(n = 5): Promise<CostliestVehicle[]> {
  const summary = await fleetCostSummary();
  return summary
    .map((row) => ({ vehicle: row.vehicle, operational: row.operational }))
    .sort((a, b) => b.operational - a.operational)
    .slice(0, n);
}

export type FleetReportRow = {
  registrationNumber: string;
  name: string;
  type: VehicleType;
  status: VehicleStatus;
  fuel: number;
  maintenance: number;
  operational: number;
  other: number;
  revenue: number;
  roiPct: number;
};

/**
 * The per-vehicle report backing both CSV and PDF export. Built from the same
 * fleetCostSummary() + ROI formula the on-screen analytics use, so the export
 * is a faithful snapshot of what the analyst sees.
 */
export async function fleetReportRows(): Promise<FleetReportRow[]> {
  const summary = await fleetCostSummary();
  return summary.map((row) => ({
    registrationNumber: row.vehicle.registrationNumber,
    name: row.vehicle.name,
    type: row.vehicle.type,
    status: row.vehicle.status,
    fuel: row.fuel,
    maintenance: row.maintenance,
    operational: row.operational,
    other: row.other,
    revenue: row.revenue,
    roiPct: roiPctFor(row.revenue, row.operational, row.vehicle.acquisitionCost),
  }));
}
