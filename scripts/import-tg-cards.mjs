import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const doctorsDir = path.join(root, "src", "data", "doctors");
const parsedDir = path.join(root, "scripts", "tg-parsed");
const shouldWrite = process.argv.includes("--write");
const today = new Date().toISOString().slice(0, 10);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function optionalJson(file) {
  const full = path.join(parsedDir, file);
  return fs.existsSync(full) ? readJson(full) : [];
}

function sourceJson(file) {
  const full = path.join(root, "scripts", file);
  return fs.existsSync(full) ? readJson(full) : [];
}

const specialties = readJson(path.join(root, "src", "data", "specialties.json"));
const allowedSpecialties = new Set(Object.keys(specialties));

const candidateFiles = [
  "verify-new-0-62.json",
  "verify-new-63-125.json",
  "verify-new-126-188.json",
  "review-only-anchored.json",
];

const sourceMessages = new Map(
  [...sourceJson("tg-export-visitkas.json"), ...sourceJson("tg-export-recommendations.json"), ...sourceJson("tg-export-reviews.json")].map((message) => [message.id, message])
);

const fixByName = new Map(
  (optionalJson("import-fix-candidates.json").candidates || []).map((row) => [row.name, row])
);
const heldNames = new Set(
  (optionalJson("import-reject-candidates.json").candidates || [])
    .filter((row) => row.disposition === "hold-for-manual-specialty")
    .map((row) => row.name)
);
const practiceTelegramNames = new Set([
  "Мельников Евгений Андреевич",
  "Антон Трапезников",
]);

const candidates = candidateFiles.flatMap((file) =>
  optionalJson(file).map((row) => {
    const base = row.verified || row;
    const candidate = { ...base, sourceFile: file };
    candidate.sourceMsgIds = [...new Set([...(row.sourceMsgIds || []), ...(base.sourceMsgIds || []), base.msgId].filter(Boolean))];
    candidate.sourceMsgUrls = [
      ...new Set([
        ...(row.sourceMsgUrls || []),
        ...(base.sourceMsgUrls || []),
        base.msgUrl,
        ...candidate.sourceMsgIds.map((id) => sourceMessages.get(id)?.url),
      ].filter(Boolean)),
    ];
    candidate.sourceText = candidate.sourceMsgIds.map((id) => sourceMessages.get(id)?.text || "").filter(Boolean).join("\n");
    return candidate;
  })
);

const existingReviewFiles = [
  "publish-reviews-0-31.json",
  "publish-reviews-32-end.json",
];

const newReviewFiles = [
  "publish-reviews-new-0-45.json",
  "publish-reviews-new-46-91.json",
  "publish-reviews-new-92-136.json",
];

const existingFiles = fs
  .readdirSync(doctorsDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({ file, doc: readJson(path.join(doctorsDir, file)) }));

const titleTokens = new Set([
  "dr",
  "dr.",
  "doc",
  "доктор",
  "докторка",
  "профессор",
  "prof",
  "professor",
  "медик",
  "med",
]);

const translit = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", ј: "j", й: "y", к: "k", л: "l", љ: "lj", м: "m", н: "n",
  њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f",
  х: "h", ц: "c", ч: "ch", џ: "dz", ш: "sh", щ: "sch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterate(value) {
  let out = "";
  for (const char of String(value || "").toLowerCase()) {
    out += translit[char] ?? char;
  }
  return out;
}

function canonicalToken(value) {
  return transliterate(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đ]/g, "d")
    .replace(/[ž]/g, "z")
    .replace(/[š]/g, "s")
    .replace(/[čć]/g, "c")
    .replace(/[ő]/g, "o")
    .replace(/[ű]/g, "u")
    .replace(/dj/g, "d")
    .replace(/lj/g, "l")
    .replace(/nj/g, "n")
    .replace(/[^a-z0-9]+/g, "");
}

