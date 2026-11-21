/**
 * Deduplication and Integration Engine for Serbian Doctors.
 * Integrates scraped records into `src/data/doctors/*.json` and verifies with LKS.
 *
 * Usage:
 *   node scripts/dedup-serbian-doctors.mjs [--write] [--verify-lks]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapSpecialty, transliterateSerbianToRussian } from "./translate-serbian-content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DOCTORS_DIR = path.join(ROOT, "src", "data", "doctors");
const SOURCES_DIR = path.join(ROOT, "src", "data", "sources", "serbian");
const LKS_INDEX_PATH = path.join(SOURCES_DIR, "lks-licenses-index.json");

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

function loadLksLicenses() {
  if (fs.existsSync(LKS_INDEX_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(LKS_INDEX_PATH, "utf8"));
      console.log(`[LKS] Загружен реестр лицензий LKS (${Object.keys(data).length} записей).`);
      return data;
    } catch (e) {
      console.warn(`[LKS] Ошибка чтения реестра LKS: ${e.message}`);
    }
  }
  return {};
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
  const lksLicenses = loadLksLicenses();

  let createdCount = 0;
  let updatedCount = 0;
  let lksVerifiedCount = 0;
  let skippedCount = 0;

  for (const item of rawItems) {
    const rawName = item.name || "";
    if (!rawName.trim()) continue;

    const normName = normalizeKey(rawName);
    const slug = slugify(rawName);
    const match = existing.get(normName) || existing.get(normalizeKey(slug));

    // Проверка наличия в официальном реестре LKS
    const lksMatch = lksLicenses[normName];

    if (match) {
      // Существующий врач -> обогащаем данные
      const doc = match.data;
      let changed = false;

      if (!doc.origin && (item.source?.includes("rs") || item.source?.includes("serbian") || item.source === "stetoskop.info")) {
        doc.origin = "rs";
        changed = true;
      }
      if (!doc.nameRu) {
        doc.nameRu = transliterateSerbianToRussian(doc.name);
        changed = true;
      }
      if (item.url && !doc.sources.includes(item.url)) {
        doc.sources.push(item.url);
        changed = true;
      }
      if (item.photo && !doc.photo) {
        doc.photo = item.photo;
        changed = true;
      }
      if (Array.isArray(item.insurances) && item.insurances.length > 0) {
        doc.acceptedInsurance = [...new Set([...(doc.acceptedInsurance || []), ...item.insurances])];
        changed = true;
      }
      if (Array.isArray(item.workplaces) && item.workplaces.length > 0) {
        const existingClinics = new Set((doc.workplaces || []).map(w => normalizeKey(w.clinic)));
        for (const wp of item.workplaces) {
          if (wp.clinic && !existingClinics.has(normalizeKey(wp.clinic))) {
            doc.workplaces = doc.workplaces || [];
            doc.workplaces.push({
              clinic: wp.clinic,
              city: wp.city || doc.city || "Belgrade",
              address: wp.address
            });
            existingClinics.add(normalizeKey(wp.clinic));
            changed = true;
          }
        }
      }

      // Подстановка лицензии LKS
      if (lksMatch && (!doc.license || !doc.license.verified)) {
        doc.license = {
          number: lksMatch.licenseNumber,
          authority: "Lekarska komora Srbije",
          verified: true
        };
        doc.verificationStatus = "verified";
        changed = true;
        lksVerifiedCount++;
        console.log(`[LKS VERIFIED] ${doc.name} -> Лицензия LKS №${lksMatch.licenseNumber}`);
      }

      if (changed) {
        updatedCount++;
        console.log(`[UPDATE] ${doc.name} (${match.file})`);
        if (!dryRun) {
          doc.updatedAt = new Date().toISOString().split("T")[0];
          fs.writeFileSync(match.path, JSON.stringify(doc, null, 2) + "\n", "utf8");
        }
      } else {
        skippedCount++;
      }
    } else {
      // Новый врач
      const specList = item.specialties || [item.specialty || item.specialtyRaw];
      const specKey = specList.map(mapSpecialty).filter(Boolean)[0] || "therapist";

      const newDoctor = {
        slug,
        name: rawName,
        nameRu: transliterateSerbianToRussian(rawName),
        origin: "rs",
        specializations: [specKey],
        city: item.city || "Belgrade",
        languages: ["sr", "en"],
        formats: ["offline"],
        bio: item.bio || (item.experienceText ? item.experienceText.slice(0, 300) : ""),
        education: [],
        workplaces: Array.isArray(item.workplaces)
          ? item.workplaces.map((w) => ({
              clinic: typeof w === "string" ? w : w.clinic,
              city: w.city || item.city || "Belgrade",
              address: w.address
            }))
          : [],
        acceptedInsurance: Array.isArray(item.insurances) ? item.insurances : [],
        contacts: {
          phone: item.phone || undefined,
        },
        reviews: Array.isArray(item.reviews) ? item.reviews : [],
        hidden: false,
        featured: false,
        sources: item.url ? [item.url] : [],
        updatedAt: new Date().toISOString().split("T")[0],
      };

      if (item.photo) newDoctor.photo = item.photo;

      if (lksMatch) {
        newDoctor.license = {
          number: lksMatch.licenseNumber,
          authority: "Lekarska komora Srbije",
          verified: true
        };
        newDoctor.verificationStatus = "verified";
        lksVerifiedCount++;
        console.log(`[LKS VERIFIED NEW] ${newDoctor.name} -> Лицензия LKS №${lksMatch.licenseNumber}`);
      }

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
  console.log(`LKS Verified: ${lksVerifiedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Dry run: ${dryRun}`);
}

/**
 * Также запускает прямую верификацию всех существующих карточек по базе LKS
 */
