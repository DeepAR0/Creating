"""Barok hikâye sahneleri için görseller.

  perde-sol.webp / perde-sag.webp  kadife tiyatro perdesi panelleri (RGBA)
  perde-ust.webp                   drapeli üst saçak (valans) + saçak + püsküller (RGBA)
  sahne-arka.webp                  perde arkası: sıcak ışıklı sahne zemini
  kubbe.webp                       aşağıdan bakılan barok kubbe: balüstrad halkası + fresk gökyüzü
  bulut-1..3.webp                  uçuş sahnesi için bulut katmanları (RGBA)
  cerceve.webp                     yaldızlı tablo çerçevesi (RGBA, ortası saydam)
  tablo-*.webp                     hikâye bölümleri için yağlı boya sahneler
  parsomen.webp                    parşömen dokusu
  madalyon.webp                    altın madalyon yüzü (RGBA)
"""
from __future__ import annotations

import math
import os
import sys
import time

import numpy as np
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
from susleme import (Canvas, GOLD, band, beads_along, bezier, c_scroll, circle, ellipse, emboss, equalize,
                     flatten, mirror_x, noise, normals, profile, rect, rounded_rect, save_rgb, sdf, shade,
                     smoothstep, soften, cavity, preview, bleed_rgb, acanthus_leaf, curvature_curve, shell,
                     rosette, s_scroll, transform)
from fresk import fresco, clouds, dove_shape

OUT = os.path.join(os.path.dirname(__file__), '..', 'temalar', 'barok', 'gorsel')
PREV = os.environ.get('ONIZLEME', '/tmp')
C = lambda *v: np.array(v, np.float32) / 255.0  # noqa: E731


# ------------------------------------------------------------------ kadife
def velvet_shade(h, hscale, base=C(120, 10, 22), deep=C(34, 2, 7), sheen=C(236, 110, 118),
                 light=(-0.25, -0.75, 0.62), sheen_pow=2.2, sheen_amt=0.55):
    """Kadife: bakana dönük yüzler koyu-doygun, sıyırma açılarında pembe-parlak ışıltı."""
    N = normals(h, hscale)
    L = np.array(light, np.float32)
    L /= np.linalg.norm(L)
    ndl = np.clip((N * L).sum(2), 0, 1)
    ndv = np.clip(N[..., 2], 0, 1)
    rim = (1 - ndv) ** sheen_pow
    col = deep * (1 - ndl[..., None]) + base * ndl[..., None]
    col = col * (0.55 + 0.75 * ndl[..., None])
    col = col + sheen * (rim * sheen_amt * (0.35 + 0.65 * ndl))[..., None]
    return np.clip(col, 0, 1)


def fold_profile(n, w, folds, seed, sharp=1.0):
    """Perde kıvrım profili: düzensiz aralıklı sinüs katları (1B)."""
    rng = np.random.default_rng(seed)
    x = np.linspace(0, 1, n)
    # düzensiz faz: kıvrım genişlikleri değişsin
    warp = np.cumsum(0.6 + 0.8 * rng.random(n)) / n
    warp = (warp - warp[0]) / (warp[-1] - warp[0])
    ph = warp * folds * 2 * math.pi
    f = np.sin(ph)
    f = np.sign(f) * np.abs(f) ** (1.0 / sharp)
    f += 0.35 * np.sin(ph * 2.3 + rng.random() * 6) + 0.15 * np.sin(ph * 5.1 + rng.random() * 6)
    return f / np.abs(f).max()


