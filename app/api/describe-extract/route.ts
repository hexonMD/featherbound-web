import { NextRequest, NextResponse } from "next/server";

// Tier 3 of "Describe a Bird": turn a plain-language description into the structured colour/size/
// habitat "mould" the app's on-device scorer ranks against, plus one clarifying question when the
// description is too vague. Runs a small instruct LLM on our existing Replicate setup — the path
// for phones without an on-device model (older iOS, most Android). Only the description text is
// sent (no personal data). Fully fallback-safe: any failure returns a 502 and the app drops to its
// offline keyword parser.
export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "https://api.replicate.com/v1/models/meta/meta-llama-3-8b-instruct/predictions";

const sys = (ask: boolean) => `You convert a birdwatcher's plain-language description of a bird into a strict JSON object and nothing else.
Output EXACTLY this shape:
{"colors":[{"color":"<one of: black blue brown gray green orange red white yellow>","strength":<0-100>}],"size":<integer 1-7>,"habitat":["<from: feeder ground trees water shore field>"],"question":"<see below>"}
Rules:
- colours: only the nine listed words. Map synonyms (rusty/rufous/tan->brown, olive->green, crimson/scarlet/pink->red, cream->white, gold->yellow, slate->gray). Give the main body colour the highest strength; include small diagnostic marks (a red crown, a yellow rump) at 25-45.
- size: 1=tiny (hummingbird/kinglet) 2=small (sparrow/finch/warbler) 3=robin/jay/cardinal 4=pigeon/dove/crow 5=duck/hawk/gull 6=goose/heron 7=eagle/swan/pelican/crane. Interpret shape words: a "hawk"/"eagle"/"owl" is size 5-6, "duck"/"goose" 5-6 on water, "sparrow"/"finch" size 2.
- habitat: infer from context ("at the feeder"->feeder, "on a trunk"->trees, "by the pond"->water).
${ask
  ? `- question: if the description is too vague to narrow down (e.g. only "a small bird"), write ONE short follow-up question (about belly colour, size vs a robin, or where seen). If it is already specific, use "".`
  : `- question: always "".`}
Return only the JSON object.`;

interface Parsed {
  colors?: { color?: string; strength?: number }[];
  size?: number;
  habitat?: string[];
  question?: string;
}

function extractJson(s: string): Parsed | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

const COLORS = new Set(["black", "blue", "brown", "gray", "green", "orange", "red", "white", "yellow"]);
const HABS = new Set(["feeder", "ground", "trees", "water", "shore", "field"]);

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return NextResponse.json({ error: "not configured" }, { status: 503 });

  let body: { text?: string; ask?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const text = (body.text ?? "").toString().slice(0, 400).trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const ask = body.ask !== false;

  try {
    const create = await fetch(MODEL, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", prefer: "wait" },
      body: JSON.stringify({
        input: { system_prompt: sys(ask), prompt: `Description: "${text}"`, max_tokens: 400, temperature: 0.2 },
      }),
    });
    let pred = await create.json();
    for (let i = 0; i < 25 && !["succeeded", "failed", "canceled"].includes(pred.status); i++) {
      await new Promise((r) => setTimeout(r, 1000));
      pred = await (
        await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
          headers: { authorization: `Bearer ${token}` },
        })
      ).json();
    }
    if (pred.status !== "succeeded") return NextResponse.json({ error: "llm failed" }, { status: 502 });

    const raw = Array.isArray(pred.output) ? pred.output.join("") : String(pred.output ?? "");
    const p = extractJson(raw);
    if (!p) return NextResponse.json({ error: "no json" }, { status: 502 });

    const colors = (p.colors ?? [])
      .filter((c) => c && typeof c.color === "string" && COLORS.has(c.color.toLowerCase()))
      .map((c) => ({ color: c.color!.toLowerCase(), strength: Math.max(0, Math.min(100, Math.round(Number(c.strength) || 0))) }));
    const size = Number.isFinite(p.size) && p.size! >= 1 && p.size! <= 7 ? Math.round(p.size!) : null;
    const habitat = (p.habitat ?? []).filter((h) => typeof h === "string" && HABS.has(h.toLowerCase())).map((h) => h.toLowerCase());
    const question = ask ? (p.question ?? "").toString().trim().slice(0, 160) : "";

    return NextResponse.json({ colors, size, habitat, question });
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
