/**
 * Telegram-moderation relay для rudoctors (Deno Deploy).
 *
 * POST /api/doctor-request — форма сайта (fetch, без перехода): создаёт GitHub Issue
 *   и присылает карточку владельцу в Telegram с callback-кнопками.
 * POST /api/review — форма отзыва: пишет в Google Sheet (CRM), шлёт Telegram карточку
 *   с кнопками rev_ok:<id> / rev_no:<id>.
 * POST /telegram — Telegram webhook: мгновенная обработка ✅/❌ и команд ok/no,
 *   а также одобрение/отклонение отзывов через rev_ok/rev_no.
 *
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, GITHUB_TOKEN, GITHUB_REPO,
 *      WEBHOOK_SECRET (сверяется с X-Telegram-Bot-Api-Secret-Token),
 *      GAS_REVIEW_WEBHOOK_URL (Google Apps Script CRM webhook URL),
 *      GOOGLE_SHEET_ID (ID Google Таблицы отзывов).
 * Логика карточки синхронизирована со scripts/telegram-bot.mjs.
 */
const REPO = Deno.env.get("GITHUB_REPO") || "rudoctors/rudoctors.github.io";
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const ADMIN_CHAT = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
const GH_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";
const GAS_REVIEW_URL = Deno.env.get("GAS_REVIEW_WEBHOOK_URL") || "";
const DIR_DOCTORS = "src/data/doctors";
const CORS_ORIGIN = "https://rudoctors.github.io";
import { normalizeReview, parseOptionalRating, type ReviewInput } from "./review-intake.ts";
const LABEL_REQUEST = "doctor-request";
const LABEL_SENT = "tg-sent";
const INTAKE_MARKER = "🩺 Заявка для каталога Rudoctors";

const SPECIALTIES: Record<string, string> = {
  "psychiatrist": "Психиатр",
  "child_psychiatrist": "Детский психиатр",
  "psychiatrist_child": "Детский психиатр",
  "pediatrician": "Педиатр",
  "therapist": "Терапевт",
  "dentist": "Стоматолог",
  "gynecologist": "Гинеколог",
  "obstetrician_gynecologist": "Акушер-гинеколог",
  "cardiologist": "Кардиолог",
  "endocrinologist": "Эндокринолог",
  "child_endocrinologist": "Детский эндокринолог",
  "neurologist": "Невролог",
  "cosmetologist": "Косметолог",
  "psychotherapist": "Психотерапевт",
  "physiotherapist": "Физиотерапевт",
  "surgeon": "Хирург",
  "urologist": "Уролог",
  "manual_therapist": "Мануальный терапевт",
  "phlebologist": "Флеболог",
  "vascular_surgeon": "Сосудистый хирург",
  "gastroenterologist": "Гастроэнтеролог",
  "traumatologist_orthopedist": "Травматолог-ортопед",
  "rehabilitologist": "Реабилитолог",
  "sports_medicine": "Спортивная медицина",
  "hematologist": "Гематолог",
  "otorhinolaryngologist": "ЛОР",
  "dental_implantologist": "Имплантолог",
  "dental_surgeon": "Хирург-стоматолог",
  "pulmonologist": "Пульмонолог",
  "allergist_immunologist": "Аллерголог-иммунолог",
  "allergist": "Аллерголог",
  "narcologist": "Нарколог",
  "ophthalmologist": "Офтальмолог",
  "dermatologist": "Дерматолог",
  "psychologist": "Психолог",
  "family_doctor": "Врач общей практики",
  "gp": "Врач общей практики",
  "radiologist": "Радиолог",
  "mammologist": "Маммолог",
  "ultrasound_diagnostics": "Врач УЗИ",
  "osteopath": "Остеопат",
  "proctologist": "Проктолог",
  "plastic_surgeon": "Пластический хирург",
  "physiatrist": "Физиатр",
  "speech_therapist": "Логопед",
  "dietitian": "Диетолог",
  "nutritionist": "Нутрициолог",
  "oncologist": "Онколог",
};

