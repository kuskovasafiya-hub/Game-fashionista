import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ENERGY_MAX, adsLeft, tickEnergy, useGame, watchAd, xpToNext, type LevelUp } from '../game/store';
import { RARITY, type Item } from '../game/catalog';
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

export function Hud({ onEnergy }: { onEnergy: () => void }) {
  const g = useGame();
  const left = useEnergyTimer();
  const need = xpToNext(g.level);
  return (
    <header class="hud">
      <div class="hud-level" title={`Опыт ${g.xp}/${need}`}>
        <span class="lvl">{g.level}</span>
        <span class="xpbar"><i style={{ width: `${(g.xp / need) * 100}%` }} /></span>
      </div>
      <button class="pill energy" onClick={onEnergy}>
        ☕ {g.energy}/{ENERGY_MAX}
        {left > 0 && <small>{mmss(left)}</small>}
        <b>+</b>
      </button>
      <span class="pill">🪙 {fmt(g.coins)}</span>
      <span class="pill">💎 {g.gems}</span>
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

export function ItemCard({ item, selected, badge, dim, onClick }: {
  item: Item; selected?: boolean; badge?: ComponentChildren; dim?: boolean; onClick?: () => void;
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
    </button>
  );
}
