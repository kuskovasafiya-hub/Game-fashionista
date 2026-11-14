import { useState } from 'preact/hooks';
import { BASE_SKIN, Doll, HAIRSTYLES, HAIR_COLOURS, MAKEUPS, SKIN_TONES, type Look } from '../art/Doll';

export type LookPart = 'hair' | 'colour' | 'makeup' | 'skin';
export const LOOK_PARTS: [LookPart, string][] = [
  ['hair', 'Причёска'], ['colour', 'Цвет волос'], ['makeup', 'Макияж'], ['skin', 'Кожа'],
];
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
    return (
      <button class={'card face' + ((look[key] ?? unset) === i ? ' selected' : '')} onClick={() => onChange(next)}>
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

/** Some parts of her look behind small switches: a wardrobe tab (hair + colour, face + skin). */
export function LookEditor({ look, onChange, parts }: {
  look: Look; onChange: (look: Look) => void; parts: LookPart[];
}) {
  const [part, setPart] = useState<LookPart>(parts[0]);
  const shown = parts.includes(part) ? part : parts[0];
  return (
    <div class="look-editor">
      {parts.length > 1 && (
        <nav class="seg">
          {LOOK_PARTS.filter(([p]) => parts.includes(p)).map(([p, label]) => (
            <button class={shown === p ? 'active' : ''} onClick={() => setPart(p)}>{label}</button>
          ))}
        </nav>
      )}
      <LookGrid part={shown} look={look} onChange={onChange} two />
    </div>
  );
}
