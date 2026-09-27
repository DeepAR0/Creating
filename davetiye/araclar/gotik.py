"""Gotik motifler: sivri kemer, yonca (trefoil/quatrefoil), gül pencere taş işçiliği,
Voronoi kurşun çizgili vitray camı, pinakl (sivri kule) ve kıvrık yaprak (crocket).
"""
from __future__ import annotations

import math

import numpy as np
from scipy import ndimage as ndi
from scipy.spatial import cKDTree

from susleme import (Canvas, band, circle, ellipse, noise, equalize, smoothstep, soften, resample,
                     curvature_curve, leaf, mirror_x, rect)

C = lambda *v: np.array(v, np.float32) / 255.0  # noqa: E731

VITRAY = {
    'yakut': C(170, 22, 44), 'safir': C(28, 70, 170), 'zumrut': C(24, 120, 72), 'ametist': C(104, 44, 150),
    'kehribar': C(222, 150, 40), 'altin': C(236, 196, 90), 'gok': C(70, 140, 210), 'gul': C(206, 70, 110),
}


# ------------------------------------------------------------------ geometri
def pointed_arch(cx, y_spring, w, r_ratio=1.0, y_bottom=None, n=48):
    """Sivri (gotik) kemer çokgeni. r_ratio=1 eşkenar kemer, >1 mızrak (lancet)."""
    r = w * r_ratio
    c_l = cx - w / 2 + r
    c_r = cx + w / 2 - r
    t_apex = math.acos(max(-1.0, min(1.0, (w / 2 - r) / r)))
    th = np.linspace(math.pi, t_apex, n)
    left = np.stack([c_l + r * np.cos(th), y_spring - r * np.sin(th)], 1)
    right = np.stack([c_r - r * np.cos(th[::-1]), y_spring - r * np.sin(th[::-1])], 1)
    pts = np.concatenate([left, right[1:]])
    if y_bottom is not None:
        pts = np.concatenate([[[cx - w / 2, y_bottom]], pts, [[cx + w / 2, y_bottom]]])
    return pts


def arch_apex(y_spring, w, r_ratio=1.0):
    r = w * r_ratio
    t_apex = math.acos(max(-1.0, min(1.0, (w / 2 - r) / r)))
    return y_spring - r * math.sin(t_apex)


def foil(cx, cy, r, n=4, rot=0.0, lobe=0.52):
    """n yapraklı yonca: çevresel dairelerin birleşimi + orta dolgu."""
    out = []
    rc = r * (1 - lobe)
    rl = r * lobe
    for i in range(n):
        a = rot + i * 2 * math.pi / n
        out.append(circle(cx + rc * math.cos(a), cy + rc * math.sin(a), rl))
    out.append(circle(cx, cy, rc * 1.02))
    return out


def rose_openings(cx, cy, R, petals=12):
    """Gül pencerenin açıklıkları (cam alanları). Döndürür dict: tur -> şekil listesi.

    merkez: altı yapraklı yonca; yaprak: dışa bakan mızrak kemerler; uc: kemer uçları arasındaki
    dört yapraklı yoncalar; halka: en dıştaki küçük daireler.
    """
    o = {'merkez': [], 'yaprak': [], 'uc': [], 'halka': []}
    o['merkez'] += foil(cx, cy, R * 0.21, n=6, rot=math.pi / 6, lobe=0.46)
    w = 2 * math.pi * R * 0.55 / petals * 0.74
    for i in range(petals):
        a = -math.pi / 2 + i * 2 * math.pi / petals
        loc = pointed_arch(0, -R * 0.70, w, 1.15, y_bottom=-R * 0.285)
        c, s_ = math.cos(a + math.pi / 2), math.sin(a + math.pi / 2)
        o['yaprak'].append(np.stack([cx + c * loc[:, 0] - s_ * loc[:, 1], cy + s_ * loc[:, 0] + c * loc[:, 1]], 1))
        a2 = a + math.pi / petals
        o['uc'] += foil(cx + math.cos(a2) * R * 0.80, cy + math.sin(a2) * R * 0.80, R * 0.075, n=4, rot=a2, lobe=0.5)
    for i in range(petals * 2):
        a3 = -math.pi / 2 + (i + 0.5) * math.pi / petals
        o['halka'].append(circle(cx + math.cos(a3) * R * 0.945, cy + math.sin(a3) * R * 0.945, R * 0.035))
    return o


