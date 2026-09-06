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

const partySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["SUPPLIER", "CUSTOMER"]),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  openingBalance: z.coerce.number().min(0).default(0),
  openingBalanceSide: z.enum(["DEBIT", "CREDIT"]),
  openingBalanceDate: z.coerce.date(),
  notes: z.string().optional(),
});

function readParty(formData: FormData) {
  return partySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    gstin: formData.get("gstin") || undefined,
    openingBalance: formData.get("openingBalance") || 0,
    openingBalanceSide: formData.get("openingBalanceSide"),
    openingBalanceDate: formData.get("openingBalanceDate") || new Date().toISOString().slice(0, 10),
    notes: formData.get("notes") || undefined,
  });
}

export async function createParty(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readParty(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { active } = await requireActiveCompany();
  const party = await prisma.party.create({
    data: { ...parsed.data, companyId: active.id },
  });

  await logActivity({
    companyId: active.id,
    action: "CREATE",
    entityType: "Party",
    summary: `${party.type === "SUPPLIER" ? "Supplier" : "Customer"} account created: ${party.name}`,
  });

  revalidatePath("/parties");
  redirect(`/parties/${party.id}`);
}

export async function updateParty(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = readParty(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { active } = await requireActiveCompany();
  const result = await prisma.party.updateMany({
    where: { id, companyId: active.id },
    data: parsed.data,
  });
  if (result.count === 0) return { error: "Account not found" };

  await logActivity({
    companyId: active.id,
    action: "UPDATE",
    entityType: "Party",
    summary: `Account updated: ${parsed.data.name}`,
  });

  revalidatePath("/parties");
  revalidatePath(`/parties/${id}`);
  redirect(`/parties/${id}`);
}

export async function deleteParty(formData: FormData) {
  const id = formData.get("id") as string;
  const { active } = await requireActiveCompany();

  const [party, purchases, sales, payments] = await Promise.all([
    prisma.party.findUnique({ where: { id } }),
    prisma.purchaseInvoice.count({ where: { partyId: id } }),
    prisma.saleInvoice.count({ where: { partyId: id } }),
    prisma.payment.count({ where: { partyId: id } }),
  ]);

  if (purchases + sales + payments > 0) {
    redirect(`/parties/${id}?error=has-history`);
  }

  await prisma.party.deleteMany({ where: { id, companyId: active.id } });

  if (party) {
    await logActivity({
      companyId: active.id,
      action: "DELETE",
      entityType: "Party",
      summary: `Account deleted: ${party.name}`,
    });
  }

  revalidatePath("/parties");
  redirect("/parties");
}

export async function importParties(
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
  const toCreate: Prisma.PartyCreateManyInput[] = [];

  rows.forEach((row, idx) => {
    const lineNo = idx + 2;
    const name = row["Name"]?.trim();
    if (!name) {
      errors.push(`Row ${lineNo}: Name is required`);
      return;
    }
    const typeRaw = (row["Type"] || "").trim().toUpperCase();
    if (typeRaw !== "SUPPLIER" && typeRaw !== "CUSTOMER") {
      errors.push(`Row ${lineNo}: Type must be SUPPLIER or CUSTOMER`);
      return;
    }

    const openingBalance = Number(row["Opening Balance"]) || 0;
    const sideRaw = (row["Opening Balance Side"] || "CREDIT").trim().toUpperCase();
    const openingBalanceSide = sideRaw === "DEBIT" ? "DEBIT" : "CREDIT";
    const dateRaw = row["Opening Balance Date"]?.trim();
    const openingBalanceDate = dateRaw ? new Date(dateRaw) : new Date();
    if (Number.isNaN(openingBalanceDate.getTime())) {
      errors.push(`Row ${lineNo}: Opening Balance Date is not a valid date`);
      return;
    }

    toCreate.push({
      companyId: active.id,
      name,
      type: typeRaw,
      phone: row["Phone"] || undefined,
      email: row["Email"] || undefined,
      address: row["Address"] || undefined,
      gstin: row["GSTIN"] || undefined,
      openingBalance,
      openingBalanceSide,
      openingBalanceDate,
      notes: row["Notes"] || undefined,
    });
  });

  if (toCreate.length > 0) {
    await prisma.party.createMany({ data: toCreate });
    await logActivity({
      companyId: active.id,
      action: "CREATE",
      entityType: "Party",
      summary: `Imported ${toCreate.length} account(s) from CSV`,
    });
    revalidatePath("/parties");
  }

  return { result: { created: toCreate.length, errors } };
}

export async function setPartyActive(id: string, isActive: boolean) {
  const { active } = await requireActiveCompany();
  await prisma.party.updateMany({
    where: { id, companyId: active.id },
    data: { isActive },
  });
  revalidatePath("/parties");
  revalidatePath(`/parties/${id}`);
}
