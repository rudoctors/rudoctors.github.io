/**
 * Scraper for OceniLekara.com doctor profiles and ratings.
 * Extracts: doctor profiles, hospital/clinic, specialty, rating, and patient comments.
 *
 * Usage:
 *   node scripts/scrape-ocenilekara.mjs [--limit=20] [--slug=vanja-macanovic]
 * Output:
 *   scripts/ocenilekara-raw.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "scripts", "ocenilekara-raw.json");

const SITEMAP_DOCTORS = "https://ocenilekara.com/sitemap-lekari.xml";
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
      console.warn(`[ocenilekara] HTTP ${res.status} for ${url}`);
      return null;
    }
    const html = await res.text();

    // 1. Title / Name
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const rawName = h1Match ? cleanHtml(h1Match[1]) : "";
    const cleanName = cleanDoctorTitle(rawName);

    // 2. Specialty & Institution
    const specMatch = html.match(/<a[^>]*href="[^"]*specijalnost[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const specialty = specMatch ? cleanHtml(specMatch[1]) : "";

    const instMatch = html.match(/<a[^>]*href="[^"]*ustanov[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const institution = instMatch ? cleanHtml(instMatch[1]) : "";

    // 3. Rating
    let rating = 0;
    const ratingMatch = html.match(/(?:Ocena|Prosečna ocena)[\s\S]*?([\d.,]+)\s*\/\s*5/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1].replace(",", "."));
    }

    // 4. Comments
    const reviews = [];
    const commentRegex = /<div[^>]*class="[^"]*(?:comment|komentar)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let commentMatch;
    let idx = 1;
    while ((commentMatch = commentRegex.exec(html)) !== null) {
      const text = cleanHtml(commentMatch[1]);
      if (text.length > 15 && !text.includes("Oceni lekara")) {
        reviews.push({
          id: `oceni-${idx++}`,
          author: "Pacijent (OceniLekara)",
          textOriginal: text,
          langSource: "sr",
          rating: rating > 0 ? rating : undefined,
          source: url,
        });
      }
    }

    const slug = url.replace(/\/+$/, "").split("/").pop();

    return {
      source: "ocenilekara.com",
      sourceUrl: url,
      slug,
      rawName,
      name: cleanName,
      specialty: specialty || undefined,
      institution: institution || undefined,
      rating: rating > 0 ? rating : undefined,
      reviewCount: reviews.length,
      reviews,
    };
  } catch (err) {
    console.error(`[ocenilekara] Error fetching ${url}:`, err.message);
    return null;
  }
}

async function getDoctorUrls(limit = 50) {
  console.log(`[ocenilekara] Fetching sitemap: ${SITEMAP_DOCTORS} ...`);
  const res = await fetch(SITEMAP_DOCTORS, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to load sitemap: ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`[ocenilekara] Found total ${urls.length} doctor URLs in sitemap.`);
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
    const url = `https://ocenilekara.com/lekari/${targetSlug}`;
    console.log(`[ocenilekara] Scraping single doctor: ${url} ...`);
    const doc = await fetchDoctorProfile(url);
    if (doc) results.push(doc);
  } else {
    const urls = await getDoctorUrls(limit);
    console.log(`[ocenilekara] Scraping ${urls.length} doctor profiles ...`);

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
  console.log(`[ocenilekara] Saved ${results.length} doctor profiles to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("[ocenilekara] Fatal error:", err);
  process.exit(1);
});
