import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { CompanyForm } from "@/components/CompanyForm";
import { updateCompany } from "../../actions";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) notFound();

  const boundUpdate = updateCompany.bind(null, id);

  return (
    <>
      <PageHeader title={`Edit ${company.name}`} subtitle="Update company details" />
      <div className="ledger-sheet max-w-xl rounded-md p-6 pl-6">
        <CompanyForm
          action={boundUpdate}
          submitLabel="Save Changes"
          cancelHref="/companies"
          defaults={{
            name: company.name,
            address: company.address,
            phone: company.phone,
            email: company.email,
          }}
        />
      </div>
    </>
  );
}
