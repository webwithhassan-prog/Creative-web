"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveCompany } from "@/lib/company";
import { logActivity } from "@/lib/audit";

export type FormState = { error?: string };

const itemSchema = z
  .object({
    productId: z.string().optional(),
    description: z.string().optional(),
    quantity: z.coerce.number().optional(),
    rate: z.coerce.number().optional(),
    amount: z.coerce.number().optional(),
  })
  .refine((i) => i.productId || (i.description && i.description.trim().length > 0), {
    message: "Each line needs a product or a description",
  })
  .refine(
    (i) => !i.productId || (i.quantity !== undefined && i.quantity > 0 && i.rate !== undefined && i.rate >= 0),
    { message: "Quantity and rate are required for product lines" }
  )
  .refine((i) => i.productId || (i.amount !== undefined && i.amount > 0), {
    message: "Amount must be greater than 0",
  });

const invoiceSchema = z.object({
  invoiceNo: z.string().min(1, "Invoice number is required"),
  partyId: z.string().min(1, "Select a customer"),
  date: z.string().min(1, "Date is required"),
  kind: z.enum(["NORMAL", "RETURN"]).default("NORMAL"),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

function lineAmount(item: { productId?: string; quantity?: number; rate?: number; amount?: number }) {
  return item.productId ? Number(item.quantity) * Number(item.rate) : Number(item.amount);
}

function readInvoice(formData: FormData) {
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    items = [];
  }

  return invoiceSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    partyId: formData.get("partyId"),
    date: formData.get("date"),
    kind: formData.get("kind") || "NORMAL",
    taxRate: formData.get("taxEnabled") === "on" ? formData.get("taxRate") || undefined : undefined,
    notes: formData.get("notes") || undefined,
    items,
  });
}

// Builds a per-customer suggested invoice number ("BC-004"…) from each
// customer's short invoice code, continuing on from the highest number
// already used for that code. Customers without a code fall back to a
// generic "SALE-" sequence.
function computeInvoiceNoSuggestions(
  existingInvoiceNos: string[],
  parties: { id: string; invoicePrefix: string | null }[],
  fallbackPrefix: string
) {
  const maxByPrefix = new Map<string, number>();
  const re = /^([A-Za-z0-9]+)-(\d+)$/;
  for (const no of existingInvoiceNos) {
    const m = re.exec(no);
    if (!m) continue;
    const prefix = m[1].toUpperCase();
    const num = parseInt(m[2], 10);
    if (Number.isFinite(num) && num > (maxByPrefix.get(prefix) ?? 0)) maxByPrefix.set(prefix, num);
  }
  function next(prefix: string) {
    const key = prefix.toUpperCase();
    const n = (maxByPrefix.get(key) ?? 0) + 1;
    maxByPrefix.set(key, n);
    return `${key}-${String(n).padStart(3, "0")}`;
  }
  const fallback = next(fallbackPrefix);
  const suggestions: Record<string, string> = {};
  for (const party of parties) {
    suggestions[party.id] = next(party.invoicePrefix?.trim() || fallbackPrefix);
  }
  return { suggestions, fallback };
}

export async function getSaleInvoiceNoSuggestions() {
  const { active } = await requireActiveCompany();
  const [parties, invoices] = await Promise.all([
    prisma.party.findMany({
      where: { companyId: active.id, type: "CUSTOMER" },
      select: { id: true, invoicePrefix: true },
    }),
    prisma.saleInvoice.findMany({ where: { companyId: active.id }, select: { invoiceNo: true } }),
  ]);
  return computeInvoiceNoSuggestions(
    invoices.map((i) => i.invoiceNo),
    parties,
    "SALE"
  );
}

