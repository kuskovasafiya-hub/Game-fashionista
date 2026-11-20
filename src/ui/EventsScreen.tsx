import { sfx } from '../game/sound';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW, ItemThumb, artUrl } from '../art/Doll';
import { ITEM_BY_ID } from '../game/catalog';
import { RESULT_DELAY_MS, activeEvents, dressCodeMatch, starsText, eventByKey, hasClothes, showcaseLook, type GameEvent } from '../game/events';
import { enterEvent, entryFor, useGame } from '../game/store';
import { Sound, DressCode, Modal, plural } from './common';
import { WardrobeScreen, useSceneBackground } from './WardrobeScreen';

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

/** Five stars, filled fractionally (3,35 → three full stars and a third of the fourth), with the number. */
export function Stars({ n, animate, label }: { n: number; animate?: boolean; label?: boolean }) {
  // each star chimes as it pops in, a little higher than the one before
  useEffect(() => {
    if (!animate) return;
    const ts = [1, 2, 3, 4, 5].filter((k) => n - (k - 1) > 0).map((k) => setTimeout(() => sfx('star', k - 1), (0.25 + k * 0.18) * 1000 + 150));
    return () => ts.forEach(clearTimeout);
  }, [animate]);
  return (
    <span class={'stars' + (animate ? ' animate' : '')} title={starsText(n)}>
      {[1, 2, 3, 4, 5].map((k) => {
        const fill = Math.max(0, Math.min(1, n - (k - 1)));
        return (
          <i class={fill >= 1 ? 'on' : fill > 0 ? 'on part' : ''} style={{ animationDelay: `${0.25 + k * 0.18}s`, '--fill': `${fill * 100}%` }}>★</i>
        );
      })}
      {label && <b class="stars-num">{starsText(n)}</b>}
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
        Подбери образ под дресс-код и отправь его на ивент. Через {Math.round(RESULT_DELAY_MS / 60000)} минут другие модницы проголосуют,
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
  // compact: the scene with the model on the left, the rest on the right, so two cards fit one screen
  return (
    <div class={'ev-card' + (locked ? ' locked' : '')} style={{ '--ec': ev.color }}>
      <div class="ev-pic" style={{ '--bg': eventBg(ev.id) }} onClick={() => { if (!locked) onOpen(); }}>
        <Doll class="feature-model" look={model.look} outfit={model.outfit} view={FIGURE_VIEW} />
        <span class="feature-tile coral sm ev-emoji">{ev.emoji}</span>
        <span class="ev-timer">⏱ {timeLeft(ev.end - now)}</span>
      </div>
      <div class="ev-info">
        <b class="ev-name">{ev.name}</b>
        <small class="muted ev-about">{ev.about}</small>
        <DressCode tags={ev.tags} />
        <div class="ev-meta">
          {prize && (
            <span class="ev-prize" title={`Главный приз: ${prize.name}`}>
              <span class="ev-prize-pic"><ItemThumb item={prize} /></span>
              <small>Главный<br />приз</small>
            </span>
          )}
          <b class="ev-cost">{locked ? <>🔒 ур. {ev.level}</> : entry ? '✓ Участвую' : <>🎟 {ev.cost}</>}</b>
        </div>
        <button class="btn primary" disabled={locked} onClick={onOpen}>
          {locked ? `С ${ev.level} уровня` : entry ? 'Мой образ' : 'Участвовать'}
        </button>
      </div>
    </div>
  );
}

/* ---------- one event: fitting room or the sent look ---------- */

export function EventScreen({ eventKey, onDone, onTickets, toVote, voteHere }: {
  eventKey: string; onDone: () => void; onTickets: () => void; toVote: () => void;
  /** Straight into a voting round of this event. */
  voteHere: () => void;
}) {
  const g = useGame();
  const now = useNow();
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState('');
  const ev = eventByKey(eventKey);
  const entry = entryFor(eventKey);

  if (!ev) return <div class="screen"><p class="muted center">Ивент не найден</p></div>;

  // the sent look is its own screen, like a story scene result (the fitting room is gone)
  if (entry) return <EventSent ev={ev} justSent={sent} onDone={onDone} toVote={toVote} voteHere={voteHere} />;

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
          <p>Дресс-код: <b>{match}%</b>
            {match < 30
              ? <><br /><b class="warn">Почти ничего не подходит — оценка будет низкой</b></>
              : match < 60 && <><br /><small class="muted">Маловато — вещи с иконками дресс-кода поднимут оценку</small></>}
          </p>
          <p class="muted small">Спишется {ev.cost} {ticketWord(ev.cost)}. Один образ на ивент — изменить его потом нельзя.</p>
          <button class="btn primary" onClick={send}>Отправить за 🎟 {ev.cost}</button>
          <button class="btn" onClick={() => setConfirm(false)}>Ещё подумаю</button>
        </Modal>
      )}
    </>
  );
}

/**
 * A look sent to an event, on the event picture: title card with the status, the model in
 * the scene, buttons at the bottom. Shown right after sending and whenever the event is reopened.
 */
function EventSent({ ev, justSent, onDone, toVote, voteHere }: { ev: GameEvent; justSent: boolean; onDone: () => void; toVote: () => void; voteHere: () => void }) {
  const now = useNow();
  useSceneBackground(ev.id);
  const entry = entryFor(ev.key);
  if (!entry) return null;
  const ready = !entry.claimed && entry.resultAt <= now;
  return (
    <div class="screen scene-result">
      <div class="sr-head">
        <p class="muted small">{ev.emoji} {ev.name}</p>
        <h2>{entry.claimed ? 'Итоги ивента' : justSent ? 'Образ отправлен! 📸' : ready ? 'Результат готов!' : 'Образ на голосовании'}</h2>
        <ul class="rewards inline">
          <li>Дресс-код <b>{Math.round(entry.score.match * 100)}%</b></li>
          {entry.claimed ? <li><Stars n={entry.score.stars} label /></li>
            : !ready && <li>⏱ {timeLeft(entry.resultAt - now)}</li>}
        </ul>
        {justSent && <Sound name="send" />}
        {justSent && <p class="muted small">Модницы голосуют. А пока голосуй сама — теперь можно и в этом ивенте!</p>}
      </div>
      <div class="sr-doll"><Doll class="doll" look={entry.look} outfit={entry.outfit} /></div>
      <div class="sr-foot">
        {ready
          ? <button class="btn primary" onClick={toVote}>Узнать результат</button>
          : <button class="btn primary" onClick={voteHere}>Голосовать</button>}
        <button class="btn" onClick={onDone}>К ивентам</button>
      </div>
    </div>
  );
}
