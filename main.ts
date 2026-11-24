// The World in One Picture — Tuesday 24 November 2026
// A program that draws one newspaper front page summing up the world's news
// of Tuesday 24 November 2026 and writes it to /output/entry.png.
// Pure Node stdlib: a hand-written 5x7 bitmap font (glyphs stored as 7
// five-bit row values), a tiny raster canvas, a hand-rolled PNG encoder
// (zlib) and a small baseline-JPEG decoder for the optional hero photo.
// No network, no randomness, no clock: two runs write byte-identical output.
//
// Hero: World Chess Championship Game 1 — Gukesh v Sindarov, Geneva.
// hero.jpg is the v4 candid press photograph (grand hall, two players
// at the board, a photographer visible in the background), swapped in
// 24 Nov 2026 for a more realistic hero than the v3 photo — the user
// asked for the most realistic image possible, using the rank 1-10
// references. If hero.jpg sits next to this file, it is drawn in the
// hero panel; otherwise a procedural chess scene is drawn. See
// METHOD.md for the 48 verified stories, the layout comparison and the
// date rule.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [247, 243, 233, 255];
const INK = [16, 16, 16, 255];
const CRIMSON = [178, 24, 24, 255];
const NAVY = [28, 56, 92, 255];
const SKY = [216, 232, 244, 255];
const LAKE = [122, 176, 208, 255];
const MOUNTAIN = [94, 108, 128, 255];
const MOUNTAIN2 = [70, 84, 104, 255];
const SNOW = [255, 255, 255, 255];
const SUN = [255, 210, 92, 255];
const GREY = [96, 96, 96, 255];
const LIGHTGREY = [208, 202, 188, 255];
const WHITE = [255, 255, 255, 255];
const BOARD_LIGHT = [240, 217, 181, 255];
const BOARD_DARK = [181, 136, 99, 255];
const SAFFRON = [255, 153, 51, 255];
const INDIA_GREEN = [19, 136, 8, 255];
const UZB_BLUE = [30, 144, 210, 255];
const UZB_GREEN = [30, 166, 90, 255];

// ------------------------------------------------------------------ canvas
const buf = Buffer.alloc(W * H * 4);

function px(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = c[3];
}
function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) px(i, j, c);
}
function hline(x: number, y: number, w: number, c: number[], t = 1): void {
  rect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, c: number[], t = 1): void {
  rect(x, y, t, h, c);
}
function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) px(cx + x, cy + y, c);
}
function circleOutline(cx: number, cy: number, r: number, c: number[]): void {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}
function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  const minX = Math.max(0, Math.min(x0, x1, x2));
  const maxX = Math.min(W - 1, Math.max(x0, x1, x2));
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) px(x, y, c);
    }
  }
}

// ------------------------------------------------------- 5x7 bitmap font
// Each glyph is 7 rows; each row is a 5-bit number, bit 4 = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  a: [0, 0, 14, 1, 15, 17, 15],
  b: [16, 16, 22, 25, 17, 17, 30],
  c: [0, 0, 14, 16, 16, 17, 14],
  d: [1, 1, 13, 19, 17, 17, 15],
  e: [0, 0, 14, 17, 31, 16, 14],
  f: [6, 9, 8, 30, 8, 8, 8],
  g: [0, 15, 17, 17, 15, 1, 14],
  h: [16, 16, 22, 25, 17, 17, 17],
  i: [4, 0, 12, 4, 4, 4, 14],
  j: [2, 0, 6, 2, 2, 18, 12],
  k: [16, 16, 18, 20, 24, 20, 18],
  l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 21, 21],
  n: [0, 0, 22, 25, 17, 17, 17],
  o: [0, 0, 14, 17, 17, 17, 14],
  p: [0, 0, 22, 25, 17, 30, 16],
  q: [0, 0, 13, 19, 17, 15, 1],
  r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30],
  t: [8, 8, 28, 8, 8, 8, 6],
  u: [0, 0, 17, 17, 17, 19, 13],
  v: [0, 0, 17, 17, 17, 10, 4],
  w: [0, 0, 17, 21, 21, 21, 10],
  x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 15, 1, 14],
  z: [0, 0, 31, 2, 4, 8, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],
  "-": [0, 0, 0, 14, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "/": [1, 2, 2, 4, 8, 8, 16],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 6, 4, 0, 4],
  "%": [25, 26, 2, 4, 8, 22, 19],
  "+": [0, 4, 4, 14, 4, 4, 0],
  "=": [0, 0, 31, 0, 31, 0, 0],
  '"': [10, 10, 10, 0, 0, 0, 0],
  "*": [0, 21, 14, 21, 0, 0, 0],
  "\u2022": [0, 0, 14, 14, 14, 0, 0],
  "$": [4, 15, 20, 14, 5, 30, 4],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawChar(x: number, y: number, ch: string, scale: number, c: number[]): void {
  const g = FONT[ch] || FONT["?"];
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row & (16 >> col)) rect(x + col * scale, y + r * scale, scale, scale, c);
    }
  }
}
function drawText(x: number, y: number, s: string, scale: number, c: number[]): number {
  let cx = x;
  for (const ch of s) {
    drawChar(cx, y, ch, scale, c);
    cx += 6 * scale;
  }
  return cx;
}
function drawTextCentered(cx: number, y: number, s: string, scale: number, c: number[]): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}
// Word-wrap into lines no wider than maxW px.
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur === "" ? w : cur + " " + w;
    if (textWidth(test, scale) <= maxW || cur === "") cur = test;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawPara(x: number, y: number, s: string, maxW: number, scale: number, c: number[], lineGap?: number): number {
  const lines = wrap(s, maxW, scale);
  const lh = 7 * scale + (lineGap === undefined ? 2 * scale : lineGap);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * lh, lines[i], scale, c);
  return y + lines.length * lh;
}

