import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FeatherBound — Collect the birds around you";

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
          padding: "0 78px",
          color: "#2c271d",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ display: "flex", fontSize: 25, letterSpacing: 6, color: "#8a7f6a" }}>
            AN ILLUSTRATED FIELD GUIDE
          </div>
          <div style={{ display: "flex", fontSize: 108, fontWeight: 800, marginTop: 14, lineHeight: 1 }}>
            FeatherBound
          </div>
          <div style={{ display: "flex", fontSize: 40, color: "#6b6250", marginTop: 24 }}>
            Collect the birds around you.
          </div>
        </div>
        <img
          src="https://featherbound.app/plate-robin.png"
          width={430}
          height={430}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size }
  );
}
