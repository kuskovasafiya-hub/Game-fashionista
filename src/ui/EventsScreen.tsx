import { useEffect, useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW, ItemThumb, artUrl } from '../art/Doll';
import { ITEM_BY_ID } from '../game/catalog';
import {
  activeEvents, dressCodeMatch, eventByKey, hasClothes, rewardFor, votePair,
  type VotePair,
} from '../game/events';
import {
  MAJORITY_COINS, RUSH_GEMS, TICKET_GEMS, VOTES_PER_TICKET, buyTicket, castVote, claimEntry, enterEvent,
  entryFor, rushEntry, useGame, type Entry, type LevelUp,
} from '../game/store';
import { DressCode, Modal, fmt, plural } from './common';
import { WardrobeScreen } from './WardrobeScreen';

/** Themed scene behind the dolls; the event colour shows until the picture loads. */
export const eventBg = (id: string) => `url(${artUrl('bg-' + id)})`;

const HEAD_VIEW: [number, number, number, number] = [352, 40, 320, 360];

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

export function EventsScreen({ open, vote, onLevelUp }: {
  open: (key: string) => void; vote: () => void; onLevelUp: (lu: LevelUp) => void;
}) {
  const g = useGame();
  const now = useNow();
  const [result, setResult] = useState<string | null>(null);
  // ones the player can enter go first
  const events = activeEvents(now).sort((a, b) => Number(g.level < a.level) - Number(g.level < b.level));
  const mine = [...g.entries].sort((a, b) => Number(!!a.claimed) - Number(!!b.claimed) || a.resultAt - b.resultAt);
  const toTicket = VOTES_PER_TICKET - (g.votes % VOTES_PER_TICKET);

  return (
    <div class="screen list events">
      <h1 class="title">Ивенты</h1>

      <button class="vote-banner" onClick={vote}>
        <span class="vote-icon">🗳️</span>
        <span class="shop-info">
          <b>Голосование</b>
          <small>Выбирай лучший образ — за каждые {VOTES_PER_TICKET} голосов 🎟</small>
        </span>
        <span class="vote-progress">
          <i style={{ width: `${((VOTES_PER_TICKET - toTicket) / VOTES_PER_TICKET) * 100}%` }} />
          <em>{VOTES_PER_TICKET - toTicket}/{VOTES_PER_TICKET}</em>
        </span>
      </button>

      {mine.length > 0 && <h3 class="section">Мои образы</h3>}
      {mine.map((e) => <EntryRow e={e} now={now} onResult={() => setResult(e.key)} />)}

      <h3 class="section">Сейчас идут</h3>
      {events.map((ev) => {
        const entry = g.entries.find((e) => e.key === ev.key);
        const locked = g.level < ev.level;
        return (
          <button
            class={'event-row' + (locked ? ' locked' : '') + (entry ? ' entered' : '')}
            style={{ '--ec': ev.color }} disabled={locked} onClick={() => open(ev.key)}
          >
            <span class="event-icon" style={{ '--bg': eventBg(ev.id) }}><i>{ev.emoji}</i></span>
            <span class="shop-info">
              <b>{ev.name}</b>
              <small>{ev.about}</small>
              <DressCode tags={ev.tags} label />
            </span>
            <span class="event-meta">
              {locked ? <span>🔒 ур. {ev.level}</span> : entry ? <span class="ok">✓ Участвую</span> : <span class="cost">🎟 {ev.cost}</span>}
              <small>⏳ {timeLeft(ev.end - now)}</small>
            </span>
          </button>
        );
      })}
      <p class="muted small center">Подбери образ под дресс-код и отправь его на ивент. Через 30 минут другие модницы проголосуют, и ты получишь от 1 до 5 звёзд.</p>
      {result && <ResultModal entryKey={result} onClose={(lu) => { setResult(null); if (lu) onLevelUp(lu); }} />}
    </div>
  );
}

