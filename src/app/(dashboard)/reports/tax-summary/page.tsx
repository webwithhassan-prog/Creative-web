import Link from "next/link";
import { Download } from "lucide-react";
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

export default async function TaxSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { active } = await requireActiveCompany();
  const { from, to } = await searchParams;
  const fromStr = from || startOfMonth();
  const toStr = to || today();

  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  toDate.setHours(23, 59, 59, 999);
  const dateFilter = { gte: fromDate, lte: toDate };

  const [salesTaxed, purchasesTaxed] = await Promise.all([
    prisma.saleInvoice.findMany({
      where: { companyId: active.id, taxRate: { not: null }, date: dateFilter },
      include: { party: true },
      orderBy: { date: "asc" },
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId: active.id, taxRate: { not: null }, date: dateFilter },
      include: { party: true },
      orderBy: { date: "asc" },
    }),
  ]);

  let outputSubtotal = 0;
  let outputTax = 0;
  for (const s of salesTaxed) {
    const sign = s.kind === "RETURN" ? -1 : 1;
    outputSubtotal += sign * Number(s.subtotal);
    outputTax += sign * Number(s.taxAmount);
  }

  let inputSubtotal = 0;
  let inputTax = 0;
  for (const p of purchasesTaxed) {
    const sign = p.kind === "RETURN" ? -1 : 1;
    inputSubtotal += sign * Number(p.subtotal);
    inputTax += sign * Number(p.taxAmount);
  }

  const netPayable = outputTax - inputTax;

  return (
    <>
      <PageHeader
        title="Tax Summary"
        subtitle={`${active.name} — output tax (sales) vs. input tax (purchases) for a date range`}
        action={
          <div className="no-print flex flex-wrap gap-3">
            <PrintButton />
            <Link href={`/reports/tax-summary/export?from=${fromStr}&to=${toStr}`} className={btnSecondary}>
              <Download size={16} /> Export CSV
            </Link>
          </div>
        }
      />

      <form className="no-print mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass} htmlFor="from">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={fromStr} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="to">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={toStr} className={inputClass} />
        </div>
        <button type="submit" className={btnSecondary}>
          Apply
        </button>
      </form>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ledger-sheet rounded-md p-5 pl-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Output Tax (Sales)
          </p>
          <p className="tabular mt-2 font-serif text-2xl font-bold text-forest">
            {formatMoney(outputTax)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">Tax collected from customers</p>
        </div>
        <div className="ledger-sheet rounded-md p-5 pl-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Input Tax (Purchases)
          </p>
          <p className="tabular mt-2 font-serif text-2xl font-bold text-maroon">
            {formatMoney(inputTax)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">Tax paid to suppliers</p>
        </div>
        <div className="ledger-sheet rounded-md p-5 pl-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {netPayable >= 0 ? "Net Tax Payable" : "Net Tax Refundable"}
          </p>
          <p className="tabular mt-2 font-serif text-2xl font-bold text-ink">
            {formatMoney(Math.abs(netPayable))}
          </p>
          <p className="mt-1 text-xs text-ink-soft">Output tax minus input tax</p>
        </div>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-forest-dark">
        Sales — Output Tax
      </h2>
      <div className="ledger-sheet mb-6 rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="py-3 pl-6 pr-4">Date</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {salesTaxed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                    No taxed sales in this date range.
                  </td>
                </tr>
              ) : (
                salesTaxed.map((s) => (
                  <tr key={s.id} className="transition hover:bg-paper-alt/50">
                    <td className="whitespace-nowrap py-3 pl-6 pr-4 text-ink-soft">
                      {formatDate(s.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/sales/${s.id}`} className="font-medium text-forest-dark hover:underline">
                        {s.invoiceNo}
                      </Link>
                      {s.kind === "RETURN" && (
                        <span className="ml-2 rounded-sm border border-maroon/30 bg-maroon/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-maroon">
                          Return
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/parties/${s.partyId}`} className="hover:underline">
                        {s.party.name}
                      </Link>
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {s.kind === "RETURN" ? "-" : ""}
                      {formatMoney(s.subtotal.toString())}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink-soft">
                      {Number(s.taxRate)}%
                    </td>
                    <td className="tabular px-4 py-3 text-right font-medium">
                      {s.kind === "RETURN" ? "-" : ""}
                      {formatMoney(s.taxAmount.toString())}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {salesTaxed.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-rule-strong bg-paper-alt/70 font-semibold">
                  <td colSpan={3} className="py-3 pl-6 pr-4">
                    Total
                  </td>
                  <td className="tabular px-4 py-3 text-right">{formatMoney(outputSubtotal)}</td>
                  <td />
                  <td className="tabular px-4 py-3 text-right text-forest">{formatMoney(outputTax)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-forest-dark">
        Purchases — Input Tax
      </h2>
      <div className="ledger-sheet rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="py-3 pl-6 pr-4">Date</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {purchasesTaxed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                    No taxed purchases in this date range.
                  </td>
                </tr>
              ) : (
                purchasesTaxed.map((p) => (
                  <tr key={p.id} className="transition hover:bg-paper-alt/50">
                    <td className="whitespace-nowrap py-3 pl-6 pr-4 text-ink-soft">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/purchases/${p.id}`} className="font-medium text-forest-dark hover:underline">
                        {p.invoiceNo}
                      </Link>
                      {p.kind === "RETURN" && (
                        <span className="ml-2 rounded-sm border border-maroon/30 bg-maroon/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-maroon">
                          Return
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/parties/${p.partyId}`} className="hover:underline">
                        {p.party.name}
                      </Link>
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {p.kind === "RETURN" ? "-" : ""}
                      {formatMoney(p.subtotal.toString())}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink-soft">
                      {Number(p.taxRate)}%
                    </td>
                    <td className="tabular px-4 py-3 text-right font-medium">
                      {p.kind === "RETURN" ? "-" : ""}
                      {formatMoney(p.taxAmount.toString())}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {purchasesTaxed.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-rule-strong bg-paper-alt/70 font-semibold">
                  <td colSpan={3} className="py-3 pl-6 pr-4">
                    Total
                  </td>
                  <td className="tabular px-4 py-3 text-right">{formatMoney(inputSubtotal)}</td>
                  <td />
                  <td className="tabular px-4 py-3 text-right text-maroon">{formatMoney(inputTax)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
