import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { fleetCostSummary, totalOperationalCost } from "@/lib/costs";
import { ExpensesScreen } from "./expenses-screen";

export default async function ExpensesPage() {
  const session = await requirePermission("expenses", "view");
  const canManage = can(session.role, "expenses", "manage");

  const [fuelLogs, expenses, summary, totalOpCost, vehicles, trips] = await Promise.all([
    prisma.fuelLog.findMany({
      include: { vehicle: true, trip: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      include: { vehicle: true, trip: true },
      orderBy: { createdAt: "desc" },
    }),
    fleetCostSummary(),
    totalOperationalCost(),
    prisma.vehicle.findMany({ orderBy: { name: "asc" } }),
    prisma.trip.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Fuel &amp; Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track fuel, tolls, and misc spend. Operational cost (Fuel + Maintenance) rolls up
          automatically per vehicle.
        </p>
      </div>

      <ExpensesScreen
        fuelLogs={fuelLogs}
        expenses={expenses}
        summary={summary}
        totalOperationalCost={totalOpCost}
        vehicles={vehicles}
        trips={trips}
        canManage={canManage}
      />
    </div>
  );
}
