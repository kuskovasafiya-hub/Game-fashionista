import { useState } from 'preact/hooks';
import { DEFAULT_LOOK, Doll, FIGURE_VIEW, PORTRAIT_VIEW, type Look, type Outfit } from '../art/Doll';
import { STARTER, type Slot } from '../game/catalog';
import { createCharacter } from '../game/store';
import { ItemCard, UndressButton } from './common';
import { Icon, type IconName } from './icons';
import { HairPalette, LookGrid, type LookPart } from './LookEditor';

/** Same round icon tabs as the wardrobe: her look first, then the starter clothes. */
interface CTab { icon: IconName; label: string; slots?: Slot[]; look?: LookPart; required?: boolean }
const TABS: CTab[] = [
  { icon: 'skin', label: 'Цвет кожи', look: 'skin' },
  { icon: 'hair', label: 'Причёска', look: 'hair' },
  { icon: 'eye', label: 'Макияж', look: 'makeup' },
  { icon: 'top', label: 'Верх', slots: ['top'], required: true },
  { icon: 'bottom', label: 'Низ', slots: ['bottom'], required: true },
  { icon: 'dress', label: 'Платья', slots: ['dress'], required: true },
  { icon: 'shoes', label: 'Обувь', slots: ['shoes'], required: true },
  { icon: 'ring', label: 'Аксессуары и сумки', slots: ['necklace', 'earrings', 'glasses', 'bracelet', 'bag'] },
];
const DEFAULT_TOP = 'starter-top-tee-1';
const DEFAULT_BOTTOM = 'starter-bottom-jeans-1';

export function CreateScreen() {
  const [look, setLook] = useState<Look>({ ...DEFAULT_LOOK });
  const [outfit, setOutfit] = useState<Outfit>({
    top: DEFAULT_TOP, bottom: DEFAULT_BOTTOM, shoes: 'starter-shoes-sneakers-1',
  });
  const [tab, setTab] = useState(0);

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

  const { look: part, slots, required } = TABS[tab];
  // choosing makeup: zoom in to her face and shoulders
  const view = part === 'makeup' ? PORTRAIT_VIEW : FIGURE_VIEW;

  return (
    <div class="screen create">
      <h1 class="title">Создай свою модницу</h1>
      <nav class="icon-tabs">
        {TABS.map((t, i) => (
          <button class={'icon-tab' + (tab === i ? ' active' : '')} onClick={() => setTab(i)} title={t.label} aria-label={t.label}>
            <Icon name={t.icon} />
          </button>
        ))}
      </nav>
      <p class="tab-label">{TABS[tab].label}</p>
      <div class="split">
        <div class="split-left">
          <div class={'split-doll' + (part === 'makeup' ? ' portrait' : '')} style={{ '--fig-ratio': view[2] / view[3] }}>
            <Doll key={part === 'makeup' ? 'face' : 'figure'} class="doll" look={look} outfit={outfit} view={view} />
          </div>
          <UndressButton onClick={() => setOutfit({})} disabled={!Object.keys(outfit).length} />
        </div>
        <div class="split-items">
          {part === 'hair' && <HairPalette look={look} onChange={setLook} />}
          {part && <LookGrid part={part} look={look} onChange={setLook} two />}
          {slots && (
            <div class="grid two">
              {items(slots).map((i) => (
                <ItemCard item={i} selected={outfit[i.slot] === i.id} onClick={() => toggle(i.slot, i.id, required)} />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* the model has no name: one button and she is ready */}
      <div class="create-footer">
        <button class="btn primary" onClick={() => createCharacter('', look, outfit)}>Готово ✨</button>
      </div>
    </div>
  );
}
