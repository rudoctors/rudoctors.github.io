#!/usr/bin/env node
/**
 * Высокоскоростной параллельный скрапер BiramDoktora.rs (100% базы).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_URL = 'https://biramdoktora.rs/sitemap.xml';
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'sources', 'serbian', 'raw-biramdoktora.json');
const CONCURRENCY = 15;

async function fetchText(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

async function getDoctorUrls() {
  console.log(`[*] Загрузка sitemap: ${SITEMAP_URL}...`);
  const xml = await fetchText(SITEMAP_URL);
  const locs = [...xml.matchAll(/<loc>(https:\/\/biramdoktora\.rs\/doktori\/[^<]+)<\/loc>/g)].map(m => m[1]);
  console.log(`    -> Найдено ${locs.length} профилей врачей на BiramDoktora.`);
  return locs;
}

function parseDoctorPage(html, url) {
  let physician = null;
  const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed['@type'] === 'Physician') {
        physician = parsed;
        break;
      }
    } catch {}
  }

  if (!physician) return null;

  const rawName = (physician.name || '').replace(/^(prof\.|dr|mr|prim\.)\s+/i, '').trim();
  const address = physician.address || {};
  const city = address.addressLocality || (physician.areaServed?.[0] || 'Beograd');
  const street = address.streetAddress || '';

  const locations = physician.location || [];
  const workplaces = locations.map(loc => ({
    clinic: loc.name || '',
    address: loc.address?.streetAddress || street,
    city: loc.address?.addressLocality || city,
    phone: loc.telephone || physician.telephone || ''
  }));

  const insuranceMatches = html.match(/(Generali|Uniqa|Wiener\s+Städtische|Dunav\s+osiguranje|Triglav|DDOR|Grawe)/gi);
  const insurances = insuranceMatches ? [...new Set(insuranceMatches.map(s => s.trim()))] : [];

  return {
    source: 'biramdoktora',
    url,
    name: rawName,
    fullNameWithTitle: physician.name || rawName,
    specialties: physician.medicalSpecialty || [],
    city,
    address: street,
    phone: physician.telephone || '',
    photo: physician.image || '',
    workplaces,
    insurances,
    scrapedAt: new Date().toISOString()
  };
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
          .catch((err) => {
            // silent ignore
          })
          .finally(() => {
            activeWorkers--;
            if (results.length % 50 === 0 || index >= urls.length) {
              console.log(`    [BiramDoktora] Прогресс: ${results.length}/${urls.length}...`);
            }
            next();
          });
      }
    }

    next();
  });
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const urls = await getDoctorUrls();
  console.log(`[*] Запуск параллельного сбора ${urls.length} врачей (потоков: ${CONCURRENCY})...`);
  const doctors = await parallelFetchAll(urls);
  fs.writeFileSync(OUT_FILE, JSON.stringify(doctors, null, 2), 'utf-8');
  console.log(`[✓] BiramDoktora: сохранено ${doctors.length} врачей в ${OUT_FILE}`);
}

main().catch(console.error);
