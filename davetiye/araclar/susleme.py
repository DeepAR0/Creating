"""Prosedürel süsleme ve kabartma kütüphanesi.

Barok / gotik davetiye görsellerini (zarf, çerçeve, fresk vb.) kod ile üretmek
için kullanılan ortak yardımcılar:

* gürültü (FFT tabanlı, döşenebilir)
* eğrilik tabanlı kıvrım eğrileri (volüt, C/S kıvrımı), incelen şeritler
* akantus yaprağı, deniz kabuğu, rozet, boncuk dizisi gibi motifler
* süper-örneklemeli rasterleştirme (PIL)
* maske -> kabartma yüksekliği, SDF pervaz profilleri
* yükseklik haritasından normal ve "pişmiş" ışıklandırma (WebGL gölgelendiricisi
  ile aynı model; bkz. motor/zarf-gl.js)

Tüm koordinatlar hedef dokunun piksel biriminde, y aşağı doğrudur.
"""
from __future__ import annotations

import math
from typing import Callable, Iterable, Sequence

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

TAU = math.tau


# ---------------------------------------------------------------- gürültü
def noise(h: int, w: int, beta: float = 2.0, seed: int = 0,
          stretch: tuple[float, float] = (1.0, 1.0)) -> np.ndarray:
    """1/f^beta fraktal gürültü, [0,1] aralığında, kenarlardan döşenebilir.

    stretch=(sy, sx): frekans uzayında esneterek yönlü (ör. lifli) doku verir.
    """
    rng = np.random.default_rng(seed)
    F = np.fft.fft2(rng.standard_normal((h, w)))
    fy = np.fft.fftfreq(h)[:, None] * stretch[0]
    fx = np.fft.fftfreq(w)[None, :] * stretch[1]
    f = np.hypot(fx, fy)
    f[0, 0] = 1.0
    F *= f ** (-beta / 2.0)
    F[0, 0] = 0.0
    n = np.fft.ifft2(F).real
    n -= n.min()
    n /= max(n.max(), 1e-9)
    return n.astype(np.float32)


def equalize(n: np.ndarray) -> np.ndarray:
    """Değerleri sıralamaya göre [0,1] düzgün dağılıma çevirir (eşik kontrolü kolaylaşır)."""
    flat = n.ravel()
    r = np.empty_like(flat)
    r[np.argsort(flat, kind='stable')] = np.linspace(0.0, 1.0, flat.size, dtype=np.float32)
    return r.reshape(n.shape).astype(np.float32)


def scalloped(curve: np.ndarray, count: int, amp: float, sign: float = 1.0, power: float = 0.6,
              phase: float = 0.0) -> np.ndarray:
    """Eğriyi normali yönünde tarak/tüy ucu şeklinde dalgalandırır."""
    curve = resample(curve, max(40, count * 16))
    t = np.linspace(0, 1, len(curve))
    a = amp(t) if callable(amp) else amp
    off = a * np.abs(np.sin(np.pi * count * t + phase)) ** power
    return curve + normals_of(curve) * (sign * off)[:, None]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def remap(x, a, b, c=0.0, d=1.0):
    return c + (d - c) * np.clip((x - a) / (b - a), 0.0, 1.0)


# ---------------------------------------------------------------- geometri
def bezier(p0, p1, p2, p3, n: int = 64) -> np.ndarray:
    t = np.linspace(0.0, 1.0, n)[:, None]
    p0, p1, p2, p3 = (np.asarray(p, float) for p in (p0, p1, p2, p3))
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3


def bezier_path(segments: Sequence[Sequence], n: int = 48) -> np.ndarray:
    """Birbirine bağlı kübik Bézier parçalarından nokta dizisi."""
    out = []
    for i, seg in enumerate(segments):
        pts = bezier(*seg, n=n)
        out.append(pts if i == 0 else pts[1:])
    return np.concatenate(out)


def curvature_curve(x: float, y: float, heading: float, length: float,
                    kappa: Callable[[np.ndarray], np.ndarray] | float,
                    n: int = 240) -> np.ndarray:
    """Yay uzunluğuna göre eğrilik fonksiyonundan eğri (Euler/klotoid benzeri).

    kappa(u) u∈[0,1] için 1/px cinsinden eğrilik döndürür. Barok kıvrımlar
    doğal olarak bu yolla (eğriliği artan uç = volüt) elde edilir.
    """
    u = np.linspace(0.0, 1.0, n)
    k = np.full(n, float(kappa)) if not callable(kappa) else np.asarray(kappa(u), float)
    ds = length / (n - 1)
    th = heading + np.concatenate([[0.0], np.cumsum(0.5 * (k[1:] + k[:-1]) * ds)])
    cx = x + np.concatenate([[0.0], np.cumsum(0.5 * (np.cos(th[1:]) + np.cos(th[:-1])) * ds)])
    cy = y + np.concatenate([[0.0], np.cumsum(0.5 * (np.sin(th[1:]) + np.sin(th[:-1])) * ds)])
    return np.stack([cx, cy], 1)


