import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = path.join(process.cwd(), "public", "photos");
const files = fs.readdirSync(SRC).filter((f) => /\.jpe?g$/i.test(f));
let converted = 0;
let saved = 0;

for (const f of files) {
  const inPath = path.join(SRC, f);
  const outName = f.replace(/\.jpe?g$/i, ".webp");
  const outPath = path.join(SRC, outName);
  const inSize = fs.statSync(inPath).size;
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) continue;
  await sharp(inPath).resize({ width: 512, height: 512, fit: "cover", position: "attention" }).webp({ quality: 82 }).toFile(outPath);
  const outSize = fs.statSync(outPath).size;
  converted += 1;
  saved += inSize - outSize;
}

// rewrite doctor photo paths .jpg -> .webp when webp exists
const dir = path.join(process.cwd(), "src", "data", "doctors");
let updated = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const p = path.join(dir, f);
  const doc = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!doc.photo || !/\.jpe?g$/i.test(doc.photo)) continue;
  const webp = doc.photo.replace(/\.jpe?g$/i, ".webp");
  const abs = path.join(process.cwd(), "public", webp.replace(/^\//, ""));
  if (fs.existsSync(abs)) {
    doc.photo = webp;
    fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n");
    updated += 1;
  }
}

console.log(
  JSON.stringify(
    { converted, updated, savedKB: Math.round(saved / 1024), remainingJpg: files.length - converted },
    null,
    2,
  ),
);
