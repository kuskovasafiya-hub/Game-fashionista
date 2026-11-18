import { useState } from 'preact/hooks';
import { ITEMS, SHOPS } from '../game/catalog';
import {
  ENERGY_MAX, PITY_EPIC, PITY_RARE, VOTES_PER_TICKET, debugExport, debugImport, debugPatch, debugXp, resetGame,
  useGame, xpLeft, xpToNext, type LevelUp,
} from '../game/store';
import { Coin, fmt } from './common';

/** Shown in `npm run dev` always; in a production build only with `?debug` in the URL. */
export const DEBUG_ENABLED =
  import.meta.env.DEV || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'));

const MAX_SHOP_LEVEL = Math.max(...SHOPS.filter((s) => !s.soon).map((s) => s.level));

function NumSet({ label, value, onSet, min = 0 }: { label: string; value: number; onSet: (n: number) => void; min?: number }) {
  const [text, setText] = useState('');
  const apply = () => {
    const n = Math.floor(Number(text));
    if (text.trim() === '' || !Number.isFinite(n)) return;
    onSet(Math.max(min, n));
    setText('');
  };
  return (
    <div class="dbg-row">
      <span class="dbg-label">{label}</span>
      <input
        class="dbg-input" type="number" inputMode="numeric" placeholder={String(value)} value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
      />
      <button class="dbg-btn" onClick={apply}>OK</button>
    </div>
  );
}

function Btn({ children, onClick, danger }: { children: string; onClick: () => void; danger?: boolean }) {
  return <button class={'dbg-btn' + (danger ? ' danger' : '')} onClick={onClick}>{children}</button>;
}

