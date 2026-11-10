export type Slot = 'top' | 'bottom' | 'dress' | 'shoes' | 'necklace' | 'earrings' | 'bag';
export type Rarity = 'common' | 'rare' | 'epic';
export type Dept = 'clothes' | 'shoes' | 'accessories';

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
  tags: string[];
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
  accessories: ['necklace', 'earrings', 'bag'],
};
export const DEPT_NAMES: Record<Dept, string> = { clothes: 'Одежда', shoes: 'Обувь', accessories: 'Аксессуары' };
export const SLOT_NAMES: Record<Slot, string> = {
  top: 'Верх', bottom: 'Низ', dress: 'Платья', shoes: 'Обувь', necklace: 'Колье', earrings: 'Серьги', bag: 'Сумки',
};

export const SHOPS: Shop[] = [
  { id: 'city', name: 'Городской', about: 'Повседневная мода на каждый день', level: 1, depts: ['clothes', 'shoes', 'accessories'], color: '#FF8FB1', emoji: '🛍️' },
  { id: 'step', name: 'Шаг', about: 'Только обувь: от кед до шпилек', level: 1, depts: ['shoes'], color: '#7FC8F8', emoji: '👠' },
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
};

const SHOP_TAGS: Record<string, string[]> = {
  starter: ['casual'], city: ['casual'], step: ['casual'], glam: ['party'], evening: ['evening', 'party'],
  office: ['office'], sport: ['sport', 'casual'],
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

function add(shop: string, specs: Spec[]) {
  specs.forEach(([art, name, rarity = 'common', filter]) => {
    const id = `${shop}-${art}-${ITEMS.filter((i) => i.shop === shop && i.art === art).length + 1}`;
    const [lo, hi] = RARITY[rarity].price;
    const price = shop === 'starter' ? 0 : Math.round((lo + (hi - lo) * hash(id)) / 10) * 10;
    const item: Item = { id, name, art, filter, slot: ART_SLOT[art], rarity, price, shop, tags: SHOP_TAGS[shop] ?? [] };
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
  ['top-crop', 'Кроп-топ «Небо»', 'common', TINT.sky],
  ['top-crop', 'Кроп-топ «Персик»', 'rare', TINT.peach],
  ['top-tee', 'Футболка «Розовая»', 'common', TINT.tintPink],
  ['top-tee', 'Футболка «Мятная»', 'common', TINT.tintMint],
  ['top-tee', 'Футболка «Графит»', 'rare', TINT.noir],
  ['bottom-jeans', 'Джинсы «Светлые»', 'common', TINT.lightWash],
  ['bottom-jeans', 'Джинсы «Чёрные»', 'common', TINT.noir],
  ['bottom-skirt', 'Юбка «Плиссе-графит»', 'common', 'brightness(1.6)'],
  ['dress-red', 'Платье «Изумруд»', 'epic', 'hue-rotate(150deg) brightness(0.85)'],
  ['shoes-sneakers', 'Кроссовки «Мята»', 'common', TINT.mint],
  ['acc-bag', 'Сумка «Беж»', 'common'],
  ['acc-bag', 'Сумка «Какао»', 'rare', TINT.cocoa],
  ['top-sweater', 'Свитер «Сливки»'],
  ['top-sweater', 'Свитер «Пудра»', 'rare', TINT.tintPink],
  ['bottom-shorts', 'Шорты «Деним»'],
  ['dress-sundress', 'Сарафан «Лимон»', 'rare'],
  ['dress-sundress', 'Сарафан «Небо»', 'rare', 'hue-rotate(170deg)'],
]);

add('step', [
  ['shoes-sneakers', 'Кроссовки «Небо»', 'common', TINT.sky],
  ['shoes-sneakers', 'Кроссовки «Лаванда»', 'common', TINT.lilac],
  ['shoes-sneakers', 'Кроссовки «Ночь»', 'rare', TINT.noir],
  ['shoes-heels', 'Туфли «Бордо»', 'common', 'sepia(1) saturate(4) hue-rotate(310deg) brightness(0.9)'],
  ['shoes-heels', 'Туфли «Нюд»', 'rare', 'invert(0.75) sepia(0.6) saturate(1.5)'],
  ['shoes-heels', 'Туфли «Серебро»', 'epic', 'invert(0.8) grayscale(1) brightness(1.1)'],
  ['shoes-boots', 'Сапоги «Нуар»', 'rare'],
  ['shoes-sandals', 'Босоножки «Золото»', 'common'],
  ['shoes-loafers', 'Лоферы «Коньяк»', 'common'],
]);

add('glam', [
  ['acc-hoops', 'Серьги-кольца «Серебро»', 'common', TINT.silver],
  ['acc-hoops', 'Серьги-кольца «Розовое золото»', 'rare', 'hue-rotate(320deg) saturate(1.2)'],
  ['acc-bag', 'Сумка «Пудра»', 'common', TINT.tintPink],
  ['acc-bag', 'Сумка «Мята»', 'rare', TINT.tintMint],
  ['acc-bag', 'Сумка «Нуар»', 'epic', TINT.noir],
  ['acc-chain', 'Цепочка «Золото»'],
  ['acc-chain', 'Цепочка «Серебро»', 'common', TINT.silver],
  ['acc-pearls', 'Жемчуг «Белый»', 'rare'],
  ['acc-pearls', 'Жемчуг «Розовый»', 'epic', TINT.tintPink],
]);

add('evening', [
  ['dress-red', 'Платье «Алый шёлк»', 'rare'],
  ['dress-red', 'Платье «Сапфир»', 'rare', 'hue-rotate(220deg)'],
  ['dress-red', 'Платье «Аметист»', 'epic', 'hue-rotate(270deg)'],
  ['dress-black', 'Платье «Полночь»', 'common', 'sepia(1) hue-rotate(190deg) saturate(3) brightness(1.4)'],
  ['shoes-heels', 'Туфли «Классика»', 'common'],
  ['dress-gown', 'Платье «Изумрудный блеск»', 'epic'],
  ['dress-gown', 'Платье «Сапфировый блеск»', 'epic', 'hue-rotate(100deg) saturate(1.3)'],
  ['dress-gown', 'Платье «Рубиновый блеск»', 'rare', 'hue-rotate(200deg) saturate(1.8) brightness(1.25)'],
  ['bottom-midi', 'Юбка-миди «Шампань»'],
  ['top-blouse', 'Блузка «Шёлк»'],
  ['shoes-sandals', 'Босоножки «Серебро»', 'rare', TINT.silver],
]);

add('office', [
  ['top-blouse', 'Блузка «Белая»'],
  ['top-blouse', 'Блузка «Пудра»', 'common', TINT.tintPink],
  ['top-blouse', 'Блузка «Небо»', 'rare', 'sepia(0.45) saturate(2) hue-rotate(170deg)'],
  ['top-blazer', 'Жакет «Кэмел»', 'rare'],
  ['top-blazer', 'Жакет «Графит»', 'rare', TINT.noir],
  ['top-blazer', 'Жакет «Малина»', 'epic', 'hue-rotate(320deg) saturate(1.5) brightness(0.75)'],
  ['bottom-trousers', 'Брюки «Серые»'],
  ['bottom-trousers', 'Брюки «Беж»', 'common', 'sepia(0.7) brightness(1.15)'],
  ['bottom-trousers', 'Брюки «Ночь»', 'common', TINT.noir],
  ['bottom-midi', 'Юбка-миди «Беж»', 'rare'],
  ['shoes-loafers', 'Лоферы «Шоколад»'],
  ['shoes-loafers', 'Лоферы «Нуар»', 'common', TINT.noir],
  ['shoes-heels', 'Туфли «Офис»'],
  ['acc-pearls', 'Жемчуг «Классика»', 'rare'],
  ['acc-tote', 'Сумка-тоут «Нуар»'],
  ['acc-tote', 'Сумка-тоут «Карамель»', 'rare', 'invert(0.55) sepia(1) saturate(2.2) hue-rotate(-10deg)'],
]);

add('sport', [
  ['top-hoodie', 'Худи «Лаванда»'],
  ['top-hoodie', 'Худи «Мята»', 'common', 'hue-rotate(240deg)'],
  ['top-hoodie', 'Худи «Персик»', 'rare', 'hue-rotate(60deg) saturate(1.3)'],
  ['bottom-leggings', 'Леггинсы «Чёрные»'],
  ['bottom-leggings', 'Леггинсы «Графит»', 'common', 'brightness(2.2)'],
  ['bottom-shorts', 'Шорты «Светлый деним»', 'common', TINT.lightWash],
  ['bottom-shorts', 'Шорты «Белые»', 'rare', 'grayscale(1) brightness(1.55)'],
  ['acc-belt-bag', 'Поясная сумка «Розовая»'],
  ['acc-belt-bag', 'Поясная сумка «Мята»', 'common', 'hue-rotate(150deg)'],
  ['acc-belt-bag', 'Поясная сумка «Нуар»', 'rare', TINT.noir],
]);

export const STARTER = ITEMS.filter((i) => i.shop === 'starter');
export const shopItems = (shop: string, dept?: Dept) =>
  ITEMS.filter((i) => i.shop === shop && (!dept || DEPT_SLOTS[dept].includes(i.slot)));
