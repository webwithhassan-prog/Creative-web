"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveCompany } from "@/lib/company";
import { logActivity } from "@/lib/audit";

export type FormState = { error?: string };

const paymentSchema = z.object({
  partyId: z.string().min(1, "Select an account"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  direction: z.enum(["IN", "OUT"]),
  method: z.string().min(1, "Method is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function createPayment(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = paymentSchema.safeParse({
    partyId: formData.get("partyId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    direction: formData.get("direction"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { active } = await requireActiveCompany();
  const { partyId, date, amount, direction, method, reference, notes } = parsed.data;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.companyId !== active.id) {
    return { error: "Selected account could not be found" };
  }

  await prisma.payment.create({
    data: {
      companyId: active.id,
      partyId,
      date: new Date(date),
      amount,
      direction,
      method,
      reference,
      notes,
    },
  });

  await logActivity({
    companyId: active.id,
    action: "CREATE",
    entityType: "Payment",
    summary: `Payment ${direction === "OUT" ? "made to" : "received from"} ${party.name} (Rs ${amount.toFixed(2)}, ${method})`,
  });

  revalidatePath("/payments");
  revalidatePath(`/parties/${partyId}`);
  redirect("/payments");
}

export async function updatePayment(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = paymentSchema.safeParse({
    partyId: formData.get("partyId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    direction: formData.get("direction"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { active } = await requireActiveCompany();
  const { partyId, date, amount, direction, method, reference, notes } = parsed.data;

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing || existing.companyId !== active.id) {
    return { error: "Payment not found" };
  }

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.companyId !== active.id) {
    return { error: "Selected account could not be found" };
  }

  await prisma.payment.update({
    where: { id },
    data: { partyId, date: new Date(date), amount, direction, method, reference, notes },
  });

  await logActivity({
    companyId: active.id,
    action: "UPDATE",
    entityType: "Payment",
    summary: `Payment ${direction === "OUT" ? "made to" : "received from"} ${party.name} edited (Rs ${amount.toFixed(2)}, ${method})`,
  });

  revalidatePath("/payments");
  revalidatePath(`/parties/${partyId}`);
  if (existing.partyId !== partyId) revalidatePath(`/parties/${existing.partyId}`);
  redirect("/payments");
}

export async function deletePayment(formData: FormData) {
  const id = formData.get("id") as string;
  const { active } = await requireActiveCompany();

  const payment = await prisma.payment.findUnique({ where: { id }, include: { party: true } });
  if (!payment || payment.companyId !== active.id) redirect("/payments");

  await prisma.payment.delete({ where: { id } });

  await logActivity({
    companyId: active.id,
    action: "DELETE",
    entityType: "Payment",
    summary: `Payment ${payment.direction === "OUT" ? "made to" : "received from"} ${payment.party.name} (Rs ${Number(payment.amount).toFixed(2)}, ${payment.method})`,
  });

  revalidatePath("/payments");
  revalidatePath(`/parties/${payment.partyId}`);
  redirect("/payments");
}