def rose_glass(S, R, seed=5, petals=12, cell=None):
    """Gül pencere: cam (RGB), taş maskesi, cam maskesi, kurşun. Kare görüntü, merkez ortada."""
    cv = Canvas(S, S, ss=3)
    cx = cy = S / 2
    o = rose_openings(cx, cy, R, petals)
    cell = cell or max(10, R * 0.06)
    groups = [
        ('merkez', [VITRAY['kehribar'], VITRAY['altin'], VITRAY['yakut']], [0.5, 0.3, 0.2]),
        ('yaprak', [VITRAY['safir'], VITRAY['gok'], VITRAY['yakut'], VITRAY['altin'], VITRAY['zumrut']], [0.42, 0.18, 0.2, 0.1, 0.1]),
        ('uc', [VITRAY['yakut'], VITRAY['ametist'], VITRAY['altin']], [0.55, 0.3, 0.15]),
        ('halka', [VITRAY['zumrut'], VITRAY['safir']], [0.6, 0.4]),
    ]
    rgb = np.zeros((S, S, 3), np.float32)
    lead = np.zeros((S, S), np.float32)
    m_all = np.zeros((S, S), np.float32)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    rr = np.hypot(xx - cx, yy - cy) / R
    for gi, (ad, pal, wts) in enumerate(groups):
        m = cv.mask(o[ad])
        # yapılandırılmış renk: yaprak boyunca iç kısım yakut/altın, dış kısım mavi
        if ad == 'yaprak':
            pattern = np.clip((0.78 - rr) / 0.5, 0, 1) * 0.55 + 0.05
        else:
            pattern = None
        g, l = stained_glass_w(m, seed + gi * 7, pal, wts, cell=cell * (0.8 if ad in ('uc', 'halka') else 1.0),
                               radial=(ad == 'yaprak'), rr=rr)
        rgb = rgb * (1 - m[..., None]) + g
        lead = np.maximum(lead, l)
        m_all = np.maximum(m_all, m)
    disk = cv.mask([circle(cx, cy, R)])
    return rgb, m_all, disk, lead


def lancet_window(cx, y_top, w, h, cv, mullion=True):
    """Tek mızrak pencere + (isteğe bağlı) içinde iki alt kemer ve üstte yonca (plate tracery)."""
    y_spring = y_top + w * 1.15
    outer = pointed_arch(cx, y_spring, w, 1.2, y_bottom=y_top + h)
    return outer, y_spring


