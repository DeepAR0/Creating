import * as THREE from 'three';
import type { DoorConfig } from '@/lib/door-themes';

/* Kapıya takılan parçalar: tokmak (Konak), ipek kurdele ve kulpları
   (İpek Bağ), gümüş anahtar (Sedef Kakma) ve pirinç kulplar (Pera).
   Her parça kendi yerleşimini ve hareketini bilir; sahne yalnızca
   onları kurar ve zaman çizelgesine bağlar. */

export const LEAF_W = 2.03;

export type Kit = {
  door: DoorConfig;
  environment: THREE.Texture;
  hinges: THREE.Group[];
  fixtures: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
};

export type Layout = {
  /** Kanatların dikey ölçeği (düzlem yüksekliği). */
  scaleY: number;
  planeHeight: number;
  sealWorldY: number;
  toPlaneX: (imageX: number) => number;
  toPlaneY: (imageY: number) => number;
};

export function meshIn(
  kit: Kit,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  parent: THREE.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  if (!kit.geometries.includes(geo)) kit.geometries.push(geo);
  if (!kit.materials.includes(mat)) kit.materials.push(mat);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function gradientCanvas(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!);
  return canvas;
}

function canvasTexture(source: HTMLCanvasElement, color = false) {
  const texture = new THREE.CanvasTexture(source);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/* Tokmak (Konak). */
export function buildKnocker(kit: Kit) {
  const spec = kit.door.knocker;
  if (!spec) return undefined;
  const brass = new THREE.MeshStandardMaterial({
    color: '#c39a56',
    metalness: 1,
    roughness: 0.28,
    envMap: kit.environment,
    envMapIntensity: 1.15,
  });
  const onRight = spec.x >= 0.5;
  const holder = new THREE.Group();
  kit.hinges[onRight ? 1 : 0].add(holder);
  const plate = meshIn(kit, new THREE.CylinderGeometry(0.085, 0.095, 0.035, 40), brass, holder, 0, 0, 0.05);
  plate.rotation.x = Math.PI / 2;
  meshIn(kit, new THREE.SphereGeometry(0.035, 20, 12), brass, holder, 0, 0, 0.075);
  const pivot = new THREE.Group();
  pivot.position.set(0, -0.03, 0.08);
  holder.add(pivot);
  meshIn(kit, new THREE.TorusGeometry(0.19, 0.026, 20, 72), brass, pivot, 0, -0.19, 0);
  meshIn(kit, new THREE.SphereGeometry(0.036, 20, 12), brass, pivot, 0, -0.38, 0.004);
  const striker = meshIn(kit, new THREE.CylinderGeometry(0.05, 0.055, 0.03, 32), brass, holder, 0, -0.4, 0.05);
  striker.rotation.x = Math.PI / 2;
  return {
    pivot,
    layout(l: Layout) {
      const worldX = (l.toPlaneX(spec.x) - 0.5) * LEAF_W * 2;
      holder.position.set(
        worldX - (onRight ? LEAF_W : -LEAF_W),
        ((0.5 - l.toPlaneY(spec.y)) * l.planeHeight) / l.scaleY,
        0,
      );
      holder.scale.set(1, 1 / l.scaleY, 1);
    },
    /** Halkanın ekrandaki yeri için geçici bir nokta. */
    ringPoint() {
      const ring = new THREE.Object3D();
      ring.position.set(0, -0.2, 0);
      pivot.add(ring);
      return { point: ring, release: () => pivot.remove(ring) };
    },
  };
}

/* Birleşim çizgisinin iki yanında dikey kulplar. */
export function buildHandles(
  kit: Kit,
  options: { color: string; offset: number; length: number; radius?: number },
) {
  const gold = new THREE.MeshStandardMaterial({
    color: options.color,
    metalness: 1,
    roughness: 0.25,
    envMap: kit.environment,
    envMapIntensity: 1.1,
  });
  const r = options.radius ?? 0.024;
  const holders: THREE.Group[] = [];
  for (let side = 0; side < 2; side++) {
    const direction = side === 0 ? 1 : -1;
    const holder = new THREE.Group();
    kit.hinges[side].add(holder);
    holders.push(holder);
    meshIn(kit, new THREE.CylinderGeometry(r, r, options.length, 20), gold, holder, 0, 0, 0.1);
    for (const end of [-1, 1]) {
      meshIn(kit, new THREE.SphereGeometry(r * 1.5, 18, 12), gold, holder, 0, end * options.length * 0.5, 0.1);
      const post = meshIn(
        kit,
        new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.09, 12),
        gold,
        holder,
        0,
        end * options.length * 0.44,
        0.06,
      );
      post.rotation.x = Math.PI / 2;
    }
    holder.userData.x = LEAF_W * direction - options.offset * direction;
  }
  return {
    holders,
    layout(l: Layout, y = l.sealWorldY) {
      holders.forEach((holder) => {
        holder.position.set(holder.userData.x as number, y / l.scaleY, 0);
        holder.scale.set(1, 1 / l.scaleY, 1);
      });
    },
  };
}

