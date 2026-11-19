import layers from '../art/layers.json';

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
  /** Diamonds paid on top of the coin price (the rarest Premium pieces). */
  gems?: number;
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
  common: { name: 'Обычная', color: '#8C9AAE', chance: 0.75, price: [60, 180], xp: 5 },
  rare: { name: 'Редкая', color: '#3D8BFD', chance: 0.2, price: [350, 700], xp: 15 },
  epic: { name: 'Очень редкая', color: '#B04CE0', chance: 0.05, price: [1500, 3000], xp: 40 },
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
  { id: 'step', name: 'Шаг', about: 'Обувь, сумки и украшения', level: 1, depts: ['shoes', 'accessories'], color: '#7FC8F8', emoji: '👠' },
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
  // city batches (art-src/v2/batches/city-a.tsv, city-b.tsv): many everyday pieces for the newbie shop
  'dress-tiered': 'dress', 'dress-knit': 'dress', 'dress-floral': 'dress', 'dress-polka': 'dress', 'top-tank': 'top', 'top-flannel': 'top', 'top-sweatshirt': 'top', 'top-peasant': 'top', 'top-bomber': 'top', 'top-breton': 'top', 'bottom-wide': 'bottom', 'bottom-denimskirt': 'bottom', 'bottom-flare': 'bottom', 'bottom-bermuda': 'bottom', 'bottom-tiered': 'bottom', 'bottom-cords': 'bottom',
  'shoes-canvas': 'shoes', 'shoes-flatsandals': 'shoes', 'shoes-chunky': 'shoes', 'shoes-boots-rain': 'shoes', 'shoes-boots-cozy': 'shoes', 'acc-bag-straw': 'bag', 'acc-bag-saddle': 'bag', 'acc-bag-canvas': 'bag', 'acc-bag-hobo': 'bag', 'acc-round': 'glasses', 'acc-retro': 'glasses',
  // office-a, y2k-a (art-src/v2/batches/office-a.tsv, y2k-a.tsv): fuller early shops
  'top-shirt': 'top', 'top-bow': 'top', 'top-vest': 'top', 'top-cami': 'top', 'top-knitvest': 'top', 'top-peplum': 'top', 'bottom-palazzo': 'bottom', 'bottom-culottes': 'bottom', 'bottom-pleatmidi': 'bottom', 'bottom-woolskirt': 'bottom', 'bottom-cigarette': 'bottom', 'dress-pinafore': 'dress', 'dress-trench': 'dress', 'dress-satinmidi': 'dress', 'dress-blazer': 'dress', 'shoes-oxfords': 'shoes', 'shoes-boots-lace': 'shoes', 'acc-thin': 'glasses', 'acc-bag-brief': 'bag',
  'top-tube': 'top', 'top-corset': 'top', 'top-butterfly': 'top', 'top-velour': 'top', 'top-puffer': 'top', 'top-gingham': 'top', 'bottom-lowrise': 'bottom', 'bottom-cargomini': 'bottom', 'bottom-track': 'bottom', 'bottom-satinmini': 'bottom', 'dress-slip': 'dress', 'dress-haltermini': 'dress', 'dress-denim': 'dress', 'dress-ruched': 'dress', 'shoes-flipflops': 'shoes', 'shoes-skate': 'shoes',
  // step-a (art-src/v2/batches/step-a.tsv): Шаг with bags and jewellery
  'shoes-court': 'shoes', 'shoes-knit': 'shoes', 'shoes-slingback': 'shoes', 'shoes-espadrilles': 'shoes', 'shoes-moccasins': 'shoes', 'shoes-slippers': 'shoes', 'shoes-boots-knee': 'shoes', 'shoes-boots-snow': 'shoes', 'shoes-boots-hiking': 'shoes', 'shoes-gladiator': 'shoes', 'acc-bag-frame': 'bag', 'acc-bag-bowling': 'bag', 'acc-bag-pouch': 'bag', 'acc-bag-ring': 'bag', 'acc-studs-heart': 'earrings', 'acc-studs-moon': 'earrings', 'acc-ear-bar': 'earrings', 'acc-neck-heart': 'necklace', 'acc-neck-layered': 'necklace', 'acc-bracelet-chain': 'bracelet',
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
  'dress-tiered': ['casual', 'beach'], 'dress-knit': ['casual', 'winter'], 'dress-floral': ['casual', 'party'], 'dress-polka': ['casual', 'party'], 'top-tank': ['casual', 'beach', 'sport'], 'top-flannel': ['casual', 'winter'], 'top-sweatshirt': ['casual', 'sport', 'winter'], 'top-peasant': ['casual', 'beach'], 'top-bomber': ['casual', 'party'], 'top-breton': ['casual'], 'bottom-wide': ['casual', 'beach'], 'bottom-denimskirt': ['casual', 'party'], 'bottom-flare': ['casual', 'party'], 'bottom-bermuda': ['casual', 'beach'], 'bottom-tiered': ['casual', 'beach'], 'bottom-cords': ['casual', 'winter'],
  'shoes-canvas': ['casual', 'sport'], 'shoes-flatsandals': ['casual', 'beach'], 'shoes-chunky': ['casual', 'sport'], 'shoes-boots-rain': ['casual', 'winter'], 'shoes-boots-cozy': ['casual', 'winter'], 'acc-bag-straw': ['casual', 'beach'], 'acc-bag-saddle': ['casual'], 'acc-bag-canvas': ['casual'], 'acc-bag-hobo': ['casual', 'party'], 'acc-round': ['casual', 'beach'], 'acc-retro': ['casual', 'beach', 'party'],
  'top-shirt': ['office', 'casual'], 'top-bow': ['office', 'evening'], 'top-vest': ['office'], 'top-cami': ['office', 'evening'], 'top-knitvest': ['office', 'casual', 'winter'], 'top-peplum': ['office', 'evening'], 'bottom-palazzo': ['office', 'evening'], 'bottom-culottes': ['office', 'casual'], 'bottom-pleatmidi': ['office', 'evening'], 'bottom-woolskirt': ['office', 'winter'], 'bottom-cigarette': ['office', 'casual'], 'dress-pinafore': ['office', 'casual'], 'dress-trench': ['office', 'winter'], 'dress-satinmidi': ['office', 'evening'], 'dress-blazer': ['office', 'party', 'evening'], 'shoes-oxfords': ['office', 'casual'], 'shoes-boots-lace': ['office', 'winter', 'casual'], 'acc-thin': ['office', 'casual'], 'acc-bag-brief': ['office'],
  'top-tube': ['party', 'beach'], 'top-corset': ['party', 'evening'], 'top-butterfly': ['casual', 'party'], 'top-velour': ['casual', 'sport'], 'top-puffer': ['party', 'winter'], 'top-gingham': ['casual', 'beach', 'party'], 'bottom-lowrise': ['casual', 'party'], 'bottom-cargomini': ['casual', 'party'], 'bottom-track': ['sport', 'casual'], 'bottom-satinmini': ['party', 'evening'], 'dress-slip': ['party', 'evening'], 'dress-haltermini': ['party'], 'dress-denim': ['casual', 'party'], 'dress-ruched': ['party', 'winter'], 'shoes-flipflops': ['beach', 'party'], 'shoes-skate': ['casual', 'sport'],
  'shoes-court': ['casual', 'sport'], 'shoes-knit': ['sport', 'casual'], 'shoes-slingback': ['office', 'evening'], 'shoes-espadrilles': ['beach', 'casual'], 'shoes-moccasins': ['casual', 'office'], 'shoes-slippers': ['casual', 'winter'], 'shoes-boots-knee': ['winter', 'office', 'evening'], 'shoes-boots-snow': ['winter', 'casual'], 'shoes-boots-hiking': ['winter', 'sport', 'casual'], 'shoes-gladiator': ['beach', 'party'], 'acc-bag-frame': ['evening', 'party', 'office'], 'acc-bag-bowling': ['casual', 'sport'], 'acc-bag-pouch': ['casual', 'party'], 'acc-bag-ring': ['casual', 'party'], 'acc-studs-heart': ['casual', 'party'], 'acc-studs-moon': ['casual', 'evening'], 'acc-ear-bar': ['office', 'casual'], 'acc-neck-heart': ['casual', 'party'], 'acc-neck-layered': ['casual', 'party', 'evening'], 'acc-bracelet-chain': ['casual', 'office'],
};
/** A shop adds its own style to everything it sells. */
const SHOP_TAGS: Record<string, Tag[]> = { glam: ['party'], evening: ['evening'], office: ['office'], sport: ['sport'], y2k: ['party'] };

