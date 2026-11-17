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
  { id: 'premium', name: 'Премиум-бутик', about: 'Дорого, редко, роскошно', level: 13, depts: ['clothes', 'shoes', 'accessories'], color: '#2B2D42', emoji: '👑' },
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
  // batch 1 (art-src/v2/batches/batch1.tsv)
  'shoes-ankleboots': 'shoes', 'shoes-flats': 'shoes', 'shoes-slipons': 'shoes', 'dress-wrap': 'dress',
  'dress-sheath': 'dress', 'dress-shirt': 'dress', 'shoes-pumps': 'shoes', 'acc-studs-pearl': 'earrings',
  'top-bustier': 'top', 'top-sequin': 'top', 'bottom-satin': 'bottom', 'shoes-mules': 'shoes',
  // batch 2
  'top-sporttop': 'top', 'top-zip': 'top', 'bottom-joggers': 'bottom',
  'bottom-bikers': 'bottom', 'bottom-tennis': 'bottom', 'acc-bag-sport': 'bag',
  'shoes-runners': 'shoes', 'acc-ear-drops': 'earrings', 'acc-bracelet-tennis': 'bracelet',
  'acc-bag-clutch': 'bag', 'acc-neck-pendant': 'necklace', 'acc-bracelet-bangles': 'bracelet',
  // batch 3
  'dress-ballgown': 'dress', 'dress-velvet': 'dress', 'top-tweed': 'top',
  'top-faux': 'top', 'bottom-leather': 'bottom', 'bottom-sequin': 'bottom',
  'shoes-boots-riding': 'shoes', 'shoes-velvet': 'shoes', 'acc-bag-quilted': 'bag',
  'acc-neck-diamond': 'necklace', 'acc-ear-chandelier': 'earrings', 'acc-cateye': 'glasses',
  // batch 4
  'shoes-boots-chelsea': 'shoes', 'shoes-slides': 'shoes', 'shoes-boots-combat': 'shoes',
  'top-denim': 'top', 'bottom-cargo': 'bottom', 'acc-bag-bucket': 'bag',
  'bottom-pencil': 'bottom', 'top-turtleneck': 'top', 'top-stripe': 'top',
  'dress-cocktail': 'dress', 'bottom-tulle': 'bottom', 'acc-shield-sport': 'glasses',
  // batch 5
  'acc-studs-star': 'earrings', 'acc-neck-pearl': 'necklace', 'acc-bag-mini': 'bag',
  'acc-bracelet-charm': 'bracelet', 'top-halter': 'top', 'top-babytee': 'top',
  'acc-bag-baguette': 'bag', 'dress-chiffon': 'dress', 'top-oneshoulder': 'top',
  'shoes-glitter': 'shoes', 'dress-tshirt': 'dress', 'top-polo': 'top',
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
  'shoes-ankleboots': ['casual', 'winter'], 'shoes-flats': ['casual', 'office'], 'shoes-slipons': ['casual', 'sport'],
  'dress-wrap': ['casual', 'beach'], 'dress-sheath': ['office', 'evening'], 'dress-shirt': ['office', 'casual'],
  'shoes-pumps': ['office', 'casual'], 'acc-studs-pearl': ['office', 'evening'],
  'top-bustier': ['evening', 'party'], 'top-sequin': ['party', 'evening'], 'bottom-satin': ['evening', 'office'],
  'shoes-mules': ['evening', 'party'],
  'top-sporttop': ['sport', 'beach'], 'top-zip': ['sport', 'casual'], 'bottom-joggers': ['sport', 'casual'],
  'bottom-bikers': ['sport', 'beach'], 'bottom-tennis': ['sport', 'casual'], 'acc-bag-sport': ['sport', 'casual'],
  'shoes-runners': ['sport', 'casual'], 'acc-ear-drops': ['evening', 'party'], 'acc-bracelet-tennis': ['evening', 'party'],
  'acc-bag-clutch': ['evening', 'party'], 'acc-neck-pendant': ['casual', 'party'], 'acc-bracelet-bangles': ['casual', 'party', 'beach'],
  'dress-ballgown': ['evening'], 'dress-velvet': ['evening', 'winter'], 'top-tweed': ['office', 'evening'],
  'top-faux': ['winter', 'party'], 'bottom-leather': ['party', 'evening'], 'bottom-sequin': ['party', 'evening'],
  'shoes-boots-riding': ['winter', 'casual'], 'shoes-velvet': ['office', 'evening'], 'acc-bag-quilted': ['evening', 'office'],
  'acc-neck-diamond': ['evening', 'party'], 'acc-ear-chandelier': ['evening', 'party'], 'acc-cateye': ['party', 'beach', 'casual'],
  'shoes-boots-chelsea': ['winter', 'casual'], 'shoes-slides': ['beach', 'casual'], 'shoes-boots-combat': ['casual', 'party'],
  'top-denim': ['casual'], 'bottom-cargo': ['casual', 'sport'], 'acc-bag-bucket': ['casual'],
  'bottom-pencil': ['office'], 'top-turtleneck': ['office', 'winter'], 'top-stripe': ['office', 'casual'],
  'dress-cocktail': ['party', 'evening'], 'bottom-tulle': ['evening', 'party'], 'acc-shield-sport': ['sport', 'beach'],
  'acc-studs-star': ['casual', 'party'], 'acc-neck-pearl': ['office', 'evening'], 'acc-bag-mini': ['party', 'evening'],
  'acc-bracelet-charm': ['casual', 'party'], 'top-halter': ['party', 'beach'], 'top-babytee': ['casual', 'party'],
  'acc-bag-baguette': ['party'], 'dress-chiffon': ['evening', 'party'], 'top-oneshoulder': ['evening', 'party'],
  'shoes-glitter': ['party', 'evening'], 'dress-tshirt': ['sport', 'casual'], 'top-polo': ['sport', 'casual'],
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
  tintPink: 'grayscale(1) brightness(0.72) sepia(1) saturate(0.65) hue-rotate(297deg) brightness(1.05)',
  tintMint: 'grayscale(1) brightness(0.72) sepia(1) saturate(0.71) hue-rotate(104deg) brightness(1.22)',
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
  ['top-crop', 'Кроп-топ «Мята»', 'common', 'sepia(0.54) saturate(0.97) hue-rotate(127deg) brightness(0.92)'],
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
  ['dress-sundress', 'Сарафан «Ваниль»', 'rare', 'sepia(0.96) saturate(1.74) hue-rotate(349deg) brightness(0.95)'],
  ['dress-sundress', 'Сарафан «Небо»', 'rare', 'sepia(0.36) saturate(0.73) hue-rotate(174deg) brightness(0.92)'],
  ['top-crochet', 'Кофта «Ажур-бордо»', 'rare'],
  ['top-crochet', 'Кофта «Ажур-графит»', 'rare', 'grayscale(1) brightness(1.1)'],
  ['bottom-baggy', 'Джинсы «Бэгги с галстуком»', 'rare'],
  ['bottom-baggy', 'Джинсы «Бэгги-индиго»', 'epic', 'saturate(1.6) brightness(0.75)'],
  ['acc-sunglasses', 'Очки «Нуар»'],
  ['acc-glasses', 'Очки «Черепаха»'],
  ['shoes-ankleboots', 'Ботильоны «Какао»', 'rare'],
  ['shoes-ankleboots', 'Ботильоны «Нуар»', 'rare', TINT.noir],
  ['shoes-flats', 'Балетки «Пудра»', 'common'],
  ['shoes-flats', 'Балетки «Мята»', 'common', TINT.mint],
  ['shoes-slipons', 'Слипоны «Облако»', 'common'],
  ['shoes-slipons', 'Слипоны «Олива»', 'common', 'sepia(0.6) saturate(1.6) hue-rotate(40deg) brightness(0.8)'],
  ['dress-wrap', 'Платье «Терракота»', 'rare'],
  ['dress-wrap', 'Платье «Шалфей»', 'rare', 'sepia(0.69) saturate(0.39) hue-rotate(76deg) brightness(1.37)'],
  ['top-denim', 'Джинсовка «Голубая»', 'rare'],
  ['top-denim', 'Джинсовка «Чёрная»', 'rare', TINT.noir],
  ['bottom-cargo', 'Карго «Олива»', 'common'],
  ['bottom-cargo', 'Карго «Песок»', 'common', 'sepia(0.8) saturate(1.2) brightness(1.3)'],
  ['acc-bag-bucket', 'Сумка-мешок «Карамель»', 'common', 'sepia(0.35) saturate(0.89) hue-rotate(348deg) brightness(0.80)'],
  ['acc-bag-bucket', 'Сумка-мешок «Олива»', 'common', 'sepia(0.50) saturate(0.61) hue-rotate(20deg) brightness(0.62)'],
]);

