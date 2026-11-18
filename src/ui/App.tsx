import type { ComponentChildren } from 'preact';
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
import { Coach, Coin, EnergyModal, Hud, LevelUpModal, Modal, fmt } from './common';
import { HomeScreen } from './HomeScreen';
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
        {coach && <Coach key={g.tut + route.name} top={route.name === 'shops'}>{coach.text}</Coach>}
      </div>
      <NavBar
        active={tab}
        go={go}
        pulse={coach?.nav}
        badges={{ vote: ready > 0 && ready }}
        locked={[...(voteOpen ? [] : ['vote' as Tab]), ...(eventsOpen ? [] : ['events' as Tab])]}
      />
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
          <div class="burst">🎁</div>
          <h2>Добро пожаловать в город, {g.name}!</h2>
          <p class="muted">Подарок на новоселье — пройдись по магазинам и собери свой первый гардероб.</p>
          <ul class="gift-list">
            <li>☕ +{GIFT_ENERGY} чашечек — на поиск вещей</li>
            <li><Coin /> +{fmt(GIFT_COINS)} монет — на покупки</li>
            <li>🔍 {NEWBIE_SEARCHES} поисков без ожидания</li>
          </ul>
          <button class="btn primary" onClick={() => { claimGift(); setRoute({ name: 'shops' }); }}>В магазины!</button>
        </Modal>
      )}
      {g.tut === 'events' && eventsOpen && !levelUp && route.name !== 'scene' && route.name !== 'events' && (
        <Modal>
          <div class="burst">👑</div>
          <h2>Открылись ивенты!</h2>
          <p class="muted">
            Модные конкурсы с дресс-кодом: собери образ, отправь его за билетик 🎟 — и другие модницы проголосуют.
            Чем больше звёзд, тем лучше награда, а за 5 ★ — главный приз.
          </p>
          <button class="btn primary" onClick={() => { reachTut('done'); setRoute({ name: 'events' }); }}>Смотреть ивенты</button>
          <button class="btn" onClick={() => reachTut('done')}>Позже</button>
        </Modal>
      )}
      {levelUp && <LevelUpModal lu={levelUp} onClose={() => setLevelUp(null)} />}
      {debug}
    </div>
  );
}

interface CoachHint { text: ComponentChildren; nav?: Tab; home?: 'wardrobe' | 'story' }

/** Which tutorial hint to show on this screen (none on scenes, events and voting). */
function coachFor(g: Save, route: Route['name']): CoachHint | null {
  const bought = boughtCount(g);
  switch (g.tut) {
    case 'shop':
      if (route === 'shops') return { text: <>Нажми на домик «Городской», чтобы зайти.<small>Листай улицу — магазинов много, часть откроется позже</small></> };
      if (route === 'shop') {
        return { text: <>Нажми на сверкающую полку — на ней найдётся вещь. Понравится — покупай!<small>Купи {TUT_BUYS} вещи: {Math.min(bought, TUT_BUYS)} из {TUT_BUYS}</small></> };
      }
      if (route === 'home' || route === 'wardrobe') return { text: 'Загляни в «Магазины» — там ждут обновки!', nav: 'shops' };
      return null;
    case 'wardrobe':
      if (route === 'shops' || route === 'shop') return { text: <>Отлично! Теперь примерь обновки.<small>«Главная» → «Гардероб»</small></>, nav: 'home' };
      if (route === 'home') return { text: 'Открой «Гардероб» и примерь обновки.', home: 'wardrobe' };
      return null;
    case 'story':
      if (route === 'wardrobe') return { text: <>Красота! Покупки сразу лежат здесь.<small>Теперь вернись на главную и сыграй историю</small></> };
      if (route === 'home') return { text: <>Сыграй первую сцену истории: образ оценят сразу.<small>Смотри на дресс-код — значки под вещами подскажут, что подходит</small></>, home: 'story' };
      if (route === 'shops' || route === 'shop') return { text: 'Пора в историю: «Главная» → «Играть».', nav: 'home' };
      return null;
    case 'events':
      if (g.level < EVENTS_LEVEL && route === 'home') return { text: `Проходи историю дальше — на ${EVENTS_LEVEL} уровне откроются ивенты.`, home: 'story' };
      return null;
    default:
      return null;
  }
}
