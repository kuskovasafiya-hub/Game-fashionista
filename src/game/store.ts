import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_LOOK, type Look, type Outfit } from '../art/Doll';
import { DEPT_SLOTS, ITEM_BY_ID, RARITY, SHOPS, shopItems, type Dept, type Item, type Rarity, type Slot } from './catalog';

export const ENERGY_MAX = 20;
export const ENERGY_REGEN_MS = 6 * 60 * 1000;
export const AD_ENERGY = 5;
export const ADS_PER_DAY = 6;
export const PITY_RARE = 15;
export const PITY_EPIC = 60;
const SELL_SHARE = 0.4;
const SAVE_KEY = 'modshop-save-v2';

export interface Save {
  v: 1;
  created: boolean;
  name: string;
  look: Look;
  outfit: Outfit;
  owned: string[];
  discovered: string[];
  wish: string[];
  coins: number;
  gems: number;
  energy: number;
  energyTs: number;
  level: number;
  xp: number;
  pityRare: number;
  pityEpic: number;
  adsDay: string;
  adsCount: number;
}

export interface LevelUp { level: number; coins: number; gems: number; shops: string[] }

export const xpToNext = (level: number) => Math.round(40 * Math.pow(level, 1.4));

function fresh(): Save {
  return {
    v: 1, created: false, name: '',
    look: { ...DEFAULT_LOOK },
    outfit: {}, owned: [], discovered: [], wish: [],
    coins: 1500, gems: 10, energy: ENERGY_MAX, energyTs: Date.now(),
    level: 1, xp: 0, pityRare: 0, pityEpic: 0, adsDay: '', adsCount: 0,
  };
}

function load(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* storage unavailable: start fresh */ }
  return fresh();
}

/* ---------- tiny store ---------- */

let state: Save = load();
const listeners = new Set<() => void>();

function commit(next: Save) {
  state = next;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useGame(): Save {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return state;
}

export const getState = () => state;

/* ---------- energy ---------- */

/** Applies passive regeneration; returns ms until the next cup (0 when full). */
export function tickEnergy(now = Date.now()): number {
  const s = state;
  if (s.energy >= ENERGY_MAX) {
    if (s.energyTs !== now) state = { ...s, energyTs: now };
    return 0;
  }
  const gained = Math.floor((now - s.energyTs) / ENERGY_REGEN_MS);
  if (gained > 0) {
    const energy = Math.min(ENERGY_MAX, s.energy + gained);
    commit({ ...s, energy, energyTs: energy >= ENERGY_MAX ? now : s.energyTs + gained * ENERGY_REGEN_MS });
  }
  return state.energy >= ENERGY_MAX ? 0 : ENERGY_REGEN_MS - (now - state.energyTs);
}

const today = () => new Date().toISOString().slice(0, 10);
export const adsLeft = () => (state.adsDay === today() ? ADS_PER_DAY - state.adsCount : ADS_PER_DAY);

/** Rewarded ad stub — in v0.3 this goes through the Yandex Games SDK. */
export function watchAd(): boolean {
  if (adsLeft() <= 0) return false;
  const d = today();
  commit({
    ...state,
    energy: state.energy + AD_ENERGY,
    adsDay: d,
    adsCount: (state.adsDay === d ? state.adsCount : 0) + 1,
  });
  return true;
}

/* ---------- progression ---------- */

function withXp(s: Save, amount: number): [Save, LevelUp | null] {
  let { level, xp } = s;
  xp += amount;
  let coins = 0, gems = 0;
  const shops: string[] = [];
  const startLevel = level;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    coins += 200 * level;
    gems += 2;
    SHOPS.filter((sh) => sh.level === level).forEach((sh) => shops.push(sh.name));
  }
  if (level === startLevel) return [{ ...s, xp }, null];
  return [
    { ...s, xp, level, coins: s.coins + coins, gems: s.gems + gems, energy: Math.max(s.energy, ENERGY_MAX) + 5 },
    { level, coins, gems, shops },
  ];
}

/* ---------- character ---------- */

export function createCharacter(name: string, look: Look, outfit: Outfit) {
  const owned = Object.values(outfit).filter(Boolean) as string[];
  commit({ ...state, created: true, name, look, outfit, owned, discovered: owned });
}

export function equip(itemId: string) {
  const item = ITEM_BY_ID[itemId];
  if (!item || !state.owned.includes(itemId)) return;
  const outfit: Outfit = { ...state.outfit };
  if (outfit[item.slot] === itemId) {
    delete outfit[item.slot];
  } else {
    outfit[item.slot] = itemId;
    if (item.slot === 'dress') { delete outfit.top; delete outfit.bottom; }
    if (item.slot === 'top' || item.slot === 'bottom') delete outfit.dress;
  }
  commit({ ...state, outfit });
}

export function sellPrice(item: Item) { return Math.round((item.price * SELL_SHARE) / 10) * 10; }

