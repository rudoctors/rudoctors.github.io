/**
 * Google Apps Script — CRM Отзывы для Rudoctors
 * Таблица: "CRM Отзывы — Rudoctors"
 * Sheet: "Отзывы"
 * Колонки: A: ID | B: Дата | C: Статус | D: Slug врача | E: Имя врача | F: Автор | G: Оценка | H: Текст | I: Примечание
 *
 * Деплой: Web App, Execute as: Me, Who has access: Anyone
 * Env via Script Properties: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID
 */

const SHEET_NAME = "Отзывы";
const REVIEW_PREFIX = "RD-";
// Единый порог текста: такой же, как в браузере (leave-review.astro) и relay
// (deno/review-intake.ts -> REVIEW_TEXT_MIN). Проверяется deno/review-flow.test.ts.
const TEXT_MIN = 30;

// ── helpers ──────────────────────────────────────────────────────────────────

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
}

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || "";
}

function tgToken_() { return getProp_("TELEGRAM_BOT_TOKEN"); }
function tgChat_()  { return getProp_("TELEGRAM_ADMIN_CHAT_ID"); }

function tgSend_(payload) {
  const token = tgToken_();
  if (!token) return;
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) { Logger.log("tgSend error: " + e); }
}

function createJsonResponse_(data) {
  // ВАЖНО: HtmlService чтобы избежать редиректа 302 (ContentService его даёт)
  return HtmlService.createHtmlOutput(JSON.stringify(data));
}

