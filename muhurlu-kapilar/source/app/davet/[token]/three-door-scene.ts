import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { DoorConfig } from '@/lib/door-themes';
import {
  buildSealMaps,
  crackGlowCanvas,
  paintSeal,
  sealMaskCanvas,
  type SealSpec,
  type WaxTone,
} from '@/lib/wax-seal';

/* Mühürlü kapı. İki menteşeli kanat, kabartma haritasıyla ışık alır.
   Balmumu mühür iki kanadın birleştiği yerdedir: dokununca ortadan
   çatlar, her yarısı kendi kanadına bağlı kalır ve onunla açılır.
   Tokmak, ipek kurdele ve basılı tutma ritüelleri aynı sahnededir. */

export type DoorAnchors = {
  seal: { x: number; y: number; size: number };
  knocker?: { x: number; y: number; size: number };
  ribbon?: { x: number; y: number; width: number; height: number };
};

export type DoorCue = 'crack' | 'doors';

type Options = {
  host: HTMLElement;
  door: DoorConfig;
  seal: SealSpec;
  wax: WaxTone;
  signal: AbortSignal;
  onComplete: () => void;
  onFail: () => void;
  onLayout?: (anchors: DoorAnchors) => void;
  /** Ses ve titreşim için zaman çizelgesindeki anlar. */
  onCue?: (cue: DoorCue) => void;
};

const LEAF_W = 2.03;
const SEAL_WORLD = 0.96;

function canvasTexture(source: TexImageSource, color = false) {
  const texture = new THREE.CanvasTexture(source as HTMLCanvasElement);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function gradientCanvas(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!);
  return canvas;
}

