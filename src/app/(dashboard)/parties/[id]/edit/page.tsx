import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PartyForm } from "@/components/PartyForm";
import { requireActiveCompany } from "@/lib/company";
import { updateParty } from "../../actions";

export default async function EditPartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { active } = await requireActiveCompany();
  const party = await prisma.party.findUnique({ where: { id } });
  if (!party || party.companyId !== active.id) notFound();

  const boundUpdate = updateParty.bind(null, id);

  return (
    <>
      <PageHeader title={`Edit ${party.name}`} subtitle="Update account details" />
      <div className="ledger-sheet max-w-2xl rounded-md p-6 pl-6">
        <PartyForm
          action={boundUpdate}
          submitLabel="Save Changes"
          defaults={{
            name: party.name,
            type: party.type,
            phone: party.phone,
            email: party.email,
            address: party.address,
            gstin: party.gstin,
            openingBalance: Number(party.openingBalance),
            openingBalanceSide: party.openingBalanceSide,
            openingBalanceDate: party.openingBalanceDate.toISOString().slice(0, 10),
            notes: party.notes,
          }}
        />
      </div>
    </>
  );
}
