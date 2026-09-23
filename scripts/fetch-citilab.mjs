/**
 * Scrape https://citilab.rs/ru/doctors → scripts/citilab-doctors.json
 * Fields: name, specialty, experienceYears, photo, phone, address, booking, detailUrl.
 */
import fs from "node:fs";

const URL = "https://citilab.rs/ru/doctors/";
const res = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0" } });
if (!res.ok) throw new Error(`citilab ${res.status}`);
const html = await res.text();

function dec(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const out = [];
// Split by doctor detail links; each chunk has name + optional Стаж
const parts = html.split(/(?=<a[^>]+href="\/ru\/doctors\/)/i);
for (const part of parts) {
  const href = part.match(/href="(\/ru\/doctors\/[^"]+\/)"/i)?.[1];
  if (!href || href === "/ru/doctors/") continue;
  // Name: text after the doctor image link, often in a heading-like line
  const nameMatch = part.match(
    /href="\/ru\/doctors\/[^"]+\/"[^>]*>\s*([^<]{3,80})\s*<\/a>/i
  );
  // Prefer explicit Russian name pattern (Cyrillic)
  let name = "";
  const cyr = part.match(
    />([А-ЯЁ][а-яёА-ЯЁ\s\-]{3,60})<\/a>/i
  );
  if (cyr) name = dec(cyr[1]);
  else if (nameMatch) name = dec(nameMatch[1]);
  if (!name || !/[А-ЯЁа-яЁ]/.test(name)) continue;

  // Specialty: line before name often has "Врач ..." or known specialty words
  const specM =
    part.match(/(Врач[-\s][^<\n]{2,60}|Педиатр|Кардиолог|Психиатр|Уролог|Акушер-гинеколог|Онколог[^<\n]*|Эндокринолог|Дерматовенеролог|ЛОР|Невролог|Терапевт|Хирург|Гинеколог[^<\n]*)/i);
  const specialization = specM ? dec(specM[1]) : "";

  // Experience: "Стаж: более 5 лет" or "Стаж: 6 лет"
  const expM = part.match(/Стаж:\s*(?:более\s*)?(\d{1,2})/i);
  const experienceYears = expM ? Number(expM[1]) : undefined;

  // Photo
  const imgM = part.match(/src="(\/upload\/[^"]+\.(?:webp|jpg|png))"/i);
  const photoPath = imgM ? imgM[1] : "";

  // Phone
  const phoneM = part.match(/Телефон:\s*([+\d\s\-()]+)/i);
  const phone = phoneM ? dec(phoneM[1]) : "";

  // Address: +Dubljanska / Molerova etc
  const addrM = part.match(/>\s*(\+?[A-Za-zА-Яа-яЁё][^<\n]{5,80}(?:Belgrade|Beograd|Novi Sad)[^<\n]*)</i);
  const address = addrM ? dec(addrM[1]).replace(/^\+/, "") : "";

  // Booking alteg.io
  const bookM = part.match(/href="(https:\/\/n\d+\.alteg\.io[^"]*)"/i);
  const appointmentUrl = bookM ? dec(bookM[1]) : "";

  // Detail page
  const detailUrl = `https://citilab.rs${href}`;

  if (out.some((d) => d.slug === href.replace(/\//g, "-").replace(/^-|-$/g, ""))) continue;
  const slug = href
    .replace(/^\/ru\/doctors\//, "")
    .replace(/\/$/, "");

  out.push({
    slug,
    name,
    specialization,
    experienceYears,
    photo: photoPath,
    phone,
    address,
    appointmentUrl,
    detailUrl,
    source: "citilab.rs",
  });
}

fs.writeFileSync("scripts/citilab-doctors.json", JSON.stringify(out, null, 2), "utf8");
console.log(`citilab doctors: ${out.length}`);
for (const d of out.slice(0, 5)) {
  console.log(`- ${d.name} | exp=${d.experienceYears ?? "-"} | ${d.specialization || "-"}`);
}
