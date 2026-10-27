import "server-only";
import { randomUUID } from "node:crypto";
import { getWeddingById } from "@/data/weddings";

const RSVP_TABLE = "wedding_rsvps";
const MAX_REQUEST_BYTES = 10_000;

class RequestBodyTooLargeError extends Error {}

async function readLimitedText(request: Request, maxBytes: number): Promise<string> {
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
      if (totalBytes > maxBytes) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSupabaseConfig(): { projectUrl: string; serviceRoleKey: string } | null {
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectUrl || !serviceRoleKey) {
    console.error("RSVP submissions are unavailable because Supabase is not configured.");
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(projectUrl);
  } catch {
    console.error("RSVP submissions are unavailable because SUPABASE_URL is invalid.");
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
    console.error("RSVP submissions are unavailable because SUPABASE_URL is invalid.");
    return null;
  }

  return { projectUrl, serviceRoleKey };
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
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

    if (originUrl.host !== requestHost || originUrl.protocol !== `${requestProtocol}:`) {
      return Response.json({ error: "Invalid request origin." }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Expected a JSON request." }, { status: 415 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? 0 : Number(contentLengthHeader);

  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return Response.json({ error: "The RSVP is too large." }, { status: 413 });
  }

  let requestBody: string;

  try {
    requestBody = await readLimitedText(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The RSVP is too large." }, { status: 413 });
    }
    return Response.json({ error: "Please check the RSVP details and try again." }, { status: 400 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(requestBody);
  } catch {
    return Response.json({ error: "Please check the RSVP details and try again." }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return Response.json({ error: "Please check the RSVP details and try again." }, { status: 400 });
  }

  const {
    weddingId,
    name,
    email,
    phone,
    attending,
    guestCount,
    dietaryNeeds,
    message,
    website,
  } = payload;

  if (website !== undefined && (typeof website !== "string" || website.length > 0)) {
    return Response.json({ error: "The RSVP could not be accepted." }, { status: 400 });
  }

  if (
    typeof weddingId !== "string" ||
    typeof name !== "string" ||
    typeof dietaryNeeds !== "string" ||
    (email !== undefined && typeof email !== "string") ||
    typeof phone !== "string" ||
    (message !== undefined && typeof message !== "string")
  ) {
    return Response.json({ error: "Please provide a name and valid RSVP details." }, { status: 400 });
  }

  const wedding = getWeddingById(weddingId);

  if (!wedding) {
    return Response.json({ error: "This wedding invitation could not be found." }, { status: 404 });
  }

  const normalizedName = name.trim().replace(/\s+/g, " ");
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  const normalizedDietaryNeeds = dietaryNeeds.trim();
  const normalizedMessage = typeof message === "string" ? message.trim() : "";

  if (normalizedName.length < 1 || normalizedName.length > 100) {
    return Response.json({ error: "Your name must be between 1 and 100 characters." }, { status: 400 });
  }

  if (
    normalizedEmail.length > 254 ||
    (normalizedEmail.length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
  ) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const phoneDigits = normalizedPhone.replace(/\D/g, "");
  if (
    normalizedPhone.length < 1 ||
    normalizedPhone.length > 40 ||
    !/^[+()\d.\-\s]+$/.test(normalizedPhone) ||
    phoneDigits.length < 5 ||
    phoneDigits.length > 20
  ) {
    return Response.json({ error: "Please enter a valid phone number. It is required to prevent duplicate RSVPs." }, { status: 400 });
  }

  if (normalizedDietaryNeeds.length > 500) {
    return Response.json({ error: "Dietary notes must be 500 characters or fewer." }, { status: 400 });
  }

  if (normalizedMessage.length > 500) {
    return Response.json({ error: "Your message must be 500 characters or fewer." }, { status: 400 });
  }

  if (attending !== "yes" && attending !== "no") {
    return Response.json({ error: "Please let us know whether you can attend." }, { status: 400 });
  }

  if (
    attending === "yes" &&
    (typeof guestCount !== "number" ||
      !Number.isSafeInteger(guestCount) ||
      guestCount < 1 ||
      guestCount > Math.min(wedding.rsvpMaxGuests, 10))
  ) {
    return Response.json(
      { error: `Each invitation allows up to ${Math.min(wedding.rsvpMaxGuests, 10)} guests.` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseConfig();

  if (!supabase) {
    return Response.json(
      { error: "Online RSVP submissions are temporarily unavailable. Please RSVP by phone or WhatsApp." },
      { status: 503 },
    );
  }

  const ticketToken = attending === "yes" ? randomUUID() : null;

  try {
    const rsvpRecord: Record<string, string | boolean | number | null> = {
      wedding_id: wedding.id,
      guest_name: normalizedName,
      attending: attending === "yes",
      guest_count: attending === "yes" ? Number(guestCount) : 0,
      dietary_needs: normalizedDietaryNeeds,
      ticket_token: ticketToken,
      email: normalizedEmail || null,
      phone: normalizedPhone,
      ...(normalizedMessage ? { message: normalizedMessage } : {}),
    };
    const insertRsvp = (record: Record<string, string | boolean | number | null>) =>
      fetch(`${supabase.projectUrl}/rest/v1/${RSVP_TABLE}`, {
      method: "POST",
      headers: {
        apikey: supabase.serviceRoleKey,
        Authorization: `Bearer ${supabase.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(record),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    let messageSaved = true;
    let emailSaved = true;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await insertRsvp(rsvpRecord);

      if (response.ok) {
        return Response.json({
          ok: true,
          messageSaved,
          emailSaved,
          ticketToken,
        });
      }

      const errorBody = (await response.text()).slice(0, 500);
      const duplicatePhone =
        response.status === 409 &&
        errorBody.includes('"code":"23505"') &&
        (errorBody.includes("wedding_rsvps_phone_duplicate_guard") ||
          errorBody.includes("wedding_rsvps_wedding_phone_normalized_uidx") ||
          errorBody.includes("phone number has already been used for an RSVP"));

      if (duplicatePhone) {
        return Response.json(
          { error: "This phone number has already been used for an RSVP for this wedding. Please contact your RSVP host if you need help." },
          { status: 409 },
        );
      }

      const missingOptionalColumn =
        response.status === 400 &&
        errorBody.includes('"code":"PGRST204"') &&
        ["message", "email"].find(
          (column) =>
            column in rsvpRecord &&
            errorBody.includes(`Could not find the '${column}' column of '${RSVP_TABLE}'`),
        );

      if (!missingOptionalColumn) {
        console.error(
          "Supabase RSVP insert failed with HTTP",
          response.status,
          errorBody,
        );
        return Response.json(
          { error: "We couldn't save your RSVP just now. Please try again or contact your RSVP host." },
          { status: 502 },
        );
      }

      if (missingOptionalColumn === "message") {
        delete rsvpRecord.message;
        messageSaved = false;
      } else if (missingOptionalColumn === "email") {
        delete rsvpRecord.email;
        emailSaved = normalizedEmail.length === 0;
      }

      console.warn(
        `Supabase does not expose ${RSVP_TABLE}.${missingOptionalColumn}; retrying the RSVP without that optional field. Run supabase/wedding-rsvps.sql to enable all RSVP fields.`,
      );
    }

    console.error("Supabase RSVP retry limit reached while optional columns are unavailable.");
    return Response.json(
      { error: "We couldn't save your RSVP just now. Please try again or contact your RSVP host." },
      { status: 502 },
    );
  } catch (error) {
    console.error("Unable to save RSVP to Supabase:", error);
    return Response.json(
      { error: "We couldn't save your RSVP just now. Please try again or contact your RSVP host." },
      { status: 502 },
    );
  }
}
