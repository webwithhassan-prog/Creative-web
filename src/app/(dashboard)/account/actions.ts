"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const session = await getSession();
  if (!session) return { error: "Your session has expired. Please sign in again." };

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin) return { error: "Account not found" };

  const valid = await verifyPassword(parsed.data.currentPassword, admin.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });

  return { success: "Password updated successfully" };
}
