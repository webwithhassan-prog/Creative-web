import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PaymentForm } from "@/components/PaymentForm";
import { requireActiveCompany } from "@/lib/company";
import { updatePayment } from "../../actions";

export default async function EditPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { active } = await requireActiveCompany();

  const [payment, parties] = await Promise.all([
    prisma.payment.findUnique({ where: { id } }),
    prisma.party.findMany({
      where: { companyId: active.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);
  if (!payment || payment.companyId !== active.id) notFound();

  const boundUpdate = updatePayment.bind(null, id);

  return (
    <>
      <PageHeader title="Edit Payment" subtitle="Update this payment's details" />
      <div className="ledger-sheet max-w-2xl rounded-md p-6 pl-6">
        <PaymentForm
          parties={parties}
          action={boundUpdate}
          submitLabel="Save Changes"
          defaults={{
            partyId: payment.partyId,
            direction: payment.direction,
            date: payment.date.toISOString().slice(0, 10),
            amount: Number(payment.amount),
            method: payment.method,
            reference: payment.reference,
            notes: payment.notes,
          }}
        />
      </div>
    </>
  );
}
