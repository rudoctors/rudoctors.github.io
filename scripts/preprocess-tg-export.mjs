/**
 * Telegram Desktop ChatExport (result.json) → filtered doctor-oriented JSON.
 * Source: D:\Data\Downloads\Telegram Desktop\ChatExport_2026-09-24\result.json
 * Outputs (gitignored): scripts/tg-export-*.json
 *
 * Categories: visitka | review | recommendation
 * Topics of interest: Визитки*, Отзывы о врачах + global heuristics.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const SRC =
  process.env.TG_EXPORT_PATH ||
  "D:/Data/Downloads/Telegram Desktop/ChatExport_2026-09-24/result.json";
const OUT_DIR = path.join(ROOT, "scripts");

const VISITKA_TOPIC_IDS = new Set([123302, 123341, 194327]);
const REVIEW_TOPIC_ID = 54282;
const SKIP_TOPIC_IDS = new Set([
  74480, // Информация
  84284, // Флуд
  125513, // Клиники/Вакансии
  204507, // Статьи
  61163, // Поиск врача (Q&A, не визитки)
]);

const SPEC_RE =
  /(терапевт|педиатр|невролог|кардиолог|психиатр|психолог|психотерапевт|эндокринолог|гинеколог|акушер|дерматолог|косметолог|пульмонолог|гастроэнтеролог|ревматолог|аллерголог|онколог|хирург|лор|офтальмолог|уролог|флеболог|стоматолог|ортопед|травматолог|реабилитолог|физиотерап|мануальн|массажист|нутрициолог|диетолог|логопед|дефектолог|сексолог| Family|GP\b|врач[а-яё\s\-]*общен|врач общей)/i;
const CONTACT_RE =
  /(\+381|\+7[\s\-]?\d{3}|\b06\d{2}[\s\-]?\d{3}[\s\-]?\d{2,3}\b|\b011[\s\-]?\d{3,4}[\s\-]?\d{2,4}\b|@[\w]{4,}|whatsapp|viber|t\.me\/)/i;
const SELF_INTRO_RE =
  /(меня зовут|принима[ею]|веду при[её]м|в[ао]шу к в ачебн|начинаю при[её]м|приглаша[юа]|оказыва[юа] услуг|стаж|образован|диплом|лицензи|ординатор)/i;
const REVIEW_RE =
  /(рекомендую|рекомендует|была[а]? у|лечил[а]?сь|обратил[а]?[сь]+|попал[аи] к|спасибо (врачу|доктору|спасибо)\b|отличн(ый|ая|ое) (врач|доктор|специалист)|хорош(ий|ая) (врач|доктор|специалист)|мне помог|лечит[а]?\b.*врач|специалист рекоменд)/i;
const RECO_RE =
  /(посовету|посоветуй|рекомендую (врач|доктор|специалист|терапевт|стоматолог)|хорош(ий|ая) (терапевт|стоматолог|невролог|гинеколог|психиатр|психолог|хирург|кардиолог|эндокринолог)|обратитесь к|могу порекомендовать|личный опыт|по личному опыту|кто хороший|ищем врача|ищу врача|нужен[а]? врач)/i;
const AD_RE = /^(\*{0,2})?(РЕКЛАМА|реклама\b)/i;
const BOT_FROM = new Set(["Поиск в чате", "Поиск", "@search"]);

function normalizeText(msg) {
  const t = msg.text;
  if (Array.isArray(t)) {
    return t
      .map((part) => {
        if (part == null) return "";
        if (typeof part === "string") return part;
        if (typeof part.text === "string") return part.text;
        return "";
      })
      .join("");
  }
  if (typeof t === "string") return t;
  if (Array.isArray(msg.text_entities)) {
    return msg.text_entities
      .map((e) => (e && typeof e.text === "string" ? e.text : ""))
      .join("");
  }
  return "";
}

function clean(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Export not found: ${SRC}`);
    process.exit(1);
  }
  console.log(`Reading ${SRC} ...`);
  const j = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const msgs = Array.isArray(j.messages) ? j.messages : [];
  console.log(`chat=${j.name} messages=${msgs.length}`);

  const topicTitle = new Map();
  const replyTo = new Map();
  for (const m of msgs) {
    if (m.type === "service" && m.action === "topic_created" && m.id != null) {
      topicTitle.set(m.id, String(m.title || `topic_${m.id}`));
    }
    if (m.reply_to_message_id != null) replyTo.set(m.id, m.reply_to_message_id);
  }

  function topicRoot(id) {
    let cur = id;
    const seen = new Set();
    for (let i = 0; i < 64 && cur != null; i++) {
      if (seen.has(cur)) break;
      seen.add(cur);
      if (topicTitle.has(cur)) return cur;
      if (!replyTo.has(cur)) break;
      cur = replyTo.get(cur);
    }
    return null;
  }

  const out = {
    visitka: [],
    review: [],
    recommendation: [],
  };
  const stats = {
    total: msgs.length,
    kept: 0,
    byTopic: {},
    dropped: { service: 0, empty: 0, short: 0, ad: 0, skipTopic: 0, weak: 0 },
  };

  for (const m of msgs) {
    if (m.type !== "message") {
      stats.dropped.service++;
      continue;
    }
    const raw = clean(normalizeText(m));
    if (!raw || raw.length < 40) {
      stats.dropped.empty += raw ? 1 : 0;
      if (!raw) stats.dropped.empty++;
      else stats.dropped.short++;
      continue;
    }
    if (AD_RE.test(raw) || (raw.length < 120 && /^\*{0,2}Реклама/i.test(raw))) {
      stats.dropped.ad++;
      continue;
    }

    const root = topicRoot(m.id);
    const title = root != null ? topicTitle.get(root) || null : null;
    const inVisitka = root != null && VISITKA_TOPIC_IDS.has(root);
    const inReview = root === REVIEW_TOPIC_ID;
    const skipTopic = root != null && SKIP_TOPIC_IDS.has(root);

    const hasSpec = SPEC_RE.test(raw);
    const hasContact = CONTACT_RE.test(raw);
    const selfIntro = SELF_INTRO_RE.test(raw);
    const isReview = inReview || REVIEW_RE.test(raw);
    const isReco = RECO_RE.test(raw);
    const from = m.from || "";
    const isBot = BOT_FROM.has(from);

    let category = null;
    if (inVisitka) {
      category = "visitka";
    } else if (inReview && raw.length >= 60) {
      category = "review";
    } else if (!skipTopic && hasSpec && hasContact && (selfIntro || raw.length >= 120)) {
      category = "visitka";
    } else if (!skipTopic && isReco && hasSpec && raw.length >= 60) {
      category = "recommendation";
    } else if (!skipTopic && isReview && hasSpec && !isBot && raw.length >= 80) {
      category = "review";
    } else if (!skipTopic && isBot && hasSpec && /•/.test(raw) && raw.length >= 80) {
      category = "recommendation";
    }

    if (!category) {
      if (skipTopic) stats.dropped.skipTopic++;
      else stats.dropped.weak++;
      continue;
    }

    const rec = {
      id: m.id,
      date: (m.date || "").slice(0, 10),
      from: from || undefined,
      topic: title || undefined,
      topicId: root ?? undefined,
      category,
      text: raw,
      url: `https://t.me/vrachivserbii/${m.id}`,
      replyTo: m.reply_to_message_id ?? undefined,
    };
    out[category].push(rec);
    stats.kept++;
    const tk = title || "(general)";
    stats.byTopic[tk] = (stats.byTopic[tk] || 0) + 1;
  }

  // chunk visitkas for parallel subagents (~40 msgs each)
  const visitkaChunks = [];
  const V = out.visitka;
  for (let i = 0; i < V.length; i += 40) {
    visitkaChunks.push(V.slice(i, i + 40));
  }
  const reviewChunks = [];
  const R = out.review;
  for (let i = 0; i < R.length; i += 80) {
    reviewChunks.push(R.slice(i, i + 80));
  }
  const recoChunks = [];
  const C = out.recommendation;
  for (let i = 0; i < C.length; i += 80) {
    recoChunks.push(C.slice(i, i + 80));
  }

  const write = (name, data) => {
    const p = path.join(OUT_DIR, name);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
    console.log(
      `wrote ${name}: ${
        Array.isArray(data) ? data.length : Object.keys(data).length
      } keys / ${fs.statSync(p).size} bytes`
    );
  };

  write("tg-export-stats.json", {
    chat: j.name,
    source: SRC,
    generatedAt: new Date().toISOString(),
    ...stats,
    counts: {
      visitka: out.visitka.length,
      review: out.review.length,
      recommendation: out.recommendation.length,
      visitkaChunks: visitkaChunks.length,
      reviewChunks: reviewChunks.length,
      recoChunks: recoChunks.length,
    },
  });
  write("tg-export-visitkas.json", out.visitka);
  write("tg-export-reviews.json", out.review);
  write("tg-export-recommendations.json", out.recommendation);
  write("tg-export-chunks-visitka.json", visitkaChunks);
  write("tg-export-chunks-review.json", reviewChunks);
  write("tg-export-chunks-reco.json", recoChunks);

  console.log("stats", JSON.stringify(stats, null, 2));
  console.log(
    "counts",
    JSON.stringify(
      {
        visitka: out.visitka.length,
        review: out.review.length,
        recommendation: out.recommendation.length,
        visitkaChunks: visitkaChunks.length,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
