/**
 * Deduplication and Integration Engine for Serbian Doctors.
 * Integrates scraped records into `src/data/doctors/*.json`.
 *
 * Usage:
 *   node scripts/dedup-serbian-doctors.mjs [--dry-run] [--source=stetoskop]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapSpecialty, transliterateSerbianToRussian } from "./translate-serbian-content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DOCTORS_DIR = path.join(ROOT, "src", "data", "doctors");

function normalizeKey(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadExistingDoctors() {
  const map = new Map();
  const files = fs.readdirSync(DOCTORS_DIR).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    try {
      const fullPath = path.join(DOCTORS_DIR, f);
      const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      map.set(normalizeKey(data.name), { file: f, path: fullPath, data });
      map.set(normalizeKey(data.slug), { file: f, path: fullPath, data });
    } catch {}
  }
  return map;
}

export function integrateScrapedDoctors(rawItems, { dryRun = true } = {}) {
  const existing = loadExistingDoctors();
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of rawItems) {
    const normName = normalizeKey(item.name);
    const slug = slugify(item.name);
    const match = existing.get(normName) || existing.get(normalizeKey(slug));

    if (match) {
      // Existing doctor found -> update origin and attach missing reviews / workplaces
      const doc = match.data;
      let changed = false;

      if (!doc.origin && (item.source === "stetoskop.info" || item.source === "hipokratija.rs")) {
        doc.origin = "rs";
        changed = true;
      }
      if (!doc.nameRu) {
        doc.nameRu = transliterateSerbianToRussian(doc.name);
        changed = true;
      }
      if (item.sourceUrl && !doc.sources.includes(item.sourceUrl)) {
        doc.sources.push(item.sourceUrl);
        changed = true;
      }
      if (item.photo && !doc.photo) {
        doc.photo = item.photo;
        changed = true;
      }

      if (changed) {
        updatedCount++;
        console.log(`[UPDATE] ${doc.name} (${match.file}) marked origin='rs'`);
        if (!dryRun) {
          doc.updatedAt = new Date().toISOString().split("T")[0];
          fs.writeFileSync(match.path, JSON.stringify(doc, null, 2) + "\n", "utf8");
        }
      } else {
        skippedCount++;
      }
    } else {
      // New doctor
      const specKey = (item.specialties || [item.specialty])
        .map(mapSpecialty)
        .filter(Boolean)[0] || "therapist";

      const newDoctor = {
        slug,
        name: item.name,
        nameRu: transliterateSerbianToRussian(item.name),
        origin: "rs",
        specializations: [specKey],
        city: "Belgrade",
        languages: ["sr"],
        formats: ["offline"],
        bio: item.bio || (item.experienceText ? item.experienceText.slice(0, 300) : ""),
        education: [],
        workplaces: Array.isArray(item.workplaces)
          ? item.workplaces.map((w) => ({
              clinic: typeof w === "string" ? w : w.clinic,
              city: "Belgrade",
            }))
          : [],
        contacts: {
          phone: item.phone || undefined,
        },
        reviews: Array.isArray(item.reviews) ? item.reviews : [],
        hidden: false,
        featured: false,
        sources: item.sourceUrl ? [item.sourceUrl] : [],
        updatedAt: new Date().toISOString().split("T")[0],
      };

      if (item.photo) newDoctor.photo = item.photo;

      createdCount++;
      console.log(`[NEW] ${newDoctor.name} -> ${slug}.json (specialty: ${specKey})`);
      if (!dryRun) {
        const targetPath = path.join(DOCTORS_DIR, `${slug}.json`);
        fs.writeFileSync(targetPath, JSON.stringify(newDoctor, null, 2) + "\n", "utf8");
      }
    }
  }

  console.log(`\n=== Integration Summary ===`);
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Dry run: ${dryRun}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--write");
  const stetoskopFile = path.join(ROOT, "scripts", "stetoskop-raw.json");

  if (!fs.existsSync(stetoskopFile)) {
    console.log(`No raw file found at ${stetoskopFile}. Run scrape-stetoskop.mjs first.`);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(stetoskopFile, "utf8"));
  console.log(`Loaded ${rawData.length} items from ${stetoskopFile}`);
  integrateScrapedDoctors(rawData, { dryRun });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