// ------------------------------------------------------------ PNG encoder
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: none
    buf.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------- hero photo (optional)
// If hero.jpg sits next to main.ts, draw it in the hero panel; otherwise
// fall back to the procedural chess scene. The decoder below is a small
// baseline-JPEG reader (8-bit, 1 or 3 components, 4:4:4 / 4:2:2 / 4:2:0).
// Anything it cannot decode (progressive, arithmetic, CMYK) falls back.
// hero.jpg is currently the v4 candid press photograph (1920x1280,
// baseline JPEG, quality 90, swapped in 24 Nov 2026): a grand hall, two
// players at the board, a photographer visible in the background. The
// panel crops the photo's centre band (bias 0.35 toward the top) so the
// players' faces fill the frame. The art is 136px tall (was 152) to make
// room for the leads strip below the hero headline without crowding the
// region grid; the overlay chips were moved up to match.
interface DecodedImage { w: number; h: number; rgb: Buffer; }

function decodeJPEG(data: Buffer): DecodedImage | null {
  try {
    return decodeJPEGInner(data);
  } catch {
    return null;
  }
}

// Zig-zag order: stream position k holds coefficient ZZ[k] in row-major.
const ZZ = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5,
  12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51,
  58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];
const COS: number[][] = [];
const CU: number[] = [];
for (let u = 0; u < 8; u++) {
  COS[u] = [];
  for (let x = 0; x < 8; x++) COS[u][x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
  CU[u] = u === 0 ? 1 / Math.SQRT2 : 1;
}

interface HuffTable { counts: number[]; symbols: number[]; firstCode: number[]; firstSym: number[]; }
function buildHuff(counts: number[], symbols: number[]): HuffTable {
  const firstCode = new Array(17).fill(0);
  const firstSym = new Array(17).fill(0);
  let code = 0;
  let sym = 0;
  for (let len = 1; len <= 16; len++) {
    firstCode[len] = code;
    firstSym[len] = sym;
    code = (code + counts[len - 1]) << 1;
    sym += counts[len - 1];
  }
  return { counts, symbols, firstCode, firstSym };
}

interface JpegComp { id: number; h: number; v: number; q: number; }

function decodeJPEGInner(data: Buffer): DecodedImage | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  const quant: number[][] = [];
  const huffDC: (HuffTable | null)[] = [null, null, null, null];
  const huffAC: (HuffTable | null)[] = [null, null, null, null];
  let width = 0;
  let height = 0;
  let comps: JpegComp[] = [];
  let restartInterval = 0;
  let scanStart = -1;
  let scanComps: { comp: JpegComp; dc: number; ac: number }[] = [];

  let pos = 2;
  while (pos + 1 < data.length) {
    if (data[pos] !== 0xff) return null;
    let marker = data[pos + 1];
    // Skip fill bytes (0xff repeats).
    while (marker === 0xff) { pos++; marker = data[pos + 1]; }
    if (marker === 0xd9) break; // EOI
    if (marker === 0xda) {
      // Start of scan: parse the header, then the entropy data follows.
      const ns = data[pos + 4];
      scanComps = [];
      for (let i = 0; i < ns; i++) {
        const id = data[pos + 5 + i * 2];
        const tab = data[pos + 6 + i * 2];
        const comp = comps.find((c) => c.id === id);
        if (!comp) return null;
        scanComps.push({ comp, dc: tab >> 4, ac: tab & 15 });
      }
      scanStart = pos + 5 + ns * 2 + 3;
      break;
    }
    const len = data.readUInt16BE(pos + 2);
    const seg = pos + 4;
    if (marker === 0xdb) {
      // Quantisation tables.
      let p = seg;
      const end = seg + len - 2;
      while (p < end) {
        const pq = data[p] >> 4;
        const tq = data[p] & 15;
        if (pq !== 0) return null; // 16-bit tables not supported
        const table = new Array(64);
        for (let i = 0; i < 64; i++) table[ZZ[i]] = data[p + 1 + i];
        quant[tq] = table;
        p += 65;
      }
    } else if (marker === 0xc0) {
      // Baseline frame header.
      height = data.readUInt16BE(seg + 1);
      width = data.readUInt16BE(seg + 3);
      const n = data[seg + 5];
      if (n !== 1 && n !== 3) return null;
      comps = [];
      for (let i = 0; i < n; i++) {
        const id = data[seg + 6 + i * 3];
        const samp = data[seg + 7 + i * 3];
        const q = data[seg + 8 + i * 3];
        const h = samp >> 4;
        const v = samp & 15;
        if (h < 1 || h > 2 || v < 1 || v > 2) return null;
        comps.push({ id, h, v, q });
      }
    } else if (marker === 0xc2) {
      return null; // progressive: not supported, fall back
    } else if (marker === 0xc4) {
      // Huffman tables.
      let p = seg;
      const end = seg + len - 2;
      while (p < end) {
        const tc = data[p] >> 4;
        const th = data[p] & 15;
        const counts: number[] = [];
        let total = 0;
        for (let i = 0; i < 16; i++) { counts.push(data[p + 1 + i]); total += data[p + 1 + i]; }
        const symbols: number[] = [];
        for (let i = 0; i < total; i++) symbols.push(data[p + 17 + i]);
        const table = buildHuff(counts, symbols);
        if (tc === 0) huffDC[th] = table;
        else huffAC[th] = table;
        p += 17 + total;
      }
    } else if (marker === 0xdd) {
      restartInterval = data.readUInt16BE(seg);
    }
    pos += 2 + len;
  }
  if (scanStart < 0 || width === 0 || height === 0 || comps.length === 0) return null;

  const hMax = Math.max(...comps.map((c) => c.h));
  const vMax = Math.max(...comps.map((c) => c.v));
  const mcuX = Math.ceil(width / (hMax * 8));
  const mcuY = Math.ceil(height / (vMax * 8));

  // Component planes (one byte per sample).
  const planes = comps.map((c) => ({
    comp: c,
    w: Math.ceil((width * c.h) / hMax),
    h: Math.ceil((height * c.v) / vMax),
    data: Buffer.alloc(Math.ceil((width * c.h) / hMax) * Math.ceil((height * c.v) / vMax)),
  }));

  // Bit reader over the entropy-coded data, unstuffing 0xff00.
  let bytePos = scanStart;
  let curByte = 0;
  let bitsLeft = 0;
  function nextBit(): number {
    if (bitsLeft === 0) {
      if (bytePos >= data.length) throw new Error("eof");
      let b = data[bytePos++];
      if (b === 0xff) {
        const n = data[bytePos++];
        if (n === 0x00) b = 0xff;
        else throw new Error("marker in scan");
      }
      curByte = b;
      bitsLeft = 8;
    }
    bitsLeft--;
    return (curByte >> bitsLeft) & 1;
  }
  function readBits(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | nextBit();
    return v;
  }
  function huffDecode(t: HuffTable | null): number {
    if (!t) throw new Error("no huffman table");
    let code = 0;
    for (let len = 1; len <= 16; len++) {
      code = (code << 1) | nextBit();
      const idx = code - t.firstCode[len];
      if (idx >= 0 && idx < t.counts[len - 1]) return t.symbols[t.firstSym[len] + idx];
    }
    throw new Error("bad huffman code");
  }
  function receiveExtend(n: number): number {
    if (n === 0) return 0;
    const v = readBits(n);
    return v < (1 << (n - 1)) ? v - ((1 << n) - 1) : v;
  }

  const dcPred = new Array(comps.length).fill(0);
  const block = new Array(64).fill(0);
  const tmp = new Array(64).fill(0);
  const out = new Array(64).fill(0);

  function decodeBlock(compIdx: number, dcTab: number, acTab: number, q: number[]): void {
    block.fill(0);
    const dcSize = huffDecode(huffDC[dcTab]);
    const diff = receiveExtend(dcSize);
    dcPred[compIdx] += diff;
    block[0] = dcPred[compIdx] * q[0];
    let k = 1;
    while (k < 64) {
      const sym = huffDecode(huffAC[acTab]);
      const run = sym >> 4;
      const size = sym & 15;
      if (size === 0) {
        if (run === 15) { k += 16; continue; }
        break; // EOB
      }
      k += run;
      if (k >= 64) break;
      block[ZZ[k]] = receiveExtend(size) * q[ZZ[k]];
      k++;
    }
    // Separable inverse DCT with level shift.
    for (let x = 0; x < 8; x++) {
      for (let v = 0; v < 8; v++) {
        let s = 0;
        for (let u = 0; u < 8; u++) s += CU[u] * block[u * 8 + v] * COS[u][x];
        tmp[x * 8 + v] = s;
      }
    }
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        let s = 0;
        for (let v = 0; v < 8; v++) s += CU[v] * tmp[x * 8 + v] * COS[v][y];
        out[x * 8 + y] = s * 0.25 + 128;
      }
    }
  }

  let restartCount = 0;
  let mcusSinceRestart = 0;
  for (let my = 0; my < mcuY; my++) {
    for (let mx = 0; mx < mcuX; mx++) {
      for (let si = 0; si < scanComps.length; si++) {
        const sc = scanComps[si];
        const compIdx = comps.indexOf(sc.comp);
        const plane = planes[compIdx];
        const q = quant[sc.comp.q];
        if (!q) throw new Error("no quant table");
        for (let by = 0; by < sc.comp.v; by++) {
          for (let bx = 0; bx < sc.comp.h; bx++) {
            decodeBlock(compIdx, sc.dc, sc.ac, q);
            const ox = mx * sc.comp.h * 8 + bx * 8;
            const oy = my * sc.comp.v * 8 + by * 8;
            for (let y = 0; y < 8; y++) {
              const py = oy + y;
              if (py >= plane.h) continue;
              for (let x = 0; x < 8; x++) {
                const pxPos = ox + x;
                if (pxPos >= plane.w) continue;
                let v = Math.round(out[y * 8 + x]);
                if (v < 0) v = 0;
                else if (v > 255) v = 255;
                plane.data[py * plane.w + pxPos] = v;
              }
            }
          }
        }
      }
      mcusSinceRestart++;
      if (restartInterval > 0 && mcusSinceRestart === restartInterval) {
        mcusSinceRestart = 0;
        // Align to the next byte, then expect RSTn.
        bitsLeft = 0;
        if (bytePos + 1 >= data.length) throw new Error("eof at restart");
        const m1 = data[bytePos++];
        const m2 = data[bytePos++];
        if (m1 !== 0xff || m2 !== 0xd0 + (restartCount % 8)) throw new Error("bad restart marker");
        restartCount++;
        for (let i = 0; i < dcPred.length; i++) dcPred[i] = 0;
      }
    }
  }

  // Assemble RGB.
  const rgb = Buffer.alloc(width * height * 3);
  const yPlane = planes[0];
  if (comps.length === 1) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = yPlane.data[y * yPlane.w + x];
        const o = (y * width + x) * 3;
        rgb[o] = v; rgb[o + 1] = v; rgb[o + 2] = v;
      }
    }
  } else {
    const cbPlane = planes[1];
    const crPlane = planes[2];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const yy = yPlane.data[y * yPlane.w + x];
        const cbx = Math.floor((x * comps[1].h) / hMax);
        const cby = Math.floor((y * comps[1].v) / vMax);
        const crx = Math.floor((x * comps[2].h) / hMax);
        const cry = Math.floor((y * comps[2].v) / vMax);
        const cb = cbPlane.data[cby * cbPlane.w + cbx] - 128;
        const cr = crPlane.data[cry * crPlane.w + crx] - 128;
        let r = yy + 1.402 * cr;
        let g = yy - 0.34414 * cb - 0.71414 * cr;
        let b = yy + 1.772 * cb;
        const o = (y * width + x) * 3;
        rgb[o] = r < 0 ? 0 : r > 255 ? 255 : Math.round(r);
        rgb[o + 1] = g < 0 ? 0 : g > 255 ? 255 : Math.round(g);
        rgb[o + 2] = b < 0 ? 0 : b > 255 ? 255 : Math.round(b);
      }
    }
  }
  return { w: width, h: height, rgb };
}

