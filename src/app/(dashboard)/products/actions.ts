"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveCompany } from "@/lib/company";
import { logActivity } from "@/lib/audit";
import { parseCsvWithHeader } from "@/lib/csv";
import type { ImportState } from "@/components/CsvImportForm";
import type { Prisma } from "@prisma/client";

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

  const { active } = await requireActiveCompany();
  try {
    await prisma.product.create({ data: { ...parsed.data, companyId: active.id } });
  } catch {
    return { error: "A product with that SKU already exists." };
  }

  await logActivity({
    companyId: active.id,
    action: "CREATE",
    entityType: "Product",
    summary: `Product created: ${parsed.data.name}`,
  });

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

  const { active } = await requireActiveCompany();
  try {
    const result = await prisma.product.updateMany({
      where: { id, companyId: active.id },
      data: parsed.data,
    });
    if (result.count === 0) return { error: "Product not found" };
  } catch {
    return { error: "A product with that SKU already exists." };
  }

  await logActivity({
    companyId: active.id,
    action: "UPDATE",
    entityType: "Product",
    summary: `Product updated: ${parsed.data.name}`,
  });

  revalidatePath("/products");
  redirect("/products");
}

export async function importProducts(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import" };
  }

  const { active } = await requireActiveCompany();
  const text = await file.text();
  const { rows } = parseCsvWithHeader(text);
  if (rows.length === 0) return { error: "No data rows found in that file" };

  const errors: string[] = [];
  const toCreate: Prisma.ProductCreateManyInput[] = [];

  rows.forEach((row, idx) => {
    const lineNo = idx + 2;
    const name = row["Name"]?.trim();
    if (!name) {
      errors.push(`Row ${lineNo}: Name is required`);
      return;
    }
    const currentStock = Number(row["Current Stock"]) || 0;
    const reorderLevel = Number(row["Reorder Level"]) || 0;

    toCreate.push({
      companyId: active.id,
      name,
      sku: row["SKU"] || undefined,
      unit: row["Unit"]?.trim() || "kg",
      currentStock,
      reorderLevel,
    });
  });

  let created = 0;
  for (const data of toCreate) {
    try {
      await prisma.product.create({ data });
      created++;
    } catch {
      errors.push(`"${data.name}": a product with that SKU already exists`);
    }
  }

  if (created > 0) {
    await logActivity({
      companyId: active.id,
      action: "CREATE",
      entityType: "Product",
      summary: `Imported ${created} product(s) from CSV`,
    });
    revalidatePath("/products");
  }

  return { result: { created, errors } };
}

export async function deleteProduct(formData: FormData) {
  const id = formData.get("id") as string;
  const { active } = await requireActiveCompany();

  const [product, purchases, sales] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.purchaseItem.count({ where: { productId: id } }),
    prisma.saleItem.count({ where: { productId: id } }),
  ]);

  if (purchases + sales > 0) {
    redirect(`/products?error=has-history`);
  }

  await prisma.product.deleteMany({ where: { id, companyId: active.id } });

  if (product) {
    await logActivity({
      companyId: active.id,
      action: "DELETE",
      entityType: "Product",
      summary: `Product deleted: ${product.name}`,
    });
  }

  revalidatePath("/products");
  redirect("/products");
}