add('y2k', [
  ['top-y2k', 'Топ «Бабочка»', 'rare'],
  ['top-y2k', 'Топ «Бабочка-мята»', 'rare', 'sepia(0.61) saturate(0.84) hue-rotate(134deg) brightness(0.96)'],
  ['top-cardigan', 'Кардиган «Облачко»'],
  ['top-cardigan', 'Кардиган «Облачко-роза»', 'rare', 'hue-rotate(130deg)'],
  ['bottom-y2k', 'Мини «Звёздный ремень»'],
  ['bottom-y2k', 'Мини «Звёздный ремень-нуар»', 'rare', TINT.noir],
  ['bottom-plaid', 'Мини «Клетка-роза»'],
  ['bottom-plaid', 'Мини «Клетка-лаванда»', 'rare', 'hue-rotate(300deg)'],
  ['bottom-velour', 'Брюки «Велюр-зефир»', 'rare'],
  ['bottom-velour', 'Брюки «Велюр-лаванда»', 'rare', 'sepia(0.58) saturate(1.02) hue-rotate(256deg) brightness(0.95)'],
  ['dress-y2k', 'Платье «Голограмма»', 'epic'],
  ['dress-y2k', 'Платье «Голограмма-небо»', 'epic', 'sepia(0.97) saturate(1.19) hue-rotate(171deg) brightness(0.93)'],
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
  ['top-halter', 'Топ «Халтер-зефир»', 'rare'],
  ['top-halter', 'Топ «Халтер-лаванда»', 'rare', 'hue-rotate(300deg)'],
  ['top-babytee', 'Бэби-ти «Сердечко»', 'common'],
  ['top-babytee', 'Бэби-ти «Сердечко-мятное»', 'common', 'hue-rotate(200deg)'],
  ['acc-bag-baguette', 'Багет «Сиреневые пайетки»', 'rare'],
  ['acc-bag-baguette', 'Багет «Розовые пайетки»', 'rare', 'hue-rotate(60deg)'],
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
  ['shoes-runners', 'Кроссовки «Кобальт»', 'rare'],
  ['shoes-runners', 'Кроссовки «Коралл»', 'rare', 'hue-rotate(150deg) saturate(1.4) brightness(1.3)'],
  ['shoes-boots-chelsea', 'Челси «Шоколад»', 'rare'],
  ['shoes-boots-chelsea', 'Челси «Нуар»', 'rare', 'grayscale(1) brightness(0.8) contrast(1.15)'],
  ['shoes-slides', 'Слайды «Белые»', 'common'],
  ['shoes-slides', 'Слайды «Розовые»', 'common', TINT.tintPink],
  ['shoes-boots-combat', 'Ботинки «Гранж»', 'rare'],
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
  ['acc-ear-drops', 'Серьги «Капли»', 'rare'],
  ['acc-ear-drops', 'Серьги «Капли-серебро»', 'rare', TINT.silver],
  ['acc-bracelet-tennis', 'Браслет «Теннисный»', 'epic'],
  ['acc-bracelet-tennis', 'Браслет «Теннисный-золото»', 'epic', 'sepia(1) saturate(2.5) brightness(0.95)'],
  ['acc-bag-clutch', 'Клатч «Золото»', 'epic'],
  ['acc-bag-clutch', 'Клатч «Серебро»', 'epic', TINT.silver],
  ['acc-neck-pendant', 'Кулон «Солнце»', 'rare'],
  ['acc-neck-pendant', 'Кулон «Луна»', 'rare', TINT.silver],
  ['acc-bracelet-bangles', 'Браслеты «Золотые кольца»', 'common'],
  ['acc-bracelet-bangles', 'Браслеты «Серебряные кольца»', 'common', TINT.silver],
  ['acc-studs-star', 'Серьги «Звёздочки»', 'common'],
  ['acc-studs-star', 'Серьги «Звёздочки-серебро»', 'common', TINT.silver],
  ['acc-neck-pearl', 'Кулон «Жемчужная капля»', 'rare'],
  ['acc-neck-pearl', 'Кулон «Жемчужная капля-серебро»', 'rare', TINT.silver],
  ['acc-bag-mini', 'Мини-сумка «Лак-белый»', 'rare'],
  ['acc-bag-mini', 'Мини-сумка «Лак-роза»', 'rare', 'grayscale(1) brightness(0.72) sepia(1) saturate(2.94) hue-rotate(298deg) brightness(0.9)'],
  ['acc-bracelet-charm', 'Браслет «Шармы»', 'common'],
  ['acc-bracelet-charm', 'Браслет «Шармы-серебро»', 'common', TINT.silver],
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
  ['top-bustier', 'Топ-бюстье «Нуар»', 'rare'],
  ['top-bustier', 'Топ-бюстье «Бордо»', 'rare', 'sepia(1) saturate(4) hue-rotate(300deg) brightness(0.6)'],
  ['top-sequin', 'Топ «Пайетки-серебро»', 'epic'],
  ['top-sequin', 'Топ «Пайетки-шампань»', 'epic', 'sepia(0.7) saturate(1.4) brightness(1.05)'],
  ['bottom-satin', 'Брюки «Изумрудный атлас»', 'rare'],
  ['bottom-satin', 'Брюки «Ночной атлас»', 'rare', TINT.noir],
  ['shoes-mules', 'Мюли «Изумруд»', 'epic'],
  ['shoes-mules', 'Мюли «Сапфир»', 'epic', 'hue-rotate(80deg)'],
  ['dress-cocktail', 'Коктейль «Ягода»', 'rare', 'sepia(0.88) saturate(2.97) hue-rotate(316deg) brightness(1.12)'],
  ['dress-cocktail', 'Коктейль «Изумруд»', 'rare', 'sepia(0.77) saturate(1.42) hue-rotate(162deg) brightness(1.04)'],
  ['bottom-tulle', 'Юбка «Фатин-лаванда»', 'rare'],
  ['bottom-tulle', 'Юбка «Фатин-нуар»', 'rare', TINT.noir],
  ['dress-chiffon', 'Платье «Шифон-небо»', 'rare'],
  ['dress-chiffon', 'Платье «Шифон-слива»', 'rare', 'sepia(0.97) saturate(2.67) hue-rotate(244deg) brightness(0.58)'],
  ['top-oneshoulder', 'Топ «Изумрудное плечо»', 'rare'],
  ['top-oneshoulder', 'Топ «Сапфировое плечо»', 'rare', 'hue-rotate(80deg)'],
  ['shoes-glitter', 'Балетки «Блёстки-серебро»', 'rare'],
  ['shoes-glitter', 'Балетки «Блёстки-золото»', 'rare', 'sepia(1) saturate(2.5) brightness(0.95)'],
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
  ['acc-tote', 'Сумка-тоут «Карамель»', 'rare', 'brightness(1.6) sepia(1) saturate(2.26) hue-rotate(348deg) brightness(1.36)'],
  ['dress-sheath', 'Платье-футляр «Нэви»', 'rare'],
  ['dress-sheath', 'Платье-футляр «Вино»', 'rare', 'sepia(0.03) saturate(1.28) hue-rotate(102deg) brightness(1.27)'],
  ['dress-shirt', 'Платье-рубашка «Небо»', 'common'],
  ['dress-shirt', 'Платье-рубашка «Песок»', 'common', 'sepia(0.8) saturate(0.9) brightness(1.05)'],
  // drawn ivory: a nude shoe would be taken for her foot when the build splits the foot off
  ['shoes-pumps', 'Балетки-лодочки «Айвори»', 'common'],
  ['shoes-pumps', 'Балетки-лодочки «Нюд»', 'common', 'brightness(0.88) sepia(0.6) saturate(1.6) hue-rotate(-20deg)'],
  ['acc-studs-pearl', 'Серьги «Жемчужинки»', 'common'],
  ['acc-studs-pearl', 'Серьги «Розовый жемчуг»', 'common', TINT.tintPink],
  ['bottom-pencil', 'Юбка-карандаш «Графит»', 'common'],
  ['bottom-pencil', 'Юбка-карандаш «Тауп»', 'common', 'sepia(0.6) brightness(1.6)'],
  ['top-turtleneck', 'Водолазка «Сливки»', 'common'],
  ['top-turtleneck', 'Водолазка «Графит»', 'common', 'brightness(0.35)'],
  ['top-stripe', 'Рубашка «Полоска»', 'common'],
  ['top-stripe', 'Рубашка «Персиковая полоска»', 'common', 'hue-rotate(150deg)'],
]);

