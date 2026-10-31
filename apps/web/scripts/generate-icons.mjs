// Generates the placeholder PWA icons (a white "B" on the brand colour) without any
// image library, so no external assets or tools are needed. Run: pnpm --filter @books/web icons
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const BRAND = [0x0f, 0x76, 0x6e];
const WHITE = [0xff, 0xff, 0xff];

// 5x7 bitmap of the letter B.
const GLYPH = ["1111.", "1...1", "1...1", "1111.", "1...1", "1...1", "1111."];

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** `safeZone` shrinks the glyph so maskable icons survive circular cropping. */
function renderPng(size, safeZone) {
  const cell = Math.floor((size * safeZone) / 7);
  const left = Math.floor((size - cell * 5) / 2);
  const top = Math.floor((size - cell * 7) / 2);
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // first byte: filter type 0
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - left) / cell);
      const gy = Math.floor((y - top) / cell);
      const on = x >= left && y >= top && GLYPH[gy]?.[gx] === "1";
      const [r, g, b] = on ? WHITE : BRAND;
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0f766e"/>
  <text x="32" y="46" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#ffffff" text-anchor="middle">B</text>
</svg>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "icon-192.png"), renderPng(192, 0.6));
writeFileSync(join(OUT_DIR, "icon-512.png"), renderPng(512, 0.6));
writeFileSync(join(OUT_DIR, "icon-maskable-512.png"), renderPng(512, 0.45));
writeFileSync(join(OUT_DIR, "apple-touch-icon.png"), renderPng(180, 0.6));
writeFileSync(join(OUT_DIR, "favicon.svg"), SVG);
console.warn(`Icons written to ${OUT_DIR}`);
