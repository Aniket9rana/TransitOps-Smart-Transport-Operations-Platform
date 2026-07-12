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
import { createFuelLog } from "@/app/actions/expenses";
import type { Vehicle } from "@/lib/generated/prisma/client";
import type { TripOption } from "./expenses-screen";

const NO_TRIP = "none";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function LogFuelDialog({
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
  const [date, setDate] = useState(todayIso());
  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setVehicleId("");
    setTripId(NO_TRIP);
    setDate(todayIso());
    setLiters("");
    setCost("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createFuelLog({
        vehicleId,
        tripId: tripId === NO_TRIP ? null : tripId,
        date,
        liters: Number(liters),
        cost: Math.round(Number(cost) || 0),
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
          <DialogTitle>Log Fuel</DialogTitle>
          <DialogDescription>Record a fuel purchase against a vehicle.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fuel-vehicle">Vehicle</Label>
            <Select value={vehicleId} onValueChange={(value) => setVehicleId(value as string)}>
              <SelectTrigger id="fuel-vehicle" className="w-full">
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
            <Label htmlFor="fuel-trip">Trip (optional)</Label>
            <Select value={tripId} onValueChange={(value) => setTripId((value as string) ?? NO_TRIP)}>
              <SelectTrigger id="fuel-trip" className="w-full">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fuel-date">Date</Label>
            <Input
              id="fuel-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-liters">Liters</Label>
              <Input
                id="fuel-liters"
                type="number"
                min={0}
                step="0.1"
                value={liters}
                onChange={(event) => setLiters(event.target.value)}
                placeholder="42"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-cost">Cost (₹)</Label>
              <Input
                id="fuel-cost"
                type="number"
                min={0}
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                placeholder="3150"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? "Saving…" : "Log Fuel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
