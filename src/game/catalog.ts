export type Slot = 'top' | 'bottom' | 'dress' | 'shoes' | 'necklace' | 'earrings' | 'glasses' | 'bracelet' | 'bag';
export type Rarity = 'common' | 'rare' | 'epic';
export type Dept = 'clothes' | 'shoes' | 'accessories';
export type Tag = 'casual' | 'office' | 'party' | 'evening' | 'sport' | 'beach' | 'winter';

export interface Item {
  id: string;
  name: string;
  /** Layer image in public/art (without extension). */
  art: string;
  /** Optional CSS filter that recolours the layer into a colour variant. */
  filter?: string;
  slot: Slot;
  rarity: Rarity;
  price: number;
  shop: string;
  tags: Tag[];
}

export interface Shop {
  id: string;
  name: string;
  about: string;
  level: number;
  depts: Dept[];
  color: string;
  emoji: string;
  soon?: boolean;
}

export const RARITY: Record<Rarity, { name: string; color: string; chance: number; price: [number, number]; xp: number }> = {
  common: { name: 'Обычная', color: '#8C9AAE', chance: 0.75, price: [100, 300], xp: 5 },
  rare: { name: 'Редкая', color: '#3D8BFD', chance: 0.2, price: [600, 1200], xp: 15 },
  epic: { name: 'Очень редкая', color: '#B04CE0', chance: 0.05, price: [2500, 5000], xp: 40 },
};

export const DEPT_SLOTS: Record<Dept, Slot[]> = {
  clothes: ['top', 'bottom', 'dress'],
  shoes: ['shoes'],
  accessories: ['necklace', 'earrings', 'glasses', 'bracelet', 'bag'],
};
export const DEPT_NAMES: Record<Dept, string> = { clothes: 'Одежда', shoes: 'Обувь', accessories: 'Аксессуары' };
export const SLOT_NAMES: Record<Slot, string> = {
  top: 'Верх', bottom: 'Низ', dress: 'Платья', shoes: 'Обувь', necklace: 'Колье', earrings: 'Серьги', glasses: 'Очки', bracelet: 'Браслеты', bag: 'Сумки',
};

export const SHOPS: Shop[] = [
  { id: 'city', name: 'Городской', about: 'Повседневная мода на каждый день', level: 1, depts: ['clothes', 'shoes', 'accessories'], color: '#FF8FB1', emoji: '🛍️' },
  { id: 'step', name: 'Шаг', about: 'Только обувь: от кед до шпилек', level: 1, depts: ['shoes'], color: '#7FC8F8', emoji: '👠' },
  { id: 'y2k', name: 'Y2K', about: 'Нулевые: блеск, розовый и бабочки', level: 2, depts: ['clothes', 'shoes', 'accessories'], color: '#FF7AD9', emoji: '🦋' },
  { id: 'office', name: 'Офис', about: 'Деловой стиль и строгие линии', level: 3, depts: ['clothes', 'shoes', 'accessories'], color: '#8E9AAF', emoji: '💼' },
  { id: 'glam', name: 'Блеск', about: 'Украшения, серьги и сумочки', level: 5, depts: ['accessories'], color: '#F7C548', emoji: '💎' },
  { id: 'evening', name: 'Вечерний', about: 'Платья для вечеринок и балов', level: 7, depts: ['clothes', 'shoes'], color: '#9B5DE5', emoji: '🥂' },
  { id: 'sport', name: 'Спорт & Чилл', about: 'Спорт, отдых и уют', level: 10, depts: ['clothes', 'accessories'], color: '#00BBA7', emoji: '🏖️' },
  { id: 'premium', name: 'Премиум-бутик', about: 'Дорого, редко, роскошно', level: 13, depts: ['clothes', 'shoes', 'accessories'], color: '#2B2D42', emoji: '👑', soon: true },
];

