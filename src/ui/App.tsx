import { useEffect, useState } from 'preact/hooks';
import { EVENTS_LEVEL } from '../game/events';
import {
  GIFT_COINS, GIFT_ENERGY, NEWBIE_SEARCHES, TUT_BUYS, boughtCount, canVote, claimGift, eventsOpen as eventsOpenFor,
  reachTut, resultsReady, storyNext, useGame, type LevelUp, type Save,
} from '../game/store';
import { StoryMap, StoryScene } from './StoryScreen';
import { EventScreen, EventsScreen, useNow } from './EventsScreen';
import { TicketModal, VoteLobby, VoteLockedModal, VoteScreen } from './VoteScreen';
import { CreateScreen } from './CreateScreen';
import { DEBUG_ENABLED, DebugPanel } from './DebugPanel';
import { ShopScreen, ShopsScreen } from './ShopScreen';
import { WardrobeScreen } from './WardrobeScreen';
import { CoachHand, Coin, Dots, EnergyModal, Hud, LevelUpModal, Modal, fmt, type CoachHint } from './common';
import { HomeScreen } from './HomeScreen';
import { flyRewards } from './fx';
import { NavBar, type Tab } from './NavBar';

type Route =
  | { name: 'home' } | { name: 'shops'; from?: string } | { name: 'shop'; id: string } | { name: 'wardrobe' }
  | { name: 'events' } | { name: 'event'; key: string } | { name: 'vote' } | { name: 'voting'; key: string }
  | { name: 'story' } | { name: 'scene'; id: string };

