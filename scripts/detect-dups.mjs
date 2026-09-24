import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src", "data", "doctors");
const ignoredTokens = new Set(["dr", "dr.", "доктор", "профессор", "prof", "professor"]);

function canonicalName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[\s,.;:()[\]{}\-]+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter((token) => token && !ignoredTokens.has(token))
    .sort()
    .join("|");
}

const rows = [];
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json"))) {
  const doctor = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const keys = [...new Set([doctor.name, doctor.nameEn].map(canonicalName).filter((key) => key.split("|").length >= 2))];
  rows.push({
    slug: doctor.slug,
    name: doctor.name,
    city: doctor.city,
    spec: doctor.specializations?.[0],
    sources: doctor.sources || [],
    exp: doctor.experienceYears,
    reviews: doctor.reviews?.length || 0,
    hidden: Boolean(doctor.hidden),
    keys,
  });
}

const groups = new Map();
for (const row of rows) {
  for (const key of row.keys) {
    if (!groups.has(key)) groups.set(key, new Map());
    groups.get(key).set(row.slug, row);
  }
}

const duplicates = [];
const archived = [];
for (const [key, group] of groups) {
  if (group.size < 2) continue;
  const entry = { key, doctors: [...group.values()] };
  if (entry.doctors.filter((doctor) => !doctor.hidden).length > 1) duplicates.push(entry);
  else archived.push(entry);
}

console.log("total", rows.length, "visible dup groups", duplicates.length, "archived dup groups", archived.length);
for (const { key, doctors } of duplicates) {
  console.log(
    "\nKEY",
    key,
    doctors.map((doctor) => `${doctor.slug} [${doctor.city}|${doctor.spec}|exp=${doctor.exp ?? "-"}|rev=${doctor.reviews}|${doctor.sources.join(",")}]`)
  );
}
