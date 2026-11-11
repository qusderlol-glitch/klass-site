/* Кабинет учителя: урок на сегодня, проектор с кодом и QR, ответы, таймер, почта. */
(function () {
  const { h, icon, esc, fmtTime, plural } = UI;
  const view = document.getElementById('view');
  const side = document.getElementById('sideNav');
  const params = new URLSearchParams(location.search);

  document.querySelectorAll('[data-icon]').forEach((n) => { n.innerHTML = icon(n.dataset.icon); });
  document.querySelectorAll('[data-icon-before]').forEach((n) => { n.insertAdjacentHTML('afterbegin', icon(n.dataset.iconBefore)); });

  // Оформление — такое же, как выбрал класс в анкете
  Engine.fillDefaults = true;
  Engine.answers = Engine.loadSaved() || {};
  Engine.onChange((ctx) => UI.applyTheme(ctx));
  Engine.build();

  const recips = Sender.recipients();
  const teacherR = recips.find((r) => r.id === 'teacher');

  // ───── План урока (запоминается на этом компьютере) ─────
  const PLAN_KEY = 'klass-teacher-lesson';
  function loadPlan() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null'); } catch (e) { p = null; }
    return Object.assign({ topic: DATA.lesson.topic, note: '', tasks: [], tests: [] }, p || {});
  }
  function savePlan(p) {
    try { localStorage.setItem(PLAN_KEY, JSON.stringify(p)); } catch (e) { /* ничего */ }
  }

  const siteUrl = () => new URL('site.html', location.href).href;
  const shortSite = () => siteUrl().replace(/^https?:\/\//, '');
  const lessonCode = (p) => p.tasks.concat(p.tests).map((s) => s.toUpperCase()).join('-');
  function lessonUrl(p) {
    const u = new URL('site.html', location.href);
    if (p.topic) u.searchParams.set('l_topic', p.topic);
    if (p.note) u.searchParams.set('l_note', p.note);
    if (p.tasks.length) u.searchParams.set('l_tasks', p.tasks.join(','));
    if (p.tests.length) u.searchParams.set('l_tests', p.tests.join(','));
    return u.href;
  }

  function drawQR(el, text, size) {
    el.innerHTML = '';
    if (!window.QRCode) {
      el.innerHTML = '<p class="muted small">QR-код не загрузился — проверьте интернет.</p>';
      return;
    }
    try {
      new QRCode(el, { text, width: size, height: size, colorDark: '#111111', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.L });
      el.title = '';
    } catch (e) {
      el.innerHTML = '<p class="muted small">Ссылка слишком длинная для QR-кода. Сократите сообщение ученикам.</p>';
    }
  }

  // ───── Проектор: всё крупно, на весь экран ─────
  function projector(p) {
    const code = lessonCode(p);
    const ov = h(`
      <div class="projector" role="dialog" aria-modal="true" aria-label="Показ на проекторе">
        <div class="projector__bar">
          <button class="btn btn--ghost" type="button" data-full>${icon('monitor')} На весь экран</button>
          <button class="btn" type="button" data-close>${icon('cross')} Закрыть (Esc)</button>
        </div>
        <div class="projector__body">
          <div class="projector__text">
            <p class="projector__topic">${esc(p.topic || 'Урок в компьютерном классе')}</p>
            <ol class="projector__steps">
              <li>Откройте сайт:<b class="projector__url">${esc(shortSite())}</b></li>
              ${code ? `<li>На главной введите код урока:<b class="projector__code">${esc(code)}</b></li>` : ''}
            </ol>
            ${p.note ? `<p class="projector__note">${esc(p.note)}</p>` : ''}
          </div>
          <div class="projector__qr">
            <div data-qr></div>
            <p>или отсканируйте телефоном</p>
          </div>
        </div>
      </div>`);
    document.body.appendChild(ov);
    drawQR(ov.querySelector('[data-qr]'), lessonUrl(p), Math.min(360, Math.round(window.innerHeight * 0.42)));
    const close = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      document.removeEventListener('keydown', onKey);
      ov.remove();
    };
    const onKey = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) close(); };
    document.addEventListener('keydown', onKey);
    ov.querySelector('[data-close]').addEventListener('click', close);
    ov.querySelector('[data-full]').addEventListener('click', () => {
      if (ov.requestFullscreen) ov.requestFullscreen().catch(() => UI.toast('Браузер не разрешил полный экран — нажмите F11'));
    });
    ov.querySelector('[data-close]').focus();
  }

  // ───── Таймер работает, даже если уйти на другую страницу ─────
  const T = { total: 300, left: 300, running: false, endAt: 0, label: '', tick: null, onUpdate: null, done: false };
  function timerLoop() {
    clearInterval(T.tick);
    T.tick = setInterval(() => {
      if (!T.running) return;
      T.left = Math.max(0, (T.endAt - Date.now()) / 1000);
      if (T.left <= 0) {
        T.running = false;
        T.done = true;
        beep();
        UI.toast('Время вышло!');
      }
      if (T.onUpdate) T.onUpdate();
    }, 200);
  }
  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.45, 0.9].forEach((t) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = 880;
        o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.4, ac.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.35);
        o.start(ac.currentTime + t);
        o.stop(ac.currentTime + t + 0.4);
      });
      setTimeout(() => ac.close(), 1600);
    } catch (e) { /* без звука */ }
  }

  // ───── Страницы ─────
  const Pages = {
    home() {
      const p = loadPlan();
      const texts = DATA.tasks.filter((t) => t.type === 'text').length;
      const voices = DATA.tasks.filter((t) => t.type === 'voice').length;
      const el = h(`
        <div class="page">
          <section class="hero card">
            <div>
              <p class="hero__date">${UI.today()}</p>
              <h1>Здравствуйте!</h1>
              <p class="muted">Это кабинет учителя. Здесь вы готовите урок и показываете его классу. Ученики работают на своём сайте — отдельно от этого кабинета.</p>
            </div>
            <div class="hero__art" aria-hidden="true">${icon('book')}</div>
          </section>

          <h2 class="section-title">Урок за 3 шага</h2>
          <ol class="steps-cards">
            <li class="card">
              <span class="steps-cards__n">1</span>
              <h3>Соберите урок</h3>
              <p class="muted">Тема, сообщение классу и задания на сегодня.</p>
              <a class="btn" href="#/lesson">Урок на сегодня</a>
            </li>
            <li class="card">
              <span class="steps-cards__n">2</span>
              <h3>Покажите классу</h3>
              <p class="muted">Код урока и QR-код крупно на проекторе. Или отправьте ссылку в Suhtlus.</p>
              <button class="btn" type="button" data-proj>Показать на проекторе</button>
            </li>
            <li class="card">
              <span class="steps-cards__n">3</span>
              <h3>Получите результаты</h3>
              <p class="muted">В конце урока ученики нажмут «Отправить результаты». ${teacherR && teacherR.email ? 'Они придут вам на почту.' : 'Они пришлют их вам в Suhtlus.'}</p>
              <a class="btn btn--ghost" href="#/mail">Как это работает</a>
            </li>
          </ol>

          <div class="grid grid--2">
            <section class="card">
              <p class="eyebrow">${icon('tests')} Сейчас в уроке</p>
              <h2>${esc(p.topic || 'Тема не задана')}</h2>
              ${p.tasks.length || p.tests.length
                ? `<p class="muted">${p.tasks.length} ${plural(p.tasks.length, 'задание', 'задания', 'заданий')} и ${p.tests.length} ${plural(p.tests.length, 'контрольная', 'контрольные', 'контрольных')}. Код урока: <b class="code-chip">${esc(lessonCode(p))}</b></p>`
                : '<p class="muted">Задания на сегодня ещё не выбраны.</p>'}
              <a class="link" href="#/lesson">Изменить →</a>
            </section>
            <section class="card">
              <p class="eyebrow">${icon('monitor')} Что есть на сайте ученика</p>
              <ul class="plain">
                <li>Текстовых заданий: <b>${texts}</b>, голосовых: <b>${voices}</b></li>
                <li>Контрольных: <b>${DATA.tests.length}</b> (с таймером и оценкой)</li>
                <li>Игры, клавиатурный тренажёр, «Мои результаты»</li>
              </ul>
              <a class="link" href="site.html" target="_blank" rel="noopener">Открыть как ученик ↗</a>
            </section>
          </div>

          <h2 class="section-title">Инструменты</h2>
          <div class="tiles">
            <a class="tile" href="#/keys"><span class="tile__icon">${icon('check')}</span><span class="tile__title">Ответы к контрольным</span><span class="tile__desc muted">Правильные ответы — по коду</span></a>
            <a class="tile" href="#/timer"><span class="tile__icon">${icon('clock')}</span><span class="tile__title">Таймер</span><span class="tile__desc muted">Крупно на проектор, со звуком</span></a>
            <a class="tile" href="#/mail"><span class="tile__icon">${icon('megaphone')}</span><span class="tile__title">Письма и почта</span><span class="tile__desc muted">Куда приходят анкеты и результаты</span></a>
          </div>
        </div>`);
      el.querySelector('[data-proj]').addEventListener('click', () => projector(loadPlan()));
      return { el };
    },

    lesson() {
      const p = loadPlan();
      const group = (type) => DATA.tasks.filter((t) => t.type === type).map((t) => `
        <label class="opt opt--sm"><input type="checkbox" name="task" value="${t.id}" ${p.tasks.includes(t.id) ? 'checked' : ''}><span>${esc(t.title)}</span></label>`).join('');
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Урок на сегодня</h1>
            <p class="muted">Выберите, что ученики делают сегодня. У них на главной появится тема, ваше сообщение и список заданий — эти задания будут первыми.</p>
          </div>
          <div class="grid grid--lesson">
            <section class="card">
              <label class="label" for="lTopic">Тема урока</label>
              <input class="input" id="lTopic" type="text" maxlength="80" value="${esc(p.topic)}">
              <label class="label label--gap" for="lNote">Сообщение ученикам <span class="muted">(необязательно)</span></label>
              <textarea class="input" id="lNote" rows="3" maxlength="240" placeholder="Например: сначала задание 1, потом контрольная. В конце отправьте результаты.">${esc(p.note)}</textarea>

              <p class="label label--gap">${icon('pencil')} Текстовые задания</p>
              <div class="opts">${group('text')}</div>
              <p class="label label--gap">${icon('mic')} Голосовые задания</p>
              <div class="opts">${group('voice')}</div>
              <p class="label label--gap">${icon('tests')} Контрольные</p>
              <div class="opts">${DATA.tests.map((t) => `
                <label class="opt opt--sm"><input type="checkbox" name="test" value="${t.id}" ${p.tests.includes(t.id) ? 'checked' : ''}><span>${esc(t.title)} <span class="muted small">· ${t.minutes} мин</span></span></label>`).join('')}</div>
              <div class="row"><button class="btn btn--ghost" type="button" data-clear>Очистить выбор</button></div>
            </section>

            <section class="card share">
              <p class="eyebrow">${icon('user')} Для учеников</p>
              <div class="share__code" data-code-box>
                <span class="small muted">Код урока — ученики вводят его на главной</span>
                <b data-code></b>
              </div>
              <div class="share__qr" data-qr></div>
              <label class="label" for="lLink">Ссылка на урок</label>
              <input class="input" id="lLink" type="text" readonly>
              <div class="row">
                <button class="btn" type="button" data-copy>${icon('pencil')} Скопировать ссылку</button>
                <a class="btn btn--ghost" data-open target="_blank" rel="noopener">Открыть как ученик ↗</a>
              </div>
              <button class="btn btn--lg share__proj" type="button" data-proj>${icon('monitor')} Показать на проекторе</button>
              <p class="muted small">Совет: скопируйте ссылку и отправьте классу в Suhtlus — по ней сразу откроется сайт с этим уроком.</p>
            </section>
          </div>
        </div>`);

      const topic = el.querySelector('#lTopic');
      const note = el.querySelector('#lNote');
      const link = el.querySelector('#lLink');
      const codeEl = el.querySelector('[data-code]');
      const codeBox = el.querySelector('[data-code-box]');
      const qrBox = el.querySelector('[data-qr]');
      const openBtn = el.querySelector('[data-open]');
      let qrT = null;

      function read() {
        return {
          topic: topic.value.trim(),
          note: note.value.trim(),
          tasks: Array.from(el.querySelectorAll('input[name="task"]:checked')).map((x) => x.value),
          tests: Array.from(el.querySelectorAll('input[name="test"]:checked')).map((x) => x.value)
        };
      }
      function update() {
        const plan = read();
        savePlan(plan);
        const url = lessonUrl(plan);
        link.value = url;
        openBtn.href = url;
        const code = lessonCode(plan);
        codeEl.textContent = code || '—';
        codeBox.classList.toggle('is-empty', !code);
        el.querySelectorAll('.opt').forEach((o) => o.classList.toggle('is-on', o.querySelector('input').checked));
        clearTimeout(qrT);
        qrT = setTimeout(() => drawQR(qrBox, url, 200), 250);
      }
      el.addEventListener('input', update);
      el.addEventListener('change', update);
      el.querySelector('[data-clear]').addEventListener('click', () => {
        el.querySelectorAll('input[type="checkbox"]').forEach((x) => { x.checked = false; });
        update();
      });
      el.querySelector('[data-copy]').addEventListener('click', async () => {
        await UI.copy(link.value);
        UI.toast('Ссылка скопирована — можно вставить в Suhtlus');
      });
      el.querySelector('[data-proj]').addEventListener('click', () => projector(read()));
      update();
      return { el, destroy() { clearTimeout(qrT); } };
    },

    keys() {
      const pin = String((window.CONFIG && CONFIG.TEACHER_PIN) || '');
      let ok = false;
      try { ok = !pin || sessionStorage.getItem('klass-teacher-ok') === '1'; } catch (e) { ok = !pin; }
      if (!ok) {
        const el = h(`
          <div class="page page--narrow">
            <div class="card empty">
              <div class="empty__icon">${icon('check')}</div>
              <h1>Ответы к контрольным</h1>
              <p class="muted">Введите код учителя, чтобы ученики не открыли ответы случайно.</p>
              <form class="row row--center" data-pin>
                <input class="input input--pin" type="password" inputmode="numeric" maxlength="12" autocomplete="off" aria-label="Код учителя" placeholder="Код">
                <button class="btn" type="submit">Открыть</button>
              </form>
              <p class="alert alert--warn" data-bad hidden>Неверный код.</p>
            </div>
          </div>`);
        el.querySelector('[data-pin]').addEventListener('submit', (e) => {
          e.preventDefault();
          if (el.querySelector('input').value === pin) {
            try { sessionStorage.setItem('klass-teacher-ok', '1'); } catch (er) { /* ничего */ }
            App.render();
          } else {
            el.querySelector('[data-bad]').hidden = false;
          }
        });
        return { el };
      }

      const answer = (q) => {
        if (q.type === 'single') return esc(q.a[q.right]);
        if (q.type === 'multi') return q.right.map((j) => esc(q.a[j])).join(', ');
        if (q.type === 'input') return q.answers.map(esc).join(' / ');
        return '<i>устный ответ — оценивает учитель</i>';
      };
      const el = h(`
        <div class="page">
          <div class="page-head row row--between">
            <div>
              <h1>Ответы к контрольным</h1>
              <p class="muted">Оценка ставится автоматически: 85% и выше — «5», от 65% — «4», от 45% — «3». Устные вопросы в оценку не входят.</p>
            </div>
            <button class="btn btn--ghost" type="button" data-lock>Скрыть ответы</button>
          </div>
          ${DATA.tests.map((t) => `
            <section class="card">
              <h2>${icon('tests')} ${esc(t.title)} <span class="badge">${t.minutes} мин</span></h2>
              <ol class="keys">${t.questions.map((q) => `
                <li><span>${esc(q.q)}</span><b>${answer(q)}</b></li>`).join('')}
              </ol>
            </section>`).join('')}
          <section class="card">
            <h2>${icon('pencil')} Требования к заданиям</h2>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Задание</th><th>Тип</th><th>Минимум</th></tr></thead>
              <tbody>${DATA.tasks.map((t) => `<tr><td>${esc(t.title)}</td><td>${t.type === 'text' ? 'Текст' : 'Голос'}</td><td>${t.type === 'text' ? t.minWords + ' слов' : t.minSec + ' сек'}</td></tr>`).join('')}</tbody>
            </table></div>
          </section>
        </div>`);
      el.querySelector('[data-lock]').addEventListener('click', () => {
        try { sessionStorage.removeItem('klass-teacher-ok'); } catch (e) { /* ничего */ }
        App.render();
      });
      return { el };
    },

    timer() {
      const PRESETS = [1, 3, 5, 10, 15, 20, 30, 45];
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Таймер</h1>
            <p class="muted">Покажите на проекторе, сколько времени осталось. В конце прозвучит сигнал. Таймер продолжает идти, даже если открыть другой раздел.</p>
          </div>
          <section class="card timer-card" data-box>
            <input class="input timer-card__label" type="text" maxlength="40" placeholder="Что делаем? Например: Контрольная" aria-label="Подпись таймера" data-label>
            <div class="timer-card__digits" data-digits>05:00</div>
            <div class="meter timer-card__meter"><span data-bar></span></div>
            <div class="row row--center">
              <button class="btn btn--lg" type="button" data-start>Старт</button>
              <button class="btn btn--lg btn--ghost" type="button" data-reset>Сброс</button>
              <button class="btn btn--lg btn--ghost" type="button" data-full>${icon('monitor')} На весь экран</button>
            </div>
            <div class="row row--center">
              ${PRESETS.map((m) => `<button class="btn btn--ghost btn--sm" type="button" data-min="${m}">${m} мин</button>`).join('')}
              <label class="row row--tight timer-card__custom"><input class="input" type="number" min="1" max="180" placeholder="мин" aria-label="Своё время в минутах" data-custom><button class="btn btn--ghost btn--sm" type="button" data-set>Поставить</button></label>
            </div>
          </section>
        </div>`);
      const box = el.querySelector('[data-box]');
      const digits = el.querySelector('[data-digits]');
      const bar = el.querySelector('[data-bar]');
      const startBtn = el.querySelector('[data-start]');
      const label = el.querySelector('[data-label]');
      label.value = T.label;

      function paint() {
        digits.textContent = fmtTime(Math.ceil(T.left));
        bar.style.width = (T.total ? (T.left / T.total) * 100 : 0) + '%';
        startBtn.textContent = T.running ? 'Пауза' : T.left < T.total && T.left > 0 ? 'Продолжить' : 'Старт';
        box.classList.toggle('is-low', T.running && T.left <= 30);
        box.classList.toggle('is-done', T.done);
        if (T.done) digits.textContent = 'Время вышло!';
      }
      function set(min) {
        T.total = T.left = min * 60;
        T.running = false;
        T.done = false;
        paint();
      }
      startBtn.addEventListener('click', () => {
        if (T.running) {
          T.running = false;
          T.left = Math.max(0, (T.endAt - Date.now()) / 1000);
        } else {
          if (T.left <= 0) { T.left = T.total; T.done = false; }
          T.endAt = Date.now() + T.left * 1000;
          T.running = true;
          timerLoop();
        }
        paint();
      });
      el.querySelector('[data-reset]').addEventListener('click', () => set(T.total / 60));
      el.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => set(Number(b.dataset.min))));
      el.querySelector('[data-set]').addEventListener('click', () => {
        const v = Number(el.querySelector('[data-custom]').value);
        if (v >= 1 && v <= 180) set(v); else UI.toast('Введите от 1 до 180 минут');
      });
      label.addEventListener('input', () => { T.label = label.value; });
      el.querySelector('[data-full]').addEventListener('click', () => {
        if (box.requestFullscreen) box.requestFullscreen().catch(() => UI.toast('Браузер не разрешил полный экран — нажмите F11'));
      });
      T.onUpdate = paint;
      paint();
      return { el, destroy() { T.onUpdate = null; } };
    },

    mail() {
      const sample = 'Результаты урока — компьютерный класс\nУченик: Ваня Петров\nКласс: 6А\nУрок: Устройство компьютера\nЗаданий сдано: 2 из 7\n★ Задание «Мой компьютер»: СДАНО: Я использую компьютер для учёбы…\n★ Контрольная «Устройство компьютера»: оценка 5 (100%), последняя попытка 5, попыток 1\nКлавиатурный тренажёр: 95 зн/мин, точность 97%';
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Письма и почта</h1>
            <p class="muted">Сайт сам ничего не хранит на сервере. Всё, что ученики отправляют, приходит письмом или сообщением.</p>
          </div>
          <section class="card">
            <h2>${icon('megaphone')} Кому что приходит</h2>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Кому</th><th>Как доставляется</th><th>Что приходит</th></tr></thead>
              <tbody>${recips.map((r) => `
                <tr>
                  <td><b>${esc(r.label)}</b><br><span class="muted small">${esc(r.hint || '')}</span></td>
                  <td>${r.email ? 'автоматически на почту' : r.suhtlus ? 'ученик копирует текст и отправляет в Suhtlus' : 'ученик копирует текст'}</td>
                  <td>Анкеты о сайте и результаты урока — если ученик выбрал этого адресата</td>
                </tr>`).join('')}
              </tbody>
            </table></div>
          </section>

          <div class="grid grid--2">
            <section class="card">
              <h2>${icon('pencil')} Как это выглядит у ученика</h2>
              <ol class="plain">
                <li>«Мои результаты» → «Отправить результаты».</li>
                <li>Пишет имя и класс, выбирает, кому отправить.</li>
                <li>Если у адресата есть почта — письмо уходит само.</li>
                <li>Если нет — появляется готовый текст и кнопка «Скопировать». Ученик открывает Suhtlus → «Новое сообщение» → выбирает вас → Ctrl + V → отправить.</li>
              </ol>
            </section>
            <section class="card">
              <h2>${icon('gear')} Хотите получать письма сами?</h2>
              <p>Попросите автора сайта вписать вашу почту в файл <code>config.js</code> (адресат «Учительнице»). Тогда результаты будут приходить вам автоматически, без копирования.</p>
              <p class="muted small">При первом письме придёт подтверждение от сервиса FormSubmit — нужно один раз нажать «Activate».</p>
            </section>
          </div>

          <section class="card">
            <h2>${icon('book')} Пример письма с результатами</h2>
            <pre class="sample">${esc(sample)}</pre>
          </section>
        </div>`);
      return { el };
    }
  };

  // ───── Меню и переходы ─────
  const NAV = [
    { id: '', href: '#/', title: 'Обзор', icon: 'home' },
    { id: 'lesson', href: '#/lesson', title: 'Урок на сегодня', icon: 'pencil' },
    { id: 'keys', href: '#/keys', title: 'Ответы к контрольным', icon: 'check' },
    { id: 'timer', href: '#/timer', title: 'Таймер', icon: 'clock' },
    { id: 'mail', href: '#/mail', title: 'Письма и почта', icon: 'megaphone' },
    { id: 'student', href: 'site.html', title: 'Сайт ученика ↗', icon: 'user', bottom: true, blank: true },
    { id: 'about', href: 'index.html', title: 'Кто для кого', icon: 'book' }
  ];

  let current = null;
  const App = {
    render() {
      if (current && current.destroy) current.destroy();
      const route = location.hash.replace(/^#\/?/, '').split('/')[0] || '';
      const page = Pages[route === '' ? 'home' : route];
      current = page ? page() : Pages.home();
      view.innerHTML = '';
      view.appendChild(current.el);
      side.innerHTML = NAV.map((n) => `
        <a class="side__link ${n.id === route ? 'is-active' : ''} ${n.bottom ? 'side__link--bottom' : ''}" href="${n.href}" ${n.blank ? 'target="_blank" rel="noopener"' : ''} ${n.id === route ? 'aria-current="page"' : ''}>
          ${icon(n.icon)}<span>${n.title}</span>
        </a>`).join('');
      const t = NAV.find((n) => n.id === route);
      document.title = (t && t.id ? t.title + ' — ' : '') + 'Кабинет учителя';
      window.scrollTo(0, 0);
    }
  };
  window.App = App;

  // ───── Тур по кабинету ─────
  const TOUR = [
    { el: null, title: 'Кабинет учителя', text: 'Здесь вы готовите урок. Ученики работают на своём сайте, а сюда им заходить не нужно. Покажу, что где — это займёт минуту.' },
    { el: '#sideNav a[href="#/lesson"]', title: 'Урок на сегодня', text: 'Выберите тему, сообщение и задания. Сайт сделает <b>код урока</b>, ссылку и QR-код.' },
    { el: '#sideNav a[href="#/keys"]', title: 'Ответы к контрольным', text: 'Правильные ответы ко всем контрольным. Открываются по коду учителя.' },
    { el: '#sideNav a[href="#/timer"]', title: 'Таймер', text: 'Крупный таймер для проектора, со звуком в конце.' },
    { el: '#sideNav a[href="#/mail"]', title: 'Письма и почта', text: 'Куда приходят анкеты и результаты учеников — на почту или через Suhtlus.' },
    { el: '#studentLink', title: 'Сайт ученика', text: 'Так видят сайт ученики. Можно открыть и проверить любое задание.' },
    { el: '#helpBtn', title: 'Если забудете', text: 'Кнопка «?» снова покажет этот тур.' }
  ];
  const runTour = () => Tour.start(TOUR, { key: 'teacher' });
  document.getElementById('helpBtn').addEventListener('click', () => { location.hash = '#/'; setTimeout(runTour, 50); });

  window.addEventListener('hashchange', App.render);
  App.render();
  if (params.has('tour') || !Tour.seen('teacher')) setTimeout(runTour, 400);
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
})();
