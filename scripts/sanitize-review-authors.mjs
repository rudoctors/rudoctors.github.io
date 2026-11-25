#!/usr/bin/env node

/**
 * sanitize-review-authors.mjs
 * TSK-RD-26 (OpsInbox #65): Удаление фамилий у авторов отзывов для соблюдения приватности (GDPR).
 * Преобразует полные имена (например, «Аня Васютина» -> «Аня», «Liza Smolskaya» -> «Liza»).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../src/data/doctors");

export function sanitizeAuthor(raw) {
  if (!raw || typeof raw !== "string") return "Пациент";
  let str = raw.trim();
  if (!str) return "Пациент";

  // Сохраняем утверждённые анонимные заглушки
  if (
    /^пациент/i.test(str) ||
    /^участник чата/i.test(str) ||
    /^pacijent/i.test(str) ||
    /^anonymous/i.test(str)
  ) {
    return str;
  }

  // Отрезаем описания каналов / био в Telegram: 'Имя | Репетитор', 'Имя — Канал'
  if (str.includes("|")) str = str.split("|")[0].trim();
  if (str.includes(" — ")) str = str.split(" — ")[0].trim();
  if (str.includes(" - ")) str = str.split(" - ")[0].trim();

  // Докторские репосты / ники
  if (/^(доктор|врач|dr\.?)\s+/i.test(str)) {
    return "Пациент";
  }

  // Очистка от эмодзи
  str = str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ").trim();

  const parts = str.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Пациент";
  if (parts.length === 1) {
    const single = parts[0].replace(/[\.\|\,\?\!\_\-]+$/g, "").trim();
    return single.replace(/[^\p{L}\p{N}]+$/u, "") || "Пациент";
  }

  // Промо-аккаунты ('Массаж лица... Валентина')
  if (/массаж|ногти|брови|ресницы|аренда|перевод|репетитор|фотограф|виза|туры/i.test(parts[0])) {
    const validNames = parts.filter(
      (p) => /^[А-ЯЁ][а-яё]+$/.test(p) || /^[A-Z][a-z]+$/.test(p)
    );
    if (validNames.length > 0) return validNames[validNames.length - 1];
    return "Пациент";
  }

  // Проверка на порядок «Фамилия Имя» (например, 'Belyaeva Yuliya')
  const p0 = parts[0];
  const p1 = parts[1];
  const isP0Surname = /(?:ова|ева|ина|ская|ов|ев|ин|ский|ova|eva|ina|skaya|sky|skiy)$/i.test(p0);
  const isP1Name =
    /^[А-ЯЁA-Z][а-яёa-z]+$/.test(p1) &&
    p1.length > 2 &&
    !/(?:ова|ева|ина|ская|ов|ев|ин|ский|ova|eva|ina|skaya|sky|skiy)$/i.test(p1);
  if (isP0Surname && isP1Name) {
    return p1.replace(/[\.\|\,\?\!\_\-]+$/g, "").trim().replace(/[^\p{L}\p{N}]+$/u, "");
  }

  // По умолчанию: первое слово — личное имя
  let name = parts[0].replace(/[\.\|\,\?\!\_\-]+$/g, "").trim();
  name = name.replace(/[^\p{L}\p{N}]+$/u, "");
  return name || "Пациент";
}

function run() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error("DATA_DIR not found:", DATA_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  let modifiedFiles = 0;
  let modifiedReviews = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, "utf8");
    const doc = JSON.parse(content);

    if (!Array.isArray(doc.reviews) || doc.reviews.length === 0) continue;

    let docModified = false;
    for (const r of doc.reviews) {
      if (!r.author) continue;
      const clean = sanitizeAuthor(r.author);
      if (clean !== r.author) {
        r.author = clean;
        docModified = true;
        modifiedReviews++;
      }
    }

    if (docModified) {
      fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + "\n", "utf8");
      modifiedFiles++;
    }
  }

  console.log(`[TSK-RD-26] Готово! Обновлено файлов: ${modifiedFiles}, очищено авторов отзывов: ${modifiedReviews}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
