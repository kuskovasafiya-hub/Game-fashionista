import { Doll, FIGURE_VIEW } from '../art/Doll';
import { activeEvents, eventByKey } from '../game/events';
import { StoryCard } from './StoryScreen';
import { eventsOpen as eventsOpenFor, useGame, xpToNext } from '../game/store';
import { EventCard, HEAD_VIEW, Stars, timeLeft, useNow } from './EventsScreen';

/** Home: the player's model, her sent looks, and the event worth entering now. */
export function HomeScreen({ pulse, toWardrobe, toEvents, toVote, openEvent, play, toStory }: {
  /** Tutorial: what to tap next pulses. */
  pulse?: 'wardrobe' | 'story';
  toWardrobe: () => void; toEvents: () => void; toVote: () => void; openEvent: (key: string) => void;
  play: (id: string) => void; toStory: () => void;
}) {
  const g = useGame();
  const now = useNow();
  const need = xpToNext(g.level);
  const events = activeEvents(now);
  const entered = (key: string) => g.entries.some((e) => e.key === key);
  const featured = events.find((e) => e.level <= g.level && !entered(e.key))
    ?? events.find((e) => e.level <= g.level) ?? events[0];
  const looks = [...g.entries]
    .sort((a, b) => Number(!!a.claimed) - Number(!!b.claimed) || b.resultAt - a.resultAt)
    .slice(0, 6);
  const empty = Math.max(0, 3 - looks.length);
  const eventsOpen = eventsOpenFor(g);

  return (
    <div class="screen home">
      <section class="panel me">
        <button class="me-doll" onClick={toWardrobe} aria-label="Гардероб">
          <Doll class="doll" look={g.look} outfit={g.outfit} view={FIGURE_VIEW} />
        </button>
        <div class="me-info">
          <h2 class="me-name">{g.name}</h2>
          <span class="me-level">Уровень {g.level}</span>
          <span class="xpbar"><i style={{ width: `${(g.xp / need) * 100}%` }} /></span>
          <small class="muted">{g.xp} / {need} опыта</small>
          <button class={'btn teal' + (pulse === 'wardrobe' ? ' coach-pulse' : '')} data-coach="wardrobe" onClick={toWardrobe}>Гардероб</button>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-title">История</h2>
        <StoryCard play={play} toMap={toStory} pulse={pulse === 'story'} />
      </section>

      {eventsOpen && <section class="panel">
        <h2 class="panel-title">Мои образы</h2>
        <div class="strip">
          {looks.map((e) => {
            const ev = eventByKey(e.key);
            const ready = !e.claimed && e.resultAt <= now;
            return (
              <button class={'look-slot' + (ready ? ' ready' : '')} onClick={toVote}>
                <Doll class="look-head" look={e.look} outfit={e.outfit} view={HEAD_VIEW} />
                <span class="look-name">{ev ? `${ev.emoji} ${ev.name}` : 'Ивент'}</span>
                {e.claimed ? <Stars n={e.score.stars} label />
                  : ready ? <span class="look-ready">Результат!</span>
                  : <small class="look-wait">⏱ {timeLeft(e.resultAt - now)}</small>}
              </button>
            );
          })}
          {Array.from({ length: empty }, () => (
            <button class="look-slot empty" onClick={toEvents}>Ждёт образа</button>
          ))}
        </div>
      </section>}

      {eventsOpen && featured && <Featured key={featured.key} eventKey={featured.key} now={now} open={() => openEvent(featured.key)} />}
    </div>
  );
}

function Featured({ eventKey, now, open }: { eventKey: string; now: number; open: () => void }) {
  const ev = eventByKey(eventKey)!;
  return (
    <section class="panel">
      <h2 class="panel-title">Сейчас идёт</h2>
      <EventCard ev={ev} now={now} onOpen={open} />
    </section>
  );
}
