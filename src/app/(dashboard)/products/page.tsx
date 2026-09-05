import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { formatQty, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimary } from "@/lib/ui";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Products, current stock and reorder levels"
        action={
          <Link href="/products/new" className={btnPrimary}>
            <Plus size={16} /> Add Product
          </Link>
        }
      />

      {error === "has-history" && (
        <p className="mb-5 rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          This product has purchase or sale entries and cannot be deleted.
        </p>
      )}

      <div className="ledger-sheet overflow-hidden rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="py-3 pl-14 pr-4">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Reorder Level</th>
              <th className="px-4 py-3 text-right">Last Purchase Rate</th>
              <th className="px-4 py-3 text-right">Last Sale Rate</th>
              <th className="px-4 py-3 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const low = Number(p.currentStock) <= Number(p.reorderLevel);
                return (
                  <tr key={p.id} className="transition hover:bg-paper-alt/50">
                    <td className="py-3 pl-14 pr-4 font-medium text-ink">{p.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{p.sku || "—"}</td>
                    <td
                      className={clsx(
                        "tabular px-4 py-3 text-right font-semibold",
                        low ? "text-maroon" : "text-ink"
                      )}
                    >
                      {formatQty(p.currentStock)} {p.unit}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink-soft">
                      {formatQty(p.reorderLevel)} {p.unit}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink-soft">
                      {p.lastPurchaseRate ? formatMoney(p.lastPurchaseRate) : "—"}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink-soft">
                      {p.lastSaleRate ? formatMoney(p.lastSaleRate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/products/${p.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                      >
                        <Pencil size={12} /> Edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
