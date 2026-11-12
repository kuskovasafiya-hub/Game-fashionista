import type { Tag } from './catalog';

/**
 * The story: a long chain of scenes played one after another, always available,
 * no tickets and no waiting. Each scene has a dress code; the look is judged at once
 * by how well it fits (the same dress code match as events).
 */
export interface StoryStep {
  id: string;
  name: string;
  emoji: string;
  /** Event background used as the scene (public/art/bg-<bg>.webp). */
  bg: string;
  color: string;
  tags: Tag[];
  /** What happens in the scene, shown before dressing. */
  text: string;
  /** Dress code match needed to pass, 0..1. */
  need: number;
}

export interface Chapter {
  name: string;
  level: number;
  steps: StoryStep[];
}

type Spec = [name: string, emoji: string, bg: string, tags: Tag[], text: string];

const BG_COLOR: Record<string, string> = {
  park: '#7BC67E', winter: '#7FB7F0', date: '#FF8FB1', beach: '#FFC15E', party: '#C77DFF', resort: '#00BBA7',
  interview: '#8E9AAF', theater: '#B5838D', gallery: '#F7C548', gala: '#9B5DE5', marathon: '#00A6FB',
};

function chapter(n: number, name: string, level: number, need: number, specs: Spec[]): Chapter {
  return {
    name, level,
    steps: specs.map(([sname, emoji, bg, tags, text], i) => ({
      id: `${n}.${i + 1}`, name: sname, emoji, bg, color: BG_COLOR[bg], tags, text,
      // the chapter finale asks a bit more
      need: i === specs.length - 1 ? Math.min(0.8, need + 0.1) : need,
    })),
  };
}

