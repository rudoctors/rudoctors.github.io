/**
 * Исполнимые проверки ремедиации review-flow (remediation 2026-11-03).
 *
 * Запуск: deno test --allow-read --no-config deno/review-flow.test.ts
 *
 * Покрывает контракт из задачи:
 *  1. Scoreless (текстовый отзыв без оценки) НИКОГДА не получает 5 — ни в браузере,
 *     ни в relay, ни в GAS, ни при публикации в JSON врача.
 *  2. Числовая оценка опциональна; принимаются только целые 1..5.
 *  3. Ровно один канонический POST /api/review в relay.
 *  4. count/average согласованы (AggregateRating только по валидным числовым данным).
 *  5. Порог текста одинаков: браузер = relay = GAS (30 символов).
 */
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1.0.14";
import { normalizeReview, parseOptionalRating, REVIEW_TEXT_MIN } from "./review-intake.ts";
import { computeRating, reviewScore } from "../src/lib/rating.ts";
import type { Doctor, Review } from "../src/lib/types.ts";

const ROOT = new URL("..", import.meta.url);
const RELAY = new URL("./doctor-relay.ts", import.meta.url);
const GAS = new URL("./gas_review_script.js", import.meta.url);
const BROWSER = new URL("../src/pages/leave-review.astro", import.meta.url);
const PROFILE = new URL("../src/pages/doctors/[slug].astro", import.meta.url);

function readText(url: URL): string {
  return Deno.readTextFileSync(url);
}

function countMatches(text: string, re: RegExp): number {
  return [...text.matchAll(re)].length;
}

// ── 1. Scoreless никогда ≠ 5, оценка опциональна ─────────────────────────────

Deno.test("scoreless intake: no rating field → rating is null, never 5", () => {
  const res = normalizeReview({
    doctor_slug: "test-doctor",
    author: "Пациент",
    text: "Очень внимательный врач, всё объяснил и помог разобраться.",
  });
  assert(res.ok);
  assertEquals(res.review.rating, null);
});

Deno.test("scoreless intake: explicit null/empty string rating → null", () => {
  for (const bad of [null, "", undefined]) {
    const res = normalizeReview({
      doctor_slug: "test-doctor",
      author: "Пациент",
      rating: bad,
      text: "Отзыв без звезды, текст длиннее тридцати символов.",
    });
    assert(res.ok);
    assertEquals(res.review.rating, null);
  }
});

Deno.test("valid numeric ratings 1..5 are preserved as-is", () => {
  for (const r of [1, 2, 3, 4, 5]) {
    const res = normalizeReview({
      doctor_slug: "test-doctor",
      author: "Пациент",
      rating: r,
      text: "Отличный приём, врач вошёл в положение и всё объяснил.",
    });
    assert(res.ok);
    assertEquals(res.review.rating, r);
  }
  for (const r of ["1", "2", "3", "4", "5"]) {
    assertEquals(parseOptionalRating(r), Number(r));
  }
});

Deno.test("invalid ratings (0, 6, 4.5, NaN-ish, 'abc') → null, never coerced to 5", () => {
  for (const bad of [0, 6, -1, 4.5, "abc", "0", "6"]) {
    assertEquals(parseOptionalRating(bad), null);
    const res = normalizeReview({
      doctor_slug: "test-doctor",
      author: "Пациент",
      rating: bad,
      text: "Текст отзыва, по длине не ниже согласованного порога.",
    });
    assert(res.ok);
    assertEquals(res.review.rating, null, `rating ${JSON.stringify(bad)} must fall back to null`);
  }
});

Deno.test("text below the shared threshold is rejected with an explanatory error", () => {
  const res = normalizeReview({
    doctor_slug: "test-doctor",
    author: "Пациент",
    text: "слишком коротко",
  });
  assertFalse(res.ok);
  assert(res.error.includes(String(REVIEW_TEXT_MIN)));
});

// ── 2. Порог текста одинаков: браузер = relay = GAS ─────────────────────────

