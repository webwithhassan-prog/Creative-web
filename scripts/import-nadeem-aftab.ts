/**
 * One-off import of Nadeem Aftab Sb's supplier ledger (01-Jan to 13-Jul,
 * "Process Links Izhar Sb" sheet) into the "Process Links Internationals"
 * company as a separate account from the one under Creative Dyes and
 * Chemicals. Run once with: npx tsx scripts/import-nadeem-aftab.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_NAME = "Process Links Internationals";
const PARTY_NAME = "Nadeem Aftab Sb";
const YEAR = 2026;

type PurchaseRow = {
  date: string;
  product?: "Black VSF 600" | "Rose FR";
  qty?: number; // kg
  rate?: number;
  description?: string; // for non-product (tax) lines
  amount: number;
};

type PaymentRow = { date: string; amount: number; reference: string };

// In original sheet entry order (not date-sorted — a few rows are backdated
// corrections entered out of order, e.g. the 13-Feb row appears after 13-Mar).
const purchases: PurchaseRow[] = [
  { date: `${YEAR}-01-02`, product: "Black VSF 600", qty: 500, rate: 1800, amount: 900000 },
  { date: `${YEAR}-01-03`, description: "Sales Tax Difference (500KG)", amount: 20250 },
  { date: `${YEAR}-01-27`, product: "Black VSF 600", qty: 1000, rate: 1800, amount: 1800000 },
  { date: `${YEAR}-03-12`, product: "Rose FR", qty: 50, rate: 1550, amount: 77500 },
  { date: `${YEAR}-03-13`, product: "Black VSF 600", qty: 925, rate: 1800, amount: 1665000 },
  { date: `${YEAR}-02-13`, product: "Black VSF 600", qty: 5, rate: 1800, amount: 9000 },
  { date: `${YEAR}-03-04`, description: "Sales Tax Difference", amount: 40500 },
  { date: `${YEAR}-03-16`, description: "Sales Tax Difference", amount: 40500 },
  { date: `${YEAR}-03-25`, product: "Rose FR", qty: 100, rate: 1550, amount: 155000 },
  { date: `${YEAR}-03-26`, product: "Black VSF 600", qty: 1000, rate: 1850, amount: 1850000 },
  { date: `${YEAR}-03-26`, product: "Black VSF 600", qty: 70, rate: 1850, amount: 129500 },
  { date: `${YEAR}-03-31`, product: "Black VSF 600", qty: 500, rate: 2000, amount: 1000000 },
  { date: `${YEAR}-04-01`, description: "Sales Tax Difference", amount: 51000 },
  { date: `${YEAR}-04-30`, product: "Black VSF 600", qty: 500, rate: 2000, amount: 1000000 },
  { date: `${YEAR}-05-12`, product: "Black VSF 600", qty: 500, rate: 1850, amount: 925000 },
  { date: `${YEAR}-05-18`, description: "Sales Tax Difference", amount: 25500 },
  { date: `${YEAR}-06-23`, product: "Black VSF 600", qty: 1000, rate: 2000, amount: 2000000 },
  { date: `${YEAR}-06-23`, product: "Black VSF 600", qty: 1500, rate: 1850, amount: 2775000 },
  { date: `${YEAR}-06-23`, description: "Sales Tax Difference", amount: 76500 },
  { date: `${YEAR}-07-02`, product: "Rose FR", qty: 150, rate: 1650, amount: 247500 },
  { date: `${YEAR}-07-02`, product: "Black VSF 600", qty: 100, rate: 2000, amount: 200000 },
];

const payments: PaymentRow[] = [
  { date: `${YEAR}-01-13`, amount: 619500, reference: "T&C HMB" },
  { date: `${YEAR}-02-04`, amount: 1032500, reference: "T&C HBL" },
  { date: `${YEAR}-03-16`, amount: 2065000, reference: "T&C HMB" },
  { date: `${YEAR}-04-15`, amount: 2065000, reference: "T&C HBL" },
  { date: `${YEAR}-04-15`, amount: 2124000, reference: "T&C HBL" },
  { date: `${YEAR}-05-07`, amount: 286425, reference: "T&C Mezn" },
  { date: `${YEAR}-05-07`, amount: 359250, reference: "T&C Mezn" },
  { date: `${YEAR}-06-02`, amount: 500000, reference: "T&C Mezn" },
  { date: `${YEAR}-06-09`, amount: 1062000, reference: "T&C Mezn" },
  { date: `${YEAR}-07-13`, amount: 500000, reference: "T&C Mezn" },
];

async function main() {
  const company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });
  if (!company) throw new Error(`Company "${COMPANY_NAME}" not found`);

  const existing = await prisma.party.findFirst({ where: { companyId: company.id, name: PARTY_NAME } });
  if (existing) {
    const [p, s, pay] = await Promise.all([
      prisma.purchaseInvoice.count({ where: { partyId: existing.id } }),
      prisma.saleInvoice.count({ where: { partyId: existing.id } }),
      prisma.payment.count({ where: { partyId: existing.id } }),
    ]);
    if (p + s + pay > 0) {
      throw new Error(`Party "${PARTY_NAME}" (id: ${existing.id}) already has history. Aborting to avoid duplicate import.`);
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
            openingBalance: 1404225,
            openingBalanceSide: "CREDIT",
            openingBalanceDate: new Date(`${YEAR}-01-01`),
            notes: "Imported from the Nadeem Aftab Sb / Process Links Izhar Sb ledger sheet.",
          },
        }));

      const productNames = ["Black VSF 600", "Rose FR"] as const;
      const products: Record<string, { id: string }> = {};
      for (const name of productNames) {
        let product = await tx.product.findFirst({ where: { companyId: company.id, name } });
        if (!product) {
          product = await tx.product.create({
            data: { companyId: company.id, name, unit: "kg", currentStock: 0, reorderLevel: 0 },
          });
        }
        products[name] = product;
      }

      let seq = 1;
      for (const row of purchases) {
        const invoiceNo = `NAS-${String(seq++).padStart(3, "0")}`;
        const product = row.product ? products[row.product] : null;

        await tx.purchaseInvoice.create({
          data: {
            companyId: company.id,
            invoiceNo,
            date: new Date(row.date),
            partyId: party.id,
            kind: "NORMAL",
            subtotal: row.amount,
            taxRate: null,
            taxAmount: 0,
            totalAmount: row.amount,
            items: {
              create: product
                ? [{ productId: product.id, quantity: row.qty, rate: row.rate, amount: row.amount }]
                : [{ description: row.description, amount: row.amount }],
            },
          },
        });

        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: { increment: row.qty! }, lastPurchaseRate: row.rate },
          });
        }
      }

      for (const p of payments) {
        await tx.payment.create({
          data: {
            companyId: company.id,
            partyId: party.id,
            date: new Date(p.date),
            amount: p.amount,
            direction: "OUT",
            method: "Bank Transfer",
            reference: p.reference,
          },
        });
      }

      console.log(
        `Imported party ${party.id} with ${purchases.length} purchase/tax entries and ${payments.length} payments.`
      );
    },
    { timeout: 60000 }
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
