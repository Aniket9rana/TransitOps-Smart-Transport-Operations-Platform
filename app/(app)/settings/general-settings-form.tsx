"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { saveOrgSettings } from "@/app/actions/settings";
import type { OrgSettingsView } from "@/lib/org-settings";

const CURRENCY_LABELS: Record<string, string> = {
  INR: "INR ₹",
  USD: "USD $",
};

const DISTANCE_LABELS: Record<string, string> = {
  Kilometers: "Kilometers",
  Miles: "Miles",
};

export function GeneralSettingsForm({
  settings,
  canManage,
}: {
  settings: OrgSettingsView;
  canManage: boolean;
}) {
  const [depotName, setDepotName] = useState(settings.depotName);
  const [currency, setCurrency] = useState(settings.currency);
  const [distanceUnit, setDistanceUnit] = useState(settings.distanceUnit);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveOrgSettings({ depotName, currency, distanceUnit });
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="depotName">Depot Name</Label>
        <Input
          id="depotName"
          value={depotName}
          onChange={(event) => setDepotName(event.target.value)}
          disabled={!canManage}
          placeholder="Gandhinagar Depot GJ4"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Currency</Label>
        <Select
          value={currency}
          onValueChange={(value) => value && setCurrency(value as string)}
          disabled={!canManage}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: string | null) =>
                value ? (CURRENCY_LABELS[value] ?? value) : "Select currency"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INR">INR ₹</SelectItem>
            <SelectItem value="USD">USD $</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Distance Unit</Label>
        <Select
          value={distanceUnit}
          onValueChange={(value) => value && setDistanceUnit(value as string)}
          disabled={!canManage}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: string | null) =>
                value ? (DISTANCE_LABELS[value] ?? value) : "Select unit"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Kilometers">Kilometers</SelectItem>
            <SelectItem value="Miles">Miles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {canManage ? (
        <Button onClick={handleSave} disabled={pending} className="mt-2 w-fit">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          View only — Fleet Manager access is required to change these settings.
        </p>
      )}
    </div>
  );
}
