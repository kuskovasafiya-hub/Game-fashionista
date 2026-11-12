import { eventByKey, voteEvents, type Theme } from './events';
import { STORY_STEPS, chapterOf, stepById } from './story';

/**
 * Something the player votes on: a running event she sent a look to, or a story scene
 * she has passed. Story keys are `story:<step id>` so they never clash with event keys.
 */
export interface VoteTarget extends Theme {
  key: string;
  about: string;
  /** Events close; story scenes are always there. */
  end?: number;
}

/** Only the latest passed scenes go on vote, so running events still come up often. */
export const STORY_ON_VOTE = 3;

const storyTarget = (stepId: string): VoteTarget | null => {
  const st = stepById(stepId);
  if (!st) return null;
  return {
    key: 'story:' + st.id, id: st.bg, name: st.name, emoji: st.emoji, color: st.color, tags: st.tags,
    about: `История · глава «${chapterOf(st.id).name}»`,
  };
};

export function voteTargetByKey(key: string): VoteTarget | null {
  if (key.startsWith('story:')) return storyTarget(key.slice(6));
  const ev = eventByKey(key);
  return ev && { key: ev.key, id: ev.id, name: ev.name, emoji: ev.emoji, color: ev.color, tags: ev.tags, about: ev.about, end: ev.end };
}

/** Events first (they close), then the latest passed story scenes. */
export function voteTargets(enteredKeys: string[], story: Record<string, number>, now = Date.now()): VoteTarget[] {
  const events = voteEvents(enteredKeys, now).map((e) => voteTargetByKey(e.key)!);
  const scenes = STORY_STEPS.filter((s) => story[s.id] > 0).slice(-STORY_ON_VOTE).reverse()
    .map((s) => storyTarget(s.id)!);
  return [...events, ...scenes];
}

/** One target per voting round, in turn; a finished round moves on to the next. */
export const voteTargetFor = (list: VoteTarget[], round: number): VoteTarget | null =>
  list.length ? list[round % list.length] : null;
