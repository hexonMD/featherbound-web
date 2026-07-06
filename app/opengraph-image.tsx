import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FeatherBound — Collect the birds around you";

// Embed the bird from disk (not an HTTP fetch) — a same-domain fetch resolves the OLD
// deployment during build, so a newly-added image 404s and renders blank. Reading the file
// as a data URI is deterministic.
const robin =
  "data:image/png;base64," +
  readFileSync(join(process.cwd(), "public/og-robin.png")).toString("base64");

// Rich-link preview image (auto-wired as og:image + twitter:image by Next).
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#efe7d6",
          padding: "0 66px",
          color: "#2c271d",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#8a7f6a" }}>
            AN ILLUSTRATED FIELD GUIDE
          </div>
          <div style={{ display: "flex", fontSize: 90, fontWeight: 800, marginTop: 14, lineHeight: 1 }}>
            FeatherBound
          </div>
          <div style={{ display: "flex", fontSize: 38, color: "#6b6250", marginTop: 22 }}>
            Collect the birds around you.
          </div>
        </div>
        <img src={robin} width={410} height={346} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size }
  );
}
