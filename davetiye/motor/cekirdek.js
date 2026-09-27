/*!
 * Davetiye motoru — çekirdek
 * Yapılandırma (window.DAVETIYE), kişiselleştirme (?kisi=), scroll sahne motoru,
 * ortak bileşenler (geri sayım, takvim, yol tarifi, LCV, paylaş) ve başlatıcı.
 * Bağımlılık yok; klasik <script> olarak yüklenir, her şey window.Davetiye altında.
 */
(function (D) {
  'use strict';

  /* ================================================================ yardımcılar */
  var U = D.yardimci = {};
  U.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  U.$ = function (s, k) { return (k || document).querySelector(s); };
  U.$$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };
  U.kisit = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.ara = function (a, b, t) { return a + (b - a) * t; };
  /** p'nin [a,b] aralığındaki yerel ilerlemesi (0..1) */
  U.aralik = function (p, a, b) { return U.kisit((p - a) / (b - a), 0, 1); };
  U.kolay = {
    dogrusal: function (t) { return t; },
    icKare: function (t) { return t * t; },
    cikisKare: function (t) { return 1 - (1 - t) * (1 - t); },
    cikis3: function (t) { return 1 - Math.pow(1 - t, 3); },
    icCikis3: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    icCikis4: function (t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; },
    cikis5: function (t) { return 1 - Math.pow(1 - t, 5); },
    cikisGeri: function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    cikisElastik: function (t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
    },
    sinus: function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); }
  };
  U.azHareket = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  U.tween = function (ms, fn, bitti) {
    var t0 = performance.now();
    var iptal = false;
    function kare(now) {
      if (iptal) return;
      var p = ms <= 0 ? 1 : U.kisit((now - t0) / ms, 0, 1);
      fn(p);
      if (p < 1) requestAnimationFrame(kare);
      else if (bitti) bitti();
    }
    requestAnimationFrame(kare);
    return function () { iptal = true; };
  };
  U.json = function (url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  };
  U.resim = function (url) {
    return new Promise(function (ok, hata) {
      var i = new Image();
      i.decoding = 'async';
      i.onload = function () { ok(i); };
      i.onerror = function () { hata(new Error('Görsel yüklenemedi: ' + url)); };
      i.src = url;
    });
  };
  U.kacis = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /** Türkçe büyük harf (i -> İ) */
  U.buyuk = function (s) { return String(s || '').toLocaleUpperCase('tr-TR'); };

  var AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  /**
   * Tarihi ETKİNLİĞİN saat diliminde parçalar (misafir yurt dışında olsa da saat doğru görünür).
   * tz: IANA saat dilimi, ör. 'Europe/Istanbul'
   */
  U.tarih = function (d, tz) {
    var iki = function (n) { return (n < 10 ? '0' : '') + n; };
    var g = { gun: d.getDate(), ay: d.getMonth() + 1, yil: d.getFullYear(), hg: d.getDay(), sa: d.getHours(), dk: d.getMinutes() };
    try {
      var f = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Europe/Istanbul', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(d);
      var p = {};
      f.forEach(function (x) { p[x.type] = x.value; });
      g = { gun: +p.day, ay: +p.month, yil: +p.year, sa: +p.hour % 24, dk: +p.minute,
        hg: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
    } catch (e) { /* eski tarayıcı: yerel saat */ }
    return {
      gun: g.gun, ay: AYLAR[g.ay - 1], ayNo: g.ay, yil: g.yil,
      haftaGunu: GUNLER[g.hg], saat: iki(g.sa) + ':' + iki(g.dk),
      kisa: iki(g.gun) + '.' + iki(g.ay) + '.' + g.yil,
      uzun: g.gun + ' ' + AYLAR[g.ay - 1] + ' ' + g.yil
    };
  };
  U.romen = function (n) {
    var r = '', t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    t.forEach(function (x) { while (n >= x[0]) { r += x[1]; n -= x[0]; } });
    return r;
  };

  /* ================================================================ yapılandırma */
  var VARSAYILAN_METIN = {
    sayin: 'Sayın',
    degerliMisafir: 'Değerli Misafirimiz',
    muhurIpucu: 'Açmak için mührü kırın',
    kaydir: 'Kaydırın',
    gun: 'Gün', saat: 'Saat', dakika: 'Dakika', saniye: 'Saniye',
    takvimeEkle: 'Takvime Ekle', yolTarifi: 'Yol Tarifi', paylas: 'Paylaş',
    lcvBaslik: 'Katılım Durumu', lcvGonder: 'Yanıtı Gönder',
    katiliyorum: 'Katılıyorum', katilamiyorum: 'Katılamıyorum',
    adSoyad: 'Adınız Soyadınız', kisiSayisi: 'Kişi sayısı', notunuz: 'Mesajınız (isteğe bağlı)',
    tesekkur: 'Teşekkür ederiz! Yanıtınız bize ulaştı.',
    buyukGun: 'Büyük gün geldi!', gecti: 'Bu mutlu günü bizimle paylaştığınız için teşekkürler.',
    basaDon: 'Başa dön', muzikAc: 'Müziği aç', muzikKapat: 'Müziği kapat'
  };

  function misafirAdi() {
    try {
      var q = new URLSearchParams(location.search);
      var ad = q.get('kisi') || q.get('misafir') || q.get('ad');
      return ad ? ad.trim().slice(0, 60) : '';
    } catch (e) { return ''; }
  }

  D.ayarla = function (cfg) {
    cfg = cfg || {};
    cfg.metin = Object.assign({}, VARSAYILAN_METIN, cfg.metin || {});
    cfg._misafir = misafirAdi();
    cfg._tarih = cfg.tarih ? new Date(cfg.tarih) : null;
    cfg.saatDilimi = cfg.saatDilimi || 'Europe/Istanbul';
    cfg._t = cfg._tarih ? U.tarih(cfg._tarih, cfg.saatDilimi) : null;
    cfg.program = cfg.program || [];
    cfg.hikaye = cfg.hikaye || [];
    cfg.lcv = cfg.lcv || {};
    cfg.mekan = cfg.mekan || {};
    cfg.muzik = cfg.muzik || {};
    return cfg;
  };

  /* ================================================================ temalar */
  D.temalar = D.temalar || {};
  D.temaKaydet = function (ad, tanim) { D.temalar[ad] = tanim; };

  /* ================================================================ sahne motoru
   * Her sahne: <section class="sahne" data-boy="3"> ... <div class="sahne-sabit">…</div></section>
   * data-boy: sahnenin kaç ekran boyu kaydırılacağı. İçteki .sahne-sabit yapışkan kalır,
   * guncelle(p) 0..1 ilerlemeyle çağrılır. Kaydırma yumuşatılır (lerp).
   */
  var S = D.sahne = { liste: [], y: 0, hedef: 0, calisiyor: false, vh: 0 };

  S.kaydet = function (el, guncelle, secenek) {
    var s = { el: el, guncelle: guncelle, boy: parseFloat(el.getAttribute('data-boy') || '1'), son: null, o: secenek || {} };
    S.liste.push(s);
    return s;
  };

  S.olc = function () {
    // mobil adres çubuğu kaydırırken sıçramasın diye vh'yi yalnız genişlik değişince güncelle
    var w = window.innerWidth;
    if (!S.vh || w !== S._w) {
      S.vh = window.innerHeight;
      S._w = w;
      document.documentElement.style.setProperty('--vh', (S.vh / 100) + 'px');
    }
    S.liste.forEach(function (s) {
      if (s.boy > 1) s.el.style.height = (s.boy * S.vh) + 'px';
      var r = s.el.getBoundingClientRect();
      s.ust = r.top + window.scrollY;
      s.yuk = r.height;
    });
  };

  S.baslat = function () {
    S.olc();
    S.y = S.hedef = window.scrollY;
    window.addEventListener('scroll', function () { S.hedef = window.scrollY; S.uyan(); }, { passive: true });
    window.addEventListener('resize', function () { S.olc(); S.hedef = window.scrollY; S.uyan(); });
    // yazı tipleri yüklenince yerleşim değişebilir
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { S.olc(); S.uyan(); });
    S.uyan();
  };

  S.uyan = function () {
    if (S.calisiyor) return;
    S.calisiyor = true;
    S._son = performance.now();
    requestAnimationFrame(S.kare);
  };

  S.kare = function (now) {
    var dt = Math.min(0.05, (now - S._son) / 1000);
    S._son = now;
    var k = U.azHareket() ? 1 : 1 - Math.exp(-dt * 11);
    S.y += (S.hedef - S.y) * k;
    if (Math.abs(S.hedef - S.y) < 0.3) S.y = S.hedef;
    var vh = S.vh;
    var y = S.y;
    for (var i = 0; i < S.liste.length; i++) {
      var s = S.liste[i];
      var menzil = Math.max(s.yuk - vh, 1);
      var ham = (y - s.ust) / menzil;              // sahne sabitlenmeden önce <0, sonra >1
      var gorunur = y + vh > s.ust - vh * 0.5 && y < s.ust + s.yuk + vh * 0.5;
      if (!gorunur && s.son !== null) {
        // görünmez hale geçerken son durumu yerleştir
        var uc = ham < 0 ? 0 : 1;
        if (s.son !== uc) { s.guncelle(uc, { ham: ham, giris: ham < 0 ? -1 : 0, cikis: ham > 1 ? 1 : 0 }); s.son = uc; }
        continue;
      }
      if (!gorunur) continue;
      var p = U.kisit(ham, 0, 1);
      // giriş (-1..0): sahnenin üst kenarı ekranın altından yukarı çıkarken; çıkış (0..1): sahne yukarı kayarken
      var giris = U.kisit((y + vh - s.ust) / vh - 1, -1, 0);
      var cikis = U.kisit((y - (s.ust + s.yuk - vh)) / vh, 0, 1);
      var anahtar = Math.round(ham * 4000) / 4000;
      if (anahtar !== s.son) {
        s.guncelle(p, { ham: ham, giris: giris, cikis: cikis, dt: dt });
        s.son = anahtar;
      }
    }
    if (S.y !== S.hedef) requestAnimationFrame(S.kare);
    else S.calisiyor = false;
  };

  /** Görününce .gorundu sınıfı ekler (basit giriş efektleri için) */
  S.gozlem = function (kok) {
    var els = U.$$('[data-gorun]', kok);
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('gorundu'); }); return; }
    var io = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) {
        if (g.isIntersecting) { g.target.classList.add('gorundu'); io.unobserve(g.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    els.forEach(function (e) { io.observe(e); });
  };

  /** transform dizesi kısaltması */
  U.tf = function (o) {
    var s = '';
    if (o.x || o.y || o.z) s += 'translate3d(' + (o.x || 0) + (o.xb || 'px') + ',' + (o.y || 0) + (o.yb || 'px') + ',' + (o.z || 0) + 'px) ';
    if (o.rx) s += 'rotateX(' + o.rx + 'deg) ';
    if (o.ry) s += 'rotateY(' + o.ry + 'deg) ';
    if (o.r) s += 'rotate(' + o.r + 'deg) ';
    if (o.s != null && o.s !== 1) s += 'scale(' + o.s + ') ';
    if (o.sx != null || o.sy != null) s += 'scale(' + (o.sx == null ? 1 : o.sx) + ',' + (o.sy == null ? 1 : o.sy) + ') ';
    return s || 'none';
  };

  /* ================================================================ bileşenler */
  D.geriSayim = function (kok, hedef, metin) {
    if (!kok || !hedef) return;
    var alanlar = ['gun', 'saat', 'dakika', 'saniye'];
    kok.innerHTML = alanlar.map(function (a) {
      return '<div class="gs-kutu" data-a="' + a + '"><div class="gs-sayi"><span class="gs-on">00</span></div>' +
        '<div class="gs-etiket">' + U.kacis(metin[a]) + '</div></div>';
    }).join('');
    var onceki = {};
    function yaz() {
      var fark = hedef.getTime() - Date.now();
      if (fark <= 0) {
        kok.classList.add('gs-bitti');
        kok.setAttribute('data-mesaj', fark > -86400000 ? metin.buyukGun : metin.gecti);
        alanlar.forEach(function (a) { U.$('[data-a="' + a + '"] .gs-on', kok).textContent = '00'; });
        return;
      }
      var s = Math.floor(fark / 1000);
      var v = { gun: Math.floor(s / 86400), saat: Math.floor(s / 3600) % 24, dakika: Math.floor(s / 60) % 60, saniye: s % 60 };
      alanlar.forEach(function (a) {
        var t = (v[a] < 10 ? '0' : '') + v[a];
        if (onceki[a] !== t) {
          var kutu = U.$('[data-a="' + a + '"] .gs-sayi', kok);
          var eski = U.$('.gs-on', kutu);
          if (onceki[a] != null && !U.azHareket()) {
            var yeni = U.el('span', 'gs-on gs-yeni', t);
            eski.classList.add('gs-eski');
            eski.classList.remove('gs-on');
            kutu.appendChild(yeni);
            setTimeout(function () { if (eski.parentNode) eski.parentNode.removeChild(eski); yeni.classList.remove('gs-yeni'); }, 650);
          } else {
            eski.textContent = t;
          }
          onceki[a] = t;
        }
      });
    }
    yaz();
    return setInterval(yaz, 1000);
  };

  function icsTarih(d) {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  D.takvim = function (cfg) {
    if (!cfg._tarih) return null;
    var bas = cfg._tarih;
    var bit = new Date(bas.getTime() + (cfg.sureSaat || 5) * 3600000);
    var baslik = cfg.takvimBaslik || document.title;
    var yer = [cfg.mekan.ad, cfg.mekan.adres].filter(Boolean).join(', ');
    var aciklama = cfg.takvimAciklama || '';
    var google = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(baslik) + '&dates=' + icsTarih(bas) + '/' + icsTarih(bit) +
      '&details=' + encodeURIComponent(aciklama + (aciklama ? '\n' : '') + location.href.split('?')[0]) +
      '&location=' + encodeURIComponent(yer);
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Davetiye//TR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + icsTarih(bas) + '-' + Math.random().toString(36).slice(2) + '@davetiye',
      'DTSTAMP:' + icsTarih(new Date()), 'DTSTART:' + icsTarih(bas), 'DTEND:' + icsTarih(bit),
      'SUMMARY:' + baslik.replace(/[,;]/g, ' '), 'LOCATION:' + yer.replace(/[,;]/g, ' '),
      'DESCRIPTION:' + aciklama.replace(/\n/g, '\\n').replace(/[,;]/g, ' '),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + baslik.replace(/[,;]/g, ' '), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return { google: google, ics: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics) };
  };

  D.yolTarifi = function (m) {
    if (!m) return null;
    var hedef = m.koordinat ? m.koordinat.join(',') : [m.ad, m.adres].filter(Boolean).join(', ');
    return {
      google: m.harita || ('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(hedef)),
      apple: 'https://maps.apple.com/?daddr=' + encodeURIComponent(hedef),
      yandex: m.koordinat ? 'https://yandex.com.tr/harita/?rtext=~' + m.koordinat.join('%2C') + '&rtt=auto' : null
    };
  };

  /** Takvim / yol tarifi düğmeleri: küçük açılır menü */
  D.menuDugme = function (etiket, secenekler, sinif) {
    var kap = U.el('div', 'menu-dugme ' + (sinif || ''));
    var b = U.el('button', 'dugme', U.kacis(etiket));
    b.type = 'button';
    var liste = U.el('div', 'menu-liste');
    secenekler.filter(function (s) { return s && s.href; }).forEach(function (s) {
      var a = U.el('a', null, U.kacis(s.ad));
      a.href = s.href;
      if (s.indir) a.setAttribute('download', s.indir);
      else { a.target = '_blank'; a.rel = 'noopener'; }
      liste.appendChild(a);
    });
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var acik = kap.classList.toggle('acik');
      if (acik) {
        var kapat = function () { kap.classList.remove('acik'); document.removeEventListener('click', kapat); };
        setTimeout(function () { document.addEventListener('click', kapat); }, 0);
      }
    });
    kap.appendChild(b);
    kap.appendChild(liste);
    return kap;
  };

  /* ---- LCV (katılım) formu
   * cfg.lcv.endpoint  : JSON POST adresi (ör. kendi sunucunuz / Google Apps Script)
   * cfg.lcv.whatsapp  : 905xxxxxxxxx — endpoint yoksa yanıt WhatsApp mesajı olarak açılır
   */
  D.lcv = function (form, cfg, animasyon) {
    if (!form) return;
    var M = cfg.metin;
    var anahtar = 'davetiye-lcv:' + location.pathname;
    var kayit = null;
    try { kayit = JSON.parse(localStorage.getItem(anahtar) || 'null'); } catch (e) { /* gizli mod */ }
    var ad = form.querySelector('[name=ad]');
    if (ad && cfg._misafir && !ad.value) ad.value = cfg._misafir;
    var sayi = form.querySelector('[name=kisi]');
    form.querySelectorAll('[data-adim]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = U.kisit((parseInt(sayi.value, 10) || 1) + parseInt(b.getAttribute('data-adim'), 10), 1, cfg.lcv.enFazla || 10);
        sayi.value = v;
        form.querySelector('.sayi-goster').textContent = v;
      });
    });
    function veri() {
      var d = new FormData(form);
      return {
        ad: (d.get('ad') || '').toString().trim(), katilim: d.get('katilim') || 'evet',
        kisi: parseInt(d.get('kisi'), 10) || 1, not: (d.get('not') || '').toString().trim(),
        davetiye: document.title, tarih: new Date().toISOString()
      };
    }
    function waLink(v) {
      var satirlar = [cfg.lcv.mesajBaslik || ('LCV — ' + document.title), 'İsim: ' + v.ad,
        'Katılım: ' + (v.katilim === 'evet' ? M.katiliyorum + ' (' + v.kisi + ' kişi)' : M.katilamiyorum)];
      if (v.not) satirlar.push('Not: ' + v.not);
      return 'https://wa.me/' + String(cfg.lcv.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(satirlar.join('\n'));
    }
    function tamam(v) {
      try { localStorage.setItem(anahtar, JSON.stringify(v)); } catch (e) { /* yok */ }
      form.classList.add('lcv-gonderildi');
      var s = form.querySelector('.lcv-sonuc');
      if (s) s.textContent = M.tesekkur;
    }
    if (kayit) { form.classList.add('lcv-gonderildi', 'lcv-onceden'); var s0 = form.querySelector('.lcv-sonuc'); if (s0) s0.textContent = M.tesekkur; }
    var gonder = form.querySelector('.lcv-gonder');
    // yalnız WhatsApp tanımlıysa gönder düğmesi doğrudan wa.me bağlantısıdır (açılır pencere engeline takılmaz)
    if (!cfg.lcv.endpoint && cfg.lcv.whatsapp && gonder.tagName === 'A') {
      var guncelleLink = function () { gonder.href = waLink(veri()); };
      form.addEventListener('input', guncelleLink);
      form.addEventListener('change', guncelleLink);
      guncelleLink();
      gonder.addEventListener('click', function (e) {
        var v = veri();
        if (!v.ad) { e.preventDefault(); ad.focus(); ad.classList.add('hata'); return; }
        if (animasyon) animasyon(v);
        setTimeout(function () { tamam(v); }, 50);
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = veri();
      if (!v.ad) { ad.focus(); ad.classList.add('hata'); return; }
      var is = cfg.lcv.endpoint ? fetch(cfg.lcv.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v)
      }).catch(function () { /* ağ hatası: yine de yerelde kaydet */ }) : Promise.resolve();
      if (animasyon) animasyon(v);
      is.then(function () { tamam(v); });
    });
    if (ad) ad.addEventListener('input', function () { ad.classList.remove('hata'); });
  };

  D.paylas = function (cfg) {
    var url = location.href.split('?')[0];
    var veri = { title: document.title, text: cfg.paylasimMetni || document.title, url: url };
    if (navigator.share) return navigator.share(veri).catch(function () { /* iptal */ });
    if (navigator.clipboard) return navigator.clipboard.writeText(url).then(function () { D.bildirim('Bağlantı kopyalandı'); });
    window.prompt('Bağlantı:', url);
  };

  D.bildirim = function (metin) {
    var b = U.el('div', 'bildirim', U.kacis(metin));
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('goster'); });
    setTimeout(function () { b.classList.remove('goster'); setTimeout(function () { b.remove(); }, 500); }, 2200);
  };

  /* ================================================================ başlatıcı */
  D.baslat = function (cfg) {
    cfg = D.ayarla(cfg || window.DAVETIYE);
    D.cfg = cfg;
    var tema = D.temalar[cfg.tema];
    if (!tema) throw new Error('Tema bulunamadı: ' + cfg.tema);
    D.tema = tema;
    var kok = document.documentElement;
    kok.classList.add('tema-' + cfg.tema, 'tur-' + (cfg.tur || 'genel'));
    if (U.azHareket()) kok.classList.add('az-hareket');
    if (cfg.baslik) document.title = cfg.baslik;
    document.body.classList.add('kilitli');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    // yükleniyor ekranı
    var yuk = U.el('div', 'yukleniyor',
      '<div class="yuk-monogram">' + U.kacis(cfg.monogram || '') + '</div>' +
      '<svg class="yuk-halka" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle class="yuk-dolu" cx="50" cy="50" r="46"/></svg>');
    document.body.appendChild(yuk);
    var halka = yuk.querySelector('.yuk-dolu');
    function ilerleme(p) { halka.style.strokeDashoffset = (289 * (1 - p)).toFixed(1); }

    // hikâye içeriği
    var ana = U.el('main', 'hikaye');
    ana.id = 'hikaye';
    ana.innerHTML = tema.hikaye(cfg, D);
    document.body.appendChild(ana);

    // kalıcı arayüz: müzik, paylaş, ilerleme çizgisi
    var arayuz = U.el('div', 'arayuz',
      '<div class="ilerleme"><span></span></div>' +
      '<button class="yuvarlak muzik-dugme" type="button" aria-pressed="false" aria-label="' + U.kacis(cfg.metin.muzikAc) + '">' +
      '<span class="muzik-cubuk"></span><span class="muzik-cubuk"></span><span class="muzik-cubuk"></span><span class="muzik-cubuk"></span></button>' +
      '<button class="yuvarlak paylas-dugme" type="button" aria-label="' + U.kacis(cfg.metin.paylas) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg></button>');
    document.body.appendChild(arayuz);
    D.arayuz = arayuz;

    // müzik
    var muzik = D.muzik = D.Muzik ? new D.Muzik(cfg.muzik, tema.muzik) : null;
    var mb = arayuz.querySelector('.muzik-dugme');
    function muzikDurum(acik) {
      mb.classList.toggle('caliyor', acik);
      mb.setAttribute('aria-pressed', acik ? 'true' : 'false');
      mb.setAttribute('aria-label', acik ? cfg.metin.muzikKapat : cfg.metin.muzikAc);
    }
    mb.addEventListener('click', function () { if (muzik) muzikDurum(muzik.degistir()); });
    arayuz.querySelector('.paylas-dugme').addEventListener('click', function () { D.paylas(cfg); });
    var cizgi = arayuz.querySelector('.ilerleme span');
    window.addEventListener('scroll', function () {
      var m = document.documentElement.scrollHeight - window.innerHeight;
      cizgi.style.transform = 'scaleX(' + (m > 0 ? window.scrollY / m : 0).toFixed(4) + ')';
    }, { passive: true });

    // tema sahnelerini kaydet
    if (tema.sahneler) tema.sahneler(cfg, D, ana);
    S.gozlem(ana);

    function hikayeyiAc() {
      document.body.classList.remove('kilitli');
      document.body.classList.add('acildi');
      window.scrollTo(0, 0);
      S.baslat();
      if (tema.acildi) tema.acildi(cfg, D, ana);
    }

    if (location.hash === '#hikaye' || cfg.zarfsiz) {
      yuk.remove();
      hikayeyiAc();
      return;
    }

    var zarf = new D.Zarf({
      tema: tema, cfg: cfg, kartHTML: tema.kart ? tema.kart(cfg, D) : '', ilerleme: ilerleme,
      ses: function (ad) { if (muzik) muzik.efekt(ad); },
      acilis: function () {
        if (muzik && cfg.muzik.otomatik !== false) muzikDurum(muzik.baslat());
      },
      bitince: hikayeyiAc
    });
    D.zarf = zarf;
    // zarf, yazı tipleri de hazır olunca görünür (en fazla 3 sn beklenir)
    var fontlar = document.fonts && document.fonts.load ? Promise.race([
      Promise.all((tema.fontlar || []).map(function (f) { return document.fonts.load(f); })),
      new Promise(function (ok) { setTimeout(ok, 3000); })
    ]).catch(function () { /* yok */ }) : Promise.resolve();
    Promise.all([zarf.kur(), fontlar]).then(function () {
      ilerleme(1);
      setTimeout(function () {
        yuk.classList.add('bitti');
        zarf.kok.classList.add('zarf-gorun');
        setTimeout(function () { yuk.remove(); }, 1200);
      }, 250);
    }).catch(function (e) {
      console.error(e);
      yuk.remove();
      if (zarf.kok && zarf.kok.parentNode) zarf.kok.parentNode.removeChild(zarf.kok);
      hikayeyiAc();
    });
  };
})(window.Davetiye = window.Davetiye || {});
