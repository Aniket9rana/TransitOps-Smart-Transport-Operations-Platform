"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  createVehicle,
  updateVehicle,
  type VehicleFormState,
} from "@/app/actions/vehicles";
import { VehicleType } from "@/lib/generated/prisma/enums";
import type { Vehicle } from "@/lib/generated/prisma/client";

const initialVehicleFormState: VehicleFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  VAN: "Van",
  TRUCK: "Truck",
  MINI: "Mini",
  BUS: "Bus",
  CAR: "Car",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function VehicleFormDialog({
  vehicle,
  open,
  onOpenChange,
}: {
  vehicle?: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(vehicle);
  const action = isEdit ? updateVehicle.bind(null, vehicle!.id) : createVehicle;
  const [state, formAction] = useActionState(action, initialVehicleFormState);
  const hasHandledState = useRef(state);

  useEffect(() => {
    if (state === hasHandledState.current) return;
    hasHandledState.current = state;

    if (state.status === "success" && state.message) {
      toast.success(state.message);
      onOpenChange(false);
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="contents">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this vehicle's details."
                : "Register a new vehicle. It starts as Available."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={vehicle?.registrationNumber}
                placeholder="GJ01AB452"
                required
              />
              <FieldError message={state.fieldErrors.registrationNumber} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name/Model</Label>
              <Input
                id="name"
                name="name"
                defaultValue={vehicle?.name}
                placeholder="VAN-05"
                required
              />
              <FieldError message={state.fieldErrors.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={vehicle?.type}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Select a type">
                    {(value: VehicleType | null) => (value ? VEHICLE_TYPE_LABELS[value] : null)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(VehicleType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {VEHICLE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={state.fieldErrors.type} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxLoadKg">Max Load (kg)</Label>
                <Input
                  id="maxLoadKg"
                  name="maxLoadKg"
                  type="number"
                  min={0}
                  defaultValue={vehicle?.maxLoadKg}
                  required
                />
                <FieldError message={state.fieldErrors.maxLoadKg} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="odometer">Odometer</Label>
                <Input
                  id="odometer"
                  name="odometer"
                  type="number"
                  min={0}
                  defaultValue={vehicle?.odometer}
                  required
                />
                <FieldError message={state.fieldErrors.odometer} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
              <Input
                id="acquisitionCost"
                name="acquisitionCost"
                type="number"
                min={0}
                defaultValue={vehicle?.acquisitionCost}
                required
              />
              <FieldError message={state.fieldErrors.acquisitionCost} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="region">Region (optional)</Label>
              <Input id="region" name="region" defaultValue={vehicle?.region ?? ""} />
            </div>
          </div>

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save Changes" : "Add Vehicle"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
