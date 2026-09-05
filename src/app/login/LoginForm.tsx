"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="from" value={from ?? ""} />

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-widest text-forest-light"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="username"
          className="mt-1.5 w-full rounded-sm border border-rule-strong bg-paper px-3 py-2.5 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
          placeholder="admin@creativedyes.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-semibold uppercase tracking-widest text-forest-light"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-sm border border-rule-strong bg-paper px-3 py-2.5 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="rounded-sm border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-sm bg-forest px-4 py-2.5 font-semibold text-paper transition hover:bg-forest-dark disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
