"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { estimateEtaMinutes } from "@/lib/trip-lifecycle";
import { TripStatus } from "@/lib/generated/prisma/enums";
import { dispatchTrip, cancelTrip } from "@/app/actions/trips";
import type { TripWithRelations } from "./trips-board";

function assignmentText(trip: TripWithRelations): string {
  if (!trip.vehicle && !trip.driver) return "Unassigned";
  if (trip.vehicle && !trip.driver) return `${trip.vehicle.name} / Awaiting driver`;
  if (!trip.vehicle && trip.driver) return `Awaiting vehicle / ${trip.driver.name}`;
  return `${trip.vehicle!.name} / ${trip.driver!.name}`;
}

function tripNote(trip: TripWithRelations): string {
  switch (trip.status) {
    case TripStatus.DISPATCHED:
      return `~${estimateEtaMinutes(trip.plannedDistanceKm)} min`;
    case TripStatus.DRAFT:
      if (trip.vehicle && !trip.driver) return "Awaiting driver";
      if (!trip.vehicle && trip.driver) return "Awaiting vehicle";
      return "Awaiting dispatch";
    case TripStatus.COMPLETED:
      return trip.completedAt
        ? `Completed ${trip.completedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
        : "Completed";
    case TripStatus.CANCELLED:
      return trip.cancelReason || "Cancelled";
    default:
      return "";
  }
}

export function TripCard({
  trip,
  canManage,
  onEdit,
  onComplete,
}: {
  trip: TripWithRelations;
  canManage: boolean;
  onEdit: () => void;
  onComplete: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDispatch() {
    startTransition(async () => {
      const result = await dispatchTrip(trip.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleCancel() {
    if (!window.confirm(`Cancel trip ${trip.code}?`)) return;
    const reason =
      trip.status === TripStatus.DISPATCHED
        ? window.prompt("Reason for cancellation (optional):")?.trim() || undefined
        : undefined;
    startTransition(async () => {
      const result = await cancelTrip(trip.id, reason);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const canDispatchFromCard = Boolean(trip.vehicleId) && Boolean(trip.driverId);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">{trip.code}</span>
            <StatusBadge status={trip.status} />
          </div>
          <p className="text-sm text-foreground">
            {trip.source} → {trip.destination}
          </p>
          <p className="text-xs text-muted-foreground">{assignmentText(trip)}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="text-xs whitespace-nowrap text-muted-foreground">{tripNote(trip)}</p>
          {canManage && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {trip.status === TripStatus.DRAFT && (
                <>
                  <Button
                    size="sm"
                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                    disabled={!canDispatchFromCard || isPending}
                    title={!canDispatchFromCard ? "Assign vehicle & driver first" : undefined}
                    onClick={handleDispatch}
                  >
                    Dispatch
                  </Button>
                  <Button size="sm" variant="outline" disabled={isPending} onClick={onEdit}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" disabled={isPending} onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              )}
              {trip.status === TripStatus.DISPATCHED && (
                <>
                  <Button size="sm" onClick={onComplete}>
                    Complete
                  </Button>
                  <Button size="sm" variant="destructive" disabled={isPending} onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
