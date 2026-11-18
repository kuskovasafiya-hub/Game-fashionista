import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_LOOK, type Look, type Outfit } from '../art/Doll';
import { DEPT_SLOTS, ITEM_BY_ID, RARITY, SHOPS, STARTER, shopFixtures, shopItems, type Dept, type Item, type Rarity, type Slot } from './catalog';
import { DUP_PRIZE_GEMS, EVENTS_LEVEL, RESULT_DELAY_MS, activeEvents, starsFor, dressCodeMatch, eventByKey, hasClothes, rewardFor, scoreLook, seedOf, type Reward, type Score } from './events';
import { STORY_STEPS, chapterOf, migrateStoryStars, stepById, storyReward, storyStars, type StoryReward } from './story';

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
export const START_TICKETS = 3;
export const VOTES_PER_TICKET = 10;
export const MAJORITY_COINS = 5;
/** Crystals to see an event result right away. */
export const RUSH_GEMS = 2;
export const TICKET_GEMS = 3;
/** Crystals for buying the last piece of a shop fixture. */
export const SHELF_DONE_GEMS = 2;
const SAVE_KEY = 'modshop-save-v2';

/* ---------- first steps (tutorial) ---------- */

/**
 * The newcomer's path: a housewarming gift → shopping → trying it on in the wardrobe →
 * the first story scene → events (from level 2). Each stage only shows hints; nothing is forced.
 */
export const TUT_STAGES = ['gift', 'shop', 'wardrobe', 'story', 'events', 'done'] as const;
export type TutStage = typeof TUT_STAGES[number];
/** The housewarming gift right after creating the character. */
export const GIFT_COINS = 3000;
export const GIFT_ENERGY = 30;
/** The first searches ignore the shelf cooldown, so the gift can be spent at once. */
export const NEWBIE_SEARCHES = 40;
/** …and the very first ones find the cheapest common pieces of the shelf. */
export const NEWBIE_COMMON = 6;
/**
 * The newcomer's lucky find: on her 3rd search in «Городской» a rare sundress always turns up
 * (it also fits the beach scene of chapter 1). Shown with the rare glow and its own line.
 */
export const TUT_RARE_ID = 'city-dress-sundress-1';
export const TUT_RARE_AT = 3;
/** Purchases before the tutorial sends her to the wardrobe. */
export const TUT_BUYS = 3;

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
  /** Best stars per story scene (story.ts step id), 3,35–5; a scene is passed with anything above 0. */
  story: Record<string, number>;
  /** When each shop fixture (`<shop>:<fixture>`) can be searched again. */
  shelfAt: Record<string, number>;
  /** Tutorial stage; saves from before it count as done. */
  tut: TutStage;
  /** Searches left that skip the shelf cooldown (newcomer's gift). */
  freeSearches: number;
  /** The newcomer's one extra handful of cups (when she runs dry while still searching for free) is spent. */
  tutRefill?: boolean;
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
    tut: 'gift', freeSearches: 0,
  };
}

/** The whole starter set from character creation always stays in the wardrobe. */
const STARTER_IDS = STARTER.map((i) => i.id);
function withStarter(s: Save): Save {
  if (!s.created || STARTER_IDS.every((id) => s.owned.includes(id))) return s;
  return {
    ...s,
    owned: [...new Set([...STARTER_IDS, ...s.owned])],
    discovered: [...new Set([...STARTER_IDS, ...s.discovered])],
  };
}

function load(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // a save from before the tutorial: that player already knows the game
      if (data.created && !data.tut) data.tut = 'done';
      // looks scored before fractional stars: recount from the stored total (old 1–5 → 3,35–5)
      if (Array.isArray(data.entries)) {
        data.entries = data.entries.map((e: Entry) => ({ ...e, score: { ...e.score, stars: starsFor(e.score.total) } }));
      }
      if (data.story) {
        data.story = Object.fromEntries(Object.entries(data.story as Record<string, number>).map(([k, n]) => [k, migrateStoryStars(n)]));
      }
      return withStarter({ ...fresh(), ...data });
    }
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
  // Keep anything already owned (the debug panel can reopen this screen mid-game) plus the whole starter set.
  commit(withStarter({ ...state, created: true, name, look, outfit }));
}

const tutIndex = (t: TutStage) => TUT_STAGES.indexOf(t);
/** Move the tutorial forward to `stage` (never back). */
function reached(s: Save, stage: TutStage): Save {
  return tutIndex(stage) > tutIndex(s.tut) ? { ...s, tut: stage } : s;
}
export function reachTut(stage: TutStage) {
  const next = reached(state, stage);
  if (next !== state) commit(next);
}

