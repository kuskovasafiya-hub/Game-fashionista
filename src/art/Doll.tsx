import type { JSX } from 'preact';
import layers from './layers.json';
import { ITEM_BY_ID, type Item, type Slot } from '../game/catalog';

/** All art is cut from a 1024x1536 canvas; layers are positioned in % of it. */
const W = 1024;
const H = 1536;
type Box = { x: number; y: number; w: number; h: number };
const LAYERS = layers as Record<string, Box>;

export interface HairStyle { name: string; art: string | null }
export const HAIRSTYLES: HairStyle[] = [
  { name: 'Пучок', art: null },
  { name: 'Локоны', art: 'hair-long' },
  { name: 'Каре', art: 'hair-bob' },
];

export interface Look { hair: number }
export type Outfit = Partial<Record<Slot, string>>;

const UNDER_HAIR: Slot[] = ['shoes', 'bottom', 'dress', 'top', 'necklace', 'bag'];

export const artUrl = (name: string) => `${import.meta.env.BASE_URL}art/${name}.webp`;

function Layer({ name, filter }: { name: string; filter?: string }) {
  const l = LAYERS[name];
  if (!l) return null;
  const style: JSX.CSSProperties = {
    left: `${(l.x / W) * 100}%`,
    top: `${(l.y / H) * 100}%`,
    width: `${(l.w / W) * 100}%`,
    filter,
  };
  return <img class="layer" src={artUrl(name)} style={style} alt="" draggable={false} />;
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
  const hair = HAIRSTYLES[look.hair]?.art;
  const layer = (s: Slot) => {
    const it = items[s];
    return it ? <Layer name={it.art} filter={it.filter} /> : null;
  };
  return (
    <div class={'doll ' + (cls ?? '')} style={{ aspectRatio: `${vw} / ${vh}` }}>
      <div
        class="doll-canvas"
        style={{ width: `${(W / vw) * 100}%`, left: `${(-vx / vw) * 100}%`, top: `${(-vy / vh) * 100}%` }}
      >
        <div class="doll-shadow" />
        {hair && <Layer name={`${hair}-back`} />}
        <Layer name="body" />
        {/* shoes are drawn with the whole foot, so bare feet would poke out from under them */}
        {!items.shoes && <Layer name="feet" />}
        {UNDER_HAIR.map(layer)}
        {hair && <Layer name={hair} />}
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
