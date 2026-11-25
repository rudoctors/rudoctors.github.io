import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const doctorsDir = path.join(root, "src", "data", "doctors");
const auditDir = path.join(root, "scripts", "tg-parsed");
const reviewsSource = path.join(root, "scripts", "tg-export-reviews.json");
const recosSource = path.join(root, "scripts", "tg-export-recommendations.json");
const visitkasSource = path.join(root, "scripts", "tg-export-visitkas.json");
const shouldWrite = process.argv.includes("--write");
const today = new Date().toISOString().slice(0, 10);
const approvalsPath = path.join(root, "scripts", "tg-parsed", "review-approvals.json");

if (!fs.existsSync(reviewsSource)) {
  console.error("Reviews source file not found:", reviewsSource);
  process.exit(1);
}

const approvedPairs = new Set(
  (fs.existsSync(approvalsPath) ? JSON.parse(fs.readFileSync(approvalsPath, "utf8")) : []).map(
    ({ messageId, slug }) => `${messageId}:${slug}`
  )
);

if (shouldWrite && approvedPairs.size === 0) {
  console.error("Refusing to write without reviewed entries in scripts/tg-parsed/review-approvals.json");
  process.exit(1);
}

const sensitiveSpecialties = new Set([
  "psychiatrist",
  "child_psychiatrist",
  "psychiatrist_child",
  "psychotherapist",
  "gynecologist",
  "obstetrician_gynecologist",
  "oncologist",
  "urologist",
  "proctologist",
  "narcologist",
]);

const clinicHandles = new Set([
  "citilabrs",
  "alfamedstar_rs",
  "doctorus_expert",
  "vrachivserbii",
  "palkinrs",
  "palkin",
  "medigroup",
  "euromedik",
  "search",
]);

import { sanitizeAuthor } from "./sanitize-review-authors.mjs";

function maskAuthor(author, isSensitive) {
  if (!author || author.trim() === "" || author === "undefined") {
    return "Пациент из сообщества";
  }
  return sanitizeAuthor(author);
}

