#!/usr/bin/env node
/**
 * scripts/crawl-links.mjs
 * 
 * Internal link crawler for RuDoctors:
 * Scans all generated HTML pages in dist/ and verifies that every internal link (href="/...")
 * resolves to an existing HTML page, asset, or redirect target.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "..", "dist");

console.log("🕷️ RuDoctors Internal Link Crawler\n");

function walkHtml(dir) {
  let list = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      list = list.concat(walkHtml(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      list.push(full);
    }
  }
  return list;
}

const htmlFiles = walkHtml(DIST_DIR);
console.log(`Scanning ${htmlFiles.length} HTML files for internal links...`);

const uniqueLinks = new Set();
const linkSources = new Map(); // link -> [sourceFiles]

const HREF_REGEX = /href=["']([^"']+)["']/gi;

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, "utf-8");
  // Strip <script> and <style> tags so runtime client JS string templates aren't falsely parsed as static links
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  let match;
  while ((match = HREF_REGEX.exec(content)) !== null) {
    const rawHref = match[1].trim();
    // Skip external, mailto, tel, javascript, and pure anchors
    if (
      rawHref.startsWith("http://") ||
      rawHref.startsWith("https://") ||
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:") ||
      rawHref.startsWith("javascript:") ||
      rawHref.startsWith("#") ||
      rawHref.startsWith("data:")
    ) {
      continue;
    }

    // Strip query and hash
    const cleanPath = rawHref.split("?")[0].split("#")[0];
    if (!cleanPath) continue;

    uniqueLinks.add(cleanPath);
    if (!linkSources.has(cleanPath)) {
      linkSources.set(cleanPath, []);
    }
    const sources = linkSources.get(cleanPath);
    if (sources.length < 3) {
      sources.push(path.relative(DIST_DIR, file));
    }
  }
}

console.log(`Found ${uniqueLinks.size} unique internal links to verify.\n`);

let brokenCount = 0;
for (const link of uniqueLinks) {
  // Try resolving link against DIST_DIR
  let normalized = link.replace(/^\//, "");
  let exists = false;

  // 1. Exact file
  const exactPath = path.join(DIST_DIR, normalized);
  if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) {
    exists = true;
  }
  // 2. Directory with index.html
  if (!exists) {
    const indexPath = path.join(DIST_DIR, normalized, "index.html");
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      exists = true;
    }
  }
  // 3. normalized + .html
  if (!exists) {
    const htmlPath = path.join(DIST_DIR, normalized + ".html");
    if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
      exists = true;
    }
  }

  if (!exists) {
    brokenCount++;
    const sources = linkSources.get(link) || [];
    console.error(`  ❌ BROKEN LINK: '${link}' linked from [${sources.join(", ")}]`);
  }
}

console.log("\n==========================================");
if (brokenCount === 0) {
  console.log(`✅ CRAWLER VERIFIED: 0 broken links across ${uniqueLinks.size} internal endpoints!`);
  process.exit(0);
} else {
  console.error(`❌ CRAWLER FOUND ${brokenCount} broken internal links!`);
  process.exit(1);
}
