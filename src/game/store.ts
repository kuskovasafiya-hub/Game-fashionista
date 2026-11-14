import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_LOOK, type Look, type Outfit } from '../art/Doll';
import { DEPT_SLOTS, ITEM_BY_ID, RARITY, SHOPS, shopFixtures, shopItems, type Dept, type Item, type Rarity, type Slot } from './catalog';
import { RESULT_DELAY_MS, activeEvents, dressCodeMatch, eventByKey, hasClothes, rewardFor, scoreLook, seedOf, type Reward, type Score } from './events';
import { STORY_STEPS, chapterOf, stepById, storyReward, storyStars, type StoryReward } from './story';

export const ENERGY_MAX = 20;
export const ENERGY_REGEN_MS = 6 * 60 * 1000;
export const AD_ENERGY = 5;
export const ADS_PER_DAY = 6;
export const PITY_RARE = 15;
/** A fixture in a shop can be searched once in this time. */
export const SHELF_COOLDOWN_MS = 60 * 60 * 1000;
/** Crystals to restock a fixture right away. */
export const SHELF_RUSH_GEMS = 1;
export const PITY_EPIC = 60;
const SELL_SHARE = 0.4;
export const START_TICKETS = 3;
export const VOTES_PER_TICKET = 10;
export const MAJORITY_COINS = 5;
/** Crystals to see an event result right away. */
export const RUSH_GEMS = 2;
export const TICKET_GEMS = 3;
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
  tickets: number;
  /** All votes ever cast; every VOTES_PER_TICKET-th gives a ticket. */
  votes: number;
  entries: Entry[];
  /** Has sent a look to an event at least once: voting opens after that. */
  voteUnlocked: boolean;
  /** Best stars per story scene (story.ts step id); a scene is passed with 1+. */
  story: Record<string, number>;
  /** When each shop fixture (`<shop>:<fixture>`) can be searched again. */
  shelfAt: Record<string, number>;
}

