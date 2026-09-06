"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import type { ImportState } from "@/components/CsvImportForm";

type BackupParty = {
  id: string;
  name: string;
  type: "SUPPLIER" | "CUSTOMER";
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  openingBalance: string | number;
  openingBalanceSide: "DEBIT" | "CREDIT";
  openingBalanceDate: string;
  notes: string | null;
  isActive: boolean;
};

type BackupProduct = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  currentStock: string | number;
  reorderLevel: string | number;
  lastPurchaseRate: string | number | null;
  lastSaleRate: string | number | null;
  isActive: boolean;
};

type BackupItem = {
  productId: string | null;
  description: string | null;
  quantity: string | number | null;
  rate: string | number | null;
  amount: string | number;
};

type BackupInvoice = {
  invoiceNo: string;
  date: string;
  partyId: string;
  kind: "NORMAL" | "RETURN";
  subtotal: string | number;
  taxRate: string | number | null;
  taxAmount: string | number;
  totalAmount: string | number;
  notes: string | null;
  items: BackupItem[];
};

type BackupPayment = {
  partyId: string;
  date: string;
  amount: string | number;
  direction: "IN" | "OUT";
  method: string;
  reference: string | null;
  notes: string | null;
};

type Backup = {
  exportedAt?: string;
  company: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    gstin: string | null;
    defaultTaxRate: string | number;
  };
  parties: BackupParty[];
  products: BackupProduct[];
  purchaseInvoices: BackupInvoice[];
  saleInvoices: BackupInvoice[];
  payments: BackupPayment[];
};

function isBackup(data: unknown): data is Backup {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.company === "object" &&
    d.company !== null &&
    typeof (d.company as Record<string, unknown>).name === "string" &&
    Array.isArray(d.parties) &&
    Array.isArray(d.products)
  );
}

