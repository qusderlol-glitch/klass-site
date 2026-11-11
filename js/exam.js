/* Анкета-экзамен: листы бумаги, которые листаются снизу вверх. */
(function () {
  document.documentElement.classList.add('js');

  const $ = (s, root = document) => root.querySelector(s);
  const stack = $('#stack');
  const tabsEl = $('#sheetTabs');
  const bar = $('#inkBar');
  const frame = $('#previewFrame');
  const previewLink = $('#previewLink');

  const Q = Engine.questions;
  const SHEETS = Q.length + 2;              // титульный + вопросы + «сдать работу»
  const LETTERS = 'АБВГДЕЖЗ';
  const ROT = ['-0.5deg', '0.45deg', '-0.35deg', '0.6deg', '-0.55deg', '0.3deg', '-0.4deg', '0.5deg', '-0.3deg'];
  const CHECK = '<svg viewBox="0 0 38 38" aria-hidden="true"><path pathLength="1" d="M5 20 C9 23 12 26 15 31 C19 21 26 11 35 4"/></svg>';

  const info = { name: '', klass: '', comment: '', sendTo: null };
  const pages = [];          // { el, kind, q?, refresh? }
  let current = 0;
  let sending = false;
  let submitted = false;
  let autoNext = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ───── Каркас листа ─────
  function makePage(index, inner) {
    const section = document.createElement('section');
    section.className = 'page';
    section.id = 'list-' + (index + 1);
    section.setAttribute('aria-label', 'Лист ' + (index + 1) + ' из ' + SHEETS);
    section.innerHTML = `
      <div class="paper" style="--rot:${ROT[index % ROT.length]}">
        <div class="sheet">
          <div class="sheet__head">
            <span>Анкета · Компьютерный класс</span>
            <span>Лист ${index + 1} из ${SHEETS}</span>
          </div>
        </div>
      </div>`;
    const sheet = $('.sheet', section);
    if (typeof inner === 'string') sheet.insertAdjacentHTML('beforeend', inner);
    else sheet.appendChild(inner);
    stack.appendChild(section);
    return section;
  }

  // ───── Титульный лист ─────
  function buildTitle() {
    const today = new Date().toLocaleDateString('ru-RU');
    const el = makePage(0, `
      <div class="title-sheet">
        <h1 class="title-sheet__big">АНКЕТА</h1>
        <p class="title-sheet__sub">для учеников компьютерного класса: каким будет наш сайт</p>
        <div class="fields">
          <label class="field">
            <span class="field__label">Фамилия, имя (можно не писать)</span>
            <input class="field__input" id="fName" type="text" maxlength="50" autocomplete="off" placeholder="Иванов Ваня">
          </label>
          <label class="field">
            <span class="field__label">Класс</span>
            <input class="field__input" id="fKlass" type="text" maxlength="6" autocomplete="off" placeholder="5Б">
          </label>
          <div class="field field--wide">
            <span class="field__label">Дата</span>
            <span class="field__static">${today}</span>
          </div>
        </div>
        <div class="rules">
          <h3>Инструкция</h3>
          <ol>
            <li>В анкете <b>${Q.length} заданий</b> — по одному на каждом листе.</li>
            <li><b>Листай вниз</b> — следующий лист выезжает снизу. Можно листать колёсиком мыши или клавишей <b>PageDown</b>.</li>
            <li>Отметь <b>✓</b> подходящий вариант. Можно нажать цифру на клавиатуре: <b>1</b> — первый вариант, <b>2</b> — второй…</li>
            <li>Каждый ответ — это кусочек кода. Сайт на жёлтом стикере собирается сам, пока ты отвечаешь.</li>
            <li>На последнем листе проверь ответы, выбери, <b>кому отправить</b> анкету, и нажми <b>«Сдать работу»</b>.</li>
          </ol>
        </div>
      </div>
      <div class="sheet__foot">
        <span class="scribble">↓ листай вниз</span>
        <button class="btn-paper btn-paper--ink" type="button" data-start>Начать ↓</button>
      </div>`);
    $('[data-start]', el).addEventListener('click', () => go(1));
    $('#fName', el).addEventListener('input', (e) => { info.name = e.target.value.trim(); sendPreview(); refreshFinal(); });
    $('#fKlass', el).addEventListener('input', (e) => { info.klass = e.target.value.trim(); refreshFinal(); });
    pages.push({ el, kind: 'title' });
  }

  // ───── Лист с заданием ─────
  function buildQuestion(q, i) {
    const index = i + 1;
    const multi = q.type === 'multi';
    const el = makePage(index, `
      <div class="sheet__margin">${index}.</div>
      <p class="sheet__task">Задание ${index}</p>
      <h2 class="sheet__q">${esc(q.title)}</h2>
      <p class="sheet__hint">${esc(q.hint || '')}</p>
      <div class="answers" role="${multi ? 'group' : 'radiogroup'}" aria-label="${esc(q.title)}"></div>
      <div class="sheet__foot">
        <span class="scribble" data-foot-note>${index < Q.length ? '↓ листай вниз' : '↓ последний лист — сдать работу'}</span>
        <button class="btn-paper" type="button" data-next>${index < Q.length ? 'Дальше ↓' : 'К сдаче ↓'}</button>
      </div>`);

    const list = $('.answers', el);
    q.options.forEach((o, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'answer';
      b.dataset.id = o.id;
      if (!multi) b.setAttribute('role', 'radio');
      b.innerHTML = `
        <span class="answer__box">${CHECK}</span>
        <span class="answer__letter">${LETTERS[j]})</span>
        <span class="answer__text">
          <span class="answer__label">${o.swatch ? `<span class="answer__swatch" style="--sw:${o.swatch}"></span>` : ''}${esc(o.label)}</span>
          <span class="answer__desc">${esc(o.desc || '')}</span>
        </span>`;
      b.addEventListener('click', () => pick(q, o.id, index));
      list.appendChild(b);
    });

    $('[data-next]', el).addEventListener('click', () => go(index + 1));

    const refresh = () => {
      const sel = Engine.selectedIds(q.id);
      list.querySelectorAll('.answer').forEach((b) => {
        const on = sel.includes(b.dataset.id);
        b.classList.toggle('is-selected', on);
        b.setAttribute(multi ? 'aria-pressed' : 'aria-checked', String(on));
      });
    };
    refresh();
    pages.push({ el, kind: 'q', q, refresh });
  }

  function pick(q, optionId, index) {
    if (submitted) return;
    Engine.choose(q.id, optionId);
    pages[index].refresh();
    refreshTabs();
    refreshFinal();
    sendPreview();
    // одиночный выбор — сам перелистываем на следующий лист
    clearTimeout(autoNext);
    if (q.type !== 'multi') autoNext = setTimeout(() => go(index + 1), 700);
  }

  // ───── Последний лист ─────
  function buildFinal() {
    const index = SHEETS - 1;
    const recips = Sender.recipients();
    const el = makePage(index, `
      <p class="sheet__task">Завершение</p>
      <h2 class="sheet__q">Проверь работу и сдай</h2>
      <p class="sheet__hint">Если что-то не так — нажми на ответ, вернёшься к нужному листу.</p>
      <ol class="check-list" data-summary></ol>
      <label class="field__label" for="fComment">Своя идея: что добавить или поменять на сайте? (можно не писать)</label>
      <textarea class="lined" id="fComment" maxlength="800" rows="3"></textarea>
      <p class="field__label send-to__title">Кому отправить анкету?</p>
      <div class="answers send-to" role="radiogroup" aria-label="Кому отправить анкету" data-send-to></div>
      <input type="text" id="fHoney" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="error" data-error hidden></p>
      <div data-done></div>
      <div class="sheet__foot" data-foot>
        <span class="scribble">Удачи!</span>
        <button class="btn-paper btn-paper--red" type="button" data-submit>Сдать работу</button>
      </div>`);
    $('#fComment', el).addEventListener('input', (e) => { info.comment = e.target.value.trim(); });
    $('[data-submit]', el).addEventListener('click', submit);

    // варианты «кому отправить»
    const box = $('[data-send-to]', el);
    const choices = recips.map((r) => ({
      id: r.id,
      label: r.label,
      desc: r.email ? (r.hint ? r.hint + ' · ' : '') + 'придёт на почту' : (r.hint || '') + ' · ты скопируешь готовый текст'
    }));
    if (recips.length > 1) choices.push({ id: 'all', label: 'Всем сразу', desc: recips.map((r) => r.label.toLowerCase()).join(' и ') });
    choices.forEach((c, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'answer';
      b.setAttribute('role', 'radio');
      b.dataset.id = c.id;
      b.innerHTML = `
        <span class="answer__box">${CHECK}</span>
        <span class="answer__letter">${LETTERS[j]})</span>
        <span class="answer__text"><span class="answer__label">${esc(c.label)}</span><span class="answer__desc">${esc(c.desc)}</span></span>`;
      b.addEventListener('click', () => {
        if (submitted) return;
        info.sendTo = c.id;
        box.querySelectorAll('.answer').forEach((x) => {
          const on = x.dataset.id === c.id;
          x.classList.toggle('is-selected', on);
          x.setAttribute('aria-checked', String(on));
        });
      });
      box.appendChild(b);
    });
    // если адресат один — выбран сразу
    if (choices.length === 1) box.firstElementChild.click();

    pages.push({ el, kind: 'final' });
    refreshFinal();
  }

  function refreshFinal() {
    const final = pages.find((p) => p.kind === 'final');
    if (!final) return;
    const ol = $('[data-summary]', final.el);
    ol.innerHTML = '';
    Engine.describe().forEach((x, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="check-list__n">${i + 1}.</span><div><div class="check-list__q">${esc(x.question)}</div></div>`;
      const box = li.lastElementChild;
      const btn = document.createElement('button');
      btn.type = 'button';
      if (x.answer) {
        btn.className = 'check-list__a';
        btn.style.cssText = 'background:none;border:0;padding:0;cursor:pointer;text-align:left';
        btn.textContent = x.answer;
      } else {
        btn.className = 'check-list__miss';
        btn.textContent = 'нет ответа — вернуться к листу ' + (i + 2);
      }
      btn.addEventListener('click', () => go(i + 1));
      box.appendChild(btn);
      ol.appendChild(li);
    });
  }

  async function submit() {
    if (sending || submitted) return;
    const final = pages[pages.length - 1].el;
    const err = $('[data-error]', final);
    const missing = Q.map((q, i) => (Engine.isAnswered(q.id) ? null : i + 2)).filter(Boolean);
    if (missing.length) {
      err.hidden = false;
      err.textContent = 'Ответь на все задания. Пропущены листы: ' + missing.join(', ') + '.';
      return;
    }
    if (!info.sendTo) {
      err.hidden = false;
      err.textContent = 'Выбери, кому отправить анкету.';
      return;
    }
    err.hidden = true;
    sending = true;
    const btn = $('[data-submit]', final);
    btn.disabled = true;
    btn.textContent = 'Отправляю…';
    const slow = setTimeout(() => { btn.textContent = 'Ещё чуть-чуть… (до 30 сек)'; }, 4000);

    const ids = info.sendTo === 'all' ? Sender.recipients().map((r) => r.id) : [info.sendTo];
    const results = await Sender.deliver(ids, {
      subject: (window.CONFIG.SUBJECT || 'Анкета') + (info.name ? ' — ' + info.name : '') + (info.klass ? ', ' + info.klass : ''),
      fields: Sender.surveyFields(info),
      text: Sender.surveyText(info),
      honey: $('#fHoney').value
    });
    sending = false;
    clearTimeout(slow);

    // всё, что должно было уйти на почту, не ушло — даём попробовать ещё раз
    const failed = results.filter((r) => !r.ok);
    if (failed.length === results.length) {
      btn.disabled = false;
      btn.textContent = 'Сдать ещё раз';
      err.hidden = false;
      err.textContent = failed[0].error + ' Попробуй ещё раз или позови учителя.';
      return;
    }

    submitted = true;
    Engine.save();
    rememberStudent();

    const sheet = $('.sheet', final);
    const stamp = document.createElement('div');
    stamp.className = 'stamp';
    stamp.textContent = 'Сдано';
    sheet.appendChild(stamp);

    $('[data-foot]', final).remove();
    $('#fComment').readOnly = true;
    const done = $('[data-done]', final);
    const siteUrl = 'site.html?' + Engine.encode();
    done.innerHTML = `
      <p class="scribble" style="margin:18px 0 6px">Спасибо!</p>
      <ul class="delivery">${results.map((r) => `
        <li class="${r.ok ? '' : 'is-bad'}">
          ${r.mode === 'email'
            ? (r.ok ? '✓ ' + esc(r.recipient.label) + ': анкета отправлена на почту.' : '✗ ' + esc(r.recipient.label) + ': не отправилось — ' + esc(r.error))
            : '✎ ' + esc(r.recipient.label) + ': скопируй текст ниже и отправь ' + (r.recipient.suhtlus ? 'в Suhtlus' : 'сам') + '.'}
        </li>`).join('')}
      </ul>
      ${results.some((r) => r.mode === 'copy') ? `
        <div class="copy-box">
          <p class="copy-box__how">Как отправить в Suhtlus: открой Suhtlus → «Новое сообщение» → выбери учительницу → вставь текст (Ctrl + V) → отправь.</p>
          <textarea class="result-text" readonly rows="8">${esc(Sender.surveyText(info))}</textarea>
          <button class="btn-paper btn-paper--ink" type="button" data-copy>Скопировать текст</button>
        </div>` : ''}
      <div class="done-actions">
        <a class="btn-paper btn-paper--ink" href="${siteUrl}">Открыть сайт, который получился →</a>
        <button class="btn-paper" type="button" data-again>Заполнить заново</button>
      </div>`;
    $('[data-again]', done).addEventListener('click', restart);
    const copyBtn = $('[data-copy]', done);
    if (copyBtn) copyBtn.addEventListener('click', () => copyText($('textarea', done), copyBtn));
  }

  async function copyText(ta, btn) {
    try {
      await navigator.clipboard.writeText(ta.value);
    } catch (e) {
      ta.select();
      document.execCommand('copy');
    }
    btn.textContent = 'Скопировано ✓';
    setTimeout(() => { btn.textContent = 'Скопировать текст'; }, 2000);
  }

  // Имя и класс ученика пригодятся на сайте класса
  function rememberStudent() {
    if (!info.name && !info.klass) return;
    try {
      const d = JSON.parse(localStorage.getItem('klass-data') || '{}');
      if (info.name) d.name = info.name;
      if (info.klass) d.klass = info.klass;
      localStorage.setItem('klass-data', JSON.stringify(d));
    } catch (e) { /* память недоступна */ }
  }

  function restart() {
    Engine.reset();
    info.name = info.klass = info.comment = '';
    info.sendTo = null;
    submitted = false;
    stack.innerHTML = '';
    pages.length = 0;
    build();
    sendPreview();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // ───── Закладки, прогресс, перелистывание ─────
  function buildTabs() {
    tabsEl.innerHTML = '';
    pages.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sheet-tab';
      b.textContent = p.kind === 'title' ? 'Начало' : p.kind === 'final' ? 'Сдать' : 'Лист ' + (i + 1);
      b.addEventListener('click', () => go(i));
      tabsEl.appendChild(b);
    });
    refreshTabs();
  }

  function refreshTabs() {
    Array.from(tabsEl.children).forEach((b, i) => {
      const p = pages[i];
      b.classList.toggle('is-active', i === current);
      b.classList.toggle('is-done', p.kind === 'q' && Engine.isAnswered(p.q.id));
      if (i === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    bar.style.width = Math.round((current / (SHEETS - 1)) * 100) + '%';
  }

  function go(i) {
    if (i < 0 || i >= pages.length) return;
    clearTimeout(autoNext);
    pages[i].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  let observer = null;
  function watch() {
    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window)) {
      pages.forEach((p) => $('.paper', p.el).classList.add('is-in'));
      return;
    }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) $('.paper', e.target).classList.add('is-in');
        if (e.intersectionRatio >= 0.55) {
          current = pages.findIndex((p) => p.el === e.target);
          refreshTabs();
        }
      });
    }, { threshold: [0.15, 0.55] });
    pages.forEach((p) => observer.observe(p.el));
  }

  // Цифры 1–9 — выбрать вариант на текущем листе
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea') || e.ctrlKey || e.altKey || e.metaKey) return;
    const p = pages[current];
    if (!p || p.kind !== 'q') return;
    const n = Number(e.key);
    if (n >= 1 && n <= p.q.options.length) {
      e.preventDefault();
      pick(p.q, p.q.options[n - 1].id, current);
    }
  });

  // ───── Предпросмотр на стикере ─────
  function sendPreview() {
    const query = Engine.encode();
    previewLink.href = 'site.html' + (query ? '?' + query : '');
    if (!frame.contentWindow) return;
    const target = location.origin && location.origin !== 'null' ? location.origin : '*';
    frame.contentWindow.postMessage({ type: 'klass-config', query, name: info.name }, target);
  }
  frame.addEventListener('load', sendPreview);

  function build() {
    buildTitle();
    Q.forEach(buildQuestion);
    buildFinal();
    buildTabs();
    watch();
  }

  Engine.build();
  build();
})();
