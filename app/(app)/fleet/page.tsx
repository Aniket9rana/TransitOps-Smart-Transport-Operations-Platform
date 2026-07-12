import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { FleetTable } from "./fleet-table";

export default async function FleetPage() {
  const session = await requirePermission("fleet", "view");
  const canManage = can(session.role, "fleet", "manage");

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { registrationNumber: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Vehicle Registry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track the fleet, its capacity, and its dispatch status.
        </p>
      </div>

      <FleetTable vehicles={vehicles} canManage={canManage} />
    </div>
  );
}
