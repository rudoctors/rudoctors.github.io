/**
 * Mark EN alfa reviews with lang:"en" (Phase 3 prep).
 * Does NOT translate — translation uses translate-reviews.mjs + GH Secrets key.
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src", "data", "doctors");
let changed = 0;
let total = 0;

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const p = path.join(dir, f);
  const doc = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!doc.reviews?.length) continue;
  let dirty = false;
  for (const r of doc.reviews) {
    if (!r.text) continue;
    // alfa source is English; skip if already lang set
    const isAlfa = r.source === "serbia.alfamedstar.com";
    const looksEn =
      isAlfa ||
      (!/[а-яё]/i.test(r.text) && /\b(the|and|with|was|very|doctor|good)\b/i.test(r.text));
    if (looksEn && !r.lang) {
      r.lang = "en";
      dirty = true;
      total++;
    }
    if (r.lang === "en" && !r.textOriginal) {
      // if not yet translated, keep original as text for now; after translation:
      // text = RU, textOriginal = EN
      // for now just ensure lang set
    }
  }
  if (dirty) {
    fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n", "utf8");
    changed++;
  }
}
console.log(`tagged lang=en on ${total} reviews in ${changed} files`);