def curtain_panel(w, h, seed=1, folds=6.5, flip=False, fringe_h=70):
    """Kapalı perde paneli (RGBA). Üstte büzgülü, altta genişleyen kıvrımlar, altın saçaklı etek.

    Panelin iç kenarı (flip=False iken sağ kenar) derin bir son kıvrımla biter.
    """
    t0 = time.time()
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xx / w
    v = yy / h
    prof = fold_profile(4096, w, folds, seed, sharp=0.85)
    prof = ndi.gaussian_filter1d(prof, 18)
    prof /= np.abs(prof).max()
    squeeze = 0.80 + 0.20 * smoothstep(0.0, 0.7, v)
    uu = 0.5 + (u - 0.5) * squeeze + 0.010 * np.sin(v * 5 + seed)
    idx = np.clip((uu * 4095).astype(int), 0, 4095)
    depth = (30 + 30 * smoothstep(0.0, 0.8, v))
    hmap = prof[idx] * depth
    # iç kenar: kumaş kendi üstüne kıvrılır (yuvarlak sırt + arkasında gölge)
    edge_d = (1 - u) * w
    roll = np.exp(-((edge_d - 26) / 20) ** 2) * 34
    hmap += roll
    # kumaşın hafif dikey dalgalanması (çok düşük frekans)
    hmap += (noise(h, w, 3.0, seed + 3, stretch=(5.0, 1.0)) - 0.5) * 10
    hn = hmap / 50.0
    # etek: kıvrımlarla dalgalanan alt kenar
    px = np.clip((np.linspace(0, 1, w) * 4095).astype(int), 0, 4095)
    hem_y = h - fringe_h - 18 - prof[px] * 16
    hem = np.clip((hem_y[None, :] - yy) / 1.5 + 0.5, 0, 1)
    col = velvet_shade(hn, 50.0, sheen_amt=0.62)
    # kadife havı: çok ince, zayıf doku
    col *= (0.975 + 0.035 * noise(h, w, 1.2, seed + 4, stretch=(3.0, 1.0))[..., None])
    col *= (0.70 + 0.30 * smoothstep(0.0, 0.14, v))[..., None]
    # iç kenar karanlığı (panellerin birleştiği yer)
    col *= (1 - 0.45 * np.exp(-edge_d / 10))[..., None]
    # altın saçak: örgü bant + sarkık iplikler
    band_top = hem_y[None, :] - 16
    band_m = ((yy > band_top) & (yy < hem_y[None, :] + 4)).astype(np.float32)
    band_m = ndi.gaussian_filter(band_m, 0.8)
    braid = 0.55 + 0.45 * np.sin(xx * 0.55 + (yy - band_top) * 0.9) * np.sin(xx * 0.55 - (yy - band_top) * 0.9)
    gold_b = GOLD * (0.55 + 0.6 * braid[..., None])
    strands_x = noise(1, w, 0.2, seed + 7)[0]
    strand = 0.5 + 0.5 * np.sin(xx * 1.9 + strands_x[None, :] * 9)
    flen = fringe_h * (0.85 + 0.3 * noise(1, w, 1.5, seed + 8)[0])
    fr_m = ((yy >= hem_y[None, :] + 2) & (yy < hem_y[None, :] + 2 + flen[None, :])).astype(np.float32)
    fr_m *= np.clip(strand * 1.6 - 0.2, 0, 1)
    fr_t = np.clip((yy - hem_y[None, :]) / np.maximum(flen[None, :], 1), 0, 1)
    gold_f = GOLD * (0.45 + 0.7 * strand[..., None]) * (1 - 0.45 * fr_t[..., None])
    alpha = np.clip(hem + fr_m, 0, 1)
    rgb = col * hem[..., None]
    rgb = rgb * (1 - band_m[..., None]) + gold_b * band_m[..., None]
    rgb = rgb + gold_f * (fr_m * (1 - hem))[..., None]
    if flip:
        rgb = rgb[:, ::-1]
        alpha = alpha[:, ::-1]
    print('perde paneli', round(time.time() - t0, 1), 's')
    return rgb, alpha


def valance(w, h, swags=3, seed=5):
    """Üst saçak: yarım daire kavisli drapeler (festoon), altın saçak ve püsküller."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rgb = np.zeros((h, w, 3), np.float32)
    alpha = np.zeros((h, w), np.float32)
    sw = w / swags
    top_band = 70
    # üst düz bant (kıvrımlı, dikey)
    prof = fold_profile(1024, w, 26, seed, sharp=1.2)
    hb = prof[np.clip((xx / w * 1023).astype(int), 0, 1023)] * 10
    band_col = velvet_shade(hb / 12.0, 12.0)
    bm = (yy < top_band).astype(np.float32)
    rgb += band_col * bm[..., None]
    alpha = np.maximum(alpha, bm)
    # drapeler
    for i in range(swags):
        cx = sw * (i + 0.5)
        x0, x1 = cx - sw * 0.62, cx + sw * 0.62
        dx = (xx - cx) / (sw * 0.62)
        inside_x = np.abs(dx) < 1
        sag = h * 0.62
        bottom = top_band * 0.6 + sag * np.sqrt(np.clip(1 - dx ** 2, 0, 1)) ** 0.9
        top = top_band * 0.5 + (h * 0.12) * np.sqrt(np.clip(1 - dx ** 2, 0, 1))
        t = np.clip((yy - top) / np.maximum(bottom - top, 1), 0, 1)
        m = (inside_x & (yy >= top - 2) & (yy <= bottom + 1)).astype(np.float32)
        m *= np.clip((bottom - yy) / 1.5 + 0.5, 0, 1)
        # kavis boyunca yatay kıvrımlar
        folds = np.sin(t * 7.0 * math.pi + np.abs(dx) * 1.2) * (8 + 10 * t)
        folds += (noise(h, w, 2.2, seed + i) - 0.5) * 4
        cc = velvet_shade(folds / 16.0, 16.0, light=(-0.2, -0.85, 0.5))
        cc *= (0.6 + 0.4 * (1 - t))[..., None]
        # sıra: sonraki drape öncekinin üstüne
        rgb = rgb * (1 - m[..., None]) + cc * m[..., None]
        alpha = np.maximum(alpha, m)
        # alt kenarda altın saçak
        fr_len = 38
        fr = ((yy > bottom - 2) & (yy < bottom + fr_len) & inside_x).astype(np.float32)
        strand = 0.5 + 0.5 * np.sin(xx * 2.1)
        fr *= np.clip(strand * 1.6 - 0.25, 0, 1)
        ft = np.clip((yy - bottom) / fr_len, 0, 1)
        gcol = GOLD * (0.5 + 0.65 * strand[..., None]) * (1 - 0.5 * ft[..., None])
        rgb = rgb * (1 - fr[..., None]) + gcol * fr[..., None]
        alpha = np.maximum(alpha, fr)
        braid_m = (inside_x & (np.abs(yy - bottom + 4) < 6)).astype(np.float32)
        braid = 0.55 + 0.45 * np.sin(xx * 0.7 + yy * 1.1) * np.sin(xx * 0.7 - yy * 1.1)
        rgb = rgb * (1 - braid_m[..., None]) + GOLD * (0.5 + 0.6 * braid[..., None]) * braid_m[..., None]
    # püsküller: drapelerin birleştiği yerlerde
    cv = Canvas(w, h, ss=3)
    for i in range(swags + 1):
        px = sw * i
        cord = band(np.array([[px, top_band - 10], [px, top_band + 60]], float), 7, cap=True)
        head = [ellipse(px, top_band + 70, 16, 18)]
        skirt = [np.array([[px - 14, top_band + 82], [px + 14, top_band + 82], [px + 26, top_band + 170],
                           [px - 26, top_band + 170]], float)]
        m_all = cv.mask(cord + head + skirt)
        hh = emboss(cv.mask(head), 5, 'dome') * 1.0 + emboss(cv.mask(cord), 2, 'round') * 0.6
        sk = cv.mask(skirt)
        strands = 0.5 + 0.5 * np.sin((xx - px) * 1.4)
        hh += sk * (0.3 + 0.4 * strands)
        alb = np.broadcast_to(GOLD, (h, w, 3)).copy()
        lit = shade(alb, hh, np.ones_like(hh), 8.0, (px - 60, top_band - 40, 300), shadows=False)
        lit *= (1 - 0.35 * smoothstep(top_band + 90, top_band + 170, yy))[..., None]
        rgb = rgb * (1 - m_all[..., None]) + lit * m_all[..., None]
        alpha = np.maximum(alpha, m_all)
    return np.clip(rgb, 0, 1), alpha


def stage_back(w, h, seed=11):
    """Perde arkası: sıcak spot ışıklı koyu sahne + zeminde ışık havuzu."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    base = C(40, 8, 14) * (1 - v[..., None] * 0.4)
    spot = np.exp(-(((u - 0.5) / 0.42) ** 2 + ((v - 0.42) / 0.36) ** 2))[..., None]
    col = base * (1 - spot) + C(150, 70, 40) * spot * 0.9 + C(255, 200, 120) * spot ** 3 * 0.35
    # arka duvar: dikey pilaster gölgeleri
    pil = 0.5 + 0.5 * np.cos(u * math.pi * 6)
    col *= (0.85 + 0.15 * pil[..., None])
    # zemin
    floor = smoothstep(0.78, 0.82, v)[..., None]
    fcol = C(60, 22, 16) * (0.8 + 0.4 * np.exp(-((u - 0.5) / 0.3) ** 2))[..., None]
    col = col * (1 - floor) + fcol * floor
    n = noise(h, w, 1.5, seed)
    col *= (0.93 + 0.1 * n[..., None])
    return np.clip(col, 0, 1)


