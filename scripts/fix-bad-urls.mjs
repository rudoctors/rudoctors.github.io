import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "src", "data", "doctors");

function normalizeUrl(raw) {
  if (!raw) return raw;
  let u = String(raw).trim();
  if (!u) return undefined;
  if (/[а-яА-ЯёЁ]/.test(u) || /\s/.test(u)) return undefined;
  const badTg = u.match(/^https?:\/\/(?:www\.)?@([\w]{3,})/i);
  if (badTg) return `https://t.me/${badTg[1]}`;
  u = u.replace(/^https?:\/\/(www\.)?t\.me\//i, "https://t.me/");
  if (/^http:\/\//i.test(u)) u = u.replace(/^http:\/\//i, "https://");
  if (/^https:\/\//i.test(u)) {
    try {
      const p = new URL(u);
      if (!/^[a-z0-9.-]+$/i.test(p.hostname)) return undefined;
      return p.href.replace(/\/$/, p.pathname === "/" ? "/" : "") || p.href;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

let fixed = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const p = path.join(dir, file);
  const before = fs.readFileSync(p, "utf8");
  const data = JSON.parse(before);
  let changed = false;

  if (data.contacts?.website !== undefined) {
    const n = normalizeUrl(data.contacts.website);
    if (n !== data.contacts.website) {
      data.contacts.website = n;
      changed = true;
    }
  }
  if (data.contacts?.telegram !== undefined) {
    const n = normalizeUrl(data.contacts.telegram);
    if (n !== data.contacts.telegram) {
      data.contacts.telegram = n;
      changed = true;
    }
  }
  if (Array.isArray(data.workplaces)) {
    for (const w of data.workplaces) {
      if (w?.url !== undefined) {
        const n = normalizeUrl(w.url);
        if (n !== w.url) {
          w.url = n;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
    fixed++;
    console.log("fixed", file);
  }
}
console.log("total fixed", fixed);
