import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceForm } from "@/components/InvoiceForm";
import { requireActiveCompany } from "@/lib/company";
import { updatePurchase } from "../../actions";

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { active } = await requireActiveCompany();

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!invoice || invoice.companyId !== active.id) notFound();

  const usedProductIds = invoice.items.filter((i) => i.productId).map((i) => i.productId!);

  const [suppliers, products] = await Promise.all([
    prisma.party.findMany({
      where: { companyId: active.id, type: "SUPPLIER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: {
        companyId: active.id,
        OR: [{ isActive: true }, { id: { in: usedProductIds } }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, lastPurchaseRate: true },
    }),
  ]);

  const boundUpdate = updatePurchase.bind(null, id);

  return (
    <>
      <PageHeader title={`Edit Purchase ${invoice.invoiceNo}`} subtitle="Update this purchase invoice" />
      <InvoiceForm
        mode="PURCHASE"
        parties={suppliers}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          lastRate: p.lastPurchaseRate ? Number(p.lastPurchaseRate) : null,
        }))}
        invoiceNo={invoice.invoiceNo}
        defaultTaxRate={Number(active.defaultTaxRate)}
        action={boundUpdate}
        cancelHref={`/purchases/${id}`}
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
