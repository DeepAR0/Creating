"""Barok zarf dokularını üretir.

Zarf arkadan görünür: üstte kalkan biçimli kapak (gloria ışınları + bulut
halkası + köşe kıvrımları), altta cep (freskli kartuş, çelenkler, isim kurdelesi).

Çıktılar (temalar/barok/gorsel/):
  zarf-cep.webp         cep albedo (RGBA; ağız kısmı saydam)
  zarf-cep-veri.png     R=yükseklik  G=yaldız  B=fresk maskesi
  zarf-kapak.webp       kapak albedo (RGBA)
  zarf-kapak-veri.png   kapak verisi
  zarf-kapak-arka.webp  kapağın iç yüzü (astar deseni)
  zarf-astar.webp       zarfın içi (açılınca görünen astar)
  zarf-pisik.webp       WebGL yoksa kullanılan pişmiş ışıklı kapalı zarf
"""
from __future__ import annotations

import math
import os
import sys
import time

import numpy as np
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
from susleme import *  # noqa: F401,F403
from susleme import (Canvas, GOLD, bezier, band, beads_along, c_scroll, s_scroll, acanthus_leaf,
                     circle, ellipse, emboss, flatten, mirror_x, noise, equalize, profile, rays,
                     resample, rosette, sdf, shade, shell, smoothstep, soften, cavity, transform,
                     curvature_curve, normals_of, rect, save_rgb, preview, bleed_rgb, to_u8)
from fresk import fresco
from desen import damask_tile, trellis_tile, tile_to
from muhur import wax_seal, lining

W, H = 1080, 2160
CX = W / 2
TIP = np.array([540.0, 1062.0])
SEAL = np.array([540.0, 990.0])
FLAP_H = 1110
FRESCO_C = np.array([540.0, 1548.0])
FRESCO_R = (228.0, 278.0)
HMAX = 11.0

OUT = os.path.join(os.path.dirname(__file__), '..', 'temalar', 'barok', 'gorsel')
PREV = os.environ.get('ONIZLEME', '/tmp')

PAPER = np.array([0.955, 0.918, 0.835], np.float32)
GOLD_A = np.array([0.86, 0.65, 0.29], np.float32)
GOLD_B = np.array([0.66, 0.45, 0.18], np.float32)


# ------------------------------------------------------------------ geometri
def flap_edge_right(n=220):
    """Kapak kenarı (sağ yarı): uçtan sağ kenara."""
    return bezier(TIP, (668, 905), (1052, 610), (1080, 118), n=n)


def flap_poly():
    r = flap_edge_right()           # uç -> sağ kenar
    left = mirror_x(r, CX)          # sol kenar -> uç
    return np.concatenate([[[0.0, 0.0], [W, 0.0]], r[::-1], left[::-1][1:]])


def flap_edge_full():
    """Sol kenardan uca, uçtan sağ kenara kapak kenar eğrisi."""
    r = flap_edge_right()
    return np.concatenate([mirror_x(r, CX), r[1:]])


def throat_poly():
    """Cebin ağız çizgisinin üstü (saydam bölge)."""
    return np.array([[0, -5], [W, -5], [W, 70], [CX, 860], [0, 70]], float)


class Layer:
    """Yükseklik + malzeme biriktirici (ressam algoritması)."""

    def __init__(self, w, h):
        self.h = np.zeros((h, w), np.float32)
        self.metal = np.zeros((h, w), np.float32)
        self.tint = np.zeros((h, w), np.float32)   # yaldız tonu varyasyonu (0 açık, 1 koyu)

    def add(self, m, sigma, amp, shape='round', gold=None, cover=False, tint=0.0, floor=None):
        e = emboss(m, sigma, shape) * amp
        if cover:
            floor = ndi.gaussian_filter(self.h, 10) if floor is None else floor
            k = np.clip(m * 1.4, 0, 1)
            self.h = self.h * (1 - k) + (floor + e) * k
        else:
            self.h += e
        if gold is not None:
            k = np.clip(m * 1.2, 0, 1)
            self.metal = self.metal * (1 - k) + (1.0 if gold else 0.0) * k
            if gold:
                self.tint = self.tint * (1 - k) + tint * k
        return e

    def add_height(self, hh, m=None, gold=None, tint=0.0):
        self.h += hh
        if gold is not None and m is not None:
            k = np.clip(m, 0, 1)
            self.metal = self.metal * (1 - k) + (1.0 if gold else 0.0) * k
            if gold:
                self.tint = self.tint * (1 - k) + tint * k


