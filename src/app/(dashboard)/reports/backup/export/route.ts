import { prisma } from "@/lib/prisma";
import { requireActiveCompany } from "@/lib/company";

export async function GET() {
  const { active } = await requireActiveCompany();

  const [company, parties, products, purchaseInvoices, saleInvoices, payments, auditLogs] = await Promise.all([
    prisma.company.findUnique({ where: { id: active.id } }),
    prisma.party.findMany({ where: { companyId: active.id }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { companyId: active.id }, orderBy: { name: "asc" } }),
    prisma.purchaseInvoice.findMany({
      where: { companyId: active.id },
      include: { items: true },
      orderBy: { date: "asc" },
    }),
    prisma.saleInvoice.findMany({
      where: { companyId: active.id },
      include: { items: true },
      orderBy: { date: "asc" },
    }),
    prisma.payment.findMany({ where: { companyId: active.id }, orderBy: { date: "asc" } }),
    prisma.auditLog.findMany({ where: { companyId: active.id }, orderBy: { createdAt: "asc" } }),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    company,
    parties,
    products,
    purchaseInvoices,
    saleInvoices,
    payments,
    auditLogs,
  };

  const json = JSON.stringify(backup, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeName = active.name.replace(/[^a-z0-9-]+/gi, "-");

  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-${safeName}-${dateStr}.json"`,
    },
  });
}