function EntryRow({ e, now, onResult }: { e: Entry; now: number; onResult: () => void }) {
  const g = useGame();
  const ev = eventByKey(e.key);
  if (!ev) return null;
  const ready = e.resultAt <= now;
  return (
    <div class={'entry-row' + (ready && !e.claimed ? ' ready' : '')} style={{ '--ec': ev.color }}>
      <Doll class="entry-head" look={e.look} outfit={e.outfit} view={HEAD_VIEW} />
      <span class="shop-info">
        <b>{ev.emoji} {ev.name}</b>
        {e.claimed ? <Stars n={e.score.stars} />
          : ready ? <small>Результат готов!</small>
          : <small>Голосование: ещё {timeLeft(e.resultAt - now)}</small>}
      </span>
      {!e.claimed && (ready
        ? <button class="btn primary mini pulse" onClick={onResult}>Узнать</button>
        : <button class="btn mini" disabled={g.gems < RUSH_GEMS} onClick={() => { if (rushEntry(e.key)) onResult(); }}>
            Сейчас 💎{RUSH_GEMS}
          </button>)}
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
            : <b>Результат готов — загляни в «Мои образы»</b>}
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
          <p class="muted">Модницы голосуют. Результат будет через 30 минут — загляни в «Мои образы».</p>
          <button class="btn primary" onClick={onDone}>К ивентам</button>
        </Modal>
      )}
    </>
  );
}

/* ---------- result ---------- */

function ResultModal({ entryKey, onClose }: { entryKey: string; onClose: (lu: LevelUp | null) => void }) {
  const g = useGame();
  const e = g.entries.find((x) => x.key === entryKey);
  const ev = eventByKey(entryKey);
  if (!e || !ev) return null;
  const { score } = e;
  const reward = rewardFor(ev, score.stars);
  const prize = reward.item ? ITEM_BY_ID[reward.item] : undefined;
  const dup = !!prize && g.owned.includes(prize.id);
  const claim = () => onClose(claimEntry(entryKey)?.levelUp ?? null);
  const verdict = ['', 'Не в тему', 'Неплохо', 'Хорошо!', 'Отлично!', 'Звезда вечера!'][score.stars];

  return (
    <Modal>
      <p class="muted">{ev.emoji} {ev.name}</p>
      <h2>{verdict}</h2>
      <Stars n={score.stars} animate />
      <div class="result-body">
        <div class="result-doll"><Doll class="doll" look={e.look} outfit={e.outfit} /></div>
        <ul class="result-stats">
          <li><small>Дресс-код</small><b>{Math.round(score.match * 100)}%</b></li>
          <li><small>Голоса</small><b>{score.votes} из {score.voters}</b></li>
          <li><small>Место</small><b>{score.place} из {score.players}</b></li>
        </ul>
      </div>
      <ul class="rewards inline">
        {reward.coins > 0 && <li>🪙 +{fmt(reward.coins)}</li>}
        {reward.energy > 0 && <li>☕ +{reward.energy}</li>}
        {reward.tickets > 0 && <li>🎟 +{reward.tickets}</li>}
        {reward.gems > 0 && <li>💎 +{reward.gems}</li>}
        <li>⭐ +{reward.xp} опыта</li>
      </ul>
      {prize && (
        <div class="prize">
          <ItemThumb item={prize} />
          <span>Главный приз: <b>{prize.name}</b>{dup && <><br /><small>уже есть — вместо неё 🪙 +{fmt(prize.price)}</small></>}</span>
        </div>
      )}
      {score.stars < 5 && !prize && (
        <p class="muted small">За 5 звёзд — главный приз: {ITEM_BY_ID[ev.prize]?.name}</p>
      )}
      <button class="btn primary" onClick={claim}>Забрать</button>
    </Modal>
  );
}

/* ---------- voting ---------- */

