import type { Prisma, Vehicle, Driver } from "./generated/prisma/client";
import { TripStatus } from "./generated/prisma/enums";
import {
  isVehicleDispatchable,
  vehicleBlockReason,
  isDriverAssignable,
  driverBlockReason,
} from "./eligibility";

/**
 * Single source of truth for Trip lifecycle rules (Phase 4: Trip Dispatcher).
 * Pure logic only, no "server-only" guard — the live board and create-trip
 * form also read from this (ETA, capacity check) client-side, mirroring how
 * lib/eligibility.ts is shared across server actions and client tables.
 */

const LEGAL_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.DRAFT]: [TripStatus.DISPATCHED, TripStatus.CANCELLED],
  [TripStatus.DISPATCHED]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return LEGAL_TRANSITIONS[from].includes(to);
}

const TRIP_CODE_PREFIX = "TR";
const TRIP_CODE_WIDTH = 3;

/**
 * Reads the current max trip code and increments it. Must be called with a
 * transaction client and awaited before the new Trip row is created in the
 * same transaction — SQLite serializes writers inside a transaction, which
 * is what makes this collision-safe against concurrent dispatch/save calls.
 */
export async function nextTripCode(tx: Prisma.TransactionClient): Promise<string> {
  const trips = await tx.trip.findMany({
    where: { code: { startsWith: TRIP_CODE_PREFIX } },
    select: { code: true },
  });
  const maxNumber = trips.reduce((max, trip) => {
    const value = Number(trip.code.slice(TRIP_CODE_PREFIX.length));
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
  return `${TRIP_CODE_PREFIX}${String(maxNumber + 1).padStart(TRIP_CODE_WIDTH, "0")}`;
}

const AVERAGE_SPEED_KMH = 40;

/** Derived ETA for a dispatched trip — never stored, always computed. */
export function estimateEtaMinutes(plannedDistanceKm: number): number {
  return Math.round((plannedDistanceKm / AVERAGE_SPEED_KMH) * 60);
}

export function capacityExceededBy(cargoWeightKg: number, maxLoadKg: number): number {
  return Math.max(0, cargoWeightKg - maxLoadKg);
}

/**
 * Re-validation used by both createAndDispatchTrip and dispatchTrip. Reuses
 * lib/eligibility.ts so dispatch and the Fleet/Drivers screens never
 * disagree about who's eligible.
 */
export function validateDispatchAssignment({
  vehicle,
  driver,
  cargoWeightKg,
}: {
  vehicle: Pick<Vehicle, "status" | "maxLoadKg"> | null;
  driver: Pick<Driver, "status" | "licenseExpiry"> | null;
  cargoWeightKg: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!vehicle) return { ok: false, reason: "Selected vehicle no longer exists" };
  if (!driver) return { ok: false, reason: "Selected driver no longer exists" };
  if (!isVehicleDispatchable(vehicle)) {
    return { ok: false, reason: vehicleBlockReason(vehicle) ?? "Vehicle is not available" };
  }
  if (!isDriverAssignable(driver)) {
    return { ok: false, reason: driverBlockReason(driver) ?? "Driver is not available" };
  }
  const over = capacityExceededBy(cargoWeightKg, vehicle.maxLoadKg);
  if (over > 0) {
    return { ok: false, reason: `Cargo exceeds capacity by ${over} kg` };
  }
  return { ok: true };
}
