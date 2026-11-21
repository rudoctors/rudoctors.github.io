/**
 * Serbian content translation & normalization helper.
 * - Maps Serbian medical specialty names to standardized RuDoctors keys.
 * - Transliterates Serbian Latin names to Russian Cyrillic (for nameRu search index).
 * - Translates Serbian reviews into natural Russian preserving original text.
 *
 * Usage:
 *   node scripts/translate-serbian-content.mjs
 */
import { fileURLToPath } from "node:url";

export const SERBIAN_SPECIALTY_MAP = {
  // Hirurgija
  hirurgija: "surgeon",
  hirurg: "surgeon",
  "opsta hirurgija": "surgeon",
  "opšta hirurgija": "surgeon",
  "decija hirurgija": "surgeon",
  "dečija hirurgija": "surgeon",
  "vaskularna hirurgija": "vascular_surgeon",
  "plasticna hirurgija": "plastic_surgeon",
  "plastična hirurgija": "plastic_surgeon",
  "estetska hirurgija": "plastic_surgeon",

  // Kardiologija
  kardiologija: "cardiologist",
  kardiolog: "cardiologist",
  "interna medicina - kardiologija": "cardiologist",

  // Ginekologija
  ginekologija: "gynecologist",
  ginekolog: "gynecologist",
  "ginekologija i akuserstvo": "gynecologist",
  "ginekologija i akušerstvo": "gynecologist",
  "akuser-ginekolog": "obstetrician_gynecologist",

  // Pedijatrija
  pedijatrija: "pediatrician",
  pedijatar: "pediatrician",

  // Stomatologija
  stomatologija: "dentist",
  stomatolog: "dentist",
  zubadzar: "dentist",
  implantologija: "dental_implantologist",
  oralna_hirurgija: "dental_surgeon",
  "oralna hirurgija": "dental_surgeon",

  // Dermatologija
  dermatologija: "dermatologist",
  dermatolog: "dermatologist",
  dermatovenerologija: "dermatologist",
  dermatovenerolog: "dermatologist",
  kozmetologija: "cosmetologist",

  // Oftalmologija
  oftalmologija: "ophthalmologist",
  oftalmolog: "ophthalmologist",

  // ORL
  otorinolaringologija: "otorhinolaryngologist",
  orl: "otorhinolaryngologist",

  // Neurologija i Psihijatrija
  neurologija: "neurologist",
  neurolog: "neurologist",
  psihijatrija: "psychiatrist",
  psihijatar: "psychiatrist",
  "decija psihijatrija": "child_psychiatrist",
  psihoterapija: "psychotherapist",
  psihoterapeut: "psychotherapist",
  psihologija: "psychologist",
  psiholog: "psychologist",

  // Endokrinologija
  endokrinologija: "endocrinologist",
  endokrinolog: "endocrinologist",

  // Gastroenterologija
  gastroenterologija: "gastroenterologist",
  gastroenterolog: "gastroenterologist",
  gastroenterohepatologija: "gastroenterologist",

  // Urologija
  urologija: "urologist",
  urolog: "urologist",

  // Ortopedija & Traumatologija
  ortopedija: "traumatologist_orthopedist",
  ortoped: "traumatologist_orthopedist",
  traumatologija: "traumatologist_orthopedist",

  // Pulmologija & Alergologija
  pulmologija: "pulmonologist",
  pulmolog: "pulmonologist",
  alergologija: "allergist",
  alergolog: "allergist",

  // Opšta praksa / Interna medicina
  "opsta medicina": "gp",
  "opšta medicina": "gp",
  "lekar opste prakse": "gp",
  "lekar opšte prakse": "gp",
  "interna medicina": "therapist",
  internista: "therapist",

  // Radiologija / Ultrazvuk
  radiologija: "radiologist",
  radiolog: "radiologist",
  ultrazvuk: "ultrasound_diagnostics",
  mamologija: "mammologist",

  // Onkologija
  onkologija: "oncologist",
  onkolog: "oncologist",

  // Reumatologija
  reumatologija: "rheumatologist",
  reumatolog: "rheumatologist",

  // Infektologija
  infektologija: "infectiologist",
  infektolog: "infectiologist",
  "infektivne bolesti": "infectiologist",

  // Fizijatrija
  fizijatrija: "physiatrist",
  fizijatar: "physiatrist",
  fizioterapija: "physiotherapist",
  fizioterapeut: "physiotherapist",
};

/**
 * Normalizes a Serbian specialty text into a valid RuDoctors specialty key.
 */
export function mapSpecialty(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .trim();

  if (SERBIAN_SPECIALTY_MAP[cleaned]) {
    return SERBIAN_SPECIALTY_MAP[cleaned];
  }

  // Substring match
  for (const [k, v] of Object.entries(SERBIAN_SPECIALTY_MAP)) {
    if (cleaned.includes(k) || k.includes(cleaned)) {
      return v;
    }
  }
  return null;
}

/**
 * Transliterates Serbian Latin name to Russian Cyrillic phonetics.
 * E.g. "Dragan Petrović" -> "Драган Петрович"
 *      "Jelena Đorđević" -> "Елена Джорджевич"
 */
