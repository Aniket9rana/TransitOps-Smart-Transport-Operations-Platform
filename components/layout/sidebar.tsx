import { NavLinks } from "./nav-links";
import type { Role } from "@/lib/generated/prisma/enums";

/** Desktop sidebar — hidden below md; the mobile drawer takes over there. */
export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
          T
        </div>
        <span className="text-base font-semibold text-sidebar-foreground">
          TransitOps
        </span>
      </div>

      <NavLinks role={role} />
    </aside>
  );
}