/** Which slot each piece of art belongs to. */
const ART_SLOT: Record<string, Slot> = {
  'top-crop': 'top', 'top-tee': 'top',
  'bottom-jeans': 'bottom', 'bottom-skirt': 'bottom',
  'dress-black': 'dress', 'dress-red': 'dress',
  'shoes-sneakers': 'shoes', 'shoes-heels': 'shoes',
  'acc-hoops': 'earrings', 'acc-bag': 'bag',
  'top-hoodie': 'top', 'top-blouse': 'top', 'top-blazer': 'top', 'top-sweater': 'top',
  'bottom-trousers': 'bottom', 'bottom-leggings': 'bottom', 'bottom-shorts': 'bottom', 'bottom-midi': 'bottom',
  'dress-gown': 'dress', 'dress-sundress': 'dress',
  'shoes-boots': 'shoes', 'shoes-sandals': 'shoes', 'shoes-loafers': 'shoes',
  'acc-chain': 'necklace', 'acc-pearls': 'necklace', 'acc-tote': 'bag', 'acc-belt-bag': 'bag',
  'top-crochet': 'top', 'bottom-baggy': 'bottom', 'acc-sunglasses': 'glasses', 'acc-glasses': 'glasses',
  'shoes-hightops': 'shoes', 'shoes-maryjanes': 'shoes',
  'top-y2k': 'top', 'bottom-y2k': 'bottom', 'dress-y2k': 'dress',
  'top-cardigan': 'top', 'bottom-plaid': 'bottom', 'bottom-velour': 'bottom',
  'shoes-platform': 'shoes', 'shoes-whiteboots': 'shoes',
  'acc-shield': 'glasses', 'acc-choker': 'necklace', 'acc-bracelet': 'bracelet', 'acc-studs': 'earrings',
};

/** Style tags of each piece of art: what dress codes it fits. */
const ART_TAGS: Record<string, Tag[]> = {
  'top-tee': ['casual', 'sport'], 'top-crop': ['casual', 'party', 'beach'],
  'top-sweater': ['casual', 'winter'], 'top-hoodie': ['sport', 'casual', 'winter'],
  'top-blouse': ['office', 'evening'], 'top-blazer': ['office'],
  'bottom-jeans': ['casual'], 'bottom-skirt': ['casual', 'party'],
  'bottom-shorts': ['casual', 'beach', 'sport'], 'bottom-leggings': ['sport'],
  'bottom-trousers': ['office'], 'bottom-midi': ['office', 'evening'],
  'dress-black': ['evening', 'party'], 'dress-red': ['evening', 'party'],
  'dress-gown': ['evening'], 'dress-sundress': ['beach', 'casual'],
  'shoes-sneakers': ['casual', 'sport'], 'shoes-heels': ['party', 'evening', 'office'],
  'shoes-boots': ['winter', 'casual'], 'shoes-sandals': ['beach', 'party'], 'shoes-loafers': ['office', 'casual'],
  'acc-hoops': ['casual', 'party'], 'acc-chain': ['casual', 'party'], 'acc-pearls': ['evening', 'office'],
  'acc-bag': ['casual', 'office'], 'acc-tote': ['office', 'casual'], 'acc-belt-bag': ['sport', 'casual'],
  'top-crochet': ['casual', 'party'], 'bottom-baggy': ['casual', 'party'],
  'acc-sunglasses': ['casual', 'beach', 'party'], 'acc-glasses': ['office', 'casual'],
  'shoes-hightops': ['casual', 'sport'], 'shoes-maryjanes': ['party', 'casual'],
  'top-y2k': ['party', 'beach', 'casual'], 'bottom-y2k': ['party', 'casual'], 'dress-y2k': ['party', 'evening'],
  'top-cardigan': ['casual', 'winter'], 'bottom-plaid': ['casual', 'party'], 'bottom-velour': ['casual', 'sport'],
  'shoes-platform': ['party'], 'shoes-whiteboots': ['party', 'winter'],
  'acc-shield': ['party', 'beach'], 'acc-choker': ['party', 'casual'], 'acc-bracelet': ['casual', 'party', 'beach'], 'acc-studs': ['casual', 'party'],
};
/** A shop adds its own style to everything it sells. */
const SHOP_TAGS: Record<string, Tag[]> = { glam: ['party'], evening: ['evening'], office: ['office'], sport: ['sport'], y2k: ['party'] };

