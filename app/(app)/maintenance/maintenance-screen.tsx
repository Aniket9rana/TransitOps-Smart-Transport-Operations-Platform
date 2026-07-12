"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { StatusBadge } from "@/components/status-badge";
import { formatINR, formatDate } from "@/lib/format";
import { vehicleBlockReason } from "@/lib/eligibility";
import { MaintenanceStatus, VehicleStatus } from "@/lib/generated/prisma/enums";
import type { MaintenanceLog, Vehicle } from "@/lib/generated/prisma/client";
import {
  createMaintenance,
  closeMaintenance,
  deleteMaintenance,
} from "@/app/actions/maintenance";

type MaintenanceLogWithVehicle = MaintenanceLog & { vehicle: Vehicle };

const UNSELECTED = "";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function MaintenanceScreen({
  logs,
  vehicles,
  canManage,
}: {
  logs: MaintenanceLogWithVehicle[];
  vehicles: Vehicle[];
  canManage: boolean;
}) {
  return (
    <div
      className={
        canManage
          ? "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]"
          : "grid grid-cols-1 gap-6"
      }
    >
      {canManage && <LogServiceForm vehicles={vehicles} />}
      <ServiceLog logs={logs} canManage={canManage} />
    </div>
  );
}

function LogServiceForm({ vehicles }: { vehicles: Vehicle[] }) {
  const [vehicleId, setVehicleId] = useState<string>(UNSELECTED);
  const [serviceType, setServiceType] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayIso());
  const [isPending, startTransition] = useTransition();

  const vehicleLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      const reason = vehicleBlockReason(vehicle);
      map.set(vehicle.id, reason ? `${vehicle.name} — ${reason.toLowerCase()}` : vehicle.name);
    }
    return map;
  }, [vehicles]);

  function reset() {
    setVehicleId(UNSELECTED);
    setServiceType("");
    setCost("");
    setDate(todayIso());
  }

  function handleSave() {
    startTransition(async () => {
      const result = await createMaintenance({
        vehicleId,
        serviceType: serviceType.trim(),
        cost: Math.round(Number(cost) || 0),
        date,
      });
      if (result.success) {
        toast.success(result.message);
        reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Log Service Record</CardTitle>
        <CardDescription>
          Logging a service sends an available vehicle to the shop.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vehicle">Vehicle</Label>
          <Select
            value={vehicleId}
            onValueChange={(value) => setVehicleId((value as string) ?? UNSELECTED)}
          >
            <SelectTrigger id="vehicle" className="w-full">
              <SelectValue placeholder="Select a vehicle">
                {(value: string | null) =>
                  value ? vehicleLabel.get(value) ?? "Select a vehicle" : "Select a vehicle"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => {
                const blocked = vehicle.status !== VehicleStatus.AVAILABLE;
                return (
                  <SelectItem key={vehicle.id} value={vehicle.id} disabled={blocked}>
                    {vehicleLabel.get(vehicle.id)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Only Available vehicles can be serviced — others are greyed out.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceType">Service Type</Label>
          <Input
            id="serviceType"
            value={serviceType}
            onChange={(event) => setServiceType(event.target.value)}
            placeholder="Oil Change"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cost">Cost (₹)</Label>
            <Input
              id="cost"
              type="number"
              min={0}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="6200"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label>Status</Label>
          <StatusBadge status={MaintenanceStatus.ACTIVE} />
          <span className="text-xs text-muted-foreground">New records are always Active.</span>
        </div>

        <Button
          className="mt-1 bg-brand text-brand-foreground hover:bg-brand-hover"
          disabled={isPending}
          onClick={handleSave}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>

        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <StatusBadge status="AVAILABLE" />
            <span className="text-muted-foreground">(creating active record)</span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <StatusBadge status="IN_SHOP" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <StatusBadge status="IN_SHOP" />
            <span className="text-muted-foreground">(closing record, not retired)</span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <StatusBadge status="AVAILABLE" />
          </div>
          <p className="text-xs text-muted-foreground">
            In Shop vehicles are removed from the dispatch pool.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceLog({
  logs,
  canManage,
}: {
  logs: MaintenanceLogWithVehicle[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClose(log: MaintenanceLogWithVehicle) {
    startTransition(async () => {
      const result = await closeMaintenance(log.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleDelete(log: MaintenanceLogWithVehicle) {
    if (!window.confirm(`Delete this ${log.serviceType} record? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteMaintenance(log.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Service Log</h2>
      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-24 text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const isActive = log.status === MaintenanceStatus.ACTIVE;
              return (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-foreground">
                    {log.vehicle.name}
                  </TableCell>
                  <TableCell>{log.serviceType}</TableCell>
                  <TableCell>{formatINR(log.cost)}</TableCell>
                  <TableCell>{formatDate(log.date)}</TableCell>
                  <TableCell>
                    {/* An active record means the vehicle is in the shop. */}
                    <StatusBadge status={isActive ? "IN_SHOP" : "COMPLETED"} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleClose(log)}
                        >
                          Close
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleDelete(log)}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {logs.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 6 : 5}
                  className="text-center text-muted-foreground"
                >
                  No service records yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
