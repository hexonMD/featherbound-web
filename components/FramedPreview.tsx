/// A framed-print preview of the plate — so a buyer sees it matted + framed on a wall before
/// buying, since Prodigi doesn't hand us a mockup. Pure CSS/markup (server component): dark
/// frame, cream mat, soft wall + drop shadow.
export default function FramedPreview({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        padding: "26px 22px 32px",
        background: "linear-gradient(158deg, #efe8d8 0%, #e4d9c2 100%)",
        borderRadius: 16,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          background: "#f7f1e4",
          padding: "clamp(22px, 7%, 40px)",
          border: "13px solid #2e271d",
          borderRadius: 3,
          boxShadow:
            "0 26px 46px rgba(44,39,29,.30), 0 4px 10px rgba(44,39,29,.18), inset 0 0 0 1px rgba(0,0,0,.10)",
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            display: "block",
            boxShadow: "0 1px 4px rgba(0,0,0,.16)",
          }}
        />
      </div>
      <p
        style={{
          textAlign: "center",
          marginTop: 16,
          fontSize: 12,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: "var(--ink-2)",
        }}
      >
        Framed preview · frame not included
      </p>
    </div>
  );
}