def dome(S=1400, seed=21):
    """Aşağıdan bakılan barok kubbe (kare RGB). Merkez: fresk gök; halkalar: korniş, balüstrad, kasetler."""
    t0 = time.time()
    c = S / 2
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    dx, dy = xx - c, yy - c
    r = np.hypot(dx, dy) / c                     # 0 merkez, 1 kenar
    th = np.arctan2(dy, dx)
    h = np.zeros((S, S), np.float32)
    metal = np.zeros((S, S), np.float32)
    alb = np.zeros((S, S, 3), np.float32)
    stone = C(236, 226, 206)
    # ---- merkez fresk (göğün devamı balüstradın arkasında da görünür)
    fr_size = int(S * 0.64)
    fr = fresco(fr_size, fr_size, seed=seed, light=(0.5, 0.5), doves=True, rays=30, coverage=0.62,
                aged=0.3, warm=0.55, dove_pos=[(0.34, 0.56, 0.75, -0.25, False), (0.66, 0.56, 0.75, 0.25, True)],
                dove_scale=0.8)
    off = (S - fr_size) // 2
    sky = np.zeros((S, S, 3), np.float32)
    sky[:] = C(70, 110, 170)
    sky[off:off + fr_size, off:off + fr_size] = fr
    # ---- balüstrad (r 0.33..0.47): radyal babalar, perspektifte
    R0, R1 = 0.335, 0.47
    N = 44
    dth = 2 * math.pi / N
    a = ((th + math.pi) % dth) - dth / 2
    sb = np.clip((r - R0) / (R1 - R0), 0, 1)
    # vazo profili (üst ince boyun, altta göbek)
    # baba: üstte kare başlık, ince boyun, bilezik, geniş göbek, altta kaide
    prof = (0.55 * np.exp(-((sb - 0.07) / 0.06) ** 2) + 0.30
            + 0.22 * np.exp(-((sb - 0.26) / 0.04) ** 2)
            + 0.70 * np.exp(-((sb - 0.64) / 0.16) ** 2)
            + 0.45 * np.exp(-((sb - 0.95) / 0.06) ** 2))
    prof = np.minimum(prof, 1.0) * (0.8 + 0.2 * sb)
    hw = prof * dth * 0.46 * r
    d = np.abs(a) * r
    inb = (r > R0 + 0.012) & (r < R1 - 0.012)
    bal = np.clip((hw - d) * c / 1.2 + 0.5, 0, 1) * inb
    bal_h = np.sqrt(np.clip(1 - (d / np.maximum(hw, 1e-4)) ** 2, 0, 1)) * inb
    h = np.maximum(h, bal_h * 0.9)
    # üst korkuluk ve alt kaide halkaları
    def ring(r0, r1, amp, gold=False, bead=True):
        t = (r - r0) / (r1 - r0)
        m = ((t >= 0) & (t <= 1)).astype(np.float32)
        prof = np.sqrt(np.clip(1 - (2 * t - 1) ** 2, 0, 1)) if bead else np.clip(1 - np.abs(2 * t - 1) ** 3, 0, 1)
        return m, prof * amp * m
    m1, h1 = ring(R0 - 0.02, R0 + 0.014, 1.0)
    m2, h2 = ring(R1 - 0.014, R1 + 0.028, 1.1, bead=False)
    m2b, h2b = ring(R1 + 0.028, R1 + 0.042, 0.6)
    m3, h3 = ring(R0 - 0.035, R0 - 0.02, 0.5)
    for mm, hh in ((m1, h1), (m2, h2), (m2b, h2b), (m3, h3)):
        h = np.where(mm > 0, np.maximum(h, hh), h)
    metal = np.maximum(metal, m3 + m2b)
    # ---- korniş ve kaset halkası (r 0.51..1.0)
    RC0 = R1 + 0.042
    rows = [RC0, 0.60, 0.70, 0.82, 0.96, 1.12]
    NK = 28
    dk = 2 * math.pi / NK
    ak = ((th + math.pi + dk / 2 * 0) % dk) - dk / 2
    cof_h = np.zeros_like(h)
    ros = np.zeros_like(h)
    for i in range(len(rows) - 1):
        ra, rb = rows[i], rows[i + 1]
        inr = (r >= ra) & (r < rb)
        bb = ((r - ra) / (rb - ra)) * 2 - 1                 # -1..1 radyal
        aa = ak / (dk / 2)                                   # -1..1 açısal
        mx = np.maximum(np.abs(aa) * 1.0, np.abs(bb))
        # basamaklı çukur: dış çerçeve -> iç çukur
        step = np.where(mx > 0.86, 1.0, np.where(mx > 0.74, 0.62, np.where(mx > 0.64, 0.36, 0.08)))
        step = ndi.gaussian_filter(step * inr, 1.2)
        cof_h = np.where(inr, step, cof_h)
        rr_ = np.hypot(aa * (dk / 2) * r / ((rb - ra) / 2), bb)
        ros_m = (rr_ < 0.34) & inr
        ros = np.where(ros_m, np.sqrt(np.clip(1 - (rr_ / 0.34) ** 2, 0, 1)), ros)
        # rozet yaprakları
        pet = (0.5 + 0.5 * np.cos(np.arctan2(bb, aa) * 8)) * (rr_ < 0.34)
        ros = np.where(ros_m, ros * (0.75 + 0.25 * pet), ros)
    inc = r >= RC0
    h = np.where(inc, cof_h * 0.9 + ros * 0.6, h)
    metal = np.maximum(metal, (ros > 0.02).astype(np.float32) * inc)
    # kaset çerçevelerinde ince yaldız çizgi
    gold_line = ((cof_h > 0.55) & (cof_h < 0.7)).astype(np.float32) * inc
    metal = np.maximum(metal, gold_line * 0.9)
    # ---- albedo
    alb[:] = stone
    n = noise(S, S, 1.8, seed + 2)
    alb *= (0.9 + 0.12 * n[..., None])
    coffer_in = (cof_h < 0.2) & inc
    alb = np.where(coffer_in[..., None], C(150, 170, 196) * (0.85 + 0.15 * n[..., None]), alb)
    alb = np.where(metal[..., None] > 0.5, GOLD, alb)
    # gök: balüstrad arasında ve merkezde
    sky_m = ((r < R0 - 0.035) | ((r > R0 + 0.014) & (r < R1 - 0.014) & (bal < 0.5))).astype(np.float32)
    sky_m = ndi.gaussian_filter(sky_m, 0.7)
    # ---- ışık: merkezden (tepe penceresinden) gelen ışık
    lit = shade(alb, soften(h, 0.8), metal, 14.0, (c, c, S * 0.35), amb=0.35, shadows=False)
    # dış halkalar kenara doğru kararır (derinlik)
    vig = (1 - 0.55 * smoothstep(0.55, 1.1, r))[..., None]
    lit *= vig
    # balüstradın arkasında gökte hafif hale
    img = lit * (1 - sky_m[..., None]) + sky * sky_m[..., None]
    # balüstrad babalarının gök üzerindeki gölgeleri (merkeze bakan yüz aydınlık)
    print('kubbe', round(time.time() - t0, 1), 's')
    return np.clip(img, 0, 1)


