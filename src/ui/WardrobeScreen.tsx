import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW, artUrl } from '../art/Doll';
import { ITEM_BY_ID, type Slot } from '../game/catalog';
import { dressCodeMatch, fits, type Theme } from '../game/events';
import { equip, ownedInSlot, sell, sellPrice, useGame } from '../game/store';
import { DressCode, ItemCard, Modal, RarityTag, fmt } from './common';

/** Wardrobe tabs; accessories of every kind share one tab. */
const TABS: [string, Slot[]][] = [
  ['Верх', ['top']],
  ['Низ', ['bottom']],
  ['Платья', ['dress']],
  ['Обувь', ['shoes']],
  ['Аксессуары', ['necklace', 'earrings', 'glasses', 'bag']],
];
const ownedIn = (slots: Slot[]) => slots.flatMap((s) => ownedInSlot(s));

/**
 * The model on the left, clothes on the right. With `event` it becomes the fitting room:
 * dress code and live match on top, matching pieces first, a submit button in `footer`.
 */
export function WardrobeScreen({ event, footer }: { event?: Theme; footer?: ComponentChildren }) {
  const g = useGame();
  const [tab, setTab] = useState(0);
  const [selling, setSelling] = useState<string | null>(null);
  const items = ownedIn(TABS[tab][1]);
  const sellItem = selling ? ITEM_BY_ID[selling] : null;
  const shown = event ? [...items].sort((a, b) => Number(fits(b, event.tags)) - Number(fits(a, event.tags))) : items;

  return (
    <div class={'screen wardrobe' + (event ? ' fitting' : '')}>
      {event && <FitHead event={event} />}
      <nav class="tabs">
        {TABS.map(([label, slots], t) => (
          <button class={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {label} <small>{ownedIn(slots).length}</small>
          </button>
        ))}
      </nav>
      <div class="split">
        <div
          class="split-doll"
          style={{ '--fig-ratio': FIGURE_VIEW[2] / FIGURE_VIEW[3], ...(event && { '--bg': `url(${artUrl('bg-' + event.id)})` }) }}
        >
          <Doll class="doll" look={g.look} outfit={g.outfit} view={FIGURE_VIEW} />
        </div>
        <div class="split-items">
          {items.length === 0 && <p class="muted center small">Пока пусто. Загляни в магазины!</p>}
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
          <p class="muted small center">
            {event
              ? 'Подходит вещь хотя бы с одной иконкой ивента — такие стоят первыми.'
              : 'Нажми на вещь, чтобы надеть или снять. 🪙 — продать за 40% цены.'}
          </p>
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
