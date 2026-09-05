"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { setActiveCompanyCookie } from "@/lib/company";

export type FormState = { error?: string };

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

function readCompany(formData: FormData) {
  return companySchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });
}

export async function createCompany(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readCompany(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const company = await prisma.company.create({ data: parsed.data });
  await setActiveCompanyCookie(company.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateCompany(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readCompany(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.company.update({ where: { id }, data: parsed.data });
  revalidatePath("/", "layout");
  redirect("/companies");
}

export async function switchCompany(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  await setActiveCompanyCookie(companyId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteCompany(formData: FormData) {
  const id = formData.get("id") as string;

  const [parties, products, purchases, sales, payments] = await Promise.all([
    prisma.party.count({ where: { companyId: id } }),
    prisma.product.count({ where: { companyId: id } }),
    prisma.purchaseInvoice.count({ where: { companyId: id } }),
    prisma.saleInvoice.count({ where: { companyId: id } }),
    prisma.payment.count({ where: { companyId: id } }),
  ]);

  if (parties + products + purchases + sales + payments > 0) {
    redirect("/companies?error=has-history");
  }

  await prisma.company.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/companies");
}