add('sport', [
  ['top-hoodie', 'Худи «Лаванда»'],
  ['top-hoodie', 'Худи «Мята»', 'common', 'sepia(0.95) saturate(0.75) hue-rotate(107deg) brightness(0.92)'],
  gone(['top-hoodie', 'Худи «Персик»', 'rare', 'hue-rotate(60deg) saturate(1.3)']),
  ['bottom-leggings', 'Леггинсы «Чёрные»'],
  ['bottom-leggings', 'Леггинсы «Графит»', 'common', 'brightness(2.2)'],
  gone(['bottom-shorts', 'Шорты «Светлый деним»', 'common', TINT.lightWash]),
  ['bottom-shorts', 'Шорты «Белые»', 'rare', 'grayscale(1) brightness(1.55)'],
  ['acc-belt-bag', 'Мини-сумка «Розовая»'],
  gone(['acc-belt-bag', 'Мини-сумка «Мята»', 'common', 'hue-rotate(150deg)']),
  ['acc-belt-bag', 'Мини-сумка «Нуар»', 'rare', TINT.noir],
  ['top-sporttop', 'Спорт-топ «Лаванда»', 'common'],
  ['top-sporttop', 'Спорт-топ «Небо»', 'common', 'sepia(0.58) saturate(1.87) hue-rotate(217deg) brightness(0.98)'],
  ['top-zip', 'Олимпийка «Бирюза»', 'rare'],
  ['top-zip', 'Олимпийка «Коралл»', 'rare', 'hue-rotate(175deg) saturate(1.8) brightness(1.25)'],
  ['bottom-joggers', 'Джоггеры «Меланж»', 'common'],
  ['bottom-joggers', 'Джоггеры «Графит»', 'common', 'brightness(0.55)'],
  ['bottom-bikers', 'Велосипедки «Чёрные»', 'common'],
  ['bottom-bikers', 'Велосипедки «Графит»', 'common', 'brightness(2.2)'],
  ['bottom-tennis', 'Юбка «Теннис»', 'rare'],
  ['bottom-tennis', 'Юбка «Теннис-мята»', 'rare', 'sepia(0.45) saturate(2.00) hue-rotate(105deg) brightness(0.88)'],
  ['acc-bag-sport', 'Мини-сумка «Спорт-мята»', 'common'],
  ['acc-bag-sport', 'Мини-сумка «Спорт-ваниль»', 'common', 'sepia(1.00) saturate(1.79) hue-rotate(351deg) brightness(0.95)'],
  ['acc-shield-sport', 'Очки «Спорт»', 'common', 'saturate(1.12) hue-rotate(37deg) brightness(0.65)'],
  ['acc-shield-sport', 'Очки «Спорт-закат»', 'common', 'sepia(0.08) saturate(0.81) hue-rotate(169deg) brightness(0.84)'],
  ['dress-tshirt', 'Платье-футболка «Меланж»', 'common'],
  ['dress-tshirt', 'Платье-футболка «Мята»', 'common', TINT.tintMint],
  ['top-polo', 'Поло «Теннис»', 'common'],
  ['top-polo', 'Поло «Теннис-бордо»', 'common', 'hue-rotate(110deg)'],
]);

