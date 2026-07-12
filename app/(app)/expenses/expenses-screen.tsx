"use client";

import { useState } from "react";
import { Fuel, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDate } from "@/lib/format";
import { ExpenseType } from "@/lib/generated/prisma/enums";
import type { Expense, FuelLog, Trip, Vehicle } from "@/lib/generated/prisma/client";
import type { VehicleCostSummary } from "@/lib/costs";
import { LogFuelDialog } from "./log-fuel-dialog";
import { AddExpenseDialog } from "./add-expense-dialog";

export type TripOption = { id: string; code: string };
type FuelLogRow = FuelLog & { vehicle: Vehicle; trip: Trip | null };
type ExpenseRow = Expense & { vehicle: Vehicle | null; trip: Trip | null };

export function ExpensesScreen({
  fuelLogs,
  expenses,
  summary,
  totalOperationalCost,
  vehicles,
  trips,
  canManage,
}: {
  fuelLogs: FuelLogRow[];
  expenses: ExpenseRow[];
  summary: VehicleCostSummary[];
  totalOperationalCost: number;
  vehicles: Vehicle[];
  trips: TripOption[];
  canManage: boolean;
}) {
  const [fuelOpen, setFuelOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  // Keep the rollup compact — only vehicles with any cost or revenue activity.
  const activeSummary = summary.filter(
    (row) => row.operational > 0 || row.other > 0 || row.revenue > 0
  );

  return (
    <div className="flex flex-col gap-8">
      {canManage && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={() => setFuelOpen(true)}
          >
            <Fuel />
            Log Fuel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={() => setExpenseOpen(true)}
          >
            <Plus />
            Add Expense
          </Button>
        </div>
      )}

      {/* Section A — Fuel logs */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium text-foreground">Fuel Logs</h2>
          <p className="text-sm text-muted-foreground">
            All fuel purchases — including entries auto-created when a trip is completed.
          </p>
        </div>
        <div className="rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Liters</TableHead>
                <TableHead>Fuel Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-foreground">{log.vehicle.name}</TableCell>
                  <TableCell>{formatDate(log.date)}</TableCell>
                  <TableCell>{log.liters} L</TableCell>
                  <TableCell>{formatINR(log.cost)}</TableCell>
                </TableRow>
              ))}
              {fuelLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No fuel logs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Section B — Other expenses */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium text-foreground">Other Expenses (Toll / Misc)</h2>
          <p className="text-sm text-muted-foreground">
            Tolls and misc spend — tracked separately from operational cost.
          </p>
        </div>
        <div className="rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium text-foreground">
                    {expense.trip?.code ?? "—"}
                  </TableCell>
                  <TableCell>{expense.vehicle?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {expense.type === ExpenseType.TOLL ? "Toll" : "Misc"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatINR(expense.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{expense.note ?? "—"}</TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No expenses yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Section C — Auto cost summary */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium text-foreground">Cost Summary (Auto)</h2>
          <p className="text-sm text-muted-foreground">
            Computed from real records. Operational = Fuel + Maintenance; Other (toll/misc) is
            kept separate.
          </p>
        </div>
        <div className="rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Fuel</TableHead>
                <TableHead className="text-right">Maintenance</TableHead>
                <TableHead className="text-right">Operational</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeSummary.map((row) => (
                <TableRow key={row.vehicle.id}>
                  <TableCell className="font-medium text-foreground">{row.vehicle.name}</TableCell>
                  <TableCell className="text-right">{formatINR(row.fuel)}</TableCell>
                  <TableCell className="text-right">{formatINR(row.maintenance)}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {formatINR(row.operational)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatINR(row.other)}
                  </TableCell>
                  <TableCell className="text-right">{formatINR(row.revenue)}</TableCell>
                </TableRow>
              ))}
              {activeSummary.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No costs recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            Total Operational Cost (Auto) = Fuel + Maintenance
          </span>
          <span className="text-2xl font-semibold text-brand">
            {formatINR(totalOperationalCost)}
          </span>
        </div>
      </section>

      {canManage && (
        <>
          <LogFuelDialog
            vehicles={vehicles}
            trips={trips}
            open={fuelOpen}
            onOpenChange={setFuelOpen}
          />
          <AddExpenseDialog
            vehicles={vehicles}
            trips={trips}
            open={expenseOpen}
            onOpenChange={setExpenseOpen}
          />
        </>
      )}
    </div>
  );
}
