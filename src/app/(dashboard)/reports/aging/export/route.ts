import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { computePartyAging, summarizeAging, AGING_BUCKETS } from "@/lib/ledger";
import { toCsv, csvResponse } from "@/lib/csv";
import { requireActiveCompany } from "@/lib/company";
import type { PartyType } from "@prisma/client";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { active } = await requireActiveCompany();
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") || today();
  const asOfDate = new Date(asOf);
  const typeParam = searchParams.get("type");
  const filterType: PartyType | undefined =
    typeParam === "CUSTOMER" ? "CUSTOMER" : typeParam === "SUPPLIER" ? "SUPPLIER" : undefined;

  const parties = await prisma.party.findMany({
    where: { companyId: active.id, ...(filterType ? { type: filterType } : {}) },
    include: { purchaseInvoices: true, saleInvoices: true, payments: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const rows = parties
    .map((party) => {
      const summary = summarizeAging(computePartyAging(party, asOfDate));
      const total = AGING_BUCKETS.reduce((s, b) => s + summary[b], 0);
      return { party, summary, total };
    })
    .filter((r) => r.total > 0.005);

  const csv = toCsv(
    ["Account", "Type", "Current", "1-30 days", "31-60 days", "61-90 days", "90+ days", "Total"],
    rows.map(({ party, summary, total }) => [
      party.name,
      party.type === "SUPPLIER" ? "Supplier" : "Customer",
      summary.current.toFixed(2),
      summary["1-30"].toFixed(2),
      summary["31-60"].toFixed(2),
      summary["61-90"].toFixed(2),
      summary["90+"].toFixed(2),
      total.toFixed(2),
    ])
  );

  return csvResponse(`aging-report-${asOf}.csv`, csv);
}
