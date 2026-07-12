import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { requirePermission } from "@/lib/rbac";
import { formatINR } from "@/lib/format";
import { totalOperationalCost } from "@/lib/costs";
import {
  dashboardKpis,
  fuelEfficiencyKmPerL,
  fleetROIPct,
  monthlyRevenue,
  costliestVehicles,
  fleetReportRows,
} from "@/lib/metrics";
import { RevenueChart } from "./revenue-chart";
import { CostliestVehicles } from "./costliest-vehicles";
import { ExportButtons } from "./export-buttons";
import { FleetReportTable } from "./fleet-report-table";

export default async function AnalyticsPage() {
  await requirePermission("analytics", "view");

  const [fuelEfficiency, kpis, operationalCost, roiPct, revenue, costliest, rows] =
    await Promise.all([
      fuelEfficiencyKmPerL(),
      dashboardKpis(),
      totalOperationalCost(),
      fleetROIPct(),
      monthlyRevenue(),
      costliestVehicles(5),
      fleetReportRows(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Fleet efficiency, cost, and return on investment.
          </p>
        </div>
        <ExportButtons
          rows={rows}
          headline={{
            fuelEfficiency,
            utilizationPct: kpis.fleetUtilizationPct,
            operationalCost,
            roiPct,
          }}
        />
      </div>

      {/* Headline KPIs — utilization shares lib/metrics.ts with the dashboard */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Fuel Efficiency" value={`${fuelEfficiency} km/l`} accent="blue" />
        <KpiCard
          label="Fleet Utilization"
          value={`${kpis.fleetUtilizationPct}%`}
          accent="green"
        />
        <KpiCard label="Operational Cost" value={formatINR(operationalCost)} accent="orange" />
        <KpiCard label="Vehicle ROI" value={`${roiPct}%`} accent="green" />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Costliest Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <CostliestVehicles vehicles={costliest} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-Vehicle Report</CardTitle>
        </CardHeader>
        <CardContent>
          <FleetReportTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
