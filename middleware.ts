import { NextRequest, NextResponse } from "next/server";

// Gate the internal admin surface with HTTP Basic Auth (ADMIN_USER / ADMIN_PASSWORD in the runtime env).
// Covers the /admin/* dashboards and the ADMIN methods of the bird-requests API (GET list + PATCH status).
// The app's POST /api/bird-requests (a user requesting a bird, authed by its own IDENTIFY_KEY bearer) is
// deliberately NOT gated here. If ADMIN_PASSWORD is unset the gate is a no-op (fail-open for local dev) —
// so it must be set in production.

const REALM = 'Basic realm="FeatherBound Admin"';

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // The app's request-submission path is bearer-authed in the route, not part of the admin gate.
  if (pathname === "/api/bird-requests" && req.method === "POST") return NextResponse.next();

  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASSWORD || "";
  if (!pass) return NextResponse.next(); // not configured — do not lock anyone out locally

  const header = req.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try { decoded = atob(encoded); } catch { /* malformed */ }
    const i = decoded.indexOf(":");
    const u = decoded.slice(0, i);
    const p = decoded.slice(i + 1);
    if (u === user && p === pass) return NextResponse.next();
  }
  return unauthorized();
}

export const config = {
  matcher: ["/admin/:path*", "/api/bird-requests"],
};
