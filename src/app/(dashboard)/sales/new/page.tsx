import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceForm } from "@/components/InvoiceForm";
import { requireActiveCompany } from "@/lib/company";
import { createSale, getNextSaleInvoiceNo } from "../actions";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ partyId?: string }>;
}) {
  const { partyId } = await searchParams;
  const { active } = await requireActiveCompany();

  const [customers, products, invoiceNo] = await Promise.all([
    prisma.party.findMany({
      where: { companyId: active.id, type: "CUSTOMER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { companyId: active.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, lastSaleRate: true },
    }),
    getNextSaleInvoiceNo(),
  ]);

  return (
    <>
      <PageHeader title="New Sale" subtitle="Record goods sold to a customer" />
      <InvoiceForm
        mode="SALE"
        parties={customers}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          lastRate: p.lastSaleRate ? Number(p.lastSaleRate) : null,
        }))}
        defaultPartyId={partyId}
        invoiceNo={invoiceNo}
        defaultTaxRate={Number(active.defaultTaxRate)}
        action={createSale}
        cancelHref="/sales"
      />
    </>
  );
}
