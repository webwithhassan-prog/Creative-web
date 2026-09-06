import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { btnPrimary } from "@/lib/ui";
import { requireActiveCompany } from "@/lib/company";

const PAGE_SIZE = 25;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { active } = await requireActiveCompany();
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const [invoices, total] = await Promise.all([
    prisma.saleInvoice.findMany({
      where: { companyId: active.id },
      include: { party: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.saleInvoice.count({ where: { companyId: active.id } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Sales"
        subtitle="Goods sold to customers"
        action={
          <Link href="/sales/new" className={btnPrimary}>
            <Plus size={16} /> New Sale
          </Link>
        }
      />

      <div className="ledger-sheet rounded-md">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="py-3 pl-6 pr-4">Invoice</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-soft">
                  No sales recorded yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="transition hover:bg-paper-alt/50">
                  <td className="py-3 pl-6 pr-4">
                    <Link
                      href={`/sales/${inv.id}`}
                      className="tabular font-medium text-forest-dark hover:underline"
                    >
                      {inv.invoiceNo}
                    </Link>
                    {inv.kind === "RETURN" && (
                      <span className="ml-2 rounded-sm border border-maroon/30 bg-maroon/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-maroon">
                        Return
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/parties/${inv.partyId}`} className="hover:underline">
                      {inv.party.name}
                    </Link>
                  </td>
                  <td className="tabular px-4 py-3 text-right font-semibold text-ink">
                    {formatMoney(inv.totalAmount.toString())}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} basePath="/sales" />
    </>
  );
}