export function App() {
  const g = useGame();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [energyOpen, setEnergyOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [voteLocked, setVoteLocked] = useState(false);
  const [eventsLocked, setEventsLocked] = useState(false);
  /** «Позже» on the events-unlocked card: the hand then points at the tab instead. */
  const [unlockSeen, setUnlockSeen] = useState(false);
  const now = useNow(5000);

  // tutorial: opening the wardrobe moves her on to the story; visiting events ends it
  useEffect(() => {
    if (route.name === 'wardrobe' && g.tut === 'wardrobe') reachTut('story');
    if (route.name === 'events' && g.tut === 'events' && eventsOpenFor(g)) reachTut('done');
  }, [route.name, g.tut]);

  const debug = DEBUG_ENABLED && (
    <>
      <button class="dbg-fab" onClick={() => setDebugOpen(true)} aria-label="Панель разработчика">🛠</button>
      {debugOpen && <DebugPanel onClose={() => setDebugOpen(false)} onLevelUp={setLevelUp} />}
    </>
  );

  if (!g.created) return <div class="app"><CreateScreen />{debug}</div>;

  const back = () => setRoute(
    route.name === 'shop' ? { name: 'shops', from: route.id }
      : route.name === 'voting' ? { name: 'vote' }
      : route.name === 'scene' ? { name: 'story' }
      : route.name === 'story' || route.name === 'wardrobe' ? { name: 'home' }
      : { name: 'events' },
  );
  const ready = g.created ? resultsReady(now).length : 0;
  const tab: Tab = route.name === 'shop' ? 'shops' : route.name === 'event' ? 'events' : route.name === 'voting' ? 'vote'
    : route.name === 'story' || route.name === 'scene' || route.name === 'wardrobe' ? 'home' : route.name;
  const sub = ['shop', 'event', 'voting', 'story', 'scene', 'wardrobe'].includes(route.name);
  const eventsOpen = eventsOpenFor(g);
  // the events tab keeps its lock until she has seen the «events are open» card, so the lock springs open in view
  const holdLock = g.tut === 'events' && !unlockSeen && route.name !== 'events';
  const showUnlock = g.tut === 'events' && eventsOpen && !unlockSeen && !levelUp && route.name !== 'scene' && route.name !== 'events';
  // the hand waits while a card is open on top
  const modalUp = showUnlock || !!levelUp || energyOpen || ticketsOpen || voteLocked || eventsLocked;
  const coach = coachFor(g, route.name);
  const play = (id: string) => setRoute({ name: 'scene', id });
  const voteOpen = canVote(g);
  const go = (t: Tab) => (
    t === 'vote' && !voteOpen ? setVoteLocked(true)
      : t === 'events' && !eventsOpen ? setEventsLocked(true)
      : setRoute({ name: t } as Route)
  );

  return (
    <div class="app">
      <Hud onEnergy={() => setEnergyOpen(true)} onTickets={() => setTicketsOpen(true)} />
      <div class="view">
        <main class="main" key={route.name}>
          {route.name === 'home' && (
            <HomeScreen
              pulse={coach?.home}
              toWardrobe={() => setRoute({ name: 'wardrobe' })}
              toEvents={() => setRoute({ name: 'events' })}
              toVote={() => go('vote')}
              play={play}
              toStory={() => setRoute({ name: 'story' })}
              openEvent={(key) => setRoute({ name: 'event', key })}
            />
          )}
          {route.name === 'shops' && <ShopsScreen open={(id) => setRoute({ name: 'shop', id })} focus={route.from} />}
          {route.name === 'shop' && (
            <ShopScreen shopId={route.id} onNoEnergy={() => setEnergyOpen(true)} onLevelUp={setLevelUp} />
          )}
          {route.name === 'wardrobe' && <WardrobeScreen />}
          {route.name === 'events' && (
            <EventsScreen open={(key) => setRoute({ name: 'event', key })} />
          )}
          {route.name === 'event' && (
            <EventScreen
              eventKey={route.key} onDone={() => setRoute({ name: 'events' })} onTickets={() => setTicketsOpen(true)}
              toVote={() => go('vote')}
            />
          )}
          {route.name === 'vote' && (
            <VoteLobby
              vote={(key) => setRoute({ name: 'voting', key })}
              toEvents={() => go('events')}
              onLevelUp={setLevelUp}
            />
          )}
          {route.name === 'story' && <StoryMap play={play} />}
          {route.name === 'scene' && (
            <StoryScene
              key={route.id} stepId={route.id} play={play}
              toMap={() => setRoute({ name: 'story' })} toShops={() => setRoute({ name: 'shops' })}
              toEvents={() => go('events')} onLevelUp={setLevelUp}
            />
          )}
          {route.name === 'voting' && (
            <VoteScreen
              key={route.key} targetKey={route.key} onLevelUp={setLevelUp}
              onDone={() => setRoute({ name: 'vote' })} onNext={(key) => setRoute({ name: 'voting', key })}
            />
          )}
        </main>
        {sub && <button class="back" onClick={back} aria-label="Назад">←</button>}
      </div>
      <NavBar
        active={tab}
        go={go}
        pulse={coach?.nav}
        badges={{ vote: ready > 0 && ready }}
        locked={[...(voteOpen ? [] : ['vote' as Tab]), ...(eventsOpen && !holdLock ? [] : ['events' as Tab])]}
      />
      {coach && !modalUp && <CoachHand key={g.tut + route.name + coach.target} {...coach} />}
      {energyOpen && <EnergyModal onClose={() => setEnergyOpen(false)} />}
      {ticketsOpen && <TicketModal onClose={() => setTicketsOpen(false)} onVote={() => go('vote')} />}
      {eventsLocked && (
        <Modal onClose={() => setEventsLocked(false)}>
          <div class="burst">🔒</div>
          <h2>{g.level >= EVENTS_LEVEL ? 'Ивенты — после первой сцены истории' : `Ивенты — со ${EVENTS_LEVEL} уровня`}</h2>
          <p class="muted">Проходи историю: за каждую сцену дают опыт, и ивенты откроются совсем скоро.</p>
          {storyNext(g) && (
            <button class="btn primary" onClick={() => { setEventsLocked(false); play(storyNext(g)!.id); }}>Играть историю</button>
          )}
          <button class="btn" onClick={() => setEventsLocked(false)}>Позже</button>
        </Modal>
      )}
      {voteLocked && (
        <VoteLockedModal
          onClose={() => setVoteLocked(false)}
          toStory={() => { const st = storyNext(g); setRoute(st ? { name: 'scene', id: st.id } : { name: 'story' }); }}
        />
      )}
      {g.tut === 'gift' && (
        <Modal>
          <div class="burst gift-burst">🎁</div>
          <h2>Привет, {g.name}!</h2>
          <p class="muted">Подарок на новоселье:</p>
          <ul class="gift-list">
            <li data-reward="energy"><b>☕</b>+{GIFT_ENERGY}<small>на поиск</small></li>
            <li data-reward="coins"><b><Coin /></b>+{fmt(GIFT_COINS)}<small>на покупки</small></li>
            <li><b>🔍</b>{NEWBIE_SEARCHES}<small>без ожидания</small></li>
          </ul>
          <button class="btn primary" onClick={() => { flyRewards(); claimGift(); setRoute({ name: 'shops' }); }}>В магазины!</button>
        </Modal>
      )}
      {showUnlock && (
        <Modal>
          <div class="unlock-burst" aria-hidden="true"><span class="ub-rays" /><span class="ub-lock">🔒</span><span class="ub-crown">👑</span></div>
          <h2>Открылись ивенты!</h2>
          <p class="how-row" aria-label="Собери образ, отправь за билетик, другие проголосуют, получи приз">
            <span>👗</span><i>›</i><span>🎟</span><i>›</i><span>❤️</span><i>›</i><span>🎁</span>
          </p>
          <p class="muted small">Конкурсы образов: чем больше ★, тем лучше приз</p>
          <button class="btn primary" onClick={() => { reachTut('done'); setRoute({ name: 'events' }); }}>Смотреть ивенты</button>
          <button class="btn" onClick={() => setUnlockSeen(true)}>Позже</button>
        </Modal>
      )}
      {levelUp && <LevelUpModal lu={levelUp} onClose={() => setLevelUp(null)} />}
      {debug}
    </div>
  );
}

type Hint = CoachHint & { nav?: Tab; home?: 'wardrobe' | 'story' };

const NAV = (t: Tab) => `.navbar [data-tab="${t}"] .nav-icon`;

/** The tutorial hand on this screen: what to tap next, with an icon or two (none on scenes and voting). */
function coachFor(g: Save, route: Route['name']): Hint | null {
  const bought = boughtCount(g);
  switch (g.tut) {
    case 'shop':
      if (route === 'shops') return { target: '.lot[data-shop="city"] .house', label: '🛍️' };
      if (route === 'shop') {
        return { target: '.fixture.ready', label: <Dots n={Math.min(bought, TUT_BUYS)} of={TUT_BUYS} icon="🛍️" /> };
      }
      if (route === 'home' || route === 'wardrobe') return { target: NAV('shops'), label: '🛍️', nav: 'shops' };
      return null;
    case 'wardrobe':
      if (route === 'shops' || route === 'shop') return { target: NAV('home'), label: '👗', nav: 'home' };
      if (route === 'home') return { target: '[data-coach="wardrobe"]', label: '👗', home: 'wardrobe' };
      return null;
    case 'story':
      // in the wardrobe she first looks at her new things; the hand to the story comes a bit later
      if (route === 'wardrobe') return { target: '.back', label: '🎬', wait: 6000 };
      if (route === 'home') return { target: '[data-coach="story"]', label: '🎬', home: 'story' };
      if (route === 'shops' || route === 'shop') return { target: NAV('home'), label: '🎬', nav: 'home' };
      return null;
    case 'events':
      if (eventsOpenFor(g)) {
        return route === 'events' || route === 'scene' ? null : { target: NAV('events'), label: '👑', nav: 'events' };
      }
      if (g.level < EVENTS_LEVEL && route === 'home') {
        return { target: '[data-coach="story"]', label: <>🎬 › 👑</>, home: 'story', wait: 3000 };
      }
      return null;
    default:
      return null;
  }
}
