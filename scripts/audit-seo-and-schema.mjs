#!/usr/bin/env node
/**
 * scripts/audit-seo-and-schema.mjs
 * 
 * Validates:
 * 1. Schema.org JSON-LD structures across templates (WebSite, Organization, CollectionPage, FAQPage, ItemList, MedicalWebPage, Physician, BreadcrumbList)
 * 2. All 30+ Astro redirects in dist/ (meta-refresh targets)
 * 3. Live 301 mirror rudoctors.rs -> rudoctors.com
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "..", "dist");

console.log("🔍 RuDoctors SEO & Schema.org Auditor\n");

let errors = 0;

// Helper to extract JSON-LD from HTML file
function getJsonLd(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const html = fs.readFileSync(filePath, "utf-8");
  const regex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch (e) {
      console.error(`  ❌ JSON-LD Parse Error in ${filePath}:`, e.message);
      errors++;
    }
  }
  return blocks;
}

// 1. Schema.org Template Checks
console.log("📐 1. Schema.org JSON-LD Template Validation:");

const pagesToTest = [
  {
    name: "Home Page (/index.html)",
    path: path.join(DIST_DIR, "index.html"),
    requiredTypes: ["WebSite", "Organization"],
  },
  {
    name: "City Hub (/cities/belgrade/index.html)",
    path: path.join(DIST_DIR, "cities", "belgrade", "index.html"),
    requiredTypes: ["CollectionPage", "FAQPage", "BreadcrumbList"],
  },
  {
    name: "City Hub Novi Sad (/cities/novi-sad/index.html)",
    path: path.join(DIST_DIR, "cities", "novi-sad", "index.html"),
    requiredTypes: ["CollectionPage", "FAQPage", "BreadcrumbList"],
  },
  {
    name: "Specialty Cluster (/cities/belgrade/gynecologist/index.html)",
    path: path.join(DIST_DIR, "cities", "belgrade", "gynecologist", "index.html"),
    requiredTypes: ["MedicalWebPage", "CollectionPage", "FAQPage", "BreadcrumbList"],
  },
  {
    name: "Specialty Cluster Pediatrician (/cities/belgrade/pediatrician/index.html)",
    path: path.join(DIST_DIR, "cities", "belgrade", "pediatrician", "index.html"),
    requiredTypes: ["MedicalWebPage", "CollectionPage", "FAQPage", "BreadcrumbList"],
  },
  {
    name: "Specialty Index (/specialties/therapist/index.html)",
    path: path.join(DIST_DIR, "specialties", "therapist", "index.html"),
    requiredTypes: ["CollectionPage", "BreadcrumbList"],
  },
  {
    name: "Doctor Profile (/doctors/marko-sente/index.html)",
    path: path.join(DIST_DIR, "doctors", "marko-sente", "index.html"),
    requiredTypes: ["Physician"],
  },
  {
    name: "Clinics Map (/map/index.html)",
    path: path.join(DIST_DIR, "map", "index.html"),
    requiredTypes: ["CollectionPage", "BreadcrumbList"],
  },
  {
    name: "Guide (/guides/public-private-care/index.html)",
    path: path.join(DIST_DIR, "guides", "public-private-care", "index.html"),
    requiredTypes: ["BreadcrumbList"],
  },
];

for (const p of pagesToTest) {
  const blocks = getJsonLd(p.path);
  if (!blocks || blocks.length === 0) {
    console.error(`  ❌ ${p.name}: No JSON-LD found!`);
    errors++;
    continue;
  }
  const types = new Set(blocks.map((b) => b["@type"]).filter(Boolean));
  let ok = true;
  for (const rt of p.requiredTypes) {
    if (!types.has(rt)) {
      console.error(`  ❌ ${p.name}: Missing expected Schema.org type '${rt}' (Found: ${[...types].join(", ")})`);
      errors++;
      ok = false;
    }
  }
  if (ok) {
    console.log(`  ✓ ${p.name}: Valid Schema.org [${[...types].join(", ")}]`);
  }
}

// 2. Redirects in dist/
console.log("\n🔀 2. Redirects Validation (from astro.config.mjs):");
import config from "../astro.config.mjs";
const redirects = config.redirects || {};
let redirectsTested = 0;
let redirectsOk = 0;

for (const [from, to] of Object.entries(redirects)) {
  redirectsTested++;
  // Astro static generates an HTML file at the 'from' path with meta-refresh to 'to'
  const cleanFrom = from.replace(/^\//, "").replace(/\/$/, "");
  const redirectHtmlPath = path.join(DIST_DIR, cleanFrom, "index.html");
  if (fs.existsSync(redirectHtmlPath)) {
    const content = fs.readFileSync(redirectHtmlPath, "utf-8");
    if (content.includes(to)) {
      redirectsOk++;
    } else {
      console.error(`  ❌ Redirect ${from} does not target ${to}`);
      errors++;
    }
  } else {
    // Check if directly a .html file
    const altHtml = path.join(DIST_DIR, cleanFrom + ".html");
    if (fs.existsSync(altHtml)) {
      const content = fs.readFileSync(altHtml, "utf-8");
      if (content.includes(to)) {
        redirectsOk++;
      } else {
        console.error(`  ❌ Redirect ${from} does not target ${to}`);
        errors++;
      }
    } else {
      console.error(`  ❌ Redirect file for ${from} not found in dist`);
      errors++;
    }
  }
}
console.log(`  ✓ Checked ${redirectsTested} redirects: ${redirectsOk} verified targeting valid destinations.`);

// 3. Live 301 Mirror Check
console.log("\n🌐 3. Live Mirror Validation (rudoctors.rs -> rudoctors.com):");
try {
  const res = await fetch("https://rudoctors.rs", { redirect: "manual" });
  console.log(`  HTTP status for https://rudoctors.rs: ${res.status}`);
  const location = res.headers.get("location");
  console.log(`  Redirect location: ${location}`);
  if (res.status === 301 && (location === "https://rudoctors.com/" || location === "https://rudoctors.com")) {
    console.log("  ✓ Cloudflare 301 mirror is active and points to https://rudoctors.com/");
  } else {
    console.warn(`  ⚠️ Mirror returned status ${res.status} with location ${location}`);
  }
} catch (e) {
  console.warn(`  ⚠️ Could not test live mirror https://rudoctors.rs: ${e.message}`);
}

console.log("\n==========================================");
if (errors === 0) {
  console.log("✅ ALL SEO & SCHEMA.ORG CHECKS PASSED!");
  process.exit(0);
} else {
  console.error(`❌ SEO & SCHEMA CHECKS FAILED with ${errors} error(s).`);
  process.exit(1);
}
