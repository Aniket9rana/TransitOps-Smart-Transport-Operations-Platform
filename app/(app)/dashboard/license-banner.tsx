"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

/**
 * In-app license reminder (the "email reminder" bonus, done in-app). Shows
 * when one or more driver licenses are expired or expiring within 30 days.
 * Dismissible; links to /drivers.
 */
export function LicenseBanner({ count }: { count: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (count <= 0 || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-status-orange/30 bg-status-orange/10 px-4 py-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-status-orange" />
      <p className="flex-1 text-status-orange">
        {count} driver license{count === 1 ? "" : "s"} expired or expiring soon.{" "}
        <Link href="/drivers" className="font-medium underline underline-offset-2">
          Review drivers
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-status-orange/70 transition-colors hover:text-status-orange"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
