// Server-side data layer for "request this bird" (public.bird_requests). All access uses the Supabase
// service key (server-only, never shipped to the client) via the PostgREST endpoint, so the table can
// stay RLS-locked with no public policy. The app POSTs requests to /api/bird-requests; the admin
// dashboard reads + updates status through the same key.

const SUPABASE_URL = "https://unwoxwbnisehfytuzouo.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

export type RequestStatus = "requested" | "generating" | "in_review" | "live" | "rejected";

export type BirdRequest = {
  species_sci: string;
  common_name: string | null;
  count: number;
  status: RequestStatus;
  sample_photo_url: string | null;
  first_user_id: string | null;
  last_region: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export const REQUESTS_CONFIGURED = Boolean(SERVICE_KEY);

function headers(extra?: Record<string, string>) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Record a request for a species: insert the row, or bump its count + refresh metadata if it exists.
 *  Returns the resulting row. Idempotent per (species_sci); count reflects total requests. */
export async function recordRequest(input: {
  species_sci: string;
  common_name?: string | null;
  user_id?: string | null;
  sample_photo_url?: string | null;
  region?: string | null;
}): Promise<BirdRequest> {
  const sci = input.species_sci.trim();
  // Read the current row (if any) so we can increment count without a race-prone SQL expression over REST.
  const cur = await getRequest(sci);
  if (!cur) {
    const row = {
      species_sci: sci,
      common_name: input.common_name ?? null,
      count: 1,
      status: "requested" as RequestStatus,
      sample_photo_url: input.sample_photo_url ?? null,
      first_user_id: input.user_id ?? null,
      last_region: input.region ?? null,
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bird_requests`, {
      method: "POST",
      headers: headers({ Prefer: "return=representation,resolution=merge-duplicates" }),
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`insert failed ${res.status}: ${await res.text()}`);
    return (await res.json())[0] as BirdRequest;
  }
  // Existing: bump count, refresh sample photo/region if we got fresh ones, keep the original first_user.
  const patch: Record<string, unknown> = { count: cur.count + 1, updated_at: new Date().toISOString() };
  if (input.region) patch.last_region = input.region;
  if (input.sample_photo_url && !cur.sample_photo_url) patch.sample_photo_url = input.sample_photo_url;
  if (input.common_name && !cur.common_name) patch.common_name = input.common_name;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bird_requests?species_sci=eq.${encodeURIComponent(sci)}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`bump failed ${res.status}: ${await res.text()}`);
  return (await res.json())[0] as BirdRequest;
}

export async function getRequest(sci: string): Promise<BirdRequest | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bird_requests?species_sci=eq.${encodeURIComponent(sci.trim())}&limit=1`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`get failed ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as BirdRequest[];
  return rows[0] ?? null;
}

/** All requests, most-demanded first (open statuses before completed). */
export async function listRequests(): Promise<BirdRequest[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bird_requests?order=count.desc,updated_at.desc&limit=1000`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`list failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as BirdRequest[];
}

export async function updateRequest(
  sci: string,
  patch: { status?: RequestStatus; note?: string },
): Promise<BirdRequest | null> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) body.status = patch.status;
  if (patch.note !== undefined) body.note = patch.note.slice(0, 2000) || null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bird_requests?species_sci=eq.${encodeURIComponent(sci.trim())}`,
    { method: "PATCH", headers: headers({ Prefer: "return=representation" }), body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`update failed ${res.status}: ${await res.text()}`);
  return (await res.json())[0] ?? null;
}
