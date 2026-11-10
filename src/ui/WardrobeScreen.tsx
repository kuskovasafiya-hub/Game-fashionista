import { useState } from 'preact/hooks';
import { Doll } from '../art/Doll';
import { ITEM_BY_ID, type Slot } from '../game/catalog';
import { equip, ownedInSlot, sell, sellPrice, useGame } from '../game/store';
import { ItemCard, Modal, RarityTag, fmt } from './common';

/** Wardrobe tabs; accessories of every kind share one tab. */
const TABS: [string, Slot[]][] = [
  ['Верх', ['top']],
  ['Низ', ['bottom']],
  ['Платья', ['dress']],
  ['Обувь', ['shoes']],
  ['Аксессуары', ['necklace', 'earrings', 'bag']],
];
const ownedIn = (slots: Slot[]) => slots.flatMap((s) => ownedInSlot(s));

export function WardrobeScreen() {
  const g = useGame();
  const [tab, setTab] = useState(0);
  const [selling, setSelling] = useState<string | null>(null);
  const items = ownedIn(TABS[tab][1]);
  const sellItem = selling ? ITEM_BY_ID[selling] : null;

  return (
    <div class="screen wardrobe">
      <div class="stage small">
        <Doll class="doll" look={g.look} outfit={g.outfit} />
      </div>
      <div class="panel">
        <nav class="tabs">
          {TABS.map(([label, slots], t) => (
            <button class={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
              {label} <small>{ownedIn(slots).length}</small>
            </button>
          ))}
        </nav>
        <div class="options">
          {items.length === 0 && <p class="muted center">Пока пусто. Загляни в магазины!</p>}
          <div class="grid">
            {items.map((i) => (
              <div class="card-wrap">
                <ItemCard item={i} selected={g.outfit[i.slot] === i.id} onClick={() => equip(i.id)} />
                <button class="sell" title="Продать" onClick={() => setSelling(i.id)}>🪙</button>
              </div>
            ))}
          </div>
          <p class="muted small center">Нажми на вещь, чтобы надеть или снять. 🪙 — продать за 40% цены.</p>
        </div>
      </div>
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
