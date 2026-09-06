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
  partyId: z.string().min(1, "Select a supplier"),
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

async function nextInvoiceNumber(companyId: string) {
  const count = await prisma.purchaseInvoice.count({ where: { companyId } });
  return `PUR-${String(count + 1).padStart(4, "0")}`;
}

export async function getNextPurchaseInvoiceNo() {
  const { active } = await requireActiveCompany();
  return nextInvoiceNumber(active.id);
}

export async function createPurchase(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readInvoice(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { active } = await requireActiveCompany();
  const { invoiceNo, partyId, date, notes, items, kind, taxRate } = parsed.data;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.companyId !== active.id || party.type !== "SUPPLIER") {
    return { error: "Selected party is not a supplier" };
  }

  const productIds = [...new Set(items.filter((i) => i.productId).map((i) => i.productId!))];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, companyId: active.id } })
    : [];
  if (products.length !== productIds.length) {
    return { error: "One or more selected products could not be found" };
  }

  if (kind === "RETURN") {
    for (const item of items) {
      if (!item.productId) continue;
      const product = products.find((p) => p.id === item.productId)!;
      if (Number(product.currentStock) < Number(item.quantity)) {
        return {
          error: `Not enough stock of ${product.name} to return (available: ${Number(
            product.currentStock
          )} ${product.unit})`,
        };
      }
    }
  }

  const existing = await prisma.purchaseInvoice.findUnique({
    where: { companyId_invoiceNo: { companyId: active.id, invoiceNo } },
  });
  if (existing) {
    return { error: `Invoice number ${invoiceNo} is already used` };
  }

  const subtotal = items.reduce((sum, i) => sum + lineAmount(i), 0);
  const taxAmount = taxRate ? subtotal * (taxRate / 100) : 0;
  const totalAmount = subtotal + taxAmount;

  await prisma.$transaction(async (tx) => {
    await tx.purchaseInvoice.create({
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
          data: { currentStock: { decrement: qty } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: qty }, lastPurchaseRate: item.rate },
        });
      }
    }
  });

  await logActivity({
    companyId: active.id,
    action: "CREATE",
    entityType: kind === "RETURN" ? "PurchaseReturn" : "Purchase",
    summary: `${kind === "RETURN" ? "Purchase return" : "Purchase"} ${invoiceNo} (${party.name}, Rs ${totalAmount.toFixed(2)})`,
  });

  revalidatePath("/purchases");
  revalidatePath("/products");
  revalidatePath(`/parties/${partyId}`);
  redirect("/purchases");
}

export async function deletePurchase(formData: FormData) {
  const id = formData.get("id") as string;
  const { active } = await requireActiveCompany();

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, party: true },
  });
  if (!invoice || invoice.companyId !== active.id) redirect("/purchases");

  const stockItems = invoice.items.filter((i) => i.productId && i.product);

  if (invoice.kind === "NORMAL") {
    for (const item of stockItems) {
      if (Number(item.product!.currentStock) < Number(item.quantity)) {
        redirect(`/purchases/${id}?error=stock`);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of stockItems) {
      await tx.product.update({
        where: { id: item.productId! },
        data:
          invoice.kind === "RETURN"
            ? { currentStock: { increment: item.quantity! } }
            : { currentStock: { decrement: item.quantity! } },
      });
    }
    await tx.purchaseInvoice.delete({ where: { id } });
  });

  await logActivity({
    companyId: active.id,
    action: "DELETE",
    entityType: invoice.kind === "RETURN" ? "PurchaseReturn" : "Purchase",
    summary: `${invoice.kind === "RETURN" ? "Purchase return" : "Purchase"} ${invoice.invoiceNo} (${invoice.party.name}, Rs ${Number(invoice.totalAmount).toFixed(2)})`,
  });

  revalidatePath("/purchases");
  revalidatePath("/products");
  revalidatePath(`/parties/${invoice.partyId}`);
  redirect("/purchases");
}