def cloud_layer(w, h, seed, coverage=0.45, lx=0.5, ly=-0.3):
    cl = clouds(h, w, seed, coverage, lx, ly, w / h, warm=0.7, ring_r=(0.0, 0.01), edge_w=0.0, soft=0.12)
    a = smoothstep(0.12, 0.75, ndi.gaussian_filter(cl[..., 3], 2.5))
    # kenarlarda sönümle (kesik görünmesin)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    e = smoothstep(0.0, 0.18, np.minimum(np.minimum(xx / w, 1 - xx / w), np.minimum(yy / h, 1 - yy / h)))
    return cl[..., :3], a * e


def gilt_frame(W=900, H=1180, border=120, seed=31):
    """Yaldızlı barok tablo çerçevesi (RGBA). İç açıklık saydam."""
    t0 = time.time()
    cv = Canvas(W, H, ss=3)
    outer = rounded_rect(0 + 24, 60, W - 24, H - 24, 26)
    inner = rounded_rect(border, border + 36, W - border, H - border, 14)
    m_out = cv.mask([outer])
    m_in = cv.mask([inner])
    m_frame = np.clip(m_out - m_in, 0, 1)
    sd_o = sdf(m_out)
    sd_i = sdf(m_in)
    hh = np.zeros((H, W), np.float32)
    # dıştan içe profil: boncuk, oluk, geniş yuvarlak (torus), içbükey, iç boncuk
    ho, _, _ = profile(sd_o, [(6, 'lin', 0.1, 0.4), (9, 'bead', 0.4, 0.25), (6, 'cove', 0.7, 0.45),
                              (30, 'bead', 0.45, 0.55), (10, 'lin', 0.9, 0.55), (22, 'cove', 0.55, 0.25)])
    hi, _, _ = profile(sd_i, [(4, 'lin', 0.0, 0.25), (10, 'bead', 0.25, 0.3), (8, 'lin', 0.5, 0.35)], outward=True)
    hh = np.maximum(ho, hi) * m_frame
    # ortadaki düz bantta akantus yaprak frizi (kör kabartma)
    # köşe süsleri
    corner = []
    for (cx, cy, sx, sy) in ((W * 0.12, H * 0.1, 1, 1), (W * 0.88, H * 0.1, -1, 1),
                             (W * 0.12, H * 0.94, 1, -1), (W * 0.88, H * 0.94, -1, -1)):
        cs = c_scroll((cx, cy + sy * 40), (cx + sx * 110, cy - sy * 0), bulge=0.3 * sx * sy, width=16, curl0=0.22, curl1=0.25)
        corner += flatten(cs['band'], cs['eyes'])
        sp = curvature_curve(cx + sx * 20, cy + sy * 20, math.atan2(sy, sx), 110, lambda u, k=sx * sy: -k * 1.8 * u ** 2 / 110, 50)
        lf = acanthus_leaf(sp, 70, fingers=3)
        corner += lf['blade'] + lf['fingers']
    # tepe tacı: deniz kabuğu + iki C
    sh = shell(W / 2, 96, 86, ang=-math.pi / 2, spread=math.radians(150), ribs=11, depth=0.12)
    cs1 = c_scroll((W / 2 - 40, 110), (W / 2 - 170, 70), bulge=-0.3, width=15, curl0=0.2, curl1=0.3)
    crest = flatten(sh['fan'], cs1['band'], cs1['eyes'])
    crest += mirror_x(flatten(cs1['band'], cs1['eyes']), W / 2)
    m_orn = cv.mask(corner + crest)
    hh = np.maximum(hh, emboss(m_orn, 3, 'round') * 1.1 + hh * (m_orn > 0.5))
    ribs = cv.mask(sh['ribs'])
    hh += emboss(ribs * cv.mask(sh['fan']), 1.6) * 0.35
    alpha = np.clip(m_frame + m_orn, 0, 1)
    hh = soften(hh, 0.6)
    # antika yaldız albedo: çukurlarda koyu
    n = noise(H, W, 2.0, seed)
    alb = np.broadcast_to(GOLD, (H, W, 3)).copy() * (0.85 + 0.2 * n[..., None])
    cav = cavity(hh, 5)
    alb *= (1 - np.clip(cav * 5, 0, 0.55))[..., None]
    lit = shade(alb, hh, np.ones_like(hh), 16.0, (W * 0.2, -H * 0.1, 900), amb=0.35)
    print('çerçeve', round(time.time() - t0, 1), 's')
    return lit, alpha


