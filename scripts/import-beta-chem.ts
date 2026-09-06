/**
 * One-off import of Beta Chemicals' historical supplier ledger (from
 * Beta_chem.xlsx) into the "Process Links Internationals" company.
 * Run once with: npx tsx scripts/import-beta-chem.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_NAME = "Process Links Internationals";
const PARTY_NAME = "Beta Chemicals";

type PurchaseRow = { date: string; invoiceNo: string; description: string; amount: number };
type ReturnRow = { date: string; invoiceNo: string; description: string; amount: number };
type PaymentRow = {
  date: string;
  amount: number;
  method: string;
  reference?: string;
};

const purchases: PurchaseRow[] = [
  { date: "2025-03-19", invoiceNo: "155", description: "Material Purchased #155", amount: 210000 },
  { date: "2025-03-26", invoiceNo: "160", description: "Material Purchased #160", amount: 261000 },
  { date: "2025-03-28", invoiceNo: "163", description: "Material Purchased #163", amount: 204000 },
  { date: "2025-04-05", invoiceNo: "165", description: "Material Purchased #165", amount: 510000 },
  { date: "2025-04-19", invoiceNo: "169", description: "Material Purchased #169", amount: 510000 },
  { date: "2025-04-25", invoiceNo: "174", description: "Material Purchased #174", amount: 510000 },
  { date: "2025-09-19", invoiceNo: "32", description: "Material Purchased #32", amount: 255000 },
  { date: "2025-09-22", invoiceNo: "33", description: "Material Purchased #33", amount: 510000 },
  { date: "2025-10-14", invoiceNo: "44", description: "Material Purchased #44", amount: 408000 },
  { date: "2025-10-24", invoiceNo: "49", description: "Material Purchased #49", amount: 411000 },
  { date: "2025-12-04", invoiceNo: "72", description: "Material Purchased #72", amount: 408000 },
  { date: "2026-04-01", invoiceNo: "123", description: "Material Purchased #123", amount: 115200 },
  { date: "2026-04-08", invoiceNo: "127", description: "Material Purchased #127", amount: 518400 },
  { date: "2026-04-28", invoiceNo: "136", description: "Material Purchased #136", amount: 518400 },
];

const returns: ReturnRow[] = [
  { date: "2026-08-18", invoiceNo: "BC-RET-1", description: "Material Returned", amount: 460800 },
];

const payments: PaymentRow[] = [
  { date: "2025-04-10", amount: 250000, method: "Cash" },
  { date: "2025-04-22", amount: 270000, method: "Cash" },
  { date: "2025-05-30", amount: 150000, method: "Cash" },
  { date: "2025-06-03", amount: 300000, method: "Cash" },
  { date: "2025-06-12", amount: 380000, method: "Cash" },
  { date: "2025-09-25", amount: 153000, method: "Cash", reference: "#1" },
  { date: "2026-03-18", amount: 300000, method: "Cash" },
  { date: "2026-05-04", amount: 158400, method: "Cash" },
  { date: "2026-05-13", amount: 141600, method: "Cheque", reference: "Sooneri #83745716" },
  { date: "2026-05-25", amount: 300000, method: "Cash" },
  { date: "2026-07-21", amount: 200000, method: "Bank Transfer", reference: "HBL 195158039" },
];

async function main() {
  const company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });
  if (!company) throw new Error(`Company "${COMPANY_NAME}" not found`);

  const existing = await prisma.party.findFirst({
    where: { companyId: company.id, name: PARTY_NAME },
  });
  if (existing) {
    const [purchaseCount, saleCount, paymentCount] = await Promise.all([
      prisma.purchaseInvoice.count({ where: { partyId: existing.id } }),
      prisma.saleInvoice.count({ where: { partyId: existing.id } }),
      prisma.payment.count({ where: { partyId: existing.id } }),
    ]);
    if (purchaseCount + saleCount + paymentCount > 0) {
      throw new Error(
        `Party "${PARTY_NAME}" (id: ${existing.id}) already has ${purchaseCount} purchases, ${saleCount} sales, ${paymentCount} payments. Aborting to avoid duplicate import.`
      );
    }
  }

  await prisma.$transaction(
    async (tx) => {
    const party =
      existing ??
      (await tx.party.create({
        data: {
          companyId: company.id,
          name: PARTY_NAME,
          type: "SUPPLIER",
          openingBalance: 0,
          openingBalanceSide: "CREDIT",
          openingBalanceDate: new Date("2025-03-19"),
          notes: "Imported from Beta_chem.xlsx supplier ledger.",
        },
      }));

    for (const p of purchases) {
      const amount = p.amount;
      await tx.purchaseInvoice.create({
        data: {
          companyId: company.id,
          invoiceNo: p.invoiceNo,
          date: new Date(p.date),
          partyId: party.id,
          kind: "NORMAL",
          subtotal: amount,
          taxRate: null,
          taxAmount: 0,
          totalAmount: amount,
          items: { create: [{ description: p.description, amount }] },
        },
      });
    }

    for (const r of returns) {
      const amount = r.amount;
      await tx.purchaseInvoice.create({
        data: {
          companyId: company.id,
          invoiceNo: r.invoiceNo,
          date: new Date(r.date),
          partyId: party.id,
          kind: "RETURN",
          subtotal: amount,
          taxRate: null,
          taxAmount: 0,
          totalAmount: amount,
          items: { create: [{ description: r.description, amount }] },
        },
      });
    }

    for (const p of payments) {
      await tx.payment.create({
        data: {
          companyId: company.id,
          partyId: party.id,
          date: new Date(p.date),
          amount: p.amount,
          direction: "OUT",
          method: p.method,
          reference: p.reference,
        },
      });
    }

    console.log(`Imported party ${party.id} with ${purchases.length} purchases, ${returns.length} return, ${payments.length} payments.`);
    },
    { timeout: 30000 }
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
