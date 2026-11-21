#!/usr/bin/env node
/**
 * Скрапер ординаций и клиник с портала Ordinacije.rs
 * Извлекает координаты, адреса, телефоны, специализации и врачей для карты клиник /map
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CITIES = ['beograd', 'novi-sad', 'nis', 'kragujevac', 'subotica', 'pancevo'];
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'sources', 'serbian', 'raw-ordinacije.json');

async function fetchText(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

async function getOrdinacijaUrls() {
  const urls = new Set();
  for (const c of CITIES) {
    try {
      console.log(`[*] Проверка ординаций в городе ${c}...`);
      const html = await fetchText(`https://ordinacije.rs/${c}`);
      const matches = html.match(/\/ordinacija\/[a-z0-9-]+/g) || [];
      matches.forEach(m => urls.add(`https://ordinacije.rs${m}`));
    } catch (err) {
      console.warn(`    [!] Ошибка при загрузке ${c}: ${err.message}`);
    }
  }
  return [...urls];
}

function parseOrdinacijaPage(html, url) {
  const ldJson = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let clinic = null;
  for (const m of ldJson) {
    try {
      const p = JSON.parse(m[1]);
      if (p['@type'] === 'MedicalClinic' || p['@type'] === 'Dentist' || p['@type'] === 'Physician') {
        clinic = p;
        break;
      }
    } catch {}
  }

  if (!clinic) return null;

  const address = clinic.address || {};
  const geo = clinic.geo || {};
  const lat = typeof geo.latitude === 'number' ? geo.latitude : parseFloat(geo.latitude || '0');
  const lng = typeof geo.longitude === 'number' ? geo.longitude : parseFloat(geo.longitude || '0');

  // Извлечение имени врача из описания (например, "dr Petar Simić")
  const desc = clinic.description || '';
  const doctorMatch = desc.match(/(?:prof\.|dr|prim\.)\s+([A-ZŠĐČĆŽ][a-zšđčćž]+(?:\s+[A-ZŠĐČĆŽ][a-zšđčćž]+)+)/i);
  const leadDoctor = doctorMatch ? doctorMatch[0].trim() : null;

  return {
    source: 'ordinacije.rs',
    url,
    name: clinic.name || '',
    description: desc,
    leadDoctor,
    category: clinic['@type'] === 'Dentist' ? 'dental' : 'ordination',
    specialties: clinic.medicalSpecialty || [],
    city: address.addressLocality || 'Belgrade',
    address: address.streetAddress || '',
    phone: clinic.telephone || '',
    coordinates: lat && lng ? { lat, lng } : null,
    images: clinic.image || [],
    sameAs: clinic.sameAs || [],
    openingHours: clinic.openingHoursSpecification || [],
    scrapedAt: new Date().toISOString()
  };
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 50;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  const urls = await getOrdinacijaUrls();
  console.log(`[*] Всего найдено ${urls.length} ординаций.`);

  const targetUrls = limit > 0 ? urls.slice(0, limit) : urls;
  console.log(`[*] Парсинг ${targetUrls.length} ординаций (limit: ${limit})...`);

  const results = [];
  for (let i = 0; i < targetUrls.length; i++) {
    const url = targetUrls[i];
    try {
      const html = await fetchText(url);
      const data = parseOrdinacijaPage(html, url);
      if (data) results.push(data);
      if ((i + 1) % 5 === 0 || i === targetUrls.length - 1) {
        console.log(`    [${i + 1}/${targetUrls.length}] Обработано...`);
      }
    } catch (err) {
      console.warn(`    [!] Ошибка при парсинге ${url}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`[✓] Успешно сохранено ${results.length} ординаций в ${OUT_FILE}`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
