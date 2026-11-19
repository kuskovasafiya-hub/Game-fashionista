import { Doll, FIGURE_VIEW } from '../art/Doll';
import { activeEvents } from '../game/events';
import { voteTargetByKey } from '../game/vote';
import { StoryCard } from './StoryScreen';
import { useState } from 'preact/hooks';
import { eventsOpen as eventsOpenFor, useGame, xpToNext, type LevelUp } from '../game/store';
import { DailyButton, DailyModal } from './DailyTasks';
import { AudioButton, AudioModal } from './common';
import { HEAD_VIEW, timeLeft, useNow } from './EventsScreen';

/**
 * Home, on one screen without scrolling: the player's model (it takes whatever height is left),
 * the next story scene in one row, and — once events are open — the current event and her sent looks side by side
 * (her looks show up already after her first story scene).
 */
export function HomeScreen({ pulse, toWardrobe, toEvents, toVote, openEvent, play, toStory, onLevelUp }: {
  /** Tutorial: what to tap next pulses. */
  pulse?: 'wardrobe' | 'story';
  toWardrobe: () => void; toEvents: () => void; toVote: () => void; openEvent: (key: string) => void;
  play: (id: string) => void; toStory: () => void; onLevelUp: (lu: LevelUp) => void;
}) {
  const g = useGame();
  const now = useNow();
  const need = xpToNext(g.level);
  const eventsOpen = eventsOpenFor(g);
  const [daily, setDaily] = useState(false);
  const [audio, setAudio] = useState(false);

  return (
    <div class="screen home">
      <section class="panel me">
        <AudioButton onClick={() => setAudio(true)} />
        <button class="me-doll" onClick={toWardrobe} aria-label="Гардероб">
          <Doll class="doll" look={g.look} outfit={g.outfit} view={FIGURE_VIEW} />
        </button>
        <div class="me-info">
          <h2 class="me-name">{g.name}</h2>
          <span class="me-level">Уровень {g.level}</span>
          <span class="xpbar"><i style={{ width: `${(g.xp / need) * 100}%` }} /></span>
          <small class="muted">{g.xp} / {need} опыта</small>
          <button class={'btn teal' + (pulse === 'wardrobe' ? ' coach-pulse' : '')} data-coach="wardrobe" onClick={toWardrobe}>
            Гардероб
          </button>
          <DailyButton onOpen={() => setDaily(true)} />
        </div>
      </section>

      <StoryCard play={play} toMap={toStory} pulse={pulse === 'story'} />

      {(eventsOpen || g.entries.length > 0) && (
        <div class="home-row">
          {eventsOpen ? <EventMini now={now} open={openEvent} /> : <span />}
          <LooksMini now={now} toVote={toVote} toEvents={toEvents} />
        </div>
      )}
      {daily && <DailyModal onClose={() => setDaily(false)} onLevelUp={onLevelUp} />}
      {audio && <AudioModal onClose={() => setAudio(false)} />}
    </div>
  );
}

/** The event worth entering now, as a small card. */
function EventMini({ now, open }: { now: number; open: (key: string) => void }) {
  const g = useGame();
  const events = activeEvents(now);
  const entered = (key: string) => g.entries.some((e) => e.key === key);
  const ev = events.find((e) => e.level <= g.level && !entered(e.key)) ?? events.find((e) => e.level <= g.level);
  if (!ev) return <span />;
  const mine = entered(ev.key);
  return (
    <button class="mini-card ev" style={{ '--ec': ev.color }} onClick={() => open(ev.key)}>
      <span class="mc-top">
        <span class="feature-tile coral sm">{ev.emoji}</span>
        <small>⏱ {timeLeft(ev.end - now)}</small>
      </span>
      <b class="mc-name">{ev.name}</b>
      <span class="btn primary mini">{mine ? 'Мой образ' : <>Участвовать · 🎟 {ev.cost}</>}</span>
    </button>
  );
}

/** Her last three sent looks as little faces, with how the voting goes. */
function LooksMini({ now, toVote, toEvents }: { now: number; toVote: () => void; toEvents: () => void }) {
  const g = useGame();
  const looks = [...g.entries]
    .sort((a, b) => Number(!!a.claimed) - Number(!!b.claimed) || b.resultAt - a.resultAt)
    .slice(0, 3);
  const ready = g.entries.filter((e) => !e.claimed && e.resultAt <= now).length;
  const waiting = g.entries.filter((e) => e.resultAt > now);
  const soonest = waiting.length ? Math.min(...waiting.map((e) => e.resultAt)) : 0;
  return (
    <button class={'mini-card looks' + (ready ? ' ready' : '')} onClick={looks.length ? toVote : toEvents}>
      <b class="mc-name">Мои образы</b>
      <span class="mc-faces">
        {looks.map((e) => (
          <span class={'mc-face' + (!e.claimed && e.resultAt <= now ? ' ready' : '')} title={voteTargetByKey(e.key)?.name}>
            <Doll class="mc-face-doll" look={e.look} outfit={e.outfit} view={HEAD_VIEW} />
          </span>
        ))}
        {Array.from({ length: 3 - looks.length }, () => <span class="mc-face empty">+</span>)}
      </span>
      <small class={ready ? 'mc-status hot' : 'mc-status'}>
        {ready ? `Результат готов!` : soonest ? `⏱ ${timeLeft(soonest - now)}` : 'Отправь образ'}
      </small>
    </button>
  );
}
