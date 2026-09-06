import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceForm } from "@/components/InvoiceForm";
import { requireActiveCompany } from "@/lib/company";
import { updateSale } from "../../actions";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { active } = await requireActiveCompany();

  const invoice = await prisma.saleInvoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!invoice || invoice.companyId !== active.id) notFound();

  const usedProductIds = invoice.items.filter((i) => i.productId).map((i) => i.productId!);

  const [customers, products] = await Promise.all([
    prisma.party.findMany({
      where: { companyId: active.id, type: "CUSTOMER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: {
        companyId: active.id,
        OR: [{ isActive: true }, { id: { in: usedProductIds } }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, lastSaleRate: true },
    }),
  ]);

  const boundUpdate = updateSale.bind(null, id);

  return (
    <>
      <PageHeader title={`Edit Sale ${invoice.invoiceNo}`} subtitle="Update this sale invoice" />
      <InvoiceForm
        mode="SALE"
        parties={customers}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          lastRate: p.lastSaleRate ? Number(p.lastSaleRate) : null,
        }))}
        invoiceNo={invoice.invoiceNo}
        defaultTaxRate={Number(active.defaultTaxRate)}
        action={boundUpdate}
        cancelHref={`/sales/${id}`}
        submitLabel="Save Changes"
        defaults={{
          invoiceNo: invoice.invoiceNo,
          date: invoice.date.toISOString().slice(0, 10),
          partyId: invoice.partyId,
          kind: invoice.kind,
          taxRate: invoice.taxRate !== null ? Number(invoice.taxRate) : null,
          notes: invoice.notes,
          items: invoice.items.map((i) => ({
            productId: i.productId,
            description: i.description,
            quantity: i.quantity !== null ? Number(i.quantity) : null,
            rate: i.rate !== null ? Number(i.rate) : null,
            amount: Number(i.amount),
          })),
        }}
      />
    </>
  );
}
