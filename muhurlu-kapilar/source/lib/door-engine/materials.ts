import * as THREE from 'three';
import type { DoorConfig } from '@/lib/door-themes';
import type { DoorSurface } from './surface';

/* Kanat malzemeleri. Tümü Three.js'in standart/fiziksel malzemesidir;
   üzerine tek bir kabartma ışığı eklenir: mühürden yayılan dalga ile
   beklerken geçen ince parıltı. Dalga, kabartma maskesinin açık
   yerlerinde (sapların, kakmaların, pirinç çizgilerin üstünde) yanar. */

export type ReliefUniforms = {
  uGlowMap: { value: THREE.Texture | null };
  uGlowColor: { value: THREE.Color };
  /** Dalganın yarıçapı (kapı yüksekliği birimi). */
  uWave: { value: number };
  uWaveWidth: { value: number };
  uWaveStrength: { value: number };
  /** Mührün yeri (kapı UV, v yukarı). */
  uWaveCenter: { value: THREE.Vector2 };
  /** UV → kapı yüksekliği birimi. */
  uUvScale: { value: THREE.Vector2 };
  /** Çapraz parıltının konumu ve gücü. */
  uGlint: { value: number };
  uGlintStrength: { value: number };
  /** Yaldız: yüzey rengini altına çeken çarpan ve payı. */
  uGildTint: { value: THREE.Color };
  uGild: { value: number };
};

export function createReliefUniforms(door: DoorConfig): ReliefUniforms {
  return {
    uGlowMap: { value: null },
    uGlowColor: { value: new THREE.Color(door.light) },
    uWave: { value: 0 },
    uWaveWidth: { value: 0.085 },
    uWaveStrength: { value: 0 },
    uWaveCenter: { value: new THREE.Vector2(0.5, 1 - door.y) },
    uUvScale: { value: new THREE.Vector2(0.5, 1) },
    uGlint: { value: -2 },
    uGlintStrength: { value: 0 },
    uGildTint: { value: new THREE.Color(1.22, 0.9, 0.42) },
    uGild: { value: 0.9 },
  };
}

const reliefDeclarations = /* glsl */ `
varying vec2 vDoorUv;
uniform sampler2D uGlowMap;
uniform vec3 uGlowColor;
uniform vec3 uGildTint;
uniform float uGild;
uniform float uWave;
uniform float uWaveWidth;
uniform float uWaveStrength;
uniform vec2 uWaveCenter;
uniform vec2 uUvScale;
uniform float uGlint;
uniform float uGlintStrength;
`;

/* Işık önce yüzeyi yaldızlar (açık zeminde bile doygun altın kalsın),
   sonra az miktarda ışık olarak eklenir (koyu zeminde parlasın). */
const reliefGild = /* glsl */ `
float reliefLit = 0.0;
{
  float relief = texture2D(uGlowMap, vDoorUv).r;
  vec2 dv = (vDoorUv - uWaveCenter) * uUvScale;
  float dist = length(dv);
  float front = exp(-pow((dist - uWave) / uWaveWidth, 2.0));
  float wake = (1.0 - smoothstep(0.0, uWave + 1e-4, dist)) * 0.28 * smoothstep(0.0, 0.25, uWave - dist + 0.25);
  float band = exp(-pow((dv.x * 0.62 - dv.y - uGlint) / 0.07, 2.0));
  reliefLit = relief * ((front + wake) * uWaveStrength + band * uGlintStrength);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uGildTint, clamp(reliefLit * uGild, 0.0, 1.0));
}
`;

const reliefLight = /* glsl */ `
totalEmissiveRadiance += uGlowColor * reliefLit;
`;

