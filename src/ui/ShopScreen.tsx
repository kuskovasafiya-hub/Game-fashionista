import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ItemThumb } from '../art/Doll';
import { DEPT_NAMES, RARITY, SHOPS, shopItems, type Dept, type Item, type Shop, type Slot } from '../game/catalog';
import { PITY_RARE, allBought, buy, search, searchCost, toggleWish, useGame, type LevelUp, type SearchResult } from '../game/store';
import { ItemCard, Modal, RarityTag, fmt, plural } from './common';

/** Shop window order: the big pieces first, then shoes and accessories. */
const WINDOW_ORDER: Slot[] = ['dress', 'top', 'bottom', 'shoes', 'bag', 'necklace', 'earrings', 'glasses'];

/** One piece of each kind the shop sells, for its window. */
function windowItems(shopId: string): Item[] {
  const seen = new Set<string>();
  return shopItems(shopId)
    .sort((a, b) => WINDOW_ORDER.indexOf(a.slot) - WINDOW_ORDER.indexOf(b.slot))
    .filter((i) => !seen.has(i.art) && !!seen.add(i.art))
    .slice(0, 6);
}

/**
 * The shops as a street of little houses, scrolled sideways like a walk past shop windows.
 * Each window shows the kinds of things sold inside; closed shops are grey with the shutter down.
 */
export function ShopsScreen({ open, focus }: { open: (shopId: string) => void; focus?: string }) {
  const g = useGame();
  const scroller = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  const lots = () => [...(scroller.current?.querySelectorAll<HTMLElement>('.lot') ?? [])];
  const centre = (el: HTMLElement, smooth: boolean) => {
    const sc = scroller.current!;
    sc.scrollTo({ left: el.offsetLeft - (sc.clientWidth - el.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  const step = (dir: number) => {
    const el = lots()[Math.min(SHOPS.length - 1, Math.max(0, at + dir))];
    if (el) centre(el, true);
  };

  useEffect(() => {
    // back from a shop: stand in front of it again
    const i = focus ? SHOPS.findIndex((s) => s.id === focus) : -1;
    const el = lots()[i];
    if (el) { centre(el, false); setAt(i); }
    // a mouse wheel walks the street one house at a time
    const sc = scroller.current!;
    let cool = 0;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (Date.now() < cool) return;
      cool = Date.now() + 350;
      const here = Math.round(sc.scrollLeft / (lots()[0]?.offsetWidth || 1));
      const el2 = lots()[Math.min(SHOPS.length - 1, Math.max(0, here + Math.sign(e.deltaY)))];
      if (el2) centre(el2, true);
    };
    sc.addEventListener('wheel', wheel, { passive: false });
    return () => sc.removeEventListener('wheel', wheel);
  }, []);

  const onScroll = () => {
    const sc = scroller.current!;
    setAt(Math.max(0, Math.min(SHOPS.length - 1, Math.round(sc.scrollLeft / (lots()[0]?.offsetWidth || 1)))));
  };

  return (
    <div class="screen street">
      <h1 class="title">Магазины</h1>
      <div class="street-view">
        <span class="cloud c1" /><span class="cloud c2" /><span class="cloud c3" />
        <div class="street-scroll" ref={scroller} onScroll={onScroll}>
          <span class="lot-spacer" />
          {SHOPS.map((s, i) => <Lot shop={s} index={i} found={g.discovered} level={g.level} open={() => open(s.id)} />)}
          <span class="lot-spacer" />
        </div>
        {at > 0 && <button class="street-arrow left" onClick={() => step(-1)} aria-label="Назад по улице">‹</button>}
        {at < SHOPS.length - 1 && <button class="street-arrow right" onClick={() => step(1)} aria-label="Дальше по улице">›</button>}
      </div>
      <div class="street-dots">
        {SHOPS.map((s, i) => <i class={i === at ? 'on' : ''} style={{ '--sc': s.color }} />)}
      </div>
    </div>
  );
}

/** One house on the street with its shop window, and its name and description under it. */
function Lot({ shop, index, found, level, open }: {
  shop: Shop; index: number; found: string[]; level: number; open: () => void;
}) {
  const locked = level < shop.level || !!shop.soon;
  const all = shopItems(shop.id);
  const have = all.filter((i) => found.includes(i.id)).length;
  const done = allBought(shop.id);
  const goods = useMemo(() => windowItems(shop.id), [shop.id]);
  return (
    <div class={'lot' + (locked ? ' locked' : '')} style={{ '--sc': shop.color }}>
      <span class="lot-stage">
      <span class="lamp" />
      <button class={'house ' + (index % 2 ? 'gable' : 'flat')} disabled={locked} onClick={open} aria-label={shop.name}>
        <span class="house-roof" />
        <span class="house-top">
          <span class="house-win" />
          <span class="house-sign">{shop.emoji}</span>
          <span class="house-win" />
        </span>
        <span class="awning" />
        <span class="house-front">
          <span class="vitrine">
            <span class="vitrine-goods">
              {goods.map((i) => <ItemThumb item={i} />)}
            </span>
            {done && <span class="sold-badge">✓ Всё куплено</span>}
            {locked && (
              <span class="shutter">
                <span class="shutter-lock">🔒</span>
                <small>{shop.soon ? 'Скоро' : `С ${shop.level} уровня`}</small>
              </span>
            )}
          </span>
          <span class="door"><i /></span>
        </span>
      </button>
      </span>
      <button class="lot-caption" disabled={locked} onClick={open}>
        <b>{shop.name}</b>
        <small>{shop.about}</small>
        <span class="lot-meta">
          {shop.soon ? 'Скоро откроется' : locked ? `🔒 Откроется на ${shop.level} уровне`
            : done ? '🏆 Коллекция собрана' : `Найдено ${have} из ${all.length}`}
        </span>
      </button>
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
  const bought = all.filter((i) => g.owned.includes(i.id)).length;
  const deptDone = allBought(shopId, dept, g);
  const shopDone = allBought(shopId, undefined, g);

  const doSearch = () => {
    if (deptDone) return;
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
            <button class={'tab' + (dept === d ? ' active' : '')} onClick={() => setDept(d)}>
              {DEPT_NAMES[d]}{allBought(shopId, d, g) && ' ✓'}
            </button>
          ))}
        </nav>
      )}
      {deptDone ? (
        <div class="sold-out">
          <span class="sold-out-icon">{shopDone ? '🏆' : '✓'}</span>
          <span>
            <b>{shopDone ? 'Коллекция собрана!' : `Всё из раздела «${DEPT_NAMES[dept]}» уже твоё`}</b>
            <small>
              {shopDone
                ? 'Ты купила все вещи этого магазина — искать здесь больше нечего.'
                : 'Искать здесь больше нечего — загляни в другие разделы.'}
            </small>
          </span>
        </div>
      ) : (
        <>
          <button class={'btn search' + (shake ? ' shaking' : '')} onClick={doSearch} disabled={shake}>
            🔍 Искать вещь <span class="cost">☕ {cost}</span>
          </button>
          <p class="muted small center">
            Редкая вещь гарантирована не позже чем через {PITY_RARE - g.pityRare}{' '}
            {plural(PITY_RARE - g.pityRare, 'поиск', 'поиска', 'поисков')}
          </p>
        </>
      )}
      <h3 class="section">Коллекция магазина: найдено {found}/{all.length}, куплено {bought}</h3>
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