export async function createDoorScene({
  host,
  door,
  seal: initialSeal,
  wax: initialWax,
  signal,
  onComplete,
  onFail,
  onLayout,
  onCue,
}: Options) {
  const loader = new THREE.TextureLoader();
  const loaded = await Promise.allSettled([
    loader.loadAsync(door.art),
    loader.loadAsync(door.mask),
  ]);
  const textures: THREE.Texture[] = loaded.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );
  if (signal.aborted || loaded.some((result) => result.status === 'rejected')) {
    textures.forEach((t) => t.dispose());
    throw new Error('Door textures unavailable');
  }
  const [art, relief] = textures;
  art.colorSpace = THREE.SRGBColorSpace;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch (error) {
    textures.forEach((t) => t.dispose());
    throw error;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);
  art.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
  camera.position.z = 9;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  room.dispose();

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  function mesh(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    if (!geometries.includes(geo)) geometries.push(geo);
    if (!materials.includes(mat)) materials.push(mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  scene.add(new THREE.HemisphereLight('#fff8e9', '#ab9270', 2.5));
  const key = new THREE.DirectionalLight('#fff6e4', 2.6);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#fffaf0', 0.8);
  fill.position.set(3, -2, 4);
  scene.add(fill);

  /* Kanatlar */
  const doors = new THREE.Group();
  scene.add(doors);
  const hinges: THREE.Group[] = [];
  const leafMaps: THREE.Texture[][] = [];
  const body = new THREE.MeshStandardMaterial({
    color: door.paper,
    roughness: 0.85,
  });
  // Kanat kenarı: kapının kendi metalinin gölgedeki tonu; kapalıyken
  // birleşim çizgisini parlatmaz, açılırken kalınlık hissi verir.
  const metal = new THREE.MeshStandardMaterial({
    color: new THREE.Color(door.metal).multiplyScalar(0.5),
    metalness: 0.45,
    roughness: 0.6,
    envMap: environment,
    envMapIntensity: 0.08,
  });
  for (let side = 0; side < 2; side++) {
    const direction = side === 0 ? 1 : -1;
    const hinge = new THREE.Group();
    hinge.position.x = -LEAF_W * direction;
    doors.add(hinge);
    hinges.push(hinge);
    mesh(
      new THREE.BoxGeometry(LEAF_W, 1, 0.12),
      body,
      hinge,
      (LEAF_W / 2) * direction,
      0,
      -0.07,
    );
    const map = art.clone();
    const bump = relief.clone();
    for (const t of [map, bump]) {
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      textures.push(t);
    }
    leafMaps.push([map, bump]);
    mesh(
      new THREE.PlaneGeometry(LEAF_W, 1, 80, 160),
      new THREE.MeshStandardMaterial({
        map,
        bumpMap: bump,
        bumpScale: door.bump,
        displacementMap: bump,
        displacementScale: 0.022,
        roughness: 0.78,
      }),
      hinge,
      (LEAF_W / 2) * direction,
      0,
      0.015,
    );
    mesh(
      new THREE.BoxGeometry(0.025, 1, 0.06),
      metal,
      hinge,
      (LEAF_W - 0.01) * direction,
      0,
      0.025,
    );
  }

  /* Mühür. Kapalıyken tek parça ve kapıların önünde durur; kırıldığı an
     iki yarıya geçer. Her yarı kendi kanadına bağlıdır ve onunla açılır.
     Tutucu grup kanatların dikey ölçeğini geri alır; mühür her ekranda
     yuvarlak kalır. Görüntü 2D mühürle aynı ışıklandırılmış haritadır. */
  const sealHolders: THREE.Group[] = [];
  const sealPivots: THREE.Group[] = [];
  const sealMeshes: THREE.Mesh[] = [];
  const shadowMeshes: THREE.Mesh[] = [];
  const sealGeometry = new THREE.PlaneGeometry(SEAL_WORLD, SEAL_WORLD);
  const shadowGeometry = new THREE.PlaneGeometry(
    SEAL_WORLD * 1.06,
    SEAL_WORLD * 1.06,
  );
  geometries.push(sealGeometry, shadowGeometry);
  for (let side = 0; side < 2; side++) {
    const direction = side === 0 ? 1 : -1;
    const holder = new THREE.Group();
    holder.position.set(LEAF_W * direction, 0, 0.085);
    hinges[side].add(holder);
    const pivot = new THREE.Group();
    holder.add(pivot);
    const shadow = new THREE.Mesh(shadowGeometry);
    shadow.position.set(0.01, -0.02, -0.006);
    holder.add(shadow);
    const half = new THREE.Mesh(sealGeometry);
    pivot.add(half);
    holder.visible = false;
    sealHolders.push(holder);
    sealPivots.push(pivot);
    sealMeshes.push(half);
    shadowMeshes.push(shadow);
  }
  const fixtures = new THREE.Group();
  scene.add(fixtures);
  const wholeSeal = new THREE.Group();
  fixtures.add(wholeSeal);
  const wholeShadow = new THREE.Mesh(shadowGeometry);
  wholeShadow.position.set(0.01, -0.02, 0.079);
  const wholeMesh = new THREE.Mesh(sealGeometry);
  wholeMesh.position.z = 0.085;
  wholeSeal.add(wholeShadow, wholeMesh);
  const crackGlow = new THREE.Mesh(sealGeometry);
  crackGlow.position.z = 0.16;
  fixtures.add(crackGlow);
  let sealTextures: THREE.Texture[] = [];
  let sealMaterials: THREE.Material[] = [];
  let wholeMaterial: THREE.MeshBasicMaterial;
  let glowMaterial: THREE.MeshBasicMaterial;
  let tone = initialWax;
  function applySeal(spec: SealSpec, wax: WaxTone) {
    tone = wax;
    sealTextures.forEach((t) => t.dispose());
    sealMaterials.forEach((m) => m.dispose());
    const maps = buildSealMaps(spec, 384);
    const painted = (['whole', 'left', 'right'] as const).map((part) =>
      canvasTexture(paintSeal(maps, wax, part, undefined, 0), true),
    );
    const shadows = (['whole', 'left', 'right'] as const).map((part) =>
      canvasTexture(sealMaskCanvas(maps, part, maps.size / 42)),
    );
    const glow = canvasTexture(crackGlowCanvas(maps));
    sealTextures = [...painted, ...shadows, glow];
    const [wholeLook, ...halfLooks] = painted.map(
      (map) =>
        new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          alphaTest: 0.02,
          toneMapped: false,
        }),
    );
    wholeMaterial = wholeLook;
    const [wholeShade, ...halfShades] = shadows.map(
      (alphaMap) =>
        new THREE.MeshBasicMaterial({
          color: '#2b1a0b',
          alphaMap,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
    );
    glowMaterial = new THREE.MeshBasicMaterial({
      color: door.light,
      alphaMap: glow,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    sealMaterials = [
      wholeLook,
      ...halfLooks,
      wholeShade,
      ...halfShades,
      glowMaterial,
    ];
    wholeMesh.material = wholeLook;
    wholeShadow.material = wholeShade;
    sealMeshes.forEach((m, i) => (m.material = halfLooks[i]));
    shadowMeshes.forEach((m, i) => (m.material = halfShades[i]));
    crackGlow.material = glowMaterial;
    dirty = true;
  }

  /* Kapı aralığından sızan ışık. */
  const seamCanvas = gradientCanvas(64, 4, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, '#000');
    g.addColorStop(0.5, '#fff');
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 4);
  });
  const seamTexture = canvasTexture(seamCanvas);
  textures.push(seamTexture);
  const seamMaterial = new THREE.MeshBasicMaterial({
    color: door.light,
    alphaMap: seamTexture,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const seam = mesh(new THREE.PlaneGeometry(0.14, 1), seamMaterial, fixtures, 0, 0, 0.08);

  /* Kabartma sapları boyunca ince ışık izleri (yalnızca Fildişi). */
  const trails = new THREE.Group();
  const trailMaterial = new THREE.MeshBasicMaterial({
    color: door.light,
    transparent: true,
    opacity: 0,
  });
  if (door.trails) {
    doors.add(trails);
    for (const sign of [-1, 1]) {
      const points = [
        new THREE.Vector3(sign * 0.12, 0, 0.06),
        new THREE.Vector3(sign * 1.28, 0.7, 0.06),
        new THREE.Vector3(sign * 1.65, 2, 0.06),
        new THREE.Vector3(sign * 0.75, 3, 0.06),
      ];
      mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.008, 5, false),
        trailMaterial,
        trails,
      );
    }
  }

  /* Tokmak (Konak). */
  let knockerHolder: THREE.Group | undefined;
  let knockerPivot: THREE.Group | undefined;
  const brass = new THREE.MeshStandardMaterial({
    color: '#c39a56',
    metalness: 1,
    roughness: 0.28,
    envMap: environment,
    envMapIntensity: 1.15,
  });
  if (door.knocker) {
    const onRight = door.knocker.x >= 0.5;
    knockerHolder = new THREE.Group();
    hinges[onRight ? 1 : 0].add(knockerHolder);
    const plate = mesh(
      new THREE.CylinderGeometry(0.085, 0.095, 0.035, 40),
      brass,
      knockerHolder,
      0,
      0,
      0.05,
    );
    plate.rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(0.035, 20, 12), brass, knockerHolder, 0, 0, 0.075);
    knockerPivot = new THREE.Group();
    knockerPivot.position.set(0, -0.03, 0.08);
    knockerHolder.add(knockerPivot);
    mesh(new THREE.TorusGeometry(0.19, 0.026, 20, 72), brass, knockerPivot, 0, -0.19, 0);
    mesh(new THREE.SphereGeometry(0.036, 20, 12), brass, knockerPivot, 0, -0.38, 0.004);
    const striker = mesh(
      new THREE.CylinderGeometry(0.05, 0.055, 0.03, 32),
      brass,
      knockerHolder,
      0,
      -0.4,
      0.05,
    );
    striker.rotation.x = Math.PI / 2;
  }

  /* İpek kurdele (İpek Bağ): kulplardan geçer, düğümünde mühür durur. */
  const ribbon = new THREE.Group();
  const ribbonParts: THREE.Mesh[] = [];
  const handleHolders: THREE.Group[] = [];
  let ribbonMaterial: THREE.MeshStandardMaterial | undefined;
  const ribbonMaterials: THREE.Material[] = [];
  const tails: THREE.Mesh[] = [];
  if (door.ribbon) {
    fixtures.add(ribbon);
    const satin = gradientCanvas(64, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, door.ribbon!.shade);
      g.addColorStop(0.22, door.ribbon!.color);
      g.addColorStop(0.44, door.ribbon!.color);
      g.addColorStop(0.52, '#f7ddd6');
      g.addColorStop(0.6, door.ribbon!.color);
      g.addColorStop(0.86, door.ribbon!.color);
      g.addColorStop(1, door.ribbon!.shade);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 256);
      ctx.globalAlpha = 0.07;
      for (let y = 0; y < 256; y += 3) {
        ctx.fillStyle = y % 6 ? '#000' : '#fff';
        ctx.fillRect(0, y, 64, 1);
      }
    });
    const satinTexture = canvasTexture(satin, true);
    textures.push(satinTexture);
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
    textures.push(tailAlpha);
    ribbonMaterial = new THREE.MeshStandardMaterial({
      map: satinTexture,
      roughness: 0.46,
      metalness: 0,
      envMap: environment,
      envMapIntensity: 0.18,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const tailMaterial = ribbonMaterial.clone();
    tailMaterial.alphaMap = tailAlpha;
    materials.push(tailMaterial);
    ribbonMaterials.push(ribbonMaterial, tailMaterial);
    for (const sign of [-1, 1]) {
      const band = mesh(
        new THREE.PlaneGeometry(0.2, 1.62),
        ribbonMaterial,
        ribbon,
        sign * 0.81,
        0,
        0.06,
      );
      band.rotation.z = Math.PI / 2;
      ribbonParts.push(band);
      const tail = mesh(
        new THREE.PlaneGeometry(0.17, 1.05),
        tailMaterial,
        ribbon,
        sign * 0.16,
        -0.52,
        0.07,
      );
      tail.rotation.z = sign * 0.26;
      tails.push(tail);
      ribbonParts.push(tail);
    }
    const knot = mesh(
      new THREE.PlaneGeometry(0.34, 0.26),
      ribbonMaterial,
      ribbon,
      0,
      0,
      0.075,
    );
    ribbonParts.push(knot);
    const gold = new THREE.MeshStandardMaterial({
      color: door.metal,
      metalness: 1,
      roughness: 0.25,
      envMap: environment,
      envMapIntensity: 1.1,
    });
    for (let side = 0; side < 2; side++) {
      const direction = side === 0 ? 1 : -1;
      const holder = new THREE.Group();
      hinges[side].add(holder);
      handleHolders.push(holder);
      mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.5, 20), gold, holder, 0, 0, 0.1);
      for (const end of [-1, 1]) {
        mesh(new THREE.SphereGeometry(0.036, 18, 12), gold, holder, 0, end * 0.25, 0.1);
        const post = mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.09, 12),
          gold,
          holder,
          0,
          end * 0.22,
          0.06,
        );
        post.rotation.x = Math.PI / 2;
      }
      holder.userData.x = LEAF_W * direction - 0.62 * direction;
    }
  }

  /* Balmumu kırıntıları. */
  const crumbs = new THREE.Group();
  fixtures.add(crumbs);
  const crumbGeometry = new THREE.DodecahedronGeometry(0.022, 0);
  geometries.push(crumbGeometry);

  let width = 1,
    height = 1,
    viewHeight = 8,
    planeHeight = 8,
    opening = false,
    active = false,
    paused = false,
    destroyed = false,
    dirty = true,
    animating = 0,
    sealWorldY = 0;
  let timeline: gsap.core.Timeline | undefined;
  let openingElapsed = 0;
  let previousFrame = 0;
  let pointerX = 0;
  const sweep = { value: 0 };
  const hold = { value: 0 };
  let holdTween: gsap.core.Tween | undefined;

  function tween(target: object, vars: gsap.TweenVars) {
    animating += 1;
    const { onUpdate, onComplete } = vars;
    return gsap.to(target, {
      ...vars,
      onUpdate: () => {
        dirty = true;
        (onUpdate as (() => void) | undefined)?.();
      },
      onComplete: () => {
        animating = Math.max(0, animating - 1);
        dirty = true;
        (onComplete as (() => void) | undefined)?.();
      },
      onInterrupt: () => {
        animating = Math.max(0, animating - 1);
      },
    });
  }

  function render() {
    if (destroyed || document.hidden) return;
    renderer.render(scene, camera);
    dirty = false;
  }

  function screen(object: THREE.Object3D) {
    const v = new THREE.Vector3();
    object.getWorldPosition(v);
    v.project(camera);
    return { x: ((v.x + 1) / 2) * 100, y: ((1 - v.y) / 2) * 100 };
  }

  function layout() {
    const imgW = (art.image as { width: number }).width;
    const imgH = (art.image as { height: number }).height;
    const imageAspect = imgW / imgH;
    const planeAspect = (LEAF_W * 2) / planeHeight;
    let fw = 1,
      fh = 1;
    if (door.fit === 'cover') {
      if (planeAspect < imageAspect) fw = planeAspect / imageAspect;
      else fh = imageAspect / planeAspect;
    }
    leafMaps.forEach((pair, side) => {
      for (const t of pair) {
        t.repeat.set(fw / 2, fh);
        t.offset.set(side === 0 ? 0.5 - fw / 2 : 0.5, (1 - fh) / 2);
      }
    });
    const toPlaneY = (imageY: number) => (imageY - (1 - fh) / 2) / fh;
    const toPlaneX = (imageX: number) => (imageX - (1 - fw) / 2) / fw;
    const scaleY = doors.scale.y;
    sealWorldY = (0.5 - toPlaneY(door.y)) * planeHeight;
    for (const holder of sealHolders) {
      holder.position.y = sealWorldY / scaleY;
      holder.scale.set(1, 1 / scaleY, 1);
    }
    crackGlow.position.y = sealWorldY;
    wholeSeal.position.y = sealWorldY;
    seam.scale.y = planeHeight;
    if (knockerHolder && door.knocker) {
      const worldX = (toPlaneX(door.knocker.x) - 0.5) * LEAF_W * 2;
      const onRight = door.knocker.x >= 0.5;
      knockerHolder.position.set(
        worldX - (onRight ? LEAF_W : -LEAF_W),
        ((0.5 - toPlaneY(door.knocker.y)) * planeHeight) / scaleY,
        0,
      );
      knockerHolder.scale.set(1, 1 / scaleY, 1);
    }
    if (door.ribbon) {
      ribbon.position.y = sealWorldY;
      handleHolders.forEach((holder) => {
        holder.position.set(holder.userData.x as number, sealWorldY / scaleY, 0);
        holder.scale.set(1, 1 / scaleY, 1);
      });
    }
    doors.updateMatrixWorld(true);
    fixtures.updateMatrixWorld(true);
    const unit = (width / 4) * SEAL_WORLD;
    const anchors: DoorAnchors = {
      seal: { ...screen(sealHolders[0]), size: unit },
    };
    if (knockerPivot) {
      const ring = new THREE.Object3D();
      ring.position.set(0, -0.2, 0);
      knockerPivot.add(ring);
      anchors.knocker = { ...screen(ring), size: (width / 4) * 0.5 };
      knockerPivot.remove(ring);
    }
    if (tails.length) {
      const tip = new THREE.Object3D();
      tip.position.set(0, -0.8, 0);
      ribbon.add(tip);
      ribbon.updateMatrixWorld(true);
      anchors.ribbon = {
        ...screen(tip),
        width: (width / 4) * 0.7,
        height: (width / 4) * 1.1,
      };
      ribbon.remove(tip);
    }
    onLayout?.(anchors);
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    viewHeight = (4 * height) / width;
    planeHeight = viewHeight * 1.025;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(viewHeight / 18));
    camera.updateProjectionMatrix();
    doors.scale.y = planeHeight;
    trails.scale.y = 1 / viewHeight;
    layout();
    dirty = true;
    render();
  }
  applySeal(initialSeal, initialWax);
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  function frame() {
    if (destroyed || document.hidden || paused) return;
    if (opening && timeline) {
      const now = performance.now();
      if (previousFrame) openingElapsed += (now - previousFrame) / 1000;
      previousFrame = now;
      // Görünür geçen süreyle ilerle: yavaş GPU'da GSAP gecikme telafisi açılışı uzatmasın.
      timeline.totalTime(openingElapsed, false);
    }
    key.position.x = -2.7 + pointerX * 1.4 + sweep.value * 3;
    if (dirty || opening || animating) render();
  }
  const pointer = (event: PointerEvent) => {
    if (paused || active) return;
    const rect = host.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / Math.max(1, width) - 0.5) * 2;
    dirty = true;
  };

  function spawnCrumbs() {
    const material = new THREE.MeshStandardMaterial({
      color: tone.color,
      roughness: 0.35,
      metalness: tone.metal,
      envMap: environment,
    });
    materials.push(material);
    for (let i = 0; i < 9; i++) {
      const crumb = new THREE.Mesh(crumbGeometry, material);
      const t = (i / 8 - 0.5) * SEAL_WORLD * 0.72;
      crumb.position.set((Math.random() - 0.5) * 0.05, sealWorldY + t, 0.12);
      crumb.scale.set(
        0.6 + Math.random() * 0.8,
        0.4 + Math.random() * 0.6,
        0.35 + Math.random() * 0.4,
      );
      crumb.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      crumbs.add(crumb);
      const fall = 0.7 + Math.random() * 0.9;
      tween(crumb.position, {
        x: crumb.position.x + (Math.random() - 0.5) * 0.5,
        y: crumb.position.y - fall,
        z: 0.2 + Math.random() * 0.4,
        duration: 0.8 + Math.random() * 0.5,
        ease: 'power2.in',
      });
      tween(crumb.rotation, {
        x: crumb.rotation.x + Math.random() * 6,
        y: crumb.rotation.y + Math.random() * 6,
        duration: 1.2,
      });
      tween(crumb.scale, {
        x: 0,
        y: 0,
        z: 0,
        delay: 0.7 + Math.random() * 0.4,
        duration: 0.35,
      });
    }
  }

  function finish() {
    timeline?.kill();
    opening = false;
    active = true;
    doors.visible = false;
    fixtures.visible = false;
    dirty = true;
    render();
    onComplete();
  }

  const visibility = () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
      previousFrame = 0;
    } else {
      if (!paused) renderer.setAnimationLoop(frame);
      previousFrame = 0;
      render();
    }
  };
  const lost = (event: Event) => {
    event.preventDefault();
    onFail();
  };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  window.addEventListener('pointermove', pointer, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  resize();
  renderer.setAnimationLoop(frame);

  function crackInto(tl: gsap.core.Timeline, at: number) {
    const [left, right] = sealPivots;
    tl.to(wholeSeal.scale, { x: 0.975, y: 0.975, duration: 0.1 }, at)
      .to(wholeSeal.scale, { x: 1, y: 1, duration: 0.1 }, at + 0.1)
      .call(
        () => {
          wholeSeal.visible = false;
          sealHolders.forEach((holder) => (holder.visible = true));
        },
        [],
        at + 0.12,
      )
      .to(glowMaterial, { opacity: 1, duration: 0.14 }, at + 0.1)
      .to(left.rotation, { z: 0.08, duration: 0.55, ease: 'power3.out' }, at + 0.16)
      .to(right.rotation, { z: -0.07, duration: 0.55, ease: 'power3.out' }, at + 0.16)
      .to(left.position, { x: -0.022, y: -0.01, duration: 0.55, ease: 'power3.out' }, at + 0.16)
      .to(right.position, { x: 0.022, y: -0.014, duration: 0.55, ease: 'power3.out' }, at + 0.16)
      .call(() => onCue?.('crack'), [], at + 0.1)
      .call(spawnCrumbs, [], at + 0.18)
      .to(seamMaterial, { opacity: 0.38, duration: 0.45 }, at + 0.2)
      .to(glowMaterial, { opacity: 0, duration: 0.9 }, at + 0.42);
  }

  return {
    anchors: layout,
    /** Mühür atölyesi: rengi, amblemi ve harfleri canlı değiştirir. */
    setSeal(spec: SealSpec, wax: WaxTone) {
      if (active || opening) return;
      applySeal(spec, wax);
      render();
    },
    knock(onImpact?: () => void) {
      if (!knockerPivot || opening || active) return;
      const pivot = knockerPivot;
      const tl = gsap.timeline({
        onUpdate: () => {
          dirty = true;
        },
        onComplete: () => {
          animating = Math.max(0, animating - 1);
        },
      });
      animating += 1;
      tl.to(pivot.rotation, { x: -0.85, duration: 0.2, ease: 'power2.out' })
        .to(pivot.rotation, { x: 0, duration: 0.13, ease: 'power3.in' })
        .call(() => onImpact?.())
        .to(hinges[0].rotation, { y: 0.006, duration: 0.05, yoyo: true, repeat: 1 }, '<')
        .to(hinges[1].rotation, { y: -0.006, duration: 0.05, yoyo: true, repeat: 1 }, '<')
        .to(pivot.rotation, { x: -0.1, duration: 0.09, ease: 'power1.out' })
        .to(pivot.rotation, { x: 0, duration: 0.12, ease: 'bounce.out' });
    },
    /** Kurdele gerginliği (0–1). */
    pull(progress: number) {
      if (!tails.length || opening || active) return;
      const p = Math.min(1, Math.max(0, progress));
      tails.forEach((tail, i) => {
        tail.position.y = -0.52 - p * 0.26;
        tail.rotation.z = (i === 0 ? -1 : 1) * 0.26 * (1 - p * 0.6);
      });
      ribbonParts.forEach((part) => {
        if (!tails.includes(part)) part.scale.y = 1 - p * 0.12;
      });
      dirty = true;
      render();
    },
    /** Basılı tutma ilerlemesi (0–1): mühür içeriden ışıldar. */
    hold(progress: number) {
      if (opening || active) return;
      holdTween?.kill();
      holdTween = tween(hold, {
        value: Math.min(1, Math.max(0, progress)),
        duration: progress === 0 ? 0.35 : 0.08,
        onUpdate: () => {
          wholeMaterial.color.setScalar(1 + hold.value * 0.3);
          wholeSeal.scale.setScalar(1 - hold.value * 0.02);
          glowMaterial.opacity = hold.value * 0.38;
          dirty = true;
        },
      });
    },
    open(instant = false) {
      if (active) return;
      if (instant) {
        finish();
        return;
      }
      if (opening) return;
      opening = true;
      if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();
        return;
      }
      holdTween?.kill();
      openingElapsed = 0;
      previousFrame = performance.now();
      timeline = gsap.timeline({ paused: true, onComplete: finish });
      crackInto(timeline, 0);
      let doorsAt = 0.95;
      if (door.ribbon) {
        doorsAt = 1.35;
        ribbonParts.forEach((part, i) => {
          const sign = part.position.x === 0 ? 0 : Math.sign(part.position.x);
          timeline!
            .to(part.position, {
              x: part.position.x + sign * 1.4,
              y: part.position.y - 2.2 - (i % 3) * 0.3,
              duration: 1.1,
              ease: 'power2.in',
            }, 0.35)
            .to(part.rotation, { z: part.rotation.z + sign * 0.9, duration: 1.1 }, 0.35);
        });
        timeline.to(ribbonMaterials, { opacity: 0, duration: 0.5 }, 0.95);
      }
      if (door.trails) {
        timeline
          .to(trailMaterial, { opacity: 0.8, duration: 0.6 }, 0.3)
          .to(trailMaterial, { opacity: 0, duration: 0.6 }, 1.1);
      }
      timeline
        .call(() => onCue?.('doors'), [], doorsAt)
        .to(sweep, { value: 1, duration: 1.6 }, 0.25)
        .to(hinges[0].rotation, { y: -Math.PI * 0.55, duration: 3, ease: 'power1.inOut' }, doorsAt)
        .to(hinges[1].rotation, { y: Math.PI * 0.55, duration: 3, ease: 'power1.inOut' }, doorsAt + 0.12)
        .to(seamMaterial, { opacity: 0, duration: 0.9 }, doorsAt + 0.5)
        .to(sweep, { value: 0, duration: 1.4 }, doorsAt + 1.3);
    },
    pause(value: boolean) {
      paused = value;
      if (value) {
        if (opening) finish();
        renderer.setAnimationLoop(null);
        render();
      } else {
        dirty = true;
        renderer.setAnimationLoop(frame);
      }
    },
    dispose() {
      destroyed = true;
      timeline?.kill();
      holdTween?.kill();
      gsap.killTweensOf([hold, sweep]);
      observer.disconnect();
      window.removeEventListener('pointermove', pointer);
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.setAnimationLoop(null);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      sealMaterials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      sealTextures.forEach((t) => t.dispose());
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export type DoorScene = Awaited<ReturnType<typeof createDoorScene>>;
