"use client";

import { useActionState } from "react";
import { inputClass, labelClass, btnPrimary } from "@/lib/ui";
import { changePassword, type FormState } from "@/app/(dashboard)/account/actions";

const initialState: FormState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="space-y-5" key={state.success ? "done" : "form"}>
      <div>
        <label className={labelClass} htmlFor="currentPassword">
          Current Password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="newPassword">
          New Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="confirmPassword">
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-sm border border-forest/30 bg-forest/5 px-3 py-2 text-sm text-forest">
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
