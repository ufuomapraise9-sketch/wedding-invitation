import "server-only";

import { AdminAuthenticationRequiredError, requireAdminAuthentication } from "@/lib/admin-auth";
import { getWeddingById } from "@/data/weddings";

const RSVP_TABLE = "wedding_rsvps";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BYTES = 1_000;

class RequestBodyTooLargeError extends Error {}

type RsvpRow = {
  id: string;
  wedding_id: string;
  guest_name: string;
  attending: boolean;
  guest_count: number;
  checked_in_at: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readLimitedText(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function isRsvpRow(value: unknown): value is RsvpRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.wedding_id === "string" &&
    typeof value.guest_name === "string" &&
    typeof value.attending === "boolean" &&
    typeof value.guest_count === "number" &&
    (typeof value.checked_in_at === "string" || value.checked_in_at === null)
  );
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    const requestUrl = new URL(request.url);
    const requestHost =
      request.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
      request.headers.get("host") ??
      requestUrl.host;
    const requestProtocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
      requestUrl.protocol.slice(0, -1);
    const originUrl = new URL(origin);

    return originUrl.host === requestHost && originUrl.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

function getSupabaseConfig(): { projectUrl: string; serviceRoleKey: string } | null {
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl || !serviceRoleKey) {
    console.error("Admin check-in is unavailable because Supabase is not configured.");
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(projectUrl);
  } catch {
    console.error("Admin check-in is unavailable because SUPABASE_URL is invalid.");
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
    console.error("Admin check-in is unavailable because SUPABASE_URL is invalid.");
    return null;
  }

  return { projectUrl, serviceRoleKey };
}

function makeRestUrl(projectUrl: string, filters: Record<string, string>): URL {
  const url = new URL(`${projectUrl}/rest/v1/${RSVP_TABLE}`);
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function readRsvp(
  projectUrl: string,
  serviceRoleKey: string,
  ticketToken: string,
): Promise<RsvpRow | null> {
  const response = await fetch(
    makeRestUrl(projectUrl, {
      select: "id,wedding_id,guest_name,attending,guest_count,checked_in_at",
      ticket_token: `eq.${ticketToken}`,
      limit: "1",
    }),
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const responseBody = await response.text();

  if (!response.ok) {
    console.error("Supabase check-in lookup failed with HTTP", response.status, responseBody.slice(0, 400));
    throw new Error("Unable to validate the ticket.");
  }

  const rows: unknown = JSON.parse(responseBody);
  if (!Array.isArray(rows) || (rows.length > 0 && !isRsvpRow(rows[0]))) {
    throw new Error("Supabase returned invalid RSVP data during check-in.");
  }

  return rows.length === 0 ? null : rows[0];
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (
    request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return Response.json({ error: "Expected a JSON request." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "The check-in request is too large." }, { status: 413 });
  }

  try {
    await requireAdminAuthentication();
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    }
    console.error("Unable to verify admin access for check-in:", error);
    return Response.json({ error: "Unable to verify admin access." }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await readLimitedText(request));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The check-in request is too large." }, { status: 413 });
    }
    return Response.json({ error: "Please scan a valid ticket." }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return Response.json({ error: "Please scan a valid ticket." }, { status: 400 });
  }

  const { ticketToken, weddingId } = payload;
  if (
    typeof ticketToken !== "string" ||
    !UUID_PATTERN.test(ticketToken) ||
    typeof weddingId !== "string" ||
    !getWeddingById(weddingId)
  ) {
    return Response.json({ error: "Please scan a valid ticket for this invitation." }, { status: 400 });
  }

  const config = getSupabaseConfig();
  if (!config) {
    return Response.json({ error: "Check-in is temporarily unavailable." }, { status: 503 });
  }

  try {
    const updateUrl = makeRestUrl(config.projectUrl, {
      select: "id,wedding_id,guest_name,attending,guest_count,checked_in_at",
      ticket_token: `eq.${ticketToken}`,
      wedding_id: `eq.${weddingId}`,
      attending: "eq.true",
      checked_in_at: "is.null",
    });
    const now = new Date().toISOString();
    const updateResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ checked_in_at: now }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const updateBody = await updateResponse.text();

    if (!updateResponse.ok) {
      console.error("Supabase check-in update failed with HTTP", updateResponse.status, updateBody.slice(0, 400));
      return Response.json({ error: "Check-in is temporarily unavailable." }, { status: 502 });
    }

    const updatedRows: unknown = JSON.parse(updateBody);
    if (!Array.isArray(updatedRows) || (updatedRows.length > 0 && !isRsvpRow(updatedRows[0]))) {
      throw new Error("Supabase returned invalid check-in data.");
    }

    if (updatedRows.length > 0) {
      const row = updatedRows[0];
      return Response.json({
        ok: true,
        result: "checked-in",
        rsvpId: row.id,
        guestName: row.guest_name,
        guestCount: row.guest_count,
        checkedInAt: row.checked_in_at,
      });
    }

    const row = await readRsvp(config.projectUrl, config.serviceRoleKey, ticketToken);
    if (!row || row.wedding_id !== weddingId) {
      return Response.json({ error: "This ticket is not valid for the selected invitation." }, { status: 404 });
    }
    if (!row.attending) {
      return Response.json({ error: "This RSVP is not attending." }, { status: 409 });
    }
    if (row.checked_in_at) {
      return Response.json(
        {
          error: "already_checked_in",
          rsvpId: row.id,
          guestName: row.guest_name,
          guestCount: row.guest_count,
          checkedInAt: row.checked_in_at,
        },
        { status: 409 },
      );
    }

    return Response.json({ error: "Unable to complete check-in. Please scan the ticket again." }, { status: 409 });
  } catch (error) {
    console.error("Unable to validate or check in RSVP ticket:", error);
    return Response.json({ error: "Check-in is temporarily unavailable." }, { status: 502 });
  }
}
