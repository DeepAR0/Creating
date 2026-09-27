"""Mum mühür ve zarf astarı üreticileri (tema renkleri parametreli)."""
from __future__ import annotations

import math

import numpy as np
from scipy import ndimage as ndi

from susleme import (Canvas, beads_along, circle, ellipse, equalize, noise, normals, smoothstep,
                     soften, bleed_rgb, band)
from desen import trellis_tile, tile_to


def wax_seal(size: int = 360, color=(0.55, 0.05, 0.08), seed: int = 3, light=(-0.55, -0.65, 0.52),
             rim_beads: bool = True, gloss: float = 1.0):
    """Işığı pişirilmiş mum mühür (RGBA, [0,1]).

    Mühür merkezi görüntünün ortasında; basılı disk yarıçapı ~0.30*size.
    Döndürür (rgba, disk_yaricapi_px).
    """
    S = size
    c = S / 2
    R = S * 0.30
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    dx, dy = xx - c, yy - c
    r = np.hypot(dx, dy)
    th = np.arctan2(dy, dx)
    # düzensiz mum kenarı: açıya bağlı gürültü + birkaç taşma
    n1 = noise(1, 720, 3.2, seed)[0]
    idx = ((th + math.pi) / (2 * math.pi) * 719).astype(int)
    rng = np.random.default_rng(seed)
    blob_r = R * (1.19 + 0.05 * (n1[idx] - 0.5) * 2)
    for _ in range(4):
        a = rng.random() * 2 * math.pi
        w = 0.25 + rng.random() * 0.35
        dd = np.angle(np.exp(1j * (th - a)))
        blob_r += R * (0.06 + rng.random() * 0.1) * np.exp(-(dd / w) ** 2)
    outer = np.clip((blob_r - r) / 1.2 + 0.5, 0, 1)
    # yükseklik: dış taşan mum yuvarlak kenarlı, basılı disk alçak
    d_edge = blob_r - r
    rim = np.sqrt(np.clip(d_edge / (R * 0.22), 0, 1))
    rim = 1 - (1 - np.clip(d_edge / (R * 0.20), 0, 1)) ** 2
    h = rim * 0.9
    press = smoothstep(R * 1.03, R * 0.97, r)            # basılı disk
    h = h * (1 - press) + 0.38 * press
    # disk kenarında basınçla yükselen mum dudağı
    lip = np.exp(-((r - R * 1.04) / (R * 0.05)) ** 2) * 0.35
    h += lip
    # iç halka: boncuklar + ince çizgi
    cv = Canvas(S, S, ss=3)
    ring_line = cv.mask(band(circle(c, c, R * 0.84, 360), R * 0.022, cap=False))
    ring_line2 = cv.mask(band(circle(c, c, R * 0.95, 360), R * 0.018, cap=False))
    h += emboss_simple(ring_line, 1.0) * 0.12 + emboss_simple(ring_line2, 1.0) * 0.1
    if rim_beads:
        bm = cv.mask(beads_along(circle(c, c, R * 0.895, 720), R * 0.085, R * 0.028, R * 0.028))
        h += emboss_simple(bm, 1.2) * 0.14
    # mum dokusu
    h += (equalize(noise(S, S, 3.2, seed + 1)) - 0.5) * 0.06 * (1 - press) * rim
    h += (noise(S, S, 1.6, seed + 2) - 0.5) * 0.006
    h = soften(h * outer, 0.8)
    # gölgelendirme (parlak mum)
    N = normals(h, S * 0.10)
    L = np.array(light, np.float32)
    L /= np.linalg.norm(L)
    V = np.array([0, 0, 1], np.float32)
    Hv = (L + V) / np.linalg.norm(L + V)
    ndl = np.clip((N * L).sum(2), 0, 1)
    ndh = np.clip((N * Hv).sum(2), 0, 1)
    base = np.array(color, np.float32)
    # alt-yüzey saçılımı hissi: kalın yerler daha parlak/kırmızı
    sss = np.clip(h * 0.35, 0, 0.35)[..., None]
    col = base * (0.30 + 0.85 * ndl[..., None]) + base * sss
    spec = (ndh ** 50 * 1.1 + ndh ** 10 * 0.22) * gloss
    fres = (1 - N[..., 2]) ** 3 * 0.25 * gloss
    col = col + (spec + fres)[..., None] * np.array([1.0, 0.86, 0.84], np.float32)
    # kenar altında hafif koyuluk
    col *= (0.82 + 0.18 * smoothstep(0, R * 0.08, d_edge))[..., None]
    rgba = np.dstack([np.clip(col, 0, 1), outer])
    return rgba.astype(np.float32), R


def emboss_simple(m, sigma):
    b = ndi.gaussian_filter(m, sigma)
    return np.clip((b - 0.25) * 1.5, 0, 1)


def lining(w: int, h: int, base=(0.34, 0.04, 0.08), gold=(0.84, 0.64, 0.30), seed: int = 4,
           tile=(120, 168)) -> np.ndarray:
    """Zarf astarı: koyu zemin üzerine yaldız baskılı zambak kafes."""
    t = trellis_tile(tile[0], tile[1], line_w=2.2, flower_r=5.5)
    m = tile_to(t, w, h, ox=tile[0] // 3, oy=0)
    base = np.array(base, np.float32)
    gold = np.array(gold, np.float32)
    n = noise(h, w, 2.4, seed)
    bg = base[None, None] * (0.8 + 0.35 * n[..., None])
    # yaldız baskıda hafif metalik değişim
    sheen = noise(h, w, 2.8, seed + 1)
    g = gold[None, None] * (0.72 + 0.45 * sheen[..., None])
    # baskı kabartması: kenarlarda gölge
    hh = ndi.gaussian_filter(m, 1.0)
    gy, gx = np.gradient(hh)
    lit = np.clip(1.0 + (-gx - gy) * 2.2, 0.6, 1.4)[..., None]
    out = bg * (1 - m[..., None]) + g * lit * m[..., None]
    fine = noise(h, w, 0.9, seed + 3)
    out *= (0.95 + 0.08 * fine[..., None])
    return np.clip(out, 0, 1)
