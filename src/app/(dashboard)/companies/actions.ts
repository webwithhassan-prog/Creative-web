"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { setActiveCompanyCookie } from "@/lib/company";

export type FormState = { error?: string };

const MAX_LOGO_BYTES = 1.5 * 1024 * 1024; // 1.5MB
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notifyEmail: z.string().optional(),
});

function readCompany(formData: FormData) {
  return companySchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notifyEmail: formData.get("notifyEmail") || undefined,
  });
}

/** Returns a data-URL string to save, `null` to clear the logo, or `undefined` to leave it untouched. */
async function readLogo(formData: FormData): Promise<
  { value: string | null | undefined } | { error: string }
> {
  if (formData.get("removeLogo") === "1") {
    return { value: null };
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { value: undefined };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Logo must be smaller than 1.5MB" };
  }
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { error: "Logo must be a PNG, JPEG, WebP or SVG image" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { value: `data:${file.type};base64,${buffer.toString("base64")}` };
}

export async function createCompany(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readCompany(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const logo = await readLogo(formData);
  if ("error" in logo) return { error: logo.error };

  const company = await prisma.company.create({
    data: { ...parsed.data, logo: logo.value ?? undefined },
  });
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

  const logo = await readLogo(formData);
  if ("error" in logo) return { error: logo.error };

  await prisma.company.update({
    where: { id },
    data: { ...parsed.data, ...(logo.value !== undefined ? { logo: logo.value } : {}) },
  });
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