function nameTokens(value) {
  return transliterate(value)
    .split(/[\s,.;:()[\]{}\-]+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]+/gu, ""))
    .map(canonicalToken)
    .filter((token) => token && !titleTokens.has(token));
}

function nameKey(value) {
  return [...new Set(nameTokens(value))].sort().join("|");
}

function namesMatch(a, b) {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (!ta.size || !tb.size) return false;
  const shared = [...ta].filter((token) => tb.has(token)).length;
  if (shared === ta.size && shared === tb.size) return true;
  const shorter = ta.size <= tb.size ? ta : tb;
  return shared === shorter.size && shared >= 2;
}

function firstValue(value) {
  if (Array.isArray(value)) return value.find((item) => item != null && String(item).trim()) || null;
  return value == null || !String(value).trim() ? null : value;
}

function safeHttpUrl(value) {
  const raw = firstValue(value);
  if (!raw) return undefined;
  const text = String(raw).trim();
  if (/^@[\w]{4,}$/.test(text)) return `https://t.me/${text.slice(1)}`;
  if (/^https?:\/\//i.test(text)) {
    try {
      return new URL(text).href;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function telegramUrl(value) {
  const raw = firstValue(value);
  if (!raw) return undefined;
  const text = String(raw).trim();
  if (/bot$/i.test(text.replace(/^@/, "").split("/").pop() || "")) return undefined;
  if (/^@[\w]{4,}$/.test(text)) return `https://t.me/${text.slice(1)}`;
  if (/^https?:\/\/(?:www\.)?t\.me\//i.test(text)) {
    return `https://t.me/${text.split("/").slice(3).join("/")}`;
  }
  if (/^https?:\/\/(?:www\.)?@/i.test(text)) {
    return `https://t.me/${text.replace(/^https?:\/\/(?:www\.)?@/i, "")}`;
  }
  return undefined;
}

function normalizeCity(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const patterns = [
    [/^(Belgrade|Beograd|Белград)$/i, "Belgrade"],
    [/^(Novi Sad|Нови Сад|Нови-Сад)$/i, "Novi Sad"],
    [/^(Niš|Nis|Ниш)$/i, "Niš"],
    [/^(Subotica|Суботица)$/i, "Subotica"],
    [/^(Zrenjanin|Зрењанин)$/i, "Zrenjanin"],
    [/^(Kragujevac|Крагујевац)$/i, "Kragujevac"],
    [/^(Sombor|Сомбор)$/i, "Sombor"],
    [/^(Leskovac|Лесковац)$/i, "Leskovac"],
    [/^(Vranje|Врање)$/i, "Vranje"],
    [/^(Čačak|Cacak|Чачак)$/i, "Čačak"],
    [/^(Novi Pazar|Нови Пазар)$/i, "Novi Pazar"],
    [/^(Pančevo|Pancevo|Панчево)$/i, "Pančevo"],
  ];
  for (const [pattern, city] of patterns) if (pattern.test(text)) return city;
  return text;
}

function inferCity(candidate) {
  const explicit = normalizeCity(candidate.city);
  if (explicit) return explicit;
  for (const workplace of candidate.workplaces || []) {
    const city = normalizeCity(workplace.city);
    if (city) return city;
  }
  const text = [
    candidate.bio,
    candidate.specializationText,
    candidate.specializationsText,
    candidate.sourceText,
    ...(candidate.evidenceAnchors || []).map((anchor) => anchor.quote),
  ]
    .filter(Boolean)
    .join(" ");
  const patterns = [
    [/Белград|Beograd|Belgrade/i, "Belgrade"],
    [/Нови[ -]?Сад|Novi Sad/i, "Novi Sad"],
    [/Суботица|Subotica/i, "Subotica"],
    [/Зрењанин|Zrenjanin/i, "Zrenjanin"],
    [/Ниш|Niš/i, "Niš"],
  ];
  for (const [pattern, city] of patterns) if (pattern.test(text)) return city;
  return null;
}

function inferSpecializations(candidate) {
  const override = fixByName.get(candidate.name);
  const removed = new Set(override?.removeSpecializations || []);
  const text = [
    candidate.specializationText,
    candidate.specializationsText,
    candidate.bio,
    candidate.role,
    ...(candidate.evidenceAnchors || []).map((anchor) => anchor.quote),
  ]
    .filter(Boolean)
    .join(" ");
  const rules = [
    [/онко.?маммолог|onco.?mammolog/i, ["mammologist", "oncologist"]],
    [/маммолог|mammolog/i, ["mammologist"]],
    [/радиолог|radiolog|\bмрт\b|\bкт\b/i, ["radiologist"]],
    [/физиатр|physiatr/i, ["physiatrist"]],
    [/пластическ.*хирург|plastic surgeon/i, ["plastic_surgeon"]],
    [/проктолог|proctolog/i, ["proctologist"]],
    [/остеопат|osteopath/i, ["osteopath"]],
    [/логопед|дефектолог|speech therapist/i, ["speech_therapist"]],
    [/диетолог|dietitian/i, ["dietitian"]],
    [/нутрициолог|nutritionist/i, ["nutritionist"]],
    [/онколог|oncolog/i, ["oncologist"]],
    [/гастроскоп|эндоскоп|эндоскопист|колоноскоп|gastroscop|endoscop/i, ["gastroenterologist"]],
    [/ультразвук|узи|узд|ultrasound/i, ["ultrasound_diagnostics"]],
    [/рентгенолог/i, ["radiologist"]],
    [/удален.*новообразован/i, ["surgeon"]],
    [/детск.*клиник|педиатр/i, ["pediatrician"]],
  ];
  const inferred = [];
  for (const [pattern, keys] of rules) {
    if (pattern.test(text)) inferred.push(...keys);
  }
  const keys = [...(candidate.specializations || []), ...inferred]
    .filter((key) => allowedSpecialties.has(key) && !removed.has(key));
  for (const key of override?.addSpecializations || []) {
    if (allowedSpecialties.has(key) && !removed.has(key)) keys.push(key);
  }
  return [...new Set(keys)];
}

function applyOverrides(candidate, city, contacts, workplaces, formats) {
  const override = fixByName.get(candidate.name);
  if (!override) return { candidate, city, contacts, workplaces, formats };
  if (override.setFields?.city) {
    city = normalizeCity(override.setFields.city) || city;
    workplaces = normalizeWorkplaces(candidate.workplaces, city);
  }
  if (override.setFields?.contacts) {
    Object.assign(contacts, normalizeContacts({ ...contacts, ...override.setFields.contacts }));
  }
  if (practiceTelegramNames.has(candidate.name)) delete contacts.telegram;
  if (override.setFields?.formats) formats = [...new Set(override.setFields.formats)];
  for (const field of override.removeContactFields || []) delete contacts[field];
  if (override.replaceContacts) {
    for (const [field, value] of Object.entries(override.replaceContacts)) {
      const normalized = field === "telegram" ? telegramUrl(value) : safeHttpUrl(value);
      if (normalized) contacts[field] = normalized;
    }
  }
  for (const id of override.addSourceMsgIds || []) {
    if (!candidate.sourceMsgIds.includes(id)) candidate.sourceMsgIds.push(id);
    const source = sourceMessages.get(id);
    if (source?.url && !candidate.sourceMsgUrls.includes(source.url)) candidate.sourceMsgUrls.push(source.url);
  }
  candidate.sourceMsgIds = [...new Set(candidate.sourceMsgIds)];
  candidate.sourceMsgUrls = [...new Set(candidate.sourceMsgUrls)];
  candidate.sourceText = candidate.sourceMsgIds.map((id) => sourceMessages.get(id)?.text || "").filter(Boolean).join("\n");
  return { candidate, city, contacts, workplaces, formats };
}

function normalizeContacts(contacts) {
  const input = contacts || {};
  const telegram = telegramUrl(input.telegram);
  const result = {};
  const phone = firstValue(input.phone);
  const email = firstValue(input.email);
  const website = safeHttpUrl(input.website) || safeHttpUrl(input.appointmentUrl);
  if (phone) result.phone = String(phone);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) result.email = String(email);
  if (telegram) result.telegram = telegram;
  if (website) result.website = website;
  if (input.appointmentUrl) {
    const appointmentUrl = safeHttpUrl(input.appointmentUrl);
    if (appointmentUrl) result.appointmentUrl = appointmentUrl;
  }
  if (input.mapsUrl) {
    const mapsUrl = safeHttpUrl(input.mapsUrl);
    if (mapsUrl) result.mapsUrl = mapsUrl;
  }
  return result;
}

function normalizeWorkplaces(workplaces, city) {
  const result = [];
  const seen = new Set();
  for (const workplace of workplaces || []) {
    const normalized = {
      clinic: String(workplace.clinic || "—").trim(),
      address: workplace.address ? String(workplace.address).trim() : undefined,
      city: normalizeCity(workplace.city) || city || undefined,
      url: safeHttpUrl(workplace.url),
      mapsUrl: safeHttpUrl(workplace.mapsUrl),
    };
    const key = JSON.stringify([normalized.clinic, normalized.address, normalized.city]);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function normalizeLanguages(languages) {
  const allowed = new Set(["ru", "sr", "en", "de", "fr", "es", "it", "pl", "uk", "bg", "ro", "hu", "hr", "bs", "mk", "tr", "zh"]);
  return [...new Set((Array.isArray(languages) ? languages : []).map((item) => String(item).toLowerCase()).filter((item) => allowed.has(item)))];
}

function slugify(value) {
  const text = transliterate(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đ]/g, "d")
    .replace(/[ž]/g, "z")
    .replace(/[š]/g, "s")
    .replace(/[čć]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return text || "doctor";
}

function reviewId(review) {
  return `tg-${String(review.id || review.source || review.text)
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)}`;
}

function normalizeReview(review) {
  const text = String(review.text || "").trim().slice(0, 600);
  if (!text) return null;
  return {
    id: reviewId(review),
    author: String(review.author || "Участник чата").trim(),
    date: /^\d{4}-\d{2}-\d{2}$/.test(review.date || "") ? review.date : today,
    text,
    source: review.source ? `Telegram: ${review.source}` : "Telegram: @vrachivserbii",
    lang: "ru",
  };
}

function mergeReviews(current, incoming) {
  const result = Array.isArray(current) ? [...current] : [];
  const seen = new Set(result.map((review) => review.id || `${review.source || ""}|${review.text || ""}`));
  for (const raw of incoming || []) {
    const review = normalizeReview(raw);
    if (!review) continue;
    const key = review.id || `${review.source}|${review.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(review);
  }
  return result;
}

function findExisting(candidate, existingDocs) {
  const names = [candidate.name, candidate.nameEn].filter(Boolean);
  return existingDocs.find((doc) =>
    [doc.name, doc.nameEn].filter(Boolean).some((name) => names.some((candidateName) => namesMatch(candidateName, name)))
  ) || null;
}

function mergeCandidate(into, candidate) {
  into.sourceMsgIds = [...new Set([...(into.sourceMsgIds || []), ...(candidate.sourceMsgIds || [candidate.msgId].filter(Boolean))])];
  into.sourceMsgUrls = [...new Set([...(into.sourceMsgUrls || []), ...(candidate.sourceMsgUrls || [candidate.msgUrl].filter(Boolean))])];
  into.variantNames = [...new Set([...(into.variantNames || [into.name]), candidate.name].filter(Boolean))];
  into.specializationText = into.specializationText || candidate.specializationText || candidate.specializationsText || null;
  into.bio = into.bio || candidate.bio || null;
  into.nameEn = into.nameEn || candidate.nameEn || null;
  for (const workplace of candidate.workplaces || []) {
    const key = JSON.stringify([workplace.clinic || "", workplace.address || "", normalizeCity(workplace.city) || ""]);
    if (!(into.workplaceKeys || new Set()).has(key)) {
      into.workplaces = [...(into.workplaces || []), workplace];
      into.workplaceKeys.add(key);
    }
  }
}

const reviewsBySlug = new Map();
for (const file of existingReviewFiles) {
  for (const row of optionalJson(file)) {
    if (!row.slug) continue;
    reviewsBySlug.set(row.slug, [...(reviewsBySlug.get(row.slug) || []), ...(row.evidence || [])]);
  }
}

const reviewsByName = new Map();
for (const file of newReviewFiles) {
  for (const row of optionalJson(file)) {
    const key = nameKey(row.name);
    if (!key) continue;
    reviewsByName.set(key, [...(reviewsByName.get(key) || []), ...(row.evidence || [])]);
  }
}

const existingDocs = existingFiles.map((entry) => entry.doc);
const grouped = new Map();
const skipped = [];
const existingMatches = [];

for (const candidate of candidates) {
  if (heldNames.has(candidate.name)) {
    skipped.push({ name: candidate.name, reason: "manual-specialty-required" });
    continue;
  }
  const matched = findExisting(candidate, existingDocs);
  if (matched) {
    existingMatches.push({ candidate: candidate.name, slug: matched.slug, sourceMsgIds: candidate.sourceMsgIds || [candidate.msgId] });
    continue;
  }
  const key = nameKey(candidate.name);
  if (!key || nameTokens(candidate.name).length < 2) {
    skipped.push({ name: candidate.name, reason: "invalid-or-short-name" });
    continue;
  }
  if (!grouped.has(key)) {
    grouped.set(key, {
      ...candidate,
      key,
      workplaces: [...(candidate.workplaces || [])],
      workplaceKeys: new Set((candidate.workplaces || []).map((workplace) => JSON.stringify([workplace.clinic || "", workplace.address || "", normalizeCity(workplace.city) || ""]))),
      sourceMsgIds: [...(candidate.sourceMsgIds || [candidate.msgId].filter(Boolean))],
      sourceMsgUrls: [...(candidate.sourceMsgUrls || [candidate.msgUrl].filter(Boolean))],
      variantNames: [candidate.name],
    });
  } else {
    mergeCandidate(grouped.get(key), candidate);
  }
}

const generated = [];
const usedSlugs = new Set(existingDocs.map((doc) => doc.slug));

for (const sourceCandidate of grouped.values()) {
  let candidate = sourceCandidate;
  let city = inferCity(candidate);
  let specializationKeys = inferSpecializations(candidate);
  let contacts = normalizeContacts(candidate.contacts);
  let workplaces = normalizeWorkplaces(candidate.workplaces, city);
  const text = [candidate.bio, candidate.specializationText, candidate.specializationsText].filter(Boolean).join(" ");
  let formats = [];
  if (workplaces.length) formats.push("offline");
  if (/онлайн|online/i.test(text)) formats.push("online");
  ({ candidate, city, contacts, workplaces, formats } = applyOverrides(candidate, city, contacts, workplaces, formats));
  specializationKeys = inferSpecializations(candidate);
  if (!city) {
    skipped.push({ name: candidate.name, reason: "no-city" });
    continue;
  }
  if (!specializationKeys.length) {
    skipped.push({ name: candidate.name, reason: "no-supported-specialization" });
    continue;
  }
  if (!Object.keys(contacts).length && !workplaces.length) {
    skipped.push({ name: candidate.name, reason: "no-public-anchor" });
    continue;
  }
  if (!formats.length) formats.push("offline");
  const reviews = mergeReviews([], reviewsByName.get(candidate.key) || []);
  const labels = specializationKeys.map((key) => specialties[key]);
  const workplaceText = workplaces.map((workplace) => [workplace.clinic, workplace.address].filter(Boolean).join(", "));
  const bio = candidate.bio || [labels.join(", "), workplaceText.join("; ") || city].filter(Boolean).join("; ");
  const baseSlug = slugify(candidate.name);
  let slug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
  usedSlugs.add(slug);
  const sources = [...new Set(["t.me/vrachivserbii", ...(candidate.sourceMsgUrls || []).filter((url) => /^https:\/\/t\.me\/vrachivserbii\/\d+/.test(url))])];
  const doc = {
    slug,
    name: candidate.name,
    nameEn: candidate.nameEn || undefined,
    specializations: specializationKeys,
    specializationText: candidate.specializationText || candidate.specializationsText || labels.join(", "),
    city,
    languages: normalizeLanguages(candidate.languages),
    formats: [...new Set(formats)],
    bio,
    education: [],
    workplaces,
    contacts,
    reviews,
    hidden: false,
    featured: false,
    sources,
    updatedAt: today,
  };
  generated.push(doc);
}

const changedExisting = [];
const existingReviewsAddedBySlug = new Map();
for (const entry of existingFiles) {
  const incoming = reviewsBySlug.get(entry.doc.slug) || [];
  if (!incoming.length) continue;
  const before = JSON.stringify(entry.doc.reviews || []);
  const beforeCount = (entry.doc.reviews || []).length;
  entry.doc.reviews = mergeReviews(entry.doc.reviews, incoming);
  if (JSON.stringify(entry.doc.reviews || []) !== before) {
    changedExisting.push(entry.doc.slug);
    existingReviewsAddedBySlug.set(entry.doc.slug, entry.doc.reviews.length - beforeCount);
  }
}

const audit = {
  generatedAt: new Date().toISOString(),
  mode: shouldWrite ? "write" : "dry-run",
  inputCandidates: candidates.length,
  existingCards: existingFiles.length,
  matchedExistingCandidates: existingMatches.length,
  generatedCards: generated.length,
  changedExistingCards: changedExisting.length,
  newReviews: generated.reduce((sum, doc) => sum + doc.reviews.length, 0),
  existingReviewsAdded: [...existingReviewsAddedBySlug.values()].reduce((sum, count) => sum + count, 0),
  skipped,
  existingMatches,
  generated: generated.map((doc) => ({ slug: doc.slug, name: doc.name, city: doc.city, specializations: doc.specializations, reviews: doc.reviews.length, sources: doc.sources.length })),
  changedExisting,
};

fs.writeFileSync(path.join(parsedDir, "import-audit.json"), JSON.stringify(audit, null, 2) + "\n", "utf8");

if (shouldWrite) {
  for (const doc of generated) {
    fs.writeFileSync(path.join(doctorsDir, `${doc.slug}.json`), JSON.stringify(doc, null, 2) + "\n", "utf8");
  }
  for (const slug of changedExisting) {
    const entry = existingFiles.find((item) => item.doc.slug === slug);
    fs.writeFileSync(path.join(doctorsDir, `${entry.file}`), JSON.stringify(entry.doc, null, 2) + "\n", "utf8");
  }
}

console.log(`mode=${audit.mode}`);
console.log(`input=${audit.inputCandidates} existing=${audit.existingCards}`);
console.log(`matchedExisting=${audit.matchedExistingCandidates}`);
console.log(`newCards=${audit.generatedCards} newReviews=${audit.newReviews}`);
console.log(`changedExisting=${audit.changedExistingCards} existingReviewsAdded=${audit.existingReviewsAdded}`);
console.log(`skipped=${audit.skipped.length}`);
for (const item of audit.skipped) console.log(`skip ${item.name}: ${item.reason}`);
console.log(`audit=${path.join(parsedDir, "import-audit.json")}`);
