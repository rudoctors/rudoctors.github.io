/**
 * Seed: transform public sources into src/data/doctors/*.json
 * Sources:
 *  - scripts/rudoctors-raw.json (https://rusdoctors.net/api/doctors)
 *  - scripts/alfa-doctors.json (https://serbia.alfamedstar.com doctors + reviews)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "src", "data", "doctors");
const photosDir = path.join(root, "public", "photos");

fs.mkdirSync(outDir, { recursive: true });

const CYR = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  " ": "-", ".": "", ",": "", "'": "", "\"": "", "’": "",
};

function slugify(input) {
  const s = String(input || "").toLowerCase().trim();
  let out = "";
  for (const ch of s) {
    if (CYR[ch] !== undefined) out += CYR[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else if (/[\s\-_/]/.test(ch)) out += "-";
  }
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function parseCities(city) {
  if (!city) return "Belgrade";
  return String(city).split(",").map((c) => c.trim()).filter(Boolean)[0] || "Belgrade";
}

function splitDistrict(area) {
  return area || undefined;
}

function langList(languages) {
  if (!Array.isArray(languages)) return ["ru"];
  return languages.map((l) => String(l).toLowerCase());
}

function formatsFrom(d) {
  const f = [];
  if (d.accepts_offline !== false) f.push("offline");
  if (d.accepts_online) f.push("online");
  return f.length ? f : ["offline"];
}

function normalizeDate(s) {
  if (!s) return "";
  const dm = String(s).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dm) return `${dm[3]}-${dm[2]}-${dm[1]}`;
  const iso = String(s).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
}

function educationList(ed) {
  if (!Array.isArray(ed)) return [];
  return ed.map((e) => ({
    degree: e.degree || String(e),
    institution: e.institution || undefined,
    years: e.years || undefined,
  }));
}

function workplacesFrom(d) {
  const ws = [];
  if (d.clinic_name || d.address) {
    ws.push({
      clinic: d.clinic_name || "—",
      address: d.address || undefined,
      city: parseCities(d.city),
      district: splitDistrict(d.area),
      url: d.clinic_url || undefined,
      mapsUrl: d.google_maps_url || undefined,
    });
  }
  return ws;
}

function photoFor(d) {
  const p = path.join(photosDir, `rd-${d.id}.jpg`);
  if (fs.existsSync(p)) return `/photos/rd-${d.id}.jpg`;
  return undefined;
}

const usedSlugs = new Set();

function fixEncoding(s) {
  if (typeof s !== "string") return s;
  return s
    .replace(/Ð/g, "Đ")
    .replace(/ð/g, "đ")
    .replace(/Ñ/g, "Š")
    .replace(/ñ/g, "š");
}

function deepFix(v) {
  if (typeof v === "string") return fixEncoding(v);
  if (Array.isArray(v)) return v.map(deepFix);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = deepFix(val);
    return o;
  }
  return v;
}

function readJson(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  return deepFix(JSON.parse(raw));
}

function uniqueSlug(base) {
  let s = base || "doctor";
  let i = 2;
  while (usedSlugs.has(s)) {
    s = `${base}-${i++}`;
  }
  usedSlugs.add(s);
  return s;
}

// --- rusdoctors ---
const rdPath = path.join(__dirname, "rudoctors-raw.json");
let seed = [];
if (fs.existsSync(rdPath)) {
  const raw = readJson(rdPath);
  for (const d of raw) {
    if (d.status && d.status !== "approved") continue;
    const nameEn = d.full_name_en || undefined;
    const base = slugify(nameEn || d.full_name) || `rd-${d.id}`;
    const slug = uniqueSlug(base);
    const specKeys = Array.isArray(d.specialization_keys)
      ? d.specialization_keys.filter(Boolean)
      : [];
    let specializations = specKeys.length
      ? specKeys
      : d.specialization
        ? [slugify(d.specialization)]
        : ["therapist"];
    specializations = specializations.map((s) => String(s || "").trim()).filter(Boolean);
    if (!specializations.length) specializations = ["therapist"];

    seed.push({
      slug,
      name: d.full_name,
      nameEn,
      specializations,
      specializationText: d.specialization || undefined,
      photo: photoFor(d),
      experienceYears:
        typeof d.experience_years === "number" && d.experience_years > 0
          ? d.experience_years
          : undefined,
      city: parseCities(d.city),
      district: splitDistrict(d.area),
      languages: langList(d.languages),
      formats: formatsFrom(d),
      bio: d.bio || undefined,
      education: educationList(d.education),
      workplaces: workplacesFrom(d),
      contacts: {
        phone: d.contact_phone || undefined,
        email: d.contact_email || undefined,
        telegram: d.telegram || undefined,
        website: d.website || undefined,
        appointmentUrl: d.appointment_url || undefined,
        mapsUrl: d.google_maps_url || undefined,
      },
      reviews: [],
      hidden: false,
      featured: Boolean(d.top_boosted_at),
      sources: ["rusdoctors.net"],
      updatedAt: (d.updated_at || new Date().toISOString()).slice(0, 10),
    });
  }
}

// --- alfamedstar (reviews) ---
const alfaPath = path.join(__dirname, "alfa-doctors.json");
const EN_SPEC = {
  gynecologist: "gynecologist",
  otolaryngologist: "otorhinolaryngologist",
  endocrinologist: "endocrinologist",
  psychiatrist: "psychiatrist",
  pediatrician: "pediatrician",
  neurologist: "neurologist",
  cardiologist: "cardiologist",
  "general practitioner": "therapist",
  physician: "therapist",
  "Психиатр": "psychiatrist",
  "Эндокринолог": "endocrinologist",
};

function mapSpec(text) {
  if (!text) return ["therapist"];
  const t = String(text).toLowerCase();
  for (const [k, v] of Object.entries(EN_SPEC)) {
    if (t.includes(k.toLowerCase())) return [v];
  }
  if (t.includes("pediatric endocrin")) return ["child_endocrinologist", "pediatrician"];
  return ["therapist"];
}

function guessExp(text, explicit) {
  const n = Number(explicit);
  if (Number.isFinite(n) && n >= 1 && n <= 60) return n;
  const m = String(text || "").match(/Experience:?\s*over\s*(\d+)\s*years/i);
  if (m) return Number(m[1]);
  return undefined;
}

if (fs.existsSync(alfaPath)) {
  const alfa = readJson(alfaPath);
  for (const a of alfa) {
    const titleName = (a.title || "")
      .replace(/^Dr\s+/i, "")
      .split(/\s+-\s+/)[0]
      .trim();
    if (!titleName) continue;

    // try merge with existing by name similarity
    const nameSlug = slugify(titleName);
    let existing = seed.find(
      (s) => slugify(s.name) === nameSlug || slugify(s.nameEn || "") === nameSlug || s.slug === nameSlug
    );

    const reviews = (a.reviews || []).map((text, i) => ({
      id: `alfa-${a.slug}-${i}`,
      author: (a.authors && a.authors[i]) || "Пациент",
      date: normalizeDate((a.dates && a.dates[i]) || ""),
      rating: 5,
      text: String(text || "").trim(),
      source: "serbia.alfamedstar.com",
    })).filter((r) => r.text);

    // explicit scrape value "2" was a false positive for all alfa doctors
    const exp = guessExp("", a.exp === "2" ? undefined : a.exp);

    if (existing) {
      existing.reviews = [...(existing.reviews || []), ...reviews];
      if (!existing.experienceYears && exp) existing.experienceYears = exp;
      if (!existing.sources.includes("serbia.alfamedstar.com")) {
        existing.sources.push("serbia.alfamedstar.com");
      }
      existing.updatedAt = new Date().toISOString().slice(0, 10);
    } else {
      const slug = uniqueSlug(nameSlug || a.slug);
      seed.push({
        slug,
        name: titleName,
        nameEn: titleName,
        specializations: mapSpec(a.spec),
        specializationText: a.spec || undefined,
        photo: undefined,
        experienceYears: exp,
        city: "Belgrade",
        district: undefined,
        languages: ["ru", "en", "sr"],
        formats: ["offline"],
        bio: undefined,
        education: [],
        workplaces: [
          {
            clinic: "AlfaMedStar",
            address: "Milentija Popovića 5v, Beograd 11000",
            city: "Belgrade",
            district: "Нови-Београд",
            url: "https://serbia.alfamedstar.com/",
          },
        ],
        contacts: {
          website: `https://serbia.alfamedstar.com/en/doctors/${a.slug}`,
          appointmentUrl: "https://serbia.alfamedstar.com/en/doctors",
        },
        reviews,
        hidden: false,
        featured: false,
        sources: ["serbia.alfamedstar.com"],
        updatedAt: new Date().toISOString().slice(0, 10),
      });
    }
  }
}

// write
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith(".json")) fs.unlinkSync(path.join(outDir, f));
}

for (const doc of seed) {
  const file = path.join(outDir, `${doc.slug}.json`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

const withReviews = seed.filter((d) => d.reviews.length > 0).length;
console.log(
  `Seeded ${seed.length} doctors, ${withReviews} with reviews, total reviews ${seed.reduce((n, d) => n + d.reviews.length, 0)}`
);
