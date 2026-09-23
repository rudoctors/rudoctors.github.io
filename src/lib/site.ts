export const SITE = {
  name: "Rudoctors",
  title: "Rudoctors — врачи Сербии: рейтинг и отзывы",
  description:
    "Каталог русскоязычных врачей в Сербии: Белград, Нови-Сад и другие города. Рейтинги, отзывы пациентов, специализации, опыт и контакты.",
  url: "https://rudoctors.github.io",
  telegram: "https://t.me/vrachivserbii",
  telegramLabel: "@vrachivserbii",
  lang: "ru",
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
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/** Allow only http(s), tel, mailto, and site-relative paths. Blocks javascript: etc. */
export function safeUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const u = String(raw).trim();
  if (!u) return undefined;
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (/^(https?:|tel:|mailto:)/i.test(u)) return u;
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
