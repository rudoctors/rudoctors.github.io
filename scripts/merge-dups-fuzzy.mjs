/** Merge remaining cross-order name dups (FirstName LastName vs LastName FirstName). */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src", "data", "doctors");

function loadAll() {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      path: path.join(dir, f),
      doc: JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")),
    }));
}

function tokens(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/\s+/)
    .filter(Boolean);
}

function has(a, b) {
  const set = new Set(tokens(a));
  return tokens(b).every((t) => set.has(t));
}

function score(doc) {
  let s = 0;
  if (doc.experienceYears) s += 3;
  if (doc.photo) s += 2;
  if ((doc.reviews || []).length) s += 8;
  if (doc.bio) s += 2;
  if ((doc.education || []).length) s += 2;
  if (doc.nameEn) s += 1;
  if (tokens(doc.name).length >= 3) s += 2;
  if ((doc.sources || []).includes("serbia.alfamedstar.com")) s += 3;
  if ((doc.sources || []).includes("citilab.rs")) s += 2;
  if (Object.values(doc.contacts || {}).filter(Boolean).length >= 2) s += 1;
  return s;
}

function mergeInto(keep, drop) {
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
  if (!keep.specializationText && drop.specializationText) {
    keep.specializationText = drop.specializationText;
  }
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
  for (const l of drop.languages || []) {
    if (!keep.languages.includes(l)) keep.languages.push(l);
  }
  keep.contacts = { ...drop.contacts, ...keep.contacts };
  keep.sources = [...new Set([...(keep.sources || []), ...(drop.sources || [])])];
  keep.specializations = [
    ...new Set([...(keep.specializations || []), ...(drop.specializations || [])]),
  ];
  keep.updatedAt = new Date().toISOString().slice(0, 10);
}

const all = loadAll();
const deleted = new Set();

for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const A = all[i].doc;
    const B = all[j].doc;
    if (deleted.has(A.slug) || deleted.has(B.slug)) continue;
    if (A.slug === B.slug) continue;
    // name must be mutual subset (same person, order/extra patronymic differs)
    if (!(has(A.name, B.name) || has(B.name, A.name))) continue;
    // require at least 2 shared tokens
    const sa = new Set(tokens(A.name));
    const shared = tokens(B.name).filter((t) => sa.has(t)).length;
    if (shared < 2) continue;
    // avoid false positives: different cities + different first letters of city
    if (A.city && B.city && A.city !== B.city) continue;

    let keepEntry = all[i];
    let dropEntry = all[j];
    if (score(B) > score(A)) {
      keepEntry = all[j];
      dropEntry = all[i];
    }
    mergeInto(keepEntry.doc, dropEntry.doc);
    fs.writeFileSync(
      keepEntry.path,
      JSON.stringify(keepEntry.doc, null, 2) + "\n",
      "utf8"
    );
    fs.unlinkSync(dropEntry.path);
    deleted.add(dropEntry.doc.slug);
    console.log(`merged ${dropEntry.doc.slug} -> ${keepEntry.doc.slug}`);
  }
}

const left = loadAll().length;
console.log(`done; deleted ${deleted.size}; remaining ${left}`);
