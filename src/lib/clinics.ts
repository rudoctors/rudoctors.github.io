import fs from "node:fs";
import path from "node:path";
import type { ClinicCategory, ClinicRegistry, Doctor } from "./types";
import { publicDoctors } from "./doctors";
import { computeRating } from "./rating";
import { cityLabel } from "./site";

const REGISTRY_PATH = path.join(process.cwd(), "src", "data", "clinics", "registry.json");

export interface MapDoctorPreview {
  slug: string;
  name: string;
  specializationText?: string;
  photo?: string;
  experienceYears?: number;
  ratingAverage: number;
  ratingCount: number;
}

export interface MapClinicPoint {
  id: string;
  clinicId: string;
  name: string;
  category: ClinicCategory;
  categoryLabel: string;
  categoryColor: "blue" | "green" | "orange" | "purple" | "red" | "cyan" | "amber";
  city: string;
  cityRu: string;
  district?: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  is24h: boolean;
  isPediatricEmergency?: boolean;
  doctorsCount: number;
  doctors: MapDoctorPreview[];
}

export const CLINIC_CATEGORY_META: Record<
  ClinicCategory,
  {
    label: string;
    pluralLabel: string;
    color: "blue" | "green" | "orange" | "purple" | "red" | "cyan" | "amber";
    hex: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    iconSvg: string;
  }
