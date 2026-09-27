import * as THREE from 'three';
import type { DoorAtmosphere } from '@/lib/door-themes';

/* Açılış atmosferi: kapı aralığından taşan ışığın içinde süzülen
   parçacıklar ve kanatların ardındaki sıcak parlama. Parçacıkların
   hareketi tamamen gölgelendiricide hesaplanır; her karede yalnızca
   zaman değişir, hiçbir tampon yeniden yüklenmez. */

const kindIndex: Record<DoorAtmosphere, number> = {
  dust: 0,
  bubbles: 1,
  snow: 2,
  pearl: 3,
};

const particleVertex = /* glsl */ `
attribute vec3 aSeed;
attribute float aScale;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uRise;
uniform vec2 uArea;
varying float vTwinkle;
varying float vHue;
void main() {
  vec3 p = position;
  float speed = 0.45 + aSeed.x * 0.7;
  float h = uArea.y;
  p.y = mod(p.y + uTime * uRise * speed + h * 0.5, h) - h * 0.5;
  float sway = uTime * (0.6 + aSeed.y * 0.8) + aSeed.z * 6.2831;
  p.x += sin(sway) * 0.16 + sin(sway * 0.37 + 1.7) * 0.1;
  p.z += cos(sway * 0.73) * 0.12;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * uPixelRatio * (9.0 / max(0.5, -mv.z));
  vTwinkle = 0.55 + 0.45 * sin(uTime * (1.4 + aSeed.y * 2.6) + aSeed.z * 12.0);
  vHue = aSeed.x;
}
`;

const particleFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform int uKind;
varying float vTwinkle;
varying float vHue;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float a;
  vec3 color = uColor;
  if (uKind == 1) {
    float rim = smoothstep(0.55, 0.92, d) * smoothstep(1.0, 0.9, d);
    float glint = smoothstep(0.3, 0.0, length(c - vec2(-0.17, 0.17)) * 2.0);
    a = rim * 0.85 + glint * 0.9 + 0.06;
  } else if (uKind == 2) {
    a = smoothstep(1.0, 0.25, d);
    color = mix(color, vec3(1.0), 0.75);
  } else {
    a = smoothstep(1.0, 0.0, d);
    a *= a;
    if (uKind == 3) {
      vec3 film = 0.62 + 0.38 * cos(6.28318 * (vHue * 1.7 + vec3(0.0, 0.33, 0.67)));
      color = mix(color, film, 0.55);
    }
  }
  float alpha = a * vTwinkle * uOpacity;
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export type Particles = {
  points: THREE.Points;
  uniforms: {
    uTime: { value: number };
    uOpacity: { value: number };
    uPixelRatio: { value: number };
  };
  dispose(): void;
};

export function createParticles(
  kind: DoorAtmosphere,
  color: string,
  count: number,
  area: { width: number; height: number; depth: number },
): Particles {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  let s = 1234567;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const narrow = kind === 'bubbles' ? 0.32 : 0.55;
  for (let i = 0; i < count; i++) {
    // Işık huzmesinin içinde yoğun, kenarlara doğru seyrek.
    const spread = (rnd() - 0.5) * (rnd() < 0.72 ? narrow : 1);
    positions[i * 3] = spread * area.width;
    positions[i * 3 + 1] = (rnd() - 0.5) * area.height;
    positions[i * 3 + 2] = 0.3 + rnd() * area.depth;
    seeds[i * 3] = rnd();
    seeds[i * 3 + 1] = rnd();
    seeds[i * 3 + 2] = rnd();
    scales[i] = kind === 'bubbles' ? 0.3 + rnd() * rnd() * 0.9 : 0.35 + rnd() * rnd() * 1.4;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  const tint = new THREE.Color(color);
  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uPixelRatio: { value: 1 },
    uSize: { value: kind === 'bubbles' ? 15 : kind === 'snow' ? 12 : 15 },
    uRise: { value: kind === 'snow' ? -0.55 : kind === 'bubbles' ? 1.25 : 0.18 },
    uArea: { value: new THREE.Vector2(area.width, area.height) },
    // Işık rengini gölgelendiriciye ekran uzayında (sRGB) veriyoruz.
    uColor: { value: new THREE.Vector3(...tint.clone().convertLinearToSRGB().toArray()) },
    uKind: { value: kindIndex[kind] },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return {
    points,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Kanatların ardındaki sıcak ışık: yalnızca aralıktan görünür. */
export function createInnerGlow(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 128, 4, 64, 128, 128);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  const alpha = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    color,
    alphaMap: alpha,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1;
  return {
    mesh,
    material,
    dispose() {
      geometry.dispose();
      material.dispose();
      alpha.dispose();
    },
  };
}

/** Kapı aralığından sızan ışık için yatay geçişli şerit. */
export function seamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 4;
  const ctx = canvas.getContext('2d')!;
  // Çan eğrisi: huzme ortada yoğun, kenarlara doğru yumuşakça söner.
  for (let x = 0; x < 64; x++) {
    const d = (x + 0.5) / 32 - 1;
    const v = Math.round(255 * Math.exp(-d * d * 7));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  return new THREE.CanvasTexture(canvas);
}

/* Koyu cilalar için stüdyo ortamı: karanlık bir oda ve birkaç sıcak
   ışık kutusu. Beyaz odanın aksine lake yüzeyde gri bir tül bırakmaz;
   yansımalar belirgin, sıcak parıltılar olur. */
export function studioScene(warmth: string) {
  const scene = new THREE.Scene();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const room = new THREE.SphereGeometry(20, 32, 16);
  const walls = new THREE.MeshBasicMaterial({ color: '#0a0806', side: THREE.BackSide });
  geometries.push(room);
  materials.push(walls);
  scene.add(new THREE.Mesh(room, walls));
  const panel = new THREE.PlaneGeometry(1, 1);
  geometries.push(panel);
  const lights: [number, number, number, number, number, string, number][] = [
    // x, y, z, en, boy, renk, güç
    [-7, 6, 9, 7, 3.2, warmth, 5.2],
    [8, 1, 7, 1.4, 9, '#ffffff', 2.6],
    [0, -9, 6, 12, 1.2, warmth, 1.4],
    [-9, -1, -2, 1.2, 8, '#ffe6c8', 1.2],
    [3, 9, -4, 6, 1.2, '#fff4e4', 1.6],
  ];
  for (const [x, y, z, w, h, color, power] of lights) {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) });
    materials.push(material);
    const mesh = new THREE.Mesh(panel, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  }
  return {
    scene,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