export const CHAPTERS: Chapter[] = [
  chapter(1, 'Новенькая в городе', 1, 0.5, [
    ['Первый день', '🌳', 'park', ['casual'],
      'Ты только что переехала в большой город с одним чемоданом и мечтой о мире моды. Для начала — прогулка по парку: удобно и мило.'],
    ['Кофе с соседкой', '☕', 'date', ['casual'],
      'Соседка Лиза стучится в дверь: «Пойдём на кофе? Покажу лучшую кофейню района!» Никакого дресс-кода, просто будь собой.'],
    ['Выходные у моря', '🏖️', 'beach', ['beach', 'casual'],
      'Лиза везёт тебя на пляж за город. Солнце, песок и лёгкие вещи — самое то.'],
    ['Вечеринка знакомств', '🎉', 'party', ['party'],
      'Друзья Лизы устраивают вечеринку. Нужно что-то яркое: здесь все рассматривают, кто как одет. Загляни в «Городской» за обновками.'],
    ['Случайное фото', '📸', 'park', ['casual', 'party'],
      'Модный блогер Мия замечает тебя в парке: «Можно тебя сфотографировать? У тебя классный стиль!» Покажи, на что способна.'],
  ]),
  chapter(2, 'Первые подписчики', 2, 0.55, [
    ['Зимняя ярмарка', '❄️', 'winter', ['winter', 'casual'],
      'Фото от Мии разлетелось — у тебя первые подписчики! Мия зовёт на зимнюю ярмарку снять общий ролик. Тепло, но стильно.'],
    ['Свидание вслепую', '💕', 'date', ['casual', 'party'],
      'Лиза устроила тебе свидание с другом детства. Мило, но не слишком официально.'],
    ['Пляжная съёмка', '🌊', 'beach', ['beach'],
      'Небольшой бренд купальников предлагает тебе первую съёмку. Главное — лёгкость и солнце.'],
    ['Закат на курорте', '🌅', 'resort', ['beach', 'evening'],
      'После съёмки — ужин на террасе у моря. Нужен образ, который подойдёт и к песку, и к ресторану.'],
    ['День рождения Мии', '🎂', 'party', ['party'],
      'Мия празднует день рождения, и придут все модные блогеры города. Это твой шанс запомниться!'],
  ]),
  chapter(3, 'Работа мечты', 3, 0.6, [
    ['Собеседование', '💼', 'interview', ['office'],
      'Модный журнал ищет ассистента стилиста. Первое впечатление решает всё — строго и аккуратно.'],
    ['Первый рабочий день', '🗂️', 'interview', ['office', 'casual'],
      'Тебя взяли! Главный редактор Вера Андреевна строгая, но справедливая. Деловой стиль, в котором удобно бегать по офису.'],
    ['Обед с редактором', '🥗', 'date', ['office'],
      'Вера Андреевна приглашает на обед — обсудить твои идеи для рубрики. Покажи, что ты серьёзный стилист.'],
    ['Премьера в театре', '🎭', 'theater', ['evening', 'office'],
      'Редакция получила приглашения на премьеру. Элегантно и со вкусом — тебя будут фотографировать для журнала.'],
    ['Своя рубрика', '📰', 'gallery', ['office', 'party'],
      'Тебе доверили собственную рубрику! Презентация номера в галерее: деловой образ с изюминкой.'],
  ]),
  chapter(4, 'Светская жизнь', 5, 0.6, [
    ['Открытие галереи', '🖼️', 'gallery', ['party', 'evening'],
      'Модная публика, художники и украшения напоказ. Мия шепчет: «Здесь все знаменитости, держись уверенно!»'],
    ['Коктейль у бассейна', '🍹', 'resort', ['beach', 'party'],
      'Известный дизайнер устраивает коктейль на курорте. Легко, ярко и немного дерзко.'],
    ['Ночной клуб', '🪩', 'party', ['party'],
      'Закрытая вечеринка в самом модном клубе. Блеск, каблуки и смелые аксессуары.'],
    ['Благотворительный вечер', '🕯️', 'theater', ['evening'],
      'Вера Андреевна берёт тебя на благотворительный вечер. Классика и сдержанная роскошь.'],
    ['Зимний маскарад', '🎆', 'winter', ['winter', 'evening'],
      'Новогодний маскарад под открытым небом. Тёплое — но вечернее. Справишься?'],
  ]),
  chapter(5, 'Звезда сезона', 7, 0.65, [
    ['Приглашение на бал', '💌', 'gallery', ['evening'],
      'В почте — золотой конверт: приглашение на главный бал сезона! Сначала примерка в шоуруме.'],
    ['Ужин у моря', '🌙', 'resort', ['evening'],
      'Дизайнер Арман зовёт на ужин обсудить сотрудничество. Вечерний образ под шум волн.'],
    ['Премьера фильма', '🎬', 'theater', ['evening', 'party'],
      'Красная дорожка и десятки камер. Каждый твой образ теперь обсуждают в сети.'],
    ['Обложка журнала', '✨', 'gallery', ['evening', 'party'],
      'Вера Андреевна решила: ты — лицо следующего номера! Самый эффектный образ.'],
    ['Большой бал', '👑', 'gala', ['evening'],
      'Тот самый бал. Самые роскошные платья сезона — и ты среди них.'],
  ]),
  chapter(6, 'Свой бренд', 10, 0.65, [
    ['Утренняя пробежка', '🏃‍♀️', 'park', ['sport'],
      'Вы с Мией решили запустить свою коллекцию одежды. Но сначала — новая привычка: бег по утрам.'],
    ['Фитнес-марафон', '🥇', 'marathon', ['sport'],
      'Спортивный бренд зовёт тебя лицом своего марафона. Удобно, ярко, спортивно.'],
    ['Йога на пляже', '🧘‍♀️', 'beach', ['sport', 'beach'],
      'Съёмка для коллекции: йога на рассвете у моря.'],
    ['Показ коллекции', '🧵', 'gallery', ['sport', 'party'],
      'Первый показ вашей с Мией коллекции! Спортивный шик для вечеринки.'],
    ['Неделя моды', '🌟', 'gala', ['evening', 'party'],
      'Финал истории: ты открываешь Неделю моды. Покажи всё, чему научилась.'],
  ]),
];

export const STORY_STEPS: StoryStep[] = CHAPTERS.flatMap((c) => c.steps);
export const chapterOf = (stepId: string) => CHAPTERS[Number(stepId.split('.')[0]) - 1];
export const stepById = (id: string) => STORY_STEPS.find((s) => s.id === id);

/** Stars for a dress code match: pass, 80%, all of it. */
export function storyStars(step: StoryStep, match: number): number {
  if (match < step.need - 1e-9) return 0;
  return match >= 0.999 ? 3 : match >= 0.8 ? 2 : 1;
}

export interface StoryReward { coins: number; xp: number; gems: number; energy: number }

/** First pass pays coins and XP, growing with the chapter; the first three stars add a crystal and coffee. */
export function storyReward(step: StoryStep, firstPass: boolean, firstThree: boolean): StoryReward {
  const ch = Number(step.id.split('.')[0]);
  return {
    coins: firstPass ? 60 + 40 * ch : 0,
    xp: firstPass ? 20 + 8 * ch : 0,
    gems: firstThree ? 1 : 0,
    energy: firstThree ? 2 : 0,
  };
}
