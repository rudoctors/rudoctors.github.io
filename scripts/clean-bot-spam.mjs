import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const doctorsDir = path.join(root, 'src', 'data', 'doctors');

function isBotSpamOrSelfCard(r) {
  const author = (r.author || '').toLowerCase();
  const text = (r.text || '');
  const tLower = text.toLowerCase();

  // 1. Bot authors
  if (/поиск в|easyrelocate|easy\.\.\.|@search|бот /i.test(author)) return true;

  // 2. Bot text patterns
  if (/специалисты по вашему запросу|по вашему запросу:|подходящие специалисты|в моей базе данных|в контексте есть упоминание|результаты поиска|найденные специалисты/i.test(tLower)) return true;

  // 3. Bot recommendation summaries
  if (/(?:в белграде|в нови саде|в нови-саде|в сербии) есть несколько (?:рекомендованных|русскоговорящих)/i.test(tLower)) return true;

  // 4. Bulleted bot lists: multiple '• ' with clinic/contacts
  if ((text.match(/•/g) || []).length >= 2 && /📍|📞|Telegram:/i.test(text)) return true;

  // 5. Doctor self-intro / visitka in reviews
  if (/^(?:👨‍⚕️|👩🏻‍⚕️|👩‍⚕️)?\s*([а-яёa-z\s]+)\s*—?\s*(?:врач|стоматолог|педиатр|терапевт|хирург|гинеколог|невролог|эндокринолог|остеопат)/i.test(text) &&
      /(?:опыт работы|стаж|основные направления работы|образование:|при[её]м в клинике)/i.test(text)) {
    return true;
  }

  return false;
}

const files = fs.readdirSync(doctorsDir).filter(f => f.endsWith('.json'));
let totalCleaned = 0;
let doctorsUpdated = 0;

for (const file of files) {
  const filePath = path.join(doctorsDir, file);
  const doc = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));

  if (!Array.isArray(doc.reviews) || doc.reviews.length === 0) continue;

  const originalCount = doc.reviews.length;
  const filteredReviews = doc.reviews.filter(r => !isBotSpamOrSelfCard(r));

  if (filteredReviews.length !== originalCount) {
    const removedCount = originalCount - filteredReviews.length;
    totalCleaned += removedCount;
    doctorsUpdated++;
    doc.reviews = filteredReviews;
    doc.updatedAt = '2026-10-31';
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  }
}

console.log(`Cleaned ${totalCleaned} bot spam/self-intro items across ${doctorsUpdated} doctor profiles.`);
