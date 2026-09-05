import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <div className="no-print contents">
        <Sidebar session={session} />
      </div>
      <div className="ledger-ruled flex-1 overflow-x-hidden bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">{children}</div>
      </div>
    </div>
  );
}
