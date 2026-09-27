/*!
 * Davetiye — Zarf bileşeni
 * Tam ekran dikey, kabartmalı zarf. WebGL ile yükseklik haritasından normal
 * hesaplanır; ışık parmağı / telefon eğimini takip eder, yaldızlar parlar.
 * Mühre dokununca: mühür kırılır, kapak 3B açılır, kart çıkar ve kameranın
 * kartın içine dalmasıyla hikâye başlar.
 */
(function (D) {
  'use strict';
  var U = D.yardimci;

  /* ------------------------------------------------------------ GLSL */
  var VS = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){ vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  // Python tarafındaki susleme.shade() ile aynı ışık modeli (pişmiş yedek görselle tutarlı).
  var FS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uPA; uniform sampler2D uPD; uniform sampler2D uFA; uniform sampler2D uFD;',
    'uniform vec2 uSize;',        // zarf piksel boyutu (1080, 2160)
    'uniform float uFlapFrac;',   // kapak yüksekliği / zarf yüksekliği
    'uniform vec3 uLight;',       // ışık konumu (zarf pikseli)
    'uniform vec3 uLightCol;',
    'uniform float uHP; uniform float uHF;',   // yükseklik ölçekleri (px)
    'uniform float uMode;',       // 0: kapalı zarf, 1: yalnız cep, 2: yalnız kapak
    'uniform float uFlapCos;',    // kapak açıldıkça gölge kısalır
    'uniform vec2 uPx;',          // bir ekran pikselinin zarf pikseli karşılığı
    'uniform float uTime;',
    'uniform float uGlint;',      // yaldız parıltı dalgası (0..1)
    'uniform float uCam;',        // mat bölgeler (fresk / vitray) arkadan aydınlatılmış cam gibi parlasın mı (0..1)
    '',
    'float hP(vec2 uv){ return texture2D(uPD, uv).r; }',
    'float hF(vec2 uv){ return texture2D(uFD, vec2(uv.x, uv.y / uFlapFrac)).r; }',
    'float aF(vec2 uv){ return uv.y < uFlapFrac ? texture2D(uFA, vec2(uv.x, uv.y / uFlapFrac)).a : 0.0; }',
    '',
    'vec3 nP(vec2 uv){',
    '  vec2 e = max(uPx, vec2(1.0)) / uSize;',
    '  float l = hP(uv - vec2(e.x, 0.0)); float r = hP(uv + vec2(e.x, 0.0));',
    '  float t = hP(uv - vec2(0.0, e.y)); float b = hP(uv + vec2(0.0, e.y));',
    '  vec2 g = vec2(r - l, b - t) * uHP / (2.0 * e * uSize);',
    '  return normalize(vec3(-g, 1.0));',
    '}',
    'vec3 nF(vec2 uv){',
    '  vec2 e = max(uPx, vec2(1.0)) / uSize;',
    '  float l = hF(uv - vec2(e.x, 0.0)); float r = hF(uv + vec2(e.x, 0.0));',
    '  float t = hF(uv - vec2(0.0, e.y)); float b = hF(uv + vec2(0.0, e.y));',
    '  vec2 g = vec2(r - l, b - t) * uHF / (2.0 * e * uSize);',
    '  return normalize(vec3(-g, 1.0));',
    '}',
    '',
    'vec3 shade(vec3 alb, float metal, float matte, vec3 N, vec3 P){',
    '  vec3 L = normalize(uLight - P);',
    '  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));',
    '  float ndl = max(dot(N, L), 0.0);',
    '  float ndh = max(dot(N, H), 0.0);',
    '  float amb = 0.42;',
    '  vec3 paper = alb * (amb + (1.0 - amb) * 1.15 * ndl) * uLightCol + pow(ndh, 26.0) * 0.10 * uLightCol;',
    '  vec3 mat = alb * (0.62 + 0.45 * ndl) * uLightCol;',
    // vitray: arkadan gelen ışık; ışık yaklaştıkça cam daha çok parlar ve hafifçe titreşir
    '  float yakin = exp(-dot(uLight.xy - P.xy, uLight.xy - P.xy) / (uSize.x * uSize.x * 0.35));',
    '  float titres = 0.92 + 0.08 * sin(uTime * 2.3 + P.x * 0.05) * sin(uTime * 1.7 + P.y * 0.04);',
    '  vec3 cam = alb * (1.05 + 0.55 * yakin) * titres + alb * alb * 0.35 * yakin;',
    '  mat = mix(mat, cam, uCam);',
    '  paper = mix(paper, mat, matte);',
    '  float Rz = 2.0 * N.z * N.z - 1.0;',
    '  vec2 Rxy = 2.0 * N.z * N.xy;',
    '  vec2 Lxy = normalize(L.xy + vec2(1e-5));',
    '  float tw = dot(Rxy, Lxy);',
    '  float env = 0.30 + 0.38 * max(Rz, 0.0) + 0.40 * max(tw, 0.0) - 0.25 * max(-tw, 0.0);',
    '  float spec = pow(ndh, 70.0) * 1.6 + pow(ndh, 14.0) * 0.35;',
    // yaldız üzerinde gezinen ince parıltı dalgası
    '  float wave = uGlint * smoothstep(0.93, 1.0, sin((P.x + P.y) * 0.004 - uTime * 1.3) * 0.5 + 0.5);',
    '  vec3 met = alb * (0.10 + 0.55 * ndl + env * 0.75) + (spec + wave * 0.55) * vec3(1.0, 0.92, 0.72);',
    '  return mix(paper, met, metal);',
    '}',
    '',
    'void main(){',
    '  vec2 uv = vUv;',
    '  vec3 P = vec3(uv * uSize, 0.0);',
    '  vec3 col = vec3(0.0); float a = 0.0;',
    '  vec3 L = normalize(uLight - P);',
    '  if (uMode < 1.5) {',
    '    vec4 pa = texture2D(uPA, uv); vec4 pd = texture2D(uPD, uv);',
    '    col = shade(pa.rgb, pd.g, pd.b, nP(uv), P + vec3(0.0, 0.0, pd.r * uHP));',
    '    a = pa.a;',
    // kapağın cebe düşen gölgesi (açıldıkça menteşeye doğru kısalır)
    '    if (uFlapCos > 0.001) {',
    '      float el = 7.0 + (1.0 - uFlapCos) * 60.0;',
    '      vec2 off = -L.xy / max(L.z, 0.25) * el / uSize;',
    '      vec2 su = uv - off; su.y = su.y / uFlapCos;',
    '      vec2 bl = (3.0 + (1.0 - uFlapCos) * 14.0) / uSize;',
    '      float s = aF(su) * 0.4 + (aF(su + vec2(bl.x, 0.0)) + aF(su - vec2(bl.x, 0.0)) + aF(su + vec2(0.0, bl.y)) + aF(su - vec2(0.0, bl.y))) * 0.15;',
    '      col *= 1.0 - 0.42 * s * uFlapCos;',
    '    }',
    '  }',
    '  if (uMode != 1.0 && uv.y < uFlapFrac) {',
    '    vec2 fu = vec2(uv.x, uv.y / uFlapFrac);',
    '    vec4 fa = texture2D(uFA, fu);',
    '    if (fa.a > 0.001) {',
    '      vec4 fd = texture2D(uFD, fu);',
    '      vec3 fc = shade(fa.rgb, fd.g, 0.0, nF(uv), P + vec3(0.0, 0.0, fd.r * uHF + 4.0));',
    // kağıt kalınlığı: ışığa bakan kesik kenar parlar
    '      vec2 e = 1.5 / uSize;',
    '      vec2 ga = vec2(aF(uv + vec2(e.x, 0.0)) - aF(uv - vec2(e.x, 0.0)), aF(uv + vec2(0.0, e.y)) - aF(uv - vec2(0.0, e.y)));',
    '      float edge = clamp(length(ga) * 1.2, 0.0, 1.0);',
    '      float facing = dot(normalize(-ga + vec2(1e-5)), normalize(L.xy + vec2(1e-5)));',
    '      fc = mix(fc, fc * (1.0 + 0.35 * facing) + vec3(0.08) * max(facing, 0.0), edge * 0.6);',
    '      if (uMode > 1.5) { col = fc; a = fa.a; }',
    '      else { col = mix(col, fc, fa.a); a = max(a, fa.a); }',
    '    }',
    '  }',
    '  gl_FragColor = vec4(col * a, a);',
    '}'
  ].join('\n');

  function glCreate(canvas) {
    var opts = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false };
    var gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ['uPA', 'uPD', 'uFA', 'uFD', 'uSize', 'uFlapFrac', 'uLight', 'uLightCol', 'uHP', 'uHF', 'uMode',
      'uFlapCos', 'uPx', 'uTime', 'uGlint', 'uCam'].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return { gl: gl, u: u };
  }

  function glTexture(gl, unit, img, isData) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, isData ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /* ------------------------------------------------------------ Zarf */
  function Zarf(opts) {
    this.o = opts;               // {tema, cfg, kok, kartHTML, sesler}
    this.m = null;               // zarf.json
    this.acik = false;
    this.isik = { x: 0, y: 0, z: 0, hx: 0, hy: 0 };
    this.hedefIsik = null;
    this.sonEtkilesim = 0;
    this.t0 = performance.now();
    this.glint = 0;
  }

  Zarf.prototype.kur = function () {
    var self = this;
    var o = this.o;
    var yol = o.tema.gorselYolu;
    return U.json(yol + 'zarf.json').then(function (m) {
      self.m = m;
      self.dom();
      var temel = ['zarf-cep.webp', 'zarf-cep-veri.webp', 'zarf-kapak.webp', 'zarf-kapak-veri.webp', 'muhur.webp'];
      return Promise.all(temel.map(function (f, i) {
        return U.resim(yol + f).then(function (img) { if (o.ilerleme) o.ilerleme((i + 1) / temel.length); return img; });
      }));
    }).then(function (imgs) {
      self.imgs = imgs;
      self.muhurImg.src = imgs[4].src;
      var ok = false;
      try { ok = self.glKur(imgs); } catch (e) { console.warn('WebGL zarf kurulamadı:', e); ok = false; }
      if (!ok) self.yedekKur();
      // açılışta gerekenler arka planda
      self.astarImg.src = yol + 'zarf-astar.webp';
      self.kapakArka.src = yol + 'zarf-kapak-arka.webp';
      self.olcekle();
      self.etkilesim();
      self.dongu();
      return self;
    });
  };

  Zarf.prototype.dom = function () {
    var o = this.o, cfg = o.cfg, m = this.m, self = this;
    var kok = U.el('div', 'zarf-sahne');
    kok.innerHTML =
      '<canvas class="zarf-toz" aria-hidden="true"></canvas>' +
      '<div class="zarf-ust-yazi" aria-hidden="true"></div>' +
      '<div class="zarf-kamera">' +
      '  <div class="zarf-kutu">' +
      '    <div class="zarf-golge"></div>' +
      '    <div class="zarf-ic"><img alt="" class="zarf-astar"></div>' +
      '    <div class="zarf-kart"></div>' +
      '    <canvas class="zarf-gl" aria-hidden="true"></canvas>' +
      '    <img class="zarf-yedek" alt="" hidden>' +
      '    <div class="zarf-kapak" hidden><canvas class="zarf-kapak-on"></canvas><img alt="" class="zarf-kapak-arka"></div>' +
      '    <div class="zarf-isim"><span class="zarf-isim-ust"></span><span class="zarf-isim-ad"></span></div>' +
      '    <button class="zarf-muhur" type="button" aria-label="Davetiyeyi açmak için mührü kırın">' +
      '      <span class="muhur-parca muhur-sol"><img alt=""><span class="muhur-harf"></span></span>' +
      '      <span class="muhur-parca muhur-sag"><img alt=""><span class="muhur-harf"></span></span>' +
      '      <span class="muhur-parilti"></span>' +
      '    </button>' +
      '    <span class="muhur-halka" aria-hidden="true"></span>' +
      '  </div>' +
      '</div>' +
      '<div class="zarf-ipucu"><span class="ipucu-parmak" aria-hidden="true"></span><span class="ipucu-yazi"></span></div>' +
      '<div class="zarf-flas" aria-hidden="true"></div>';
    this.kok = kok;
    this.kamera = kok.querySelector('.zarf-kamera');
    this.kutu = kok.querySelector('.zarf-kutu');
    this.canvas = kok.querySelector('.zarf-gl');
    this.yedek = kok.querySelector('.zarf-yedek');
    this.kapak = kok.querySelector('.zarf-kapak');
    this.kapakOn = kok.querySelector('.zarf-kapak-on');
    this.kapakArka = kok.querySelector('.zarf-kapak-arka');
    this.astarImg = kok.querySelector('.zarf-astar');
    this.kart = kok.querySelector('.zarf-kart');
    this.muhur = kok.querySelector('.zarf-muhur');
    this.muhurImg = { set src(v) { kok.querySelectorAll('.muhur-parca img').forEach(function (i) { i.src = v; }); } };
    this.flas = kok.querySelector('.zarf-flas');
    this.toz = kok.querySelector('.zarf-toz');

    // yerleşim: zarf pikselinden yüzdeye
    var W = m.w, H = m.h;
    var pct = function (v, t) { return (v / t * 100).toFixed(4) + '%'; };
    this.kapak.style.height = pct(m.kapakH, H);
    this.kutu.querySelector('.zarf-ic').style.height = pct(900, H);
    var ms = m.muhur;
    this.muhur.style.left = pct(ms.x - ms.boyut / 2, W);
    this.muhur.style.top = pct(ms.y - ms.boyut / 2, H);
    this.muhur.style.width = pct(ms.boyut, W);
    this.muhur.style.height = pct(ms.boyut, H);
    var halka = kok.querySelector('.muhur-halka');
    halka.style.left = pct(ms.x, W);
    halka.style.top = pct(ms.y, H);
    halka.style.width = pct(ms.disk * 2.5, W);
    var kd = m.kurdele;
    var isim = kok.querySelector('.zarf-isim');
    isim.style.left = pct(kd.x - kd.w / 2, W);
    isim.style.top = pct(kd.y - kd.h / 2, H);
    isim.style.width = pct(kd.w, W);
    isim.style.height = pct(kd.h, H);

    // metinler
    var harf = cfg.monogram || '';
    kok.querySelectorAll('.muhur-harf').forEach(function (s) { s.textContent = harf; });
    var misafir = cfg._misafir;
    kok.querySelector('.zarf-isim-ust').textContent = misafir ? (cfg.metin.sayin || 'Sayın') : '';
    kok.querySelector('.zarf-isim-ad').textContent = misafir || (cfg.metin.degerliMisafir || 'Değerli Misafirimiz');
    kok.querySelector('.ipucu-yazi').textContent = cfg.metin.muhurIpucu || 'Açmak için mührü kırın';
    kok.querySelector('.zarf-ust-yazi').textContent = cfg.metin.zarfUst || '';
    if (o.kartHTML) this.kart.innerHTML = o.kartHTML;

    // mühür kırık çizgisi: zikzak çokgen (iki yarım tamamlayıcı)
    var pts = [];
    var n = 7;
    for (var i = 0; i <= n; i++) {
      var y = i / n * 100;
      var x = 50 + (i === 0 || i === n ? 0 : (Math.random() - 0.5) * 16);
      pts.push([x, y]);
    }
    var sol = 'polygon(0% 0%, ' + pts.map(function (p) { return p[0].toFixed(1) + '% ' + p[1].toFixed(1) + '%'; }).join(', ') + ', 0% 100%)';
    var sag = 'polygon(100% 0%, ' + pts.map(function (p) { return p[0].toFixed(1) + '% ' + p[1].toFixed(1) + '%'; }).join(', ') + ', 100% 100%)';
    kok.querySelector('.muhur-sol').style.clipPath = sol;
    kok.querySelector('.muhur-sol').style.webkitClipPath = sol;
    kok.querySelector('.muhur-sag').style.clipPath = sag;
    kok.querySelector('.muhur-sag').style.webkitClipPath = sag;

    this.muhur.addEventListener('click', function () { self.ac(); });
    (o.kok || document.body).appendChild(kok);
  };

  Zarf.prototype.glKur = function (imgs) {
    var r = glCreate(this.canvas);
    if (!r) return false;
    this.g = r;
    var gl = r.gl, u = r.u, m = this.m;
    glTexture(gl, 0, imgs[0], false);
    glTexture(gl, 1, imgs[1], true);
    glTexture(gl, 2, imgs[2], false);
    glTexture(gl, 3, imgs[3], true);
    gl.uniform1i(u.uPA, 0); gl.uniform1i(u.uPD, 1); gl.uniform1i(u.uFA, 2); gl.uniform1i(u.uFD, 3);
    gl.uniform2f(u.uSize, m.w, m.h);
    gl.uniform1f(u.uFlapFrac, m.kapakH / m.h);
    gl.uniform1f(u.uHP, m.yukseklik.cep);
    gl.uniform1f(u.uHF, m.yukseklik.kapak);
    gl.uniform3f(u.uLightCol, 1.0, 0.95, 0.86);
    gl.uniform1f(u.uFlapCos, 1.0);
    gl.uniform1f(u.uMode, 0);
    gl.uniform1f(u.uCam, m.camIsiltisi || 0);
    gl.clearColor(0, 0, 0, 0);
    var k = m.kanonikIsik;
    this.isik.x = k[0]; this.isik.y = k[1]; this.isik.z = k[2];
    this.mod = 0;
    this.flapCos = 1;
    return true;
  };

  Zarf.prototype.yedekKur = function () {
    this.g = null;
    this.canvas.hidden = true;
    this.yedek.hidden = false;
    this.yedek.src = this.o.tema.gorselYolu + 'zarf-pisik.webp';
    this.kok.classList.add('zarf-yedekli');
  };

  Zarf.prototype.olcekle = function () {
    // zarfı ekrana sığdır (en-boy 1:2), küçük kenar boşluğu bırak
    var vw = window.innerWidth, vh = window.innerHeight;
    var oran = this.m.w / this.m.h;
    var pay = vw < 700 ? 0.94 : 0.86;
    var w = Math.min(vw * pay, vh * pay * oran);
    var h = w / oran;
    this.kutu.style.width = w + 'px';
    this.kutu.style.height = h + 'px';
    this.cssW = w; this.cssH = h;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.g) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.g.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.g.gl.uniform2f(this.g.u.uPx, this.m.w / this.canvas.width, this.m.h / this.canvas.height);
      this.kapakOn.width = this.canvas.width;
      this.kapakOn.height = Math.round(this.canvas.height * this.m.kapakH / this.m.h);
    }
    this.kok.style.setProperty('--zarf-w', w + 'px');
    this.kok.style.setProperty('--zarf-h', h + 'px');
    this.tozBoyut();
  };

  Zarf.prototype.ciz = function (mod) {
    if (!this.g) return;
    var gl = this.g.gl, u = this.g.u;
    var t = (performance.now() - this.t0) / 1000;
    gl.uniform3f(u.uLight, this.isik.x, this.isik.y, this.isik.z);
    gl.uniform1f(u.uMode, mod);
    gl.uniform1f(u.uFlapCos, this.flapCos);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uGlint, this.glint);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  Zarf.prototype.etkilesim = function () {
    var self = this;
    var kutu = this.kutu;
    function isikHedef(cx, cy) {
      var r = kutu.getBoundingClientRect();
      var x = (cx - r.left) / r.width * self.m.w;
      var y = (cy - r.top) / r.height * self.m.h;
      self.hedefIsik = { x: x, y: y - self.m.h * 0.08 };
      self.sonEtkilesim = performance.now();
    }
    this.kok.addEventListener('pointermove', function (e) { isikHedef(e.clientX, e.clientY); }, { passive: true });
    this.kok.addEventListener('pointerdown', function (e) { isikHedef(e.clientX, e.clientY); }, { passive: true });
    this._yon = function (e) {
      if (e.gamma == null) return;
      var gx = U.kisit(e.gamma / 30, -1, 1), gy = U.kisit((e.beta - 45) / 30, -1, 1);
      self.hedefIsik = { x: self.m.w * (0.5 + gx * 0.7), y: self.m.h * (0.3 + gy * 0.45) };
      self.sonEtkilesim = performance.now();
    };
    window.addEventListener('deviceorientation', this._yon, { passive: true });
    this._boyut = function () { self.olcekle(); };
    window.addEventListener('resize', this._boyut);
  };

  Zarf.prototype.dongu = function () {
    var self = this;
    var son = performance.now();
    function kare(now) {
      if (self.bitti) return;
      var dt = Math.min(0.05, (now - son) / 1000);
      son = now;
      var t = (now - self.t0) / 1000;
      var m = self.m;
      if (!self.acik) {
        // boşta: ışık zarfın üstünde yavaş Lissajous çizer; dokunuş varsa onu izler
        var bos = now - self.sonEtkilesim > 2600 || !self.hedefIsik;
        var hx = bos ? m.w * (0.5 + 0.62 * Math.sin(t * 0.37)) : self.hedefIsik.x;
        var hy = bos ? m.h * (0.30 + 0.24 * Math.sin(t * 0.23 + 1.3)) : self.hedefIsik.y;
        var k = 1 - Math.exp(-dt * (bos ? 1.6 : 7));
        self.isik.x += (hx - self.isik.x) * k;
        self.isik.y += (hy - self.isik.y) * k;
        self.isik.z = m.w * 0.95;
        self.glint = 0.6 + 0.4 * Math.sin(t * 0.8);
      }
      if (self.kamera3b) self.kamera3b(t);
      self.ciz(self.mod);
      self.muhurParilti();
      self.tozCiz(dt, t);
      self.raf = requestAnimationFrame(kare);
    }
    this.raf = requestAnimationFrame(kare);
  };

  Zarf.prototype.muhurParilti = function () {
    // mührün pişmiş ışığına, hareketli ışığa göre bir parlama ekle
    var m = this.m, ms = m.muhur;
    var dx = (this.isik.x - ms.x) / m.w, dy = (this.isik.y - ms.y) / m.w;
    var d = Math.sqrt(dx * dx + dy * dy);
    var p = this.muhur.querySelector('.muhur-parilti');
    p.style.setProperty('--px', (50 + U.kisit(dx * 60, -32, 32)) + '%');
    p.style.setProperty('--py', (50 + U.kisit(dy * 60, -32, 32)) + '%');
    p.style.opacity = (0.75 - U.kisit(d, 0, 1) * 0.55).toFixed(3);
  };

  /* ---- altın toz parçacıkları (arka plan) */
  Zarf.prototype.tozBoyut = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.toz.width = Math.round(window.innerWidth * dpr);
    this.toz.height = Math.round(window.innerHeight * dpr);
    this.tozDpr = dpr;
    if (!this.parcaciklar) {
      this.parcaciklar = [];
      for (var i = 0; i < 70; i++) {
        this.parcaciklar.push({
          x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.8,
          vx: (Math.random() - 0.5) * 0.01, vy: -0.004 - Math.random() * 0.018,
          f: Math.random() * 6.28, h: Math.random()
        });
      }
    }
  };

  Zarf.prototype.tozCiz = function (dt, t) {
    var c = this.toz, ctx = c.getContext('2d');
    var w = c.width, h = c.height, dpr = this.tozDpr;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    var hiz = this.acik ? 6 : 1;
    for (var i = 0; i < this.parcaciklar.length; i++) {
      var p = this.parcaciklar[i];
      p.x += p.vx * dt * hiz; p.y += p.vy * dt * hiz;
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05;
      var tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (1 + p.h * 2) + p.f));
      var r = p.r * dpr * (this.acik ? 1.6 : 1);
      var g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, r * 4);
      g.addColorStop(0, 'rgba(255,236,180,' + (0.85 * tw).toFixed(3) + ')');
      g.addColorStop(0.3, 'rgba(230,180,90,' + (0.35 * tw).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(200,140,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x * w - r * 4, p.y * h - r * 4, r * 8, r * 8);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ------------------------------------------------------------ açılış */
  var KART_YUKSELIS = 42;   // kartın kendi yüksekliğine göre yükselişi (%)

  Zarf.prototype.ac = function () {
    if (this.acik) return;
    this.acik = true;
    var self = this, m = this.m, o = this.o;
    var kok = this.kok;
    // giriş animasyonunun 'fill' değeri satır içi transform'u ezmesin
    this.kutu.style.animation = 'none';
    kok.classList.add('zarf-aciliyor');
    if (navigator.vibrate) try { navigator.vibrate([12, 40, 22]); } catch (e) { /* yok */ }
    if (o.acilis) o.acilis();      // müzik vb. (kullanıcı hareketi içinde)
    var az = U.azHareket();
    var k0 = { x: this.isik.x, y: this.isik.y };
    var kanon = m.kanonikIsik;
    var ses = o.ses || function () {};

    // ışık kanonik konuma kayar (pişmiş katmanlarla tutarlılık için)
    U.tween(380, function (p) {
      var e = U.kolay.icCikis3(p);
      self.isik.x = k0.x + (kanon[0] - k0.x) * e;
      self.isik.y = k0.y + (kanon[1] - k0.y) * e;
      self.glint = 0.4 * (1 - p);
    });

    // 1) mühür bastırılır ve kırılır
    this.muhur.classList.add('basildi');
    setTimeout(function () {
      ses('kirilma');
      self.muhur.classList.add('kirildi');
      self.kirintilar();
    }, 160);

    // 2) kapağı DOM katmanına aktar (aynı karede): kapak kopyası + yalnız cep
    setTimeout(function () {
      if (self.g) {
        self.ciz(2);
        var ctx = self.kapakOn.getContext('2d');
        ctx.clearRect(0, 0, self.kapakOn.width, self.kapakOn.height);
        ctx.drawImage(self.canvas, 0, 0, self.kapakOn.width, self.kapakOn.height, 0, 0, self.kapakOn.width, self.kapakOn.height);
        self.mod = 1;
        self.ciz(1);
        // tuvalin kart üzerinden geçen üst kenarı birleştirici dikişi yapmasın: cebin şekline kırp
        var b = m.bogaz, pY = function (v) { return (v / m.h * 100 - 0.25).toFixed(3) + '%'; };
        var cp = 'polygon(0% ' + pY(b[0][1]) + ', ' + (b[1][0] / m.w * 100) + '% ' + pY(b[1][1]) + ', 100% ' + pY(b[2][1]) + ', 100% 100%, 0% 100%)';
        self.canvas.style.clipPath = cp;
        self.canvas.style.webkitClipPath = cp;
      } else {
        // WebGL yok: pişmiş görselden kapak/cep ayrımı yapılamaz; kapak arka yüzü ile idare
        self.kapakOn.style.background = 'url(' + o.tema.gorselYolu + 'zarf-kapak.webp) top/100% 100%';
        self.yedek.classList.add('yedek-cep');
      }
      self.kapak.hidden = false;
    }, 360);

    var sure = az ? 0.35 : 1;
    // 3) kamera geri çekilir, kapak 3B açılır, kart yükselir
    setTimeout(function () {
      ses('kagit');
      U.tween(1400 * sure, function (p) {
        var e = U.kolay.icCikis3(p);
        self.flapCos = Math.max(0, Math.cos(e * Math.PI));
        if (e >= 0.5) self.flapCos = 0;
        self.kapak.style.transform = 'rotateX(' + (e * 184).toFixed(2) + 'deg)';
        self.kapak.classList.toggle('kapak-arkada', e > 0.5);
      });
      U.tween(1300 * sure, function (p) {
        var e = U.kolay.icCikis3(p);
        self.kutu.style.transform = 'translate3d(0,' + (e * 13).toFixed(3) + '%,0) scale(' + (1 - 0.24 * e).toFixed(4) + ')';
      });
    }, 420);

    setTimeout(function () {
      self.kart.classList.add('kart-yukseliyor');
      U.tween(1000 * sure, function (p) {
        var e = U.kolay.cikis3(p);
        self.kartY = -e * KART_YUKSELIS;
        self.kart.style.transform = 'translate3d(0,' + self.kartY.toFixed(3) + '%,0)';
      });
      self.kok.classList.add('icten-isik');
    }, 1250 * sure + 420);

    // 4) kartın içine dalış
    setTimeout(function () { self.dalis(); }, (1250 + 900) * sure + 520);
  };

  Zarf.prototype.kirintilar = function () {
    var box = this.muhur.getBoundingClientRect();
    var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    for (var i = 0; i < 16; i++) {
      var d = U.el('span', 'mum-kirinti');
      var a = Math.random() * Math.PI * 2;
      var v = 60 + Math.random() * 140;
      var s = 3 + Math.random() * 7;
      d.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;width:' + s + 'px;height:' + (s * (0.6 + Math.random() * 0.6)) + 'px;' +
        '--dx:' + (Math.cos(a) * v).toFixed(1) + 'px;--dy:' + (Math.sin(a) * v * 0.6 + 120 + Math.random() * 120).toFixed(1) + 'px;' +
        '--r:' + ((Math.random() - 0.5) * 720).toFixed(0) + 'deg;animation-delay:' + (Math.random() * 60).toFixed(0) + 'ms';
      this.kok.appendChild(d);
    }
  };

  Zarf.prototype.dalis = function () {
    var self = this, o = this.o;
    // hedef: kartın zarf ağzından görünen orta noktası (kamera kutusu koordinatında)
    var kr = this.kart.getBoundingClientRect();
    var cam = this.kamera.getBoundingClientRect();
    var hedefX = kr.left + kr.width / 2 - cam.left;
    var hedefY = kr.top + kr.height * 0.5 - cam.top;
    var merkezY = window.innerHeight / 2 - cam.top;
    var merkezX = window.innerWidth / 2 - cam.left;
    this.kamera.style.transformOrigin = hedefX.toFixed(1) + 'px ' + hedefY.toFixed(1) + 'px';
    var olcek = Math.max(window.innerWidth / kr.width, window.innerHeight / (kr.height * 0.6)) * 2.2;
    (o.ses || function () {})('vuus');
    this.kok.classList.add('zarf-dalis');
    var kutuTf = this.kutu.style.transform;
    U.tween(1500, function (p) {
      var e = U.kolay.icCikis4(p);
      var s = Math.pow(olcek, e);                       // üstel yakınlaşma: sabit hızda uçuş hissi
      var dx = (merkezX - hedefX) * U.kolay.cikis3(p);
      var dy = (merkezY - hedefY) * U.kolay.cikis3(p);
      self.kamera.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
      // cep ön yüzü kameraya daha yakın: paralaksla aşağı kayıp çıkar
      self.kutu.style.transform = kutuTf + ' translate3d(0,' + (e * e * 40).toFixed(2) + '%,0)';
      self.kart.style.transform = 'translate3d(0,' + (self.kartY - e * 10).toFixed(3) + '%,0)';
      self.kamera.style.filter = p > 0.55 ? 'blur(' + ((p - 0.55) * 22).toFixed(1) + 'px)' : '';
      if (p > 0.62 && !self._flas) { self._flas = true; self.flas.classList.add('flas-yak'); }
    }, function () {
      if (o.bitince) o.bitince();
      self.kok.classList.add('zarf-kapaniyor');
      setTimeout(function () { self.yoket(); }, 900);
    });
  };

  Zarf.prototype.yoket = function () {
    this.bitti = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('deviceorientation', this._yon);
    window.removeEventListener('resize', this._boyut);
    if (this.g) {
      var ext = this.g.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    if (this.kok.parentNode) this.kok.parentNode.removeChild(this.kok);
  };

  D.Zarf = Zarf;
})(window.Davetiye = window.Davetiye || {});
