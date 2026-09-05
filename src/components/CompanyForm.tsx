"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui";
import type { FormState } from "@/app/(dashboard)/companies/actions";

type Defaults = {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function CompanyForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Defaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="name">
            Company Name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults?.name}
            className={inputClass}
            placeholder="e.g. Creative Dyes and Chemicals"
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
        <Link href={cancelHref} className={btnSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
