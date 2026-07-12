import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLES, ROLE_LABELS, PERMISSIONS, type Module } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const MATRIX_COLUMNS: { module: Module; label: string }[] = [
  { module: "fleet", label: "Fleet" },
  { module: "drivers", label: "Drivers" },
  { module: "trips", label: "Trips" },
  { module: "expenses", label: "Fuel/Exp" },
  { module: "analytics", label: "Analytics" },
];

function LevelCell({ level }: { level: "none" | "view" | "manage" }) {
  if (level === "manage") {
    return <span className="font-medium text-status-green">✓</span>;
  }
  if (level === "view") {
    return <span className="text-muted-foreground">view</span>;
  }
  return <span className="text-muted-foreground/50">—</span>;
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization configuration and access control.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role-Based Access (RBAC)</CardTitle>
          <CardDescription>
            Read-only view of what each role can see and manage. ✓ = manage, &ldquo;view&rdquo; = read-only, — = no access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                {MATRIX_COLUMNS.map((column) => (
                  <TableHead key={column.module} className="text-center">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((role) => (
                <TableRow key={role}>
                  <TableCell className="font-medium text-foreground">
                    {ROLE_LABELS[role]}
                  </TableCell>
                  {MATRIX_COLUMNS.map((column) => (
                    <TableCell key={column.module} className={cn("text-center")}>
                      <LevelCell level={PERMISSIONS[role][column.module]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Depot name, currency, and distance unit.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Editable general configuration is coming in a later phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
