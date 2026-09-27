"""Paylaşım (og:image) görselleri: 1200x630, pişmiş zarf + tema arka planı.

Kullanım: python3 paylasim.py
Çıktı: temalar/<tema>/gorsel/paylasim.jpg ve katalog için kapak-<tema>.webp
"""
from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageFilter

KOK = os.path.join(os.path.dirname(__file__), '..', 'temalar')
TEMALAR = {
    'barok': ((46, 12, 20), (12, 3, 6), (255, 214, 150)),
    'gotik': ((26, 32, 80), (6, 8, 20), (170, 190, 255)),
}
# demo davetiyelerin monogramları ve mühür yazı tipleri
MONOGRAM = {'barok': ('A&M', 'pinyon-script.woff2', (88, 6, 12)), 'gotik': ('D', 'unifraktur-maguntia.woff2', (40, 8, 56))}


def ttf_yolu(woff2):
    """woff2 -> geçici ttf (PIL woff2 okuyamaz)."""
    from fontTools.ttLib import TTFont
    import tempfile
    kaynak = os.path.join(os.path.dirname(__file__), '..', 'yazitipleri', woff2)
    hedef = os.path.join(tempfile.gettempdir(), woff2.replace('.woff2', '.ttf'))
    if not os.path.exists(hedef):
        f = TTFont(kaynak)
        f.flavor = None
        f.save(hedef)
    return hedef


def muhurlu_zarf(tema):
    """Pişmiş zarfın üstüne mühür + monogram (sayfada ayrı katman olduğu için)."""
    import json
    from PIL import ImageDraw, ImageFont
    g = os.path.join(KOK, tema, 'gorsel')
    zarf = Image.open(os.path.join(g, 'zarf-pisik.webp')).convert('RGBA')
    m = json.load(open(os.path.join(g, 'zarf.json')))
    ms = m['muhur']
    muhur = Image.open(os.path.join(g, 'muhur.webp')).convert('RGBA').resize((ms['boyut'], ms['boyut']), Image.LANCZOS)
    x, y = int(ms['x'] - ms['boyut'] / 2), int(ms['y'] - ms['boyut'] / 2)
    golge = Image.new('RGBA', muhur.size, (40, 0, 0, 0))
    golge.putalpha(muhur.getchannel('A').point(lambda v: int(v * 0.5)))
    golge = golge.filter(ImageFilter.GaussianBlur(10))
    zarf.alpha_composite(golge, (x + 6, y + 14))
    zarf.alpha_composite(muhur, (x, y))
    yazi, font, renk = MONOGRAM[tema]
    try:
        fnt = ImageFont.truetype(ttf_yolu(font), int(ms['disk'] * (0.9 if len(yazi) > 1 else 1.3)))
        d = ImageDraw.Draw(zarf)
        cx, cy = ms['x'], ms['y'] + ms['disk'] * 0.04
        d.text((cx, cy + 2), yazi, font=fnt, fill=(255, 150, 150, 90), anchor='mm')
        d.text((cx, cy - 1), yazi, font=fnt, fill=(0, 0, 0, 150), anchor='mm')
        d.text((cx, cy), yazi, font=fnt, fill=renk + (235,), anchor='mm')
    except Exception as e:  # yazı tipi yoksa monogramsız
        print('monogram yazılamadı:', e)
    return zarf.convert('RGB')


def arka(w, h, ic, dis, isik):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.hypot((xx - w / 2) / (w * 0.6), (yy - h * 0.45) / (h * 0.7))
    t = np.clip(r, 0, 1)[..., None]
    img = np.array(ic, np.float32) * (1 - t) + np.array(dis, np.float32) * t
    rng = np.random.default_rng(3)
    for _ in range(90):
        x, y = rng.random() * w, rng.random() * h
        rr = 0.6 + rng.random() * 1.6
        d = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * rr * rr))
        img += np.array(isik, np.float32) * d[..., None] * (0.4 + rng.random() * 0.6)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def main():
    for tema, (ic, dis, isik) in TEMALAR.items():
        g = os.path.join(KOK, tema, 'gorsel')
        zarf = muhurlu_zarf(tema)
        W, H = 1200, 630
        bg = arka(W, H, ic, dis, isik)
        # zarf: eğik yerleşim ve gölge
        zh = int(H * 0.92)
        zw = int(zh * zarf.width / zarf.height)
        z = zarf.resize((zw, zh), Image.LANCZOS)
        golge = Image.new('L', (zw + 80, zh + 80), 0)
        golge.paste(255, (40, 40, 40 + zw, 40 + zh))
        golge = golge.filter(ImageFilter.GaussianBlur(22))
        x, y = (W - zw) // 2, (H - zh) // 2
        bg.paste((0, 0, 0), (x - 40 + 10, y - 40 + 16), golge.point(lambda v: int(v * 0.75)))
        bg.paste(z, (x, y))
        bg.save(os.path.join(g, 'paylasim.jpg'), quality=86, optimize=True, progressive=True)
        # katalog kapağı: dikey, telefon ekranı oranı
        kw, kh = 720, 1440
        kbg = arka(kw, kh, ic, dis, isik)
        zh2 = int(kh * 0.9)
        zw2 = int(zh2 * zarf.width / zarf.height)
        z2 = zarf.resize((zw2, zh2), Image.LANCZOS)
        kbg.paste(z2, ((kw - zw2) // 2, (kh - zh2) // 2))
        kbg.save(os.path.join(g, 'kapak.webp'), 'WEBP', quality=80, method=6)
        print(tema, 'tamam')


if __name__ == '__main__':
    main()
