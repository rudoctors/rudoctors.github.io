const r = await fetch("https://rudoctors.github.io/");
const t = await r.text();
const headings = [...t.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
const h3 = [...t.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((m) => m[1]);
const title = t.match(/<title>([^<]+)/)?.[1];
const desc = t.match(/name="description" content="([^"]+)/)?.[1];
console.log({ title, desc: desc?.slice(0, 120), headings, h3Sample: h3.slice(0, 8) });
console.log("doctor links", (t.match(/href="\/doctors\//g) || []).length);
console.log("has search", t.includes("Имя, специальность") || t.includes("placeholder"));
