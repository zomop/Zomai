#!/usr/bin/env python3
"""
Bikin banner animasi (GIF) buat `zomai profile` — tanpa library luar, cuma
Python standar + ImageMagick (`convert`) buat nge-pack frame jadi GIF.

Jalankan:
    python3 tools/make-banners.py            # semua banner
    python3 tools/make-banners.py neon gold  # pilih sebagian

Output: assets/banners/<nama>.gif (640x160, 30 frame, loop selamanya)
"""
import math
import os
import shutil
import subprocess
import sys
import tempfile

W = int(os.environ.get('ZOMAI_W', 480))
H = int(os.environ.get('ZOMAI_H', 120))
FRAMES = int(os.environ.get('ZOMAI_FRAMES', 18))
COLORS = os.environ.get('ZOMAI_COLORS', '64')
DITHER = os.environ.get('ZOMAI_DITHER', 'None')
DELAY = os.environ.get('ZOMAI_DELAY', '7')
NOISE = float(os.environ.get('ZOMAI_NOISE', '4.5'))

BAYER4 = (
    (0, 8, 2, 10),
    (12, 4, 14, 6),
    (3, 11, 1, 9),
    (15, 7, 13, 5),
)


def ordered_noise(buf):
    """Dither teratur (Bayer 4x4) — biar gradien halus walau paletnya cuma 64 warna,
    tapi tetap kompresibel (polanya periodik, bukan acak)."""
    lut = [[((v / 16.0) - 0.47) * NOISE for v in row] for row in BAYER4]
    for y in range(H):
        row_lut = lut[y % 4]
        base = y * W * 3
        for x in range(W):
            d = row_lut[x % 4]
            i = base + x * 3
            buf[i] = clamp(buf[i] + d)
            buf[i + 1] = clamp(buf[i + 1] + d)
            buf[i + 2] = clamp(buf[i + 2] + d)
    return buf
TAU = math.pi * 2
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'banners')


def clamp(v):
    return 0 if v < 0 else (255 if v > 255 else int(v))


def hsv(h, s, v):
    """h,s,v ∈ 0..1 → (r,g,b) 0..255"""
    h = h % 1.0
    i = int(h * 6) % 6
    f = h * 6 - int(h * 6)
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    r, g, b = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i]
    return clamp(r * 255), clamp(g * 255), clamp(b * 255)


# ---------------------------------------------------------------- banners ----


def neon(t):
    """Gradien cyan→magenta yang gerak + scanline."""
    buf = bytearray(W * H * 3)
    phase = t * TAU
    scan_row = int(t * FRAMES) % 4
    for y in range(H):
        row = y * W * 3
        yy = y / H
        scan = 0.70 if (y + scan_row) % 4 < 2 else 1.0
        for x in range(W):
            d = (x / W) * 0.55 + yy * 0.45
            hue = 0.50 + 0.40 * math.sin(d * 4.2 - phase * 1.2)
            glow = 0.55 + 0.45 * math.sin(d * 2.0 - phase + 1.2)
            r, g, b = hsv(hue, 0.78, (0.55 + 0.45 * glow) * scan)
            i = row + x * 3
            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b
    return buf


def galaxy(t):
    """Nebula ungu-biru + bintang berkelip."""
    buf = bytearray(W * H * 3)
    phase = t * TAU
    blobs = [
        (0.30 + 0.16 * math.sin(phase), 0.45, 0.42, (150, 60, 255)),
        (0.62 - 0.14 * math.sin(phase * 0.8 + 1.1), 0.60, 0.36, (60, 120, 255)),
        (0.50 + 0.10 * math.cos(phase * 0.6), 0.35, 0.28, (255, 90, 210)),
    ]
    for y in range(H):
        row = y * W * 3
        ny = y / H
        for x in range(W):
            nx = x / W
            r = 8.0
            g = 6.0
            b = 22.0
            for cx, cy, rad, (br, bg, bb) in blobs:
                dx = (nx - cx) * 2.2
                dy = ny - cy
                d2 = dx * dx + dy * dy
                k = math.exp(-d2 / (rad * rad))
                r += br * k * 0.55
                g += bg * k * 0.55
                b += bb * k * 0.55
            i = row + x * 3
            buf[i] = clamp(r)
            buf[i + 1] = clamp(g)
            buf[i + 2] = clamp(b)
    # bintang
    for s in range(150):
        seed = (s * 2654435761) & 0xFFFFFFFF
        x = (seed >> 7) % W
        y = (seed >> 19) % H
        tw = 0.5 + 0.5 * math.sin(phase * 3 + s * 0.7)
        v = clamp(80 + 175 * tw)
        i = (y * W + x) * 3
        buf[i] = v
        buf[i + 1] = v
        buf[i + 2] = clamp(v * 1.05)
        if tw > 0.85 and x + 1 < W:
            j = i + 3
            buf[j] = clamp(v * 0.6)
            buf[j + 1] = clamp(v * 0.6)
            buf[j + 2] = clamp(v * 0.7)
    return buf


