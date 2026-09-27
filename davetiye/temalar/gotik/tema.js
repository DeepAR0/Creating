/*!
 * Gotik tema — doğum günü davetiyesi hikâye sahneleri
 *
 *  1. Açılış     katedral portalının kapıları açılır, nefte kemerlerin arasından uçulur,
 *                ışıldayan gül pencerenin önünde isim ve dev yaş rakamları belirir
 *  2. Yıllar     her bölüm bir vitray pencere: kaydırdıkça yanar, renkli ışık yazının üstüne düşer
 *  3. Davet      el yazması: süslü baş harf, satırları tüy kalem yazar
 *  4. Tarih      astronomik saat: halkalar dönüp tarihe kilitlenir, geri sayım
 *  5. Program    her olayın mumu kaydırdıkça yanar
 *  6. Mekan      sivri kemerli pencerede yıldızlı gece ve kalemle çizilen yapı
 *  7. LCV        mor mühürlü parşömen form
 *  8. Kapanış    pasta: mumları üflemek için dokun — konfeti, çanlar, "İyi ki doğdun!"
 */
(function (D) {
  'use strict';
  var U = D.yardimci;
  var G = 'temalar/gotik/gorsel/';
  var e = U.kacis;
  var PORTAL = { W: 1000, H: 1640, kapiX: 265, kapiY: 493, kapiW: 470, kapiH: 1137 };
  var VITRAYLAR = ['safir', 'yakut', 'zumrut', 'ametist'];

  function kisiAdi(cfg) { return (cfg.kisi && cfg.kisi.ad) || cfg.isim || ''; }

  function portalHTML() {
    var P = PORTAL, pc = function (v, t) { return (v / t * 100).toFixed(3) + '%'; };
    var kapiStil = 'top:' + pc(P.kapiY, P.H) + ';height:' + pc(P.kapiH, P.H) + ';width:' + pc(P.kapiW / 2, P.W) + ';';
    return '<div class="ga-portal"><div class="ga-portal-kutu">' +
      '<div class="ga-kapi-arka" style="' + kapiStil + 'left:' + pc(P.kapiX, P.W) + ';width:' + pc(P.kapiW, P.W) + '"></div>' +
      '<div class="ga-kapi ga-kapi-sol" style="' + kapiStil + 'left:' + pc(P.kapiX, P.W) + '"><img alt="" src="' + G + 'kapi-sol.webp"></div>' +
      '<div class="ga-kapi ga-kapi-sag" style="' + kapiStil + 'left:' + pc(P.kapiX + P.kapiW / 2, P.W) + '"><img alt="" src="' + G + 'kapi-sag.webp"></div>' +
      '<img alt="" class="ga-portal-img" src="' + G + 'portal.webp">' +
      '</div></div>';
  }

  /* ---- astronomik saat (SVG) */
  function saatSVG(t) {
    var p = [];
    var cx = 200, cy = 200;
    function yay(r, a0, a1) {
      var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      return 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    }
    // dış halka: 24 roma rakamı
    var dis = '<g class="as-dis">';
    dis += '<circle cx="200" cy="200" r="192" class="as-halka-zemin"/><circle cx="200" cy="200" r="192" class="as-cizgi"/><circle cx="200" cy="200" r="164" class="as-cizgi"/>';
    for (var i = 0; i < 24; i++) {
      var a = i / 24 * Math.PI * 2 - Math.PI / 2;
      var tx = cx + 178 * Math.cos(a), ty = cy + 178 * Math.sin(a);
      dis += '<text x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" transform="rotate(' + (i / 24 * 360).toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ')">' + U.romen((i % 12) + 1) + '</text>';
    }
    dis += '</g>';
    // orta halka: ay evreleri ve yıldızlar
    var orta = '<g class="as-orta"><circle cx="200" cy="200" r="150" class="as-orta-zemin"/><circle cx="200" cy="200" r="118" class="as-cizgi"/>';
    for (var k = 0; k < 12; k++) {
      var b = k / 12 * Math.PI * 2 - Math.PI / 2;
      var mx = cx + 134 * Math.cos(b), my = cy + 134 * Math.sin(b);
      if (k % 3 === 0) orta += '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="9" class="as-ay"/><circle cx="' + (mx + 4 * Math.cos(b + 1)).toFixed(1) + '" cy="' + (my + 4 * Math.sin(b + 1)).toFixed(1) + '" r="8" class="as-ay-golge"/>';
      else orta += '<path class="as-yildiz" d="' + yildizYol(mx, my, 8, 3.4, b) + '"/>';
      orta += '<path class="as-cizgi" d="M' + (cx + 118 * Math.cos(b + Math.PI / 12)).toFixed(1) + ' ' + (cy + 118 * Math.sin(b + Math.PI / 12)).toFixed(1) + 'L' + (cx + 150 * Math.cos(b + Math.PI / 12)).toFixed(1) + ' ' + (cy + 150 * Math.sin(b + Math.PI / 12)).toFixed(1) + '"/>';
    }
    orta += '</g>';
    // iç halka: burç yerine yıldız yolu (ekliptik) — eğik daire
    var ic = '<g class="as-ic"><circle cx="200" cy="186" r="84" class="as-ekliptik"/>';
    for (var j = 0; j < 36; j++) {
      var c2 = j / 36 * Math.PI * 2;
      ic += '<path class="as-cizgi ince" d="M' + (200 + 84 * Math.cos(c2)).toFixed(1) + ' ' + (186 + 84 * Math.sin(c2)).toFixed(1) + 'L' + (200 + (j % 3 ? 78 : 72) * Math.cos(c2)).toFixed(1) + ' ' + (186 + (j % 3 ? 78 : 72) * Math.sin(c2)).toFixed(1) + '"/>';
    }
    ic += '</g>';
    var ibreler = '<g class="as-akrep"><path d="M200 200 L200 70" class="as-ibre"/><circle cx="200" cy="60" r="12" class="as-gunes"/>' + gunesIsinlari(200, 60) + '</g>' +
      '<g class="as-yelkovan"><path d="M200 200 L200 100" class="as-ibre ince"/><circle cx="200" cy="98" r="8" class="as-ay"/></g>' +
      '<circle cx="200" cy="200" r="10" class="as-gobek"/>';
    var yazi = t ? '<g class="as-tarih"><text x="200" y="192" class="as-gun">' + t.gun + '</text><text x="200" y="222" class="as-ay-adi">' + e(U.buyuk(t.ay)) + '</text><text x="200" y="244" class="as-yil">' + t.yil + '</text></g>' : '';
    return '<svg class="as-saat" viewBox="0 0 400 400" aria-hidden="true">' + dis + orta + ic + yazi + ibreler + '</svg>';

    function yildizYol(x, y, r1, r2, rot) {
      var d = '';
      for (var n = 0; n < 10; n++) {
        var r = n % 2 ? r2 : r1, an = rot + n * Math.PI / 5;
        d += (n ? 'L' : 'M') + (x + r * Math.cos(an)).toFixed(1) + ' ' + (y + r * Math.sin(an)).toFixed(1);
      }
      return d + 'Z';
    }
    function gunesIsinlari(x, y) {
      var d = '';
      for (var n = 0; n < 12; n++) {
        var an = n * Math.PI / 6;
        d += 'M' + (x + 14 * Math.cos(an)).toFixed(1) + ' ' + (y + 14 * Math.sin(an)).toFixed(1) + 'L' + (x + 21 * Math.cos(an)).toFixed(1) + ' ' + (y + 21 * Math.sin(an)).toFixed(1);
      }
      return '<path class="as-gunes-isin" d="' + d + '"/>';
    }
  }

  /* ---- manastır / kale çizimi (mekan) */
  function yapiSVG() {
    var p = [];
    function yol(d, s) { p.push('<path pathLength="1" class="' + (s || '') + '" d="' + d + '"/>'); }
    yol('M20 272H380');
    // orta kule ve sivri çatı
    yol('M170 272V110H230V272');
    yol('M164 110L200 30L236 110Z');
    yol('M200 30V14 M194 20h12', 'ince');
    yol('M186 272v-50a14 14 0 0 1 28 0v50', 'ince');
    yol('M190 180v-26a10 10 0 0 1 20 0v26Z', 'ince');
    yol('M200 126m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0', 'ince');
    // yan gövdeler
    [-1, 1].forEach(function (s) {
      var x0 = 200 + s * 30, x1 = 200 + s * 150;
      yol('M' + x0 + ' 272V160H' + x1 + 'V272');
      yol('M' + x0 + ' 160L' + (200 + s * 90) + ' 120L' + x1 + ' 160', 'ince');
      for (var k = 0; k < 3; k++) {
        var wx = 200 + s * (58 + k * 32);
        yol('M' + (wx - 8) + ' 250V204a8 8 0 0 1 16 0V250Z', 'ince');
      }
      // köşe kulesi
      var tx = 200 + s * 160;
      yol('M' + (tx - 14) + ' 272V140H' + (tx + 14) + 'V272');
      yol('M' + (tx - 18) + ' 140L' + tx + ' 88L' + (tx + 18) + ' 140Z');
      yol('M' + tx + ' 88V78', 'ince');
      // payandalar
      yol('M' + (200 + s * 108) + ' 272V200l' + (s * 10) + ' -16', 'ince');
    });
    return '<svg class="gm-cizim" viewBox="0 0 400 285" aria-hidden="true">' + p.join('') + '</svg>';
  }

  /* ---- pasta (SVG) */
  function pastaSVG(yas) {
    var rakam = String(yas || '').slice(0, 3);
    var mumlar = '';
    var n = rakam.length;
    for (var i = 0; i < n; i++) {
      var x = 200 + (i - (n - 1) / 2) * 62;
      mumlar += '<g class="pa-mum" data-i="' + i + '" transform="translate(' + x + ' 150)">' +
        '<text class="pa-rakam" x="0" y="0">' + e(rakam[i]) + '</text>' +
        '<g class="pa-alev"><ellipse class="pa-hale" cx="0" cy="-66" rx="22" ry="30"/><path class="pa-alev-dis" d="M0 -92C8 -78 10 -68 0 -58C-10 -68 -8 -78 0 -92Z"/><path class="pa-alev-ic" d="M0 -80C4 -72 4 -66 0 -61C-4 -66 -4 -72 0 -80Z"/></g>' +
        '<path class="pa-fitil" d="M0 -58V-50"/><g class="pa-duman"><path d="M0 -60c-6 -10 6 -16 0 -26s6 -16 0 -26"/></g></g>';
    }
    // küçük mumlar
    for (var k = 0; k < 6; k++) {
      var kx = 110 + k * 36 + (k > 2 ? 36 : 0);
      if (n && Math.abs(kx - 200) < n * 34) continue;
      mumlar += '<g class="pa-mum pa-kucuk" transform="translate(' + kx + ' 196)"><rect class="pa-mum-govde" x="-4" y="-34" width="8" height="34" rx="2"/>' +
        '<g class="pa-alev"><ellipse class="pa-hale" cx="0" cy="-44" rx="12" ry="16"/><path class="pa-alev-dis" d="M0 -56C5 -48 6 -42 0 -36C-6 -42 -5 -48 0 -56Z"/></g>' +
        '<g class="pa-duman"><path d="M0 -38c-4 -8 4 -12 0 -20s4 -12 0 -20"/></g></g>';
    }
    return '<svg class="pa-svg" viewBox="0 0 400 420" aria-hidden="true">' +
      '<ellipse cx="200" cy="392" rx="170" ry="18" class="pa-tabak"/>' +
      '<path class="pa-kat pa-kat3" d="M50 300h300v86a12 12 0 0 1-12 12H62a12 12 0 0 1-12-12z"/>' +
      '<path class="pa-krema" d="M50 306c14 18 28 18 42 0s28 18 42 0 28 18 42 0 28 18 42 0 28 18 42 0 28 18 42 0 28 18 42 0 8 0 8 0V296H50z"/>' +
      '<path class="pa-kat pa-kat2" d="M86 230h228v70H86z"/>' +
      '<path class="pa-krema" d="M86 236c11 14 22 14 33 0s22 14 33 0 22 14 33 0 22 14 33 0 22 14 33 0 22 14 33 0 22 14 33 0V226H86z"/>' +
      '<path class="pa-kat pa-kat1" d="M120 196h160v34H120z"/>' +
      '<path class="pa-krema" d="M120 200c8 10 16 10 24 0s16 10 24 0 16 10 24 0 16 10 24 0 16 10 24 0 16 10 24 0 16 10 16 0V192H120z"/>' +
      kemerSusu(56, 338, 288, 7) + kemerSusu(92, 262, 216, 5) +
      mumlar + '</svg>';
    function kemerSusu(x0, y0, w, n) {
      var d = '', bw = w / n;
      for (var i = 0; i < n; i++) {
        var x = x0 + i * bw + bw / 2;
        d += 'M' + (x - bw * 0.3) + ' ' + (y0 + 30) + 'V' + (y0 + 8) + 'Q' + (x - bw * 0.3) + ' ' + (y0 - 8) + ' ' + x + ' ' + (y0 - 14) + 'Q' + (x + bw * 0.3) + ' ' + (y0 - 8) + ' ' + (x + bw * 0.3) + ' ' + (y0 + 8) + 'V' + (y0 + 30);
      }
      return '<path class="pa-kemer" d="' + d + '"/>';
    }
  }

  /* ================================================================ tema */
  D.temaKaydet('gotik', {
    gorselYolu: G,
    muzik: 'dogumgunu',
    fontlar: ['1em "Grenze Gotisch"', '1em "Davetiye Fraktur"', '600 1em Cinzel', '1em "Cormorant Garamond"'],

    kart: function () {
      return '<div class="kart-yuz kart-portal"><div class="ga-gok"></div>' + portalHTML() + '</div>';
    },

    hikaye: function (cfg) {
      var t = cfg._t, M = cfg.metin, ad = kisiAdi(cfg);
      var h = [];

      /* 1. açılış */
      var kemerler = '';
      for (var k = 0; k < 5; k++) kemerler += '<div class="ga-kemer" data-k="' + k + '"><img alt="" src="' + G + 'nef-kemer.webp"><i class="ga-mum sol"></i><i class="ga-mum sag"></i></div>';
      h.push('<section class="sahne g-acilis" data-boy="7" aria-label="Açılış">' +
        '<div class="sahne-sabit">' +
        '<div class="ga-gok"></div><canvas class="ga-yildizlar" aria-hidden="true"></canvas>' +
        '<div class="ga-nef">' +
        '<div class="ga-derin"></div>' +
        '<div class="ga-altar">' +
        '<div class="ga-isinlar"></div>' +
        '<div class="ga-gul"><img alt="" src="' + G + 'gul-pencere.webp"></div>' +
        '<div class="ga-yazi">' +
        '<div class="ga-ust">' + U.harfler(U.buyuk(M.dogumGunuUst || 'Bir yaş daha')) + '</div>' +
        (cfg.yas ? '<div class="ga-yas" aria-label="' + cfg.yas + ' yaş">' + String(cfg.yas).split('').map(function (r, i) { return '<span style="--i:' + i + '">' + e(r) + '</span>'; }).join('') + '</div>' : '') +
        '<h1 class="ga-isim">' + U.harfler(ad) + '</h1>' +
        (t ? '<div class="ga-tarih">' + t.gun + ' ' + e(U.buyuk(t.ay)) + ' ' + t.yil + '</div>' : '') +
        '</div></div>' +
        kemerler +
        '</div>' +
        portalHTML() +
        '<div class="kaydir" aria-hidden="true"><span>' + e(M.kaydir) + '</span><i></i></div>' +
        '</div></section>');

      /* 2. yıllar: vitray pencereler */
      if (cfg.hikaye.length) {
        h.push('<section class="sahne gv-bolum" aria-label="' + e(M.hikayeBaslik || 'Yıllar') + '"><div class="gv-ic">' +
          '<h2 class="gb-baslik" data-gorun>' + e(U.buyuk(M.hikayeBaslik || 'Yıllar Boyu')) + '</h2>' +
          cfg.hikaye.map(function (b, i) {
            var renk = b.renk && VITRAYLAR.indexOf(b.renk) >= 0 ? b.renk : VITRAYLAR[i % VITRAYLAR.length];
            return '<article class="gv-pencere" data-renk="' + renk + '" style="--i:' + i + '">' +
              '<div class="gv-cam"><img alt="" src="' + G + 'vitray-' + renk + '.webp">' +
              '<div class="gv-simge">' + U.ikon(b.simge || ['yildiz', 'kitap', 'kalp', 'tac'][i % 4]) + '</div>' +
              '<div class="gv-parilti"></div></div>' +
              '<div class="gv-isik"></div>' +
              '<div class="gv-yazi"><b>' + e(b.yil || '') + '</b><strong>' + e(b.baslik || '') + '</strong><p>' + e(b.metin || '') + '</p></div>' +
              '</article>';
          }).join('') + '</div></section>');
      }

      /* 3. davet: el yazması */
      var metin = cfg.davetMetni || '';
      var ilk = metin.charAt(0), kalan = metin.slice(1);
      h.push('<section class="sahne g-yazma" data-boy="2.6" aria-label="Davet"><div class="sahne-sabit">' +
        '<div class="gy-sayfa">' +
        '<div class="gy-kenar"></div>' +
        '<p class="gy-hitap">' + e(cfg._misafir ? (M.sevgili || 'Sevgili') + ' ' + cfg._misafir + ',' : (M.sevgiliDostlar || 'Sevgili dostlar,')) + '</p>' +
        '<div class="gy-metin"><span class="gy-bas" aria-hidden="true"><span>' + e(U.buyuk(ilk)) + '</span></span>' +
        '<span class="gy-satirlar"><span class="gy-gizli">' + e(ilk) + '</span>' + e(kalan) + '</span></div>' +
        (cfg.kiyafet ? '<p class="gy-kiyafet"><span>' + e(M.kiyafetBaslik || 'Kıyafet') + '</span>' + e(cfg.kiyafet) + '</p>' : '') +
        '<p class="gy-imza">' + e(ad) + '</p>' +
        '<svg class="gy-kalem" viewBox="0 0 60 200" aria-hidden="true"><path d="M30 196L26 150C10 110 6 60 20 4c10 30 26 60 22 110z"/><path class="gy-kalem-uc" d="M30 196l-4-46h8z"/><path class="gy-kalem-ci" d="M22 20c4 40 6 80 6 128"/></svg>' +
        '</div></div></section>');

      /* 4. tarih: astronomik saat */
      if (t) {
        h.push('<section class="sahne g-saat" data-boy="2.4" aria-label="Tarih"><div class="sahne-sabit">' +
          '<div class="gs-ust">' + e(U.buyuk(M.tarihBaslik || 'O Gece')) + '</div>' +
          '<div class="gs-saat-kap">' + saatSVG(t) + '</div>' +
          '<div class="gs-alt"><div class="gs-hafta">' + e(t.haftaGunu) + ' · ' + e(M.saatOnEk || 'Saat') + ' ' + t.saat + '</div>' +
          '<div class="geri-sayim"></div><div class="gs-dugmeler"></div></div>' +
          '</div></section>');
      }

      /* 5. program: mumlar */
      if (cfg.program.length) {
        h.push('<section class="sahne g-program" aria-label="Program"><div class="gb-bolum">' +
          '<h2 class="gb-baslik" data-gorun>' + e(U.buyuk(M.programBaslik || 'Gecenin Akışı')) + '</h2>' +
          '<ol class="gp-liste">' + cfg.program.map(function (o, i) {
            return '<li class="gp-oge" data-gorun>' +
              '<div class="gp-mum"><div class="gp-alev"></div><div class="gp-govde"><i></i></div></div>' +
              '<div class="gp-yazi"><div class="gp-saat">' + e(o.saat || '') + '</div><div class="gp-ad">' + e(o.baslik || '') + '</div>' +
              (o.aciklama ? '<p>' + e(o.aciklama) + '</p>' : '') + '</div></li>';
          }).join('') + '</ol></div></section>');
      }

      /* 6. mekan */
      if (cfg.mekan && cfg.mekan.ad) {
        h.push('<section class="sahne g-mekan" data-boy="2.2" aria-label="Mekan"><div class="sahne-sabit">' +
          '<div class="gm-pencere"><div class="gm-gok"></div>' + yapiSVG() + '<div class="gm-cerceve"></div></div>' +
          '<div class="gm-bilgi"><div class="gm-etiket">' + e(U.buyuk(M.mekanBaslik || 'Yer')) + '</div><h2 class="gm-ad">' + e(cfg.mekan.ad) + '</h2>' +
          '<p class="gm-adres">' + e(cfg.mekan.adres || '') + '</p><div class="gm-dugmeler"></div></div>' +
          '</div></section>');
      }

      /* 7. LCV */
      var lcv = cfg.lcv, wa = !lcv.endpoint && lcv.whatsapp;
      h.push('<section class="sahne g-lcv" aria-label="' + e(M.lcvBaslik) + '"><div class="gb-bolum">' +
        '<form class="lcv-mektup g-form" data-gorun="olcek" novalidate>' +
        '<h2 class="gb-baslik">' + e(U.buyuk(M.lcvBaslik)) + '</h2>' +
        (lcv.sonTarih ? '<p class="lcv-not">' + e((M.lcvSon || 'Lütfen {tarih} tarihine kadar yanıtlayınız.').replace('{tarih}', lcv.sonTarih)) + '</p>' : '') +
        '<label class="lcv-alan"><span>' + e(M.adSoyad) + '</span><input name="ad" autocomplete="name" required></label>' +
        '<div class="lcv-secim" role="radiogroup">' +
        '<label><input type="radio" name="katilim" value="evet" checked><span>' + e(M.katiliyorum) + '</span></label>' +
        '<label><input type="radio" name="katilim" value="hayir"><span>' + e(M.katilamiyorum) + '</span></label></div>' +
        '<div class="lcv-sayi"><span>' + e(M.kisiSayisi) + '</span><button type="button" data-adim="-1" aria-label="Azalt">−</button>' +
        '<b class="sayi-goster">1</b><input type="hidden" name="kisi" value="1"><button type="button" data-adim="1" aria-label="Arttır">+</button></div>' +
        '<label class="lcv-alan"><span>' + e(M.notunuz) + '</span><textarea name="not" rows="2"></textarea></label>' +
        (wa ? '<a class="dugme lcv-gonder" href="#" target="_blank" rel="noopener">' + e(M.lcvGonder) + '</a>'
          : '<button class="dugme lcv-gonder" type="submit">' + e(M.lcvGonder) + '</button>') +
        '<p class="lcv-sonuc" role="status"></p>' +
        '<div class="lcv-zarf" aria-hidden="true"><div class="lz-govde"></div><div class="lz-kapak"></div><img alt="" src="' + G + 'muhur.webp"></div>' +
        '</form></div></section>');

      /* 8. kapanış: pasta */
      h.push('<section class="sahne g-kapanis" data-boy="2.4" aria-label="Kapanış"><div class="sahne-sabit">' +
        '<div class="gk-isik"></div><canvas class="gk-konfeti" aria-hidden="true"></canvas>' +
        '<div class="gk-ust">' + e(cfg.kapanis || '') + '</div>' +
        '<button type="button" class="gk-pasta" aria-label="' + e(M.mumlariUfle || 'Mumları üfle') + '">' + pastaSVG(cfg.yas) + '</button>' +
        '<div class="gk-ipucu">' + e(M.mumlariUfle || 'Mumları üflemek için dokunun') + '</div>' +
        '<div class="gk-kutlama"><div class="gk-iyiki">' + U.harfler(M.iyiKi || 'İyi ki doğdun') + '</div><div class="gk-ad">' + e(ad) + '</div>' +
        '<button type="button" class="dugme ikincil gk-basa">' + e(M.basaDon) + '</button></div>' +
        '</div></section>');

      return h.join('');
    },

    /* ================================================================ sahneler */
    sahneler: function (cfg, D, ana) {
      var S = D.sahne, K = U.kolay, A = U.aralik;
      var $ = function (s, k) { return (k || ana).querySelector(s); };
      var $$ = function (s, k) { return Array.prototype.slice.call((k || ana).querySelectorAll(s)); };
      var vh = function () { return S.vh || window.innerHeight; };

      yildizlar($('.g-acilis .ga-yildizlar'));

      /* ---- 1. açılış: portal -> nef -> gül pencere */
      var ac = $('.g-acilis');
      if (ac) {
        var portal = $('.ga-portal', ac), kSol = $('.ga-kapi-sol', ac), kSag = $('.ga-kapi-sag', ac), kArka = $('.ga-kapi-arka', ac),
          nef = $('.ga-nef', ac), kemerler = $$('.ga-kemer', ac), altar = $('.ga-altar', ac), gul = $('.ga-gul', ac),
          isinlar = $('.ga-isinlar', ac), ust = $$('.ga-ust .harf', ac), yas = $$('.ga-yas span', ac), isim = $$('.ga-isim .harf', ac),
          tarih = $('.ga-tarih', ac), kaydir = $('.kaydir', ac), derin = $('.ga-derin', ac);
        var P = PORTAL;
        var kapiMerkez = ((P.kapiY + P.kapiH * 0.45) / P.H * 100).toFixed(2) + '%';
        portal.style.transformOrigin = '50% ' + kapiMerkez;
        var calindi = false;
        S.kaydet(ac, function (p) {
          kaydir.style.opacity = (1 - A(p, 0, 0.03)).toFixed(3);
          // kapılar açılır (abartılı: önce hafif aralanır, sonra savrulur)
          var k = A(p, 0.02, 0.2);
          var ka = k < 0.25 ? K.cikis3(k / 0.25) * 12 : 12 + K.icCikis3((k - 0.25) / 0.75) * 100;
          kSol.style.transform = 'rotateY(' + (-ka).toFixed(2) + 'deg)';
          kSag.style.transform = 'rotateY(' + ka.toFixed(2) + 'deg)';
          var gecisOn = A(p, 0.16, 0.3);
          kArka.style.opacity = (U.kisit(k * 3, 0, 1) * (1 - gecisOn)).toFixed(3);
          portal.classList.toggle('gecis', gecisOn > 0);
          if (k > 0.05 && !calindi) { calindi = true; if (D.muzik) D.muzik.efekt('can'); } else if (k < 0.02) calindi = false;
          // portaldan içeri: kamera kapıdan geçer
          var gec = K.icKare(A(p, 0.16, 0.36));
          portal.style.transform = 'scale(' + (1 + gec * 4.5).toFixed(4) + ')';
          portal.style.opacity = (1 - A(p, 0.3, 0.37)).toFixed(3);
          // nef: kemerlerin arasından uçuş
          var uc = A(p, 0.2, 0.8);
          var kam = uc * 5.2;                     // kameranın derinlik konumu (kemer aralığı = 1)
          nef.style.opacity = A(p, 0.14, 0.24).toFixed(3);
          kemerler.forEach(function (km, i) {
            var z = i + 1 - kam;                  // kameraya uzaklık
            if (z <= 0.08) { km.style.opacity = '0'; km.style.visibility = 'hidden'; return; }
            km.style.visibility = 'visible';
            var sc = 0.9 / z;
            km.style.transform = 'translate(-50%,-50%) scale(' + sc.toFixed(4) + ')';
            km.style.opacity = (U.kisit((6 - z) / 2, 0, 1) * U.kisit((z - 0.08) / 0.35, 0, 1)).toFixed(3);
            km.style.filter = 'brightness(' + U.kisit(1.25 - z * 0.18, 0.25, 1.2).toFixed(2) + ')';
            km.style.zIndex = String(100 - Math.round(z * 10));
          });
          derin.style.opacity = (0.4 + A(p, 0.5, 0.8) * 0.6).toFixed(3);
          // altar: gül pencere ve yazılar
          var al = A(p, 0.5, 0.82);
          altar.style.transform = 'translate(-50%,-50%) scale(' + (0.25 + K.cikis3(al) * 0.75).toFixed(4) + ')';
          altar.style.opacity = U.kisit(A(p, 0.35, 0.6) * 1.2, 0, 1).toFixed(3);
          gul.style.transform = 'rotate(' + (p * 60).toFixed(2) + 'deg)';
          gul.style.filter = 'brightness(' + (0.55 + A(p, 0.6, 0.85) * 0.7).toFixed(2) + ') saturate(' + (0.8 + A(p, 0.6, 0.85) * 0.5).toFixed(2) + ')';
          isinlar.style.opacity = (A(p, 0.72, 0.88) * 0.9).toFixed(3);
          isinlar.style.transform = 'translate(-50%,-50%) rotate(' + (-p * 90).toFixed(1) + 'deg)';
          harf(ust, A(p, 0.76, 0.86), 0.5);
          yas.forEach(function (y, i) {
            var yp = A(p, 0.78 + i * 0.03, 0.9 + i * 0.03), kk = K.cikisElastik(yp);
            y.style.opacity = U.kisit(yp * 3, 0, 1).toFixed(3);
            y.style.transform = 'translate3d(0,' + ((1 - kk) * 80).toFixed(1) + 'px,0) scale(' + (0.3 + kk * 0.7).toFixed(3) + ') rotate(' + ((1 - kk) * (i ? 30 : -30)).toFixed(1) + 'deg)';
          });
          harf(isim, A(p, 0.84, 0.96), 1);
          tarih.style.opacity = A(p, 0.92, 0.99).toFixed(3);
        });
      }

      function harf(harfler, t, guc) {
        var n = harfler.length;
        for (var i = 0; i < n; i++) {
          var yerel = U.kisit(t * (1 + n * 0.12) - i * 0.12, 0, 1), kk = K.cikisGeri(yerel), el = harfler[i];
          el.style.opacity = U.kisit(yerel * 2, 0, 1).toFixed(3);
          el.style.transform = 'translate3d(0,' + ((1 - kk) * 50 * guc).toFixed(1) + 'px,0) scale(' + (1 + (1 - kk) * 1.4 * guc).toFixed(3) + ')';
          el.style.filter = yerel < 1 ? 'blur(' + ((1 - yerel) * 7).toFixed(1) + 'px)' : '';
        }
      }

      /* ---- 2. vitray pencereler: ekranın ortasına yaklaştıkça yanar */
      var gv = $('.gv-bolum');
      if (gv) {
        var pencereler = $$('.gv-pencere', gv);
        S.kaydet(gv, function () {
          var h = vh();
          pencereler.forEach(function (pn) {
            var r = pn.getBoundingClientRect();
            var mrk = (r.top + r.height * 0.35 - h * 0.5) / (h * 0.55);
            var yan = U.kisit(1 - Math.abs(mrk), 0, 1);
            var yanik = K.cikis3(U.kisit(yan * 1.6, 0, 1));
            pn.style.setProperty('--yan', yanik.toFixed(3));
          });
        });
      }

      /* ---- 3. el yazması: satırları tüy kalem yazar */
      var gy = $('.g-yazma');
      if (gy) {
        var sayfa = $('.gy-sayfa', gy), hitap = $('.gy-hitap', gy), bas = $('.gy-bas', gy), metinEl = $('.gy-satirlar', gy),
          kiyafet = $('.gy-kiyafet', gy), imza = $('.gy-imza', gy), kalem = $('.gy-kalem', gy);
        // metni satırlara böl (yerleşimden sonra): her satır ayrı span ile açılır
        var satirlar = null;
        var satirla = function () {
          var metin = metinEl.textContent;
          var kelimeler = metin.split(/(\s+)/);
          metinEl.innerHTML = kelimeler.map(function (k) { return /\s+/.test(k) ? k : '<span class="gy-k">' + e(k) + '</span>'; }).join('');
          var ks = $$('.gy-k', metinEl), satir = [], sonTop = null;
          satirlar = [];
          ks.forEach(function (k) {
            var tp = k.offsetTop;
            if (sonTop !== null && Math.abs(tp - sonTop) > 4) { satirlar.push(satir); satir = []; }
            satir.push(k);
            sonTop = tp;
          });
          if (satir.length) satirlar.push(satir);
        };
        var hazir = false;
        S.kaydet(gy, function (p) {
          if (!hazir) { satirla(); hazir = true; }
          var sp = A(p, 0.0, 0.12);
          sayfa.style.opacity = sp.toFixed(3);
          sayfa.style.transform = 'translate3d(0,' + ((1 - K.cikis3(sp)) * 60).toFixed(1) + 'px,0) rotate(' + ((1 - sp) * -4).toFixed(2) + 'deg)';
          hitap.style.opacity = A(p, 0.08, 0.16).toFixed(3);
          var bp = A(p, 0.12, 0.24);
          bas.style.opacity = U.kisit(bp * 2, 0, 1).toFixed(3);
          bas.style.transform = 'scale(' + (1 + (1 - K.cikisGeri(bp)) * 1.5).toFixed(3) + ') rotate(' + ((1 - bp) * -20).toFixed(1) + 'deg)';
          var yazim = A(p, 0.2, 0.78) * satirlar.length;
          var kalemX = 0, kalemY = 0, kalemGoster = false;
          satirlar.forEach(function (s, i) {
            var lp = U.kisit(yazim - i, 0, 1);
            var n = s.length, gorunen = Math.floor(lp * n + 0.0001);
            s.forEach(function (k, j) { k.classList.toggle('yazildi', j < gorunen || lp >= 1); });
            if (lp > 0 && lp < 1) {
              var son = s[Math.max(0, Math.min(n - 1, gorunen))];
              kalemX = son.offsetLeft + son.offsetWidth; kalemY = son.offsetTop; kalemGoster = true;
            }
          });
          if (kalemGoster) {
            var mr = metinEl.getBoundingClientRect(), sr = sayfa.getBoundingClientRect();
            kalem.style.transform = 'translate3d(' + (mr.left - sr.left + kalemX - 4).toFixed(1) + 'px,' + (mr.top - sr.top + kalemY - 70).toFixed(1) + 'px,0) rotate(' + (Math.sin(p * 90) * 6 + 18).toFixed(1) + 'deg)';
            kalem.style.opacity = '1';
          } else kalem.style.opacity = '0';
          if (kiyafet) kiyafet.style.opacity = A(p, 0.78, 0.86).toFixed(3);
          imza.style.opacity = A(p, 0.84, 0.92).toFixed(3);
          imza.style.transform = 'scale(' + (1 + (1 - A(p, 0.84, 0.92)) * 0.4).toFixed(3) + ')';
        });
        window.addEventListener('resize', function () { hazir = false; });
      }

      /* ---- 4. astronomik saat */
      var gs = $('.g-saat');
      if (gs) {
        var dis = $('.as-dis', gs), orta = $('.as-orta', gs), ic = $('.as-ic', gs), akrep = $('.as-akrep', gs), yelkovan = $('.as-yelkovan', gs),
          saatKap = $('.gs-saat-kap', gs), alt = $('.gs-alt', gs), gust = $('.gs-ust', gs), tarihG = $('.as-tarih', gs);
        D.geriSayim($('.geri-sayim', gs), cfg._tarih, cfg.metin);
        var tk = D.takvim(cfg);
        if (tk) $('.gs-dugmeler', gs).appendChild(D.menuDugme(cfg.metin.takvimeEkle, [
          { ad: 'Google Takvim', href: tk.google }, { ad: 'Apple / Outlook (.ics)', href: tk.ics, indir: 'davetiye.ics' }]));
        var saatAc = cfg._t ? (parseInt(cfg._t.saat, 10) % 12) / 12 * 360 + parseInt(cfg._t.saat.slice(3), 10) / 60 * 30 : 0;
        var dkAc = cfg._t ? parseInt(cfg._t.saat.slice(3), 10) / 60 * 360 : 0;
        S.kaydet(gs, function (p) {
          var g = A(p, 0.0, 0.55), kk = K.cikis5(g);
          saatKap.style.transform = 'scale(' + (0.6 + kk * 0.4).toFixed(3) + ') rotate(' + ((1 - kk) * -40).toFixed(1) + 'deg)';
          saatKap.style.opacity = U.kisit(g * 3, 0, 1).toFixed(3);
          // halkalar hızla dönüp tarihe kilitlenir
          dis.style.transform = 'rotate(' + ((1 - kk) * 540).toFixed(1) + 'deg)';
          orta.style.transform = 'rotate(' + ((1 - kk) * -720 + p * 30).toFixed(1) + 'deg)';
          ic.style.transform = 'rotate(' + ((1 - kk) * 900).toFixed(1) + 'deg)';
          akrep.style.transform = 'rotate(' + (saatAc + (1 - kk) * 1440).toFixed(1) + 'deg)';
          yelkovan.style.transform = 'rotate(' + (dkAc + (1 - kk) * 4320).toFixed(1) + 'deg)';
          tarihG.style.opacity = A(p, 0.45, 0.6).toFixed(3);
          gust.style.opacity = A(p, 0.35, 0.5).toFixed(3);
          var a = A(p, 0.5, 0.68);
          alt.style.opacity = a.toFixed(3);
          alt.style.transform = 'translate3d(0,' + ((1 - K.cikis3(a)) * 50).toFixed(1) + 'px,0)';
        });
      }

      /* ---- 6. mekan */
      var gm = $('.g-mekan');
      if (gm) {
        var cizgiler = $$('.gm-cizim path', gm), bilgi = $('.gm-bilgi', gm), gok = $('.gm-gok', gm);
        var yt = D.yolTarifi(cfg.mekan), tk2 = D.takvim(cfg), md = $('.gm-dugmeler', gm);
        if (yt) md.appendChild(D.menuDugme(cfg.metin.yolTarifi, [{ ad: 'Google Haritalar', href: yt.google },
          { ad: 'Apple Haritalar', href: yt.apple }, { ad: 'Yandex Haritalar', href: yt.yandex }]));
        if (tk2) md.appendChild(D.menuDugme(cfg.metin.takvimeEkle, [{ ad: 'Google Takvim', href: tk2.google },
          { ad: 'Apple / Outlook (.ics)', href: tk2.ics, indir: 'davetiye.ics' }], 'ikincil'));
        var n = cizgiler.length;
        S.kaydet(gm, function (p) {
          var c = A(p, 0.04, 0.55);
          cizgiler.forEach(function (l, i) {
            var lp = U.kisit((c - i / n * 0.6) / 0.4, 0, 1);
            l.style.strokeDashoffset = (1 - lp).toFixed(4);
          });
          gok.style.opacity = (0.3 + A(p, 0.3, 0.6) * 0.7).toFixed(3);
          var b = A(p, 0.55, 0.75);
          bilgi.style.opacity = b.toFixed(3);
          bilgi.style.transform = 'translate3d(0,' + ((1 - K.cikis3(b)) * 50).toFixed(1) + 'px,0)';
        });
      }

      /* ---- 7. LCV */
      var form = $('.g-form');
      if (form) {
        D.lcv(form, cfg, function () {
          form.classList.remove('lcv-ucus');
          void form.offsetWidth;
          form.classList.add('lcv-ucus');
          if (D.muzik) { setTimeout(function () { D.muzik.efekt('damga'); }, 900); setTimeout(function () { D.muzik.efekt('can'); }, 1500); }
        });
      }

      /* ---- 8. kapanış: mumları üfle */
      var gk = $('.g-kapanis');
      if (gk) {
        var pasta = $('.gk-pasta', gk), ipucu = $('.gk-ipucu', gk), kutlama = $('.gk-kutlama', gk), ustY = $('.gk-ust', gk),
          iyiki = $$('.gk-iyiki .harf', gk), konfeti = konfetiKur($('.gk-konfeti', gk)), isik = $('.gk-isik', gk);
        var ufundu = false;
        var ufle = function () {
          if (ufundu) return;
          ufundu = true;
          if (D.muzik) { D.muzik.efekt('ufle'); setTimeout(function () { D.muzik.efekt('can'); D.muzik.efekt('parilti'); }, 500); }
          if (navigator.vibrate) try { navigator.vibrate([30, 60, 30]); } catch (x) { /* yok */ }
          gk.classList.add('ufundu');
          setTimeout(function () { konfeti.patlat(); }, 350);
          var t0 = performance.now();
          U.tween(1800, function (q) {
            harf(iyiki, q, 1);
          });
        };
        pasta.addEventListener('click', ufle);
        $('.gk-basa', gk).addEventListener('click', function () { window.scrollTo({ top: 0, behavior: U.azHareket() ? 'auto' : 'smooth' }); });
        S.kaydet(gk, function (p) {
          var g = A(p, 0.0, 0.3);
          pasta.style.transform = 'translate3d(0,' + ((1 - K.cikis3(g)) * 40).toFixed(1) + 'vh,0) scale(' + (0.7 + K.cikisGeri(g) * 0.3).toFixed(3) + ')';
          pasta.style.opacity = U.kisit(g * 2, 0, 1).toFixed(3);
          ustY.style.opacity = A(p, 0.1, 0.25).toFixed(3);
          isik.style.opacity = (A(p, 0.1, 0.35) * 0.9).toFixed(3);
          if (!ufundu) ipucu.style.opacity = A(p, 0.3, 0.4).toFixed(3);
          // kaydırmanın sonunda üflenmemişse kendiliğinden üfle (abartılı final herkes için)
          if (p > 0.92 && !ufundu) ufle();
        });
      }
    }
  });

  /* ---------------------------------------------------------------- yıldızlı gök */
  function yildizlar(tuval) {
    if (!tuval) return;
    var ctx = tuval.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), liste = [];
    function boyut() {
      tuval.width = tuval.clientWidth * dpr; tuval.height = tuval.clientHeight * dpr;
      liste = [];
      for (var i = 0; i < 140; i++) liste.push({ x: Math.random(), y: Math.random() * 0.85, r: (0.4 + Math.random() * 1.4) * dpr, f: Math.random() * 6.28, h: 0.5 + Math.random() * 2 });
    }
    function kare(now) {
      if (!tuval.isConnected) return;
      var r = tuval.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        ctx.clearRect(0, 0, tuval.width, tuval.height);
        var t = now / 1000;
        for (var i = 0; i < liste.length; i++) {
          var s = liste[i], a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.h + s.f));
          ctx.fillStyle = 'rgba(255,244,214,' + a.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(s.x * tuval.width, s.y * tuval.height, s.r, 0, 6.283); ctx.fill();
        }
      }
      requestAnimationFrame(kare);
    }
    window.addEventListener('resize', boyut);
    boyut();
    requestAnimationFrame(kare);
  }

  /* ---------------------------------------------------------------- vitray renkli konfeti */
  function konfetiKur(tuval) {
    var ctx = tuval.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), parca = [], calis = false;
    var renkler = ['#aa162c', '#1c46aa', '#187848', '#682c96', '#dea028', '#ecc45a', '#4a8cd2', '#ce466e'];
    function boyut() { tuval.width = tuval.clientWidth * dpr; tuval.height = tuval.clientHeight * dpr; }
    var son = 0;
    function kare(now) {
      var dt = Math.min(0.05, (now - son) / 1000 || 0.016);
      son = now;
      ctx.clearRect(0, 0, tuval.width, tuval.height);
      for (var i = parca.length - 1; i >= 0; i--) {
        var q = parca[i];
        q.vy += 900 * dpr * dt * 0.5; q.vx *= 0.99; q.vy *= 0.99;
        q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt; q.t += dt;
        if (q.y > tuval.height + 40 || q.t > 6) { parca.splice(i, 1); continue; }
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.scale(1, Math.abs(Math.cos(q.t * 6 + q.f)));
        ctx.fillStyle = q.c; ctx.globalAlpha = 0.95;
        ctx.beginPath();
        if (q.s === 0) ctx.rect(-q.r, -q.r * 0.6, q.r * 2, q.r * 1.2);
        else { ctx.moveTo(0, -q.r); ctx.lineTo(q.r * 0.8, q.r * 0.6); ctx.lineTo(-q.r * 0.8, q.r * 0.6); ctx.closePath(); }
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,16,22,.6)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
        ctx.restore();
      }
      if (parca.length) requestAnimationFrame(kare); else calis = false;
    }
    window.addEventListener('resize', boyut);
    return {
      patlat: function () {
        boyut();
        var w = tuval.width, h = tuval.height;
        for (var k = 0; k < 3; k++) {
          var ox = w * (0.25 + k * 0.25), oy = h * 0.52;
          for (var i = 0; i < 70; i++) {
            var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (500 + Math.random() * 900) * dpr;
            parca.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: Math.random() * 6, va: (Math.random() - 0.5) * 12,
              r: (4 + Math.random() * 6) * dpr, c: renkler[(Math.random() * renkler.length) | 0], s: Math.random() < 0.6 ? 0 : 1, t: 0, f: Math.random() * 6 });
          }
        }
        if (!calis) { calis = true; son = performance.now(); requestAnimationFrame(kare); }
      }
    };
  }
})(window.Davetiye);
