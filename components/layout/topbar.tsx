import { LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/lib/generated/prisma/enums";

export function Topbar({
  name,
  role,
  initials,
}: {
  name: string;
  role: Role;
  initials: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="h-9 rounded-lg pl-9"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
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
