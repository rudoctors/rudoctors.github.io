import fs from "node:fs";
import path from "node:path";
import type { Doctor, Review } from "./types";
import { computeRating } from "./rating";
import specialties from "../data/specialties.json";

const DATA_DIR = path.join(process.cwd(), "src", "data", "doctors");

let cache: Doctor[] | null = null;

function assertStr(v: unknown, field: string, file: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(`Bad doctor file ${file}: field "${field}" must be non-empty string`);
  }
  return v;
}

function assertStrArray(v: unknown, field: string, file: string, allowEmpty = true): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    throw new Error(`Bad doctor file ${file}: field "${field}" must be string[]`);
  }
  if (!allowEmpty && v.length === 0) {
    throw new Error(`Bad doctor file ${file}: field "${field}" must not be empty`);
  }
  return v as string[];
}

function validateReview(r: unknown, file: string, i: number): Review {
  if (!r || typeof r !== "object") {
    throw new Error(`Bad doctor file ${file}: reviews[${i}] must be object`);
  }
  const rev = r as Record<string, unknown>;
  assertStr(rev.text, `reviews[${i}].text`, file);
  if (rev.rating !== undefined && rev.rating !== null) {
    const n = Number(rev.rating);
    if (!Number.isFinite(n) || n < 0 || n > 5) {
      throw new Error(`Bad doctor file ${file}: reviews[${i}].rating must be 0–5`);
    }
  }
  if (rev.date !== undefined && rev.date !== null && rev.date !== "") {
    assertStr(rev.date, `reviews[${i}].date`, file);
  }
  return rev as unknown as Review;
}

function validateDoctor(doc: unknown, file: string): Doctor {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error(`Bad doctor file ${file}: root must be object`);
  }
  const d = doc as Record<string, unknown>;
  assertStr(d.slug, "slug", file);
  assertStr(d.name, "name", file);
  assertStr(d.city, "city", file);
  assertStr(d.updatedAt, "updatedAt", file);
  assertStrArray(d.specializations, "specializations", file, false);
  assertStrArray(d.languages, "languages", file);
  assertStrArray(d.formats, "formats", file, false);
  if (typeof d.hidden !== "boolean") {
    throw new Error(`Bad doctor file ${file}: field "hidden" must be boolean`);
  }
  if (typeof d.featured !== "boolean") {
    throw new Error(`Bad doctor file ${file}: field "featured" must be boolean`);
  }
  if (!d.contacts || typeof d.contacts !== "object" || Array.isArray(d.contacts)) {
    throw new Error(`Bad doctor file ${file}: field "contacts" must be object`);
  }
  for (const key of ["reviews", "education", "workplaces", "sources"] as const) {
    if (!Array.isArray(d[key])) {
      throw new Error(`Bad doctor file ${file}: field "${key}" must be array`);
    }
  }
  (d.reviews as unknown[]).forEach((r, i) => validateReview(r, file, i));
  const allowedFmt = new Set(["offline", "online"]);
  for (const f of d.formats as string[]) {
    if (!allowedFmt.has(f)) {
      throw new Error(`Bad doctor file ${file}: invalid format "${f}"`);
    }
  }
  return d as unknown as Doctor;
}

export function loadDoctors(): Doctor[] {
  if (cache) return cache;
  if (!fs.existsSync(DATA_DIR)) {
    cache = [];
    return cache;
  }
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const doctors: Doctor[] = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, f), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      doctors.push(validateDoctor(parsed, f));
    } catch (e) {
      throw new Error(
        e instanceof Error && e.message.startsWith("Bad doctor file")
          ? e.message
          : `Bad doctor file ${f}: ${e instanceof Error ? e.message : e}`
      );
    }
  }
  doctors.sort((a, b) => {
    const ra = computeRating(a);
    const rb = computeRating(b);
    if (rb.count !== ra.count) return rb.count - ra.count;
    return rb.average - ra.average;
  });
  cache = doctors;
  return doctors;
}

export function publicDoctors(): Doctor[] {
  return loadDoctors().filter((d) => !d.hidden);
}

export function getDoctor(slug: string): Doctor | undefined {
  return loadDoctors().find((d) => d.slug === slug);
}

export function specLabel(key: string): string {
  const map = specialties as Record<string, string>;
  return map[key] || key;
}

export function allSpecializationKeys(): string[] {
  const keys = new Set<string>();
  for (const d of publicDoctors()) {
    for (const s of d.specializations) {
      if (s && s.trim()) keys.add(s.trim());
    }
  }
  return [...keys].sort((a, b) => specLabel(a).localeCompare(specLabel(b), "ru"));
}

export function allCities(): string[] {
  const keys = new Set<string>();
  for (const d of publicDoctors()) {
    if (d.city) keys.add(d.city);
  }
  return [...keys].sort((a, b) => a.localeCompare(b, "ru"));
}

export function siteStats() {
  const docs = publicDoctors();
  const specs = allSpecializationKeys();
  const cities = allCities();
  const reviews = docs.reduce((n, d) => n + (d.reviews?.length || 0), 0);
  return {
    doctors: docs.length,
    specializations: specs.length,
    cities: cities.length,
    reviews,
  };
}