export function transliterateSerbianToRussian(name) {
  if (!name) return "";
  let s = String(name).trim();

  const rules = [
    [/Dž/g, "Дж"],
    [/dž/g, "дж"],
    [/Đ/g, "Дж"],
    [/đ/g, "дж"],
    [/Lj/g, "Ль"],
    [/lj/g, "ль"],
    [/Nj/g, "Нь"],
    [/nj/g, "нь"],
    [/Ć/g, "Ч"],
    [/ć/g, "ч"],
    [/Č/g, "Ч"],
    [/č/g, "ч"],
    [/Š/g, "Ш"],
    [/š/g, "ш"],
    [/Ž/g, "Ж"],
    [/ž/g, "ж"],
    [/C/g, "Ц"],
    [/c/g, "ц"],
    [/A/g, "А"],
    [/a/g, "а"],
    [/B/g, "Б"],
    [/b/g, "б"],
    [/V/g, "В"],
    [/v/g, "в"],
    [/G/g, "Г"],
    [/g/g, "г"],
    [/D/g, "Д"],
    [/d/g, "д"],
    [/E/g, "Е"],
    [/e/g, "е"],
    [/Z/g, "З"],
    [/z/g, "з"],
    [/I/g, "И"],
    [/i/g, "и"],
    [/J/g, "Й"],
    [/j/g, "й"],
    [/K/g, "К"],
    [/k/g, "к"],
    [/L/g, "Л"],
    [/l/g, "л"],
    [/M/g, "М"],
    [/m/g, "м"],
    [/N/g, "Н"],
    [/n/g, "н"],
    [/O/g, "О"],
    [/o/g, "о"],
    [/P/g, "П"],
    [/p/g, "п"],
    [/R/g, "Р"],
    [/r/g, "р"],
    [/S/g, "С"],
    [/s/g, "с"],
    [/T/g, "Т"],
    [/t/g, "т"],
    [/U/g, "У"],
    [/u/g, "у"],
    [/F/g, "Ф"],
    [/f/g, "ф"],
    [/H/g, "Х"],
    [/h/g, "х"],
  ];

  // Fix initial Je / Jo
  s = s.replace(/\bJe/g, "Е").replace(/\bje/g, "е");
  s = s.replace(/\bJo/g, "Йо").replace(/\bjo/g, "йо");

  for (const [rx, repl] of rules) {
    s = s.replace(rx, repl);
  }

  // Fix -ий suffix
  s = s.replace(/ч$/i, "ч");
  return s;
}

/**
 * Basic translation batcher for reviews using OpenRouter / Gemini API.
 */
export async function translateSerbianReviews(reviews) {
  const apiKey = process.env.TRANSLATE_API_KEY || process.env.OPENROUTER_API_KEY || "";
  const apiUrl = process.env.TRANSLATE_API_URL || "https://openrouter.ai/api/v1/chat/completions";
  const model = process.env.TRANSLATE_MODEL || "google/gemini-2.0-flash-001";

  if (!apiKey) {
    console.log("[translate] No API key set. Reviews will retain Serbian text with langSource='sr'");
    return reviews.map((r) => ({
      ...r,
      text: r.text || r.textOriginal,
      lang: "ru",
      langSource: "sr",
    }));
  }

  const translated = [];
  const BATCH = 8;
  for (let i = 0; i < reviews.length; i += BATCH) {
    const chunk = reviews.slice(i, i + BATCH);
    const numbered = chunk.map((c, idx) => `${idx + 1}. ${c.textOriginal}`).join("\n---\n");

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          HTTP_Referer: "https://rudoctors.com",
          "X-Title": "RuDoctors Serbian Translation",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Translate patient medical reviews from Serbian to natural Russian. " +
                "Return ONLY a JSON array of strings, same order as input, no markdown, no numbering in the values. " +
                "Preserve meaning and medical terminology.",
            },
            { role: "user", content: numbered },
          ],
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "[]";
        const cleaned = content.replace(/^```json\s*/, "").replace(/```$/, "").trim();
        const array = JSON.parse(cleaned);

        chunk.forEach((rev, idx) => {
          translated.push({
            ...rev,
            text: array[idx] || rev.textOriginal,
            lang: "ru",
            langSource: "sr",
          });
        });
      } else {
        chunk.forEach((rev) => {
          translated.push({
            ...rev,
            text: rev.textOriginal,
            lang: "ru",
            langSource: "sr",
          });
        });
      }
    } catch {
      chunk.forEach((rev) => {
        translated.push({
          ...rev,
          text: rev.textOriginal,
          lang: "ru",
          langSource: "sr",
        });
      });
    }
  }

  return translated;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("=== Testing Serbian Content Tools ===");
  console.log("Specialty 'Hirurgija':", mapSpecialty("Hirurgija"));
  console.log("Specialty 'Ginekologija i akušerstvo':", mapSpecialty("Ginekologija i akušerstvo"));
  console.log("Specialty 'Stomatolog':", mapSpecialty("Stomatolog"));
  console.log("Translit 'Dragan Ćirović':", transliterateSerbianToRussian("Dragan Ćirović"));
  console.log("Translit 'Jelena Đorđević':", transliterateSerbianToRussian("Jelena Đorđević"));
  console.log("Translit 'Bojan Jovanović':", transliterateSerbianToRussian("Bojan Jovanović"));
}
