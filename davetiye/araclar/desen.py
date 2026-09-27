"""Döşenebilir damask / astar desenleri."""
from __future__ import annotations

import math

import numpy as np

from susleme import (Canvas, acanthus_leaf, c_scroll, circle, curvature_curve, ellipse, flatten,
                     mirror_x, rosette, transform, emboss, noise)


def fleur_de_lis(cx: float, cy: float, s: float) -> list:
    """Zambak (fleur-de-lis) motifi; (cx,cy) bandın merkezi, yukarı bakar. ~ 90*s yükseklik."""
    from susleme import leaf, resample, rounded_rect
    shapes = []
    # orta yaprak
    sp = np.stack([np.full(40, cx), np.linspace(cy - 2 * s, cy - 62 * s, 40)], 1)
    shapes.append(leaf(sp, 24 * s, lobes=1, lobe_depth=0.0, tip_taper=1.35))
    # yan yapraklar: dışa ve aşağı kıvrılan
    for side in (-1, 1):
        sp = curvature_curve(cx + side * 5 * s, cy - 4 * s, -math.pi / 2 + side * 0.35, 58 * s,
                             lambda u, side=side: side * (0.8 + 5.5 * u ** 1.6) / (58 * s), 50)
        shapes.append(leaf(sp, 17 * s, lobes=1, lobe_depth=0.0, tip_taper=1.1))
    # bağlama bandı
    shapes.append(rounded_rect(cx - 20 * s, cy - 2 * s, cx + 20 * s, cy + 8 * s, 4 * s))
    # alt loblar
    sp = np.stack([np.full(20, cx), np.linspace(cy + 8 * s, cy + 30 * s, 20)], 1)
    shapes.append(leaf(sp, 12 * s, lobes=1, lobe_depth=0.0, tip_taper=1.0))
    for side in (-1, 1):
        sp = curvature_curve(cx + side * 4 * s, cy + 8 * s, math.pi / 2 - side * 0.9, 22 * s,
                             lambda u, side=side: -side * 3.0 * u / (22 * s), 20)
        shapes.append(leaf(sp, 10 * s, lobes=1, lobe_depth=0.0, tip_taper=1.0))
    return shapes


def trellis_tile(w: int, h: int, line_w: float = 3.0, flower_r: float = 7.0, fleur_s: float = 0.55) -> np.ndarray:
    """Baklava kafes + kesişimlerde rozet + hücre ortasında zambak. Döşenebilir."""
    from susleme import band, rosette
    cv = Canvas(w, h, ss=3)
    shapes = []
    # iki yönlü çapraz çizgiler (kenardan taşarak döşenebilir)
    for (x0, y0, x1, y1) in ((-w / 2, 0, w / 2, h), (0, 0, w, h), (w / 2, 0, 3 * w / 2, h),
                             (w / 2, 0, -w / 2, h), (w, 0, 0, h), (3 * w / 2, 0, w / 2, h)):
        shapes += band(np.array([[x0, y0], [x1, y1]], float), line_w, cap=False)
    for (x, y) in ((0, 0), (w, 0), (0, h), (w, h), (w / 2, h / 2)):
        ro = rosette(x, y, flower_r, petals=4, inner=0.4, rot=math.pi / 4)
        shapes += ro['petals'] + ro['center']
    for (x, y) in ((w / 2, 0), (w / 2, h), (0, h / 2), (w, h / 2)):
        shapes += fleur_de_lis(x, y + 12 * fleur_s * 2.2, fleur_s * min(w, h) / 110)
    return cv.mask(shapes)


