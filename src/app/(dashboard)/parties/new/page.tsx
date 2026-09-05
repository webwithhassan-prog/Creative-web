import { PageHeader } from "@/components/PageHeader";
import { PartyForm } from "@/components/PartyForm";
import { createParty } from "../actions";
import type { PartyType } from "@prisma/client";

export default async function NewPartyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const lockType: PartyType = type === "CUSTOMER" ? "CUSTOMER" : "SUPPLIER";

  return (
    <>
      <PageHeader
        title={`Add ${lockType === "SUPPLIER" ? "Supplier" : "Customer"}`}
        subtitle="Create a new ledger account"
      />
      <div className="ledger-sheet max-w-2xl rounded-md p-6 pl-6">
        <PartyForm action={createParty} submitLabel="Create Account" lockType={lockType} />
      </div>
    </>
  );
}
