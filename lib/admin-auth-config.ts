import type { CookieOptions } from "@supabase/ssr";

export type AdminAuthConfig = {
  projectUrl: string;
  anonKey: string;
  adminEmails: Set<string>;
  cookieOptions: CookieOptions;
};

export function getAdminAuthConfig(): AdminAuthConfig | null {
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!projectUrl || !anonKey || adminEmails.size === 0) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(projectUrl);
  } catch {
    return null;
  }

  if (
    (parsedUrl.protocol !== "https:" &&
      parsedUrl.hostname !== "localhost" &&
      parsedUrl.hostname !== "127.0.0.1") ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    return null;
  }

  return {
    projectUrl,
    anonKey,
    adminEmails,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}
