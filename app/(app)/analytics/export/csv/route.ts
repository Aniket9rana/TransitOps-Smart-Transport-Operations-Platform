import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { fleetReportRows } from "@/lib/metrics";

/** Escapes a CSV field: quote it when it contains a comma, quote, or newline. */
function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Real CSV download of the per-vehicle fleet report. RBAC-guarded server-side
 * (defense-in-depth): only roles with analytics access get the file. Built
 * from the same fleetReportRows() the on-screen analytics use.
 */
export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "analytics", "view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const rows = await fleetReportRows();

  const header = [
    "Reg No",
    "Vehicle",
    "Type",
    "Status",
    "Fuel Cost",
    "Maintenance Cost",
    "Operational Cost",
    "Other Expenses",
    "Revenue",
    "ROI %",
  ];

  const lines = [header, ...rows.map((r) => [
    r.registrationNumber,
    r.name,
    r.type,
    r.status,
    r.fuel,
    r.maintenance,
    r.operational,
    r.other,
    r.revenue,
    r.roiPct,
  ])];

  const csv = lines.map((cols) => cols.map(csvField).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transitops-fleet-report.csv"',
    },
  });
}
