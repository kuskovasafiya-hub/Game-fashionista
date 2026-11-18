import { useEffect, useState } from 'preact/hooks';
import { Doll, FIGURE_VIEW } from '../art/Doll';
import { STORY_RESULT_MS, dressCodeMatch, starTier, type Theme } from '../game/events';
import { CHAPTERS, STORY_STEPS, chapterOf, stepById, type StoryStep } from '../game/story';
import { eventsOpen, playStory, storyNext, storyOpen, useGame, type LevelUp, type StoryResult } from '../game/store';
import { Coin, DressCode, Modal, TagIcon, fmt } from './common';
import { Stars, eventBg } from './EventsScreen';
import { flyRewards } from './fx';
import { WardrobeScreen, useSceneBackground } from './WardrobeScreen';

const sceneNo = (st: StoryStep) => Number(st.id.split('.')[1]);
const chapterNo = (st: StoryStep) => Number(st.id.split('.')[0]);
const theme = (st: StoryStep): Theme => ({ id: st.bg, name: st.name, emoji: st.emoji, color: st.color, tags: st.tags });


/* ---------- home card: the next scene, in one compact row ---------- */

export function StoryCard({ play, toMap, pulse }: { play: (id: string) => void; toMap: () => void; pulse?: boolean }) {
  const g = useGame();
  const step = storyNext(g);
  if (!step) {
    return (
      <div class="story-strip">
        <span class="ss-pic done">🌟</span>
        <span class="ss-info">
          <b class="ss-name">История пройдена!</b>
          <small class="muted">Новые главы — скоро</small>
        </span>
        <button class="btn teal ss-play" onClick={toMap}>Главы</button>
      </div>
    );
  }
  const ch = chapterOf(step.id);
  const open = storyOpen(step.id, g);
  return (
    <div class={'story-strip' + (open ? '' : ' locked')} style={{ '--ec': step.color }}>
      <button class="ss-pic" style={{ '--bg': eventBg(step.bg) }} onClick={() => { if (open) play(step.id); }} aria-label={step.name}>
        <span>{step.emoji}</span>
      </button>
      <span class="ss-info">
        <button class="ss-chapter" onClick={toMap}>📖 Глава {chapterNo(step)} · {sceneNo(step)}/{ch.steps.length} ›</button>
        <b class="ss-name">{step.name}</b>
        <span class="ss-tags">{step.tags.map((t) => <TagIcon tag={t} />)}</span>
      </span>
      {open
        ? (
          <button class={'btn primary ss-play' + (pulse ? ' coach-pulse' : '')} data-coach="story" onClick={() => play(step.id)}>
            Играть
          </button>
        )
        : <span class="ss-lock">🔒<small>ур. {ch.level}</small></span>}
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
        const stars = Math.round(ch.steps.reduce((a, st) => a + (g.story[st.id] ?? 0), 0) * 10) / 10;
        const locked = g.level < ch.level;
        return (
          <section class={'panel chapter' + (locked ? ' locked' : '')}>
            <p class="chapter-no">Глава {ci + 1}</p>
            <h2 class="panel-title">{ch.name}</h2>
            <p class="chapter-meta">
              {locked ? <>🔒 Откроется на {ch.level} уровне</> : <>★ {String(stars).replace('.', ',')} / {ch.steps.length * 5}</>}
            </p>
            {ch.steps.map((st) => {
              const best = g.story[st.id] ?? 0;
              const open = storyOpen(st.id, g);
              const current = next?.id === st.id && open;
              return (
                <button
                  class={'scene-row' + (current ? ' current' : '') + (best ? ' done' : '') + (open ? '' : ' closed')}
                  disabled={!open || best > 0} onClick={() => play(st.id)}
                >
                  <span class="scene-icon">{open ? st.emoji : '🔒'}</span>
                  <span class="shop-info">
                    <b>{st.name}</b>
                    <DressCode tags={st.tags} />
                  </span>
                  {best ? <Stars n={best} label /> : current ? <span class="btn primary mini">Играть</span> : null}
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
    if (r === 'done') return flash('В эту сцену образ уже отправлен');
    setResult(r);
    // a level-up waits until the stars have landed and the rewards have flown into the wallet
    const lu = r.levelUp;
    if (lu) setTimeout(() => onLevelUp(lu), 1900);
  };

  return (
    <>
      {result ? (
        <SceneResult
          step={step} result={result} after={after} play={play} toMap={toMap} toShops={toShops} toEvents={toEvents}
          retry={() => setResult(null)}
        />
      ) : <WardrobeScreen
        event={theme(step)}
        footer={
          <div class="fit-footer">
            {hint && <div class="toast">{hint}</div>}
            <button class="btn primary" onClick={show}>Отправить образ <span class="cost">{pct}%</span></button>
          </div>
        }
      />}
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
    </>
  );
}

/**
 * The scene result: its own screen (the fitting room is gone) on the scene picture —
 * a title card, the model in the scene and the buttons at the bottom.
 */
function SceneResult({ step, result, after, play, toMap, toShops, toEvents, retry }: {
  step: StoryStep; result: StoryResult; after?: StoryStep; play: (id: string) => void; toMap: () => void;
  toShops: () => void; toEvents: () => void; retry: () => void;
}) {
  const g = useGame();
  useSceneBackground(step.bg);
  // the rewards fly into the wallet once the stars have landed
  useEffect(() => { if (result.stars > 0) flyRewards(700); }, []);
  return (
    <div class="screen scene-result">
      {result.stars > 0 ? (
        <>
          <div class="sr-head">
            <div class="sr-title">
              <h2>{['', '', 'Неплохо!', 'Хорошо!', 'Отлично!', 'Идеально!'][starTier(result.stars)]}</h2>
              <Stars n={result.stars} animate label />
            </div>
            <ul class="rewards inline">
              <li>Дресс-код <b>{Math.round(result.match * 100)}%</b></li>
              {result.reward.coins > 0 && <li data-reward="coins"><Coin /> +{fmt(result.reward.coins)}</li>}
              {result.reward.xp > 0 && <li data-reward="xp">⭐ +{result.reward.xp}</li>}
              {result.reward.gems > 0 && <li data-reward="gems">💎 +{result.reward.gems}</li>}
              {result.reward.energy > 0 && <li data-reward="energy">☕ +{result.reward.energy}</li>}
            </ul>
            <p class="muted small">🗳 Образ отправлен на голосование — итоги через {Math.round(STORY_RESULT_MS / 60000)} мин в «Моих образах»</p>
          </div>
          <div class="sr-doll"><Doll class="doll" look={g.look} outfit={g.outfit} /></div>
          <div class="sr-foot">
            {after && storyOpen(after.id)
              ? <button class="btn primary" onClick={() => play(after.id)}>Дальше: {after.name}</button>
              : after
                ? <>
                    <p class="muted small">Глава «{chapterOf(after.id).name}» откроется на {chapterOf(after.id).level} уровне. Опыт дают ивенты и покупки.</p>
                    <button class="btn primary" onClick={eventsOpen(g) ? toEvents : toShops}>{eventsOpen(g) ? 'К ивентам' : 'В магазины'}</button>
                  </>
                : <p><b>Ты прошла всю историю! 🌟</b></p>}
            <button class="btn" onClick={toMap}>Все главы</button>
          </div>
        </>
      ) : (
        <>
          <div class="sr-head">
            <h2>Не совсем в тему 🤔</h2>
            <p>Дресс-код: <b>{Math.round(result.match * 100)}%</b>, нужно от {Math.round(step.need * 100)}%</p>
          </div>
          <div class="sr-doll"><Doll class="doll" look={g.look} outfit={g.outfit} /></div>
          <div class="sr-foot">
            <p class="muted small">Подходят вещи с иконками дресс-кода. Не хватает — загляни в магазины.</p>
            <button class="btn primary" onClick={retry}>Попробовать ещё</button>
            <button class="btn" onClick={toShops}>В магазины</button>
          </div>
        </>
      )}
    </div>
  );
}