/* İpek kurdele (İpek Bağ): kulplardan geçer, düğümünde mühür durur. */
export function buildRibbon(kit: Kit) {
  const spec = kit.door.ribbon;
  if (!spec) return undefined;
  const group = new THREE.Group();
  kit.fixtures.add(group);
  const parts: THREE.Mesh[] = [];
  const tails: THREE.Mesh[] = [];
  const satin = gradientCanvas(64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, spec.shade);
    g.addColorStop(0.22, spec.color);
    g.addColorStop(0.44, spec.color);
    g.addColorStop(0.52, '#f7ddd6');
    g.addColorStop(0.6, spec.color);
    g.addColorStop(0.86, spec.color);
    g.addColorStop(1, spec.shade);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    ctx.globalAlpha = 0.07;
    for (let y = 0; y < 256; y += 3) {
      ctx.fillStyle = y % 6 ? '#000' : '#fff';
      ctx.fillRect(0, y, 64, 1);
    }
  });
  const satinTexture = canvasTexture(satin, true);
  const tailCut = gradientCanvas(32, 128, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(32, 0);
    ctx.lineTo(32, 128);
    ctx.lineTo(16, 112);
    ctx.lineTo(0, 128);
    ctx.closePath();
    ctx.fill();
  });
  const tailAlpha = canvasTexture(tailCut);
  kit.textures.push(satinTexture, tailAlpha);
  const material = new THREE.MeshStandardMaterial({
    map: satinTexture,
    roughness: 0.46,
    metalness: 0,
    envMap: kit.environment,
    envMapIntensity: 0.18,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const tailMaterial = material.clone();
  tailMaterial.alphaMap = tailAlpha;
  kit.materials.push(tailMaterial);
  const materials: THREE.Material[] = [material, tailMaterial];
  for (const sign of [-1, 1]) {
    const band = meshIn(kit, new THREE.PlaneGeometry(0.2, 1.62), material, group, sign * 0.81, 0, 0.06);
    band.rotation.z = Math.PI / 2;
    parts.push(band);
    const tail = meshIn(kit, new THREE.PlaneGeometry(0.17, 1.05), tailMaterial, group, sign * 0.16, -0.52, 0.07);
    tail.rotation.z = sign * 0.26;
    tails.push(tail);
    parts.push(tail);
  }
  parts.push(meshIn(kit, new THREE.PlaneGeometry(0.34, 0.26), material, group, 0, 0, 0.075));
  const handles = buildHandles(kit, { color: kit.door.metal, offset: 0.62, length: 0.5 });
  return {
    group,
    parts,
    tails,
    materials,
    layout(l: Layout) {
      group.position.y = l.sealWorldY;
      handles.layout(l);
    },
    tipPoint() {
      const tip = new THREE.Object3D();
      tip.position.set(0, -0.8, 0);
      group.add(tip);
      group.updateMatrixWorld(true);
      return { point: tip, release: () => group.remove(tip) };
    },
    pull(progress: number) {
      const p = Math.min(1, Math.max(0, progress));
      tails.forEach((tail, i) => {
        tail.position.y = -0.52 - p * 0.26;
        tail.rotation.z = (i === 0 ? -1 : 1) * 0.26 * (1 - p * 0.6);
      });
      parts.forEach((part) => {
        if (!tails.includes(part)) part.scale.y = 1 - p * 0.12;
      });
    },
    openInto(tl: gsap.core.Timeline) {
      parts.forEach((part, i) => {
        const sign = part.position.x === 0 ? 0 : Math.sign(part.position.x);
        tl.to(
          part.position,
          {
            x: part.position.x + sign * 1.4,
            y: part.position.y - 2.2 - (i % 3) * 0.3,
            duration: 1.1,
            ease: 'power2.in',
          },
          0.35,
        ).to(part.rotation, { z: part.rotation.z + sign * 0.9, duration: 1.1 }, 0.35);
      });
      tl.to(materials, { opacity: 0, duration: 0.5 }, 0.95);
    },
  };
}

/* Pirinç anahtar (Sedef Kakma). Anahtar deliğinden aşağı sarkar; kapının
   düzleminde, deliğin çevresinde saat yönünün tersine çeyrek tur döner.
   Halkasında bordo ipek bir püskül asılıdır. */
export function buildKey(kit: Kit, keyhole: { u: number; v: number }) {
  const brass = new THREE.MeshStandardMaterial({
    color: '#d6b36d',
    metalness: 1,
    roughness: 0.26,
    envMap: kit.environment,
    envMapIntensity: 1.3,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: '#4b3a22',
    metalness: 1,
    roughness: 0.45,
    envMap: kit.environment,
    envMapIntensity: 0.7,
  });
  const silk = new THREE.MeshStandardMaterial({
    color: '#7c1c2b',
    roughness: 0.55,
    metalness: 0,
    envMap: kit.environment,
    envMapIntensity: 0.25,
  });
  const onRight = keyhole.u >= 0.5;
  const holder = new THREE.Group();
  kit.hinges[onRight ? 1 : 0].add(holder);
  const pivot = new THREE.Group();
  pivot.position.z = 0.075;
  holder.add(pivot);
  // Gövde, halka ve süsleme: anahtar düzlemde, pivotun altında.
  const collar = meshIn(kit, new THREE.CylinderGeometry(0.042, 0.042, 0.032, 28), dark, pivot, 0, 0, -0.006);
  collar.rotation.x = Math.PI / 2;
  meshIn(kit, new THREE.CylinderGeometry(0.022, 0.026, 0.36, 18), brass, pivot, 0, -0.2, 0);
  for (const y of [-0.07, -0.33]) {
    meshIn(kit, new THREE.TorusGeometry(0.031, 0.011, 10, 28), brass, pivot, 0, y, 0).rotation.x = Math.PI / 2;
  }
  const bowY = -0.5;
  meshIn(kit, new THREE.TorusGeometry(0.125, 0.026, 18, 64), brass, pivot, 0, bowY, 0);
  meshIn(kit, new THREE.TorusGeometry(0.058, 0.014, 12, 40), brass, pivot, 0, bowY, 0.006);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    meshIn(
      kit,
      new THREE.SphereGeometry(0.022, 12, 8),
      brass,
      pivot,
      Math.cos(a) * 0.092,
      bowY + Math.sin(a) * 0.092,
      0.008,
    );
  }
  meshIn(kit, new THREE.SphereGeometry(0.03, 16, 10), brass, pivot, 0, bowY, 0.012);
  // Püskül: halkadan sarkan düğüm ve saçaklı ipek.
  meshIn(kit, new THREE.SphereGeometry(0.032, 14, 10), silk, pivot, 0, bowY - 0.16, 0.01);
  const fringe = meshIn(kit, new THREE.CylinderGeometry(0.018, 0.058, 0.2, 18, 1, true), silk, pivot, 0, bowY - 0.28, 0.01);
  fringe.scale.z = 0.5;
  meshIn(kit, new THREE.TorusGeometry(0.02, 0.008, 8, 20), brass, pivot, 0, bowY - 0.19, 0.012).rotation.x = Math.PI / 2;
  return {
    pivot,
    layout(l: Layout) {
      const worldX = (l.toPlaneX(keyhole.u) - 0.5) * LEAF_W * 2;
      holder.position.set(
        worldX - (onRight ? LEAF_W : -LEAF_W),
        ((0.5 - l.toPlaneY(keyhole.v)) * l.planeHeight) / l.scaleY,
        0,
      );
      holder.scale.set(1, 1 / l.scaleY, 1);
    },
    /** Anahtarın uzunluğu boyunca bir nokta (0 delik, 1 halkanın ucu). */
    along(t: number) {
      const p = new THREE.Object3D();
      p.position.set(0, -0.64 * t, 0);
      pivot.add(p);
      return { point: p, release: () => pivot.remove(p) };
    },
    /** 0 → aşağı, 1 → çeyrek tur (sağa). */
    turn(progress: number) {
      pivot.rotation.z = Math.min(1, Math.max(0, progress)) * (Math.PI / 2);
    },
  };
}
