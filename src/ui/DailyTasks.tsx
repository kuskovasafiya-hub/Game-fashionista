import { CHEST, TASKS, claimChest, claimTask, dailyToClaim, localDay, msToMidnight, useGame, type LevelUp, type TaskKind } from '../game/store';
import { Coin, Modal, fmt } from './common';
import { timeLeft, useNow } from './EventsScreen';
import { flyRewards } from './fx';

const TASK_TEXT: Record<TaskKind, { icon: string; text: (n: number) => string }> = {
  search: { icon: '🔍', text: (n) => `Найди ${n} вещей в магазинах` },
  buy: { icon: '🛍️', text: (n) => `Купи ${n} вещи` },
  story: { icon: '📖', text: () => 'Пройди сцену истории' },
  event: { icon: '🎉', text: () => 'Отправь образ на ивент' },
  vote: { icon: '❤️', text: (n) => `Проголосуй ${n} раз` },
};

/** The home button: today's tasks, with a red number for rewards waiting to be taken. */
export function DailyButton({ onOpen }: { onOpen: () => void }) {
  const g = useGame();
  if (!g.daily || g.daily.day !== localDay()) return null;
  const left = g.daily.tasks.filter((t) => t.done < t.need).length;
  const ready = dailyToClaim(g);
  return (
    <button class="btn daily-btn" data-coach="daily" onClick={onOpen}>
      📋 Задания {left ? `${g.daily.tasks.length - left}/${g.daily.tasks.length}` : '✓'}
      {ready > 0 && <span class="daily-badge">{ready}</span>}
    </button>
  );
}

/** Today's three tasks and the chest for finishing them all. */
export function DailyModal({ onClose, onLevelUp }: { onClose: () => void; onLevelUp: (lu: LevelUp) => void }) {
  const g = useGame();
  const now = useNow(1000);
  const d = g.daily;
  if (!d) return null;
  const allClaimed = d.tasks.every((t) => t.claimed);
  return (
    <Modal onClose={onClose}>
      <h2>Задания дня</h2>
      <p class="muted small">Новые задания через {timeLeft(msToMidnight(now))}</p>
      <ul class="daily-list">
        {d.tasks.map((t, i) => {
          const pay = TASKS[t.kind];
          const txt = TASK_TEXT[t.kind];
          const done = t.done >= t.need;
          return (
            <li class={'daily-task' + (t.claimed ? ' claimed' : done ? ' done' : '')}>
              <span class="dt-icon">{txt.icon}</span>
              <span class="dt-body">
                <b>{txt.text(t.need)}</b>
                <span class="dt-reward">
                  <Coin /> {fmt(pay.coins)} · ⭐ {pay.xp}{pay.tickets ? ` · 🎟 ${pay.tickets}` : ''}
                </span>
                {!done && (
                  <span class="vote-progress"><i style={{ width: `${(t.done / t.need) * 100}%` }} /><em>{t.done}/{t.need}</em></span>
                )}
              </span>
              {t.claimed
                ? <span class="dt-check">✓</span>
                : done && (
                  <button class="btn primary mini" onClick={() => { flyRewards(); const lu = claimTask(i); if (lu) onLevelUp(lu); }}>
                    Забрать
                  </button>
                )}
            </li>
          );
        })}
      </ul>
      <div class={'daily-chest' + (allClaimed && !d.chest ? ' ready' : '') + (d.chest ? ' opened' : '')}>
        <span class="dc-icon">{d.chest ? '🎉' : '🎁'}</span>
        <span class="dt-body">
          <b>{d.chest ? 'Сундук открыт' : 'Выполни все задания'}</b>
          <span class="dt-reward">💎 {CHEST.gems} · 🎟 {CHEST.tickets}</span>
        </span>
        {allClaimed && !d.chest && (
          <button class="btn primary mini" onClick={() => { flyRewards(); claimChest(); }}>Открыть</button>
        )}
      </div>
      <button class="btn" onClick={onClose}>Закрыть</button>
    </Modal>
  );
}
