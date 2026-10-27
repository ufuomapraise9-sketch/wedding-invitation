import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import AdminDashboard from "@/app/components/AdminDashboard";
import {
  AdminAuthenticationRequiredError,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
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

  if (!isAdminAuthConfigured()) {
    redirect("/admin/login");
  }

  let dashboard: AdminDashboardData;
  try {
    dashboard = await getAdminDashboardData();
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      redirect("/admin/login");
    }
    throw error;
  }
  return <AdminDashboard data={dashboard} />;
}
