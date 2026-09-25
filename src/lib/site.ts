export const SITE = {
  name: "Rudoctors",
  title: "Rudoctors — врачи Сербии: рейтинг и отзывы",
  description:
    "Каталог русскоязычных врачей в Сербии: Белград, Нови-Сад и другие города. Рейтинги, отзывы пациентов, специализации, опыт и контакты.",
  url: "https://rudoctors.github.io",
  telegram: "https://t.me/vrachivserbii",
  telegramLabel: "@vrachivserbii",
  /** Бот модерации заявок «Добавить врача» (см. docs/TELEGRAM-BOT.md). */
  moderationBot: "rudoctors_moderation_bot",
  lang: "ru",
} as const;

/** Stable JSON-LD @id anchors. */
export const SCHEMA_IDS = {
  organization: `${SITE.url}/#organization`,
  website: `${SITE.url}/#website`,
} as const;

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m10 < 10 || m10 >= 20)) return few;
  return many;
}

/**
 * Normalize and validate external URLs.
 * - http → https
 * - www.t.me → t.me
 * - https://www.@handle → https://t.me/handle
 * - @handle / bare handle → https://t.me/handle (for contact-like values)
 * - reject cyrillic/space/invalid hosts
 */
export function safeUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let u = String(raw).trim();
  if (!u) return undefined;

  // Reject values that look like addresses, not URLs
  if (/[а-яА-ЯёЁ]/.test(u) || /\s/.test(u)) return undefined;

  if (u.startsWith("/") && !u.startsWith("//")) return u;

  // Bare telegram handle
  if (/^@[\w]{4,}$/i.test(u)) return `https://t.me/${u.slice(1)}`;

  // Already scheme-like
  if (/^(tel:|mailto:)/i.test(u)) return u;

  // Fix https://www.@handle → https://t.me/handle
  const badTg = u.match(/^https?:\/\/(?:www\.)?@([\w]{3,})/i);
  if (badTg) return `https://t.me/${badTg[1]}`;

  // Fix https://www.t.me/... → https://t.me/...
  u = u.replace(/^https?:\/\/(www\.)?t\.me\//i, "https://t.me/");

  // Upgrade http → https for http(s) URLs
  if (/^http:\/\//i.test(u)) u = u.replace(/^http:\/\//i, "https://");

  if (/^https:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);
      if (!parsed.hostname || parsed.hostname.includes(" ")) return undefined;
      // Reject hosts with non-ascii (already filtered) or empty
      if (!/^[a-z0-9.-]+$/i.test(parsed.hostname)) return undefined;
      return parsed.href;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/** URL slug for city pages: "Novi Sad" → "novi-sad", "Niš" → "nis". */
export function citySlug(city: string): string {
  return String(city || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
