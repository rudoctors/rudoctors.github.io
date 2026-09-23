import fs from "node:fs";
import path from "node:path";
import type { Doctor } from "./types";
import { computeRating } from "./rating";
import specialties from "../data/specialties.json";

const DATA_DIR = path.join(process.cwd(), "src", "data", "doctors");

let cache: Doctor[] | null = null;

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
      const doc = JSON.parse(raw) as Doctor;
      if (doc && doc.slug && doc.name) doctors.push(doc);
    } catch (e) {
      console.error(`Bad doctor file ${f}:`, e);
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
