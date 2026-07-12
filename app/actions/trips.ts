"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { getStatusInfo } from "@/lib/status";
import {
  canTransition,
  nextTripCode,
  validateDispatchAssignment,
} from "@/lib/trip-lifecycle";
import { TripStatus, VehicleStatus, DriverStatus } from "@/lib/generated/prisma/client";

export type TripActionResult = { success: boolean; message: string };

export type TripInput = {
  source: string;
  destination: string;
  vehicleId: string | null;
  driverId: string | null;
  cargoWeightKg: number;
  plannedDistanceKm: number;
};

function validateCommonFields(input: TripInput): string | null {
  if (!input.source.trim()) return "Source is required";
  if (!input.destination.trim()) return "Destination is required";
  if (!Number.isFinite(input.cargoWeightKg) || input.cargoWeightKg < 0) {
    return "Cargo weight must be 0 or greater";
  }
  if (!Number.isFinite(input.plannedDistanceKm) || input.plannedDistanceKm < 0) {
    return "Planned distance must be 0 or greater";
  }
  return null;
}

function toResult(promise: Promise<{ code: string }>, verb: string) {
  return promise
    .then((trip) => {
      revalidatePath("/trips");
      revalidatePath("/dashboard");
      return { success: true, message: `Trip ${trip.code} ${verb}` };
    })
    .catch((error: unknown) => ({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }));
}

export async function createAndDispatchTrip(input: TripInput): Promise<TripActionResult> {
  await requirePermission("trips", "manage");

  const fieldError = validateCommonFields(input);
  if (fieldError) return { success: false, message: fieldError };
  if (!input.vehicleId || !input.driverId) {
    return { success: false, message: "Assign vehicle & driver to dispatch" };
  }

  return toResult(
    prisma.$transaction(async (tx) => {
      const [vehicle, driver] = await Promise.all([
        tx.vehicle.findUnique({ where: { id: input.vehicleId! } }),
        tx.driver.findUnique({ where: { id: input.driverId! } }),
      ]);

      const check = validateDispatchAssignment({
        vehicle,
        driver,
        cargoWeightKg: input.cargoWeightKg,
      });
      if (!check.ok) throw new Error(check.reason);

      const code = await nextTripCode(tx);
      const now = new Date();

      const trip = await tx.trip.create({
        data: {
          code,
          source: input.source.trim(),
          destination: input.destination.trim(),
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          cargoWeightKg: input.cargoWeightKg,
          plannedDistanceKm: input.plannedDistanceKm,
          status: TripStatus.DISPATCHED,
          dispatchedAt: now,
        },
      });

      await tx.vehicle.update({
        where: { id: input.vehicleId! },
        data: { status: VehicleStatus.ON_TRIP },
      });
      await tx.driver.update({
        where: { id: input.driverId! },
        data: { status: DriverStatus.ON_TRIP },
      });

      return trip;
    }),
    "dispatched"
  );
}

export async function saveDraft(input: TripInput): Promise<TripActionResult> {
  await requirePermission("trips", "manage");

  const fieldError = validateCommonFields(input);
  if (fieldError) return { success: false, message: fieldError };

  return toResult(
    prisma.$transaction(async (tx) => {
      if (input.vehicleId) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
        if (!vehicle) throw new Error("Selected vehicle no longer exists");
        const over = input.cargoWeightKg - vehicle.maxLoadKg;
        if (over > 0) throw new Error(`Cargo exceeds capacity by ${over} kg`);
      }

      const code = await nextTripCode(tx);

      return tx.trip.create({
        data: {
          code,
          source: input.source.trim(),
          destination: input.destination.trim(),
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          cargoWeightKg: input.cargoWeightKg,
          plannedDistanceKm: input.plannedDistanceKm,
          status: TripStatus.DRAFT,
        },
      });
    }),
    "saved as draft"
  );
}

export async function updateDraft(
  tripId: string,
  input: TripInput
): Promise<TripActionResult> {
  await requirePermission("trips", "manage");

  const fieldError = validateCommonFields(input);
  if (fieldError) return { success: false, message: fieldError };

  return toResult(
    prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new Error("Trip not found");
      if (trip.status !== TripStatus.DRAFT) {
        throw new Error(`Cannot edit — trip is ${getStatusInfo(trip.status).label}`);
      }

      if (input.vehicleId) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
        if (!vehicle) throw new Error("Selected vehicle no longer exists");
        const over = input.cargoWeightKg - vehicle.maxLoadKg;
        if (over > 0) throw new Error(`Cargo exceeds capacity by ${over} kg`);
      }

      return tx.trip.update({
        where: { id: tripId },
        data: {
          source: input.source.trim(),
          destination: input.destination.trim(),
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          cargoWeightKg: input.cargoWeightKg,
          plannedDistanceKm: input.plannedDistanceKm,
        },
      });
    }),
    "updated"
  );
}

