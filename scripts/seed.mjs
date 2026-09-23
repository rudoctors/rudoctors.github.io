/**
 * Seed: transform public sources into src/data/doctors/*.json
 * Sources:
 *  - scripts/rudoctors-raw.json (https://rusdoctors.net/api/doctors)
 *  - scripts/alfa-doctors.json (https://serbia.alfamedstar.com doctors + reviews)
 * Merge-in-place: never wipe admin/manual cards (hidden/featured/manual reviews).
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
  const webp = path.join(photosDir, `rd-${d.id}.webp`);
  if (fs.existsSync(webp)) return `/photos/rd-${d.id}.webp`;
  const p = path.join(photosDir, `rd-${d.id}.jpg`);
  if (fs.existsSync(p)) return `/photos/rd-${d.id}.jpg`;
  return undefined;
}

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

// load existing cards first (preserve admin/manual fields)
const existingBySlug = new Map();
if (fs.existsSync(outDir)) {
  for (const f of fs.readdirSync(outDir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const doc = readJson(path.join(outDir, f));
      if (doc?.slug) existingBySlug.set(doc.slug, doc);
    } catch {
      // skip unreadable; CI fail-fast in loadDoctors
    }
  }
}

const usedSlugs = new Set(existingBySlug.keys());

function uniqueSlug(base) {
  let s = base || "doctor";
  let i = 2;
  while (usedSlugs.has(s)) {
    s = `${base}-${i++}`;
  }
  usedSlugs.add(s);
  return s;
}

function nameTokens(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/\s+/)
    .filter(Boolean);
}

function namesMatch(a, b) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta.length === 1 || tb.length === 1) return ta[0] === tb[0];
  // mutual subset (order-independent; extra patronymic ok)
  const sa = new Set(ta);
  const sb = new Set(tb);
  const shared = ta.filter((t) => sb.has(t)).length;
  if (shared < 2) return false;
  return ta.every((t) => sb.has(t)) || tb.every((t) => sa.has(t));
}

function findExisting(nameCandidates) {
  const names = nameCandidates.filter(Boolean);
  for (const doc of existingBySlug.values()) {
    if (names.some((n) => namesMatch(n, doc.name) || namesMatch(n, doc.nameEn))) {
      return doc;
    }
    // exact slugify fallback
    const dn = slugify(doc.name || "");
    const de = slugify(doc.nameEn || "");
    if (names.map((n) => slugify(n)).some((k) => k && (k === dn || k === de))) {
      return doc;
    }
  }
  return null;
}

function upsert(doc) {
  const found = existingBySlug.get(doc.slug) || findExisting([doc.name, doc.nameEn]);
  if (!found) {
    existingBySlug.set(doc.slug, doc);
    return doc;
  }
  found.hidden = Boolean(found.hidden);
  found.featured = Boolean(found.featured || doc.featured);
  if (!found.reviews) found.reviews = [];
  if (doc.reviews?.length) {
    const seen = new Set(found.reviews.map((r) => r.id || r.text));
    for (const r of doc.reviews) {
      if (!seen.has(r.id) && !seen.has(r.text)) found.reviews.push(r);
    }
  }
  if (!found.experienceYears && doc.experienceYears) found.experienceYears = doc.experienceYears;
  if (!found.photo && doc.photo) found.photo = doc.photo;
  if (!found.bio && doc.bio) found.bio = doc.bio;
  if (!found.education?.length && doc.education?.length) found.education = doc.education;
  if (!found.workplaces?.length && doc.workplaces?.length) found.workplaces = doc.workplaces;
  if (!found.languages?.length && doc.languages?.length) found.languages = doc.languages;
  found.contacts = { ...doc.contacts, ...found.contacts };
  found.sources = [...new Set([...(found.sources || []), ...(doc.sources || [])])];
  found.updatedAt = doc.updatedAt || found.updatedAt;
  doc.slug = found.slug;
  return found;
}

// --- rusdoctors ---
const rdPath = path.join(__dirname, "rudoctors-raw.json");
const seed = [];
if (fs.existsSync(rdPath)) {
  const raw = readJson(rdPath);
  for (const d of raw) {
    if (d.status && d.status !== "approved") continue;
    const nameEn = d.full_name_en || undefined;
    const base = slugify(nameEn || d.full_name) || `rd-${d.id}`;
    const slug = usedSlugs.has(base) ? base : uniqueSlug(base);
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

    const card = upsert({
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
    if (card && !seed.includes(card)) seed.push(card);
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
    const titleName = (a.titleName || a.title || "")
      .replace(/^Dr\s+/i, "")
      .split(/\s+-\s+/)[0]
      .trim();
    if (!titleName) continue;

    const nameSlug = slugify(titleName);
    const existing = findExisting([titleName, a.titleName]) || seed.find((s) => s.slug === nameSlug);

    // no fake stars: rating 0 = text-only review
    const reviews = (a.reviews || []).map((text, i) => ({
      id: `alfa-${a.slug}-${i}`,
      author: (a.authors && a.authors[i]) || "Пациент",
      date: normalizeDate((a.dates && a.dates[i]) || ""),
      rating: 0,
      text: String(text || "").trim(),
      source: "serbia.alfamedstar.com",
    })).filter((r) => r.text);

    const exp = guessExp("", a.exp === "2" ? undefined : a.exp);

    if (existing) {
      const seen = new Set((existing.reviews || []).map((r) => r.id || r.text));
      for (const r of reviews) {
        if (!seen.has(r.id) && !seen.has(r.text)) existing.reviews.push(r);
      }
      if (!existing.experienceYears && exp) existing.experienceYears = exp;
      if (!existing.sources.includes("serbia.alfamedstar.com")) {
        existing.sources.push("serbia.alfamedstar.com");
      }
      existing.updatedAt = new Date().toISOString().slice(0, 10);
      if (!seed.includes(existing)) seed.push(existing);
    } else {
      const slug = uniqueSlug(nameSlug || a.slug);
      const card = upsert({
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
      if (card && !seed.includes(card)) seed.push(card);
    }
  }
}

// --- Google Sheets (public CSV → scripts/sheet-doctors.json) ---
const sheetPath = path.join(__dirname, "sheet-doctors.json");
const SPEC_KEYWORDS = [
  [/терапевт|общ(ей|ая)\s+практик|internista/i, "therapist"],
  [/педиатр|неонатолог/i, "pediatrician"],
  [/кардиолог/i, "cardiologist"],
  [/невролог/i, "neurologist"],
  [/психиатр|психотерапевт/i, "psychiatrist"],
  [/эндокринолог/i, "endocrinologist"],
  [/гинеколог|акушер/i, "gynecologist"],
  [/дерматолог|косметолог|трихолог/i, "dermatologist"],
  [/гастроэнтеролог/i, "gastroenterologist"],
  [/пульмонолог|аллерголог/i, "pulmonologist"],
  [/ревматолог/i, "therapist"],
  [/инфекционист/i, "therapist"],
  [/гематолог/i, "hematologist"],
  [/уролог/i, "urologist"],
  [/хирург/i, "surgeon"],
  [/лор|оториноларинголог/i, "otorhinolaryngologist"],
  [/нарколог/i, "narcologist"],
  [/офтальмолог/i, "ophthalmologist"],
];

function mapSpecRu(text) {
  if (!text) return ["therapist"];
  for (const [re, key] of SPEC_KEYWORDS) {
    if (re.test(text)) return [key];
  }
  return ["therapist"];
}

function parseSheetCity(city) {
  const s = String(city || "");
  if (/нови\s*сад/i.test(s)) return "Novi Sad";
  if (/ниш/i.test(s)) return "Niš";
  if (/белград|београд|belgrade/i.test(s)) return "Belgrade";
  if (/суботица/i.test(s)) return "Subotica";
  if (/онлайн|черногор/i.test(s)) return "Belgrade";
  return "Belgrade";
}

function parseSheetLangs(langs) {
  const s = String(langs || "").toLowerCase();
  const out = [];
  if (/рус/.test(s)) out.push("ru");
  if (/серб/.test(s)) out.push("sr");
  if (/англ/.test(s)) out.push("en");
  if (/немец/.test(s)) out.push("de");
  if (/франц/.test(s)) out.push("fr");
  if (/испан/.test(s)) out.push("es");
  if (/итальян/.test(s)) out.push("it");
  return out.length ? [...new Set(out)] : ["ru"];
}

function extractSheetContacts(contacts) {
  const s = String(contacts || "");
  const phoneM = s.match(/(?:\+381|0)[\d\s\-()]{6,}/);
  const tgM = s.match(/https?:\/\/t\.me\/[\w]+|@[\w]{4,}/);
  const emailM = s.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const siteM = s.match(/https?:\/\/(?!t\.me)[^\s,]+/);
  const phone = phoneM ? phoneM[0].replace(/\s+/g, " ").trim() : undefined;
  let telegram;
  if (tgM) {
    const t = tgM[0];
    telegram = t.startsWith("@") ? `https://t.me/${t.slice(1)}` : t;
  }
  return {
    phone,
    email: emailM,
    telegram,
    website: siteM && !/t\.me|maps\.app|instagram|facebook/i.test(siteM[0]) ? siteM[0] : undefined,
  };
}

function clinicFromContacts(contacts) {
  const s = String(contacts || "");
  const m = s.match(
    /(клиника\s+[^\n,]+|поликлиника\s+[^\n,]+|MediGroup|Citilab|CITILAB|СИТИЛАБ|AlfaMedStar|Vizim|Doctorus|Equilibrium|Best\s*Medica|NeoKIDS|Miren Medic|Family Medica|Doktor Semenov|Tesla Medical|Euromedik)/i
  );
  if (!m) return undefined;
  return m[0].replace(/\s+/g, " ").trim();
}

if (fs.existsSync(sheetPath)) {
  const sheet = readJson(sheetPath);
  for (const s of sheet) {
    if (!s?.name) continue;
    const existing = findExisting([s.name]);
    const contacts = extractSheetContacts(s.contacts);
    const clinic = clinicFromContacts(s.contacts);
    const city = parseSheetCity(s.city);
    const languages = parseSheetLangs(s.languages);
    const specializations = mapSpecRu(s.specialization || s.section);
    const sources = ["google-sheets", "t.me/vrachivserbii"];

    if (existing) {
      // enrich without overwriting richer fields
      if (!existing.languages?.length) existing.languages = languages;
      else {
        for (const l of languages) if (!existing.languages.includes(l)) existing.languages.push(l);
      }
      existing.contacts = { ...contacts, ...existing.contacts };
      if (clinic && !existing.workplaces?.length) {
        existing.workplaces = [{ clinic, city }];
      } else if (clinic && existing.workplaces?.length && !existing.workplaces[0].clinic) {
        existing.workplaces[0].clinic = clinic;
      }
      if (!existing.specializationText && s.specialization) {
        existing.specializationText = s.specialization;
      }
      // add missing specializations
      for (const sp of specializations) {
        if (!existing.specializations.includes(sp)) existing.specializations.push(sp);
      }
      existing.sources = [...new Set([...(existing.sources || []), ...sources])];
      existing.updatedAt = new Date().toISOString().slice(0, 10);
      if (!seed.includes(existing)) seed.push(existing);
    } else {
      const slug = uniqueSlug(slugify(s.name) || `sheet-${slugify(s.name)}`);
      const card = upsert({
        slug,
        name: s.name,
        specializations,
        specializationText: s.specialization || s.section || undefined,
        photo: undefined,
        experienceYears: undefined,
        city,
        district: undefined,
        languages,
        formats: /онлайн/i.test(s.city || "") ? ["online"] : ["offline"],
        bio: s.documents ? `Документы: ${s.documents}` : undefined,
        education: [],
        workplaces: clinic ? [{ clinic, city }] : [],
        contacts,
        reviews: [],
        hidden: false,
        featured: false,
        sources,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      if (card && !seed.includes(card)) seed.push(card);
    }
  }
}

// --- citilab.rs (scripts/citilab-doctors.json) ---
const citiPath = path.join(__dirname, "citilab-doctors.json");
if (fs.existsSync(citiPath)) {
  const citi = readJson(citiPath);
  for (const c of citi) {
    if (!c?.name) continue;
    const existing = findExisting([c.name]);
    const specializations = mapSpecRu(c.specialization);
    const phone = c.phone || undefined;
    const photo = c.photo ? (c.photo.startsWith("/") ? c.photo : `/${c.photo}`) : undefined;

    if (existing) {
      if (!existing.experienceYears && c.experienceYears) {
        existing.experienceYears = c.experienceYears;
      }
      if (!existing.photo && photo) existing.photo = photo;
      existing.contacts = {
        phone,
        appointmentUrl: c.appointmentUrl || undefined,
        website: c.detailUrl || undefined,
        ...existing.contacts,
      };
      if (c.address && !existing.workplaces?.length) {
        existing.workplaces = [
          { clinic: "CITILAB", address: c.address, city: "Belgrade" },
        ];
      } else if (c.address && existing.workplaces?.[0]) {
        existing.workplaces[0].address = existing.workplaces[0].address || c.address;
        if (!existing.workplaces[0].clinic || existing.workplaces[0].clinic === "—") {
          existing.workplaces[0].clinic = "CITILAB";
        }
      }
      if (!existing.specializationText && c.specialization) {
        existing.specializationText = c.specialization;
      }
      existing.sources = [
        ...new Set([...(existing.sources || []), "citilab.rs"]),
      ];
      existing.updatedAt = new Date().toISOString().slice(0, 10);
      if (!seed.includes(existing)) seed.push(existing);
    } else {
      const slug = uniqueSlug(slugify(c.name) || c.slug);
      const card = upsert({
        slug,
        name: c.name,
        specializations,
        specializationText: c.specialization || undefined,
        photo,
        experienceYears: c.experienceYears,
        city: "Belgrade",
        district: undefined,
        languages: ["ru", "sr"],
        formats: ["offline"],
        bio: undefined,
        education: [],
        workplaces: [
          {
            clinic: "CITILAB",
            address: c.address || undefined,
            city: "Belgrade",
            url: "https://citilab.rs/ru/",
          },
        ],
        contacts: {
          phone,
          appointmentUrl: c.appointmentUrl || undefined,
          website: c.detailUrl || undefined,
        },
        reviews: [],
        hidden: false,
        featured: false,
        sources: ["citilab.rs"],
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      if (card && !seed.includes(card)) seed.push(card);
    }
  }
}

// write merge-in-place: never wipe admin/manual cards
const bySlug = new Map();
for (const doc of [...existingBySlug.values(), ...seed]) {
  bySlug.set(doc.slug, doc);
}

const toWrite = [...bySlug.values()];
for (const doc of toWrite) {
  const file = path.join(outDir, `${doc.slug}.json`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

const keepFiles = new Set(toWrite.map((d) => `${d.slug}.json`));
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith(".json") && !keepFiles.has(f)) {
    fs.unlinkSync(path.join(outDir, f));
  }
}

const withReviews = toWrite.filter((d) => (d.reviews || []).length > 0).length;
const withExp = toWrite.filter((d) => d.experienceYears).length;
console.log(
  `Seeded ${toWrite.length} doctors (merge-in-place), ${withReviews} with reviews, ${withExp} with experience, total reviews ${toWrite.reduce((n, d) => n + (d.reviews?.length || 0), 0)}`
);
