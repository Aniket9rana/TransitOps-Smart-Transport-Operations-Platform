"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { ExpenseType } from "@/lib/generated/prisma/client";

export type ExpenseActionResult = { success: boolean; message: string };

export type FuelLogInput = {
  vehicleId: string;
  tripId: string | null;
  /** yyyy-mm-dd from the date picker. */
  date: string;
  liters: number;
  cost: number;
};

export type ExpenseInput = {
  vehicleId: string;
  tripId: string | null;
  type: string;
  amount: number;
  note: string | null;
};

function revalidateExpenses() {
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

/** Manually log fuel (distinct from the FuelLogs auto-created on trip completion). */
export async function createFuelLog(
  input: FuelLogInput
): Promise<ExpenseActionResult> {
  await requirePermission("expenses", "manage");

  if (!input.vehicleId) return { success: false, message: "Select a vehicle" };
  if (!Number.isFinite(input.liters) || input.liters <= 0) {
    return { success: false, message: "Liters must be greater than 0" };
  }
  if (!Number.isFinite(input.cost) || input.cost < 0) {
    return { success: false, message: "Cost must be 0 or greater" };
  }
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    return { success: false, message: "A valid date is required" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new Error("Selected vehicle no longer exists");
      if (input.tripId) {
        const trip = await tx.trip.findUnique({ where: { id: input.tripId } });
        if (!trip) throw new Error("Selected trip no longer exists");
      }

      await tx.fuelLog.create({
        data: {
          vehicleId: input.vehicleId,
          tripId: input.tripId,
          date,
          liters: input.liters,
          cost: Math.round(input.cost),
        },
      });
    });

    revalidateExpenses();
    return { success: true, message: "Fuel log added" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}

/** Add a Toll or Misc expense — tracked separately from operational cost. */
export async function createExpense(
  input: ExpenseInput
): Promise<ExpenseActionResult> {
  await requirePermission("expenses", "manage");

  if (!input.vehicleId) return { success: false, message: "Select a vehicle" };
  if (!Object.values(ExpenseType).includes(input.type as ExpenseType)) {
    return { success: false, message: "Select an expense type" };
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return { success: false, message: "Amount must be 0 or greater" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new Error("Selected vehicle no longer exists");
      if (input.tripId) {
        const trip = await tx.trip.findUnique({ where: { id: input.tripId } });
        if (!trip) throw new Error("Selected trip no longer exists");
      }

      await tx.expense.create({
        data: {
          vehicleId: input.vehicleId,
          tripId: input.tripId,
          type: input.type as ExpenseType,
          amount: Math.round(input.amount),
          note: input.note?.trim() || null,
        },
      });
    });

    revalidateExpenses();
    return {
      success: true,
      message: `${input.type === ExpenseType.TOLL ? "Toll" : "Misc"} expense added`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}
