import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { toCsv, csvResponse } from "@/lib/csv";
import { requireActiveCompany } from "@/lib/company";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { active } = await requireActiveCompany();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || startOfMonth();
  const to = searchParams.get("to") || today();

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);
  const dateFilter = { gte: fromDate, lte: toDate };

  const [purchases, sales, payments] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where: { companyId: active.id, date: dateFilter },
      include: { party: true },
    }),
    prisma.saleInvoice.findMany({
      where: { companyId: active.id, date: dateFilter },
      include: { party: true },
    }),
    prisma.payment.findMany({
      where: { companyId: active.id, date: dateFilter },
      include: { party: true },
    }),
  ]);

  const entries = [
    ...purchases.map((p) => ({
      date: p.date,
      type: "Purchase",
      party: p.party.name,
      reference: p.invoiceNo,
      amount: Number(p.totalAmount),
    })),
    ...sales.map((s) => ({
      date: s.date,
      type: "Sale",
      party: s.party.name,
      reference: s.invoiceNo,
      amount: Number(s.totalAmount),
    })),
    ...payments.map((p) => ({
      date: p.date,
      type: p.direction === "OUT" ? "Payment Made" : "Payment Received",
      party: p.party.name,
      reference: p.reference || p.method,
      amount: Number(p.amount),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const csv = toCsv(
    ["Date", "Type", "Party", "Reference", "Amount"],
    entries.map((e) => [
      formatDate(e.date),
      e.type,
      e.party,
      e.reference,
      e.amount.toFixed(2),
    ])
  );

  return csvResponse(`day-book-${from}-to-${to}.csv`, csv);
}
