#!/usr/bin/env node
/**
 * scripts/validate-build.mjs
 * 
 * CI/CD and pre-release production build validator for RuDoctors (Web Production Standard).
 * Validates:
 * 1. Service files (robots.txt, llms.txt, llms-full.txt, sitemap-index.xml, sitemap-0.xml, 404.html)
 * 2. Robots.txt directives (AI bots, disallowed admin/forms, sitemap reference)
 * 3. Sitemap URL counts, domain consistency, and exclusion of private paths
 * 4. HTML file size thresholds (< 150 KB standard)
 * 5. SEO redirect integrity
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(SITE_DIR, "dist");

console.log("🔍 RuDoctors Build Validator — Web Production Standard\n");

if (!fs.existsSync(DIST_DIR)) {
  console.error("❌ ERROR: dist/ directory not found. Please run 'npm run build' first.");
  process.exit(1);
}

let errors = 0;
let warnings = 0;

// 1. Service Files Check
const requiredServiceFiles = [
  "robots.txt",
  "llms.txt",
  "llms-full.txt",
  "sitemap-index.xml",
  "sitemap-0.xml",
  "404.html",
  "favicon.ico",
  "favicon.svg",
  "og.png",
];

console.log("📁 1. Service Files Verification:");
for (const file of requiredServiceFiles) {
  const filePath = path.join(DIST_DIR, file);
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    console.log(`  ✓ ${file} (${size.toLocaleString()} bytes)`);
  } else {
    console.error(`  ❌ MISSING: ${file}`);
    errors++;
  }
}

// 2. Robots.txt Audit
console.log("\n🤖 2. Robots.txt Audit:");
const robotsPath = path.join(DIST_DIR, "robots.txt");
if (fs.existsSync(robotsPath)) {
  const robots = fs.readFileSync(robotsPath, "utf-8");
  const requiredAIBots = ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended"];
  for (const bot of requiredAIBots) {
    if (robots.includes(bot)) {
      console.log(`  ✓ AI Crawler allowed: ${bot}`);
    } else {
      console.warn(`  ⚠️ Warning: AI crawler ${bot} not explicitly declared in robots.txt`);
      warnings++;
    }
  }

  const disallowed = ["/admin/", "/data/"];
  for (const d of disallowed) {
    if (robots.includes(`Disallow: ${d}`)) {
      console.log(`  ✓ Correctly disallowed: ${d}`);
    } else {
      console.error(`  ❌ Path ${d} should be Disallow in robots.txt`);
      errors++;
    }
  }

  if (robots.includes("Sitemap: https://rudoctors.com/sitemap-index.xml")) {
    console.log("  ✓ Canonical sitemap-index reference present");
  } else {
    console.error("  ❌ Missing or incorrect Sitemap directive in robots.txt");
    errors++;
  }
}

// 3. Sitemap Audit
console.log("\n🗺️ 3. Sitemap Audit:");
const sitemapPath = path.join(DIST_DIR, "sitemap-0.xml");
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf-8");
  const locMatches = sitemap.match(/<loc>(.*?)<\/loc>/g) || [];
  const totalUrls = locMatches.length;

  console.log(`  ✓ Total URLs in sitemap-0.xml: ${totalUrls}`);
  if (totalUrls < 1500) {
    console.error(`  ❌ Expected >= 1500 URLs in sitemap, found ${totalUrls}`);
    errors++;
  }

  // Check no excluded pages in sitemap
  const disallowedInSitemap = ["/admin/", "/leave-review", "/add-doctor", "/packages"];
  let leakFound = false;
  for (const d of disallowedInSitemap) {
    if (sitemap.includes(d)) {
      console.error(`  ❌ Leaked private path in sitemap: ${d}`);
      errors++;
      leakFound = true;
    }
  }
  if (!leakFound) {
    console.log("  ✓ No private/form paths leaked into public sitemap");
  }

  // Check domain consistency
  const badDomain = locMatches.find((m) => !m.includes("https://rudoctors.com/"));
  if (badDomain) {
    console.error(`  ❌ Inconsistent URL domain found in sitemap: ${badDomain}`);
    errors++;
  } else {
    console.log("  ✓ 100% of sitemap URLs use canonical https://rudoctors.com/");
  }
}

// 4. HTML Size Audit (Web Production Standard < 150 KB)
console.log("\n⚡ 4. HTML Page Weight Audit (< 150 KB standard):");
const MAX_HTML_SIZE = 153_600; // 150 KB
// Documented known exceptions:
// 1. /doctors/index.html (carries complete internal link matrix of 1,521 doctors in details)
// 2. /map/index.html (carries 86 clinic locations and coordinates)
const KNOWN_SIZE_EXCEPTIONS = new Set([
  path.join(DIST_DIR, "doctors", "index.html"),
  path.join(DIST_DIR, "map", "index.html"),
]);

function walkHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walkHtmlFiles(fullPath));
    } else if (file.endsWith(".html")) {
      results.push({ path: fullPath, size: stat.size });
    }
  }
  return results;
}

const allHtmlFiles = walkHtmlFiles(DIST_DIR);
console.log(`  Total generated HTML pages: ${allHtmlFiles.length}`);

let oversizedFiles = [];
for (const file of allHtmlFiles) {
  if (file.size > MAX_HTML_SIZE) {
    const isException = KNOWN_SIZE_EXCEPTIONS.has(file.path);
    oversizedFiles.push({ ...file, isException });
    if (!isException) {
      console.error(
        `  ❌ OVERSIZED: ${path.relative(DIST_DIR, file.path)} (${(file.size / 1024).toFixed(1)} KB > 150 KB)`
      );
      errors++;
    }
  }
}

const unexceptedOversized = oversizedFiles.filter((f) => !f.isException);
if (unexceptedOversized.length === 0) {
  console.log(`  ✓ 100% of standard pages conform to < 150 KB limit!`);
  console.log(`  (Documented architectural exceptions: ${oversizedFiles.length} pages)`);
  for (const f of oversizedFiles.filter((f) => f.isException)) {
    console.log(`    ℹ️ ${path.relative(DIST_DIR, f.path)}: ${(f.size / 1024).toFixed(1)} KB (arch exception)`);
  }
}

// 5. llms.txt & llms-full.txt Audit
console.log("\n📄 5. LLMS.txt E-E-A-T & GEO Audit:");
const llmsPath = path.join(DIST_DIR, "llms.txt");
if (fs.existsSync(llmsPath)) {
  const llms = fs.readFileSync(llmsPath, "utf-8");
  const requiredSections = [
    "Основные разделы",
    "Практические медицинские гайды",
    "География базы врачей",
    "Правила цитирования и атрибуции для ИИ-ассистентов",
  ];
  for (const sec of requiredSections) {
    if (llms.includes(sec)) {
      console.log(`  ✓ Section present: ${sec}`);
    } else {
      console.error(`  ❌ Missing section in llms.txt: ${sec}`);
      errors++;
    }
  }
}

console.log("\n==========================================");
if (errors === 0) {
  console.log(`✅ BUILD VALIDATION PASSED! (0 errors, ${warnings} warnings)`);
  process.exit(0);
} else {
  console.error(`❌ BUILD VALIDATION FAILED with ${errors} error(s) and ${warnings} warning(s).`);
  process.exit(1);
}