/** Standart ya da fiziksel malzemeye kabartma ışığını ekler. */
export function injectRelief(material: THREE.MeshStandardMaterial, uniforms: ReliefUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDoorUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvDoorUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${reliefDeclarations}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${reliefGild}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${reliefLight}`);
  };
  material.customProgramCacheKey = () => 'door-relief-3';
}

export type SurfaceTextures = {
  map: THREE.Texture;
  normal?: THREE.Texture;
  displacement?: THREE.Texture;
  orm?: THREE.Texture;
  glow?: THREE.Texture;
  iridescence?: THREE.Texture;
  alpha?: THREE.Texture;
  all: THREE.Texture[];
};

function texture(source: DoorSurface['albedo'], color: boolean, anisotropy: number) {
  const t =
    source instanceof HTMLImageElement
      ? new THREE.Texture(source)
      : new THREE.CanvasTexture(source as HTMLCanvasElement);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

export function surfaceTextures(surface: DoorSurface, maxAnisotropy: number): SurfaceTextures {
  const a = Math.min(8, maxAnisotropy);
  const out: SurfaceTextures = { map: texture(surface.albedo, true, a), all: [] };
  if (surface.normal) out.normal = texture(surface.normal, false, a);
  if (surface.displacement) out.displacement = texture(surface.displacement, false, 1);
  if (surface.orm) out.orm = texture(surface.orm, false, a);
  if (surface.glow) out.glow = texture(surface.glow, false, 2);
  if (surface.iridescence) out.iridescence = texture(surface.iridescence, false, 2);
  if (surface.alpha) out.alpha = texture(surface.alpha, false, 2);
  out.all = [out.map, out.normal, out.displacement, out.orm, out.glow, out.iridescence, out.alpha].filter(
    (t): t is THREE.Texture => Boolean(t),
  );
  return out;
}

/** Kanat yüzü malzemesi: kapının cilasına göre standart ya da fiziksel. */
export function leafMaterial(
  door: DoorConfig,
  surface: DoorSurface,
  maps: SurfaceTextures,
  uniforms: ReliefUniforms,
  environment: THREE.Texture,
) {
  const finish = door.finish ?? 'matte';
  const depth = door.bump / 0.055;
  const base: THREE.MeshStandardMaterialParameters = {
    map: maps.map,
    normalMap: maps.normal ?? null,
    normalScale: new THREE.Vector2(depth, depth).multiplyScalar(surface.normalStrength),
    displacementMap: maps.displacement ?? null,
    displacementScale: maps.displacement ? 0.02 : 0,
    displacementBias: maps.displacement ? -0.01 : 0,
    aoMap: maps.orm ?? null,
    aoMapIntensity: 0.9,
    roughnessMap: maps.orm ?? null,
    metalnessMap: maps.orm ?? null,
    alphaMap: maps.alpha ?? null,
    alphaTest: maps.alpha ? 0.5 : 0,
    envMap: environment,
  };
  let material: THREE.MeshStandardMaterial;
  if (finish === 'pearl') {
    material = new THREE.MeshPhysicalMaterial({
      ...base,
      roughness: 1,
      metalness: 1,
      envMapIntensity: 0.9,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
      clearcoatNormalMap: maps.normal ?? null,
      clearcoatNormalScale: new THREE.Vector2(0.35, 0.35),
      iridescence: maps.iridescence ? 1 : 0,
      iridescenceMap: maps.iridescence ?? null,
      iridescenceThicknessMap: maps.iridescence ?? null,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [180, 720],
      sheen: 0,
    });
  } else if (finish === 'lacquer') {
    material = new THREE.MeshPhysicalMaterial({
      ...base,
      roughness: 1,
      metalness: 1,
      envMapIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      clearcoatNormalMap: maps.normal ?? null,
      clearcoatNormalScale: new THREE.Vector2(0.25, 0.25),
    });
  } else if (finish === 'iron') {
    material = new THREE.MeshStandardMaterial({
      ...base,
      roughness: 1,
      metalness: 1,
      envMapIntensity: 0.7,
    });
  } else {
    material = new THREE.MeshStandardMaterial({
      ...base,
      roughness: maps.orm ? 1 : 0.78,
      metalness: maps.orm ? 1 : 0,
      envMapIntensity: maps.orm ? 0.6 : 0.12,
    });
  }
  uniforms.uGlowMap.value = maps.glow ?? null;
  if (maps.glow) injectRelief(material, uniforms);
  return material;
}