export async function createSale(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readInvoice(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { active } = await requireActiveCompany();
  const { invoiceNo, partyId, date, notes, items, kind, taxRate } = parsed.data;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.companyId !== active.id || party.type !== "CUSTOMER") {
    return { error: "Selected party is not a customer" };
  }

  const productIds = [...new Set(items.filter((i) => i.productId).map((i) => i.productId!))];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, companyId: active.id } })
    : [];
  if (products.length !== productIds.length) {
    return { error: "One or more selected products could not be found" };
  }

  if (kind === "NORMAL") {
    for (const item of items) {
      if (!item.productId) continue;
      const product = products.find((p) => p.id === item.productId)!;
      if (Number(product.currentStock) < Number(item.quantity)) {
        return {
          error: `Not enough stock for ${product.name} (available: ${Number(
            product.currentStock
          )} ${product.unit})`,
        };
      }
    }
  }

  const existing = await prisma.saleInvoice.findUnique({
    where: { companyId_invoiceNo: { companyId: active.id, invoiceNo } },
  });
  if (existing) {
    return { error: `Invoice number ${invoiceNo} is already used` };
  }

  const subtotal = items.reduce((sum, i) => sum + lineAmount(i), 0);
  const taxAmount = taxRate ? subtotal * (taxRate / 100) : 0;
  const totalAmount = subtotal + taxAmount;

  await prisma.$transaction(async (tx) => {
    await tx.saleInvoice.create({
      data: {
        companyId: active.id,
        invoiceNo,
        date: new Date(date),
        partyId,
        kind,
        subtotal,
        taxRate: taxRate ?? null,
        taxAmount,
        totalAmount,
        notes,
        items: {
          create: items.map((i) =>
            i.productId
              ? {
                  productId: i.productId,
                  quantity: i.quantity,
                  rate: i.rate,
                  amount: Number(i.quantity) * Number(i.rate),
                }
              : { description: i.description, amount: i.amount! }
          ),
        },
      },
    });

    for (const item of items) {
      if (!item.productId) continue;
      const qty = Number(item.quantity);
      if (kind === "RETURN") {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: qty } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: qty }, lastSaleRate: item.rate },
        });
      }
    }
  });

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath(`/parties/${partyId}`);

  await logActivity({
    companyId: active.id,
    action: "CREATE",
    entityType: kind === "RETURN" ? "SaleReturn" : "Sale",
    summary: `${kind === "RETURN" ? "Sale return" : "Sale"} ${invoiceNo} (${party.name}, Rs ${totalAmount.toFixed(2)})`,
  });

  redirect("/sales");
}

