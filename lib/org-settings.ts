import { prisma } from "./prisma";

export type OrgSettingsView = {
  depotName: string;
  currency: string;
  distanceUnit: string;
};

const DEFAULTS: OrgSettingsView = {
  depotName: "Gandhinagar Depot GJ4",
  currency: "INR",
  distanceUnit: "Kilometers",
};

/**
 * Reads the single OrgSettings row (falling back to schema defaults if the
 * table is empty). Shared by the app-shell top bar and the Settings screen so
 * a saved Depot Name is reflected everywhere from one source.
 */
export async function getOrgSettings(): Promise<OrgSettingsView> {
  const row = await prisma.orgSettings.findFirst();
  if (!row) return DEFAULTS;
  return {
    depotName: row.depotName,
    currency: row.currency,
    distanceUnit: row.distanceUnit,
  };
}
