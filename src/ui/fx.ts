import { sfx, type Sfx } from '../game/sound';
/**
 * Little flying things, drawn straight into `.app` so they outlive the screen they start on:
 * a bought piece flies to the wardrobe, reward coins fly into the wallet.
 */

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const appEl = () => document.querySelector<HTMLElement>('.app');

/** Make `el` hop once (and optionally pop a «+1» above it). */
export function bump(el: Element, plus?: string) {
  const h = el as HTMLElement;
  h.classList.remove('bump');
  void h.offsetWidth; // restart the animation
  h.classList.add('bump');
  const app = appEl();
  if (!plus || !app) return;
  const a = app.getBoundingClientRect(), r = h.getBoundingClientRect();
  const pop = document.createElement('span');
  pop.className = 'plus-pop';
  pop.textContent = plus;
  pop.style.left = `${r.left + r.width / 2 - a.left}px`;
  pop.style.top = `${r.top - a.top}px`;
  app.appendChild(pop);
  setTimeout(() => pop.remove(), 1000);
}

/**
 * Fly `count` copies of `make()` from `from` to the element matching `toSel`, in an arc;
 * the target hops as each one lands.
 */
export function flyTo(from: Element | null | undefined, toSel: string, make: () => HTMLElement, opts: {
  count?: number; delay?: number; plus?: string; /** Played as each copy lands. */ sound?: Sfx;
} = {}) {
  const app = appEl();
  const to = app?.querySelector(toSel);
  if (!app || !from || !to) return;
  const a = app.getBoundingClientRect(), f = from.getBoundingClientRect(), t = to.getBoundingClientRect();
  const n = calm() ? 1 : opts.count ?? 1;
  for (let i = 0; i < n; i++) {
    const el = make();
    el.classList.add('flyer');
    const sx = f.left + f.width / 2 - a.left + (n > 1 ? (Math.random() - 0.5) * Math.min(60, f.width) : 0);
    const sy = f.top + f.height / 2 - a.top + (n > 1 ? (Math.random() - 0.5) * 16 : 0);
    const dx = t.left + t.width / 2 - a.left - sx, dy = t.top + t.height / 2 - a.top - sy;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    app.appendChild(el);
    const at = (x: number, y: number, s: number) => `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${s})`;
    const anim = el.animate([
      { transform: at(0, 0, 0.6), opacity: 0 },
      { transform: at(0, -10, 1.15), opacity: 1, offset: 0.15 },
      { transform: at(dx * 0.45 + (i % 2 ? 24 : -24), dy * 0.45 - 70, 1), offset: 0.55 },
      { transform: at(dx, dy, 0.45), opacity: 1 },
    ], { duration: calm() ? 1 : 820, delay: (opts.delay ?? 0) + i * 80, easing: 'ease-in-out', fill: 'both' });
    anim.onfinish = () => {
      el.remove();
      if (opts.sound) sfx(opts.sound);
      bump(to, i === n - 1 ? opts.plus : undefined);
    };
  }
}

const emoji = (ch: string) => () => {
  const s = document.createElement('span');
  s.className = 'flyer-emoji';
  s.textContent = ch;
  return s;
};
const coin = () => {
  const c = document.createElement('i');
  c.className = 'coin flyer-coin';
  return c;
};

/** What each `data-reward` chip turns into, and where in the HUD it flies. */
const REWARD_FLY: Record<string, { to: string; make: () => HTMLElement; count: number; sound?: Sfx }> = {
  coins: { to: '[data-cur="coins"] i', make: coin, count: 7, sound: 'coin' },
  gems: { to: '[data-cur="gems"] i', make: emoji('💎'), count: 3 },
  energy: { to: '[data-cur="energy"] i', make: emoji('☕'), count: 3 },
  tickets: { to: '[data-cur="tickets"] i', make: emoji('🎟'), count: 2 },
  xp: { to: '.hud-level', make: emoji('⭐'), count: 3 },
};

/** Send every reward chip on screen (`[data-reward=coins|gems|…]`) flying into the HUD. */
export function flyRewards(delay = 0, root: ParentNode | null = appEl()) {
  root?.querySelectorAll<HTMLElement>('[data-reward]').forEach((el, k) => {
    const f = REWARD_FLY[el.dataset.reward!];
    if (f) flyTo(el, f.to, f.make, { count: f.count, delay: delay + k * 120, sound: f.sound ?? 'pop' });
  });
}

/** A copy of a picture (a bought piece) for flyTo. */
export const picture = (src: string, filter?: string) => () => {
  const img = document.createElement('img');
  img.className = 'flyer-pic';
  img.src = src;
  if (filter) img.style.filter = filter;
  return img;
};
