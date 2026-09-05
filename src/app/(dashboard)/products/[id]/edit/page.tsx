import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ProductForm } from "@/components/ProductForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { updateProduct, deleteProduct } from "../../actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const boundUpdate = updateProduct.bind(null, id);

  return (
    <>
      <PageHeader title={`Edit ${product.name}`} subtitle="Update product details" />
      <div className="ledger-sheet max-w-xl rounded-md p-6 pl-14">
        <ProductForm
          action={boundUpdate}
          submitLabel="Save Changes"
          defaults={{
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            currentStock: Number(product.currentStock),
            reorderLevel: Number(product.reorderLevel),
          }}
        />
      </div>

      <div className="mt-6 max-w-xl">
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={product.id} />
          <ConfirmSubmitButton
            confirmMessage={`Delete ${product.name}? This cannot be undone.`}
          >
            Delete Product
          </ConfirmSubmitButton>
        </form>
      </div>
    </>
  );
}