# ------------------------------------------------------------------ vitray
def stained_glass(mask, seed, palette, cell=26, lead_w=1.6, glow=0.0, pattern=None):
    """Maskeli alanı Voronoi cam parçalarına böler, renklendirir, kurşun çizgi çizer.

    palette: renk listesi (HxWx3 dizi değil). pattern: HxW [0,1] -> palet indeksi seçimine etki.
    Döndürür (rgb, kursun_maskesi).
    """
    H, W = mask.shape
    rng = np.random.default_rng(seed)
    ys, xs = np.nonzero(mask > 0.5)
    if len(xs) == 0:
        return np.zeros((H, W, 3), np.float32), np.zeros((H, W), np.float32)
    area = len(xs)
    npts = max(8, int(area / (cell * cell)))
    pick = rng.choice(len(xs), size=min(npts, len(xs)), replace=False)
    pts = np.stack([ys[pick], xs[pick]], 1).astype(np.float32)
    pts += rng.random(pts.shape).astype(np.float32) - 0.5
    tree = cKDTree(pts)
    yy, xx = np.mgrid[0:H, 0:W]
    q = np.stack([yy.ravel(), xx.ravel()], 1)
    d, idx = tree.query(q, k=2)
    edge = (d[:, 1] - d[:, 0]).reshape(H, W)
    cell_id = idx[:, 0].reshape(H, W)
    # hücre renkleri
    pal = np.array(palette, np.float32)
    if pattern is not None:
        pv = pattern[pts[:, 0].astype(int).clip(0, H - 1), pts[:, 1].astype(int).clip(0, W - 1)]
        ci = np.clip((pv * len(pal)).astype(int), 0, len(pal) - 1)
        ci = np.where(rng.random(len(pts)) < 0.18, rng.integers(0, len(pal), len(pts)), ci)
    else:
        ci = rng.integers(0, len(pal), len(pts))
    cols = pal[ci] * (0.8 + 0.4 * rng.random((len(pts), 1))).astype(np.float32)
    rgb = cols[cell_id]
    # cam içi: kabarcık/dalga dokusu ve kenara doğru koyulaşma
    n1 = noise(H, W, 1.6, seed + 1)
    rgb = rgb * (0.82 + 0.3 * n1[..., None])
    inner = np.clip(edge / (cell * 0.5), 0, 1)
    rgb = rgb * (0.72 + 0.28 * inner[..., None])
    lead = 1 - smoothstep(lead_w * 0.5, lead_w * 1.3, edge)
    # açıklık kenarında kurşun
    border = mask - ndi.binary_erosion(mask > 0.5, iterations=max(1, int(lead_w))).astype(np.float32)
    lead = np.clip(np.maximum(lead, border), 0, 1) * (mask > 0.02)
    rgb = rgb * (1 - lead[..., None]) + C(22, 18, 24) * lead[..., None]
    rgb = rgb * mask[..., None]
    return np.clip(rgb, 0, 1), lead


def stained_glass_w(mask, seed, palette, weights, cell=26, lead_w=1.6, radial=False, rr=None):
    """Ağırlıklı paletle vitray. radial=True ise iç halkalar vurgu renklerine kayar."""
    H, W = mask.shape
    rng = np.random.default_rng(seed)
    ys, xs = np.nonzero(mask > 0.5)
    if len(xs) == 0:
        return np.zeros((H, W, 3), np.float32), np.zeros((H, W), np.float32)
    npts = max(6, int(len(xs) / (cell * cell)))
    pick = rng.choice(len(xs), size=min(npts, len(xs)), replace=False)
    pts = np.stack([ys[pick], xs[pick]], 1).astype(np.float32) + rng.random((len(pick), 2)).astype(np.float32) - 0.5
    tree = cKDTree(pts)
    # yalnız maskenin sınır kutusunda sorgula (hız)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    by, bx = np.mgrid[y0:y1, x0:x1]
    d, idx = tree.query(np.stack([by.ravel(), bx.ravel()], 1), k=2)
    edge = np.full((H, W), 99.0, np.float32)
    cid = np.zeros((H, W), np.int64)
    edge[y0:y1, x0:x1] = (d[:, 1] - d[:, 0]).reshape(y1 - y0, x1 - x0)
    cid[y0:y1, x0:x1] = idx[:, 0].reshape(y1 - y0, x1 - x0)
    pal = np.array(palette, np.float32)
    wts = np.array(weights, np.float64)
    wts /= wts.sum()
    ci = rng.choice(len(pal), size=len(pts), p=wts)
    if radial and rr is not None:
        prr = rr[pts[:, 0].astype(int).clip(0, H - 1), pts[:, 1].astype(int).clip(0, W - 1)]
        inner = prr < 0.46
        ci = np.where(inner & (rng.random(len(pts)) < 0.7), rng.choice([2, 3], size=len(pts)), ci)
    cols = pal[ci] * (0.78 + 0.42 * rng.random((len(pts), 1))).astype(np.float32)
    rgb = cols[cid]
    n1 = noise(H, W, 1.6, seed + 1)
    rgb = rgb * (0.84 + 0.28 * n1[..., None])
    inner_e = np.clip(edge / (cell * 0.45), 0, 1)
    rgb = rgb * (0.7 + 0.3 * inner_e[..., None])
    lead = 1 - smoothstep(lead_w * 0.5, lead_w * 1.3, edge)
    border = mask - ndi.binary_erosion(mask > 0.5, iterations=max(1, int(round(lead_w)))).astype(np.float32)
    lead = np.clip(np.maximum(lead, border), 0, 1) * (mask > 0.02)
    rgb = rgb * (1 - lead[..., None]) + C(20, 16, 22) * lead[..., None]
    return np.clip(rgb * mask[..., None], 0, 1), lead


