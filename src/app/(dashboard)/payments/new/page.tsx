import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PaymentForm } from "@/components/PaymentForm";
import { createPayment } from "../actions";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ partyId?: string }>;
}) {
  const { partyId } = await searchParams;

  const parties = await prisma.party.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });

  return (
    <>
      <PageHeader title="Record Payment" subtitle="Log a payment made or received" />
      <div className="ledger-sheet max-w-2xl rounded-md p-6 pl-14">
        <PaymentForm parties={parties} defaultPartyId={partyId} action={createPayment} />
      </div>
    </>
  );
}
