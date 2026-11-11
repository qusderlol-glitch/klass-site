/*
 * Разделы сайта компьютерного класса. Каждый раздел — отдельный кусочек кода.
 * Раздел появляется на сайте, только если выбран в вопросе «Что будет на сайте?».
 * Построенный раздел запоминается: если сменить тему, набранный текст не пропадёт.
 */
(function () {
  const el = (html) => {
    const t = document.createElement('div');
    t.innerHTML = html.trim();
    return t.firstElementChild;
  };

  const Features = {
    // ───────── Текстовое задание ─────────
    text: {
      title: 'Текстовые задания',
      icon: '✏',
      build() {
        const node = el(`
          <div>
            <h3>Задание 1</h3>
            <p class="muted">Напиши 3 предложения о том, чем ты любишь заниматься на компьютере.</p>
            <textarea class="field" rows="5" placeholder="Начни писать здесь…" aria-label="Твой ответ"></textarea>
            <div class="row">
              <span class="muted" data-counter>Слов: 0</span>
              <button class="btn" type="button">Сохранить ответ</button>
            </div>
            <p class="notice" data-saved hidden>Ответ сохранён (в демо-версии никуда не отправляется).</p>
          </div>`);
        const ta = node.querySelector('textarea');
        const counter = node.querySelector('[data-counter]');
        const saved = node.querySelector('[data-saved]');
        ta.addEventListener('input', () => {
          const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
          counter.textContent = 'Слов: ' + words;
          saved.hidden = true;
        });
        node.querySelector('.btn').addEventListener('click', () => { saved.hidden = false; });
        return node;
      }
    },

    // ───────── Голосовое задание ─────────
    voice: {
      title: 'Голосовые задания',
      icon: '●',
      build() {
        const node = el(`
          <div>
            <h3>Голосовое задание</h3>
            <p class="muted">Расскажи вслух, что ты сегодня узнал на уроке. Нажми «Записать», говори, потом нажми «Стоп».</p>
            <div class="row">
              <button class="btn" type="button" data-rec>Записать</button>
              <span class="timer" data-time>00:00</span>
              <span class="rec-dot" data-dot hidden>идёт запись</span>
            </div>
            <audio controls hidden data-audio></audio>
            <p class="notice" data-msg hidden></p>
          </div>`);
        const btn = node.querySelector('[data-rec]');
        const time = node.querySelector('[data-time]');
        const dot = node.querySelector('[data-dot]');
        const audio = node.querySelector('[data-audio]');
        const msg = node.querySelector('[data-msg]');
        let rec = null, stream = null, chunks = [], tick = null, started = 0;

        const say = (t) => { msg.textContent = t; msg.hidden = !t; };
        const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

        const stop = () => {
          if (rec && rec.state !== 'inactive') rec.stop();
        };

        btn.addEventListener('click', async () => {
          if (rec && rec.state === 'recording') { stop(); return; }
          if (!navigator.mediaDevices || !window.MediaRecorder) {
            say('Этот браузер не умеет записывать звук. Попробуй Chrome или Edge.');
            return;
          }
          try {
            say('');
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (e) {
            say('Не получилось включить микрофон. Разреши доступ к микрофону в браузере или проверь, что он подключён.');
            return;
          }
          chunks = [];
          rec = new MediaRecorder(stream);
          rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          rec.onstop = () => {
            clearInterval(tick);
            stream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
            if (audio.src) URL.revokeObjectURL(audio.src);
            audio.src = URL.createObjectURL(blob);
            audio.hidden = false;
            dot.hidden = true;
            btn.textContent = 'Записать заново';
          };
          rec.start();
          started = Date.now();
          time.textContent = '00:00';
          tick = setInterval(() => { time.textContent = fmt(Math.floor((Date.now() - started) / 1000)); }, 250);
          dot.hidden = false;
          audio.hidden = true;
          btn.textContent = 'Стоп';
        });
        return node;
      }
    },

    // ───────── Тест / контрольная ─────────
    test: {
      title: 'Тесты и контрольные',
      icon: '✔',
      build() {
        const QUESTIONS = [
          { q: 'Сколько бит в одном байте?', a: ['4', '8', '16'], right: 1 },
          { q: 'Что из этого — устройство ввода?', a: ['Монитор', 'Принтер', 'Клавиатура'], right: 2 },
          { q: 'Как называется программа для просмотра сайтов?', a: ['Браузер', 'Архиватор', 'Редактор'], right: 0 }
        ];
        const node = el(`
          <div>
            <div class="row row--between">
              <h3>Контрольная работа</h3>
              <span class="timer" data-timer>05:00</span>
            </div>
            <div data-list></div>
            <div class="row">
              <button class="btn" type="button" data-submit>Сдать работу</button>
              <button class="btn btn--ghost" type="button" data-again hidden>Пройти ещё раз</button>
            </div>
            <p class="notice" data-result hidden></p>
          </div>`);
        const list = node.querySelector('[data-list]');
        const timerEl = node.querySelector('[data-timer]');
        const submit = node.querySelector('[data-submit]');
        const again = node.querySelector('[data-again]');
        const result = node.querySelector('[data-result]');
        let left = 300, timer = null, done = false;

        const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

        function draw() {
          list.innerHTML = '';
          QUESTIONS.forEach((item, i) => {
            const box = el(`<fieldset class="quiz"><legend>${i + 1}. ${item.q}</legend></fieldset>`);
            item.a.forEach((ans, j) => {
              box.appendChild(el(
                `<label class="choice"><input type="radio" name="q${i}" value="${j}"><span>${ans}</span></label>`
              ));
            });
            list.appendChild(box);
          });
        }

        function finish(byTimeout) {
          if (done) return;
          done = true;
          clearInterval(timer);
          let score = 0;
          QUESTIONS.forEach((item, i) => {
            const chosen = list.querySelector(`input[name="q${i}"]:checked`);
            const fs = list.children[i];
            const labels = fs.querySelectorAll('.choice');
            labels[item.right].classList.add('is-right');
            if (chosen && Number(chosen.value) === item.right) score++;
            else if (chosen) labels[Number(chosen.value)].classList.add('is-wrong');
            fs.querySelectorAll('input').forEach((x) => (x.disabled = true));
          });
          result.hidden = false;
          result.textContent = (byTimeout ? 'Время вышло. ' : '') + 'Правильных ответов: ' + score + ' из ' + QUESTIONS.length + '.';
          submit.hidden = true;
          again.hidden = false;
        }

        function start() {
          done = false;
          left = 300;
          timerEl.textContent = fmt(left);
          result.hidden = true;
          submit.hidden = false;
          again.hidden = true;
          draw();
          clearInterval(timer);
          timer = setInterval(() => {
            left--;
            timerEl.textContent = fmt(Math.max(left, 0));
            if (left <= 0) finish(true);
          }, 1000);
        }

        submit.addEventListener('click', () => finish(false));
        again.addEventListener('click', start);
        start();
        return node;
      }
    },

    // ───────── Игра «Найди пару» ─────────
    game: {
      title: 'Игры на перемене',
      icon: '◆',
      build() {
        const EMOJI = ['🐱', '🐶', '🦊', '🐼', '🐸', '🦁'];
        const node = el(`
          <div>
            <div class="row row--between">
              <h3>Найди пару</h3>
              <span class="muted" data-moves>Ходов: 0</span>
            </div>
            <div class="memory" data-board></div>
            <div class="row">
              <button class="btn btn--ghost" type="button" data-restart>Начать заново</button>
              <span class="notice" data-win hidden>Ты нашёл все пары!</span>
            </div>
          </div>`);
        const board = node.querySelector('[data-board]');
        const movesEl = node.querySelector('[data-moves]');
        const win = node.querySelector('[data-win]');
        let first = null, lock = false, moves = 0, found = 0;

        function shuffle(a) {
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        }

        function start() {
          board.innerHTML = '';
          first = null; lock = false; moves = 0; found = 0;
          movesEl.textContent = 'Ходов: 0';
          win.hidden = true;
          shuffle(EMOJI.concat(EMOJI)).forEach((e) => {
            const card = el(`<button class="card-game" type="button" aria-label="Карточка"><span>${e}</span></button>`);
            card.dataset.v = e;
            card.addEventListener('click', () => flip(card));
            board.appendChild(card);
          });
        }

        function flip(card) {
          if (lock || card.classList.contains('is-open') || card.classList.contains('is-found')) return;
          card.classList.add('is-open');
          if (!first) { first = card; return; }
          moves++;
          movesEl.textContent = 'Ходов: ' + moves;
          if (first.dataset.v === card.dataset.v) {
            first.classList.add('is-found'); card.classList.add('is-found');
            first = null; found++;
            if (found === EMOJI.length) win.hidden = false;
          } else {
            lock = true;
            const a = first;
            first = null;
            setTimeout(() => { a.classList.remove('is-open'); card.classList.remove('is-open'); lock = false; }, 750);
          }
        }

        node.querySelector('[data-restart]').addEventListener('click', start);
        start();
        return node;
      }
    }
  };

  // ───────── Каркас сайта: шапка, меню, главная ─────────
  const ClassSite = {
    root: null,
    panels: {},       // id раздела -> построенный узел
    active: 'home',
    featureList: [],

    mount(root) {
      this.root = root;
      root.innerHTML = `
        <div class="site__header">
          <div class="site__logo"><span class="site__logo-mark" aria-hidden="true">▣</span> Компьютерный класс</div>
          <div class="site__user">Ученик: Гость</div>
        </div>
        <nav class="site__nav" aria-label="Разделы сайта"></nav>
        <div class="site__body"></div>
        <div class="site__footer">Демо-версия сайта · Компьютерный класс</div>`;
      this.nav = root.querySelector('.site__nav');
      this.body = root.querySelector('.site__body');
      this.renderNav();
      this.renderBody();
    },

    // Подогнать сайт под результат сборки движка
    update(ctx) {
      this.root.className = 'site ' + Array.from(ctx.classes).join(' ');
      const same = JSON.stringify(ctx.features) === JSON.stringify(this.featureList);
      this.featureList = ctx.features.slice();
      if (!this.featureList.includes(this.active) && this.active !== 'home') this.active = 'home';
      if (!same) { this.renderNav(); this.renderBody(); }
    },

    go(id) {
      this.active = id;
      this.renderNav();
      this.renderBody();
    },

    renderNav() {
      const items = [{ id: 'home', title: 'Главная' }].concat(
        this.featureList.map((id) => ({ id, title: Features[id].title }))
      );
      this.nav.innerHTML = '';
      items.forEach((it) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'site__nav-btn' + (it.id === this.active ? ' is-active' : '');
        b.textContent = it.title;
        b.addEventListener('click', () => this.go(it.id));
        this.nav.appendChild(b);
      });
    },

    renderBody() {
      this.body.innerHTML = '';
      if (this.active === 'home') {
        this.body.appendChild(this.home());
        return;
      }
      const id = this.active;
      if (!this.panels[id]) this.panels[id] = Features[id].build();
      const wrap = document.createElement('div');
      wrap.className = 'site__page';
      wrap.appendChild(this.panels[id]);
      this.body.appendChild(wrap);
    },

    home() {
      const wrap = document.createElement('div');
      wrap.className = 'site__page';
      if (!this.featureList.length) {
        wrap.innerHTML = `
          <h2>Здесь появится твой сайт</h2>
          <p class="muted">Ответь на вопросы слева. Выбери стиль и цвет, а в вопросе «Что будет на сайте?» отметь разделы — они сразу появятся в меню.</p>`;
        return wrap;
      }
      wrap.innerHTML = `
        <h2>Добро пожаловать!</h2>
        <p class="muted">Выбери, с чего начать урок.</p>
        <div class="tiles"></div>`;
      const tiles = wrap.querySelector('.tiles');
      this.featureList.forEach((id) => {
        const f = Features[id];
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'tile';
        t.innerHTML = `<span class="tile__icon" aria-hidden="true">${f.icon}</span><span class="tile__title">${f.title}</span>`;
        t.addEventListener('click', () => this.go(id));
        tiles.appendChild(t);
      });
      return wrap;
    }
  };

  window.ClassSite = ClassSite;
})();
