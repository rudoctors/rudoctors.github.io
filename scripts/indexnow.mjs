#!/usr/bin/env node
/**
 * IndexNow: submit built URLs to Yandex (https://yandex.com/indexnow) and Bing/IndexNow (https://api.indexnow.org/indexnow).
 * Key file must exist in dist/ or public/ as {key}.txt.
 * Usage:
 *   node scripts/indexnow.mjs [distDir]
 *   node scripts/indexnow.mjs --clusters
 *   node scripts/indexnow.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isClustersOnly = args.includes("--clusters") || args.includes("--priority");
const targetDir = args.find((a) => !a.startsWith("--")) || "dist";

const dist = path.resolve(targetDir);
const publicDir = path.resolve("public");

// Locate key file in dist or public
let keyFile = null;
if (fs.existsSync(dist)) {
  keyFile = fs.readdirSync(dist).find((f) => /^[0-9a-f]{32}\.txt$/i.test(f));
}
if (!keyFile && fs.existsSync(publicDir)) {
  keyFile = fs.readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/i.test(f));
}

if (!keyFile) {
  console.error("IndexNow key file not found in dist or public");
  process.exit(1);
}

const key = keyFile.replace(/\.txt$/i, "");
const cnamePath = fs.existsSync(path.join(dist, "CNAME"))
  ? path.join(dist, "CNAME")
  : path.join(publicDir, "CNAME");

const host = fs.existsSync(cnamePath)
  ? fs.readFileSync(cnamePath, "utf8").trim()
  : "rudoctors.com";

const urls = new Set();

// If dist exists and has sitemaps, extract from sitemaps
if (fs.existsSync(dist)) {
  const sitemaps = fs
    .readdirSync(dist)
    .filter((f) => /^sitemap(-\d+)?\.xml$/.test(f) || f === "sitemap-index.xml");

  for (const sm of sitemaps) {
    if (sm === "sitemap-index.xml") continue;
    const xml = fs.readFileSync(path.join(dist, sm), "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1].trim();
      if (u.startsWith(`https://${host}/`) || u.startsWith("https://rudoctors.com/") || u.startsWith("https://rudoctors.github.io/")) {
        const normalized = u.replace("https://rudoctors.github.io/", `https://${host}/`);
        urls.add(normalized);
      }
    }
  }
}

// If sitemaps not found or clusters only requested, synthesize cluster URLs from data
if (urls.size === 0 || isClustersOnly) {
  const dataDir = path.resolve("src", "data", "doctors");
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
    urls.add(`https://${host}/`);
    urls.add(`https://${host}/cities/`);
    urls.add(`https://${host}/specialties/`);
    urls.add(`https://${host}/doctors/`);

    const citySlug = (city) =>
      String(city || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const pairs = new Set();
    for (const f of files) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
        if (d.hidden || !d.city) continue;
        const cSlug = citySlug(d.city);
        urls.add(`https://${host}/cities/${cSlug}/`);
        for (const s of d.specializations || []) {
          if (!s || !s.trim()) continue;
          const cleanSpec = s.trim();
          pairs.add(`${cSlug}/${cleanSpec}`);
        }
      } catch {}
    }

    for (const p of pairs) {
      urls.add(`https://${host}/cities/${p}/`);
    }
  }
}

if (urls.size === 0) {
  console.error("No URLs found to submit to IndexNow");
  process.exit(1);
}

// Separate cluster & home URLs to give them first priority in chunking
const allUrls = [...urls];
const priorityUrls = allUrls.filter(
  (u) => u === `https://${host}/` || u.includes("/cities/") || u.includes("/specialties/")
);
const regularUrls = allUrls.filter((u) => !priorityUrls.includes(u));
const orderedUrls = isClustersOnly ? priorityUrls : [...priorityUrls, ...regularUrls];

console.log(`IndexNow configuration:`);
console.log(`- Host: ${host}`);
console.log(`- Key: ${key}`);
console.log(`- Key location: https://${host}/${keyFile}`);
console.log(`- Total URLs to submit: ${orderedUrls.length} (${priorityUrls.length} priority cluster/regional URLs)`);

if (isDryRun) {
  console.log("DRY RUN: Sample first 10 URLs:");
  orderedUrls.slice(0, 10).forEach((u) => console.log("  ", u));
  console.log("DRY RUN completed without HTTP calls.");
  process.exit(0);
}

const CHUNK_SIZE = 250;
const ENDPOINTS = [
  { name: "Yandex", url: "https://yandex.com/indexnow" },
  { name: "IndexNow (Bing/Global)", url: "https://api.indexnow.org/indexnow" },
];

let totalSubmitted = 0;

for (let i = 0; i < orderedUrls.length; i += CHUNK_SIZE) {
  const chunk = orderedUrls.slice(i, i + CHUNK_SIZE);
  const body = JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${keyFile}`,
    urlList: chunk,
  });

  const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
  const totalChunks = Math.ceil(orderedUrls.length / CHUNK_SIZE);

  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
      });

      console.log(
        `[${ep.name}] Chunk ${chunkNum}/${totalChunks} (${chunk.length} URLs) -> status ${res.status} (${res.statusText})`
      );

      if (!res.ok && res.status !== 202) {
        console.warn(`[${ep.name}] Warning: returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[${ep.name}] Network warning for chunk ${chunkNum}:`, err.message);
    }
  }

  totalSubmitted += chunk.length;
}

console.log(`IndexNow: successfully processed ${totalSubmitted} URLs across search engines.`);
