import { useEffect, useMemo, useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW, ItemThumb, artUrl } from '../art/Doll';
import { ITEM_BY_ID } from '../game/catalog';
import { activeEvents, dressCodeMatch, eventByKey, hasClothes, showcaseLook, type GameEvent } from '../game/events';
import { enterEvent, entryFor, useGame } from '../game/store';
import { DressCode, Modal, plural } from './common';
import { WardrobeScreen } from './WardrobeScreen';

/** Themed scene behind the dolls; the event colour shows until the picture loads. */
export const eventBg = (id: string) => `url(${artUrl('bg-' + id)})`;

export const HEAD_VIEW: [number, number, number, number] = [352, 40, 320, 360];

/** Re-render every second; returns the current time. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** "5 ч 12 мин", "12 мин", or "4:05" under ten minutes. */
export function timeLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const m = Math.ceil(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h} ч ${m % 60} мин` : `${m} мин`;
}

export function Stars({ n, animate }: { n: number; animate?: boolean }) {
  return (
    <span class={'stars' + (animate ? ' animate' : '')}>
      {[1, 2, 3, 4, 5].map((k) => <i class={k <= n ? 'on' : ''} style={{ animationDelay: `${0.25 + k * 0.18}s` }}>★</i>)}
    </span>
  );
}

const ticketWord = (n: number) => plural(n, 'билетик', 'билетика', 'билетиков');

/* ---------- list ---------- */

export function EventsScreen({ open }: { open: (key: string) => void }) {
  const g = useGame();
  const now = useNow();
  // ones the player can enter go first
  const events = activeEvents(now).sort((a, b) => Number(g.level < a.level) - Number(g.level < b.level));

  return (
    <div class="screen list events">
      <h1 class="title">Ивенты</h1>
      <div class="event-cards">
        {events.map((ev) => <EventCard ev={ev} now={now} onOpen={() => open(ev.key)} />)}
      </div>
      <p class="muted small center">
        Подбери образ под дресс-код и отправь его на ивент. Через 30 минут другие модницы проголосуют,
        и ты получишь от 1 до 5 звёзд. Результат — во вкладке «Голосование».
      </p>
    </div>
  );
}

/**
 * An event as a big card: the event's scene with a model dressed to its code, the entry fee,
 * the main prize, time left and a button to enter.
 */
export function EventCard({ ev, now, onOpen }: { ev: GameEvent; now: number; onOpen: () => void }) {
  const g = useGame();
  const prize = ITEM_BY_ID[ev.prize];
  const entry = g.entries.find((e) => e.key === ev.key);
  const locked = g.level < ev.level;
  const model = useMemo(() => showcaseLook(ev), [ev.key]);
  return (
    <div class={'feature' + (locked ? ' locked' : '')} style={{ '--ec': ev.color }}>
      <div class="feature-bar">
        <span class="feature-tile coral">{ev.emoji}</span>
        <b class="feature-count">
          {locked ? <>🔒 ур. {ev.level}</> : entry ? '✓ Участвую' : <>🎟 {ev.cost}</>}
        </b>
        <span class="feature-tile gift" title={prize ? `Главный приз: ${prize.name}` : undefined}>
          {prize && <ItemThumb item={prize} />}
        </span>
        <span class="feature-timer">⏱ {timeLeft(ev.end - now)}</span>
      </div>
      <div class="feature-img" style={{ '--bg': eventBg(ev.id) }} onClick={() => { if (!locked) onOpen(); }}>
        <Doll class="feature-model" look={model.look} outfit={model.outfit} view={FIGURE_VIEW} />
      </div>
      <div class="feature-body">
        <b class="feature-name">{ev.name}</b>
        <small class="muted">{ev.about}</small>
        <DressCode tags={ev.tags} label />
        <button class="btn primary" disabled={locked} onClick={onOpen}>
          {locked ? `Откроется на ${ev.level} уровне` : entry ? 'Мой образ' : 'Участвовать'}
        </button>
      </div>
    </div>
  );
}

/* ---------- one event: fitting room or the sent look ---------- */

export function EventScreen({ eventKey, onDone, onTickets }: { eventKey: string; onDone: () => void; onTickets: () => void }) {
  const g = useGame();
  const now = useNow();
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState('');
  const ev = eventByKey(eventKey);
  const entry = entryFor(eventKey);

  if (!ev) return <div class="screen"><p class="muted center">Ивент не найден</p></div>;

  if (entry && !sent) {
    return (
      <div class="screen sent" style={{ '--ec': ev.color }}>
        <h1 class="title center">{ev.emoji} {ev.name}</h1>
        <DressCode tags={ev.tags} label />
        <div class="stage small scene" style={{ '--bg': eventBg(ev.id) }}><Doll class="doll" look={entry.look} outfit={entry.outfit} /></div>
        <p class="center">
          {entry.claimed ? <Stars n={entry.score.stars} />
            : entry.resultAt > now ? <>Образ отправлен. Результат через <b>{timeLeft(entry.resultAt - now)}</b></>
            : <b>Результат готов — загляни во вкладку «Голосование»</b>}
        </p>
      </div>
    );
  }

  const closed = ev.end <= now;
  const submit = () => {
    if (closed) return;
    if (!hasClothes(g.outfit)) return flash('Надень платье или верх с низом');
    if (g.tickets < ev.cost) return onTickets();
    setConfirm(true);
  };
  const flash = (msg: string) => { setHint(msg); setTimeout(() => setHint((h) => (h === msg ? '' : h)), 2000); };
  const send = () => {
    const err = enterEvent(ev.key);
    setConfirm(false);
    if (!err) setSent(true);
    else if (err === 'tickets') onTickets();
    else flash(err === 'closed' ? 'Ивент уже закончился' : err === 'clothes' ? 'Надень платье или верх с низом' : 'Не получилось');
  };
  const match = Math.round(dressCodeMatch(g.outfit, ev.tags).total * 100);

  return (
    <>
      <WardrobeScreen
        event={ev}
        footer={
          <div class="fit-footer">
            {hint && <div class="toast">{hint}</div>}
            <button class="btn primary" disabled={closed} onClick={submit}>
              {closed ? 'Ивент закончился' : <>Отправить образ <span class="cost">🎟 {ev.cost}</span></>}
            </button>
          </div>
        }
      />
      {confirm && (
        <Modal onClose={() => setConfirm(false)}>
          <h2>Отправить образ?</h2>
          <div class="confirm-doll"><Doll class="doll" look={g.look} outfit={g.outfit} /></div>
          <p>Дресс-код: <b>{match}%</b>{match < 60 && <><br /><small class="muted">Маловато — вещи с ✓ поднимут оценку</small></>}</p>
          <p class="muted small">Спишется {ev.cost} {ticketWord(ev.cost)}. Один образ на ивент — изменить его потом нельзя.</p>
          <button class="btn primary" onClick={send}>Отправить за 🎟 {ev.cost}</button>
          <button class="btn" onClick={() => setConfirm(false)}>Ещё подумаю</button>
        </Modal>
      )}
      {sent && (
        <Modal onClose={onDone}>
          <div class="burst">📸</div>
          <h2>Образ отправлен!</h2>
          <p class="muted">Модницы голосуют. Результат будет через 30 минут во вкладке «Голосование». А пока голосуй сама — теперь это можно и в этом ивенте!</p>
          <button class="btn primary" onClick={onDone}>К ивентам</button>
        </Modal>
      )}
    </>
  );
}
