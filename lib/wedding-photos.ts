import "server-only";
import { randomUUID } from "node:crypto";
import type { WeddingPhoto } from "@/types/wedding-photo";

const BUCKET = "wedding-guest-photos";
const TABLE = "wedding_guest_photos";
const STORAGE_TIMEOUT_MS = 30_000;

type StorageConfig = {
  projectUrl: string;
  serviceRoleKey: string;
};

type PhotoInsert = {
  id: string;
  wedding_id: string;
  guest_name: string | null;
  storage_path: string;
  created_at: string;
};

export class PhotoStorageNotConfiguredError extends Error {
  constructor() {
    super("Wedding photo storage is not configured.");
    this.name = "PhotoStorageNotConfiguredError";
  }
}

export class PhotoStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoStorageConfigurationError";
  }
}

function getStorageConfig(): StorageConfig {
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectUrl && !serviceRoleKey) {
    throw new PhotoStorageNotConfiguredError();
  }

  if (!projectUrl || !serviceRoleKey) {
    throw new PhotoStorageConfigurationError(
      "Supabase photo storage needs both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Add the missing value to .env.local, then restart the app.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(projectUrl);
  } catch {
    throw new PhotoStorageConfigurationError(
      "SUPABASE_URL must be a valid Supabase project URL. Check .env.local, then restart the app.",
    );
  }

  if (
    (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new PhotoStorageConfigurationError(
      "SUPABASE_URL must use HTTPS and must not contain credentials. Check .env.local, then restart the app.",
    );
  }

  return { projectUrl, serviceRoleKey };
}

function supabaseHeaders(config: StorageConfig): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
}

function throwProviderError(operation: string, status: number, details: string) {
  console.error(`Supabase ${operation} failed with HTTP ${status}: ${details.slice(0, 500)}`);
  throw new Error(`Wedding photo ${operation} failed.`);
}

function storageObjectUrl(config: StorageConfig, path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${config.projectUrl}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}

function mapPhoto(row: PhotoInsert, config: StorageConfig): WeddingPhoto {
  return {
    id: row.id,
    weddingId: row.wedding_id,
    guestName: row.guest_name,
    url: storageObjectUrl(config, row.storage_path),
    createdAt: row.created_at,
  };
}

export async function listWeddingPhotos(weddingId: string): Promise<WeddingPhoto[]> {
  const config = getStorageConfig();
  const query = new URLSearchParams({
    select: "id,wedding_id,guest_name,storage_path,created_at",
    wedding_id: `eq.${weddingId}`,
    order: "created_at.desc",
    limit: "200",
  });
  const response = await fetch(
    `${config.projectUrl}/rest/v1/${TABLE}?${query.toString()}`,
    {
      headers: supabaseHeaders(config),
      cache: "no-store",
      signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throwProviderError("gallery lookup", response.status, await response.text());
  }

  const result: unknown = await response.json();

  if (
    !Array.isArray(result) ||
    !result.every(
      (row): row is PhotoInsert =>
        typeof row === "object" &&
        row !== null &&
        typeof row.id === "string" &&
        row.wedding_id === weddingId &&
        (typeof row.guest_name === "string" || row.guest_name === null) &&
        typeof row.storage_path === "string" &&
        typeof row.created_at === "string",
    )
  ) {
    throw new Error("Supabase returned invalid wedding photo records.");
  }

  return result.map((row) => mapPhoto(row, config));
}

export async function saveWeddingPhotos({
  weddingId,
  guestName,
  files,
}: {
  weddingId: string;
  guestName: string | null;
  files: File[];
}): Promise<WeddingPhoto[]> {
  const config = getStorageConfig();
  const uploadedPaths: string[] = [];
  const createdRows: PhotoInsert[] = [];

  try {
    for (const file of files) {
      const extension = file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";
      const path = `${weddingId}/${randomUUID()}.${extension}`;
      uploadedPaths.push(path);
      const response = await fetch(
        `${config.projectUrl}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`,
        {
          method: "POST",
          headers: {
            ...supabaseHeaders(config),
            "Content-Type": file.type,
            "x-upsert": "false",
          },
          body: file,
          cache: "no-store",
          signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        throwProviderError("image upload", response.status, await response.text());
      }
    }

    for (const storagePath of uploadedPaths) {
      const response = await fetch(`${config.projectUrl}/rest/v1/${TABLE}`, {
        method: "POST",
        headers: {
          ...supabaseHeaders(config),
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          wedding_id: weddingId,
          guest_name: guestName,
          storage_path: storagePath,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
      });

      if (!response.ok) {
        throwProviderError("photo record save", response.status, await response.text());
      }

      const result: unknown = await response.json();

      if (
        !Array.isArray(result) ||
        result.length !== 1 ||
        typeof result[0] !== "object" ||
        result[0] === null ||
        typeof result[0].id !== "string" ||
        result[0].wedding_id !== weddingId ||
        result[0].storage_path !== storagePath ||
        typeof result[0].created_at !== "string"
      ) {
        throw new Error("Supabase returned invalid saved wedding photo metadata.");
      }

      createdRows.push({
        id: result[0].id,
        wedding_id: weddingId,
        guest_name: typeof result[0].guest_name === "string" ? result[0].guest_name : null,
        storage_path: storagePath,
        created_at: result[0].created_at,
      });
    }

    return createdRows.map((row) => mapPhoto(row, config));
  } catch (error) {
    if (uploadedPaths.length > 0) {
      try {
        const storagePathFilter = encodeURIComponent(`(${uploadedPaths.join(",")})`);
        const deleteRows = await fetch(
          `${config.projectUrl}/rest/v1/${TABLE}?storage_path=in.${storagePathFilter}`,
          {
            method: "DELETE",
            headers: supabaseHeaders(config),
            cache: "no-store",
            signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
          },
        );

        if (!deleteRows.ok) {
          console.error(
            "Unable to roll back wedding photo metadata:",
            deleteRows.status,
            (await deleteRows.text()).slice(0, 500),
          );
        }

        const deleteObjects = await fetch(
          `${config.projectUrl}/storage/v1/object/${BUCKET}`,
          {
            method: "DELETE",
            headers: {
              ...supabaseHeaders(config),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prefixes: uploadedPaths }),
            cache: "no-store",
            signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
          },
        );

        if (!deleteObjects.ok) {
          console.error(
            "Unable to roll back uploaded wedding photo files:",
            deleteObjects.status,
            (await deleteObjects.text()).slice(0, 500),
          );
        }
      } catch (cleanupError) {
        console.error("Unable to complete wedding photo upload rollback:", cleanupError);
      }
    }

    throw error;
  }
}
