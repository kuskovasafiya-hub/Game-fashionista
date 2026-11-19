import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ENERGY_MAX, adsLeft, tickEnergy, useGame, watchAd, xpToNext, type LevelUp } from '../game/store';
import { RARITY, TAG_ICONS, TAG_NAMES, type Item, type Tag } from '../game/catalog';
import { ItemThumb } from '../art/Doll';
import { flyRewards } from './fx';
import { audioPrefs, onAudioPrefs, setAudioPrefs, sfx, type Sfx } from '../game/sound';

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
        <button class="cur" data-cur="energy" onClick={onEnergy}>
          <i>☕<b>+</b></i>{g.energy}/{ENERGY_MAX}
          {left > 0 && <small>{mmss(left)}</small>}
        </button>
        <span class="cur" data-cur="coins"><i><Coin /></i><Rolling value={g.coins} /></span>
        <span class="cur" data-cur="gems"><i>💎</i>{g.gems}</span>
        <button class="cur" data-cur="tickets" onClick={onTickets}><i>🎟<b>+</b></i>{g.tickets}</button>
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

/** Plays a sound once when it appears (put it inside a modal or screen). */
export function Sound({ name, delay = 0 }: { name: Sfx; delay?: number }) {
  useEffect(() => { const t = setTimeout(() => sfx(name), delay); return () => clearTimeout(t); }, []);
  return null;
}

export function LevelUpModal({ lu, onClose }: { lu: LevelUp; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <Sound name="level" />
      <div class="burst">⭐</div>
      <h2>Уровень {lu.level}!</h2>
      <ul class="rewards">
        <li data-reward="coins"><Coin /> +{fmt(lu.coins)}</li>
        <li data-reward="gems">💎 +{lu.gems}</li>
        {lu.cups && <li>☕ Энергия восстановлена, +5 сверху</li>}
        {lu.shops.map((s) => <li>🛍️ Открыт магазин «{s}»</li>)}
      </ul>
      <button class="btn primary" onClick={() => { flyRewards(); onClose(); }}>Ура!</button>
    </Modal>
  );
}

/** «Снять всё»: a small, quiet button under the model. */
export function UndressButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button class="undress" onClick={onClick} disabled={disabled} title="Снять всё">
      Снять всё
    </button>
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
export function DressCode({ tags, label, pulse }: { tags: Tag[]; label?: boolean; pulse?: boolean }) {
  return (
    <span class={'chips' + (pulse ? ' pulse-chips' : '')}>
      {label && <span class="chips-label">Подходят:</span>}
      {tags.map((t) => <span class={'chip tag-' + t}><TagIcon tag={t} />{TAG_NAMES[t]}</span>)}
    </span>
  );
}

/** The coin: a small gold disc drawn in CSS (the 🪙 emoji is silver on most phones). */
export function Coin() {
  return <i class="coin" role="img" aria-label="монеты" />;
}

/** Price of an item: coins, plus diamonds for the rarest Premium pieces. */
export function Price({ item }: { item: Item }) {
  return <><Coin /> {fmt(item.price)}{item.gems ? <> + 💎 {item.gems}</> : null}</>;
}

/** A tutorial hint: a hand taps what to press next; at most a couple of words or icons beside it. */
export interface CoachHint {
  /** CSS selector (inside `.app`) of what to tap. */
  target: string;
  label?: ComponentChildren;
  /** Wait this long before the first tap hint (let her look around first). */
  wait?: number;
}

/** After she taps anything, the hand hides and comes back once she has been idle this long. */
const COACH_IDLE_MS = 4000;

/**
 * The tutorial hand. It finds `target` on screen, dims the rest for a moment (a spotlight) and taps it.
 * Any tap hides it; it comes back by itself when she idles. Drawn into `.app`, under modals.
 */