/* Премиум: only rare and epic pieces, so a search here finds rarer things. */
add('premium', [
  ['dress-ballgown', 'Платье «Бал»', 'epic'],
  ['dress-ballgown', 'Платье «Бал-роза»', 'epic', TINT.tintPink],
  ['dress-velvet', 'Платье «Бархат-вино»', 'epic'],
  ['dress-velvet', 'Платье «Бархат-полночь»', 'epic', 'hue-rotate(240deg) saturate(0.9)'],
  ['top-tweed', 'Жакет «Твид-айвори»', 'epic'],
  ['top-tweed', 'Жакет «Твид-пудра»', 'epic', TINT.tintPink],
  ['top-faux', 'Шубка «Облако»', 'epic'],
  ['top-faux', 'Шубка «Кэмел»', 'epic', 'brightness(0.55) sepia(1) saturate(1.5)'],
  ['bottom-leather', 'Брюки «Кожа-шоколад»', 'rare'],
  ['bottom-leather', 'Брюки «Кожа-нуар»', 'rare', TINT.noir],
  ['bottom-sequin', 'Юбка «Золотые пайетки»', 'epic'],
  ['bottom-sequin', 'Юбка «Серебряные пайетки»', 'epic', TINT.silver],
  ['shoes-boots-riding', 'Сапоги «Бордо»', 'rare'],
  ['shoes-boots-riding', 'Сапоги «Нуар»', 'rare', TINT.noir],
  ['shoes-velvet', 'Лоферы «Королевский бархат»', 'epic'],
  ['shoes-velvet', 'Лоферы «Винный бархат»', 'epic', 'hue-rotate(100deg)'],
  ['acc-bag-quilted', 'Сумка «Стёганая пудра»', 'epic'],
  ['acc-bag-quilted', 'Сумка «Стёганая нуар»', 'epic', TINT.noir],
  ['acc-neck-diamond', 'Колье «Бриллианты»', 'epic'],
  ['acc-neck-diamond', 'Колье «Сапфиры»', 'epic', 'sepia(1) saturate(5) hue-rotate(180deg) brightness(0.9)'],
  ['acc-ear-chandelier', 'Серьги «Люстры»', 'epic'],
  ['acc-ear-chandelier', 'Серьги «Люстры-золото»', 'epic', 'sepia(1) saturate(2.5) brightness(0.95)'],
  ['acc-cateye', 'Очки «Кошачий глаз»', 'rare'],
  ['acc-cateye', 'Очки «Кошачий глаз-карамель»', 'rare', 'sepia(1) saturate(2) brightness(0.8)'],
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
