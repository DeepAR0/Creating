"""Barok tavan freski üretici: gökyüzü, ışıkla aydınlanan bulutlar, ilahi ışık
huzmeleri, güvercinler, sıva dokusu, çatlaklar (craquelure) ve eskime.

Çıktı: HxWx3 RGB [0,1].
"""
from __future__ import annotations

import math

import numpy as np
from scipy import ndimage as ndi
from scipy.spatial import cKDTree

from susleme import (Canvas, noise, smoothstep, bezier, bezier_path, transform, mirror_x, resample,
                      scalloped, equalize)

C = lambda *v: np.array(v, np.float32) / 255.0  # noqa: E731


def dove_shape(wing_up: float = 1.0, far_wing: bool = True) -> list[np.ndarray]:
    """Yandan görünen uçan güvercin (baş sağda). Yerel koordinat ~ [-130,105] x [-200,30].

    wing_up: 1 kanatlar yukarıda (V), 0 yatay.
    Döndürür [gövde, yakın kanat, (uzak kanat)].
    """
    body = bezier_path([
        ((100, -30), (94, -37), (86, -42), (78, -44)),     # gaga -> alın
        ((78, -44), (64, -50), (48, -44), (44, -32)),      # baş -> ense
        ((44, -32), (24, -16), (-8, -10), (-46, -8)),      # sırt
        ((-46, -8), (-74, -12), (-100, -26), (-124, -24)), # kuyruk üstü
    ], n=24)
    tail_end = scalloped(bezier((-124, -24), (-132, -10), (-130, 8), (-118, 18), n=40), 4, 5.0, -1.0)
    belly = bezier_path([
        ((-118, 18), (-92, 14), (-68, 14), (-46, 12)),     # kuyruk altı
        ((-46, 12), (-10, 28), (32, 24), (58, 4)),         # karın -> göğüs
        ((58, 4), (70, -8), (80, -18), (88, -24)),         # boğaz
        ((88, -24), (92, -26), (96, -28), (100, -30)),     # gaga altı
    ], n=24)
    parts = [np.concatenate([body, tail_end, belly])]

    def wing(sx, sy, tipx, tipy, back, lift, feathers):
        ty = sy + (tipy - sy) * lift
        tx = sx + (tipx - sx) * (0.6 + 0.4 * lift)
        lead = bezier((sx, sy), (sx + 26, sy - 70 * lift - 10), (tx + 30, ty + 40 * lift), (tx, ty), n=60)
        trail_base = bezier((tx, ty), (tx - 30, ty + 60 * lift + 10), (sx - back, sy - 40 * lift),
                            (sx - back * 0.8, sy + 2), n=80)
        trail = scalloped(trail_base, feathers, lambda t: 22.0 * (1 - t) ** 1.2 + 6.0, -1.0, 0.7)
        return np.concatenate([lead, trail])

    near = wing(18, -12, -30, -196, 70, wing_up, 8)
    if far_wing:
        far = wing(-2, -18, -84, -176, 60, wing_up * 0.92, 7)
        parts.append(far)
    parts.append(near)
    return parts


def craquelure(h: int, w: int, cells: int, seed: int, warp: float = 6.0) -> np.ndarray:
    """Voronoi kenarlarından ince çatlak ağı [0,1]."""
    rng = np.random.default_rng(seed)
    pts = rng.random((cells, 2)) * [h, w]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    wy = (noise(h, w, 2.4, seed + 11) - 0.5) * warp * 2
    wx = (noise(h, w, 2.4, seed + 12) - 0.5) * warp * 2
    q = np.stack([(yy + wy).ravel(), (xx + wx).ravel()], 1)
    d, _ = cKDTree(pts).query(q, k=2)
    edge = (d[:, 1] - d[:, 0]).reshape(h, w)
    line = 1.0 - smoothstep(0.0, 1.6, edge)
    # bazı çatlaklar silik
    vis = smoothstep(0.35, 0.6, noise(h, w, 2.0, seed + 13))
    return (line * vis).astype(np.float32)


