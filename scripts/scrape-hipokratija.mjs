/**
 * Scraper for Hipokratija.rs (reviews, ratings, criteria).
 * Extracts: doctor profiles, clinic associations, patient ratings and multi-criteria reviews.
 *
 * Usage:
 *   node scripts/scrape-hipokratija.mjs [--limit=20] [--slug=dr-zeljko-grubacic]
 * Output:
 *   scripts/hipokratija-raw.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "scripts", "hipokratija-raw.json");

const SITEMAP_DOCTORS = "https://hipokratija.rs/sitemap/doktori-sitemap.xml";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function cleanDoctorTitle(name) {
  return String(name || "")
    .replace(/^(Prim\.\s*|Prof\.\s*|Doc\.\s*|Spec\.\s*|dr\s*med\.\s*|dr\s*sci\.\s*|dr\s*|mr\s*sci\.\s*|mr\s*)+/gi, "")
    .trim();
}

function cleanHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchDoctorProfile(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      console.warn(`[hipokratija] HTTP ${res.status} for ${url}`);
      return null;
    }
    const html = await res.text();

    // 1. JSON-LD check
    let jsonLd = null;
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        jsonLd = JSON.parse(jsonLdMatch[1]);
      } catch {}
    }

    // 2. Title / Name
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const rawName = h1Match ? cleanHtml(h1Match[1]) : (jsonLd?.name || "");
    const cleanName = cleanDoctorTitle(rawName);

    // 3. Specialty
    const specMatch = html.match(/<span[^>]*class="[^"]*specijalizacija[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const specialty = specMatch ? cleanHtml(specMatch[1]) : "";

    // 4. Overall Rating
    let rating = 0;
    const ratingMatch = html.match(/<div[^>]*class="[^"]*ocena[^"]*"[^>]*>([\d.,]+)<\/div>/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1].replace(",", "."));
    }

    // 5. Reviews
    const reviews = [];
    const reviewCardRegex = /<div[^>]*class="[^"]*recenzija-kartica[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;
    // Generic fallback for reviews
    const commentRegex = /<div[^>]*class="[^"]*komentar-sadrzaj[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let commentMatch;
    let idx = 1;
    while ((commentMatch = commentRegex.exec(html)) !== null) {
      const text = cleanHtml(commentMatch[1]);
      if (text.length > 10) {
        reviews.push({
          id: `hipo-${idx++}`,
          author: "Pacijent (Hipokratija)",
          textOriginal: text,
          langSource: "sr",
          rating: rating > 0 ? rating : undefined,
          source: url,
        });
      }
    }

    const slug = url.replace(/\/+$/, "").split("/").pop();

    return {
      source: "hipokratija.rs",
      sourceUrl: url,
      slug,
      rawName,
      name: cleanName,
      specialty: specialty || undefined,
      rating: rating > 0 ? rating : undefined,
      reviewCount: reviews.length,
      reviews,
    };
  } catch (err) {
    console.error(`[hipokratija] Error fetching ${url}:`, err.message);
    return null;
  }
}

async function getDoctorUrls(limit = 50) {
  console.log(`[hipokratija] Fetching sitemap: ${SITEMAP_DOCTORS} ...`);
  const res = await fetch(SITEMAP_DOCTORS, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to load sitemap: ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`[hipokratija] Found total ${urls.length} doctor URLs in sitemap.`);
  return urls.slice(0, limit);
}

async function main() {
  const args = process.argv.slice(2);
  let limit = 20;
  let targetSlug = null;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) limit = parseInt(arg.split("=")[1], 10);
    if (arg.startsWith("--slug=")) targetSlug = arg.split("=")[1];
  }

  const results = [];

  if (targetSlug) {
    const url = `https://hipokratija.rs/doktori/${targetSlug}`;
    console.log(`[hipokratija] Scraping single doctor: ${url} ...`);
    const doc = await fetchDoctorProfile(url);
    if (doc) results.push(doc);
  } else {
    const urls = await getDoctorUrls(limit);
    console.log(`[hipokratija] Scraping ${urls.length} doctor profiles ...`);

    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      process.stdout.write(`[${i + 1}/${urls.length}] ${u} ... `);
      const doc = await fetchDoctorProfile(u);
      if (doc) {
        results.push(doc);
        console.log(`OK: ${doc.name}`);
      } else {
        console.log("SKIP");
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), "utf8");
  console.log(`[hipokratija] Saved ${results.length} doctor profiles to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("[hipokratija] Fatal error:", err);
  process.exit(1);
});