export async function updateSale(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readInvoice(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { active } = await requireActiveCompany();
  const { invoiceNo, partyId, date, notes, items, kind, taxRate } = parsed.data;

  const existing = await prisma.saleInvoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing || existing.companyId !== active.id) {
    return { error: "Sale not found" };
  }

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.companyId !== active.id || party.type !== "CUSTOMER") {
    return { error: "Selected party is not a customer" };
  }

  const newProductIds = [...new Set(items.filter((i) => i.productId).map((i) => i.productId!))];
  const newProducts = newProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: newProductIds }, companyId: active.id } })
    : [];
  if (newProducts.length !== newProductIds.length) {
    return { error: "One or more selected products could not be found" };
  }

  if (invoiceNo !== existing.invoiceNo) {
    const dup = await prisma.saleInvoice.findUnique({
      where: { companyId_invoiceNo: { companyId: active.id, invoiceNo } },
    });
    if (dup) return { error: `Invoice number ${invoiceNo} is already used` };
  }

  // Simulate reversing the old stock impact and applying the new one, on top
  // of current stock, so we can catch a resulting negative before writing
  // anything — regardless of how the old/new items and kind differ.
  const oldProductIds = existing.items.filter((i) => i.productId).map((i) => i.productId!);
  const allProductIds = [...new Set([...oldProductIds, ...newProductIds])];
  const freshProducts = await prisma.product.findMany({ where: { id: { in: allProductIds } } });
  const stockMap = new Map(freshProducts.map((p) => [p.id, Number(p.currentStock)]));

  for (const item of existing.items) {
    if (!item.productId) continue;
    const qty = Number(item.quantity);
    const delta = existing.kind === "RETURN" ? -qty : qty;
    stockMap.set(item.productId, (stockMap.get(item.productId) ?? 0) + delta);
  }
  for (const item of items) {
    if (!item.productId) continue;
    const qty = Number(item.quantity);
    const delta = kind === "RETURN" ? qty : -qty;
    stockMap.set(item.productId, (stockMap.get(item.productId) ?? 0) + delta);
  }
  for (const [productId, stock] of stockMap) {
    if (stock < -0.0005) {
      const product = freshProducts.find((p) => p.id === productId);
      return {
        error: `Saving this would make stock of ${product?.name ?? "a product"} negative (${stock.toFixed(
          3
        )}). Adjust quantities, or fix related purchases/returns first.`,
      };
    }
  }

  const subtotal = items.reduce((sum, i) => sum + lineAmount(i), 0);
  const taxAmount = taxRate ? subtotal * (taxRate / 100) : 0;
  const totalAmount = subtotal + taxAmount;

  await prisma.$transaction(async (tx) => {
    for (const item of existing.items) {
      if (!item.productId) continue;
      const qty = Number(item.quantity);
      await tx.product.update({
        where: { id: item.productId },
        data: existing.kind === "RETURN" ? { currentStock: { decrement: qty } } : { currentStock: { increment: qty } },
      });
    }

    await tx.saleItem.deleteMany({ where: { saleInvoiceId: id } });

    await tx.saleInvoice.update({
      where: { id },
      data: {
        invoiceNo,
        date: new Date(date),
        partyId,
        kind,
        subtotal,
        taxRate: taxRate ?? null,
        taxAmount,
        totalAmount,
        notes,
        items: {
          create: items.map((i) =>
            i.productId
              ? {
                  productId: i.productId,
                  quantity: i.quantity,
                  rate: i.rate,
                  amount: Number(i.quantity) * Number(i.rate),
                }
              : { description: i.description, amount: i.amount! }
          ),
        },
      },
    });

    for (const item of items) {
      if (!item.productId) continue;
      const qty = Number(item.quantity);
      if (kind === "RETURN") {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: qty } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: qty }, lastSaleRate: item.rate },
        });
      }
    }
  });

  await logActivity({
    companyId: active.id,
    action: "UPDATE",
    entityType: kind === "RETURN" ? "SaleReturn" : "Sale",
    summary: `${kind === "RETURN" ? "Sale return" : "Sale"} ${invoiceNo} edited (${party.name}, Rs ${totalAmount.toFixed(2)})`,
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  revalidatePath("/products");
  revalidatePath(`/parties/${partyId}`);
  if (existing.partyId !== partyId) revalidatePath(`/parties/${existing.partyId}`);
  redirect("/sales");
}

export async function deleteSale(formData: FormData) {
  const id = formData.get("id") as string;
  const { active } = await requireActiveCompany();

  const invoice = await prisma.saleInvoice.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, party: true },
  });
  if (!invoice || invoice.companyId !== active.id) redirect("/sales");

  const stockItems = invoice.items.filter((i) => i.productId && i.product);

  if (invoice.kind === "RETURN") {
    for (const item of stockItems) {
      if (Number(item.product!.currentStock) < Number(item.quantity)) {
        redirect(`/sales/${id}?error=stock`);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of stockItems) {
      await tx.product.update({
        where: { id: item.productId! },
        data:
          invoice.kind === "RETURN"
            ? { currentStock: { decrement: item.quantity! } }
            : { currentStock: { increment: item.quantity! } },
      });
    }
    await tx.saleInvoice.delete({ where: { id } });
  });

  await logActivity({
    companyId: active.id,
    action: "DELETE",
    entityType: invoice.kind === "RETURN" ? "SaleReturn" : "Sale",
    summary: `${invoice.kind === "RETURN" ? "Sale return" : "Sale"} ${invoice.invoiceNo} (${invoice.party.name}, Rs ${Number(invoice.totalAmount).toFixed(2)})`,
  });

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath(`/parties/${invoice.partyId}`);
  redirect("/sales");
}