function cleanReviewText(text) {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanTitle(n) {
  return n.replace(/^(доктор|врач|д-р|dr\.?|prof\.?)\s+/i, "").trim();
}

const files = fs.readdirSync(doctorsDir).filter((f) => f.endsWith(".json"));
const doctors = [];
const existingReviewIds = new Set();

for (const file of files) {
  const filePath = path.join(doctorsDir, file);
  const doc = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  for (const r of doc.reviews || []) {
    existingReviewIds.add(String(r.id).replace(/^tg-/, ""));
  }
  if (!doc.hidden) {
    doctors.push({ doc, filePath });
  }
}

// Build surname count to know uniqueness
const wordCount = new Map();
for (const { doc } of doctors) {
  const parts = cleanTitle(doc.name).split(/\s+/);
  for (const p of parts) {
    const w = p.toLowerCase();
    wordCount.set(w, (wordCount.get(w) || 0) + 1);
  }
}

function getStem(word) {
  const w = word.toLowerCase();
  return w.slice(
    0,
    Math.max(
      4,
      w.length -
        (w.endsWith("а") ||
        w.endsWith("я") ||
        w.endsWith("ий") ||
        w.endsWith("ый") ||
        w.endsWith("ов") ||
        w.endsWith("ев") ||
        w.endsWith("ой") ||
        w.endsWith("ин")
          ? 2
          : 1)
    )
  );
}

// Build matchers
const matchers = [];
for (const item of doctors) {
  const doc = item.doc;
  const cleanN = cleanTitle(doc.name);
  const parts = cleanN.split(/\s+/);
  if (parts.length >= 2) {
    const p1 = parts[0];
    const p2 = parts[1];
    const p1Lower = p1.toLowerCase();
    const p2Lower = p2.toLowerCase();
    const p1Stem = getStem(p1);
    const p2Stem = getStem(p2);

    let tgHandle = (doc.contacts && doc.contacts.telegram) || "";
    tgHandle = tgHandle.replace(/https?:\/\/t\.me\//i, "").replace(/^@/, "").trim().toLowerCase();
    if (
      tgHandle.length < 4 ||
      tgHandle === "bot" ||
      tgHandle.includes("/") ||
      tgHandle.startsWith("+") ||
      clinicHandles.has(tgHandle)
    ) {
      tgHandle = null;
    }

    const isSensitive = doc.specializations.some((s) => sensitiveSpecialties.has(s));

    matchers.push({
      item,
      doc,
      p1,
      p2,
      p1Lower,
      p2Lower,
      p1Stem,
      p2Stem,
      p1Unique: wordCount.get(p1Lower) === 1,
      p2Unique: wordCount.get(p2Lower) === 1,
      tgHandle,
      isSensitive,
      fullName: `${p1} ${p2}`.toLowerCase(),
      revFullName: `${p2} ${p1}`.toLowerCase(),
    });
  }
}

// Read raw reviews, recommendations, and patient feedback from visitkas deduplicated
const msgsMap = new Map();
for (const src of [reviewsSource, recosSource, visitkasSource]) {
  if (fs.existsSync(src)) {
    const list = JSON.parse(fs.readFileSync(src, "utf8"));
    for (const m of list) {
      if (m && m.id != null) {
        // If from visitkas, exclude obvious doctor self-intro cards
        if (src === visitkasSource && /(меня зовут|я врач|веду при[её]м|приглашаю на|обо мне|мо[йя] образован)/i.test(m.text || "")) {
          continue;
        }
        msgsMap.set(m.id, m);
      }
    }
  }
}
const rawReviews = Array.from(msgsMap.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
console.log(`Analyzing ${rawReviews.length} Telegram messages against ${doctors.length} doctors...`);

const falsePositiveStems = new Set([
  "куку",
  "друг",
  "капл",
  "масс",
  "прие",
  "бере",
  "свет",
  "влад",
  "анна",
  "мари",
  "иван",
  "алек",
  "серг",
  "репа",
  "преп",
]);
// Publicly used name variants which cannot be matched by Russian inflection alone.
const reviewAliasesBySlug = new Map([
  ["nonko-elena-viktorovna", ["олена дати", "елена нонко", "датієнко", "датиенко"]],
  ["strahinja-ilic", ["страхиня илич", "илич страхиня"]],
  ["artem-semenov", ["артем семенов", "семенов артем", "артему семенову", "семенова артема"]],
  ["semenova-anastasiya-aleksandrovna", ["семенова анастасия", "анастасия семенова", "анастасии семеновой", "семеновой анастасии"]],
  ["kirill-melihov", ["кирилл мелихов", "мелихов кирилл"]],
  ["inga-sakeyan", ["инга сакеян", "ингу сакеян", "инге сакеян", "сакеян инга", "сакеян ингу", "инги суреновны сакеян", "инга суреновна сакеян", "инге суреновне сакеян"]],
  ["yuliya-ostanina", ["юлия останина", "юлию останину", "юлии останиной", "останина юлия", "останину юлию", "останиной юлии"]],
  ["kirill-kozyrev", ["кирилл козырев", "козырев кирилл", "козырева в альфамед", "у козырева в альфамед"]],
  ["elena-bakovich", ["елена бакович", "бакович елена", "#бакович", "у бакович"]],
  ["amir-dzhafarov", ["амир джафаров", "джафаров амир", "стоматологе амире", "стоматологу амиру", "стоматолог амир"]],
]);

const specialtyKeywords = [
  { tag: /#мануальныйтерапевт/i, valid: ["manual_therapist", "neurologist"] },
  { tag: /#ортодонт/i, valid: ["dentist", "orthodontist"] },
  { tag: /#гинеколог/i, valid: ["gynecologist", "obstetrician_gynecologist"] },
  { tag: /#психиатр/i, valid: ["psychiatrist", "psychiatrist_child", "child_psychiatrist"] },
  { tag: /#педиатр/i, valid: ["pediatrician"] },
  { tag: /#дерматолог/i, valid: ["dermatologist", "cosmetologist"] },
  { tag: /#лор|#отоларинголог/i, valid: ["otolaryngologist", "otorhinolaryngologist"] },
  { tag: /#стоматолог/i, valid: ["dentist", "orthodontist"] },
  { tag: /#эндокринолог/i, valid: ["endocrinologist"] },
  { tag: /#кардиолог/i, valid: ["cardiologist"] },
  { tag: /#офтальмолог|#окулист/i, valid: ["ophthalmologist"] },
];
const newReviewsBySlug = new Map();
const proposedReviews = [];

for (const msg of rawReviews) {
  if (existingReviewIds.has(String(msg.id))) continue;
  const rawText = (msg.text || "").trim();
  if (rawText.length < 50 || rawText.length > 2000) continue;
  if (/^\*{0,2}(РЕКЛАМА|реклама\b)/i.test(rawText)) continue;
  const tLower = rawText.toLowerCase().replace(/\s+/g, " ");

  const fromLower = (msg.from || "").toLowerCase();
  if (/поиск в|easyrelocate|@search|бот /i.test(fromLower)) continue;
  if (/специалисты по вашему запросу|по вашему запросу:|подходящие специалисты|в моей базе данных|в контексте есть упоминание|результаты поиска|найденные специалисты/i.test(tLower)) continue;
  if (/(?:в белграде|в нови саде|в нови-саде|в сербии) есть несколько (?:рекомендованных|русскоговорящих)/i.test(tLower)) continue;
  if ((rawText.match(/•/g) || []).length >= 2 && /📍|📞|Telegram:/i.test(rawText)) continue;

  // Must contain feedback / recommendation / visit intent
  const isFeedback =
    /(рекоменду|совету|была у|был у|были у|посещал|обратил|помог|лечил|спасибо|отличн|хорош|понравил|профессионал|грамотн|аккуратн|доволен|довольна|внимательн|замечательн|вежлив|при[её]м|осмотр)/i.test(
      rawText
    );
  if (!isFeedback) continue;

  for (const m of matchers) {
    // Avoid self-messages (doctor giving advice / promo)
    if (
      msg.from &&
      (msg.from.toLowerCase().includes(m.p1Lower) ||
        msg.from.toLowerCase().includes(m.p2Lower) ||
        (m.tgHandle && msg.from.toLowerCase().includes(m.tgHandle)))
    ) {
      continue;
    }

    const approved = approvedPairs.has(`${msg.id}:${m.doc.slug}`);
    let hit = approved;

    // Condition 0: Telegram handle match (@handle or t.me/handle)
    if (m.tgHandle && (tLower.includes("@" + m.tgHandle) || tLower.includes("t.me/" + m.tgHandle))) {
      hit = true;
    }
    // Condition 1: Direct full name match
    else if (tLower.includes(m.fullName) || tLower.includes(m.revFullName)) {
      hit = true;
    }
    // Condition 1b: explicitly listed name variant.
    else if ((reviewAliasesBySlug.get(m.doc.slug) || []).some((alias) => tLower.includes(alias))) {
      hit = true;
    }
    // Condition 2: Both stems present with word boundaries
    else if (
      m.p1Stem.length >= 4 &&
      m.p2Stem.length >= 4 &&
      !falsePositiveStems.has(m.p1Stem) &&
      !falsePositiveStems.has(m.p2Stem) &&
      new RegExp(`(?:^|[^а-яёa-z])${m.p1Stem}[а-яёa-z]*`, "i").test(tLower) &&
      new RegExp(`(?:^|[^а-яёa-z])${m.p2Stem}[а-яёa-z]*`, "i").test(tLower)
    ) {
      hit = true;
    }

    // Reject unapproved matches that conflict with explicit specialty hashtags in review
    if (hit && !approved) {
      for (const spec of specialtyKeywords) {
        if (spec.tag.test(tLower)) {
          const matchesAny = spec.valid.some((s) => m.doc.specializations.includes(s));
          if (!matchesAny) {
            hit = false;
            break;
          }
        }
      }
    }
    if (hit && (!shouldWrite || approved)) {
      const reviewObj = {
        id: `tg-${msg.id}`,
        author: maskAuthor(msg.from, m.isSensitive),
        date: msg.date ? String(msg.date).slice(0, 10) : "",
        rating: 0,
        text: cleanReviewText(rawText),
        source: `https://t.me/vrachivserbii/${msg.id}`,
      };

      if (!newReviewsBySlug.has(m.doc.slug)) {
        newReviewsBySlug.set(m.doc.slug, []);
      }
      newReviewsBySlug.get(m.doc.slug).push({ item: m.item, review: reviewObj });
      proposedReviews.push({
        messageId: msg.id,
        date: reviewObj.date,
        slug: m.doc.slug,
        doctor: m.doc.name,
        source: reviewObj.source,
      });
    }
  }
}

let totalAdded = 0;
let doctorsUpdated = 0;

for (const [, entries] of newReviewsBySlug.entries()) {
  const item = entries[0].item;
  const doc = item.doc;
  if (!Array.isArray(doc.reviews)) {
    doc.reviews = [];
  }

  // Deduplicate against existing IDs
  const seenIds = new Set(doc.reviews.map((r) => r.id));
  let addedForDoc = 0;

  for (const { review } of entries) {
    if (!seenIds.has(review.id)) {
      seenIds.add(review.id);
      doc.reviews.push(review);
      addedForDoc++;
      totalAdded++;
    }
  }

  if (addedForDoc > 0) {
    // Sort reviews newest first
    doc.reviews.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    doc.updatedAt = today;
    if (shouldWrite) {
      fs.writeFileSync(item.filePath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    }
    doctorsUpdated++;
  }
}

fs.mkdirSync(auditDir, { recursive: true });
const auditPath = path.join(auditDir, "review-match-audit.json");
fs.writeFileSync(
  auditPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), mode: shouldWrite ? "write" : "dry-run", proposedReviews }, null, 2) + "\n",
  "utf8"
);
console.log(`${shouldWrite ? "Added" : "Proposed"} ${totalAdded} reviews across ${doctorsUpdated} doctor profiles.`);
console.log(`audit=${auditPath}`);
