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
import { StatusBadge } from "@/components/status-badge";
import { formatKg } from "@/lib/format";
import { capacityExceededBy } from "@/lib/trip-lifecycle";
import { cn } from "@/lib/utils";
import type { Vehicle, Driver } from "@/lib/generated/prisma/client";
import {
  createAndDispatchTrip,
  saveDraft,
  updateDraft,
  dispatchTrip,
  type TripInput,
} from "@/app/actions/trips";
import type { TripWithRelations } from "./trips-board";

const UNASSIGNED = "unassigned";

export function TripForm({
  vehicles,
  drivers,
  canManage,
  editingTrip,
  onDoneEditing,
}: {
  vehicles: Vehicle[];
  drivers: Driver[];
  canManage: boolean;
  editingTrip: TripWithRelations | null;
  onDoneEditing: () => void;
}) {
  const [source, setSource] = useState(editingTrip?.source ?? "");
  const [destination, setDestination] = useState(editingTrip?.destination ?? "");
  const [vehicleId, setVehicleId] = useState<string | null>(editingTrip?.vehicleId ?? null);
  const [driverId, setDriverId] = useState<string | null>(editingTrip?.driverId ?? null);
  const [cargoWeightKg, setCargoWeightKg] = useState(
    editingTrip ? String(editingTrip.cargoWeightKg) : ""
  );
  const [plannedDistanceKm, setPlannedDistanceKm] = useState(
    editingTrip ? String(editingTrip.plannedDistanceKm) : ""
  );
  const [isPending, startTransition] = useTransition();

  // The vehicle/driver assigned to a draft being edited might have fallen
  // out of the eligible list (e.g. sent to shop) since the draft was saved.
  // Keep it selectable so the current assignment is never silently dropped.
  const vehicleOptions = useMemo(() => {
    if (editingTrip?.vehicle && !vehicles.some((v) => v.id === editingTrip.vehicle!.id)) {
      return [editingTrip.vehicle, ...vehicles];
    }
    return vehicles;
  }, [vehicles, editingTrip]);

  const driverOptions = useMemo(() => {
    if (editingTrip?.driver && !drivers.some((d) => d.id === editingTrip.driver!.id)) {
      return [editingTrip.driver, ...drivers];
    }
    return drivers;
  }, [drivers, editingTrip]);

  const selectedVehicle = vehicleOptions.find((v) => v.id === vehicleId);
  const cargoNum = Number(cargoWeightKg);
  const showCapacityBox =
    Boolean(selectedVehicle) && cargoWeightKg.trim() !== "" && Number.isFinite(cargoNum);
  const overBy =
    selectedVehicle && Number.isFinite(cargoNum)
      ? capacityExceededBy(cargoNum, selectedVehicle.maxLoadKg)
      : 0;

  const missingAssignment = !vehicleId || !driverId;
  const dispatchDisabled = missingAssignment || overBy > 0 || isPending;

  function buildPayload(): TripInput {
    return {
      source: source.trim(),
      destination: destination.trim(),
      vehicleId,
      driverId,
      cargoWeightKg: Math.round(Number(cargoWeightKg) || 0),
      plannedDistanceKm: Math.round(Number(plannedDistanceKm) || 0),
    };
  }

  function handleClear() {
    setSource("");
    setDestination("");
    setVehicleId(null);
    setDriverId(null);
    setCargoWeightKg("");
    setPlannedDistanceKm("");
    onDoneEditing();
  }

  function handleSaveDraft() {
    const payload = buildPayload();
    startTransition(async () => {
      const result = editingTrip
        ? await updateDraft(editingTrip.id, payload)
        : await saveDraft(payload);
      if (result.success) {
        toast.success(result.message);
        handleClear();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleDispatch() {
    const payload = buildPayload();
    startTransition(async () => {
      if (editingTrip) {
        const updateResult = await updateDraft(editingTrip.id, payload);
        if (!updateResult.success) {
          toast.error(updateResult.message);
          return;
        }
        const dispatchResult = await dispatchTrip(editingTrip.id);
        if (dispatchResult.success) {
          toast.success(dispatchResult.message);
          handleClear();
        } else {
          toast.error(dispatchResult.message);
        }
        return;
      }

      const result = await createAndDispatchTrip(payload);
      if (result.success) {
        toast.success(result.message);
        handleClear();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingTrip ? `Edit Draft — ${editingTrip.code}` : "Create Trip"}</CardTitle>
        <CardDescription>
          <span className="mb-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status="DRAFT" />
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <StatusBadge status="DISPATCHED" />
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <StatusBadge status="COMPLETED" />
            <span className="px-1 text-muted-foreground">·</span>
            <StatusBadge status="CANCELLED" />
          </span>
          {editingTrip
            ? "Update this draft, then dispatch or save."
            : "Plan a trip. Dispatch it now, or save it as a draft for later."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Gandhinagar Depot"
            disabled={!canManage}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Ahmedabad Hub"
            disabled={!canManage}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vehicle">Vehicle</Label>
          <Select
            value={vehicleId ?? UNASSIGNED}
            onValueChange={(value) => setVehicleId(value === UNASSIGNED ? null : (value as string))}
            disabled={!canManage}
          >
            <SelectTrigger id="vehicle" className="w-full">
              <SelectValue placeholder="Select a vehicle">
                {(value: string | null) => {
                  if (!value || value === UNASSIGNED) return "Unassigned";
                  const vehicle = vehicleOptions.find((v) => v.id === value);
                  return vehicle ? `${vehicle.name} — ${formatKg(vehicle.maxLoadKg)} capacity` : "Unassigned";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {vehicleOptions.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} — {formatKg(vehicle.maxLoadKg)} capacity
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="driver">Driver</Label>
          <Select
            value={driverId ?? UNASSIGNED}
            onValueChange={(value) => setDriverId(value === UNASSIGNED ? null : (value as string))}
            disabled={!canManage}
          >
            <SelectTrigger id="driver" className="w-full">
              <SelectValue placeholder="Select a driver">
                {(value: string | null) => {
                  if (!value || value === UNASSIGNED) return "Unassigned";
                  const driver = driverOptions.find((d) => d.id === value);
                  return driver ? `${driver.name} — ${driver.licenseCategory}` : "Unassigned";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {driverOptions.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name} — {driver.licenseCategory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cargoWeightKg">Cargo Weight (kg)</Label>
            <Input
              id="cargoWeightKg"
              type="number"
              min={0}
              value={cargoWeightKg}
              onChange={(event) => setCargoWeightKg(event.target.value)}
              disabled={!canManage}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plannedDistanceKm">Planned Distance (km)</Label>
            <Input
              id="plannedDistanceKm"
              type="number"
              min={0}
              value={plannedDistanceKm}
              onChange={(event) => setPlannedDistanceKm(event.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>

        {showCapacityBox && selectedVehicle && (
          <div
            className={cn(
              "rounded-lg border p-3 text-sm",
              overBy > 0
                ? "border-status-red/40 bg-status-red/10"
                : "border-status-green/40 bg-status-green/10"
            )}
          >
            <p className="text-foreground">
              Vehicle Capacity: {formatKg(selectedVehicle.maxLoadKg)} / Cargo Weight:{" "}
              {formatKg(Math.max(0, cargoNum))}
            </p>
            {overBy > 0 && (
              <p className="mt-1 font-medium text-status-red">
                ❌ Capacity exceeded by {formatKg(overBy)} — dispatch blocked
              </p>
            )}
          </div>
        )}

        {canManage ? (
          <>
            {missingAssignment && (
              <p className="text-xs text-muted-foreground">Assign vehicle &amp; driver to dispatch</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                disabled={dispatchDisabled}
                onClick={handleDispatch}
              >
                {isPending ? "Working…" : "Dispatch"}
              </Button>
              <Button variant="secondary" disabled={isPending} onClick={handleSaveDraft}>
                Save as Draft
              </Button>
              <Button variant="ghost" disabled={isPending} onClick={handleClear}>
                Clear
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            View-only — Dispatchers can create and dispatch trips.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
