"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  VehicleType,
  VehicleStatus,
  MaintenanceStatus,
  TripStatus,
  Prisma,
} from "@/lib/generated/prisma/client";

export type VehicleFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
};

export type ActionResult = { success: boolean; message: string };

type VehicleInput = {
  registrationNumber: string;
  name: string;
  type: string;
  maxLoadKg: number;
  odometer: number;
  acquisitionCost: number;
  region: string | null;
};

function parseVehicleInput(formData: FormData): VehicleInput {
  return {
    registrationNumber: (formData.get("registrationNumber")?.toString() ?? "").trim().toUpperCase(),
    name: (formData.get("name")?.toString() ?? "").trim(),
    type: formData.get("type")?.toString() ?? "",
    maxLoadKg: Number(formData.get("maxLoadKg")),
    odometer: Number(formData.get("odometer")),
    acquisitionCost: Number(formData.get("acquisitionCost")),
    region: formData.get("region")?.toString().trim() || null,
  };
}

function validateVehicleInput(data: VehicleInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.registrationNumber) errors.registrationNumber = "Registration number is required";
  if (!data.name) errors.name = "Name/Model is required";
  if (!Object.values(VehicleType).includes(data.type as VehicleType)) {
    errors.type = "Type is required";
  }
  if (!Number.isFinite(data.maxLoadKg) || data.maxLoadKg < 0) {
    errors.maxLoadKg = "Must be 0 or greater";
  }
  if (!Number.isFinite(data.odometer) || data.odometer < 0) {
    errors.odometer = "Must be 0 or greater";
  }
  if (!Number.isFinite(data.acquisitionCost) || data.acquisitionCost < 0) {
    errors.acquisitionCost = "Must be 0 or greater";
  }

  return errors;
}

export async function createVehicle(
  _prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requirePermission("fleet", "manage");

  const data = parseVehicleInput(formData);
  const fieldErrors = validateVehicleInput(data);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: null, fieldErrors };
  }

  const existing = await prisma.vehicle.findUnique({
    where: { registrationNumber: data.registrationNumber },
  });
  if (existing) {
    return {
      status: "error",
      message: null,
      fieldErrors: { registrationNumber: "Registration number already exists" },
    };
  }

  await prisma.vehicle.create({
    data: {
      registrationNumber: data.registrationNumber,
      name: data.name,
      type: data.type as VehicleType,
      maxLoadKg: data.maxLoadKg,
      odometer: data.odometer,
      acquisitionCost: data.acquisitionCost,
      region: data.region,
      status: VehicleStatus.AVAILABLE,
    },
  });

  revalidatePath("/fleet");
  return {
    status: "success",
    message: `Vehicle ${data.registrationNumber} added`,
    fieldErrors: {},
  };
}

export async function updateVehicle(
  vehicleId: string,
  _prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requirePermission("fleet", "manage");

  const data = parseVehicleInput(formData);
  const fieldErrors = validateVehicleInput(data);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: null, fieldErrors };
  }

  const existing = await prisma.vehicle.findUnique({
    where: { registrationNumber: data.registrationNumber },
  });
  if (existing && existing.id !== vehicleId) {
    return {
      status: "error",
      message: null,
      fieldErrors: { registrationNumber: "Registration number already exists" },
    };
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      registrationNumber: data.registrationNumber,
      name: data.name,
      type: data.type as VehicleType,
      maxLoadKg: data.maxLoadKg,
      odometer: data.odometer,
      acquisitionCost: data.acquisitionCost,
      region: data.region,
    },
  });

  revalidatePath("/fleet");
  return {
    status: "success",
    message: `Vehicle ${data.registrationNumber} updated`,
    fieldErrors: {},
  };
}

export async function retireVehicle(vehicleId: string): Promise<ActionResult> {
  await requirePermission("fleet", "manage");

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { success: false, message: "Vehicle not found" };

  if (vehicle.status === VehicleStatus.ON_TRIP || vehicle.status === VehicleStatus.IN_SHOP) {
    return {
      success: false,
      message: "Cannot retire a vehicle that is on a trip or in the shop",
    };
  }
  if (vehicle.status === VehicleStatus.RETIRED) {
    return { success: false, message: "Vehicle is already retired" };
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: VehicleStatus.RETIRED },
  });

  revalidatePath("/fleet");
  return { success: true, message: `${vehicle.registrationNumber} retired` };
}

export async function reactivateVehicle(vehicleId: string): Promise<ActionResult> {
  await requirePermission("fleet", "manage");

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { success: false, message: "Vehicle not found" };

  if (vehicle.status !== VehicleStatus.RETIRED) {
    return { success: false, message: "Only retired vehicles can be reactivated" };
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: VehicleStatus.AVAILABLE },
  });

  revalidatePath("/fleet");
  return { success: true, message: `${vehicle.registrationNumber} reactivated` };
}

export async function deleteVehicle(vehicleId: string): Promise<ActionResult> {
  await requirePermission("fleet", "manage");

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { success: false, message: "Vehicle not found" };

  if (vehicle.status === VehicleStatus.ON_TRIP) {
    return { success: false, message: "Cannot delete a vehicle that is on a trip" };
  }

  const activeMaintenance = await prisma.maintenanceLog.findFirst({
    where: { vehicleId, status: MaintenanceStatus.ACTIVE },
  });
  if (activeMaintenance) {
    return {
      success: false,
      message: "Cannot delete a vehicle with an active maintenance log",
    };
  }

  const dispatchedTrip = await prisma.trip.findFirst({
    where: { vehicleId, status: TripStatus.DISPATCHED },
  });
  if (dispatchedTrip) {
    return {
      success: false,
      message: "Cannot delete a vehicle referenced by a dispatched trip",
    };
  }

  try {
    await prisma.vehicle.delete({ where: { id: vehicleId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        message: "Cannot delete a vehicle with related trips, maintenance, or fuel records",
      };
    }
    throw error;
  }

  revalidatePath("/fleet");
  return { success: true, message: `${vehicle.registrationNumber} deleted` };
}
