import { HAIRSTYLES, HAIR_COLOURS, MAKEUPS, SKIN_TONES, type Look, type Outfit } from '../art/Doll';
import { ITEMS, ITEM_BY_ID, type Item, type Rarity, type Slot, type Tag } from './catalog';

/* ---------- seeded randomness ---------- */

export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for game rolls. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(arr: T[], r: () => number): T => arr[Math.floor(r() * arr.length)];
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/* ---------- templates ---------- */

/** What a fitting room needs to know about a scene: its name, look and dress code. */
export interface Theme { id: string; name: string; emoji: string; color: string; tags: Tag[] }

export interface EventTemplate {
  id: string;
  name: string;
  about: string;
  emoji: string;
  color: string;
  /** Dress code: an item fits if it has any of these tags. */
  tags: Tag[];
  /** Entry fee in tickets. Also sets how strong the rivals are. */
  cost: 1 | 2 | 3;
  /** How long submissions are open. */
  hours: number;
  level: number;
}

/**
 * Three tracks run side by side, each cycling through its own list, so the same
 * event never runs twice at once. Lists must be long enough: n × SLOT ≥ longest event.
 */
export const TRACKS: EventTemplate[][] = [
  [
    { id: 'park', name: 'Прогулка в парке', about: 'Солнечный день, кофе навынос и много шагов', emoji: '🌳', color: '#7BC67E', tags: ['casual'], cost: 1, hours: 8, level: 2 },
    { id: 'winter', name: 'Зимняя ярмарка', about: 'Глинтвейн, гирлянды и тёплые вещи', emoji: '❄️', color: '#7FB7F0', tags: ['winter'], cost: 1, hours: 6, level: 2 },
    { id: 'date', name: 'Свидание в кафе', about: 'Мило, но не слишком официально', emoji: '💕', color: '#FF8FB1', tags: ['casual', 'party'], cost: 2, hours: 8, level: 2 },
  ],
  [
    { id: 'beach', name: 'День на пляже', about: 'Песок, солнце и лёгкие ткани', emoji: '🏖️', color: '#FFC15E', tags: ['beach'], cost: 1, hours: 6, level: 2 },
    { id: 'party', name: 'Вечеринка у подруги', about: 'Музыка, танцы и блеск', emoji: '🎉', color: '#C77DFF', tags: ['party'], cost: 1, hours: 8, level: 2 },
    { id: 'resort', name: 'Курортный вечер', about: 'Ужин у моря после заката', emoji: '🌴', color: '#00BBA7', tags: ['beach', 'evening'], cost: 2, hours: 6, level: 2 },
  ],
  [
    { id: 'interview', name: 'Собеседование', about: 'Первое впечатление решает всё', emoji: '💼', color: '#8E9AAF', tags: ['office'], cost: 1, hours: 8, level: 3 },
    { id: 'theater', name: 'Премьера в театре', about: 'Элегантно и со вкусом', emoji: '🎭', color: '#B5838D', tags: ['evening', 'office'], cost: 2, hours: 10, level: 3 },
    { id: 'gallery', name: 'Открытие галереи', about: 'Модная публика и украшения напоказ', emoji: '💎', color: '#F7C548', tags: ['party', 'evening'], cost: 2, hours: 8, level: 5 },
    { id: 'gala', name: 'Бал', about: 'Самые роскошные платья сезона', emoji: '👑', color: '#9B5DE5', tags: ['evening'], cost: 3, hours: 12, level: 7 },
    { id: 'marathon', name: 'Фитнес-марафон', about: 'Удобно, ярко, спортивно', emoji: '🏃‍♀️', color: '#00A6FB', tags: ['sport'], cost: 2, hours: 10, level: 10 },
  ],
];
export const EVENT_TEMPLATES = TRACKS.flat();
/** Events open from this level; before that the player goes through the story. */
export const EVENTS_LEVEL = Math.min(...EVENT_TEMPLATES.map((t) => t.level));

/* ---------- schedule ---------- */

const SLOT_MS = 4 * 3600 * 1000;
/** Track starts are staggered so new events appear more often than once per slot. */
const TRACK_OFFSET = [0, 1.33, 2.67].map((h) => h * 3600 * 1000);
const EPOCH = Date.UTC(2026, 0, 1);
/**
 * How long a sent look stays on vote before its result. 5 minutes for the first playtest, so a
 * tester sees the whole loop (send → vote → result) in one sitting; before release: back to ~15–20.
 */
export const RESULT_DELAY_MS = 5 * 60 * 1000;
/** A story scene look: the same for now (it was 20 minutes, events 30). */
export const STORY_RESULT_MS = 5 * 60 * 1000;

