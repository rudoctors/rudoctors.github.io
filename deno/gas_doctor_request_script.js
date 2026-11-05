/**
 * Google Apps Script — intake заявок врачей Rudoctors.
 *
 * Развернуть как Web app: Execute as: Me; Who has access: Anyone.
 * Script Properties (не хранить в репозитории):
 *   GOOGLE_SHEET_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID,
 *   GITHUB_TOKEN, GITHUB_REPO
 */

const DOCTOR_SHEET_NAME = "Заявки врачей";
const DOCTOR_REQUEST_PREFIX = "DR-";
const DEFAULT_GITHUB_REPO = "rudoctors/rudoctors.github.io";

function doctorProperty_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || "";
}

function doctorJson_(data) {
  // ContentService returns a JSON response that the browser can parse with response.json().
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doctorText_(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function doctorRequestId_() {
  const now = new Date();
  const stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyMMdd-HHmmss");
  const suffix = Math.floor(100 + Math.random() * 900);
  return DOCTOR_REQUEST_PREFIX + stamp + "-" + suffix;
}

function doctorSheet_() {
  // This is deliberately a standalone Apps Script project. Do not bind it to
  // the review CRM script: that project owns a separate doPost handler.
  const spreadsheetId = doctorProperty_("GOOGLE_SHEET_ID");
  if (!/^[A-Za-z0-9_-]{20,}$/.test(spreadsheetId)) {
    throw new Error("GOOGLE_SHEET_ID is not configured");
  }
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(DOCTOR_SHEET_NAME);
  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(DOCTOR_SHEET_NAME);
  const headers = [
    "ID заявки", "Дата", "Статус", "GitHub Issue", "Имя врача", "Специальность",
    "Город", "Стаж", "Клиника / кабинет", "Контакт", "О враче", "Источник"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#1a3a5c")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, headers.length, 150);
  sheet.setColumnWidth(11, 420);
  sheet.getRange("I:L").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  return sheet;
}

function doctorCreateGithubIssue_(request) {
  const token = doctorProperty_("GITHUB_TOKEN");
  const repo = doctorProperty_("GITHUB_REPO") || DEFAULT_GITHUB_REPO;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("GITHUB_REPO is invalid");
  }

  const body = [
    "## Заявка на добавление врача",
    "",
    `CRM ID: ${request.id}`,
    `Имя: ${request.name}`,
    `Специальность: ${request.spec}`,
    `Город: ${request.city}`,
    `Стаж: ${request.exp || "—"}`,
    `Клиника: ${request.clinic || "—"}`,
    `Контакт: ${request.contact}`,
    "",
    "О себе:",
    request.about || "—",
    "---",
    "",
    "Отправлено через форму rudoctors.github.io/add-doctor/."
  ].join("\n");
  const response = UrlFetchApp.fetch("https://api.github.com/repos/" + repo + "/issues", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    payload: JSON.stringify({
      title: "Новый врач: " + request.name + " (" + request.spec + ")",
      body: body,
      labels: ["doctor-request"]
    }),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  let payload = {};
  try { payload = JSON.parse(response.getContentText()); } catch (_) {}
  if (code < 200 || code >= 300 || !Number.isInteger(payload.number)) {
    throw new Error("GitHub Issue creation failed (HTTP " + code + ")");
  }
  return { number: payload.number, url: payload.html_url || "" };
}

function doctorNotifyTelegram_(request, issue) {
  const token = doctorProperty_("TELEGRAM_BOT_TOKEN");
  const chatId = doctorProperty_("TELEGRAM_ADMIN_CHAT_ID");
  if (!token || !chatId) return;
  const lines = [
    "🩺 Новая заявка врача",
    "CRM: " + request.id,
    "Врач: " + request.name,
    "Специальность: " + request.spec,
    "Город: " + request.city,
    "Issue: #" + issue.number,
    issue.url
  ];
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
      muteHttpExceptions: true
    });
  } catch (error) {
    Logger.log("Telegram notification error: " + error);
  }
}

function doPost(e) {
  try {
    let payload = {};
    try {
      payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    } catch (_) {
      return doctorJson_({ ok: false, error: "invalid_json" });
    }

    const request = {
      id: doctorRequestId_(),
      name: doctorText_(payload.name, 120),
      spec: doctorText_(payload.spec, 120),
      city: doctorText_(payload.city, 60),
      exp: doctorText_(payload.exp, 8),
      clinic: doctorText_(payload.clinic, 160),
      contact: doctorText_(payload.contact, 160),
      about: doctorText_(payload.about, 1500),
      websiteHp: doctorText_(payload.website_hp, 200)
    };
    if (request.websiteHp) return doctorJson_({ ok: true, ignored: true });
    if (!request.name || !request.spec || !request.city || !request.contact) {
      return doctorJson_({ ok: false, error: "missing_fields" });
    }
    if (request.exp && !/^(?:[0-9]|[1-6][0-9]|70)$/.test(request.exp)) {
      return doctorJson_({ ok: false, error: "invalid_experience" });
    }

    const issue = doctorCreateGithubIssue_(request);
    const sheet = doctorSheet_();
    sheet.appendRow([
      request.id, new Date(), "1. Новая", issue.number, request.name, request.spec,
      request.city, request.exp, request.clinic, request.contact, request.about,
      "rudoctors.github.io/add-doctor"
    ]);
    doctorNotifyTelegram_(request, issue);
    return doctorJson_({ ok: true, requestId: request.id, issue: issue.number });
  } catch (error) {
    Logger.log("Doctor request error: " + error);
    return doctorJson_({ ok: false, error: "server_error" });
  }
}
