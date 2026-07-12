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
import { completeTrip } from "@/app/actions/trips";
import type { TripWithRelations } from "./trips-board";

export function CompleteTripDialog({
  trip,
  open,
  onOpenChange,
}: {
  trip: TripWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [finalOdometer, setFinalOdometer] = useState("");
  const [fuelConsumedLiters, setFuelConsumedLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [revenue, setRevenue] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFinalOdometer("");
    setFuelConsumedLiters("");
    setFuelCost("");
    setRevenue("");
  }

  function handleSubmit() {
    if (!trip) return;
    startTransition(async () => {
      const result = await completeTrip(trip.id, {
        finalOdometer: Math.round(Number(finalOdometer)),
        fuelConsumedLiters: Number(fuelConsumedLiters),
        fuelCost: Math.round(Number(fuelCost)),
        revenue: Math.round(Number(revenue)),
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
          <DialogTitle>Complete Trip{trip ? ` — ${trip.code}` : ""}</DialogTitle>
          <DialogDescription>
            {trip?.vehicle
              ? `Current odometer: ${trip.vehicle.odometer.toLocaleString("en-IN")} km`
              : "Enter the closing figures for this trip."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="finalOdometer">Final Odometer (km)</Label>
            <Input
              id="finalOdometer"
              type="number"
              min={trip?.vehicle?.odometer ?? 0}
              value={finalOdometer}
              onChange={(event) => setFinalOdometer(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuelConsumedLiters">Fuel Consumed (L)</Label>
              <Input
                id="fuelConsumedLiters"
                type="number"
                min={0}
                step="0.1"
                value={fuelConsumedLiters}
                onChange={(event) => setFuelConsumedLiters(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuelCost">Fuel Cost (₹)</Label>
              <Input
                id="fuelCost"
                type="number"
                min={0}
                value={fuelCost}
                onChange={(event) => setFuelCost(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="revenue">Revenue (₹)</Label>
            <Input
              id="revenue"
              type="number"
              min={0}
              value={revenue}
              onChange={(event) => setRevenue(event.target.value)}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Completing…" : "Complete Trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