function esc(s: string | undefined): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function tg(method: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json().catch(() => ({}));
}

async function gh(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GH_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? {} : await res.json();
}

function translit(input: string): string {
  const CYR: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  let out = "";
  for (const ch of String(input || "").toLowerCase().trim()) {
    if (CYR[ch] !== undefined) out += CYR[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else if (/[\s\-_/]/.test(ch)) out += "-";
  }
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}
const slugifyName = (name: string) => translit(name) || "doctor";
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

interface Fields { name: string; spec: string; city: string; exp: string; clinic: string; contact: string; about: string; }

function parseFields(body: string): Fields {
  const out: Fields = { name: "", spec: "", city: "", exp: "", clinic: "", contact: "", about: "" };
  const header = /^(?:\*\*)?([^*]+?):(?:\*\*)?\s*(.*)$/;
  let inAbout = false;
  for (const raw of String(body || "").replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (inAbout) {
      if (line === "---" || line.startsWith("_")) { inAbout = false; continue; }
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
      if (value && value !== "—") out.about = value; else inAbout = true;
    }
  }
  out.about = out.about.replace(/\s+$/, "");
  return out;
}

function mapSpecialization(raw: string): { key: string; text: string } {
  const norm = String(raw || "").toLowerCase().trim().replace(/ё/g, "е");
  if (!norm) return { key: "therapist", text: "" };
  const entries = Object.entries(SPECIALTIES).map(([key, label]) => ({ key, label: label.toLowerCase().replace(/ё/g, "е") }));
  const direct = entries.find((e) => e.key === norm || e.key === norm.replace(/\s+/g, "_"));
  if (direct) return { key: direct.key, text: raw.trim() };
  const byLabel = entries.find((e) => e.label === norm);
  if (byLabel) return { key: byLabel.key, text: raw.trim() };
  const partial = entries.find((e) => (e.label.includes(norm) && norm.length >= 4) || (norm.includes(e.label) && e.label.length >= 4));
  if (partial) return { key: partial.key, text: raw.trim() };
  const byKeyPart = entries.find((e) => e.key.includes(norm) && norm.length >= 4);
  if (byKeyPart) return { key: byKeyPart.key, text: raw.trim() };
  return { key: slugifyName(norm), text: raw.trim() };
}

function mapContact(contact: string): { contacts: Record<string, string>; extra: string } {
  const raw = String(contact || "").trim();
  const contacts: Record<string, string> = {};
  let extra = "";
  if (!raw) return { contacts, extra };
  const email = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const tgUrl = raw.match(/https?:\/\/(?:www\.)?t\.me\/([A-Za-z0-9_]+)/i);
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

function buildDoctor(fields: Fields, issueNumber: number, today: string): Record<string, unknown> {
  const spec = mapSpecialization(fields.spec);
  const { contacts, extra } = mapContact(fields.contact);
  const bioParts: string[] = [];
  if (fields.about && fields.about !== "—") bioParts.push(fields.about);
  if (extra) bioParts.push(`Контакт: ${extra}`);
  const workplaces: Record<string, string>[] = [];
  if (fields.clinic) {
    const idx = fields.clinic.indexOf(",");
    workplaces.push({
      clinic: idx > 0 ? fields.clinic.slice(0, idx).trim() : fields.clinic,
      ...(idx > 0 ? { address: fields.clinic.slice(idx + 1).trim() } : {}),
      city: capitalize(fields.city),
    });
  }
  return {
    slug: "",
    name: fields.name,
    specializations: [spec.key],
    ...(spec.text ? { specializationText: spec.text } : {}),
    ...(fields.exp ? { experienceYears: Number(fields.exp) } : {}),
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
    sources: [`rudoctors-form#issue-${issueNumber}`],
    updatedAt: today,
  };
}

function requestMessage(issueNumber: number, fields: Fields): string {
  const row = (label: string, v: string) => (v ? `<b>${label}:</b> ${esc(v)}` : "");
  return [
    `🩺 <b>Новая заявка на врача</b> · <a href="https://github.com/${REPO}/issues/${issueNumber}">#${issueNumber}</a>`,
    "",
    row("Имя", fields.name),
    row("Специальность", fields.spec),
    row("Город", fields.city),
    row("Стаж", fields.exp ? `${fields.exp} лет` : ""),
    row("Клиника", fields.clinic),
    row("Контакт", fields.contact),
    fields.about ? `\n<b>О враче:</b>\n${esc(fields.about)}` : "",
  ].filter(Boolean).join("\n");
}

const keyboard = (n: number) => ({
  inline_keyboard: [[
    { text: "✅ Опубликовать", callback_data: `ok:${n}` },
    { text: "❌ Отклонить", callback_data: `no:${n}` },
  ]],
});

async function sendCard(issueNumber: number, fields: Fields) {
  await tg("sendMessage", {
    chat_id: ADMIN_CHAT,
    text: requestMessage(issueNumber, fields),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: keyboard(issueNumber),
  });
}

// ─── Review CRM ──────────────────────────────────────────────────────────────

interface ReviewData extends ReviewInput {
  id: string;         // RD-YYMM-NNN (от GAS или локально)
  date: string;       // ISO YYYY-MM-DD
}

/** Generate unique review ID: RD-YYMM-NNN */
function reviewId(): string {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const suffix = String(Math.floor(100 + Math.random() * 900));
  return `RD-${yymm}-${suffix}`;
}

/** Update review status in GAS Sheet by review ID. */
async function updateGASStatus(id: string, status: string): Promise<void> {
  if (!GAS_REVIEW_URL) return;
  // GAS GET endpoint: ?action=updateStatus&id=...&status=...
  const gasUrl = GAS_REVIEW_URL.replace(/\/exec.*$/, "/exec") +
    `?action=updateStatus&id=${encodeURIComponent(id)}&status=${encodeURIComponent(status)}`;
  await fetch(gasUrl).catch((e) => console.warn("GAS status update failed:", e));
}

/** Build Telegram card for a new review, with approve/reject inline buttons. */
function reviewMessage(rev: ReviewData): string {
  const ratingLine = rev.rating !== null
    ? `<b>Оценка:</b> ${"⭐".repeat(rev.rating)}${rev.rating < 5 ? "☆".repeat(5 - rev.rating) : ""} ${rev.rating}/5`
    : "<b>Оценка:</b> — (без оценки)";
  return [
    `💬 <b>Новый отзыв</b> · <code>${esc(rev.id)}</code>`,
    "",
    `<b>Врач:</b> ${esc(rev.doctorName)} (<code>${esc(rev.doctorSlug)}</code>)`,
    `<b>Автор:</b> ${esc(rev.author)}`,
    ratingLine,
    `<b>Дата:</b> ${esc(rev.date)}`,
    "",
    `<b>Текст:</b>`,
    esc(rev.text.slice(0, 800)),
  ].filter(Boolean).join("\n");
}

const reviewKeyboard = (id: string) => ({
  inline_keyboard: [[
    { text: "✅ Опубликовать", callback_data: `rev_ok:${id}` },
    { text: "❌ Отклонить", callback_data: `rev_no:${id}` },
  ]],
});

/** Publish approved review: append to doctor JSON and commit to GitHub. */
async function publishReview(rev: ReviewData): Promise<string> {
  const path = `${DIR_DOCTORS}/${rev.doctorSlug}.json`;

  // Fetch existing doctor JSON
  let existing: Record<string, unknown>;
  let sha: string;
  try {
    const file = await gh(`/repos/${REPO}/contents/${path}`);
    sha = String(file.sha);
    const decoded = atob(String(file.content).replace(/\s/g, ""));
    existing = JSON.parse(decoded);
  } catch (e) {
    throw new Error(`Врач не найден: ${path} — ${String(e).slice(0, 120)}`);
  }

  // Append review; rating is written ONLY when a valid 1..5 was supplied.
  // Text-only (scoreless) reviews must never carry an invented `rating: 5`.
  const reviews = Array.isArray(existing.reviews) ? existing.reviews : [];
  const newReview = {
    author: rev.author,
    ...(rev.rating !== null ? { rating: rev.rating } : {}),
    text: rev.text,
    date: rev.date,
    source: `rudoctors-crm#${rev.id}`,
  };
  reviews.push(newReview);
  existing.reviews = reviews;
  existing.updatedAt = rev.date;

  const content = JSON.stringify(existing, null, 2) + "\n";
  const bytes = new TextEncoder().encode(content);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const encoded = btoa(bin);

  await gh(`/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Add review for ${rev.doctorName} (${rev.id})`,
      content: encoded,
      sha,
      branch: "main",
    }),
  });

  await updateGASStatus(rev.id, "4. Опубликован");
  return `✅ Опубликовано: отзыв ${rev.id} → ${path}`;
}


