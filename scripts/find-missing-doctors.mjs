import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const doctorsDir = path.join(root, 'src', 'data', 'doctors');

const existingDocs = fs.readdirSync(doctorsDir).map(f => {
  return JSON.parse(fs.readFileSync(path.join(doctorsDir, f), 'utf8').replace(/^\uFEFF/, ''));
});

const existingNames = new Set();
const existingTelegrams = new Set();
const existingPhones = new Set();

for (const d of existingDocs) {
  existingNames.add(d.name.toLowerCase().trim());
  if (d.nameEn) existingNames.add(d.nameEn.toLowerCase().trim());
  // Add single last names if unique
  const parts = d.name.split(/\s+/);
  if (parts.length >= 2) {
    existingNames.add(`${parts[0]} ${parts[1]}`.toLowerCase());
    existingNames.add(`${parts[1]} ${parts[0]}`.toLowerCase());
  }
  if (d.contacts) {
    if (d.contacts.telegram) {
      existingTelegrams.add(d.contacts.telegram.replace(/https?:\/\/t\.me\//i, '').replace(/^@/, '').toLowerCase().trim());
    }
    if (d.contacts.phone) {
      existingPhones.add(d.contacts.phone.replace(/\D/g, ''));
    }
  }
}

const visitkas = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'tg-export-visitkas.json'), 'utf8'));

console.log(`Auditing ${visitkas.length} visitkas against ${existingDocs.length} existing doctors...`);

const candidates = [];

for (const v of visitkas) {
  const text = v.text || '';
  if (text.length < 80) continue;

  // Skip clinic-only vacancy or non-doctor ads
  if (/^(ищем|вакансия|требуется|сдам|аренда)/i.test(text)) continue;

  // Check if any existing doctor matches
  let matched = false;
  for (const name of existingNames) {
    if (name.length >= 5 && text.toLowerCase().includes(name)) {
      matched = true;
      break;
    }
  }
  if (!matched && v.from) {
    for (const name of existingNames) {
      if (name.length >= 5 && v.from.toLowerCase().includes(name)) {
        matched = true;
        break;
      }
    }
  }

  if (!matched) {
    candidates.push({
      id: v.id,
      date: v.date,
      from: v.from,
      text: text,
      url: v.url
    });
  }
}

console.log(`Found ${candidates.length} potentially missing doctor visitkas.`);

// Print out top candidates with good structure
fs.writeFileSync(path.join(root, 'scripts', 'potential-missing-doctors.json'), JSON.stringify(candidates, null, 2), 'utf8');
console.log('Saved to scripts/potential-missing-doctors.json');
