import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Wallet, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildPartyLedger, balanceLabel } from "@/lib/ledger";
import { formatMoney, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { InvoiceLetterhead } from "@/components/InvoiceLetterhead";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { requireActiveCompany } from "@/lib/company";
import { deleteParty } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  PAYMENT_IN: "Payment Received",
  PAYMENT_OUT: "Payment Made",
  OPENING: "Opening Balance",
};

export default async function PartyLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { active } = await requireActiveCompany();

  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      purchaseInvoices: true,
      saleInvoices: true,
      payments: true,
    },
  });
  if (!party || party.companyId !== active.id) notFound();

  const rows = buildPartyLedger(party);
  const closing = rows.length ? rows[rows.length - 1].balance : 0;
  const { amount, side } = balanceLabel(closing);

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <>
      <PageHeader
        title={party.name}
        subtitle={`${party.type === "SUPPLIER" ? "Supplier" : "Customer"} Account Statement`}
        action={
          <div className="no-print flex flex-wrap gap-3">
            <PrintButton />
            <Link href={`/parties/${party.id}/export`} className={btnSecondary}>
              <Download size={16} /> Export CSV
            </Link>
            <Link href={`/parties/${party.id}/edit`} className={btnSecondary}>
              <Pencil size={16} /> Edit
            </Link>
            {party.type === "SUPPLIER" ? (
              <Link href={`/purchases/new?partyId=${party.id}`} className={btnPrimary}>
                <Plus size={16} /> New Purchase
              </Link>
            ) : (
              <Link href={`/sales/new?partyId=${party.id}`} className={btnPrimary}>
                <Plus size={16} /> New Sale
              </Link>
            )}
            <Link href={`/payments/new?partyId=${party.id}`} className={btnSecondary}>
              <Wallet size={16} /> Record Payment
            </Link>
          </div>
        }
      />

      {error === "has-history" && (
        <p className="no-print mb-5 rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          This account has purchases, sales or payments recorded against it and
          cannot be deleted. Mark it inactive instead, or remove its
          transactions first.
        </p>
      )}

      <InvoiceLetterhead company={active} />

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="ledger-sheet rounded-md p-6 pl-6 md:col-span-2">
          <h2 className="mb-3 font-serif text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Account Details
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-ink-soft">Phone</dt>
            <dd className="text-ink">{party.phone || "—"}</dd>
            <dt className="text-ink-soft">Email</dt>
            <dd className="text-ink">{party.email || "—"}</dd>
            <dt className="text-ink-soft">Address</dt>
            <dd className="text-ink">{party.address || "—"}</dd>
            <dt className="text-ink-soft">Notes</dt>
            <dd className="text-ink">{party.notes || "—"}</dd>
          </dl>
        </div>

        <div className="ledger-sheet flex flex-col justify-center rounded-md p-6 pl-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Current Balance
          </p>
          <p
            className={`tabular mt-2 font-serif text-3xl font-bold ${
              side === "Dr" ? "text-forest" : "text-maroon"
            }`}
          >
            {formatMoney(amount)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {side === "Dr" ? "Receivable (owed to you)" : "Payable (you owe)"}
          </p>
        </div>
      </div>

      <div className="ledger-sheet rounded-md">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="py-3 pl-6 pr-4">Date</th>
              <th className="px-4 py-3">Particulars</th>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowBalance = balanceLabel(row.balance);
                return (
                  <tr key={row.id} className="transition hover:bg-paper-alt/50">
                    <td className="whitespace-nowrap py-3 pl-6 pr-4 text-ink-soft">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {TYPE_LABELS[row.type]}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{row.reference || "—"}</td>
                    <td className="tabular px-4 py-3 text-right text-ink">
                      {row.debit ? formatMoney(row.debit) : ""}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink">
                      {row.credit ? formatMoney(row.credit) : ""}
                    </td>
                    <td
                      className={`tabular px-4 py-3 text-right font-semibold ${
                        rowBalance.side === "Dr" ? "text-forest" : "text-maroon"
                      }`}
                    >
                      {formatMoney(rowBalance.amount)} {rowBalance.side}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-rule-strong bg-paper-alt/70 font-semibold">
                <td colSpan={3} className="py-3 pl-6 pr-4 text-ink">
                  Total
                </td>
                <td className="tabular px-4 py-3 text-right">{formatMoney(totalDebit)}</td>
                <td className="tabular px-4 py-3 text-right">{formatMoney(totalCredit)}</td>
                <td className={`tabular px-4 py-3 text-right ${side === "Dr" ? "text-forest" : "text-maroon"}`}>
                  {formatMoney(amount)} {side}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>

      <div className="no-print mt-6 flex justify-end">
        <form action={deleteParty}>
          <input type="hidden" name="id" value={party.id} />
          <ConfirmSubmitButton confirmMessage={`Delete ${party.name}? This cannot be undone.`}>
            Delete Account
          </ConfirmSubmitButton>
        </form>
      </div>
    </>
  );
}
