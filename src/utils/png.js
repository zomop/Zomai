/**
 * Pembuat PNG super kecil (tanpa dependency) — dipakai buat bikin emoji kustom
 * waktu `owner build` (koin, hati, bintang, perisai, mahkota, centang).
 */
'use strict';

const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** @param {number} width @param {number|Buffer} height @param {Buffer} [rgba] */
function encodePNG(width, height, rgba) {
  if (Buffer.isBuffer(height)) {
    rgba = height;
    height = width;
  }
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ==================== gambar ====================

const SIZE = 64;
const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function paint(shade) {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = shade((x + 0.5) / SIZE, (y + 0.5) / SIZE); // 0..1
      const i = (y * SIZE + x) * 4;
      if (!c) continue;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = c.length > 3 ? c[3] : 255;
    }
  }
  return encodePNG(SIZE, buf);
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** jarak titik (px,py) ke segmen garis (x1,y1)-(x2,y2) */
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1e-6;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** centang tebal: dua garis */
function onCheck(x, y, thick = 0.055) {
  return segDist(x, y, 0.28, 0.5, 0.44, 0.68) < thick || segDist(x, y, 0.44, 0.68, 0.74, 0.34) < thick;
}

function circle(cx, cy, r, color, edge) {
  return (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    if (d > r) return null;
    if (edge && d > r - 0.06) return edge;
    return color;
  };
}

function coin() {
  const gold = hex(0xf1c40f);
  const dark = hex(0xb8860b);
  const light = hex(0xffe680);
  return paint((x, y) => {
    const d = Math.hypot(x - 0.5, y - 0.5);
    if (d > 0.46) return null;
    if (d > 0.38) return dark;
    if (Math.hypot(x - 0.5, y - 0.5) <= 0.38 && d > 0.32) return light;
    // simbol "$"-ish: garis vertikal + lengkung sederhana
    const bar = Math.abs(x - 0.5) < 0.04 && y > 0.24 && y < 0.76;
    const ring = Math.abs(d - 0.2) < 0.045 && y > 0.28 && y < 0.72;
    return bar || ring ? dark : gold;
  });
}

function heart() {
  const pink = hex(0xff4d6d);
  const light = hex(0xff8fa8);
  const inside = (x, y) => {
    const l = Math.hypot(x - 0.31, y - 0.35) < 0.21;
    const r = Math.hypot(x - 0.69, y - 0.35) < 0.21;
    // segitiga bawah: titik (0.5,0.92) dengan alas y=0.36 dari x 0.12..0.88
    const tri = y > 0.36 && y < 0.92 && Math.abs(x - 0.5) < ((0.92 - y) / 0.56) * 0.38;
    return l || r || tri;
  };
  return paint((x, y) => {
    if (!inside(x, y)) return null;
    const near = !inside(x + 0.03, y) || !inside(x - 0.03, y) || !inside(x, y + 0.03);
    return near ? pink : light;
  });
}

function star() {
  const yellow = hex(0xfee75c);
  const edge = hex(0xe6a700);
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 0.47 : 0.2;
    pts.push([0.5 + Math.cos(ang) * r, 0.5 + Math.sin(ang) * r]);
  }
  const inside = (px, py) => {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
  return paint((x, y) => {
    if (!inside(x, y)) return null;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inside(x + dx * 0.03, y + dy * 0.03));
    return near ? edge : yellow;
  });
}

function shield() {
  const blue = hex(0x5865f2);
  const dark = hex(0x3b45c4);
  const check = hex(0xffffff);
  const inside = (x, y) => {
    if (y < 0.1 || y > 0.9) return false;
    const w = 0.34 * (y < 0.55 ? 1 : 1 - (y - 0.55) / 0.36);
    return Math.abs(x - 0.5) < w;
  };
  return paint((x, y) => {
    if (!inside(x, y)) return null;
    const near = !inside(x + 0.02, y + 0.02) || !inside(x - 0.02, y - 0.02);
    if (near) return dark;
    return onCheck(x, y, 0.06) ? check : blue;
  });
}

function crown() {
  const gold = hex(0xf1c40f);
  const dark = hex(0xb8860b);
  const pts = [
    [0.1, 0.72], [0.1, 0.3], [0.3, 0.5], [0.5, 0.18], [0.7, 0.5], [0.9, 0.3], [0.9, 0.72],
  ];
  const inside = (px, py) => {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
  return paint((x, y) => {
    if (!inside(x, y)) return null;
    const near = !inside(x + 0.03, y) || !inside(x - 0.03, y) || !inside(x, y + 0.03) || !inside(x, y - 0.03);
    return near ? dark : gold;
  });
}

function check() {
  const green = hex(0x57f287);
  const dark = hex(0x2ea44f);
  const white = hex(0xffffff);
  return paint((x, y) => {
    const d = Math.hypot(x - 0.5, y - 0.5);
    if (d > 0.46) return null;
    if (d > 0.4) return dark;
    return onCheck(x, y, 0.065) ? white : green;
  });
}

const ICONS = { coin, heart, star, shield, crown, check };

/** Buffer PNG untuk nama ikon */
function icon(name) {
  const fn = ICONS[name];
  return fn ? fn() : check();
}

module.exports = { icon, encodePNG, ICON_NAMES: Object.keys(ICONS) };
