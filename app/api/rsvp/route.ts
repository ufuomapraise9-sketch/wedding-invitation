import "server-only";
import { getWeddingById } from "@/data/weddings";

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

  if (origin) {
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
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Expected a JSON request." }, { status: 415 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? 0 : Number(contentLengthHeader);

  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength < 0 ||
    contentLength > 10_000
  ) {
    return Response.json({ error: "The RSVP is too large." }, { status: 413 });
  }

  let requestBody: string;

  try {
    requestBody = await request.text();
  } catch {
    return Response.json({ error: "Please check the RSVP details and try again." }, { status: 400 });
  }

  if (new TextEncoder().encode(requestBody).byteLength > 10_000) {
    return Response.json({ error: "The RSVP is too large." }, { status: 413 });
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

  const { weddingId, name, attending, guestCount, dietaryNeeds, message, website } = payload;

  if (website !== undefined && (typeof website !== "string" || website.length > 0)) {
    return Response.json({ error: "The RSVP could not be accepted." }, { status: 400 });
  }

  if (
    typeof weddingId !== "string" ||
    typeof name !== "string" ||
    typeof dietaryNeeds !== "string" ||
    (message !== undefined && typeof message !== "string")
  ) {
    return Response.json({ error: "Please provide a name and valid RSVP details." }, { status: 400 });
  }

  const wedding = getWeddingById(weddingId);

  if (!wedding) {
    return Response.json({ error: "This wedding invitation could not be found." }, { status: 404 });
  }

  const normalizedName = name.trim().replace(/\s+/g, " ");
  const normalizedDietaryNeeds = dietaryNeeds.trim();
  const normalizedMessage = typeof message === "string" ? message.trim() : "";

  if (normalizedName.length < 1 || normalizedName.length > 100) {
    return Response.json({ error: "Your name must be between 1 and 100 characters." }, { status: 400 });
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

  try {
    const rsvpRecord = {
      wedding_id: wedding.id,
      guest_name: normalizedName,
      attending: attending === "yes",
      guest_count: attending === "yes" ? guestCount : 0,
      dietary_needs: normalizedDietaryNeeds,
    };
    const insertRsvp = (record: typeof rsvpRecord & { message?: string }) =>
      fetch(`${supabase.projectUrl}/rest/v1/wedding_rsvps`, {
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

    let response = await insertRsvp({
      ...rsvpRecord,
      ...(normalizedMessage ? { message: normalizedMessage } : {}),
    });

    if (!response.ok) {
      const errorBody = (await response.text()).slice(0, 500);
      const messageColumnMissing =
        response.status === 400 &&
        errorBody.includes('"code":"PGRST204"') &&
        errorBody.includes("Could not find the 'message' column of 'wedding_rsvps'");

      if (messageColumnMissing && normalizedMessage) {
        console.warn(
          "Supabase does not expose wedding_rsvps.message yet; retrying the RSVP without its optional note.",
        );
        response = await insertRsvp(rsvpRecord);

        if (response.ok) {
          return Response.json({ ok: true, messageSaved: false });
        }

        const retryErrorBody = (await response.text()).slice(0, 500);
        console.error(
          "Supabase RSVP retry failed with HTTP",
          response.status,
          retryErrorBody,
        );
        return Response.json(
          { error: "We couldn't save your RSVP just now. Please try again or contact your RSVP host." },
          { status: 502 },
        );
      }

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

    return Response.json({ ok: true, messageSaved: true });
  } catch (error) {
    console.error("Unable to save RSVP to Supabase:", error);
    return Response.json(
      { error: "We couldn't save your RSVP just now. Please try again or contact your RSVP host." },
      { status: 502 },
    );
  }
}
