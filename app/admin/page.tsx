import type { Metadata } from "next";
import { connection } from "next/server";
import AdminDashboard from "@/app/components/AdminDashboard";
import { AdminAuthenticationRequiredError, requireAdminAuthentication } from "@/lib/admin-auth";
import { getAdminDashboardData, type AdminDashboardData } from "@/lib/admin-dashboard-data";

export const metadata: Metadata = {
  title: "Private Admin | Wedding Invitations",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  await connection();

  let dashboard: AdminDashboardData | undefined;

  try {
    await requireAdminAuthentication();
    dashboard = await getAdminDashboardData();
  } catch (error) {
    if (!(error instanceof AdminAuthenticationRequiredError)) {
      throw error;
    }
  }

  if (dashboard) {
    return <AdminDashboard data={dashboard} />;
  }

  return (
    <main className="admin-locked-page">
      <section className="admin-locked-card" aria-labelledby="admin-locked-title">
        <p className="admin-overline">Private area</p>
        <div className="admin-lock-mark" aria-hidden="true">✦</div>
        <h1 id="admin-locked-title">Admin access is locked</h1>
        <p>
          Authentication has not been configured for this site. No wedding,
          guest, RSVP, or photo data has been loaded.
        </p>
        <p className="admin-lock-note">
          Connect and verify an authentication provider before enabling this
          dashboard in production.
        </p>
      </section>
    </main>
  );
}
