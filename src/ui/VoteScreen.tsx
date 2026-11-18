import { useEffect, useMemo, useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW, ItemThumb, artUrl } from '../art/Doll';
import { ITEM_BY_ID } from '../game/catalog';
import {
  DUP_PRIZE_GEMS, botLook, eventByKey, starTier, starsText, rng, seedOf, votePair, type VotePair,
} from '../game/events';
import {
  MAJORITY_COINS, RUSH_GEMS, TICKET_GEMS, VOTES_PER_TICKET, buyTicket, canVote, castVote, claimEntry,
  entryReward, rushEntry, useGame, type Entry, type LevelUp,
} from '../game/store';
import { voteTargetByKey, voteTargetFor, voteTargets, type VoteTarget } from '../game/vote';
import { Coin, DressCode, Modal, fmt, plural } from './common';
import { flyRewards } from './fx';
import { HEAD_VIEW, Stars, eventBg, timeLeft, useNow } from './EventsScreen';
import { useSceneBackground } from './WardrobeScreen';

const HEART = 'M12 21.4l-1.5-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.5 11.5L12 21.4z';

/* ---------- lobby: the event on vote now, and the player's own looks ---------- */

/**
 * The voting tab. The player votes only in running events she has sent a look to; they
 * take turns on vote. Below: her own looks, how long they stay on vote, then their results.
 */
