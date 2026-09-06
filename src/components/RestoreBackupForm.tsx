"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui";
import type { ImportState } from "@/components/CsvImportForm";

export function RestoreBackupForm({
  action,
}: {
  action: (state: ImportState, formData: FormData) => Promise<ImportState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="space-y-6">
      <div className="ledger-sheet rounded-md p-6 pl-6">
        <h2 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-ink-soft">
          How this works
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>
            Restoring always creates a brand-new company named &ldquo;[Original name] (Restored)&rdquo; —
            it never touches or overwrites any company you already have.
          </li>
          <li>Every account, product, purchase, sale invoice and payment from the file is recreated under that new company.</li>
          <li>Large backups can take a little while — don&apos;t close this tab while it&apos;s running.</li>
        </ul>
      </div>

      <form action={formAction} className="ledger-sheet space-y-4 rounded-md p-6 pl-6">
        <div>
          <label className={labelClass} htmlFor="file">
            Backup JSON File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".json,application/json"
            required
            className={inputClass}
          />
        </div>

        {state.error && (
          <p className="rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
            {state.error}
          </p>
        )}

        {state.result && (
          <div className="rounded-sm border border-forest/30 bg-forest/5 px-3 py-2 text-sm text-forest">
            Restored {state.result.created} record{state.result.created === 1 ? "" : "s"} into a new
            company. Switch to it from the company menu in the sidebar.
            {state.result.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-maroon">
                {state.result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Restoring…" : "Restore"}
          </button>
          <Link href="/reports" className={btnSecondary}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
