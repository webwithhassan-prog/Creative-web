import Link from "next/link";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { btnPrimary } from "@/lib/ui";
import { deletePayment } from "./actions";

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    include: { party: true },
    orderBy: { date: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Money paid to suppliers and received from customers"
        action={
          <Link href="/payments/new" className={btnPrimary}>
            <Plus size={16} /> Record Payment
          </Link>
        }
      />

      <div className="ledger-sheet overflow-hidden rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="py-3 pl-14 pr-4">Date</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="transition hover:bg-paper-alt/50">
                  <td className="whitespace-nowrap py-3 pl-14 pr-4 text-ink-soft">
                    {formatDate(p.date)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/parties/${p.partyId}`} className="font-medium text-forest-dark hover:underline">
                      {p.party.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "rounded-sm px-2 py-0.5 text-xs font-semibold",
                        p.direction === "IN"
                          ? "bg-forest/10 text-forest"
                          : "bg-maroon/10 text-maroon"
                      )}
                    >
                      {p.direction === "IN" ? "Received" : "Paid"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{p.method}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.reference || "—"}</td>
                  <td className="tabular px-4 py-3 text-right font-semibold text-ink">
                    {formatMoney(p.amount.toString())}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmitButton
                        confirmMessage="Delete this payment?"
                        className="px-2 py-1"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
