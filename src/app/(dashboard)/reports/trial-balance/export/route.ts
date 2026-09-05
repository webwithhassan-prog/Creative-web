import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { closingBalanceAsOf, balanceLabel } from "@/lib/ledger";
import { toCsv, csvResponse } from "@/lib/csv";
import { requireActiveCompany } from "@/lib/company";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { active } = await requireActiveCompany();
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") || today();
  const asOfDate = new Date(asOf);

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

  const csv = toCsv(
    ["Account", "Type", "Debit", "Credit"],
    rows.map(({ party, amount, side }) => [
      party.name,
      party.type === "SUPPLIER" ? "Supplier" : "Customer",
      side === "Dr" ? amount.toFixed(2) : "",
      side === "Cr" ? amount.toFixed(2) : "",
    ])
  );

  return csvResponse(`trial-balance-${asOf}.csv`, csv);
}
