export interface EducationItem {
  degree: string;
  institution?: string;
  years?: string;
}

export interface Workplace {
  clinic: string;
  clinicId?: string;
  address?: string;
  city?: string;
  district?: string;
  url?: string;
  mapsUrl?: string;
}

export type VerificationStatus = "unverified" | "verified";

export type ClinicProvenanceKind =
  | "doctor-workplace"
  | "clinic-website"
  | "official-registry"
  | "manual";

export interface ClinicProvenance {
  kind: ClinicProvenanceKind;
  ref: string;
  retrievedAt: string;
  url?: string;
}

export interface ClinicAddress {
  value: string;
  verification: VerificationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  provenance: ClinicProvenance[];
}

export interface ClinicCoordinates {
  value: { lat: number; lng: number } | null;
  verification: VerificationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  provenance: ClinicProvenance[];
}

export interface ClinicLocation {
  id: string;
  address: ClinicAddress;
  coordinates: ClinicCoordinates;
}

export interface Clinic {
  id: string;
  name: string;
  city: string;
  aliases: string[];
  sources: string[];
  locations: ClinicLocation[];
}

export interface ClinicRegistry {
  schemaVersion: number;
  updatedAt: string;
  notes?: string;
  clinics: Clinic[];
}

export interface Review {
  id: string;
  author: string;
  date: string;
  /** 0 or missing = text-only review without star rating */
  rating?: number;
  text: string;
  source?: string;
  lang?: string;
  langSource?: string;
  textOriginal?: string;
  criteria?: Partial<Record<"effectiveness" | "communication" | "wait" | "price" | "overall", number>>;
}

export interface LicenseInfo {
  number?: string;
  country?: string;
  registry?: string;
  url?: string;
}

export interface Doctor {
  slug: string;
  name: string;
  nameEn?: string;
  specializations: string[];
  specializationText?: string;
  photo?: string;
  experienceYears?: number;
  city: string;
  district?: string;
  languages: string[];
  formats: Array<"offline" | "online">;
  bio?: string;
  education: EducationItem[];
  workplaces: Workplace[];
  contacts: {
    phone?: string;
    email?: string;
    telegram?: string;
    website?: string;
    appointmentUrl?: string;
    mapsUrl?: string;
  };
  reviews: Review[];
  license?: LicenseInfo;
  verificationStatus?: "self" | "clinic" | "public-source" | "verified";
  hidden: boolean;
  featured: boolean;
  sources: string[];
  updatedAt: string;
}

export interface RatingSummary {
  average: number;
  /** Все релевантные отзывы (текстовые + с оценкой) — для заголовка раздела. */
  count: number;
  /** Только отзывы с валидной оценкой 1..5 — вошли в average; столько же в AggregateRating.reviewCount. */
  ratedCount: number;
  weighted: number;
  breakdown: Record<string, number>;
}
