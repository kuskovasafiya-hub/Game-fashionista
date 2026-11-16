import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW, PORTRAIT_VIEW, artUrl } from '../art/Doll';
import { ITEM_BY_ID, type Slot } from '../game/catalog';
import { dressCodeMatch, fits, type Theme } from '../game/events';
import { equip, ownedInSlot, sell, sellPrice, setLook, undressAll, useGame } from '../game/store';
import { DressCode, ItemCard, Modal, RarityTag, UndressButton, fmt } from './common';
import { Icon, type IconName } from './icons';
import { LookGrid, type LookPart } from './LookEditor';

/** Wardrobe tabs, as round icons: her look first, then clothes; bags and jewellery share the ring. */
interface WTab { icon: IconName; label: string; slots?: Slot[]; look?: LookPart }
const TABS: WTab[] = [
  { icon: 'skin', label: 'Цвет кожи', look: 'skin' },
  { icon: 'hair', label: 'Причёска', look: 'hair' },
  { icon: 'eye', label: 'Макияж', look: 'makeup' },
  { icon: 'top', label: 'Верх', slots: ['top'] },
  { icon: 'bottom', label: 'Низ', slots: ['bottom'] },
  { icon: 'dress', label: 'Платья', slots: ['dress'] },
  { icon: 'shoes', label: 'Обувь', slots: ['shoes'] },
  { icon: 'ring', label: 'Аксессуары и сумки', slots: ['necklace', 'earrings', 'bracelet', 'glasses', 'bag'] },
];
const FIRST_CLOTHES = 3;
const ownedIn = (slots: Slot[]) => slots.flatMap((s) => ownedInSlot(s));

/**
 * The model on the left, clothes on the right. With `event` it becomes the fitting room:
 * dress code and live match on top, matching pieces first, a submit button in `footer`.
 */
export function WardrobeScreen({ event, footer }: { event?: Theme; footer?: ComponentChildren }) {
  const g = useGame();
  const [tab, setTab] = useState(FIRST_CLOTHES);
  /** In the hair tab: hair colours instead of hairstyles, behind the colour wheel button. */
  const [dye, setDye] = useState(false);
  useSceneBackground(event?.id);
  const [selling, setSelling] = useState<string | null>(null);
  const { look, slots } = TABS[tab];
  // choosing makeup: zoom in to her face and shoulders
  const view = look === 'makeup' ? PORTRAIT_VIEW : FIGURE_VIEW;
  const items = slots ? ownedIn(slots) : [];
  const sellItem = selling ? ITEM_BY_ID[selling] : null;
  const shown = event ? [...items].sort((a, b) => Number(fits(b, event.tags)) - Number(fits(a, event.tags))) : items;

  return (
    <div class={'screen wardrobe' + (event ? ' fitting' : '')}>
      {event && <FitHead event={event} />}
      <nav class="icon-tabs">
        {TABS.map((t, i) => (
          <button class={'icon-tab' + (tab === i ? ' active' : '')} onClick={() => setTab(i)} title={t.label} aria-label={t.label}>
            <Icon name={t.icon} />
          </button>
        ))}
      </nav>
      <div class="split">
        <div class="split-left">
          <div class={'split-doll' + (look === 'makeup' ? ' portrait' : '')} style={{ '--fig-ratio': view[2] / view[3] }}>
            <Doll key={look === 'makeup' ? 'face' : 'figure'} class="doll" look={g.look} outfit={g.outfit} view={view} />
          </div>
          <UndressButton onClick={undressAll} disabled={!Object.keys(g.outfit).length} />
        </div>
        <div class="split-items">
          {look === 'hair' && (
            <div class="hair-head">
              <b>{dye ? 'Цвет волос' : 'Причёска'}</b>
              <button
                class={'icon-tab colour-btn' + (dye ? ' active' : '')} onClick={() => setDye(!dye)}
                title={dye ? 'Причёски' : 'Цвет волос'} aria-label={dye ? 'Причёски' : 'Цвет волос'}
              >
                <Icon name="colour" />
              </button>
            </div>
          )}
          {look && <LookGrid part={look === 'hair' && dye ? 'colour' : look} look={g.look} onChange={setLook} two />}
          {slots && items.length === 0 && <p class="muted center small">Пока пусто. Загляни в магазины!</p>}
          <div class="grid two">
            {shown.map((i) => (
              <div class="card-wrap">
                <ItemCard
                  item={i} selected={g.outfit[i.slot] === i.id} onClick={() => equip(i.id)}
                  dressCode={event?.tags}
                />
                {!event && <button class="sell" title="Продать" onClick={() => setSelling(i.id)}>🪙</button>}
              </div>
            ))}
          </div>
          {slots && <p class="muted small center">
            {event
              ? 'Подходит вещь хотя бы с одной иконкой ивента — такие стоят первыми.'
              : 'Нажми на вещь, чтобы надеть или снять. 🪙 — продать за 40% цены.'}
          </p>}
        </div>
      </div>
      {footer}
      {sellItem && (
        <Modal onClose={() => setSelling(null)}>
          <h2>Продать?</h2>
          <RarityTag item={sellItem} />
          <p>{sellItem.name}</p>
          <button class="btn primary" onClick={() => { sell(sellItem.id); setSelling(null); }}>
            Продать за {fmt(sellPrice(sellItem))} 🪙
          </button>
          <button class="btn" onClick={() => setSelling(null)}>Оставить</button>
        </Modal>
      )}
    </div>
  );
}

/**
 * In the fitting room the event's or scene's picture fills the whole game screen, behind
 * the HUD too (the bottom menu stays white): set on .app while the fitting room is open.
 */
function useSceneBackground(bg?: string) {
  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.app');
    if (!bg || !app) return;
    app.style.setProperty('--scene', `url(${artUrl('bg-' + bg)})`);
    app.classList.add('scene-bg');
    return () => { app.style.removeProperty('--scene'); app.classList.remove('scene-bg'); };
  }, [bg]);
}

/** Event name, accepted tags and the live dress code match, with what is still missing. */
function FitHead({ event }: { event: Theme }) {
  const g = useGame();
  const m = dressCodeMatch(g.outfit, event.tags);
  const pct = Math.round(m.total * 100);
  const missing = [
    m.clothes < 1 && 'одежда',
    !m.shoes && 'обувь',
    m.acc < 1 && (m.acc ? 'ещё аксессуар' : 'аксессуары'),
  ].filter(Boolean);
  const level = pct >= 85 ? 'high' : pct >= 50 ? 'mid' : 'low';
  return (
    <div class={'fit-head ' + level} style={{ '--ec': event.color }}>
      <div class="fit-title">
        <span>{event.emoji}</span>
        <b>{event.name}</b>
        <b class="fit-pct" title="Соответствие теме">{pct}%</b>
      </div>
      <DressCode tags={event.tags} label />
      <span class="match-bar"><i style={{ width: `${pct}%` }} /></span>
      <small>{missing.length ? `Добавь под тему: ${missing.join(', ')}` : 'Образ полностью в теме!'}</small>
    </div>
  );
}