def spiral_kappa(r0: float, pitch: float = 0.18, start: float = 0.0):
    """Logaritmik spirale yaklaşan eğrilik: yarıçap yay boyunca doğrusal azalır."""
    def k(u, L):
        return 1.0 / np.maximum(r0 - (u - start).clip(0) * L * pitch, r0 * 0.04)
    return k


def volute(x: float, y: float, heading: float, r0: float, turns: float = 1.35,
           pitch: float = 0.16, lead: float = 0.0, sign: float = 1.0, n: int = 260) -> np.ndarray:
    """Başlangıçta düz/az kavisli bir 'lead' bölümü, sonra içe kıvrılan volüt."""
    # spiralin toplam uzunluğunu dönüş sayısına göre tahmin et
    L_sp = 0.0
    r = r0
    ang = 0.0
    step = r0 * 0.02
    while ang < turns * TAU and r > r0 * 0.05:
        L_sp += step
        r = r0 - L_sp * pitch
        ang += step / max(r, 1e-3)
    L = lead + L_sp

    def kap(u):
        s = u * L
        k = np.where(s < lead, sign * (s / max(lead, 1e-6)) ** 2 / r0 * 0.9,
                     sign / np.maximum(r0 - (s - lead) * pitch, r0 * 0.05))
        return k

    return curvature_curve(x, y, heading, L, kap, n)


def resample(pts: np.ndarray, n: int) -> np.ndarray:
    pts = np.asarray(pts, float)
    d = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
    t = np.linspace(0, d[-1], n)
    return np.stack([np.interp(t, d, pts[:, 0]), np.interp(t, d, pts[:, 1])], 1)


def polyline_length(pts) -> float:
    return float(np.linalg.norm(np.diff(np.asarray(pts, float), axis=0), axis=1).sum())


def normals_of(pts: np.ndarray) -> np.ndarray:
    t = np.gradient(np.asarray(pts, float), axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True) + 1e-9
    return np.stack([-t[:, 1], t[:, 0]], 1)


def band(pts, width, cap: bool = True, cap_end: bool | None = None) -> list[np.ndarray]:
    """Eğri boyunca genişliği değişen şerit. width: sayı, dizi ya da u->w fonksiyonu."""
    pts = np.asarray(pts, float)
    n = len(pts)
    u = np.linspace(0.0, 1.0, n)
    if callable(width):
        w = np.asarray(width(u), float)
    else:
        w = np.broadcast_to(np.asarray(width, float), (n,)).astype(float)
    nr = normals_of(pts)
    L = pts + nr * (w[:, None] / 2)
    R = pts - nr * (w[:, None] / 2)
    shapes = [np.concatenate([L, R[::-1]])]
    if cap and w[0] > 1.0:
        shapes.append(circle(pts[0, 0], pts[0, 1], w[0] / 2))
    if (cap if cap_end is None else cap_end) and w[-1] > 1.0:
        shapes.append(circle(pts[-1, 0], pts[-1, 1], w[-1] / 2))
    return shapes


def circle(cx: float, cy: float, r: float, n: int | None = None) -> np.ndarray:
    n = n or max(24, int(r * 1.2))
    a = np.linspace(0, TAU, n, endpoint=False)
    return np.stack([cx + r * np.cos(a), cy + r * np.sin(a)], 1)


def ellipse(cx, cy, rx, ry, rot: float = 0.0, n: int | None = None) -> np.ndarray:
    n = n or max(32, int(max(rx, ry) * 1.2))
    a = np.linspace(0, TAU, n, endpoint=False)
    x, y = rx * np.cos(a), ry * np.sin(a)
    c, s = math.cos(rot), math.sin(rot)
    return np.stack([cx + c * x - s * y, cy + s * x + c * y], 1)


def rect(x0, y0, x1, y1) -> np.ndarray:
    return np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], float)


def rounded_rect(x0, y0, x1, y1, r, n=10) -> np.ndarray:
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        a = np.radians(np.linspace(a0, a0 + 90, n))
        pts.append(np.stack([cx + r * np.cos(a), cy + r * np.sin(a)], 1))
    return np.concatenate(pts)


