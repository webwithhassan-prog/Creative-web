import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimary } from "@/lib/ui";
import { requireActiveCompany } from "@/lib/company";

export default async function PurchasesPage() {
  const { active } = await requireActiveCompany();
  const invoices = await prisma.purchaseInvoice.findMany({
    where: { companyId: active.id },
    include: { party: true },
    orderBy: { date: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Purchases"
        subtitle="Goods received from suppliers"
        action={
          <Link href="/purchases/new" className={btnPrimary}>
            <Plus size={16} /> New Purchase
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
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-soft">
                  No purchases recorded yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="transition hover:bg-paper-alt/50">
                  <td className="py-3 pl-6 pr-4">
                    <Link
                      href={`/purchases/${inv.id}`}
                      className="tabular font-medium text-forest-dark hover:underline"
                    >
                      {inv.invoiceNo}
                    </Link>
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
    </>
  );
}
