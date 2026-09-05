import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listCompanies, getActiveCompanyId } from "@/lib/company";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebarShell } from "@/components/MobileSidebarShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const companies = await listCompanies();
  const activeCompanyId = await getActiveCompanyId(companies);
  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileSidebarShell>
        <Sidebar session={session} companies={companies} activeCompany={activeCompany} />
      </MobileSidebarShell>
      <div className="min-w-0 flex-1 overflow-x-hidden bg-paper-alt">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-10 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