def transform(shapes, dx=0.0, dy=0.0, sx=1.0, sy=None, rot=0.0, ox=0.0, oy=0.0):
    """Şekil listesini (veya tek şekli) ölçekle/döndür/taşı. (ox,oy) dönüş merkezi."""
    sy = sx if sy is None else sy
    c, s = math.cos(rot), math.sin(rot)

    def one(p):
        p = np.asarray(p, float)
        x = (p[:, 0] - ox) * sx
        y = (p[:, 1] - oy) * sy
        return np.stack([ox + c * x - s * y + dx, oy + s * x + c * y + dy], 1)

    if isinstance(shapes, np.ndarray) and shapes.ndim == 2:
        return one(shapes)
    return [one(p) for p in shapes]


def mirror_x(shapes, cx: float):
    """x = cx eksenine göre ayna görüntüsü (simetrik barok kompozisyon için)."""
    def one(p):
        p = np.asarray(p, float).copy()
        p[:, 0] = 2 * cx - p[:, 0]
        return p[::-1]
    if isinstance(shapes, np.ndarray) and shapes.ndim == 2:
        return one(shapes)
    return [one(p) for p in shapes]


def mirror_y(shapes, cy: float):
    def one(p):
        p = np.asarray(p, float).copy()
        p[:, 1] = 2 * cy - p[:, 1]
        return p[::-1]
    if isinstance(shapes, np.ndarray) and shapes.ndim == 2:
        return one(shapes)
    return [one(p) for p in shapes]


def sym(shapes, cx: float):
    """Şekiller + x-aynası."""
    return list(shapes) + mirror_x(list(shapes), cx)


# ---------------------------------------------------------------- motifler
def leaf(spine: np.ndarray, width: float, lobes: int = 4, lobe_depth: float = 0.35,
         tip_taper: float = 0.8, asym: float = 0.0, serr: float = 0.0) -> np.ndarray:
    """Omurga eğrisi boyunca loblu (akantus benzeri) yaprak çokgeni."""
    spine = resample(spine, 180)
    n = len(spine)
    u = np.linspace(0, 1, n)
    base = np.sin(np.pi * np.clip(u, 0, 1) ** tip_taper) ** 0.75
    nr = normals_of(spine)

    def side(phase):
        lob = np.abs(np.sin(np.pi * lobes * u + phase)) ** 0.55
        wv = base * (1 - lobe_depth + lobe_depth * lob)
        if serr:
            wv *= 1 - serr * (np.abs(np.sin(np.pi * lobes * 3 * u + phase)) ** 3)
        return wv

    wl = side(0.0) * width * (1 + asym) / 2
    wr = side(0.9) * width * (1 - asym) / 2
    L = spine + nr * wl[:, None]
    R = spine - nr * wr[:, None]
    return np.concatenate([L, R[::-1]])


def acanthus_scroll(x, y, heading, size, sign=1.0, leaves=5, turns=1.2, stem_w=None,
                    leaf_w=None, lead=None) -> dict:
    """Volüt gövde + gövdenin dış tarafından çıkan akantus yaprakları.

    Döndürür: {'stem': [...], 'leaves': [...], 'eye': [...], 'spine': pts}
    """
    stem_w = stem_w or size * 0.11
    leaf_w = leaf_w or size * 0.34
    lead = size * 0.9 if lead is None else lead
    pts = volute(x, y, heading, size * 0.42, turns=turns, pitch=0.13, lead=lead, sign=sign)
    n = len(pts)
    u = np.linspace(0, 1, n)
    stem = band(pts, lambda t: stem_w * (1.0 - 0.72 * t ** 1.4), cap=True)
    nr = normals_of(pts)
    leaves_out = []
    # yapraklar gövdenin dış tarafında, uç kısma doğru küçülür
    for i in range(leaves):
        t0 = 0.08 + 0.62 * i / max(leaves - 1, 1)
        j = int(t0 * (n - 1))
        p = pts[j]
        tang = pts[min(j + 3, n - 1)] - pts[max(j - 3, 0)]
        ang = math.atan2(tang[1], tang[0])
        outward = -sign  # volütün dış tarafı
        scale = (1.0 - 0.55 * t0)
        L = size * 0.62 * scale
        dirn = ang + outward * 0.55
        sp = curvature_curve(p[0] + nr[j, 0] * outward * stem_w * 0.3, p[1] + nr[j, 1] * outward * stem_w * 0.3,
                             dirn, L, lambda uu, s=scale: sign * (0.6 + 3.2 * uu ** 2.2) / (size * 0.62 * s), 80)
        leaves_out.append(leaf(sp, leaf_w * scale, lobes=3, lobe_depth=0.42, tip_taper=0.7, serr=0.18))
    end = pts[-1]
    eye = [circle(end[0], end[1], stem_w * 0.55)]
    return {'stem': stem, 'leaves': leaves_out, 'eye': eye, 'spine': pts}


