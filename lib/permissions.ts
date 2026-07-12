import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Role } from "./generated/prisma/enums";

export type PermissionLevel = "none" | "view" | "manage";

export type Module =
  | "dashboard"
  | "fleet"
  | "drivers"
  | "trips"
  | "maintenance"
  | "expenses"
  | "analytics"
  | "settings";

export const MODULES: Module[] = [
  "dashboard",
  "fleet",
  "drivers",
  "trips",
  "maintenance",
  "expenses",
  "analytics",
  "settings",
];

export const ROLES: Role[] = [
  Role.FLEET_MANAGER,
  Role.DISPATCHER,
  Role.SAFETY_OFFICER,
  Role.FINANCIAL_ANALYST,
];

export const ROLE_LABELS: Record<Role, string> = {
  [Role.FLEET_MANAGER]: "Fleet Manager",
  [Role.DISPATCHER]: "Dispatcher",
  [Role.SAFETY_OFFICER]: "Safety Officer",
  [Role.FINANCIAL_ANALYST]: "Financial Analyst",
};

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  fleet: "Fleet",
  drivers: "Drivers",
  trips: "Trips",
  maintenance: "Maintenance",
  expenses: "Fuel & Expenses",
  analytics: "Analytics",
  settings: "Settings",
};

/**
 * Single source of truth for role -> module access. "manage" implies "view".
 * Derived from the Settings/RBAC wireframe; dashboard is view-only for every
 * role, maintenance mirrors each role's fleet level, and settings is
 * view-for-all / manage-for-Fleet-Manager-only.
 */
export const PERMISSIONS: Record<Role, Record<Module, PermissionLevel>> = {
  [Role.FLEET_MANAGER]: {
    dashboard: "view",
    fleet: "manage",
    drivers: "manage",
    trips: "none",
    maintenance: "manage",
    expenses: "none",
    analytics: "manage",
    settings: "manage",
  },
  [Role.DISPATCHER]: {
    dashboard: "view",
    fleet: "view",
    drivers: "none",
    trips: "manage",
    maintenance: "view",
    expenses: "none",
    analytics: "none",
    settings: "view",
  },
  [Role.SAFETY_OFFICER]: {
    dashboard: "view",
    fleet: "none",
    drivers: "manage",
    trips: "view",
    maintenance: "none",
    expenses: "none",
    analytics: "none",
    settings: "view",
  },
  [Role.FINANCIAL_ANALYST]: {
    dashboard: "view",
    fleet: "view",
    drivers: "none",
    trips: "none",
    maintenance: "view",
    expenses: "manage",
    analytics: "manage",
    settings: "view",
  },
};

export function can(
  role: Role,
  module: Module,
  level: "view" | "manage"
): boolean {
  const granted = PERMISSIONS[role][module];
  if (level === "manage") return granted === "manage";
  return granted === "view" || granted === "manage";
}

export type NavItem = {
  label: string;
  href: string;
  module: Module;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", module: "dashboard", icon: LayoutDashboard },
  { label: "Fleet", href: "/fleet", module: "fleet", icon: Truck },
  { label: "Drivers", href: "/drivers", module: "drivers", icon: Users },
  { label: "Trips", href: "/trips", module: "trips", icon: Route },
  { label: "Maintenance", href: "/maintenance", module: "maintenance", icon: Wrench },
  { label: "Fuel & Expenses", href: "/expenses", module: "expenses", icon: Fuel },
  { label: "Analytics", href: "/analytics", module: "analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", module: "settings", icon: Settings },
];

export function visibleNavFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => can(role, item.module, "view"));
}

/** Maps a route's leading path segment to the module that guards it. */
export const pathToModule: Record<string, Module> = {
  "/dashboard": "dashboard",
  "/fleet": "fleet",
  "/drivers": "drivers",
  "/trips": "trips",
  "/maintenance": "maintenance",
  "/expenses": "expenses",
  "/analytics": "analytics",
  "/settings": "settings",
};

export function moduleForPath(pathname: string): Module | undefined {
  const firstSegment = pathname.split("/")[1] ?? "";
  return pathToModule[`/${firstSegment}`];
}
