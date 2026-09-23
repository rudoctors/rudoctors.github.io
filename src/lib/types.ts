export interface EducationItem {
  degree: string;
  institution?: string;
  years?: string;
}

export interface Workplace {
  clinic: string;
  address?: string;
  city?: string;
  district?: string;
  url?: string;
  mapsUrl?: string;
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
  hidden: boolean;
  featured: boolean;
  sources: string[];
  updatedAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  weighted: number;
  breakdown: Record<string, number>;
}