export function verifyExistingDoctorsWithLks({ dryRun = true } = {}) {
  const existing = loadExistingDoctors();
  const lksLicenses = loadLksLicenses();
  let verifiedCount = 0;

  console.log(`\n[*] Запуск прямой верификации существующих врачей по базе LKS...`);

  for (const [key, match] of existing.entries()) {
    const doc = match.data;
    if (doc.license?.verified) continue;

    const norm = normalizeKey(doc.name);
    const lksMatch = lksLicenses[norm];

    if (lksMatch) {
      doc.license = {
        number: lksMatch.licenseNumber,
        authority: "Lekarska komora Srbije",
        verified: true
      };
      doc.verificationStatus = "verified";
      verifiedCount++;
      console.log(`[LKS VERIFIED] ${doc.name} -> №${lksMatch.licenseNumber} (${match.file})`);

      if (!dryRun) {
        doc.updatedAt = new Date().toISOString().split("T")[0];
        fs.writeFileSync(match.path, JSON.stringify(doc, null, 2) + "\n", "utf8");
      }
    }
  }

  console.log(`[✓] Верифицировано по базе LKS: ${verifiedCount} врачей (dryRun: ${dryRun}).`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--write");

  // 1. Верификация текущей базы врачей по реестру LKS
  verifyExistingDoctorsWithLks({ dryRun });

  // 2. Интеграция данных из BiramDoktora
  const biramFile = path.join(SOURCES_DIR, "raw-biramdoktora.json");
  if (fs.existsSync(biramFile)) {
    const data = JSON.parse(fs.readFileSync(biramFile, "utf8"));
    console.log(`\n[*] Интеграция BiramDoktora (${data.length} записей)...`);
    integrateScrapedDoctors(data, { dryRun });
  }

  // 3. Интеграция данных из NađiDoktora
  const nadjiFile = path.join(SOURCES_DIR, "raw-nadjidoktora.json");
  if (fs.existsSync(nadjiFile)) {
    const data = JSON.parse(fs.readFileSync(nadjiFile, "utf8"));
    console.log(`\n[*] Интеграция NađiDoktora (${data.length} записей)...`);
    integrateScrapedDoctors(data, { dryRun });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
