"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  dir: SortDir;
  toggle: (key: K) => void;
};

/**
 * Reusable click-to-sort for client tables. Callers pass an accessor map
 * (column key -> value getter); numbers sort numerically, everything else
 * alphabetically. Lists here are small, so we sort on every render.
 */
export function useSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => string | number>,
  initialKey: K,
  initialDir: SortDir = "asc"
): { sorted: T[] } & SortState<K> {
  const [key, setKey] = useState<K>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);

  const get = accessors[key];
  const sorted = [...rows].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });

  function toggle(next: K) {
    if (next === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setKey(next);
      setDir("asc");
    }
  }

  return { sorted, key, dir, toggle };
}

export function SortHeader<K extends string>({
  sortKey,
  label,
  state,
  align,
}: {
  sortKey: K;
  label: string;
  state: SortState<K>;
  align?: "right";
}) {
  const active = state.key === sortKey;
  const Icon = !active ? ChevronsUpDown : state.dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => state.toggle(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
        align === "right" && "flex-row-reverse",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
      <Icon className="size-3.5" />
    </button>
  );
}
