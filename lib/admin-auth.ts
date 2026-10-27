import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminAuthConfig } from "@/lib/admin-auth-config";

export { getAdminAuthConfig };
export type { AdminAuthConfig } from "@/lib/admin-auth-config";

export class AdminAuthenticationRequiredError extends Error {
  constructor() {
    super("An authorized admin session is required.");
    this.name = "AdminAuthenticationRequiredError";
  }
}

export function isAdminAuthConfigured(): boolean {
  return getAdminAuthConfig() !== null;
}

export async function createAdminSupabaseServerClient() {
  const config = getAdminAuthConfig();
  if (!config) {
    throw new Error(
      "Admin authentication requires SUPABASE_URL, SUPABASE_ANON_KEY, and ADMIN_EMAILS.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(config.projectUrl, config.anonKey, {
    cookieOptions: config.cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

export async function requireAdminAuthentication(): Promise<void> {
  const config = getAdminAuthConfig();
  if (!config) {
    throw new Error(
      "Admin authentication requires SUPABASE_URL, SUPABASE_ANON_KEY, and ADMIN_EMAILS.",
    );
  }

  const supabase = await createAdminSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error("Unable to verify the admin Supabase session.", { cause: error });
  }

  const email = data.user?.email?.trim().toLowerCase();
  if (
    !data.user ||
    !email ||
    !data.user.email_confirmed_at ||
    !config.adminEmails.has(email)
  ) {
    throw new AdminAuthenticationRequiredError();
  }
}
