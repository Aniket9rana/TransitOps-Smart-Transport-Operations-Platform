import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { MaintenanceStatus } from "@/lib/generated/prisma/enums";
import { MaintenanceScreen } from "./maintenance-screen";

export default async function MaintenancePage() {
  const session = await requirePermission("maintenance", "view");
  const canManage = can(session.role, "maintenance", "manage");

  const [logs, vehicles] = await Promise.all([
    prisma.maintenanceLog.findMany({
      include: { vehicle: true },
      // Active (in-shop) records first, newest service date on top.
      orderBy: [{ status: "asc" }, { date: "desc" }],
    }),
    prisma.vehicle.findMany({ orderBy: { name: "asc" } }),
  ]);

  const inShopCount = logs.filter((log) => log.status === MaintenanceStatus.ACTIVE).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log service records, send vehicles to the shop, and restore them when the work is done.
          {inShopCount > 0 && (
            <>
              {" "}
              <span className="text-status-orange">
                {inShopCount} vehicle{inShopCount === 1 ? "" : "s"} in shop.
              </span>
            </>
          )}
        </p>
      </div>

      <MaintenanceScreen logs={logs} vehicles={vehicles} canManage={canManage} />
    </div>
  );
}
