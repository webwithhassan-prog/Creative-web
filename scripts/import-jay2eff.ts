/**
 * One-off import of Jay 2 Eff Enterprises' supplier ledger ("Customer
 * Statement" — Account No. NGST43, addressed to Process Links International)
 * into the "Process Links Internationals" company. The source document is
 * written from the supplier's point of view (they are the seller, we are
 * their customer), so it is mirrored into our books: their "Sale Invoice"
 * rows become our Purchase Invoices, their "Sale Credit" rows become our
 * Purchase Returns, and their "Sale Receipt" rows become our outgoing
 * payments. Run once with: npx tsx scripts/import-jay2eff.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_NAME = "Process Links Internationals";
const PARTY_NAME = "Jay 2 Eff Enterprises";
const INVOICE_PREFIX = "JTF";

type InvoiceRow = { date: string; refNo: string; kind: "NORMAL" | "RETURN"; amount: number };
type PaymentRow = { date: string; amount: number; method: string; reference: string | null };

// In statement order, oldest to newest.
const invoices: InvoiceRow[] = [
  { date: "2024-11-29", refNo: "N587", kind: "NORMAL", amount: 60750 },
  { date: "2024-12-04", refNo: "N588", kind: "NORMAL", amount: 30000 },
  { date: "2025-01-15", refNo: "N607", kind: "NORMAL", amount: 60750 },
  { date: "2025-05-29", refNo: "N675", kind: "NORMAL", amount: 60750 },
  { date: "2025-06-05", refNo: "N677", kind: "NORMAL", amount: 303750 },
  { date: "2025-06-25", refNo: "N682", kind: "NORMAL", amount: 182250 },
  { date: "2025-07-09", refNo: "N682-CR", kind: "RETURN", amount: 182250 },
  { date: "2025-07-25", refNo: "N690", kind: "NORMAL", amount: 121500 },
  { date: "2025-08-11", refNo: "N695", kind: "NORMAL", amount: 121500 },
  { date: "2025-11-08", refNo: "N723", kind: "NORMAL", amount: 101350 },
  { date: "2025-12-13", refNo: "N723-CR", kind: "RETURN", amount: 36250 },
  { date: "2026-02-05", refNo: "N795", kind: "NORMAL", amount: 15120 },
  { date: "2026-03-14", refNo: "N782", kind: "NORMAL", amount: 48000 },
  { date: "2026-04-04", refNo: "N792", kind: "NORMAL", amount: 72000 },
  { date: "2026-04-09", refNo: "N796", kind: "NORMAL", amount: 12150 },
  { date: "2026-05-05", refNo: "N815", kind: "NORMAL", amount: 12150 },
  { date: "2026-05-06", refNo: "N816", kind: "NORMAL", amount: 96000 },
  { date: "2026-05-19", refNo: "N827", kind: "NORMAL", amount: 72000 },
  { date: "2026-06-06", refNo: "N838", kind: "NORMAL", amount: 96000 },
];

const payments: PaymentRow[] = [
  { date: "2025-01-15", amount: 67500, method: "Bank Transfer", reference: "V. No. 238" },
  { date: "2025-04-15", amount: 50000, method: "Bank Transfer", reference: "V. No. 661" },
  { date: "2025-08-30", amount: 200000, method: "Bank Transfer", reference: "Deposit slip 53146119" },
  { date: "2025-10-30", amount: 300000, method: "Bank Transfer", reference: "Cash deposit slip 53308118" },
  { date: "2026-03-18", amount: 100000, method: "Cash", reference: null },
  { date: "2026-05-04", amount: 100000, method: "Bank Transfer", reference: "V. No. 2268" },
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
            openingBalance: 0,
            openingBalanceSide: "CREDIT",
            openingBalanceDate: new Date("2024-11-29"),
            notes:
              "Imported from Jay 2 Eff Enterprises' Customer Statement (Account No. NGST43). Their Sale Invoices/Credits/Receipts are mirrored here as our Purchase Invoices/Returns/Payments.",
            invoicePrefix: INVOICE_PREFIX,
          },
        }));

      let seq = 1;
      for (const row of invoices) {
        const invoiceNo = `${INVOICE_PREFIX}-${String(seq++).padStart(3, "0")}`;
        await tx.purchaseInvoice.create({
          data: {
            companyId: company.id,
            invoiceNo,
            date: new Date(row.date),
            partyId: party.id,
            kind: row.kind,
            subtotal: row.amount,
            taxRate: null,
            taxAmount: 0,
            totalAmount: row.amount,
            notes: `Supplier ref: ${row.refNo}`,
            items: {
              create: [
                {
                  description:
                    row.kind === "RETURN"
                      ? `Credit note against invoice ${row.refNo.replace("-CR", "")}`
                      : "Trading goods per supplier invoice",
                  amount: row.amount,
                },
              ],
            },
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

      console.log(
        `Imported party ${party.id} with ${invoices.length} invoice/credit entries and ${payments.length} payments.`
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
