/**
 * Scrape public Telegram preview t.me/s/<channel> → scripts/tg-posts.json
 * Only public web preview; no spoof UA; polite delay; no fake reviews.
 * Classifies posts: doctor_card | review_candidate | other.
 */
import fs from "node:fs";

const CHANNEL = process.env.TG_CHANNEL || "russmedicserbia";
const BASE = `https://t.me/s/${CHANNEL}`;
const MAX_PAGES = Number(process.env.TG_PAGES || 8);

function dec(s) {
  return String(s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RudoctorsBot/1.0; +https://rudoctors.github.io)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

const posts = [];
const seen = new Set();
let url = BASE;
let pages = 0;

while (url && pages < MAX_PAGES) {
  pages++;
  const html = await fetchPage(url);

  // wrap blocks: split on bare class token (class="... tgme_widget_message_wrap")
  const parts = html.split(/tgme_widget_message_wrap/);
  for (const b of parts) {
    const idM = b.match(/data-post="[^"]+\/(\d+)"/);
    if (!idM) continue;
    const id = idM[1];
    if (seen.has(id)) continue;

    const textEl = b.match(
      /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (!textEl) continue;
    const text = dec(textEl[1]);
    const dateM = b.match(/datetime="([^"]+)"/);
    const date = dateM ? dateM[1].slice(0, 10) : "";
    if (!text || text.length < 40) continue;

    seen.add(id);

    const isAd = /^\*{0,2}РЕКЛАМА/i.test(text) || /страховк/i.test(text.slice(0, 80));
    const hasContact = /(\+381|\+7|@[\w]+|t\.me\/|whatsapp|viber|телеграм|вотсап)/i.test(text);
    const firstLine = text.split("\n")[0].trim();
    const nameLike = /^[А-ЯЁ][а-яёА-ЯЁ\s\-]{4,50}$/.test(firstLine.replace(/\*\*/g, ""));
    const specHint =
      /(врач|терапевт|педиатр|невролог|кардиолог|психиатр|эндокринолог|гинеколог|дерматолог|пульмонолог|гастроэнтеролог|ревматолог|аллерголог|онколог|хирург|ЛОР|косметолог)/i.test(
        text
      );

    let kind = "other";
    if (!isAd && hasContact && specHint && (nameLike || /доктор|врач/i.test(firstLine))) {
      kind = "doctor_card";
    } else if (
      !isAd &&
      /(отзыв|была вчера|побывал|рекомендую|обратилась|попал[аи] к|лечил[а]сь)/i.test(text) &&
      text.length > 80
    ) {
      kind = "review_candidate";
    }

    posts.push({
      id: `${CHANNEL}-${id}`,
      channel: CHANNEL,
      date,
      kind,
      text,
      url: `https://t.me/${CHANNEL}/${id}`,
      isAd,
    });
  }

  const prev = html.match(/href="(\/s\/[^"]+\?before=\d+)"/);
  url = prev ? `https://t.me${prev[1].replace(/&amp;/g, "&")}` : null;
  if (url) await new Promise((r) => setTimeout(r, 800));
}

fs.writeFileSync("scripts/tg-posts.json", JSON.stringify(posts, null, 2), "utf8");
const cards = posts.filter((p) => p.kind === "doctor_card");
const reviews = posts.filter((p) => p.kind === "review_candidate");
console.log(`tg posts: ${posts.length} (pages=${pages})`);
console.log(`doctor_card: ${cards.length}, review_candidate: ${reviews.length}`);
for (const c of cards.slice(0, 8)) {
  console.log(`- ${c.text.split("\n")[0].slice(0, 70)}`);
}