Deno.test("shared threshold constant is 30", () => {
  assertEquals(REVIEW_TEXT_MIN, 30);
});

Deno.test("browser and relay text thresholds are equal (both 30)", () => {
  const relay = readText(RELAY);
  const browser = readText(BROWSER);
  const gas = readText(GAS);
  // Р Relay: валидацией заведует общий модуль review-intake.ts
  assert(relay.includes('from "./review-intake.ts"'), "relay must use the shared validation module");
  // Браузер: HTML minlength и JS-проверка 30
  assert(browser.includes('minlength="30"'), "browser textarea minlength must be 30");
  assert(browser.includes("text.length < 30"), "browser JS threshold must be 30");
  // GAS: порог 30 (TEXT_MIN)
  assert(gas.includes("const TEXT_MIN = 30;") && gas.includes("text.length < TEXT_MIN"),
    "GAS threshold must be 30");
});

// ── 3. Ровно один канонический POST /api/review ──────────────────────────────

Deno.test("relay has exactly one canonical POST /api/review handler", () => {
  const relay = readText(RELAY);
  const handlers = countMatches(relay, /req\.method === "POST" && url\.pathname === "\/api\/review"/g);
  assertEquals(handlers, 1, "POST /api/review must appear exactly once");
});

Deno.test("relay has no invented rating defaults ('|| 5') anywhere in code", () => {
  const stripComments = (s: string) => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, " ");
  assertFalse(/\|\| 5/.test(stripComments(readText(RELAY))), "relay must not default missing rating to 5");
  assertFalse(/\|\| 5/.test(stripComments(readText(GAS))), "GAS must not default missing rating to 5");
});

Deno.test("publishReview writes rating only for valid 1..5 (scoreless stays absent)", () => {
  const relay = readText(RELAY);
  assert(
    relay.includes("...(rev.rating !== null ? { rating: rev.rating } : {})"),
    "publishReview must omit the rating field for scoreless reviews",
  );
});

// ── 4. Агрегаты согласованы: только валидные числовые данные ────────────────

Deno.test("reviewScore: scoreless review contributes nothing; 1..5 clamp is exact", () => {
  const scoreless: Review = { id: "r1", author: "a", date: "2026-01-01", text: "текст" };
  assertEquals(reviewScore(scoreless), null);
  assertEquals(reviewScore({ ...scoreless, rating: 0 }), null);
  for (const r of [1, 2, 3, 4, 5]) {
    assertEquals(reviewScore({ ...scoreless, rating: r }), r);
  }
  assertEquals(reviewScore({ ...scoreless, rating: 6 }), 5); // защита от накрутки
});

function testDoctor(reviews: Review[]): Doctor {
  return {
    slug: "test-doctor",
    name: "Тест Врач",
    specializations: ["therapist"],
    city: "Belgrade",
    languages: ["ru"],
    formats: ["offline"],
    education: [],
    workplaces: [],
    contacts: {},
    verificationStatus: "self",
    hidden: false,
    featured: false,
    sources: [],
    updatedAt: "2026-01-01",
    reviews,
  } as unknown as Doctor;
}

Deno.test("AggregateRating inputs: doctor with no numeric ratings → average 0 → no AggregateRating", () => {
  const rating = computeRating(testDoctor([
    { id: "r1", author: "a", date: "2026-01-01", text: "Текст один" },
    { id: "r2", author: "b", date: "2026-02-01", text: "Текст два" },
  ]));
  assertEquals(rating.average, 0);
  assertEquals(rating.count, 2);       // оба текстовых отзыва видны в списке
  assertEquals(rating.ratedCount, 0);  // reviewCount-гейт не пропустит
});

