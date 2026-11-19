import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW, ItemThumb, thumbSrc } from '../art/Doll';
import { RARITY, SHOPS, shopFixtures, shopItems, type Fixture, type Item, type Shop, type Slot } from '../game/catalog';
import {
  SHELF_RUSH_GEMS, allBought, buy, canAfford, rushShelf, withItem, search, searchCost, shelfLeft, shelfReadyAt, toggleWish, useGame,
  type BuyResult, type LevelUp, type SearchResult,
} from '../game/store';
import { createPortal } from 'preact/compat';
import { useNow } from './EventsScreen';
import { rng, seedOf } from '../game/events';
import { Coin, ItemCard, Modal, Price, RarityTag, fmt, plural } from './common';
import { flyRewards, flyTo, picture } from './fx';

/** Shop window order: the big pieces first, then shoes and accessories. */
const WINDOW_ORDER: Slot[] = ['dress', 'top', 'bottom', 'shoes', 'bag', 'necklace', 'earrings', 'bracelet', 'glasses'];

/** One piece of each kind the shop sells, for its window. */
function windowItems(shopId: string): Item[] {
  const seen = new Set<string>();
  return shopItems(shopId)
    .sort((a, b) => WINDOW_ORDER.indexOf(a.slot) - WINDOW_ORDER.indexOf(b.slot))
    .filter((i) => !seen.has(i.art) && !!seen.add(i.art))
    .slice(0, 6);
}

/**
 * The shops as a street of little houses, scrolled sideways like a walk past shop windows.
 * Each window shows the kinds of things sold inside; closed shops are grey with the shutter down.
 */
