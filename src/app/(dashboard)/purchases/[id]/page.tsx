import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate, formatQty } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { InvoiceLetterhead } from "@/components/InvoiceLetterhead";
import { requireActiveCompany } from "@/lib/company";
import { deletePurchase } from "../actions";

export default async function PurchaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { active } = await requireActiveCompany();
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { party: true, items: { include: { product: true } } },
  });
  if (!invoice || invoice.companyId !== active.id) notFound();

  const isReturn = invoice.kind === "RETURN";

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {`Purchase ${invoice.invoiceNo}`}
            {isReturn && (
              <span className="rounded-sm border border-maroon/30 bg-maroon/5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-maroon">
                Return
              </span>
            )}
          </span>
        }
        subtitle={formatDate(invoice.date)}
        action={
          <div className="no-print flex gap-3">
            <PrintButton />
          </div>
        }
      />

      {error === "stock" && (
        <p className="no-print mb-5 rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          Some of this purchase&apos;s stock has already been sold, so
          deleting it would make stock negative. Adjust or delete the related
          sale first.
        </p>
      )}

      <InvoiceLetterhead company={active} />

      <div className="ledger-sheet mb-6 rounded-md p-6 pl-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Supplier
        </p>
        <Link
          href={`/parties/${invoice.partyId}`}
          className="font-serif text-lg font-semibold text-forest-dark hover:underline"
        >
          {invoice.party.name}
        </Link>
        {invoice.notes && (
          <p className="mt-3 text-sm text-ink-soft">Notes: {invoice.notes}</p>
        )}
      </div>

      <div className="ledger-sheet rounded-md">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="py-3 pl-6 pr-4">Product / Description</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pl-6 pr-4 text-ink">
                  {item.product ? item.product.name : item.description}
                </td>
                <td className="tabular px-4 py-3 text-right">
                  {item.product ? `${formatQty(item.quantity!)} ${item.product.unit}` : "—"}
                </td>
                <td className="tabular px-4 py-3 text-right">
                  {item.rate !== null ? formatMoney(item.rate.toString()) : "—"}
                </td>
                <td className="tabular px-4 py-3 text-right font-medium">
                  {formatMoney(item.amount.toString())}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-rule-strong">
              <td colSpan={3} className="py-2 pl-6 pr-4 text-right text-ink-soft">
                Subtotal
              </td>
              <td className="tabular px-4 py-2 text-right text-ink">
                {formatMoney(invoice.subtotal.toString())}
              </td>
            </tr>
            {invoice.taxRate !== null && (
              <tr>
                <td colSpan={3} className="py-2 pl-6 pr-4 text-right text-ink-soft">
                  Tax ({Number(invoice.taxRate)}%)
                </td>
                <td className="tabular px-4 py-2 text-right text-ink">
                  {formatMoney(invoice.taxAmount.toString())}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-rule-strong bg-paper-alt/70">
              <td colSpan={3} className="py-3 pl-6 pr-4 text-right font-semibold">
                {isReturn ? "Return Total" : "Total"}
              </td>
              <td className="tabular px-4 py-3 text-right font-serif text-lg font-bold text-forest-dark">
                {formatMoney(invoice.totalAmount.toString())}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      <div className="no-print mt-6 flex justify-end">
        <form action={deletePurchase}>
          <input type="hidden" name="id" value={invoice.id} />
          <ConfirmSubmitButton confirmMessage="Delete this purchase invoice? Stock levels will be reversed.">
            Delete Invoice
          </ConfirmSubmitButton>
        </form>
      </div>
    </>
  );
}
