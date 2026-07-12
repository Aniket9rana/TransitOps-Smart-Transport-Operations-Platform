import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { isVehicleDispatchable, isDriverAssignable } from "@/lib/eligibility";
import { TripsBoard } from "./trips-board";

export default async function TripsPage() {
  const session = await requirePermission("trips", "view");
  const canManage = can(session.role, "trips", "manage");

  const [trips, vehicles, drivers] = await Promise.all([
    prisma.trip.findMany({
      include: { vehicle: true, driver: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vehicle.findMany({ orderBy: { name: "asc" } }),
    prisma.driver.findMany({ orderBy: { name: "asc" } }),
  ]);

  const eligibleVehicles = vehicles.filter(isVehicleDispatchable);
  const eligibleDrivers = drivers.filter(isDriverAssignable);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Trip Dispatcher</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan, dispatch, and track trips across the fleet.
        </p>
      </div>

      <TripsBoard
        trips={trips}
        vehicles={eligibleVehicles}
        drivers={eligibleDrivers}
        canManage={canManage}
      />
    </div>
  );
}