def _turn_sign(pts: np.ndarray, at_end: bool) -> float:
    """Eğrinin ucundaki dönüş yönü (+1: açı artıyor / ekranda saat yönü)."""
    seg = pts[-12:] if at_end else pts[:12]
    t = np.diff(seg, axis=0)
    cr = t[:-1, 0] * t[1:, 1] - t[:-1, 1] * t[1:, 0]
    s = float(np.sign(cr.sum()))
    return s if s != 0 else 1.0


def _scroll_from_arc(arc: np.ndarray, width: float, curl0: float, curl1: float,
                     turns0: float, turns1: float, flip0: bool, flip1: bool, L: float,
                     taper_mid: float = 0.0) -> dict:
    """Bir yayın iki ucuna volüt ekleyip genişliği ayarlanmış şerit üretir.

    flipX=False iken volüt, yayın o uçtaki dönüşünü sürdürür (C davranışı).
    """
    s_end = _turn_sign(arc, True) * (-1 if flip1 else 1)
    s_st = _turn_sign(arc, False) * (-1 if flip0 else 1)
    t_end = arc[-1] - arc[-4]
    t_st = arc[0] - arc[3]
    parts = [arc]
    v0 = v1 = None
    if curl1 > 0:
        v1 = volute(arc[-1, 0], arc[-1, 1], math.atan2(t_end[1], t_end[0]), L * curl1,
                    turns=turns1, pitch=0.15, lead=L * curl1 * 0.5, sign=s_end)
    if curl0 > 0:
        # geriye doğru üretilen volüt: ters yönde dönmeli
        v0 = volute(arc[0, 0], arc[0, 1], math.atan2(t_st[1], t_st[0]), L * curl0,
                    turns=turns0, pitch=0.15, lead=L * curl0 * 0.5, sign=-s_st)
    spine = arc
    if v0 is not None:
        spine = np.concatenate([v0[::-1], spine[1:]])
    if v1 is not None:
        spine = np.concatenate([spine[:-1], v1])
    n = len(spine)
    m0 = len(v0) if v0 is not None else 0
    m1 = n - (len(v1) if v1 is not None else 0)

    def wf(t):
        idx = t * (n - 1)
        w = np.full_like(t, width, dtype=float)
        if taper_mid:
            w = w * (1 - taper_mid * np.sin(np.pi * np.clip((idx - m0) / max(m1 - m0, 1), 0, 1)))
        if m0:
            w = np.where(idx < m0, width * (0.32 + 0.68 * (idx / m0) ** 0.8), w)
        if m1 < n:
            w = np.where(idx > m1, width * (0.32 + 0.68 * ((n - 1 - idx) / max(n - 1 - m1, 1)) ** 0.8), w)
        return w

    shapes = band(spine, wf, cap=True)
    eyes = []
    if v0 is not None:
        eyes.append(circle(v0[-1, 0], v0[-1, 1], width * 0.40))
    if v1 is not None:
        eyes.append(circle(v1[-1, 0], v1[-1, 1], width * 0.40))
    return {'band': shapes, 'eyes': eyes, 'spine': spine, 'arc': arc}


def c_scroll(p0, p1, bulge: float = 0.35, curl0: float = 0.18, curl1: float = 0.18,
             width: float = 18.0, turns: float = 1.1, taper_mid: float = 0.0) -> dict:
    """İki ucu da C'nin içine doğru kıvrılan C-kıvrımı. bulge>0: p0->p1 yönünün soluna şişer."""
    p0 = np.asarray(p0, float)
    p1 = np.asarray(p1, float)
    d = p1 - p0
    L = float(np.linalg.norm(d))
    nrm = np.array([d[1], -d[0]]) / L        # ekranda yönün solu (y aşağı)
    c = (p0 + p1) / 2 + nrm * bulge * L
    arc = bezier(p0, p0 + (c - p0) * 1.1 + d * -0.08, p1 + (c - p1) * 1.1 + d * 0.08, p1, n=140)
    return _scroll_from_arc(arc, width, curl0, curl1, turns, turns, False, False, L, taper_mid)


def s_scroll(p0, p1, bulge=0.25, width=16.0, curl0=0.2, curl1=0.2, turns=1.0) -> dict:
    """S-kıvrımı: iki uç zıt yönlere kıvrılır."""
    p0 = np.asarray(p0, float)
    p1 = np.asarray(p1, float)
    d = p1 - p0
    L = float(np.linalg.norm(d))
    nrm = np.array([d[1], -d[0]]) / L
    a = p0 + d * 0.30 + nrm * bulge * L
    b = p0 + d * 0.70 - nrm * bulge * L
    arc = bezier(p0, a, b, p1, n=140)
    return _scroll_from_arc(arc, width, curl0, curl1, turns, turns, False, False, L)


