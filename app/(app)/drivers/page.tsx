import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { TripStatus } from "@/lib/generated/prisma/enums";
import { DriverTable, type DriverRow } from "./driver-table";

function tripCompletionRate(trips: { status: string }[]): string | null {
  const assigned = trips.filter((trip) => trip.status !== TripStatus.DRAFT);
  if (assigned.length === 0) return null;
  const completed = assigned.filter((trip) => trip.status === TripStatus.COMPLETED).length;
  return `${Math.round((completed / assigned.length) * 100)}%`;
}

export default async function DriversPage() {
  const session = await requirePermission("drivers", "view");
  const canManage = can(session.role, "drivers", "manage");

  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
    include: { trips: { select: { status: true } } },
  });

  const rows: DriverRow[] = drivers.map(({ trips, ...driver }) => ({
    ...driver,
    tripCompletionRate: tripCompletionRate(trips),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Driver Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Safety profiles, license status, and trip assignment eligibility.
        </p>
      </div>

      <DriverTable drivers={rows} canManage={canManage} />
    </div>
  );
}
