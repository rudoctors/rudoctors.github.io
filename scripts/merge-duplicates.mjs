/**
 * Phase 1: merge duplicate doctor cards in src/data/doctors
 * Keep the richer card; absorb fields from the secondary.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "src", "data", "doctors");

function read(slug) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${slug}.json`), "utf8"));
}

function write(doc) {
  fs.writeFileSync(path.join(dir, `${doc.slug}.json`), JSON.stringify(doc, null, 2) + "\n", "utf8");
}

function del(slug) {
  const p = path.join(dir, `${slug}.json`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function mergeInto(keepSlug, dropSlug, pick) {
  const keep = read(keepSlug);
  const drop = read(dropSlug);
  const merged = pick(keep, drop);
  merged.slug = keepSlug;
  merged.updatedAt = new Date().toISOString().slice(0, 10);
  write(merged);
  del(dropSlug);
  console.log(`merged ${dropSlug} -> ${keepSlug}`);
}

// 1) igor: prefer RU card as primary; absorb reviews + experienceYears + nameEn from alfa
mergeInto("igor-shtuchnyy", "igor-shtuchniy", (keep, drop) => ({
  ...keep,
  nameEn: keep.nameEn || drop.nameEn,
  experienceYears: keep.experienceYears || drop.experienceYears,
  languages: [...new Set([...(keep.languages || []), ...(drop.languages || [])])],
  reviews: [
    ...(keep.reviews || []),
    ...(drop.reviews || []).filter(
      (r) => !(keep.reviews || []).some((k) => k.id === r.id || (r.text && k.text === r.text))
    ),
  ],
  sources: [...new Set([...(keep.sources || []), ...(drop.sources || [])])],
  contacts: { ...drop.contacts, ...keep.contacts },
  workplaces: keep.workplaces?.length ? keep.workplaces : drop.workplaces,
}));

// 2) anna: primary full gynecologist card; absorb telegram from stub
mergeInto("anna-zagarskih", "anna-zagarskih-2", (keep, drop) => ({
  ...keep,
  languages: keep.languages?.length ? keep.languages : drop.languages,
  contacts: { ...drop.contacts, ...keep.contacts },
  sources: [...new Set([...(keep.sources || []), ...(drop.sources || [])])],
}));

// 3) nadezhda: primary has photo/alta links; absorb nameEn/education/bio richness
mergeInto("nadezhda-bakuleva", "nadezhda-bakuleva-2", (keep, drop) => ({
  ...keep,
  nameEn: keep.nameEn || drop.nameEn,
  education: keep.education?.length ? keep.education : drop.education,
  bio: keep.bio || drop.bio,
  languages: [...new Set([...(keep.languages || []), ...(drop.languages || [])])],
  photo: keep.photo || drop.photo,
  reviews: [
    ...(keep.reviews || []),
    ...(drop.reviews || []).filter(
      (r) => !(keep.reviews || []).some((k) => k.id === r.id || (r.text && k.text === r.text))
    ),
  ],
  contacts: { ...drop.contacts, ...keep.contacts },
  sources: [...new Set([...(keep.sources || []), ...(drop.sources || [])])],
  workplaces: keep.workplaces?.length ? keep.workplaces : drop.workplaces,
}));

// 4) yuliya: prefer RU card; absorb reviews + experienceYears + nameEn from alfa
mergeInto("yuliya-avakyanc", "yulia-avakyants", (keep, drop) => ({
  ...keep,
  nameEn: keep.nameEn || drop.nameEn,
  experienceYears: keep.experienceYears || drop.experienceYears,
  languages: [...new Set([...(keep.languages || []), ...(drop.languages || [])])],
  reviews: [
    ...(keep.reviews || []),
    ...(drop.reviews || []).filter(
      (r) => !(keep.reviews || []).some((k) => k.id === r.id || (r.text && k.text === r.text))
    ),
  ],
  sources: [...new Set([...(keep.sources || []), ...(drop.sources || [])])],
  contacts: { ...drop.contacts, ...keep.contacts },
  workplaces: keep.workplaces?.length ? keep.workplaces : drop.workplaces,
}));

// Strip hardcoded rating:5 on scraped alfa reviews (no fake stars)
let stripped = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const p = path.join(dir, f);
  const doc = JSON.parse(fs.readFileSync(p, "utf8"));
  let changed = false;
  for (const r of doc.reviews || []) {
    if (r.source === "serbia.alfamedstar.com" && r.rating === 5) {
      r.rating = 0;
      changed = true;
      stripped++;
    }
  }
  if (changed) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n", "utf8");
}
console.log(`stripped hardcoded rating on ${stripped} alfa reviews`);

const files = fs.readdirSync(dir).filter((x) => x.endsWith(".json"));
console.log(`doctors remaining: ${files.length}`);
