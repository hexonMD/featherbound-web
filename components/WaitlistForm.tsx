"use client";
import { useState } from "react";

/// Launch-waitlist email capture (replaces the pre-launch dead App Store badge). Posts to
/// /api/waitlist and confirms inline.
export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg("");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (r.ok) {
        setState("done");
      } else {
        const d = await r.json().catch(() => ({}));
        setState("error");
        setMsg(d.error || "Try again.");
      }
    } catch {
      setState("error");
      setMsg("Try again.");
    }
  }

  if (state === "done") {
    return <p className="wl-done">You&rsquo;re on the list — one email at launch, and you can unsubscribe anytime. 🐦</p>;
  }

  return (
    <form className="wl" onSubmit={submit}>
      <input
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address"
      />
      <button className="cta" type="submit" disabled={state === "loading"}>
        {state === "loading" ? "…" : "Get it at launch"}
      </button>
      {state === "error" && <span className="wl-err">{msg}</span>}
    </form>
  );
}