export function CoachHand({ target, label, wait = 0 }: CoachHint) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number; W: number; H: number } | null>(null);
  const [shown, setShown] = useState(wait === 0);
  const [spot, setSpot] = useState(wait === 0);

  useEffect(() => {
    const measure = () => {
      const app = document.querySelector('.app');
      const el = app?.querySelector<HTMLElement>(target);
      if (!app || !el) return setBox(null);
      const a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (!r.width || cx < a.left || cx > a.right || cy < a.top || cy > a.bottom) return setBox(null);
      const next = { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height, W: a.width, H: a.height };
      setBox((b) => (b && Object.keys(next).every((k) => Math.abs(b[k as 'x'] - next[k as 'x']) < 1) ? b : next));
    };
    measure();
    const t = setInterval(measure, 200);
    return () => clearInterval(t);
  }, [target]);

  useEffect(() => {
    let timer = wait ? setTimeout(() => setShown(true), wait) : undefined;
    const down = () => {
      setShown(false);
      setSpot(false);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(true), COACH_IDLE_MS);
    };
    window.addEventListener('pointerdown', down, true);
    return () => { window.removeEventListener('pointerdown', down, true); clearTimeout(timer); };
  }, [target]);

  if (!box || !shown) return null;
  const cx = box.x + box.w / 2;
  // a target low on the screen gets the hand from above, pointing down
  const above = box.y + box.h / 2 > box.H * 0.55;
  const handY = above ? box.y + Math.min(box.h * 0.35, 30) - 48 : box.y + box.h * 0.55;
  const labelX = Math.min(Math.max(cx, 64), box.W - 64);
  return (
    <div class="coach-layer" aria-hidden="true">
      {spot && <span class="coach-spot" style={{ left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12 }} />}
      <span class="coach-ring" style={{ left: box.x - 4, top: box.y - 4, width: box.w + 8, height: box.h + 8 }} />
      <span class={'coach-hand' + (above ? ' down' : '')} style={{ left: cx, top: handY }}>{above ? '👇' : '👆'}</span>
      {label && (
        <span class={'coach-label' + (above ? ' above' : '')} style={{ left: labelX, top: above ? handY - 6 : handY + 52 }}>
          {label}
        </span>
      )}
    </div>
  );
}

/** Progress as dots: 🛍️ ●●○. */
export function Dots({ n, of, icon }: { n: number; of: number; icon?: string }) {
  return (
    <span class="dots">
      {icon && <span>{icon}</span>}
      {Array.from({ length: of }, (_, i) => <i class={i < n ? 'on' : ''} />)}
    </span>
  );
}

/** A number that rolls to its new value (the HUD wallet); rises wait a moment for the flying coins. */
export function Rolling({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const from = shown;
    if (from === value) return;
    const t0 = performance.now(), delay = value > from ? 650 : 0, dur = 700;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0 - delay) / dur));
      setShown(Math.round(from + (value - from) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{fmt(shown)}</>;
}

/** Music and sounds, each on or off (remembered on this device). */
export function AudioModal({ onClose }: { onClose: () => void }) {
  const [p, setP] = useState(audioPrefs());
  useEffect(() => onAudioPrefs(() => setP(audioPrefs())), []);
  const row = (key: 'music' | 'sfx', icon: string, name: string) => (
    <button class={'audio-row' + (p[key] ? ' on' : '')} role="switch" aria-checked={p[key]} onClick={() => setAudioPrefs({ [key]: !p[key] })}>
      <span class="ar-icon">{icon}</span>
      <b>{name}</b>
      <span class="ar-switch"><i /></span>
    </button>
  );
  return (
    <Modal onClose={onClose}>
      <h2>Звук</h2>
      <div class="audio-rows">
        {row('music', '🎵', 'Музыка')}
        {row('sfx', '🔔', 'Звуки')}
      </div>
      <button class="btn" onClick={onClose}>Готово</button>
    </Modal>
  );
}

/** A small round button that opens the sound settings. */
export function AudioButton({ onClick }: { onClick: () => void }) {
  const [p, setP] = useState(audioPrefs());
  useEffect(() => onAudioPrefs(() => setP(audioPrefs())), []);
  return (
    <button class="audio-btn" aria-label="Звук" onClick={onClick}>{p.music || p.sfx ? '🔊' : '🔇'}</button>
  );
}
