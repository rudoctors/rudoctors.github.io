import type { Doctor, RatingSummary, Review } from "./types";

const CRITERIA = ["effectiveness", "communication", "wait", "price", "overall"] as const;

function daysAgo(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 3650;
  return Math.max(0, (Date.now() - t) / 86_400_000);
}

/** Freshness weight: newer reviews count more (half-life ~180 days, floor 0.5). */
function freshness(iso: string): number {
  const d = daysAgo(iso);
  return Math.max(0.5, Math.pow(0.5, d / 180));
}

/** Length/detail bonus: longer reviews are more informative. */
function detail(review: Review): number {
  const len = (review.text || "").trim().length;
  if (len >= 400) return 1.15;
  if (len >= 150) return 1.05;
  if (len >= 40) return 1.0;
  return 0.85;
}

export function reviewScore(review: Review): number {
  if (review.criteria) {
    const vals = CRITERIA.map((c) => review.criteria?.[c]).filter((v): v is number => typeof v === "number");
    if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return Math.min(5, Math.max(1, review.rating || 0));
}

export function computeRating(doctor: Doctor): RatingSummary {
  const reviews = (doctor.reviews || []).filter((r) => r.text || r.rating);
  if (reviews.length === 0) {
    return { average: 0, count: 0, weighted: 0, breakdown: {} };
  }

  let wSum = 0;
  let wTotal = 0;
  let sum = 0;
  const breakdown: Record<string, number> = {};

  for (const r of reviews) {
    const score = reviewScore(r);
    sum += score;
    const w = freshness(r.date) * detail(r);
    wSum += score * w;
    wTotal += w;
    for (const c of CRITERIA) {
      const v = r.criteria?.[c];
      if (typeof v === "number") {
        breakdown[c] = (breakdown[c] || 0) + v;
      }
    }
  }

  const count = reviews.length;
  // Bayesian-ish shrink toward neutral when few reviews
  const prior = 3.5;
  const priorWeight = 2;
  const rawAvg = sum / count;
  const shrunk = (rawAvg * count + prior * priorWeight) / (count + priorWeight);
  const weighted = wTotal > 0 ? wSum / wTotal : shrunk;

  const finalAvg = count >= 2 ? (shrunk * 0.45 + weighted * 0.55) : rawAvg;

  return {
    average: Math.round(finalAvg * 100) / 100,
    count,
    weighted: Math.round(weighted * 100) / 100,
    breakdown,
  };
}

export function ratingBadge(average: number, count: number): string {
  if (count === 0 || average === 0) return "new";
  if (average >= 4.5) return "excellent";
  if (average >= 4.0) return "great";
  if (average >= 3.5) return "good";
  return "fair";
}
