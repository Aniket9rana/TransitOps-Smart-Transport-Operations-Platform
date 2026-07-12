"use client";

import { useState } from "react";
import type { Trip, Vehicle, Driver } from "@/lib/generated/prisma/client";
import { TripForm } from "./trip-form";
import { TripCard } from "./trip-card";
import { CompleteTripDialog } from "./complete-trip-dialog";

export type TripWithRelations = Trip & { vehicle: Vehicle | null; driver: Driver | null };

export function TripsBoard({
  trips,
  vehicles,
  drivers,
  canManage,
}: {
  trips: TripWithRelations[];
  vehicles: Vehicle[];
  drivers: Driver[];
  canManage: boolean;
}) {
  const [editingTrip, setEditingTrip] = useState<TripWithRelations | null>(null);
  const [completingTrip, setCompletingTrip] = useState<TripWithRelations | null>(null);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[420px_1fr]">
      <TripForm
        key={editingTrip?.id ?? "new"}
        vehicles={vehicles}
        drivers={drivers}
        canManage={canManage}
        editingTrip={editingTrip}
        onDoneEditing={() => setEditingTrip(null)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-base font-medium text-foreground">Live Board</h2>
          <span className="text-xs text-muted-foreground">{trips.length} trips</span>
        </div>

        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              canManage={canManage}
              onEdit={() => setEditingTrip(trip)}
              onComplete={() => setCompletingTrip(trip)}
            />
          ))}
          {trips.length === 0 && (
            <p className="rounded-xl py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
              No trips yet.
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          On Complete: odometer → fuel log → Vehicle &amp; Driver back to Available.
        </p>
      </div>

      <CompleteTripDialog
        trip={completingTrip}
        open={completingTrip !== null}
        onOpenChange={(open) => {
          if (!open) setCompletingTrip(null);
        }}
      />
    </div>
  );
}
