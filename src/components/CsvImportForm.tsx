"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/lib/ui";

export type ImportState = { error?: string; result?: { created: number; errors: string[] } };
type Column = { name: string; required: boolean; description: string };

export function CsvImportForm({
  action,
  cancelHref,
  columns,
}: {
  action: (state: ImportState, formData: FormData) => Promise<ImportState>;
  cancelHref: string;
  columns: Column[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="space-y-6">
      <div className="ledger-sheet rounded-md p-6 pl-6">
        <h2 className="mb-3 font-serif text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Expected columns
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="pb-2 pr-4">Column</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {columns.map((c) => (
                <tr key={c.name}>
                  <td className="whitespace-nowrap py-1.5 pr-4 font-medium text-ink">
                    {c.name}
                    {c.required && <span className="ml-1 text-maroon">*</span>}
                  </td>
                  <td className="py-1.5 text-ink-soft">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          First row must be a header with these exact column names (any order, extra columns ignored). * = required.
        </p>
      </div>

      <form action={formAction} className="ledger-sheet space-y-4 rounded-md p-6 pl-6">
        <div>
          <label className={labelClass} htmlFor="file">
            CSV File
          </label>
          <input id="file" name="file" type="file" accept=".csv,text/csv" required className={inputClass} />
        </div>

        {state.error && (
          <p className="rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
            {state.error}
          </p>
        )}

        {state.result && (
          <div className="rounded-sm border border-forest/30 bg-forest/5 px-3 py-2 text-sm text-forest">
            Imported {state.result.created} row{state.result.created === 1 ? "" : "s"}.
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
            {pending ? "Importing…" : "Import"}
          </button>
          <Link href={cancelHref} className={btnSecondary}>
            Done
          </Link>
        </div>
      </form>
    </div>
  );
}
