import { getWeddingById } from "@/data/weddings";
import {
  listWeddingPhotos,
  PhotoStorageConfigurationError,
  PhotoStorageNotConfiguredError,
  saveWeddingPhotos,
} from "@/lib/wedding-photos";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const MAX_REQUEST_SIZE = 26 * 1024 * 1024;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const requestHost =
      request.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
      request.headers.get("host") ??
      requestUrl.host;
    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      .trim();
    const requestProtocol = forwardedProtocol
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;

    return originUrl.host === requestHost && originUrl.protocol === requestProtocol;
  } catch {
    return false;
  }
}

function isAllowedImage(file: File): boolean {
  if (file.type === "image/jpeg") {
    return file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg");
  }

  if (file.type === "image/png") {
    return file.name.toLowerCase().endsWith(".png");
  }

  return file.type === "image/webp" && file.name.toLowerCase().endsWith(".webp");
}

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  return (
    file.type === "image/webp" &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function storageUnavailableResponse(error: unknown) {
  if (error instanceof PhotoStorageNotConfiguredError) {
    console.error(
      "Guest photo uploads are unavailable because Supabase photo storage is not configured.",
    );
    return Response.json(
      { error: "Guest photo sharing is not set up yet. Please try again later." },
      { status: 503 },
    );
  }

  if (error instanceof PhotoStorageConfigurationError) {
    console.error("Guest photo uploads have an incomplete or invalid Supabase configuration.");
    return Response.json({ error: error.message }, { status: 503 });
  }

  console.error("Wedding photo storage request failed:", error);
  return Response.json(
    { error: "We couldn't load or save these photos. Please try again later." },
    { status: 502 },
  );
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!getWeddingById(id)) {
    return Response.json({ error: "This wedding invitation could not be found." }, { status: 404 });
  }

  try {
    const photos = await listWeddingPhotos(id);
    return Response.json({ photos }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return storageUnavailableResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!getWeddingById(id)) {
    return Response.json({ error: "This wedding invitation could not be found." }, { status: 404 });
  }

  if (!verifySameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return Response.json({ error: "Please upload photos using the wedding photo form." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > MAX_REQUEST_SIZE) {
    return Response.json({ error: "Please upload smaller photos; the total upload limit is 25 MB." }, { status: 413 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "We couldn't read those files. Please select them and try again." }, { status: 400 });
  }

  const entries = formData.getAll("photos");
  const files = entries.filter((entry): entry is File => typeof entry !== "string");
  const guestNameValue = formData.get("guestName");

  if (
    files.length === 0 ||
    entries.length > MAX_FILES ||
    files.length !== entries.length
  ) {
    return Response.json({ error: `Choose between 1 and ${MAX_FILES} photos to upload.` }, { status: 400 });
  }

  if (guestNameValue !== null && typeof guestNameValue !== "string") {
    return Response.json({ error: "Please enter a valid guest name." }, { status: 400 });
  }

  let totalSize = 0;

  for (const file of files) {
    if (!isAllowedImage(file)) {
      return Response.json(
        { error: "Only JPG, JPEG, PNG, and WEBP photos are accepted." },
        { status: 415 },
      );
    }

    if (file.size < 1 || file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Each photo must be smaller than 8 MB." }, { status: 413 });
    }

    totalSize += file.size;
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    return Response.json({ error: "Please keep the total upload under 25 MB." }, { status: 413 });
  }

  try {
    for (const file of files) {
      if (!(await hasValidImageSignature(file))) {
        return Response.json(
          { error: "One or more files are not valid JPG, PNG, or WEBP images." },
          { status: 415 },
        );
      }
    }

    const normalizedGuestName = typeof guestNameValue === "string"
      ? guestNameValue
          .trim()
          .replace(/[\u0000-\u001f\u007f-\u009f<>]/g, "")
          .replace(/\s+/g, " ")
          .slice(0, 80) || null
      : null;
    const photos = await saveWeddingPhotos({
      weddingId: id,
      guestName: normalizedGuestName,
      files,
    });

    return Response.json({ photos }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return storageUnavailableResponse(error);
  }
}