function findHeroFile(): string | null {
  const candidates = [
    path.join(path.dirname(process.argv[1] || "."), "hero.jpg"),
    path.join(process.cwd(), "hero.jpg"),
    "/bot/hero.jpg",
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch {
      // keep looking
    }
  }
  return null;
}

function drawHeroPhoto(x: number, y: number, w: number, h: number, img: DecodedImage): void {
  // Scale to fill the panel, cropping the centre (deterministic).
  const scale = Math.max(w / img.w, h / img.h);
  const sw = w / scale;
  const sh = h / scale;
  const sx0 = Math.floor((img.w - sw) / 2);
  // Bias the crop toward the top of the frame (0.35, not 0.5) so the
  // players' faces — not the table — fill the wide, short hero panel.
  const sy0 = Math.floor((img.h - sh) * 0.35);
  for (let j = 0; j < h; j++) {
    const sy = Math.min(img.h - 1, sy0 + Math.floor(j / scale));
    for (let i = 0; i < w; i++) {
      const sx = Math.min(img.w - 1, sx0 + Math.floor(i / scale));
      const o = (sy * img.w + sx) * 3;
      px(x + i, y + j, [img.rgb[o], img.rgb[o + 1], img.rgb[o + 2], 255]);
    }
  }
}

// ------------------------------------------------------------------ art
// Chess pieces as small filled shapes. kind: p pawn, r rook, n knight,
// b bishop, q queen, k king. white: true = light piece, false = dark.
function drawPiece(cx: number, cy: number, kind: string, white: boolean): void {
  const fill = white ? WHITE : INK;
  const edge = white ? INK : LIGHTGREY;
  if (kind === "p") {
    circle(cx, cy - 3, 4, fill);
    circleOutline(cx, cy - 3, 4, edge);
    rect(cx - 6, cy + 2, 12, 4, fill);
  } else if (kind === "r") {
    rect(cx - 6, cy - 7, 12, 13, fill);
    rect(cx - 6, cy - 7, 3, 4, edge);
    rect(cx - 2, cy - 7, 3, 4, edge);
    rect(cx + 3, cy - 7, 3, 4, edge);
    rect(cx - 6, cy + 4, 12, 2, edge);
  } else if (kind === "n") {
    triangle(cx - 6, cy + 6, cx - 6, cy - 6, cx + 6, cy + 6, fill);
    rect(cx - 1, cy - 8, 3, 5, fill);
    rect(cx - 6, cy + 4, 12, 2, edge);
  } else if (kind === "b") {
    circle(cx, cy - 2, 5, fill);
    circleOutline(cx, cy - 2, 5, edge);
    triangle(cx - 2, cy - 6, cx, cy - 11, cx + 2, cy - 6, fill);
    rect(cx - 6, cy + 4, 12, 2, edge);
  } else if (kind === "q") {
    circle(cx, cy + 1, 5, fill);
    circleOutline(cx, cy + 1, 5, edge);
    triangle(cx - 6, cy - 3, cx - 4, cy - 9, cx - 2, cy - 3, fill);
    triangle(cx - 2, cy - 3, cx, cy - 11, cx + 2, cy - 3, fill);
    triangle(cx + 2, cy - 3, cx + 4, cy - 9, cx + 6, cy - 3, fill);
  } else if (kind === "k") {
    circle(cx, cy + 1, 5, fill);
    circleOutline(cx, cy + 1, 5, edge);
    rect(cx - 1, cy - 11, 2, 6, fill);
    rect(cx - 3, cy - 9, 6, 2, fill);
  }
}

