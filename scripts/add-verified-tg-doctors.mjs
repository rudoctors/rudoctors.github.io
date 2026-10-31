import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const doctorsDir = path.join(root, 'src', 'data', 'doctors');

const NEW_DOCTORS = [
  {
    slug: 'daria-golubets',
    name: 'Дарья Голубец',
    nameEn: 'Daria Golubets',
    specializations: ['dentist'],
    specializationText: 'Врач-стоматолог пародонтолог',
    city: 'Belgrade',
    district: 'Novi Beograd',
    experienceYears: 7,
    languages: ['ru', 'sr', 'uk'],
    formats: ['offline'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    bio: 'Врач-стоматолог пародонтолог с 7-летним стажем. Комплексная пародонтологическая диагностика по компьютерной томографии, составление пародонтальной карты PerioChart, профессиональная гигиена по протоколу GBT, закрытый кюретаж (Scaling and root planning), плазмотерапия (PRP), инъекции гиалуроновой кислоты (Revident/Hyadent BG), пародонтологическая подготовка к протезированию и ортодонтии. Приём взрослых и детей от 6 лет под увеличением (бинокуляры).',
    education: [
      { year: 2019, text: 'Украинская Медицинская Стоматологическая Академия (УМСА), г. Полтава — диплом врача-стоматолога' },
      { year: 2022, text: 'Донецкий Национальный Медицинский Университет им. М. Горького — интернатура' }
    ],
    workplaces: [
      {
        clinic: 'Smile ON',
        address: 'West 65 Tower, Omladinskih brigada 86, Novi Beograd',
        city: 'Belgrade',
        district: 'Novi Beograd'
      }
    ],
    contacts: {
      telegram: 'https://t.me/Smileon_belgrade_bot',
      website: 'https://smileon.rs'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/202610',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  },
  {
    slug: 'igor-golubets',
    name: 'Игорь Голубец',
    nameEn: 'Igor Golubets',
    specializations: ['dentist'],
    specializationText: 'Врач стоматолог-терапевт, эндодонтист',
    city: 'Belgrade',
    district: 'Novi Beograd',
    experienceYears: 7,
    languages: ['ru', 'sr', 'uk'],
    formats: ['offline'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    bio: 'Врач стоматолог-терапевт, эндодонтист с 7-летним стажем. Сохранение зубов в сложных клинических случаях, лечение корневых каналов по современным протоколам с обязательной изоляцией коффердамом, эстетические реставрации композитными материалами премиального уровня, подготовка зубов под ортопедические конструкции. Работа под увеличением (бинокуляры), фотопротокол на всех этапах.',
    education: [
      { year: 2019, text: 'Украинская Медицинская Стоматологическая Академия (УМСА), г. Полтава — диплом врача-стоматолога' },
      { year: 2022, text: 'Донецкий Национальный Медицинский Университет им. М. Горького — интернатура' }
    ],
    workplaces: [
      {
        clinic: 'Smile ON',
        address: 'West 65 Tower, Omladinskih brigada 86, Novi Beograd',
        city: 'Belgrade',
        district: 'Novi Beograd'
      }
    ],
    contacts: {
      telegram: 'https://t.me/Smileon_belgrade_bot',
      website: 'https://smileon.rs'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/202675',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  },
  {
    slug: 'mariya-sidorova',
    name: 'Мария Сидорова',
    nameEn: 'Mariya Sidorova',
    specializations: ['dentist'],
    specializationText: 'Врач-ортодонт',
    city: 'Belgrade',
    district: 'Novi Beograd',
    experienceYears: 6,
    languages: ['ru', 'sr'],
    formats: ['offline'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    bio: 'Врач-ортодонт со стажем 6 лет. Исправление прикуса и функциональных нарушений зубочелюстной системы у взрослых и детей. Комплексная диагностика, анализ КЛКТ, 3D-цефалометрия, моделирование элайнеров, комбинированное лечение брекет-системами и прозрачными элайнерами, компьютерное позиционирование брекетов, фотопротокол динамики лечения.',
    education: [
      { year: 2020, text: 'Волгоградский государственный медицинский университет — стоматологический факультет' },
      { year: 2022, text: 'Ставропольский государственный медицинский университет — ординатура по ортодонтии' }
    ],
    workplaces: [
      {
        clinic: 'Smile ON',
        address: 'West 65 Tower, Omladinskih brigada 86, Novi Beograd',
        city: 'Belgrade',
        district: 'Novi Beograd'
      }
    ],
    contacts: {
      telegram: 'https://t.me/Smileon_belgrade_bot',
      website: 'https://smileon.rs'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/208765',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  },
  {
    slug: 'sergey-prokopyev',
    name: 'Сергей Прокопьев',
    nameEn: 'Sergey Prokopyev',
    specializations: ['dental_surgeon', 'dental_implantologist'],
    specializationText: 'Врач стоматолог-хирург, имплантолог',
    city: 'Belgrade',
    district: 'Novi Beograd',
    experienceYears: 8,
    languages: ['ru', 'sr'],
    formats: ['offline'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    bio: 'Врач стоматолог-хирург, имплантолог. Атравматичное удаление зубов любой сложности (включая ретинированные и дистопированные зубы мудрости), дентальная имплантация (одиночные имплантаты и тотальные работы при адентии), костная пластика, синус-лифтинг всех видов, пластика мягких тканей при рецессиях десны. Работа с оптическим увеличением (бинокуляры), немецкий хирургический инструментарий.',
    education: [
      { year: 2016, text: 'Уральский Государственный Медицинский Университет (Екатеринбург) — диплом врача-стоматолога' },
      { year: 2018, text: 'Уральский Государственный Медицинский Университет — ординатура по хирургической стоматологии' }
    ],
    workplaces: [
      {
        clinic: 'Smile ON',
        address: 'West 65 Tower, Omladinskih brigada 86, Novi Beograd',
        city: 'Belgrade',
        district: 'Novi Beograd'
      }
    ],
    contacts: {
      telegram: 'https://t.me/Smileon_belgrade_bot',
      website: 'https://smileon.rs'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/211041',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  },
  {
    slug: 'natalya-hudyakova',
    name: 'Наталья Худякова',
    nameEn: 'Natalya Khudyakova',
    specializations: ['endocrinologist', 'ultrasound_diagnostics'],
    specializationText: 'Эндокринолог, диетолог, врач УЗИ',
    city: 'Belgrade',
    district: 'Savski Venac',
    experienceYears: 18,
    languages: ['ru', 'sr', 'en'],
    formats: ['offline', 'online'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    bio: 'Доктор медицинских наук, эндокринолог, диетолог, врач УЗИ со стажем 18 лет. Действующий профессор Международного колледжа профессионального образования Белграда (ICEPS), экс-доцент СПбГУ. Автор более 100 научных публикаций и руководств по эндокринологии. Персонализированные программы восстановления здоровья при сахарном диабете, метаболическом синдроме, заболеваниях щитовидной железы. УЗИ щитовидной железы на приёме.',
    education: [
      { year: 2006, text: 'Санкт-Петербургский Государственный Университет — медицинский факультет' },
      { year: 2020, text: 'Ученая степень доктора медицинских наук (д.м.н.) по специальности «Эндокринология»' }
    ],
    workplaces: [
      {
        clinic: 'Doctorus Expert',
        address: 'Višegradska 1A, Savski Venac, Belgrade',
        city: 'Belgrade',
        district: 'Savski Venac',
        url: 'https://doctorus.rs'
      }
    ],
    contacts: {
      phone: '+381691019269',
      telegram: 'https://t.me/doctorus_expert',
      website: 'https://doctorus.rs'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/211780',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  },
  {
    slug: 'amir-dzhafarov',
    name: 'Амир Джафаров',
    nameEn: 'Amir Dzhafarov',
    specializations: ['dentist'],
    specializationText: 'Стоматолог общей практики',
    city: 'Belgrade',
    district: 'Dorcol, Stari Grad',
    languages: ['ru', 'sr'],
    formats: ['offline'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    education: [],
    bio: 'Стоматолог общей практики в Белграде. Лечение кариеса и его осложнений, современное эндодонтическое лечение каналов зуба, восстановление разрушенных зубов, высокоэстетические композитные реставрации, первичная диагностика и составление комплексных планов лечения.',
    workplaces: [
      {
        clinic: 'Dental Simina',
        address: 'Simina 9a, Dorćol, Stari Grad, Belgrade',
        city: 'Belgrade',
        district: 'Dorcol, Stari Grad'
      }
    ],
    contacts: {
      phone: '+38162200082',
      telegram: 'https://t.me/dentalsimina9a'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/214882',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  },
  {
    slug: 'mica-petrovacki',
    name: 'Мича Петровачки',
    nameEn: 'Mica Petrovacki',
    specializations: ['radiologist', 'oncologist', 'ultrasound_diagnostics'],
    specializationText: 'Врач-радиолог, онколог, врач УЗИ',
    city: 'Belgrade',
    district: 'Belgrade, Novi Sad',
    experienceYears: 15,
    languages: ['ru', 'sr'],
    formats: ['offline'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    bio: 'Врач-радиолог, онколог с более чем 15-летним опытом работы. Специалист в области лучевой диагностики и онкологии с фокусом на патологию молочной железы. Врач Института лёгочных заболеваний Воеводины (Сремска-Каменица) и клиники MediGroup. Проводит УЗИ молочных желёз, щитовидной железы, органов брюшной полости. Свободно консультирует на русском языке.',
    education: [
      { year: 2008, text: 'Медицинский факультет Университета Нови-Сада, Сербия' },
      { year: 2013, text: 'Специализация по медицинской радиологии' },
      { year: 2019, text: 'Квалификация по интервенционной онкорадиологии, Университет Париж-Юг (Франция)' },
      { year: 2025, text: 'Специализация по онкологии' }
    ],
    workplaces: [
      {
        clinic: 'MediGroup',
        city: 'Belgrade',
        address: 'Belgrade, Serbia'
      }
    ],
    contacts: {
      phone: '0114040100'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/215301',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  },
  {
    slug: 'ariel-pelevin',
    name: 'Ариэль Пелевин',
    nameEn: 'Ariel Pelevin',
    specializations: ['osteopath', 'manual_therapist'],
    specializationText: 'Остеопат, доктор остеопатии (PhD)',
    city: 'Novi Sad',
    district: 'Novi Sad',
    experienceYears: 24,
    languages: ['ru', 'he', 'en', 'sr'],
    formats: ['offline'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    bio: 'Доктор остеопатии с 24-летним стажем. 5 лет клинической практики в государственной больничной кассе «Меухедет» (Израиль). Помощь при хронических болях и ограничениях опорно-двигательного аппарата, невралгиях, проблемах позвоночника, головных болях, коррекция психосоматических дисфункций, остеопатическое ведение детей и подростков от 6 лет.',
    education: [
      { year: 2010, text: 'NUMSS USA — PhD in Osteopathic Clinical Sciences (OCS)' },
      { year: 2008, text: 'NUMSS Spain — BSc in Osteopathy' },
      { year: 2000, text: 'CMT & DipAcu, Израиль' }
    ],
    workplaces: [
      {
        clinic: 'Частный остеопатический кабинет',
        city: 'Novi Sad',
        address: 'Novi Sad, Serbia'
      }
    ],
    contacts: {
      telegram: 'https://t.me/osteolifting'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/184753',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  },
  {
    slug: 'mariya-kopeikina',
    name: 'Мария Копейкина',
    nameEn: 'Mariya Kopeikina',
    specializations: ['dentist'],
    specializationText: 'Врач стоматолог-терапевт',
    city: 'Belgrade',
    district: 'Belgrade',
    experienceYears: 10,
    languages: ['ru', 'uk', 'sr'],
    formats: ['offline'],
    hidden: false,
    featured: false,
    sources: ['telegram'],
    bio: 'Врач стоматолог-терапевт с 10-летним клиническим опытом. Лечение кариеса любой сложности у подростков и взрослых с применением коффердама, эндодонтическое лечение корневых каналов, реставрации композитными материалами высокой эстетики, комплексная ультразвуковая гигиена и Air-Flow.',
    education: [
      { year: 2014, text: 'Киевский Медицинский Университет — стоматологический факультет' }
    ],
    workplaces: [
      {
        clinic: 'Стоматологический кабинет',
        city: 'Belgrade',
        address: 'Belgrade, Serbia'
      }
    ],
    contacts: {
      telegram: 'https://t.me/Marijakopeikina'
    },
    reviews: [],
    source: 'Telegram: https://t.me/vrachivserbii/127187',
    createdAt: '2026-10-31',
    updatedAt: '2026-10-31'
  }
];

let created = 0;
for (const doc of NEW_DOCTORS) {
  const file = path.join(doctorsDir, `${doc.slug}.json`);
  let existingReviews = [];
  if (fs.existsSync(file)) {
    const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    existingReviews = existing.reviews || [];
  }
  doc.reviews = existingReviews;
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`Saved: ${doc.slug}.json (${doc.name})`);
  created++;
}

console.log(`Finished writing ${created} verified doctor profiles.`);