Deno.test("count/average consistency: count=все отзывы, ratedCount=оценки в average, average в 1..5", () => {
  const rating = computeRating(testDoctor([
    { id: "r1", author: "a", date: "2026-01-01", text: "Текст один" },
    { id: "r2", author: "b", date: "2026-02-01", rating: 4, text: "Четыре" },
    { id: "r3", author: "c", date: "2026-03-01", rating: 5, text: "Пять" },
    { id: "r4", author: "d", date: "2026-04-01", text: "Текст четыре" },
  ]));
  assertEquals(rating.count, 4);       // заголовок «Отзывы (4)» = список из 4 шт.
  assertEquals(rating.ratedCount, 2);  // AggregateRating.reviewCount = 2 = размер выборки average
  assert(rating.average >= 1 && rating.average <= 5);
});

Deno.test("out-of-range stored ratings (0, 6): 0 excluded; 6 is clamped by the anti-abuse guard", () => {
  const rating = computeRating(testDoctor([
    { id: "r1", author: "a", date: "2026-01-01", rating: 4, text: "Четыре" },
    { id: "r2", author: "b", date: "2026-02-01", rating: 0, text: "Ноль" },
    { id: "r3", author: "c", date: "2026-03-01", rating: 6, text: "Шесть" },
  ]));
  // 0 = scoreless → вне average; 6 валидатор данных (doctors.ts) не пропустил бы
  // в данные, а reviewScore защищается clamp'ом до 5 — average всё равно остаётся в 1..5.
  assertEquals(rating.ratedCount, 2);
  assert(rating.average >= 1 && rating.average <= 5);
  assertEquals(rating.count, 3);
});

// ── 5. Данные в репо и публикация соответствуют контракту ────────────────────

Deno.test("published [slug] gate: AggregateRating only when ratedCount>0 && average>0", () => {
  const profile = readText(PROFILE);
  assert(
    profile.includes("rating.ratedCount > 0 && rating.average > 0"),
    "JSON-LD aggregateRating gate must require ratedCount>0 && average>0",
  );
  assert(
    profile.includes("reviewCount: rating.ratedCount"),
    "AggregateRating.reviewCount must equal the number of ratings behind the average",
  );
});

Deno.test("doctor data scan: every stored rating is absent/0 or an integer 1..5; aggregates agree", async () => {
  const dir = new URL("src/data/doctors/", ROOT);
  let files = 0;
  let ratings = 0;
  let doctorsWithRated = 0;
  for await (const entry of Deno.readDir(dir)) {
    if (!(entry.name.endsWith(".json"))) continue;
    files++;
    const doc = JSON.parse(readText(new URL(`src/data/doctors/${entry.name}`, ROOT))) as {
      reviews?: { rating?: number }[];
    };
    const reviews = Array.isArray(doc.reviews) ? doc.reviews : [];
    const rated = reviews.filter((r) => {
      // в карточках допустимы только 0, отсутствующая оценка или целые 1..5
      if (r.rating === undefined || r.rating === null) return false;
      assert(Number.isInteger(r.rating), `${entry.name}: rating ${r.rating} is not an integer`);
      assert(r.rating >= 0 && r.rating <= 5, `${entry.name}: rating ${r.rating} out of 0..5`);
      return r.rating >= 1 && r.rating <= 5;
    });
    ratings += rated.length;
    if (rated.length > 0) doctorsWithRated++;
    // согласованность: ratedCount = числу валидных оценок; count = всем релевантным отзывам
    const rel = computeRating(testDoctor(reviews as Review[]));
    assertEquals(rel.ratedCount, rated.length, `${entry.name}: ratedCount must equal valid-rated reviews`);
    assertEquals(rel.count, reviews.length, `${entry.name}: count must equal displayed review list length`);
    if (rated.length === 0) assertEquals(rel.average, 0, `${entry.name}: no ratings → average must be 0`);
    else assert(rel.average >= 1 && rel.average <= 5, `${entry.name}: average ${rel.average} out of 1..5`);
  }
  assert(files > 400, `expected >400 doctor files, got ${files}`);
  assertEquals(doctorsWithRated, 0, "no doctor should carry ratings beyond 0/1..5 (unpublished relay defects)");
});
