/*
 * Вопросы анкеты. Каждый вопрос — отдельный модуль со своими кусочками кода.
 * Чтобы добавить вопрос, достаточно дописать ещё один Engine.register({...}) —
 * анкета и сайт подхватят его сами.
 *
 * apply(ctx):
 *   ctx.css({...})      — поменять переменные оформления
 *   ctx.cls('имя')      — добавить класс на сайт
 *   ctx.feature('имя')  — включить раздел сайта
 *
 * default — что будет на сайте, если вопрос пропущен.
 */

// ───────────── 1. Стиль ─────────────
Engine.register({
  id: 'style',
  title: 'Какой стиль у сайта?',
  hint: 'Отметь один вариант.',
  type: 'single',
  default: 'strict',
  options: [
    {
      id: 'strict',
      label: 'Строгий',
      desc: 'Чуть скруглённые углы, тонкие линии, ничего лишнего',
      apply(ctx) {
        ctx.cls('style-strict');
        ctx.css({
          '--radius': '6px',
          '--radius-sm': '4px',
          '--border': '1px solid var(--line)',
          '--shadow': '0 1px 2px rgba(15, 25, 45, 0.06)',
          '--font': '"PT Sans", "Segoe UI", Arial, sans-serif',
          '--font-head': '"PT Sans", "Segoe UI", Arial, sans-serif',
          '--sat': '60%',
          '--lit': '38%',
          '--bg': '#f2f4f7',
          '--surface': '#ffffff',
          '--surface-2': '#f7f8fa',
          '--line': '#d3d9e2',
          '--text': '#18202e',
          '--muted': '#596478'
        });
      }
    },
    {
      id: 'medium',
      label: 'Средний',
      desc: 'Закруглённые углы и мягкие тени, как в приложениях',
      apply(ctx) {
        ctx.cls('style-medium');
        ctx.css({
          '--radius': '16px',
          '--radius-sm': '10px',
          '--border': '1px solid var(--line)',
          '--shadow': '0 6px 20px rgba(20, 35, 80, 0.09)',
          '--font': '"Rubik", "Segoe UI", system-ui, sans-serif',
          '--font-head': '"Rubik", "Segoe UI", system-ui, sans-serif',
          '--sat': '70%',
          '--lit': '46%',
          '--bg': '#edf1f9',
          '--surface': '#ffffff',
          '--surface-2': '#f5f7fc',
          '--line': '#dbe2ef',
          '--text': '#1b2440',
          '--muted': '#5c6989'
        });
      }
    },
    {
      id: 'soft',
      label: 'Мягкий',
      desc: 'Как будто нарисовано от руки: толстые линии, весёлые формы',
      apply(ctx) {
        ctx.cls('style-soft');
        ctx.css({
          '--radius': '22px 16px 24px 14px / 16px 24px 14px 22px',
          '--radius-sm': '14px 10px 16px 9px / 10px 16px 9px 14px',
          '--border': '2.5px solid var(--ink)',
          '--shadow': '4px 4px 0 var(--ink-shadow)',
          '--font': '"Neucha", "Segoe Print", "Comic Sans MS", cursive',
          '--font-head': '"Neucha", "Segoe Print", "Comic Sans MS", cursive',
          '--sat': '78%',
          '--lit': '46%',
          '--bg': '#fff5e6',
          '--surface': '#fffdf7',
          '--surface-2': '#fff8ec',
          '--line': '#43385a',
          '--ink': '#43385a',
          '--ink-shadow': '#43385a',
          '--text': '#342a48',
          '--muted': '#6d6185'
        });
      }
    }
  ]
});