export const TAG_ICONS: Record<Tag, string> = {
  casual: '🌼', office: '💼', party: '🎉', evening: '🥂', sport: '🏃‍♀️', beach: '🌴', winter: '❄️',
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
  gold: 'sepia(1) saturate(2.5) brightness(0.95)',
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

/**
 * A piece goes on sale only once its art is built (a layer in layers.json): a batch whose catalog lines
 * are written before build.py has run stays hidden instead of showing empty pictures and a bare doll.
 */
const BUILT = new Set(Object.keys(layers));
export const artBuilt = (art: string) => BUILT.has(art) || BUILT.has(`${art}-front`) || BUILT.has(`${art}-back`);

function add(shop: string, specs: (Spec | Retired)[]) {
  const seen: Record<string, number> = {};
  specs.forEach((entry) => {
    const [art, name, rarity = 'common', filter] = 'retired' in entry ? entry.retired : entry;
    seen[art] = (seen[art] ?? 0) + 1;
    if ('retired' in entry) return;
    // ids are counted above, so a hidden piece keeps its id for when its art arrives
    if (!artBuilt(art)) return;
    const id = `${shop}-${art}-${seen[art]}`;
    const [lo, hi] = RARITY[rarity].price;
    const price = shop === 'starter' ? 0 : Math.round((lo + (hi - lo) * hash(id)) / 10) * 10;
    // about half of the very rare Premium pieces cost coins + diamonds: 1 500 → 6 💎, 3 000 → 12 💎
    const gems = shop === 'premium' && rarity === 'epic' && hash(`${id}:gems`) < 0.5 ? Math.round(price / 250) : undefined;
    const item: Item = { id, name, art, filter, slot: ART_SLOT[art], rarity, price, gems, shop, tags: [...new Set([...(ART_TAGS[art] ?? []), ...(SHOP_TAGS[shop] ?? [])])] };
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
  // common, so the dress rack follows the 75/20/5 drop chances (it used to hold only rare dresses)
  ['dress-wrap', 'Платье «Терракота»', 'common'],
  ['dress-wrap', 'Платье «Шалфей»', 'common', 'sepia(0.69) saturate(0.39) hue-rotate(76deg) brightness(1.37)'],
  ['top-denim', 'Джинсовка «Голубая»', 'rare'],
  ['top-denim', 'Джинсовка «Чёрная»', 'rare', TINT.noir],
  ['bottom-cargo', 'Карго «Олива»', 'common'],
  ['bottom-cargo', 'Карго «Песок»', 'common', 'sepia(0.8) saturate(1.2) brightness(1.3)'],
  ['acc-bag-bucket', 'Сумка-мешок «Карамель»', 'common', 'sepia(0.35) saturate(0.89) hue-rotate(348deg) brightness(0.80)'],
  ['acc-bag-bucket', 'Сумка-мешок «Олива»', 'common', 'sepia(0.50) saturate(0.61) hue-rotate(20deg) brightness(0.62)'],  // the newbie shop: many everyday pieces, mostly common, so the first searches last (city-a/city-b batches)
  ['dress-tiered', 'Платье «Ярусы-роза»', 'common'],
  ['dress-tiered', 'Платье «Ярусы-небо»', 'common', 'sepia(0.40) saturate(0.70) hue-rotate(-143deg) brightness(1.16)'],
  ['dress-knit', 'Платье-свитер «Крем»', 'common'],
  ['dress-knit', 'Платье-свитер «Шоколад»', 'rare', 'grayscale(1) brightness(0.72) sepia(1) saturate(3.11) hue-rotate(-38deg) brightness(0.36)'],
  ['dress-floral', 'Платье «Васильки»', 'common'],
  ['dress-floral', 'Платье «Мятный сад»', 'rare', 'saturate(1.54) hue-rotate(116deg)'],
  ['dress-polka', 'Платье «Горошек-вишня»', 'common'],
  ['dress-polka', 'Платье «Горошек-нэви»', 'epic', 'sepia(0.35) saturate(0.75) hue-rotate(-117deg) brightness(0.57)'],
  ['top-tank', 'Майка «Молоко»', 'common'],
  ['top-tank', 'Майка «Графит»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(0.36) hue-rotate(-144deg) brightness(0.32)'],
  ['top-flannel', 'Рубашка «Клетка-вишня»', 'common'],
  ['top-flannel', 'Рубашка «Клетка-олива»', 'common', 'sepia(0.97) saturate(1.25) hue-rotate(27deg) brightness(1.03)'],
  ['top-sweatshirt', 'Свитшот «Меланж»', 'common'],
  ['top-sweatshirt', 'Свитшот «Лаванда»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(1.58) hue-rotate(-150deg) brightness(1.35)'],
  ['top-peasant', 'Блузка «Деревенская»', 'common'],
  ['top-peasant', 'Блузка «Небо»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(0.95) hue-rotate(-192deg) brightness(0.95)'],
  ['top-bomber', 'Бомбер «Олива»', 'common'],
  ['top-bomber', 'Бомбер «Нэви»', 'rare', 'sepia(0.37) saturate(2.59) hue-rotate(-182deg) brightness(0.40)'],
  ['top-breton', 'Лонгслив «Тельняшка»', 'common'],
  ['top-breton', 'Лонгслив «Полоска-вино»', 'common', 'saturate(2.34) hue-rotate(101deg)'],
  ['bottom-wide', 'Брюки «Лён-шалфей»', 'common'],
  ['bottom-wide', 'Брюки «Лён-терракота»', 'common', 'sepia(1) saturate(4.37) hue-rotate(-45deg) brightness(0.76)'],
  ['bottom-denimskirt', 'Юбка «Деним»', 'common'],
  ['bottom-denimskirt', 'Юбка «Чёрный деним»', 'common', TINT.noir],
  ['bottom-flare', 'Клёш «Индиго»', 'common'],
  ['bottom-flare', 'Клёш «Молоко»', 'rare', 'grayscale(1) brightness(0.72) sepia(1) saturate(0.12) hue-rotate(0deg) brightness(2.60)'],
  ['bottom-bermuda', 'Бермуды «Молоко»', 'common'],
  ['bottom-bermuda', 'Бермуды «Шалфей»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(0.61) hue-rotate(58deg) brightness(0.86)'],
  ['bottom-tiered', 'Юбка «Ярусы-лаванда»', 'common'],
  ['bottom-tiered', 'Юбка «Ярусы-масло»', 'rare', 'sepia(0.91) saturate(1.76) hue-rotate(10deg) brightness(1.00)'],
  ['bottom-cords', 'Вельвет «Шоколад»', 'common'],
  ['bottom-cords', 'Вельвет «Бордо»', 'rare', 'sepia(0.13) saturate(3.25) hue-rotate(-30deg) brightness(0.95)'],
  ['shoes-canvas', 'Кеды «Молоко»', 'common'],
  ['shoes-canvas', 'Кеды «Пудра»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(1.53) hue-rotate(-55deg) brightness(1.10)'],
  ['shoes-flatsandals', 'Сандалии «Шоколад»', 'common'],
  ['shoes-flatsandals', 'Сандалии «Чёрные»', 'common', TINT.noir],
  ['shoes-chunky', 'Кроссовки «Лаванда»', 'common'],
  ['shoes-chunky', 'Кроссовки «Мята»', 'rare', 'saturate(0.85) hue-rotate(-124deg)'],
  ['shoes-boots-rain', 'Резиновые сапоги «Вишня»', 'common'],
  ['shoes-boots-rain', 'Резиновые сапоги «Нэви»', 'rare', 'sepia(0.36) saturate(0.78) hue-rotate(-116deg) brightness(0.64)'],
  ['shoes-boots-cozy', 'Угги «Крем»', 'common'],
  ['shoes-boots-cozy', 'Угги «Графит»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(0.36) hue-rotate(-144deg) brightness(0.35)'],
  ['acc-bag-straw', 'Корзинка «Солома»', 'common'],
  ['acc-bag-straw', 'Корзинка «Шоколад»', 'common', 'sepia(0.30) saturate(2.41) hue-rotate(-42deg) brightness(0.36)'],
  ['acc-bag-saddle', 'Сумка-седло «Вишня»', 'common'],
  ['acc-bag-saddle', 'Сумка-седло «Карамель»', 'rare', 'sepia(0.71) saturate(1.16) hue-rotate(29deg) brightness(1.74)'],
  ['acc-bag-canvas', 'Шопер «Ромашка»', 'common'],
  ['acc-bag-canvas', 'Шопер «Шалфей»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(0.61) hue-rotate(58deg) brightness(0.85)'],
  ['acc-bag-hobo', 'Хобо «Шоколад»', 'common'],
  ['acc-bag-hobo', 'Хобо «Олива»', 'rare', 'sepia(0.89) saturate(1.22) hue-rotate(26deg) brightness(1.45)'],
  ['acc-round', 'Очки «Круглые-золото»', 'common'],
  ['acc-round', 'Очки «Круглые-серебро»', 'common', TINT.silver],
  ['acc-retro', 'Очки «Ретро-молоко»', 'common'],
  ['acc-retro', 'Очки «Ретро-роза»', 'rare', 'grayscale(1) brightness(0.72) sepia(1) saturate(3.19) hue-rotate(-64deg) brightness(0.90)'],
]);

add('y2k', [
  ['top-y2k', 'Топ «Бабочка»', 'rare'],
  ['top-y2k', 'Топ «Бабочка-мята»', 'rare', 'sepia(0.61) saturate(0.84) hue-rotate(134deg) brightness(0.96)'],
  ['top-cardigan', 'Кардиган «Облачко»'],
  ['top-cardigan', 'Кардиган «Облачко-роза»', 'common', 'hue-rotate(130deg)'],
  ['bottom-y2k', 'Мини «Звёздный ремень»'],
  ['bottom-y2k', 'Мини «Звёздный ремень-нуар»', 'common', TINT.noir],
  ['bottom-plaid', 'Мини «Клетка-роза»'],
  ['bottom-plaid', 'Мини «Клетка-лаванда»', 'common', 'hue-rotate(300deg)'],
  ['bottom-velour', 'Брюки «Велюр-зефир»', 'common'],
  ['bottom-velour', 'Брюки «Велюр-лаванда»', 'common', 'sepia(0.58) saturate(1.02) hue-rotate(256deg) brightness(0.95)'],
  ['dress-y2k', 'Платье «Голограмма»', 'rare'],
  ['dress-y2k', 'Платье «Голограмма-небо»', 'rare', 'sepia(0.97) saturate(1.19) hue-rotate(171deg) brightness(0.93)'],
  ['shoes-platform', 'Туфли «Платформа-зефир»', 'rare'],
  ['shoes-platform', 'Туфли «Платформа-лаванда»', 'rare', 'hue-rotate(300deg)'],
  ['shoes-whiteboots', 'Сапоги «Снежок»', 'epic'],
  ['shoes-whiteboots', 'Сапоги «Снежок-розовые»', 'epic', 'sepia(0.5) saturate(3) hue-rotate(290deg)'],
  ['acc-shield', 'Очки «Футуризм»'],
  ['acc-shield', 'Очки «Футуризм-голубые»', 'common', 'hue-rotate(200deg)'],
  ['acc-choker', 'Чокер «Сердечко»'],
  ['acc-choker', 'Чокер «Сердечко-золото»', 'common', TINT.gold],
  ['acc-bracelet', 'Браслет «Бабочка»'],
  ['acc-bracelet', 'Браслет «Бабочка-роза»', 'common', TINT.tintPink],
  ['acc-studs', 'Серьги «Бабочки»'],
  ['acc-studs', 'Серьги «Бабочки-золото»', 'common', TINT.gold],
  ['top-halter', 'Топ «Халтер-зефир»', 'common'],
  ['top-halter', 'Топ «Халтер-лаванда»', 'common', 'hue-rotate(300deg)'],
  ['top-babytee', 'Бэби-ти «Сердечко»', 'common'],
  ['top-babytee', 'Бэби-ти «Сердечко-мятное»', 'common', 'hue-rotate(200deg)'],
  ['acc-bag-baguette', 'Багет «Сиреневые пайетки»', 'common'],
  ['acc-bag-baguette', 'Багет «Розовые пайетки»', 'common', 'hue-rotate(60deg)'],
  // y2k-a: more clothes for the early levels
  ['top-tube', 'Топ-бандо «Ягода»', 'common'],
  ['top-tube', 'Топ-бандо «Небо»', 'common', 'sepia(0.94) saturate(0.97) hue-rotate(-183deg) brightness(1.59)'],
  ['top-corset', 'Корсет «Лаванда»', 'rare'],
  ['top-corset', 'Корсет «Чёрный»', 'rare', TINT.noir],
  ['top-butterfly', 'Топ «Бабочка»', 'common'],
  ['top-butterfly', 'Топ «Бабочка-лаванда»', 'common', 'hue-rotate(-60deg) saturate(0.9)'],
  ['top-velour', 'Велюр-худи «Роза»', 'common'],
  ['top-velour', 'Велюр-худи «Шалфей»', 'common', 'sepia(0.92) saturate(0.62) hue-rotate(66deg) brightness(1.07)'],
  ['top-puffer', 'Пуховик-кроп «Небо»', 'rare'],
  ['top-puffer', 'Пуховик-кроп «Серебро»', 'rare', 'sepia(0.60) saturate(0.65) hue-rotate(-194deg) brightness(0.94)'],
  ['top-gingham', 'Топ «Клетка-лаванда»', 'common'],
  ['top-gingham', 'Топ «Клетка-роза»', 'common', 'saturate(4.00) hue-rotate(46deg)'],
  ['bottom-lowrise', 'Джинсы «Голубые»', 'common'],
  ['bottom-lowrise', 'Джинсы «Чёрные»', 'common', TINT.noir],
  ['bottom-cargomini', 'Мини-карго «Олива»', 'common'],
  ['bottom-cargomini', 'Мини-карго «Чёрная»', 'common', TINT.noir],
  ['bottom-track', 'Треники «Вишня»', 'common'],
  ['bottom-track', 'Треники «Нэви»', 'common', 'sepia(0.40) saturate(0.84) hue-rotate(-118deg) brightness(0.60)'],
  ['bottom-satinmini', 'Атласная мини «Серебро»', 'common'],
  ['bottom-satinmini', 'Атласная мини «Роза»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(1.66) hue-rotate(-69deg) brightness(1.03)'],
  ['dress-slip', 'Платье-комбинация «Небо»', 'rare'],
  ['dress-slip', 'Платье-комбинация «Лаванда»', 'rare', 'saturate(0.83) hue-rotate(50deg)'],
  ['dress-haltermini', 'Платье с блёстками «Роза»', 'epic'],
  ['dress-haltermini', 'Платье с блёстками «Чёрное»', 'epic', TINT.noir],
  ['dress-denim', 'Джинсовое платье «Деним»', 'common'],
  ['dress-denim', 'Джинсовое платье «Слива»', 'common', 'saturate(0.98) hue-rotate(65deg)'],
  ['dress-ruched', 'Платье со сборкой «Сапфир»', 'common'],
  ['dress-ruched', 'Платье со сборкой «Бордо»', 'common', 'sepia(0.22) saturate(2.12) hue-rotate(109deg) brightness(0.67)'],
  ['shoes-flipflops', 'Шлёпанцы «Лаванда»', 'common'],
  ['shoes-flipflops', 'Шлёпанцы «Чёрные»', 'common', TINT.noir],
  ['shoes-skate', 'Скейт-кеды «Чёрные»', 'rare'],
  ['shoes-skate', 'Скейт-кеды «Чёрно-голубые»', 'rare', 'saturate(0.88) hue-rotate(-123deg)'],
]);

add('step', [
  gone(['shoes-sneakers', 'Кроссовки «Небо»', 'common', TINT.sky]),
  gone(['shoes-sneakers', 'Кроссовки «Лаванда»', 'common', TINT.lilac]),
  ['shoes-sneakers', 'Кроссовки «Ночь»', 'common', TINT.noir],
  ['shoes-heels', 'Туфли «Бордо»', 'common', 'sepia(1) saturate(4) hue-rotate(310deg) brightness(0.9)'],
  gone(['shoes-heels', 'Туфли «Нюд»', 'rare', 'invert(0.75) sepia(0.6) saturate(1.5)']),
  gone(['shoes-heels', 'Туфли «Серебро»', 'epic', 'invert(0.8) grayscale(1) brightness(1.1)']),
  ['shoes-boots', 'Сапоги «Нуар»', 'common'],
  ['shoes-sandals', 'Босоножки «Золото»', 'common'],
  ['shoes-loafers', 'Лоферы «Коньяк»', 'common'],
  ['shoes-hightops', 'Кеды «Классика»'],
  ['shoes-maryjanes', 'Туфли «Мэри Джейн»', 'rare'],
  ['shoes-maryjanes', 'Туфли «Мэри Джейн нуар»', 'epic', 'grayscale(1) brightness(0.55) contrast(1.3)'],
  ['shoes-runners', 'Кроссовки «Кобальт»', 'common'],
  ['shoes-runners', 'Кроссовки «Коралл»', 'common', 'hue-rotate(150deg) saturate(1.4) brightness(1.3)'],
  ['shoes-boots-chelsea', 'Челси «Шоколад»', 'common'],
  ['shoes-boots-chelsea', 'Челси «Нуар»', 'rare', 'grayscale(1) brightness(0.8) contrast(1.15)'],
  ['shoes-slides', 'Слайды «Белые»', 'common'],
  ['shoes-slides', 'Слайды «Розовые»', 'common', TINT.tintPink],
  ['shoes-boots-combat', 'Ботинки «Гранж»', 'rare'],
  // step-a: more shoes, plus bags and jewellery for the first level
  ['shoes-court', 'Кеды «Белая кожа»', 'common'],
  ['shoes-court', 'Кеды «Пудра»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(0.84) hue-rotate(-60deg) brightness(1.06)'],
  ['shoes-knit', 'Носки-кроссовки «Графит»', 'common'],
  ['shoes-knit', 'Носки-кроссовки «Лаванда»', 'common', 'brightness(1.66) sepia(1) saturate(1.08) hue-rotate(-141deg) brightness(1.23)'],
  ['shoes-slingback', 'Слингбэки «Чёрные»', 'rare'],
  ['shoes-slingback', 'Слингбэки «Вино»', 'rare', 'brightness(0.61) sepia(1) saturate(4.00) hue-rotate(-67deg) brightness(2.26)'],
  ['shoes-espadrilles', 'Эспадрильи «Нэви»', 'common'],
  ['shoes-espadrilles', 'Эспадрильи «Вишня»', 'common', 'sepia(1.00) saturate(4.37) hue-rotate(-54deg) brightness(1.60)'],
  ['shoes-moccasins', 'Мокасины «Шоколад»', 'common'],
  ['shoes-moccasins', 'Мокасины «Олива»', 'common', 'sepia(0.91) saturate(1.21) hue-rotate(26deg) brightness(1.59)'],
  ['shoes-slippers', 'Тапочки «Лаванда»', 'common'],
  ['shoes-slippers', 'Тапочки «Небо»', 'common', 'saturate(0.98) hue-rotate(-61deg)'],
  ['shoes-boots-knee', 'Ботфорты «Чёрные»', 'epic'],
  ['shoes-boots-knee', 'Ботфорты «Шоколад»', 'epic', 'brightness(1.82) sepia(1) saturate(2.06) hue-rotate(-27deg) brightness(0.87)'],
  ['shoes-boots-snow', 'Дутики «Небо»', 'common'],
  ['shoes-boots-snow', 'Дутики «Серебро»', 'common', 'sepia(0.60) saturate(0.54) hue-rotate(173deg) brightness(0.96)'],
  ['shoes-boots-hiking', 'Ботинки «Тропа»', 'common'],
  ['shoes-boots-hiking', 'Ботинки «Тропа-графит»', 'common', 'sepia(0.57) saturate(0.30) hue-rotate(-148deg) brightness(0.68)'],
  ['shoes-gladiator', 'Гладиаторы «Золото»', 'rare'],
  ['shoes-gladiator', 'Гладиаторы «Чёрные»', 'rare', TINT.noir],
  ['acc-bag-frame', 'Сумка-фермуар «Вишня»', 'rare'],
  ['acc-bag-frame', 'Сумка-фермуар «Вино»', 'rare', 'hue-rotate(-8deg) saturate(0.85) brightness(0.65)'],
  ['acc-bag-bowling', 'Сумка-боулинг «Небо»', 'common'],
  ['acc-bag-bowling', 'Сумка-боулинг «Роза»', 'common', 'saturate(1.59) hue-rotate(124deg)'],
  ['acc-bag-pouch', 'Клатч-мешочек «Лаванда»', 'common'],
  ['acc-bag-pouch', 'Клатч-мешочек «Шалфей»', 'common', 'sepia(0.98) saturate(0.68) hue-rotate(53deg) brightness(0.76)'],
  ['acc-bag-ring', 'Сумка с кольцом «Шоколад»', 'common'],
  ['acc-bag-ring', 'Сумка с кольцом «Молоко»', 'common', 'brightness(2.79) sepia(1) saturate(0.41) hue-rotate(0deg) brightness(1.56)'],
  ['acc-studs-heart', 'Серьги «Сердечки»', 'common'],
  ['acc-studs-heart', 'Серьги «Сердечки-серебро»', 'common', TINT.silver],
  ['acc-studs-moon', 'Серьги «Луна»', 'common'],
  ['acc-studs-moon', 'Серьги «Луна-серебро»', 'common', TINT.silver],
  ['acc-ear-bar', 'Серьги «Палочки»', 'common'],
  ['acc-ear-bar', 'Серьги «Палочки-роза»', 'common', TINT.tintPink],
  ['acc-neck-heart', 'Кулон «Сердце»', 'common'],
  ['acc-neck-heart', 'Кулон «Сердце-серебро»', 'common', TINT.silver],
  ['acc-neck-layered', 'Цепочки «Двойные»', 'rare'],
  ['acc-neck-layered', 'Цепочки «Двойные-серебро»', 'rare', TINT.silver],
  ['acc-bracelet-chain', 'Браслет «Цепочка»', 'common'],
  ['acc-bracelet-chain', 'Браслет «Цепочка-роза»', 'common', TINT.tintPink],
]);

add('glam', [
  ['acc-hoops', 'Серьги-кольца «Серебро»', 'common', TINT.silver],
  gone(['acc-hoops', 'Серьги-кольца «Розовое золото»', 'rare', 'hue-rotate(320deg) saturate(1.2)']),
  gone(['acc-bag', 'Сумка «Пудра»', 'common', TINT.tintPink]),
  gone(['acc-bag', 'Сумка «Мята»', 'rare', TINT.tintMint]),
  ['acc-bag', 'Сумка «Нуар»', 'rare', TINT.noir],
  ['acc-chain', 'Цепочка «Золото»'],
  ['acc-chain', 'Цепочка «Серебро»', 'common', TINT.silver],
  gone(['acc-pearls', 'Жемчуг «Белый»', 'rare']),
  ['acc-pearls', 'Жемчуг «Розовый»', 'epic', TINT.tintPink],
  ['acc-ear-drops', 'Серьги «Капли»', 'common'],
  ['acc-ear-drops', 'Серьги «Капли-серебро»', 'common', TINT.silver],
  ['acc-bracelet-tennis', 'Браслет «Теннисный»', 'rare'],
  ['acc-bracelet-tennis', 'Браслет «Теннисный-золото»', 'rare', TINT.gold],
  ['acc-bag-clutch', 'Клатч «Золото»', 'rare'],
  ['acc-bag-clutch', 'Клатч «Серебро»', 'rare', TINT.silver],
  ['acc-neck-pendant', 'Кулон «Солнце»', 'common'],
  ['acc-neck-pendant', 'Кулон «Луна»', 'common', TINT.silver],
  ['acc-bracelet-bangles', 'Браслеты «Золотые кольца»', 'common'],
  ['acc-bracelet-bangles', 'Браслеты «Серебряные кольца»', 'common', TINT.silver],
  ['acc-studs-star', 'Серьги «Звёздочки»', 'common'],
  ['acc-studs-star', 'Серьги «Звёздочки-серебро»', 'common', TINT.silver],
  ['acc-neck-pearl', 'Кулон «Жемчужная капля»', 'common'],
  ['acc-neck-pearl', 'Кулон «Жемчужная капля-серебро»', 'common', TINT.silver],
  ['acc-bag-mini', 'Мини-сумка «Лак-белый»', 'common'],
  ['acc-bag-mini', 'Мини-сумка «Лак-роза»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(2.94) hue-rotate(298deg) brightness(0.9)'],
  ['acc-bracelet-charm', 'Браслет «Шармы»', 'common'],
  ['acc-bracelet-charm', 'Браслет «Шармы-серебро»', 'common', TINT.silver],
]);

add('evening', [
  ['dress-red', 'Платье «Алый шёлк»', 'common'],
  ['dress-red', 'Платье «Сапфир»', 'common', 'hue-rotate(220deg)'],
  gone(['dress-red', 'Платье «Аметист»', 'epic', 'hue-rotate(270deg)']),
  ['dress-black', 'Платье «Полночь»', 'common', 'sepia(1) hue-rotate(190deg) saturate(3) brightness(1.4)'],
  gone(['shoes-heels', 'Туфли «Классика»', 'common']),
  ['dress-gown', 'Платье «Изумрудный блеск»', 'rare'],
  ['dress-gown', 'Платье «Сапфировый блеск»', 'rare', 'hue-rotate(100deg) saturate(1.3)'],
  gone(['dress-gown', 'Платье «Рубиновый блеск»', 'rare', 'hue-rotate(200deg) saturate(1.8) brightness(1.25)']),
  ['bottom-midi', 'Юбка-миди «Шампань»'],
  gone(['top-blouse', 'Блузка «Шёлк»']),
  ['shoes-sandals', 'Босоножки «Серебро»', 'common', TINT.silver],
  ['top-bustier', 'Топ-бюстье «Нуар»', 'common'],
  ['top-bustier', 'Топ-бюстье «Бордо»', 'common', 'sepia(1) saturate(4) hue-rotate(300deg) brightness(0.6)'],
  ['top-sequin', 'Топ «Пайетки-серебро»', 'rare'],
  ['top-sequin', 'Топ «Пайетки-шампань»', 'rare', 'sepia(0.7) saturate(1.4) brightness(1.05)'],
  ['bottom-satin', 'Брюки «Изумрудный атлас»', 'common'],
  ['bottom-satin', 'Брюки «Ночной атлас»', 'common', TINT.noir],
  ['shoes-mules', 'Мюли «Изумруд»', 'epic'],
  ['shoes-mules', 'Мюли «Сапфир»', 'rare', 'hue-rotate(80deg)'],
  ['dress-cocktail', 'Коктейль «Ягода»', 'common', 'sepia(0.88) saturate(2.97) hue-rotate(316deg) brightness(1.12)'],
  ['dress-cocktail', 'Коктейль «Изумруд»', 'common', 'sepia(0.77) saturate(1.42) hue-rotate(162deg) brightness(1.04)'],
  ['bottom-tulle', 'Юбка «Фатин-лаванда»', 'common'],
  ['bottom-tulle', 'Юбка «Фатин-нуар»', 'common', TINT.noir],
  ['dress-chiffon', 'Платье «Шифон-небо»', 'common'],
  ['dress-chiffon', 'Платье «Шифон-слива»', 'common', 'sepia(0.97) saturate(2.67) hue-rotate(244deg) brightness(0.58)'],
  ['top-oneshoulder', 'Топ «Изумрудное плечо»', 'common'],
  ['top-oneshoulder', 'Топ «Сапфировое плечо»', 'common', 'hue-rotate(80deg)'],
  ['shoes-glitter', 'Балетки «Блёстки-серебро»', 'common'],
  ['shoes-glitter', 'Балетки «Блёстки-золото»', 'common', TINT.gold],
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
  ['acc-pearls', 'Жемчуг «Чёрный»', 'rare', TINT.noir],
  ['acc-tote', 'Сумка-тоут «Нуар»'],
  ['acc-tote', 'Сумка-тоут «Карамель»', 'rare', 'brightness(1.6) sepia(1) saturate(2.26) hue-rotate(348deg) brightness(1.36)'],
  ['dress-sheath', 'Платье-футляр «Нэви»', 'epic'],
  ['dress-sheath', 'Платье-футляр «Вино»', 'rare', 'sepia(0.03) saturate(1.28) hue-rotate(102deg) brightness(1.27)'],
  ['dress-shirt', 'Платье-рубашка «Небо»', 'common'],
  ['dress-shirt', 'Платье-рубашка «Песок»', 'common', 'sepia(0.8) saturate(0.9) brightness(1.05)'],
  // drawn ivory: a nude shoe would be taken for her foot when the build splits the foot off
  ['shoes-pumps', 'Балетки-лодочки «Айвори»', 'common'],
  ['shoes-pumps', 'Балетки-лодочки «Нюд»', 'common', 'brightness(0.88) sepia(0.6) saturate(1.6) hue-rotate(-20deg)'],
  ['acc-studs-pearl', 'Серьги «Чёрный жемчуг»', 'common', TINT.noir],
  ['acc-studs-pearl', 'Серьги «Розовый жемчуг»', 'common', TINT.tintPink],
  ['bottom-pencil', 'Юбка-карандаш «Графит»', 'common'],
  ['bottom-pencil', 'Юбка-карандаш «Тауп»', 'common', 'sepia(0.6) brightness(1.6)'],
  ['top-turtleneck', 'Водолазка «Сливки»', 'common'],
  ['top-turtleneck', 'Водолазка «Графит»', 'common', 'brightness(0.35)'],
  ['top-stripe', 'Рубашка «Полоска»', 'common'],
  ['top-stripe', 'Рубашка «Персиковая полоска»', 'common', 'hue-rotate(150deg)'],
  // office-a: more clothes for the early levels
  ['top-shirt', 'Рубашка «Белая»', 'common'],
  ['top-shirt', 'Рубашка «Небо»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(0.95) hue-rotate(-192deg) brightness(0.96)'],
  ['top-bow', 'Блузка с бантом «Небо»', 'common'],
  ['top-bow', 'Блузка с бантом «Лаванда»', 'common', 'sepia(0.68) saturate(4.00) hue-rotate(-152deg) brightness(0.91)'],
  ['top-vest', 'Жилет «Графит»', 'rare'],
  ['top-vest', 'Жилет «Нэви»', 'rare', 'sepia(1.00) saturate(3.17) hue-rotate(-173deg) brightness(0.50)'],
  ['top-cami', 'Шёлковый топ «Вино»', 'common'],
  ['top-cami', 'Шёлковый топ «Изумруд»', 'common', 'sepia(0.30) saturate(1.51) hue-rotate(-177deg) brightness(1.45)'],
  ['top-knitvest', 'Жилет-вязка «Нэви»', 'common'],
  ['top-knitvest', 'Жилет-вязка «Графит»', 'common', 'grayscale(1) brightness(1.35)'],
  ['top-peplum', 'Топ с баской «Чёрный»', 'common'],
  ['top-peplum', 'Топ с баской «Вино»', 'common', 'brightness(1.02) sepia(1) saturate(4.00) hue-rotate(-67deg) brightness(1.17)'],
  ['bottom-palazzo', 'Палаццо «Сапфир»', 'common'],
  ['bottom-palazzo', 'Палаццо «Графит»', 'common', 'sepia(0.89) saturate(0.67) hue-rotate(-138deg) brightness(0.75)'],
  ['bottom-culottes', 'Кюлоты «Олива»', 'common'],
  ['bottom-culottes', 'Кюлоты «Шоколад»', 'common', 'sepia(0.34) saturate(1.84) hue-rotate(-38deg) brightness(0.66)'],
  ['bottom-pleatmidi', 'Плиссе «Слива»', 'common'],
  ['bottom-pleatmidi', 'Плиссе «Изумруд»', 'common', 'sepia(0.39) saturate(1.72) hue-rotate(-164deg) brightness(1.06)'],
  ['bottom-woolskirt', 'Юбка «Твид-серый»', 'common'],
  ['bottom-woolskirt', 'Юбка «Твид-шоколад»', 'common', 'grayscale(1) brightness(0.72) sepia(1) saturate(2.06) hue-rotate(-27deg) brightness(0.50)'],
  ['bottom-cigarette', 'Брюки-сигареты «Нэви»', 'common'],
  ['bottom-cigarette', 'Брюки-сигареты «Вишня»', 'common', 'brightness(0.79) sepia(1) saturate(4.37) hue-rotate(-55deg) brightness(2.04)'],
  ['dress-pinafore', 'Сарафан «Нэви»', 'common'],
  ['dress-pinafore', 'Сарафан «Графит»', 'common', 'grayscale(1) brightness(1.4)'],
  ['dress-trench', 'Платье-тренч «Олива»', 'common'],
  ['dress-trench', 'Платье-тренч «Карамель»', 'common', 'sepia(0.34) saturate(1.78) hue-rotate(-21deg) brightness(1.29)'],
  ['dress-satinmidi', 'Атласное миди «Изумруд»', 'rare'],
  ['dress-satinmidi', 'Атласное миди «Вино»', 'rare', 'sepia(0.40) saturate(4.04) hue-rotate(-156deg) brightness(0.71)'],
  ['dress-blazer', 'Платье-смокинг «Лаванда»', 'epic'],
  ['dress-blazer', 'Платье-смокинг «Графит»', 'epic', 'sepia(0.45) saturate(0.76) hue-rotate(-68deg) brightness(0.35)'],
  ['shoes-oxfords', 'Оксфорды «Чёрные»', 'common'],
  ['shoes-oxfords', 'Оксфорды «Вино»', 'common', 'brightness(1.03) sepia(1) saturate(4.00) hue-rotate(-67deg) brightness(1.14)'],
  ['shoes-boots-lace', 'Ботинки «Шоколад»', 'rare'],
  ['shoes-boots-lace', 'Ботинки «Чёрные»', 'rare', TINT.noir],
  ['acc-thin', 'Очки «Тонкие-золото»', 'common'],
  ['acc-thin', 'Очки «Тонкие-серебро»', 'common', TINT.silver],
  ['acc-bag-brief', 'Портфель «Чёрный»', 'rare'],
  ['acc-bag-brief', 'Портфель «Шоколад»', 'rare', 'brightness(1.65) sepia(1) saturate(2.06) hue-rotate(-27deg) brightness(0.95)'],
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
  ['bottom-tennis', 'Юбка «Теннис»', 'epic'],
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
  ['acc-neck-diamond', 'Колье «Бриллианты-золото»', 'epic', TINT.gold],
  ['acc-ear-chandelier', 'Серьги «Сияние»', 'epic'],   // art name kept so item ids stay: now diamond drops
  ['acc-ear-chandelier', 'Серьги «Сияние-золото»', 'epic', TINT.gold],
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
  'dress-tiered': 'Платья с ярусами', 'dress-knit': 'Платья-свитеры', 'dress-floral': 'Платья в цветочек', 'dress-polka': 'Платья в горошек', 'top-tank': 'Майки',
  'top-flannel': 'Рубашки в клетку', 'top-sweatshirt': 'Свитшоты', 'top-peasant': 'Блузки', 'top-bomber': 'Бомберы', 'top-breton': 'Лонгсливы',
  'bottom-wide': 'Широкие брюки', 'bottom-denimskirt': 'Джинсовые юбки', 'bottom-flare': 'Клёш', 'bottom-bermuda': 'Бермуды', 'bottom-tiered': 'Юбки с ярусами',
  'bottom-cords': 'Вельвет', 'shoes-canvas': 'Кеды', 'shoes-flatsandals': 'Сандалии', 'shoes-chunky': 'Кроссовки', 'shoes-boots-rain': 'Резиновые сапоги',
  'shoes-boots-cozy': 'Угги', 'acc-bag-straw': 'Корзинки', 'acc-bag-saddle': 'Сумки-сёдла', 'acc-bag-canvas': 'Шоперы', 'acc-bag-hobo': 'Хобо',
  'acc-round': 'Круглые очки', 'acc-retro': 'Ретро-очки',
};

export interface Fixture { id: string; name: string; kind: FixtureKind; look: FixtureLook; items: Item[] }

/** Shoe shelves of a shop that sells little else, by type of shoe (a model not listed goes on a shelf of its own). */
const SHOE_SHELVES: [id: string, name: string, arts: string[]][] = [
  ['sneakers', 'Кроссовки и кеды', ['shoes-sneakers', 'shoes-hightops', 'shoes-runners', 'shoes-canvas', 'shoes-chunky', 'shoes-skate', 'shoes-slipons', 'shoes-court', 'shoes-knit']],
  ['flats', 'Туфли и лоферы', ['shoes-heels', 'shoes-pumps', 'shoes-maryjanes', 'shoes-mules', 'shoes-velvet', 'shoes-glitter', 'shoes-platform', 'shoes-flats', 'shoes-slingback',
    'shoes-loafers', 'shoes-oxfords', 'shoes-moccasins', 'shoes-espadrilles', 'shoes-slippers']],
  ['boots', 'Сапоги', ['shoes-boots', 'shoes-whiteboots', 'shoes-boots-riding', 'shoes-boots-knee', 'shoes-boots-rain', 'shoes-boots-snow',
    'shoes-ankleboots', 'shoes-boots-chelsea', 'shoes-boots-combat', 'shoes-boots-lace', 'shoes-boots-cozy', 'shoes-boots-hiking']],
  ['sandals', 'Сандалии', ['shoes-sandals', 'shoes-flatsandals', 'shoes-slides', 'shoes-flipflops', 'shoes-gladiator']],
];
const JEWEL_SHELVES: [id: string, name: string, slots: Slot[]][] = [
  ['necklace', 'Колье', ['necklace']], ['earrings', 'Серьги', ['earrings']], ['bracelet', 'Браслеты', ['bracelet']],
];
const MAX_FIXTURES = 7;

/**
 * The fixtures of a shop, one per kind of thing it sells. A shop with few kinds (only
 * shoes, only jewellery) splits them by model, so it never stands half empty.
 */
export function shopFixtures(shopId: string): Fixture[] {
  const items = shopItems(shopId);
  let list: Fixture[] = KINDS
    .map((k) => ({ id: k.kind, name: k.name, kind: k.kind, look: k.look, items: items.filter((i) => k.slots.includes(i.slot)) }))
    .filter((f) => f.items.length);
  // a shop with few kinds of things (shoes, jewellery) splits them by type, the biggest first, while the room has space:
  // shoes by kind of shoe, jewellery by what it is, bags stay together, clothes by model
  const split = (f: Fixture): Fixture[] => {
    let parts: Fixture[];
    if (f.kind === 'shoes') {
      parts = SHOE_SHELVES.map(([id, name, arts]) => ({ ...f, id, name, items: f.items.filter((i) => arts.includes(i.art)) }));
      const other = f.items.filter((i) => !SHOE_SHELVES.some(([, , arts]) => arts.includes(i.art)));
      if (other.length) parts.push({ ...f, id: 'other', name: f.name, items: other });
    } else if (f.kind === 'jewelry') {
      parts = JEWEL_SHELVES.map(([id, name, slots]) => ({ ...f, id, name, items: f.items.filter((i) => slots.includes(i.slot)) }));
    } else if (f.kind === 'bags') {
      parts = [f];
    } else {
      const arts = [...new Set(f.items.map((i) => i.art))];
      parts = arts.map((a) => ({ ...f, id: a, name: ART_NAMES[a] ?? f.name, items: f.items.filter((i) => i.art === a) }));
    }
    parts = parts.filter((p) => p.items.length);
    return parts.length > 1 ? parts : [f];
  };
  if (list.length < 4) {
    for (const f of [...list].sort((a, b) => b.items.length - a.items.length)) {
      const parts = split(f);
      if (list.length - 1 + parts.length > MAX_FIXTURES) continue;
      list = list.flatMap((x) => (x === f ? parts : [x]));
    }
  }
  // never more shelves than fit the room: the smallest ones go into the last shelf, so nothing is left unsearchable
  while (list.length > MAX_FIXTURES) {
    const last = list.pop()!;
    const prev = list[list.length - 1];
    list[list.length - 1] = { ...prev, items: [...prev.items, ...last.items] };
  }
  return list;
}
