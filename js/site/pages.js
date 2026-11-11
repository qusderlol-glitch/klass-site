/* Страницы сайта. Каждая функция возвращает { el, destroy?, onConfig? }. */
(function () {
  const { h, icon, esc, fmtTime, fmtDate, plural, grade } = UI;
  const has = (f) => Engine.result && Engine.result.has(f);

  const TYPE = {
    text: { label: 'Текст', icon: 'pencil' },
    voice: { label: 'Голос', icon: 'mic' }
  };
  const STATUS = {
    new: { label: 'Не начато', cls: '' },
    draft: { label: 'Черновик', cls: 'badge--warn' },
    done: { label: 'Сдано', cls: 'badge--ok' }
  };

  const SECTIONS = [
    { id: 'tasks', href: '#/tasks', title: 'Задания', icon: 'pencil', desc: 'Письменные и голосовые задания', on: () => has('text') || has('voice') },
    { id: 'tests', href: '#/tests', title: 'Контрольные', icon: 'tests', desc: 'Тесты с таймером и оценкой', on: () => has('test') },
    { id: 'games', href: '#/games', title: 'Игры', icon: 'game', desc: 'Отдохнуть на перемене', on: () => has('game') },
    { id: 'typing', href: '#/typing', title: 'Тренажёр', icon: 'keyboard', desc: 'Печатаем быстро и без ошибок', on: () => has('typing') },
    { id: 'results', href: '#/results', title: 'Мои результаты', icon: 'chart', desc: 'Оценки и рекорды', on: () => true }
  ];

  const tasksOn = () => DATA.tasks.filter((t) => has(t.type));
  const testQuestions = (test) => test.questions.filter((q) => q.type !== 'voice' || has('voice'));
  const backLink = (href, text) => `<a class="back" href="${href}">${icon('back')}<span>${text}</span></a>`;

  const Pages = {
    sections: SECTIONS,

    // ───────── Главная ─────────
    home() {
      const name = Store.name;
      const tasks = tasksOn();
      const doneTasks = tasks.filter((t) => Store.task(t.id).status === 'done').length;
      const marks = DATA.tests.map((t) => Store.test(t.id)).filter(Boolean).map((r) => r.best.mark);
      const typing = Store.typingBest();
      const firstStep = tasks[0] ? '#/task/' + tasks[0].id : has('test') ? '#/tests' : SECTIONS.find((s) => s.on()).href;

      const el = h(`
        <div class="page">
          <section class="hero card">
            <div>
              <p class="hero__date">${UI.today()}</p>
              <h1>${name ? 'Привет, ' + esc(name) + '!' : 'Привет!'}</h1>
              <p class="muted">${name ? 'Рады видеть тебя в компьютерном классе.' : 'Добро пожаловать в компьютерный класс. Как тебя зовут?'}</p>
              ${name ? '' : `
                <form class="hero__form" data-name-form>
                  <input class="input" type="text" maxlength="40" placeholder="Твоё имя" aria-label="Твоё имя" data-name>
                  <button class="btn" type="submit">Сохранить</button>
                </form>`}
            </div>
            <div class="hero__art" aria-hidden="true">${icon('monitor')}</div>
          </section>

          <div class="grid grid--home">
            <section class="card lesson">
              <p class="eyebrow">${icon('book')} Урок сегодня</p>
              <h2>${esc(DATA.lesson.topic)}</h2>
              <p class="muted">На уроке мы:</p>
              <ul class="ticks">${DATA.lesson.goals.map((g) => `<li>${icon('check')}<span>${esc(g)}</span></li>`).join('')}</ul>
              <a class="btn" href="${firstStep}">Начать урок</a>
            </section>

            <section class="card">
              <p class="eyebrow">${icon('chart')} Мой прогресс</p>
              <div class="stats">
                ${tasks.length ? `<div class="stat"><b>${doneTasks}<small> из ${tasks.length}</small></b><span>заданий сдано</span>
                  <span class="meter"><span style="width:${Math.round((doneTasks / tasks.length) * 100)}%"></span></span></div>` : ''}
                ${has('test') ? `<div class="stat"><b>${marks.length ? Math.max(...marks) : '—'}</b><span>лучшая оценка за контрольную</span></div>` : ''}
                ${has('typing') ? `<div class="stat"><b>${typing ? typing.cpm : '—'}</b><span>зн/мин в тренажёре</span></div>` : ''}
              </div>
              <a class="link" href="#/results">Все результаты →</a>
            </section>

            <section class="card">
              <p class="eyebrow">${icon('megaphone')} Объявления</p>
              <ul class="news">
                ${DATA.announcements.map((a) => `
                  <li><span class="badge">${esc(a.date)}</span><div><b>${esc(a.title)}</b><p class="muted">${esc(a.text)}</p></div></li>`).join('')}
              </ul>
            </section>
          </div>

          <h2 class="section-title">Разделы</h2>
          <div class="tiles">
            ${SECTIONS.filter((s) => s.on()).map((s) => `
              <a class="tile" href="${s.href}">
                <span class="tile__icon">${icon(s.icon)}</span>
                <span class="tile__title">${s.title}</span>
                <span class="tile__desc muted">${s.desc}</span>
              </a>`).join('')}
          </div>
        </div>`);

      const form = el.querySelector('[data-name-form]');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const v = form.querySelector('[data-name]').value.trim();
          if (!v) return;
          App.setName(v);
        });
      }
      return { el };
    },

    // ───────── Список заданий ─────────
    tasks() {
      const list = tasksOn();
      const types = ['text', 'voice'].filter((t) => has(t));
      let filter = 'all';
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Задания</h1>
            <p class="muted">Выполни задание и нажми «Сдать». Черновики сохраняются сами.</p>
          </div>
          ${types.length > 1 ? `
            <div class="seg seg--filter" role="group" aria-label="Фильтр">
              <button type="button" class="is-on" data-f="all">Все</button>
              <button type="button" data-f="text">Текстовые</button>
              <button type="button" data-f="voice">Голосовые</button>
            </div>` : ''}
          <div class="cards" data-list></div>
        </div>`);
      const box = el.querySelector('[data-list]');

      function draw() {
        box.innerHTML = '';
        list.filter((t) => filter === 'all' || t.type === filter).forEach((t) => {
          const st = Store.task(t.id);
          const s = STATUS[st.status] || STATUS.new;
          box.appendChild(h(`
            <a class="card task-card" href="#/task/${t.id}">
              <div class="task-card__top">
                <span class="badge badge--type">${icon(TYPE[t.type].icon)} ${TYPE[t.type].label}</span>
                <span class="badge ${s.cls}">${s.label}</span>
              </div>
              <h3>${esc(t.title)}</h3>
              <p class="muted clamp">${esc(t.prompt)}</p>
              <span class="link">${st.status === 'done' ? 'Посмотреть' : st.status === 'draft' ? 'Продолжить' : 'Открыть'} →</span>
            </a>`));
        });
      }
      el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
        el.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('is-on', x === b));
        filter = b.dataset.f;
        draw();
      }));
      draw();
      return { el };
    },

    // ───────── Одно задание ─────────
    task(id) {
      const t = DATA.tasks.find((x) => x.id === id);
      if (!t) return Pages.notFound();
      if (!has(t.type)) return Pages.off(t.type === 'voice' ? 'Голосовые задания' : 'Текстовые задания');

      const st = Store.task(t.id);
      const el = h(`
        <div class="page page--narrow">
          ${backLink('#/tasks', 'Все задания')}
          <article class="card">
            <div class="task-card__top">
              <span class="badge badge--type">${icon(TYPE[t.type].icon)} ${TYPE[t.type].label}</span>
              <span class="badge ${STATUS[st.status].cls}" data-status>${STATUS[st.status].label}</span>
            </div>
            <h1>${esc(t.title)}</h1>
            <p class="prompt">${esc(t.prompt)}</p>
            ${t.passage ? `<blockquote class="passage">${esc(t.passage)}</blockquote>` : ''}
            <div data-work></div>
          </article>
        </div>`);
      const work = el.querySelector('[data-work]');
      const statusEl = el.querySelector('[data-status]');
      const setStatus = (s) => { statusEl.className = 'badge ' + STATUS[s].cls; statusEl.textContent = STATUS[s].label; };

      if (t.type === 'text') {
        work.appendChild(h(`
          <div>
            <label class="label" for="answer">Твой ответ</label>
            <textarea class="input textarea" id="answer" rows="8" placeholder="Пиши здесь…"></textarea>
            <div class="row row--between">
              <span class="muted" data-count></span>
              <span class="muted" data-saved></span>
            </div>
            <span class="meter"><span data-meter></span></span>
            <div class="alert alert--ok" data-done hidden></div>
            <div class="row">
              <button class="btn" type="button" data-submit>Сдать задание</button>
              <button class="btn btn--ghost" type="button" data-edit hidden>Изменить ответ</button>
            </div>
          </div>`));
        const ta = work.querySelector('textarea');
        const count = work.querySelector('[data-count]');
        const saved = work.querySelector('[data-saved]');
        const meterBar = work.querySelector('[data-meter]');
        const submit = work.querySelector('[data-submit]');
        const edit = work.querySelector('[data-edit]');
        const doneBox = work.querySelector('[data-done]');
        ta.value = st.draft || '';
        let saveT = null;

        const words = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
        const refresh = () => {
          const n = words();
          count.textContent = 'Слов: ' + n + ' (нужно хотя бы ' + t.minWords + ')';
          meterBar.style.width = Math.min(100, (n / t.minWords) * 100) + '%';
          submit.disabled = n < t.minWords;
        };
        const lockDone = (task) => {
          ta.readOnly = true;
          submit.hidden = true;
          edit.hidden = false;
          doneBox.hidden = false;
          doneBox.innerHTML = `${icon('check')} Задание сдано ${fmtDate(task.submittedAt)}.`;
        };

        ta.addEventListener('input', () => {
          refresh();
          clearTimeout(saveT);
          saveT = setTimeout(() => {
            Store.updateTask(t.id, { draft: ta.value, status: ta.value.trim() ? 'draft' : 'new', updatedAt: Date.now() });
            setStatus(Store.task(t.id).status);
            saved.textContent = 'Черновик сохранён в ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          }, 400);
        });
        submit.addEventListener('click', () => {
          Store.updateTask(t.id, { draft: ta.value, status: 'done', submittedAt: Date.now() });
          setStatus('done');
          lockDone(Store.task(t.id));
          UI.toast('Задание сдано!');
        });
        edit.addEventListener('click', () => {
          ta.readOnly = false;
          submit.hidden = false;
          edit.hidden = true;
          doneBox.hidden = true;
          Store.updateTask(t.id, { status: 'draft' });
          setStatus('draft');
          ta.focus();
        });
        refresh();
        if (st.status === 'done') lockDone(st);
        return {
          el,
          destroy() {
            clearTimeout(saveT);
            // несохранённый черновик не пропадёт при уходе со страницы
            if (!ta.readOnly && ta.value !== (Store.task(t.id).draft || '')) {
              Store.updateTask(t.id, { draft: ta.value, status: ta.value.trim() ? 'draft' : 'new', updatedAt: Date.now() });
            }
          }
        };
      }

      // голосовое
      let last = null;
      const rec = UI.recorder({
        minSec: t.minSec,
        onRecorded(r) { last = r; submit.disabled = r.short; }
      });
      work.appendChild(rec.el);
      const tail = h(`
        <div>
          <p class="muted small">Запись хранится только на этом компьютере, пока открыта страница. Нужно говорить хотя бы ${t.minSec} сек.</p>
          <div class="alert alert--ok" data-done ${st.status === 'done' ? '' : 'hidden'}>${icon('check')} Запись сдана ${fmtDate(st.submittedAt)}${st.seconds ? ' (' + st.seconds + ' сек)' : ''}. Можно записать заново и сдать ещё раз.</div>
          <div class="row"><button class="btn" type="button" data-submit disabled>Сдать запись</button></div>
        </div>`);
      work.appendChild(tail);
      const submit = tail.querySelector('[data-submit]');
      const doneBox = tail.querySelector('[data-done]');
      submit.addEventListener('click', () => {
        if (!last) return;
        Store.updateTask(t.id, { status: 'done', submittedAt: Date.now(), seconds: last.seconds });
        setStatus('done');
        doneBox.hidden = false;
        doneBox.innerHTML = `${icon('check')} Запись сдана ${fmtDate(Date.now())} (${last.seconds} сек).`;
        submit.disabled = true;
        UI.toast('Запись сдана!');
      });
      return { el, destroy: rec.destroy };
    },

    // ───────── Список контрольных ─────────
    tests() {
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Контрольные</h1>
            <p class="muted">У каждой контрольной есть таймер. Когда время выйдет, работа сдастся сама.</p>
          </div>
          <div class="cards">
            ${DATA.tests.map((t) => {
              const qs = testQuestions(t);
              const r = Store.test(t.id);
              const voice = qs.some((q) => q.type === 'voice');
              return `
                <a class="card task-card" href="#/test/${t.id}">
                  <div class="task-card__top">
                    <span class="badge badge--type">${icon('tests')} ${qs.length} ${plural(qs.length, 'вопрос', 'вопроса', 'вопросов')}</span>
                    ${r ? `<span class="badge badge--ok">Оценка: ${r.best.mark}</span>` : '<span class="badge">Не пройдено</span>'}
                  </div>
                  <h3>${esc(t.title)}</h3>
                  <p class="muted">${esc(t.desc)}</p>
                  <p class="meta">${icon('clock')} ${t.minutes} мин${voice ? ` · ${icon('mic')} есть устный вопрос` : ''}</p>
                  <span class="link">${r ? 'Пройти ещё раз' : 'Начать'} →</span>
                </a>`;
            }).join('')}
          </div>
        </div>`);
      return { el };
    },

    // ───────── Контрольная ─────────
    test(id) {
      const test = DATA.tests.find((x) => x.id === id);
      if (!test) return Pages.notFound();
      if (!has('test')) return Pages.off('Контрольные');

      const qs = testQuestions(test);
      const el = h(`<div class="page page--narrow">${backLink('#/tests', 'Все контрольные')}<div data-box></div></div>`);
      const box = el.querySelector('[data-box]');
      let answers = [], i = 0, timer = null, left = 0, started = 0, running = false;
      const recorders = {};   // номер вопроса → запись голоса

      function cleanup() {
        clearInterval(timer);
        Object.values(recorders).forEach((r) => r.rec.destroy());
      }

      function intro() {
        const r = Store.test(test.id);
        const voice = qs.some((q) => q.type === 'voice');
        box.innerHTML = '';
        box.appendChild(h(`
          <div class="card">
            <p class="eyebrow">${icon('tests')} Контрольная работа</p>
            <h1>${esc(test.title)}</h1>
            <ul class="facts">
              <li>${icon('tests')} ${qs.length} ${plural(qs.length, 'вопрос', 'вопроса', 'вопросов')}</li>
              <li>${icon('clock')} ${test.minutes} минут на всю работу</li>
              ${voice ? `<li>${icon('mic')} Один вопрос — устный, его проверит учитель</li>` : ''}
            </ul>
            <div class="alert alert--info">Отвечай в любом порядке: переходи по номерам вопросов. Когда время выйдет, работа сдастся сама.</div>
            ${r ? `<p class="muted">Ты уже проходил: лучшая оценка <b>${r.best.mark}</b>, попыток — ${r.attempts}.</p>` : ''}
            <button class="btn btn--lg" type="button" data-start>Начать контрольную</button>
          </div>`));
        box.querySelector('[data-start]').addEventListener('click', start);
      }

      function start() {
        answers = qs.map((q) => (q.type === 'multi' ? [] : null));
        i = 0;
        left = test.minutes * 60;
        started = Date.now();
        running = true;
        Object.values(recorders).forEach((r) => r.rec.destroy());
        Object.keys(recorders).forEach((k) => delete recorders[k]);
        clearInterval(timer);
        timer = setInterval(() => {
          left = test.minutes * 60 - (Date.now() - started) / 1000;
          const t = box.querySelector('[data-timer]');
          if (t) {
            t.textContent = fmtTime(left);
            t.classList.toggle('is-low', left < 60);
          }
          if (left <= 0) finish(true);
        }, 250);
        draw();
      }

      const isAnswered = (k) => {
        const a = answers[k];
        return Array.isArray(a) ? a.length > 0 : a !== null && a !== '';
      };

      function draw() {
        const q = qs[i];
        const kind = { single: 'Выбери один ответ', multi: 'Выбери все правильные ответы', input: 'Напиши ответ', voice: 'Ответь голосом' }[q.type];
        box.innerHTML = '';
        const node = h(`
          <div class="card test">
            <div class="test__top">
              <b>${esc(test.title)}</b>
              <span class="timer" data-timer>${fmtTime(left)}</span>
            </div>
            <div class="dots" role="group" aria-label="Вопросы">
              ${qs.map((_, k) => `<button type="button" class="dot ${k === i ? 'is-current' : ''} ${isAnswered(k) ? 'is-done' : ''}" data-go="${k}" aria-label="Вопрос ${k + 1}">${k + 1}</button>`).join('')}
            </div>
            <p class="eyebrow">Вопрос ${i + 1} из ${qs.length} · ${kind}</p>
            <h2 class="test__q">${esc(q.q)}</h2>
            <div data-answer></div>
            <div class="row row--between test__nav">
              <button class="btn btn--ghost" type="button" data-prev ${i === 0 ? 'disabled' : ''}>← Назад</button>
              ${i < qs.length - 1
                ? '<button class="btn" type="button" data-next>Далее →</button>'
                : '<button class="btn btn--ok" type="button" data-finish>Сдать работу</button>'}
            </div>
          </div>`);
        box.appendChild(node);
        const area = node.querySelector('[data-answer]');

        if (q.type === 'single' || q.type === 'multi') {
          const list = h('<div class="opts"></div>');
          q.a.forEach((txt, j) => {
            const checked = q.type === 'multi' ? answers[i].includes(j) : answers[i] === j;
            const opt = h(`
              <label class="opt ${checked ? 'is-on' : ''}">
                <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="tq" value="${j}" ${checked ? 'checked' : ''}>
                <span>${esc(txt)}</span>
              </label>`);
            opt.querySelector('input').addEventListener('change', (e) => {
              if (q.type === 'multi') {
                const set = new Set(answers[i]);
                e.target.checked ? set.add(j) : set.delete(j);
                answers[i] = Array.from(set).sort();
              } else {
                answers[i] = j;
              }
              list.querySelectorAll('.opt').forEach((o) => o.classList.toggle('is-on', o.querySelector('input').checked));
              markDot();
            });
            list.appendChild(opt);
          });
          area.appendChild(list);
        } else if (q.type === 'input') {
          const inp = h(`<input class="input input--lg" type="text" maxlength="60" autocomplete="off" placeholder="Твой ответ" aria-label="Твой ответ">`);
          inp.value = answers[i] || '';
          inp.addEventListener('input', () => { answers[i] = inp.value.trim(); markDot(); });
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } });
          area.appendChild(inp);
          setTimeout(() => inp.focus(), 0);
        } else if (q.type === 'voice') {
          if (!recorders[i]) {
            const k = i;
            recorders[k] = { rec: UI.recorder({ maxSec: 120, onRecorded(r) { answers[k] = r.seconds > 0 ? 'запись ' + r.seconds + ' сек' : null; markDot(); } }) };
          }
          area.appendChild(recorders[i].rec.el);
          area.appendChild(h('<p class="muted small">Этот вопрос не влияет на автоматическую оценку — его послушает и оценит учитель.</p>'));
        }

        node.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { i = Number(b.dataset.go); draw(); }));
        const prev = node.querySelector('[data-prev]');
        if (prev) prev.addEventListener('click', () => { i--; draw(); });
        const nx = node.querySelector('[data-next]');
        if (nx) nx.addEventListener('click', next);
        const fin = node.querySelector('[data-finish]');
        if (fin) fin.addEventListener('click', () => finish(false));
      }

      function next() { if (i < qs.length - 1) { i++; draw(); } }

      function markDot() {
        const d = box.querySelector(`[data-go="${i}"]`);
        if (d) d.classList.toggle('is-done', isAnswered(i));
      }

      function check(q, a) {
        if (q.type === 'single') return a === q.right;
        if (q.type === 'multi') return JSON.stringify(a) === JSON.stringify(q.right.slice().sort());
        if (q.type === 'input') {
          const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '').replace(/ё/g, 'е');
          return q.answers.some((x) => norm(x) === norm(a));
        }
        return null; // голос — проверит учитель
      }

      function finish(byTimeout) {
        if (!running) return;
        if (!byTimeout) {
          const empty = qs.filter((_, k) => !isAnswered(k)).length;
          if (empty && !confirm('Без ответа ' + plural(empty, 'остался', 'осталось', 'осталось') + ' ' + empty + ' ' + plural(empty, 'вопрос', 'вопроса', 'вопросов') + '. Всё равно сдать работу?')) return;
        }
        running = false;
        clearInterval(timer);
        Object.values(recorders).forEach((r) => r.rec.destroy());

        const graded = qs.map((q, k) => ({ q, a: answers[k], ok: check(q, answers[k]) }));
        const auto = graded.filter((g) => g.ok !== null);
        const score = auto.filter((g) => g.ok).length;
        const percent = auto.length ? Math.round((score / auto.length) * 100) : 0;
        const g = grade(percent);
        const seconds = Math.min(test.minutes * 60, Math.round((Date.now() - started) / 1000));
        Store.addTestResult(test.id, { score, total: auto.length, percent, mark: g.mark, date: Date.now(), seconds });

        const show = (q, a) => {
          if (q.type === 'single') return a === null ? '—' : esc(q.a[a]);
          if (q.type === 'multi') return a.length ? a.map((j) => esc(q.a[j])).join(', ') : '—';
          return a ? esc(a) : '—';
        };
        const right = (q) => {
          if (q.type === 'single') return esc(q.a[q.right]);
          if (q.type === 'multi') return q.right.map((j) => esc(q.a[j])).join(', ');
          if (q.type === 'input') return esc(q.answers[0]);
          return '';
        };

        box.innerHTML = '';
        box.appendChild(h(`
          <div class="card">
            ${byTimeout ? '<div class="alert alert--warn">Время вышло — работа сдана автоматически.</div>' : ''}
            <div class="result">
              <div class="mark mark--${g.mark}">${g.mark}</div>
              <div>
                <h1>${g.word}!</h1>
                <p>Правильно <b>${score} из ${auto.length}</b> (${percent}%) · время ${fmtTime(seconds)}</p>
                ${graded.some((x) => x.ok === null) ? `<p class="muted">${icon('mic')} Устный ответ записан — его оценит учитель.</p>` : ''}
              </div>
            </div>
            <h2 class="section-title">Разбор ответов</h2>
            <ol class="review">
              ${graded.map((x) => `
                <li class="review__item ${x.ok === null ? 'is-voice' : x.ok ? 'is-ok' : 'is-bad'}">
                  <span class="review__icon">${icon(x.ok === null ? 'mic' : x.ok ? 'check' : 'cross')}</span>
                  <div>
                    <b>${esc(x.q.q)}</b>
                    <p>Твой ответ: ${show(x.q, x.a)}</p>
                    ${x.ok === false ? `<p class="review__right">Правильно: ${right(x.q)}</p>` : ''}
                  </div>
                </li>`).join('')}
            </ol>
            <div class="row">
              <button class="btn" type="button" data-again>Пройти ещё раз</button>
              <a class="btn btn--ghost" href="#/tests">Все контрольные</a>
            </div>
          </div>`));
        box.querySelector('[data-again]').addEventListener('click', intro);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      intro();
      return {
        el,
        destroy: cleanup,
        busy: () => running   // пока идёт контрольная, смена настроек не перерисовывает страницу
      };
    },

    // ───────── Игры ─────────
    games() {
      const m6 = Store.game('memory6'), m8 = Store.game('memory8'), tr = Store.game('truth');
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Игры</h1>
            <p class="muted">Короткие игры для перемены. Рекорды сохраняются.</p>
          </div>
          <div class="cards">
            <a class="card task-card" href="#/game/memory">
              <span class="tile__icon">${icon('cards')}</span>
              <h3>Найди пару</h3>
              <p class="muted">Тренируем память: найди одинаковые карточки с компьютерными картинками.</p>
              <p class="meta">${m6 || m8 ? 'Рекорд: ' + [m6 && '6 пар — ' + m6.value + ' ход.', m8 && '8 пар — ' + m8.value + ' ход.'].filter(Boolean).join(', ') : 'Рекорда пока нет'}</p>
              <span class="link">Играть →</span>
            </a>
            <a class="card task-card" href="#/game/truth">
              <span class="tile__icon">${icon('bolt')}</span>
              <h3>Правда или ложь</h3>
              <p class="muted">10 утверждений про компьютеры и интернет. Успей ответить за 10 секунд!</p>
              <p class="meta">${tr ? 'Рекорд: ' + tr.value + ' из 10' : 'Рекорда пока нет'}</p>
              <span class="link">Играть →</span>
            </a>
          </div>
        </div>`);
      return { el };
    },

    // ───────── Мои результаты ─────────
    results() {
      const tasks = tasksOn();
      const typing = Store.typingBest();
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Мои результаты</h1>
            <p class="muted">Всё хранится только на этом компьютере${Store.name ? ' — для ученика ' + esc(Store.name) : ''}.</p>
          </div>

          ${tasks.length ? `
          <section class="card">
            <h2>${icon('pencil')} Задания</h2>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Задание</th><th>Тип</th><th>Статус</th><th>Когда</th></tr></thead>
              <tbody>${tasks.map((t) => {
                const s = Store.task(t.id);
                return `<tr><td><a href="#/task/${t.id}">${esc(t.title)}</a></td><td>${TYPE[t.type].label}</td>
                  <td><span class="badge ${STATUS[s.status].cls}">${STATUS[s.status].label}</span></td>
                  <td class="muted">${s.status === 'done' ? fmtDate(s.submittedAt) : '—'}</td></tr>`;
              }).join('')}</tbody>
            </table></div>
          </section>` : ''}

          ${has('test') ? `
          <section class="card">
            <h2>${icon('tests')} Контрольные</h2>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Контрольная</th><th>Лучшая оценка</th><th>Последняя</th><th>Попыток</th></tr></thead>
              <tbody>${DATA.tests.map((t) => {
                const r = Store.test(t.id);
                return `<tr><td><a href="#/test/${t.id}">${esc(t.title)}</a></td>
                  <td>${r ? `<span class="mark mark--sm mark--${r.best.mark}">${r.best.mark}</span> ${r.best.percent}%` : '—'}</td>
                  <td>${r ? r.last.mark + ' (' + r.last.percent + '%)' : '—'}</td>
                  <td>${r ? r.attempts : 0}</td></tr>`;
              }).join('')}</tbody>
            </table></div>
          </section>` : ''}

          <div class="grid grid--2">
            ${has('typing') ? `
            <section class="card">
              <h2>${icon('keyboard')} Тренажёр</h2>
              ${typing ? `<p class="big-num">${typing.cpm} <small>зн/мин</small></p><p class="muted">Точность ${typing.acc}% · ${fmtDate(typing.date)}</p>` : '<p class="muted">Ещё нет результатов. <a href="#/typing">Попробовать</a></p>'}
            </section>` : ''}
            ${has('game') ? `
            <section class="card">
              <h2>${icon('game')} Игры</h2>
              <ul class="plain">
                <li>Найди пару (6 пар): <b>${Store.game('memory6') ? Store.game('memory6').value + ' ход.' : '—'}</b></li>
                <li>Найди пару (8 пар): <b>${Store.game('memory8') ? Store.game('memory8').value + ' ход.' : '—'}</b></li>
                <li>Правда или ложь: <b>${Store.game('truth') ? Store.game('truth').value + ' из 10' : '—'}</b></li>
              </ul>
            </section>` : ''}
          </div>

          <div class="row"><button class="btn btn--ghost btn--danger" type="button" data-reset>Очистить мои результаты</button></div>
        </div>`);
      el.querySelector('[data-reset]').addEventListener('click', () => {
        if (!confirm('Удалить все результаты на этом компьютере? Это нельзя отменить.')) return;
        Store.resetResults();
        UI.toast('Результаты очищены');
        App.render();
      });
      return { el };
    },

    // ───────── Настройки ─────────
    settings() {
      const qs = Engine.questions.filter((q) => q.id !== 'vote');
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Настройки сайта</h1>
            <p class="muted">Это те же вопросы, что в анкете. Каждый вариант — кусочек кода: выбери другой, и сайт сразу перепишет себя.</p>
          </div>
          <div class="grid grid--settings">
            <section class="card" data-opts></section>
            <section class="card">
              <h2>${icon('code')} Код, который сайт написал сам</h2>
              <p class="muted small">Зелёным подсвечено то, что поменялось после последнего выбора.</p>
              <pre class="code" data-code></pre>
              <div class="row">
                <a class="btn" href="index.html">Пройти анкету заново</a>
                <button class="btn btn--ghost" type="button" data-defaults>Вернуть как было</button>
              </div>
            </section>
          </div>
        </div>`);
      const optsBox = el.querySelector('[data-opts]');
      const codeEl = el.querySelector('[data-code]');
      let prevCode = '';

      function drawOpts() {
        optsBox.innerHTML = `
          <h2>${icon('gear')} Как выглядит сайт</h2>
          <div class="setting">
            <label class="label" for="setName">Имя ученика</label>
            <div class="row row--tight">
              <input class="input" id="setName" type="text" maxlength="40" value="${esc(Store.name)}" placeholder="Не указано">
              <button class="btn btn--ghost" type="button" data-save-name>Сохранить</button>
            </div>
          </div>`;
        optsBox.querySelector('[data-save-name]').addEventListener('click', () => {
          App.setName(optsBox.querySelector('#setName').value.trim());
        });
        qs.forEach((q) => {
          const sel = Engine.effectiveIds(q);
          const block = h(`
            <div class="setting">
              <p class="label">${esc(q.title)}${q.type === 'multi' ? ' <span class="muted">(можно несколько)</span>' : ''}</p>
              <div class="seg seg--wrap" role="group" aria-label="${esc(q.title)}"></div>
            </div>`);
          const seg = block.querySelector('.seg');
          q.options.forEach((o) => {
            const on = sel.includes(o.id);
            const b = h(`<button type="button" class="${on ? 'is-on' : ''}" aria-pressed="${on}">${o.swatch ? `<i class="swatch" style="background:${o.swatch}"></i>` : ''}${esc(o.label)}</button>`);
            b.addEventListener('click', () => {
              // для multi начинаем от того, что сейчас на сайте
              if (q.type === 'multi' && !Engine.isAnswered(q.id)) Engine.answers[q.id] = Engine.effectiveIds(q).slice();
              Engine.choose(q.id, o.id);
              Engine.save();
            });
            seg.appendChild(b);
          });
          optsBox.appendChild(block);
        });
      }

      function drawCode(ctx) {
        const text = ctx.generatedCSS + '\n\n' + ctx.generatedConfig;
        const prev = new Set(prevCode.split('\n'));
        codeEl.innerHTML = text.split('\n').map((line) =>
          `<span class="${prevCode && !prev.has(line) ? 'is-new' : ''}">${esc(line)}\n</span>`).join('');
        prevCode = text;
      }

      el.querySelector('[data-defaults]').addEventListener('click', () => {
        Engine.forget();
        Engine.reset();
        UI.toast('Настройки сброшены');
      });

      drawOpts();
      drawCode(Engine.result);
      return {
        el,
        onConfig(ctx) { drawOpts(); drawCode(ctx); }
      };
    },

    off(title) {
      const el = h(`
        <div class="page page--narrow">
          <div class="card empty">
            <div class="empty__icon">${icon('gear')}</div>
            <h1>Раздел «${esc(title)}» выключен</h1>
            <p class="muted">Его можно включить в настройках сайта.</p>
            <div class="row row--center"><a class="btn" href="#/settings">Открыть настройки</a><a class="btn btn--ghost" href="#/">На главную</a></div>
          </div>
        </div>`);
      return { el };
    },

    notFound() {
      const el = h(`
        <div class="page page--narrow">
          <div class="card empty">
            <div class="empty__icon">?</div>
            <h1>Такой страницы нет</h1>
            <div class="row row--center"><a class="btn" href="#/">На главную</a></div>
          </div>
        </div>`);
      return { el };
    }
  };

  window.Pages = Pages;
})();
