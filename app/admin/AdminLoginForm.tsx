"use client";

import { useActionState } from "react";
import { loginAdmin, type AdminLoginState } from "@/app/admin/actions";

const initialState: AdminLoginState = { error: null };

export default function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  return (
    <main className="admin-locked-page">
      <section className="admin-locked-card" aria-labelledby="admin-login-title">
        <p className="admin-overline">Private area</p>
        <div className="admin-lock-mark" aria-hidden="true">✦</div>
        <h1 id="admin-login-title">Admin sign in</h1>
        <p>Sign in with your authorized Supabase account to manage wedding replies.</p>
        <form action={formAction} className="admin-auth-form">
          <label htmlFor="admin-email">Email address</label>
          <input
            autoComplete="username"
            autoFocus
            id="admin-email"
            name="email"
            required
            type="email"
          />
          <label htmlFor="admin-password">Password</label>
          <input
            autoComplete="current-password"
            id="admin-password"
            name="password"
            required
            type="password"
          />
          {state.error ? (
            <p className="admin-auth-error" role="alert">{state.error}</p>
          ) : null}
          <button disabled={pending} type="submit">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="admin-locked-card-note">
          Admin access is limited to accounts configured for this site.
        </p>
      </section>
    </main>
  );
}
