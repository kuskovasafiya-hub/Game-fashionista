import { useEffect, useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW } from '../art/Doll';
import { dressCodeMatch, type Theme } from '../game/events';
import { CHAPTERS, STORY_STEPS, chapterOf, stepById, type StoryStep } from '../game/story';
import { playStory, storyNext, storyOpen, useGame, type LevelUp, type StoryResult } from '../game/store';
import { DressCode, Modal, fmt } from './common';
import { eventBg } from './EventsScreen';
import { WardrobeScreen } from './WardrobeScreen';

const sceneNo = (st: StoryStep) => Number(st.id.split('.')[1]);
const chapterNo = (st: StoryStep) => Number(st.id.split('.')[0]);
const theme = (st: StoryStep): Theme => ({ id: st.bg, name: st.name, emoji: st.emoji, color: st.color, tags: st.tags });

function Stars3({ n, animate }: { n: number; animate?: boolean }) {
  return (
    <span class={'stars' + (animate ? ' animate' : '')}>
      {[1, 2, 3].map((k) => <i class={k <= n ? 'on' : ''} style={{ animationDelay: `${0.25 + k * 0.2}s` }}>★</i>)}
    </span>
  );
}

/* ---------- home card: the next scene ---------- */

export function StoryCard({ play, toMap }: { play: (id: string) => void; toMap: () => void }) {
  const g = useGame();
  const step = storyNext(g);
  if (!step) {
    return (
      <div class="story-done">
        <p><b>История пройдена!</b> 🌟</p>
        <p class="muted small">Можно переиграть любую сцену и собрать все звёзды.</p>
        <button class="btn teal" onClick={toMap}>Все главы</button>
      </div>
    );
  }
  const ch = chapterOf(step.id);
  const open = storyOpen(step.id, g);
  return (
    <div class={'feature' + (open ? '' : ' locked')} style={{ '--ec': step.color }}>
      <div class="feature-bar">
        <span class="feature-tile coral">📖</span>
        <b class="feature-count story-count">Глава {chapterNo(step)} · {sceneNo(step)}/{ch.steps.length}</b>
        <span class="feature-tile gift scene-tile">{step.emoji}</span>
      </div>
      <div class="feature-img" style={{ '--bg': eventBg(step.bg) }} onClick={() => { if (open) play(step.id); }}>
        <Doll class="feature-model" look={g.look} outfit={g.outfit} view={FIGURE_VIEW} />
      </div>
      <div class="feature-body">
        <b class="feature-name">{step.name}</b>
        <small class="muted story-text">{step.text}</small>
        <DressCode tags={step.tags} label />
        <button class="btn primary" disabled={!open} onClick={() => play(step.id)}>
          {open ? 'Играть' : `Глава откроется на ${ch.level} уровне`}
        </button>
        <button class="link" onClick={toMap}>Все главы</button>
      </div>
    </div>
  );
}

/* ---------- all chapters ---------- */