export interface GameEvent extends EventTemplate {
  /** Instance id: `<track>.<slot>`, stable across devices. */
  key: string;
  start: number;
  end: number;
  /** Main prize for five stars. */
  prize: string;
}

function prizeFor(t: EventTemplate, key: string): string {
  const r = rng(seedOf('prize:' + key));
  const rarity: Rarity = t.cost === 3 || r() < 0.25 ? 'epic' : 'rare';
  const fits = ITEMS.filter((i) => i.shop !== 'starter' && i.rarity !== 'common' && i.tags.some((g) => t.tags.includes(g)));
  const pool = fits.filter((i) => i.rarity === rarity);
  return pick(pool.length ? pool : fits, r).id;
}

function instance(track: number, slot: number): GameEvent {
  const list = TRACKS[track];
  const t = list[((slot % list.length) + list.length) % list.length];
  const key = `${track}.${slot}`;
  const start = EPOCH + TRACK_OFFSET[track] + slot * SLOT_MS;
  return { ...t, key, start, end: start + t.hours * 3600 * 1000, prize: prizeFor(t, key) };
}

export function eventByKey(key: string): GameEvent | null {
  const [track, slot] = key.split('.').map(Number);
  if (!TRACKS[track] || !Number.isInteger(slot)) return null;
  return instance(track, slot);
}

/** Events open for submissions right now, soonest to close first. */
export function activeEvents(now = Date.now()): GameEvent[] {
  const out: GameEvent[] = [];
  TRACKS.forEach((list, track) => {
    const cur = Math.floor((now - EPOCH - TRACK_OFFSET[track]) / SLOT_MS);
    const back = Math.ceil(Math.max(...list.map((t) => t.hours)) * 3600 * 1000 / SLOT_MS);
    for (let s = cur - back; s <= cur; s++) {
      const e = instance(track, s);
      if (e.start <= now && now < e.end) out.push(e);
    }
  });
  return out.sort((a, b) => a.end - b.end);
}

/* ---------- scoring ---------- */

export const fits = (item: Item | undefined, tags: Tag[]) => !!item && item.tags.some((t) => tags.includes(t));

const items = (outfit: Outfit) =>
  (Object.values(outfit).filter(Boolean) as string[]).map((id) => ITEM_BY_ID[id]).filter(Boolean);

export const hasClothes = (o: Outfit) => !!(o.dress || (o.top && o.bottom));

export interface Match { total: number; clothes: number; shoes: number; acc: number }

/** Dress code match, 0..1: clothes count most, then shoes, then up to two accessories. */
export function dressCodeMatch(outfit: Outfit, tags: Tag[]): Match {
  const it = (s: Slot) => (outfit[s] ? ITEM_BY_ID[outfit[s]!] : undefined);
  const clothes = outfit.dress
    ? (fits(it('dress'), tags) ? 1 : 0)
    : (fits(it('top'), tags) ? 0.5 : 0) + (fits(it('bottom'), tags) ? 0.5 : 0);
  const shoes = fits(it('shoes'), tags) ? 1 : 0;
  const accFit = (['necklace', 'earrings', 'glasses', 'bracelet', 'bag'] as Slot[]).filter((s) => fits(it(s), tags)).length;
  const acc = Math.min(accFit, 2) / 2;
  return { total: 0.6 * clothes + 0.25 * shoes + 0.15 * acc, clothes, shoes, acc };
}

const RARITY_APPEAL: Record<Rarity, number> = { common: 0.3, rare: 0.65, epic: 1 };

/** How much voters like a look: fitting the theme, rare pieces, and a bit of personal taste. */
export function appeal(outfit: Outfit, tags: Tag[]): number {
  const worn = items(outfit);
  if (!worn.length || !hasClothes(outfit)) return 0;
  const rarity = worn.reduce((a, i) => a + RARITY_APPEAL[i.rarity], 0) / worn.length;
  const taste = rng(seedOf(worn.map((i) => i.id).sort().join()))();
  return 0.55 * dressCodeMatch(outfit, tags).total + 0.3 * rarity + 0.15 * taste;
}

/** Typical rival appeal by entry fee: pricier events draw stronger looks. */
const RIVAL_MEAN = [0, 0.68, 0.71, 0.76];

export interface Score {
  /** Dress code match 0..1 (40% of the result). */
  match: number;
  votes: number;
  voters: number;
  /** 0..1 */
  total: number;
  stars: number;
  place: number;
  players: number;
}

/**
 * Stars are fractional, from MIN_STARS (the weakest look) to 5: piecewise linear in the
 * total score through these points, so 4 / 4.5 / 5 stars sit where the old 3 / 4 / 5 did.
 */
