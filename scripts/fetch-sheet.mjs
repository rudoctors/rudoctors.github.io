/**
 * Fetch Google Sheets (public CSV) → scripts/sheet-doctors.json
 * Source: @vrachivserbii table (credits: diana_volchenskaya / Iskatelev).
 */
import fs from "node:fs";

const SHEET_ID = "1Bh4IdM-L6_18-LAIPMk3Cs-wVko7BamVw9mMm3dKU_Q";
const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

/** Minimal CSV parser (quotes, escaped quotes, newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const res = await fetch(URL, {
  headers: { "User-Agent": "Mozilla/5.0", Accept: "text/csv" },
});
if (!res.ok) throw new Error(`sheet ${res.status}`);
const csv = await res.text();
const rows = parseCsv(csv);

// find header row with "ФИО"
const headerIdx = rows.findIndex((r) => r.some((c) => c.trim() === "ФИО"));
if (headerIdx < 0) throw new Error("header ФИО not found");
const header = rows[headerIdx].map((c) => c.trim());
const col = (name) => header.findIndex((h) => h === name);

const iSection = col("Раздел");
const iName = col("ФИО");
const iSpec = col("Специальность");
const iCity = col("Город");
const iContacts = col("Контакты");
const iLangs = col("Знание языков");
const iDocs = col("Документы");

const out = [];
for (const r of rows.slice(headerIdx + 1)) {
  const name = (r[iName] || "").trim();
  if (!name || /^(Раздел|Ссылка)/.test(name)) continue;
  // strip notes in parentheses like "(по состоянию на ...)"
  const cleanName = name.replace(/\([^)]*\)/g, "").trim();
  if (!cleanName) continue;
  out.push({
    section: (r[iSection] || "").trim(),
    name: cleanName,
    nameRaw: name,
    specialization: (r[iSpec] || "").trim(),
    city: (r[iCity] || "").trim(),
    contacts: (r[iContacts] || "").trim(),
    languages: (r[iLangs] || "").trim(),
    documents: (r[iDocs] || "").trim(),
  });
}

fs.writeFileSync("scripts/sheet-doctors.json", JSON.stringify(out, null, 2), "utf8");
console.log(`sheet doctors: ${out.length}`);
console.log("sample:", out[0]?.name, "|", out[0]?.section);
