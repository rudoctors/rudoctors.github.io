/**
 * Scan src/data/doctors for potential duplicate people (same last+first name).
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src", "data", "doctors");
const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const parts = String(d.name || "")
    .trim()
    .split(/\s+/)
    .map((p) => p.toLowerCase().replace(/ё/g, "е"));
  if (parts.length < 2) continue;
  // Russian order usually: LastName FirstName [Patronymic]
  const key =
    parts.length >= 2 && /[а-я]/.test(parts[0])
      ? `${parts[0]}|${parts[1]}`
      : `${parts[1] || ""}|${parts[0]}`;
  rows.push({
    slug: d.slug,
    name: d.name,
    city: d.city,
    spec: d.specializations?.[0],
    sources: d.sources,
    exp: d.experienceYears,
    reviews: (d.reviews || []).length,
    key,
  });
}
const byKey = new Map();
for (const r of rows) {
  if (!byKey.has(r.key)) byKey.set(r.key, []);
  byKey.get(r.key).push(r);
}
const dups = [...byKey.entries()].filter(([, v]) => v.length > 1);
console.log("total", rows.length, "dup groups", dups.length);
for (const [k, v] of dups) {
  console.log(
    "\nKEY",
    k,
    v.map((x) => `${x.slug} [${x.city}|${x.spec}|exp=${x.exp ?? "-"}|rev=${x.reviews}|${x.sources.join(",")}]`)
  );
}
// also print short-name collisions (first 2 tokens of EN order)
