/*!
 * Barok tema — düğün davetiyesi hikâye sahneleri
 *
 *  1. Açılış      kadife perde aralanır, isimler sahnede; kamera kubbeye kalkar, fresk göğe uçulur
 *  2. Hikâyemiz   yaldız çerçeveli tablolar galerisi (yatay kayan, 3B dönen, sallanan)
 *  3. Davet       parşömen rulosu açılır, satırlar mürekkep gibi belirir, mühür basılır
 *  4. Tarih       altın madalyon dönerek gelir, ışınlar, geri sayım
 *  5. Program     altın sarmaşık kaydırdıkça büyür, olaylar açılır
 *  6. Mekan       saray cephesi kalemle çizilir, suluboya dolar, yol tarifi / takvim
 *  7. LCV         mektup formu; gönderince katlanır, mühürlenir ve uçar
 *  8. Kapanış     altın varak ve gül yaprakları, defne çelengi, perde kapanır
 */
(function (D) {
  'use strict';
  var U = D.yardimci;
  var G = 'temalar/barok/gorsel/';
  var e = U.kacis;

  /* ---------------------------------------------------------------- yardımcılar */
  function harfler(metin, sinif) {
    // her harf ayrı <span> (animasyon için); ekran okuyucu tam metni okur
    var h = Array.from(String(metin));
    return '<span class="' + (sinif || '') + '" aria-label="' + e(metin) + '">' + h.map(function (c, i) {
      return '<span class="harf" aria-hidden="true" style="--i:' + i + '">' + (c === ' ' ? '&nbsp;' : e(c)) + '</span>';
    }).join('') + '</span>';
  }

  /** Türkçe iyelik eki: Yılmaz'ın, Kaya'nın, Demir'in, Öztürk'ün, Koç'un */
  function iyelik(ad) {
    ad = String(ad || '').trim();
    if (!ad) return '';
    var kucuk = ad.toLocaleLowerCase('tr-TR');
    var unluler = 'aıoueiöü';
    var son = '';
    for (var i = kucuk.length - 1; i >= 0; i--) { if (unluler.indexOf(kucuk[i]) >= 0) { son = kucuk[i]; break; } }
    var ek = { a: 'ın', 'ı': 'ın', o: 'un', u: 'un', e: 'in', i: 'in', 'ö': 'ün', 'ü': 'ün' }[son] || 'in';
    var unluyleBiter = unluler.indexOf(kucuk[kucuk.length - 1]) >= 0;
    return ad + '’' + (unluyleBiter ? 'n' : '') + ek;
  }

  function aileSatiri(k, cinsiyet) {
    if (k.aileMetni) return k.aileMetni;
    var ebeveyn = [k.anne, k.baba].filter(Boolean).join(' & ');
    if (!ebeveyn || !k.soyad) return '';
    return ebeveyn + ' ' + iyelik(U.buyuk(k.soyad).charAt(0) + k.soyad.slice(1)) + ' ' + (cinsiyet === 'k' ? 'kızı' : 'oğlu');
  }

  var TABLOLAR = { deniz: 'tablo-deniz.webp', balon: 'tablo-balon.webp', gece: 'tablo-gece.webp' };

  var IKON = {
    kadeh: '<path d="M14 6h12l-1 14a5 5 0 0 1-10 0z M20 25v11 M14 36h12 M30 8h12l-1 14a5 5 0 0 1-10 0z M36 27v9 M31 36h11 M22 3l-2-2 M36 4l2-2"/>',
    yuzuk: '<circle cx="17" cy="26" r="10"/><circle cx="29" cy="26" r="10"/><path d="M13 15l4-6 4 6 M17 9v-3"/>',
    yemek: '<circle cx="24" cy="24" r="11"/><circle cx="24" cy="24" r="6"/><path d="M6 10v8a3 3 0 0 0 6 0v-8 M9 18v20 M40 10c-4 2-4 10 0 12v16"/>',
    muzik: '<path d="M18 34V10l18-4v24"/><circle cx="14" cy="34" r="4"/><circle cx="32" cy="30" r="4"/><path d="M18 16l18-4"/>',
    pasta: '<path d="M8 38h32 M10 38V26h28v12 M13 26v-7h22v7 M24 19v-6 M24 13c-2-2 0-5 0-5s2 3 0 5z M10 31c4 3 8-3 12 0s8-3 12 0 4 0 4 0"/>',
    kamera: '<rect x="6" y="14" width="36" height="24" rx="3"/><circle cx="24" cy="26" r="7"/><path d="M16 14l3-5h10l3 5"/>',
    dans: '<circle cx="18" cy="8" r="3"/><circle cx="30" cy="8" r="3"/><path d="M18 11l-4 12 4 4-2 12 M18 11l6 8 6-8 M30 11l4 12-4 4 2 12 M14 23l-5-4 M34 23l5-4"/>',
    kalp: '<path d="M24 40S6 28 6 16a9 9 0 0 1 18-2 9 9 0 0 1 18 2c0 12-18 24-18 24z"/>'
  };
  function ikon(ad) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true">' + (IKON[ad] || IKON.kalp) + '</svg>';
  }

  /* ---- perde sahnesi (kart yüzünde de aynısı kullanılır) */
  function perdeHTML(cfg, kart) {
    var t = cfg._t;
    return '<div class="p-sahne">' +
      '<div class="p-arka"></div><div class="p-isinlar"></div><div class="p-hale"></div>' +
      (kart ? '' :
        '<div class="p-icerik">' +
        '<div class="p-ust">' + harfler(U.buyuk(cfg.metin.evleniyoruz || 'Evleniyoruz'), 'p-ust-h') + '</div>' +
        '<h1 class="p-isimler"><span class="p-ad p-ad1">' + harfler(cfg.gelin.ad) + '</span>' +
        '<span class="p-ve">&amp;</span><span class="p-ad p-ad2">' + harfler(cfg.damat.ad) + '</span></h1>' +
        (t ? '<div class="p-tarih"><span>' + t.gun + ' ' + e(U.buyuk(t.ay)) + ' ' + t.yil + '</span></div>' : '') +
        '</div>') +
      '<div class="p-panel p-sol"><img alt="" src="' + G + 'perde-sol.webp"></div>' +
      '<div class="p-panel p-sag"><img alt="" src="' + G + 'perde-sag.webp"></div>' +
      '<div class="p-valans"><img alt="" src="' + G + 'perde-ust.webp"></div>' +
      '<div class="p-arma"><img alt="" src="' + G + 'madalyon.webp"><span>' + e(cfg.monogram || '') + '</span></div>' +
      '</div>';
  }

  /* ---- palas cephesi: kalemle çizilecek çizgiler (SVG, simetrik) */
  function saraySVG() {
    var p = [];
    function yol(d, s) { p.push('<path pathLength="1" class="' + (s || '') + '" d="' + d + '"/>'); }
    function sym(fn) { fn(1); fn(-1); }
    var cx = 200;
    // zemin ve merdiven
    yol('M10 262H390');
    for (var i = 0; i < 4; i++) yol('M' + (150 - i * 8) + ' ' + (262 - i * 5) + 'H' + (250 + i * 8));
    // yan kanatlar
    sym(function (s) {
      var x0 = cx + s * 70, x1 = cx + s * 185;
      yol('M' + x0 + ' 242V150H' + x1 + 'V242');
      yol('M' + x0 + ' 150H' + x1 + ' M' + x0 + ' 146H' + x1 + ' M' + (x0) + ' 142H' + x1);
      for (var k = 0; k < 4; k++) {
        var wx = cx + s * (88 + k * 25);
        yol('M' + (wx - 7) + ' 232V198a7 7 0 0 1 14 0V232Z', 'ince');
        yol('M' + (wx - 7) + ' 186H' + (wx + 7) + 'V170H' + (wx - 7) + 'Z', 'ince');
      }
      // çatı korkuluğu ve vazolar
      for (var b = 0; b < 9; b++) {
        var bx = cx + s * (76 + b * 13);
        yol('M' + bx + ' 142v-10', 'ince');
      }
      yol('M' + x0 + ' 132H' + x1, 'ince');
      yol('M' + (x1 - s * 6) + ' 132c0-8 -6-10-2-16c4 6-2 8-2 16', 'ince');
    });
    // orta pavyon, sütunlar, alınlık, kubbe
    yol('M130 242V120H270V242');
    for (var c = 0; c < 6; c++) {
      var sx = 140 + c * 24;
      yol('M' + sx + ' 240V128 M' + (sx - 4) + ' 128h8 M' + (sx - 4) + ' 240h8', 'ince');
    }
    yol('M200 242v-44a14 14 0 0 1 28 0v44 M172 242v-44a14 14 0 0 1 28 0', 'ince');
    yol('M122 120H278L200 78Z');
    yol('M136 114H264L200 84Z', 'ince');
    yol('M190 104a10 7 0 0 1 20 0', 'ince');
    yol('M160 78H240V64H160Z');
    yol('M168 64c0-38 64-38 64 0');
    yol('M200 26v-10 M196 18h8', 'ince');
    yol('M176 64c2-24 46-24 48 0', 'ince');
    return '<svg class="m-cizim" viewBox="0 0 400 270" aria-hidden="true">' + p.join('') + '</svg>';
  }

  /* ---- altın sarmaşık yolu (program) */
  function sarmasikYolu(n) {
    var h = n * 200 + 80, d = 'M200 0';
    for (var i = 0; i < n * 2; i++) {
      var y0 = i * 100, s = i % 2 ? -1 : 1;
      d += ' C' + (200 + s * 70) + ' ' + (y0 + 30) + ' ' + (200 + s * 70) + ' ' + (y0 + 70) + ' 200 ' + (y0 + 100);
    }
    d += ' L200 ' + h;
    var yapraklar = '';
    for (var k = 0; k < n * 4; k++) {
      var yy = 30 + k * 50, ss = k % 2 ? -1 : 1;
      yapraklar += '<path class="pr-yaprak" style="--k:' + k + '" d="M' + (200 + ss * 38) + ' ' + yy + 'c' + (ss * 18) + ' -14 ' + (ss * 30) + ' -6 ' + (ss * 36) + ' 6c' + (-ss * 14) + ' 10 ' + (-ss * 28) + ' 6 ' + (-ss * 36) + ' -6z"/>';
    }
    return { d: d, h: h, yapraklar: yapraklar };
  }

  /* ================================================================ tema */
  D.temaKaydet('barok', {
    gorselYolu: G,
    muzik: 'kanon',
    fontlar: ['1em "Pinyon Script"', '600 1em Cinzel', '1em "Cormorant Garamond"'],

    kart: function (cfg) {
      return '<div class="kart-yuz kart-perde">' + perdeHTML(cfg, true) + '</div>';
    },

    hikaye: function (cfg) {
      var t = cfg._t, M = cfg.metin;
      var h = [];

      /* 1. açılış: perde + kubbe */
      h.push('<section class="sahne s-acilis" data-boy="7.5" aria-label="Açılış">' +
        '<div class="sahne-sabit">' +
        '<div class="k-gok"></div>' +
        '<div class="k-kubbe"><img alt="" src="' + G + 'kubbe.webp"></div>' +
        '<div class="k-isik"></div>' +
        '<div class="k-bulutlar">' +
        '<img alt="" class="k-bulut" data-b="0" src="' + G + 'bulut-1.webp">' +
        '<img alt="" class="k-bulut" data-b="1" src="' + G + 'bulut-2.webp">' +
        '<img alt="" class="k-bulut" data-b="2" src="' + G + 'bulut-3.webp">' +
        '<img alt="" class="k-bulut" data-b="3" src="' + G + 'bulut-1.webp">' +
        '<img alt="" class="k-bulut" data-b="4" src="' + G + 'bulut-2.webp">' +
        '</div>' +
        '<div class="k-guvercinler" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '<div class="k-yazi"><p>' + e(M.kubbe1 || 'Her büyük aşk') + '</p><p>' + e(M.kubbe2 || 'tek bir bakışla başlar…') + '</p></div>' +
        perdeHTML(cfg, false) +
        '<div class="kaydir" aria-hidden="true"><span>' + e(M.kaydir) + '</span><i></i></div>' +
        '</div></section>');

      /* 2. hikâyemiz: galeri */
      var hk = cfg.hikaye;
      if (hk.length) {
        var anahtarlar = Object.keys(TABLOLAR);
        h.push('<section class="sahne s-galeri" data-boy="' + (1.2 + hk.length * 1.25).toFixed(2) + '" aria-label="Hikâyemiz">' +
          '<div class="sahne-sabit">' +
          '<div class="g-duvar"></div><div class="g-avize" aria-hidden="true"></div>' +
          '<div class="g-baslik"><span>' + e(U.buyuk(M.hikayeBaslik || 'Hikâyemiz')) + '</span></div>' +
          '<div class="g-ray">' + hk.map(function (b, i) {
            var resim = b.foto || (G + TABLOLAR[b.sahne || anahtarlar[i % anahtarlar.length]]);
            return '<figure class="g-tablo" data-i="' + i + '">' +
              '<div class="g-asili"><div class="g-kordon"></div>' +
              '<div class="g-cerceve"><div class="g-resim" style="background-image:url(\'' + e(resim) + '\')"></div>' +
              '<img alt="" class="g-cerceve-img" src="' + G + 'cerceve.webp"><div class="g-parilti"></div></div></div>' +
              '<figcaption class="g-levha"><b>' + e(b.yil || '') + '</b><strong>' + e(b.baslik || '') + '</strong>' +
              '<p>' + e(b.metin || '') + '</p></figcaption>' +
              '</figure>';
          }).join('') + '</div>' +
          '<div class="g-zemin"></div>' +
          '<div class="g-noktalar">' + hk.map(function () { return '<i></i>'; }).join('') + '</div>' +
          '</div></section>');
      }

      /* 3. davet: parşömen */
      var gAile = aileSatiri(cfg.gelin, 'k'), dAile = aileSatiri(cfg.damat, 'e');
      h.push('<section class="sahne s-davet" data-boy="2.6" aria-label="Davet">' +
        '<div class="sahne-sabit"><div class="d-arka"></div>' +
        '<div class="d-rulo">' +
        '<div class="d-kagit"><div class="d-ic">' +
        (gAile ? '<p class="d-satir d-aile">' + e(gAile) + '</p>' : '') +
        '<p class="d-satir d-isim">' + e(cfg.gelin.ad) + '</p>' +
        '<p class="d-satir d-ile">' + e(M.ile || 'ile') + '</p>' +
        (dAile ? '<p class="d-satir d-aile">' + e(dAile) + '</p>' : '') +
        '<p class="d-satir d-isim">' + e(cfg.damat.ad) + '</p>' +
        '<p class="d-satir d-susleme" aria-hidden="true">❦</p>' +
        '<p class="d-satir d-metin">' + e(cfg.davetMetni || '') + '</p>' +
        '<div class="d-satir d-muhur"><img alt="" src="' + G + 'muhur.webp"><span>' + e(cfg.monogram || '') + '</span></div>' +
        '</div></div>' +
        '<div class="d-cubuk d-ust"><i></i><i></i></div><div class="d-cubuk d-alt"><i></i><i></i></div>' +
        '</div></div></section>');

      /* 4. tarih: madalyon + geri sayım */
      if (t) {
        h.push('<section class="sahne s-tarih" data-boy="2.4" aria-label="Tarih">' +
          '<div class="sahne-sabit"><div class="t-isinlar"></div><div class="t-hale"></div>' +
          '<div class="t-ust">' + e(U.buyuk(M.tarihBaslik || 'Büyük Gün')) + '</div>' +
          '<div class="t-madalyon"><div class="t-yuz t-on"><img alt="" src="' + G + 'madalyon.webp">' +
          '<div class="t-yazi"><span class="t-gun">' + t.gun + '</span><span class="t-ay">' + e(U.buyuk(t.ay)) + '</span>' +
          '<span class="t-yil">' + t.yil + '</span></div></div>' +
          '<div class="t-yuz t-arka"><img alt="" src="' + G + 'madalyon.webp"><div class="t-yazi"><span class="t-mono">' + e(cfg.monogram || '') + '</span></div></div></div>' +
          '<div class="t-alt"><div class="t-hafta">' + e(t.haftaGunu) + ' · ' + e(M.saatOnEk || 'Saat') + ' ' + t.saat + '</div>' +
          '<div class="geri-sayim"></div><div class="t-dugmeler"></div></div>' +
          '</div></section>');
      }

      /* 5. program */
      if (cfg.program.length) {
        var sy = sarmasikYolu(cfg.program.length);
        h.push('<section class="sahne s-program" aria-label="Program"><div class="b-bolum">' +
          '<h2 class="b-baslik" data-gorun>' + e(U.buyuk(M.programBaslik || 'Program')) + '</h2>' +
          '<div class="pr-liste">' +
          '<svg class="pr-asma" viewBox="0 0 400 ' + sy.h + '" preserveAspectRatio="none" aria-hidden="true">' +
          '<path class="pr-dal" pathLength="1" d="' + sy.d + '"/>' + sy.yapraklar + '</svg>' +
          cfg.program.map(function (o, i) {
            return '<div class="pr-oge ' + (i % 2 ? 'sag' : 'sol') + '" data-gorun="' + (i % 2 ? 'sag' : 'sol') + '">' +
              '<div class="pr-ikon">' + ikon(o.ikon) + '</div>' +
              '<div class="pr-saat">' + e(o.saat || '') + '</div><div class="pr-ad">' + e(o.baslik || '') + '</div>' +
              (o.aciklama ? '<p>' + e(o.aciklama) + '</p>' : '') + '</div>';
          }).join('') +
          '</div></div></section>');
      }

      /* 6. mekan */
      if (cfg.mekan && cfg.mekan.ad) {
        h.push('<section class="sahne s-mekan" data-boy="2.2" aria-label="Mekan">' +
          '<div class="sahne-sabit"><div class="m-kagit">' + saraySVG() + '<div class="m-boya"></div></div>' +
          '<div class="m-bilgi"><div class="m-etiket">' + e(U.buyuk(M.mekanBaslik || 'Mekan')) + '</div>' +
          '<h2 class="m-ad">' + e(cfg.mekan.ad) + '</h2><p class="m-adres">' + e(cfg.mekan.adres || '') + '</p>' +
          '<div class="m-dugmeler"></div></div>' +
          '</div></section>');
      }

      /* 7. LCV */
      var lcv = cfg.lcv;
      var wa = !lcv.endpoint && lcv.whatsapp;
      h.push('<section class="sahne s-lcv" aria-label="' + e(M.lcvBaslik) + '"><div class="b-bolum">' +
        '<form class="lcv-mektup" data-gorun="olcek" novalidate>' +
        '<div class="lcv-kenar"></div>' +
        '<h2 class="b-baslik">' + e(U.buyuk(M.lcvBaslik)) + '</h2>' +
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

      /* 8. kapanış */
      h.push('<section class="sahne s-kapanis" data-boy="2.4" aria-label="Kapanış">' +
        '<div class="sahne-sabit"><canvas class="kp-yapraklar" aria-hidden="true"></canvas>' +
        '<div class="kp-icerik"><div class="kp-celenk"><img alt="" src="' + G + 'madalyon.webp"><span>' + e(cfg.monogram || '') + '</span></div>' +
        '<p class="kp-metin">' + e(cfg.kapanis || '') + '</p>' +
        '<div class="kp-isimler">' + e(cfg.gelin.ad) + ' <span>&amp;</span> ' + e(cfg.damat.ad) + '</div>' +
        '<button type="button" class="dugme ikincil kp-basa">' + e(M.basaDon) + '</button></div>' +
        '<div class="p-panel p-sol kp-perde"><img alt="" src="' + G + 'perde-sol.webp"></div>' +
        '<div class="p-panel p-sag kp-perde"><img alt="" src="' + G + 'perde-sag.webp"></div>' +
        '<div class="kp-son">' + e(M.son || 'Görüşmek üzere') + '</div>' +
        '</div></section>');

      return h.join('');
    },

    /* ================================================================ sahneler */
    sahneler: function (cfg, D, ana) {
      var S = D.sahne, K = U.kolay, A = U.aralik, vh = function () { return S.vh || window.innerHeight; };
      var $ = function (s, k) { return (k || ana).querySelector(s); };
      var $$ = function (s, k) { return Array.prototype.slice.call((k || ana).querySelectorAll(s)); };

      /* ---- 1. açılış */
      var ac = $('.s-acilis');
      if (ac) {
        var ps = $('.p-sahne', ac), sol = $('.p-sol', ac), sag = $('.p-sag', ac), val = $('.p-valans', ac),
          arma = $('.p-arma', ac), isin = $('.p-isinlar', ac), hale = $('.p-hale', ac), kaydir = $('.kaydir', ac),
          ust = $$('.p-ust .harf', ac), ad1 = $$('.p-ad1 .harf', ac), ad2 = $$('.p-ad2 .harf', ac), ve = $('.p-ve', ac),
          tarih = $('.p-tarih', ac), kubbe = $('.k-kubbe', ac), gok = $('.k-gok', ac), isik = $('.k-isik', ac),
          bulutlar = $$('.k-bulut', ac), yazi = $$('.k-yazi p', ac), guv = $('.k-guvercinler', ac);
        S.kaydet(ac, function (p) {
          // perde: 0 - .26
          // perdeler kenarlara toplanır (tiyatro perdesi gibi, sahneyi çerçeveler)
          var o = K.icCikis3(A(p, 0.02, 0.26));
          var sp = Math.sin(o * Math.PI);                     // hareket ortasında abartılı dalga
          sol.style.transform = 'translate3d(' + (-o * 12).toFixed(2) + '%,0,0) scaleX(' + (1 - o * 0.7).toFixed(3) + ') skewY(' + (sp * 4).toFixed(2) + 'deg)';
          sag.style.transform = 'translate3d(' + (o * 12).toFixed(2) + '%,0,0) scaleX(' + (1 - o * 0.7).toFixed(3) + ') skewY(' + (-sp * 4).toFixed(2) + 'deg)';
          val.style.transform = 'translate3d(0,' + (-sp * 6).toFixed(2) + '%,0)';
          var am = A(p, 0.0, 0.1);
          arma.style.opacity = (1 - am).toFixed(3);
          arma.style.transform = 'translate(-50%,-50%) scale(' + (1 + am * 0.6).toFixed(3) + ') rotate(' + (am * 40) + 'deg)';
          kaydir.style.opacity = (1 - A(p, 0, 0.04)).toFixed(3);
          // ışınlar ve hale
          var li = A(p, 0.05, 0.3);
          isin.style.opacity = (li * 0.55 * (1 - A(p, 0.55, 0.66))).toFixed(3);
          isin.style.transform = 'translate(-50%,-50%) rotate(' + (p * 160).toFixed(2) + 'deg) scale(' + (0.6 + li * 0.7).toFixed(3) + ')';
          hale.style.opacity = (li * 0.9).toFixed(3);
          // yazılar: harf harf, abartılı giriş
          harfCanlandir(ust, A(p, 0.14, 0.3), 0.5);
          harfCanlandir(ad1, A(p, 0.18, 0.36), 1);
          harfCanlandir(ad2, A(p, 0.24, 0.42), 1);
          var vp = K.cikisGeri(A(p, 0.22, 0.34));
          ve.style.opacity = A(p, 0.22, 0.3).toFixed(3);
          ve.style.transform = 'scale(' + (3.2 - vp * 2.2).toFixed(3) + ') rotate(' + ((1 - vp) * -90).toFixed(1) + 'deg)';
          var tp = A(p, 0.36, 0.46);
          tarih.style.opacity = tp.toFixed(3);
          tarih.style.letterSpacing = ((1 - tp) * 0.6 + 0.3).toFixed(3) + 'em';
          // kamera kubbeye kalkar: .52 - .66
          var tilt = K.icCikis3(A(p, 0.5, 0.66));
          ps.style.transform = 'translate3d(0,' + (tilt * 105).toFixed(2) + '%,0) rotateX(' + (-tilt * 28).toFixed(2) + 'deg)';
          ps.style.opacity = (1 - A(p, 0.6, 0.68)).toFixed(3);
          // kubbe: yukarıdan gelir, sonra içine uçulur (.66 - .98)
          var uc = A(p, 0.64, 0.98);
          var s = Math.pow(7, K.icKare(uc));
          kubbe.style.transform = 'translate(-50%,' + ((-1 + tilt) * 120 - 50).toFixed(2) + '%) rotate(' + (uc * 40).toFixed(2) + 'deg) scale(' + (s * (0.9 + tilt * 0.1)).toFixed(4) + ')';
          kubbe.style.opacity = (tilt * (1 - A(p, 0.86, 0.97))).toFixed(3);
          gok.style.opacity = A(p, 0.72, 0.9).toFixed(3);
          isik.style.opacity = (A(p, 0.7, 0.92) * (1 - A(p, 0.97, 1))).toFixed(3);
          isik.style.transform = 'translate(-50%,-50%) scale(' + (0.4 + A(p, 0.7, 1) * 2.6).toFixed(3) + ')';
          // bulutlar: merkezden kameraya doğru hızla geçer
          bulutlar.forEach(function (b, i) {
            var bas = 0.66 + i * 0.055, bp = A(p, bas, bas + 0.2);
            var bs = 0.15 + Math.pow(bp, 2.2) * 5.5;
            var yon = (i % 2 ? 1 : -1) * (18 + i * 6);
            b.style.opacity = (Math.sin(bp * Math.PI) * 0.95).toFixed(3);
            b.style.transform = 'translate(calc(-50% + ' + (yon * bp).toFixed(1) + 'vw), calc(-50% + ' + ((i - 2) * 8 * bp).toFixed(1) + 'vh)) scale(' + bs.toFixed(3) + ')';
          });
          guv.style.opacity = (A(p, 0.7, 0.76) * (1 - A(p, 0.9, 0.95))).toFixed(3);
          guv.style.setProperty('--u', A(p, 0.7, 0.95).toFixed(3));
          yazi.forEach(function (y, i) {
            var yp = A(p, 0.74 + i * 0.04, 0.8 + i * 0.04) * (1 - A(p, 0.9, 0.95));
            y.style.opacity = yp.toFixed(3);
            y.style.transform = 'translate3d(0,' + ((1 - yp) * 30).toFixed(1) + 'px,0) scale(' + (0.9 + yp * 0.1).toFixed(3) + ')';
            y.style.filter = 'blur(' + ((1 - yp) * 8).toFixed(1) + 'px)';
          });
        });
      }

      function harfCanlandir(harfler, t, guc) {
        var n = harfler.length;
        for (var i = 0; i < n; i++) {
          var yerel = U.kisit(t * (1 + n * 0.12) - i * 0.12, 0, 1);
          var k = K.cikisGeri(yerel);
          var el = harfler[i];
          el.style.opacity = U.kisit(yerel * 2, 0, 1).toFixed(3);
          el.style.transform = 'translate3d(0,' + ((1 - k) * -60 * guc).toFixed(1) + 'px,0) rotate(' + ((1 - k) * (i % 2 ? 25 : -25) * guc).toFixed(1) + 'deg) scale(' + (1 + (1 - k) * 1.2 * guc).toFixed(3) + ')';
          el.style.filter = yerel < 1 ? 'blur(' + ((1 - yerel) * 6).toFixed(1) + 'px)' : '';
        }
      }

      /* ---- 2. galeri */
      var gal = $('.s-galeri');
      if (gal) {
        var tablolar = $$('.g-tablo', gal), asililar = $$('.g-asili', gal), noktalar = $$('.g-noktalar i', gal),
          gb = $('.g-baslik', gal);
        var n = tablolar.length, konum = 0, oncekiKonum = null, aci = 0, acisal = 0, sallaniyor = false, sonT = 0;
        // sarkaç: kaydırma hızına tepki veren, sönümlü yay (kaydırma durunca da salınmaya devam eder)
        var salla = function (now) {
          var dt = Math.min(0.05, (now - sonT) / 1000 || 0.016);
          sonT = now;
          acisal += (-aci * 60 - acisal * 5.5) * dt;
          aci += acisal * dt;
          asililar.forEach(function (a, i) {
            var o = Math.min(Math.abs(i - konum), 1);
            a.style.transform = 'rotate(' + (aci * (1 - o * 0.5)).toFixed(2) + 'deg)';
          });
          if (Math.abs(aci) > 0.05 || Math.abs(acisal) > 0.05) requestAnimationFrame(salla);
          else { sallaniyor = false; aci = 0; acisal = 0; }
        };
        S.kaydet(gal, function (p) {
          var x = U.kisit((p - 0.06) / 0.88, 0, 1) * (n - 1);
          if (oncekiKonum !== null) {
            acisal += (oncekiKonum - x) * 120;               // ivme itmesi
            acisal = U.kisit(acisal, -160, 160);
            if (!sallaniyor && Math.abs(acisal) > 0.5) { sallaniyor = true; sonT = performance.now(); requestAnimationFrame(salla); }
          }
          oncekiKonum = x;
          konum = x;
          gb.style.opacity = (A(p, 0, 0.05) * (1 - A(p, 0.97, 1))).toFixed(3);
          tablolar.forEach(function (tb, i) {
            var o = i - x, ao = Math.abs(o);
            tb.style.transform = 'translate3d(' + (o * 74).toFixed(2) + 'vw,0,' + (-ao * 220).toFixed(1) + 'px) rotateY(' + U.kisit(-o * 38, -70, 70).toFixed(2) + 'deg)';
            tb.style.opacity = U.kisit(1.5 - ao, 0, 1).toFixed(3);
            tb.style.zIndex = String(100 - Math.round(ao * 10));
            tb.style.setProperty('--odak', U.kisit(1 - ao * 2.2, 0, 1).toFixed(3));
          });
          noktalar.forEach(function (nk, i) { nk.classList.toggle('aktif', Math.round(x) === i); });
        });
      }

      /* ---- 3. davet: parşömen */
      var dv = $('.s-davet');
      if (dv) {
        var kagit = $('.d-kagit', dv), alt = $('.d-alt', dv), satirlar = $$('.d-satir', dv), muhur = $('.d-muhur', dv),
          rulo = $('.d-rulo', dv), damgaVuruldu = false, kagitH = 0, satirY = null;
        window.addEventListener('resize', function () { kagitH = 0; satirY = null; });
        S.kaydet(dv, function (p) {
          var acil = K.icCikis3(A(p, 0.04, 0.62));
          var H = kagitH || (kagitH = kagit.offsetHeight);
          kagit.style.clipPath = 'inset(0 0 ' + ((1 - acil) * 100).toFixed(2) + '% 0)';
          kagit.style.webkitClipPath = kagit.style.clipPath;
          alt.style.transform = 'translate3d(0,' + (acil * H).toFixed(1) + 'px,0)';
          alt.style.setProperty('--don', (acil * H * 0.8).toFixed(1) + 'px');   // çubuk dokusu yuvarlanır
          var gorunenY = acil * H;
          if (!satirY) satirY = satirlar.map(function (s) { return s.offsetTop + s.offsetHeight * 0.6 + 34; });
          satirlar.forEach(function (s, i) {
            if (s === muhur) return;
            var sy = satirY[i];
            var sp = U.kisit((gorunenY - sy) / 90, 0, 1);
            s.style.opacity = sp.toFixed(3);
            s.style.filter = sp < 1 ? 'blur(' + ((1 - sp) * 5).toFixed(1) + 'px)' : '';
            s.style.transform = sp < 1 ? 'translate3d(0,' + ((1 - sp) * 14).toFixed(1) + 'px,0) scale(' + (1 + (1 - sp) * 0.12).toFixed(3) + ')' : '';
          });
          var mp = A(p, 0.7, 0.8);
          muhur.style.opacity = U.kisit(mp * 3, 0, 1).toFixed(3);
          muhur.style.transform = 'scale(' + (1 + (1 - K.cikis5(mp)) * 2.4).toFixed(3) + ') rotate(' + ((1 - mp) * -30).toFixed(1) + 'deg)';
          if (mp >= 1 && !damgaVuruldu) {
            damgaVuruldu = true;
            if (D.muzik) D.muzik.efekt('damga');
            rulo.classList.remove('sars');
            void rulo.offsetWidth;
            rulo.classList.add('sars');
          } else if (mp < 0.5) damgaVuruldu = false;
          // çıkış: rulo yukarı ve uzağa
          var cik = A(p, 0.9, 1);
          rulo.style.transform = 'translate3d(0,' + (-cik * 30).toFixed(1) + 'vh,0) scale(' + (1 - cik * 0.25).toFixed(3) + ')';
          rulo.style.opacity = (1 - cik).toFixed(3);
        });
      }

      /* ---- 4. tarih */
      var tr = $('.s-tarih');
      if (tr) {
        var mad = $('.t-madalyon', tr), tis = $('.t-isinlar', tr), thale = $('.t-hale', tr), talt = $('.t-alt', tr), tust = $('.t-ust', tr);
        D.geriSayim($('.geri-sayim', tr), cfg._tarih, cfg.metin);
        var tk = D.takvim(cfg);
        if (tk) $('.t-dugmeler', tr).appendChild(D.menuDugme(cfg.metin.takvimeEkle, [
          { ad: 'Google Takvim', href: tk.google }, { ad: 'Apple / Outlook (.ics)', href: tk.ics, indir: 'davetiye.ics' }]));
        var calindi = false;
        S.kaydet(tr, function (p) {
          var g = A(p, 0.0, 0.5), k = K.cikis5(g);
          mad.style.transform = 'translate3d(0,' + ((1 - k) * 40).toFixed(1) + 'vh,0) rotateY(' + ((1 - k) * 1080).toFixed(1) + 'deg) scale(' + (0.3 + k * 0.7 + Math.sin(g * Math.PI) * 0.35).toFixed(3) + ')';
          mad.style.opacity = U.kisit(g * 4, 0, 1).toFixed(3);
          tis.style.opacity = A(p, 0.3, 0.5).toFixed(3);
          tis.style.transform = 'translate(-50%,-50%) rotate(' + (p * 120).toFixed(1) + 'deg) scale(' + (0.5 + A(p, 0.3, 0.55) * 0.7).toFixed(3) + ')';
          thale.style.opacity = (A(p, 0.42, 0.5) * (1 - A(p, 0.5, 0.6)) * 1 + A(p, 0.5, 0.62) * 0.45).toFixed(3);
          tust.style.opacity = A(p, 0.35, 0.5).toFixed(3);
          var a = A(p, 0.5, 0.68);
          talt.style.opacity = a.toFixed(3);
          talt.style.transform = 'translate3d(0,' + ((1 - K.cikis3(a)) * 60).toFixed(1) + 'px,0)';
          if (g >= 1 && !calindi) { calindi = true; if (D.muzik) D.muzik.efekt('parilti'); } else if (g < 0.8) calindi = false;
          var cik = A(p, 0.9, 1);
          mad.style.opacity = (U.kisit(g * 4, 0, 1) * (1 - cik)).toFixed(3);
        });
      }

      /* ---- 5. program: sarmaşık çizimi */
      var pr = $('.s-program');
      if (pr) {
        var dal = $('.pr-dal', pr), yap = $$('.pr-yaprak', pr), liste = $('.pr-liste', pr);
        S.kaydet(pr, function () {
          var r = liste.getBoundingClientRect();
          var f = U.kisit((vh() * 0.72 - r.top) / r.height, 0, 1);
          dal.style.strokeDashoffset = (1 - f).toFixed(4);
          var n = yap.length;
          yap.forEach(function (y, i) { y.classList.toggle('acik', f > (i + 0.5) / n); });
        });
      }

      /* ---- 6. mekan */
      var mk = $('.s-mekan');
      if (mk) {
        var cizgiler = $$('.m-cizim path', mk), boya = $('.m-boya', mk), bilgi = $('.m-bilgi', mk);
        var yt = D.yolTarifi(cfg.mekan), tk2 = D.takvim(cfg), md = $('.m-dugmeler', mk);
        if (yt) md.appendChild(D.menuDugme(cfg.metin.yolTarifi, [{ ad: 'Google Haritalar', href: yt.google },
          { ad: 'Apple Haritalar', href: yt.apple }, { ad: 'Yandex Haritalar', href: yt.yandex }]));
        if (tk2) md.appendChild(D.menuDugme(cfg.metin.takvimeEkle, [{ ad: 'Google Takvim', href: tk2.google },
          { ad: 'Apple / Outlook (.ics)', href: tk2.ics, indir: 'davetiye.ics' }], 'ikincil'));
        var nC = cizgiler.length;
        S.kaydet(mk, function (p) {
          var c = A(p, 0.02, 0.55);
          cizgiler.forEach(function (l, i) {
            var bas = i / nC * 0.6, lp = U.kisit((c - bas) / 0.4, 0, 1);
            l.style.strokeDashoffset = (1 - lp).toFixed(4);
          });
          boya.style.opacity = A(p, 0.45, 0.7).toFixed(3);
          boya.style.transform = 'scale(' + (0.8 + A(p, 0.45, 0.8) * 0.25).toFixed(3) + ')';
          var b = A(p, 0.55, 0.75);
          bilgi.style.opacity = b.toFixed(3);
          bilgi.style.transform = 'translate3d(0,' + ((1 - K.cikis3(b)) * 50).toFixed(1) + 'px,0)';
        });
      }

      /* ---- 7. LCV */
      var form = $('.lcv-mektup');
      if (form) {
        D.lcv(form, cfg, function () {
          form.classList.remove('lcv-ucus');
          void form.offsetWidth;
          form.classList.add('lcv-ucus');
          if (D.muzik) { setTimeout(function () { D.muzik.efekt('damga'); }, 900); setTimeout(function () { D.muzik.efekt('parilti'); }, 1500); }
        });
      }

      /* ---- 8. kapanış */
      var kp = $('.s-kapanis');
      if (kp) {
        var kSol = $('.kp-perde.p-sol', kp), kSag = $('.kp-perde.p-sag', kp), kic = $('.kp-icerik', kp), kson = $('.kp-son', kp),
          tuval = $('.kp-yapraklar', kp);
        var yag = yapraklar(tuval);
        $('.kp-basa', kp).addEventListener('click', function () { window.scrollTo({ top: 0, behavior: U.azHareket() ? 'auto' : 'smooth' }); });
        S.kaydet(kp, function (p) {
          var g = A(p, 0.0, 0.35);
          kic.style.opacity = g.toFixed(3);
          kic.style.transform = 'scale(' + (0.85 + K.cikisGeri(g) * 0.15).toFixed(3) + ')';
          yag.yogunluk(A(p, 0.05, 0.3) * (1 - A(p, 0.85, 1) * 0.7));
          var k = K.icCikis3(A(p, 0.6, 0.9));
          kSol.style.transform = 'translate3d(' + ((1 - k) * -100).toFixed(2) + '%,0,0) scaleX(' + (0.6 + k * 0.4).toFixed(3) + ')';
          kSag.style.transform = 'translate3d(' + ((1 - k) * 100).toFixed(2) + '%,0,0) scaleX(' + (0.6 + k * 0.4).toFixed(3) + ')';
          kson.style.opacity = A(p, 0.88, 0.98).toFixed(3);
        });
      }
    },

    acildi: function () { /* sahne motoru zaten çalışıyor */ }
  });

  /* ---------------------------------------------------------------- yaprak / varak yağmuru */
  function yapraklar(tuval) {
    var ctx = tuval.getContext('2d'), parca = [], yog = 0, calis = false, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function boyut() { tuval.width = tuval.clientWidth * dpr; tuval.height = tuval.clientHeight * dpr; }
    function yeni() {
      var gul = Math.random() < 0.55;
      return {
        x: Math.random(), y: -0.05 - Math.random() * 0.2, vx: (Math.random() - 0.5) * 0.04, vy: 0.05 + Math.random() * 0.08,
        r: (gul ? 7 + Math.random() * 7 : 3 + Math.random() * 5) * dpr, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 3,
        f: Math.random() * 6.28, gul: gul, renk: gul ? ['#a3162b', '#c0283e', '#7c0c1d', '#e05a6a'][Math.floor(Math.random() * 4)] : null
      };
    }
    var son = performance.now();
    function kare(now) {
      var dt = Math.min(0.05, (now - son) / 1000);
      son = now;
      var w = tuval.width, h = tuval.height;
      ctx.clearRect(0, 0, w, h);
      var hedef = Math.round(yog * 90);
      while (parca.length < hedef) parca.push(yeni());
      for (var i = parca.length - 1; i >= 0; i--) {
        var q = parca[i];
        q.f += dt * 2;
        q.x += (q.vx + Math.sin(q.f) * 0.03) * dt;
        q.y += q.vy * dt;
        q.a += q.va * dt;
        if (q.y > 1.08) { if (parca.length > hedef) { parca.splice(i, 1); continue; } parca[i] = yeni(); continue; }
        ctx.save();
        ctx.translate(q.x * w, q.y * h);
        ctx.rotate(q.a);
        ctx.scale(1, Math.abs(Math.sin(q.f * 1.3)) * 0.7 + 0.3);
        if (q.gul) {
          ctx.fillStyle = q.renk;
          ctx.beginPath();
          ctx.moveTo(0, -q.r);
          ctx.bezierCurveTo(q.r, -q.r, q.r, q.r * 0.6, 0, q.r);
          ctx.bezierCurveTo(-q.r, q.r * 0.6, -q.r, -q.r, 0, -q.r);
          ctx.fill();
        } else {
          var gr = ctx.createLinearGradient(-q.r, -q.r, q.r, q.r);
          gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.5, '#d9a943'); gr.addColorStop(1, '#8a5f1c');
          ctx.fillStyle = gr;
          ctx.fillRect(-q.r, -q.r * 0.7, q.r * 2, q.r * 1.4);
        }
        ctx.restore();
      }
      if (yog > 0 || parca.length) requestAnimationFrame(kare);
      else calis = false;
    }
    window.addEventListener('resize', boyut);
    boyut();
    return {
      yogunluk: function (v) {
        yog = v;
        if (!tuval.width) boyut();
        if (v > 0 && !calis) { calis = true; son = performance.now(); requestAnimationFrame(kare); }
      }
    };
  }

  D.barok = { iyelik: iyelik };
})(window.Davetiye);