function drawChessBoard(bx: number, by: number, sq: number): void {
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      rect(bx + c * sq, by + r * sq, sq, sq, (r + c) % 2 === 0 ? BOARD_LIGHT : BOARD_DARK);
    }
  }
  for (let c = 0; c < 8; c++) {
    const cx = bx + c * sq + Math.floor(sq / 2);
    drawPiece(cx, by + Math.floor(sq / 2), back[c], false);
    drawPiece(cx, by + sq + Math.floor(sq / 2), "p", false);
    drawPiece(cx, by + 6 * sq + Math.floor(sq / 2), "p", true);
    drawPiece(cx, by + 7 * sq + Math.floor(sq / 2), back[c], true);
  }
  rect(bx - 2, by - 2, 8 * sq + 4, 2, INK);
  rect(bx - 2, by + 8 * sq, 8 * sq + 4, 2, INK);
  rect(bx - 2, by - 2, 2, 8 * sq + 4, INK);
  rect(bx + 8 * sq, by - 2, 2, 8 * sq + 4, INK);
}

function drawFlagUzbekistan(x: number, y: number, w: number, h: number): void {
  const third = Math.floor(h / 3);
  rect(x, y, w, third, UZB_BLUE);
  rect(x, y + third, w, 2, [206, 17, 38, 255]);
  rect(x, y + third + 2, w, third - 4, WHITE);
  rect(x, y + 2 * third - 2, w, 2, [206, 17, 38, 255]);
  rect(x, y + 2 * third, w, h - 2 * third, UZB_GREEN);
  circle(x + 14, y + Math.floor(third / 2), 6, WHITE);
  circle(x + 16, y + Math.floor(third / 2), 5, UZB_BLUE);
  for (let i = 0; i < 3; i++) px(x + 24 + i * 3, y + 4, WHITE);
  for (let i = 0; i < 3; i++) px(x + 24 + i * 3, y + 9, WHITE);
  rect(x, y, w, 2, INK);
  rect(x, y + h - 2, w, 2, INK);
  rect(x, y, 2, h, INK);
  rect(x + w - 2, y, 2, h, INK);
}