def brushify(img, seed, length=6, strength=1.0):
    """Yağlı boya fırça izi: gürültü akış alanı boyunca bulanıklaştırma + tuval dokusu."""
    H, W = img.shape[:2]
    ang = noise(H, W, 2.6, seed) * math.pi * 4
    dx, dy = np.cos(ang), np.sin(ang)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    acc = np.zeros_like(img)
    ks = range(-length, length + 1)
    for k in ks:
        sx = np.clip(xx + dx * k * strength, 0, W - 1)
        sy = np.clip(yy + dy * k * strength, 0, H - 1)
        for ch in range(3):
            acc[..., ch] += ndi.map_coordinates(img[..., ch], [sy, sx], order=1)
    out = acc / len(ks)
    # fırça darbesi dokusu ve tuval örgüsü
    streak = noise(H, W, 1.4, seed + 1, stretch=(1.0, 1.0))
    weave = 0.5 + 0.25 * (np.sin(xx * 1.9) + np.sin(yy * 1.9))
    out *= (0.94 + 0.08 * streak[..., None]) * (0.97 + 0.04 * weave[..., None])
    return np.clip(out, 0, 1)


def painting(kind, W=640, H=860, seed=1):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = xx / W, yy / H
    cv = Canvas(W, H, ss=3)
    if kind == 'deniz':
        hz = 0.56
        sky = np.where(v[..., None] < hz,
                       C(64, 52, 110) * (1 - smoothstep(0, hz, v)[..., None]) + C(250, 150, 90) * smoothstep(0, hz, v)[..., None],
                       0)
        sun_d = np.hypot((u - 0.5) * W / H, v - (hz - 0.08))
        sun = smoothstep(0.075, 0.065, sun_d)[..., None]
        glow = np.exp(-(sun_d / 0.18) ** 2)[..., None]
        sky = sky + C(255, 220, 150) * glow * 0.6 * (v[..., None] < hz)
        cl = clouds(H, W, seed, 0.3, 0.5, hz - 0.1, W / H, warm=1.2, ring_r=(0.1, 0.3), edge_w=0.0)
        cm = cl[..., 3:4] * (v[..., None] < hz - 0.05) * 0.8
        sky = sky * (1 - cm) + (cl[..., :3] * C(255, 190, 170)) * cm
        sky = sky * (1 - sun) + C(255, 240, 200) * sun
        sea_t = np.clip((v - hz) / (1 - hz), 0, 1)[..., None]
        sea = C(40, 50, 90) * sea_t + C(200, 110, 90) * (1 - sea_t)
        refl = np.exp(-((u - 0.5) / (0.05 + 0.25 * sea_t[..., 0])) ** 2)[..., None]
        ripple = 0.5 + 0.5 * np.sin(yy * 0.9 + noise(H, W, 1.8, seed + 2) * 20)
        sea = sea + C(255, 200, 130) * refl * ripple[..., None] * 0.8 * (1 - sea_t * 0.6)
        img = np.where(v[..., None] < hz, sky, sea)
        # uzak kıyı ve kule silueti
        shore = (v > hz - 0.02 - 0.02 * noise(1, W, 2.5, seed + 3)[0][None, :] * (u < 0.35)) & (v < hz + 0.004) & (u < 0.38)
        img = np.where(shore[..., None], C(50, 30, 50), img)
        tower = cv.mask([rect(0.18 * W, (hz - 0.13) * H, 0.2 * W, hz * H), np.array([[0.175 * W, (hz - 0.13) * H], [0.205 * W, (hz - 0.13) * H], [0.19 * W, (hz - 0.16) * H]])])
        img = img * (1 - tower[..., None]) + C(45, 28, 45) * tower[..., None]
    elif kind == 'balon':
        sky = C(140, 170, 215) * (1 - v[..., None]) + C(252, 206, 170) * v[..., None]
        sun_d = np.hypot((u - 0.72) * W / H, v - 0.62)
        sky = sky + C(255, 230, 190) * np.exp(-(sun_d / 0.25) ** 2)[..., None] * 0.7
        img = sky
        # peri bacaları (koniler) iki plan
        for layer, (base, col, n) in enumerate(((0.78, C(196, 150, 140), 7), (0.9, C(150, 100, 90), 5))):
            rng = np.random.default_rng(seed + layer)
            shapes = [rect(0, base * H, W, H)]
            for i in range(n):
                cx = rng.random() * W
                wd = (40 + rng.random() * 50) * (1 + layer * 0.5)
                ht = (120 + rng.random() * 140) * (1 + layer * 0.4)
                pts = bezier((cx - wd, base * H + 4), (cx - wd * 0.5, base * H - ht * 0.4), (cx - wd * 0.3, base * H - ht), (cx, base * H - ht), n=30)
                pts = np.concatenate([pts, mirror_x(pts, cx)])
                shapes.append(pts)
            m = cv.mask(shapes)
            lit = col * (0.85 + 0.2 * noise(H, W, 2.2, seed + 9)[..., None])
            img = img * (1 - m[..., None]) + lit * m[..., None]
        # balonlar
        rng = np.random.default_rng(seed + 5)
        pal = [C(214, 64, 70), C(242, 170, 60), C(90, 150, 200), C(160, 90, 170), C(230, 120, 60), C(70, 160, 120)]
        for i in range(9):
            bx = 0.1 * W + rng.random() * 0.8 * W
            by = (0.12 + rng.random() * 0.5) * H
            br = 18 + rng.random() * 38 * (1 - by / H + 0.3)
            env = np.concatenate([bezier((bx, by + br * 1.25), (bx - br * 1.2, by + br * 0.3), (bx - br * 1.1, by - br * 1.1), (bx, by - br * 1.15), n=30)])
            env = np.concatenate([env, mirror_x(env, bx)])
            m = cv.mask([env])
            col = pal[i % len(pal)]
            stripes = 0.75 + 0.25 * np.sign(np.sin((xx - bx) / br * 5))
            shade_b = 0.7 + 0.45 * np.clip(1 - np.hypot(xx - bx + br * 0.35, yy - by + br * 0.35) / (br * 1.6), 0, 1)
            bc = col * stripes[..., None] * shade_b[..., None]
            img = img * (1 - m[..., None]) + bc * m[..., None]
            basket = cv.mask([rect(bx - br * 0.18, by + br * 1.45, bx + br * 0.18, by + br * 1.7)])
            img = img * (1 - basket[..., None]) + C(90, 60, 40) * basket[..., None]
    else:  # gece
        sky = C(10, 16, 44) * (1 - v[..., None]) + C(40, 44, 96) * v[..., None]
        milky = np.exp(-(((u - v * 0.8 - 0.1)) / 0.18) ** 2)[..., None] * noise(H, W, 1.6, seed)[..., None]
        sky = sky + C(120, 110, 170) * milky * 0.35
        rng = np.random.default_rng(seed)
        img = sky.copy()
        stars = np.zeros((H, W), np.float32)
        for i in range(260):
            sx, sy = rng.random() * W, rng.random() * H * 0.8
            rr_ = 0.6 + rng.random() ** 3 * 2.6
            stars += np.exp(-((xx - sx) ** 2 + (yy - sy) ** 2) / (2 * rr_ ** 2)) * (0.5 + rng.random() * 0.5)
        img = img + C(255, 245, 220) * np.clip(stars, 0, 1)[..., None]
        # hilal
        md = np.hypot(xx - 0.72 * W, yy - 0.2 * H)
        md2 = np.hypot(xx - 0.745 * W, yy - 0.185 * H)
        moon = (smoothstep(52, 50, md) * smoothstep(44, 46, md2))[..., None]
        img = img + C(255, 240, 200) * np.exp(-(md / 140) ** 2)[..., None] * 0.18
        img = img * (1 - moon) + C(255, 244, 214) * moon
        # tepe ve ağaç silueti, iki kişi
        hill = cv.mask([np.concatenate([bezier((0, 0.8 * H), (0.3 * W, 0.72 * H), (0.7 * W, 0.76 * H), (W, 0.83 * H), n=60), [[W, H], [0, H]]])])
        img = img * (1 - hill[..., None]) + C(8, 10, 22) * hill[..., None]
        # çift silueti (basit)
        figs = []
        for (fx, hgt) in ((0.44 * W, 118), (0.52 * W, 108)):
            fy = 0.745 * H
            figs.append(ellipse(fx, fy - hgt, 11, 13))
            figs.append(np.array([[fx - 14, fy - hgt + 14], [fx + 14, fy - hgt + 14], [fx + 20, fy], [fx - 20, fy]], float))
        mf = cv.mask(figs)
        img = img * (1 - mf[..., None]) + C(8, 10, 22) * mf[..., None]
        # parıltılar (yüzük anı)
        sp = np.exp(-((xx - 0.48 * W) ** 2 + (yy - (0.745 * H - 70)) ** 2) / 30)
        img = img + C(255, 230, 170) * sp[..., None] * 1.2
    img = brushify(np.clip(img, 0, 1), seed + 20, length=5)
    # vernik: hafif sarımsı ve köşelerde koyu
    vig = 1 - 0.35 * smoothstep(0.35, 0.9, np.hypot(u - 0.5, (v - 0.5) * 0.9))
    img = img * vig[..., None] * C(255, 246, 225)
    return np.clip(img, 0, 1)


