import { LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { logout } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/lib/generated/prisma/enums";

export function Topbar({
  name,
  role,
  initials,
  depotName,
}: {
  name: string;
  role: Role;
  initials: string;
  depotName: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav role={role} />
        <MapPin className="hidden size-4 shrink-0 text-brand sm:block" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-foreground">{depotName}</p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            TransitOps Control Center
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
          {initials}
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" title="Logout">
            <LogOut />
          </Button>
        </form>
      </div>
    </header>
  );
}