export function DebugPanel({ onClose, onLevelUp }: { onClose: () => void; onLevelUp?: (lu: LevelUp) => void }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const flash = (msg: string) => { setNote(msg); setTimeout(() => setNote((n) => (n === msg ? '' : n)), 1800); };

  const setLevel = (level: number) => debugPatch({ level: Math.max(1, level), xp: 0 });
  const levelUpWithRewards = () => {
    const lu = debugXp(xpLeft());
    if (lu) { onClose(); onLevelUp?.(lu); }
  };

  const copySave = async () => {
    const json = debugExport();
    try { await navigator.clipboard.writeText(json); flash('Сохранение скопировано'); }
    catch { prompt('Скопируйте сохранение:', json); }
  };
  const loadSave = () => {
    const json = prompt('Вставьте сохранение (JSON):');
    if (json == null) return;
    flash(debugImport(json) ? 'Сохранение загружено' : 'Не получилось прочитать JSON');
  };

  const need = xpToNext(g.level);

  return (
    <div class="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal dbg">
        <div class="dbg-head">
          <h2>🛠 Панель разработчика</h2>
          <button class="dbg-close" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        <section>
          <h3><Coin /> Монеты: {fmt(g.coins)}</h3>
          <div class="dbg-btns">
            <Btn onClick={() => debugPatch((s) => ({ coins: s.coins + 1000 }))}>+1 000</Btn>
            <Btn onClick={() => debugPatch((s) => ({ coins: s.coins + 10000 }))}>+10 000</Btn>
            <Btn onClick={() => debugPatch((s) => ({ coins: s.coins + 100000 }))}>+100 000</Btn>
            <Btn onClick={() => debugPatch({ coins: 0 })}>0</Btn>
          </div>
          <NumSet label="Точно" value={g.coins} onSet={(coins) => debugPatch({ coins })} />
        </section>

        <section>
          <h3>💎 Алмазики: {g.gems}</h3>
          <div class="dbg-btns">
            <Btn onClick={() => debugPatch((s) => ({ gems: s.gems + 10 }))}>+10</Btn>
            <Btn onClick={() => debugPatch((s) => ({ gems: s.gems + 100 }))}>+100</Btn>
            <Btn onClick={() => debugPatch({ gems: 0 })}>0</Btn>
          </div>
          <NumSet label="Точно" value={g.gems} onSet={(gems) => debugPatch({ gems })} />
        </section>

        <section>
          <h3>☕ Энергия: {g.energy}/{ENERGY_MAX}</h3>
          <div class="dbg-btns">
            <Btn onClick={() => debugPatch({ energy: ENERGY_MAX, energyTs: Date.now() })}>Полная</Btn>
            <Btn onClick={() => debugPatch((s) => ({ energy: s.energy + 20 }))}>+20</Btn>
            <Btn onClick={() => debugPatch({ energy: 0, energyTs: Date.now() })}>0</Btn>
            <Btn onClick={() => debugPatch({ energyTs: Date.now() - 6 * 60 * 1000 + 5000 })}>Чашка через 5 с</Btn>
            <Btn onClick={() => { debugPatch({ adsDay: '', adsCount: 0 }); flash('Лимит рекламы сброшен'); }}>Сбросить лимит рекламы</Btn>
          </div>
        </section>

        <section>
          <h3>⭐ Уровень {g.level} <small>опыт {g.xp}/{need}</small></h3>
          <div class="dbg-btns">
            <Btn onClick={() => setLevel(g.level - 1)}>−1</Btn>
            <Btn onClick={() => setLevel(g.level + 1)}>+1</Btn>
            <Btn onClick={levelUpWithRewards}>Level up с наградой</Btn>
            <Btn onClick={() => debugPatch({ xp: Math.max(0, need - 1) })}>Почти level up</Btn>
            <Btn onClick={() => setLevel(MAX_SHOP_LEVEL)}>{`Все магазины (ур. ${MAX_SHOP_LEVEL})`}</Btn>
          </div>
          <NumSet label="Перейти на" value={g.level} min={1} onSet={setLevel} />
          <p class="dbg-hint">«±1» и «Перейти» меняют уровень без наград. «Level up с наградой» — как в игре: монеты, алмазики, энергия и попап.</p>
        </section>

        <section>
          <h3>👗 Вещи: {g.owned.length}/{ITEMS.length} <small>найдено {g.discovered.length}</small></h3>
          <div class="dbg-btns">
            <Btn onClick={() => debugPatch({ owned: ITEMS.map((i) => i.id), discovered: ITEMS.map((i) => i.id) })}>Выдать все вещи</Btn>
            <Btn onClick={() => debugPatch((s) => ({ discovered: [...new Set([...s.discovered, ...ITEMS.map((i) => i.id)])] }))}>Открыть каталог</Btn>
            <Btn onClick={() => debugPatch({ owned: [], outfit: {}, wish: [] })}>Забрать все вещи</Btn>
            <Btn onClick={() => debugPatch((s) => ({ discovered: [...s.owned] }))}>Скрыть ненайденные</Btn>
          </div>
        </section>

        <section>
          <h3>🎉 Ивенты <small>🎟 {g.tickets}, голосов {g.votes}, образов {g.entries.length}</small></h3>
          <div class="dbg-btns">
            <Btn onClick={() => debugPatch((s) => ({ tickets: s.tickets + 5 }))}>+5 🎟</Btn>
            <Btn onClick={() => debugPatch({ tickets: 0 })}>0 🎟</Btn>
            <Btn onClick={() => { debugPatch((s) => ({ entries: s.entries.map((e) => (e.claimed ? e : { ...e, resultAt: Date.now() })) })); flash('Результаты готовы'); }}>
              Результаты готовы сейчас
            </Btn>
            <Btn onClick={() => debugPatch((s) => ({ votes: s.votes - (s.votes % VOTES_PER_TICKET) + VOTES_PER_TICKET - 1 }))}>Билетик за 1 голос</Btn>
            <Btn onClick={() => { debugPatch({ entries: [] }); flash('Участие сброшено'); }}>Сбросить участие</Btn>
          </div>
        </section>

        <section>
          <h3>🎲 Гарант <small>редкая {g.pityRare}/{PITY_RARE}, эпик {g.pityEpic}/{PITY_EPIC}</small></h3>
          <div class="dbg-btns">
            <Btn onClick={() => debugPatch({ pityRare: PITY_RARE - 1 })}>След. поиск — редкая</Btn>
            <Btn onClick={() => debugPatch({ pityEpic: PITY_EPIC - 1 })}>След. поиск — эпик</Btn>
            <Btn onClick={() => debugPatch({ pityRare: 0, pityEpic: 0 })}>Обнулить</Btn>
          </div>
        </section>

        <section>
          <h3>💾 Сохранение</h3>
          <div class="dbg-btns">
            <Btn onClick={copySave}>Скопировать</Btn>
            <Btn onClick={loadSave}>Загрузить</Btn>
            <Btn onClick={() => { debugPatch({ created: false }); onClose(); }}>Начать с выбора персонажа</Btn>
            <Btn danger onClick={() => { if (confirm('Начать игру заново? Весь прогресс удалится.')) { resetGame(); onClose(); } }}>
              Сбросить прогресс
            </Btn>
          </div>
          <p class="dbg-hint">«Начать с выбора персонажа» сохраняет монеты, уровень и вещи. «Сбросить прогресс» стирает всё.</p>
        </section>

        {note && <div class="dbg-note">{note}</div>}
      </div>
    </div>
  );
}
