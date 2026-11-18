/**
 * Scrapes Russian-speaking doctors from MediGroup (Serbia): https://www.medigroup.rs/russkie-vrachi/
 * Extracts name, specialty, photo URL, clinic locations and detail URL.
 * Output: scripts/medigroup-doctors.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "scripts", "medigroup-doctors.json");

const URL = "https://www.medigroup.rs/russkie-vrachi/";

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
  console.log(`Fetching MediGroup Russian-speaking doctors: ${URL} ...`);
  const res = await fetch(URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`MediGroup fetch failed: ${res.status}`);
  const html = await res.text();

  const regex =
    /<a href="(https:\/\/www\.medigroup\.rs\/lekari\/[^"]+)" aria-label="([^"]+)"[\s\S]*?<img [^>]*src="([^"]+)"[\s\S]*?<div class="pt-6">\s*<span[^>]*>([^<]+)<\/span>/g;
  const matches = [...html.matchAll(regex)];

  console.log(`Matched ${matches.length} doctors from MediGroup slider.`);
  const doctors = [];

  for (const m of matches) {
    const url = m[1].trim();
    const name = dec(m[2]);
    const photo = m[3].trim();
    const specialty = dec(m[4]);
    const slug = url.replace(/\/+$/, "").split("/").pop();

    doctors.push({
      slug,
      name,
      specialty,
      photo,
      url,
      clinic: "MediGroup",
      city: "Belgrade",
    });

    console.log(`- ${name} | ${specialty} | ${url}`);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(doctors, null, 2), "utf8");
  console.log(`Saved ${doctors.length} MediGroup doctors to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error("Fatal MediGroup scrape error:", e);
  process.exit(1);
});
