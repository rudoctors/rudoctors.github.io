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
const host = "rudoctors.github.io";

const sitemaps = fs
  .readdirSync(dist)
  .filter((f) => /^sitemap(-\d+)?\.xml$/.test(f) || f === "sitemap-index.xml");

const urls = new Set();
for (const sm of sitemaps) {
  if (sm === "sitemap-index.xml") continue;
  const xml = fs.readFileSync(path.join(dist, sm), "utf8");
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const u = m[1].trim();
    if (u.startsWith(`https://${host}/`)) urls.add(u);
  }
}

if (urls.size === 0) {
  console.error("No URLs found in sitemaps");
  process.exit(1);
}

const urlList = [...urls].slice(0, 10000);
const body = JSON.stringify({
  host,
  key,
  keyLocation: `https://${host}/${keyFile}`,
  urlList,
});

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body,
});
console.log(`IndexNow: submitted ${urlList.length} URLs, status ${res.status}`);
if (!res.ok && res.status !== 202) process.exit(1);
