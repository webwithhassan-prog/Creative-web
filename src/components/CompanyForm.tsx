"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui";
import type { FormState } from "@/app/(dashboard)/companies/actions";

type Defaults = {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
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
  const [logoPreview, setLogoPreview] = useState<string | null>(defaults?.logo ?? null);
  const [removeLogo, setRemoveLogo] = useState(false);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-5">
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

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="logo">
            Company Logo
          </label>
          {logoPreview && !removeLogo && (
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreview}
                alt="Current logo"
                className="h-16 w-16 rounded-sm border border-rule-strong object-contain p-1"
              />
              <button
                type="button"
                onClick={() => setRemoveLogo(true)}
                className="text-xs font-semibold text-maroon hover:underline"
              >
                Remove logo
              </button>
            </div>
          )}
          {removeLogo && (
            <input type="hidden" name="removeLogo" value="1" />
          )}
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setRemoveLogo(false);
              const reader = new FileReader();
              reader.onload = () => setLogoPreview(reader.result as string);
              reader.readAsDataURL(file);
            }}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-soft">
            Shown on printed invoices and statements. PNG, JPEG, WebP or SVG, up to 1.5MB.
          </p>
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