function drawFlagIndia(x: number, y: number, w: number, h: number): void {
  const third = Math.floor(h / 3);
  rect(x, y, w, third, SAFFRON);
  rect(x, y + third, w, third, WHITE);
  rect(x, y + 2 * third, w, h - 2 * third, INDIA_GREEN);
  const ccx = x + Math.floor(w / 2);
  const ccy = y + third + Math.floor(third / 2);
  circleOutline(ccx, ccy, 7, NAVY);
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    px(Math.round(ccx + 6 * Math.cos(rad)), Math.round(ccy + 6 * Math.sin(rad)), NAVY);
  }
  px(ccx, ccy, NAVY);
  rect(x, y, w, 2, INK);
  rect(x, y + h - 2, w, 2, INK);
  rect(x, y, 2, h, INK);
  rect(x + w - 2, y, 2, h, INK);
}

// Procedural hero: Geneva sky, Alps, lake, the set board. (The title,
// flags and name chips live in drawHeroOverlay below, drawn over the art
// whether it is procedural or a photo.)
function drawHeroArt(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  circle(x + w - 88, y + 26, 16, SUN);
  // Alps
  triangle(x + 170, y + h, x + 330, y + 18, x + 500, y + h, MOUNTAIN);
  triangle(x + 470, y + h, x + 640, y + 8, x + 810, y + h, MOUNTAIN2);
  triangle(x + 760, y + h, x + 890, y + 30, x + w, y + h, MOUNTAIN);
  triangle(x + 312, y + 36, x + 330, y + 18, x + 348, y + 36, SNOW);
  triangle(x + 622, y + 26, x + 640, y + 8, x + 658, y + 26, SNOW);
  triangle(x + 874, y + 46, x + 890, y + 30, x + 906, y + 46, SNOW);
  // Lake Geneva strip
  rect(x, y + h - 14, w, 14, LAKE);
  // Jet d'Eau plume, far right
  vline(x + w - 20, y + 52, 84, WHITE, 4);
  vline(x + w - 28, y + 62, 74, WHITE, 2);
  vline(x + w - 12, y + 62, 74, WHITE, 2);
  circle(x + w - 18, y + 50, 5, WHITE);

  // The board, set for Game 1 (left)
  drawChessBoard(x, y, 19);
}

