import type { JSX } from 'preact';
import layers from './layers.json';
import { ITEM_BY_ID, type Item, type Slot } from '../game/catalog';

/** All art is cut from a 1024x1536 canvas; layers are positioned in % of it. */
const W = 1024;
const H = 1536;
/** `skin`: the layer shows some skin and has a recoloured file per tone, `<name>~<tone>`. */
type Box = { x: number; y: number; w: number; h: number; skin?: boolean };
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

/** Indices into HAIRSTYLES, SKIN_TONES, MAKEUPS (old saves have only `hair`). */
export interface Look { hair: number; skin?: number; makeup?: number }
export const DEFAULT_LOOK: Look = { hair: 1, skin: BASE_SKIN, makeup: 0 };
export type Outfit = Partial<Record<Slot, string>>;

const UNDER_HAIR: Slot[] = ['shoes', 'bottom', 'dress', 'top', 'necklace', 'bag'];

export const artUrl = (name: string) => `${import.meta.env.BASE_URL}art/${name}.webp`;

function Layer({ name, filter, tone }: { name: string; filter?: string; tone: string }) {
  const l = LAYERS[name];
  if (!l) return null;
  const file = l.skin && tone !== SKIN_TONES[BASE_SKIN].id ? `${name}~${tone}` : name;
  const style: JSX.CSSProperties = {
    left: `${(l.x / W) * 100}%`,
    top: `${(l.y / H) * 100}%`,
    width: `${(l.w / W) * 100}%`,
    filter,
  };
  return <img class="layer" src={artUrl(file)} style={style} alt="" draggable={false} />;
}

/**
 * The paper doll. `view` crops to a region of the canvas, e.g. the head:
 * [x, y, w, h] in canvas pixels.
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
  const tone = (SKIN_TONES[look.skin ?? BASE_SKIN] ?? SKIN_TONES[BASE_SKIN]).id;
  const makeup = MAKEUPS[look.makeup ?? 0]?.art;
  const layer = (s: Slot) => {
    const it = items[s];
    return it ? <Layer name={it.art} filter={it.filter} tone={tone} /> : null;
  };
  return (
    <div class={'doll ' + (cls ?? '')} style={{ aspectRatio: `${vw} / ${vh}` }}>
      <div
        class="doll-canvas"
        style={{ width: `${(W / vw) * 100}%`, left: `${(-vx / vw) * 100}%`, top: `${(-vy / vh) * 100}%` }}
      >
        <div class="doll-shadow" />
        <Layer name={`${hair}-back`} tone={tone} />
        <Layer name="body" tone={tone} />
        {makeup && <Layer name={makeup} tone={tone} />}
        {/* shoes are drawn with the whole foot, so bare feet would poke out from under them */}
        {!items.shoes && <Layer name="feet" tone={tone} />}
        {UNDER_HAIR.map(layer)}
        <Layer name={hair} tone={tone} />
        {layer('earrings')}
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
