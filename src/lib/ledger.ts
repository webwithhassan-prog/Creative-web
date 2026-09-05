import type { Party, PurchaseInvoice, SaleInvoice, Payment } from "@prisma/client";

export type LedgerEntryType =
  | "OPENING"
  | "PURCHASE"
  | "SALE"
  | "PAYMENT_IN"
  | "PAYMENT_OUT";

export type LedgerRow = {
  id: string;
  date: Date;
  type: LedgerEntryType;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number; // signed running balance: positive = Dr, negative = Cr
};

type PartyWithHistory = Party & {
  purchaseInvoices: PurchaseInvoice[];
  saleInvoices: SaleInvoice[];
  payments: Payment[];
};

/**
 * Builds the running-balance statement for one party, in the same convention
 * used by standard ledger books: a supplier account normally carries a
 * credit balance (money we owe), a customer account normally carries a
 * debit balance (money owed to us). Purchases/sales move the balance one
 * way, payments move it back.
 */
export function buildPartyLedger(party: PartyWithHistory): LedgerRow[] {
  const unsorted: Omit<LedgerRow, "balance">[] = [];

  const opening = Number(party.openingBalance);
  if (opening !== 0) {
    unsorted.push({
      id: "opening",
      date: party.openingBalanceDate,
      type: "OPENING",
      description: "Opening balance",
      reference: null,
      debit: party.openingBalanceSide === "DEBIT" ? opening : 0,
      credit: party.openingBalanceSide === "CREDIT" ? opening : 0,
    });
  }

  for (const inv of party.purchaseInvoices) {
    unsorted.push({
      id: inv.id,
      date: inv.date,
      type: "PURCHASE",
      description: `Purchase invoice ${inv.invoiceNo}`,
      reference: inv.invoiceNo,
      debit: 0,
      credit: Number(inv.totalAmount),
    });
  }

  for (const inv of party.saleInvoices) {
    unsorted.push({
      id: inv.id,
      date: inv.date,
      type: "SALE",
      description: `Sale invoice ${inv.invoiceNo}`,
      reference: inv.invoiceNo,
      debit: Number(inv.totalAmount),
      credit: 0,
    });
  }

  for (const p of party.payments) {
    const amount = Number(p.amount);
    unsorted.push({
      id: p.id,
      date: p.date,
      type: p.direction === "OUT" ? "PAYMENT_OUT" : "PAYMENT_IN",
      description:
        p.direction === "OUT"
          ? `Payment made (${p.method})`
          : `Payment received (${p.method})`,
      reference: p.reference,
      debit: p.direction === "OUT" ? amount : 0,
      credit: p.direction === "IN" ? amount : 0,
    });
  }

  const dayKey = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const typeRank = (t: LedgerEntryType) => (t === "OPENING" ? -1 : 0);

  unsorted.sort((a, b) => {
    const dayDiff = dayKey(a.date) - dayKey(b.date);
    if (dayDiff !== 0) return dayDiff;
    const rankDiff = typeRank(a.type) - typeRank(b.type);
    if (rankDiff !== 0) return rankDiff;
    return a.date.getTime() - b.date.getTime();
  });

  let running = 0;
  return unsorted.map((row) => {
    running += row.debit - row.credit;
    return { ...row, balance: running };
  });
}

export function closingBalance(party: PartyWithHistory): number {
  const rows = buildPartyLedger(party);
  return rows.length ? rows[rows.length - 1].balance : 0;
}

export function balanceLabel(balance: number): { amount: number; side: "Dr" | "Cr" } {
  return balance >= 0
    ? { amount: balance, side: "Dr" }
    : { amount: -balance, side: "Cr" };
}
