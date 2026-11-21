/**
 * Scraper for Stetoskop.info doctor profiles.
 * Extracts: structured Physician JSON-LD, work affiliations, bio, photo, contact, and reviews.
 *
 * Usage:
 *   node scripts/scrape-stetoskop.mjs [--limit=50] [--slug=bojan-jovanovic] [--city=beograd]
 * Output:
 *   scripts/stetoskop-raw.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "scripts", "stetoskop-raw.json");

const SITEMAP_URL = "https://stetoskop.info/sitemap-lekari.xml";
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
      console.warn(`[stetoskop] HTTP ${res.status} for ${url}`);
      return null;
    }
    const html = await res.text();

    // 1. Parse JSON-LD
    let physicianLd = null;
    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed["@type"] === "Physician") {
          physicianLd = parsed;
          break;
        }
      } catch {}
    }

    const rawName = physicianLd?.name || "";
    const cleanName = cleanDoctorTitle(rawName);
    const photo = physicianLd?.image || undefined;
    const bioLd = physicianLd?.description || "";
    const phone = physicianLd?.telephone || undefined;
    const rawSpecialties = physicianLd?.medicalSpecialty || [];
    const affiliations = Array.isArray(physicianLd?.hospitalAffiliation)
      ? physicianLd.hospitalAffiliation.map((a) => ({
          clinic: a.name || "",
          url: a.url || "",
        }))
      : [];

    // 2. Extract sections from HTML if present
    const bioSectionMatch = html.match(/<h[23][^>]*>O lekaru<\/h[23]>([\s\S]*?)<\/(?:section|div)>/i);
    const bioText = bioSectionMatch ? cleanHtml(bioSectionMatch[1]) : bioLd;

    const experienceMatch = html.match(/<h[23][^>]*>Radno iskustvo<\/h[23]>([\s\S]*?)<\/(?:section|div)>/i);
    const experienceText = experienceMatch ? cleanHtml(experienceMatch[1]) : "";

    const educationMatch = html.match(/<h[23][^>]*>Obrazovanje<\/h[23]>([\s\S]*?)<\/(?:section|div)>/i);
    const educationText = educationMatch ? cleanHtml(educationMatch[1]) : "";

    // 3. Extract ratings / questions count
    let rating = 0;
    let reviewCount = 0;
    const ratingMatch = html.match(/<span[^>]*class="[^"]*ocena[^"]*"[^>]*>([\d.,]+)<\/span>/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1].replace(",", "."));
    }

    const slug = url.replace(/\/+$/, "").split("/").pop();

    return {
      source: "stetoskop.info",
      sourceUrl: url,
      slug,
      rawName,
      name: cleanName,
      photo,
      phone,
      specialties: rawSpecialties,
      workplaces: affiliations,
      bio: bioText,
      experienceText,
      educationText,
      rating: rating > 0 ? rating : undefined,
      reviewCount,
    };
  } catch (err) {
    console.error(`[stetoskop] Error fetching ${url}:`, err.message);
    return null;
  }
}

async function getDoctorUrlsFromSitemap(limit = 100) {
  console.log(`[stetoskop] Fetching sitemap: ${SITEMAP_URL} ...`);
  const res = await fetch(SITEMAP_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to load sitemap: ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`[stetoskop] Found total ${urls.length} doctor URLs in sitemap.`);
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
    const url = `https://stetoskop.info/doktor/${targetSlug}`;
    console.log(`[stetoskop] Scraping single doctor: ${url} ...`);
    const doc = await fetchDoctorProfile(url);
    if (doc) results.push(doc);
  } else {
    const urls = await getDoctorUrlsFromSitemap(limit);
    console.log(`[stetoskop] Scraping ${urls.length} doctor profiles ...`);

    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      process.stdout.write(`[${i + 1}/${urls.length}] ${u} ... `);
      const doc = await fetchDoctorProfile(u);
      if (doc) {
        results.push(doc);
        console.log(`OK: ${doc.name} (${doc.specialties.join(", ")})`);
      } else {
        console.log("SKIP");
      }
      // Gentle throttle
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), "utf8");
  console.log(`[stetoskop] Saved ${results.length} doctor profiles to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("[stetoskop] Fatal error:", err);
  process.exit(1);
});