def fire(t):
    """Api oranye yang berkobar naik."""
    buf = bytearray(W * H * 3)
    phase = t * TAU
    for x in range(W):
        hx = H * (0.58 + 0.20 * math.sin(x * 0.052 + phase * 2) + 0.11 * math.sin(x * 0.17 - phase * 3) + 0.06 * math.sin(x * 0.31 + phase * 5))
        for y in range(H):
            dist = (H - y) / max(1.0, hx)  # 0 = puncak api, 1 = dasar
            i = (y * W + x) * 3
            if dist > 1.0:
                ember = max(0.0, 1.0 - (dist - 1.0) * 3.0)
                buf[i] = clamp(40 * ember + 12)
                buf[i + 1] = clamp(10 * ember + 6)
                buf[i + 2] = clamp(6 * ember + 8)
                continue
            v = 1.0 - dist
            r = clamp(255 * min(1.0, v * 2.0))
            g = clamp(255 * max(0.0, v * 1.7 - 0.45))
            b = clamp(255 * max(0.0, v * 3.2 - 2.1))
            if v > 0.9:
                r = g = b = 255
            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b
    return buf


def ocean(t):
    """Ombak laut biru-teal."""
    buf = bytearray(W * H * 3)
    phase = t * TAU
    for y in range(H):
        row = y * W * 3
        depth = y / H
        for x in range(W):
            w = math.sin(x * 0.013 + phase + math.sin(y * 0.055 + phase * 2) * 0.9)
            k = 0.5 + 0.5 * w
            r = 6 + 10 * k
            g = 40 + 150 * k * (1 - depth * 0.55)
            b = 90 + 140 * k
            foam = k ** 6
            r += 200 * foam
            g += 210 * foam
            b += 220 * foam
            i = row + x * 3
            buf[i] = clamp(r)
            buf[i + 1] = clamp(g)
            buf[i + 2] = clamp(b)
    return buf


def sakura(t):
    """Latar pink lembut + kelopak sakura jatuh."""
    buf = bytearray(W * H * 3)
    phase = t * TAU
    for y in range(H):
        row = y * W * 3
        d = y / H
        br = 250 - 25 * d
        bg_ = 205 - 30 * d
        bb = 220 - 10 * d
        for x in range(W):
            i = row + x * 3
            buf[i] = clamp(br)
            buf[i + 1] = clamp(bg_)
            buf[i + 2] = clamp(bb)
    for p in range(34):
        seed = (p * 1103515245 + 12345) & 0x7FFFFFFF
        speed = 0.5 + (seed % 100) / 140.0
        y = int(((seed >> 5) % (H + 40) + t * H * 1.5 * speed) % (H + 40)) - 10
        x = int(((seed >> 11) % W) + 26 * math.sin(phase * 2 + p))
        color = (255, 170, 200) if p % 3 else (255, 230, 240)
        for dy in range(-2, 3):
            for dx in range(-4, 5):
                if dx * dx / 20.0 + dy * dy / 5.0 > 1:
                    continue
                px, py = x + dx, y + dy
                if 0 <= px < W and 0 <= py < H:
                    i = (py * W + px) * 3
                    buf[i] = color[0]
                    buf[i + 1] = color[1]
                    buf[i + 2] = color[2]
    return buf


def matrix(t):
    """Hujan kode hijau ala Matrix."""
    buf = bytearray(W * H * 3)
    cols = W // 14
    for c in range(cols):
        seed = (c * 2654435761) & 0xFFFFFFFF
        speed = 18 + (seed % 26)
        head = int(t * FRAMES * speed / 8 + (seed >> 9) % (H + 80)) % (H + 80)
        x0 = c * 14
        for y in range(H):
            dist = head - y
            if 0 <= dist < 36:
                k = (1 - dist / 36) ** 1.7
                if dist < 3:
                    r, g, b = 210, 255, 220
                else:
                    r, g, b = clamp(120 * k * k), clamp(55 + 200 * k), clamp(70 * k)
                for dx in range(11):
                    px = x0 + dx
                    if px >= W:
                        break
                    i = (y * W + px) * 3
                    buf[i] = r
                    buf[i + 1] = g
                    buf[i + 2] = b
    return buf