// Hero overlay: title, flags, name chips, "v" and venue line. Drawn over
// the art — procedural or photo — so the lead story is named either way.
// With a photo the overlay is reflowed into the photo's clear zones (the
// players sit in far-left / far-right columns, the title and venue in the
// dark centre gap), so no paper chip ever covers a face.
function drawHeroOverlay(x: number, y: number, w: number, h: number, photo: boolean): void {
  // Paper chips behind the names and lines so they read over the art.
  const chip = (cx: number, cy: number, s: string, scale: number, c: number[]): void => {
    const tw = textWidth(s, scale);
    rect(cx - Math.floor(tw / 2) - 6, cy - 2, tw + 12, 7 * scale + 4, PAPER);
    drawTextCentered(cx, cy, s, scale, c);
  };
  if (!photo) {
    drawTextCentered(x + 566, y + 8, "WORLD CHESS CHAMPIONSHIP - GAME 1 - GENEVA", 2, INK);
    drawFlagUzbekistan(x + 252, y + 32, 72, 44);
    drawFlagIndia(x + 752, y + 32, 72, 44);
    chip(x + 288, y + 84, "SINDAROV", 3, INK);
    chip(x + 788, y + 84, "GUKESH", 3, INK);
    chip(x + 288, y + 108, "UZBEKISTAN - 20 - WHITE", 2, INK);
    chip(x + 788, y + 108, "INDIA - 20 - BLACK", 2, INK);
    drawTextCentered(x + 538, y + 56, "v", 5, CRIMSON);
    chip(x + 538, y + 122, "FONDATION MARTIN BODMER, COLOGNY - 14 GAMES - FIRST TO 7.5 PTS - $2.5M PRIZE", 1, INK);
    return;
  }
  // Photo mode: the same words, reflowed around the two faces.
  chip(x + 501, y + 8, "WORLD CHESS CHAMPIONSHIP", 2, INK);
  chip(x + 501, y + 30, "GAME 1 - GENEVA", 2, INK);
  drawFlagUzbekistan(x + 36, y + 30, 72, 44);
  drawFlagIndia(x + 860, y + 30, 72, 44);
  chip(x + 76, y + 84, "SINDAROV", 3, INK);
  chip(x + 896, y + 84, "GUKESH", 3, INK);
  chip(x + 76, y + 110, "UZBEKISTAN - 20 - WHITE", 1, INK);
  chip(x + 892, y + 110, "INDIA - 20 - BLACK", 1, INK);
  chip(x + 501, y + 60, "v", 5, CRIMSON);
  chip(x + 501, y + 112, "FONDATION MARTIN BODMER, COLOGNY", 1, INK);
  chip(x + 501, y + 122, "14 GAMES - FIRST TO 7.5 PTS - $2.5M PRIZE", 1, INK);
}

// ------------------------------------------------------------- the page
const MX = 28;
const CW = W - 2 * MX;

function kicker(x: number, y: number, s: string, c?: number[]): void {
  const col = c || CRIMSON;
  drawText(x, y, s, 2, col);
  hline(x, y + 20, textWidth(s, 2), col, 2);
}

function regionHeader(x: number, y: number, name: string, count: number): void {
  const label = name + " - " + count;
  drawText(x, y, label, 2, INK);
  hline(x, y + 20, textWidth(label, 2), CRIMSON, 2);
}

// One brief line, scale 1, with a bullet. Returns the next y.
function brief(x: number, y: number, s: string, maxW: number): number {
  drawText(x, y, "\u2022", 1, CRIMSON);
  drawText(x + 10, y, s, 1, INK);
  return y + 8;
}

