/* Игры и клавиатурный тренажёр. Каждая функция возвращает { el, destroy }. */
(function () {
  const { h, icon, esc, fmtTime, plural } = UI;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function backLink(href, text) {
    return `<a class="back" href="${href}">${icon('back')}<span>${text}</span></a>`;
  }

  const Games = {
    // ───────── Найди пару ─────────
    memory() {
      const el = h(`
        <div class="page">
          ${backLink('#/games', 'Все игры')}
          <div class="page-head">
            <h1>Найди пару</h1>
            <p class="muted">Открывай по две карточки и запоминай, где какая картинка. Найди все пары за как можно меньше ходов.</p>
          </div>
          <div class="card">
            <div class="toolbar">
              <div class="seg" role="group" aria-label="Сложность">
                <button type="button" data-level="6" class="is-on">6 пар</button>
                <button type="button" data-level="8">8 пар</button>
              </div>
              <div class="toolbar__stats">
                <span>${icon('cards')} Ходов: <b data-moves>0</b></span>
                <span>${icon('clock')} <b data-time>00:00</b></span>
              </div>
            </div>
            <div class="mem" data-board></div>
            <div class="alert alert--ok" data-win hidden></div>
            <div class="row"><button class="btn btn--ghost" type="button" data-restart>Начать заново</button>
            <span class="muted" data-best></span></div>
          </div>
        </div>`);
      const board = el.querySelector('[data-board]');
      const movesEl = el.querySelector('[data-moves]');
      const timeEl = el.querySelector('[data-time]');
      const win = el.querySelector('[data-win]');
      const bestEl = el.querySelector('[data-best]');
      let pairs = 6, first = null, lock = false, moves = 0, found = 0, started = 0, timer = null;

      const key = () => 'memory' + pairs;
      const showBest = () => {
        const b = Store.game(key());
        bestEl.textContent = b ? 'Лучший результат: ' + b.value + ' ' + plural(b.value, 'ход', 'хода', 'ходов') : '';
      };

      function start() {
        clearInterval(timer);
        first = null; lock = false; moves = 0; found = 0; started = 0;
        movesEl.textContent = '0';
        timeEl.textContent = '00:00';
        win.hidden = true;
        board.innerHTML = '';
        board.style.setProperty('--cols', 4);
        shuffle(DATA.memory.slice(0, pairs).concat(DATA.memory.slice(0, pairs))).forEach((e) => {
          const c = h(`<button class="mem__card" type="button" aria-label="Закрытая карточка"><span class="mem__face">${e}</span></button>`);
          c.dataset.v = e;
          c.addEventListener('click', () => flip(c));
          board.appendChild(c);
        });
        showBest();
      }

      function flip(c) {
        if (lock || c.classList.contains('is-open')) return;
        if (!started) {
          started = Date.now();
          timer = setInterval(() => { timeEl.textContent = fmtTime((Date.now() - started) / 1000); }, 500);
        }
        c.classList.add('is-open');
        c.setAttribute('aria-label', 'Карточка ' + c.dataset.v);
        if (!first) { first = c; return; }
        moves++;
        movesEl.textContent = moves;
        if (first.dataset.v === c.dataset.v) {
          first.classList.add('is-found');
          c.classList.add('is-found');
          first = null;
          found++;
          if (found === pairs) finish();
        } else {
          lock = true;
          const a = first;
          first = null;
          setTimeout(() => {
            [a, c].forEach((x) => { x.classList.remove('is-open'); x.setAttribute('aria-label', 'Закрытая карточка'); });
            lock = false;
          }, 800);
        }
      }

      function finish() {
        clearInterval(timer);
        const isBest = Store.setGameResult(key(), moves, (n, o) => n < o);
        win.hidden = false;
        win.innerHTML = `${icon('star')} Все пары найдены за ${moves} ${plural(moves, 'ход', 'хода', 'ходов')} и ${timeEl.textContent}.${isBest ? ' <b>Это новый рекорд!</b>' : ''}`;
        showBest();
      }

      el.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => {
        el.querySelectorAll('[data-level]').forEach((x) => x.classList.toggle('is-on', x === b));
        pairs = Number(b.dataset.level);
        start();
      }));
      el.querySelector('[data-restart]').addEventListener('click', start);
      start();
      return { el, destroy() { clearInterval(timer); } };
    },

    // ───────── Правда или ложь ─────────
    truth() {
      const ROUNDS = 10, SEC = 10;
      const el = h(`
        <div class="page">
          ${backLink('#/games', 'Все игры')}
          <div class="page-head">
            <h1>Правда или ложь</h1>
            <p class="muted">${ROUNDS} утверждений про компьютеры. На каждое — ${SEC} секунд. Отвечай кнопками или стрелками ← (ложь) и → (правда).</p>
          </div>
          <div class="card truth" data-box></div>
        </div>`);
      const box = el.querySelector('[data-box]');
      let list = [], i = 0, score = 0, timer = null, left = SEC, answered = false;

      function intro() {
        const b = Store.game('truth');
        box.innerHTML = `
          <div class="truth__center">
            <div class="truth__big">${icon('bolt')}</div>
            <p>Готов проверить себя?</p>
            ${b ? `<p class="muted">Твой рекорд: ${b.value} из ${ROUNDS}</p>` : ''}
            <button class="btn btn--lg" type="button" data-go>Начать игру</button>
          </div>`;
        box.querySelector('[data-go]').addEventListener('click', start);
      }

      function start() {
        list = shuffle(DATA.truth).slice(0, ROUNDS);
        i = 0; score = 0;
        round();
      }

      function round() {
        answered = false;
        left = SEC;
        const [text] = list[i];
        box.innerHTML = `
          <div class="truth__top"><span>Вопрос ${i + 1} из ${ROUNDS}</span><span>Очки: <b>${score}</b></span></div>
          <div class="truth__bar"><span data-bar></span></div>
          <p class="truth__text">${esc(text)}</p>
          <div class="truth__btns">
            <button class="btn btn--lg btn--bad" type="button" data-a="0">${icon('cross')} Ложь</button>
            <button class="btn btn--lg btn--ok" type="button" data-a="1">${icon('check')} Правда</button>
          </div>
          <p class="truth__fb" data-fb aria-live="polite"></p>`;
        box.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => answer(b.dataset.a === '1')));
        const bar = box.querySelector('[data-bar]');
        clearInterval(timer);
        const t0 = Date.now();
        timer = setInterval(() => {
          left = SEC - (Date.now() - t0) / 1000;
          bar.style.width = Math.max(0, (left / SEC) * 100) + '%';
          if (left <= 0) answer(null);
        }, 100);
      }

      function answer(val) {
        if (answered) return;
        answered = true;
        clearInterval(timer);
        const right = list[i][1];
        const ok = val === right;
        if (ok) score++;
        const fb = box.querySelector('[data-fb]');
        fb.className = 'truth__fb ' + (ok ? 'is-ok' : 'is-bad');
        fb.textContent = val === null ? 'Время вышло! Это ' + (right ? 'правда.' : 'ложь.') : ok ? 'Верно!' : 'Неверно — это ' + (right ? 'правда.' : 'ложь.');
        box.querySelectorAll('[data-a]').forEach((b) => (b.disabled = true));
        setTimeout(() => { i++; i < ROUNDS ? round() : end(); }, 1100);
      }

      function end() {
        const isBest = Store.setGameResult('truth', score, (n, o) => n > o);
        const g = UI.grade((score / ROUNDS) * 100);
        box.innerHTML = `
          <div class="truth__center">
            <div class="mark mark--${g.mark}">${score}</div>
            <p><b>${score} из ${ROUNDS}</b> правильных ответов. ${g.word}!</p>
            ${isBest ? '<p class="badge badge--ok">Новый рекорд!</p>' : ''}
            <button class="btn btn--lg" type="button" data-go>Сыграть ещё</button>
          </div>`;
        box.querySelector('[data-go]').addEventListener('click', start);
      }

      const onKey = (e) => {
        if (!box.querySelector('[data-a]') || answered) return;
        if (e.key === 'ArrowLeft') answer(false);
        if (e.key === 'ArrowRight') answer(true);
      };
      document.addEventListener('keydown', onKey);
      intro();
      return { el, destroy() { clearInterval(timer); document.removeEventListener('keydown', onKey); } };
    },

    // ───────── Клавиатурный тренажёр ─────────
    typing() {
      const ROWS = ['ё1234567890-=', 'йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю.'];
      const LEVELS = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>Клавиатурный тренажёр</h1>
            <p class="muted">Напечатай текст без ошибок. Подсвеченная клавиша внизу — та, которую нужно нажать следующей. Раскладка — русская.</p>
          </div>
          <div class="card">
            <div class="toolbar">
              <div class="seg" role="group" aria-label="Уровень">
                ${Object.keys(LEVELS).map((k, n) => `<button type="button" data-level="${k}" class="${n === 0 ? 'is-on' : ''}">${LEVELS[k]}</button>`).join('')}
              </div>
              <div class="toolbar__stats">
                <span>Скорость: <b data-cpm>0</b> зн/мин</span>
                <span>Точность: <b data-acc>100</b>%</span>
                <span>${icon('clock')} <b data-time>00:00</b></span>
              </div>
            </div>
            <div class="type-text" data-text aria-hidden="true"></div>
            <label class="sr-only" for="typeInput">Печатай здесь</label>
            <input class="input type-input" id="typeInput" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Нажми сюда и начинай печатать…">
            <div class="alert alert--ok" data-done hidden></div>
            <div class="kbd" data-kbd aria-hidden="true"></div>
            <div class="row">
              <button class="btn btn--ghost" type="button" data-new>Другой текст</button>
              <span class="muted" data-best></span>
            </div>
          </div>
        </div>`);
      const textEl = el.querySelector('[data-text]');
      const input = el.querySelector('#typeInput');
      const cpmEl = el.querySelector('[data-cpm]');
      const accEl = el.querySelector('[data-acc]');
      const timeEl = el.querySelector('[data-time]');
      const done = el.querySelector('[data-done]');
      const bestEl = el.querySelector('[data-best]');
      const kbd = el.querySelector('[data-kbd]');

      let level = 'easy', target = '', started = 0, keystrokes = 0, mistakes = 0, timer = null, finished = false, lastText = '';

      // клавиатура на экране
      ROWS.forEach((row, r) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'kbd__row';
        rowEl.style.paddingLeft = [0, 1.2, 1.8, 2.6][r] + 'em';
        if (r === 3) rowEl.appendChild(h('<span class="key key--wide" data-k="shift">Shift</span>'));
        row.split('').forEach((ch) => rowEl.appendChild(h(`<span class="key" data-k="${ch}">${ch}</span>`)));
        if (r === 3) rowEl.appendChild(h('<span class="key key--wide" data-k="shift">Shift</span>'));
        kbd.appendChild(rowEl);
      });
      kbd.appendChild(h('<div class="kbd__row kbd__row--space"><span class="key key--space" data-k=" ">пробел</span></div>'));

      const showBest = () => {
        const b = Store.typingBest();
        bestEl.textContent = b ? 'Твой рекорд: ' + b.cpm + ' зн/мин, точность ' + b.acc + '%' : '';
      };

      function pickText() {
        const pool = DATA.typing[level].filter((t) => t !== lastText);
        target = pool[Math.floor(Math.random() * pool.length)];
        lastText = target;
      }

      function reset(newText) {
        if (newText) pickText();
        clearInterval(timer);
        started = 0; keystrokes = 0; mistakes = 0; finished = false;
        input.value = '';
        input.disabled = false;
        done.hidden = true;
        cpmEl.textContent = '0'; accEl.textContent = '100'; timeEl.textContent = '00:00';
        textEl.innerHTML = target.split('').map((ch) => `<span>${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
        paint();
        showBest();
      }

      function highlightKey(ch) {
        kbd.querySelectorAll('.is-next').forEach((k) => k.classList.remove('is-next'));
        if (!ch) return;
        let base = ch.toLowerCase();
        let shift = ch !== base;
        if (ch === ',') { base = '.'; shift = true; }
        const k = kbd.querySelector(`[data-k="${CSS.escape(base)}"]`);
        if (k) k.classList.add('is-next');
        if (shift) kbd.querySelectorAll('[data-k="shift"]').forEach((s) => s.classList.add('is-next'));
      }

      function paint() {
        const v = input.value;
        const spans = textEl.children;
        for (let i = 0; i < spans.length; i++) {
          const s = spans[i];
          s.className = i < v.length ? (v[i] === target[i] ? 'ok' : 'bad') : i === v.length ? 'cur' : '';
        }
        // следующая клавиша: первая ошибка → Backspace, иначе следующий символ
        const firstBad = [...v].findIndex((c, i) => c !== target[i]);
        highlightKey(firstBad === -1 ? target[v.length] : null);
      }

      function stats() {
        const min = (Date.now() - started) / 60000;
        const v = input.value;
        let correct = 0;
        for (let i = 0; i < v.length; i++) if (v[i] === target[i]) correct++;
        const cpm = min > 0 ? Math.round(correct / min) : 0;
        const acc = keystrokes ? Math.max(0, Math.round(((keystrokes - mistakes) / keystrokes) * 100)) : 100;
        cpmEl.textContent = cpm;
        accEl.textContent = acc;
        timeEl.textContent = fmtTime((Date.now() - started) / 1000);
        return { cpm, acc };
      }

      input.addEventListener('input', (e) => {
        if (finished) return;
        if (input.value.length > target.length) input.value = input.value.slice(0, target.length);
        if (!started) {
          started = Date.now();
          timer = setInterval(stats, 500);
        }
        if (e.inputType && e.inputType.startsWith('insert')) {
          keystrokes++;
          const i = input.value.length - 1;
          if (input.value[i] !== target[i]) mistakes++;
        }
        paint();
        stats();
        if (input.value === target) finish();
      });

      function finish() {
        finished = true;
        clearInterval(timer);
        const r = stats();
        input.disabled = true;
        highlightKey(null);
        const isBest = Store.addTyping({ cpm: r.cpm, acc: r.acc, date: Date.now() });
        done.hidden = false;
        done.innerHTML = `${icon('star')} Готово! Скорость <b>${r.cpm} зн/мин</b>, точность <b>${r.acc}%</b>.${isBest ? ' <b>Новый рекорд!</b>' : ''} Нажми «Другой текст», чтобы продолжить.`;
        showBest();
      }

      el.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => {
        el.querySelectorAll('[data-level]').forEach((x) => x.classList.toggle('is-on', x === b));
        level = b.dataset.level;
        lastText = '';
        reset(true);
        input.focus();
      }));
      el.querySelector('[data-new]').addEventListener('click', () => { reset(true); input.focus(); });
      textEl.addEventListener('click', () => input.focus());

      reset(true);
      return { el, destroy() { clearInterval(timer); } };
    }
  };

  window.Games = Games;
})();
