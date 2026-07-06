import Link from "next/link";

// Post-payment thank-you. Stripe redirects here with ?session_id=... after a successful
// Checkout. Fulfilment happens server-side via the webhook, so this page is purely a
// confirmation — it deliberately does no ordering itself.
export const metadata = {
  title: "Order confirmed — FeatherBound",
  robots: { index: false },
};

export default function PrintSuccess() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "80px 24px",
      }}
    >
      <div style={{ fontSize: 52 }}>🪶</div>
      <h1 style={{ fontSize: 34, fontFamily: "Georgia, serif", margin: "12px 0 0" }}>
        Order confirmed
      </h1>
      <p style={{ color: "var(--ink-2)", maxWidth: 460, margin: "14px auto 0", lineHeight: 1.55 }}>
        Thank you — your print is on its way into production. You&apos;ll get a shipping
        confirmation by email once it&apos;s dispatched. Fine-art prints are made to order, so
        please allow a little time for printing and delivery.
      </p>
      <Link
        href="/#prints"
        className="cta"
        style={{ marginTop: 28, textDecoration: "none", padding: "12px 22px" }}
      >
        Browse more prints
      </Link>
    </main>
  );
}