/** The housewarming gift: coins, cups and searches without waiting. */
export function claimGift() {
  if (state.tut !== 'gift') return;
  commit({
    ...state, tut: 'shop',
    coins: state.coins + GIFT_COINS, energy: state.energy + GIFT_ENERGY, freeSearches: NEWBIE_SEARCHES,
  });
}

/** Cups in the newcomer's one top-up. */
export const NEWBIE_REFILL = 20;
/** She ran out of cups while still on her free searches: one top-up, once. */
export const canNewbieRefill = (s: Save = state) => !s.tutRefill && s.freeSearches > 0;
export function newbieRefill() {
  if (!canNewbieRefill()) return;
  commit({ ...state, energy: state.energy + NEWBIE_REFILL, tutRefill: true });
}

/** Bought pieces (the starter set does not count). */
export const boughtCount = (s: Save = state) => s.owned.filter((id) => ITEM_BY_ID[id]?.shop !== 'starter').length;

/** Events open at level 2, and only once she has played her first story scene. */
export const eventsOpen = (s: Save = state) => s.level >= EVENTS_LEVEL && tutIndex(s.tut) >= tutIndex('events');

/** A copy of the outfit with the item put on (a dress replaces top and bottom and vice versa). */
export function withItem(outfit: Outfit, item: Item): Outfit {
  const next: Outfit = { ...outfit, [item.slot]: item.id };
  if (item.slot === 'dress') { delete next.top; delete next.bottom; }
  if (item.slot === 'top' || item.slot === 'bottom') delete next.dress;
  return next;
}

