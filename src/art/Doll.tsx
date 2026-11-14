import type { ComponentChildren, JSX } from 'preact';
import layers from './layers.json';
import { ITEM_BY_ID, type Item, type Slot } from '../game/catalog';

/** All art is cut from a 1024x1536 canvas; layers are positioned in % of it. */
const W = 1024;
const H = 1536;
/**
 * A layer's box on the canvas (art-src/v2/build.py).
 * skin: has a recoloured copy per tone, `<name>~<tone>`.
 * hem:  (tops) `<name>-hem` masks the bottom worn under it to below the top's hem.
 * cut:  (closed shoes) the doll's own feet are hidden below this row: the shoe layer
 *       brings her foot inside it, drawn in place by editing the doll.
 */
type Box = { x: number; y: number; w: number; h: number; skin?: boolean; hem?: boolean; cut?: number };
const LAYERS = layers as Record<string, Box>;

export interface HairStyle { name: string; art: string }
export const HAIRSTYLES: HairStyle[] = [
  { name: 'Пучок', art: 'hair-bun' },
  { name: 'Локоны', art: 'hair-long' },
  { name: 'Каре', art: 'hair-bob' },
  { name: 'Кудри', art: 'hair-curly' },
  { name: 'Косы', art: 'hair-braids' },
  { name: 'Хвост', art: 'hair-pony' },
  { name: 'Пикси', art: 'hair-pixie' },
];

/**
 * Hair colours: 0 is each style's own drawn colour; the others are recolours of every
 * hair layer, `<layer>~<id>`, made by art-src/v2/hair.py (same ids and order).
 */
export interface HairColour { id: string | null; name: string; color: string }
export const HAIR_COLOURS: HairColour[] = [
  { id: null, name: 'Родной', color: 'conic-gradient(#3a2418 0 25%, #c88d4f 0 50%, #2a1a14 0 75%, #b8521f 0)' },
  { id: 'black', name: 'Чёрный', color: '#2b2430' },
  { id: 'chocolate', name: 'Шоколад', color: '#6a3c26' },
  { id: 'ginger', name: 'Рыжий', color: '#c45a22' },
  { id: 'honey', name: 'Медовый', color: '#c99050' },
  { id: 'platinum', name: 'Платина', color: '#e4d9c6' },
  { id: 'pink', name: 'Розовый', color: '#e27aab' },
  { id: 'lavender', name: 'Лавандовый', color: '#9b7ed4' },
  { id: 'blue', name: 'Голубой', color: '#4f8ad0' },
];

/** The base doll is 'tan'; the others are recolours made by art-src/skin.py. */
export interface SkinTone { id: string; name: string; color: string }
export const SKIN_TONES: SkinTone[] = [
  { id: 'fair', name: 'Светлая', color: '#f8cbaf' },
  { id: 'light', name: 'Персиковая', color: '#efb18b' },
  { id: 'tan', name: 'Смуглая', color: '#e19565' },
  { id: 'brown', name: 'Бронзовая', color: '#ab6d4a' },
  { id: 'deep', name: 'Тёмная', color: '#794c34' },
];
export const BASE_SKIN = 2;

export interface Makeup { name: string; art: string | null }
export const MAKEUPS: Makeup[] = [
  { name: 'Натуральный', art: null },
  { name: 'Вечерний', art: 'makeup-evening' },
  { name: 'Яркий', art: 'makeup-bright' },
  { name: 'Гламур', art: 'makeup-glam' },
];

/** Indices into HAIRSTYLES, HAIR_COLOURS, SKIN_TONES, MAKEUPS (old saves have only `hair`). */
export interface Look { hair: number; hairColour?: number; skin?: number; makeup?: number }
export const DEFAULT_LOOK: Look = { hair: 1, hairColour: 0, skin: BASE_SKIN, makeup: 0 };
export type Outfit = Partial<Record<Slot, string>>;

/**
 * Crop to the figure: the box around every layer the doll can wear (a bag in her
 * hand, a gown's hem and shoes reach furthest), so nothing is ever cut off.
 */
export const FIGURE_VIEW: [number, number, number, number] = (() => {
  const boxes = Object.entries(LAYERS).filter(([n]) => !n.startsWith('product-')).map(([, b]) => b);
  const x0 = Math.max(0, Math.min(...boxes.map((b) => b.x)) - 8);
  const x1 = Math.min(W, Math.max(...boxes.map((b) => b.x + b.w)) + 8);
  const y0 = Math.max(0, Math.min(...boxes.map((b) => b.y)) - 8);
  const y1 = Math.min(H, Math.max(...boxes.map((b) => b.y + b.h)) + 2);
  return [x0, y0, x1 - x0, y1 - y0];
})();

export const artUrl = (name: string) => `${import.meta.env.BASE_URL}art/${name}.webp`;

