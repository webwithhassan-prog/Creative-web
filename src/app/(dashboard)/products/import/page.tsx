import { PageHeader } from "@/components/PageHeader";
import { CsvImportForm } from "@/components/CsvImportForm";
import { importProducts } from "../actions";

const COLUMNS = [
  { name: "Name", required: true, description: "Product name" },
  { name: "SKU", required: false, description: "Must be unique within this company" },
  { name: "Unit", required: false, description: "e.g. kg, litre, box — defaults to kg" },
  { name: "Current Stock", required: false, description: "Number, defaults to 0" },
  { name: "Reorder Level", required: false, description: "Number, defaults to 0" },
];

export default function ImportProductsPage() {
  return (
    <>
      <PageHeader title="Import Inventory" subtitle="Bulk-create products from a CSV file" />
      <CsvImportForm action={importProducts} cancelHref="/products" columns={COLUMNS} />
    </>
  );
}
