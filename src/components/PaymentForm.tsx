"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui";
import type { FormState } from "@/app/(dashboard)/payments/actions";

type Party = { id: string; name: string; type: "SUPPLIER" | "CUSTOMER" };

export function PaymentForm({
  parties,
  defaultPartyId,
  action,
}: {
  parties: Party[];
  defaultPartyId?: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const defaultParty = parties.find((p) => p.id === defaultPartyId);
  const [direction, setDirection] = useState<"IN" | "OUT">(
    defaultParty?.type === "CUSTOMER" ? "IN" : "OUT"
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="partyId">
            Account
          </label>
          <select
            id="partyId"
            name="partyId"
            required
            defaultValue={defaultPartyId ?? ""}
            onChange={(e) => {
              const party = parties.find((p) => p.id === e.target.value);
              if (party) setDirection(party.type === "CUSTOMER" ? "IN" : "OUT");
            }}
            className={inputClass}
          >
            <option value="" disabled>
              Select account…
            </option>
            <optgroup label="Suppliers">
              {parties
                .filter((p) => p.type === "SUPPLIER")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Customers">
              {parties
                .filter((p) => p.type === "CUSTOMER")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Direction</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="direction"
                value="OUT"
                checked={direction === "OUT"}
                onChange={() => setDirection("OUT")}
                className="accent-forest"
              />
              Payment Made (to supplier)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="direction"
                value="IN"
                checked={direction === "IN"}
                onChange={() => setDirection("IN")}
                className="accent-forest"
              />
              Payment Received (from customer)
            </label>
          </div>
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
          <label className={labelClass} htmlFor="amount">
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className={`${inputClass} tabular`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="method">
            Method
          </label>
          <select id="method" name="method" defaultValue="Cash" className={inputClass}>
            <option>Cash</option>
            <option>Bank Transfer</option>
            <option>Cheque</option>
            <option>Online</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="reference">
            Reference No.
          </label>
          <input id="reference" name="reference" className={inputClass} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} className={inputClass} />
        </div>
      </div>

      {state.error && (
        <p className="rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Record Payment"}
        </button>
        <Link href="/payments" className={btnSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
