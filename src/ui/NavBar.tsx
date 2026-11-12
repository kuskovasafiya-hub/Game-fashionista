import type { ComponentChildren } from 'preact';

export type Tab = 'shops' | 'vote' | 'home' | 'events';

const ICONS: Record<Tab, string> = {
  shops: 'M7 8V7a5 5 0 0 1 10 0v1h2.1a1 1 0 0 1 1 .9l1.1 11A2 2 0 0 1 19.2 23H4.8a2 2 0 0 1-2-2.1l1.1-11a1 1 0 0 1 1-.9H7zm2 0h6V7a3 3 0 0 0-6 0v1z',
  vote: 'M12 21.4l-1.5-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.5 11.5L12 21.4z',
  home: 'M10.1 3.4a3 3 0 0 1 3.8 0l6.9 5.7c.5.4.7 1 .7 1.6V19a3 3 0 0 1-3 3h-3.2v-5.5a1.5 1.5 0 0 0-1.5-1.5h-3.6a1.5 1.5 0 0 0-1.5 1.5V22H5.5a3 3 0 0 1-3-3v-8.3c0-.6.3-1.2.7-1.6l6.9-5.7z',
  events: 'M2.5 7.5l5 4L12 4l4.5 7.5 5-4-1.8 11.3a1.5 1.5 0 0 1-1.5 1.2H5.8a1.5 1.5 0 0 1-1.5-1.2L2.5 7.5z',
};

const LABELS: Record<Tab, string> = {
  shops: 'Магазины', vote: 'Голосование', home: 'Главная', events: 'Ивенты',
};

/** The bottom menu: four icon tabs. The wardrobe opens from the home screen. */
export function NavBar({ active, go, badges, locked = [] }: {
  active: Tab; go: (t: Tab) => void; badges: Partial<Record<Tab, ComponentChildren>>; locked?: Tab[];
}) {
  const item = (t: Tab, icon: ComponentChildren) => (
    <button
      class={'nav-item' + (active === t ? ' active' : '') + (locked.includes(t) ? ' locked' : '')}
      onClick={() => go(t)} aria-label={LABELS[t]}
    >
      <span class="nav-icon">
        {icon}
        {locked.includes(t) ? <span class="nav-lock">🔒</span>
          : badges[t] !== undefined && badges[t] !== false && <span class="nav-badge">{badges[t]}</span>}
      </span>
      <span class="nav-label">{LABELS[t]}</span>
    </button>
  );
  const svg = (t: Tab) => (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[t]} /></svg>
  );
  return (
    <nav class="navbar">
      {item('shops', svg('shops'))}
      {item('vote', svg('vote'))}
      {item('home', svg('home'))}
      {item('events', svg('events'))}
    </nav>
  );
}
