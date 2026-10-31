import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const photosDir = path.join(__dirname, '..', 'public', 'photos');

// Clean up any temp file if left over
const leftoverTemp = path.join(photosDir, 'temp-rd-11.webp');
if (fs.existsSync(leftoverTemp)) {
  fs.unlinkSync(leftoverTemp);
}

const ROTATIONS = [
  { file: 'rd-11.webp', angle: 270 },
  { file: 'rd-12.webp', angle: 180 },
  { file: 'rd-28.webp', angle: 90 },
  { file: 'rd-37.webp', angle: 90 },
  { file: 'rd-59.webp', angle: 90 },
];

async function main() {
  for (const { file, angle } of ROTATIONS) {
    const inputPath = path.join(photosDir, file);
    if (!fs.existsSync(inputPath)) {
      console.warn(`File not found: ${inputPath}`);
      continue;
    }
    console.log(`Rotating ${file} by ${angle}°...`);
    const inputBuffer = fs.readFileSync(inputPath);
    const outputBuffer = await sharp(inputBuffer)
      .rotate(angle)
      .webp({ quality: 85 })
      .toBuffer();

    fs.writeFileSync(inputPath, outputBuffer);
    console.log(`Successfully rotated and saved ${file}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
