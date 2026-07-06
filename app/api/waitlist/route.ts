import { NextRequest, NextResponse } from "next/server";

// Launch waitlist capture. Emails land in the Supabase `waitlist` table via its REST API
// with the publishable anon key (safe to ship) + an RLS insert policy. Duplicate emails are
// ignored, so re-submitting is harmless.
const SUPABASE_URL = "https://unwoxwbnisehfytuzouo.supabase.co";
const ANON = "sb_publishable_EsFzaS5mfiSgU-INYC8Dvg_cBuGMv24";

export async function POST(req: NextRequest) {
  let email = "";
  try {
    email = String((await req.json())?.email ?? "").trim().toLowerCase();
  } catch { /* ignore */ }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 190) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email }),
    });
    // 409 = already on the list (unique email) — treat as success.
    if (!res.ok && res.status !== 409) {
      return NextResponse.json({ error: "Something went wrong — try again." }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Something went wrong — try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
