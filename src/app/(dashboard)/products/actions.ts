"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string };

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  currentStock: z.coerce.number().default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
});

function readProduct(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    unit: formData.get("unit"),
    currentStock: formData.get("currentStock") || 0,
    reorderLevel: formData.get("reorderLevel") || 0,
  });
}

export async function createProduct(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readProduct(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await prisma.product.create({ data: parsed.data });
  } catch {
    return { error: "A product with that SKU already exists." };
  }
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readProduct(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await prisma.product.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: "A product with that SKU already exists." };
  }
  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(formData: FormData) {
  const id = formData.get("id") as string;

  const [purchases, sales] = await Promise.all([
    prisma.purchaseItem.count({ where: { productId: id } }),
    prisma.saleItem.count({ where: { productId: id } }),
  ]);

  if (purchases + sales > 0) {
    redirect(`/products?error=has-history`);
  }

  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
  redirect("/products");
}
