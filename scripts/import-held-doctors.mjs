import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const doctorsDir = path.join(root, "src", "data", "doctors");
const specialties = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "specialties.json"), "utf8"));
const allowedSpecs = new Set(Object.keys(specialties));

const heldDoctors = [
  {
    slug: "dusko-avramovic",
    name: "Душко Аврамович",
    nameEn: "Duško Avramović",
    specializations: ["gastroenterologist", "ultrasound_diagnostics"],
    specializationText: "Гастроэнтеролог, врач УЗИ (гастроскопия, колоноскопия, УЗИ брюшной полости)",
    city: "Belgrade",
    languages: ["ru", "sr", "en"],
    formats: ["offline"],
    bio: "Врач-гастроэнтеролог в Белграде (клиника Euromedic). Проводит гастроскопию и колоноскопию (в том числе под седацией), а также ультразвуковое исследование органов брюшной полости. Владеет русским языком.",
    education: [],
    workplaces: [
      {
        clinic: "Euromedic",
        address: "Pariske komune 22, Novi Beograd",
        city: "Belgrade",
        url: "https://euromedic.rs/"
      }
    ],
    contacts: {
      website: "https://euromedic.rs/"
    },
    reviews: [
      {
        id: "tg-174942",
        author: "Пациент из сообщества",
        date: "2026-01-16",
        rating: 0,
        text: "В Euromedic гастроскопию и колоноскопию с седацией проводит рекомендуемый врач Душко Аврамович (говорит на русском, делает УЗИ брюшной полости). Процедура проходит под седацией, после чего врач подробно всё объясняет.",
        source: "https://t.me/vrachivserbii/174942"
      }
    ],
    hidden: false,
    featured: false,
    sources: ["t.me/vrachivserbii"],
    updatedAt: "2026-10-31"
  },
  {
    slug: "branko-maksimovic",
    name: "Бранко Максимович",
    nameEn: "Branko Maksimović",
    specializations: ["gastroenterologist"],
    specializationText: "Гастроэнтеролог, эндоскопист (гастроскопия EGDS, тест на Helicobacter pylori)",
    city: "Belgrade",
    languages: ["en", "sr"],
    formats: ["offline"],
    bio: "Врач-гастроэнтеролог в Белграде (Poliklinika VUK Prima). Выполняет эзофагогастродуоденоскопию (EGDS), уреазный экспресс-тест на хеликобактер и биопсию. Консультирует на английском и сербском языках.",
    education: [],
    workplaces: [
      {
        clinic: "Poliklinika VUK Prima",
        address: "Beograd",
        city: "Belgrade"
      }
    ],
    contacts: {},
    reviews: [
      {
        id: "tg-174942-bm",
        author: "Пациент из сообщества",
        date: "2026-01-16",
        rating: 0,
        text: "Доктор Бранко Максимович делает гастроскопию (EGDS) и тест на хеликобактер в Poliklinika VUK Prima. Внимательный специалист, говорит по-английски.",
        source: "https://t.me/vrachivserbii/174942"
      }
    ],
    hidden: false,
    featured: false,
    sources: ["t.me/vrachivserbii"],
    updatedAt: "2026-10-31"
  },
  {
    slug: "slobodan-sreckovic",
    name: "Слободан Сречкович",
    nameEn: "Slobodan Srećković",
    specializations: ["proctologist", "gastroenterologist"],
    specializationText: "Проктолог, гастроэнтеролог, эндоскопист (колоноскопия с анестезией)",
    city: "Belgrade",
    languages: ["en", "sr"],
    formats: ["offline"],
    bio: "Специалист по эндоскопии и проктологии в Белграде (Poliklinika VUK Prima). Проводит колоноскопию под седацией с забором биопсийных проб. Чуткий и внимательный врач, свободно говорит по-английски.",
    education: [],
    workplaces: [
      {
        clinic: "Poliklinika VUK Prima",
        address: "Beograd",
        city: "Belgrade"
      }
    ],
    contacts: {},
    reviews: [
      {
        id: "tg-174942-ss",
        author: "Пациент из сообщества",
        date: "2026-01-16",
        rating: 0,
        text: "Доктор Слободан Сречкович проводит колоноскопию с анестезией в Poliklinika VUK Prima. Он очень чуткий и внимательный, свободно говорит по-английски.",
        source: "https://t.me/vrachivserbii/174942"
      }
    ],
    hidden: false,
    featured: false,
    sources: ["t.me/vrachivserbii"],
    updatedAt: "2026-10-31"
  },
  {
    slug: "olivera-levakov",
    name: "Оливера Леваков",
    nameEn: "Olivera Levakov",
    specializations: ["dermatologist", "cosmetologist"],
    specializationText: "Дерматолог, врач эстетической медицины (дерматоскопия, удаление новообразований кожи)",
    city: "Novi Sad",
    languages: ["sr", "en", "ru"],
    formats: ["offline"],
    bio: "Врач-дерматолог в Нови-Саде. Специализируется на дерматоскопии, удалении доброкачественных новообразований кожи (папиллом, родинок, кератом) и эстетических процедурах.",
    education: [],
    workplaces: [
      {
        clinic: "Novi Sad Poliklinika",
        city: "Novi Sad"
      }
    ],
    contacts: {},
    reviews: [
      {
        id: "tg-178614",
        author: "Пациент из сообщества",
        date: "2026-02-10",
        rating: 0,
        text: "В Нови-Саде удаление родинок и новообразований кожи проводит доктор Оливера Леваков. Внимательный приём и аккуратная работа.",
        source: "https://t.me/vrachivserbii/178614"
      }
    ],
    hidden: false,
    featured: false,
    sources: ["t.me/vrachivserbii"],
    updatedAt: "2026-10-31"
  },
  {
    slug: "rastko-sava-jeremic",
    name: "Растко Сава Еремич",
    nameEn: "Rastko Sava Jeremić",
    specializations: ["traumatologist_orthopedist", "pediatrician"],
    specializationText: "Детский травматолог-ортопед (экстренная помощь, рентген-диагностика травм)",
    city: "Belgrade",
    languages: ["en", "sr"],
    formats: ["offline"],
    bio: "Детский врач травматолог-ортопед в Белграде (Университетская детская клиника Tiršova / Univerzitetska dečja klinika). Оказывает экстренную помощь при переломах, ушибах и спортивных травмах у детей.",
    education: [],
    workplaces: [
      {
        clinic: "Университетская детская клиника Tiršova (Univerzitetska dečja klinika)",
        address: "Tiršova 10, Beograd",
        city: "Belgrade",
        url: "https://udk.bg.ac.rs/"
      }
    ],
    contacts: {
      website: "https://udk.bg.ac.rs/"
    },
    reviews: [
      {
        id: "tg-109971",
        author: "Александра",
        date: "2024-08-20",
        rating: 0,
        text: "Обращались в Университетскую детскую клинику Tiršova с подозрением на перелом у ребёнка. Дежурный врач Растко Сава Еремич осмотрела, направила на рентген и дала рекомендации. Очень доброжелательные специалисты, врач говорит по-английски.",
        source: "https://t.me/vrachivserbii/109971"
      }
    ],
    hidden: false,
    featured: false,
    sources: ["t.me/vrachivserbii"],
    updatedAt: "2026-10-31"
  }
];

let added = 0;
for (const doc of heldDoctors) {
  // Validate specialties
  for (const s of doc.specializations) {
    if (!allowedSpecs.has(s)) {
      console.error(`Invalid specialty key: ${s} for ${doc.name}`);
      process.exit(1);
    }
  }

  const filePath = path.join(doctorsDir, `${doc.slug}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.log(`Added held doctor: ${doc.name} (${doc.slug})`);
    added++;
  } else {
    console.log(`Doctor already exists: ${doc.slug}`);
  }
}

console.log(`Successfully imported ${added} held doctors.`);
