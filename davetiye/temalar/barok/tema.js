/*!
 * Barok tema — (ilk iskelet: zarf testi için)
 */
(function (D) {
  'use strict';
  var U = D.yardimci;

  D.temaKaydet('barok', {
    gorselYolu: 'temalar/barok/gorsel/',
    muzik: 'kanon',
    fontlar: ['1em "Pinyon Script"', '600 1em Cinzel', '1em "Cormorant Garamond"'],

    kart: function (cfg) {
      var t = cfg._t;
      return '<div class="kart-yuz">' +
        '<div class="kart-ic">' +
        '<div class="kart-ust">' + U.kacis(U.buyuk(cfg.metin.kartUst || 'Davetlisiniz')) + '</div>' +
        '<div class="kart-isim">' + U.kacis(cfg.gelin.ad) + '<span>&amp;</span>' + U.kacis(cfg.damat.ad) + '</div>' +
        (t ? '<div class="kart-tarih">' + t.gun + ' · ' + t.ayNo + ' · ' + t.yil + '</div>' : '') +
        '</div></div>';
    },

    hikaye: function (cfg) {
      return '<section class="sahne sahne-deneme" data-boy="2"><div class="sahne-sabit"><h1>' +
        U.kacis(cfg.gelin.ad) + ' &amp; ' + U.kacis(cfg.damat.ad) + '</h1></div></section>' +
        '<section class="sahne" style="height:150vh"></section>';
    },

    sahneler: function (cfg, D, ana) {
      var s = ana.querySelector('.sahne-deneme');
      var h = s.querySelector('h1');
      D.sahne.kaydet(s, function (p) {
        h.style.transform = 'scale(' + (1 + p * 2) + ')';
        h.style.opacity = 1 - p;
      });
    }
  });
})(window.Davetiye);
