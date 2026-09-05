import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { requireActiveCompany } from "@/lib/company";
import { inputClass, labelClass, btnSecondary } from "@/lib/ui";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DayBookPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { active } = await requireActiveCompany();
  const { from, to } = await searchParams;

  const fromDate = new Date(from || startOfMonth());
  const toDate = new Date(to || today());
  toDate.setHours(23, 59, 59, 999);

  const dateFilter = { gte: fromDate, lte: toDate };

  const [purchases, sales, payments] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where: { companyId: active.id, date: dateFilter },
      include: { party: true },
    }),
    prisma.saleInvoice.findMany({
      where: { companyId: active.id, date: dateFilter },
      include: { party: true },
    }),
    prisma.payment.findMany({
      where: { companyId: active.id, date: dateFilter },
      include: { party: true },
    }),
  ]);

  const entries = [
    ...purchases.map((p) => ({
      id: `pur-${p.id}`,
      date: p.date,
      type: "Purchase",
      party: p.party.name,
      reference: p.invoiceNo,
      amount: Number(p.totalAmount),
      tone: "bad" as const,
      href: `/purchases/${p.id}`,
    })),
    ...sales.map((s) => ({
      id: `sale-${s.id}`,
      date: s.date,
      type: "Sale",
      party: s.party.name,
      reference: s.invoiceNo,
      amount: Number(s.totalAmount),
      tone: "good" as const,
      href: `/sales/${s.id}`,
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      date: p.date,
      type: p.direction === "OUT" ? "Payment Made" : "Payment Received",
      party: p.party.name,
      reference: p.reference || p.method,
      amount: Number(p.amount),
      tone: p.direction === "OUT" ? ("bad" as const) : ("good" as const),
      href: `/parties/${p.partyId}`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <PageHeader
        title="Day Book"
        subtitle={`${active.name} — every transaction in the selected range`}
        action={
          <div className="no-print">
            <PrintButton />
          </div>
        }
      />

      <form className="no-print mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass} htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from || startOfMonth()}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to || today()}
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
                <th className="py-3 pl-6 pr-4">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-soft">
                    No transactions in this date range.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="transition hover:bg-paper-alt/50">
                    <td className="whitespace-nowrap py-3 pl-6 pr-4 text-ink-soft">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-4 py-3 text-ink">{e.type}</td>
                    <td className="px-4 py-3">
                      <Link href={e.href} className="text-forest-dark hover:underline">
                        {e.party}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{e.reference}</td>
                    <td
                      className={`tabular px-4 py-3 text-right font-semibold ${
                        e.tone === "good" ? "text-forest" : "text-maroon"
                      }`}
                    >
                      {formatMoney(e.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-rule-strong bg-paper-alt/70">
                  <td colSpan={4} className="py-3 pl-6 pr-4 text-right font-semibold">
                    Total
                  </td>
                  <td className="tabular px-4 py-3 text-right font-serif text-lg font-bold text-forest-dark">
                    {formatMoney(total)}
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
