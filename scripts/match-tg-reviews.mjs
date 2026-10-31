import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const doctorsDir = path.join(root, "src", "data", "doctors");
const reviewsSource = path.join(root, "scripts", "tg-export-reviews.json");

if (!fs.existsSync(reviewsSource)) {
  console.error("Reviews source file not found:", reviewsSource);
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
  "narcologist"
]);

function maskAuthor(author, isSensitive) {
  if (!author || author.trim() === "" || author === "undefined") {
    return "Пациент из сообщества";
  }
  const clean = author.trim();
  if (!isSensitive) return clean;

  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  // Single word author: if it looks like username with surname, mask last chars
  if (clean.length > 8 && /[a-z]/i.test(clean)) {
    return clean.slice(0, 4) + "...";
  }
  return clean;
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
  doctors.push({ doc, filePath });
}

// Build surname count to know uniqueness
const surnameCount = new Map();
for (const { doc } of doctors) {
  const parts = cleanTitle(doc.name).split(/\s+/);
  const ln = parts[0].toLowerCase();
  surnameCount.set(ln, (surnameCount.get(ln) || 0) + 1);
}

// Build matchers
const matchers = [];
for (const item of doctors) {
  const doc = item.doc;
  const cleanN = cleanTitle(doc.name);
  const parts = cleanN.split(/\s+/);
  if (parts.length >= 2) {
    const lastName = parts[0];
    const firstName = parts[1];
    const lnLower = lastName.toLowerCase();
    const fnLower = firstName.toLowerCase();
    const isUnique = surnameCount.get(lnLower) === 1;

    // Stem: at least 4 letters, strip typical endings
    const lnStem = lnLower.slice(
      0,
      Math.max(4, lnLower.length - (lnLower.endsWith("а") || lnLower.endsWith("я") || lnLower.endsWith("ий") || lnLower.endsWith("ый") || lnLower.endsWith("ов") || lnLower.endsWith("ев") ? 2 : 1))
    );
    const fnStem = fnLower.slice(0, Math.max(3, fnLower.length - 1));

    const isSensitive = doc.specializations.some((s) => sensitiveSpecialties.has(s));

    matchers.push({
      item,
      doc,
      lastName,
      firstName,
      lnLower,
      fnLower,
      lnStem,
      fnStem,
      isUnique,
      isSensitive,
      fullName: `${lastName} ${firstName}`.toLowerCase(),
      revFullName: `${firstName} ${lastName}`.toLowerCase()
    });
  }
}

const rawReviews = JSON.parse(fs.readFileSync(reviewsSource, "utf8"));
console.log(`Analyzing ${rawReviews.length} Telegram reviews against ${doctors.length} doctors...`);

const falsePositiveStems = new Set(["куку", "друг", "капл", "масс", "прие", "бере", "свет"]);
const newReviewsBySlug = new Map();

for (const msg of rawReviews) {
  if (existingReviewIds.has(String(msg.id))) continue;
  const rawText = (msg.text || "").trim();
  if (rawText.length < 50 || rawText.length > 1500) continue;
  if (/^\*{0,2}(РЕКЛАМА|реклама\b)/i.test(rawText)) continue;

  // Must contain feedback / recommendation / visit intent
  const isFeedback = /(рекоменду|совету|была у|был у|были у|обратил|помог|лечил|спасибо|отличн|хорош|понравил|профессионал|грамотн|аккуратн|доволен|довольна|внимательн|замечательн)/i.test(
    rawText
  );
  if (!isFeedback) continue;

  const tLower = rawText.toLowerCase();

  for (const m of matchers) {
    // Avoid self-messages (doctor giving advice)
    if (msg.from && (msg.from.toLowerCase().includes(m.lnLower) || m.fullName.includes(msg.from.toLowerCase()))) {
      continue;
    }

    let hit = false;

    // Condition 1: Direct full name match
    if (tLower.includes(m.fullName) || tLower.includes(m.revFullName)) {
      hit = true;
    }
    // Condition 2: Surname stem + First name stem together (at least 4 chars each)
    else if (
      m.lnStem.length >= 4 &&
      !falsePositiveStems.has(m.lnStem) &&
      tLower.includes(m.lnStem) &&
      tLower.includes(m.fnStem)
    ) {
      hit = true;
    }
    // Condition 3: Explicit 'доктор / врач / были у <Surname>' with length >= 5
    else if (
      m.isUnique &&
      m.lnStem.length >= 5 &&
      !falsePositiveStems.has(m.lnStem)
    ) {
      const docRe = new RegExp(
        `(?:доктор|врач|д-р|dr\\.?|prof\\.?|была у|был у|были у|записались к|ходили к|лечились у|при[её]м у)\\s+[а-яёa-z\\s]{0,15}${m.lnStem}`,
        "i"
      );
      if (docRe.test(tLower)) {
        hit = true;
      }
    }

    if (hit) {
      const reviewObj = {
        id: `tg-${msg.id}`,
        author: maskAuthor(msg.from, m.isSensitive),
        date: msg.date ? String(msg.date).slice(0, 10) : "",
        rating: 0,
        text: cleanReviewText(rawText),
        source: `https://t.me/vrachivserbii/${msg.id}`
      };

      if (!newReviewsBySlug.has(m.doc.slug)) {
        newReviewsBySlug.set(m.doc.slug, []);
      }
      newReviewsBySlug.get(m.doc.slug).push({ item: m.item, review: reviewObj });
      break;
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
    doc.updatedAt = "2026-10-31";
    fs.writeFileSync(item.filePath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    doctorsUpdated++;
  }
}

console.log(`Successfully added ${totalAdded} genuine reviews across ${doctorsUpdated} doctor profiles.`);