export async function restoreBackup(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a backup .json file to restore" };
  }

  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { error: "That file isn't valid JSON" };
  }

  if (!isBackup(data)) {
    return { error: "This doesn't look like a Creative Accounts backup file" };
  }

  const errors: string[] = [];
  let created = 0;

  const company = await prisma.company.create({
    data: {
      name: `${data.company.name} (Restored)`,
      address: data.company.address ?? undefined,
      phone: data.company.phone ?? undefined,
      email: data.company.email ?? undefined,
      logo: data.company.logo ?? undefined,
      gstin: data.company.gstin ?? undefined,
      defaultTaxRate: data.company.defaultTaxRate ?? 18,
    },
  });

  const partyIdMap = new Map<string, string>();
  for (const p of data.parties) {
    try {
      const createdParty = await prisma.party.create({
        data: {
          companyId: company.id,
          name: p.name,
          type: p.type,
          phone: p.phone ?? undefined,
          email: p.email ?? undefined,
          address: p.address ?? undefined,
          gstin: p.gstin ?? undefined,
          openingBalance: p.openingBalance,
          openingBalanceSide: p.openingBalanceSide,
          openingBalanceDate: new Date(p.openingBalanceDate),
          notes: p.notes ?? undefined,
          isActive: p.isActive,
        },
      });
      partyIdMap.set(p.id, createdParty.id);
      created++;
    } catch (e) {
      errors.push(`Skipped account "${p.name}": ${(e as Error).message}`);
    }
  }

  const productIdMap = new Map<string, string>();
  for (const pr of data.products) {
    try {
      const createdProduct = await prisma.product.create({
        data: {
          companyId: company.id,
          name: pr.name,
          sku: pr.sku ?? undefined,
          unit: pr.unit,
          currentStock: pr.currentStock,
          reorderLevel: pr.reorderLevel,
          lastPurchaseRate: pr.lastPurchaseRate ?? undefined,
          lastSaleRate: pr.lastSaleRate ?? undefined,
          isActive: pr.isActive,
        },
      });
      productIdMap.set(pr.id, createdProduct.id);
      created++;
    } catch (e) {
      errors.push(`Skipped product "${pr.name}": ${(e as Error).message}`);
    }
  }

  async function restoreInvoices(
    invoices: BackupInvoice[],
    createFn: (args: {
      companyId: string;
      invoiceNo: string;
      date: Date;
      partyId: string;
      kind: "NORMAL" | "RETURN";
      subtotal: string | number;
      taxRate: string | number | null;
      taxAmount: string | number;
      totalAmount: string | number;
      notes: string | undefined;
      items: BackupItem[];
    }) => Promise<unknown>
  ) {
    for (const inv of invoices) {
      const partyId = partyIdMap.get(inv.partyId);
      if (!partyId) {
        errors.push(`Skipped invoice ${inv.invoiceNo}: its account wasn't in the backup`);
        continue;
      }
      try {
        await createFn({
          companyId: company.id,
          invoiceNo: inv.invoiceNo,
          date: new Date(inv.date),
          partyId,
          kind: inv.kind,
          subtotal: inv.subtotal,
          taxRate: inv.taxRate,
          taxAmount: inv.taxAmount,
          totalAmount: inv.totalAmount,
          notes: inv.notes ?? undefined,
          items: inv.items.map((it) => ({
            ...it,
            productId: it.productId ? productIdMap.get(it.productId) ?? null : null,
          })),
        });
        created++;
      } catch (e) {
        errors.push(`Skipped invoice ${inv.invoiceNo}: ${(e as Error).message}`);
      }
    }
  }

  await restoreInvoices(data.purchaseInvoices ?? [], (args) =>
    prisma.purchaseInvoice.create({
      data: {
        companyId: args.companyId,
        invoiceNo: args.invoiceNo,
        date: args.date,
        partyId: args.partyId,
        kind: args.kind,
        subtotal: args.subtotal,
        taxRate: args.taxRate,
        taxAmount: args.taxAmount,
        totalAmount: args.totalAmount,
        notes: args.notes,
        items: {
          create: args.items.map((it) =>
            it.productId
              ? { productId: it.productId, quantity: it.quantity, rate: it.rate, amount: it.amount }
              : { description: it.description ?? undefined, amount: it.amount }
          ),
        },
      },
    })
  );

  await restoreInvoices(data.saleInvoices ?? [], (args) =>
    prisma.saleInvoice.create({
      data: {
        companyId: args.companyId,
        invoiceNo: args.invoiceNo,
        date: args.date,
        partyId: args.partyId,
        kind: args.kind,
        subtotal: args.subtotal,
        taxRate: args.taxRate,
        taxAmount: args.taxAmount,
        totalAmount: args.totalAmount,
        notes: args.notes,
        items: {
          create: args.items.map((it) =>
            it.productId
              ? { productId: it.productId, quantity: it.quantity, rate: it.rate, amount: it.amount }
              : { description: it.description ?? undefined, amount: it.amount }
          ),
        },
      },
    })
  );

  for (const p of data.payments ?? []) {
    const partyId = partyIdMap.get(p.partyId);
    if (!partyId) {
      errors.push(`Skipped a payment: its account wasn't in the backup`);
      continue;
    }
    try {
      await prisma.payment.create({
        data: {
          companyId: company.id,
          partyId,
          date: new Date(p.date),
          amount: p.amount,
          direction: p.direction,
          method: p.method,
          reference: p.reference ?? undefined,
          notes: p.notes ?? undefined,
        },
      });
      created++;
    } catch (e) {
      errors.push(`Skipped a payment: ${(e as Error).message}`);
    }
  }

  await logActivity({
    companyId: company.id,
    action: "CREATE",
    entityType: "Company",
    summary: `Restored from backup${data.exportedAt ? ` exported ${new Date(data.exportedAt).toLocaleString()}` : ""}`,
  });

  revalidatePath("/", "layout");
  return { result: { created, errors } };
}