def crockets_along(pts, spacing, size, outward_sign=1.0):
    """Kenar boyunca kıvrık yaprak düğümleri (gotik 'crocket')."""
    pts = resample(np.asarray(pts, float), 400)
    L = float(np.linalg.norm(np.diff(pts, axis=0), axis=1).sum())
    k = max(1, int(L // spacing))
    from susleme import normals_of
    nr = normals_of(pts)
    out = []
    for i in range(k):
        j = int((i + 0.5) / k * (len(pts) - 1))
        p = pts[j]
        t = pts[min(j + 3, len(pts) - 1)] - pts[max(j - 3, 0)]
        a = math.atan2(t[1], t[0])
        base = p + nr[j] * outward_sign * size * 0.1
        sp = curvature_curve(base[0], base[1], a + outward_sign * -1.2, size,
                             lambda u: outward_sign * 3.5 * u ** 1.5 / size, 30)
        out.append(leaf(sp, size * 0.55, lobes=2, lobe_depth=0.3, tip_taper=0.8))
        out.append(circle(sp[-1, 0], sp[-1, 1], size * 0.14))
    return out


def cusps_along(pts, count, depth, inward_sign=1.0):
    """Kemer içi dilimleme (cusping): kenar ile içe doğru taraklı çizgi arasındaki bant."""
    from susleme import scalloped, normals_of
    pts = resample(np.asarray(pts, float), max(200, count * 20))
    nr = normals_of(pts)
    inner = pts + nr * inward_sign * depth
    sc = scalloped(inner, count, lambda t: -depth * 0.8, 1.0, 0.5)
    # scalloped normal yönü eğriye göre; içe bakan uçlar için işaret düzelt
    return [np.concatenate([pts, sc[::-1]])]


def star8(cx, cy, r, rot=0.0, inner=0.42):
    """Sekiz köşeli yıldız (Sainte-Chapelle tavanı gibi)."""
    a = np.arange(16) * math.pi / 8 + rot
    rr = np.where(np.arange(16) % 2 == 0, r, r * inner)
    return np.stack([cx + rr * np.cos(a), cy + rr * np.sin(a)], 1)


def star_field(w, h, spacing=110, rmin=9, rmax=15, seed=3):
    rng = np.random.default_rng(seed)
    out = []
    for j, y in enumerate(np.arange(spacing / 2, h, spacing * 0.866)):
        off = spacing / 2 if j % 2 else 0
        for x in np.arange(off, w + spacing, spacing):
            jx, jy = (rng.random(2) - 0.5) * spacing * 0.2
            out.append(star8(x + jx, y + jy, rmin + (rmax - rmin) * rng.random(), rot=rng.random() * 0.4))
    return out


def pinnacle(cx, y_top, w, h):
    """Pinakl: gövde + üçgen külah + tepe süsü (finial). Döndürür (gövde, külah, tepe) şekilleri."""
    body_top = y_top + h * 0.38
    body = [rect(cx - w / 2, body_top, cx + w / 2, y_top + h)]
    spire = [np.array([[cx - w * 0.62, body_top], [cx + w * 0.62, body_top], [cx, y_top]], float)]
    fin = [circle(cx, y_top - w * 0.12, w * 0.16)] + foil(cx, y_top - w * 0.42, w * 0.26, n=4, rot=math.pi / 4)
    return body, spire, fin
