import { useState } from 'preact/hooks';
import { Doll } from '../art/Doll';
import { resetGame, useGame, type LevelUp } from '../game/store';
import { CreateScreen } from './CreateScreen';
import { ShopScreen, ShopsScreen } from './ShopScreen';
import { WardrobeScreen } from './WardrobeScreen';
import { EnergyModal, Hud, LevelUpModal } from './common';

type Route = { name: 'home' } | { name: 'shops' } | { name: 'shop'; id: string } | { name: 'wardrobe' };

export function App() {
  const g = useGame();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [energyOpen, setEnergyOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);

  if (!g.created) return <div class="app"><CreateScreen /></div>;

  const back = route.name === 'shop' ? () => setRoute({ name: 'shops' }) : () => setRoute({ name: 'home' });

  return (
    <div class="app">
      <Hud onEnergy={() => setEnergyOpen(true)} />
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
              <button class="btn big" disabled>🎉 Ивенты <small>скоро</small></button>
            </div>
            <button class="link" onClick={() => { if (confirm('Начать игру заново? Весь прогресс удалится.')) resetGame(); }}>
              Сбросить прогресс
            </button>
          </div>
        )}
        {route.name === 'shops' && <ShopsScreen open={(id) => setRoute({ name: 'shop', id })} />}
        {route.name === 'shop' && (
          <ShopScreen shopId={route.id} onNoEnergy={() => setEnergyOpen(true)} onLevelUp={setLevelUp} />
        )}
        {route.name === 'wardrobe' && <WardrobeScreen />}
      </main>
      {route.name !== 'home' && <button class="back" onClick={back}>←</button>}
      {energyOpen && <EnergyModal onClose={() => setEnergyOpen(false)} />}
      {levelUp && <LevelUpModal lu={levelUp} onClose={() => setLevelUp(null)} />}
    </div>
  );
}
