/**
 * Общая валидация intake отзывов — единый контракт для Deno-relay и браузера.
 * Непреложные правила (remediation 2026-11):
 *  - Оценка НЕобязательна: отсутствует/битая → null (scoreless). НИКОГДА не превращается в 5.
 *  - Текст обязателен, минимум REVIEW_TEXT_MIN символов — порог одинаковый
 *    в браузере (leave-review.astro), relay и GAS-скрипте.
 */

/** Минимум текста отзыва. Дублируется literal'ом в leave-review.astro и gas_review_script.js —
 *  deno/review-flow.test.ts сверяет все три значения (assert REVIEW_TEXT_MIN === 30). */
export const REVIEW_TEXT_MIN = 30;
export const REVIEW_TEXT_MAX = 2000;

export interface ReviewInput {
  doctorSlug: string;
  doctorName: string;
  author: string;
  /** null = отзыв без оценки; допустимы только целые 1..5 */
  rating: number | null;
  text: string;
}

export type ReviewIntakeResult =
  | { ok: true; review: ReviewInput }
  | { ok: false; error: string };

/** Целое 1..5; всё прочие значения (в т.ч. "" / null / undefined / 0 / 6 / 4.5 / NaN) → null. */
export function parseOptionalRating(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export function normalizeReview(data: Record<string, unknown>): ReviewIntakeResult {
  const doctorSlug = String(data.doctor_slug ?? "").trim().slice(0, 120);
  const doctorName = String(data.doctor_name ?? "").trim().slice(0, 120);
  const author = String(data.author ?? "").trim().slice(0, 80);
  const text = String(data.text ?? "").trim().slice(0, REVIEW_TEXT_MAX);
  const rating = parseOptionalRating(data.rating);

  if (!doctorSlug || !author || text.length < REVIEW_TEXT_MIN) {
    return {
      ok: false,
      error: `Обязательные поля: doctor_slug, author, text (мин. ${REVIEW_TEXT_MIN} символов); оценка 1–5 — необязательно`,
    };
  }
  return { ok: true, review: { doctorSlug, doctorName, author, rating, text } };
}
