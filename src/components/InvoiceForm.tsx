"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui";
import { formatMoney } from "@/lib/format";

type Party = { id: string; name: string };
type Product = { id: string; name: string; unit: string; lastRate: number | null };
type FormState = { error?: string };
type Row = { key: number; productId: string; quantity: string; rate: string };

let rowKey = 0;
const emptyRow = (): Row => ({ key: rowKey++, productId: "", quantity: "", rate: "" });

export function InvoiceForm({
  mode,
  parties,
  products,
  defaultPartyId,
  invoiceNo,
  action,
  cancelHref,
}: {
  mode: "PURCHASE" | "SALE";
  parties: Party[];
  products: Product[];
  defaultPartyId?: string;
  invoiceNo: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.productId && !r.rate) {
          const product = productMap.get(patch.productId);
          if (product?.lastRate) next.rate = String(product.lastRate);
        }
        return next;
      })
    );
  }

  const total = rows.reduce((sum, r) => {
    const q = Number(r.quantity) || 0;
    const rate = Number(r.rate) || 0;
    return sum + q * rate;
  }, 0);

  const itemsJson = JSON.stringify(
    rows
      .filter((r) => r.productId && r.quantity)
      .map((r) => ({
        productId: r.productId,
        quantity: Number(r.quantity),
        rate: Number(r.rate) || 0,
      }))
  );

  const partyLabel = mode === "PURCHASE" ? "Supplier" : "Customer";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="items" value={itemsJson} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Invoice No.</label>
          <input value={invoiceNo} disabled className={`${inputClass} tabular bg-paper-alt`} />
        </div>
        <div>
          <label className={labelClass} htmlFor="date">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="partyId">
            {partyLabel}
          </label>
          <select
            id="partyId"
            name="partyId"
            required
            defaultValue={defaultPartyId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select {partyLabel.toLowerCase()}…
            </option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ledger-sheet rounded-md">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="py-3 pl-6 pr-4">Product</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((row) => {
              const product = productMap.get(row.productId);
              const amount = (Number(row.quantity) || 0) * (Number(row.rate) || 0);
              return (
                <tr key={row.key}>
                  <td className="py-2 pl-6 pr-4">
                    <select
                      value={row.productId}
                      onChange={(e) => updateRow(row.key, { productId: e.target.value })}
                      required
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select product…
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      required
                      className={`${inputClass} tabular text-right`}
                    />
                  </td>
                  <td className="px-4 py-2 text-ink-soft">{product?.unit ?? "—"}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.rate}
                      onChange={(e) => updateRow(row.key, { rate: e.target.value })}
                      required
                      className={`${inputClass} tabular text-right`}
                    />
                  </td>
                  <td className="tabular px-4 py-2 text-right font-medium text-ink">
                    {formatMoney(amount)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setRows((prev) =>
                          prev.length > 1 ? prev.filter((r) => r.key !== row.key) : prev
                        )
                      }
                      className="text-ink-soft transition hover:text-maroon"
                      aria-label="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-rule-strong bg-paper-alt/70">
              <td colSpan={4} className="py-3 pl-6 pr-4 text-right font-semibold text-ink">
                Total
              </td>
              <td className="tabular px-4 py-3 text-right font-serif text-lg font-bold text-forest-dark">
                {formatMoney(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        </div>
        <div className="border-t border-rule-strong px-4 py-3">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
          >
            <Plus size={15} /> Add Row
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </div>

      {state.error && (
        <p className="rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : `Save ${mode === "PURCHASE" ? "Purchase" : "Sale"}`}
        </button>
        <Link href={cancelHref} className={btnSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
