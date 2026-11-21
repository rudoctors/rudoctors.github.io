#!/usr/bin/env node
/**
 * Высокоскоростной параллельный скрапер Stetoskop.info (1000 врачей).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_URL = 'https://stetoskop.info/sitemap-lekari.xml';
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'sources', 'serbian', 'raw-stetoskop.json');
const CONCURRENCY = 15;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function cleanDoctorTitle(name) {
  return String(name || '')
    .replace(/^(Prim\.\s*|Prof\.\s*|Doc\.\s*|Spec\.\s*|dr\s*med\.\s*|dr\s*sci\.\s*|dr\s*|mr\s*sci\.\s*|mr\s*)+/gi, '')
    .trim();
}

function cleanHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseDoctorPage(html, url) {
  let physician = null;
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed['@type'] === 'Physician') {
        physician = parsed;
        break;
      }
    } catch {}
  }

  if (!physician) return null;

  const rawName = physician.name || '';
  const cleanName = cleanDoctorTitle(rawName);
  if (!cleanName) return null;

  const photo = physician.image || undefined;
  const bioLd = physician.description || '';
  const phone = physician.telephone || undefined;
  const rawSpecialties = physician.medicalSpecialty || [];

  const affiliations = Array.isArray(physician.hospitalAffiliation)
    ? physician.hospitalAffiliation.map((a) => ({
        clinic: a.name || '',
        url: a.url || '',
        city: 'Belgrade'
      }))
    : [];

  const address = physician.address || {};
  const city = address.addressLocality || 'Belgrade';

  const bioSectionMatch = html.match(/<h[23][^>]*>O lekaru<\/h[23]>([\s\S]*?)<\/(?:section|div)>/i);
  const bioText = bioSectionMatch ? cleanHtml(bioSectionMatch[1]) : bioLd;

  const experienceMatch = html.match(/<h[23][^>]*>Radno iskustvo<\/h[23]>([\s\S]*?)<\/(?:section|div)>/i);
  const experienceText = experienceMatch ? cleanHtml(experienceMatch[1]) : '';

  return {
    source: 'stetoskop.info',
    url,
    name: cleanName,
    fullNameWithTitle: rawName,
    photo,
    phone,
    city,
    specialties: rawSpecialties,
    workplaces: affiliations,
    bio: bioText,
    experienceText,
    scrapedAt: new Date().toISOString()
  };
}

async function getDoctorUrls(limit = 1000) {
  console.log(`[*] Загрузка sitemap: ${SITEMAP_URL}...`);
  const xml = await fetchText(SITEMAP_URL);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  console.log(`    -> Найдено ${locs.length} профилей на Stetoskop.info.`);
  return locs.slice(0, limit);
}

async function parallelFetchAll(urls) {
  const results = [];
  let index = 0;
  let activeWorkers = 0;

  return new Promise((resolve) => {
    function next() {
      if (index >= urls.length && activeWorkers === 0) {
        return resolve(results);
      }

      while (activeWorkers < CONCURRENCY && index < urls.length) {
        const i = index++;
        const url = urls[i];
        activeWorkers++;

        fetchText(url)
          .then((html) => {
            const data = parseDoctorPage(html, url);
            if (data) results.push(data);
          })
          .catch(() => {})
          .finally(() => {
            activeWorkers--;
            if (results.length % 100 === 0 || index >= urls.length) {
              console.log(`    [Stetoskop] Прогресс: ${results.length}/${urls.length}...`);
            }
            next();
          });
      }
    }

    next();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 1000;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const urls = await getDoctorUrls(limit);
  console.log(`[*] Запуск параллельного сбора ${urls.length} врачей со Stetoskop.info (потоков: ${CONCURRENCY})...`);
  const doctors = await parallelFetchAll(urls);
  fs.writeFileSync(OUT_FILE, JSON.stringify(doctors, null, 2), 'utf-8');
  console.log(`[✓] Stetoskop.info: сохранено ${doctors.length} врачей в ${OUT_FILE}`);
}

main().catch(console.error);
