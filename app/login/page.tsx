import { ROLES, ROLE_LABELS, MODULES, MODULE_LABELS, can } from "@/lib/permissions";
import { LoginForm } from "@/app/login/login-form";

const DEMO_CREDENTIALS = [
  { email: "raven.k@transitops.in", role: "Dispatcher" },
  { email: "maya.r@transitops.in", role: "Fleet Manager" },
  { email: "sana.o@transitops.in", role: "Safety Officer" },
  { email: "farid.a@transitops.in", role: "Financial Analyst" },
];

function primaryAreasFor(role: (typeof ROLES)[number]): string {
  return MODULES.filter((module) => module !== "dashboard" && module !== "settings")
    .filter((module) => can(role, module, "view"))
    .map((module) => MODULE_LABELS[module])
    .join(", ");
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#171310] to-[#3d2a10] p-10 lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-brand text-base font-bold text-brand-foreground">
              T
            </div>
            <span className="text-lg font-semibold text-white">TransitOps</span>
          </div>
          <p className="mt-3 text-sm text-white/60">
            Smart Transport Operations Platform
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-white/80">One login, four roles:</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {ROLES.map((role) => (
              <li key={role} className="flex items-center gap-2.5 text-sm text-white/70">
                <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                {ROLE_LABELS[role]}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/40">TransitOps © 2026 · RBAC Enabled</p>
      </div>

      <div className="flex flex-col items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your credentials to continue
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Access is scoped by role after login —{" "}
            {ROLES.map((role) => `${ROLE_LABELS[role]}: ${primaryAreasFor(role)}`).join(" · ")}
          </p>

          <div className="mt-6 rounded-lg border border-border bg-card/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground/80">Demo credentials</p>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {DEMO_CREDENTIALS.map((account) => (
                <li key={account.email}>
                  {account.role}: {account.email}
                </li>
              ))}
            </ul>
            <p className="mt-1.5">Password for all accounts: transit123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
