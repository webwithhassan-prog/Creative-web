import type { Party, PurchaseInvoice, SaleInvoice, Payment } from "@prisma/client";

export type LedgerEntryType =
  | "OPENING"
  | "PURCHASE"
  | "PURCHASE_RETURN"
  | "SALE"
  | "SALE_RETURN"
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
    const isReturn = inv.kind === "RETURN";
    const amount = Number(inv.totalAmount);
    unsorted.push({
      id: inv.id,
      date: inv.date,
      type: isReturn ? "PURCHASE_RETURN" : "PURCHASE",
      description: `${isReturn ? "Purchase return" : "Purchase invoice"} ${inv.invoiceNo}`,
      reference: inv.invoiceNo,
      // A normal purchase credits the supplier (increases payable); a
      // return reverses that, debiting the supplier same as a payment.
      debit: isReturn ? amount : 0,
      credit: isReturn ? 0 : amount,
    });
  }

  for (const inv of party.saleInvoices) {
    const isReturn = inv.kind === "RETURN";
    const amount = Number(inv.totalAmount);
    unsorted.push({
      id: inv.id,
      date: inv.date,
      type: isReturn ? "SALE_RETURN" : "SALE",
      description: `${isReturn ? "Sale return" : "Sale invoice"} ${inv.invoiceNo}`,
      reference: inv.invoiceNo,
      // A normal sale debits the customer (increases receivable); a
      // return reverses that, crediting the customer same as a payment.
      debit: isReturn ? 0 : amount,
      credit: isReturn ? amount : 0,
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

/** Running balance as of the end of a given date (inclusive). */
export function closingBalanceAsOf(party: PartyWithHistory, asOfDate: Date): number {
  const cutoff = new Date(asOfDate);
  cutoff.setHours(23, 59, 59, 999);
  const rows = buildPartyLedger(party).filter((r) => r.date.getTime() <= cutoff.getTime());
  return rows.length ? rows[rows.length - 1].balance : 0;
}

export function balanceLabel(balance: number): { amount: number; side: "Dr" | "Cr" } {
  return balance >= 0
    ? { amount: balance, side: "Dr" }
    : { amount: -balance, side: "Cr" };
}

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";
export const AGING_BUCKETS: AgingBucket[] = ["current", "1-30", "31-60", "61-90", "90+"];

export type AgingItem = {
  date: Date;
  description: string;
  reference: string | null;
  originalAmount: number;
  remainingAmount: number;
  daysOld: number;
  bucket: AgingBucket;
};

function bucketFor(daysOld: number): AgingBucket {
  if (daysOld <= 0) return "current";
  if (daysOld <= 30) return "1-30";
  if (daysOld <= 60) return "31-60";
  if (daysOld <= 90) return "61-90";
  return "90+";
}

/**
 * FIFO-allocates settlements (payments, returns) against the debts that
 * created the balance (purchases for a supplier, sales for a customer), in
 * chronological order, so we know which portion of the current balance is
 * how old. A supplier's balance normally sits on the credit side, so credit
 * rows are the "debt" here and debit rows settle it; it's the mirror for a
 * customer.
 */
export function computePartyAging(party: PartyWithHistory, asOfDate: Date): AgingItem[] {
  const cutoff = new Date(asOfDate);
  cutoff.setHours(23, 59, 59, 999);
  const rows = buildPartyLedger(party).filter((r) => r.date.getTime() <= cutoff.getTime());

  const debtField = party.type === "SUPPLIER" ? "credit" : "debit";
  const settleField = debtField === "credit" ? "debit" : "credit";

  const queue: { date: Date; description: string; reference: string | null; original: number; remaining: number }[] = [];

  for (const row of rows) {
    const debtAmount = row[debtField];
    if (debtAmount > 0) {
      queue.push({
        date: row.date,
        description: row.description,
        reference: row.reference,
        original: debtAmount,
        remaining: debtAmount,
      });
    }

    let settleAmount = row[settleField];
    if (settleAmount > 0) {
      for (const item of queue) {
        if (settleAmount <= 0) break;
        if (item.remaining <= 0) continue;
        const applied = Math.min(item.remaining, settleAmount);
        item.remaining -= applied;
        settleAmount -= applied;
      }
    }
  }

  const msPerDay = 86_400_000;
  return queue
    .filter((item) => item.remaining > 0.005)
    .map((item) => {
      const daysOld = Math.floor((cutoff.getTime() - item.date.getTime()) / msPerDay);
      return {
        date: item.date,
        description: item.description,
        reference: item.reference,
        originalAmount: item.original,
        remainingAmount: item.remaining,
        daysOld,
        bucket: bucketFor(daysOld),
      };
    });
}

export function summarizeAging(items: AgingItem[]): Record<AgingBucket, number> {
  const summary: Record<AgingBucket, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const item of items) {
    summary[item.bucket] += item.remainingAmount;
  }
  return summary;
}
