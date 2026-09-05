"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string };

const partySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["SUPPLIER", "CUSTOMER"]),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
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

  const party = await prisma.party.create({ data: parsed.data });
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

  await prisma.party.update({ where: { id }, data: parsed.data });
  revalidatePath("/parties");
  revalidatePath(`/parties/${id}`);
  redirect(`/parties/${id}`);
}

export async function deleteParty(formData: FormData) {
  const id = formData.get("id") as string;

  const [purchases, sales, payments] = await Promise.all([
    prisma.purchaseInvoice.count({ where: { partyId: id } }),
    prisma.saleInvoice.count({ where: { partyId: id } }),
    prisma.payment.count({ where: { partyId: id } }),
  ]);

  if (purchases + sales + payments > 0) {
    redirect(`/parties/${id}?error=has-history`);
  }

  await prisma.party.delete({ where: { id } });
  revalidatePath("/parties");
  redirect("/parties");
}

export async function setPartyActive(id: string, isActive: boolean) {
  await prisma.party.update({ where: { id }, data: { isActive } });
  revalidatePath("/parties");
  revalidatePath(`/parties/${id}`);
}
