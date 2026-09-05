"use client";

import { useActionState } from "react";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui";
import type { FormState } from "@/app/(dashboard)/parties/actions";
import Link from "next/link";

type Defaults = {
  name?: string;
  type?: "SUPPLIER" | "CUSTOMER";
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  openingBalance?: number;
  openingBalanceSide?: "DEBIT" | "CREDIT";
  openingBalanceDate?: string;
  notes?: string | null;
};

export function PartyForm({
  action,
  defaults,
  submitLabel,
  lockType,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Defaults;
  submitLabel: string;
  lockType?: "SUPPLIER" | "CUSTOMER";
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Account Type</label>
          <div className="flex gap-4">
            {(["SUPPLIER", "CUSTOMER"] as const).map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  defaultChecked={(defaults?.type ?? lockType) === t}
                  required
                  className="accent-forest"
                />
                {t === "SUPPLIER" ? "Supplier" : "Customer"}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults?.name}
            className={inputClass}
            placeholder="e.g. Al-Karam Textiles"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={defaults?.phone ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults?.email ?? ""}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="address">
            Address
          </label>
          <input
            id="address"
            name="address"
            defaultValue={defaults?.address ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="openingBalance">
            Opening Balance
          </label>
          <input
            id="openingBalance"
            name="openingBalance"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults?.openingBalance ?? 0}
            className={`${inputClass} tabular`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="openingBalanceSide">
            Opening Balance Side
          </label>
          <select
            id="openingBalanceSide"
            name="openingBalanceSide"
            defaultValue={defaults?.openingBalanceSide ?? "CREDIT"}
            className={inputClass}
          >
            <option value="DEBIT">Debit (they owe / receivable)</option>
            <option value="CREDIT">Credit (we owe / payable)</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="openingBalanceDate">
            Opening Balance As Of
          </label>
          <input
            id="openingBalanceDate"
            name="openingBalanceDate"
            type="date"
            required
            defaultValue={defaults?.openingBalanceDate ?? new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-soft">
            Backdate this to bring in a balance carried over from an earlier
            ledger (e.g. last year&apos;s closing balance).
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults?.notes ?? ""}
            className={inputClass}
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
        <Link href="/parties" className={btnSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
