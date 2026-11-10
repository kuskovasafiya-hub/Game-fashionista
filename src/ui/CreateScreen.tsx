import { useState } from 'preact/hooks';
import { Doll, HAIRSTYLES, type Look, type Outfit } from '../art/Doll';
import { STARTER, type Slot } from '../game/catalog';
import { createCharacter } from '../game/store';
import { ItemCard } from './common';

type Tab = 'hair' | 'clothes' | 'shoes' | 'acc';
const TABS: [Tab, string][] = [['hair', 'Причёска'], ['clothes', 'Одежда'], ['shoes', 'Обувь'], ['acc', 'Аксессуары']];
const HEAD_VIEW: [number, number, number, number] = [312, 20, 400, 440];
const DEFAULT_TOP = 'starter-top-tee-1';
const DEFAULT_BOTTOM = 'starter-bottom-jeans-1';

export function CreateScreen() {
  const [look, setLook] = useState<Look>({ hair: 1 });
  const [outfit, setOutfit] = useState<Outfit>({
    top: DEFAULT_TOP, bottom: DEFAULT_BOTTOM, shoes: 'starter-shoes-sneakers-1',
  });
  const [tab, setTab] = useState<Tab>('hair');
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
          {tab === 'hair' && (
            <div class="grid">
              {HAIRSTYLES.map((h, i) => (
                <button class={'card face' + (look.hair === i ? ' selected' : '')} onClick={() => setLook({ ...look, hair: i })}>
                  <Doll class="thumb" look={{ hair: i }} outfit={{}} view={HEAD_VIEW} />
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
