"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string };

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
});

const invoiceSchema = z.object({
  partyId: z.string().min(1, "Select a supplier"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

function readInvoice(formData: FormData) {
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    items = [];
  }

  return invoiceSchema.safeParse({
    partyId: formData.get("partyId"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
    items,
  });
}

async function nextInvoiceNumber() {
  const count = await prisma.purchaseInvoice.count();
  return `PUR-${String(count + 1).padStart(4, "0")}`;
}

export async function getNextPurchaseInvoiceNo() {
  return nextInvoiceNumber();
}

export async function createPurchase(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readInvoice(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { partyId, date, notes, items } = parsed.data;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.type !== "SUPPLIER") {
    return { error: "Selected party is not a supplier" };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  if (products.length !== new Set(items.map((i) => i.productId)).size) {
    return { error: "One or more selected products could not be found" };
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.rate, 0);
  const invoiceNo = await nextInvoiceNumber();

  await prisma.$transaction(async (tx) => {
    await tx.purchaseInvoice.create({
      data: {
        invoiceNo,
        date: new Date(date),
        partyId,
        totalAmount,
        notes,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            rate: i.rate,
            amount: i.quantity * i.rate,
          })),
        },
      },
    });

    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { increment: item.quantity },
          lastPurchaseRate: item.rate,
        },
      });
    }
  });

  revalidatePath("/purchases");
  revalidatePath("/products");
  revalidatePath(`/parties/${partyId}`);
  redirect("/purchases");
}

export async function deletePurchase(formData: FormData) {
  const id = formData.get("id") as string;

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!invoice) redirect("/purchases");

  for (const item of invoice.items) {
    if (Number(item.product.currentStock) < Number(item.quantity)) {
      redirect(`/purchases/${id}?error=stock`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of invoice.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
    }
    await tx.purchaseInvoice.delete({ where: { id } });
  });

  revalidatePath("/purchases");
  revalidatePath("/products");
  revalidatePath(`/parties/${invoice.partyId}`);
  redirect("/purchases");
}
