import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const [salesTaxed, purchasesTaxed] = await Promise.all([
    prisma.saleInvoice.findMany({
      where: { companyId: active.id, taxRate: { not: null }, date: dateFilter },
      include: { party: true },
      orderBy: { date: "asc" },
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId: active.id, taxRate: { not: null }, date: dateFilter },
      include: { party: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const rows: (string | number)[][] = [];
  for (const s of salesTaxed) {
    const sign = s.kind === "RETURN" ? -1 : 1;
    rows.push([
      s.date.toISOString().slice(0, 10),
      "Output (Sale)",
      s.invoiceNo,
      s.party.name,
      (sign * Number(s.subtotal)).toFixed(2),
      Number(s.taxRate).toFixed(2),
      (sign * Number(s.taxAmount)).toFixed(2),
    ]);
  }
  for (const p of purchasesTaxed) {
    const sign = p.kind === "RETURN" ? -1 : 1;
    rows.push([
      p.date.toISOString().slice(0, 10),
      "Input (Purchase)",
      p.invoiceNo,
      p.party.name,
      (sign * Number(p.subtotal)).toFixed(2),
      Number(p.taxRate).toFixed(2),
      (sign * Number(p.taxAmount)).toFixed(2),
    ]);
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const csv = toCsv(["Date", "Type", "Invoice", "Party", "Subtotal", "Tax Rate %", "Tax Amount"], rows);

  return csvResponse(`tax-summary-${from}-to-${to}.csv`, csv);
}
