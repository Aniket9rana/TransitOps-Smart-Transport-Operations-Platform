"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  LicenseCategory,
  DriverStatus,
  TripStatus,
  Prisma,
} from "@/lib/generated/prisma/client";

export type DriverFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
};

export type ActionResult = { success: boolean; message: string };

const MANUALLY_SELECTABLE_STATUSES: DriverStatus[] = [
  DriverStatus.AVAILABLE,
  DriverStatus.OFF_DUTY,
  DriverStatus.SUSPENDED,
];

type DriverInput = {
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string;
  contact: string;
  safetyScore: number;
};

function parseDriverInput(formData: FormData): DriverInput {
  return {
    name: (formData.get("name")?.toString() ?? "").trim(),
    licenseNumber: (formData.get("licenseNumber")?.toString() ?? "").trim().toUpperCase(),
    licenseCategory: formData.get("licenseCategory")?.toString() ?? "",
    licenseExpiry: formData.get("licenseExpiry")?.toString() ?? "",
    contact: (formData.get("contact")?.toString() ?? "").trim(),
    safetyScore: Number(formData.get("safetyScore")),
  };
}

function validateDriverInput(data: DriverInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.name) errors.name = "Name is required";
  if (!data.licenseNumber) errors.licenseNumber = "License number is required";
  if (!Object.values(LicenseCategory).includes(data.licenseCategory as LicenseCategory)) {
    errors.licenseCategory = "License category is required";
  }
  if (!data.licenseExpiry || Number.isNaN(Date.parse(data.licenseExpiry))) {
    errors.licenseExpiry = "A valid expiry date is required";
  }
  if (!data.contact) errors.contact = "Contact is required";
  if (!Number.isFinite(data.safetyScore) || data.safetyScore < 0 || data.safetyScore > 100) {
    errors.safetyScore = "Must be between 0 and 100";
  }

  return errors;
}

export async function createDriver(
  _prevState: DriverFormState,
  formData: FormData
): Promise<DriverFormState> {
  await requirePermission("drivers", "manage");

  const data = parseDriverInput(formData);
  const fieldErrors = validateDriverInput(data);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: null, fieldErrors };
  }

  const existing = await prisma.driver.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });
  if (existing) {
    return {
      status: "error",
      message: null,
      fieldErrors: { licenseNumber: "License number already exists" },
    };
  }

  await prisma.driver.create({
    data: {
      name: data.name,
      licenseNumber: data.licenseNumber,
      licenseCategory: data.licenseCategory as LicenseCategory,
      licenseExpiry: new Date(data.licenseExpiry),
      contact: data.contact,
      safetyScore: data.safetyScore,
      status: DriverStatus.AVAILABLE,
    },
  });

  revalidatePath("/drivers");
  return { status: "success", message: `Driver ${data.name} added`, fieldErrors: {} };
}

export async function updateDriver(
  driverId: string,
  _prevState: DriverFormState,
  formData: FormData
): Promise<DriverFormState> {
  await requirePermission("drivers", "manage");

  const data = parseDriverInput(formData);
  const fieldErrors = validateDriverInput(data);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: null, fieldErrors };
  }

  const existing = await prisma.driver.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });
  if (existing && existing.id !== driverId) {
    return {
      status: "error",
      message: null,
      fieldErrors: { licenseNumber: "License number already exists" },
    };
  }

  await prisma.driver.update({
    where: { id: driverId },
    data: {
      name: data.name,
      licenseNumber: data.licenseNumber,
      licenseCategory: data.licenseCategory as LicenseCategory,
      licenseExpiry: new Date(data.licenseExpiry),
      contact: data.contact,
      safetyScore: data.safetyScore,
    },
  });

  revalidatePath("/drivers");
  return { status: "success", message: `Driver ${data.name} updated`, fieldErrors: {} };
}

export async function updateDriverStatus(
  driverId: string,
  nextStatus: string
): Promise<ActionResult> {
  await requirePermission("drivers", "manage");

  if (!MANUALLY_SELECTABLE_STATUSES.includes(nextStatus as DriverStatus)) {
    return { success: false, message: "That status cannot be set manually" };
  }

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { success: false, message: "Driver not found" };

  if (driver.status === DriverStatus.ON_TRIP) {
    return { success: false, message: "Driver is on an active trip" };
  }

  await prisma.driver.update({
    where: { id: driverId },
    data: { status: nextStatus as DriverStatus },
  });

  revalidatePath("/drivers");
  return { success: true, message: `${driver.name} marked ${nextStatus.replace("_", " ").toLowerCase()}` };
}

export async function deleteDriver(driverId: string): Promise<ActionResult> {
  await requirePermission("drivers", "manage");

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { success: false, message: "Driver not found" };

  if (driver.status === DriverStatus.ON_TRIP) {
    return { success: false, message: "Cannot delete a driver who is on a trip" };
  }

  const dispatchedTrip = await prisma.trip.findFirst({
    where: { driverId, status: TripStatus.DISPATCHED },
  });
  if (dispatchedTrip) {
    return {
      success: false,
      message: "Cannot delete a driver referenced by a dispatched trip",
    };
  }

  try {
    await prisma.driver.delete({ where: { id: driverId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        message: "Cannot delete a driver with related trip records",
      };
    }
    throw error;
  }

  revalidatePath("/drivers");
  return { success: true, message: `${driver.name} deleted` };
}
