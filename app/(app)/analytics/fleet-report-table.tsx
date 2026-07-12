"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FleetReportRow } from "@/lib/metrics";

type SortKey = keyof Pick<
  FleetReportRow,
  "registrationNumber" | "name" | "type" | "status" | "fuel" | "maintenance" | "operational" | "other" | "revenue" | "roiPct"
>;

const COLUMNS: { key: SortKey; label: string; numeric: boolean; align?: "right" }[] = [
  { key: "registrationNumber", label: "Reg No", numeric: false },
  { key: "name", label: "Vehicle", numeric: false },
  { key: "type", label: "Type", numeric: false },
  { key: "status", label: "Status", numeric: false },
  { key: "fuel", label: "Fuel", numeric: true, align: "right" },
  { key: "maintenance", label: "Maintenance", numeric: true, align: "right" },
  { key: "operational", label: "Operational", numeric: true, align: "right" },
  { key: "other", label: "Other", numeric: true, align: "right" },
  { key: "revenue", label: "Revenue", numeric: true, align: "right" },
  { key: "roiPct", label: "ROI %", numeric: true, align: "right" },
];

export function FleetReportTable({ rows }: { rows: FleetReportRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("operational");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const column = COLUMNS.find((c) => c.key === sortKey)!;
    return [...rows].sort((a, b) => {
      let cmp: number;
      if (column.numeric) {
        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      }
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, dir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDir(key === "registrationNumber" || key === "name" || key === "type" || key === "status" ? "asc" : "desc");
    }
  }

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No vehicles to report yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => {
            const active = column.key === sortKey;
            const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
            return (
              <TableHead
                key={column.key}
                className={cn(column.align === "right" && "text-right")}
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className={cn(
                    "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                    column.align === "right" && "flex-row-reverse",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {column.label}
                  <Icon className="size-3.5" />
                </button>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.registrationNumber}>
            <TableCell className="font-medium text-foreground">
              {row.registrationNumber}
            </TableCell>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.type}</TableCell>
            <TableCell>
              <StatusBadge status={row.status} />
            </TableCell>
            <TableCell className="text-right">{formatINR(row.fuel)}</TableCell>
            <TableCell className="text-right">{formatINR(row.maintenance)}</TableCell>
            <TableCell className="text-right font-medium text-foreground">
              {formatINR(row.operational)}
            </TableCell>
            <TableCell className="text-right">{formatINR(row.other)}</TableCell>
            <TableCell className="text-right">{formatINR(row.revenue)}</TableCell>
            <TableCell
              className={cn(
                "text-right font-medium",
                row.roiPct >= 0 ? "text-status-green" : "text-status-red"
              )}
            >
              {row.roiPct}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
