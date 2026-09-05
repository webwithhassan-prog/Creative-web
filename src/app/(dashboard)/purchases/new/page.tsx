import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceForm } from "@/components/InvoiceForm";
import { createPurchase, getNextPurchaseInvoiceNo } from "../actions";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ partyId?: string }>;
}) {
  const { partyId } = await searchParams;

  const [suppliers, products, invoiceNo] = await Promise.all([
    prisma.party.findMany({
      where: { type: "SUPPLIER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, lastPurchaseRate: true },
    }),
    getNextPurchaseInvoiceNo(),
  ]);

  return (
    <>
      <PageHeader title="New Purchase" subtitle="Record goods received from a supplier" />
      <InvoiceForm
        mode="PURCHASE"
        parties={suppliers}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          lastRate: p.lastPurchaseRate ? Number(p.lastPurchaseRate) : null,
        }))}
        defaultPartyId={partyId}
        invoiceNo={invoiceNo}
        action={createPurchase}
        cancelHref="/purchases"
      />
    </>
  );
}
