import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { closingBalanceAsOf, balanceLabel } from "@/lib/ledger";
import { formatMoney, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { requireActiveCompany } from "@/lib/company";
import { inputClass, labelClass, btnSecondary } from "@/lib/ui";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { active } = await requireActiveCompany();
  const { asOf } = await searchParams;
  const asOfStr = asOf || today();
  const asOfDate = new Date(asOfStr);

  const parties = await prisma.party.findMany({
    where: { companyId: active.id },
    include: { purchaseInvoices: true, saleInvoices: true, payments: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const rows = parties
    .map((party) => {
      const balance = closingBalanceAsOf(party, asOfDate);
      const { amount, side } = balanceLabel(balance);
      return { party, amount, side };
    })
    .filter((r) => r.amount !== 0);

  const totalDr = rows.filter((r) => r.side === "Dr").reduce((s, r) => s + r.amount, 0);
  const totalCr = rows.filter((r) => r.side === "Cr").reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader
        title="Trial Balance"
        subtitle={`${active.name} — every account balance as of ${formatDate(asOfDate)}`}
        action={
          <div className="no-print flex flex-wrap gap-3">
            <PrintButton />
            <Link href={`/reports/trial-balance/export?asOf=${asOfStr}`} className={btnSecondary}>
              <Download size={16} /> Export CSV
            </Link>
          </div>
        }
      />

      <form className="no-print mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass} htmlFor="asOf">
            As of
          </label>
          <input
            id="asOf"
            name="asOf"
            type="date"
            defaultValue={asOfStr}
            className={inputClass}
          />
        </div>
        <button type="submit" className={btnSecondary}>
          Apply
        </button>
      </form>

      <div className="ledger-sheet rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="py-3 pl-6 pr-4">Account</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-soft">
                    No account balances as of this date.
                  </td>
                </tr>
              ) : (
                rows.map(({ party, amount, side }) => (
                  <tr key={party.id} className="transition hover:bg-paper-alt/50">
                    <td className="py-3 pl-6 pr-4">
                      <Link
                        href={`/parties/${party.id}`}
                        className="font-medium text-forest-dark hover:underline"
                      >
                        {party.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {party.type === "SUPPLIER" ? "Supplier" : "Customer"}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-forest">
                      {side === "Dr" ? formatMoney(amount) : ""}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-maroon">
                      {side === "Cr" ? formatMoney(amount) : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-rule-strong bg-paper-alt/70 font-semibold">
                  <td colSpan={2} className="py-3 pl-6 pr-4 text-right">
                    Total
                  </td>
                  <td className="tabular px-4 py-3 text-right text-forest">
                    {formatMoney(totalDr)}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-maroon">
                    {formatMoney(totalCr)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
