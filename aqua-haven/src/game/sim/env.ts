import { BAL } from '../balance';
import { getSpecies } from '../../data/species';
import { getPlant } from '../../data/plants';
import { getDecor } from '../../data/decor';
import { getEquip } from '../../data/equipment';
import { getTier } from '../../data/tanks';
import type { SpawnSite, TankState } from '../types';

/** Bir tankın o anki ortam özetini (ekipman, dekor, nüfus) hesaplar */
export interface TankEnv {
  cap: number;
  used: number;
  ratio: number; // büyümeye göre ağırlıklı stok oranı
  liters: number;
  area: number;
  filterEff: number;
  dirtClean: number;
  o2Prod: number;
  light: number;
  minTemp: number;
  maxTemp: number;
  algaeMult: number;
  sickMult: number;
  plantMult: number;
  hides: boolean;
  sites: Set<SpawnSite>;
  decorIds: Set<string>;
  decorBeauty: number;
  plantCount: number;
  plantClean: number; // saatlik
  floating: number;
  aura: number;
  healer: number;
  scavenger: number;
  algaeEater: number;
  counts: Record<string, number>;
  males: Record<string, number>;
  territorial: { sp: string; size: number }[];
  finNipper: boolean;
  sick: number;
  avgAlgae: number;
}

export function computeEnv(t: TankState): TankEnv {
  const tier = getTier(t.type, t.tier);
  const filter = getEquip('filter', t.equip.filter ?? 0);
  const heater = getEquip('heater', t.equip.heater ?? 0);
  const chiller = getEquip('chiller', t.equip.chiller ?? 0);
  const air = getEquip('air', t.equip.air ?? 0);
  const light = getEquip('light', t.equip.light ?? 0);
  const uv = getEquip('uv', t.equip.uv ?? 0);
  const co2 = getEquip('co2', t.equip.co2 ?? 0);

  const env: TankEnv = {
    cap: tier.cap,
    used: 0,
    ratio: 0,
    liters: tier.liters,
    area: tier.w * tier.h,
    filterEff: filter?.eff ?? 0,
    dirtClean: filter?.dirtClean ?? 0,
    o2Prod: (filter?.o2 ?? 0) + (air?.o2 ?? 0),
    light: light?.light ?? 0,
    minTemp: chiller?.minTemp ?? BAL.ROOM_TEMP,
    maxTemp: heater?.maxTemp ?? BAL.ROOM_TEMP,
    algaeMult: (light?.algaeMult ?? 1) * (uv?.algaeMult ?? 1) * (co2?.algaeMult ?? 1),
    sickMult: uv?.sickMult ?? 1,
    plantMult: co2?.plantMult ?? 1,
    hides: false,
    sites: new Set(),
    decorIds: new Set(),
    decorBeauty: 0,
    plantCount: 0,
    plantClean: 0,
    floating: 0,
    aura: 0,
    healer: 0,
    scavenger: 0,
    algaeEater: 0,
    counts: {},
    males: {},
    territorial: [],
    finNipper: false,
    sick: 0,
    avgAlgae: 0,
  };

  for (const d of t.decor) {
    const def = getDecor(d.def);
    env.decorIds.add(d.def);
    env.decorBeauty += def.beauty;
    if (def.hide) env.hides = true;
    def.sites?.forEach((s) => env.sites.add(s));
    env.o2Prod += def.o2 ?? 0;
    env.aura += def.aura ?? 0;
  }

  for (const p of t.plants) {
    const def = getPlant(p.def);
    const g = 0.3 + 0.7 * p.g;
    env.plantCount++;
    env.decorBeauty += def.beauty * g * 0.5; // bitkiler dekor puanına yarım katkı
    if (def.hide && p.g > 0.3) env.hides = true;
    if (p.g > 0.25) def.sites.forEach((s) => env.sites.add(s));
    if (t.light) env.o2Prod += def.o2 * g;
    env.plantClean += def.clean * BAL.PLANT_CLEAN_MULT * g;
    if (def.type === 'floating') env.floating++;
  }

  let weighted = 0;
  for (const f of t.fish) {
    const sp = getSpecies(f.sp);
    env.used += sp.bioload;
    weighted += sp.bioload * (0.4 + 0.6 * f.g);
    env.counts[f.sp] = (env.counts[f.sp] ?? 0) + 1;
    if (f.sex === 'M') env.males[f.sp] = (env.males[f.sp] ?? 0) + 1;
    if (f.sick) env.sick++;
    for (const tr of sp.traits) {
      switch (tr.id) {
        case 'xpAura': env.aura += tr.v ?? 0; break;
        case 'healer': env.healer += (tr.v ?? 1) * (0.4 + 0.6 * f.g); break;
        case 'scavenger': env.scavenger += (tr.v ?? 1) * (0.4 + 0.6 * f.g); break;
        case 'algaeEater': env.algaeEater += (tr.v ?? 1) * (0.4 + 0.6 * f.g); break;
        case 'territorial': env.territorial.push({ sp: f.sp, size: sp.size * (0.35 + 0.65 * f.g) }); break;
        case 'finNipper': env.finNipper = true; break;
      }
    }
  }
  env.ratio = weighted / tier.cap;
  env.aura = Math.min(BAL.AURA_CAP, env.aura);

  let sum = 0;
  for (const a of t.algae) sum += a;
  env.avgAlgae = sum / t.algae.length;
  return env;
}

/** Kullanıcının ayarlayabileceği sıcaklık aralığı */
export function tempRange(env: TankEnv): [number, number] {
  return [Math.min(env.minTemp, BAL.ROOM_TEMP), Math.max(env.maxTemp, BAL.ROOM_TEMP)];
}