def damask_motif(cx: float, cy: float, s: float) -> tuple[list, list]:
    """Dikey simetrik palmet/lale motifi. Döndürür (dolgu şekilleri, delikler)."""
    fill, holes = [], []
    # merkez lale gövdesi
    fill.append(ellipse(cx, cy + 6 * s, 16 * s, 30 * s))
    holes.append(ellipse(cx, cy + 8 * s, 6 * s, 16 * s))
    # lale taç yaprakları
    for side in (-1, 1):
        sp = curvature_curve(cx + side * 4 * s, cy - 10 * s, -math.pi / 2 + side * 0.5, 58 * s,
                             lambda u, side=side: -side * 2.4 * u / (58 * s), 40)
        lf = acanthus_leaf(sp, 30 * s, fingers=2, spread=0.7, finger_w=0.3)
        fill += lf['blade'] + lf['fingers']
    fill.append(ellipse(cx, cy - 52 * s, 7 * s, 20 * s))
    # alt yapraklar (dışa kıvrılan)
    for side in (-1, 1):
        sp = curvature_curve(cx + side * 10 * s, cy + 30 * s, math.pi / 2 - side * 1.2, 70 * s,
                             lambda u, side=side: side * 2.6 * u ** 1.5 / (70 * s), 40)
        lf = acanthus_leaf(sp, 34 * s, fingers=3, spread=0.8, finger_w=0.26)
        fill += lf['blade'] + lf['fingers']
    # yan C-kıvrımları
    cs = c_scroll((cx - 30 * s, cy - 36 * s), (cx - 30 * s, cy + 50 * s), bulge=-0.28, width=7 * s,
                  curl0=0.22, curl1=0.2)
    fill += flatten(cs['band'], cs['eyes'])
    fill += mirror_x(flatten(cs['band'], cs['eyes']), cx)
    # alt küçük rozet ve tepe noktası
    ro = rosette(cx, cy + 78 * s, 12 * s, petals=6)
    fill += flatten(ro['petals'], ro['center'])
    fill.append(circle(cx, cy - 80 * s, 5 * s))
    return fill, holes


def lattice(w: int, h: int, s: float) -> list:
    """Ogee kafes çizgileri (tile içinde, kenarlardan taşan)."""
    out = []
    for ox in (0, w):
        for sgn in (-1, 1):
            t = np.linspace(0, 1, 60)
            x = ox + sgn * (w / 2) * np.sin(np.pi * t) * 0.98
            y = t * h
            pts = np.stack([x, y], 1)
            from susleme import band
            out += band(pts, 3.2 * s, cap=False)
    return out


def damask_tile(w: int, h: int, seed: int = 0, lattice_on: bool = True) -> np.ndarray:
    """[0,1] maske döşemesi: merkezde ve köşelerde (yarım kaydırmalı) motif."""
    cv = Canvas(w, h, ss=3)
    s = min(w / 220.0, h / 300.0)
    fill, holes = [], []
    for (cx, cy, sc) in ((w / 2, h / 2, 1.0), (0, 0, 0.8), (w, 0, 0.8), (0, h, 0.8), (w, h, 0.8)):
        f, hl = damask_motif(cx, cy, s * sc)
        fill += f
        holes += hl
    if lattice_on:
        fill += lattice(w, h, s)
    return cv.mask(fill, erase=holes)


def tile_to(tile: np.ndarray, w: int, h: int, ox: int = 0, oy: int = 0) -> np.ndarray:
    th, tw = tile.shape[:2]
    reps = (math.ceil((h + oy) / th) + 1, math.ceil((w + ox) / tw) + 1) + ((1,) if tile.ndim == 3 else ())
    big = np.tile(tile, reps)
    return big[oy:oy + h, ox:ox + w]


def lining(w: int, h: int, seed: int = 4, base=(0.36, 0.05, 0.09), gold=(0.80, 0.60, 0.28),
           tile=(180, 246)) -> np.ndarray:
    """Zarf astarı: bordo zemin üzerinde yaldız baskılı damask (düz baskı + hafif parlama)."""
    t = damask_tile(tile[0], tile[1], seed)
    m = tile_to(t, w, h)
    base = np.array(base, np.float32)
    gold = np.array(gold, np.float32)
    n = noise(h, w, 1.6, seed)
    bg = base[None, None] * (0.85 + 0.25 * n[..., None])
    sheen = noise(h, w, 3.0, seed + 1)
    g = gold[None, None] * (0.8 + 0.35 * sheen[..., None])
    return np.clip(bg * (1 - m[..., None]) + g * m[..., None], 0, 1)