# ------------------------------------------------------------------ motifler
def garland_drop(x, y0, y1, scale=1.0):
    """Asılı çelenk (festoon drop): fiyonk + dalgalı yaldız kurdele + yaprak kümeleri + çiçekler.

    Döndürür dict: bow_loops, bow_holes, knot, ribbon, leaves_blade, leaves_f, petals, centers, drop
    """
    s = scale
    out = {k: [] for k in ('bow_loops', 'bow_holes', 'knot', 'ribbon', 'leaves_blade', 'leaves_f',
                           'petals', 'centers', 'drop')}
    for sg in (-1, 1):
        out['bow_loops'].append(ellipse(x + sg * 30 * s, y0 - 4 * s, 29 * s, 15 * s, sg * 0.45))
        out['bow_holes'].append(ellipse(x + sg * 31 * s, y0 - 4 * s, 15 * s, 5.5 * s, sg * 0.45))
        tail = bezier((x, y0), (x + sg * 18 * s, y0 + 30 * s), (x + sg * 30 * s, y0 + 52 * s),
                      (x + sg * 26 * s, y0 + 84 * s), n=40)
        out['ribbon'] += band(tail, lambda t: 11 * s * (1 - 0.35 * t), cap=False)
    out['knot'].append(ellipse(x, y0, 11 * s, 13 * s))
    # dalgalı gövde kurdelesi
    t = np.linspace(0, 1, 200)
    yy = y0 + 16 * s + (y1 - y0 - 16 * s) * t
    xx = x + 9 * s * np.sin(t * 7.0 * math.pi)
    stem = np.stack([xx, yy], 1)
    out['ribbon'] += band(stem, lambda u: 7 * s * (1 - 0.45 * u), cap=True)
    n = 6
    for i in range(n):
        f = i / (n - 1)
        k = 1.0 - 0.42 * f
        cy_ = y0 + 90 * s + (y1 - y0 - 150 * s) * f
        # yaprak kümesi: iki yana + aşağı
        for sg, ang in ((-1, math.pi / 2 + 0.95), (1, math.pi / 2 - 0.95), (0, math.pi / 2)):
            ln = (58 if sg else 44) * s * k
            sp = curvature_curve(x + sg * 5 * s, cy_ - 16 * s * k, ang, ln,
                                 lambda u, sg=sg, ln=ln: (sg or 1) * 1.2 * u / ln * (1 if sg else 0), 40)
            lf = acanthus_leaf(sp, (34 if sg else 28) * s * k, fingers=3, spread=0.75, finger_w=0.24)
            out['leaves_blade'] += lf['blade']
            out['leaves_f'] += lf['fingers'] + lf['rib']
        ro = rosette(x, cy_ - 22 * s * k, 21 * s * k, petals=7, inner=0.36, rot=0.3 * i)
        out['petals'] += ro['petals']
        out['centers'] += ro['center']
    # uç: küçük kozalak/damla
    out['drop'].append(ellipse(x, y1 + 8 * s, 11 * s, 20 * s))
    return out


def ribbon_banner(cx, cy, w, h):
    """İsim kurdelesi: hafif kavisli orta bant, arkaya katlanan uçlar, V çentikli kuyruklar."""
    sag = 12.0
    top = bezier((cx - w / 2, cy - h / 2), (cx - w / 6, cy - h / 2 + sag), (cx + w / 6, cy - h / 2 + sag),
                 (cx + w / 2, cy - h / 2), n=90)
    bot = bezier((cx + w / 2, cy + h / 2), (cx + w / 6, cy + h / 2 + sag), (cx - w / 6, cy + h / 2 + sag),
                 (cx - w / 2, cy + h / 2), n=90)
    mid = [np.concatenate([top, bot])]
    folds, tails = [], []
    drop = 30.0
    for s in (-1, 1):
        ex = cx + s * w / 2
        folds.append(np.array([[ex, cy - h / 2], [ex + s * 30, cy - h / 2 + drop],
                               [ex + s * 30, cy + h / 2 + drop], [ex, cy + h / 2]], float))
        tx = ex + s * 30
        ty0, ty1 = cy - h / 2 + drop, cy + h / 2 + drop
        tails.append(np.array([[tx - s * 8, ty0], [tx + s * 118, ty0 - 6], [tx + s * 84, (ty0 + ty1) / 2],
                               [tx + s * 118, ty1 + 6], [tx - s * 8, ty1]], float))
    return mid, folds, tails


