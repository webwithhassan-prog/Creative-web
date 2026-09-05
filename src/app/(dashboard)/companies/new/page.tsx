import { PageHeader } from "@/components/PageHeader";
import { CompanyForm } from "@/components/CompanyForm";
import { createCompany } from "../actions";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const { onboarding } = await searchParams;

  return (
    <>
      <PageHeader
        title={onboarding ? "Welcome — set up your first company" : "Add Company"}
        subtitle={
          onboarding
            ? "Every ledger, product, and transaction belongs to a company. Create one to get started."
            : "Create another company to manage a separate set of books"
        }
      />
      <div className="ledger-sheet max-w-xl rounded-md p-6 pl-6">
        <CompanyForm action={createCompany} submitLabel="Create Company" cancelHref="/" />
      </div>
    </>
  );
}
