"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveCompany } from "@/lib/company";

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

  revalidatePath("/payments");
  revalidatePath(`/parties/${partyId}`);
  redirect("/payments");
}

export async function deletePayment(formData: FormData) {
  const id = formData.get("id") as string;
  const { active } = await requireActiveCompany();

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.companyId !== active.id) redirect("/payments");

  await prisma.payment.delete({ where: { id } });
  revalidatePath("/payments");
  revalidatePath(`/parties/${payment.partyId}`);
  redirect("/payments");
}
