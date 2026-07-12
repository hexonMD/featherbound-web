import { AwsClient } from "aws4fetch";

// Shared plate-review state, stored as a single JSON object in R2 (the site has no DB; R2 creds are
// set in the Coolify runtime env, same as the print pipeline). Small internal QA tool for 3 people,
// so a read-modify-write of one blob is fine — the clobber window on a single-slug write is tiny.

const KEY = "plate-review/state.json";

export type ReviewStatus = "checked" | "failed";
export type ReviewEntry = { status?: ReviewStatus; note?: string; by?: string; at?: number };
export type ReviewState = Record<string, ReviewEntry>;

function client() {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    region: "auto",
    service: "s3",
  });
}
function endpoint() {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${KEY}`;
}

export async function getReviewState(): Promise<ReviewState> {
  try {
    const res = await client().fetch(endpoint(), { method: "GET" });
    if (res.status === 404) return {};
    if (!res.ok) throw new Error(`R2 GET ${res.status}`);
    return (await res.json()) as ReviewState;
  } catch {
    return {};
  }
}

export async function setReviewEntry(
  slug: string,
  patch: { status?: ReviewStatus | null; note?: string; by?: string },
): Promise<ReviewEntry | null> {
  const state = await getReviewState();
  const next: ReviewEntry = { ...(state[slug] || {}) };
  if (patch.status !== undefined) {
    if (patch.status === null) delete next.status;
    else next.status = patch.status;
  }
  if (patch.note !== undefined) next.note = patch.note || undefined;
  if (patch.by) next.by = patch.by;
  next.at = Date.now();
  if (!next.status && !next.note) delete state[slug];
  else state[slug] = next;

  const body = new TextEncoder().encode(JSON.stringify(state));
  const ab = body.slice().buffer as ArrayBuffer;
  const res = await client().fetch(endpoint(), {
    method: "PUT",
    body: ab,
    headers: { "content-type": "application/json", "content-length": String(body.byteLength) },
  });
  if (!res.ok) throw new Error(`R2 PUT ${res.status}`);
  return state[slug] || null;
}
