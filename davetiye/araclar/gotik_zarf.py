"""Gotik zarf dokuları (barok_zarf ile aynı çıktı biçimi; motor/zarf.js ikisini de okur).

Kapak: ters sivri kemer biçimli, kenarı kıvrık gotik yapraklı (crocket), içinde kabartma
yaldız pencere tracery'si. Cep: kenar kemer frizi, iki yanda pinakl kuleler, ortada
vitray gül pencere, altta isim kurdelesi. Kağıt gece mavisi.
"""
from __future__ import annotations

import json
import math
import os
import sys
import time

import numpy as np
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
from susleme import (Canvas, band, beads_along, circle, emboss, flatten, mirror_x, noise, profile, rect,
                     sdf, shade, smoothstep, soften, cavity, save_rgb, preview, bleed_rgb, equalize, normals_of,
                     rounded_rect)
from gotik import (pointed_arch, foil, rose_glass, crockets_along, pinnacle, stained_glass_w, VITRAY, C,
                   cusps_along, star8, star_field)
from barok_zarf import Layer, ribbon_banner, border_sd
from muhur import wax_seal, lining

W, H = 1080, 2160
CX = W / 2
FLAP_H = 1110
SEAL = np.array([540.0, 1000.0])
TIP_Y = 1085.0
ROSE_C = np.array([540.0, 1545.0])
ROSE_R = 250.0
HMAX = 11.0
OUT = os.path.join(os.path.dirname(__file__), '..', 'temalar', 'gotik', 'gorsel')
PREV = os.environ.get('ONIZLEME', '/tmp')

PAPER = C(24, 30, 66)
GOLD_A = np.array([0.86, 0.68, 0.33], np.float32)
GOLD_B = np.array([0.62, 0.46, 0.20], np.float32)


def flap_edge():
    """Ters sivri kemer: (0,150) -> uç (540, ~1085) -> (1080,150)."""
    arch = pointed_arch(CX, 150.0, W, 1.0, n=160)   # yukarı bakan kemer (y aşağı eksende)
    arch[:, 1] = 300.0 - arch[:, 1]                  # 150 çizgisine göre ters çevir
    return arch


def flap_poly():
    e = flap_edge()
    return np.concatenate([[[0.0, 0.0], [W, 0.0]], e[::-1]])


def throat_poly():
    return np.array([[0, -5], [W, -5], [W, 110], [CX, 900], [0, 110]], float)


