#!/usr/bin/env node
/**
 * Telegram-модерация заявок «Добавить врача».
 *
 * Поток: форма /add-doctor/ → GitHub Issue (label `doctor-request`) → бот
 * присылает заявку в чат владельца с кнопками ✅/❌ → «✅ Опубликовать»
 * коммитит `src/data/doctors/<slug>.json` и закрывает issue → GitHub CI
 * пересобирает сайт (~2–3 мин) → врач в каталоге.
 *
 * Запуск: `npm run tg:bot` (нужен site/.env, см. docs/TELEGRAM-BOT.md).
 * Зависимостей нет — только Node ≥22.12 (fetch, process.loadEnvFile).
 *
 * Режимы:
 *   node scripts/telegram-bot.mjs            — обычная работа (long polling)
 *   node scripts/telegram-bot.mjs --check    — проверить конфиг и выйти
 *   node scripts/telegram-bot.mjs --selftest — прогнать парсер/маппинги на примере
 */

import fs from "node:fs";

const REPO_DEFAULT = "rudoctors/rudoctors.github.io";
const LABEL_REQUEST = "doctor-request";
const LABEL_SENT = "tg-sent";
const DIR_DOCTORS = "src/data/doctors";
const SYNC_INTERVAL_MS = 120_000;

const CYR = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