export const MIN_STARS = 3.35;
const STAR_CURVE: [total: number, stars: number][] = [[0.3, MIN_STARS], [0.5, 4], [0.68, 4.5], [0.8, 5]];

export function starsFor(total: number): number {
  if (total <= STAR_CURVE[0][0]) return MIN_STARS;
  for (let i = 1; i < STAR_CURVE.length; i++) {
    const [t1, s1] = STAR_CURVE[i];
    const [t0, s0] = STAR_CURVE[i - 1];
    if (total < t1) return Math.round((s0 + ((total - t0) / (t1 - t0)) * (s1 - s0)) * 100) / 100;
  }
  return 5;
}

/**
 * Reward tier 2..5 for fractional stars: below 4 — tier 2, from 4 — 3 (a ticket back),
 * from 4.5 — 4, a full 5 — the main prize.
 */
export const starTier = (stars: number) => (stars >= 5 ? 5 : stars >= 4.5 ? 4 : stars >= 4 ? 3 : 2);

/** "3,35" / "5" for showing fractional stars. */
export const starsText = (stars: number) => (Number.isInteger(stars) ? String(stars) : stars.toFixed(2).replace('.', ','));

export function scoreLook(outfit: Outfit, ev: Pick<EventTemplate, 'tags' | 'cost'>, seed: number): Score {
  const r = rng(seed);
  const match = dressCodeMatch(outfit, ev.tags).total;
  const mine = appeal(outfit, ev.tags);
  const voters = 30 + Math.floor(r() * 21);
  let votes = 0;
  for (let v = 0; v < voters; v++) {
    const rival = RIVAL_MEAN[ev.cost] + (r() + r() + r() - 1.5) * 0.2;
    if (r() < sigmoid((mine - rival) / 0.1)) votes++;
  }
  const total = 0.4 * match + 0.6 * (votes / voters);
  const stars = starsFor(total);
  const players = 120 + Math.floor(r() * 260);
  const place = Math.max(1, Math.round(1 + Math.pow(1 - total, 1.6) * (players - 1) * (0.85 + r() * 0.3)));
  return { match, votes, voters, total, stars, place: Math.min(place, players), players };
}

/* ---------- rewards ---------- */

/** Crystals instead of a main prize the player already has. */
export const DUP_PRIZE_GEMS: Record<Rarity, number> = { common: 1, rare: 3, epic: 8 };

export interface Reward { coins: number; energy: number; tickets: number; gems: number; xp: number; item?: string }

const STAR_COINS = [0, 100, 250, 450, 700, 1100];
const STAR_ENERGY = [0, 0, 2, 3, 5, 5];

export function rewardFor(ev: GameEvent, starsOrTier: number): Reward {
  const stars = starTier(starsOrTier);
  const mult = 1 + 0.5 * (ev.cost - 1);
  return {
    coins: Math.round((STAR_COINS[stars] * mult) / 10) * 10,
    energy: STAR_ENERGY[stars],
    tickets: stars >= 5 ? ev.cost + 1 : stars >= 4 ? ev.cost : stars >= 3 ? 1 : 0,
    gems: stars >= 5 ? ev.cost : 0,
    xp: 20 + 10 * stars,
    item: stars >= 5 ? ev.prize : undefined,
  };
}

/**
 * The vote result of a story scene look: a small extra — a fifth of a 1-ticket event in coins, a quarter in XP;
 * no prize, no tickets (the story is free) and no cups. Scenes are passed one after another, so their
 * results come in batches: anything bigger floods the wallet.
 */
export function storyVoteReward(starsOrTier: number): Reward {
  const stars = starTier(starsOrTier);
  return { coins: Math.round((STAR_COINS[stars] * 0.2) / 10) * 10, energy: 0, tickets: 0, gems: 0, xp: Math.round((20 + 10 * stars) / 4) };
}

/* ---------- bots for voting ---------- */

export const BOT_NAMES = [
  'Алиса', 'Вика', 'Даша', 'Катя', 'Лиза', 'Маша', 'Настя', 'Оля', 'Полина', 'Соня',
  'Таня', 'Ульяна', 'Яна', 'Мила', 'Ева', 'Кира', 'Лера', 'Нина', 'Злата', 'Варя',
];

export interface BotLook { name: string; look: Look; outfit: Outfit; appeal: number }