// ───────────── 2. Разделы ─────────────
Engine.register({
  id: 'content',
  title: 'Что будет на сайте?',
  hint: 'Можно отметить несколько вариантов.',
  type: 'multi',
  default: ['text', 'voice', 'test', 'game', 'typing'],
  options: [
    { id: 'text',   label: 'Текстовые задания',      desc: 'Прочитал задание — написал ответ',                apply(ctx) { ctx.feature('text'); } },
    { id: 'voice',  label: 'Голосовые задания',      desc: 'Ответ голосом — и в заданиях, и в контрольных',   apply(ctx) { ctx.feature('voice'); } },
    { id: 'test',   label: 'Контрольные и тесты',    desc: 'Вопросы с вариантами, таймер и оценка',           apply(ctx) { ctx.feature('test'); } },
    { id: 'game',   label: 'Игры на перемене',       desc: '«Найди пару» и «Правда или ложь»',                apply(ctx) { ctx.feature('game'); } },
    { id: 'typing', label: 'Клавиатурный тренажёр',  desc: 'Учимся печатать быстро и без ошибок',             apply(ctx) { ctx.feature('typing'); } }
  ]
});

// ───────────── 3. Цвет ─────────────
Engine.register({
  id: 'color',
  title: 'Какой главный цвет?',
  hint: 'Он будет у кнопок, заголовков и значков.',
  type: 'single',
  default: 'blue',
  options: [
    { id: 'blue',   label: 'Синий',      swatch: '#2453b5', desc: 'Спокойный и деловой',       apply(ctx) { ctx.css({ '--hue': '218' }); } },
    { id: 'green',  label: 'Зелёный',    swatch: '#1f8a4c', desc: 'Свежий и мягкий для глаз',  apply(ctx) { ctx.css({ '--hue': '145', '--shift': '10%' }); } },
    { id: 'orange', label: 'Оранжевый',  swatch: '#c2620f', desc: 'Тёплый и бодрый',           apply(ctx) { ctx.css({ '--hue': '26', '--shift': '4%' }); } },
    { id: 'purple', label: 'Фиолетовый', swatch: '#6d35d6', desc: 'Яркий и необычный',         apply(ctx) { ctx.css({ '--hue': '264' }); } }
  ]
});

// ───────────── 4. Светлая или тёмная тема ─────────────
Engine.register({
  id: 'mode',
  title: 'Светлая или тёмная тема?',
  hint: 'Тёмная меньше слепит, если в классе выключен свет.',
  type: 'single',
  default: 'light',
  options: [
    { id: 'light', label: 'Светлая',             desc: 'Светлый фон, тёмный текст',              apply(ctx) { ctx.cls('mode-light'); } },
    { id: 'dark',  label: 'Тёмная',              desc: 'Тёмный фон, светлый текст',              apply(ctx) { ctx.cls('mode-dark'); } },
    { id: 'auto',  label: 'Как на компьютере',   desc: 'Сайт сам подстроится под настройки ПК',  apply(ctx) { ctx.cls('mode-auto'); } }
  ]
});

// ───────────── 5. Размер текста ─────────────
Engine.register({
  id: 'size',
  title: 'Какого размера текст?',
  hint: 'Крупный текст удобнее читать с дальних парт и на маленьких мониторах.',
  type: 'single',
  default: 'normal',
  options: [
    { id: 'normal', label: 'Обычный',       desc: 'Как на большинстве сайтов', apply(ctx) { ctx.css({ '--fs': '16px' }); } },
    { id: 'large',  label: 'Крупный',       desc: 'Чуть больше обычного',      apply(ctx) { ctx.css({ '--fs': '18px' }); } },
    { id: 'xlarge', label: 'Очень крупный', desc: 'Видно даже издалека',       apply(ctx) { ctx.css({ '--fs': '20px' }); } }
  ]
});

// ───────────── 6. Делаем или нет? ─────────────
// Этот вопрос ничего не меняет на сайте — он нужен, чтобы узнать мнение.
Engine.register({
  id: 'vote',
  title: 'Делаем такой сайт для нашего класса?',
  hint: 'Честный ответ — самый полезный.',
  type: 'single',
  options: [
    { id: 'yes',     label: 'Да, делаем!',          desc: 'Мне нравится, пусть будет' },
    { id: 'changes', label: 'Да, но с изменениями', desc: 'Идея хорошая, но кое-что поменять (напиши в конце)' },
    { id: 'no',      label: 'Пока не нужно',        desc: 'Лучше без сайта' }
  ]
});