> = {
  "medical-center": {
    label: "Медицинский центр",
    pluralLabel: "Медцентры",
    color: "blue",
    hex: "#2563eb",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
    iconSvg: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h1M9 13h1M9 17h1"/></svg>`,
  },
  "dom-zdravlja": {
    label: "Дом здравља (Поликлиника)",
    pluralLabel: "Дом здравља",
    color: "cyan",
    hex: "#0891b2",
    bgClass: "bg-cyan-50",
    textClass: "text-cyan-800",
    borderClass: "border-cyan-200",
    iconSvg: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M4 21V9l8-6 8 6v12h-6v-7h-4v7H4z"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1"/></svg>`,
  },
  dental: {
    label: "Стоматология",
    pluralLabel: "Стоматологии",
    color: "green",
    hex: "#16a34a",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    iconSvg: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C7.5 2 4 4.5 4 8c0 2.5 1 4.5 2 7l1 5c.5 1.5 2 2 3.5 1 1-.5 1-2 1.5-3 .5 1 .5 2.5 1.5 3 1.5 1 3 .5 3.5-1l1-5c1-2.5 2-4.5 2-7 0-3.5-3.5-6-8-6z"/></svg>`,
  },
  laboratory: {
    label: "Лаборатория",
    pluralLabel: "Лаборатории 24/7",
    color: "orange",
    hex: "#ea580c",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
    iconSvg: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31L4.62 18.2A2 2 0 0 0 6.32 21h11.36a2 2 0 0 0 1.7-2.8L14 9.31V2M8 2h8M6.5 15h11"/></svg>`,
  },
  ordination: {
    label: "Ординация / Кабинет",
    pluralLabel: "Ординации",
    color: "purple",
    hex: "#9333ea",
    bgClass: "bg-purple-50",
    textClass: "text-purple-700",
    borderClass: "border-purple-200",
    iconSvg: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4M20 10v4"/></svg>`,
  },
  hospital: {
    label: "Стационар 24/7",
    pluralLabel: "Стационары 24/7",
    color: "red",
    hex: "#dc2626",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
    borderClass: "border-rose-200",
    iconSvg: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`,
  },
  pharmacy: {
    label: "Дежурная аптека 24/7",
    pluralLabel: "Дежурные аптеки 24/7",
    color: "amber",
    hex: "#ca8a04",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    borderClass: "border-amber-200",
    iconSvg: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  },
};

function normalize(value?: string | null): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

let cachedRegistry: ClinicRegistry | null = null;

export function loadClinicRegistry(): ClinicRegistry {
  if (cachedRegistry) return cachedRegistry;
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error(`Registry file not found at ${REGISTRY_PATH}`);
  }
  const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
  cachedRegistry = JSON.parse(raw) as ClinicRegistry;
  return cachedRegistry;
}

export function getMapClinicPoints(): MapClinicPoint[] {
  const registry = loadClinicRegistry();
  const doctors = publicDoctors();

  const points: MapClinicPoint[] = [];
  const seenGeoKeys = new Set<string>();

  for (const clinic of registry.clinics) {
    const names = [normalize(clinic.name), ...(clinic.aliases || []).map(normalize)].filter(Boolean);

    // Match doctors to clinic
    const clinicDoctors = doctors.filter((doc) => {
      const worksHere = (doc.workplaces || []).some((wp) => {
        if (wp.clinicId && wp.clinicId === clinic.id) return true;
        const wpNorm = normalize(wp.clinic);
        return wpNorm && names.includes(wpNorm);
      });
      return worksHere;
    });

    // Prepare preview doctor objects
    const doctorPreviews: MapDoctorPreview[] = clinicDoctors.map((doc) => {
      const rating = computeRating(doc);
      return {
        slug: doc.slug,
        name: doc.name,
        specializationText: doc.specializationText || doc.specializations.join(", "),
        photo: doc.photo,
        experienceYears: doc.experienceYears,
        ratingAverage: rating.average,
        ratingCount: rating.count,
      };
    });

    const category: ClinicCategory = clinic.category || "medical-center";
    const categoryMeta = CLINIC_CATEGORY_META[category] || CLINIC_CATEGORY_META["medical-center"];

    for (const location of clinic.locations) {
      const coords = location.coordinates?.value;
      if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
        continue;
      }

      const addressValue = location.address?.value || "";
      if (!addressValue.trim()) continue;

      // Deduplicate coordinates for same clinic (avoid exact overlaps)
      const geoKey = `${clinic.id}|${coords.lat.toFixed(4)}|${coords.lng.toFixed(4)}`;
      if (seenGeoKeys.has(geoKey)) continue;
      seenGeoKeys.add(geoKey);

      const district = location.district || clinic.district;

      points.push({
        id: location.id,
        clinicId: clinic.id,
        name: clinic.name,
        category,
        categoryLabel: categoryMeta.label,
        categoryColor: categoryMeta.color,
        city: clinic.city,
        cityRu: cityLabel(clinic.city),
        district,
        address: addressValue,
        lat: coords.lat,
        lng: coords.lng,
        phone: clinic.phone,
        website: clinic.website,
        is24h: Boolean(clinic.is24h),
        isPediatricEmergency: Boolean(
          (clinic as any).isPediatricEmergency ||
            clinic.id === "tirsova-belgrade" ||
            clinic.id === "institut-majka-dete-belgrade"
        ),
        doctorsCount: doctorPreviews.length,
        doctors: doctorPreviews,
      });
    }
  }

  // Sort: Emergency hospitals & 24h first, then by doctors count descending, then by name
  return points.sort((a, b) => {
    if (a.is24h !== b.is24h) return a.is24h ? -1 : 1;
    if (b.doctorsCount !== a.doctorsCount) return b.doctorsCount - a.doctorsCount;
    return a.name.localeCompare(b.name, "ru");
  });
}

export function getBelgradeDistricts(): string[] {
  return [
    "Врачар",
    "Нови Београд",
    "Стари Град (Дорћол)",
    "Савски Венац",
    "Палилула",
    "Вождовац",
    "Звездара",
    "Земун",
    "Чукарица",
    "Раковица",
    "Дедиње",
    "Савски Венац (Славија)",
    "Савски Венац (Бањица)",
  ];
}

export interface DoctorMapLocation {
  clinicId: string;
  locationId: string;
  clinicName: string;
  category: ClinicCategory;
  categoryColor: "blue" | "green" | "orange" | "purple" | "red" | "cyan" | "amber";
  categoryLabel: string;
  categoryHex: string;
  address: string;
  city: string;
  cityRu: string;
  district?: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  is24h?: boolean;
}

export function getDoctorClinicLocations(doctor: Doctor): DoctorMapLocation[] {
  const registry = loadClinicRegistry();
  const results: DoctorMapLocation[] = [];
  const seenGeoKeys = new Set<string>();

  const workplaces = doctor.workplaces || [];
  for (const wp of workplaces) {
    const wpNorm = normalize(wp.clinic);
    if (!wpNorm && !wp.clinicId) continue;

    // Find clinic in registry
    const matchedClinic = registry.clinics.find((c) => {
      if (wp.clinicId && wp.clinicId === c.id) return true;
      const cNames = [normalize(c.name), ...(c.aliases || []).map(normalize)].filter(Boolean);
      if (wpNorm && cNames.includes(wpNorm)) return true;
      if (wpNorm && wpNorm.length > 5 && cNames.some((cn) => cn.includes(wpNorm) || wpNorm.includes(cn))) return true;
      return false;
    });

    if (!matchedClinic) continue;

    const category: ClinicCategory = matchedClinic.category || "medical-center";
    const meta = CLINIC_CATEGORY_META[category] || CLINIC_CATEGORY_META["medical-center"];

    // Find best location within matched clinic
    let targetLocation = matchedClinic.locations.find((loc) => {
      const coords = loc.coordinates?.value;
      if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") return false;
      if (wp.address && loc.address?.value && normalize(loc.address.value).includes(normalize(wp.address))) return true;
      if (wp.district && loc.district && normalize(loc.district) === normalize(wp.district)) return true;
      return false;
    });

    // Fallback to first valid location of this clinic
    if (!targetLocation) {
      targetLocation = matchedClinic.locations.find((loc) => {
        const coords = loc.coordinates?.value;
        return coords && typeof coords.lat === "number" && typeof coords.lng === "number";
      });
    }

    if (!targetLocation || !targetLocation.coordinates?.value) continue;

    const coords = targetLocation.coordinates.value;
    const geoKey = `${coords.lat.toFixed(4)}|${coords.lng.toFixed(4)}`;
    if (seenGeoKeys.has(geoKey)) continue;
    seenGeoKeys.add(geoKey);

    const address = targetLocation.address?.value || wp.address || "";
    const district = targetLocation.district || matchedClinic.district || wp.district;

    results.push({
      clinicId: matchedClinic.id,
      locationId: targetLocation.id,
      clinicName: matchedClinic.name,
      category,
      categoryColor: meta.color,
      categoryLabel: meta.label,
      categoryHex: meta.hex,
      address,
      city: matchedClinic.city || wp.city || doctor.city,
      cityRu: cityLabel(matchedClinic.city || wp.city || doctor.city),
      district,
      lat: coords.lat,
      lng: coords.lng,
      phone: matchedClinic.phone,
      website: matchedClinic.website || wp.url,
      is24h: Boolean(matchedClinic.is24h),
    });
  }

  return results;
}

export function getDoctorClinicLocation(doctor: Doctor): DoctorMapLocation | null {
  const locs = getDoctorClinicLocations(doctor);
  return locs.length > 0 ? locs[0] : null;
}
