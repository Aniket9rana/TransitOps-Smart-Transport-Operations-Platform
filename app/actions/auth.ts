"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";
import { getInitials } from "@/lib/format";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type LoginState = {
  error: string | null;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const rememberMe = formData.get("rememberMe") === "on";

  if (!email || !password) {
    return { error: "Invalid credentials." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Invalid credentials." };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { error: "Account locked. Try again later." };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const failedAttempts = user.failedAttempts + 1;
    const lockedOut = failedAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts,
        lockedUntil: lockedOut ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });

    return {
      error: lockedOut
        ? "Account locked after 5 failed attempts."
        : "Invalid credentials.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  await createSessionCookie(
    {
      userId: user.id,
      role: user.role,
      name: user.name,
      initials: getInitials(user.name),
    },
    rememberMe
  );

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