export function equip(itemId: string) {
  const item = ITEM_BY_ID[itemId];
  if (!item || !state.owned.includes(itemId)) return;
  let outfit: Outfit;
  if (state.outfit[item.slot] === itemId) {
    outfit = { ...state.outfit };
    delete outfit[item.slot];
  } else outfit = withItem(state.outfit, item);
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

export function toggleWish(itemId: string) {
  const wish = state.wish.includes(itemId) ? state.wish.filter((i) => i !== itemId) : [...state.wish, itemId];
  commit({ ...state, wish });
}

/* ---------- shopping ---------- */

export interface SearchResult {
  item: Item; pity: boolean; levelUp: LevelUp | null;
  /** The newcomer's guaranteed rare find (TUT_RARE_ID). */
  lucky?: boolean;
}

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

/** The lucky sundress is due: her 3rd newcomer search or later, and it has not turned up yet. */
export const luckyPending = (s: Save = state) => s.freeSearches > 0 && NEWBIE_SEARCHES - s.freeSearches >= TUT_RARE_AT - 1
  && !s.discovered.includes(TUT_RARE_ID) && !s.owned.includes(TUT_RARE_ID) && !!ITEM_BY_ID[TUT_RARE_ID];

/**
 * Search one fixture of a shop: only pieces the player does not own yet can turn up,
 * and the fixture then rests for SHELF_COOLDOWN_MS.
 */
export function search(shopId: string, fixtureId: string): SearchResult | null {
  tickEnergy();
  const cost = searchCost(shopId);
  if (state.energy < cost) return null;
  const free = state.freeSearches > 0;
  if (!free && shelfReadyAt(shopId, fixtureId) > Date.now()) return null;
  const pool = shelfLeft(shopId, fixtureId);
  if (!pool.length) return null;

  let { rarity, pity } = rollRarity(state);
  // The find always comes from the shelf she tapped. The roll decides the rarity, so rares stay rare:
  // if this shelf has nothing of the rolled rarity, the nearest one down, and only when nothing lower is
  // left on it, up. (An unanswered guarantee keeps counting until she searches a shelf that has a rare.)
  const order: Rarity[] = ['epic', 'rare', 'common'];
  const from = order.indexOf(rarity);
  const tries = [...order.slice(from), ...order.slice(0, from).reverse()];
  let candidates: Item[] = [];
  for (const r of tries) {
    candidates = pool.filter((i) => i.rarity === r);
    if (candidates.length) { if (r !== rarity) pity = false; rarity = r; break; }
  }
  // the newcomer's first finds: the cheapest common pieces of this shelf
  if (state.freeSearches > NEWBIE_SEARCHES - NEWBIE_COMMON) {
    const commons = pool.filter((i) => i.rarity === 'common');
    if (commons.length) {
      candidates = [...commons].sort((a, b) => a.price - b.price).slice(0, 3);
      rarity = 'common';
      pity = false;
    }
  }
  // the lucky sundress waits for its own moment (below)
  if (candidates.length > 1) candidates = candidates.filter((i) => i.id !== TUT_RARE_ID);
  let item = weightedPick(candidates, state);
  // the lucky find: from her 3rd newcomer search on, the first search of the sundress's own shelf brings it
  const lucky = luckyPending() && free && shopId === 'city' && pool.some((i) => i.id === TUT_RARE_ID);
  if (lucky) { item = ITEM_BY_ID[TUT_RARE_ID]; pity = false; }

  const wasFull = state.energy >= ENERGY_MAX;
  let next: Save = {
    ...state,
    energy: state.energy - cost,
    energyTs: wasFull ? Date.now() : state.energyTs,
    pityRare: item.rarity === 'common' ? state.pityRare + 1 : 0,
    pityEpic: item.rarity === 'epic' ? 0 : state.pityEpic + 1,
    discovered: state.discovered.includes(item.id) ? state.discovered : [...state.discovered, item.id],
    shelfAt: free ? state.shelfAt : { ...state.shelfAt, [shelfKey(shopId, fixtureId)]: Date.now() + SHELF_COOLDOWN_MS },
    freeSearches: free ? state.freeSearches - 1 : 0,
  };
  let levelUp: LevelUp | null;
  [next, levelUp] = withXp(next, 2);
  commit(next);
  return { item, pity, levelUp, lucky };
}

/** Pay crystals to restock a resting fixture now. */
export function rushShelf(shopId: string, fixtureId: string): boolean {
  if (state.gems < SHELF_RUSH_GEMS || shelfReadyAt(shopId, fixtureId) <= Date.now()) return false;
  commit({ ...state, gems: state.gems - SHELF_RUSH_GEMS, shelfAt: { ...state.shelfAt, [shelfKey(shopId, fixtureId)]: 0 } });
  return true;
}

export const canAfford = (item: Item, s: Save = state) => s.coins >= item.price && s.gems >= (item.gems ?? 0);

export interface BuyResult { ok: boolean; levelUp: LevelUp | null; /** Crystals for completing the fixture, 0 if not. */ shelfGems: number }

export function buy(itemId: string): BuyResult {
  const item = ITEM_BY_ID[itemId];
  if (!item || state.owned.includes(itemId) || !canAfford(item)) return { ok: false, levelUp: null, shelfGems: 0 };
  const owned = [...state.owned, itemId];
  // the last piece of its fixture: a small crystal bonus for collecting the whole shelf
  const fx = shopFixtures(item.shop).find((f) => f.items.some((i) => i.id === itemId));
  const shelfGems = fx && fx.items.every((i) => owned.includes(i.id)) ? SHELF_DONE_GEMS : 0;
  let next: Save = {
    ...state,
    coins: state.coins - item.price,
    gems: state.gems - (item.gems ?? 0) + shelfGems,
    owned,
    wish: state.wish.filter((i) => i !== itemId),
  };
  // three buys: straight on to the story (its first scene is a fitting room, so she tries the new things on there)
  if (boughtCount(next) >= TUT_BUYS) next = reached(next, 'story');
  let levelUp: LevelUp | null;
  [next, levelUp] = withXp(next, RARITY[item.rarity].xp);
  commit(next);
  return { ok: true, levelUp, shelfGems };
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
  const reward = storyReward(step, before === 0 && stars > 0, before < 5 && stars === 5);
  let next: Save = {
    ...state,
    story: { ...state.story, [stepId]: best },
    coins: state.coins + reward.coins,
    gems: state.gems + reward.gems,
    energy: state.energy + reward.energy,
  };
  if (stars > 0) next = reached(next, 'events');
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

export interface Claim { reward: Reward; /** The prize was already owned and paid out in crystals instead. */ dupGems: number; levelUp: LevelUp | null }

export function claimEntry(key: string): Claim | null {
  const e = entryFor(key);
  const ev = eventByKey(key);
  if (!e || !ev || e.claimed || e.resultAt > Date.now()) return null;
  const reward = rewardFor(ev, e.score.stars);
  const prize = reward.item && ITEM_BY_ID[reward.item];
  const dup = !!prize && state.owned.includes(prize.id);
  const dupGems = dup ? DUP_PRIZE_GEMS[prize.rarity] : 0;
  const now = Date.now();
  let next: Save = {
    ...state,
    coins: state.coins + reward.coins,
    gems: state.gems + reward.gems + dupGems,
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
  return { reward, dupGems, levelUp };
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
    if (data.created && !data.tut) data.tut = 'done';
    commit(withStarter({ ...fresh(), ...data }));
    return true;
  } catch { return false; }
}
