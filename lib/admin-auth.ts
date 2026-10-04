import "server-only";

export class AdminAuthenticationRequiredError extends Error {
  constructor() {
    super("Admin authentication has not been configured.");
    this.name = "AdminAuthenticationRequiredError";
  }
}

export async function requireAdminAuthentication(): Promise<void> {
  throw new AdminAuthenticationRequiredError();
}
