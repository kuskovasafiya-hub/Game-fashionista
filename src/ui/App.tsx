import { useState } from 'preact/hooks';
import { Doll } from '../art/Doll';
import { resultsReady, useGame, type LevelUp } from '../game/store';
import { EventScreen, EventsScreen, TicketModal, VoteScreen, useNow } from './EventsScreen';
import { CreateScreen } from './CreateScreen';
import { DEBUG_ENABLED, DebugPanel } from './DebugPanel';
import { ShopScreen, ShopsScreen } from './ShopScreen';
import { WardrobeScreen } from './WardrobeScreen';
import { EnergyModal, Hud, LevelUpModal } from './common';

type Route =
  | { name: 'home' } | { name: 'shops' } | { name: 'shop'; id: string } | { name: 'wardrobe' }
  | { name: 'events' } | { name: 'event'; key: string } | { name: 'vote' };

export function App() {
  const g = useGame();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [energyOpen, setEnergyOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
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
      : route.name === 'event' || route.name === 'vote' ? { name: 'events' }
      : { name: 'home' },
  );
  const ready = g.created ? resultsReady(now).length : 0;

  return (
    <div class="app">
      <Hud onEnergy={() => setEnergyOpen(true)} onTickets={() => setTicketsOpen(true)} />
      <main class="main">
        {route.name === 'home' && (
          <div class="screen home">
            <p class="hello">Привет, <b>{g.name}</b>!</p>
            <div class="stage">
              <Doll class="doll" look={g.look} outfit={g.outfit} />
            </div>
            <div class="menu">
              <button class="btn big pink" onClick={() => setRoute({ name: 'shops' })}>🛍️ Магазины</button>
              <button class="btn big violet" onClick={() => setRoute({ name: 'wardrobe' })}>👗 Гардероб</button>
              <button class="btn big gold" onClick={() => setRoute({ name: 'events' })}>
                🎉 Ивенты {ready > 0 && <span class="dot">{ready}</span>}
              </button>
            </div>
          </div>
        )}
        {route.name === 'shops' && <ShopsScreen open={(id) => setRoute({ name: 'shop', id })} />}
        {route.name === 'shop' && (
          <ShopScreen shopId={route.id} onNoEnergy={() => setEnergyOpen(true)} onLevelUp={setLevelUp} />
        )}
        {route.name === 'wardrobe' && <WardrobeScreen />}
        {route.name === 'events' && (
          <EventsScreen
            open={(key) => setRoute({ name: 'event', key })}
            vote={() => setRoute({ name: 'vote' })}
            onLevelUp={setLevelUp}
          />
        )}
        {route.name === 'event' && (
          <EventScreen eventKey={route.key} onDone={() => setRoute({ name: 'events' })} onTickets={() => setTicketsOpen(true)} />
        )}
        {route.name === 'vote' && <VoteScreen onLevelUp={setLevelUp} />}
      </main>
      {route.name !== 'home' && <button class="back" onClick={back}>←</button>}
      {energyOpen && <EnergyModal onClose={() => setEnergyOpen(false)} />}
      {ticketsOpen && <TicketModal onClose={() => setTicketsOpen(false)} onVote={() => setRoute({ name: 'vote' })} />}
      {levelUp && <LevelUpModal lu={levelUp} onClose={() => setLevelUp(null)} />}
      {debug}
    </div>
  );
}