export function VoteScreen({ onLevelUp }: { onLevelUp: (lu: LevelUp) => void }) {
  const g = useGame();
  const [pair, setPair] = useState<VotePair>(() => votePair(activeEvents()));
  // the next pair is rendered hidden so its layers are already loaded when it shows up
  const [upcoming, setUpcoming] = useState<VotePair>(() => votePair(activeEvents()));
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const [gotTicket, setGotTicket] = useState(false);
  const toTicket = VOTES_PER_TICKET - (g.votes % VOTES_PER_TICKET);

  const choose = (side: 'a' | 'b') => {
    if (picked) return;
    const share = side === 'a' ? pair.shareA : 100 - pair.shareA;
    const r = castVote(share >= 50);
    setPicked(side);
    setGotTicket(r.ticket);
    if (r.levelUp) onLevelUp(r.levelUp);
  };
  const next = () => { setPair(upcoming); setUpcoming(votePair(activeEvents())); setPicked(null); setGotTicket(false); };

  useEffect(() => {
    if (!picked) return;
    const t = setTimeout(next, gotTicket ? 2200 : 1500);
    return () => clearTimeout(t);
  }, [picked]);

  const mine = picked === 'a' ? pair.shareA : 100 - pair.shareA;
  const side = (s: 'a' | 'b') => {
    const bot = pair[s];
    const share = s === 'a' ? pair.shareA : 100 - pair.shareA;
    return (
      <button class={'vote-side' + (picked === s ? ' picked' : '') + (picked ? ' shown' : '')} onClick={() => choose(s)}>
        <span class="vote-figure">
          <Doll class="doll" look={bot.look} outfit={bot.outfit} view={FIGURE_VIEW} />
          {picked && <span class={'vote-share' + (share >= 50 ? ' win' : '')}>{share}%</span>}
        </span>
        <span class="vote-name">{bot.name}</span>
      </button>
    );
  };

  return (
    <div class="screen vote" style={{ '--ec': pair.event.color }}>
      <div class="vote-theme">
        <b>{pair.event.emoji} {pair.event.name}</b>
        <DressCode tags={pair.event.tags} label />
      </div>
      <p class="center muted small">Чей образ лучше подходит?</p>
      <div class="vote-pair" style={{ '--bg': eventBg(pair.event.id) }}>{side('a')}{side('b')}</div>
      <div class="vote-foot">
        {picked
          ? <p class="center vote-verdict">
              {gotTicket ? <>🎟 +1 билетик!</> : mine >= 50 ? <>Ты с большинством! 🪙 +{MAJORITY_COINS}</> : <>Смелый выбор!</>}
            </p>
          : <p class="center muted small">До билетика: {toTicket} {plural(toTicket, 'голос', 'голоса', 'голосов')}</p>}
        <span class="vote-progress wide">
          <i style={{ width: `${((VOTES_PER_TICKET - toTicket) / VOTES_PER_TICKET) * 100}%` }} />
        </span>
      </div>
      <div class="preload" aria-hidden="true">
        {[upcoming.a, upcoming.b].map((b) => <Doll look={b.look} outfit={b.outfit} />)}
        <img src={artUrl('bg-' + upcoming.event.id)} alt="" />
      </div>
    </div>
  );
}

/* ---------- tickets ---------- */

export function TicketModal({ onClose, onVote }: { onClose: () => void; onVote: () => void }) {
  const g = useGame();
  const toTicket = VOTES_PER_TICKET - (g.votes % VOTES_PER_TICKET);
  return (
    <Modal onClose={onClose}>
      <h2>🎟 Билетики</h2>
      <p class="big">{g.tickets}</p>
      <p class="muted">Нужны, чтобы отправлять образы на ивенты</p>
      <button class="btn violet" onClick={() => { onClose(); onVote(); }}>
        🗳️ Голосовать <small>ещё {toTicket} до билетика</small>
      </button>
      <button class="btn primary" disabled={g.gems < TICKET_GEMS} onClick={() => buyTicket()}>
        Купить 1 🎟 за {TICKET_GEMS} 💎
      </button>
      <p class="muted small">Билетики также дают ивенты на 3–5 звёзд</p>
      <button class="btn" onClick={onClose}>Закрыть</button>
    </Modal>
  );
}

