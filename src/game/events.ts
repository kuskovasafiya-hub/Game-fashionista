import { HAIRSTYLES, MAKEUPS, SKIN_TONES, type Look, type Outfit } from '../art/Doll';
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
    { id: 'park', name: 'Прогулка в парке', about: 'Солнечный день, кофе навынос и много шагов', emoji: '🌳', color: '#7BC67E', tags: ['casual'], cost: 1, hours: 8, level: 1 },
    { id: 'winter', name: 'Зимняя ярмарка', about: 'Глинтвейн, гирлянды и тёплые вещи', emoji: '❄️', color: '#7FB7F0', tags: ['winter'], cost: 1, hours: 6, level: 1 },
    { id: 'date', name: 'Свидание в кафе', about: 'Мило, но не слишком официально', emoji: '💕', color: '#FF8FB1', tags: ['casual', 'party'], cost: 2, hours: 8, level: 1 },
  ],
  [
    { id: 'beach', name: 'День на пляже', about: 'Песок, солнце и лёгкие ткани', emoji: '🏖️', color: '#FFC15E', tags: ['beach'], cost: 1, hours: 6, level: 1 },
    { id: 'party', name: 'Вечеринка у подруги', about: 'Музыка, танцы и блеск', emoji: '🎉', color: '#C77DFF', tags: ['party'], cost: 1, hours: 8, level: 1 },
    { id: 'resort', name: 'Курортный вечер', about: 'Ужин у моря после заката', emoji: '🌴', color: '#00BBA7', tags: ['beach', 'evening'], cost: 2, hours: 6, level: 1 },
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

/* ---------- schedule ---------- */

const SLOT_MS = 4 * 3600 * 1000;
/** Track starts are staggered so new events appear more often than once per slot. */
const TRACK_OFFSET = [0, 1.33, 2.67].map((h) => h * 3600 * 1000);
const EPOCH = Date.UTC(2026, 0, 1);
export const RESULT_DELAY_MS = 30 * 60 * 1000;

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
  const accFit = (['necklace', 'earrings', 'glasses', 'bag'] as Slot[]).filter((s) => fits(it(s), tags)).length;
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
const RIVAL_MEAN = [0, 0.6, 0.66, 0.72];

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

export const STAR_THRESHOLDS = [0.3, 0.5, 0.68, 0.8];

export function scoreLook(outfit: Outfit, ev: EventTemplate, seed: number): Score {
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
  const stars = 1 + STAR_THRESHOLDS.filter((t) => total >= t).length;
  const players = 120 + Math.floor(r() * 260);
  const place = Math.max(1, Math.round(1 + Math.pow(1 - total, 1.6) * (players - 1) * (0.85 + r() * 0.3)));
  return { match, votes, voters, total, stars, place: Math.min(place, players), players };
}

/* ---------- rewards ---------- */

export interface Reward { coins: number; energy: number; tickets: number; gems: number; xp: number; item?: string }

const STAR_COINS = [0, 60, 150, 300, 500, 800];
const STAR_ENERGY = [0, 0, 2, 3, 5, 5];

export function rewardFor(ev: GameEvent, stars: number): Reward {
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
  if (r() < 0.5) outfit.bag = piece('bag');
  const look: Look = {
    hair: Math.floor(r() * HAIRSTYLES.length),
    skin: Math.floor(r() * SKIN_TONES.length),
    makeup: Math.floor(r() * MAKEUPS.length),
  };
  return { name: pick(BOT_NAMES, r), look, outfit, appeal: appeal(outfit, tags) };
}

export interface VotePair { event: GameEvent; a: BotLook; b: BotLook; /** % of voters for a */ shareA: number }

export function votePair(events: GameEvent[], r: () => number = Math.random): VotePair {
  const event = pick(events, r);
  const a = botLook(event.tags, r);
  let b = botLook(event.tags, r);
  while (b.name === a.name) b = { ...b, name: pick(BOT_NAMES, r) };
  const shareA = Math.round(100 * Math.min(0.88, Math.max(0.12, sigmoid((a.appeal - b.appeal) / 0.15) + (r() - 0.5) * 0.12)));
  return { event, a, b, shareA };
}
