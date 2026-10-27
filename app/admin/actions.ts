"use server";

import { redirect } from "next/navigation";
import {
  createAdminSupabaseServerClient,
  getAdminAuthConfig,
  type AdminAuthConfig,
} from "@/lib/admin-auth";

export type AdminLoginState = {
  error: string | null;
};

const INVALID_CREDENTIALS_MESSAGE =
  "We couldn't sign you in. Check your email and password, and make sure your email is authorized for admin access.";

function isAuthorizedEmail(email: string, config: AdminAuthConfig): boolean {
  return config.adminEmails.has(email.trim().toLowerCase());
}

export async function loginAdmin(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const config = getAdminAuthConfig();
  if (!config) {
    return {
      error: "Admin sign-in is not configured. Contact the site administrator.",
    };
  }

  const email = formData.get("email");
  const password = formData.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    password.length > 1024 ||
    !isAuthorizedEmail(email, config)
  ) {
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  const supabase = await createAdminSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  const { data: verifiedSession, error: verificationError } = await supabase.auth.getUser();
  const verifiedEmail = verifiedSession.user?.email?.trim().toLowerCase();
  if (
    verificationError ||
    !verifiedSession.user ||
    !verifiedEmail ||
    !verifiedSession.user.email_confirmed_at ||
    !isAuthorizedEmail(verifiedEmail, config)
  ) {
    await supabase.auth.signOut();
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  const supabase = await createAdminSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("Unable to end the admin Supabase session.", { cause: error });
  }

  redirect("/admin");
}