function drawPage(): void {
  rect(0, 0, W, H, PAPER);
  // page border
  rect(10, 10, W - 20, 4, INK);
  rect(10, H - 14, W - 20, 4, INK);
  rect(10, 10, 4, H - 20, INK);
  rect(W - 14, 10, 4, H - 20, INK);

  // masthead
  drawTextCentered(W / 2, 34, "THE WORLD IN ONE PICTURE", 6, INK);
  drawTextCentered(W / 2, 88, "TUESDAY 24 NOVEMBER 2026 - 48 STORIES FROM 7 REGIONS - ALL TIMES UTC", 2, GREY);
  hline(MX, 112, CW, INK, 3);

  // date band: the day, unmissable
  rect(MX, 122, CW, 60, INK);
  drawTextCentered(W / 2, 136, "TUESDAY, 24 NOVEMBER 2026", 5, WHITE);
  // date check, in red under the band
  drawTextCentered(W / 2, 192, "DATE CHECKED: TUESDAY 24 NOVEMBER 2026 - 48 STORIES - 7 REGIONS", 2, CRIMSON);
  hline(MX, 212, CW, INK, 3);

  // ---- hero panel
  const heroX = MX, heroY = 220, heroW = CW, heroH = 232;
  const artH = 136;
  const heroFile = findHeroFile();
  let photo: DecodedImage | null = null;
  if (heroFile) {
    try {
      photo = decodeJPEG(fs.readFileSync(heroFile));
    } catch {
      photo = null;
    }
  }
  if (photo) drawHeroPhoto(heroX, heroY, heroW, artH, photo);
  else drawHeroArt(heroX, heroY, heroW, artH);
  rect(heroX, heroY, heroW, 3, INK);
  rect(heroX, heroY + artH - 3, heroW, 3, INK);
  rect(heroX, heroY, 3, artH, INK);
  rect(heroX + heroW - 3, heroY, 3, artH, INK);
  // Names, flags and title sit on top of the art either way (paper chips
  // behind them in photo mode so they read over the photograph).
  drawHeroOverlay(heroX, heroY, heroW, artH, photo !== null);
  // hero headline band
  let hy = heroY + artH + 8;
  kicker(heroX, hy, "LEAD STORY - CHESS - GENEVA", CRIMSON);
  hy += 24;
  drawText(heroX, hy, "GUKESH v SINDAROV - THE YOUNGEST TITLE MATCH EVER", 3, INK);
  hy += 26;
  drawText(heroX, hy, "Game 1, Geneva - 15:00 CET (14:00 UTC) - Sindarov has White, Gukesh Black.", 2, GREY);

  // ---- leads strip: the day's leads named in one line (rank 1-10
  // pattern — winning titles name 3-5 lead stories). All four leads are
  // already on the page above and below; the strip only repeats their
  // headlines, so no new story is invented. The map from the same
  // references was deliberately NOT added: in this 48-story layout there
  // is no clean space for one — any map would be under 50px tall and
  // unreadable at 300px, or would force dropping stories.
  drawText(heroX, 434, "LEADS:", 1, CRIMSON);
  drawText(
    heroX + textWidth("LEADS: ", 1), 434,
    "GUKESH v SINDAROV - NVIDIA +33% AS HUANG RETURNS - ESTONIA ON VERGE OF OPEN WAR - EU LISTS 'THE BASE' FOUNDER AS TERRORIST",
    1, INK
  );

  // ---- leads row
  const ly = 452;
  const colW = Math.floor((CW - 24) / 2);
  const lx0 = MX, lx1 = MX + colW + 24;
  kicker(lx0, ly, "GLOBAL / TECH", CRIMSON);
  let y0 = ly + 24;
  y0 = drawPara(lx0, y0, "NVIDIA SOARS 33% AS HUANG RETURNS AS CEO", colW, 3, INK, 4);
  y0 += 6;
  drawPara(lx0, y0, "Shares add about $1tn as Huang is reinstated as chief executive. Reuters", colW, 2, INK, 3);
  kicker(lx1, ly, "EUROPE", CRIMSON);
  let y1 = ly + 24;
  y1 = drawPara(lx1, y1, "RUSSIA: ESTONIA ON VERGE OF 'OPEN WAR'", colW, 3, INK, 4);
  y1 += 6;
  drawPara(lx1, y1, "Moscow warns after Tallinn says it will shut the border from 1 Dec. Reuters", colW, 2, INK, 3);
  vline(lx1 - 12, ly, 104, LIGHTGREY, 2);
  hline(MX, 568, CW, INK, 3);

  // ---- region grid
  const ry = 578;
  const col1X = MX, col1W = 512;
  const col2X = MX + 528, col2W = 440;

  // Column 1: EUROPE (18), AFRICA (3), OCEANIA (4)
  let cy = ry;
  regionHeader(col1X, cy, "EUROPE", 18);
  cy += 22;
  const europe = [
    "LEAD: GUKESH v SINDAROV, GAME 1 - SEE HERO ABOVE (FIDE)",
    "Russia: Estonia acts 'on verge of triggering open war' - Reuters",
    "Estonia to shut border from 1 Dec for at least 6 months - Reuters",
    "EU lists 'The Base' founder Nazzaro as a terrorist - Consilium",
    "FIFA: US, Mexico, Costa Rica, Jamaica host 2031 Women's WC - FIFA",
    "FIFA: UK to host 2035 Women's World Cup - FIFA",
    "Weir: hosting World Cup 'a decade of excitement' - BBC",
    "Denmark top court backs 'ghetto law' evictions - Reuters",
    "De Bruyne returns to the Etihad with Napoli - BBC",
    "UCL: Bodo/Glimt v LASK, 17:45 CET - UEFA",
    "UCL: Galatasaray v Aston Villa, 17:45 CET - UEFA",
    "UCL: Arsenal v Borussia Dortmund, 20:00 CET - UEFA",
    "UCL: Como v AEK Athens, 20:00 CET - UEFA",
    "UCL: Feyenoord v Porto, 20:00 CET - UEFA",
    "UCL: Man City v Napoli, 20:00 CET - UEFA",
    "UCL: RB Leipzig v Lens, 20:00 CET - UEFA",
    "UCL: Real Madrid v PSV, 20:00 CET - UEFA",
    "UCL: Slovan Bratislava v Real Betis, 20:00 CET - UEFA",
  ];
  for (const s of europe) cy = brief(col1X, cy, s, col1W);
  cy += 4;
  regionHeader(col1X, cy, "AFRICA", 3);
  cy += 22;
  const africa = [
    "Kenya and DR Congo restore full diplomatic ties - AfricanQuarters",
    "Fighting in Ituri traps DR Congo Ebola responders - WHO",
    "Kenya joins Africa CDC board for two-year term - Radio Generation",
  ];
  for (const s of africa) cy = brief(col1X, cy, s, col1W);
  cy += 4;
  regionHeader(col1X, cy, "OCEANIA", 4);
  cy += 22;
  const oceania = [
    "Chalmers: budget update 'saves more than we spend' - Guardian",
    "King Charles 'deeply saddened' by Meldrum death - Guardian",
    "Victorian Liberals used AI to write Meldrum tribute - Guardian",
    "Taylor: 'tough year' for Coalition partyroom - Guardian",
  ];
  for (const s of oceania) cy = brief(col1X, cy, s, col1W);

  // Column 2: ASIA (9), AMERICAS (7), MIDDLE EAST (4), GLOBAL/TECH (3)
  cy = ry;
  regionHeader(col2X, cy, "ASIA", 9);
  cy += 22;
  const asia = [
    "Indonesia: search goes on at factory fire - 24 dead - Reuters",
    "Manila transport strike enters day 2; 6,000 police out - PNA",
    "Tajikistan starts process to leave the ICC - Reuters",
    "US to blacklist Megaspeed, at heart of Nvidia row - Reuters",
    "India: top court grants bail to Godhra convict - The Hindu",
    "India v NZ: 2nd Test starts Friday in Christchurch - ICC",
    "India CJI calls for AI rules in law courses - TOI",
    "Trump's outreach to Kim 'ignored', WSJ reports - WSJ",
    "FSSAI orders Bisleri prosecution over water safety - TOI",
  ];
  for (const s of asia) cy = brief(col2X, cy, s, col2W);
  cy += 4;
  regionHeader(col2X, cy, "AMERICAS", 7);
  cy += 22;
  const americas = [
    "Lame-duck US Congress in session in Washington - Congress",
    "Trump orders Army to pause Iowa explosives blast - Reuters",
    "Appeals court lifts stay on Iowa blast - CNN",
    "DNC plans 12 debates for 2028 primary - CNN",
    "DNC vows to reject dark money in 2028 - CNN",
    "Appeals court revives Trump hush-money removal bid - AP",
    "US flew drone over Mexico to catch 'El Chapo Isidro' - AP",
  ];
  for (const s of americas) cy = brief(col2X, cy, s, col2W);
  cy += 4;
  regionHeader(col2X, cy, "MIDDLE EAST", 4);
  cy += 22;
  const middleEast = [
    "20 Gaza students arrive in Ireland today - RocketNews",
    "28 Gaza students still waiting for visas - RocketNews",
    "48 Gaza student visas granted on appeal - RocketNews",
    "Oxfam: Gaza a 'toxic wasteland', 99% contaminated - Oxfam",
  ];
  for (const s of middleEast) cy = brief(col2X, cy, s, col2W);
  cy += 4;
  regionHeader(col2X, cy, "GLOBAL / TECH", 3);
  cy += 22;
  const tech = [
    "LEAD: NVIDIA +33% AS HUANG RETURNS - SEE ABOVE (REUTERS)",
    "UN chief: agree global AI safety rules within a year - UN News",
    "Supermoon meets the Pleiades in tonight's sky - CNET",
  ];
  for (const s of tech) cy = brief(col2X, cy, s, col2W);

  // ---- UTC timeline
  hline(MX, 908, CW, INK, 3);
  drawText(MX, 916, "THE DAY IN UTC", 2, INK);
  const timeline = [
    ["00:30", "Java search", "resumes"],
    ["02:00", "Manila strike,", "day 2"],
    ["14:00", "Chess Game 1", "begins, Geneva"],
    ["15:00", "US Congress", "in session"],
    ["17:45", "Champions League", "early kick-offs"],
    ["20:00", "Champions League", "main matches"],
  ];
  const nodeW = Math.floor(CW / 6);
  hline(MX, 940, CW, LIGHTGREY, 2);
  for (let i = 0; i < timeline.length; i++) {
    const cx = MX + Math.floor(nodeW / 2) + i * nodeW;
    circle(cx, 941, 6, CRIMSON);
    drawTextCentered(cx, 950, timeline[i][0], 2, CRIMSON);
    drawTextCentered(cx, 968, timeline[i][1], 1, INK);
    drawTextCentered(cx, 977, timeline[i][2], 1, INK);
  }

  // ---- footer: sources + count
  drawTextCentered(
    W / 2, 992,
    "SOURCES: REUTERS, AP, BBC, UEFA, FIDE, CHESS.COM, UN NEWS, PNA, GUARDIAN, CNN, FIFA, CONSILIUM, ROCKETNEWS, OXFAM, AFRICANQUARTERS, PANA, RADIO GENERATION, TOI, CNET",
    1, GREY
  );
  drawTextCentered(
    W / 2, 1003,
    "48 STORIES - 7 REGIONS - DATE CHECKED: TUESDAY 24 NOVEMBER 2026",
    1, GREY
  );
}

// ------------------------------------------------------------------ main
function main(): void {
  drawPage();
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  // Clear the output directory's contents, never the directory itself.
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) {
    fs.rmSync(path.join(outDir, f), { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
