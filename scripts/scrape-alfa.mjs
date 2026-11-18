/**
 * Scrapes doctors from AlfaMedStar (Belgrade): https://serbia.alfamedstar.com/ru/doctors
 * Dynamically discovers all doctor profile links on /ru/doctors,
 * extracts experience, Russian & English titles, specialties, and patient reviews.
 * Output: scripts/alfa-doctors.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "scripts", "alfa-doctors.json");

const dec = (s) =>
  String(s || "")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

async function main() {
  console.log("Fetching AlfaMedStar doctor listing...");
  const listRes = await fetch("https://serbia.alfamedstar.com/ru/doctors", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!listRes.ok) throw new Error(`Alfa listing failed: ${listRes.status}`);
  const listHtml = await listRes.text();

  const rawSlugs = [...listHtml.matchAll(/href="\/ru\/doctors\/([^"]+)"/g)].map((m) => m[1]);
  const slugs = Array.from(new Set(rawSlugs));
  console.log(`Discovered ${slugs.length} AlfaMedStar doctors:`, slugs.join(", "));

  const out = [];

  for (const slug of slugs) {
    try {
      const [ruRes, enRes] = await Promise.all([
        fetch(`https://serbia.alfamedstar.com/ru/doctors/${slug}`, { headers: { "User-Agent": "Mozilla/5.0" } }),
        fetch(`https://serbia.alfamedstar.com/en/doctors/${slug}`, { headers: { "User-Agent": "Mozilla/5.0" } }),
      ]);

      const ruHtml = await ruRes.text();
      const enHtml = await enRes.text();

      // Experience: match from RU meta or text, fallback to EN
      let exp = "";
      const expM1 = ruHtml.match(/Опыт\s+(?:более\s*)?(\d+)\s+лет/i) || ruHtml.match(/Стаж\s+(?:более\s*)?(\d+)/i);
      const expM2 = enHtml.match(/over\s*(\d+)\s*years/i) || enHtml.match(/Experience[\s\S]{0,100}?(\d{1,2})\s*year/i);
      exp = expM1?.[1] || expM2?.[1] || "";

      // Titles & Names
      const ruTitle = ruHtml.match(/<title>([^<]+)<\/title>/)?.[1] || "";
      const ruH1 = ruHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || "";
      const ruName = ruH1.split("<span")[0].replace(/<[^>]+>/g, "").trim();

      const specM = ruH1.match(/<span[^>]*>([^<]+)<\/span>/i);
      const ruSpec = specM ? specM[1].replace(/в Белграде.*$/i, "").replace(/,.*$/, "").trim() : "";

      const enTitle = enHtml.match(/<title>([^<]+)<\/title>/)?.[1] || "";
      const enName = enTitle.replace(/^Dr\s+/i, "").split(/\s+-\s+/)[0].trim();
      let enSpec = enTitle.split(/\s+-\s+/)[1] || "";
      enSpec = enSpec.replace(/\s+in Belgrade.*$/i, "").replace(/\s*\|.*$/, "").trim();

      // Reviews extraction from RU page (fallback to EN)
      let reviewBlocks = [...ruHtml.matchAll(/<li[^>]*class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)];
      if (!reviewBlocks.length) {
        reviewBlocks = [...enHtml.matchAll(/<li[^>]*class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)];
      }
      const reviews = [];
      const authors = [];
      const dates = [];

      for (const b of reviewBlocks) {
        const block = b[1];
        const authorM = block.match(/class="[^"]*author[^"]*"[^>]*>([^<]+)<\//i);
        const textM = block.match(/class="[^"]*text[^"]*"[^>]*>([^<]{15,1000})<\//i);
        const dateM = block.match(/class="[^"]*date[^"]*"[^>]*>([^<]+)<\//i) || block.match(/(\d{2}\.\d{2}\.\d{4})/);
        if (textM) {
          reviews.push(dec(textM[1]));
          authors.push(authorM ? dec(authorM[1]) : "Пациент AlfaMedStar");
          dates.push(dateM ? dateM[1].trim() : "");
        }
      }

      out.push({
        slug,
        title: ruTitle,
        titleName: ruName || enName,
        ruName,
        enName,
        exp,
        spec: ruSpec || enSpec,
        reviews,
        authors,
        dates,
        url: `https://serbia.alfamedstar.com/ru/doctors/${slug}`,
      });

      console.log(`- ${ruName || slug}: exp=${exp || "-"} reviews=${reviews.length} (${ruSpec || enSpec})`);
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      console.error(`Error processing ${slug}:`, e.message);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log(`Saved ${out.length} AlfaMedStar doctors to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error("Fatal Alfa scrape error:", e);
  process.exit(1);
});
