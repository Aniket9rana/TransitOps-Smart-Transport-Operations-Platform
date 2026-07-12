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
  createDriver,
  updateDriver,
  type DriverFormState,
} from "@/app/actions/drivers";
import { LicenseCategory } from "@/lib/generated/prisma/enums";
import type { Driver } from "@/lib/generated/prisma/client";

const initialDriverFormState: DriverFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

const LICENSE_CATEGORY_LABELS: Record<LicenseCategory, string> = {
  LMV: "LMV",
  HMV: "HMV",
};

function toDateInputValue(date?: Date): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

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

export function DriverFormDialog({
  driver,
  open,
  onOpenChange,
}: {
  driver?: Driver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(driver);
  const action = isEdit ? updateDriver.bind(null, driver!.id) : createDriver;
  const [state, formAction] = useActionState(action, initialDriverFormState);
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
            <DialogTitle>{isEdit ? "Edit Driver" : "Add Driver"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this driver's profile."
                : "Register a new driver. They start as Available."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={driver?.name} required />
              <FieldError message={state.fieldErrors.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                defaultValue={driver?.licenseNumber}
                placeholder="DL-88213"
                required
              />
              <FieldError message={state.fieldErrors.licenseNumber} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="licenseCategory">License Category</Label>
                <Select name="licenseCategory" defaultValue={driver?.licenseCategory}>
                  <SelectTrigger id="licenseCategory" className="w-full">
                    <SelectValue placeholder="Category">
                      {(value: LicenseCategory | null) =>
                        value ? LICENSE_CATEGORY_LABELS[value] : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LicenseCategory).map((category) => (
                      <SelectItem key={category} value={category}>
                        {LICENSE_CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={state.fieldErrors.licenseCategory} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input
                  id="licenseExpiry"
                  name="licenseExpiry"
                  type="date"
                  defaultValue={toDateInputValue(driver?.licenseExpiry)}
                  required
                />
                <FieldError message={state.fieldErrors.licenseExpiry} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                name="contact"
                defaultValue={driver?.contact}
                placeholder="9876543210"
                required
              />
              <FieldError message={state.fieldErrors.contact} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="safetyScore">Safety Score (0-100)</Label>
              <Input
                id="safetyScore"
                name="safetyScore"
                type="number"
                min={0}
                max={100}
                defaultValue={driver?.safetyScore}
                required
              />
              <FieldError message={state.fieldErrors.safetyScore} />
            </div>
          </div>

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save Changes" : "Add Driver"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
