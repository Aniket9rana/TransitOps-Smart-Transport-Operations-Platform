import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireSession } from "@/lib/rbac";
import { getOrgSettings } from "@/lib/org-settings";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  const settings = await getOrgSettings();

  return (
    <div className="flex h-screen">
      <Sidebar role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={session.name}
          role={session.role}
          initials={session.initials}
          depotName={settings.depotName}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
