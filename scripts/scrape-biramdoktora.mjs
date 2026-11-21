#!/usr/bin/env node
/**
 * Скрапер врачей и клиник с портала BiramDoktora.rs
 * Использует Schema.org/Physician и sitemap.xml
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_URL = 'https://biramdoktora.rs/sitemap.xml';
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'sources', 'serbian', 'raw-biramdoktora.json');

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

  // Извлечение клиники
  const locations = physician.location || [];
  const workplaces = locations.map(loc => ({
    clinic: loc.name || '',
    address: loc.address?.streetAddress || street,
    city: loc.address?.addressLocality || city,
    phone: loc.telephone || physician.telephone || ''
  }));

  // Страховки в тексте (если есть)
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

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 50;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  const urls = await getDoctorUrls();
  const targetUrls = limit > 0 ? urls.slice(0, limit) : urls;

  console.log(`[*] Парсинг ${targetUrls.length} профилей (limit: ${limit})...`);
  const doctors = [];

  for (let i = 0; i < targetUrls.length; i++) {
    const url = targetUrls[i];
    try {
      const html = await fetchText(url);
      const doc = parseDoctorPage(html, url);
      if (doc) {
        doctors.push(doc);
      }
      if ((i + 1) % 10 === 0 || i === targetUrls.length - 1) {
        console.log(`    [${i + 1}/${targetUrls.length}] Обработано...`);
      }
    } catch (err) {
      console.warn(`    [!] Ошибка при парсинге ${url}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(doctors, null, 2), 'utf-8');
  console.log(`[✓] Успешно сохранено ${doctors.length} врачей из BiramDoktora в ${OUT_FILE}`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