def acanthus_leaf(spine: np.ndarray, width: float, fingers: int = 4, spread: float = 0.9,
                  finger_w: float = 0.22, sides=(1, -1), curl: float = 1.0) -> dict:
    """Parmaklı akantus yaprağı: omurga + öne doğru kıvrılan sivri parmaklar + ağ (yaprak ayası).

    Döndürür {'blade': [...], 'fingers': [...], 'rib': [...]}.
    """
    spine = resample(spine, 160)
    n = len(spine)
    L = polyline_length(spine)
    nr = normals_of(spine)
    tang = np.gradient(spine, axis=0)
    ang = np.arctan2(tang[:, 1], tang[:, 0])
    fingers_out = []
    blade_l, blade_r = [], []
    for side in sides:
        tips = []
        for i in range(fingers):
            t = 0.12 + 0.70 * i / max(fingers - 1, 1)
            j = int(t * (n - 1))
            a0 = ang[j] + side * spread * (1 - 0.55 * t)      # side=+1 -> normal (nr) tarafı
            fl = width * (0.95 - 0.45 * t) * (1.0 if i < fingers - 1 else 0.8)
            base = spine[j] + nr[j] * side * width * 0.08
            # parmak yaprak ucuna doğru kıvrılır
            pts = curvature_curve(base[0], base[1], a0, fl,
                                  lambda u, s=side: -s * curl * (0.3 + 2.4 * u ** 1.6) / fl, 50)
            fingers_out += band(pts, lambda u, w0=width * finger_w * (1 - 0.35 * t): w0 * (1 - u) ** 0.85 + 0.4,
                                cap=True, cap_end=False)
            tips.append(pts[int(len(pts) * 0.55)])
        edge = np.array([spine[int(0.04 * (n - 1))]] + tips + [spine[-1]])
        (blade_l if side == 1 else blade_r).append(edge)
    blade = []
    if blade_l and blade_r:
        blade.append(np.concatenate([blade_l[0], blade_r[0][::-1]]))
    elif blade_l:
        blade.append(np.concatenate([blade_l[0], spine[::-1]]))
    elif blade_r:
        blade.append(np.concatenate([spine, blade_r[0][::-1]]))
    rib = band(spine, lambda u: width * 0.13 * (1 - u) + 0.8, cap=True, cap_end=False)
    # yaprak ucu (omurganın sonu) sivri parmak
    tip = curvature_curve(spine[-1, 0], spine[-1, 1], ang[-1], width * 0.45,
                          lambda u: 0.0 * u, 20)
    fingers_out += band(tip, lambda u: width * 0.16 * (1 - u) + 0.4, cap=True, cap_end=False)
    return {'blade': blade, 'fingers': fingers_out, 'rib': rib}


def shell(cx, cy, r, ang=-math.pi / 2, spread=math.radians(150), ribs=11, depth=0.14) -> dict:
    """Rokay deniz kabuğu: tabandan yayılan kaburgalar, dalgalı dış kenar."""
    angs = np.linspace(ang - spread / 2, ang + spread / 2, ribs)
    outer = []
    for i in range(len(angs) - 1):
        a0, a1 = angs[i], angs[i + 1]
        am = (a0 + a1) / 2
        # kaburgalar arası tarak kenarı (dışa taşan yay)
        seg = np.linspace(a0, a1, 14)
        rr = r * (1 + depth * np.sin(np.linspace(0, np.pi, 14)))
        outer.append(np.stack([cx + rr * np.cos(seg), cy + rr * np.sin(seg)], 1))
    outer = np.concatenate(outer)
    fan = np.concatenate([[[cx, cy]], outer])
    ribs_out = []
    for a in angs[1:-1]:
        p = np.array([[cx + r * 0.12 * math.cos(a), cy + r * 0.12 * math.sin(a)],
                      [cx + r * 1.02 * math.cos(a), cy + r * 1.02 * math.sin(a)]])
        ribs_out += band(resample(p, 40), lambda t: r * 0.075 * (0.3 + 0.7 * t), cap=True)
    return {'fan': [fan], 'ribs': ribs_out}


def rosette(cx, cy, r, petals=8, inner=0.35, rot=0.0) -> dict:
    out = []
    for i in range(petals):
        a = rot + i * TAU / petals
        sp = np.array([[cx + r * inner * 0.6 * math.cos(a), cy + r * inner * 0.6 * math.sin(a)],
                       [cx + r * math.cos(a), cy + r * math.sin(a)]])
        out.append(leaf(resample(sp, 40), r * 0.62, lobes=1, lobe_depth=0.0, tip_taper=0.9))
    return {'petals': out, 'center': [circle(cx, cy, r * inner)]}


