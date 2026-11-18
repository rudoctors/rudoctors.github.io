/**
 * Scrapes doctors from Doctorus Expert (Belgrade, Višegradska 1A): https://doctorus.rs/ru
 * Extracts name, specialty, academic degree, photo, Altegio booking link and details.
 * Output: scripts/doctorus-doctors.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "scripts", "doctorus-doctors.json");

const BASE_URL = "https://doctorus.rs";

const dec = (s) =>
  String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function main() {
  console.log(`Fetching Doctorus listing: ${BASE_URL}/ru ...`);
  const res = await fetch(`${BASE_URL}/ru`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Doctorus main failed: ${res.status}`);
  const html = await res.text();

  const regex =
    /href="(\/ru\/doctors\/\d+)"[^>]*>([^<]+)<\/a><\/h3>[\s\S]*?<p[^>]*class="[^"]*Card-module[^"]*"[^>]*>([^<]+)<\/p>/g;
  const matches = [...html.matchAll(regex)];

  console.log(`Discovered ${matches.length} doctors on Doctorus.`);
  const doctors = [];

  for (const m of matches) {
    const relUrl = m[1].trim();
    const name = dec(m[2]);
    const specialtyText = dec(m[3]);
    const fullUrl = `${BASE_URL}${relUrl}`;

    try {
      const detailRes = await fetch(fullUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const detailHtml = await detailRes.text();

      // Find Altegio booking link
      const altegioM = detailHtml.match(/href="(https:\/\/doctorus\.altegio\.me\/[^"]+)"/i);
      const bookingUrl = altegioM ? altegioM[1] : undefined;

      // Find Altegio photo
      const photoM = detailHtml.match(/src="(https:\/\/assets\.alteg\.io\/masters\/origin\/[^"]+)"/i);
      const photo = photoM ? photoM[1] : undefined;

      // Extract degree if present
      let degree = "";
      if (/доктор медицинских наук/i.test(specialtyText) || /доктор медицинских наук/i.test(detailHtml)) {
        degree = "д.м.н.";
      } else if (/кандидат медицинских наук/i.test(specialtyText) || /кандидат медицинских наук/i.test(detailHtml)) {
        degree = "к.м.н.";
      }

      doctors.push({
        name,
        specialtyText,
        degree,
        bookingUrl,
        photo,
        url: fullUrl,
        clinic: "Doctorus Expert",
        address: "Višegradska 1A, Savski Venac",
        city: "Belgrade",
        languages: ["ru", "sr"],
      });

      console.log(`- ${name} | ${specialtyText} | booking=${bookingUrl ? "yes" : "no"}`);
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      console.error(`Error fetching detail for ${name}:`, e.message);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(doctors, null, 2), "utf8");
  console.log(`Saved ${doctors.length} Doctorus doctors to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error("Fatal Doctorus scrape error:", e);
  process.exit(1);
});
