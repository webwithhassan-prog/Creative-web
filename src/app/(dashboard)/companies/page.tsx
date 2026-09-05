import Link from "next/link";
import { Plus, Pencil, Check } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { requireActiveCompany } from "@/lib/company";
import { deleteCompany, switchCompany } from "./actions";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { active, companies } = await requireActiveCompany();

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle="Every company keeps its own separate suppliers, customers, products and transactions"
        action={
          <Link href="/companies/new" className={btnPrimary}>
            <Plus size={16} /> Add Company
          </Link>
        }
      />

      {error === "has-history" && (
        <p className="mb-5 rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          This company has data recorded against it and cannot be deleted.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {companies.map((company) => {
          const isActive = company.id === active.id;
          return (
            <div
              key={company.id}
              className={clsx(
                "ledger-sheet rounded-md p-5 pl-6",
                isActive && "ring-2 ring-gold"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg font-semibold text-forest-dark">
                    {company.name}
                  </p>
                  {company.phone && (
                    <p className="text-sm text-ink-soft">{company.phone}</p>
                  )}
                  {company.address && (
                    <p className="text-sm text-ink-soft">{company.address}</p>
                  )}
                </div>
                {isActive && (
                  <span className="flex shrink-0 items-center gap-1 rounded-sm bg-gold/15 px-2 py-1 text-xs font-semibold text-gold">
                    <Check size={12} /> Active
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!isActive && (
                  <form action={switchCompany}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <button type="submit" className={btnSecondary}>
                      Switch to this company
                    </button>
                  </form>
                )}
                <Link href={`/companies/${company.id}/edit`} className={btnSecondary}>
                  <Pencil size={14} /> Edit
                </Link>
                <form action={deleteCompany}>
                  <input type="hidden" name="id" value={company.id} />
                  <ConfirmSubmitButton
                    confirmMessage={`Delete ${company.name}? This only works if it has no data.`}
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