/** Handle rev_ok / rev_no callbacks for review moderation. */
async function handleReviewCallback(
  cb: Record<string, unknown>,
  action: "ok" | "no",
  revId: string,
): Promise<void> {
  const msg = cb.message as Record<string, unknown>;
  const chatId = String((msg?.chat as Record<string, unknown>)?.id ?? "");
  const messageId = msg?.message_id;

  if (chatId !== String(ADMIN_CHAT)) {
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Доступно только владельцу", show_alert: true });
    return;
  }

  // Fetch review data from GAS
  let rev: ReviewData | null = null;
  if (GAS_REVIEW_URL) {
    try {
      const gasUrl = GAS_REVIEW_URL.replace(/\/exec.*$/, "/exec") + `?action=getReview&id=${encodeURIComponent(revId)}`;
      const gasRes = await fetch(gasUrl);
      const gasData = await gasRes.json().catch(() => ({})) as Record<string, unknown>;
      if (gasData?.ok && gasData?.review) {
        const r = gasData.review as Record<string, unknown>;
        rev = {
          id:         String(r.id || revId),
          doctorSlug: String(r.doctor_slug || ""),
          doctorName: String(r.doctor_name || ""),
          author:     String(r.author || ""),
          // Оценка опциональна: пустая/битая из таблицы → null, никогда не подменяется на 5
          rating:     parseOptionalRating(r.rating),
          text:       String(r.text || ""),
          date:       String(r.date || new Date().toISOString().slice(0, 10)),
        };
      }
    } catch (e) {
      console.warn("GAS getReview failed:", e);
    }
  }

  if (!rev) {
    await tg("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "Не удалось получить данные отзыва из CRM. Проверьте таблицу вручную.",
      show_alert: true,
    });
    return;
  }

  try {
    if (action === "ok") {
      const result = await publishReview(rev);
      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: result.slice(0, 190) });
      if (messageId) {
        await tg("editMessageText", {
          chat_id: ADMIN_CHAT, message_id: messageId,
          text: `✅ <b>Опубликован</b> · ${esc(rev.id)}\n${esc(rev.doctorName)} — ${rev.rating !== null ? `${rev.rating}★` : "без оценки"}\n<i>Деплой ~2–3 мин</i>`,
          parse_mode: "HTML",
        });
      }
    } else {
      await updateGASStatus(rev.id, "3. Отклонён");
      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `❌ Отзыв ${rev.id} отклонён` });
      if (messageId) {
        await tg("editMessageText", {
          chat_id: ADMIN_CHAT, message_id: messageId,
          text: `❌ <b>Отклонён</b> · ${esc(rev.id)}\n${esc(rev.doctorName)} — ${rev.rating !== null ? `${rev.rating}★` : "без оценки"}`,
          parse_mode: "HTML",
        });
      }
    }
  } catch (e) {
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `Ошибка: ${String(e).slice(0, 180)}`, show_alert: true });
  }
}

