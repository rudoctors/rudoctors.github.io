import type { APIRoute } from "astro";
import { publicDoctors, specLabel } from "../../lib/doctors";
import { computeRating } from "../../lib/rating";

const PAGE_SIZE = 24;

function decodeHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(str: string, max: number): string {
  if (str.length <= max) return str;
  const cut = str.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const head = sp > Math.floor(max * 0.6) ? cut.slice(0, sp) : cut;
  return `${head.trimEnd()}…`;
}

export const GET: APIRoute = async () => {
  const ranked = publicDoctors()
    .map((doctor) => ({ doctor, rating: computeRating(doctor) }))
    .sort((a, b) => {
      if (a.doctor.featured !== b.doctor.featured) return a.doctor.featured ? -1 : 1;
      if (b.rating.average !== a.rating.average) return b.rating.average - a.rating.average;
      return (b.doctor.reviews?.length || 0) - (a.doctor.reviews?.length || 0);
    });

  const specLabels: Record<string, string> = {};
  for (const { doctor } of ranked) {
    for (const key of doctor.specializations) {
      if (!(key in specLabels)) specLabels[key] = specLabel(key);
    }
  }

  const records = ranked.map(({ doctor, rating }) => {
    const rec: Record<string, unknown> = {
      s: doctor.slug,
      n: doctor.name,
      c: doctor.city,
      sp: doctor.specializations,
      f: doctor.formats,
      l: doctor.languages,
      rv: doctor.reviews?.length || 0,
      cn: rating.count,
      ra: rating.average,
    };
    if (doctor.origin) rec.og = doctor.origin;
    if (doctor.nameRu) rec.nr = doctor.nameRu;
    if (doctor.experienceYears) rec.e = doctor.experienceYears;
    if (doctor.nameEn) rec.ne = doctor.nameEn;
    if (doctor.district) rec.d = doctor.district;
    if (doctor.specializationText) rec.st = doctor.specializationText;
    if (doctor.photo) rec.p = doctor.photo;
    if (doctor.featured) rec.ft = true;
    if (doctor.license?.verified && doctor.license.number) rec.lk = doctor.license.number;
    const bio = doctor.bio ? truncateText(decodeHtml(doctor.bio), 160) : "";
    if (bio) rec.b = bio;
    return rec;
  });

  return new Response(
    JSON.stringify({
      records,
      labels: specLabels,
      pageSize: PAGE_SIZE,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    }
  );
};