export function ShopsScreen({ open, focus }: { open: (shopId: string) => void; focus?: string }) {
  const g = useGame();
  const scroller = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  const lots = () => [...(scroller.current?.querySelectorAll<HTMLElement>('.lot') ?? [])];
  const centre = (el: HTMLElement, smooth: boolean) => {
    const sc = scroller.current!;
    sc.scrollTo({ left: el.offsetLeft - (sc.clientWidth - el.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  const step = (dir: number) => {
    const el = lots()[Math.min(SHOPS.length - 1, Math.max(0, at + dir))];
    if (el) centre(el, true);
  };

  useEffect(() => {
    // back from a shop: stand in front of it again
    const i = focus ? SHOPS.findIndex((s) => s.id === focus) : -1;
    const el = lots()[i];
    if (el) centre(el, false);
    onScroll();
    // a mouse wheel walks the street one house at a time
    const sc = scroller.current!;
    let cool = 0;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (Date.now() < cool) return;
      cool = Date.now() + 350;
      const mid = sc.scrollLeft + sc.clientWidth / 2;
      const dist = lots().map((el) => Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid));
      const here = dist.indexOf(Math.min(...dist));
      const el2 = lots()[Math.min(SHOPS.length - 1, Math.max(0, here + Math.sign(e.deltaY)))];
      if (el2) centre(el2, true);
    };
    sc.addEventListener('wheel', wheel, { passive: false });
    return () => sc.removeEventListener('wheel', wheel);
  }, []);

  // the house nearest the middle of the view; on a wide desktop street several are in sight
  // and the ends can't be centred, so the arrows go by how far the street can still scroll
  const [ends, setEnds] = useState({ start: true, end: false });
  const onScroll = () => {
    const sc = scroller.current!;
    const mid = sc.scrollLeft + sc.clientWidth / 2;
    const dist = lots().map((el) => Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid));
    setAt(dist.indexOf(Math.min(...dist)));
    setEnds({ start: sc.scrollLeft <= 1, end: sc.scrollLeft >= sc.scrollWidth - sc.clientWidth - 1 });
  };

  return (
    <div class="screen street">
      <h1 class="title">Магазины</h1>
      <div class="street-view">
        <span class="cloud c1" /><span class="cloud c2" /><span class="cloud c3" />
        <div class="street-scroll" ref={scroller} onScroll={onScroll}>
          <span class="lot-spacer" />
          {SHOPS.map((s, i) => <Lot shop={s} index={i} found={g.discovered} level={g.level} open={() => open(s.id)} />)}
          <span class="lot-spacer" />
        </div>
        {!ends.start && <button class="street-arrow left" onClick={() => step(-1)} aria-label="Назад по улице">‹</button>}
        {!ends.end && <button class="street-arrow right" onClick={() => step(1)} aria-label="Дальше по улице">›</button>}
      </div>
      <div class="street-dots">
        {SHOPS.map((s, i) => <i class={i === at ? 'on' : ''} style={{ '--sc': s.color }} />)}
      </div>
    </div>
  );
}

/** One house on the street with its shop window, and its name and description under it. */
function Lot({ shop, index, found, level, open }: {
  shop: Shop; index: number; found: string[]; level: number; open: () => void;
}) {
  const locked = level < shop.level || !!shop.soon;
  const all = shopItems(shop.id);
  const have = all.filter((i) => found.includes(i.id)).length;
  const done = allBought(shop.id);
  const goods = useMemo(() => windowItems(shop.id), [shop.id]);
  return (
    <div class={'lot' + (locked ? ' locked' : '')} data-shop={shop.id} style={{ '--sc': shop.color }}>
      <span class="lot-stage">
      <span class="lamp" />
      <button class={'house ' + (index % 2 ? 'gable' : 'flat')} disabled={locked} onClick={open} aria-label={shop.name}>
        <span class="house-roof" />
        <span class="house-top">
          <span class="house-win" />
          <span class="house-sign">{shop.emoji}</span>
          <span class="house-win" />
        </span>
        <span class="awning" />
        <span class="house-front">
          <span class="vitrine">
            <span class="vitrine-goods">
              {goods.map((i) => <ItemThumb item={i} />)}
            </span>
            {done && <span class="sold-badge">✓ Всё куплено</span>}
            {locked && (
              <span class="shutter">
                <span class="shutter-lock">🔒</span>
                <small>{shop.soon ? 'Скоро' : `С ${shop.level} уровня`}</small>
              </span>
            )}
          </span>
          <span class="door"><i /></span>
        </span>
      </button>
      </span>
      <button class="lot-caption" disabled={locked} onClick={open}>
        <b>{shop.name}</b>
        <small>{shop.about}</small>
        <span class="lot-meta">
          {shop.soon ? 'Скоро откроется' : locked ? `🔒 Откроется на ${shop.level} уровне`
            : done ? '🏆 Коллекция собрана' : `Найдено ${have} из ${all.length}`}
        </span>
      </button>
    </div>
  );
}

/** Where fixtures stand in the room, in order: the top wall, the side walls, the middle, by the door. */
const SPOTS: { left?: string; right?: string; top: string; width: string }[] = [
  { left: '3%', top: '3%', width: '45%' },
  { right: '3%', top: '3%', width: '45%' },
  { left: '2%', top: '33%', width: '30%' },
  { right: '2%', top: '33%', width: '30%' },
  { left: '35%', top: '36%', width: '30%' },
  { left: '2%', top: '62%', width: '30%' },
  { right: '2%', top: '62%', width: '30%' },
];

/** Soft fabric colours for the goods on display; a piece's colour says nothing about what it is. */
const SWATCHES = ['#e8a0b8', '#a9c7ef', '#f2d07a', '#9fd3b8', '#c6a8f0', '#f0b48a', '#7d7b8c', '#efe4d4', '#d98484', '#7393c4', '#b5d98c', '#f5c6d8'];

/* ---------- goods on display: shapes that say "shoes" or "a dress", never which one ---------- */

type Rand = () => number;
const pickOf = <T,>(arr: T[], r: Rand) => arr[Math.floor(r() * arr.length)];
const between = (lo: number, hi: number, r: Rand) => lo + r() * (hi - lo);

/** A garment's cut seen side-on on the rail: outline, width in px, length in % of the rail. */
const CUTS: Record<string, { clip: string; w: [number, number]; h: [number, number] }> = {
  tee: { clip: 'polygon(22% 0, 78% 0, 100% 24%, 86% 30%, 88% 100%, 12% 100%, 14% 30%, 0 24%)', w: [10, 13], h: [40, 50] },
  crop: { clip: 'polygon(22% 0, 78% 0, 100% 30%, 86% 38%, 88% 100%, 12% 100%, 14% 38%, 0 30%)', w: [10, 12], h: [28, 34] },
  sweater: { clip: 'polygon(18% 0, 82% 0, 100% 20%, 100% 100%, 0 100%, 0 20%)', w: [14, 17], h: [44, 54] },
  hoodie: { clip: 'polygon(30% 0, 70% 0, 82% 8%, 100% 22%, 100% 100%, 0 100%, 0 22%, 18% 8%)', w: [15, 18], h: [46, 56] },
  blouse: { clip: 'polygon(25% 0, 75% 0, 100% 26%, 90% 100%, 10% 100%, 0 26%)', w: [10, 13], h: [42, 52] },
  blazer: { clip: 'polygon(20% 0, 80% 0, 100% 18%, 100% 100%, 0 100%, 0 18%)', w: [13, 15], h: [50, 58] },
  trousers: { clip: 'polygon(4% 0, 96% 0, 96% 100%, 56% 100%, 50% 38%, 44% 100%, 4% 100%)', w: [10, 13], h: [66, 80] },
  shorts: { clip: 'polygon(4% 0, 96% 0, 100% 100%, 56% 100%, 50% 55%, 44% 100%, 0 100%)', w: [12, 14], h: [26, 32] },
  skirt: { clip: 'polygon(18% 0, 82% 0, 100% 100%, 0 100%)', w: [12, 16], h: [32, 42] },
  midi: { clip: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)', w: [13, 16], h: [54, 64] },
  dress: { clip: 'polygon(28% 0, 72% 0, 80% 34%, 100% 100%, 0 100%, 20% 34%)', w: [13, 17], h: [70, 84] },
  gown: { clip: 'polygon(30% 0, 70% 0, 76% 30%, 100% 100%, 0 100%, 24% 30%)', w: [15, 19], h: [86, 96] },
};
const ART_CUT: Record<string, string> = {
  'top-tee': 'tee', 'top-crop': 'crop', 'top-sweater': 'sweater', 'top-crochet': 'sweater', 'top-hoodie': 'hoodie',
  'top-blouse': 'blouse', 'top-blazer': 'blazer',
  'bottom-jeans': 'trousers', 'bottom-trousers': 'trousers', 'bottom-leggings': 'trousers', 'bottom-baggy': 'trousers',
  'bottom-shorts': 'shorts', 'bottom-skirt': 'skirt', 'bottom-midi': 'midi',
  'dress-black': 'dress', 'dress-red': 'dress', 'dress-sundress': 'dress', 'dress-gown': 'gown',
};
/** Prints over the fabric colour. */
const PRINTS = [
  'none', 'none', 'none',
  'repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0 2px, transparent 2px 6px)',
  'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1.6px) 0 0 / 5px 5px',
  'repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0 2px, transparent 2px 5px)',
  'linear-gradient(180deg, transparent 62%, rgba(255,255,255,0.45) 62% 70%, transparent 70%)',
];

/**
 * Shoes in profile, toe to the right, standing on y=56 (viewBox 100×60): the shape, a lighter
 * lining where the foot goes, and stitches or straps. A pair: the far shoe a step behind.
 */
const SHOES: Record<string, { body: string; sole?: string; lining?: string; straps?: string; stitch?: string }> = {
  sneakers: {
    body: 'M8 48 L10 26 Q12 22 18 24 L28 28 Q34 18 42 18 L48 20 Q62 28 74 32 Q90 36 92 48 Z',
    sole: 'M4 48 L92 48 Q96 48 96 52 Q96 57 90 57 L8 57 Q4 57 4 52 Z',
    stitch: 'M46 24 L52 21 M52 27.5 L58 24.5 M58 31 L64 28',
  },
  heels: {
    body: 'M12 20 Q9 30 14 36 L17 56 L20.5 56 L24 39 Q37 45 56 53 L90 55 Q97 55 96 50 Q94 44 80 42 Q62 40 52 38 Q32 33 24 24 Q18 19 12 20 Z',
    lining: 'M15 25 Q30 34 50 37.5',
  },
  boots: {
    body: 'M20 4 L44 4 L45 28 Q52 34 70 38 Q92 41 96 49 Q97 55 90 55 L58 54 Q44 50 31 48 L30 56 L19 56 L18 44 Q16 30 20 4 Z',
    stitch: 'M20.5 10 L44.5 10 M24 14 L24 42',
  },
  sandals: {
    body: 'M10 37 Q30 41 58 49 L94 50 Q98 51 96 54 L58 54 Q40 50 25 45 L24 56 L15 56 L14 43 Q9 41 10 37 Z',
    straps: 'M66 50 Q78 34 90 50 M12 37 Q11 24 21 22 Q30 21 31 33 M31 33 L46 46',
  },
  loafers: {
    body: 'M9 29 Q28 33 46 29 L56 30 Q80 33 90 40 Q97 45 96 51 Q95 55 88 55 L8 55 Q7 42 9 29 Z',
    lining: 'M11 31 Q28 35 45 31',
    stitch: 'M52 31 Q72 31 87 41 M48 34 Q58 41 70 36 M8 51 L95.5 51',
  },
};
/** Leather and suede tones: shoes in pale fabric colours wash out on the shelf. */
const LEATHER = ['#d35d7a', '#4f6fae', '#3a3448', '#c9a24a', '#8a563f', '#5aa58a', '#9a6fd0', '#e08a4c', '#b23a48', '#6d6a7c'];

const ART_SHOE: Record<string, string> = {
  'shoes-sneakers': 'sneakers', 'shoes-heels': 'heels', 'shoes-boots': 'boots', 'shoes-sandals': 'sandals', 'shoes-loafers': 'loafers',
};

function Shoe({ kind, colour }: { kind: string; colour: string }) {
  const sh = SHOES[kind] ?? SHOES.sneakers;
  const one = (back: boolean) => (
    <g transform={back ? 'translate(-9 -5)' : undefined} opacity={back ? 0.6 : 1}>
      <path d={sh.body} fill={colour} />
      <path d={sh.body} fill="url(#shine)" />
      {sh.sole && <path d={sh.sole} fill="#fbf8ff" stroke="rgba(0,0,0,0.14)" stroke-width="1" />}
      {sh.lining && <path d={sh.lining} fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3" stroke-linecap="round" />}
      {sh.straps && <path d={sh.straps} fill="none" stroke={colour} stroke-width="4.5" stroke-linecap="round" />}
      {sh.stitch && (
        <path
          d={sh.stitch} fill="none" stroke-linecap="round"
          stroke={kind === 'sneakers' ? '#fff' : 'rgba(0,0,0,0.22)'} stroke-width={kind === 'sneakers' ? 2.2 : 1.4}
        />
      )}
    </g>
  );
  return <svg class="shoe" viewBox="-10 -6 112 66" aria-hidden="true">{one(true)}{one(false)}</svg>;
}

/** Glasses front-on, folded on the stand: round, square or cat-eye frames; sunglasses get dark lenses. */
function Specs({ sun, shape, colour }: { sun: boolean; shape: number; colour: string }) {
  const lens = shape === 2
    ? 'M3 5 Q10 1 17 4 Q17 12 10 13 Q3 12 3 5 Z'
    : `M3 ${shape ? 4 : 5} Q3 3 5 3 L15 3 Q17 3 17 ${shape ? 4 : 5} L17 ${shape ? 10 : 9} Q17 13 10 13 Q3 13 3 ${shape ? 10 : 9} Z`;
  const fill = sun ? 'rgba(40, 30, 60, 0.82)' : 'rgba(210, 230, 255, 0.35)';
  return (
    <svg class="specs" viewBox="0 0 40 16" aria-hidden="true">
      <g fill={fill} stroke={colour} stroke-width="2">
        <path d={lens} />
        <path d={lens} transform="translate(20 0)" />
      </g>
      <path d="M17 6 Q20 4 23 6" fill="none" stroke={colour} stroke-width="2" />
    </svg>
  );
}

/**
 * What stands on a fixture, drawn so it does not give away the pieces: clothes hang
 * side-on on the rail, shoes stand in pairs, bags are closed, glasses fold on the stand,
 * jewellery hides on velvet trays. Colours are made up, so they tell nothing either.
 */
function FixtureGoods({ fx, shopId }: { fx: Fixture; shopId: string }) {
  const r = rng(seedOf(`${shopId}:${fx.id}`));
  const colour = () => pickOf(SWATCHES, r);
  // which item each drawn piece stands for: every kind sold shows up, in a mixed order
  const pieces = (count: number) => {
    const list = Array.from({ length: count }, (_, i) => fx.items[i % fx.items.length]);
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  };
  if (fx.look === 'rack') {
    return (
      <span class="fx-goods hanging">
        {pieces(Math.min(10, Math.max(7, fx.items.length + 3))).map((it) => {
          const cut = CUTS[ART_CUT[it.art] ?? 'tee'];
          return (
            <i style={{ width: `${between(cut.w[0], cut.w[1], r) * 1.8}px`, height: `${between(cut.h[0], cut.h[1], r)}%`, '--tilt': `${between(-4, 4, r)}deg` }}>
              <b style={{ '--c': colour(), '--print': pickOf(PRINTS, r), clipPath: cut.clip }} />
            </i>
          );
        })}
      </span>
    );
  }
  if (fx.look === 'shelf' && fx.kind !== 'bags') {
    const row = () => pieces(2).map((it) => <Shoe kind={ART_SHOE[it.art] ?? 'sneakers'} colour={pickOf(LEATHER, r)} />);
    return (
      <span class="fx-goods packed shoes">
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.35" /><stop offset="0.5" stop-color="#fff" stop-opacity="0" />
            <stop offset="1" stop-color="#000" stop-opacity="0.12" />
          </linearGradient>
        </svg>
        <span class="row">{row()}</span>
        <span class="row">{row()}</span>
      </span>
    );
  }
  if (fx.look === 'shelf') {
    const row = () => Array.from({ length: 3 }, () => <i style={{ '--c': colour() }} />);
    return (
      <span class="fx-goods packed bags">
        <span class="row">{row()}</span>
        <span class="row">{row()}</span>
      </span>
    );
  }
  if (fx.look === 'stand') {
    return (
      <span class="fx-goods folded">
        {pieces(6).map((it) => <Specs sun={it.art === 'acc-sunglasses'} shape={Math.floor(r() * 3)} colour={pickOf(FRAMES, r)} />)}
      </span>
    );
  }
  return (
    <span class="fx-goods trays">
      {pieces(2).map((it) => <Jewel art={it.art} metal={pickOf(METALS, r)} velvet={pickOf(VELVETS, r)} />)}
    </span>
  );
}

/** Jewellery metals and the velvet of the displays. */
const METALS = ['#d6a93c', '#c9ccd6', '#e3a08c'];
const VELVETS = ['#3b3557', '#6b2d3f', '#2f4a5c', '#4a3b6b'];

/**
 * A piece of jewellery on its display (viewBox 40×50): necklaces on a velvet bust (a chain
 * with a pendant, or a string of pearls), earrings hanging in a pair from a little stand.
 */
function Jewel({ art, metal, velvet }: { art: string; metal: string; velvet: string }) {
  if (art === 'acc-hoops') {
    return (
      <svg class="jewel" viewBox="3 6 34 43" aria-hidden="true">
        <path d="M20 9 L20 46 M11 47 L29 47" stroke={velvet} stroke-width="3" stroke-linecap="round" />
        <path d="M5 9 L35 9" stroke={velvet} stroke-width="3.5" stroke-linecap="round" />
        <path d="M11 9 L11 14 M29 9 L29 14" stroke={metal} stroke-width="1.2" />
        <circle cx="11" cy="20" r="6" fill="none" stroke={metal} stroke-width="2.2" />
        <circle cx="29" cy="20" r="6" fill="none" stroke={metal} stroke-width="2.2" />
      </svg>
    );
  }
  const pearls = art === 'acc-pearls';
  return (
    <svg class="jewel" viewBox="5 4 30 47" aria-hidden="true">
      <path d="M7 50 L7 35 Q7 27 14 25 L16 11 Q16 6 20 6 Q24 6 24 11 L26 25 Q33 27 33 35 L33 50 Z" fill={velvet} />
      <path d="M16 11 Q16 6 20 6 Q24 6 24 11 L25 22" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
      {pearls
        ? <path d="M12.5 26 Q20 40 27.5 26" fill="none" stroke={metal === '#d6a93c' ? '#f6efe2' : '#fbf4f6'} stroke-width="3" stroke-linecap="round" stroke-dasharray="0 3.3" />
        : <>
            <path d="M13 25 Q20 38 27 25" fill="none" stroke={metal} stroke-width="1.3" />
            <path d="M20 31.5 L22.5 34.5 L20 38 L17.5 34.5 Z" fill={metal} />
          </>}
    </svg>
  );
}

/** Frame colours: tortoiseshell, black, gold, pink, clear blue. */
const FRAMES = ['#5a3b2e', '#2f2a3a', '#c9a24a', '#d77a9a', '#7393c4', '#8a6a4f'];

const mmss = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

/**
 * Inside a shop, seen from above: racks, shelves and cases along the walls and in the
 * middle, one for each kind of thing sold. Each can be searched once an hour; a ready one
 * glows, a resting one shows its timer.
 */
export function ShopScreen({ shopId, onNoEnergy, onLevelUp }: {
  shopId: string; onNoEnergy: () => void; onLevelUp: (lu: LevelUp) => void;
}) {
  const g = useGame();
  const now = useNow(1000);
  const shop = SHOPS.find((s) => s.id === shopId)!;
  const fixtures = useMemo(() => shopFixtures(shopId), [shopId]);
  /** The search being shown full screen: the result is rolled at the tap, the animation reveals it. */
  const [result, setResult] = useState<{ r: SearchResult; fx: Fixture } | null>(null);
  const [shaking, setShaking] = useState<string | null>(null);
  const [resting, setResting] = useState<Fixture | null>(null);
  const [collection, setCollection] = useState(false);
  const cost = searchCost(shopId);
  const all = shopItems(shopId);
  const found = all.filter((i) => g.discovered.includes(i.id)).length;
  const shopDone = allBought(shopId, undefined, g);

  const tap = (fx: Fixture) => {
    if (shaking) return;
    if (!shelfLeft(shopId, fx.id, g).length) return;
    if (g.freeSearches <= 0 && shelfReadyAt(shopId, fx.id, g) > Date.now()) return setResting(fx);
    if (g.energy < cost) return onNoEnergy();
    setShaking(fx.id);
    setTimeout(() => {
      setShaking(null);
      const r = search(shopId, fx.id);
      if (r) setResult({ r, fx });
    }, 250);
  };
  const close = (lu: LevelUp | null) => {
    setResult(null);
    if (lu) onLevelUp(lu);
  };

  return (
    <div class="screen shop-floor" style={{ '--sc': shop.color }}>
      <div class="shop-bar">
        <span class="shop-icon">{shop.emoji}</span>
        <span class="shop-bar-info">
          <b>{shop.name}</b>
          <small>
            {shopDone ? '🏆 Коллекция собрана — искать больше нечего'
              : g.freeSearches > 0
                ? <>Нажми на полку, чтобы найти вещь · ☕ {cost} за поиск · ещё {g.freeSearches} без ожидания</>
                : <>Нажми на полку, чтобы найти вещь · ☕ {cost} за поиск · полка обновляется раз в час</>}
          </small>
        </span>
        <button class="btn mini" onClick={() => setCollection(true)}>📒 {found}/{all.length}</button>
      </div>
      <div class="room">
        <span class="room-plant" />
        <span class="room-door" />
        {fixtures.map((fx, i) => {
          const left = shelfLeft(shopId, fx.id, g);
          const readyAt = shelfReadyAt(shopId, fx.id, g);
          const state = !left.length ? 'done' : readyAt > now && g.freeSearches <= 0 ? 'wait' : 'ready';
          const spot = SPOTS[i];
          return (
            <button
              class={`fixture ${fx.look} ${state}` + (shaking === fx.id ? ' shaking' : '')}
              style={{ left: spot.left, right: spot.right, top: spot.top, width: spot.width }}
              disabled={state === 'done'} aria-label={fx.name} data-fx={`${shopId}:${fx.id}`} onClick={() => tap(fx)}
            >
              <span class="fx-art"><FixtureGoods fx={fx} shopId={shopId} /></span>
              <span class="fx-name">{fx.name}</span>
              {state === 'ready' && <span class="fx-sparkles"><i>✦</i><i>✦</i><i>✧</i></span>}
              {state === 'wait' && <span class="fx-timer">⏱ {mmss(readyAt - now)}</span>}
              {state === 'done' && <span class="fx-done">✓ Всё найдено</span>}
            </button>
          );
        })}
      </div>

      {resting && (
        <Modal onClose={() => setResting(null)}>
          <div class="burst">⏳</div>
          <h2>{resting.name}</h2>
          <p>Полка обновится через <b>{mmss(shelfReadyAt(shopId, resting.id, g) - now)}</b></p>
          <p class="muted small">
            Здесь ещё {shelfLeft(shopId, resting.id, g).length} {plural(shelfLeft(shopId, resting.id, g).length, 'вещь', 'вещи', 'вещей')}, которых у тебя нет.
            На каждой полке можно искать раз в час.
          </p>
          <button
            class="btn primary" disabled={g.gems < SHELF_RUSH_GEMS}
            onClick={() => { if (rushShelf(shopId, resting.id)) setResting(null); }}
          >
            Обновить сейчас за 💎 {SHELF_RUSH_GEMS}
          </button>
          <button class="btn" onClick={() => setResting(null)}>Подождать</button>
        </Modal>
      )}
      {collection && (
        <Modal onClose={() => setCollection(false)}>
          <h2>Коллекция: {found}/{all.length}</h2>
          <p class="muted small">♡ — нажми, чтобы добавить в список желаний: такие вещи выпадают в 3 раза чаще.</p>
          {fixtures.map((fx) => (
            <>
              <h3 class="section">{fx.name}</h3>
              <div class="grid">
                {fx.items.map((i) => {
                  const owned = g.owned.includes(i.id);
                  const seen = g.discovered.includes(i.id);
                  const wished = g.wish.includes(i.id);
                  return (
                    <ItemCard
                      item={i} dim={!seen}
                      badge={owned ? '✓' : wished ? '♥' : seen ? '♡' : '?'}
                      onClick={() => { if (seen && !owned) toggleWish(i.id); }}
                    />
                  );
                })}
              </div>
            </>
          ))}
          <button class="btn" onClick={() => setCollection(false)}>Закрыть</button>
        </Modal>
      )}
      {result && <FindScreen r={result.r} fx={result.fx} shopId={shopId} onClose={close} />}
    </div>
  );
}

/** How long the rummaging lasts, and when the glow hints at a rare find. */
const DIG_MS = 2000;
const HINT_MS = 900;
/** Reveal colours: very rare finds glow gold. */
const REVEAL_COLOUR: Record<string, string> = { common: '#8C9AAE', rare: '#3D8BFD', epic: '#F0B323' };

/**
 * A search, full screen (nothing scrolls, every button fits): first she rummages through the
 * shelf — pieces fly out — and after a moment a blue or gold glow gives away a rare or very rare
 * find; then the piece drops in with its rarity glow, price and buttons.
 */
function FindScreen({ r, fx, shopId, onClose }: {
  r: SearchResult; fx: Fixture; shopId: string; onClose: (lu: LevelUp | null) => void;
}) {
  const g = useGame();
  const { item } = r;
  const [phase, setPhase] = useState<'dig' | 'hint' | 'reveal'>('dig');
  const [tryOn, setTryOn] = useState(false);
  /** Set when this purchase completed the shelf: the screen then shows the diamond bonus. */
  const [bought, setBought] = useState<BuyResult | null>(null);
  const rc = REVEAL_COLOUR[item.rarity];
  const special = item.rarity !== 'common';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase((p) => (p === 'dig' && special ? 'hint' : p)), HINT_MS);
    const t2 = setTimeout(() => setPhase('reveal'), DIG_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const owned = g.owned.includes(item.id);
  const afford = canAfford(item, g);
  const short = g.coins < item.price ? 'Не хватает монет' : 'Не хватает алмазиков';
  const purchase = () => {
    const from = document.querySelector('.find-item');
    const b = buy(item.id);
    // the piece flies down to the wardrobe (behind «Главная»), which hops and shows +1
    if (b.ok) flyTo(from, '.navbar [data-tab="home"] .nav-icon', picture(thumbSrc(item), item.filter), { plus: '+1' });
    if (b.ok && b.shelfGems) setBought(b);
    else onClose(b.levelUp ?? r.levelUp);
  };
  // the pieces that fly out while she rummages: a few from this shelf
  // (never the found piece itself, so the surprise holds)
  const flying = useMemo(() => {
    const others = fx.items.filter((i) => i.id !== item.id);
    return Array.from({ length: 6 }, (_, i) => others[(i * 3) % Math.max(1, others.length)]).filter(Boolean);
  }, [fx.id, item.id]);

  let body;
  if (bought) {
    body = (
      <div class="find-done">
        <div class="burst">🏆</div>
        <h2>Полка собрана!</h2>
        <p>Ты купила все вещи с этой полки.</p>
        <ul class="rewards inline"><li data-reward="gems">💎 +{bought.shelfGems}</li></ul>
        <button class="btn primary" onClick={() => { flyRewards(); onClose(bought.levelUp ?? r.levelUp); }}>Забрать</button>
      </div>
    );
  } else if (phase !== 'reveal') {
    body = (
      <button class={'find-dig ' + phase} onClick={() => setPhase('reveal')} aria-label="Пропустить анимацию">
        <span class="find-glow" aria-hidden="true" />
        <span class={`find-shelf fixture ${fx.look}`}><span class="fx-art"><FixtureGoods fx={fx} shopId={shopId} /></span></span>
        <span class="find-fly" aria-hidden="true">
          {flying.map((it, i) => <span class="fly" style={{ '--i': i, '--x': `${(i - 2.5) * 110}%`, '--r': `${(i - 2.5) * 16}deg` }}><ItemThumb item={it} /></span>)}
        </span>
        <b class="find-caption">
          {phase === 'hint'
            ? (item.rarity === 'epic' ? 'Ого! Тут что-то очень редкое…' : 'Кажется, тут что-то редкое…')
            : `Роемся: ${fx.name.toLowerCase()}…`}
        </b>
      </button>
    );
  } else {
    body = (
      <>
        <div class="find-top">
          {special
            ? <p class="reveal-banner">✨ {item.rarity === 'epic' ? 'Очень редкая находка!' : 'Редкая находка!'} ✨</p>
            : <p class="find-plain">Нашлось!</p>}
          <span class="find-tags">
            <span class="rarity" style={{ background: rc }}>{RARITY[item.rarity].name}</span>
            {r.pity && <span class="pity">Гарант!</span>}
          </span>
        </div>
        <div class="find-stage">
          {special && <span class="reveal-rays" aria-hidden="true" />}
          {special && <span class="reveal-sparks" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i><i>✧</i></span>}
          <div class="find-item">
            {tryOn
              ? <Doll class="doll" look={g.look} outfit={withItem(g.outfit, item)} view={FIGURE_VIEW} />
              : <ItemThumb item={item} />}
          </div>
        </div>
        <div class="find-info">
          <h2>{item.name}</h2>
          {r.lucky && <p class="muted small lucky">Такие вещи попадаются нечасто — а тебе повезло в первый же день!</p>}
          <p class="price"><Price item={item} /></p>
        </div>
        <div class="find-actions">
          {owned ? (
            <>
              <p class="muted">Уже есть в гардеробе</p>
              <button class="btn primary" onClick={() => onClose(r.levelUp)}>Дальше</button>
            </>
          ) : (
            <>
              <div class="btn-row">
                <button class="btn" onClick={() => setTryOn(!tryOn)}>{tryOn ? '👗 Вещь' : '🪞 Примерить'}</button>
                <button class="btn" onClick={() => onClose(r.levelUp)}>Пропустить</button>
              </div>
              <button class="btn primary" disabled={!afford} onClick={purchase}>
                {afford ? <>Купить за <Price item={item} /></> : short}
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  const app = document.querySelector('.app');
  if (!app) return null;
  return createPortal(
    <div class={`find ${item.rarity} ${phase}`} style={{ '--rc': rc, '--sc': SHOPS.find((sh) => sh.id === shopId)?.color }}>
      <span class="find-wallet"><Coin /> {fmt(g.coins)}{g.gems > 0 && <> · 💎 {g.gems}</>}</span>
      {body}
    </div>,
    app,
  );
}
