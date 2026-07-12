import { prisma } from "./prisma";
import { ExpenseType, TripStatus } from "./generated/prisma/enums";
import type { Vehicle } from "./generated/prisma/client";

/**
 * Operational-cost engine — the single source of truth for money figures
 * (spec 3.7). Every screen and Phase 6 analytics import these instead of
 * re-summing records, so a fuel log added on /expenses and a maintenance
 * cost logged on /maintenance flow into the same numbers everywhere.
 *
 * Canonical "operational cost" = Fuel + Maintenance. Tolls/Misc (Expense)
 * are tracked SEPARATELY as "other" and never folded into operational cost.
 */

export async function fuelCostForVehicle(vehicleId: string): Promise<number> {
  const { _sum } = await prisma.fuelLog.aggregate({
    where: { vehicleId },
    _sum: { cost: true },
  });
  return _sum.cost ?? 0;
}

export async function maintenanceCostForVehicle(vehicleId: string): Promise<number> {
  // All records — active AND completed — count toward maintenance spend.
  const { _sum } = await prisma.maintenanceLog.aggregate({
    where: { vehicleId },
    _sum: { cost: true },
  });
  return _sum.cost ?? 0;
}

export async function operationalCostForVehicle(vehicleId: string): Promise<number> {
  const [fuel, maintenance] = await Promise.all([
    fuelCostForVehicle(vehicleId),
    maintenanceCostForVehicle(vehicleId),
  ]);
  return fuel + maintenance;
}

/** Tolls + Misc for a vehicle — kept separate from operational cost. */
export async function otherExpensesForVehicle(vehicleId: string): Promise<number> {
  const { _sum } = await prisma.expense.aggregate({
    where: { vehicleId, type: { in: [ExpenseType.TOLL, ExpenseType.MISC] } },
    _sum: { amount: true },
  });
  return _sum.amount ?? 0;
}

/** Revenue across a vehicle's COMPLETED trips — needed for Phase 6 ROI. */
export async function revenueForVehicle(vehicleId: string): Promise<number> {
  const { _sum } = await prisma.trip.aggregate({
    where: { vehicleId, status: TripStatus.COMPLETED },
    _sum: { revenue: true },
  });
  return _sum.revenue ?? 0;
}

/**
 * The "TOTAL OPERATIONAL COST (AUTO)" figure — fleet-wide Fuel + Maintenance.
 * COMPUTED from records, never hardcoded. Equal to the sum of every vehicle's
 * `operational` in fleetCostSummary().
 */
export async function totalOperationalCost(): Promise<number> {
  const [fuel, maintenance] = await Promise.all([
    prisma.fuelLog.aggregate({ _sum: { cost: true } }),
    prisma.maintenanceLog.aggregate({ _sum: { cost: true } }),
  ]);
  return (fuel._sum.cost ?? 0) + (maintenance._sum.cost ?? 0);
}

export type VehicleCostSummary = {
  vehicle: Vehicle;
  fuel: number;
  maintenance: number;
  other: number;
  operational: number;
  revenue: number;
};

/**
 * Per-vehicle cost rollup in a single query pass (five grouped aggregates,
 * not N-per-vehicle). Drives the /expenses COST SUMMARY table and Phase 6.
 */
export async function fleetCostSummary(): Promise<VehicleCostSummary[]> {
  const [vehicles, fuelByVehicle, maintByVehicle, otherByVehicle, revenueByVehicle] =
    await Promise.all([
      prisma.vehicle.findMany({ orderBy: { name: "asc" } }),
      prisma.fuelLog.groupBy({ by: ["vehicleId"], _sum: { cost: true } }),
      prisma.maintenanceLog.groupBy({ by: ["vehicleId"], _sum: { cost: true } }),
      prisma.expense.groupBy({
        by: ["vehicleId"],
        where: { type: { in: [ExpenseType.TOLL, ExpenseType.MISC] } },
        _sum: { amount: true },
      }),
      prisma.trip.groupBy({
        by: ["vehicleId"],
        where: { status: TripStatus.COMPLETED },
        _sum: { revenue: true },
      }),
    ]);

  const fuelMap = new Map(fuelByVehicle.map((r) => [r.vehicleId, r._sum.cost ?? 0]));
  const maintMap = new Map(maintByVehicle.map((r) => [r.vehicleId, r._sum.cost ?? 0]));
  const otherMap = new Map(otherByVehicle.map((r) => [r.vehicleId, r._sum.amount ?? 0]));
  const revenueMap = new Map(revenueByVehicle.map((r) => [r.vehicleId, r._sum.revenue ?? 0]));

  return vehicles.map((vehicle) => {
    const fuel = fuelMap.get(vehicle.id) ?? 0;
    const maintenance = maintMap.get(vehicle.id) ?? 0;
    const other = otherMap.get(vehicle.id) ?? 0;
    const revenue = revenueMap.get(vehicle.id) ?? 0;
    return { vehicle, fuel, maintenance, other, operational: fuel + maintenance, revenue };
  });
}
