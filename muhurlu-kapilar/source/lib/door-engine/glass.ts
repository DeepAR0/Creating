import * as THREE from 'three';
import type { GlassFeature } from './surface';

/* Buğulu cam (Kış Bahçesi). Camın ardındaki sahne iki hâlde boyanır:
   net ve buğulu. Konuğun parmağı küçük bir silme maskesine çizer;
   gölgelendirici iki hâli bu maskeyle karıştırır. Silinen yerlerin
   kenarından damlalar süzülür ve geçtikleri yolu açar. */

const vertex = /* glsl */ `
varying vec2 vDoorUv;
void main() {
  vDoorUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragment = /* glsl */ `
uniform sampler2D tInterior;
uniform sampler2D tSoft;
uniform sampler2D tDrops;
uniform sampler2D tWipe;
uniform float uFog;
uniform float uFade;
uniform float uGlow;
uniform vec3 uFogTint;
uniform vec3 uLight;
varying vec2 vDoorUv;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);
}
void main() {
  float wipe = texture2D(tWipe, vDoorUv).r;
  vec4 drop = texture2D(tDrops, vDoorUv);
  // Buğu düzensizdir: altta yoğun, üstte ince, yer yer lekeli.
  float patchy = vnoise(vDoorUv * vec2(7.0, 14.0)) * 0.6 + vnoise(vDoorUv * vec2(23.0, 41.0)) * 0.4;
  float density = clamp(0.72 + 0.28 * (1.0 - vDoorUv.y) + (patchy - 0.5) * 0.35, 0.0, 1.0);
  float fog = (1.0 - wipe) * uFog * density;
  vec2 bend = (drop.rg - 0.5) * 0.045 * drop.a;
  // Silinen cam, buğudan karanlık görünmesin: net sahne biraz aydınlatılır.
  vec3 sharp = texture2D(tInterior, vDoorUv + bend * (0.4 + fog)).rgb * 1.35;
  vec3 soft = texture2D(tSoft, vDoorUv + bend * 1.8).rgb;
  // Buğu bir dağıtıcıdır: dışarıdan gelen serin ışık + içeriden süzülen sıcak ışık.
  vec3 misted = uFogTint * (0.14 + 0.08 * patchy) + soft * 1.3;
  vec3 color = mix(sharp, misted, fog);
  // Buğunun içindeki damlalar ışığı yakalar.
  color += uFogTint * 0.22 * drop.a * drop.b * fog;
  // Silinen yolun kenarı biraz sütlü kalır.
  float rim = smoothstep(0.08, 0.45, wipe) * (1.0 - smoothstep(0.45, 0.9, wipe));
  color = mix(color, misted, rim * 0.4 * uFog);
  // Kapı açılırken içeriden taşan ışık.
  color += uLight * uGlow;
  gl_FragColor = vec4(color, 1.0 - uFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function colorTexture(source: TexImageSource) {
  const t = new THREE.CanvasTexture(source as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

type Drip = { x: number; y: number; vy: number; r: number; life: number };

export function buildGlass(feature: GlassFeature, aspect: number, light: string) {
  const mw = 220;
  const mh = Math.max(64, Math.round(mw / aspect));
  const mask = document.createElement('canvas');
  mask.width = mw;
  mask.height = mh;
  const ctx = mask.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, mw, mh);
  const wipeTexture = new THREE.CanvasTexture(mask);
  const interior = colorTexture(feature.interior);
  const soft = colorTexture(feature.interiorSoft);
  const drops = new THREE.CanvasTexture(feature.drops as HTMLCanvasElement);
  drops.wrapS = drops.wrapT = THREE.ClampToEdgeWrapping;
  const uniforms = {
    tInterior: { value: interior },
    tSoft: { value: soft },
    tDrops: { value: drops },
    tWipe: { value: wipeTexture },
    uFog: { value: 1 },
    uFade: { value: 0 },
    uGlow: { value: 0 },
    uFogTint: { value: new THREE.Color('#dfe4e8') },
    uLight: { value: new THREE.Color(light) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
  });

  const probe = document.createElement('canvas');
  probe.width = feature.pane.width;
  probe.height = feature.pane.height;
  const probeCtx = probe.getContext('2d', { willReadFrequently: true })!;
  let paneTotal = 0;
  for (const v of feature.pane.data) if (v > 0.5) paneTotal++;

  const drips: Drip[] = [];
  let last: { x: number; y: number } | null = null;
  let dirty = false;
  let cleared = 0;

  function stamp(x: number, y: number, radius: number, strength: number) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(255,255,255,${strength})`);
    g.addColorStop(0.55, `rgba(255,255,255,${strength * 0.8})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function measure() {
    probeCtx.clearRect(0, 0, probe.width, probe.height);
    probeCtx.drawImage(mask, 0, 0, probe.width, probe.height);
    const data = probeCtx.getImageData(0, 0, probe.width, probe.height).data;
    let open = 0;
    for (let i = 0; i < feature.pane.data.length; i++)
      if (feature.pane.data[i] > 0.5 && data[i * 4] > 120) open++;
    cleared = paneTotal ? open / paneTotal : 1;
    return cleared;
  }

  return {
    material,
    uniforms,
    /** Parmağın geçtiği yer (kapı UV'si, v yukarı). `end` çizgiyi bitirir. */
    wipe(u: number, v: number, end = false) {
      if (end) {
        last = null;
        return cleared;
      }
      const x = u * mw;
      const y = (1 - v) * mh;
      const radius = mw * 0.1;
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (radius * 0.3)));
        for (let i = 1; i <= steps; i++) stamp(last.x + (dx * i) / steps, last.y + (dy * i) / steps, radius, 0.5);
      } else stamp(x, y, radius, 0.55);
      // Silinen yolun alt kenarından ara sıra bir damla süzülür.
      if (Math.random() < 0.16 && drips.length < 20)
        drips.push({
          x: x + (Math.random() - 0.5) * radius * 1.4,
          y: y + radius * (0.55 + Math.random() * 0.3),
          vy: mh * (0.04 + Math.random() * 0.08),
          r: 0.7 + Math.random() * 1.1,
          life: 1 + Math.random() * 1.8,
        });
      last = { x, y };
      dirty = true;
      return measure();
    },
    /** Damlaları ilerletir; dokunun güncellenmesi gerekiyorsa true. */
    update(dt: number) {
      if (drips.length) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = drips.length - 1; i >= 0; i--) {
          const d = drips[i];
          const step = d.vy * dt;
          ctx.beginPath();
          ctx.ellipse(d.x, d.y, d.r, d.r + step * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          d.y += step;
          d.x += (Math.random() - 0.5) * 0.4;
          d.vy *= 0.994;
          d.life -= dt;
          if (d.life <= 0 || d.y > mh) drips.splice(i, 1);
        }
        dirty = true;
      }
      if (dirty) {
        wipeTexture.needsUpdate = true;
        dirty = false;
        return true;
      }
      return false;
    },
    get progress() {
      return cleared;
    },
    dispose() {
      material.dispose();
      [wipeTexture, interior, soft, drops].forEach((t) => t.dispose());
    },
  };
}

export type Glass = ReturnType<typeof buildGlass>;