export function sell(itemId: string) {
  const item = ITEM_BY_ID[itemId];
  if (!item || !state.owned.includes(itemId)) return;
  const outfit: Outfit = { ...state.outfit };
  if (outfit[item.slot] === itemId) delete outfit[item.slot];
  commit({ ...state, outfit, owned: state.owned.filter((i) => i !== itemId), coins: state.coins + sellPrice(item) });
}

export function toggleWish(itemId: string) {
  const wish = state.wish.includes(itemId) ? state.wish.filter((i) => i !== itemId) : [...state.wish, itemId];
  commit({ ...state, wish });
}

/* ---------- shopping ---------- */

export interface SearchResult { item: Item; pity: boolean; levelUp: LevelUp | null }

function rollRarity(s: Save): { rarity: Rarity; pity: boolean } {
  if (s.pityEpic + 1 >= PITY_EPIC) return { rarity: 'epic', pity: true };
  if (s.pityRare + 1 >= PITY_RARE) return { rarity: 'rare', pity: true };
  const r = Math.random();
  if (r < RARITY.epic.chance) return { rarity: 'epic', pity: false };
  if (r < RARITY.epic.chance + RARITY.rare.chance) return { rarity: 'rare', pity: false };
  return { rarity: 'common', pity: false };
}

function weightedPick(pool: Item[], s: Save): Item {
  const w = pool.map((i) => (s.owned.includes(i.id) ? 0.25 : 1) * (s.wish.includes(i.id) ? 3 : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let k = 0; k < pool.length; k++) if ((r -= w[k]) <= 0) return pool[k];
  return pool[pool.length - 1];
}

export const searchCost = (shopId: string) => (shopId === 'premium' ? 2 : 1);

export function search(shopId: string, dept: Dept): SearchResult | null {
  tickEnergy();
  const cost = searchCost(shopId);
  if (state.energy < cost) return null;
  const pool = shopItems(shopId, dept);
  if (!pool.length) return null;

  let { rarity, pity } = rollRarity(state);
  const order: Rarity[] = ['epic', 'rare', 'common'];
  // A department may lack some rarity — fall back to the next one down.
  let candidates = pool.filter((i) => i.rarity === rarity);
  for (let k = order.indexOf(rarity); !candidates.length && k < order.length; k++) {
    rarity = order[k];
    candidates = pool.filter((i) => i.rarity === rarity);
    pity = false;
  }
  const item = weightedPick(candidates, state);

  const wasFull = state.energy >= ENERGY_MAX;
  let next: Save = {
    ...state,
    energy: state.energy - cost,
    energyTs: wasFull ? Date.now() : state.energyTs,
    pityRare: item.rarity === 'common' ? state.pityRare + 1 : 0,
    pityEpic: item.rarity === 'epic' ? 0 : state.pityEpic + 1,
    discovered: state.discovered.includes(item.id) ? state.discovered : [...state.discovered, item.id],
  };
  let levelUp: LevelUp | null;
  [next, levelUp] = withXp(next, 2);
  commit(next);
  return { item, pity, levelUp };
}

export function buy(itemId: string): { ok: boolean; levelUp: LevelUp | null } {
  const item = ITEM_BY_ID[itemId];
  if (!item || state.owned.includes(itemId) || state.coins < item.price) return { ok: false, levelUp: null };
  let next: Save = {
    ...state,
    coins: state.coins - item.price,
    owned: [...state.owned, itemId],
    wish: state.wish.filter((i) => i !== itemId),
  };
  let levelUp: LevelUp | null;
  [next, levelUp] = withXp(next, RARITY[item.rarity].xp);
  commit(next);
  return { ok: true, levelUp };
}

export function ownedInSlot(slot: Slot) {
  return state.owned.map((id) => ITEM_BY_ID[id]).filter((i) => i && i.slot === slot);
}

export function deptOf(slot: Slot): Dept {
  return (Object.keys(DEPT_SLOTS) as Dept[]).find((d) => DEPT_SLOTS[d].includes(slot))!;
}

/** Dev helper: wipe progress. */
export function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  commit(fresh());
}

/* ---------- debug panel ---------- */

/** Dev helper: patch the save directly (no rewards, no level-up popups). */
export function debugPatch(patch: Partial<Save> | ((s: Save) => Partial<Save>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  commit({ ...state, ...p });
}

/** Dev helper: grant XP through the normal progression, so level rewards apply. */
export function debugXp(amount: number): LevelUp | null {
  const [next, levelUp] = withXp(state, amount);
  commit(next);
  return levelUp;
}

/** Dev helper: XP needed to reach the next level from the current progress. */
export const xpLeft = () => xpToNext(state.level) - state.xp;

export function debugExport(): string { return JSON.stringify(state); }

export function debugImport(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return false;
    commit({ ...fresh(), ...data });
    return true;
  } catch { return false; }
}