def beads_along(pts, spacing: float, rx: float, ry: float | None = None, offset: float = 0.0) -> list:
    """Eğri boyunca boncuk dizisi (boncuk pervaz)."""
    ry = rx if ry is None else ry
    pts = np.asarray(pts, float)
    L = polyline_length(pts)
    k = max(1, int(L // spacing))
    rs = resample(pts, 2000)
    d = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(rs, axis=0), axis=1))])
    out = []
    for i in range(k):
        s = offset + i * L / k
        j = int(np.searchsorted(d, s))
        j = min(max(j, 1), len(rs) - 2)
        t = rs[j + 1] - rs[j - 1]
        out.append(ellipse(rs[j, 0], rs[j, 1], rx, ry, math.atan2(t[1], t[0]), n=20))
    return out


def rays(cx, cy, r0, r1, count, width0, wavy=False, phase=0.0, amp=0.0, waves=3.0,
         a0=-math.pi, a1=0.0) -> list:
    """Işık huzmesi (gloria) şeritleri; wavy=True ise alev gibi dalgalı."""
    out = []
    for i in range(count):
        a = a0 + (a1 - a0) * (i + 0.5) / count + phase
        t = np.linspace(0, 1, 90)
        r = r0 + (r1 - r0) * t
        off = amp * np.sin(t * waves * TAU) * t if wavy else 0 * t
        x = cx + r * np.cos(a) - off * np.sin(a)
        y = cy + r * np.sin(a) + off * np.cos(a)
        out += band(np.stack([x, y], 1), lambda u: width0 * (1 - u) ** 0.9 + 0.6, cap=False)
    return out


def dove(cx, cy, s=1.0, rot=0.0, flip=False, wing=0.0) -> list:
    """Uçan güvercin silueti (ilkel şekillerden). wing: -1 aşağı .. 1 yukarı kanat."""
    parts = []
    parts.append(ellipse(0, 0, 60, 22, 0.0))                 # gövde
    parts.append(circle(52, -14, 16))                        # baş
    parts.append(np.array([[66, -16], [86, -10], [66, -8]], float))  # gaga
    # kuyruk yelpazesi
    for k in range(5):
        a = math.radians(170 + (k - 2) * 9)
        sp = np.array([[-40, 2], [-40 + 62 * math.cos(a), 2 + 62 * math.sin(a) * 0.7 + (k - 2) * 4]])
        parts.append(leaf(resample(sp, 30), 22, lobes=1, lobe_depth=0.0, tip_taper=0.6))
    # kanatlar: tüy yelpazesi
    for side in (-1, 1):
        base = np.array([8.0, -10.0 if side < 0 else -6.0])
        lift = (0.9 + 0.5 * wing) if side < 0 else (0.55 + 0.4 * wing)
        for k in range(7):
            a = math.radians(-100 + k * 12) - side * 0.15
            ln = 110 - k * 8
            tip = base + np.array([math.cos(a) * ln * 0.55 - k * 7, math.sin(a) * ln * lift])
            sp = np.stack([np.linspace(base[0], tip[0], 30), np.linspace(base[1], tip[1], 30)], 1)
            parts.append(leaf(sp, 26 - k * 1.2, lobes=1, lobe_depth=0.0, tip_taper=0.55))
        parts.append(ellipse(base[0] - 8, base[1] - 22 * lift, 34, 26 * lift, -0.4 * side))
    if flip:
        parts = mirror_x(parts, 0.0)
    return transform(parts, dx=cx, dy=cy, sx=s, rot=rot)


# ---------------------------------------------------------------- raster
class Canvas:
    """Süper-örneklemeli maske rasterleştirici."""

    def __init__(self, w: int, h: int, ss: int = 4):
        self.w, self.h, self.ss = int(w), int(h), int(ss)

    def mask(self, shapes: Iterable, erase: Iterable = (), blur: float = 0.0) -> np.ndarray:
        ss = self.ss
        img = Image.new('L', (self.w * ss, self.h * ss), 0)
        d = ImageDraw.Draw(img)
        for p in shapes:
            p = np.asarray(p, float) * ss
            if len(p) >= 3:
                d.polygon([tuple(q) for q in p.tolist()], fill=255)
        for p in erase:
            p = np.asarray(p, float) * ss
            if len(p) >= 3:
                d.polygon([tuple(q) for q in p.tolist()], fill=0)
        img = img.resize((self.w, self.h), Image.BOX)
        m = np.asarray(img, np.float32) / 255.0
        if blur:
            m = ndi.gaussian_filter(m, blur)
        return m


