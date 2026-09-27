import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { hasWave, type DoorConfig, type DoorFinish } from '@/lib/door-themes';
import {
  buildSealMaps,
  crackGlowCanvas,
  paintSeal,
  sealMaskCanvas,
  type SealSpec,
  type WaxTone,
} from '@/lib/wax-seal';
import { buildSurface, surfaceSize, type DoorPersonal, type DoorSurface } from '@/lib/door-engine/surface';
import { createReliefUniforms, leafMaterial, surfaceTextures } from '@/lib/door-engine/materials';
import { createInnerGlow, createParticles, seamTexture, studioScene } from '@/lib/door-engine/effects';
import {
  LEAF_W,
  buildHandles,
  buildKey,
  buildKnocker,
  buildRibbon,
  meshIn,
  type Kit,
  type Layout,
} from '@/lib/door-engine/fixtures';
import { buildGlass } from '@/lib/door-engine/glass';

/* Mühürlü kapı. İki kanat kabartma haritasıyla ışık alır. Balmumu mühür
   iki kanadın birleştiği yerdedir: dokununca ortadan çatlar, her yarısı
   kendi kanadına bağlı kalır ve onunla açılır. Açılırken mühürden bir
   ışık dalgası kabartmalara yayılır, kamera eşikten içeri süzülür,
   aralıktan taşan ışığın içinde parçacıklar uçuşur.

   Ritüeller: dokunma, basılı tutma, tokmak, kurdele (özgün); anahtar,
   buğulu cam ve sürgülü kanatlar (yeni). Görsel kapılar resimden,
   çizimli kapılar tarayıcıda boyanan katmanlardan kurulur. */

export type DoorAnchors = {
  seal: { x: number; y: number; size: number };
  knocker?: { x: number; y: number; size: number };
  ribbon?: { x: number; y: number; width: number; height: number };
  /** Anahtarın döndüğü nokta ve halkanın ucu (yüzde) ile boyu (px). */
  key?: { x: number; y: number; tipX: number; tipY: number; size: number };
};

export type DoorCue = 'crack' | 'doors' | 'unlock';
export type OpeningMode = 'cinematic' | 'gentle';
export type LightPalette = 'original' | 'warm' | 'cool';

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
  /** Çizimli kapılara işlenen harfler ve tarih. */
  personal?: DoorPersonal;
  /** cinematic: kamera eşikten geçer; gentle: sakin ve kısa. */
  mode?: OpeningMode;
  /** Işığın rengi: tasarımın kendisi, daha sıcak ya da daha serin. */
  palette?: LightPalette;
  /** Telefon eğildikçe ışık kabartmalarda gezinsin (izin istemeden). */
  tilt?: boolean;
  /** Önceden (3B motor inerken) hazırlanmış yüzey. */
  surface?: Promise<DoorSurface>;
};

const SEAL_WORLD = 0.96;
const CAMERA_Z = 9;

/** Cilaya göre ışık düzeni; mat (Fildişi) özgün değerlerdir. */
const rigs: Record<
  DoorFinish,
  { sky: string; ground: string; hemi: number; key: number; fill: number; exposure: number }
> = {
  matte: { sky: '#fff8e9', ground: '#ab9270', hemi: 2.5, key: 2.6, fill: 0.8, exposure: 1.1 },
  pearl: { sky: '#fff1dc', ground: '#4a3020', hemi: 1.15, key: 2.9, fill: 0.55, exposure: 1.1 },
  lacquer: { sky: '#fff4e0', ground: '#2e261c', hemi: 1.1, key: 2.8, fill: 0.6, exposure: 1.1 },
  iron: { sky: '#eef1f5', ground: '#3a3029', hemi: 1.4, key: 2.4, fill: 0.8, exposure: 1.08 },
};

function tint(hex: string, palette: LightPalette) {
  const color = new THREE.Color(hex);
  if (palette === 'warm') color.lerp(new THREE.Color('#ffc27a'), 0.28);
  if (palette === 'cool') color.lerp(new THREE.Color('#d9e6ff'), 0.45);
  return color;
}

