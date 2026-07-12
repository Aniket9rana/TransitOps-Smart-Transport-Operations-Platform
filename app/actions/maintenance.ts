"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { MaintenanceStatus, VehicleStatus } from "@/lib/generated/prisma/client";

export type MaintenanceActionResult = { success: boolean; message: string };

export type MaintenanceInput = {
  vehicleId: string;
  serviceType: string;
  cost: number;
  /** yyyy-mm-dd from the date picker. */
  date: string;
};

// Revalidate every surface that reads vehicle status or maintenance spend so
// the badge on /fleet, the dispatch pool on /trips, and Phase 6 stay fresh.
function revalidateMaintenance() {
  revalidatePath("/maintenance");
  revalidatePath("/fleet");
  revalidatePath("/trips");
  revalidatePath("/dashboard");
}

/**
 * Log a service record. Only an AVAILABLE vehicle can be sent to the shop —
 * every other status is blocked with its specific reason. Creating the
 * ACTIVE record flips the vehicle to IN_SHOP, which the eligibility engine
 * already treats as out of the dispatch pool (no extra work on /trips).
 */
export async function createMaintenance(
  input: MaintenanceInput
): Promise<MaintenanceActionResult> {
  await requirePermission("maintenance", "manage");

  const serviceType = input.serviceType.trim();
  if (!input.vehicleId) return { success: false, message: "Select a vehicle" };
  if (!serviceType) return { success: false, message: "Service type is required" };
  if (!Number.isFinite(input.cost) || input.cost < 0) {
    return { success: false, message: "Cost must be 0 or greater" };
  }
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    return { success: false, message: "A valid date is required" };
  }

  try {
    const vehicleName = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new Error("Selected vehicle no longer exists");

      switch (vehicle.status) {
        case VehicleStatus.ON_TRIP:
          throw new Error("Vehicle is on an active trip — complete or cancel it first");
        case VehicleStatus.RETIRED:
          throw new Error("Vehicle is retired");
        case VehicleStatus.IN_SHOP:
          throw new Error("Vehicle is already in the shop");
      }
      // Only reaches here when status === AVAILABLE.

      await tx.maintenanceLog.create({
        data: {
          vehicleId: vehicle.id,
          serviceType,
          cost: Math.round(input.cost),
          date,
          status: MaintenanceStatus.ACTIVE,
        },
      });

      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: VehicleStatus.IN_SHOP },
      });

      return vehicle.name;
    });

    revalidateMaintenance();
    return { success: true, message: `${vehicleName} sent to shop — ${serviceType} logged` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}

/**
 * Close an active service record. Marks it COMPLETED and, if the vehicle is
 * still IN_SHOP, restores it to AVAILABLE (leaving RETIRED/other statuses
 * untouched, per "restores the vehicle to Available unless retired").
 */
export async function closeMaintenance(
  maintenanceId: string
): Promise<MaintenanceActionResult> {
  await requirePermission("maintenance", "manage");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.findUnique({ where: { id: maintenanceId } });
      if (!log) throw new Error("Maintenance record not found");
      if (log.status === MaintenanceStatus.COMPLETED) {
        throw new Error("This record is already closed");
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: log.vehicleId } });

      await tx.maintenanceLog.update({
        where: { id: maintenanceId },
        data: { status: MaintenanceStatus.COMPLETED },
      });

      const restored = vehicle?.status === VehicleStatus.IN_SHOP;
      if (restored) {
        await tx.vehicle.update({
          where: { id: vehicle!.id },
          data: { status: VehicleStatus.AVAILABLE },
        });
      }

      return { name: vehicle?.name ?? "Vehicle", restored };
    });

    revalidateMaintenance();
    return {
      success: true,
      message: result.restored
        ? `${result.name} restored to Available`
        : "Maintenance record closed",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}

/**
 * Delete a service record — only allowed once COMPLETED, so an active record
 * can never be deleted out from under a vehicle it's holding in the shop.
 */
export async function deleteMaintenance(
  maintenanceId: string
): Promise<MaintenanceActionResult> {
  await requirePermission("maintenance", "manage");

  try {
    await prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.findUnique({ where: { id: maintenanceId } });
      if (!log) throw new Error("Maintenance record not found");
      if (log.status !== MaintenanceStatus.COMPLETED) {
        throw new Error("Close the record before deleting — it's holding the vehicle in the shop");
      }
      await tx.maintenanceLog.delete({ where: { id: maintenanceId } });
    });

    revalidateMaintenance();
    return { success: true, message: "Maintenance record deleted" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}