def flatten(*groups) -> list:
    out = []
    for g in groups:
        if isinstance(g, dict):
            for v in g.values():
                if isinstance(v, list):
                    out += v
        elif isinstance(g, np.ndarray) and g.ndim == 2:
            out.append(g)
        else:
            out += list(g)
    return out


# ---------------------------------------------------------------- kabartma
def emboss(m: np.ndarray, sigma: float, shape: str = 'round') -> np.ndarray:
    """Maskeden yastık kabartma: kenarda 0, içeride ~1; ince parçalar daha alçak."""
    b = ndi.gaussian_filter(m.astype(np.float32), sigma)
    h = np.clip((b - 0.5) * 2.0, 0.0, 1.0)
    if shape == 'round':
        h = 1.0 - (1.0 - h) ** 2
    elif shape == 'dome':
        h = np.sqrt(h)
    elif shape == 'soft':
        h = h * h * (3 - 2 * h)
    # kenar yumuşatma (maske kenarında sıfıra iner)
    return (h * np.clip(m * 1.5, 0, 1)).astype(np.float32)


def sdf(m: np.ndarray, ss: int = 2) -> np.ndarray:
    """Maskeden işaretli uzaklık alanı (px). İçeride negatif."""
    big = ndi.zoom(m.astype(np.float32), ss, order=1)
    inside = big > 0.5
    di = ndi.distance_transform_edt(inside)
    do = ndi.distance_transform_edt(~inside)
    sd = (do - di) / ss
    h, w = m.shape
    sd = sd[:h * ss, :w * ss].reshape(h, ss, w, ss).mean((1, 3))
    return sd.astype(np.float32)


def profile(sd: np.ndarray, segs: Sequence[tuple], start: float = 0.0, outward: bool = False):
    """SDF'e pervaz profili uygula.

    segs: sınırdan içeri (outward=True ise dışarı) sırayla (genişlik, tür, a, b)
      tür: 'lin'  a->b doğrusal
           'bead' a tabanında b yüksekliğinde yarım yuvarlak boncuk
           'cove' a->b içbükey
           'ogee' a->b S profil
           'flat' sabit a
    Döndürür (yükseklik, bant_maskesi, segment_maskeleri)
    """
    t = sd if outward else -sd
    H = np.zeros_like(sd, dtype=np.float32)
    masks = []
    pos = start
    for (w, kind, a, b) in segs:
        u = (t - pos) / w
        ins = (u >= 0) & (u < 1)
        uc = np.clip(u, 0, 1)
        if kind == 'lin':
            v = a + (b - a) * uc
        elif kind == 'bead':
            v = a + b * np.sqrt(np.clip(1 - (2 * uc - 1) ** 2, 0, 1))
        elif kind == 'cove':
            v = a + (b - a) * (1 - np.sqrt(np.clip(1 - uc ** 2, 0, 1)))
        elif kind == 'ogee':
            v = a + (b - a) * (0.5 - 0.5 * np.cos(np.pi * uc))
        elif kind == 'flat':
            v = np.full_like(uc, a)
        else:
            raise ValueError(kind)
        H = np.where(ins, v, H)
        masks.append(ins.astype(np.float32))
        pos += w
    band_m = ((t >= start) & (t < pos)).astype(np.float32)
    return H.astype(np.float32), band_m, masks


def soften(a: np.ndarray, s: float = 0.7) -> np.ndarray:
    return ndi.gaussian_filter(a.astype(np.float32), s)


def cavity(h: np.ndarray, r: float = 6.0) -> np.ndarray:
    """Çukurluk: çevresinden alçak yerler pozitif (kir/ortam kapanması için)."""
    return np.clip(ndi.gaussian_filter(h, r) - h, 0, None)


def bleed_rgb(rgb: np.ndarray, alpha: np.ndarray, iters: int = 24) -> np.ndarray:
    """Saydam alanlara kenar renklerini taşır (WebGL doğrusal filtreleme saçağı önler)."""
    rgb = rgb.copy()
    known = alpha > 0.02
    if known.all():
        return rgb
    idx = ndi.distance_transform_edt(~known, return_distances=False, return_indices=True)
    return rgb[idx[0], idx[1]]