async function ensureLabel(name: string) {
  try {
    await gh(`/repos/${REPO}/labels`, { method: "POST", body: JSON.stringify({ name, color: "0e8a16" }) });
  } catch { /* уже существует */ }
}

async function publishDoctor(issueNumber: number): Promise<string> {
  const issue = await gh(`/repos/${REPO}/issues/${issueNumber}`);
  if (issue.state !== "open") return "Уже обработано.";
  const fields = parseFields(String(issue.body || ""));
  if (!fields.name) return "Не удалось разобрать заявку.";
  const doc = buildDoctor(fields, issueNumber, new Date().toISOString().slice(0, 10));
  let slug = slugifyName(fields.name);
  try {
    await gh(`/repos/${REPO}/contents/${DIR_DOCTORS}/${slug}.json`);
    slug = `${slug}-i${issueNumber}`;
  } catch { /* файла нет — ок */ }
  doc.slug = slug;
  const path = `${DIR_DOCTORS}/${slug}.json`;
  await gh(`/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Add doctor ${fields.name} (from form issue #${issueNumber})`,
      content: (() => {
        const bytes = new TextEncoder().encode(JSON.stringify(doc, null, 2) + "\n");
        let bin = "";
        for (const b of bytes) bin += String.fromCharCode(b);
        return btoa(bin);
      })(),
      branch: "main",
    }),
  });
  await gh(`/repos/${REPO}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: `✅ Заявка одобрена, карточка добавлена: \`${path}\`.\nДеплой займёт 2–3 минуты.` }),
  });
  await gh(`/repos/${REPO}/issues/${issueNumber}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
  return `✅ Опубликовано: ${path}`;
}

async function rejectDoctor(issueNumber: number): Promise<string> {
  const issue = await gh(`/repos/${REPO}/issues/${issueNumber}`);
  if (issue.state !== "open") return "Уже обработано.";
  await gh(`/repos/${REPO}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: "❌ Заявка отклонена владельцем каталога." }),
  });
  await gh(`/repos/${REPO}/issues/${issueNumber}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
  return "❌ Отклонено";
}

async function handleCallback(cb: Record<string, unknown>) {
  const msg = cb.message as Record<string, unknown>;
  const chatId = String((msg?.chat as Record<string, unknown>)?.id ?? "");
  const messageId = msg?.message_id;
  const data = String(cb.data || "");

  // Review moderation: rev_ok:<id> / rev_no:<id>
  const revMatch = data.match(/^rev_(ok|no):(.+)$/);
  if (revMatch) {
    await handleReviewCallback(cb, revMatch[1] as "ok" | "no", revMatch[2]);
    return;
  }

  // Doctor request moderation: ok:<issue> / no:<issue>
  const m = data.match(/^(ok|no):(\d+)$/);
  if (!m) { await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Неизвестное действие" }); return; }
  if (chatId !== String(ADMIN_CHAT)) {
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Доступно только владельцу", show_alert: true });
    return;
  }
  const n = Number(m[2]);
  try {
    const result = m[1] === "ok" ? await publishDoctor(n) : await rejectDoctor(n);
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: result.slice(0, 190) });
    if (messageId) {
      await tg("editMessageText", {
        chat_id: ADMIN_CHAT, message_id: messageId,
        text: `${m[1] === "ok" ? "✅ <b>Опубликована</b>" : "❌ <b>Отклонена</b>"} · заявка #${n}\n${esc(result)}`,
        parse_mode: "HTML",
      });
    }
  } catch (e) {
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `Ошибка: ${String(e).slice(0, 180)}`, show_alert: true });
  }
}

