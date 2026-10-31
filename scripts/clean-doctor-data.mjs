import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const doctorsDir = path.join(root, "src", "data", "doctors");

const specialtyFixes = {
  "gaydadym-vera-viktorovna": ["obstetrician_gynecologist", "gynecologist"],
  "shlyahovskaya-olga-nikolaevna": ["obstetrician_gynecologist", "gynecologist"],
  "callagova-elena-vladimirovna": ["gynecologist", "endocrinologist"],
  "vahrameev-sergey-sergeevich": ["surgeon"],
  "vadim-igorevich-karpanin": ["urologist"],
  "kirill-melihov": ["dentist"],
  "natalya-andreeva": ["dentist"],
  "daria-zolotukho": ["rheumatologist"],
  "dvizhkova-olga": ["rheumatologist"],
  "gusakov-andrey-andreevich": ["pulmonologist"],
  "ovcharov-stanislav": ["pulmonologist", "manual_therapist"],
  "skrypnik-irina-anatolevna": ["pulmonologist", "allergist"],
  "meshkova-ekaterina-mihaylovna": ["radiologist"],
  "bolshakov-dmitriy-andreevich": ["psychiatrist", "psychotherapist"],
  "konstantin-kovalev": ["psychiatrist", "psychotherapist"],
  "tuchin-pavel-viktorovich": ["psychiatrist", "psychotherapist"],
  "mayya-andreevna-sklyar": ["psychiatrist", "psychotherapist"],
  "zueva-mariya": ["psychiatrist", "narcologist", "psychotherapist"],
  "soloveva-evgeniya": ["psychiatrist", "neurologist"],
  "babenko-anna": ["infectiologist"],
  "tkalich-oksana": ["infectiologist"],
  "ivanov-denis": ["neurologist", "manual_therapist"],
  "iveti-vesna": ["psychiatrist", "neurologist"],
  "loyk-evgeniya-olegovna": ["pediatrician", "gastroenterologist"],
  "pavel-borisov": ["urologist", "oncologist"],
  "irina-zapolskikh": ["cosmetologist", "dermatologist"],
  "polonina-yuliya": ["cosmetologist", "dermatologist"],
  "rodina-nataliya-leonidovna": ["cosmetologist", "dermatologist"],
  "bukatkina-ekaterina": ["cosmetologist", "dermatologist"]
};

const specificPhoneFixes = {
  "baygerova-tatyana": "+381 62 122 3811",
  "gligorije-babovic": "+381 64 136 7061",
  "gusak-aleksandra": "+381 66 800 7770",
  "misyuk-olga-nikolaevna": null,
  "soloveva-evgeniya": "+381 69 101 9269",
  "tatiana-iarushina": "+381 69 101 9269",
  "yarushina-tatyana": "+381 69 101 9269"
};

const files = fs.readdirSync(doctorsDir).filter((f) => f.endsWith(".json"));
let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(doctorsDir, file);
  const doc = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  let modified = false;

  // 1. Specialty fixes
  if (specialtyFixes[doc.slug]) {
    doc.specializations = specialtyFixes[doc.slug];
    modified = true;
  }

  // 2. Phone fixes
  if (doc.contacts && typeof doc.contacts.phone === "string") {
    if (specificPhoneFixes[doc.slug] !== undefined) {
      doc.contacts.phone = specificPhoneFixes[doc.slug] || undefined;
      modified = true;
    } else {
      let cleanedPhone = doc.contacts.phone.replace(/[\s(]+$/, "").trim();
      if (cleanedPhone !== doc.contacts.phone) {
        doc.contacts.phone = cleanedPhone;
        modified = true;
      }
    }
  }

  // 3. Name cleanup for status notes
  if (doc.slug === "rumyanceva-nadezhda-vremenno-ne-konsultiruet-k-sozhaleniyu") {
    doc.name = "Надежда Румянцева";
    doc.hidden = true;
    if (!doc.bio?.includes("Временно не консультирует")) {
      doc.bio = `(Временно не консультирует) ${doc.bio || ""}`.trim();
    }
    modified = true;
  }

  // 4. Decode HTML entities in bio text
  if (doc.bio && /&(quot|amp|#39|lt|gt|nbsp);/.test(doc.bio)) {
    doc.bio = doc.bio
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ");
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    fixedCount++;
  }
}

console.log(`Cleaned and updated ${fixedCount} doctor profiles.`);
