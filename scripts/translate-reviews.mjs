/**
 * Translate reviews with lang=en and no RU yet → RU text, keep original.
 * API key ONLY from env / GH Secrets (never commit).
 *
 * Local:  OPENROUTER_API_KEY=... node scripts/translate-reviews.mjs
 * CI:     secret TRANSLATE_API_KEY (or OPENROUTER_API_KEY)
 *
 * Fields after success:
 *   text        → Russian
 *   lang        → "ru"
 *   textOriginal→ original English
 *   langSource  → "en"
 */
import fs from "node:fs";
import path from "node:path";

const KEY =
  process.env.TRANSLATE_API_KEY ||
  process.env.OPENROUTER_API_KEY ||
  "";
const API =
  process.env.TRANSLATE_API_URL ||
  "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.TRANSLATE_MODEL || "google/gemini-2.0-flash-001";

if (!KEY) {
  console.log(
    "translate-reviews: no TRANSLATE_API_KEY/OPENROUTER_API_KEY — skip (set in GH Secrets)"
  );
  process.exit(0);
}

const dir = path.join(process.cwd(), "src", "data", "doctors");
const BATCH = 8;

async function translateBatch(texts) {
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n---\n");
  const body = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Translate patient medical reviews from English to natural Russian. " +
          "Return ONLY a JSON array of strings, same order as input, no markdown, no numbering in the values. " +
          "Preserve meaning; do not invent facts; keep clinic/doctor names if transliteration is unclear.",
      },
      { role: "user", content: numbered },
    ],
    temperature: 0.2,
  };
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      HTTP_Referer: "https://rudoctors.github.io",
      "X-Title": "Rudoctors review translation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`translate API ${res.status}: ${err.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || "";
  const m = content.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("no JSON array in response: " + content.slice(0, 200));
  const arr = JSON.parse(m[0]);
  if (!Array.isArray(arr) || arr.length !== texts.length) {
    throw new Error(`length mismatch: got ${arr?.length}, want ${texts.length}`);
  }
  return arr.map((s) => String(s).trim());
}

let filesChanged = 0;
let translated = 0;

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const p = path.join(dir, f);
  const doc = JSON.parse(fs.readFileSync(p, "utf8"));
  const pending = (doc.reviews || []).filter(
    (r) =>
      r.text &&
      r.lang === "en" &&
      !r.textOriginal &&
      !r.translatedAt
  );
  if (!pending.length) continue;

  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    try {
      const rus = await translateBatch(slice.map((r) => r.text));
      for (let j = 0; j < slice.length; j++) {
        const r = slice[j];
        r.textOriginal = r.text;
        r.text = rus[j];
        r.langSource = "en";
        // display lang: we store RU as primary text; keep lang as original marker for details
        r.lang = "ru";
        r.translatedAt = new Date().toISOString().slice(0, 10);
        translated++;
      }
      filesChanged++;
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.error(`FAIL ${f} batch ${i}: ${e.message}`);
    }
  }
  fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

console.log(`translated ${translated} reviews in ${filesChanged} files (model=${MODEL})`);
