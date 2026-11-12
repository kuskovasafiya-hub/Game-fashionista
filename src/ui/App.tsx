import { useState } from 'preact/hooks';
import { EVENTS_LEVEL } from '../game/events';
import { canVote, resultsReady, storyNext, useGame, type LevelUp } from '../game/store';
import { StoryMap, StoryScene } from './StoryScreen';
import { EventScreen, EventsScreen, useNow } from './EventsScreen';
import { TicketModal, VoteLobby, VoteLockedModal, VoteScreen } from './VoteScreen';
import { CreateScreen } from './CreateScreen';
import { DEBUG_ENABLED, DebugPanel } from './DebugPanel';
import { ShopScreen, ShopsScreen } from './ShopScreen';
import { WardrobeScreen } from './WardrobeScreen';
import { EnergyModal, Hud, LevelUpModal, Modal } from './common';
import { HomeScreen } from './HomeScreen';
import { NavBar, type Tab } from './NavBar';

type Route =
  | { name: 'home' } | { name: 'shops' } | { name: 'shop'; id: string } | { name: 'wardrobe' }
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
  const now = useNow(5000);

  const debug = DEBUG_ENABLED && (
    <>
      <button class="dbg-fab" onClick={() => setDebugOpen(true)} aria-label="Панель разработчика">🛠</button>
      {debugOpen && <DebugPanel onClose={() => setDebugOpen(false)} onLevelUp={setLevelUp} />}
    </>
  );

  if (!g.created) return <div class="app"><CreateScreen />{debug}</div>;

  const back = () => setRoute(
    route.name === 'shop' ? { name: 'shops' }
      : route.name === 'voting' ? { name: 'vote' }
      : route.name === 'scene' ? { name: 'story' }
      : route.name === 'story' || route.name === 'wardrobe' ? { name: 'home' }
      : { name: 'events' },
  );
  const ready = g.created ? resultsReady(now).length : 0;
  const tab: Tab = route.name === 'shop' ? 'shops' : route.name === 'event' ? 'events' : route.name === 'voting' ? 'vote'
    : route.name === 'story' || route.name === 'scene' || route.name === 'wardrobe' ? 'home' : route.name;
  const sub = ['shop', 'event', 'voting', 'story', 'scene', 'wardrobe'].includes(route.name);
  const eventsOpen = g.level >= EVENTS_LEVEL;
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
              toWardrobe={() => setRoute({ name: 'wardrobe' })}
              toEvents={() => setRoute({ name: 'events' })}
              toVote={() => go('vote')}
              play={play}
              toStory={() => setRoute({ name: 'story' })}
              openEvent={(key) => setRoute({ name: 'event', key })}
            />
          )}
          {route.name === 'shops' && <ShopsScreen open={(id) => setRoute({ name: 'shop', id })} />}
          {route.name === 'shop' && (
            <ShopScreen shopId={route.id} onNoEnergy={() => setEnergyOpen(true)} onLevelUp={setLevelUp} />
          )}
          {route.name === 'wardrobe' && <WardrobeScreen />}
          {route.name === 'events' && (
            <EventsScreen open={(key) => setRoute({ name: 'event', key })} />
          )}
          {route.name === 'event' && (
            <EventScreen eventKey={route.key} onDone={() => setRoute({ name: 'events' })} onTickets={() => setTicketsOpen(true)} />
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
        badges={{ vote: ready > 0 && ready }}
        locked={[...(voteOpen ? [] : ['vote' as Tab]), ...(eventsOpen ? [] : ['events' as Tab])]}
      />
      {energyOpen && <EnergyModal onClose={() => setEnergyOpen(false)} />}
      {ticketsOpen && <TicketModal onClose={() => setTicketsOpen(false)} onVote={() => go('vote')} />}
      {eventsLocked && (
        <Modal onClose={() => setEventsLocked(false)}>
          <div class="burst">🔒</div>
          <h2>Ивенты — со {EVENTS_LEVEL} уровня</h2>
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
      {levelUp && <LevelUpModal lu={levelUp} onClose={() => setLevelUp(null)} />}
      {debug}
    </div>
  );
}
