const slugs = [
  "aleksandra-yudina","yuliya-ostanina","inga-sakeyan","nadezhda-bakuleva",
  "kristina-tokmakova","igor-shtuchniy","polina-sokolova","kirill-kozyrev",
  "yulia-avakyants","pavel-borisov","timur-mukaev","elizaveta-gracheva",
  "diana-gorbunova","vera-golysheva",
];

const out = [];
for (const slug of slugs) {
  try {
    const res = await fetch(`https://serbia.alfamedstar.com/en/doctors/${slug}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await res.text();
    const title = html.match(/<title>([^<]+)/)?.[1] || "";
    // Prefer "over N years" near Experience
    let exp = "";
    const m1 = html.match(/Experience:?\s*<\/[^>]+>\s*<[^>]+>\s*over\s*(\d+)\s*years/i);
    const m2 = html.match(/over\s*(\d+)\s*years/i);
    const m3 = html.match(/Experience[\s\S]{0,200}?(\d{1,2})\s*year/i);
    exp = m1?.[1] || m2?.[1] || m3?.[1] || "";

    const dec = (s) =>
      s
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ");

    const reviews = [...html.matchAll(/reviewText[^>]*>([^<]{15,600})</g)].map((m) => dec(m[1].trim()));
    const authors = [...html.matchAll(/reviewAuthor[^>]*>([^<]+)</g)].map((m) => dec(m[1].trim()));
    const dates = [...html.matchAll(/reviewDate[^>]*>([^<]+)</g)].map((m) => m[1].trim());

    const titleName = title
      .replace(/^Dr\s+/i, "")
      .split(/\s+-\s+/)[0]
      .trim();
    let spec = title.split(/\s+-\s+/)[1] || "";
    spec = spec.replace(/\s+in Belgrade.*$/i, "").replace(/\s*\|.*$/, "").trim();

    out.push({ slug, title, titleName, exp, spec, reviews, authors, dates });
    console.log(`${slug}: exp=${exp} reviews=${reviews.length} name=${titleName}`);
    await new Promise((r) => setTimeout(r, 300));
  } catch (e) {
    console.error("fail", slug, e.message);
  }
}

const fs = await import("node:fs");
fs.writeFileSync("scripts/alfa-doctors.json", JSON.stringify(out, null, 2), "utf8");
console.log("written", out.length);