def parchment(W=900, H=1500, seed=51):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = xx / W, yy / H
    base = C(236, 214, 170)
    mott = noise(H, W, 2.6, seed)
    fib = noise(H, W, 1.2, seed + 1, stretch=(1.0, 0.3))
    stain = smoothstep(0.62, 0.9, equalize(noise(H, W, 3.0, seed + 2)))
    img = base * (0.86 + 0.18 * mott[..., None]) * (0.96 + 0.06 * fib[..., None])
    img = img * (1 - stain[..., None] * 0.18) + C(190, 140, 80) * stain[..., None] * 0.12
    edge = np.minimum(np.minimum(u, 1 - u) * W, np.minimum(v, 1 - v) * H)
    burn = 1 - smoothstep(0, 70, edge + (noise(H, W, 2.0, seed + 3) - 0.5) * 50)
    img = img * (1 - burn[..., None] * 0.55) + C(120, 70, 30) * burn[..., None] * 0.3
    return np.clip(img, 0, 1)


def medallion(S=800, seed=61):
    """Altın madalyon yüzü: boncuklu kenar, defne çelengi, düz orta alan."""
    cv = Canvas(S, S, ss=3)
    c = S / 2
    R = S * 0.47
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    r = np.hypot(xx - c, yy - c)
    disk = np.clip((R - r) + 0.5, 0, 1)
    sd = r - R
    hh, _, _ = profile(sd, [(10, 'lin', 0.2, 0.9), (16, 'bead', 0.9, 0.25), (8, 'lin', 0.9, 0.5), (6, 'cove', 0.5, 0.2)])
    beads = cv.mask(beads_along(circle(c, c, R * 0.86, 720), R * 0.07, R * 0.022, R * 0.022))
    hh += emboss(beads, 1.5, 'dome') * 0.35
    # defne çelengi: iki kavisli dal; her boğumda öne bakan yaprak çifti
    from susleme import leaf, resample
    leaves, stems = [], []
    for sgn in (-1, 1):
        a_s = np.linspace(math.pi / 2 + sgn * 0.22, math.pi / 2 + sgn * 2.95, 90)
        rr_ = R * 0.745
        stem = np.stack([c + rr_ * np.cos(a_s), c + rr_ * np.sin(a_s)], 1)
        stems += band(stem, R * 0.012, cap=True)
        for k in range(12):
            t = k / 11
            j = int(4 + t * 82)
            px, py = stem[j]
            tg = stem[min(j + 2, 89)] - stem[max(j - 2, 0)]
            ta = math.atan2(tg[1], tg[0])
            ln = R * (0.15 - 0.04 * t)
            for side in (-1, 1):
                la = ta + side * 0.52
                sp = np.array([[px, py], [px + math.cos(la) * ln, py + math.sin(la) * ln]])
                leaves.append(leaf(resample(sp, 30), ln * 0.42, lobes=1, lobe_depth=0.0, tip_taper=1.1))
    ml = cv.mask(leaves)
    hh += emboss(ml, 1.3, 'round') * 0.55 + emboss(cv.mask(stems), 1.0) * 0.3
    # damarlar: yaprak ortasında ince oluk
    field = r < R * 0.62
    hh = np.where(field, 0.1, hh)
    hh = soften(hh * disk, 0.6)
    n = noise(S, S, 2.0, seed)
    alb = np.broadcast_to(GOLD, (S, S, 3)).copy() * (0.9 + 0.15 * n[..., None])
    alb *= (1 - np.clip(cavity(hh, 4) * 5, 0, 0.5))[..., None]
    # orta alan: hafif mat, fırçalanmış metal
    brushed = 0.96 + 0.05 * np.sin((np.arctan2(yy - c, xx - c)) * 60 + noise(S, S, 1.0, seed + 1) * 3)
    alb = np.where(field[..., None], alb * brushed[..., None] * 0.82, alb)
    metal = np.where(field, 0.55, 1.0).astype(np.float32)
    lit = shade(alb, hh, metal, 14.0, (S * 0.18, S * 0.05, S * 0.9), amb=0.4)
    return lit, disk


