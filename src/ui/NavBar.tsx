import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

export type Tab = 'shops' | 'vote' | 'home' | 'events';

const ICONS: Record<Tab, string> = {
  shops: 'M7 8V7a5 5 0 0 1 10 0v1h2.1a1 1 0 0 1 1 .9l1.1 11A2 2 0 0 1 19.2 23H4.8a2 2 0 0 1-2-2.1l1.1-11a1 1 0 0 1 1-.9H7zm2 0h6V7a3 3 0 0 0-6 0v1z',
  vote: 'M12 21.4l-1.5-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.5 11.5L12 21.4z',
  home: 'M10.1 3.4a3 3 0 0 1 3.8 0l6.9 5.7c.5.4.7 1 .7 1.6V19a3 3 0 0 1-3 3h-3.2v-5.5a1.5 1.5 0 0 0-1.5-1.5h-3.6a1.5 1.5 0 0 0-1.5 1.5V22H5.5a3 3 0 0 1-3-3v-8.3c0-.6.3-1.2.7-1.6l6.9-5.7z',
  events: 'M2.5 7.5l5 4L12 4l4.5 7.5 5-4-1.8 11.3a1.5 1.5 0 0 1-1.5 1.2H5.8a1.5 1.5 0 0 1-1.5-1.2L2.5 7.5z',
};

/** Top and bottom colour of each tab's icon. */
const COLOURS: Record<Tab, [string, string]> = {
  shops: ['#ffb3d9', '#e2569b'],
  vote: ['#ff9a9a', '#ee3f6a'],
  home: ['#c9b2ff', '#7a52e0'],
  events: ['#ffe27a', '#f0a312'],
};

/** Glossy highlight on each icon; the crown also gets gems. */
const DECOR: Record<Tab, ComponentChildren> = {
  shops: <ellipse class="nav-gloss" cx="8" cy="12.5" rx="2.2" ry="1.2" />,
  vote: <ellipse class="nav-gloss" cx="7" cy="7.5" rx="2.4" ry="1.4" transform="rotate(-30 7 7.5)" />,
  home: <ellipse class="nav-gloss" cx="7.5" cy="9.5" rx="2.2" ry="1.1" transform="rotate(-35 7.5 9.5)" />,
  events: <>
    <circle cx="12" cy="15" r="1.6" fill="#ee3f6a" />
    <circle cx="7.5" cy="16" r="1.1" fill="#4fb8f0" />
    <circle cx="16.5" cy="16" r="1.1" fill="#4fb8f0" />
  </>,
};

function NavDefs() {
  return (
    <svg class="nav-defs" width="0" height="0" aria-hidden="true">
      <defs>
        {(Object.keys(COLOURS) as Tab[]).map((t) => (
          <linearGradient id={`nav-g-${t}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color={COLOURS[t][0]} />
            <stop offset="1" stop-color={COLOURS[t][1]} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

const LABELS: Record<Tab, string> = {
  shops: 'Магазины', vote: 'Голосование', home: 'Главная', events: 'Ивенты',
};

/** The bottom menu: four icon tabs. The wardrobe opens from the home screen. */
export function NavBar({ active, go, badges, locked = [], pulse }: {
  active: Tab; go: (t: Tab) => void; badges: Partial<Record<Tab, ComponentChildren>>; locked?: Tab[];
  /** Tutorial: the tab to tap next bounces. */
  pulse?: Tab;
}) {
  // a tab that just unlocked: its lock springs open and flies off, the tab glows for a while
  const was = useRef(locked);
  const [opened, setOpened] = useState<Tab[]>([]);
  const key = locked.join();
  useEffect(() => {
    const fresh = was.current.filter((t) => !locked.includes(t));
    was.current = locked;
    if (!fresh.length) return;
    setOpened(fresh);
    const t = setTimeout(() => setOpened([]), 4000);
    return () => clearTimeout(t);
  }, [key]);
  const item = (t: Tab, icon: ComponentChildren) => (
    <button
      class={'nav-item' + (active === t ? ' active' : '') + (locked.includes(t) ? ' locked' : '') + (pulse === t ? ' coach-pulse' : '')
        + (opened.includes(t) ? ' just-opened' : '')}
      data-tab={t} onClick={() => go(t)} aria-label={LABELS[t]}
    >
      <span class="nav-icon">
        {icon}
        {opened.includes(t) && <span class="nav-lock breaking" aria-hidden="true">🔓</span>}
        {locked.includes(t) ? <span class="nav-lock">🔒</span>
          : badges[t] !== undefined && badges[t] !== false && <span class="nav-badge">{badges[t]}</span>}
      </span>
      <span class="nav-label">{LABELS[t]}</span>
    </button>
  );
  // "candy" icons: each tab its own colour gradient with a glossy highlight (gradients in NavDefs)
  const svg = (t: Tab) => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[t]} fill={`url(#nav-g-${t})`} />
      {DECOR[t]}
    </svg>
  );
  return (
    <nav class="navbar">
      <NavDefs />
      {item('shops', svg('shops'))}
      {item('vote', svg('vote'))}
      {item('home', svg('home'))}
      {item('events', svg('events'))}
    </nav>
  );
}
