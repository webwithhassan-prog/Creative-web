import { PageHeader } from "@/components/PageHeader";
import { CsvImportForm } from "@/components/CsvImportForm";
import { importParties } from "../actions";

const COLUMNS = [
  { name: "Name", required: true, description: "Account name, e.g. Beta Chemicals" },
  { name: "Type", required: true, description: "SUPPLIER or CUSTOMER" },
  { name: "Phone", required: false, description: "" },
  { name: "Email", required: false, description: "" },
  { name: "Address", required: false, description: "" },
  { name: "GSTIN", required: false, description: "Tax registration number" },
  { name: "Invoice Prefix", required: false, description: "Short code for auto-numbering, e.g. BC" },
  { name: "Opening Balance", required: false, description: "Number, defaults to 0" },
  { name: "Opening Balance Side", required: false, description: "DEBIT or CREDIT, defaults to CREDIT" },
  { name: "Opening Balance Date", required: false, description: "YYYY-MM-DD, defaults to today" },
  { name: "Notes", required: false, description: "" },
];

export default function ImportPartiesPage() {
  return (
    <>
      <PageHeader title="Import Suppliers & Customers" subtitle="Bulk-create accounts from a CSV file" />
      <CsvImportForm action={importParties} cancelHref="/parties" columns={COLUMNS} />
    </>
  );
}