// ---------- утилиты ----------

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function translit(input) {
  let out = "";
  for (const ch of String(input || "").toLowerCase().trim()) {
    if (CYR[ch] !== undefined) out += CYR[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else if (/[\s\-_/]/.test(ch)) out += "-";
  }
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function slugifyName(name) {
  return translit(name) || "doctor";
}

function capitalize(s) {
  const t = String(s || "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

// ---------- конфиг ----------

/** specialties.json хранится с UTF-8 BOM — import JSON его срезает, fs.readFileSync нет. */
function readSpecialties() {
  const raw = fs.readFileSync(new URL("../src/data/specialties.json", import.meta.url), "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function loadConfig() {
  try {
    process.loadEnvFile();
  } catch {
    /* .env не обязателен, если переменные уже в окружении */
  }
  const cfg = {
    telegramToken: (process.env.TELEGRAM_BOT_TOKEN || "").trim(),
    adminChatId: (process.env.TELEGRAM_ADMIN_CHAT_ID || "").trim(),
    githubToken: (process.env.GITHUB_TOKEN || "").trim(),
    repo: (process.env.GITHUB_REPO || REPO_DEFAULT).trim(),
  };
  return cfg;
}

// ---------- GitHub API ----------

class GitHub {
  constructor(cfg) {
    this.cfg = cfg;
  }

  async req(path, init = {}) {
    const res = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.cfg.githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub ${res.status} ${path}: ${text.slice(0, 300)}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  listOpenRequests() {
    return this.req(
      `/repos/${this.cfg.repo}/issues?labels=${LABEL_REQUEST}&state=open&sort=created&direction=asc&per_page=30`
    );
  }

  getIssue(n) {
    return this.req(`/repos/${this.cfg.repo}/issues/${n}`);
  }

  async ensureLabel(name) {
    try {
      await this.req(`/repos/${this.cfg.repo}/labels`, {
        method: "POST",
        body: JSON.stringify({ name, color: "0e8a16" }),
      });
    } catch (e) {
      if (!String(e.message).includes("422")) throw e;
    }
  }

  addLabel(n, name) {
    return this.req(`/repos/${this.cfg.repo}/issues/${n}/labels`, {
      method: "POST",
      body: JSON.stringify({ labels: [name] }),
    });
  }

  comment(n, body) {
    return this.req(`/repos/${this.cfg.repo}/issues/${n}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  closeIssue(n) {
    return this.req(`/repos/${this.cfg.repo}/issues/${n}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed", state_reason: "completed" }),
    });
  }

  fileExists(path) {
    return this.req(`/repos/${this.cfg.repo}/contents/${path}`).then(
      () => true,
      (e) => {
        if (String(e.message).startsWith("GitHub 404")) return false;
        throw e;
      }
    );
  }

  async commitFile(path, content, message) {
    return this.req(`/repos/${this.cfg.repo}/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch: "main",
      }),
    });
  }
}

// ---------- парсинг заявки из issue body ----------

/**
 * Разбирает body GitHub Issue, созданного формой /add-doctor/.
 * Возвращает поля: name, spec, city, exp, clinic, contact, about.
 */
export function parseIssueBody(body) {
  const out = { name: "", spec: "", city: "", exp: "", clinic: "", contact: "", about: "" };
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  // Форма шлёт строки вида `**Имя:** Мария` — двоеточие внутри `**…**`.
  const header = /^(?:\*\*)?([^*]+?):(?:\*\*)?\s*(.*)$/;
  let inAbout = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (inAbout) {
      if (line === "---" || line.startsWith("_Создано") || line.startsWith("**---")) {
        inAbout = false;
        continue;
      }
      out.about = out.about ? `${out.about}\n${line}` : line;
      continue;
    }
    const m = line.match(header);
    if (!m) continue;
    const field = m[1].replace(/\*/g, "").trim().toLowerCase();
    const value = m[2].trim();
    if (field === "имя") out.name = value;
    else if (field === "специальность") out.spec = value;
    else if (field === "город") out.city = value;
    else if (field === "стаж") out.exp = value.replace(/[^\d]/g, "");
    else if (field === "клиника") out.clinic = value === "—" ? "" : value;
    else if (field === "контакт") out.contact = value;
    else if (field === "о себе") {
      if (value && value !== "—") out.about = value;
      else inAbout = true;
    }
  }
  out.about = out.about.replace(/\s+$/, "");
  return out;
}

/** Свободный текст специальности → ключ из specialties.json (или транслит). */
export function mapSpecialization(raw, specialties) {
  const norm = String(raw || "").toLowerCase().trim().replace(/ё/g, "е");
  if (!norm) return { key: "therapist", text: "" };
  const entries = Object.entries(specialties).map(([key, label]) => ({
    key,
    label: String(label).toLowerCase().replace(/ё/g, "е"),
  }));
  const direct = entries.find((e) => e.key === norm || e.key === norm.replace(/\s+/g, "_"));
  if (direct) return { key: direct.key, text: raw.trim() };
  const byLabel = entries.find((e) => e.label === norm);
  if (byLabel) return { key: byLabel.key, text: raw.trim() };
  const partial = entries.find(
    (e) =>
      (e.label.includes(norm) && norm.length >= 4) ||
      (norm.includes(e.label) && e.label.length >= 4)
  );
  if (partial) return { key: partial.key, text: raw.trim() };
  const byKeyPart = entries.find((e) => e.key.includes(norm) && norm.length >= 4);
  if (byKeyPart) return { key: byKeyPart.key, text: raw.trim() };
  return { key: slugifyName(norm), text: raw.trim() };
}

/** Свободный контакт → поле contacts; нераспознанное уходит в bio. */
export function mapContact(contact) {
  const raw = String(contact || "").trim();
  const contacts = {};
  let extra = "";
  if (!raw) return { contacts, extra };
  const email = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const tgUrl = raw.match(/https?:\/\/(?:www\.)?t\.me\/([A-Za-z0-9_]+)/i);
  // @хэндл ищем только при отсутствии email — иначе @example.com из адреса примется за Telegram
  const handle = email ? null : raw.match(/@([A-Za-z][A-Za-z0-9_]{3,30})\b/);
  const phone = raw.match(/\+?[\d][\d\s()\-]{6,}/);
  const url = raw.match(/https?:\/\/[^\s,;]+/i);
  if (tgUrl) contacts.telegram = `https://t.me/${tgUrl[1]}`;
  else if (handle) contacts.telegram = `https://t.me/${handle[1]}`;
  if (email) contacts.email = email[0];
  if (phone) contacts.phone = phone[0].trim();
  if (!contacts.telegram && !contacts.email && !contacts.phone) {
    if (url) contacts.website = url[0];
    else extra = raw;
  }
  return { contacts, extra };
}

/** Собирает JSON карточки в той же схеме, что пишет /admin/. */
export function buildDoctorJson(issue, fields, specialties, today) {
  const spec = mapSpecialization(fields.spec, specialties);
  const { contacts, extra } = mapContact(fields.contact);
  const bioParts = [];
  if (fields.about && fields.about !== "—") bioParts.push(fields.about);
  if (extra) bioParts.push(`Контакт: ${extra}`);

  const workplaces = [];
  if (fields.clinic) {
    const idx = fields.clinic.indexOf(",");
    workplaces.push({
      clinic: idx > 0 ? fields.clinic.slice(0, idx).trim() : fields.clinic,
      ...(idx > 0 ? { address: fields.clinic.slice(idx + 1).trim() } : {}),
      city: capitalize(fields.city),
    });
  }

  return {
    slug: "", // заполняет caller после проверки коллизий
    name: fields.name,
    specializations: [spec.key],
    ...(spec.text && spec.text.toLowerCase() !== spec.key.replace(/_/g, " ")
      ? { specializationText: spec.text }
      : {}),
    ...(Number.isFinite(Number(fields.exp)) && fields.exp !== ""
      ? { experienceYears: Number(fields.exp) }
      : {}),
    city: capitalize(fields.city) || "Belgrade",
    languages: ["ru"],
    formats: ["offline"],
    ...(bioParts.length ? { bio: bioParts.join("\n") } : {}),
    education: [],
    workplaces,
    contacts,
    reviews: [],
    verificationStatus: "self",
    hidden: false,
    featured: false,
    sources: [`rudoctors-form#issue-${issue.number}`],
    updatedAt: today,
  };
}

// ---------- Telegram API ----------

class Telegram {
  constructor(token) {
    this.token = token;
  }

  async req(method, body, opts = {}) {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      const err = new Error(`Telegram ${method} failed: ${data.error_code || res.status} ${data.description || ""}`);
      err.code = data.error_code;
      throw err;
    }
    return data.result;
  }

  getMe() {
    return this.req("getMe");
  }

  sendMessage(chatId, html, replyMarkup) {
    return this.req("sendMessage", {
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  editMessage(chatId, messageId, html, replyMarkup) {
    return this.req("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  answerCallback(id, text, showAlert = false) {
    return this.req("answerCallbackQuery", {
      callback_query_id: id,
      text,
      show_alert: showAlert,
    });
  }

  getUpdates(offset, signal) {
    return this.req(
      "getUpdates",
      {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"],
      },
      { signal }
    );
  }
}

// ---------- карточка заявки в Telegram ----------

function requestMessage(issue, fields) {
  const row = (label, v) => (v ? `<b>${label}:</b> ${esc(v)}` : "");
  const about = fields.about && fields.about !== "—" ? fields.about : "";
  return [
    `🩺 <b>Новая заявка на врача</b> · <a href="${esc(issue.html_url)}">#${issue.number}</a>`,
    "",
    row("Имя", fields.name),
    row("Специальность", fields.spec),
    row("Город", fields.city),
    row("Стаж", fields.exp ? `${fields.exp} лет` : ""),
    row("Клиника", fields.clinic),
    row("Контакт", fields.contact),
    about ? `\n<b>О враче:</b>\n${esc(about)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const moderationKeyboard = (n) => ({
  inline_keyboard: [
    [
      { text: "✅ Опубликовать", callback_data: `ok:${n}` },
      { text: "❌ Отклонить", callback_data: `no:${n}` },
    ],
  ],
});

// ---------- модерация ----------

async function syncIssues(gh, tg, cfg) {
  const issues = await gh.listOpenRequests();
  const pending = (issues || []).filter((i) => !i.pull_request);
  for (const issue of pending) {
    const labels = (issue.labels || []).map((l) => l.name || l);
    if (labels.includes(LABEL_SENT)) continue;
    const fields = parseIssueBody(issue.body);
    if (!fields.name) {
      log(`issue #${issue.number}: не удалось разобрать имя — пропускаю (без метки ${LABEL_SENT})`);
      continue;
    }
    try {
      await tg.sendMessage(cfg.adminChatId, requestMessage(issue, fields), moderationKeyboard(issue.number));
      await gh.ensureLabel(LABEL_SENT);
      await gh.addLabel(issue.number, LABEL_SENT);
      log(`issue #${issue.number} → Telegram (заявка: ${fields.name})`);
    } catch (e) {
      log(`issue #${issue.number}: отправка не удалась — ${e.message}`);
    }
  }
}

async function publishDoctor(gh, issueNumber, specialties) {
  const issue = await gh.getIssue(issueNumber);
  if (issue.state !== "open") return { ok: false, why: "already-done" };
  const fields = parseIssueBody(issue.body);
  if (!fields.name) return { ok: false, why: "parse" };

  const doc = buildDoctorJson(issue, fields, specialties, new Date().toISOString().slice(0, 10));
  let slug = slugifyName(fields.name);
  if (await gh.fileExists(`${DIR_DOCTORS}/${slug}.json`)) {
    slug = `${slug}-i${issueNumber}`;
  }
  doc.slug = slug;

  const path = `${DIR_DOCTORS}/${slug}.json`;
  const commit = await gh.commitFile(
    path,
    JSON.stringify(doc, null, 2) + "\n",
    `Add doctor ${fields.name} (from form issue #${issueNumber})`
  );
  const commitUrl = commit?.content?.html_url || "";

  await gh.comment(
    issueNumber,
    `✅ Заявка одобрена, карточка добавлена: \`${path}\`.\nДеплой на GitHub Pages займёт 2–3 минуты, после этого врач появится в каталоге.`
  );
  await gh.closeIssue(issueNumber);
  log(`issue #${issueNumber}: опубликовано → ${path} ${commitUrl}`);
  return { ok: true, slug, path };
}

async function rejectDoctor(gh, issueNumber) {
  const issue = await gh.getIssue(issueNumber);
  if (issue.state !== "open") return { ok: false, why: "already-done" };
  await gh.comment(issueNumber, "❌ Заявка отклонена владельцем каталога.");
  await gh.closeIssue(issueNumber);
  log(`issue #${issueNumber}: отклонено`);
  return { ok: true };
}

async function handleCallback(gh, tg, cfg, cb, specialties) {
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const isAdmin = String(chatId) === String(cfg.adminChatId);

  const data = cb.data || "";
  const m = data.match(/^(ok|no):(\d+)$/);
  if (!m) {
    await tg.answerCallback(cb.id, "Неизвестное действие").catch(() => {});
    return;
  }
  if (!isAdmin) {
    await tg.answerCallback(cb.id, "Кнопка доступна только владельцу каталога.", true).catch(() => {});
    return;
  }
  const action = m[1];
  const n = Number(m[2]);

  try {
    let result;
    if (action === "ok") {
      result = await publishDoctor(gh, n, specialties);
      if (result.ok && messageId) {
        await tg.editMessage(
          chatId,
          messageId,
          `✅ <b>Опубликовано:</b> <code>${esc(result.path)}</code>\nДеплой ~2–3 мин → врач появится в каталоге.`
        ).catch(() => {});
      }
      if (result.why === "already-done") {
        await tg.answerCallback(cb.id, "Эта заявка уже обработана.").catch(() => {});
        if (messageId) {
          await tg.editMessage(chatId, messageId, `⏭ Заявка #${n} уже обработана.`).catch(() => {});
        }
        return;
      }
      if (result.why === "parse") {
        await tg.answerCallback(cb.id, "Не удалось разобрать заявку — разберите вручную на GitHub.", true).catch(() => {});
        return;
      }
      await tg.answerCallback(cb.id, `✅ Опубликовано: ${result.slug}`).catch(() => {});
    } else {
      result = await rejectDoctor(gh, n);
      if (result.why === "already-done") {
        await tg.answerCallback(cb.id, "Эта заявка уже обработана.").catch(() => {});
        if (messageId) {
          await tg.editMessage(chatId, messageId, `⏭ Заявка #${n} уже обработана.`).catch(() => {});
        }
        return;
      }
      if (messageId) {
        await tg.editMessage(chatId, messageId, `❌ <b>Отклонено</b> · заявка #${n}`).catch(() => {});
      }
      await tg.answerCallback(cb.id, "❌ Отклонено").catch(() => {});
    }
  } catch (e) {
    log(`callback ${data}: ошибка — ${e.message}`);
    await tg.answerCallback(cb.id, `Ошибка: ${e.message.slice(0, 180)}`, true).catch(() => {});
  }
}

function startHelpMessage(cfg, me) {
  return [
    `🤖 Бот модерации Rudoctors запущен (@${me?.username || "bot"}).`,
    "",
    "Форма «Добавить врача» создаёт GitHub Issue с меткой `doctor-request` —",
    "я пришлю каждую заявку сюда с кнопками ✅ Опубликовать / ❌ Отклонить.",
    "",
    cfg.adminChatId
      ? "Авторизация: этот чат указан в TELEGRAM_ADMIN_CHAT_ID."
      : `⚠️ TELEGRAM_ADMIN_CHAT_ID не задан. Ваш chat_id: <code>${esc(cfg._detectedChatId || "")}</code> — впишите его в site/.env и перезапустите бота.`,
  ].join("\n");
}

async function selftest() {
  const specialties = readSpecialties();
  const body = [
    "**Имя:** Мария Иванова",
    "**Специальность:** Кардиолог",
    "**Город:** Belgrade",
    "**Стаж:** 10",
    "**Клиника:** Клиника Здоровье, ул. Ленина 5",
    "**Контакт:** @maria_doc",
    "",
    "**О себе:**",
    "Образование: МГУ.",
    "Опыт: кардиология, ЭКГ.",
    "",
    "---",
    "_Создано через форму rudoctors.github.io_",
  ].join("\n");
  const fields = parseIssueBody(body);
  const issue = { number: 42, html_url: "https://example.com/42" };
  const doc = buildDoctorJson(issue, fields, specialties, "2026-09-24");
  const samples = ["Кардиолог", "детский психиатр", "ЛОР", "Генетик", "cardiologist"];
  console.log("parsed fields:", JSON.stringify(fields, null, 2));
  console.log("doctor json:", JSON.stringify(doc, null, 2));
  for (const s of samples) {
    console.log(`spec "${s}" →`, JSON.stringify(mapSpecialization(s, specialties)));
  }
  console.log("contact tests:");
  for (const c of ["@maria_doc", "maria@example.com", "+381 64 123 4567", "https://example.com", "позвонить позже"]) {
    console.log(`  "${c}" →`, JSON.stringify(mapContact(c)));
  }
}

async function check(cfg) {
  const problems = [];
  if (!cfg.telegramToken) problems.push("TELEGRAM_BOT_TOKEN не задан (создайте бота в @BotFather)");
  if (!cfg.adminChatId) problems.push("TELEGRAM_ADMIN_CHAT_ID не задан (напишите боту /start, он подскажет chat_id)");
  if (!cfg.githubToken) problems.push("GITHUB_TOKEN не задан (fine-grained PAT: Contents + Issues read/write)");
  if (problems.length) {
    console.log("Конфиг неполный:\n - " + problems.join("\n - "));
    console.log(`\nРепозиторий: ${cfg.repo}`);
    console.log("Инструкция: docs/TELEGRAM-BOT.md");
    return 1;
  }
  const me = await new Telegram(cfg.telegramToken).getMe();
  console.log(`OK: @${me.username}, репозиторий ${cfg.repo}, chat ${cfg.adminChatId}`);
  return 0;
}

// ---------- main loop ----------

async function main() {
  const args = process.argv.slice(2);
  const cfg = loadConfig();
  if (args.includes("--selftest")) return selftest();
  if (args.includes("--check")) {
    process.exitCode = await check(cfg);
    return;
  }

  if (!cfg.telegramToken) {
    console.error("TELEGRAM_BOT_TOKEN не задан. Смотрите docs/TELEGRAM-BOT.md (или запустите --check).");
    process.exit(1);
  }
  const tg = new Telegram(cfg.telegramToken);
  const gh = new GitHub(cfg);
  if (!cfg.githubToken) {
    console.error("GITHUB_TOKEN не задан — бот не сможет читать issues и публиковать карточки. Смотрите docs/TELEGRAM-BOT.md.");
    process.exit(1);
  }

  const me = await tg.getMe();
  await tg.req("deleteWebhook", { drop_pending_updates: false }).catch(() => {});
  log(`Бот @${me.username} запущен. Репозиторий: ${cfg.repo}. Синхронизация заявок каждые ${SYNC_INTERVAL_MS / 1000}s.`);

  if (!cfg.adminChatId) {
    log("ВНИМАНИЕ: TELEGRAM_ADMIN_CHAT_ID не задан — заявки некуда отправлять. Напишите боту /start, он покажет chat_id.");
  }

  const specialties = readSpecialties();

  let offset = 0;
  let lastSync = 0;
  for (;;) {
    try {
      if (cfg.adminChatId && Date.now() - lastSync >= SYNC_INTERVAL_MS) {
        lastSync = Date.now();
        await syncIssues(gh, tg, cfg);
      }
      const updates = await tg.getUpdates(offset || undefined, AbortSignal.timeout(35_000));
      for (const u of updates || []) {
        offset = u.update_id + 1;
        if (u.message?.text?.startsWith("/start")) {
          const chatId = u.message.chat.id;
          cfg._detectedChatId = chatId;
          await tg.sendMessage(chatId, startHelpMessage({ ...cfg, adminChatId: cfg.adminChatId }, me)).catch((e) =>
            log(`/start: ${e.message}`)
          );
          if (!cfg.adminChatId) log(`Предложение: добавьте TELEGRAM_ADMIN_CHAT_ID=${chatId} в site/.env`);
        }
        if (u.callback_query) {
          await handleCallback(gh, tg, cfg, u.callback_query, specialties);
        }
      }
    } catch (e) {
      if (e.name === "TimeoutError" || e.code === "ETIMEDOUT") continue;
      log(`Ошибка цикла: ${e.message}; повтор через 5с`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main().catch((e) => {
  console.error("Фатальная ошибка:", e);
  process.exit(1);
});
