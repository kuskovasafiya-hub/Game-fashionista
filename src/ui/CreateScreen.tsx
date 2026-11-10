import { useState } from 'preact/hooks';
import { DEFAULT_LOOK, Doll, HAIRSTYLES, MAKEUPS, SKIN_TONES, type Look, type Outfit } from '../art/Doll';
import { STARTER, type Slot } from '../game/catalog';
import { createCharacter } from '../game/store';
import { ItemCard } from './common';

type Tab = 'skin' | 'makeup' | 'hair' | 'clothes' | 'shoes' | 'acc';
const TABS: [Tab, string][] = [
  ['skin', 'Кожа'], ['makeup', 'Макияж'], ['hair', 'Причёска'],
  ['clothes', 'Одежда'], ['shoes', 'Обувь'], ['acc', 'Аксессуары'],
];
const HEAD_VIEW: [number, number, number, number] = [312, 20, 400, 440];
/** Close-up of the face for makeup cards. */
const FACE_VIEW: [number, number, number, number] = [420, 90, 180, 198];
const DEFAULT_TOP = 'starter-top-tee-1';
const DEFAULT_BOTTOM = 'starter-bottom-jeans-1';

export function CreateScreen() {
  const [look, setLook] = useState<Look>({ ...DEFAULT_LOOK });
  const [outfit, setOutfit] = useState<Outfit>({
    top: DEFAULT_TOP, bottom: DEFAULT_BOTTOM, shoes: 'starter-shoes-sneakers-1',
  });
  const [tab, setTab] = useState<Tab>('skin');
  const [name, setName] = useState('');

  const toggle = (slot: Slot, id: string, required = false) => {
    const next = { ...outfit };
    if (next[slot] === id) { if (!required) delete next[slot]; }
    else {
      next[slot] = id;
      if (slot === 'dress') { delete next.top; delete next.bottom; }
      if (slot === 'top' || slot === 'bottom') {
        delete next.dress;
        next.top ??= DEFAULT_TOP;
        next.bottom ??= DEFAULT_BOTTOM;
      }
    }
    setOutfit(next);
  };
  const items = (slots: Slot[]) => STARTER.filter((i) => slots.includes(i.slot));
  const done = name.trim().length > 0;

  return (
    <div class="screen create">
      <div class="stage">
        <Doll look={look} outfit={outfit} />
      </div>
      <div class="panel">
        <h1 class="title">Создай свою модницу</h1>
        <nav class="tabs">
          {TABS.map(([t, label]) => (
            <button class={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{label}</button>
          ))}
        </nav>
        <div class="options">
          {tab === 'skin' && (
            <div class="grid">
              {SKIN_TONES.map((t, i) => (
                <button class={'card face' + (look.skin === i ? ' selected' : '')} onClick={() => setLook({ ...look, skin: i })}>
                  <Doll class="thumb" look={{ ...look, skin: i }} outfit={{}} view={HEAD_VIEW} />
                  <span class="cap"><i class="tone-dot" style={{ background: t.color }} />{t.name}</span>
                </button>
              ))}
            </div>
          )}
          {tab === 'makeup' && (
            <div class="grid">
              {MAKEUPS.map((m, i) => (
                <button class={'card face' + (look.makeup === i ? ' selected' : '')} onClick={() => setLook({ ...look, makeup: i })}>
                  <Doll class="thumb" look={{ ...look, makeup: i }} outfit={{}} view={FACE_VIEW} />
                  <span class="cap">{m.name}</span>
                </button>
              ))}
            </div>
          )}
          {tab === 'hair' && (
            <div class="grid">
              {HAIRSTYLES.map((h, i) => (
                <button class={'card face' + (look.hair === i ? ' selected' : '')} onClick={() => setLook({ ...look, hair: i })}>
                  <Doll class="thumb" look={{ ...look, hair: i }} outfit={{}} view={HEAD_VIEW} />
                  <span class="cap">{h.name}</span>
                </button>
              ))}
            </div>
          )}
          {tab === 'clothes' && (
            <div class="grid">
              {items(['dress', 'top', 'bottom']).map((i) => (
                <ItemCard item={i} selected={outfit[i.slot] === i.id} onClick={() => toggle(i.slot, i.id, true)} />
              ))}
            </div>
          )}
          {tab === 'shoes' && (
            <div class="grid">
              {items(['shoes']).map((i) => (
                <ItemCard item={i} selected={outfit.shoes === i.id} onClick={() => toggle('shoes', i.id, true)} />
              ))}
            </div>
          )}
          {tab === 'acc' && (
            <div class="grid">
              {items(['necklace', 'earrings', 'bag']).map((i) => (
                <ItemCard item={i} selected={outfit[i.slot] === i.id} onClick={() => toggle(i.slot, i.id)} />
              ))}
            </div>
          )}
        </div>
        <div class="create-footer">
          <input class="input" maxLength={16} placeholder="Имя модницы" value={name} onInput={(e) => setName(e.currentTarget.value)} />
          <button class="btn primary" disabled={!done} onClick={() => createCharacter(name.trim(), look, outfit)}>
            Готово ✨
          </button>
        </div>
      </div>
    </div>
  );
}
