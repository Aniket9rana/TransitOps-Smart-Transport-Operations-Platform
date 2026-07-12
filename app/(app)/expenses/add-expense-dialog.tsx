"use client";

import { useState, useTransition } from "react";
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
import { createExpense } from "@/app/actions/expenses";
import { ExpenseType } from "@/lib/generated/prisma/enums";
import type { Vehicle } from "@/lib/generated/prisma/client";
import type { TripOption } from "./expenses-screen";

const NO_TRIP = "none";

const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  TOLL: "Toll",
  MISC: "Misc",
};

export function AddExpenseDialog({
  vehicles,
  trips,
  open,
  onOpenChange,
}: {
  vehicles: Vehicle[];
  trips: TripOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [tripId, setTripId] = useState<string>(NO_TRIP);
  const [type, setType] = useState<ExpenseType>(ExpenseType.TOLL);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setVehicleId("");
    setTripId(NO_TRIP);
    setType(ExpenseType.TOLL);
    setAmount("");
    setNote("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createExpense({
        vehicleId,
        tripId: tripId === NO_TRIP ? null : tripId,
        type,
        amount: Math.round(Number(amount) || 0),
        note: note.trim() || null,
      });
      if (result.success) {
        toast.success(result.message);
        reset();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Toll and misc spend — tracked separately from operational cost.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-vehicle">Vehicle</Label>
            <Select value={vehicleId} onValueChange={(value) => setVehicleId(value as string)}>
              <SelectTrigger id="expense-vehicle" className="w-full">
                <SelectValue placeholder="Select a vehicle">
                  {(value: string | null) => {
                    const vehicle = vehicles.find((v) => v.id === value);
                    return vehicle ? vehicle.name : "Select a vehicle";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} — {vehicle.registrationNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-trip">Trip (optional)</Label>
            <Select value={tripId} onValueChange={(value) => setTripId((value as string) ?? NO_TRIP)}>
              <SelectTrigger id="expense-trip" className="w-full">
                <SelectValue placeholder="No trip">
                  {(value: string | null) => {
                    if (!value || value === NO_TRIP) return "No trip";
                    const trip = trips.find((t) => t.id === value);
                    return trip ? trip.code : "No trip";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TRIP}>No trip</SelectItem>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expense-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as ExpenseType)}>
                <SelectTrigger id="expense-type" className="w-full">
                  <SelectValue placeholder="Type">
                    {(value: ExpenseType | null) =>
                      value ? EXPENSE_TYPE_LABELS[value] : "Type"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ExpenseType).map((expenseType) => (
                    <SelectItem key={expenseType} value={expenseType}>
                      {EXPENSE_TYPE_LABELS[expenseType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expense-amount">Amount (₹)</Label>
              <Input
                id="expense-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="340"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-note">Note (optional)</Label>
            <Input
              id="expense-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ahmedabad toll plaza"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? "Saving…" : "Add Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