function canvasTexture(source: TexImageSource, color = false) {
  const texture = new THREE.CanvasTexture(source as HTMLCanvasElement);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
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
  personal,
  mode = 'cinematic',
  palette = 'original',
  tilt = true,
  surface: prepared,
}: Options) {
  const finishKind = door.finish ?? 'matte';
  const rig = rigs[finishKind];
  const cinematic = mode === 'cinematic';
  const surface = await (prepared ??
    buildSurface(
      door,
      personal ?? { initials: initialSeal.initials, seed: initialSeal.seed ?? initialSeal.initials },
      surfaceSize(host.getBoundingClientRect()),
      signal,
    ));
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  let pixelRatio = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = rig.exposure * (palette === 'warm' ? 1.03 : 1);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
  camera.position.z = CAMERA_Z;
  const pmrem = new THREE.PMREMGenerator(renderer);
  // Mat kapı beyaz odayı yansıtır (özgün görünüm); koyu cilalar stüdyoyu.
  const room = finishKind === 'matte' ? new RoomEnvironment() : null;
  const studio = room ? null : studioScene(tint(door.light, palette).getStyle());
  const environment = pmrem.fromScene(room ?? studio!.scene, 0.04).texture;
  pmrem.dispose();
  room?.dispose();
  studio?.dispose();

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const disposers: (() => void)[] = [];

  scene.add(new THREE.HemisphereLight(rig.sky, rig.ground, rig.hemi));
  const keyColor =
    palette === 'warm' ? '#ffe7c7' : palette === 'cool' ? '#edf2ff' : '#fff6e4';
  const key = new THREE.DirectionalLight(keyColor, rig.key);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#fffaf0', rig.fill);
  fill.position.set(3, -2, 4);
  scene.add(fill);
  const lightColor = tint(door.light, palette);

  /* Kanatlar */
  const doors = new THREE.Group();
  scene.add(doors);
  const hinges: THREE.Group[] = [];
  const faces: THREE.Mesh[] = [];
  const baseUvs: Float32Array[] = [];
  const maps = surfaceTextures(surface, renderer.capabilities.getMaxAnisotropy());
  textures.push(...maps.all);
  const relief = createReliefUniforms(door);
  // Dalga, kapının ışığından daha doygun bir altınla yanar: ton eşleme
  // parlak yerleri beyaza çekse de oymalarda altın kalır.
  relief.uGlowColor.value
    .copy(lightColor)
    .lerp(new THREE.Color('#ffa21f'), 0.5)
    .multiplyScalar(finishKind === 'matte' ? 0.45 : 1);
  relief.uGild.value = finishKind === 'matte' ? 0.95 : 0.35;
  const face = leafMaterial(door, surface, maps, relief, environment);
  materials.push(face);
  const body = new THREE.MeshStandardMaterial({ color: door.paper, roughness: 0.85 });
  // Kanat kenarı: kapının kendi metalinin gölgedeki tonu; kapalıyken
  // birleşim çizgisini parlatmaz, açılırken kalınlık hissi verir.
  const metal = new THREE.MeshStandardMaterial({
    color: new THREE.Color(door.metal).multiplyScalar(0.5),
    metalness: 0.45,
    roughness: 0.6,
    envMap: environment,
    envMapIntensity: 0.08,
  });
  const kit: Kit = {
    door,
    environment,
    hinges,
    fixtures: new THREE.Group(),
    geometries,
    materials,
    textures,
  };
  const see = Boolean(surface.alpha);
  for (let side = 0; side < 2; side++) {
    const direction = side === 0 ? 1 : -1;
    const hinge = new THREE.Group();
    hinge.position.x = -LEAF_W * direction;
    doors.add(hinge);
    hinges.push(hinge);
    // Camlı kanatta gövde kutusu camın arkasını kapatmasın.
    if (!see)
      meshIn(kit, new THREE.BoxGeometry(LEAF_W, 1, 0.12), body, hinge, (LEAF_W / 2) * direction, 0, -0.07);
    const plane = new THREE.PlaneGeometry(LEAF_W, 1, 80, 160);
    baseUvs.push(plane.attributes.uv.array.slice() as Float32Array);
    faces.push(meshIn(kit, plane, face, hinge, (LEAF_W / 2) * direction, 0, 0.015));
    meshIn(kit, new THREE.BoxGeometry(0.025, 1, 0.06), metal, hinge, (LEAF_W - 0.01) * direction, 0, 0.025);
  }
  if (!materials.includes(body)) materials.push(body);

  /* Mühür. Kapalıyken tek parça ve kapıların önünde durur; kırıldığı an
     iki yarıya geçer. Her yarı kendi kanadına bağlıdır ve onunla açılır.
     Tutucu grup kanatların dikey ölçeğini geri alır; mühür her ekranda
     yuvarlak kalır. Görüntü 2D mühürle aynı ışıklandırılmış haritadır. */
  const sealHolders: THREE.Group[] = [];
  const sealPivots: THREE.Group[] = [];
  const sealMeshes: THREE.Mesh[] = [];
  const shadowMeshes: THREE.Mesh[] = [];
  const sealGeometry = new THREE.PlaneGeometry(SEAL_WORLD, SEAL_WORLD);
  const shadowGeometry = new THREE.PlaneGeometry(SEAL_WORLD * 1.06, SEAL_WORLD * 1.06);
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
  const fixtures = kit.fixtures;
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
  let wholeMaterial!: THREE.MeshBasicMaterial;
  let glowMaterial!: THREE.MeshBasicMaterial;
  let tone = initialWax;
  let dirty = true;
  function applySeal(spec: SealSpec, wax: WaxTone) {
    tone = wax;
    sealTextures.forEach((t) => t.dispose());
    sealMaterials.forEach((m) => m.dispose());
    const sealMaps = buildSealMaps(spec, 384);
    const painted = (['whole', 'left', 'right'] as const).map((part) =>
      canvasTexture(paintSeal(sealMaps, wax, part, undefined, 0), true),
    );
    const shadows = (['whole', 'left', 'right'] as const).map((part) =>
      canvasTexture(sealMaskCanvas(sealMaps, part, sealMaps.size / 42)),
    );
    const glow = canvasTexture(crackGlowCanvas(sealMaps));
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
      color: lightColor,
      alphaMap: glow,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    sealMaterials = [wholeLook, ...halfLooks, wholeShade, ...halfShades, glowMaterial];
    wholeMesh.material = wholeLook;
    wholeShadow.material = wholeShade;
    sealMeshes.forEach((m, i) => (m.material = halfLooks[i]));
    shadowMeshes.forEach((m, i) => (m.material = halfShades[i]));
    crackGlow.material = glowMaterial;
    dirty = true;
  }

  /* Kapı aralığından sızan ışık; kanatlar açılırken huzmeye dönüşür. */
  const seamAlpha = seamTexture();
  textures.push(seamAlpha);
  const seamMaterial = new THREE.MeshBasicMaterial({
    color: lightColor,
    alphaMap: seamAlpha,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const seam = meshIn(kit, new THREE.PlaneGeometry(0.14, 1), seamMaterial, fixtures, 0, 0, 0.08);

  /* Kanatların ardındaki ışık ve huzmedeki parçacıklar. */
  const inner = createInnerGlow(`#${lightColor.getHexString()}`);
  scene.add(inner.mesh);
  inner.mesh.position.z = -0.45;
  disposers.push(inner.dispose);
  const particles = door.atmosphere
    ? createParticles(door.atmosphere, `#${lightColor.getHexString()}`, cinematic ? 150 : 80, {
        width: 3.4,
        height: 9,
        depth: 2.6,
      })
    : undefined;
  if (particles) {
    scene.add(particles.points);
    disposers.push(particles.dispose);
  }

  /* Takılan parçalar. */
  const knocker = buildKnocker(kit);
  const ribbon = buildRibbon(kit);
  const handles = door.handles
    ? buildHandles(kit, { color: door.metal, offset: 0.52, length: 1.05, radius: 0.03 })
    : undefined;
  const keyhole = surface.features.keyhole;
  const keyFixture = keyhole ? buildKey(kit, keyhole) : undefined;
  const glass = surface.features.glass
    ? buildGlass(surface.features.glass, surface.width / surface.height, `#${lightColor.getHexString()}`)
    : undefined;
  const panes: THREE.Mesh[] = [];
  if (glass) {
    faces.forEach((leaf, side) => {
      const pane = new THREE.Mesh(leaf.geometry, glass.material);
      pane.position.copy(leaf.position);
      pane.position.z = 0.003;
      hinges[side].add(pane);
      panes.push(pane);
    });
    disposers.push(glass.dispose);
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
    frozen = false,
    animating = 0,
    sealWorldY = 0,
    fw = 1,
    fh = 1;
  let timeline: gsap.core.Timeline | undefined;
  let openingElapsed = 0;
  let previousFrame = 0;
  const pointer = { x: 0, y: 0 };
  const tilted = { x: 0, y: 0, tx: 0, ty: 0, live: false };
  const sweep = { value: 0 };
  const hold = { value: 0 };
  const push = { value: 0 };
  let holdTween: gsap.core.Tween | undefined;
  let glintTimer = 0;
  let glintCount = 0;
  let glintTween: gsap.core.Timeline | undefined;
  let clock = 0;
  let slowFrames = 0;
  let frameEma = 16;
  let skip = false;

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

  const toPlaneY = (imageY: number) => (imageY - (1 - fh) / 2) / fh;
  const toPlaneX = (imageX: number) => (imageX - (1 - fw) / 2) / fw;

  function layout() {
    const imageAspect = surface.width / surface.height;
    const planeAspect = (LEAF_W * 2) / planeHeight;
    fw = 1;
    fh = 1;
    if (surface.fit === 'cover') {
      if (planeAspect < imageAspect) fw = planeAspect / imageAspect;
      else fh = imageAspect / planeAspect;
    }
    // Her kanat görselin kendi yarısını gösterir (bütün haritalar aynı UV'yi kullanır).
    faces.forEach((leaf, side) => {
      const uv = leaf.geometry.attributes.uv as THREE.BufferAttribute;
      const base = baseUvs[side];
      const u0 = side === 0 ? 0.5 - fw / 2 : 0.5;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, u0 + base[i * 2] * (fw / 2), (1 - fh) / 2 + base[i * 2 + 1] * fh);
      uv.needsUpdate = true;
    });
    relief.uUvScale.value.set((LEAF_W * 2) / (fw * planeHeight), 1 / fh);
    const scaleY = doors.scale.y;
    sealWorldY = (0.5 - toPlaneY(door.y)) * planeHeight;
    for (const holder of sealHolders) {
      holder.position.y = sealWorldY / scaleY;
      holder.scale.set(1, 1 / scaleY, 1);
    }
    crackGlow.position.y = sealWorldY;
    wholeSeal.position.y = sealWorldY;
    seam.scale.y = planeHeight;
    inner.mesh.scale.set(4.4, planeHeight * 1.1, 1);
    inner.mesh.position.y = sealWorldY * 0.5;
    const l: Layout = { scaleY, planeHeight, sealWorldY, toPlaneX, toPlaneY };
    knocker?.layout(l);
    ribbon?.layout(l);
    handles?.layout(l);
    keyFixture?.layout(l);
    doors.updateMatrixWorld(true);
    fixtures.updateMatrixWorld(true);
    const unit = (width / 4) * SEAL_WORLD;
    const anchors: DoorAnchors = {
      seal: { ...screen(sealHolders[0]), size: unit },
    };
    if (knocker) {
      const { point, release } = knocker.ringPoint();
      anchors.knocker = { ...screen(point), size: (width / 4) * 0.5 };
      release();
    }
    if (ribbon) {
      const { point, release } = ribbon.tipPoint();
      anchors.ribbon = { ...screen(point), width: (width / 4) * 0.7, height: (width / 4) * 1.1 };
      release();
    }
    if (keyFixture) {
      const saved = keyFixture.pivot.rotation.z;
      keyFixture.turn(0);
      const base = keyFixture.along(0);
      const tip = keyFixture.along(1);
      doors.updateMatrixWorld(true);
      const a = screen(base.point);
      const b = screen(tip.point);
      base.release();
      tip.release();
      keyFixture.pivot.rotation.z = saved;
      anchors.key = { x: a.x, y: a.y, tipX: b.x, tipY: b.y, size: (width / 4) * 0.62 };
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
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(viewHeight / (CAMERA_Z * 2)));
    camera.updateProjectionMatrix();
    doors.scale.y = planeHeight;
    if (particles) particles.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    layout();
    dirty = true;
    render();
  }
  applySeal(initialSeal, initialWax);
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  /* Beklerken ara ara kabartmalarda ince bir parıltı geçer. */
  const waveDoor = hasWave(door) && Boolean(maps.glow);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function glint() {
    if (!waveDoor || opening || active || paused || reduceMotion.matches) return;
    glintTween?.kill();
    glintTween = gsap
      .timeline({
        onUpdate: () => {
          dirty = true;
        },
      })
      .set(relief.uGlint, { value: -0.85 })
      .to(relief.uGlintStrength, { value: finishKind === 'matte' ? 0.55 : 0.8, duration: 0.5 }, 0)
      .to(relief.uGlint, { value: 0.85, duration: 2.1, ease: 'sine.inOut' }, 0)
      .to(relief.uGlintStrength, { value: 0, duration: 0.6 }, 1.5);
    glintCount += 1;
  }

  function frame(now: number) {
    if (destroyed || document.hidden || paused) return;
    const dt = previousFrame ? Math.min(0.1, (now - previousFrame) / 1000) : 1 / 60;
    if (opening && timeline && !frozen) {
      openingElapsed += dt;
      // Görünür geçen süreyle ilerle: yavaş GPU'da GSAP gecikme telafisi açılışı uzatmasın.
      timeline.totalTime(openingElapsed, false);
    }
    previousFrame = now;
    clock += dt;
    if (waveDoor && !opening && !active) {
      glintTimer += dt;
      if (glintTimer > (glintCount ? 6.5 : 1.4) && glintCount < 7) {
        glintTimer = 0;
        glint();
      }
    }
    // Işık parmağı ve telefonun eğimini yumuşakça izler.
    tilted.x += (tilted.tx - tilted.x) * Math.min(1, dt * 6);
    tilted.y += (tilted.ty - tilted.y) * Math.min(1, dt * 6);
    const lx = -2.7 + pointer.x * 1.4 + tilted.x * 1.6 + sweep.value * 3;
    const ly = 4 + pointer.y * 1.2 + tilted.y * 1.4;
    if (Math.abs(key.position.x - lx) + Math.abs(key.position.y - ly) > 0.002) dirty = true;
    key.position.set(lx, ly, 6);
    if (glass?.update(dt)) dirty = true;
    const glinting = Boolean(glintTween?.isActive());
    const live = dirty || opening || animating > 0 || glinting;
    if (!live) return;
    // Parıltı yalnızca süs: saniyede 30 kare yeter, pil korunur.
    skip = glinting && !opening && !animating && !dirty ? !skip : false;
    if (skip) return;
    if (particles) particles.uniforms.uTime.value = clock;
    render();
    // Yavaş cihazda çözünürlüğü kademeli düşür.
    if (opening || animating > 0) {
      frameEma = frameEma * 0.9 + dt * 1000 * 0.1;
      slowFrames = frameEma > 30 ? slowFrames + 1 : 0;
      if (slowFrames > 40 && pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio - 0.35);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height);
        if (particles) particles.uniforms.uPixelRatio.value = pixelRatio;
        slowFrames = 0;
      }
    }
  }
  const onPointer = (event: PointerEvent) => {
    if (paused || active) return;
    const rect = host.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / Math.max(1, width) - 0.5) * 2;
    pointer.y = -((event.clientY - rect.top) / Math.max(1, height) - 0.5) * 2;
    dirty = true;
  };
  const onTilt = (event: DeviceOrientationEvent) => {
    if (paused || active || event.gamma == null || event.beta == null) return;
    tilted.live = true;
    tilted.tx = Math.max(-1, Math.min(1, event.gamma / 28));
    tilted.ty = Math.max(-1, Math.min(1, (event.beta - 50) / 28));
  };

  function spawnCrumbs() {
    const material = new THREE.MeshStandardMaterial({
      color: tone.color,
      roughness: 0.35,
      metalness: tone.metal,
      envMap: environment,
    });
    materials.push(material);
    for (let i = 0; i < 11; i++) {
      const crumb = new THREE.Mesh(crumbGeometry, material);
      const t = (i / 10 - 0.5) * SEAL_WORLD * 0.72;
      crumb.position.set((Math.random() - 0.5) * 0.05, sealWorldY + t, 0.12);
      crumb.scale.set(0.6 + Math.random() * 0.8, 0.4 + Math.random() * 0.6, 0.35 + Math.random() * 0.4);
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
      tween(crumb.scale, { x: 0, y: 0, z: 0, delay: 0.7 + Math.random() * 0.4, duration: 0.35 });
    }
  }

  function finish() {
    timeline?.kill();
    glintTween?.kill();
    opening = false;
    active = true;
    doors.visible = false;
    fixtures.visible = false;
    inner.mesh.visible = false;
    if (particles) particles.points.visible = false;
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
  window.addEventListener('pointermove', onPointer, { passive: true });
  if (tilt) window.addEventListener('deviceorientation', onTilt, { passive: true });
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

  /** Açılış zaman çizelgesi; süre sonunda `finish`. */
  function buildOpening() {
    const tl = gsap.timeline({ paused: true, onComplete: finish });
    let crackAt = 0;
    if (keyFixture) {
      // Anahtar son çeyreğini tamamlar, kilit dili "tak" diye çekilir.
      tl.to(keyFixture.pivot.rotation, { z: Math.PI / 2, duration: 0.3, ease: 'power2.out' }, 0)
        .to(keyFixture.pivot.position, { z: 0.05, duration: 0.08, yoyo: true, repeat: 1 }, 0.3)
        .call(() => onCue?.('unlock'), [], 0.3);
      crackAt = 0.45;
    }
    if (glass) {
      // Kalan buğu çekilir, sıcak ışık camı doldurur.
      tl.to(glass.uniforms.uFog, { value: 0, duration: 0.8, ease: 'sine.out' }, 0);
      crackAt = 0.35;
    }
    crackInto(tl, crackAt);
    let doorsAt = crackAt + (cinematic ? 0.95 : 0.7);
    if (ribbon) {
      doorsAt = 1.35;
      ribbon.openInto(tl);
    }
    if (waveDoor) {
      tl.set(relief.uWave, { value: 0 }, crackAt + 0.15)
        .to(relief.uWaveStrength, { value: cinematic ? 1.25 : 0.9, duration: 0.35 }, crackAt + 0.15)
        .to(relief.uWave, { value: 0.78, duration: 1.9, ease: 'sine.out' }, crackAt + 0.15)
        .to(relief.uWaveStrength, { value: 0, duration: 0.9 }, crackAt + 1.35);
    }
    const doorTime = cinematic ? 3 : 2.3;
    tl.call(() => onCue?.('doors'), [], doorsAt).to(sweep, { value: 1, duration: 1.6 }, crackAt + 0.25);
    if (door.motion === 'slide') {
      // Sürgülü kanatlar raylarında iki yana kayar.
      tl.to(hinges[0].position, { x: -LEAF_W - 2.25, duration: doorTime * 0.85, ease: 'power2.inOut' }, doorsAt)
        .to(hinges[1].position, { x: LEAF_W + 2.25, duration: doorTime * 0.85, ease: 'power2.inOut' }, doorsAt + 0.06);
    } else {
      tl.to(hinges[0].rotation, { y: -Math.PI * 0.55, duration: doorTime, ease: 'power1.inOut' }, doorsAt)
        .to(hinges[1].rotation, { y: Math.PI * 0.55, duration: doorTime, ease: 'power1.inOut' }, doorsAt + 0.12);
    }
    // Aralıktan taşan ışık huzmeye dönüşür, sonra söner.
    tl.to(seam.scale, { x: door.motion === 'slide' ? 9 : 5, duration: doorTime * 0.5, ease: 'power1.in' }, doorsAt)
      .to(seamMaterial, { opacity: 0.24, duration: 0.4 }, doorsAt)
      .to(seamMaterial, { opacity: 0, duration: 0.8 }, doorsAt + doorTime * 0.22)
      .to(inner.material, { opacity: cinematic ? 0.5 : 0.36, duration: doorTime * 0.35 }, doorsAt + 0.1)
      .to(inner.material, { opacity: 0, duration: doorTime * 0.4 }, doorsAt + doorTime * 0.42)
      .to(sweep, { value: 0, duration: 1.4 }, doorsAt + 1.3);
    if (glass) {
      tl.to(glass.uniforms.uGlow, { value: 0.35, duration: 0.6 }, doorsAt - 0.4)
        .to(glass.uniforms.uFade, { value: 1, duration: doorTime * 0.45 }, doorsAt + 0.3);
    }
    if (particles) {
      tl.to(particles.uniforms.uOpacity, { value: 1, duration: 0.8 }, doorsAt + 0.1).to(
        particles.uniforms.uOpacity,
        { value: 0, duration: 0.9 },
        doorsAt + doorTime - 0.7,
      );
    }
    if (cinematic) {
      // Kamera eşikten içeri süzülür.
      tl.to(push, {
        value: 1,
        duration: doorTime + 0.2,
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.position.z = CAMERA_Z - push.value * 2.6;
          camera.position.y = sealWorldY * 0.25 * push.value;
        },
      }, doorsAt + 0.15);
    }
    return tl;
  }

  function begin() {
    holdTween?.kill();
    glintTween?.kill();
    relief.uGlintStrength.value = 0;
    openingElapsed = 0;
    previousFrame = performance.now();
    timeline = buildOpening();
  }

  function eventToUv(clientX: number, clientY: number) {
    const rect = host.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(faces, false)[0];
    return hit?.uv ?? null;
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
      if (!knocker || opening || active) return;
      const pivot = knocker.pivot;
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
      if (!ribbon || opening || active) return;
      ribbon.pull(progress);
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
    /** Anahtarın dönüşü (0–1); 1'de kilit açılmaya hazırdır. */
    turnKey(progress: number) {
      if (!keyFixture || opening || active) return;
      keyFixture.turn(progress * 0.94);
      glowMaterial.opacity = Math.max(0, progress - 0.6) * 0.5;
      dirty = true;
    },
    /** Sürgülü kanatları zorlama (0–1): mühür gerilir, aralıktan ışık sızar. */
    strain(progress: number) {
      if (opening || active) return;
      const p = Math.min(1, Math.max(0, progress));
      const eased = 1 - (1 - p) ** 2;
      hinges[0].position.x = -LEAF_W - eased * 0.05;
      hinges[1].position.x = LEAF_W + eased * 0.05;
      wholeSeal.scale.set(1 + eased * 0.035, 1 - eased * 0.012, 1);
      wholeSeal.position.x = p > 0.7 ? (Math.random() - 0.5) * 0.008 : 0;
      seamMaterial.opacity = eased * 0.34;
      glowMaterial.opacity = Math.max(0, p - 0.45) * 0.6;
      dirty = true;
    },
    /** Buğuyu siler; ekran koordinatı alır, silinen oranı döndürür. */
    wipeAt(clientX: number, clientY: number) {
      if (!glass || opening || active) return glass?.progress ?? 0;
      const uv = eventToUv(clientX, clientY);
      if (!uv) return glass.progress;
      dirty = true;
      return glass.wipe(uv.x, uv.y);
    },
    wipeEnd() {
      glass?.wipe(0, 0, true);
    },
    /** Klavye/erişilebilirlik: buğuyu kendiliğinden siler. */
    autoWipe() {
      return new Promise<void>((resolve) => {
        if (!glass || opening || active) return resolve();
        const path = { t: 0 };
        tween(path, {
          t: 1,
          duration: 1.1,
          ease: 'sine.inOut',
          onUpdate: () => {
            const t = path.t;
            const u = 0.18 + 0.64 * (0.5 + 0.5 * Math.sin(t * Math.PI * 5 - Math.PI / 2));
            const v = 0.78 - t * 0.5;
            glass.wipe(u, v);
          },
          onComplete: () => {
            glass.wipe(0, 0, true);
            resolve();
          },
        });
      });
    },
    get wipeProgress() {
      return glass?.progress ?? 0;
    },
    open(instant = false) {
      if (active) return;
      if (instant) {
        finish();
        return;
      }
      if (opening) return;
      opening = true;
      if (paused || reduceMotion.matches) {
        finish();
        return;
      }
      begin();
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
    /** Kapak pişirme ve atölye önizlemesi: mührü gizler, parıltıyı durdurur. */
    setSealVisible(visible: boolean) {
      if (opening || active) return;
      wholeSeal.visible = visible;
      if (!visible) {
        glintTween?.kill();
        relief.uGlintStrength.value = 0;
        glintCount = 99;
      }
      dirty = true;
      render();
    },
    /** Önizleme ve testler için: açılışı belirli bir ana sarar ve dondurur. */
    seek(seconds: number) {
      if (active) return;
      if (!opening) {
        opening = true;
        begin();
      }
      frozen = true;
      openingElapsed = seconds;
      timeline!.totalTime(Math.min(seconds, timeline!.totalDuration() - 0.001), false);
      if (particles) particles.uniforms.uTime.value = seconds;
      dirty = true;
      render();
    },
    dispose() {
      destroyed = true;
      timeline?.kill();
      holdTween?.kill();
      glintTween?.kill();
      gsap.killTweensOf([hold, sweep, push]);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.setAnimationLoop(null);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      sealMaterials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      sealTextures.forEach((t) => t.dispose());
      disposers.forEach((d) => d());
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export type DoorScene = Awaited<ReturnType<typeof createDoorScene>>;
