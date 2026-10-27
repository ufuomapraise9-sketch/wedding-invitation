import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/app/admin/AdminLoginForm";
import {
  AdminAuthenticationRequiredError,
  isAdminAuthConfigured,
  requireAdminAuthentication,
} from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin Sign In | Wedding Invitations",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  await connection();

  if (!isAdminAuthConfigured()) {
    return (
      <main className="admin-locked-page">
        <section className="admin-locked-card" aria-labelledby="admin-locked-title">
          <p className="admin-overline">Private area</p>
          <div className="admin-lock-mark" aria-hidden="true">✦</div>
          <h1 id="admin-locked-title">Admin sign in is not configured</h1>
          <p>Dashboard access remains locked until the Supabase auth settings are configured.</p>
          <p className="admin-locked-card-note">
            Set SUPABASE_URL, SUPABASE_ANON_KEY, and ADMIN_EMAILS on the server.
          </p>
        </section>
      </main>
    );
  }

  try {
    await requireAdminAuthentication();
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      return <AdminLoginForm />;
    }
    throw error;
  }

  redirect("/admin");
}
