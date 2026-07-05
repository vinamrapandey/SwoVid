// Generates placeholder SwoVid icons (solid navy rounded square) at 16/48/128px.
// Dependency-free PNG encoder. Replace public/icons/*.png with real branded
// artwork before shipping to the Chrome Web Store.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// Brand navy #0F2444
const NAVY = [0x0f, 0x24, 0x44];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size) {
  const radius = Math.round(size * 0.22);
  // Build RGBA raw pixels with a filter byte (0) per scanline.
  const bytesPerRow = size * 4;
  const raw = Buffer.alloc((bytesPerRow + 1) * size);
  const inRounded = (x, y) => {
    // Corner rounding: check distance from nearest corner circle centre.
    const corners = [
      [radius, radius], [size - radius, radius],
      [radius, size - radius], [size - radius, size - radius],
    ];
    if ((x < radius || x >= size - radius) && (y < radius || y >= size - radius)) {
      for (const [cx, cy] of corners) {
        if (Math.abs(x - cx) < radius && Math.abs(y - cy) < radius) {
          return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
        }
      }
      return false;
    }
    return true;
  };
  for (let y = 0; y < size; y++) {
    const rowStart = y * (bytesPerRow + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const p = rowStart + 1 + x * 4;
      const on = inRounded(x, y);
      raw[p] = NAVY[0];
      raw[p + 1] = NAVY[1];
      raw[p + 2] = NAVY[2];
      raw[p + 3] = on ? 255 : 0; // transparent outside rounded square
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  const png = makePng(size);
  const file = join(outDir, `icon${size}.png`);
  writeFileSync(file, png);
  console.log(`[generate-icons] icon${size}.png (${png.length} bytes)`);
}
