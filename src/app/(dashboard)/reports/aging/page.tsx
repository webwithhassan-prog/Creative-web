import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computePartyAging, summarizeAging, AGING_BUCKETS, type AgingBucket } from "@/lib/ledger";
import { formatMoney, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { DownloadReportPdfButton } from "@/components/DownloadReportPdfButton";
import { requireActiveCompany } from "@/lib/company";
import { inputClass, labelClass, btnSecondary } from "@/lib/ui";

const BUCKET_LABELS: Record<AgingBucket, string> = {
  current: "Current",
  "1-30": "1-30 days",
  "31-60": "31-60 days",
  "61-90": "61-90 days",
  "90+": "90+ days",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AgingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string; type?: string }>;
}) {
  const { active } = await requireActiveCompany();
  const { asOf, type } = await searchParams;
  const asOfStr = asOf || today();
  const asOfDate = new Date(asOfStr);
  const filterType = type === "CUSTOMER" ? "CUSTOMER" : type === "SUPPLIER" ? "SUPPLIER" : undefined;

  const parties = await prisma.party.findMany({
    where: { companyId: active.id, ...(filterType ? { type: filterType } : {}) },
    include: { purchaseInvoices: true, saleInvoices: true, payments: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const rows = parties
    .map((party) => {
      const items = computePartyAging(party, asOfDate);
      const summary = summarizeAging(items);
      const total = AGING_BUCKETS.reduce((s, b) => s + summary[b], 0);
      return { party, summary, total };
    })
    .filter((r) => r.total > 0.005);

  const grandTotals = AGING_BUCKETS.reduce(
    (acc, b) => ({ ...acc, [b]: rows.reduce((s, r) => s + r.summary[b], 0) }),
    {} as Record<AgingBucket, number>
  );
  const grandTotal = AGING_BUCKETS.reduce((s, b) => s + grandTotals[b], 0);

  const pdfData = {
    companyName: active.name,
    companyAddress: active.address ?? undefined,
    companyContact: [active.phone, active.email].filter(Boolean).join(" · ") || undefined,
    companyGstin: active.gstin ?? undefined,
    companyLogo: active.logo ?? undefined,
    title: "Aging Report",
    subtitle: `Outstanding balances by how long they've been open, as of ${formatDate(asOfDate)}`,
    sections: [
      {
        columns: [
          { label: "Account" },
          { label: "Type" },
          ...AGING_BUCKETS.map((b) => ({ label: BUCKET_LABELS[b], align: "right" as const })),
          { label: "Total", align: "right" as const },
        ],
        rows: rows.map(({ party, summary, total }) => [
          party.name,
          party.type === "SUPPLIER" ? "Supplier" : "Customer",
          ...AGING_BUCKETS.map((b) => (summary[b] > 0.005 ? formatMoney(summary[b]) : "")),
          formatMoney(total),
        ]),
        totalsRow: [
          "Total",
          "",
          ...AGING_BUCKETS.map((b) => formatMoney(grandTotals[b])),
          formatMoney(grandTotal),
        ],
        emptyMessage: "Nothing outstanding as of this date.",
      },
    ],
  };

  return (
    <>
      <PageHeader
        title="Aging Report"
        subtitle={`${active.name} — outstanding balances by how long they've been open, as of ${formatDate(asOfDate)}`}
        action={
          <div className="no-print flex flex-wrap gap-3">
            <PrintButton />
            <DownloadReportPdfButton data={pdfData} />
            <Link
              href={`/reports/aging/export?asOf=${asOfStr}${filterType ? `&type=${filterType}` : ""}`}
              className={btnSecondary}
            >
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
          <input id="asOf" name="asOf" type="date" defaultValue={asOfStr} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="type">
            Account type
          </label>
          <select id="type" name="type" defaultValue={filterType ?? ""} className={inputClass}>
            <option value="">All accounts</option>
            <option value="SUPPLIER">Suppliers (payable)</option>
            <option value="CUSTOMER">Customers (receivable)</option>
          </select>
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
                {AGING_BUCKETS.map((b) => (
                  <th key={b} className="px-4 py-3 text-right">
                    {BUCKET_LABELS[b]}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={2 + AGING_BUCKETS.length + 1} className="px-4 py-10 text-center text-ink-soft">
                    Nothing outstanding as of this date.
                  </td>
                </tr>
              ) : (
                rows.map(({ party, summary, total }) => (
                  <tr key={party.id} className="transition hover:bg-paper-alt/50">
                    <td className="py-3 pl-6 pr-4">
                      <Link href={`/parties/${party.id}`} className="font-medium text-forest-dark hover:underline">
                        {party.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {party.type === "SUPPLIER" ? "Supplier" : "Customer"}
                    </td>
                    {AGING_BUCKETS.map((b) => (
                      <td
                        key={b}
                        className={`tabular px-4 py-3 text-right ${
                          b === "90+" && summary[b] > 0 ? "font-semibold text-maroon" : "text-ink"
                        }`}
                      >
                        {summary[b] > 0.005 ? formatMoney(summary[b]) : ""}
                      </td>
                    ))}
                    <td className="tabular px-4 py-3 text-right font-semibold text-ink">
                      {formatMoney(total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-rule-strong bg-paper-alt/70 font-semibold">
                  <td colSpan={2} className="py-3 pl-6 pr-4">
                    Total
                  </td>
                  {AGING_BUCKETS.map((b) => (
                    <td key={b} className="tabular px-4 py-3 text-right">
                      {formatMoney(grandTotals[b])}
                    </td>
                  ))}
                  <td className="tabular px-4 py-3 text-right font-serif text-lg text-forest-dark">
                    {formatMoney(grandTotal)}
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
