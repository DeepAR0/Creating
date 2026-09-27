/*!
 * Davetiye — müzik ve ses efektleri (WebAudio)
 * Telif sorunu olmasın diye dahili parçalar kamu malı eserlerin kod ile
 * sentezlenmiş düzenlemeleridir:
 *   'kanon'      Pachelbel'in Kanon'u (re majör) — klavsen, üç ses kanon halinde
 *   'dogumgunu'  "İyi ki doğdun" ezgisi — müzik kutusu + çan
 * Gerçek bir ses dosyası kullanmak için cfg.muzik.kaynak = 'muzik.mp3'.
 */
(function (D) {
  'use strict';

  function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function Muzik(ayar, varsayilan) {
    this.ayar = ayar || {};
    this.parca = this.ayar.parca || varsayilan || 'kanon';
    this.acik = false;
    this.ctx = null;
  }

  Muzik.prototype._kur = function () {
    if (this.ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    var c = this.ctx = new AC();
    this.ana = c.createGain();
    this.ana.gain.value = 0;
    this.efektKazanc = c.createGain();
    this.efektKazanc.gain.value = 0.55;
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    this.hat = c.createGain();
    var kuru = c.createGain(); kuru.gain.value = 0.85;
    var yank = c.createConvolver();
    var uzun = this.parca === 'dogumgunu' ? 3.6 : 2.6;
    yank.buffer = this._yankı(uzun, 2.4);
    var islak = c.createGain(); islak.gain.value = this.parca === 'dogumgunu' ? 0.42 : 0.3;
    this.hat.connect(kuru); kuru.connect(comp);
    this.hat.connect(yank); yank.connect(islak); islak.connect(comp);
    comp.connect(this.ana);
    this.ana.connect(c.destination);
    this.efektKazanc.connect(comp);
    // efektler müzik kapalıyken de duyulsun: ayrı yol
    this.efektCikis = c.createGain();
    this.efektCikis.gain.value = 0.9;
    this.efektKazanc.disconnect();
    this.efektKazanc.connect(this.efektCikis);
    this.efektCikis.connect(c.destination);
    return true;
  };

  Muzik.prototype._yankı = function (sn, bozunma) {
    var c = this.ctx, n = Math.floor(c.sampleRate * sn);
    var b = c.createBuffer(2, n, c.sampleRate);
    for (var k = 0; k < 2; k++) {
      var d = b.getChannelData(k);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, bozunma);
    }
    return b;
  };

  /* ---- sesler */
  Muzik.prototype._klavsen = function (t, m, sure, guc) {
    var c = this.ctx, f = mf(m);
    var o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = f; o1.detune.value = -4;
    o2.type = 'sawtooth'; o2.frequency.value = f; o2.detune.value = 5;
    o3.type = 'square'; o3.frequency.value = f * 2;
    var g3 = c.createGain(); g3.gain.value = 0.18;
    var fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.2;
    var tepe = Math.min(f * 10, 7000);
    fl.frequency.setValueAtTime(tepe, t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(f * 1.8, 300), t + 0.45);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(guc, t + 0.004);
    g.gain.exponentialRampToValueAtTime(guc * 0.35, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure + 0.7);
    o1.connect(fl); o2.connect(fl); o3.connect(g3); g3.connect(fl);
    fl.connect(g); g.connect(this.hat);
    var bit = t + sure + 0.8;
    [o1, o2, o3].forEach(function (o) { o.start(t); o.stop(bit); });
  };

  Muzik.prototype._kutu = function (t, m, guc, uzun) {
    // müzik kutusu / çelesta: çan benzeri kısmi sesler
    var c = this.ctx, f = mf(m);
    var kismi = [[1, 1, 1.6], [2, 0.32, 0.9], [3, 0.14, 0.6], [4.2, 0.07, 0.35], [5.4, 0.04, 0.25]];
    var g0 = c.createGain(); g0.gain.value = guc;
    g0.connect(this.hat);
    kismi.forEach(function (k) {
      var o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * k[0];
      var g = c.createGain();
      var dur = k[2] * (uzun || 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(k[1], t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(g0);
      o.start(t); o.stop(t + dur + 0.05);
    });
  };

  Muzik.prototype._bas = function (t, m, sure, guc) {
    var c = this.ctx, f = mf(m);
    var o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    var o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
    var g2 = c.createGain(); g2.gain.value = 0.25;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(guc, t + 0.01);
    g.gain.exponentialRampToValueAtTime(guc * 0.4, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure + 0.4);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.hat);
    o.start(t); o2.start(t); o.stop(t + sure + 0.5); o2.stop(t + sure + 0.5);
  };

  /* ---- parçalar: [başlangıç (vuruş), midi, süre (vuruş), güç, ses] listesi üretir */
  var PARCALAR = {
    kanon: function () {
      var d = 2;                                  // her akor 2 vuruş
      var bas = [50, 45, 47, 42, 43, 38, 43, 45]; // D A Bm F#m G D G A
      var akor = [[62, 66, 69], [61, 64, 69], [62, 66, 71], [61, 66, 69], [59, 62, 67], [57, 62, 66], [59, 62, 67], [61, 64, 69]];
      var M = [
        [[78], [76], [74], [73], [71], [69], [71], [73]],
        [[74], [73], [71], [69], [67], [66], [67], [64]],
        [[74, 78], [69, 76], [71, 74], [73, 69], [71, 67], [69, 66], [71, 67], [73, 76]],
        [[74, 78, 81, 78], [73, 76, 81, 76], [74, 78, 83, 78], [73, 78, 81, 78], [71, 74, 79, 74], [69, 74, 78, 74], [71, 74, 79, 74], [73, 76, 81, 76]],
        [[78, 74], [76, 73], [74, 71], [73, 69], [71, 67], [69, 66], [71, 67], [73, 69]]
      ];
      var olay = [];
      var dongu = 7;
      for (var c = 0; c < dongu; c++) {
        for (var i = 0; i < 8; i++) {
          var t0 = (c * 8 + i) * d;
          olay.push([t0, bas[i], d, 0.30, 'bas']);
          // hafif arpej eşlik (sekizlikler)
          var a = akor[i];
          [0, 1, 2, 1].forEach(function (k, j) { olay.push([t0 + j * d / 4, a[k] - 12, d / 4, c === 0 ? 0.10 : 0.06, 'klavsen']); });
          // kanon: ses v, c-v'nci melodiyi çalar
          for (var v = 0; v < 3; v++) {
            var mi = c - 1 - v;
            if (mi < 0) continue;
            var mel = M[mi % M.length][i];
            var sd = d / mel.length;
            mel.forEach(function (n, j) { olay.push([t0 + j * sd, n + (v === 2 ? -12 : 0), sd, 0.12 - v * 0.02, 'klavsen']); });
          }
        }
      }
      return { vurus: 0.52, olay: olay, uzunluk: dongu * 8 * d };
    },
    dogumgunu: function () {
      // 3/4, sol majör; [vuruş, midi, süre]
      var mel = [[0, 74, 0.75], [0.75, 74, 0.25], [1, 76, 1], [2, 74, 1], [3, 79, 1], [4, 78, 2],
        [6, 74, 0.75], [6.75, 74, 0.25], [7, 76, 1], [8, 74, 1], [9, 81, 1], [10, 79, 2],
        [12, 74, 0.75], [12.75, 74, 0.25], [13, 86, 1], [14, 83, 1], [15, 79, 1], [16, 78, 1], [17, 76, 1],
        [18, 84, 0.75], [18.75, 84, 0.25], [19, 83, 1], [20, 79, 1], [21, 81, 1], [22, 79, 2]];
      var akorlar = [[1, 43], [4, 50], [7, 50], [10, 43], [13, 43], [16, 48], [19, 43], [21, 50], [22, 43]];
      var olay = [];
      var tur = 3;
      var boy = 24;
      for (var r = 0; r < tur; r++) {
        var o = r * boy;
        var ok = r === 1 ? 12 : 0;              // ikinci turda bir oktav yukarı, çan gibi
        mel.forEach(function (n) { olay.push([o + n[0], n[1] + ok, n[2], r === 1 ? 0.16 : 0.2, 'kutu']); });
        akorlar.forEach(function (a) {
          olay.push([o + a[0], a[1], 3, 0.16, 'bas']);
          [0, 1, 2].forEach(function (j) { olay.push([o + a[0] + j, a[1] + 24 + [0, 7, 12][j], 0.9, 0.06, 'kutu']); });
        });
      }
      return { vurus: 0.42, olay: olay, uzunluk: tur * boy };
    }
  };

  Muzik.prototype.baslat = function () {
    if (this.ayar.kaynak) return this._dosya(true);
    if (!this._kur()) return false;
    var c = this.ctx;
    if (c.state === 'suspended') c.resume();
    this.acik = true;
    this.ana.gain.cancelScheduledValues(c.currentTime);
    this.ana.gain.setValueAtTime(this.ana.gain.value, c.currentTime);
    this.ana.gain.linearRampToValueAtTime(this.ayar.ses != null ? this.ayar.ses : 0.8, c.currentTime + 2.5);
    if (!this.plan) {
      this.plan = (PARCALAR[this.parca] || PARCALAR.kanon)();
      this.basZaman = c.currentTime + 0.15;
      this.sira = 0;
      this.tur = 0;
      var self = this;
      this.zamanlayici = setInterval(function () { self._planla(); }, 60);
      this._planla();
    }
    return true;
  };

  Muzik.prototype._planla = function (ileriSn) {
    var c = this.ctx, p = this.plan, ileri = c.currentTime + (ileriSn || 0.35);
    while (true) {
      if (this.sira >= p.olay.length) {
        this.sira = 0;
        this.tur++;
      }
      var o = p.olay[this.sira];
      var t = this.basZaman + (this.tur * p.uzunluk + o[0]) * p.vurus;
      if (t > ileri) break;
      if (t > c.currentTime - 0.05) {
        var sure = o[2] * p.vurus;
        if (o[4] === 'klavsen') this._klavsen(t, o[1], sure, o[3]);
        else if (o[4] === 'kutu') this._kutu(t, o[1], o[3], 1.2);
        else this._bas(t, o[1], sure, o[3]);
      }
      this.sira++;
    }
  };

  Muzik.prototype.durdur = function () {
    if (this.ayar.kaynak) return this._dosya(false);
    if (!this.ctx) return false;
    var c = this.ctx;
    this.acik = false;
    this.ana.gain.cancelScheduledValues(c.currentTime);
    this.ana.gain.setValueAtTime(this.ana.gain.value, c.currentTime);
    this.ana.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
    return false;
  };

  Muzik.prototype.degistir = function () { return this.acik ? this.durdur() : this.baslat(); };

  Muzik.prototype._dosya = function (ac) {
    if (!this.ses) {
      this.ses = new Audio(this.ayar.kaynak);
      this.ses.loop = true;
      this.ses.preload = 'auto';
      this.ses.volume = 0;
    }
    var a = this.ses, self = this;
    clearInterval(this._fade);
    if (ac) {
      this.acik = true;
      var p = a.play();
      if (p && p.catch) p.catch(function () { self.acik = false; });
      this._fade = setInterval(function () {
        a.volume = Math.min(self.ayar.ses != null ? self.ayar.ses : 0.8, a.volume + 0.04);
        if (a.volume >= 0.79) clearInterval(self._fade);
      }, 80);
      return true;
    }
    this.acik = false;
    this._fade = setInterval(function () {
      a.volume = Math.max(0, a.volume - 0.08);
      if (a.volume <= 0) { clearInterval(self._fade); a.pause(); }
    }, 50);
    return false;
  };

  /* ---- efektler */
  Muzik.prototype._gurultu = function (sn) {
    var c = this.ctx, n = Math.floor(c.sampleRate * sn);
    var b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = c.createBufferSource();
    s.buffer = b;
    return s;
  };

  Muzik.prototype.efekt = function (ad) {
    if (this.ayar.efekt === false) return;
    if (!this._kur()) return;
    var c = this.ctx, t = c.currentTime + 0.01, cik = this.efektKazanc;
    if (c.state === 'suspended') c.resume();
    var g, f, s, o;
    if (ad === 'kirilma') {
      s = this._gurultu(0.25);
      f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.9;
      g = c.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      s.connect(f); f.connect(g); g.connect(cik); s.start(t); s.stop(t + 0.25);
      o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
      var g2 = c.createGain(); g2.gain.setValueAtTime(0.7, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g2); g2.connect(cik); o.start(t); o.stop(t + 0.25);
    } else if (ad === 'kagit') {
      s = this._gurultu(0.9);
      f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.55);
      g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      s.connect(f); f.connect(g); g.connect(cik); s.start(t); s.stop(t + 0.9);
    } else if (ad === 'vuus') {
      s = this._gurultu(1.6);
      f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(5200, t + 1.0);
      f.frequency.exponentialRampToValueAtTime(400, t + 1.5);
      g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.55);
      s.connect(f); f.connect(g); g.connect(cik); s.start(t); s.stop(t + 1.6);
      var self = this;
      [81, 86, 88, 93].forEach(function (m, i) { self._kutuEfekt(t + 0.7 + i * 0.09, m, 0.12); });
    } else if (ad === 'damga') {
      o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      g = c.createGain(); g.gain.setValueAtTime(1.0, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(cik); o.start(t); o.stop(t + 0.32);
      s = this._gurultu(0.08);
      var g3 = c.createGain(); g3.gain.setValueAtTime(0.3, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      s.connect(g3); g3.connect(cik); s.start(t);
    } else if (ad === 'parilti') {
      var self2 = this;
      [88, 91, 95, 100].forEach(function (m, i) { self2._kutuEfekt(t + i * 0.07, m, 0.1); });
    } else if (ad === 'can') {
      var self3 = this;
      [62, 69, 74].forEach(function (m, i) { self3._kutuEfekt(t + i * 0.02, m, 0.22, 3.5); });
    } else if (ad === 'ufle') {
      s = this._gurultu(0.7);
      f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
      g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      s.connect(f); f.connect(g); g.connect(cik); s.start(t); s.stop(t + 0.7);
    }
  };

  Muzik.prototype._kutuEfekt = function (t, m, guc, uzun) {
    var eski = this.hat;
    this.hat = this.efektKazanc;
    this._kutu(t, m, guc, uzun || 1);
    this.hat = eski;
  };

  D.Muzik = Muzik;
})(window.Davetiye = window.Davetiye || {});