def cloud_ring(cx, cy, r0, r1, a0, a1, count, seed=3):
    rng = np.random.default_rng(seed)
    puffs = []
    for i in range(count):
        a = a0 + (a1 - a0) * (i + rng.random() * 0.6) / count
        rr = r0 + (r1 - r0) * rng.random() ** 0.7
        pr = 34 + 38 * rng.random()
        puffs.append(circle(cx + rr * math.cos(a), cy + rr * math.sin(a), pr))
    return puffs


# ------------------------------------------------------------------ kapak
def build_flap():
    t0 = time.time()
    cv = Canvas(W, FLAP_H, ss=3)
    fp = flap_poly()
    m_flap = cv.mask([fp])
    sd = sdf(m_flap)
    L = Layer(W, FLAP_H)

    # kağıt tabanı: kenar kalınlığı (hafif pah)
    L.add_height(np.clip(-sd / 3.0, 0, 1) * 0.12)
    # yaldızlı kenar şeridi + boncuk sırası + ince fitil
    edge_h, edge_m, segs = profile(sd, [(3, 'lin', 0.12, 0.3), (7, 'bead', 0.3, 0.22), (3, 'lin', 0.3, 0.12)])
    L.add_height(edge_h * 0.9, edge_m, gold=True, tint=0.2)
    inner = np.clip(-sd - 20, 0, None)
    edge_curve = flap_edge_full()
    nr = normals_of(edge_curve)
    # içe doğru kaydırılmış eğri (boncuklar için)
    bead_curve = edge_curve - nr * 0  # yön belirsizliğine karşı sdf ile konumlandırma yerine basit kaydırma
    # iç tarafı bulmak için: uç noktası yukarıda olmalı
    test = edge_curve[len(edge_curve) // 2] + nr[len(edge_curve) // 2] * 30
    sgn = 1.0 if test[1] < TIP[1] else -1.0
    bead_curve = edge_curve + nr * 28 * sgn
    top_line = np.array([[40.0, 28.0], [W - 40.0, 28.0]])
    beads = beads_along(bead_curve, 21, 6.5, 5.5) + beads_along(top_line, 21, 6.5, 5.5)
    m_beads = cv.mask(beads)
    L.add(m_beads, 2.0, 0.55, 'dome', gold=True, tint=0.1)
    fil_curve = edge_curve + nr * 48 * sgn
    fil = band(fil_curve, 5.0, cap=False) + band(np.array([[60.0, 50.0], [W - 60.0, 50.0]]), 5.0, cap=False)
    m_fil = cv.mask(fil) * np.clip((-sd - 40) / 3, 0, 1)
    L.add(m_fil, 1.2, 0.4, 'round', gold=True, tint=0.25)

    # iç bölge (ışınların ve bulutların sınırı)
    inner_m = np.clip((-sd - 62) / 4.0, 0, 1) * np.clip((np.arange(FLAP_H)[:, None] - 66) / 4.0, 0, 1)

    # --- gloria ışınları: uzun/kısa dönüşümlü ince ışınlar + dalgalı alev ışınları
    yy, xx = np.mgrid[0:FLAP_H, 0:W].astype(np.float32)
    rr = np.hypot(xx - SEAL[0], yy - SEAL[1])
    a0, a1 = -math.pi - 0.28, 0.28
    long_r = rays(SEAL[0], SEAL[1], 170, 720, 22, 18, a0=a0, a1=a1)
    short_r = rays(SEAL[0], SEAL[1], 170, 540, 22, 13, a0=a0 + (a1 - a0) / 44, a1=a1 + (a1 - a0) / 44)
    flame = rays(SEAL[0], SEAL[1], 180, 600, 44, 9, wavy=True, amp=7, waves=3.0,
                 a0=a0 + (a1 - a0) / 88, a1=a1 + (a1 - a0) / 88)
    m_r1 = cv.mask(long_r + short_r) * inner_m
    m_r2 = cv.mask(flame) * inner_m * (1 - cv.mask(long_r + short_r))
    fade = 1 - smoothstep(460, 640, rr)
    L.add(m_r1, 1.5, 0.5, 'round', gold=True, tint=0.0)
    L.add(m_r2 * np.clip(fade * 2, 0, 1), 1.2, 0.3, 'round', gold=True, tint=0.4)

    # --- köşe kıvrımları (kapağın üst köşeleri)
    corner = []
    cs1 = c_scroll((96, 92), (330, 92), bulge=-0.22, width=20, curl0=0.2, curl1=0.24)
    cs2 = c_scroll((92, 118), (92, 330), bulge=0.26, width=18, curl0=0.22, curl1=0.2)
    corner += flatten(cs1['band'], cs1['eyes'], cs2['band'], cs2['eyes'])
    corner += mirror_x(corner, CX)
    m_corner = cv.mask(corner) * np.clip((-sd - 30) / 3, 0, 1)
    lv = []
    for (x, y, a, s) in ((150, 150, 0.8, 1), (190, 120, 0.25, 1)):
        sp = curvature_curve(x, y, a, 120, lambda u: -1.8 * u ** 2 / 120, 50)
        lv.append(acanthus_leaf(sp, 64, fingers=3))
    leaf_sh = flatten(*[l['blade'] for l in lv])
    leaf_f = flatten(*[l['fingers'] + l['rib'] for l in lv])
    leaf_sh += mirror_x(leaf_sh, CX)
    leaf_f += mirror_x(leaf_f, CX)
    m_lb = cv.mask(leaf_sh) * inner_m
    m_lf = cv.mask(leaf_f) * inner_m
    L.add(m_lb, 5, 0.35, 'soft', gold=False, cover=True)
    L.add(m_lf, 2.2, 0.35, 'round', gold=False)
    L.add(m_corner, 3.2, 0.85, 'round', gold=True, cover=True, tint=0.05)

    # --- bulut halkası (mühürün çevresi, kör kabartma): her puf ayrı kubbe
    rng = np.random.default_rng(5)
    cloud_h = np.zeros((FLAP_H, W), np.float32)
    m_cl = np.zeros((FLAP_H, W), np.float32)
    for ring, (r0, r1, cnt, pr0, pr1) in enumerate(((150, 175, 17, 40, 58), (205, 240, 21, 30, 46))):
        for i in range(cnt):
            a = a0 - 0.08 + (a1 - a0 + 0.16) * (i + 0.5 + (rng.random() - 0.5) * 0.5) / cnt
            rr_ = r0 + (r1 - r0) * rng.random()
            pr = pr0 + (pr1 - pr0) * rng.random()
            px, py = SEAL[0] + rr_ * math.cos(a), SEAL[1] + rr_ * math.sin(a)
            x0_, x1_ = int(max(px - pr - 2, 0)), int(min(px + pr + 3, W))
            y0_, y1_ = int(max(py - pr - 2, 0)), int(min(py + pr + 3, FLAP_H))
            if x1_ <= x0_ or y1_ <= y0_:
                continue
            gy_, gx_ = np.mgrid[y0_:y1_, x0_:x1_].astype(np.float32)
            d = np.hypot(gx_ - px, gy_ - py) / pr
            dome = np.sqrt(np.clip(1 - d * d, 0, 1)) * (0.75 + 0.25 * (1 - ring))
            cloud_h[y0_:y1_, x0_:x1_] = np.maximum(cloud_h[y0_:y1_, x0_:x1_], dome)
            m_cl[y0_:y1_, x0_:x1_] = np.maximum(m_cl[y0_:y1_, x0_:x1_], np.clip((1 - d) * pr / 1.5, 0, 1))
    clip_ = np.clip((-sd - 30) / 4.0, 0, 1)
    m_cl *= clip_
    cloud_h = soften(cloud_h, 1.0) * clip_
    k = np.clip(m_cl * 1.4, 0, 1)
    L.h = L.h * (1 - k) + (ndi.gaussian_filter(L.h, 10) + cloud_h * 0.95) * k
    L.metal *= (1 - k)

    # --- damask kör kabartma zemin (çok alçak)
    dm = tile_to(trellis_tile(150, 210), W, FLAP_H, ox=15, oy=0)
    free = np.clip(1 - soften(m_r1 + m_r2 + m_cl + m_corner + m_lb, 6) * 3, 0, 1) * inner_m
    free *= smoothstep(740, 800, rr)
    L.add(dm * free, 1.6, 0.09, 'round', gold=False)

    h = soften(L.h, 0.55)
    print('kapak geometri', round(time.time() - t0, 1), 's')
    return h, L.metal, L.tint, m_flap


# ------------------------------------------------------------------ cep
def build_pocket():
    t0 = time.time()
    cv = Canvas(W, H, ss=3)
    L = Layer(W, H)
    m_body = cv.mask([rect(0, 0, W, H)], erase=[throat_poly()])
    sd_body = border_sd(W, H)

    # dış kenar: yaldızlı şerit + boncuk + fitil
    edge_h, edge_m, _ = profile(sd_body, [(3, 'lin', 0.12, 0.3), (7, 'bead', 0.3, 0.22), (3, 'lin', 0.3, 0.12)])
    L.add_height(edge_h * 0.9, edge_m, gold=True, tint=0.2)
    frame_pts = np.array([[28.0, 40.0], [28.0, H - 28], [W - 28.0, H - 28], [W - 28.0, 40.0]])
    beads = beads_along(frame_pts, 21, 6.5, 5.5)
    L.add(cv.mask(beads), 2.0, 0.55, 'dome', gold=True, tint=0.1)
    fil = band(np.array([[50.0, 40.0], [50.0, H - 50], [W - 50.0, H - 50], [W - 50.0, 40.0]]), 5.0, cap=False)
    L.add(cv.mask(fil), 1.2, 0.4, 'round', gold=True, tint=0.25)

    # --- fresk kartuşu
    cx, cy = FRESCO_C
    rx, ry = FRESCO_R
    m_fres = cv.mask([ellipse(cx, cy, rx, ry, n=720)])
    sd_f = sdf(m_fres)
    fr_h, fr_m, fr_segs = profile(sd_f, [(4, 'lin', 0.1, 0.35), (10, 'bead', 0.35, 0.3),
                                        (5, 'flat', 0.5, 0.5), (16, 'cove', 0.75, 0.35),
                                        (13, 'bead', 0.35, 0.45), (9, 'lin', 0.5, 0.0)], outward=True)
    L.add_height(soften(fr_h, 0.7), fr_m, gold=True, tint=0.1)
    pearls = beads_along(ellipse(cx, cy, rx + 9, ry + 9, n=720), 19, 5.5, 5.5)
    L.add(cv.mask(pearls), 1.6, 0.45, 'dome', gold=True, tint=0.0)
    # fresk yüzeyi hafif çukur (sıva)
    L.add_height(-0.05 * soften(m_fres, 2))

    # yan C-kıvrımları (dışa şişen, uçları çerçeveye kıvrılan)
    sc = []
    left_c = c_scroll((252, 1318), (252, 1790), bulge=-0.13, width=24, curl0=0.12, curl1=0.14, turns=1.15)
    sc += flatten(left_c['band'], left_c['eyes'])
    s_top = s_scroll((300, 1248), (430, 1222), bulge=0.18, width=15, curl0=0.2, curl1=0.12)
    sc += flatten(s_top['band'], s_top['eyes'])
    sc_all = sc + mirror_x(sc, CX)
    m_sc = cv.mask(sc_all)

    # akantus yaprakları C-kıvrımlarının dış tarafında
    lv = []
    for (x, y, a, ln, wd) in ((230, 1400, math.pi * 1.25, 150, 80), (224, 1560, math.pi * 1.0, 130, 70),
                              (232, 1710, math.pi * 0.78, 140, 76)):
        sp = curvature_curve(x, y, a, ln, lambda u, ln=ln: (1.6 * u ** 2) / ln * (1 if a > math.pi else -1), 60)
        lv.append(acanthus_leaf(sp, wd, fingers=3, spread=0.85))
    # alt sarkıt yaprakları
    for s in (-1, 1):
        sp = curvature_curve(cx + s * 24, cy + ry + 50, math.pi / 2 + s * 0.75, 96,
                             lambda u, s=s: -s * 1.6 * u ** 2 / 96, 60)
        lv.append(acanthus_leaf(sp, 62, fingers=3))
    leaf_bl = flatten(*[l['blade'] for l in lv])
    leaf_f = flatten(*[l['fingers'] + l['rib'] for l in lv])
    leaf_bl += mirror_x(leaf_bl[:6], CX) if False else []
    # simetri
    leaf_bl_all = leaf_bl + mirror_x(flatten(*[l['blade'] for l in lv[:3]]), CX)
    leaf_f_all = leaf_f + mirror_x(flatten(*[l['fingers'] + l['rib'] for l in lv[:3]]), CX)
    m_lb = cv.mask(leaf_bl_all)
    m_lf = cv.mask(leaf_f_all)
    L.add(m_lb, 5, 0.40, 'soft', gold=False, cover=True)
    L.add(m_lf, 2.2, 0.40, 'round', gold=False)
    L.add(m_sc, 3.4, 0.95, 'round', gold=True, cover=True, tint=0.0)

    # tepe: deniz kabuğu (yukarı açılan)
    sh = shell(cx, cy - ry - 30, 118, ang=-math.pi / 2, spread=math.radians(140), ribs=13, depth=0.12)
    m_shf = cv.mask(sh['fan'])
    m_shr = cv.mask(sh['ribs'])
    L.add(m_shf, 4, 0.55, 'soft', gold=False, cover=True)
    L.add(m_shr * m_shf, 2.0, 0.45, 'round', gold=True, tint=0.15)
    # alt: küçük ters kabuk + damla
    sh2 = shell(cx, cy + ry + 40, 70, ang=math.pi / 2, spread=math.radians(130), ribs=9, depth=0.12)
    m_s2f = cv.mask(sh2['fan'])
    L.add(m_s2f, 3, 0.5, 'soft', gold=False, cover=True)
    L.add(cv.mask(sh2['ribs']) * m_s2f, 1.8, 0.4, 'round', gold=True, tint=0.15)

    # --- yan çelenkler
    g = garland_drop(142, 700, 1420, scale=1.05)
    for key in g:
        g[key] = g[key] + mirror_x(list(g[key]), CX)
    L.add(cv.mask(g['leaves_blade']), 4, 0.38, 'soft', gold=False, cover=True)
    L.add(cv.mask(g['leaves_f']), 2.0, 0.34, 'round', gold=False)
    L.add(cv.mask(g['ribbon']), 2.2, 0.5, 'round', gold=True, cover=True, tint=0.3)
    L.add(cv.mask(g['petals']), 2.6, 0.55, 'round', gold=False, cover=True)
    L.add(cv.mask(g['centers']), 1.8, 0.55, 'dome', gold=True, tint=0.1)
    L.add(cv.mask(g['bow_loops'], erase=g['bow_holes']), 3.0, 0.6, 'round', gold=True, cover=True, tint=0.25)
    L.add(cv.mask(g['knot']), 3.0, 0.7, 'dome', gold=True, tint=0.2)
    L.add(cv.mask(g['drop']), 2.5, 0.6, 'dome', gold=True, tint=0.1)

    # --- isim kurdelesi
    mid, folds, tails_r = ribbon_banner(cx, 1996, 580, 96)
    m_tails = cv.mask(tails_r)
    L.add(m_tails, 3, 0.32, 'round', gold=False, cover=True, floor=0.02)
    m_folds = cv.mask(folds)
    L.add(m_folds, 2, 0.22, 'round', gold=False, cover=True)
    m_mid = cv.mask(mid)
    L.add(m_mid, 13, 0.62, 'dome', gold=False, cover=True, floor=0.02)
    for mm in (m_mid, m_tails):
        rim_h, rim_m, _ = profile(sdf(mm), [(3, 'lin', 0.0, 0.0), (5, 'bead', 0.0, 0.16)])
        L.add_height(rim_h, rim_m * mm, gold=True, tint=0.25)
    banner_shade = m_folds

    # alt köşe kıvrımları
    corner = []
    ccs = c_scroll((80, 2060), (80, 1880), bulge=-0.24, width=16, curl0=0.2, curl1=0.24)
    ccs2 = c_scroll((96, 2074), (270, 2074), bulge=0.22, width=16, curl0=0.2, curl1=0.22)
    corner += flatten(ccs['band'], ccs['eyes'], ccs2['band'], ccs2['eyes'])
    corner += mirror_x(corner, CX)
    L.add(cv.mask(corner), 3, 0.75, 'round', gold=True, cover=True, tint=0.1)

    # --- damask kör kabartma zemin
    dm = tile_to(trellis_tile(150, 210), W, H, ox=15, oy=0)
    busy = soften(np.clip(L.h * 4, 0, 1), 6)
    frame_clear = np.clip((sd_body * -1 - 64) / 4, 0, 1)
    free = np.clip(1 - busy * 3, 0, 1) * frame_clear * (1 - soften(m_fres, 3))
    L.add(dm * free, 1.6, 0.09, 'round', gold=False)

    h = soften(L.h, 0.55)
    print('cep geometri', round(time.time() - t0, 1), 's')
    return h, L.metal, L.tint, m_body, m_fres, banner_shade


# ------------------------------------------------------------------ albedo
def paper_albedo(w, h, seed):
    fib = noise(h, w, 1.25, seed, stretch=(1.0, 0.45))
    mott = noise(h, w, 2.6, seed + 1)
    speck = (noise(h, w, 0.6, seed + 2) > 0.93).astype(np.float32) * 0.02
    a = PAPER[None, None] * (0.965 + 0.045 * fib[..., None]) * (0.975 + 0.04 * mott[..., None])
    a -= speck[..., None]
    return a


def gold_albedo(w, h, tint, seed):
    n = noise(h, w, 2.0, seed)
    k = np.clip(tint + (n - 0.5) * 0.35, 0, 1)[..., None]
    return GOLD_A[None, None] * (1 - k) + GOLD_B[None, None] * k


def compose_albedo(hh, metal, tint, seed, fres=None, fres_mask=None):
    Hh, Ww = hh.shape
    alb = paper_albedo(Ww, Hh, seed)
    g = gold_albedo(Ww, Hh, tint, seed + 5)
    # yaldız: çukurlarda koyu kırmızımsı "bolus" (antika etkisi)
    cav = cavity(hh, 4)
    bole = np.array([0.55, 0.30, 0.16], np.float32)
    g = g * (1 - np.clip(cav * 6, 0, 0.45))[..., None] + bole * np.clip(cav * 6, 0, 0.45)[..., None] * 0.3
    alb = alb * (1 - metal[..., None]) + g * metal[..., None]
    if fres is not None:
        alb = alb * (1 - fres_mask[..., None]) + fres * fres_mask[..., None]
    # ortam kapanması (kağıt çukurları)
    ao = 1 - np.clip(cavity(hh, 7) * 3.2, 0, 0.3)
    alb *= ao[..., None]
    return np.clip(alb, 0, 1)


def edge_age(alb, mask_sd, strength=0.08):
    """Kenarlarda hafif eskime / sararma."""
    k = (1 - smoothstep(0, 90, -mask_sd))[..., None] * strength
    return alb * (1 - k) + alb * np.array([0.93, 0.85, 0.70], np.float32) * k


def main():
    os.makedirs(OUT, exist_ok=True)
    # ---------------- kapak
    hf, mf, tf, m_flap = build_flap()
    alb_f = compose_albedo(hf, mf, tf, 31)
    alb_f = edge_age(alb_f, sdf(m_flap), 0.10)
    # ---------------- cep
    hp, mp, tp, m_body, m_fres, m_fold = build_pocket()
    fw, fh = int(FRESCO_R[0] * 2 + 16), int(FRESCO_R[1] * 2 + 16)
    fr = fresco(fw, fh, seed=7, light=(0.5, 0.2), dove_scale=0.95)
    fres_full = np.zeros((H, W, 3), np.float32)
    x0 = int(FRESCO_C[0] - fw / 2)
    y0 = int(FRESCO_C[1] - fh / 2)
    fres_full[y0:y0 + fh, x0:x0 + fw] = fr
    fm = np.clip(m_fres * 1.0, 0, 1)
    alb_p = compose_albedo(hp, mp, tp, 17, fres_full, fm)
    alb_p = edge_age(alb_p, border_sd(W, H), 0.10)
    alb_p *= (1 - 0.18 * soften(m_fold, 1.0))[..., None]   # kurdelenin arkaya katlanan yüzü

    # ---------------- kaydet
    alpha_p = m_body
    save_rgb(os.path.join(OUT, 'zarf-cep.webp'), bleed_rgb(alb_p, alpha_p), alpha_p, quality=86)
    rng = np.random.default_rng(1)
    dith = lambda a: a  # noqa: E731  (dither dosyayı büyütüyor; normaller gölgelendiricide yumuşatılıyor)
    save_rgb(os.path.join(OUT, 'zarf-cep-veri.webp'), np.dstack([dith(hp / max(hp.max(), 1e-6)), mp, fm]),
             lossless=True)
    save_rgb(os.path.join(OUT, 'zarf-kapak.webp'), bleed_rgb(alb_f, m_flap), m_flap, quality=86)
    save_rgb(os.path.join(OUT, 'zarf-kapak-veri.webp'),
             np.dstack([dith(hf / max(hf.max(), 1e-6)), mf, np.zeros_like(mf)]), lossless=True)
    import json
    manifest = {
        'w': W, 'h': H, 'kapakH': FLAP_H, 'hmax': HMAX,
        'yukseklik': {'cep': round(float(hp.max()) * HMAX, 3), 'kapak': round(float(hf.max()) * HMAX, 3)},
        'muhur': {'x': float(SEAL[0]), 'y': float(SEAL[1]), 'boyut': 360, 'disk': 108},
        'uc': [float(TIP[0]), float(TIP[1])],
        'kurdele': {'x': 540, 'y': 1996, 'w': 580, 'h': 96},
        'fresk': {'x': float(FRESCO_C[0]), 'y': float(FRESCO_C[1]), 'rx': FRESCO_R[0], 'ry': FRESCO_R[1]},
        'bogaz': [[0, 70], [CX, 860], [W, 70]],
        'kanonikIsik': [260.0, 260.0, 1100.0],
    }
    with open(os.path.join(OUT, 'zarf.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print('yükseklik ölçekleri: kapak', float(hf.max()), 'cep', float(hp.max()))

    # ---------------- pişmiş önizleme (kapalı zarf)
    light = (260.0, 260.0, 1100.0)
    lit_p = shade(alb_p, hp, mp, HMAX, light, matte=fm)
    lit_f = shade(alb_f, hf, mf, HMAX, light)
    closed = lit_p.copy()
    # kapak gölgesi
    shadow = ndi.gaussian_filter(np.pad(m_flap, ((0, H - FLAP_H), (0, 0))), 9)
    shadow = ndi.shift(shadow, (12, 7), order=1)
    closed *= (1 - 0.45 * shadow)[..., None]
    a = m_flap[..., None]
    closed[:FLAP_H] = closed[:FLAP_H] * (1 - a) + lit_f * a
    save_rgb(os.path.join(OUT, 'zarf-pisik.webp'), closed, quality=80)

    # ---------------- mühür
    seal, seal_r = wax_seal(360, color=(0.55, 0.05, 0.08), seed=3)
    save_rgb(os.path.join(OUT, 'muhur.webp'), bleed_rgb(seal[..., :3], seal[..., 3]), seal[..., 3], quality=88)
    print('mühür disk yarıçapı oranı', seal_r / 360)

    # ---------------- astar: zarfın içi ve kapağın iç yüzü
    th = 900
    inside = lining(W, th)
    # derinlik: ağız çizgisine doğru ve üstte gölge
    yy = np.arange(th, dtype=np.float32)[:, None]
    depth = 0.55 + 0.45 * smoothstep(0, 520, yy)
    inside *= depth[..., None]
    save_rgb(os.path.join(OUT, 'zarf-astar.webp'), inside, quality=84)
    back = lining(W, FLAP_H, seed=9)
    # kapak iç yüzünde kenar pervazı (ince yaldız çizgi)
    sdf_f = sdf(m_flap)
    rim = np.exp(-((-sdf_f - 22) / 2.2) ** 2)[..., None]
    back = back * (1 - rim) + np.array([0.86, 0.66, 0.30], np.float32) * rim
    save_rgb(os.path.join(OUT, 'zarf-kapak-arka.webp'), bleed_rgb(back, m_flap), m_flap, quality=84)
    preview(os.path.join(PREV, 'muhur.png'), seal[..., :3] * seal[..., 3:4] + (1 - seal[..., 3:4]) * 0.9, maxw=360)
    preview(os.path.join(PREV, 'astar.png'), inside, maxw=540)
    preview(os.path.join(PREV, 'zarf_onizleme.png'), closed, maxw=540)
    preview(os.path.join(PREV, 'zarf_onizleme_buyuk.png'), closed[700:1500, 100:980], maxw=880)


def border_sd(w, h):
    """Dikdörtgenin kenarlarına işaretli uzaklık (içeride negatif)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32) + 0.5
    return -np.minimum(np.minimum(xx, w - xx), np.minimum(yy, h - yy))


if __name__ == '__main__':
    main()
