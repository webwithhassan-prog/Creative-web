import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPartyLedger, balanceLabel } from "@/lib/ledger";
import { formatDate } from "@/lib/format";
import { toCsv, csvResponse } from "@/lib/csv";
import { requireActiveCompany } from "@/lib/company";

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  PAYMENT_IN: "Payment Received",
  PAYMENT_OUT: "Payment Made",
  OPENING: "Opening Balance",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { active } = await requireActiveCompany();

  const party = await prisma.party.findUnique({
    where: { id },
    include: { purchaseInvoices: true, saleInvoices: true, payments: true },
  });
  if (!party || party.companyId !== active.id) {
    return new Response("Not found", { status: 404 });
  }

  const rows = buildPartyLedger(party);
  const csv = toCsv(
    ["Date", "Particulars", "Reference", "Debit", "Credit", "Balance"],
    rows.map((r) => {
      const { amount, side } = balanceLabel(r.balance);
      return [
        formatDate(r.date),
        TYPE_LABELS[r.type],
        r.reference ?? "",
        r.debit ? r.debit.toFixed(2) : "",
        r.credit ? r.credit.toFixed(2) : "",
        `${amount.toFixed(2)} ${side}`,
      ];
    })
  );

  const safeName = party.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return csvResponse(`${safeName}-statement.csv`, csv);
}