def main():
    os.makedirs(OUT, exist_ok=True)
    W, H = 720, 1600
    # perde panelleri: ekran genişliğinin ~%60'ı, tam yükseklik
    lr, la = curtain_panel(W, H, seed=3, folds=6.5)
    save_rgb(os.path.join(OUT, 'perde-sol.webp'), bleed_rgb(lr, la), la, quality=80)
    rr, ra = curtain_panel(W, H, seed=8, folds=6.0, flip=True)
    save_rgb(os.path.join(OUT, 'perde-sag.webp'), bleed_rgb(rr, ra), ra, quality=80)
    vr, va = valance(1200, 420)
    save_rgb(os.path.join(OUT, 'perde-ust.webp'), bleed_rgb(vr, va), va, quality=82)
    sb = stage_back(800, 1600)
    save_rgb(os.path.join(OUT, 'sahne-arka.webp'), sb, quality=78)
    # önizleme: kapalı perde
    prev = np.zeros((H, 2 * W - 240, 3), np.float32)
    Wp = prev.shape[1]
    prev[:] = sb[:H, :Wp] if sb.shape[1] >= Wp else np.pad(sb, ((0, 0), (0, Wp - sb.shape[1]), (0, 0)), mode='edge')[:H]
    prev[:, :W] = prev[:, :W] * (1 - la[..., None]) + lr * la[..., None]
    prev[:, Wp - W:] = prev[:, Wp - W:] * (1 - ra[..., None]) + rr * ra[..., None]
    from PIL import Image
    vimg = np.array(Image.fromarray((vr * 255).astype(np.uint8)).resize((Wp, int(420 * Wp / 1200))), np.float32) / 255
    vam = np.array(Image.fromarray((va * 255).astype(np.uint8)).resize((Wp, int(420 * Wp / 1200))), np.float32) / 255
    prev[:vimg.shape[0]] = prev[:vimg.shape[0]] * (1 - vam[..., None]) + vimg * vam[..., None]
    preview(os.path.join(PREV, 'perde.png'), prev, maxw=500)
    kb = dome(1400)
    save_rgb(os.path.join(OUT, 'kubbe.webp'), kb, quality=80)
    preview(os.path.join(PREV, 'kubbe.png'), kb, maxw=700)
    for i, (cw, ch, cov) in enumerate(((1200, 700, 0.5), (1000, 600, 0.42), (1200, 800, 0.55))):
        cr, ca = cloud_layer(cw, ch, 40 + i, coverage=cov)
        save_rgb(os.path.join(OUT, 'bulut-%d.webp' % (i + 1)), bleed_rgb(cr, ca), ca, quality=78)
        if i == 0:
            preview(os.path.join(PREV, 'bulut.png'), cr * ca[..., None] + C(70, 110, 170) * (1 - ca[..., None]), maxw=600)
    fr, fa = gilt_frame()
    save_rgb(os.path.join(OUT, 'cerceve.webp'), bleed_rgb(fr, fa), fa, quality=84)
    preview(os.path.join(PREV, 'cerceve.png'), fr * fa[..., None] + (1 - fa[..., None]) * 0.2, maxw=450)
    tl = []
    for i, k in enumerate(('deniz', 'balon', 'gece')):
        pimg = painting(k, seed=70 + i)
        save_rgb(os.path.join(OUT, 'tablo-%s.webp' % k), pimg, quality=80)
        tl.append(pimg)
    preview(os.path.join(PREV, 'tablolar.png'), np.concatenate(tl, 1), maxw=900)
    pa = parchment()
    save_rgb(os.path.join(OUT, 'parsomen.webp'), pa, quality=78)
    md, mda = medallion()
    save_rgb(os.path.join(OUT, 'madalyon.webp'), bleed_rgb(md, mda), mda, quality=85)
    preview(os.path.join(PREV, 'madalyon.png'), md * mda[..., None] + (1 - mda[..., None]) * 0.15, maxw=400)


if __name__ == '__main__':
    main()