export function StoryMap({ play }: { play: (id: string) => void }) {
  const g = useGame();
  const next = storyNext(g);
  return (
    <div class="screen list story-map">
      <h1 class="title">История</h1>
      {CHAPTERS.map((ch, ci) => {
        const stars = ch.steps.reduce((a, st) => a + (g.story[st.id] ?? 0), 0);
        const locked = g.level < ch.level;
        return (
          <section class={'panel chapter' + (locked ? ' locked' : '')}>
            <p class="chapter-no">Глава {ci + 1}</p>
            <h2 class="panel-title">{ch.name}</h2>
            <p class="chapter-meta">
              {locked ? <>🔒 Откроется на {ch.level} уровне</> : <>★ {stars} / {ch.steps.length * 3}</>}
            </p>
            {ch.steps.map((st) => {
              const best = g.story[st.id] ?? 0;
              const open = storyOpen(st.id, g);
              const current = next?.id === st.id && open;
              return (
                <button
                  class={'scene-row' + (current ? ' current' : '') + (best ? ' done' : '') + (open ? '' : ' closed')}
                  disabled={!open} onClick={() => play(st.id)}
                >
                  <span class="scene-icon">{open ? st.emoji : '🔒'}</span>
                  <span class="shop-info">
                    <b>{st.name}</b>
                    <DressCode tags={st.tags} />
                  </span>
                  {best ? <Stars3 n={best} /> : current ? <span class="btn primary mini">Играть</span> : null}
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

/* ---------- one scene: the story text, then the fitting room ---------- */

export function StoryScene({ stepId, play, toMap, toShops, toEvents, onLevelUp }: {
  stepId: string; play: (id: string) => void; toMap: () => void; toShops: () => void; toEvents: () => void;
  onLevelUp: (lu: LevelUp) => void;
}) {
  const g = useGame();
  const step = stepById(stepId)!;
  const [intro, setIntro] = useState(true);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [hint, setHint] = useState('');
  const idx = STORY_STEPS.indexOf(step);
  const after = STORY_STEPS[idx + 1];
  const pct = Math.round(dressCodeMatch(g.outfit, step.tags).total * 100);

  useEffect(() => { setIntro(true); setResult(null); }, [stepId]);

  const flash = (msg: string) => { setHint(msg); setTimeout(() => setHint((h) => (h === msg ? '' : h)), 2000); };
  const show = () => {
    const r = playStory(stepId);
    if (r === 'clothes') return flash('Надень платье или верх с низом');
    if (r === 'locked') return flash('Эта сцена пока закрыта');
    setResult(r);
    if (r.levelUp) onLevelUp(r.levelUp);
  };

  return (
    <>
      <WardrobeScreen
        event={theme(step)}
        footer={
          <div class="fit-footer">
            {hint && <div class="toast">{hint}</div>}
            <button class="btn primary" onClick={show}>Показать образ <span class="cost">{pct}%</span></button>
          </div>
        }
      />
      {intro && (
        <Modal onClose={() => setIntro(false)}>
          <div class="scene-pic" style={{ '--bg': eventBg(step.bg) }}><span>{step.emoji}</span></div>
          <p class="muted small">Глава {chapterNo(step)} · сцена {sceneNo(step)}</p>
          <h2>{step.name}</h2>
          <p class="scene-text">{step.text}</p>
          <DressCode tags={step.tags} label />
          <p class="muted small">Чтобы пройти, нужно попасть в дресс-код хотя бы на {Math.round(step.need * 100)}%</p>
          <button class="btn primary" onClick={() => setIntro(false)}>Собрать образ</button>
        </Modal>
      )}
      {result && (
        <Modal>
          {result.stars > 0 ? (
            <>
              <h2>{['', 'Неплохо!', 'Отлично!', 'Идеально!'][result.stars]}</h2>
              <Stars3 n={result.stars} animate />
              <p>Дресс-код: <b>{Math.round(result.match * 100)}%</b></p>
              <div class="confirm-doll"><Doll class="doll" look={g.look} outfit={g.outfit} /></div>
              {(result.reward.coins > 0 || result.reward.gems > 0) && (
                <ul class="rewards inline">
                  {result.reward.coins > 0 && <li>🪙 +{fmt(result.reward.coins)}</li>}
                  {result.reward.xp > 0 && <li>⭐ +{result.reward.xp} опыта</li>}
                  {result.reward.gems > 0 && <li>💎 +{result.reward.gems}</li>}
                  {result.reward.energy > 0 && <li>☕ +{result.reward.energy}</li>}
                </ul>
              )}
              {result.stars < 3 && <p class="muted small">Дресс-код на 100% — три звезды и бонус 💎</p>}
              {after && storyOpen(after.id)
                ? <button class="btn primary" onClick={() => play(after.id)}>Дальше: {after.name}</button>
                : after
                  ? <>
                      <p class="muted small">Глава «{chapterOf(after.id).name}» откроется на {chapterOf(after.id).level} уровне. Опыт дают ивенты и покупки.</p>
                      <button class="btn primary" onClick={g.level >= 2 ? toEvents : toShops}>{g.level >= 2 ? 'К ивентам' : 'В магазины'}</button>
                    </>
                  : <p><b>Ты прошла всю историю! 🌟</b></p>}
              {result.stars < 3 && <button class="btn" onClick={() => setResult(null)}>Улучшить образ</button>}
              <button class="btn" onClick={toMap}>Все главы</button>
            </>
          ) : (
            <>
              <div class="burst">🤔</div>
              <h2>Не совсем в тему</h2>
              <p>Дресс-код: <b>{Math.round(result.match * 100)}%</b>, нужно от {Math.round(step.need * 100)}%</p>
              <p class="muted small">Подходят вещи с иконками дресс-кода. Не хватает — загляни в магазины.</p>
              <button class="btn primary" onClick={() => setResult(null)}>Попробовать ещё</button>
              <button class="btn" onClick={toShops}>В магазины</button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
