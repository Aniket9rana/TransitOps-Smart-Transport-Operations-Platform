"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export type SettingsActionResult = { success: boolean; message: string };

export type OrgSettingsInput = {
  depotName: string;
  currency: string;
  distanceUnit: string;
};

const CURRENCIES = ["INR", "USD"];
const DISTANCE_UNITS = ["Kilometers", "Miles"];

/**
 * Upserts the single OrgSettings row. Guards settings:manage FIRST (Fleet
 * Manager only) — defense-in-depth: the form is also read-only for other
 * roles client-side, but this server check is the real gate. Revalidates the
 * app shell so a new Depot Name shows immediately in the top bar.
 */
export async function saveOrgSettings(
  input: OrgSettingsInput
): Promise<SettingsActionResult> {
  await requirePermission("settings", "manage");

  const depotName = input.depotName.trim();
  if (!depotName) return { success: false, message: "Depot name is required" };
  if (!CURRENCIES.includes(input.currency)) {
    return { success: false, message: "Invalid currency" };
  }
  if (!DISTANCE_UNITS.includes(input.distanceUnit)) {
    return { success: false, message: "Invalid distance unit" };
  }

  try {
    const existing = await prisma.orgSettings.findFirst();
    if (existing) {
      await prisma.orgSettings.update({
        where: { id: existing.id },
        data: { depotName, currency: input.currency, distanceUnit: input.distanceUnit },
      });
    } else {
      await prisma.orgSettings.create({
        data: { depotName, currency: input.currency, distanceUnit: input.distanceUnit },
      });
    }

    // The depot name is shown in the app shell (top bar) on every route.
    revalidatePath("/", "layout");
    return { success: true, message: "Settings saved" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}
