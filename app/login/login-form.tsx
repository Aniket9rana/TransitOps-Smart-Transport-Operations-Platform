"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { login, type LoginState } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/lib/generated/prisma/enums";

const DEMO_PASSWORD = "transit123";

const DEMO_ACCOUNTS: { role: Role; label: string; email: string }[] = [
  { role: Role.FLEET_MANAGER, label: "Fleet Manager — Maya R.", email: "maya.r@transitops.in" },
  { role: Role.DISPATCHER, label: "Dispatcher — Raven K.", email: "raven.k@transitops.in" },
  { role: Role.SAFETY_OFFICER, label: "Safety Officer — Sana O.", email: "sana.o@transitops.in" },
  { role: Role.FINANCIAL_ANALYST, label: "Financial Analyst — Farid A.", email: "farid.a@transitops.in" },
];

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    console.log(
      "%cTransitOps demo credentials",
      "font-weight:bold",
      DEMO_ACCOUNTS.map((a) => ({ role: a.label, email: a.email, password: DEMO_PASSWORD }))
    );
  }, []);

  function handleDemoRoleChange(value: string | null) {
    const account = DEMO_ACCOUNTS.find((a) => a.role === value);
    if (!account) return;
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="demo-role">Login as (demo)</Label>
        <Select onValueChange={handleDemoRoleChange}>
          <SelectTrigger id="demo-role" className="w-full">
            <SelectValue placeholder="Pick a role to autofill demo credentials">
              {(value: Role | null) =>
                DEMO_ACCOUNTS.find((account) => account.role === value)?.label ?? null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DEMO_ACCOUNTS.map((account) => (
              <SelectItem key={account.role} value={account.role}>
                {account.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="raven.k@transitops.in"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Label htmlFor="remember-me" className="cursor-pointer font-normal">
          <Checkbox id="remember-me" name="rememberMe" />
          Remember me
        </Label>
        <button
          type="button"
          onClick={() => toast("Password reset link sent (demo)")}
          className="text-sm text-brand hover:underline"
        >
          Forgot password?
        </button>
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-9 w-full">
      {pending ? "Signing in..." : "Sign In"}
    </Button>
  );
}
