import { useState } from 'preact/hooks';
import { ItemThumb } from '../art/Doll';
import { DEPT_NAMES, RARITY, SHOPS, shopItems, type Dept } from '../game/catalog';
import { PITY_RARE, buy, search, searchCost, toggleWish, useGame, type LevelUp, type SearchResult } from '../game/store';
import { ItemCard, Modal, RarityTag, fmt, plural } from './common';

export function ShopsScreen({ open }: { open: (shopId: string) => void }) {
  const g = useGame();
  return (
    <div class="screen list">
      <h1 class="title">Магазины</h1>
      {SHOPS.map((s) => {
        const locked = g.level < s.level || s.soon;
        const all = shopItems(s.id);
        const found = all.filter((i) => g.discovered.includes(i.id)).length;
        return (
          <button class={'shop-row' + (locked ? ' locked' : '')} style={{ '--sc': s.color }} disabled={locked} onClick={() => open(s.id)}>
            <span class="shop-icon">{s.emoji}</span>
            <span class="shop-info">
              <b>{s.name}</b>
              <small>{s.about}</small>
            </span>
            <span class="shop-meta">
              {s.soon ? 'Скоро' : locked ? `🔒 ур. ${s.level}` : `${found}/${all.length}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ShopScreen({ shopId, onNoEnergy, onLevelUp }: {
  shopId: string; onNoEnergy: () => void; onLevelUp: (lu: LevelUp) => void;
}) {
  const g = useGame();
  const shop = SHOPS.find((s) => s.id === shopId)!;
  const [dept, setDept] = useState<Dept>(shop.depts[0]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [shake, setShake] = useState(false);
  const cost = searchCost(shopId);
  const items = shopItems(shopId, dept);
  const all = shopItems(shopId);
  const found = all.filter((i) => g.discovered.includes(i.id)).length;

  const doSearch = () => {
    if (g.energy < cost) return onNoEnergy();
    setShake(true);
    setTimeout(() => {
      setShake(false);
      const r = search(shopId, dept);
      if (r) setResult(r);
    }, 450);
  };
  const close = (lu: LevelUp | null) => {
    setResult(null);
    if (lu) onLevelUp(lu);
  };

  return (
    <div class="screen shop" style={{ '--sc': shop.color }}>
      <div class="shop-head">
        <span class="shop-icon big">{shop.emoji}</span>
        <div>
          <h1 class="title">{shop.name}</h1>
          <p class="muted">{shop.about}</p>
        </div>
      </div>
      {shop.depts.length > 1 && (
        <nav class="tabs">
          {shop.depts.map((d) => (
            <button class={'tab' + (dept === d ? ' active' : '')} onClick={() => setDept(d)}>{DEPT_NAMES[d]}</button>
          ))}
        </nav>
      )}
      <button class={'btn search' + (shake ? ' shaking' : '')} onClick={doSearch} disabled={shake}>
        🔍 Искать вещь <span class="cost">☕ {cost}</span>
      </button>
      <p class="muted small center">
        Редкая вещь гарантирована не позже чем через {PITY_RARE - g.pityRare}{' '}
        {plural(PITY_RARE - g.pityRare, 'поиск', 'поиска', 'поисков')}
      </p>
      <h3 class="section">Коллекция магазина: {found}/{all.length}</h3>
      <div class="grid">
        {items.map((i) => {
          const owned = g.owned.includes(i.id);
          const seen = g.discovered.includes(i.id);
          const wished = g.wish.includes(i.id);
          return (
            <ItemCard
              item={i}
              dim={!seen}
              badge={owned ? '✓' : wished ? '♥' : seen ? '♡' : '?'}
              onClick={() => { if (seen && !owned) toggleWish(i.id); }}
            />
          );
        })}
      </div>
      <p class="muted small center">♡ — нажми, чтобы добавить в список желаний: такие вещи выпадают в 3 раза чаще.</p>
      {result && <ResultModal r={result} onClose={close} />}
    </div>
  );
}

function ResultModal({ r, onClose }: { r: SearchResult; onClose: (lu: LevelUp | null) => void }) {
  const g = useGame();
  const { item } = r;
  const owned = g.owned.includes(item.id);
  const canAfford = g.coins >= item.price;
  return (
    <Modal onClose={() => onClose(r.levelUp)}>
      <div class={'reveal ' + item.rarity} style={{ '--rc': RARITY[item.rarity].color }}>
        <RarityTag item={item} />
        {r.pity && <span class="pity">Гарант!</span>}
        <div class="reveal-item">
          <ItemThumb item={item} />
        </div>
        <h2>{item.name}</h2>
        <p class="price">🪙 {fmt(item.price)}</p>
      </div>
      {owned ? (
        <>
          <p class="muted">Уже есть в гардеробе</p>
          <button class="btn primary" onClick={() => onClose(r.levelUp)}>Дальше</button>
        </>
      ) : (
        <>
          <button class="btn primary" disabled={!canAfford} onClick={() => { const b = buy(item.id); onClose(b.levelUp ?? r.levelUp); }}>
            {canAfford ? `Купить за ${fmt(item.price)} 🪙` : 'Не хватает монет'}
          </button>
          <button class="btn" onClick={() => onClose(r.levelUp)}>Пропустить</button>
        </>
      )}
    </Modal>
  );
}
