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
  partyId: z.string().min(1, "Select a customer"),
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
  const count = await prisma.saleInvoice.count();
  return `SALE-${String(count + 1).padStart(4, "0")}`;
}

export async function getNextSaleInvoiceNo() {
  return nextInvoiceNumber();
}

export async function createSale(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readInvoice(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { partyId, date, notes, items } = parsed.data;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.type !== "CUSTOMER") {
    return { error: "Selected party is not a customer" };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  if (products.length !== new Set(items.map((i) => i.productId)).size) {
    return { error: "One or more selected products could not be found" };
  }

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)!;
    if (Number(product.currentStock) < item.quantity) {
      return {
        error: `Not enough stock for ${product.name} (available: ${Number(
          product.currentStock
        )} ${product.unit})`,
      };
    }
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.rate, 0);
  const invoiceNo = await nextInvoiceNumber();

  await prisma.$transaction(async (tx) => {
    await tx.saleInvoice.create({
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
          currentStock: { decrement: item.quantity },
          lastSaleRate: item.rate,
        },
      });
    }
  });

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath(`/parties/${partyId}`);
  redirect("/sales");
}

export async function deleteSale(formData: FormData) {
  const id = formData.get("id") as string;

  const invoice = await prisma.saleInvoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!invoice) redirect("/sales");

  await prisma.$transaction(async (tx) => {
    for (const item of invoice!.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      });
    }
    await tx.saleInvoice.delete({ where: { id } });
  });

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath(`/parties/${invoice!.partyId}`);
  redirect("/sales");
}
