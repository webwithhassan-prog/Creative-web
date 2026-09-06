import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { AuditAction } from "@prisma/client";

/**
 * Records who did what. Never throws — a logging failure should not break
 * the mutation it's describing.
 */
export async function logActivity(params: {
  companyId: string;
  action: AuditAction;
  entityType: string;
  summary: string;
}) {
  try {
    const session = await getSession();
    await prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        actorEmail: session?.email ?? "unknown",
        actorName: session?.name ?? "Unknown",
        action: params.action,
        entityType: params.entityType,
        summary: params.summary,
      },
    });
  } catch (err) {
    console.error("Failed to record audit log entry", err);
  }
}
