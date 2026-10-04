import "server-only";
import { weddings } from "@/data/weddings";
import { requireAdminAuthentication } from "@/lib/admin-auth";

const RSVP_TABLE = "wedding_rsvps";
const PHOTO_TABLE = "wedding_guest_photos";
const PAGE_SIZE = 1000;

type SupabaseConfig = {
  projectUrl: string;
  serviceRoleKey: string;
};

type RsvpRow = {
  id: string;
  wedding_id: string;
  guest_name: string;
  attending: boolean;
  guest_count: number;
  message: string;
  created_at: string;
};

type PhotoRow = {
  id: string;
  wedding_id: string;
  guest_name: string | null;
  storage_path: string;
  created_at: string;
};

export type AdminDashboardPhoto = {
  id: string;
  guestName: string | null;
  url: string;
  createdAt: string;
};

export type AdminDashboardRsvp = {
  id: string;
  guestName: string;
  attending: boolean;
  guestCount: number;
  message: string;
  createdAt: string;
};

export type AdminDashboardWedding = {
  id: string;
  brideName: string;
  groomName: string;
  date: string;
  time: string;
  venue: string;
  couplePhoto: string | null;
  rsvps: AdminDashboardRsvp[];
  photos: AdminDashboardPhoto[];
};

export type AdminDashboardData = {
  weddings: AdminDashboardWedding[];
  rsvpMessagesAvailable: boolean;
};

function getSupabaseConfig(): SupabaseConfig {
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectUrl || !serviceRoleKey) {
    throw new Error("Admin dashboard data is unavailable because Supabase is not configured.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(projectUrl);
  } catch {
    throw new Error("Admin dashboard data is unavailable because SUPABASE_URL is invalid.");
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
    throw new Error("Admin dashboard data is unavailable because SUPABASE_URL is invalid.");
  }

  return { projectUrl, serviceRoleKey };
}

async function fetchRows(
  config: SupabaseConfig,
  table: string,
  columns: string,
): Promise<unknown[]> {
  const rows: unknown[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = new URLSearchParams({
      select: columns,
      order: "created_at.desc",
    });
    const response = await fetch(
      `${config.projectUrl}/rest/v1/${table}?${query.toString()}`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `******`,
          Range: `${offset}-${offset + PAGE_SIZE - 1}`,
          "Range-Unit": "items",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      throw new Error(
        `Supabase admin ${table} lookup failed with HTTP ${response.status}: ${details}`,
      );
    }

    const page: unknown = await response.json();
    if (!Array.isArray(page)) {
      throw new Error(`Supabase returned invalid ${table} records.`);
    }

    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRsvpRow(value: unknown): value is RsvpRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.wedding_id === "string" &&
    typeof value.guest_name === "string" &&
    typeof value.attending === "boolean" &&
    typeof value.guest_count === "number" &&
    (typeof value.message === "string" || value.message === undefined) &&
    typeof value.created_at === "string"
  );
}

function isPhotoRow(value: unknown): value is PhotoRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.wedding_id === "string" &&
    (typeof value.guest_name === "string" || value.guest_name === null) &&
    typeof value.storage_path === "string" &&
    typeof value.created_at === "string"
  );
}

function isMissingMessageColumn(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('"code":"PGRST204"') &&
    error.message.includes("Could not find the 'message' column of 'wedding_rsvps'")
  );
}

function photoUrl(projectUrl: string, storagePath: string): string {
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${projectUrl}/storage/v1/object/public/wedding-guest-photos/${encodedPath}`;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requireAdminAuthentication();
  const config = getSupabaseConfig();

  let rsvpRows: unknown[];
  let rsvpMessagesAvailable = true;

  try {
    rsvpRows = await fetchRows(
      config,
      RSVP_TABLE,
      "id,wedding_id,guest_name,attending,guest_count,message,created_at",
    );
  } catch (error) {
    if (!isMissingMessageColumn(error)) {
      throw error;
    }

    console.warn(
      "Admin dashboard is loading RSVP records without messages because the message column is not present in the Supabase schema cache.",
    );
    rsvpMessagesAvailable = false;
    rsvpRows = await fetchRows(
      config,
      RSVP_TABLE,
      "id,wedding_id,guest_name,attending,guest_count,created_at",
    );
  }

  const photoRows = await fetchRows(
    config,
    PHOTO_TABLE,
    "id,wedding_id,guest_name,storage_path,created_at",
  );

  if (!rsvpRows.every(isRsvpRow) || !photoRows.every(isPhotoRow)) {
    throw new Error("Supabase returned invalid admin dashboard records.");
  }

  const knownWeddingIds = new Set(weddings.map((wedding) => wedding.id));
  const filteredRsvps = rsvpRows.filter(
    (row): row is RsvpRow => knownWeddingIds.has(row.wedding_id),
  );
  const filteredPhotos = photoRows.filter(
    (row): row is PhotoRow => knownWeddingIds.has(row.wedding_id),
  );

  return {
    rsvpMessagesAvailable,
    weddings: weddings.map((wedding) => ({
      id: wedding.id,
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      date: wedding.date,
      time: wedding.time,
      venue: wedding.venue,
      couplePhoto: wedding.couplePhoto,
      rsvps: filteredRsvps
        .filter((row) => row.wedding_id === wedding.id)
        .map((row) => ({
          id: row.id,
          guestName: row.guest_name,
          attending: row.attending,
          guestCount: row.guest_count,
          message: row.message ?? "",
          createdAt: row.created_at,
        })),
      photos: filteredPhotos
        .filter((row) => row.wedding_id === wedding.id)
        .map((row) => ({
          id: row.id,
          guestName: row.guest_name,
          url: photoUrl(config.projectUrl, row.storage_path),
          createdAt: row.created_at,
        })),
    })),
  };
}
