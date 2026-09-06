import Link from "next/link";
import { Plus, Search, Upload } from "lucide-react";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { closingBalance, balanceLabel } from "@/lib/ledger";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/ui";
import type { PartyType } from "@prisma/client";
import { requireActiveCompany } from "@/lib/company";

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type, q } = await searchParams;
  const activeType: PartyType = type === "CUSTOMER" ? "CUSTOMER" : "SUPPLIER";
  const { active } = await requireActiveCompany();

  const parties = await prisma.party.findMany({
    where: {
      companyId: active.id,
      type: activeType,
      ...(q
        ? { name: { contains: q, mode: "insensitive" as const } }
        : {}),
    },
    include: { purchaseInvoices: true, saleInvoices: true, payments: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Suppliers & Customers"
        subtitle="Every account and its current running balance"
        action={
          <div className="no-print flex flex-wrap gap-3">
            <Link href="/parties/import" className={btnSecondary}>
              <Upload size={16} /> Import CSV
            </Link>
            <Link href={`/parties/new?type=${activeType}`} className={btnPrimary}>
              <Plus size={16} /> Add {activeType === "SUPPLIER" ? "Supplier" : "Customer"}
            </Link>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-sm border border-rule-strong bg-paper p-1">
          {(["SUPPLIER", "CUSTOMER"] as const).map((t) => (
            <Link
              key={t}
              href={`/parties?type=${t}`}
              className={clsx(
                "rounded-sm px-4 py-1.5 text-sm font-semibold transition",
                activeType === t
                  ? "bg-forest text-paper"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              {t === "SUPPLIER" ? "Suppliers" : "Customers"}
            </Link>
          ))}
        </div>

        <form className="relative w-full max-w-xs">
          <input type="hidden" name="type" value={activeType} />
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name…"
            className={`${inputClass} pl-9`}
          />
        </form>
      </div>

      <div className="ledger-sheet rounded-md">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="py-3 pl-6 pr-4">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {parties.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-soft">
                  No {activeType === "SUPPLIER" ? "suppliers" : "customers"} yet.
                </td>
              </tr>
            ) : (
              parties.map((party) => {
                const { amount, side } = balanceLabel(closingBalance(party));
                return (
                  <tr key={party.id} className="transition hover:bg-paper-alt/50">
                    <td className="py-3 pl-6 pr-4">
                      <Link
                        href={`/parties/${party.id}`}
                        className="font-medium text-forest-dark hover:underline"
                      >
                        {party.name}
                      </Link>
                      {!party.isActive && (
                        <span className="ml-2 rounded-sm bg-ink-soft/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-soft">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{party.phone || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {party.address || "—"}
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold">
                      <span className={side === "Dr" ? "text-forest" : "text-maroon"}>
                        {formatMoney(amount)} {side}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