function escapeMd_(text) {
  return String(text || "").replace(/([_*`\[])/g, "\\$1");
}

function generateId_() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rnd = Math.floor(100 + Math.random() * 900);
  return REVIEW_PREFIX + now.getFullYear().toString().slice(-2) + mm + dd + "-" + rnd;
}

// ── setupCRM ─────────────────────────────────────────────────────────────────

/**
 * Запустить один раз вручную: настраивает заголовки и валидацию статусов.
 */
function setupCRM() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName(SHEET_NAME);
  }

  const headers = [
    "ID отзыва", "Дата", "Статус", "Slug врача", "Имя врача",
    "Автор", "Оценка", "Текст отзыва", "Примечание"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1a3a5c");
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  const statuses = ["1. Новый", "2. Одобрен", "3. Отклонён", "4. Опубликован"];
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(statuses, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("C2:C1000").setDataValidation(rule);

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 200);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7,  80);
  sheet.setColumnWidth(8, 400);
  sheet.setColumnWidth(9, 200);

  sheet.getRange("H2:I1000").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  SpreadsheetApp.getUi().alert("CRM-таблица «" + SHEET_NAME + "» настроена!");
}

// ── doPost ────────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    let data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); }
      catch (_) { data = e.parameter || {}; }
    } else {
      data = e.parameter || {};
    }

    // GET-action внутри POST (для Deno, который может слать JSON)
    if (data.action === "getReview") {
      return handleGetReview_(data.id);
    }

    // Honeypot: если заполнено — молча отбрасываем
    if (data.website_hp) {
      return createJsonResponse_({ ok: true, status: "ignored" });
    }

    // Обязательные поля
    const doctor_slug = String(data.doctor_slug || "").trim().slice(0, 120);
    const doctor_name = String(data.doctor_name || "").trim().slice(0, 120);
    const author      = String(data.author      || "").trim().slice(0, 80);
    // Оценка НЕобязательна: только целые 1..5 попадают в таблицу,
    // всё прочее (отсутствует/битая/0/6) остаётся пустым — НИКОГДА не подменяется на 5.
    const ratingRaw   = Number(data.rating);
    const ratingValue = Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : "";
    const text        = String(data.text        || "").trim().slice(0, 2000);

    if (!doctor_slug || !author || text.length < TEXT_MIN) {
      return createJsonResponse_({ ok: false, error: "Обязательные поля: doctor_slug, author, text (мин. " + TEXT_MIN + " симв.); оценка 1–5 — необязательно" });
    }

    const id = generateId_();
    const now = new Date();
    const dateFormatted = Utilities.formatDate(now, "Europe/Belgrade", "dd.MM.yyyy HH:mm");

    // Запись в таблицу
    const sheet = getSheet_();
    sheet.appendRow([
      id, dateFormatted, "1. Новый", doctor_slug, doctor_name,
      author, ratingValue, text, ""
    ]);
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 9).setVerticalAlignment("top");

    // Telegram-карточка с кнопками
    notifyTelegram_({ id, dateFormatted, doctor_slug, doctor_name, author, rating: ratingValue, text });

    return createJsonResponse_({ ok: true, id });

  } catch (err) {
    Logger.log("doPost error: " + err);
    return createJsonResponse_({ ok: false, error: String(err) });
  }
}

// ── doGet ─────────────────────────────────────────────────────────────────────

/**
 * GET /exec?action=getReview&id=RD-XXXXXX  — возвращает данные строки по ID.
 * Deno использует при апруве, чтобы получить slug/author/rating/text.
 */
function doGet(e) {
  const params = e.parameter || {};
  if (params.action === "getReview" && params.id) {
    return handleGetReview_(params.id);
  }
  return createJsonResponse_({
    ok: true,
    service: "CRM Отзывы — Rudoctors",
    time: new Date().toISOString()
  });
}

function handleGetReview_(id) {
  if (!id) return createJsonResponse_({ ok: false, error: "id required" });
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return createJsonResponse_({
        ok: true,
        review: {
          id:          data[i][0],
          date:        data[i][1],
          status:      data[i][2],
          doctor_slug: data[i][3],
          doctor_name: data[i][4],
          author:      data[i][5],
          rating:      data[i][6],
          text:        data[i][7],
          note:        data[i][8]
        }
      });
    }
  }
  return createJsonResponse_({ ok: false, error: "Отзыв не найден: " + id });
}

// ── updateStatus ──────────────────────────────────────────────────────────────

/**
 * GET /exec?action=updateStatus&id=RD-XXXX&status=2.%20Одобрен
 * Вызывается Deno после апрува/отклонения.
 */
function doGetUpdateStatus_(params) {
  const id     = params.id;
  const status = params.status;
  if (!id || !status) return createJsonResponse_({ ok: false, error: "id and status required" });

  const sheet = getSheet_();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 3).setValue(status);
      return createJsonResponse_({ ok: true });
    }
  }
  return createJsonResponse_({ ok: false, error: "Не найдено: " + id });
}

// Override doGet to handle updateStatus
const _doGet_orig = doGet;
// eslint-disable-next-line no-global-assign
function doGet(e) {  // redefine
  const params = e.parameter || {};
  if (params.action === "getReview" && params.id) return handleGetReview_(params.id);
  if (params.action === "updateStatus") return doGetUpdateStatus_(params);
  return createJsonResponse_({
    ok: true,
    service: "CRM Отзывы — Rudoctors",
    time: new Date().toISOString()
  });
}

// ── Telegram notification ─────────────────────────────────────────────────────

function notifyTelegram_({ id, dateFormatted, doctor_slug, doctor_name, author, rating, text }) {
  const chatId = tgChat_();
  if (!chatId) return;

  const hasRating = rating !== "" && rating !== null && rating !== undefined;
  const stars = hasRating
    ? "⭐".repeat(Math.min(Math.max(parseInt(rating, 10), 1), 5))
    : "";
  const preview = text.length > 300 ? text.slice(0, 300) + "…" : text;

  const message =
    "💬 <b>Новый отзыв · <code>" + id + "</code></b>\n\n" +
    "<b>Врач:</b> " + escHtml_(doctor_name || doctor_slug) + "\n" +
    "<b>Slug:</b> <code>" + escHtml_(doctor_slug) + "</code>\n" +
    "<b>Автор:</b> " + escHtml_(author) + "\n" +
    "<b>Оценка:</b> " + (hasRating ? rating + "/5 " + stars : "— (без оценки)") + "\n" +
    "<b>Дата:</b> " + dateFormatted + "\n\n" +
    escHtml_(preview);

  tgSend_({
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Опубликовать", callback_data: "rev_ok:" + id },
        { text: "❌ Отклонить",   callback_data: "rev_no:" + id }
      ]]
    }
  });
}

function escHtml_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Test helpers ──────────────────────────────────────────────────────────────

function testSubmit() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        doctor_slug: "ivan-petrov",
        doctor_name: "Иван Петров",
        author: "Тестовый Пациент",
        rating: 5,
        text: "Отличный врач, очень внимательный. Помог разобраться с диагнозом.",
        website_hp: ""
      })
    }
  };
  Logger.log(doPost(fakeEvent).getContent());
}
