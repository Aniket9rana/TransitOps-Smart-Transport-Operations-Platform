"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";
import type { Role } from "@/lib/generated/prisma/enums";

/** Hamburger + slide-in drawer for the sidebar nav below the md breakpoint. */
export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex h-16 items-center justify-between px-5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
                  T
                </div>
                <span className="text-base font-semibold text-sidebar-foreground">
                  TransitOps
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X />
              </Button>
            </div>
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