/** `recolour`: a hair colour id, for hair layers (they have no skin). */
function Layer({ name, filter, tone, clipBelow, recolour }: {
  name: string; filter?: string; tone: string; clipBelow?: number; recolour?: string | null;
}) {
  const l = LAYERS[name];
  if (!l) return null;
  const file = recolour ? `${name}~${recolour}`
    : l.skin && tone !== SKIN_TONES[BASE_SKIN].id ? `${name}~${tone}` : name;
  const style: JSX.CSSProperties = {
    left: `${(l.x / W) * 100}%`,
    top: `${(l.y / H) * 100}%`,
    width: `${(l.w / W) * 100}%`,
    filter,
  };
  if (clipBelow !== undefined && clipBelow < l.y + l.h) {
    style.clipPath = `inset(0 0 ${((l.y + l.h - clipBelow) / l.h) * 100}% 0)`;
  }
  return <img class="layer" src={artUrl(file)} style={style} alt="" draggable={false} />;
}

/** Layers on the whole canvas, masked by an image of the canvas (a top's hem). */
function Masked({ mask, children }: { mask?: string; children: ComponentChildren }) {
  if (!mask) return <>{children}</>;
  const m = `url(${artUrl(mask)})`;
  return (
    <div class="layer-mask" style={{ maskImage: m, WebkitMaskImage: m }}>
      {children}
    </div>
  );
}

/**
 * The paper doll. `view` crops to a region of the canvas, e.g. the head:
 * [x, y, w, h] in canvas pixels.
 *
 * Drawing order (back to front): hair and garment backs, body, makeup, underwear
 * (where nothing covers it), shoes over her own feet, bottom (masked to below the top's hem), dress,
 * top, necklace, bracelet, bag, glasses, hair front, earrings.
 */
export function Doll({ look, outfit, class: cls, view }: {
  look: Look; outfit: Outfit; class?: string; view?: [number, number, number, number];
}) {
  const [vx, vy, vw, vh] = view ?? [0, 0, W, H];
  const items: Partial<Record<Slot, Item>> = {};
  for (const [slot, id] of Object.entries(outfit) as [Slot, string][]) {
    if (id && ITEM_BY_ID[id]) items[slot] = ITEM_BY_ID[id];
  }
  const hair = (HAIRSTYLES[look.hair] ?? HAIRSTYLES[0]).art;
  const hairColour = HAIR_COLOURS[look.hairColour ?? 0]?.id;
  const tone = (SKIN_TONES[look.skin ?? BASE_SKIN] ?? SKIN_TONES[BASE_SKIN]).id;
  const makeup = MAKEUPS[look.makeup ?? 0]?.art;
  const { top, bottom, dress, shoes } = items;

  /** An item: a back/front pair or a single layer, with the item's colour filter. */
  const part = (it: Item | undefined, side: 'back' | 'front') => {
    if (!it) return null;
    const pair = LAYERS[`${it.art}-front`];
    if (pair) return <Layer name={`${it.art}-${side}`} filter={it.filter} tone={tone} />;
    return side === 'front' ? <Layer name={it.art} filter={it.filter} tone={tone} /> : null;
  };
  const hem = top && LAYERS[`${top.art}-front`]?.hem ? `${top.art}-hem` : undefined;

  return (
    <div class={'doll ' + (cls ?? '')} style={{ aspectRatio: `${vw} / ${vh}` }}>
      <div
        class="doll-canvas"
        style={{ width: `${(W / vw) * 100}%`, left: `${(-vx / vw) * 100}%`, top: `${(-vy / vh) * 100}%` }}
      >
        <div class="doll-shadow" />
        <Layer name={`${hair}-back`} tone={tone} recolour={hairColour} />
        {part(dress, 'back')}
        {part(top, 'back')}
        <Layer name="body" tone={tone} clipBelow={shoes ? LAYERS[shoes.art]?.cut : undefined} />
        {makeup && <Layer name={makeup} tone={tone} />}
        {!bottom && !dress && <Layer name="underwear-bottom" tone={tone} />}
        {!top && !dress && <Layer name="underwear-top" tone={tone} />}
        {/* shoes go over her own feet; a closed shoe brings the top of the foot it wraps,
            scaled to hers, unfiltered so a colour filter never tints skin */}
        {shoes && <Layer name={`${shoes.art}-foot`} tone={tone} />}
        {part(shoes, 'front')}
        <Masked mask={hem}>{part(bottom, 'front')}</Masked>
        {part(dress, 'front')}
        {part(top, 'front')}
        {part(items.necklace, 'front')}
        {/* on her left wrist (viewer's right): the bag hangs from the other hand */}
        {part(items.bracelet, 'front')}
        {part(items.bag, 'front')}
        {/* glasses sit on the face, under the strands that frame it */}
        {part(items.glasses, 'front')}
        <Layer name={`${hair}-front`} tone={tone} recolour={hairColour} />
        {part(items.earrings, 'front')}
      </div>
    </div>
  );
}

/** Shop picture of an item: a separate product shot if there is one, else its layer. */
export function ItemThumb({ item, silhouette }: { item: Item; silhouette?: boolean }) {
  const product = `product-${item.art}`;
  return (
    <img
      class={'thumb' + (silhouette ? ' silhouette' : '')}
      src={artUrl(LAYERS[product] ? product : item.art)}
      style={{ filter: silhouette ? undefined : item.filter }}
      alt=""
      draggable={false}
    />
  );
}
