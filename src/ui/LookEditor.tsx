import { BASE_SKIN, Doll, HAIRSTYLES, HAIR_COLOURS, MAKEUPS, SKIN_TONES, type Look } from '../art/Doll';

export type LookPart = 'hair' | 'colour' | 'makeup' | 'skin';
const HEAD_VIEW: [number, number, number, number] = [312, 20, 400, 440];
/** Close-up of the face for makeup cards. */
const FACE_VIEW: [number, number, number, number] = [420, 90, 180, 198];

/**
 * One part of her look as a grid of cards, each showing her head with that choice:
 * the hairstyle cards in her hair colour, the colour cards on her hairstyle, and so on.
 */
export function LookGrid({ part, look, onChange, two }: {
  part: LookPart; look: Look; onChange: (look: Look) => void; two?: boolean;
}) {
  /** `unset`: what an old save without this key means. */
  const card = (key: keyof Look, i: number, label: string, view = HEAD_VIEW, dot?: string, unset = 0) => {
    const next = { ...look, [key]: i };
    const selected = (look[key] ?? unset) === i;
    return (
      <button class={'card face' + (selected ? ' selected' : '')} onClick={() => onChange(next)}>
        <Doll class="thumb" look={next} outfit={{}} view={view} />
        <span class="cap">{dot && <i class="tone-dot" style={{ background: dot }} />}{label}</span>
      </button>
    );
  };
  return (
    <div class={'grid look-grid' + (two ? ' two' : '')}>
      {part === 'hair' && HAIRSTYLES.map((h, i) => card('hair', i, h.name))}
      {part === 'colour' && HAIR_COLOURS.map((c, i) => card('hairColour', i, c.name, HEAD_VIEW, c.color))}
      {part === 'makeup' && MAKEUPS.map((m, i) => card('makeup', i, m.name, FACE_VIEW))}
      {part === 'skin' && SKIN_TONES.map((t, i) => card('skin', i, t.name, HEAD_VIEW, t.color, BASE_SKIN))}
    </div>
  );
}

/**
 * The hair colours as a row of dots pinned above the hairstyle cards: a tap dyes her
 * hair and every card, so style and colour are picked on one screen.
 */
export function HairPalette({ look, onChange }: { look: Look; onChange: (look: Look) => void }) {
  const cur = look.hairColour ?? 0;
  return (
    <div class="hair-palette" role="radiogroup" aria-label="Цвет волос">
      {HAIR_COLOURS.map((c, i) => (
        <button
          class={'hair-dot' + (cur === i ? ' selected' : '')} style={{ background: c.color }}
          role="radio" aria-checked={cur === i} title={c.name} aria-label={c.name}
          onClick={() => onChange({ ...look, hairColour: i })}
        />
      ))}
    </div>
  );
}