async function handleTelegramUpdate(update: Record<string, unknown>) {
  const cb = update.callback_query as Record<string, unknown> | undefined;
  if (cb) { await handleCallback(cb); return; }
  const msg = update.message as Record<string, unknown> | undefined;
  const text = String(msg?.text || "");
  if (!text) return;
  const chatId = String((msg?.chat as Record<string, unknown>)?.id ?? "");
  const fromId = String((msg?.from as Record<string, unknown>)?.id ?? "");
  if (chatId === String(ADMIN_CHAT)) {
    const m = text.match(/^\/?(ok|no|да|нет)\s+#?(\d+)\s*$/i);
    if (!m) return;
    const replyTo = { reply_parameters: { message_id: msg?.message_id, allow_sending_without_reply: true } };
    try {
      const result = ["ok", "да"].includes(m[1].toLowerCase()) ? await publishDoctor(Number(m[2])) : await rejectDoctor(Number(m[2]));
      await tg("sendMessage", { chat_id: ADMIN_CHAT, text: esc(result), parse_mode: "HTML", ...replyTo });
    } catch (e) {
      await tg("sendMessage", { chat_id: ADMIN_CHAT, text: `⚠️ Ошибка: ${esc(String(e).slice(0, 180))}`, ...replyTo });
    }
    return;
  }
  if (text.includes(INTAKE_MARKER)) {
    // Заявка от посетителя прямо в Telegram (запасной путь, если форма не сработала):
    // конвертируем в Issue и присылаем карточку.
    const fields = parseFields(text);
    if (!fields.name || !fields.spec || !fields.city) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Не удалось разобрать заявку. Заполните её через форму на rudoctors.github.io (раздел «Добавить врача»).",
      });
      return;
    }
    const issueBody = [
      `**Имя:** ${fields.name}`,
      `**Специальность:** ${fields.spec}`,
      `**Город:** ${fields.city}`,
      `**Стаж:** ${fields.exp || "—"}`,
      `**Клиника:** ${fields.clinic || "—"}`,
      `**Контакт:** ${fields.contact}`,
      "",
      `**О себе:**`,
      fields.about || "—",
      "",
      "---",
      `_Отправлено боту в Telegram (id ${fromId})_`,
    ].join("\n");
    const issue = await gh(`/repos/${REPO}/issues`, {
      method: "POST",
      body: JSON.stringify({ title: `Новый врач: ${fields.name} (${fields.spec})`, body: issueBody, labels: [LABEL_REQUEST] }),
    });
    const number = Number(issue.number);
    await sendCard(number, fields);
    await ensureLabel(LABEL_SENT);
    try { await gh(`/repos/${REPO}/issues/${number}/labels`, { method: "POST", body: JSON.stringify({ labels: [LABEL_SENT] }) }); } catch { /* не критично */ }
    await tg("sendMessage", {
      chat_id: chatId,
      text: "✅ Заявка принята! Владелец каталога рассмотрит её и свяжется с вами по указанному контакту.",
      reply_parameters: { message_id: msg?.message_id, allow_sending_without_reply: true },
    });
    return;
  }
  if (text.startsWith("/start")) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Это бот модерации каталога Rudoctors. Чтобы добавить врача — заполните форму на rudoctors.github.io (раздел «Добавить врача»).",
    });
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // CORS preflight for review form
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
  };

  if (req.method === "POST" && url.pathname === "/telegram") {
    if (WEBHOOK_SECRET && req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
    const update = await req.json().catch(() => ({}));
    try { await handleTelegramUpdate(update); } catch (e) { console.error("update error", e); }
    return new Response("ok");
  }

  // ── Единственный канонический вход отзывов ────────────────────────────────
  // ВАЖНО: ровно ОДИН обработчик POST /api/review. Второй (дублированный) блок
  // удалён — раньше у копий расходились правила (порог текста 10 vs 20,
  // `rating || 5`), что порождало scoreless-отзывы с выдуманной оценкой 5.
  // Валидация общая с браузером: deno/review-intake.ts.
  //
  // CORS preflight: обрабатывается в общем OPTIONS-блоке выше (один, до
  // разбора маршрутов); второй блок-дубликат здесь не нужен.

  function corsJson(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": CORS_ORIGIN,
      },
    });
  }

  if (req.method === "POST" && url.pathname === "/api/review") {
    try {
      const data = await req.json().catch(() => ({})) as Record<string, unknown>;

      // Honeypot check
      if (String(data.website_hp || "").trim()) {
        return corsJson({ ok: true, id: "ignored" });
      }

      const normalized = normalizeReview(data);
      if (!normalized.ok) {
        return corsJson({ ok: false, error: normalized.error }, 400);
      }
      const { doctorSlug, doctorName, author, rating, text } = normalized.review;

      const today = new Date().toISOString().slice(0, 10);

      // Write to Google Sheet via GAS and send Telegram card
      let gasId: string | null = null;
      if (GAS_REVIEW_URL) {
        const gasRes = await fetch(GAS_REVIEW_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctor_slug: doctorSlug,
            doctor_name: doctorName,
            author,
            rating,
            text,
          }),
        }).catch((e) => { console.warn("GAS error:", e); return null; });
        if (gasRes) {
          const gasData = await gasRes.json().catch(() => ({})) as Record<string, unknown>;
          // Use GAS-generated ID if available
          if (gasData?.ok && gasData?.id) {
            gasId = String(gasData.id);
          }
        }
      } else {
        console.warn("GAS_REVIEW_WEBHOOK_URL not set, sending Telegram card only");
      }

      const rev: ReviewData = {
        id: gasId !== null ? gasId : reviewId(),
        doctorSlug, doctorName, author, rating, text, date: today,
      };

      // Send Telegram notification with approve/reject buttons
      await tg("sendMessage", {
        chat_id: ADMIN_CHAT,
        text: reviewMessage(rev),
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: reviewKeyboard(rev.id),
      });

      return corsJson({ ok: true, id: rev.id });
    } catch (e) {
      console.error("review intake error", e);
      return corsJson({ ok: false, error: String(e).slice(0, 200) }, 500);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/doctor-request") {
    try {
      const data = await req.json().catch(() => ({}));
      const fields: Fields = {
        name: String(data.name || "").trim().slice(0, 120),
        spec: String(data.spec || "").trim().slice(0, 120),
        city: String(data.city || "").trim().slice(0, 60),
        exp: String(data.exp || "").replace(/[^\d]/g, "").slice(0, 2),
        clinic: String(data.clinic || "").trim().slice(0, 160),
        contact: String(data.contact || "").trim().slice(0, 160),
        about: String(data.about || "").trim().slice(0, 1500),
      };
      if (!fields.name || !fields.spec || !fields.city || !fields.contact) {
        return json({ ok: false, error: "Обязательные поля: имя, специальность, город, контакт" }, 400);
      }
      const issueBody = [
        `**Имя:** ${fields.name}`,
        `**Специальность:** ${fields.spec}`,
        `**Город:** ${fields.city}`,
        `**Стаж:** ${fields.exp || "—"}`,
        `**Клиника:** ${fields.clinic || "—"}`,
        `**Контакт:** ${fields.contact}`,
        "",
        `**О себе:**`,
        fields.about || "—",
        "",
        "---",
        `_Отправлено через форму rudoctors.github.io_`,
      ].join("\n");
      const issue = await gh(`/repos/${REPO}/issues`, {
        method: "POST",
        body: JSON.stringify({ title: `Новый врач: ${fields.name} (${fields.spec})`, body: issueBody, labels: [LABEL_REQUEST] }),
      });
      const number = Number(issue.number);
      await sendCard(number, fields);
      await ensureLabel(LABEL_SENT);
      try { await gh(`/repos/${REPO}/issues/${number}/labels`, { method: "POST", body: JSON.stringify({ labels: [LABEL_SENT] }) }); } catch { /* не критично */ }
      return json({ ok: true, issue: number });
    } catch (e) {
      console.error("intake error", e);
      return json({ ok: false, error: String(e).slice(0, 200) }, 500);
    }
  }
  return json({ ok: true, service: "rudoctors-moderation-relay" });
});
