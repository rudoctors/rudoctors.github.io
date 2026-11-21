#!/usr/bin/env node
/**
 * Скрапер врачей с портала NađiDoktora.rs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_URL = 'http://www.nadjidoktora.rs/sitemap.xml';
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'sources', 'serbian', 'raw-nadjidoktora.json');

const CITY_MAP = {
    'beograd': 'Belgrade',
    'savski-venac': 'Belgrade',
    'novi-beograd': 'Belgrade',
    'zemun': 'Belgrade',
    'vracar': 'Belgrade',
    'stari-grad': 'Belgrade',
    'zvezdara': 'Belgrade',
    'palilula': 'Belgrade',
    'vozdovac': 'Belgrade',
    'cukarica': 'Belgrade',
    'novi-sad': 'Novi Sad',
    'nis': 'Niš',
    'kragujevac': 'Kragujevac',
    'subotica': 'Subotica',
    'pancevo': 'Pančevo',
    'cacak': 'Čačak',
    'smederevo': 'Smederevo',
    'krusevac': 'Kruševac',
    'zrenjanin': 'Zrenjanin'
};

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
  // URL врачей имеют формат: http://www.nadjidoktora.rs/<cat>/<subcat>/<name-city-id>.htm
  const locs = [...xml.matchAll(/<loc>(http:\/\/www\.nadjidoktora\.rs\/[^\/]+\/[^\/]+\/[a-z0-9-]+-\d+\.htm)<\/loc>/g)].map(m => m[1]);
  console.log(`    -> Найдено ${locs.length} профилей врачей на NađiDoktora.`);
  return locs;
}

function parseDoctorPage(html, url) {
  // Breadcrumbs: <li><span>Slobodan Petrović</span></li>
  const breadcrumbNameMatch = html.match(/<ul class="hero-breadcrumbs">[\s\S]*?<li><span>([^<]+)<\/span><\/li>/i);
  let name = breadcrumbNameMatch ? breadcrumbNameMatch[1].trim() : '';

  // Если не нашлось в breadcrumbs — ищем в h1
  if (!name) {
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      name = h1Match[1].replace(/^(Doktor|Prof\.|Dr|Prim\.|specijalista)\s+/gi, '').trim();
    }
  }

  if (!name) return null;

  // Специальность: <h4>Pulmolog</h4>
  const specMatch = html.match(/<h4>([^<]+)<\/h4>/i);
  const specialtyRaw = specMatch ? specMatch[1].trim() : '';

  // Клиника: <h3>Ordinacija: Poliklinika HUMAN</h3>
  const clinicMatch = html.match(/<h3>Ordinacija:\s*([^<]+)<\/h3>/i) || html.match(/Ordinacija:\s*<a[^>]*>([^<]+)<\/a>/i);
  const clinic = clinicMatch ? clinicMatch[1].trim() : '';

  // Город из URL: /slobodan-petrovic-nis-112.htm
  const slugPart = url.match(/\/([^\/]+)-\d+\.htm$/i)?.[1] || '';
  const tokens = slugPart.split('-');
  let city = 'Belgrade';
  if (slugPart.endsWith('-novi-sad')) city = 'Novi Sad';
  else if (slugPart.endsWith('-nis')) city = 'Niš';
  else if (slugPart.endsWith('-subotica')) city = 'Subotica';
  else if (slugPart.endsWith('-kragujevac')) city = 'Kragujevac';
  else if (slugPart.endsWith('-pancevo')) city = 'Pančevo';
  else if (slugPart.endsWith('-smederevo')) city = 'Smederevo';
  else {
    const lastTok = tokens[tokens.length - 1];
    city = CITY_MAP[lastTok] || (lastTok ? lastTok.charAt(0).toUpperCase() + lastTok.slice(1) : 'Belgrade');
  }

  // Рекомендации / лайки: class="vote-mark ...">170</a>
  const votesMatch = html.match(/class=["'][^"']*vote-mark[^"']*["'][^>]*>(\d+)<\/a>/i);
  const votes = votesMatch ? parseInt(votesMatch[1], 10) : 0;

  // Услуги: <li> в блоке услуг
  const servicesBlock = html.match(/Usluge koje ovaj doktor pruža[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  const services = servicesBlock ? [...servicesBlock[1].matchAll(/<li[^>]*>([^<]+)<\/li>/gi)].map(m => m[1].trim()) : [];

  return {
    source: 'nadjidoktora',
    url,
    name,
    specialtyRaw,
    clinic,
    city,
    recommendationsCount: votes,
    services,
    workplaces: clinic ? [{ clinic, city }] : [],
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
  console.log(`[✓] Успешно сохранено ${doctors.length} врачей из NađiDoktora в ${OUT_FILE}`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