/** A look sent to an event. The score is rolled on submission and revealed at resultAt. */
export interface Entry {
  key: string;
  look: Look;
  outfit: Outfit;
  at: number;
  resultAt: number;
  score: Score;
  claimed?: boolean;
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
    tickets: START_TICKETS, votes: 0, entries: [], voteUnlocked: false, story: {}, shelfAt: {},
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
  const worn = Object.values(outfit).filter(Boolean) as string[];
  // Keep anything already owned: the debug panel can reopen this screen mid-game.
  const owned = [...new Set([...state.owned, ...worn])];
  const discovered = [...new Set([...state.discovered, ...worn])];
  commit({ ...state, created: true, name, look, outfit, owned, discovered });
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

/** Hair, hair colour, makeup, skin: free to change at any time. Looks already sent keep their own copy. */
export function setLook(look: Look) {
  commit({ ...state, look: { ...look } });
}

/** Take everything off: she is left in her underwear. */
export function undressAll() {
  if (Object.keys(state.outfit).length) commit({ ...state, outfit: {} });
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

/** Every piece of the shop (or one of its departments) is in the wardrobe: nothing left to find. */
export const allBought = (shopId: string, dept?: Dept, s: Save = state) => {
  const items = shopItems(shopId, dept);
  return items.length > 0 && items.every((i) => s.owned.includes(i.id));
};

export const shelfKey = (shopId: string, fixtureId: string) => `${shopId}:${fixtureId}`;
/** When a fixture can be searched again (0 or past: now). */
export const shelfReadyAt = (shopId: string, fixtureId: string, s: Save = state) => s.shelfAt?.[shelfKey(shopId, fixtureId)] ?? 0;
/** Pieces on a fixture the player does not have yet. */
export const shelfLeft = (shopId: string, fixtureId: string, s: Save = state) =>
  (shopFixtures(shopId).find((f) => f.id === fixtureId)?.items ?? []).filter((i) => !s.owned.includes(i.id));

/**
 * Search one fixture of a shop: only pieces the player does not own yet can turn up,
 * and the fixture then rests for SHELF_COOLDOWN_MS.
 */
export function search(shopId: string, fixtureId: string): SearchResult | null {
  tickEnergy();
  const cost = searchCost(shopId);
  if (state.energy < cost) return null;
  if (shelfReadyAt(shopId, fixtureId) > Date.now()) return null;
  const pool = shelfLeft(shopId, fixtureId);
  if (!pool.length) return null;

  let { rarity, pity } = rollRarity(state);
  // A fixture may lack the rolled rarity: take the nearest one down, else up.
  const order: Rarity[] = ['epic', 'rare', 'common'];
  const from = order.indexOf(rarity);
  const tries = [...order.slice(from), ...order.slice(0, from).reverse()];
  let candidates: Item[] = [];
  for (const r of tries) {
    candidates = pool.filter((i) => i.rarity === r);
    if (candidates.length) { if (r !== rarity) pity = false; rarity = r; break; }
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
    shelfAt: { ...state.shelfAt, [shelfKey(shopId, fixtureId)]: Date.now() + SHELF_COOLDOWN_MS },
  };
  let levelUp: LevelUp | null;
  [next, levelUp] = withXp(next, 2);
  commit(next);
  return { item, pity, levelUp };
}

/** Pay crystals to restock a resting fixture now. */
export function rushShelf(shopId: string, fixtureId: string): boolean {
  if (state.gems < SHELF_RUSH_GEMS || shelfReadyAt(shopId, fixtureId) <= Date.now()) return false;
  commit({ ...state, gems: state.gems - SHELF_RUSH_GEMS, shelfAt: { ...state.shelfAt, [shelfKey(shopId, fixtureId)]: 0 } });
  return true;
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

/* ---------- story ---------- */

/** The first scene not passed yet (null once the whole story is done). */
export const storyNext = (s: Save = state) => STORY_STEPS.find((st) => !(s.story[st.id] > 0)) ?? null;
/** A scene can be played once the one before it is passed and the chapter's level is reached. */
export function storyOpen(stepId: string, s: Save = state): boolean {
  const i = STORY_STEPS.findIndex((st) => st.id === stepId);
  if (i < 0 || s.level < chapterOf(stepId).level) return false;
  return i === 0 || s.story[STORY_STEPS[i - 1].id] > 0;
}

export type StoryError = 'locked' | 'clothes';
export interface StoryResult { stars: number; match: number; best: number; reward: StoryReward; levelUp: LevelUp | null }

/** Show the current look in a story scene: judged at once by its dress code match. */
export function playStory(stepId: string): StoryResult | StoryError {
  const step = stepById(stepId);
  if (!step || !storyOpen(stepId)) return 'locked';
  if (!hasClothes(state.outfit)) return 'clothes';
  const match = dressCodeMatch(state.outfit, step.tags).total;
  const stars = storyStars(step, match);
  const before = state.story[stepId] ?? 0;
  const best = Math.max(before, stars);
  const reward = storyReward(step, before === 0 && stars > 0, before < 3 && stars === 3);
  let next: Save = {
    ...state,
    story: { ...state.story, [stepId]: best },
    coins: state.coins + reward.coins,
    gems: state.gems + reward.gems,
    energy: state.energy + reward.energy,
  };
  let levelUp: LevelUp | null = null;
  if (reward.xp) [next, levelUp] = withXp(next, reward.xp);
  commit(next);
  return { stars, match, best, reward, levelUp };
}

/* ---------- events ---------- */

export const entryFor = (key: string) => state.entries.find((e) => e.key === key);
/** Voting opens once the player has shown a look anywhere: an event or a story scene (old saves: any entry counts). */
export const canVote = (s: Save = state) =>
  s.voteUnlocked || s.entries.length > 0 || Object.values(s.story).some((n) => n > 0);
export const resultsReady = (now = Date.now()) => state.entries.filter((e) => !e.claimed && e.resultAt <= now);

export type EnterError = 'closed' | 'entered' | 'level' | 'tickets' | 'clothes';

export function enterEvent(key: string): EnterError | null {
  const ev = activeEvents().find((e) => e.key === key);
  if (!ev) return 'closed';
  if (entryFor(key)) return 'entered';
  if (state.level < ev.level) return 'level';
  if (state.tickets < ev.cost) return 'tickets';
  if (!hasClothes(state.outfit)) return 'clothes';
  const at = Date.now();
  const entry: Entry = {
    key, look: { ...state.look }, outfit: { ...state.outfit }, at,
    resultAt: at + RESULT_DELAY_MS,
    score: scoreLook(state.outfit, ev, seedOf(`${key}:${at}`)),
  };
  commit({ ...state, tickets: state.tickets - ev.cost, entries: [...state.entries, entry], voteUnlocked: true });
  return null;
}

/** Pay crystals to see a result now. */
export function rushEntry(key: string): boolean {
  const e = entryFor(key);
  if (!e || e.claimed || e.resultAt <= Date.now() || state.gems < RUSH_GEMS) return false;
  commit({
    ...state, gems: state.gems - RUSH_GEMS,
    entries: state.entries.map((x) => (x.key === key ? { ...x, resultAt: Date.now() } : x)),
  });
  return true;
}

export interface Claim { reward: Reward; /** The prize was already owned and paid out in coins instead. */ dupCoins: number; levelUp: LevelUp | null }

export function claimEntry(key: string): Claim | null {
  const e = entryFor(key);
  const ev = eventByKey(key);
  if (!e || !ev || e.claimed || e.resultAt > Date.now()) return null;
  const reward = rewardFor(ev, e.score.stars);
  const prize = reward.item && ITEM_BY_ID[reward.item];
  const dup = !!prize && state.owned.includes(prize.id);
  const dupCoins = dup ? prize.price : 0;
  const now = Date.now();
  let next: Save = {
    ...state,
    coins: state.coins + reward.coins + dupCoins,
    gems: state.gems + reward.gems,
    tickets: state.tickets + reward.tickets,
    energy: state.energy + reward.energy,
    owned: prize && !dup ? [...state.owned, prize.id] : state.owned,
    discovered: prize && !state.discovered.includes(prize.id) ? [...state.discovered, prize.id] : state.discovered,
    // forget claimed entries a day after their event closed
    entries: state.entries
      .map((x) => (x.key === key ? { ...x, claimed: true } : x))
      .filter((x) => !x.claimed || (eventByKey(x.key)?.end ?? 0) > now - 24 * 3600 * 1000),
  };
  let levelUp: LevelUp | null;
  [next, levelUp] = withXp(next, reward.xp);
  commit(next);
  return { reward, dupCoins, levelUp };
}

export interface VoteResult { majority: boolean; ticket: boolean; levelUp: LevelUp | null }

/** One vote in a pair. Every VOTES_PER_TICKET votes give a ticket and 5 XP. */
export function castVote(majority: boolean): VoteResult {
  const votes = state.votes + 1;
  const ticket = votes % VOTES_PER_TICKET === 0;
  let next: Save = {
    ...state, votes,
    coins: state.coins + (majority ? MAJORITY_COINS : 0),
    tickets: state.tickets + (ticket ? 1 : 0),
  };
  let levelUp: LevelUp | null = null;
  if (ticket) [next, levelUp] = withXp(next, 5);
  commit(next);
  return { majority, ticket, levelUp };
}

export function buyTicket(): boolean {
  if (state.gems < TICKET_GEMS) return false;
  commit({ ...state, gems: state.gems - TICKET_GEMS, tickets: state.tickets + 1 });
  return true;
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