export const TAG_ICONS: Record<Tag, string> = {
  casual: '☕', office: '💼', party: '🎉', evening: '🥂', sport: '🏃‍♀️', beach: '🌴', winter: '❄️',
};

export const TAG_NAMES: Record<Tag, string> = {
  casual: 'Повседневный', office: 'Деловой', party: 'Вечеринка', evening: 'Вечерний',
  sport: 'Спорт', beach: 'Пляж', winter: 'Зима',
};

/* Colour variants made with CSS filters on one piece of art. */
export const TINT = {
  mint: 'hue-rotate(150deg)',
  sky: 'hue-rotate(210deg)',
  lilac: 'hue-rotate(275deg) saturate(0.9)',
  peach: 'hue-rotate(25deg) saturate(1.2)',
  noir: 'grayscale(1) brightness(0.45) contrast(1.2)',
  lightWash: 'brightness(1.25) saturate(0.7)',
  silver: 'grayscale(1) brightness(1.15)',
  cocoa: 'brightness(0.6) saturate(1.3)',
  tintPink: 'sepia(0.45) saturate(2.2) hue-rotate(295deg) brightness(1.02)',
  tintMint: 'sepia(0.45) saturate(2) hue-rotate(110deg)',
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export const ITEMS: Item[] = [];
export const ITEM_BY_ID: Record<string, Item> = {};

type Spec = [art: string, name: string, rarity?: Rarity, filter?: string];
/** A colour no longer sold. It keeps its place in the list so that the ids of the
 * items after it (`<shop>-<art>-<n>`, stored in saves) do not change. */
type Retired = { retired: Spec };
const gone = (spec: Spec): Retired => ({ retired: spec });

/** Every piece of art comes in at most this many colours across all shops. */
export const MAX_COLOURS = 2;

function add(shop: string, specs: (Spec | Retired)[]) {
  const seen: Record<string, number> = {};
  specs.forEach((entry) => {
    const [art, name, rarity = 'common', filter] = 'retired' in entry ? entry.retired : entry;
    seen[art] = (seen[art] ?? 0) + 1;
    if ('retired' in entry) return;
    const id = `${shop}-${art}-${seen[art]}`;
    const [lo, hi] = RARITY[rarity].price;
    const price = shop === 'starter' ? 0 : Math.round((lo + (hi - lo) * hash(id)) / 10) * 10;
    const item: Item = { id, name, art, filter, slot: ART_SLOT[art], rarity, price, shop, tags: [...new Set([...(ART_TAGS[art] ?? []), ...(SHOP_TAGS[shop] ?? [])])] };
    ITEMS.push(item);
    ITEM_BY_ID[id] = item;
  });
}

/* Стартовый набор: выбирается при создании персонажа. */
add('starter', [
  ['top-tee', 'Футболка «Белая»'],
  ['top-crop', 'Кроп-топ «Розовый»'],
  ['bottom-jeans', 'Джинсы «Классика»'],
  ['bottom-skirt', 'Юбка «Плиссе»'],
  ['dress-black', 'Платье «Маленькое чёрное»'],
  ['shoes-sneakers', 'Кроссовки «Зефир»'],
  ['shoes-heels', 'Туфли «Чёрные»'],
  ['acc-hoops', 'Серьги-кольца «Золото»'],
]);

add('city', [
  ['top-crop', 'Кроп-топ «Мята»', 'common', TINT.mint],
  gone(['top-crop', 'Кроп-топ «Небо»', 'common', TINT.sky]),
  gone(['top-crop', 'Кроп-топ «Персик»', 'rare', TINT.peach]),
  ['top-tee', 'Футболка «Розовая»', 'common', TINT.tintPink],
  gone(['top-tee', 'Футболка «Мятная»', 'common', TINT.tintMint]),
  gone(['top-tee', 'Футболка «Графит»', 'rare', TINT.noir]),
  gone(['bottom-jeans', 'Джинсы «Светлые»', 'common', TINT.lightWash]),
  ['bottom-jeans', 'Джинсы «Чёрные»', 'common', TINT.noir],
  ['bottom-skirt', 'Юбка «Плиссе-графит»', 'common', 'brightness(1.6)'],
  gone(['dress-red', 'Платье «Изумруд»', 'epic', 'hue-rotate(150deg) brightness(0.85)']),
  gone(['shoes-sneakers', 'Кроссовки «Мята»', 'common', TINT.mint]),
  ['acc-bag', 'Сумка «Беж»', 'common'],
  gone(['acc-bag', 'Сумка «Какао»', 'rare', TINT.cocoa]),
  ['top-sweater', 'Свитер «Сливки»'],
  ['top-sweater', 'Свитер «Пудра»', 'rare', TINT.tintPink],
  ['bottom-shorts', 'Шорты «Деним»'],
  ['dress-sundress', 'Сарафан «Лимон»', 'rare'],
  ['dress-sundress', 'Сарафан «Небо»', 'rare', 'hue-rotate(170deg)'],
  ['top-crochet', 'Кофта «Ажур-бордо»', 'rare'],
  ['top-crochet', 'Кофта «Ажур-графит»', 'rare', 'grayscale(1) brightness(1.1)'],
  ['bottom-baggy', 'Джинсы «Бэгги с галстуком»', 'rare'],
  ['bottom-baggy', 'Джинсы «Бэгги-индиго»', 'epic', 'saturate(1.6) brightness(0.75)'],
  ['acc-sunglasses', 'Очки «Нуар»'],
  ['acc-glasses', 'Очки «Черепаха»'],
]);

add('y2k', [
  ['top-y2k', 'Топ «Бабочка»', 'rare'],
  ['top-y2k', 'Топ «Бабочка-лайм»', 'rare', 'hue-rotate(110deg) saturate(1.2)'],
  ['top-cardigan', 'Кардиган «Облачко»'],
  ['top-cardigan', 'Кардиган «Облачко-роза»', 'rare', 'hue-rotate(130deg)'],
  ['bottom-y2k', 'Мини «Звёздный ремень»'],
  ['bottom-y2k', 'Мини «Звёздный ремень-нуар»', 'rare', TINT.noir],
  ['bottom-plaid', 'Мини «Клетка-роза»'],
  ['bottom-plaid', 'Мини «Клетка-лаванда»', 'rare', 'hue-rotate(300deg)'],
  ['bottom-velour', 'Брюки «Велюр-зефир»', 'rare'],
  ['bottom-velour', 'Брюки «Велюр-небо»', 'rare', 'hue-rotate(200deg)'],
  ['dress-y2k', 'Платье «Голограмма»', 'epic'],
  ['dress-y2k', 'Платье «Голограмма-мята»', 'epic', 'hue-rotate(250deg)'],
  ['shoes-platform', 'Туфли «Платформа-зефир»', 'rare'],
  ['shoes-platform', 'Туфли «Платформа-лаванда»', 'rare', 'hue-rotate(300deg)'],
  ['shoes-whiteboots', 'Сапоги «Снежок»', 'epic'],
  ['shoes-whiteboots', 'Сапоги «Снежок-розовые»', 'epic', 'sepia(0.5) saturate(3) hue-rotate(290deg)'],
  ['acc-shield', 'Очки «Футуризм»'],
  ['acc-shield', 'Очки «Футуризм-голубые»', 'common', 'hue-rotate(200deg)'],
  ['acc-choker', 'Чокер «Сердечко»'],
  ['acc-choker', 'Чокер «Сердечко-золото»', 'rare', 'sepia(1) saturate(2.5) brightness(0.95)'],
  ['acc-bracelet', 'Браслет «Бабочка»'],
  ['acc-bracelet', 'Браслет «Бабочка-мята»', 'common', 'hue-rotate(150deg)'],
  ['acc-studs', 'Серьги «Бабочки»'],
  ['acc-studs', 'Серьги «Бабочки-золото»', 'rare', 'sepia(1) saturate(2.5) brightness(0.95)'],
]);

add('step', [
  gone(['shoes-sneakers', 'Кроссовки «Небо»', 'common', TINT.sky]),
  gone(['shoes-sneakers', 'Кроссовки «Лаванда»', 'common', TINT.lilac]),
  ['shoes-sneakers', 'Кроссовки «Ночь»', 'rare', TINT.noir],
  ['shoes-heels', 'Туфли «Бордо»', 'common', 'sepia(1) saturate(4) hue-rotate(310deg) brightness(0.9)'],
  gone(['shoes-heels', 'Туфли «Нюд»', 'rare', 'invert(0.75) sepia(0.6) saturate(1.5)']),
  gone(['shoes-heels', 'Туфли «Серебро»', 'epic', 'invert(0.8) grayscale(1) brightness(1.1)']),
  ['shoes-boots', 'Сапоги «Нуар»', 'rare'],
  ['shoes-sandals', 'Босоножки «Золото»', 'common'],
  ['shoes-loafers', 'Лоферы «Коньяк»', 'common'],
  ['shoes-hightops', 'Кеды «Классика»'],
  ['shoes-maryjanes', 'Туфли «Мэри Джейн»', 'rare'],
  ['shoes-maryjanes', 'Туфли «Мэри Джейн нуар»', 'epic', 'grayscale(1) brightness(0.55) contrast(1.3)'],
]);

add('glam', [
  ['acc-hoops', 'Серьги-кольца «Серебро»', 'common', TINT.silver],
  gone(['acc-hoops', 'Серьги-кольца «Розовое золото»', 'rare', 'hue-rotate(320deg) saturate(1.2)']),
  gone(['acc-bag', 'Сумка «Пудра»', 'common', TINT.tintPink]),
  gone(['acc-bag', 'Сумка «Мята»', 'rare', TINT.tintMint]),
  ['acc-bag', 'Сумка «Нуар»', 'epic', TINT.noir],
  ['acc-chain', 'Цепочка «Золото»'],
  ['acc-chain', 'Цепочка «Серебро»', 'common', TINT.silver],
  gone(['acc-pearls', 'Жемчуг «Белый»', 'rare']),
  ['acc-pearls', 'Жемчуг «Розовый»', 'epic', TINT.tintPink],
]);

add('evening', [
  ['dress-red', 'Платье «Алый шёлк»', 'rare'],
  ['dress-red', 'Платье «Сапфир»', 'rare', 'hue-rotate(220deg)'],
  gone(['dress-red', 'Платье «Аметист»', 'epic', 'hue-rotate(270deg)']),
  ['dress-black', 'Платье «Полночь»', 'common', 'sepia(1) hue-rotate(190deg) saturate(3) brightness(1.4)'],
  gone(['shoes-heels', 'Туфли «Классика»', 'common']),
  ['dress-gown', 'Платье «Изумрудный блеск»', 'epic'],
  ['dress-gown', 'Платье «Сапфировый блеск»', 'epic', 'hue-rotate(100deg) saturate(1.3)'],
  gone(['dress-gown', 'Платье «Рубиновый блеск»', 'rare', 'hue-rotate(200deg) saturate(1.8) brightness(1.25)']),
  ['bottom-midi', 'Юбка-миди «Шампань»'],
  gone(['top-blouse', 'Блузка «Шёлк»']),
  ['shoes-sandals', 'Босоножки «Серебро»', 'rare', TINT.silver],
]);

add('office', [
  ['top-blouse', 'Блузка «Белая»'],
  ['top-blouse', 'Блузка «Пудра»', 'common', TINT.tintPink],
  gone(['top-blouse', 'Блузка «Небо»', 'rare', 'sepia(0.45) saturate(2) hue-rotate(170deg)']),
  ['top-blazer', 'Жакет «Кэмел»', 'rare'],
  ['top-blazer', 'Жакет «Графит»', 'rare', TINT.noir],
  gone(['top-blazer', 'Жакет «Малина»', 'epic', 'hue-rotate(320deg) saturate(1.5) brightness(0.75)']),
  ['bottom-trousers', 'Брюки «Серые»'],
  gone(['bottom-trousers', 'Брюки «Беж»', 'common', 'sepia(0.7) brightness(1.15)']),
  ['bottom-trousers', 'Брюки «Ночь»', 'common', TINT.noir],
  gone(['bottom-midi', 'Юбка-миди «Беж»', 'rare']),
  gone(['shoes-loafers', 'Лоферы «Шоколад»']),
  ['shoes-loafers', 'Лоферы «Нуар»', 'common', TINT.noir],
  gone(['shoes-heels', 'Туфли «Офис»']),
  ['acc-pearls', 'Жемчуг «Классика»', 'rare'],
  ['acc-tote', 'Сумка-тоут «Нуар»'],
  ['acc-tote', 'Сумка-тоут «Карамель»', 'rare', 'invert(0.55) sepia(1) saturate(2.2) hue-rotate(-10deg)'],
]);

add('sport', [
  ['top-hoodie', 'Худи «Лаванда»'],
  ['top-hoodie', 'Худи «Мята»', 'common', 'hue-rotate(240deg)'],
  gone(['top-hoodie', 'Худи «Персик»', 'rare', 'hue-rotate(60deg) saturate(1.3)']),
  ['bottom-leggings', 'Леггинсы «Чёрные»'],
  ['bottom-leggings', 'Леггинсы «Графит»', 'common', 'brightness(2.2)'],
  gone(['bottom-shorts', 'Шорты «Светлый деним»', 'common', TINT.lightWash]),
  ['bottom-shorts', 'Шорты «Белые»', 'rare', 'grayscale(1) brightness(1.55)'],
  ['acc-belt-bag', 'Мини-сумка «Розовая»'],
  gone(['acc-belt-bag', 'Мини-сумка «Мята»', 'common', 'hue-rotate(150deg)']),
  ['acc-belt-bag', 'Мини-сумка «Нуар»', 'rare', TINT.noir],
]);

/* No piece of art in more than MAX_COLOURS colours, and no colour sold twice. */
{
  const colours: Record<string, Set<string>> = {};
  for (const i of ITEMS) {
    const c = (colours[i.art] ??= new Set());
    const key = i.filter ?? '';
    if (c.has(key) && i.shop !== 'starter') throw new Error(`catalog: ${i.art} colour "${key}" is sold twice (${i.id})`);
    c.add(key);
    if (c.size > MAX_COLOURS) throw new Error(`catalog: ${i.art} has more than ${MAX_COLOURS} colours (${i.id})`);
  }
}

export const STARTER = ITEMS.filter((i) => i.shop === 'starter');
export const shopItems = (shop: string, dept?: Dept) =>
  ITEMS.filter((i) => i.shop === shop && (!dept || DEPT_SLOTS[dept].includes(i.slot)));

/* ---------- shop fixtures: the shelves, racks and cases inside a shop ---------- */

export type FixtureKind = 'tops' | 'bottoms' | 'dresses' | 'shoes' | 'jewelry' | 'bags' | 'glasses';
/** How a fixture is drawn: a clothes rail, a wall shelf, a glass case or a tall stand. */
export type FixtureLook = 'rack' | 'shelf' | 'case' | 'stand';

const KINDS: { kind: FixtureKind; name: string; slots: Slot[]; look: FixtureLook }[] = [
  { kind: 'dresses', name: 'Платья', slots: ['dress'], look: 'rack' },
  { kind: 'tops', name: 'Верх', slots: ['top'], look: 'rack' },
  { kind: 'bottoms', name: 'Низ', slots: ['bottom'], look: 'rack' },
  { kind: 'shoes', name: 'Обувь', slots: ['shoes'], look: 'shelf' },
  { kind: 'bags', name: 'Сумки', slots: ['bag'], look: 'shelf' },
  { kind: 'jewelry', name: 'Украшения', slots: ['necklace', 'earrings', 'bracelet'], look: 'case' },
  { kind: 'glasses', name: 'Очки', slots: ['glasses'], look: 'stand' },
];

/** Names of single kinds of pieces, for shops that split a fixture by them. */
const ART_NAMES: Record<string, string> = {
  'top-crop': 'Кроп-топы', 'top-tee': 'Футболки', 'top-sweater': 'Свитеры', 'top-hoodie': 'Худи',
  'top-blouse': 'Блузки', 'top-blazer': 'Жакеты', 'top-crochet': 'Ажурные кофты',
  'bottom-jeans': 'Джинсы', 'bottom-skirt': 'Юбки', 'bottom-shorts': 'Шорты', 'bottom-leggings': 'Леггинсы',
  'bottom-trousers': 'Брюки', 'bottom-midi': 'Юбки-миди', 'bottom-baggy': 'Бэгги',
  'dress-black': 'Коктейльные', 'dress-red': 'Платья-комбинации', 'dress-gown': 'Вечерние платья', 'dress-sundress': 'Сарафаны',
  'shoes-sneakers': 'Кроссовки', 'shoes-heels': 'Туфли', 'shoes-boots': 'Сапоги', 'shoes-sandals': 'Босоножки', 'shoes-loafers': 'Лоферы',
  'acc-hoops': 'Серьги', 'acc-chain': 'Цепочки', 'acc-pearls': 'Жемчуг', 'acc-bag': 'Сумки', 'acc-tote': 'Тоуты',
  'acc-belt-bag': 'Мини-сумки', 'acc-sunglasses': 'Солнечные очки', 'acc-glasses': 'Очки',
  'top-y2k': 'Топы', 'top-cardigan': 'Кардиганы', 'bottom-y2k': 'Мини', 'bottom-plaid': 'Мини в клетку',
  'bottom-velour': 'Велюр', 'dress-y2k': 'Платья', 'shoes-platform': 'Платформы', 'shoes-whiteboots': 'Сапоги',
  'shoes-hightops': 'Кеды', 'shoes-maryjanes': 'Мэри Джейн',
  'acc-shield': 'Очки', 'acc-choker': 'Чокеры', 'acc-bracelet': 'Браслеты', 'acc-studs': 'Серьги',
};

export interface Fixture { id: string; name: string; kind: FixtureKind; look: FixtureLook; items: Item[] }

/**
 * The fixtures of a shop, one per kind of thing it sells. A shop with few kinds (only
 * shoes, only jewellery) splits them by model, so it never stands half empty.
 */
export function shopFixtures(shopId: string): Fixture[] {
  const items = shopItems(shopId);
  let list: Fixture[] = KINDS
    .map((k) => ({ id: k.kind, name: k.name, kind: k.kind, look: k.look, items: items.filter((i) => k.slots.includes(i.slot)) }))
    .filter((f) => f.items.length);
  if (list.length < 4) {
    list = list.flatMap((f) => {
      const arts = [...new Set(f.items.map((i) => i.art))];
      if (arts.length < 2) return [f];
      return arts.map((a) => ({ ...f, id: a, name: ART_NAMES[a] ?? f.name, items: f.items.filter((i) => i.art === a) }));
    });
  }
  return list.slice(0, 7);
}
