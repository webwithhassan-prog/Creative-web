import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebarShell } from "@/components/MobileSidebarShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileSidebarShell>
        <Sidebar session={session} />
      </MobileSidebarShell>
      <div className="ledger-ruled min-w-0 flex-1 overflow-x-hidden bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-10 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
