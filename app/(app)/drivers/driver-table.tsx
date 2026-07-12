"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/status-badge";
import { useSort, SortHeader } from "@/components/data-table-sort";
import { cn } from "@/lib/utils";
import { formatMonthYear, maskContact } from "@/lib/format";
import { isLicenseExpired } from "@/lib/eligibility";
import { DriverStatus } from "@/lib/generated/prisma/enums";
import type { Driver } from "@/lib/generated/prisma/client";
import { updateDriverStatus, deleteDriver } from "@/app/actions/drivers";
import { DriverFormDialog } from "./driver-form-dialog";

export type DriverRow = Driver & { tripCompletionRate: string | null };

const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  OFF_DUTY: "Off Duty",
  SUSPENDED: "Suspended",
};

const MANUALLY_SELECTABLE_STATUSES: DriverStatus[] = [
  DriverStatus.AVAILABLE,
  DriverStatus.OFF_DUTY,
  DriverStatus.SUSPENDED,
];

type FilterValue = "ALL" | DriverStatus;

function SafetyBadge({ score }: { score: number }) {
  const colorClass =
    score >= 90
      ? "bg-status-green/15 text-status-green border-status-green/30"
      : score >= 70
        ? "bg-status-orange/15 text-status-orange border-status-orange/30"
        : "bg-status-red/15 text-status-red border-status-red/30";

  return (
    <Badge variant="outline" className={colorClass}>
      {score}
    </Badge>
  );
}

function DriverStatusControl({
  driver,
  onChanged,
}: {
  driver: Driver;
  onChanged: (result: { success: boolean; message: string }) => void;
}) {
  const [pending, startTransition] = useTransition();

  if (driver.status === DriverStatus.ON_TRIP) {
    return <StatusBadge status={driver.status} />;
  }

  return (
    <Select
      value={driver.status}
      disabled={pending}
      onValueChange={(value) => {
        startTransition(async () => {
          const result = await updateDriverStatus(driver.id, value as string);
          onChanged(result);
        });
      }}
    >
      <SelectTrigger size="sm" className="w-32">
        <SelectValue>
          {(value: DriverStatus | null) => (value ? DRIVER_STATUS_LABELS[value] : null)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {MANUALLY_SELECTABLE_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {DRIVER_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DriverTable({
  drivers,
  canManage,
}: {
  drivers: DriverRow[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterValue>("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);
  const [, startTransition] = useTransition();

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return drivers.filter((driver) => {
      if (statusFilter !== "ALL" && driver.status !== statusFilter) return false;
      if (
        query &&
        !driver.name.toLowerCase().includes(query) &&
        !driver.licenseNumber.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [drivers, search, statusFilter]);

  const { sorted, ...sort } = useSort<DriverRow, string>(
    filteredDrivers,
    {
      name: (d) => d.name,
      licenseNumber: (d) => d.licenseNumber,
      licenseCategory: (d) => d.licenseCategory,
      licenseExpiry: (d) => d.licenseExpiry.getTime(),
      tripCompletionRate: (d) =>
        d.tripCompletionRate ? parseInt(d.tripCompletionRate, 10) : -1,
      safetyScore: (d) => d.safetyScore,
      status: (d) => d.status,
    },
    "name"
  );

  function handleDelete(driver: DriverRow) {
    if (!window.confirm(`Delete driver ${driver.name}? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteDriver(driver.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or license no."
          className="w-56"
        />

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter((value as FilterValue) ?? "ALL")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status">
              {(value: FilterValue | null) =>
                !value || value === "ALL" ? "All Statuses" : DRIVER_STATUS_LABELS[value]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(DriverStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {DRIVER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage && (
          <Button className="ml-auto" onClick={() => setAddOpen(true)}>
            + Add Driver
          </Button>
        )}
      </div>

      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader sortKey="name" label="Driver" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="licenseNumber" label="License No" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="licenseCategory" label="Category" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="licenseExpiry" label="Expiry" state={sort} /></TableHead>
              <TableHead>Contact</TableHead>
              <TableHead><SortHeader sortKey="tripCompletionRate" label="Trip Compl." state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="safetyScore" label="Safety" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="status" label="Status" state={sort} /></TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((driver) => {
              const expired = isLicenseExpired(driver);
              return (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium text-foreground">{driver.name}</TableCell>
                  <TableCell>{driver.licenseNumber}</TableCell>
                  <TableCell>{driver.licenseCategory}</TableCell>
                  <TableCell>
                    <span className={cn(expired && "font-medium text-status-red")}>
                      {formatMonthYear(driver.licenseExpiry)}
                      {expired && " EXPIRED"}
                    </span>
                  </TableCell>
                  <TableCell>{maskContact(driver.contact)}</TableCell>
                  <TableCell>{driver.tripCompletionRate ?? "—"}</TableCell>
                  <TableCell>
                    <SafetyBadge score={driver.safetyScore} />
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <DriverStatusControl
                        driver={driver}
                        onChanged={(result) => {
                          if (result.success) toast.success(result.message);
                          else toast.error(result.message);
                        }}
                      />
                    ) : (
                      <StatusBadge status={driver.status} />
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDriver(driver)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(driver)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filteredDrivers.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 9 : 8} className="text-center text-muted-foreground">
                  No drivers match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Expired license or Suspended status → blocked from trip assignment.
      </p>

      {canManage && (
        <>
          <DriverFormDialog key={addOpen ? "add-open" : "add-closed"} open={addOpen} onOpenChange={setAddOpen} />
          <DriverFormDialog
            key={editingDriver?.id ?? "edit-none"}
            driver={editingDriver ?? undefined}
            open={editingDriver !== null}
            onOpenChange={(next) => {
              if (!next) setEditingDriver(null);
            }}
          />
        </>
      )}
    </div>
  );
}