def aurora(t):
    """Pita aurora hijau-ungu."""
    buf = bytearray(W * H * 3)
    phase = t * TAU
    ribbons = [
        (0.42, 26, 0.018, (60, 255, 170), 0.0),
        (0.58, 34, 0.013, (150, 90, 255), 1.9),
        (0.50, 20, 0.026, (80, 220, 255), 3.4),
    ]
    for y in range(H):
        row = y * W * 3
        for x in range(W):
            r, g, b = 6, 8, 20
            for cy, amp, freq, (cr, cg, cb), off in ribbons:
                yc = H * cy + amp * math.sin(x * freq + phase * 2 + off)
                d = abs(y - yc)
                k = math.exp(-(d * d) / 900.0)
                r += cr * k * 0.75
                g += cg * k * 0.75
                b += cb * k * 0.75
            i = row + x * 3
            buf[i] = clamp(r)
            buf[i + 1] = clamp(g)
            buf[i + 2] = clamp(b)
    return buf


def gold(t):
    """Latar gelap + kilau emas menyapu (kesan VIP)."""
    buf = bytearray(W * H * 3)
    span = W * 1.5
    sweep = (t * span) % span - W * 0.25
    sweep2 = sweep - span * 0.5
    for y in range(H):
        row = y * W * 3
        d = y / H
        bevel = 1.0 - abs(d - 0.5) * 0.9
        for x in range(W):
            base = (26 + 30 * bevel) * 0.55
            k = math.exp(-((x - sweep) / 95.0) ** 2) + 0.55 * math.exp(-((x - sweep2) / 70.0) ** 2)
            shimmer = 0.75 + 0.25 * math.sin(x * 0.03 + t * TAU * 3)
            r = (base + 235 * k) * shimmer
            g = (base * 0.85 + 185 * k) * shimmer
            b = (base * 0.5 + 70 * k) * shimmer
            i = row + x * 3
            buf[i] = clamp(r)
            buf[i + 1] = clamp(g)
            buf[i + 2] = clamp(b)
    for s_ in range(46):
        seed = (s_ * 40503 + 7919) & 0x7FFFFFFF
        x = int((seed % W + t * 120 * ((seed % 5) + 1)) % W)
        y = (seed >> 8) % H
        k = 0.5 + 0.5 * math.sin(t * TAU * 4 + s_)
        if k > 0.6:
            i = (y * W + x) * 3
            buf[i] = 255
            buf[i + 1] = 246
            buf[i + 2] = clamp(150 + 105 * k)
    return buf


BANNERS = {
    'neon': neon,
    'galaxy': galaxy,
    'fire': fire,
    'ocean': ocean,
    'sakura': sakura,
    'matrix': matrix,
    'aurora': aurora,
    'gold': gold,
}


# ------------------------------------------------------------------ pack ----


def build(name):
    fn = BANNERS[name]
    tmp = tempfile.mkdtemp(prefix=f'zomai-{name}-')
    try:
        for f in range(FRAMES):
            t = f / FRAMES
            with open(os.path.join(tmp, f'f{f:03d}.ppm'), 'wb') as fh:
                fh.write(b'P6\n%d %d\n255\n' % (W, H))
                fh.write(ordered_noise(bytearray(fn(t))))
        os.makedirs(OUT_DIR, exist_ok=True)
        out = os.path.abspath(os.path.join(OUT_DIR, f'{name}.gif'))
        subprocess.run(
            ['convert', '-delay', DELAY, '-loop', '0']
            + [os.path.join(tmp, f'f{f:03d}.ppm') for f in range(FRAMES)]
            + ['-dither', DITHER, '-colors', COLORS, '-layers', 'Optimize', out],
            check=True,
        )
        size = os.path.getsize(out)
        print(f'✅ {name}.gif  {size / 1024:.0f} KB')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    names = sys.argv[1:] or list(BANNERS)
    for n in names:
        if n not in BANNERS:
            print(f'⚠️  banner "{n}" nggak ada. Pilihan: {", ".join(BANNERS)}')
            continue
        build(n)
