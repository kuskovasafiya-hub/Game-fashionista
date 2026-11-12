import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ENERGY_MAX, adsLeft, tickEnergy, useGame, watchAd, xpToNext, type LevelUp } from '../game/store';
import { RARITY, TAG_ICONS, TAG_NAMES, type Item, type Tag } from '../game/catalog';
import { ItemThumb } from '../art/Doll';

export const fmt = (n: number) => n.toLocaleString('ru-RU');

/** Russian plural: plural(5, 'поиск', 'поиска', 'поисков'). */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Re-render every second and apply energy regeneration. */
export function useEnergyTimer() {
  const [left, setLeft] = useState(() => tickEnergy());
  useEffect(() => {
    const t = setInterval(() => setLeft(tickEnergy()), 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

export function Hud({ onEnergy, onTickets }: { onEnergy: () => void; onTickets: () => void }) {
  const g = useGame();
  const left = useEnergyTimer();
  const need = xpToNext(g.level);
  return (
    <header class="hud">
      <span class="hud-level" title={`Уровень ${g.level} · опыт ${g.xp}/${need}`} style={{ '--xp': `${(g.xp / need) * 100}%` }}>
        <span class="lvl">{g.level}</span>
      </span>
      <div class="wallet">
        <button class="cur" onClick={onEnergy}>
          <i>☕<b>+</b></i>{g.energy}/{ENERGY_MAX}
          {left > 0 && <small>{mmss(left)}</small>}
        </button>
        <span class="cur"><i>🪙</i>{fmt(g.coins)}</span>
        <span class="cur"><i>💎</i>{g.gems}</span>
        <button class="cur" onClick={onTickets}><i>🎟<b>+</b></i>{g.tickets}</button>
      </div>
    </header>
  );
}

export function Modal({ children, onClose }: { children: ComponentChildren; onClose?: () => void }) {
  return (
    <div class="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div class="modal">{children}</div>
    </div>
  );
}

export function EnergyModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const left = useEnergyTimer();
  const ads = adsLeft();
  return (
    <Modal onClose={onClose}>
      <h2>☕ Энергия</h2>
      <p class="big">{g.energy} / {ENERGY_MAX}</p>
      <p class="muted">{left > 0 ? `Следующая чашечка через ${mmss(left)}` : 'Энергия полная'}</p>
      <p class="muted">1 чашечка восстанавливается за 6 минут</p>
      <button class="btn primary" disabled={ads <= 0} onClick={() => watchAd()}>
        📺 Смотреть рекламу: +5 ☕
      </button>
      <p class="muted small">Осталось сегодня: {ads}</p>
      <button class="btn" onClick={onClose}>Закрыть</button>
    </Modal>
  );
}

export function LevelUpModal({ lu, onClose }: { lu: LevelUp; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div class="burst">⭐</div>
      <h2>Уровень {lu.level}!</h2>
      <ul class="rewards">
        <li>🪙 +{fmt(lu.coins)}</li>
        <li>💎 +{lu.gems}</li>
        <li>☕ Энергия восстановлена, +5 сверху</li>
        {lu.shops.map((s) => <li>🛍️ Открыт магазин «{s}»</li>)}
      </ul>
      <button class="btn primary" onClick={onClose}>Ура!</button>
    </Modal>
  );
}

export function RarityTag({ item }: { item: Item }) {
  const r = RARITY[item.rarity];
  return <span class="rarity" style={{ background: r.color }}>{r.name}</span>;
}

/**
 * `dressCode`: in the fitting room, the item's tags outside the event's dress code are faded.
 */
export function ItemCard({ item, selected, badge, dim, onClick, dressCode }: {
  item: Item; selected?: boolean; badge?: ComponentChildren; dim?: boolean; onClick?: () => void; dressCode?: Tag[];
}) {
  return (
    <button
      class={'card' + (selected ? ' selected' : '') + (dim ? ' dim' : '')}
      style={{ '--rc': RARITY[item.rarity].color }}
      title={dim ? 'Ещё не найдено' : item.name}
      onClick={onClick}
    >
      <ItemThumb item={item} silhouette={dim} />
      {badge && <span class="badge">{badge}</span>}
      {!dim && (
        <span class="item-tags">
          {(dressCode ? [...item.tags].sort((a, b) => Number(dressCode.includes(b)) - Number(dressCode.includes(a))) : item.tags)
            .map((t) => <TagIcon tag={t} off={!!dressCode && !dressCode.includes(t)} />)}
        </span>
      )}
    </button>
  );
}

export function TagIcon({ tag, off }: { tag: Tag; off?: boolean }) {
  return <span class={'tag-icon tag-' + tag + (off ? ' off' : '')} title={TAG_NAMES[tag]}>{TAG_ICONS[tag]}</span>;
}

/** The tags an event accepts: an item fits if it has any of them. */
export function DressCode({ tags, label }: { tags: Tag[]; label?: boolean }) {
  return (
    <span class="chips">
      {label && <span class="chips-label">Подходят:</span>}
      {tags.map((t) => <span class={'chip tag-' + t}><TagIcon tag={t} />{TAG_NAMES[t]}</span>)}
    </span>
  );
}
