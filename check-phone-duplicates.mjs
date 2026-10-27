import { readFile } from "node:fs/promises";

const envLines = await readFile(".env.local", "utf8");
const env = Object.fromEntries(
  envLines.split(/\r?\n/).flatMap((line) => {
    const index = line.indexOf("=");
    if (index < 0) return [];
    return [[
      line.slice(0, index).trim(),
      line.slice(index + 1).trim().replace(/^['"]|['"]$/g, ""),
    ]];
  }),
);

const baseUrl = env.SUPABASE_URL?.replace(/\/+$/, "");
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceKey) throw new Error("Supabase service configuration is unavailable.");

const response = await fetch(
  `${baseUrl}/rest/v1/wedding_rsvps?select=wedding_id,phone&phone=not.is.null&limit=10000`,
  {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    signal: AbortSignal.timeout(15000),
  },
);
if (!response.ok) throw new Error(`Supabase returned HTTP ${response.status}.`);
const rows = await response.json();
if (!Array.isArray(rows)) throw new Error("Supabase returned an invalid RSVP response.");

const counts = new Map();
for (const row of rows) {
  const digits = String(row.phone ?? "").replace(/\D/g, "");
  const normalized = /^0\d{10}$/.test(digits) ? `234${digits.slice(1)}` : digits;
  if (!normalized) continue;
  const key = `${row.wedding_id}:${normalized}`;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
const duplicateGroups = [...counts.values()].filter((count) => count > 1).length;
console.log(JSON.stringify({ rowsWithPhones: rows.length, duplicateGroups }));