export async function dispatchTrip(tripId: string): Promise<TripActionResult> {
  await requirePermission("trips", "manage");

  return toResult(
    prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new Error("Trip not found");
      if (!canTransition(trip.status, TripStatus.DISPATCHED)) {
        throw new Error(`Cannot dispatch — trip is ${getStatusInfo(trip.status).label}`);
      }
      if (!trip.vehicleId || !trip.driverId) {
        throw new Error("Assign vehicle & driver to dispatch");
      }

      const [vehicle, driver] = await Promise.all([
        tx.vehicle.findUnique({ where: { id: trip.vehicleId } }),
        tx.driver.findUnique({ where: { id: trip.driverId } }),
      ]);

      const check = validateDispatchAssignment({
        vehicle,
        driver,
        cargoWeightKg: trip.cargoWeightKg,
      });
      if (!check.ok) throw new Error(check.reason);

      const updated = await tx.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.DISPATCHED, dispatchedAt: new Date() },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VehicleStatus.ON_TRIP },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.ON_TRIP },
      });

      return updated;
    }),
    "dispatched"
  );
}

export async function completeTrip(
  tripId: string,
  input: {
    finalOdometer: number;
    fuelConsumedLiters: number;
    fuelCost: number;
    revenue: number;
  }
): Promise<TripActionResult> {
  await requirePermission("trips", "manage");

  if (!Number.isFinite(input.finalOdometer)) {
    return { success: false, message: "Final odometer is required" };
  }
  if (!Number.isFinite(input.fuelConsumedLiters) || input.fuelConsumedLiters <= 0) {
    return { success: false, message: "Fuel consumed must be greater than 0" };
  }
  if (!Number.isFinite(input.fuelCost) || input.fuelCost < 0) {
    return { success: false, message: "Fuel cost must be 0 or greater" };
  }
  if (!Number.isFinite(input.revenue) || input.revenue < 0) {
    return { success: false, message: "Revenue must be 0 or greater" };
  }

  return toResult(
    prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new Error("Trip not found");
      if (!canTransition(trip.status, TripStatus.COMPLETED)) {
        throw new Error(`Cannot complete — trip is ${getStatusInfo(trip.status).label}`);
      }
      if (!trip.vehicleId || !trip.driverId) {
        throw new Error("Dispatched trip is missing its vehicle or driver");
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } });
      if (!vehicle) throw new Error("Assigned vehicle no longer exists");
      if (input.finalOdometer < vehicle.odometer) {
        throw new Error(`Final odometer cannot be less than current odometer (${vehicle.odometer} km)`);
      }

      const now = new Date();

      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.COMPLETED,
          finalOdometer: input.finalOdometer,
          fuelConsumedLiters: input.fuelConsumedLiters,
          revenue: input.revenue,
          completedAt: now,
        },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { odometer: input.finalOdometer, status: VehicleStatus.AVAILABLE },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.AVAILABLE },
      });
      await tx.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          date: now,
          liters: input.fuelConsumedLiters,
          cost: input.fuelCost,
        },
      });

      return updated;
    }),
    "completed"
  );
}

export async function cancelTrip(
  tripId: string,
  cancelReason?: string
): Promise<TripActionResult> {
  await requirePermission("trips", "manage");

  return toResult(
    prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new Error("Trip not found");
      if (!canTransition(trip.status, TripStatus.CANCELLED)) {
        throw new Error(`Cannot cancel — trip is already ${getStatusInfo(trip.status).label}`);
      }

      if (trip.status === TripStatus.DISPATCHED) {
        if (trip.vehicleId) {
          await tx.vehicle.update({
            where: { id: trip.vehicleId },
            data: { status: VehicleStatus.AVAILABLE },
          });
        }
        if (trip.driverId) {
          await tx.driver.update({
            where: { id: trip.driverId },
            data: { status: DriverStatus.AVAILABLE },
          });
        }
      }

      return tx.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.CANCELLED,
          cancelReason: cancelReason?.trim() || null,
        },
      });
    }),
    "cancelled"
  );
}
