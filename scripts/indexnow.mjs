#!/usr/bin/env node
/**
 * IndexNow: submit built URLs from dist/sitemap-*.xml to api.indexnow.org.
 * Key file must exist in dist as {key}.txt (copied from public/).
 * Usage: node scripts/indexnow.mjs [distDir]
 */
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
if (!fs.existsSync(dist)) {
  console.error("dist not found:", dist);
  process.exit(1);
}

const keyFile = fs.readdirSync(dist).find((f) => /^[0-9a-f]{32}\.txt$/i.test(f));
if (!keyFile) {
  console.error("IndexNow key file not found in dist");
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/i, "");
const cnamePath = path.join(dist, "CNAME");
const host = fs.existsSync(cnamePath)
  ? fs.readFileSync(cnamePath, "utf8").trim()
  : "rudoctors.com";

const sitemaps = fs
  .readdirSync(dist)
  .filter((f) => /^sitemap(-\d+)?\.xml$/.test(f) || f === "sitemap-index.xml");

const urls = new Set();
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

if (urls.size === 0) {
  console.error("No URLs found in sitemaps");
  process.exit(1);
}

const urlList = [...urls];
const CHUNK_SIZE = 250;
let submitted = 0;

for (let i = 0; i < urlList.length; i += CHUNK_SIZE) {
  const chunk = urlList.slice(i, i + CHUNK_SIZE);
  const body = JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${keyFile}`,
    urlList: chunk,
  });

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body,
  });

  console.log(`IndexNow: chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} URLs) -> status ${res.status}`);
  if (!res.ok && res.status !== 202) {
    console.error(`IndexNow submission failed at chunk ${Math.floor(i / CHUNK_SIZE) + 1}`);
    process.exit(1);
  }
  submitted += chunk.length;
}

console.log(`IndexNow: successfully submitted all ${submitted} URLs.`);
