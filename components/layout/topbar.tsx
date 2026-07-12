import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Auth lands in a later phase — the signed-in user is mocked for now.
const CURRENT_USER = { name: "Raven K.", role: "Fleet Manager" };

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Topbar() {
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
          <p className="text-sm font-medium text-foreground">
            {CURRENT_USER.name}
          </p>
          <p className="text-xs text-muted-foreground">{CURRENT_USER.role}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
          {getInitials(CURRENT_USER.name)}
        </div>
      </div>
    </header>
  );
}