def clouds(h: int, w: int, seed: int, coverage: float, lx: float, ly: float, asp: float,
           warm: float = 1.0, ring_r=(0.14, 0.34), edge_w: float = 0.35, soft: float = 0.1,
           relief: float = 26.0) -> np.ndarray:
    """Barok bulut katmanı (RGBA). Işık kaynağına bakan yüzler altın, altlar mor-gri."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xx / w
    v = yy / h
    dx = (u - lx) * asp
    dy = v - ly
    r = np.sqrt(dx * dx + dy * dy)
    n1 = equalize(noise(h, w, 3.3, seed))
    n2 = equalize(noise(h, w, 2.3, seed + 1))
    n = n1 * 0.72 + n2 * 0.28
    ring = smoothstep(ring_r[0], ring_r[1], r)
    edge = smoothstep(0.25, 0.48, np.maximum(np.abs(u - 0.5) * 1.1, np.abs(v - 0.5)))
    field = n + 0.55 * ring * (0.6 + 0.4 * edge) + edge_w * edge - 0.55
    thr = 1.0 - coverage
    dens = smoothstep(thr - soft, thr + soft, field)
    # hacim: yoğunluktan yükseklik, normal ve ışık
    s = max(h, w) / 600.0
    hgt = ndi.gaussian_filter(dens, 11 * s) * 0.65 + ndi.gaussian_filter(dens, 4.5 * s) * 0.35
    puff = equalize(noise(h, w, 3.0, seed + 9))
    hgt = hgt + (puff - 0.5) * 0.10 * ndi.gaussian_filter(dens, 3 * s)
    gy, gx = np.gradient(hgt * relief * s)
    nz = 1.0 / np.sqrt(gx * gx + gy * gy + 1.0)
    nx, ny = -gx * nz, -gy * nz
    # ışık: pikselden kaynağa doğru, 45° yükseklik
    ldx, ldy = -dx / (r + 1e-3), -dy / (r + 1e-3)
    lz = 0.75
    ln = np.sqrt(ldx ** 2 + ldy ** 2 + lz ** 2)
    ndl = np.clip((nx * ldx + ny * ldy + nz * lz) / ln, 0, 1)
    lit = np.clip((ndl - 0.35) * 1.6, 0, 1)
    lit = ndi.gaussian_filter(lit, 1.6 * s)
    sh_c = C(104, 98, 142)
    md_c = C(212, 192, 194)
    hi_c = C(255, 249, 236)
    L = lit[..., None]
    cc = np.where(L < 0.5, sh_c * (1 - L * 2) + md_c * (L * 2), md_c * (2 - L * 2) + hi_c * (L * 2 - 1))
    warmth = np.exp(-(r / 0.42) ** 2)[..., None] * 0.5 * warm
    cc = cc * (1 - warmth) + C(255, 210, 138) * warmth * (0.6 + 0.4 * L)
    # kenarda hafif şeffaflık (yumuşak bulut kenarı)
    a = np.clip(dens * 1.15, 0, 1)
    return np.dstack([np.clip(cc, 0, 1), a]).astype(np.float32)


def fresco(w: int, h: int, seed: int = 7, light=(0.5, 0.2), doves: bool = True,
           rays: int = 26, coverage: float = 0.5, warm: float = 1.0,
           aged: float = 1.0, dove_pos=None, dove_scale: float = 1.0) -> np.ndarray:
    """coverage: bulut kaplama oranı (0..1)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xx / w
    v = yy / h
    asp = w / h
    lx, ly = light
    dx = (u - lx) * asp
    dy = v - ly
    r = np.sqrt(dx * dx + dy * dy)
    ang = np.arctan2(dy, dx)

    # --- gökyüzü (doygun lapis mavisi -> açık gök), ışığa yakın sıcak altın
    top = C(38, 78, 150)
    mid = C(92, 142, 205)
    low = C(170, 196, 222)
    k1 = smoothstep(0.0, 0.6, v)[..., None]
    k2 = smoothstep(0.55, 1.0, v)[..., None]
    sky = top * (1 - k1) + mid * k1
    sky = sky * (1 - k2) + low * k2
    halo = np.exp(-(r / 0.55) ** 2)[..., None] * 0.55 * warm
    sky = sky * (1 - halo) + C(246, 214, 150) * halo
    glow = np.exp(-(r / 0.22) ** 2)[..., None] * warm
    sky = sky * (1 - glow) + C(255, 246, 220) * glow

    # --- ışık huzmeleri (yumuşak)
    if rays:
        jitter = noise(1, 512, 1.0, seed + 3)[0]
        ai = ((ang + math.pi) / math.tau * 511).astype(int) % 512
        ray = (0.5 + 0.5 * np.cos(ang * rays + jitter[ai] * 5.0)) ** 5
        ray *= smoothstep(0.03, 0.14, r) * np.exp(-r * 2.0) * warm
        sky = sky + C(255, 232, 180) * (ray * 0.26 * min(warm, 1.0))[..., None]

    # --- bulutlar: ışığın çevresinde halka + kenarlar; eşitlenmiş gürültü
    img = sky
    cl = clouds(h, w, seed, coverage, lx, ly, asp, warm)
    img = img * (1 - cl[..., 3:4]) + cl[..., :3] * cl[..., 3:4]

    # --- güvercinler
    if doves:
        cv = Canvas(w, h, ss=3)
        s = min(w, h) / 900.0 * dove_scale
        pos = dove_pos or [(0.33, 0.60, 1.0, -0.12, False), (0.67, 0.60, 1.0, 0.12, True)]
        shapes = []
        far_sh = []
        for (px, py, sc, rot, flip) in pos:
            d = dove_shape(1.0)
            if flip:
                d = mirror_x(d, 0.0)
            d = transform(d, dx=px * w, dy=py * h, sx=sc * s * 1.4, rot=rot)
            shapes += [d[0], d[-1]]
            far_sh += d[1:-1]
        m_far = cv.mask(far_sh)
        m = cv.mask(shapes)
        for mm, tone in ((m_far, 0.86), (m, 1.0)):
            inner = ndi.gaussian_filter(mm, 2.5)
            sd = np.clip(0.80 + 0.2 * (inner - 0.5) * 2, 0.62, 1.0) * tone
            dc = C(253, 250, 242) * sd[..., None]
            dc = dc * (1 - glow * 0.25) + C(255, 236, 190) * glow * 0.25
            rim = np.clip(ndi.gaussian_filter(mm, 1.0) - mm, 0, 1)[..., None]
            img = img * (1 - mm[..., None]) + dc * mm[..., None]
            img = img * (1 - rim * 0.5)

    # --- boya/sıva dokusu, fırça izleri
    fine = noise(h, w, 1.1, seed + 5)
    brush = noise(h, w, 1.9, seed + 6, stretch=(0.35, 1.0))
    img = img * (0.94 + 0.06 * fine[..., None]) * (0.97 + 0.05 * brush[..., None])

    if aged:
        loss = smoothstep(0.93, 0.975, equalize(noise(h, w, 2.4, seed + 7))) * 0.5 * aged
        plaster = C(236, 226, 204)
        img = img * (1 - loss[..., None]) + plaster * loss[..., None]
        cr = craquelure(h, w, max(40, int(w * h / 2600)), seed + 8, warp=5.0)
        img = img * (1 - cr[..., None] * 0.16 * aged)
        rr = np.sqrt(((u - 0.5) * 2) ** 2 + ((v - 0.5) * 2) ** 2)
        sep = smoothstep(0.7, 1.15, rr)[..., None] * 0.35 * aged
        img = img * (1 - sep) + img * C(222, 190, 140) * sep
    return np.clip(img, 0, 1).astype(np.float32)


if __name__ == '__main__':
    import sys
    from susleme import preview
    out = sys.argv[1] if len(sys.argv) > 1 else 'fresk.png'
    img = fresco(470, 570)
    preview(out, img, maxw=470)