export function VoteLobby({ vote, toEvents, onLevelUp }: {
  vote: (key: string) => void; toEvents: () => void; onLevelUp: (lu: LevelUp) => void;
}) {
  const g = useGame();
  const now = useNow();
  const [open, setOpen] = useState<string | null>(null);
  const list = voteTargets(g.entries.map((e) => e.key), g.story, now);
  const on = voteTargetFor(list, Math.floor(g.votes / VOTES_PER_TICKET));
  const mine = [...g.entries].sort((a, b) => Number(!!a.claimed) - Number(!!b.claimed) || b.at - a.at);
  const openEntry = open ? g.entries.find((e) => e.key === open) : undefined;

  // a ready result is its own screen on the event picture, like a story scene result
  if (open && openEntry && openEntry.resultAt <= now) {
    return <EventResult entryKey={open} onClose={(lu) => { setOpen(null); if (lu) onLevelUp(lu); }} />;
  }

  return (
    <div class="screen list vote-lobby">
      <h2 class="stories-title">Мои образы</h2>
      <LookStories entries={mine} now={now} onOpen={setOpen} toEvents={toEvents} />

      <section class="panel">
        <h2 class="panel-title">Голосование</h2>
        {on ? (
          <VoteCard ev={on} now={now} onVote={() => vote(on.key)} />
        ) : (
          <div class="vote-empty">
            <p>Сейчас голосовать не за что.</p>
            <p class="muted small">Голосовать можно в сценах истории, которые ты прошла, и в ивентах, куда ты отправила образ.</p>
            <button class="btn primary" onClick={toEvents}>К ивентам</button>
          </div>
        )}
      </section>

      {open && openEntry && <WaitModal entryKey={open} now={now} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** The event on vote, like an event card: votes to the next ticket, the scene with two rivals. */
function VoteCard({ ev, now, onVote }: { ev: VoteTarget; now: number; onVote: () => void }) {
  const g = useGame();
  const done = g.votes % VOTES_PER_TICKET;
  // while her look in this event or scene is on vote, it stands on the card next to a rival
  const mine = g.entries.find((e) => e.key === ev.key && !e.claimed && e.resultAt > now);
  const pair = useMemo(() => {
    const r = rng(seedOf('preview:' + ev.key));
    const a = botLook(ev.tags, r), b = botLook(ev.tags, r);
    return mine ? [{ look: mine.look, outfit: mine.outfit }, b] : [a, b];
  }, [ev.key, !!mine]);
  return (
    <div class="feature" style={{ '--ec': ev.color }}>
      <div class="feature-bar">
        <span class="feature-tile coral heart"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={HEART} /></svg></span>
        <b class="feature-count" title="Голосов до билетика">{done}/{VOTES_PER_TICKET}</b>
        <span class="feature-tile gift ticket" title={`Каждые ${VOTES_PER_TICKET} голосов — билетик`}>🎟</span>
        <span class="feature-timer">{ev.end ? `⏱ ${timeLeft(ev.end - now)}` : '📖 История'}</span>
      </div>
      <div class="feature-img vote-preview" style={{ '--bg': eventBg(ev.id) }} onClick={onVote}>
        {pair.map((b) => <Doll class="feature-model" look={b.look} outfit={b.outfit} view={FIGURE_VIEW} />)}
      </div>
      <div class="feature-body">
        <b class="feature-name">{ev.emoji} {ev.name}</b>
        <small class="muted">{ev.about}</small>
        <DressCode tags={ev.tags} label />
        <button class="btn primary" onClick={onVote}>
          {done ? 'Продолжить раунд' : 'Голосовать'}
        </button>
      </div>
    </div>
  );
}

/**
 * The player's looks as round "stories": the ring fills while a look is on vote, glows when
 * the result is ready, and turns grey once seen. The first circle sends her to the events.
 */
function LookStories({ entries, now, onOpen, toEvents }: {
  entries: Entry[]; now: number; onOpen: (key: string) => void; toEvents: () => void;
}) {
  return (
    <div class="stories">
      <button class="story add" onClick={toEvents}>
        <span class="story-ring"><span class="story-face plus">+</span></span>
        <span class="story-status">Новый</span>
        <span class="story-name">образ</span>
      </button>
      {entries.map((e) => {
        const ev = voteTargetByKey(e.key);
        if (!ev) return null;
        const ready = !e.claimed && e.resultAt <= now;
        const done = Math.min(1, Math.max(0, (now - e.at) / Math.max(1, e.resultAt - e.at)));
        return (
          <button
            class={'story ' + (e.claimed ? 'seen' : ready ? 'ready' : 'wait')}
            style={{ '--p': `${done * 100}%` }} onClick={() => onOpen(e.key)}
          >
            <span class="story-ring">
              <span class="story-face"><Doll look={e.look} outfit={e.outfit} view={HEAD_VIEW} /></span>
              <span class="story-emoji">{ev.emoji}</span>
            </span>
            <span class="story-status">
              {e.claimed ? <span class="story-stars">★ {starsText(e.score.stars)}</span> : ready ? 'Итоги!' : timeLeft(e.resultAt - now)}
            </span>
            <span class="story-name">{ev.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A look still on vote: time left, and the result right now for crystals. */
function WaitModal({ entryKey, now, onClose }: { entryKey: string; now: number; onClose: () => void }) {
  const g = useGame();
  const e = g.entries.find((x) => x.key === entryKey);
  const ev = voteTargetByKey(entryKey);
  if (!e || !ev) return null;
  const done = Math.min(1, Math.max(0, (now - e.at) / Math.max(1, e.resultAt - e.at)));
  return (
    <Modal onClose={onClose}>
      <p class="muted">{ev.emoji} {ev.name}</p>
      <h2>Образ в голосовании</h2>
      <div class="confirm-doll"><Doll class="doll" look={e.look} outfit={e.outfit} /></div>
      <p>Результат через <b>{timeLeft(e.resultAt - now)}</b></p>
      <span class="vote-progress wide"><i style={{ width: `${done * 100}%` }} /></span>
      <button class="btn primary" disabled={g.gems < RUSH_GEMS} onClick={() => rushEntry(e.key)}>
        Узнать сейчас за 💎 {RUSH_GEMS}
      </button>
      <button class="btn" onClick={onClose}>Подождать</button>
    </Modal>
  );
}

/* ---------- result of the player's look ---------- */

/** The result of the player's look: title card, the model in the scene, rewards and the button at the bottom. */
function EventResult({ entryKey, onClose }: { entryKey: string; onClose: (lu: LevelUp | null) => void }) {
  const g = useGame();
  const e = g.entries.find((x) => x.key === entryKey);
  const ev = voteTargetByKey(entryKey);
  // only events have a main prize
  const event = eventByKey(entryKey);
  useSceneBackground(ev?.id);
  const reward = e && entryReward(entryKey, e.score.stars);
  if (!e || !ev || !reward) return null;
  const { score } = e;
  const prize = reward.item ? ITEM_BY_ID[reward.item] : undefined;
  const dup = !!prize && g.owned.includes(prize.id) && !e.claimed;
  const claim = () => {
    if (!e.claimed) flyRewards();
    onClose(e.claimed ? null : claimEntry(entryKey)?.levelUp ?? null);
  };
  const verdict = ['', '', 'Неплохо!', 'Хорошо!', 'Отлично!', 'Звезда вечера!'][starTier(score.stars)];

  return (
    <div class="screen scene-result">
      <div class="sr-head">
        <p class="muted small">{ev.emoji} {ev.name}</p>
        <div class="sr-title">
          <h2>{verdict}</h2>
          <Stars n={score.stars} animate={!e.claimed} label />
        </div>
        <ul class="rewards inline">
          <li>Дресс-код <b>{Math.round(score.match * 100)}%</b></li>
          <li>❤️ <b>{score.votes}/{score.voters}</b></li>
          <li>Место <b>{score.place}</b></li>
        </ul>
      </div>
      <div class="sr-doll"><Doll class="doll" look={e.look} outfit={e.outfit} /></div>
      <div class="sr-foot">
        {e.claimed && <p class="muted small">Награда получена:</p>}
        <ul class="rewards inline">
          {reward.coins > 0 && <li data-reward="coins"><Coin /> +{fmt(reward.coins)}</li>}
          {reward.energy > 0 && <li data-reward="energy">☕ +{reward.energy}</li>}
          {reward.tickets > 0 && <li data-reward="tickets">🎟 +{reward.tickets}</li>}
          {reward.gems > 0 && <li data-reward="gems">💎 +{reward.gems}</li>}
          <li data-reward="xp">⭐ +{reward.xp}</li>
        </ul>
        {prize && (
          <div class="prize">
            <ItemThumb item={prize} />
            <span>Главный приз: <b>{prize.name}</b>{dup && <><br /><small>уже есть — вместо неё 💎 +{DUP_PRIZE_GEMS[prize.rarity]}</small></>}</span>
          </div>
        )}
        {score.stars < 5 && !prize && event && <p class="muted small">За 5 звёзд — главный приз: {ITEM_BY_ID[event.prize]?.name}</p>}
        <button class="btn primary" onClick={claim}>{e.claimed ? 'Закрыть' : 'Забрать'}</button>
      </div>
    </div>
  );
}

/* ---------- voting in one event ---------- */

/**
 * A round of VOTES_PER_TICKET votes in one event; the round ends with a ticket and a summary.
 * A round left halfway keeps its votes and goes on next time.
 */
export function VoteScreen({ targetKey, onLevelUp, onDone, onNext }: {
  targetKey: string; onLevelUp: (lu: LevelUp) => void; onDone: () => void; onNext: (key: string) => void;
}) {
  const g = useGame();
  const ev = voteTargetByKey(targetKey)!;
  const [pair, setPair] = useState<VotePair<VoteTarget>>(() => votePair([ev]));
  // the next pair is rendered hidden so its layers are already loaded when it shows up
  const [upcoming, setUpcoming] = useState<VotePair<VoteTarget>>(() => votePair([ev]));
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const [gotTicket, setGotTicket] = useState(false);
  const [finished, setFinished] = useState(false);
  // this sitting's votes, for the round summary
  const [stats, setStats] = useState({ votes: 0, majority: 0 });
  const done = g.votes % VOTES_PER_TICKET;
  // the vote on screen: the one just cast while its result shows, else the next one
  const shownVote = picked ? (gotTicket ? VOTES_PER_TICKET : done) : done + 1;

  const choose = (side: 'a' | 'b') => {
    if (picked) return;
    const share = side === 'a' ? pair.shareA : 100 - pair.shareA;
    const r = castVote(share >= 50);
    setPicked(side);
    setGotTicket(r.ticket);
    setStats((st) => ({ votes: st.votes + 1, majority: st.majority + (r.majority ? 1 : 0) }));
    if (r.levelUp) onLevelUp(r.levelUp);
  };
  const next = () => { setPair(upcoming); setUpcoming(votePair([ev])); setPicked(null); setGotTicket(false); };
  // the next round goes to the next event or story scene in turn, or this one again if it is the only one
  const nextEvent = voteTargetFor(voteTargets(g.entries.map((e) => e.key), g.story), Math.floor(g.votes / VOTES_PER_TICKET)) ?? ev;
  const again = () => {
    if (nextEvent.key !== ev.key) return onNext(nextEvent.key);
    setFinished(false); setStats({ votes: 0, majority: 0 }); next();
  };

  useEffect(() => {
    if (!picked) return;
    const t = setTimeout(gotTicket ? () => setFinished(true) : next, gotTicket ? 1300 : 1500);
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
    <div class="screen vote" style={{ '--ec': ev.color }}>
      <div class="vote-theme">
        <b>{ev.emoji} {ev.name}</b>
        <DressCode tags={ev.tags} label />
      </div>
      <p class="center muted small">Чей образ лучше подходит?</p>
      <div class="vote-pair" style={{ '--bg': eventBg(ev.id) }}>{side('a')}{side('b')}</div>
      <div class="vote-foot">
        {picked
          ? <p class="center vote-verdict">
              {mine >= 50 ? <>Ты с большинством! <Coin /> +{MAJORITY_COINS}</> : <>Смелый выбор!</>}
            </p>
          : <p class="center muted small">Голос <b>{shownVote}</b> из {VOTES_PER_TICKET} — в конце раунда 🎟</p>}
        <span class="vote-progress wide">
          <i style={{ width: `${((picked ? shownVote : done) / VOTES_PER_TICKET) * 100}%` }} />
        </span>
      </div>
      {finished && (
        <Modal>
          <div class="burst">🎉</div>
          <h2>Раунд завершён!</h2>
          <p class="muted">
            С большинством: <b>{stats.majority}</b> из {stats.votes}{' '}
            {plural(stats.votes, 'голоса', 'голосов', 'голосов')}
          </p>
          <ul class="rewards inline">
            <li>🎟 +1</li>
            {stats.majority > 0 && <li><Coin /> +{stats.majority * MAJORITY_COINS}</li>}
            <li>⭐ +5 опыта</li>
          </ul>
          <p class="muted small">Следующий раунд: <b>{nextEvent.emoji} {nextEvent.name}</b></p>
          <button class="btn primary" onClick={again}>Голосовать дальше</button>
          <button class="btn" onClick={onDone}>Вернуться</button>
        </Modal>
      )}
      <div class="preload" aria-hidden="true">
        {[upcoming.a, upcoming.b].map((b) => <Doll look={b.look} outfit={b.outfit} />)}
        <img src={artUrl('bg-' + ev.id)} alt="" />
      </div>
    </div>
  );
}

/* ---------- locked tab and tickets ---------- */

export function VoteLockedModal({ onClose, toStory }: { onClose: () => void; toStory: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div class="burst">🔒</div>
      <h2>Голосование закрыто</h2>
      <p class="muted">Пройди сцену истории или отправь образ на ивент — и сможешь голосовать за образы других модниц в них.</p>
      <button class="btn primary" onClick={() => { onClose(); toStory(); }}>Играть историю</button>
      <button class="btn" onClick={onClose}>Позже</button>
    </Modal>
  );
}

export function TicketModal({ onClose, onVote }: { onClose: () => void; onVote: () => void }) {
  const g = useGame();
  const toTicket = VOTES_PER_TICKET - (g.votes % VOTES_PER_TICKET);
  return (
    <Modal onClose={onClose}>
      <h2>🎟 Билетики</h2>
      <p class="big">{g.tickets}</p>
      <p class="muted">Нужны, чтобы отправлять образы на ивенты</p>
      {canVote(g)
        ? <button class="btn teal" onClick={() => { onClose(); onVote(); }}>
            Голосовать <small>ещё {toTicket} до билетика</small>
          </button>
        : <p class="muted small">Голосование за билетики откроется после первой сцены истории или ивента</p>}
      <button class="btn primary" disabled={g.gems < TICKET_GEMS} onClick={() => buyTicket()}>
        Купить 1 🎟 за {TICKET_GEMS} 💎
      </button>
      <p class="muted small">Билетики также дают ивенты на 3–5 звёзд</p>
      <button class="btn" onClick={onClose}>Закрыть</button>
    </Modal>
  );
}
