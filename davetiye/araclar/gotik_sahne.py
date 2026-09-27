"""Gotik doğum günü sahneleri için görseller.

  portal.webp            taş portal: sivri kemerli arşivoltlar, sütunlar, üçgen alınlık, vitraylı kemer alnı (RGBA)
  kapi-sol/sag.webp      ahşap kapı kanatları: tahta, demir menteşe kıvrımları, çiviler (RGBA)
  nef-kemer.webp         nef kemeri: iki yanda demet sütun, sivri kemer, ortası saydam (RGBA)
  gul-pencere.webp       büyük vitray gül pencere (RGBA)
  vitray-<renk>.webp     mızrak vitray pencereler (ortada simge için boş madalyon) (RGBA)
  velin.webp             el yazması parşömeni (açık renk)
"""
from __future__ import annotations

import math
import os
import sys
import time

import numpy as np
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
from susleme import (Canvas, GOLD, band, circle, emboss, noise, profile, rect, sdf, shade, smoothstep, soften,
                     cavity, save_rgb, preview, bleed_rgb, equalize, curvature_curve, beads_along, volute)
from gotik import (pointed_arch, arch_apex, foil, rose_glass, rose_openings, stained_glass_w, VITRAY, C, star8,
                   crockets_along, cusps_along)

OUT = os.path.join(os.path.dirname(__file__), '..', 'temalar', 'gotik', 'gorsel')
PREV = os.environ.get('ONIZLEME', '/tmp')
STONE = C(176, 164, 146)


