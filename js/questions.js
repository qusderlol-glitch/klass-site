/*
 * Вопросы опроса. Каждый вопрос — отдельный модуль со своим кусочком кода.
 * Чтобы добавить вопрос, достаточно написать ещё один Engine.register({...}) —
 * остальной сайт менять не нужно.
 *
 * apply(ctx):
 *   ctx.css({...})      — поменять переменные оформления
 *   ctx.cls('имя')      — добавить класс на сайт
 *   ctx.feature('имя')  — добавить раздел (описан в features.js)
 */

// ───────────── Вопрос 1. Стиль сайта ─────────────
Engine.register({
  id: 'style',
  title: 'Какой стиль у сайта?',
  hint: 'Выбери, как сайт будет выглядеть.',
  type: 'single',
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
          '--shadow': 'none',
          '--font': '"Segoe UI", Arial, sans-serif',
          '--sat': '58%',
          '--lit': '36%',
          '--bg': '#f4f6f8',
          '--surface': '#ffffff',
          '--line': '#cdd3dc',
          '--text': '#1b2230',
          '--muted': '#59647a'
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
          '--radius': '14px',
          '--radius-sm': '10px',
          '--border': '1px solid var(--line)',
          '--shadow': '0 4px 14px rgba(25, 40, 80, 0.12)',
          '--font': '"Segoe UI", system-ui, sans-serif',
          '--sat': '72%',
          '--lit': '46%',
          '--bg': '#eef2fa',
          '--surface': '#ffffff',
          '--line': '#d6deee',
          '--text': '#1c2540',
          '--muted': '#5d6a8a'
        });
      }
    },
    {
      id: 'soft',
      label: 'Мягкий',
      desc: 'Как будто нарисовано от руки: толстые линии и весёлые формы',
      apply(ctx) {
        ctx.cls('style-soft');
        ctx.css({
          '--radius': '26px 20px 28px 18px / 20px 28px 18px 26px',
          '--radius-sm': '16px 12px 18px 10px / 12px 18px 10px 16px',
          '--border': '2.5px solid var(--ink)',
          '--shadow': '4px 5px 0 var(--ink)',
          '--font': '"Segoe Print", "Comic Sans MS", "Bradley Hand", cursive',
          '--sat': '80%',
          '--lit': '46%',
          '--bg': '#fff6e6',
          '--surface': '#fffdf8',
          '--line': '#4a3f5c',
          '--ink': '#4a3f5c',
          '--text': '#3b3150',
          '--muted': '#76698d'
        });
      }
    }
  ]
});

// ───────────── Вопрос 2. Что будет на сайте ─────────────
Engine.register({
  id: 'content',
  title: 'Что будет на сайте?',
  hint: 'Можно выбрать несколько вариантов.',
  type: 'multi',
  required: true,
  options: [
    {
      id: 'text',
      label: 'Текстовые задания',
      desc: 'Прочитал — написал ответ',
      apply(ctx) { ctx.feature('text'); }
    },
    {
      id: 'voice',
      label: 'Голосовые задания',
      desc: 'Записать ответ голосом (удобно для контрольных)',
      apply(ctx) { ctx.feature('voice'); }
    },
    {
      id: 'test',
      label: 'Тесты и контрольные',
      desc: 'Вопросы с вариантами ответа и таймером',
      apply(ctx) { ctx.feature('test'); }
    },
    {
      id: 'game',
      label: 'Игры на перемене',
      desc: 'Небольшие игры, чтобы отдохнуть',
      apply(ctx) { ctx.feature('game'); }
    }
  ]
});

// ───────────── Вопрос 3. Главный цвет ─────────────
Engine.register({
  id: 'color',
  title: 'Какой главный цвет?',
  hint: 'Он будет у кнопок, заголовков и значков.',
  type: 'single',
  options: [
    { id: 'blue',   label: 'Синий',      swatch: '#2563eb', desc: 'Спокойный и деловой', apply(ctx) { ctx.css({ '--hue': '218' }); } },
    { id: 'green',  label: 'Зелёный',    swatch: '#16a34a', desc: 'Свежий и мягкий для глаз', apply(ctx) { ctx.css({ '--hue': '145', '--shift': '10%' }); } },
    { id: 'orange', label: 'Оранжевый',  swatch: '#ea7a12', desc: 'Тёплый и бодрый', apply(ctx) { ctx.css({ '--hue': '28', '--shift': '3%' }); } },
    { id: 'purple', label: 'Фиолетовый', swatch: '#7c3aed', desc: 'Яркий и необычный', apply(ctx) { ctx.css({ '--hue': '268' }); } }
  ]
});

// ───────────── Вопрос 4. Делаем или нет? ─────────────
// Этот вопрос ничего не меняет на сайте — он нужен, чтобы узнать мнение.
Engine.register({
  id: 'vote',
  title: 'Делаем такой сайт для нашего класса?',
  hint: 'Честный ответ — самый полезный.',
  type: 'single',
  options: [
    { id: 'yes',     label: 'Да, делаем!',          desc: 'Мне нравится, пусть будет' },
    { id: 'changes', label: 'Да, но с изменениями', desc: 'Идея хорошая, но кое-что поменять' },
    { id: 'no',      label: 'Пока не нужно',        desc: 'Лучше без сайта' }
  ]
});
