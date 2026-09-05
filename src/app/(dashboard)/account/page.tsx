import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <PageHeader title="Account" subtitle="Manage your admin login" />

      <div className="ledger-sheet max-w-md rounded-md p-6 pl-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Signed in as
        </p>
        <p className="mb-6 text-sm font-medium text-ink">{session.email}</p>

        <h2 className="mb-4 text-sm font-semibold text-forest-dark">
          Change Password
        </h2>
        <ChangePasswordForm />
      </div>
    </>
  );
}