def gothic_diaper(w, h, cell=120):
    """Kör kabartma zemin: dört yapraklı yoncalı kare ızgara."""
    cv = Canvas(w, h, ss=2)
    shapes = []
    for y in range(-cell, h + cell, cell):
        for x in range(-cell, w + cell, cell):
            off = (cell / 2) if ((y // cell) % 2) else 0
            cx, cy = x + off, y + cell / 2
            shapes += foil(cx, cy, cell * 0.2, n=4, rot=math.pi / 4, lobe=0.5)
    m = cv.mask(shapes)
    hole = cv.mask([circle(x + ((cell / 2) if ((y // cell) % 2) else 0), y + cell / 2, cell * 0.05)
                    for y in range(-cell, h + cell, cell) for x in range(-cell, w + cell, cell)])
    return np.clip(m - hole, 0, 1)


# ------------------------------------------------------------------ kapak
def build_flap():
    t0 = time.time()
    cv = Canvas(W, FLAP_H, ss=3)
    fp = flap_poly()
    m_flap = cv.mask([fp])
    sd = sdf(m_flap)
    L = Layer(W, FLAP_H)
    L.add_height(np.clip(-sd / 3.0, 0, 1) * 0.12)
    edge_h, edge_m, _ = profile(sd, [(3, 'lin', 0.12, 0.3), (7, 'bead', 0.3, 0.22), (3, 'lin', 0.3, 0.12)])
    L.add_height(edge_h * 0.9, edge_m, gold=True, tint=0.2)
    e = flap_edge()
    nr = normals_of(e)
    mid = len(e) // 2
    sgn = 1.0 if (e[mid] + nr[mid] * 30)[1] < e[mid][1] else -1.0
    inner1 = e + nr * 30 * sgn
    inner2 = e + nr * 64 * sgn
    L.add(cv.mask(band(inner1, 6, cap=False)) * np.clip((-sd - 20) / 3, 0, 1), 1.4, 0.45, 'round', gold=True, tint=0.2)
    L.add(cv.mask(band(inner2, 4, cap=False)) * np.clip((-sd - 50) / 3, 0, 1), 1.2, 0.35, 'round', gold=True, tint=0.3)
    # kemer içi dilimleme (cusping): iç çizgi boyunca taraklı yaldız bant
    cz = cusps_along(inner1[4:-4], 26, 30, inward_sign=sgn)
    m_cz = cv.mask(cz) * np.clip((-sd - 12) / 3, 0, 1)
    m_cz_e = np.clip(m_cz - ndi.binary_erosion(m_cz > 0.5, iterations=4), 0, 1)
    L.add(m_cz, 3, 0.18, 'soft', gold=False)
    L.add(m_cz_e, 1.2, 0.45, 'round', gold=True, tint=0.1)
    inner_m = np.clip((-sd - 80) / 4.0, 0, 1) * np.clip((np.arange(FLAP_H)[:, None] - 80) / 4.0, 0, 1)

    # --- kapak içi: yaldız pencere tracery'si (iki mızrak + üstte büyük yonca daire)
    tr = []
    ring_c = (CX, 470.0)
    ring_r = 150.0
    tr += band(circle(*ring_c, ring_r, 360), 12, cap=False)
    tr += band(circle(*ring_c, ring_r - 26, 360), 5, cap=False)
    for k, (fx, fy) in enumerate([(ring_c[0] + (ring_r * 0.42) * math.cos(a), ring_c[1] + (ring_r * 0.42) * math.sin(a))
                                  for a in np.linspace(-math.pi / 2, 1.5 * math.pi, 4, endpoint=False)]):
        pass
    four = foil(ring_c[0], ring_c[1], ring_r * 0.78, n=4, rot=math.pi / 4, lobe=0.5)
    m_four = cv.mask(four)
    m_four_edge = np.clip(m_four - ndi.binary_erosion(m_four > 0.5, iterations=6), 0, 1)
    # iki mızrak kemer
    lanc = []
    for s in (-1, 1):
        lx = CX + s * 150
        arch = pointed_arch(lx, 700.0, 170, 1.1, y_bottom=860.0)
        lanc.append(arch)
    m_lanc = cv.mask(lanc)
    m_lanc_edge = np.clip(m_lanc - ndi.binary_erosion(m_lanc > 0.5, iterations=7), 0, 1)
    # dış büyük kemer (ikisini ve daireyi saran)
    big = pointed_arch(CX, 640.0, 560, 1.0, y_bottom=880.0)
    m_big = cv.mask([big])
    m_big_edge = np.clip(m_big - ndi.binary_erosion(m_big > 0.5, iterations=9), 0, 1)
    m_tr = np.clip(cv.mask(tr) + m_four_edge + m_lanc_edge + m_big_edge, 0, 1) * inner_m
    L.add(m_tr, 2.0, 0.6, 'round', gold=True, tint=0.15)
    # açıklıklarda kör kabartma derinlik (mızrakların içi hafif çukur, yonca içi hafif kabarık)
    L.add_height(-0.08 * soften(m_lanc, 3) * inner_m)
    L.add(m_four * inner_m * (1 - m_four_edge), 6, 0.12, 'soft', gold=False)
    # tepede küçük kör kemer frizi (kapağın üst kenarı boyunca)
    fr = []
    for i in range(12):
        ax = 90 + i * 82
        fr.append(pointed_arch(ax, 110.0, 56, 1.0, y_bottom=150.0))
    m_fr = cv.mask(fr)
    m_fr_edge = np.clip(m_fr - ndi.binary_erosion(m_fr > 0.5, iterations=4), 0, 1)
    L.add(m_fr_edge * np.clip((-sd - 30) / 3, 0, 1), 1.2, 0.4, 'round', gold=True, tint=0.25)
    # zemin: yaldız yıldızlı gece mavisi (Sainte-Chapelle tavanı gibi)
    st = cv.mask(star_field(W, FLAP_H, spacing=104, seed=4))
    busy = soften(np.clip(L.h * 4, 0, 1), 6)
    free = np.clip(1 - busy * 3, 0, 1) * inner_m * (1 - soften(m_big, 5))
    L.add(st * np.clip(free * 2, 0, 1), 1.2, 0.4, 'dome', gold=True, tint=0.05)
    h = soften(L.h, 0.55)
    print('gotik kapak', round(time.time() - t0, 1), 's')
    return h, L.metal, L.tint, m_flap


# ------------------------------------------------------------------ cep
def build_pocket():
    t0 = time.time()
    cv = Canvas(W, H, ss=3)
    L = Layer(W, H)
    m_body = cv.mask([rect(0, 0, W, H)], erase=[throat_poly()])
    sd_body = border_sd(W, H)
    edge_h, edge_m, _ = profile(sd_body, [(3, 'lin', 0.12, 0.3), (7, 'bead', 0.3, 0.22), (3, 'lin', 0.3, 0.12)])
    L.add_height(edge_h * 0.9, edge_m, gold=True, tint=0.2)
    L.add(cv.mask(band(np.array([[34.0, 40.0], [34.0, H - 34], [W - 34.0, H - 34], [W - 34.0, 40.0]]), 5, cap=False)),
          1.2, 0.4, 'round', gold=True, tint=0.25)
    # yan kenar kemer frizi (dikey kör kemerler)
    fr = []
    for side in (0, 1):
        x = 72 if side == 0 else W - 72
        for i in range(24):
            y = 180 + i * 78
            fr.append(pointed_arch(x, y + 30, 40, 1.0, y_bottom=y + 70))
    m_fr = cv.mask(fr)
    m_fr_e = np.clip(m_fr - ndi.binary_erosion(m_fr > 0.5, iterations=3), 0, 1)
    L.add(m_fr_e, 1.0, 0.35, 'round', gold=True, tint=0.3)

    # pinakl kuleler (iki yanda)
    pins = []
    for s in (-1, 1):
        px = CX + s * 330
        body, spire, fin = pinnacle(px, 1180.0, 70, 520)
        pins += body + spire + fin
        shaft = rect(px - 22, 1700, px + 22, 2000)
        pins.append(shaft)
    m_pin = cv.mask(pins)
    m_pin_e = np.clip(m_pin - ndi.binary_erosion(m_pin > 0.5, iterations=5), 0, 1)
    L.add(m_pin, 4, 0.45, 'soft', gold=False, cover=True)
    L.add(m_pin_e, 1.4, 0.45, 'round', gold=True, tint=0.1)
    # pinakl gövdesinde kör kemerli niş ve külahta yıldız
    niche, sp_st = [], []
    for s in (-1, 1):
        px = CX + s * 330
        niche.append(pointed_arch(px, 1470.0, 36, 1.1, y_bottom=1640.0))
        sp_st.append(star8(px, 1300.0, 12))
    m_n = cv.mask(niche)
    m_n_e = np.clip(m_n - ndi.binary_erosion(m_n > 0.5, iterations=3), 0, 1)
    L.add(m_n_e, 1.0, 0.4, 'round', gold=True, tint=0.2)
    L.add_height(-0.06 * soften(m_n, 2))
    L.add(cv.mask(sp_st), 1.2, 0.45, 'dome', gold=True)

    # gül pencere + çerçeve
    rx, ry = ROSE_C
    S = int(ROSE_R * 2 + 40)
    rgb, m_glass, disk, lead = rose_glass(S, ROSE_R, seed=11)
    x0 = int(rx - S / 2)
    y0 = int(ry - S / 2)
    glass_full = np.zeros((H, W, 3), np.float32)
    glass_m = np.zeros((H, W), np.float32)
    disk_m = np.zeros((H, W), np.float32)
    glass_full[y0:y0 + S, x0:x0 + S] = rgb
    glass_m[y0:y0 + S, x0:x0 + S] = m_glass
    disk_m[y0:y0 + S, x0:x0 + S] = disk
    # taş işçiliği = disk içinde cam olmayan yerler (yaldız kabartma)
    tracery = np.clip(disk_m - glass_m, 0, 1)
    L.add(tracery, 1.6, 0.55, 'round', gold=True, tint=0.2)
    L.add_height(-0.06 * soften(glass_m, 1.5))
    # dış halka pervazı
    sd_r = sdf(disk_m)
    rh, rm, _ = profile(sd_r, [(5, 'lin', 0.1, 0.4), (12, 'bead', 0.4, 0.35), (6, 'lin', 0.6, 0.3), (10, 'bead', 0.3, 0.3),
                              (8, 'lin', 0.45, 0.0)], outward=True)
    L.add_height(soften(rh, 0.7), rm, gold=True, tint=0.1)
    # yonca çerçeve: dört büyük yay
    qf = foil(rx, ry, ROSE_R + 110, n=4, rot=math.pi / 4, lobe=0.42)
    m_qf = cv.mask(qf)
    m_qf_e = np.clip(m_qf - ndi.binary_erosion(m_qf > 0.5, iterations=10), 0, 1) * (1 - soften(disk_m, 2) * 0)
    ring_clear = np.clip(1 - cv.mask([circle(rx, ry, ROSE_R + 52)]), 0, 1)
    L.add(m_qf_e * ring_clear, 2.2, 0.6, 'round', gold=True, tint=0.15)
    # yoncanın içi hafif kabarık (kör kabartma)
    L.add(m_qf * ring_clear * (1 - m_qf_e), 8, 0.1, 'soft', gold=False)

    # isim kurdelesi
    mid, folds, tails_r = ribbon_banner(CX, 2010, 560, 92)
    m_tails = cv.mask(tails_r)
    L.add(m_tails, 3, 0.32, 'round', gold=False, cover=True, floor=0.02)
    m_folds = cv.mask(folds)
    L.add(m_folds, 2, 0.22, 'round', gold=False, cover=True, floor=0.02)
    m_mid = cv.mask(mid)
    L.add(m_mid, 13, 0.62, 'dome', gold=False, cover=True, floor=0.02)
    for mm in (m_mid, m_tails):
        rim_h, rim_m, _ = profile(sdf(mm), [(3, 'lin', 0.0, 0.0), (5, 'bead', 0.0, 0.16)])
        L.add_height(rim_h, rim_m * mm, gold=True, tint=0.25)

    # zemin: yaldız yıldızlar
    st = cv.mask(star_field(W, H, spacing=104, seed=7))
    busy = soften(np.clip(L.h * 4, 0, 1), 7)
    frame_clear = np.clip((-sd_body - 100) / 4, 0, 1)
    free = np.clip(1 - busy * 3, 0, 1) * frame_clear * (1 - soften(m_qf, 6))
    L.add(st * np.clip(free * 2, 0, 1), 1.2, 0.4, 'dome', gold=True, tint=0.05)
    h = soften(L.h, 0.55)
    print('gotik cep', round(time.time() - t0, 1), 's')
    return h, L.metal, L.tint, m_body, glass_full, glass_m, m_folds


def albedo(hh, metal, tint, seed, glass=None, glass_m=None):
    Hh, Ww = hh.shape
    fib = noise(Hh, Ww, 1.3, seed, stretch=(1.0, 0.5))
    mott = noise(Hh, Ww, 2.6, seed + 1)
    alb = PAPER[None, None] * (0.9 + 0.14 * fib[..., None]) * (0.92 + 0.14 * mott[..., None])
    # hafif gümüş-mavi pırıltı tozu
    sparkle = (noise(Hh, Ww, 0.3, seed + 2) > 0.985).astype(np.float32)
    alb = alb + sparkle[..., None] * C(90, 100, 150) * 0.5
    n = noise(Hh, Ww, 2.0, seed + 5)
    k = np.clip(tint + (n - 0.5) * 0.35, 0, 1)[..., None]
    g = GOLD_A * (1 - k) + GOLD_B * k
    cav = cavity(hh, 4)
    g = g * (1 - np.clip(cav * 6, 0, 0.45))[..., None]
    alb = alb * (1 - metal[..., None]) + g * metal[..., None]
    if glass is not None:
        alb = alb * (1 - glass_m[..., None]) + glass * glass_m[..., None]
    ao = 1 - np.clip(cavity(hh, 7) * 3.2, 0, 0.3)
    return np.clip(alb * ao[..., None], 0, 1)


def main():
    os.makedirs(OUT, exist_ok=True)
    hf, mf, tf, m_flap = build_flap()
    alb_f = albedo(hf, mf, tf, 31)
    hp, mp, tp, m_body, glass, glass_m, m_fold = build_pocket()
    alb_p = albedo(hp, mp, tp, 17, glass, glass_m)
    alb_p *= (1 - 0.25 * soften(m_fold, 1.0))[..., None]
    save_rgb(os.path.join(OUT, 'zarf-cep.webp'), bleed_rgb(alb_p, m_body), m_body, quality=86)
    save_rgb(os.path.join(OUT, 'zarf-cep-veri.webp'), np.dstack([hp / max(hp.max(), 1e-6), mp, glass_m]), lossless=True)
    save_rgb(os.path.join(OUT, 'zarf-kapak.webp'), bleed_rgb(alb_f, m_flap), m_flap, quality=86)
    save_rgb(os.path.join(OUT, 'zarf-kapak-veri.webp'), np.dstack([hf / max(hf.max(), 1e-6), mf, np.zeros_like(mf)]), lossless=True)
    manifest = {
        'w': W, 'h': H, 'kapakH': FLAP_H, 'hmax': HMAX,
        'yukseklik': {'cep': round(float(hp.max()) * HMAX, 3), 'kapak': round(float(hf.max()) * HMAX, 3)},
        'muhur': {'x': float(SEAL[0]), 'y': float(SEAL[1]), 'boyut': 360, 'disk': 108},
        'uc': [CX, TIP_Y], 'kurdele': {'x': 540, 'y': 2010, 'w': 560, 'h': 92},
        'fresk': {'x': float(ROSE_C[0]), 'y': float(ROSE_C[1]), 'rx': ROSE_R, 'ry': ROSE_R},
        'bogaz': [[0, 110], [CX, 900], [W, 110]],
        'kanonikIsik': [300.0, 300.0, 1100.0],
        'camIsiltisi': 0.85
    }
    with open(os.path.join(OUT, 'zarf.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    light = (300.0, 300.0, 1100.0)
    lit_p = shade(alb_p, hp, mp, HMAX, light, matte=glass_m)
    lit_p = lit_p * (1 - glass_m[..., None]) + np.clip(alb_p * 1.25, 0, 1) * glass_m[..., None]
    lit_f = shade(alb_f, hf, mf, HMAX, light)
    closed = lit_p.copy()
    shadow = ndi.gaussian_filter(np.pad(m_flap, ((0, H - FLAP_H), (0, 0))), 9)
    shadow = ndi.shift(shadow, (12, 7), order=1)
    closed *= (1 - 0.5 * shadow)[..., None]
    a = m_flap[..., None]
    closed[:FLAP_H] = closed[:FLAP_H] * (1 - a) + lit_f * a
    save_rgb(os.path.join(OUT, 'zarf-pisik.webp'), closed, quality=80)
    preview(os.path.join(PREV, 'gotik_zarf.png'), closed, maxw=540)
    # mühür: mor mum
    seal, _ = wax_seal(360, color=(0.34, 0.10, 0.44), seed=9)
    save_rgb(os.path.join(OUT, 'muhur.webp'), bleed_rgb(seal[..., :3], seal[..., 3]), seal[..., 3], quality=88)
    # astar: koyu mor zemin + yaldız zambak kafes yerine gotik yonca
    inside = lining(W, 900, base=(0.14, 0.06, 0.22), gold=(0.84, 0.66, 0.32), seed=6)
    yy = np.arange(900, dtype=np.float32)[:, None]
    inside *= (0.55 + 0.45 * smoothstep(0, 520, yy))[..., None]
    save_rgb(os.path.join(OUT, 'zarf-astar.webp'), inside, quality=84)
    back = lining(W, FLAP_H, base=(0.14, 0.06, 0.22), gold=(0.84, 0.66, 0.32), seed=12)
    rim = np.exp(-((-sdf(m_flap) - 22) / 2.2) ** 2)[..., None]
    back = back * (1 - rim) + GOLD_A * rim
    save_rgb(os.path.join(OUT, 'zarf-kapak-arka.webp'), bleed_rgb(back, m_flap), m_flap, quality=84)


if __name__ == '__main__':
    main()
