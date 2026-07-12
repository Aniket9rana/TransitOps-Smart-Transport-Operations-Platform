import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";
import { can, type Module } from "./permissions";

/** Redirects to /login if there is no valid session. Use in Server Components/Actions. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Requires a valid session AND the given module permission level.
 * Redirects to /dashboard if the signed-in role doesn't have access.
 */
export async function requirePermission(
  module: Module,
  level: "view" | "manage"
): Promise<SessionPayload> {
  const session = await requireSession();
  if (!can(session.role, module, level)) {
    redirect("/dashboard");
  }
  return session;
}
