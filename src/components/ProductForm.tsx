"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui";
import type { FormState } from "@/app/(dashboard)/products/actions";

type Defaults = {
  name?: string;
  sku?: string | null;
  unit?: string;
  currentStock?: number;
  reorderLevel?: number;
};

export function ProductForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="name">
            Product Name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults?.name}
            className={inputClass}
            placeholder="e.g. Reactive Red Dye"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="sku">
            SKU / Code
          </label>
          <input
            id="sku"
            name="sku"
            defaultValue={defaults?.sku ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="unit">
            Unit
          </label>
          <input
            id="unit"
            name="unit"
            required
            defaultValue={defaults?.unit ?? "kg"}
            className={inputClass}
            placeholder="kg, litre, bag…"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="currentStock">
            Current Stock
          </label>
          <input
            id="currentStock"
            name="currentStock"
            type="number"
            step="0.001"
            defaultValue={defaults?.currentStock ?? 0}
            className={`${inputClass} tabular`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="reorderLevel">
            Reorder Level
          </label>
          <input
            id="reorderLevel"
            name="reorderLevel"
            type="number"
            step="0.001"
            min="0"
            defaultValue={defaults?.reorderLevel ?? 0}
            className={`${inputClass} tabular`}
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/products" className={btnSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
