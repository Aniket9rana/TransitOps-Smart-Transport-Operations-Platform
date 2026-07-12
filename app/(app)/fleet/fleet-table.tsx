"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatINR, formatKg } from "@/lib/format";
import { VehicleType, VehicleStatus } from "@/lib/generated/prisma/enums";
import type { Vehicle } from "@/lib/generated/prisma/client";
import { retireVehicle, reactivateVehicle, deleteVehicle } from "@/app/actions/vehicles";
import { VehicleFormDialog } from "./vehicle-form-dialog";

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  VAN: "Van",
  TRUCK: "Truck",
  MINI: "Mini",
  BUS: "Bus",
  CAR: "Car",
};

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  IN_SHOP: "In Shop",
  RETIRED: "Retired",
};

type FilterValue<T extends string> = "ALL" | T;

export function FleetTable({
  vehicles,
  canManage,
}: {
  vehicles: Vehicle[];
  canManage: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState<FilterValue<VehicleType>>("ALL");
  const [statusFilter, setStatusFilter] = useState<FilterValue<VehicleStatus>>("ALL");
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [, startTransition] = useTransition();

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (typeFilter !== "ALL" && vehicle.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && vehicle.status !== statusFilter) return false;
      if (query && !vehicle.registrationNumber.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [vehicles, typeFilter, statusFilter, search]);

  const { sorted, ...sort } = useSort<Vehicle, string>(
    filteredVehicles,
    {
      registrationNumber: (v) => v.registrationNumber,
      name: (v) => v.name,
      type: (v) => v.type,
      maxLoadKg: (v) => v.maxLoadKg,
      odometer: (v) => v.odometer,
      acquisitionCost: (v) => v.acquisitionCost,
      status: (v) => v.status,
    },
    "registrationNumber"
  );

  function handleRetire(vehicle: Vehicle) {
    startTransition(async () => {
      const result = await retireVehicle(vehicle.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleReactivate(vehicle: Vehicle) {
    startTransition(async () => {
      const result = await reactivateVehicle(vehicle.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleDelete(vehicle: Vehicle) {
    if (!window.confirm(`Delete vehicle ${vehicle.registrationNumber}? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteVehicle(vehicle.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter((value as FilterValue<VehicleType>) ?? "ALL")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type">
              {(value: FilterValue<VehicleType> | null) =>
                !value || value === "ALL" ? "All Types" : VEHICLE_TYPE_LABELS[value]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {Object.values(VehicleType).map((type) => (
              <SelectItem key={type} value={type}>
                {VEHICLE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter((value as FilterValue<VehicleStatus>) ?? "ALL")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status">
              {(value: FilterValue<VehicleStatus> | null) =>
                !value || value === "ALL" ? "All Statuses" : VEHICLE_STATUS_LABELS[value]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(VehicleStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {VEHICLE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reg. no."
          className="w-48"
        />

        {canManage && (
          <Button className="ml-auto" onClick={() => setAddOpen(true)}>
            + Add Vehicle
          </Button>
        )}
      </div>

      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader sortKey="registrationNumber" label="Reg. No." state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="name" label="Name/Model" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="type" label="Type" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="maxLoadKg" label="Capacity" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="odometer" label="Odometer" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="acquisitionCost" label="Acq. Cost" state={sort} /></TableHead>
              <TableHead><SortHeader sortKey="status" label="Status" state={sort} /></TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium text-foreground">
                  {vehicle.registrationNumber}
                </TableCell>
                <TableCell>{vehicle.name}</TableCell>
                <TableCell>{VEHICLE_TYPE_LABELS[vehicle.type]}</TableCell>
                <TableCell>{formatKg(vehicle.maxLoadKg)}</TableCell>
                <TableCell>{vehicle.odometer.toLocaleString("en-IN")} km</TableCell>
                <TableCell>{formatINR(vehicle.acquisitionCost)}</TableCell>
                <TableCell>
                  <StatusBadge status={vehicle.status} />
                </TableCell>
                {canManage && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingVehicle(vehicle)}>
                          Edit
                        </DropdownMenuItem>
                        {vehicle.status === VehicleStatus.RETIRED ? (
                          <DropdownMenuItem onClick={() => handleReactivate(vehicle)}>
                            Reactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleRetire(vehicle)}>
                            Retire
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(vehicle)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredVehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 8 : 7} className="text-center text-muted-foreground">
                  No vehicles match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Registration No. must be unique · Retired / In Shop vehicles are hidden from Trip Dispatcher.
      </p>

      {canManage && (
        <>
          <VehicleFormDialog key={addOpen ? "add-open" : "add-closed"} open={addOpen} onOpenChange={setAddOpen} />
          <VehicleFormDialog
            key={editingVehicle?.id ?? "edit-none"}
            vehicle={editingVehicle ?? undefined}
            open={editingVehicle !== null}
            onOpenChange={(next) => {
              if (!next) setEditingVehicle(null);
            }}
          />
        </>
      )}
    </div>
  );
}
