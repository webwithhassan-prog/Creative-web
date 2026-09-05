"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

  const { partyId, date, amount, direction, method, reference, notes } = parsed.data;

  await prisma.payment.create({
    data: {
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
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) redirect("/payments");

  await prisma.payment.delete({ where: { id } });
  revalidatePath("/payments");
  revalidatePath(`/parties/${payment!.partyId}`);
  redirect("/payments");
}