def stone_albedo(h, w, seed, base=STONE, blocks=True, block_h=64, block_w=128):
    n1 = noise(h, w, 2.4, seed)
    n2 = noise(h, w, 1.2, seed + 1)
    alb = base[None, None] * (0.84 + 0.2 * n1[..., None]) * (0.95 + 0.08 * n2[..., None])
    if blocks:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        row = (yy // block_h).astype(int)
        xo = xx + (row % 2) * block_w / 2
        ly = np.abs((yy % block_h) - 0)
        lx = np.abs((xo % block_w) - 0)
        joint = np.minimum(np.minimum(ly, block_h - ly), np.minimum(lx, block_w - lx))
        j = 1 - smoothstep(0.5, 2.5, joint)
        alb = alb * (1 - 0.35 * j[..., None])
        tone = noise(1, 4096, 0.2, seed + 2)[0]
        bid = ((row * 37 + (xo // block_w).astype(int) * 11) % 4096)
        alb = alb * (0.9 + 0.16 * tone[bid][..., None])
    return alb


def stone_shade(alb, hh, light, amb=0.3, hmax=18.0, gold=None):
    metal = np.zeros_like(hh) if gold is None else gold
    return shade(alb, hh, metal, hmax, light, amb=amb)


# ------------------------------------------------------------------ portal
def portal(W=1000, H=1640, seed=3):
    t0 = time.time()
    cv = Canvas(W, H, ss=2)
    cx = W / 2
    door_w = 470
    spring = 900.0
    bottom = H - 10.0
    hh = np.zeros((H, W), np.float32)
    # arşivoltlar: içten dışa sivri kemer bantları
    opening = pointed_arch(cx, spring, door_w, 1.0, y_bottom=bottom)
    m_open = cv.mask([opening])
    sd_o = sdf(m_open)
    arch_h, arch_m, _ = profile(sd_o, [(10, 'lin', 0.2, 0.5), (22, 'bead', 0.5, 0.45), (10, 'cove', 0.9, 0.4),
                                       (26, 'bead', 0.4, 0.5), (10, 'cove', 0.9, 0.35), (24, 'bead', 0.35, 0.5),
                                       (10, 'cove', 0.85, 0.3), (28, 'bead', 0.3, 0.55), (14, 'lin', 0.85, 0.2)],
                                outward=True)
    hh = np.maximum(hh, arch_h)
    # kemer bantlarında küçük yaprak/çiçek frizi (bir bant boyunca)
    fl = []
    band_curve = pointed_arch(cx, spring, door_w + 2 * 64, 1.0 * (door_w + 128) / (door_w + 128))
    for k in range(22):
        t = (k + 0.5) / 22
        j = int(t * (len(band_curve) - 1))
        px, py = band_curve[j]
        fl += foil(px, py, 13, n=4, rot=math.pi / 4, lobe=0.5)
    m_fl = cv.mask(fl) * (1 - m_open)
    hh = np.maximum(hh, arch_h * (1 - m_fl) + (0.55 + emboss(m_fl, 2, 'dome') * 0.4) * m_fl)
    # sütunlar (kapı kenarlarında, kemerin altında)
    for s in (-1, 1):
        for k, off in enumerate((24, 64, 106)):
            x = cx + s * (door_w / 2 + off)
            col = rect(x - 12, spring, x + 12, bottom)
            m = cv.mask([col])
            xx = np.arange(W, dtype=np.float32)[None, :]
            cyl = np.sqrt(np.clip(1 - ((xx - x) / 12) ** 2, 0, 1))
            hh = np.maximum(hh, m * (0.35 + 0.5 * cyl))
            cap = cv.mask([rect(x - 20, spring - 40, x + 20, spring)])
            hh = np.maximum(hh, cap * 0.75)
    # alınlık (wimperg) ve fiyonk tepe
    apex = arch_apex(spring, door_w, 1.0)
    outer_r = door_w / 2 + 160
    g_base = spring - 40
    gable = np.array([[cx - outer_r - 30, g_base + 60], [cx + outer_r + 30, g_base + 60], [cx, 60.0]], float)
    m_g = cv.mask([gable])
    sd_g = sdf(m_g)
    gh, gm, _ = profile(sd_g, [(10, 'lin', 0.2, 0.55), (18, 'bead', 0.55, 0.4), (10, 'lin', 0.7, 0.3)])
    hh = np.maximum(hh, gh * (1 - m_open))
    # alınlık yüzeyi: kör yonca pencere
    tre = foil(cx, apex - 150, 70, n=3, rot=-math.pi / 2, lobe=0.5)
    m_tre = cv.mask(tre)
    m_tre_e = np.clip(m_tre - ndi.binary_erosion(m_tre > 0.5, iterations=8), 0, 1)
    hh = np.maximum(hh, m_tre_e * 0.6)
    crk = crockets_along(np.array([[cx - outer_r - 20, g_base + 50], [cx, 70.0]]), 70, 42, outward_sign=1.0)
    crk += crockets_along(np.array([[cx, 70.0], [cx + outer_r + 20, g_base + 50]]), 70, 42, outward_sign=1.0)
    m_crk = cv.mask(crk)
    hh = np.maximum(hh, emboss(m_crk, 2.5, 'round') * 0.8)
    fin = foil(cx, 44, 30, n=4, rot=math.pi / 4)
    m_fin = cv.mask(fin)
    hh = np.maximum(hh, emboss(m_fin, 3, 'dome') * 0.9)
    # kemer alnı (tympanum): vitray (kapıların üstünde)
    tym = pointed_arch(cx, spring, door_w, 1.0, y_bottom=spring + 30)
    m_tym = cv.mask([tym]) * (np.arange(H)[:, None] < spring + 20)
    glass, lead = stained_glass_w(m_tym, seed + 9, [VITRAY['safir'], VITRAY['yakut'], VITRAY['altin'], VITRAY['gok']],
                                  [0.45, 0.25, 0.15, 0.15], cell=26)
    # alınlıkta rozet (gül) taşı
    ro_o = rose_openings(cx, spring - 150, 120, petals=8)
    # duvar
    alb = stone_albedo(H, W, seed)
    alb = alb * (1 - np.clip(cavity(hh, 6) * 4, 0, 0.5))[..., None]
    wall_m = cv.mask([rect(0, g_base + 60, W, H)])
    body = np.clip(np.maximum(wall_m, m_g) + (hh > 0.02), 0, 1) * (1 - m_open)
    lit = stone_shade(alb, soften(hh, 0.7), (cx - 300, -200, 1200), amb=0.34)
    # kapı açıklığının derinliği: iç kenarda gölge
    inner_shadow = (1 - smoothstep(0, 40, -sd_o)) * m_open
    rgb = lit * body[..., None]
    rgb = rgb * (1 - m_tym[..., None]) + glass * m_tym[..., None]
    alpha = np.clip(body + m_tym, 0, 1)
    # duvar kenarlarında karartma (sahnede kenarlar koyu)
    xx = np.arange(W, dtype=np.float32)[None, :] / W
    yy = np.arange(H, dtype=np.float32)[:, None] / H
    vig = 1 - 0.55 * smoothstep(0.25, 0.5, np.abs(xx - 0.5)) - 0.3 * smoothstep(0.7, 1.0, yy)
    rgb = rgb * np.clip(vig, 0.2, 1)[..., None]
    print('portal', round(time.time() - t0, 1), 's')
    return rgb, alpha, dict(door_w=door_w, spring=spring, bottom=bottom, W=W, H=H)


def door_leaf(w, h, spring_off, arch_w, side, seed=5):
    """Kapı kanadı: sivri kemerin yarısı biçiminde ahşap + demir işçilik. side=-1 sol, 1 sağ."""
    cv = Canvas(w, h, ss=2)
    full = pointed_arch(w if side < 0 else 0, spring_off, arch_w, 1.0, y_bottom=h)
    m_full = cv.mask([full])
    m_half = m_full * cv.mask([rect(0, 0, w, h)])
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # tahtalar (dikey)
    plank = 58
    px = (xx % plank)
    joint = np.minimum(px, plank - px)
    grain = noise(h, w, 1.5, seed, stretch=(0.05, 1.0))
    grain2 = noise(h, w, 2.4, seed + 1, stretch=(0.1, 1.0))
    wood = C(92, 52, 28) * (0.7 + 0.4 * grain[..., None]) * (0.85 + 0.25 * grain2[..., None])
    wood = wood * (0.9 + 0.2 * noise(1, 64, 0.5, seed + 2)[0][(xx // plank).astype(int) % 64][..., None])
    hh = (1 - np.exp(-joint / 3)) * 0.4 + grain * 0.05
    # demir menteşe kolları (yatay, kıvrım uçlu)
    iron = []
    for y0 in (h * 0.3, h * 0.72):
        x_start = 0 if side > 0 else w
        dirx = 1 if side > 0 else -1
        strap = np.array([[x_start, y0 - 13], [x_start + dirx * w * 0.8, y0 - 9], [x_start + dirx * w * 0.8, y0 + 9], [x_start, y0 + 13]], float)
        iron.append(strap)
        # uçta kıvrımlar
        ex = x_start + dirx * w * 0.8
        for sgn in (-1, 1):
            v = volute(ex, y0, 0 if dirx > 0 else math.pi, 36, turns=1.1, pitch=0.2, lead=20, sign=sgn * dirx)
            iron += band(v, lambda t: 12 * (1 - 0.6 * t), cap=True)
    studs = []
    for y in np.arange(spring_off * 0.4, h, 70):
        for x in np.arange(plank / 2, w, plank):
            studs.append(circle(x, y, 5))
    m_iron = cv.mask(iron) * m_half
    m_st = cv.mask(studs) * m_half
    hh = hh + emboss(m_iron, 2.5, 'round') * 0.6 + emboss(m_st, 2, 'dome') * 0.5
    # halka tokmak
    rx = w * 0.18 if side < 0 else w * 0.82
    ring_m = cv.mask(band(circle(rx, h * 0.52, 28, 120), 7, cap=False)) * m_half
    plate = cv.mask([circle(rx, h * 0.52 - 30, 16)]) * m_half
    hh = hh + emboss(ring_m, 2, 'round') * 0.6 + emboss(plate, 2.5, 'dome') * 0.5
    metal = np.clip(m_iron + m_st + ring_m + plate, 0, 1)
    alb = wood * (1 - metal[..., None]) + C(48, 46, 50) * metal[..., None]
    alb = alb * (1 - np.clip(cavity(hh, 4) * 3, 0, 0.4))[..., None]
    lit = shade(alb, soften(hh, 0.6), metal * 0.8, 10.0, (w * 0.5 - side * 400, -300, 900), amb=0.3)
    return lit, m_half


def nave_arch(W=1200, H=1700, seed=11):
    """Nef kemeri: ortası saydam sivri kemer açıklığı, iki yanda demet sütunlar, üstte duvar."""
    cv = Canvas(W, H, ss=2)
    cx = W / 2
    ow = W * 0.66
    spring = H * 0.46
    opening = pointed_arch(cx, spring, ow, 1.0, y_bottom=H + 10)
    m_open = cv.mask([opening])
    sd_o = sdf(m_open)
    hh, _, _ = profile(sd_o, [(14, 'lin', 0.2, 0.6), (26, 'bead', 0.6, 0.4), (12, 'cove', 1.0, 0.45),
                              (30, 'bead', 0.45, 0.5), (16, 'lin', 0.9, 0.3)], outward=True)
    # demet sütunlar
    xx = np.arange(W, dtype=np.float32)[None, :]
    for s in (-1, 1):
        for off, r in ((10, 16), (38, 12), (64, 18), (96, 12)):
            x = cx + s * (ow / 2 + off)
            cyl = np.sqrt(np.clip(1 - ((xx - x) / r) ** 2, 0, 1)) * (np.arange(H)[:, None] > spring - 20)
            hh = np.maximum(hh, cyl * 0.8)
    alb = stone_albedo(H, W, seed, base=C(150, 138, 122))
    alb = alb * (1 - np.clip(cavity(hh, 6) * 4, 0, 0.5))[..., None]
    lit = stone_shade(alb, soften(hh, 0.8), (cx, spring + 300, 700), amb=0.22)
    # açıklığa bakan kenarlar ışık alır (içeriden gelen ışık)
    rim = np.exp(-(-sd_o.clip(-1e9, 0) + 0) * 0) * 0
    alpha = 1 - m_open
    # kenarlarda ve üstte karartma
    yy = np.arange(H, dtype=np.float32)[:, None] / H
    xn = xx / W
    vig = 1 - 0.6 * smoothstep(0.2, 0.5, np.abs(xn - 0.5)) - 0.5 * smoothstep(0.3, 0.0, yy)
    lit = lit * np.clip(vig, 0.15, 1)[..., None]
    return lit, alpha


def big_rose(S=1200, seed=21):
    R = S * 0.46
    rgb, m_glass, disk, lead = rose_glass(S, R, seed=seed, petals=16, cell=R * 0.045)
    tracery = np.clip(disk - m_glass, 0, 1)
    cv = Canvas(S, S, ss=2)
    outer = cv.mask([circle(S / 2, S / 2, R + 30)])
    ring = np.clip(outer - disk, 0, 1)
    hh = emboss(tracery, 2.5, 'round') * 0.7
    sd_r = sdf(disk)
    rh, rm, _ = profile(sd_r, [(6, 'lin', 0.1, 0.5), (12, 'bead', 0.5, 0.35), (8, 'cove', 0.8, 0.4), (4, 'lin', 0.4, 0.0)], outward=True)
    hh = np.maximum(hh, rh)
    alb = stone_albedo(S, S, seed + 3, base=C(140, 128, 112), blocks=False)
    lit = stone_shade(alb, soften(hh, 0.7), (S / 2, S / 2, S * 0.4), amb=0.3)
    stone_m = np.clip(tracery + ring, 0, 1)
    out = lit * stone_m[..., None] + rgb * 1.15
    alpha = np.clip(stone_m + m_glass, 0, 1)
    return np.clip(out, 0, 1), alpha


def lancet(color, W=460, H=1240, seed=31):
    """Mızrak vitray: taş çerçeve + renk temalı cam + ortada boş madalyon (simge için)."""
    cv = Canvas(W, H, ss=2)
    cx = W / 2
    ow = W - 110
    spring = ow * 1.1 + 40
    opening = pointed_arch(cx, spring, ow, 1.15, y_bottom=H - 50)
    m_open = cv.mask([opening])
    med_c = (cx, H * 0.46)
    med_r = ow * 0.36
    m_med = cv.mask([circle(*med_c, med_r)])
    base = VITRAY[color]
    accents = {'safir': ['yakut', 'altin', 'gok'], 'yakut': ['altin', 'safir', 'gul'], 'zumrut': ['altin', 'yakut', 'gok'],
               'ametist': ['altin', 'gul', 'safir'], 'kehribar': ['yakut', 'zumrut', 'altin']}[color]
    pal = [base, base * 0.8 + 0.1, VITRAY[accents[0]], VITRAY[accents[1]], VITRAY[accents[2]]]
    body_m = np.clip(m_open - m_med, 0, 1)
    g1, l1 = stained_glass_w(body_m, seed, pal, [0.45, 0.25, 0.12, 0.1, 0.08], cell=24)
    # madalyon: soluk altın-sarı cam (simge üzerine bindirilecek)
    g2, l2 = stained_glass_w(m_med, seed + 1, [C(240, 214, 150), C(250, 230, 180)], [0.6, 0.4], cell=40)
    # madalyon çevresinde halka kurşun + boncuk
    ring = cv.mask(band(circle(*med_c, med_r + 6, 200), 7, cap=False))
    beads = cv.mask(beads_along(circle(*med_c, med_r + 20, 400), 22, 5, 5)) * m_open
    glass = g1 + g2
    glass = glass * (1 - ring[..., None]) + C(22, 18, 24) * ring[..., None]
    glass = glass * (1 - beads[..., None]) + VITRAY[accents[0]] * beads[..., None]
    # taş çerçeve
    sd_o = sdf(m_open)
    hh, fm, _ = profile(sd_o, [(8, 'lin', 0.2, 0.55), (18, 'bead', 0.55, 0.4), (10, 'cove', 0.9, 0.4),
                               (14, 'lin', 0.4, 0.0)], outward=True)
    alb = stone_albedo(H, W, seed + 2, base=C(120, 110, 98), blocks=False)
    lit = stone_shade(alb, soften(hh, 0.7), (cx, -300, 800), amb=0.3)
    frame = np.clip(fm, 0, 1)
    rgb = lit * frame[..., None] + glass * 1.1
    alpha = np.clip(frame + m_open, 0, 1)
    return np.clip(rgb, 0, 1), alpha, dict(med_c=med_c, med_r=med_r, W=W, H=H)


def vellum(W=900, H=1500, seed=41):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = xx / W, yy / H
    base = C(242, 230, 204)
    mott = noise(H, W, 2.6, seed)
    fib = noise(H, W, 1.2, seed + 1, stretch=(1.0, 0.3))
    img = base * (0.9 + 0.12 * mott[..., None]) * (0.97 + 0.05 * fib[..., None])
    edge = np.minimum(np.minimum(u, 1 - u) * W, np.minimum(v, 1 - v) * H)
    burn = 1 - smoothstep(0, 60, edge + (noise(H, W, 2.0, seed + 3) - 0.5) * 40)
    img = img * (1 - burn[..., None] * 0.35) + C(150, 110, 60) * burn[..., None] * 0.2
    return np.clip(img, 0, 1)


def main():
    os.makedirs(OUT, exist_ok=True)
    rgb, a, info = portal()
    save_rgb(os.path.join(OUT, 'portal.webp'), bleed_rgb(rgb, a), a, quality=82)
    preview(os.path.join(PREV, 'portal.png'), rgb * a[..., None], maxw=500)
    dw, spring, bottom = info['door_w'], info['spring'], info['bottom']
    hl = int(bottom - (arch_apex(spring, dw, 1.0)))
    leaf_w = int(dw / 2)
    sp_off = spring - arch_apex(spring, dw, 1.0)
    for side, ad in ((-1, 'kapi-sol'), (1, 'kapi-sag')):
        lit, m = door_leaf(leaf_w, hl, sp_off, dw, side, seed=5 + side)
        save_rgb(os.path.join(OUT, ad + '.webp'), bleed_rgb(lit, m), m, quality=82)
        if side < 0:
            left = (lit, m)
    import json
    with open(os.path.join(OUT, 'portal.json'), 'w') as f:
        json.dump({'W': info['W'], 'H': info['H'], 'kapiX': info['W'] / 2 - dw / 2, 'kapiY': float(arch_apex(spring, dw, 1.0)),
                   'kapiW': dw, 'kapiH': hl}, f)
    na, naa = nave_arch()
    save_rgb(os.path.join(OUT, 'nef-kemer.webp'), bleed_rgb(na, naa), naa, quality=80)
    preview(os.path.join(PREV, 'nef.png'), na * naa[..., None], maxw=400)
    br, bra = big_rose()
    save_rgb(os.path.join(OUT, 'gul-pencere.webp'), bleed_rgb(br, bra), bra, quality=84)
    preview(os.path.join(PREV, 'buyuk_gul.png'), br * bra[..., None], maxw=500)
    prevs = []
    for i, c in enumerate(('safir', 'yakut', 'zumrut', 'ametist')):
        lr, la, linfo = lancet(c, seed=31 + i * 5)
        save_rgb(os.path.join(OUT, 'vitray-%s.webp' % c), bleed_rgb(lr, la), la, quality=82)
        prevs.append(lr * la[..., None])
    preview(os.path.join(PREV, 'vitraylar.png'), np.concatenate(prevs, 1), maxw=900)
    with open(os.path.join(OUT, 'vitray.json'), 'w') as f:
        json.dump({'W': linfo['W'], 'H': linfo['H'], 'madalyon': [linfo['med_c'][0], linfo['med_c'][1], linfo['med_r']]}, f)
    save_rgb(os.path.join(OUT, 'velin.webp'), vellum(), quality=78)


if __name__ == '__main__':
    main()