/** A random rival look; `skill` is the chance each piece follows the dress code. */
export function botLook(tags: Tag[], r: () => number): BotLook {
  const skill = 0.25 + r() * 0.7;
  const fancy = r();
  const piece = (slot: Slot) => {
    const all = ITEMS.filter((i) => i.slot === slot && (fancy > 0.5 || i.rarity !== 'epic'));
    const good = all.filter((i) => fits(i, tags));
    return pick(r() < skill && good.length ? good : all, r).id;
  };
  const outfit: Outfit = {};
  if (r() < 0.45) outfit.dress = piece('dress');
  else { outfit.top = piece('top'); outfit.bottom = piece('bottom'); }
  if (r() < 0.95) outfit.shoes = piece('shoes');
  if (r() < 0.4) outfit.necklace = piece('necklace');
  if (r() < 0.45) outfit.earrings = piece('earrings');
  if (r() < 0.25) outfit.glasses = piece('glasses');
  if (r() < 0.3) outfit.bracelet = piece('bracelet');
  if (r() < 0.5) outfit.bag = piece('bag');
  const look: Look = {
    hair: Math.floor(r() * HAIRSTYLES.length),
    skin: Math.floor(r() * SKIN_TONES.length),
    makeup: Math.floor(r() * MAKEUPS.length),
    hairColour: hairColour(r),
  };
  return { name: pick(BOT_NAMES, r), look, outfit, appeal: appeal(outfit, tags) };
}

/** Half the models keep the hairstyle's own colour, the rest dye it. */
function hairColour(r: () => number) {
  return r() < 0.5 ? 0 : 1 + Math.floor(r() * (HAIR_COLOURS.length - 1));
}

/* ---------- which event is on vote ---------- */

/** Events the player can vote in: the running ones she sent a look to. */
export function voteEvents(enteredKeys: string[], now = Date.now()): GameEvent[] {
  return activeEvents(now).filter((e) => enteredKeys.includes(e.key)).sort((a, b) => a.key.localeCompare(b.key));
}

export interface VotePair<T extends Theme = GameEvent> { event: T; a: BotLook; b: BotLook; /** % of voters for a */ shareA: number }

export function votePair<T extends Theme>(events: T[], r: () => number = Math.random): VotePair<T> {
  const event = pick(events, r);
  const a = botLook(event.tags, r);
  let b = botLook(event.tags, r);
  while (b.name === a.name) b = { ...b, name: pick(BOT_NAMES, r) };
  const shareA = Math.round(100 * Math.min(0.88, Math.max(0.12, sigmoid((a.appeal - b.appeal) / 0.15) + (r() - 0.5) * 0.12)));
  return { event, a, b, shareA };
}

/* ---------- showcase model on an event's card ---------- */

/**
 * A pretty model dressed fully to the dress code, the same for every player: every piece
 * fits, rare ones preferred, and she wears the event's main prize.
 */
export function showcaseLook(ev: GameEvent): { look: Look; outfit: Outfit } {
  const r = rng(seedOf('showcase:' + ev.key));
  const prize = ITEM_BY_ID[ev.prize];
  const good = (slot: Slot) => ITEMS.filter((i) => i.slot === slot && fits(i, ev.tags));
  const choose = (slot: Slot, any = false) => {
    const g = good(slot);
    const fancy = g.filter((i) => i.rarity !== 'common');
    const pool = fancy.length ? fancy : g.length ? g : any ? ITEMS.filter((i) => i.slot === slot) : [];
    return pool.length ? pick(pool, r).id : undefined;
  };
  const separates = good('top').length > 0 && good('bottom').length > 0;
  const dress = prize?.slot === 'dress'
    || (prize?.slot !== 'top' && prize?.slot !== 'bottom' && good('dress').length > 0 && (!separates || r() < 0.5));
  const outfit: Outfit = {};
  if (dress) outfit.dress = choose('dress', true);
  else { outfit.top = choose('top', true); outfit.bottom = choose('bottom', true); }
  outfit.shoes = choose('shoes', true);
  // two accessories at most, so she does not look overloaded
  // sunglasses hide her face: only when there is nothing else to wear
  const acc = (['necklace', 'earrings', 'bracelet', 'bag'] as Slot[]).filter((s) => good(s).length);
  if (acc.length < 2 && good('glasses').length) acc.push('glasses');
  for (let n = 0; n < 2 && acc.length; n++) {
    const s = acc.splice(Math.floor(r() * acc.length), 1)[0];
    outfit[s] = choose(s);
  }
  if (prize) outfit[prize.slot] = prize.id;
  const look: Look = {
    hair: Math.floor(r() * HAIRSTYLES.length),
    skin: Math.floor(r() * SKIN_TONES.length),
    makeup: 1 + Math.floor(r() * (MAKEUPS.length - 1)),
    hairColour: hairColour(r),
  };
  return { look, outfit };
}
