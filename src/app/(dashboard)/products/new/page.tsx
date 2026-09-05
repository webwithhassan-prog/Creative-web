import { PageHeader } from "@/components/PageHeader";
import { ProductForm } from "@/components/ProductForm";
import { createProduct } from "../actions";

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="Add Product" subtitle="Add a new item to inventory" />
      <div className="ledger-sheet max-w-xl rounded-md p-6 pl-14">
        <ProductForm action={createProduct} submitLabel="Create Product" />
      </div>
    </>
  );
}