# ---------------------------------------------------------------- ışık
def normals(h: np.ndarray, hmax: float) -> np.ndarray:
    gy, gx = np.gradient(h.astype(np.float32) * hmax)
    n = np.dstack([-gx, -gy, np.ones_like(h, dtype=np.float32)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n


GOLD = np.array([0.86, 0.66, 0.30], np.float32)


def shade(albedo: np.ndarray, h: np.ndarray, metal: np.ndarray, hmax: float,
          light: tuple[float, float, float], matte: np.ndarray | None = None,
          amb: float = 0.42, light_col=(1.0, 0.95, 0.86), shadows: bool = True) -> np.ndarray:
    """WebGL zarf gölgelendiricisiyle aynı model (bkz. motor/zarf-gl.js).

    albedo: HxWx3 [0,1]; h: [0,1]; metal: [0,1]; light: (x, y, z) px
    """
    H, W = h.shape
    N = normals(h, hmax)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    Lv = np.dstack([light[0] - xx, light[1] - yy, np.full_like(xx, light[2]) - h * hmax])
    Lv /= np.linalg.norm(Lv, axis=2, keepdims=True)
    V = np.array([0, 0, 1], np.float32)
    Hv = Lv + V
    Hv /= np.linalg.norm(Hv, axis=2, keepdims=True)
    ndl = np.clip((N * Lv).sum(2), 0, 1)
    ndh = np.clip((N * Hv).sum(2), 0, 1)
    sh = np.ones_like(h)
    if shadows:
        # ışığa doğru yükseklik yürüyüşü (yumuşak gölge)
        dx, dy = Lv[..., 0], Lv[..., 1]
        dz = Lv[..., 2]
        hs = h * hmax
        for k in (2, 4, 7, 11, 16, 22):
            sx = np.clip(xx + dx / np.maximum(dz, 0.2) * k * 0.5, 0, W - 1)
            sy = np.clip(yy + dy / np.maximum(dz, 0.2) * k * 0.5, 0, H - 1)
            hk = ndi.map_coordinates(hs, [sy, sx], order=1)
            occ = np.clip((hk - hs - k * 0.5) / 3.0, 0, 1)
            sh = np.minimum(sh, 1 - 0.55 * occ)
    lc = np.array(light_col, np.float32)
    # kağıt / boya
    spec_p = ndh ** 26 * 0.10
    diffuse = albedo * (amb + (1.0 - amb) * 1.15 * ndl[..., None] * sh[..., None]) * lc
    paper = diffuse + spec_p[..., None] * lc
    if matte is not None:
        paper = np.where(matte[..., None] > 0.5, albedo * (0.62 + 0.45 * ndl[..., None] * sh[..., None]) * lc, paper)
    # metal (yaldız)
    Nz = N[..., 2]
    Rz = 2 * Nz * Nz - 1
    Rxy = 2 * Nz[..., None] * N[..., :2]
    Lxy = Lv[..., :2] / (np.linalg.norm(Lv[..., :2], axis=2, keepdims=True) + 1e-6)
    toward = (Rxy * Lxy).sum(2)
    env = 0.30 + 0.38 * np.clip(Rz, 0, 1) + 0.40 * np.clip(toward, 0, 1) - 0.25 * np.clip(-toward, 0, 1)
    spec = ndh ** 70 * 1.6 + ndh ** 14 * 0.35
    metal_c = albedo * (0.10 + 0.55 * ndl[..., None] * sh[..., None] + env[..., None] * 0.75) \
        + (spec * sh)[..., None] * np.array([1.0, 0.92, 0.72], np.float32)
    out = paper * (1 - metal[..., None]) + metal_c * metal[..., None]
    return np.clip(out, 0, 1)


# ---------------------------------------------------------------- kayıt
def to_u8(a: np.ndarray) -> np.ndarray:
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


def save_rgb(path: str, rgb: np.ndarray, alpha: np.ndarray | None = None, quality: int = 86,
             lossless: bool = False):
    arr = to_u8(rgb)
    if alpha is not None:
        arr = np.dstack([arr, to_u8(alpha)])
        img = Image.fromarray(arr, 'RGBA')
    else:
        img = Image.fromarray(arr, 'RGB')
    if path.endswith('.webp'):
        img.save(path, 'WEBP', quality=quality, method=6, lossless=lossless, exact=True)
    elif path.endswith('.jpg'):
        img.convert('RGB').save(path, 'JPEG', quality=quality, optimize=True, progressive=True)
    else:
        img.save(path, optimize=True)


def save_gray(path: str, g: np.ndarray):
    Image.fromarray(to_u8(g), 'L').save(path, optimize=True)


def preview(path: str, rgb: np.ndarray, maxw: int = 540):
    img = Image.fromarray(to_u8(rgb) if rgb.ndim == 3 else to_u8(rgb), 'RGB' if rgb.ndim == 3 else 'L')
    if img.width > maxw:
        img = img.resize((maxw, int(img.height * maxw / img.width)), Image.LANCZOS)
    img.save(path)
