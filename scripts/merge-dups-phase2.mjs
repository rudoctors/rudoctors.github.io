/**
 * Merge duplicate people detected after Phase 2 seed.
 * Priority: keep richer card (patronymic/full name, exp, photo, reviews, workplaces).
 * Sheet fields (contacts/languages) enrich; delete secondary slug.
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src", "data", "doctors");

function read(slug) {
  const p = path.join(dir, `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function write(doc) {
  const p = path.join(dir, `${doc.slug}.json`);
  fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

function score(doc) {
  if (!doc) return -1;
  let s = 0;
  if (doc.experienceYears) s += 3;
  if (doc.photo) s += 2;
  if ((doc.reviews || []).length) s += 5;
  if (doc.bio) s += 2;
  if ((doc.education || []).length) s += 2;
  if ((doc.workplaces || []).length && doc.workplaces[0]?.address) s += 2;
  if (doc.nameEn) s += 1;
  // prefer name with patronymic (3+ words)
  if (String(doc.name || "").trim().split(/\s+/).length >= 3) s += 2;
  // prefer citilab / alfa source markers
  if ((doc.sources || []).includes("citilab.rs")) s += 1;
  if ((doc.sources || []).includes("serbia.alfamedstar.com")) s += 1;
  // prefer long contact set
  if (Object.values(doc.contacts || {}).filter(Boolean).length >= 2) s += 1;
  return s;
}

function mergeInto(keep, drop) {
  keep.slug = keep.slug;
  keep.hidden = Boolean(keep.hidden || drop.hidden);
  keep.featured = Boolean(keep.featured || drop.featured);
  if (!keep.reviews) keep.reviews = [];
  const seen = new Set(keep.reviews.map((r) => r.id || r.text));
  for (const r of drop.reviews || []) {
    if (!seen.has(r.id) && !seen.has(r.text)) keep.reviews.push(r);
  }
  if (!keep.experienceYears && drop.experienceYears) keep.experienceYears = drop.experienceYears;
  if (!keep.photo && drop.photo) keep.photo = drop.photo;
  if (!keep.bio && drop.bio) keep.bio = drop.bio;
  if (!keep.nameEn && drop.nameEn) keep.nameEn = drop.nameEn;
  if ((drop.education || []).length > (keep.education || []).length) {
    keep.education = drop.education;
  }
  if ((drop.workplaces || []).length > (keep.workplaces || []).length) {
    keep.workplaces = drop.workplaces;
  } else if (drop.workplaces?.length && keep.workplaces?.length) {
    const a = keep.workplaces[0];
    const b = drop.workplaces[0];
    if (!a.address && b.address) a.address = b.address;
    if ((!a.clinic || a.clinic === "—") && b.clinic && b.clinic !== "—") a.clinic = b.clinic;
    if (!a.url && b.url) a.url = b.url;
  }
  if (!keep.languages?.length && drop.languages?.length) {
    keep.languages = drop.languages;
  } else if (drop.languages) {
    for (const l of drop.languages) {
      if (!keep.languages.includes(l)) keep.languages.push(l);
    }
  }
  keep.contacts = { ...drop.contacts, ...keep.contacts };
  keep.sources = [...new Set([...(keep.sources || []), ...(drop.sources || [])])];
  // union specializations, preserve primary
  const specs = [...new Set([...(keep.specializations || []), ...(drop.specializations || [])])];
  keep.specializations = specs;
  if (drop.specializationText && (!keep.specializationText || keep.specializationText.length < drop.specializationText.length)) {
    // keep more specific / longer text only if primary came from weaker source
    if (!keep.specializationText) keep.specializationText = drop.specializationText;
  }
  keep.updatedAt = new Date().toISOString().slice(0, 10);
  return keep;
}

// Apply merges with score-based keep when PAIRS not authoritative
const processed = new Set();
const merges = [
  ["borisova-mariya-evgenevna", "borisova-mariya"],
  ["gusakov-andrey-andreevich", "gusakov-andrey"],
  ["meshkova-ekaterina-mihaylovna", "meshkova-ekaterina"],
  ["rzaeva-kular-mamedovna", "rzaeva-kular"],
  ["tokmakova-kristina", "tokmakova-kristina-olegovna"], // alfa richest
  ["kristina-tokmakova", "tokmakova-kristina-olegovna"],
  ["ekaterina-meshkova", "meshkova-ekaterina-mihaylovna"],
  ["ekaterina-meshkova", "meshkova-ekaterina"],
  ["kolchev-sergey-aleksandrovich", "sergey-aleksandrovich-kolchev"],
  ["ostanina-yuliya-viktorovna", "yuliya-ostanina"],
  ["lazyovskiy-semen", "semen-lazovskiy"],
  ["lazovskiy-semen", "semen-lazovskiy"],
  ["melihov-kirill", "kirill-melihov"],
  ["prihotkov-kirill", "kirill-prikhotkov"],
  ["kim-polina-igorevna", "polina-kim"],
  ["andreeva-kristina", "kristina-andreeva"],
  ["andreeva-tatyana", "tatiana-andreeva"],
  ["yarushina-tatyana", "tatiana-iarushina"],
  ["hvostikova-dina-evgenevna", "dina-hvostikova"],
  ["mukaev-timur", "timur-mukaev"],
  ["shafikov-artem-maratovich", "artem-shafikov"],
  ["nesterenko-daniil-aleksandrovich", "daniil-nesterenko"],
  ["lebedev-aleksey", "aleksei-lebedev"],
  ["nerushay-aleksey", "aleksei-nerushai"],
  ["pravov-aleksey", "aleksej-pravov"],
];

let deleted = 0;
for (const [keepSlug, dropSlug] of merges) {
  if (keepSlug === dropSlug) continue;
  if (processed.has(dropSlug)) continue;
  const keep = read(keepSlug);
  const drop = read(dropSlug);
  if (!keep || !drop) continue;

  // if drop is clearly richer and keep is thin, swap
  let k = keep;
  let d = drop;
  if (score(drop) > score(keep) + 2) {
    k = drop;
    d = keep;
  }

  mergeInto(k, d);
  write(k);
  const p = path.join(dir, `${d.slug}.json`);
  if (fs.existsSync(p) && d.slug !== k.slug) {
    fs.unlinkSync(p);
    deleted++;
    processed.add(d.slug);
    processed.add(k.slug);
    console.log(`merged: ${d.slug} -> ${k.slug}`);
  }
}

// report remaining
const rows = fs
  .readdirSync(dir)
  .filter((x) => x.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
console.log(`deleted ${deleted}; total now ${rows.length}`);
