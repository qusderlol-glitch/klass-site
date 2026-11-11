/* Экран опроса: шаги, кнопки, предпросмотр и «код, который сайт написал сам». */
(function () {
  const $ = (s) => document.querySelector(s);
  const body = $('#surveyBody');
  const nav = $('#surveyNav');
  const meta = $('#surveyMeta');
  const bar = $('#progressBar');
  const codeView = $('#codeView');

  const total = Engine.questions.length;
  let step = 0;            // 0..total-1 — вопросы, total — финальный экран
  let sending = false;
  let finished = null;     // результат отправки

  // Заготовка для «живого» CSS: сюда движок вписывает собранную тему
  const styleTag = document.createElement('style');
  styleTag.id = 'generated-theme';
  document.head.appendChild(styleTag);

  ClassSite.mount($('#site'));

  // ───────── Реакция на каждое изменение ответов ─────────
  let prevCode = '';
  Engine.onChange((ctx) => {
    styleTag.textContent = ctx.generatedCSS;      // сайт переписывает свою тему
    ClassSite.update(ctx);
    renderCode(ctx);
  });

  function renderCode(ctx) {
    const text = ctx.generatedCSS + '\n\n' + ctx.generatedConfig;
    const prev = new Set(prevCode.split('\n'));
    codeView.innerHTML = '';
    text.split('\n').forEach((line) => {
      const span = document.createElement('span');
      span.className = 'code__line' + (prevCode && !prev.has(line) ? ' is-new' : '');
      span.textContent = line + '\n';
      codeView.appendChild(span);
    });
    prevCode = text;
  }

  // ───────── Вкладки справа ─────────
  document.querySelectorAll('.tabs__btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.tabs__btn').forEach((x) => {
        const on = x === b;
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-selected', String(on));
      });
      $('#tabSite').hidden = b.dataset.tab !== 'site';
      $('#tabCode').hidden = b.dataset.tab !== 'code';
    });
  });

  // ───────── Отрисовка шагов ─────────
  function render() {
    bar.style.width = Math.round((Math.min(step, total) / total) * 100) + '%';
    if (finished) return renderDone();
    step < total ? renderQuestion() : renderFinal();
  }

  function renderQuestion() {
    const q = Engine.questions[step];
    meta.textContent = 'Вопрос ' + (step + 1) + ' из ' + total;
    body.innerHTML = '';

    const h = document.createElement('h2');
    h.className = 'q__title';
    h.textContent = q.title;
    const p = document.createElement('p');
    p.className = 'q__hint';
    p.textContent = q.hint || '';
    body.append(h, p);

    const list = document.createElement('div');
    list.className = 'options';
    list.setAttribute('role', q.type === 'multi' ? 'group' : 'radiogroup');
    q.options.forEach((o) => {
      const selected = Engine.selectedIds(q.id).includes(o.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option' + (selected ? ' is-selected' : '');
      b.setAttribute(q.type === 'multi' ? 'aria-pressed' : 'aria-checked', String(selected));
      if (q.type !== 'multi') b.setAttribute('role', 'radio');

      const mark = document.createElement('span');
      mark.className = 'option__mark option__mark--' + (q.type === 'multi' ? 'check' : 'radio');
      if (o.swatch) mark.style.setProperty('--sw', o.swatch);
      if (o.swatch) mark.classList.add('option__mark--swatch');

      const text = document.createElement('span');
      text.className = 'option__text';
      const l = document.createElement('span');
      l.className = 'option__label';
      l.textContent = o.label;
      const d = document.createElement('span');
      d.className = 'option__desc';
      d.textContent = o.desc || '';
      text.append(l, d);

      b.append(mark, text);
      b.addEventListener('click', () => {
        Engine.choose(q.id, o.id);
        renderQuestion();
        renderNavBar();
      });
      list.appendChild(b);
    });
    body.appendChild(list);
    renderNavBar();
  }

  function renderNavBar() {
    nav.innerHTML = '';
    const back = btn('Назад', 'btn btn--ghost', () => { step--; render(); });
    back.disabled = step === 0;
    const q = Engine.questions[step];
    const next = btn(step === total - 1 ? 'Готово' : 'Далее', 'btn', () => { step++; render(); });
    next.disabled = !Engine.isAnswered(q.id);
    nav.append(back, next);
  }

  function renderFinal() {
    meta.textContent = 'Почти готово';
    body.innerHTML = '';
    nav.innerHTML = '';

    const h = document.createElement('h2');
    h.className = 'q__title';
    h.textContent = 'Проверь и отправь';
    body.appendChild(h);

    const sum = document.createElement('dl');
    sum.className = 'summary';
    Engine.describe().forEach((x) => {
      const dt = document.createElement('dt'); dt.textContent = x.question;
      const dd = document.createElement('dd'); dd.textContent = x.answer;
      sum.append(dt, dd);
    });
    body.appendChild(sum);

    const form = document.createElement('div');
    form.className = 'form';
    form.innerHTML = `
      <label class="form__label" for="fName">Как тебя зовут? <span class="muted">(можно не писать)</span></label>
      <input class="input" id="fName" type="text" maxlength="60" autocomplete="off">
      <label class="form__label" for="fComment">Что ещё добавить или поменять? <span class="muted">(можно не писать)</span></label>
      <textarea class="input" id="fComment" rows="3" maxlength="600"></textarea>
      <input type="text" id="fHoney" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:0;opacity:0">
      <p class="error" id="fError" hidden></p>`;
    body.appendChild(form);

    if (!Sender.hasEmail()) {
      const n = document.createElement('p');
      n.className = 'hint-box';
      n.textContent = 'Демо: почта пока не подключена, поэтому результат покажется на экране.';
      body.appendChild(n);
    }

    const back = btn('Назад', 'btn btn--ghost', () => { step--; render(); });
    const send = btn('Отправить', 'btn', async () => {
      if (sending) return;
      sending = true;
      send.disabled = true;
      send.textContent = 'Отправляю…';
      $('#fError').hidden = true;
      const res = await Sender.send($('#fName').value.trim(), $('#fComment').value.trim(), $('#fHoney').value);
      sending = false;
      if (res.ok) {
        finished = res;
        render();
      } else {
        send.disabled = false;
        send.textContent = 'Отправить ещё раз';
        const err = $('#fError');
        err.hidden = false;
        err.textContent = res.error + ' Попробуй ещё раз или скажи учителю.';
      }
    });
    nav.append(back, send);
  }

  function renderDone() {
    meta.textContent = 'Готово';
    bar.style.width = '100%';
    body.innerHTML = '';
    nav.innerHTML = '';

    const h = document.createElement('h2');
    h.className = 'q__title';
    h.textContent = 'Спасибо! Ответы получены';
    body.appendChild(h);

    const p = document.createElement('p');
    p.className = 'q__hint';
    p.textContent = finished.mode === 'email'
      ? 'Результат отправлен на почту. Сайт справа — такой, как ты его выбрал.'
      : 'Вот что получилось (в демо-режиме письмо не отправляется):';
    body.appendChild(p);

    if (finished.mode === 'local') {
      const pre = document.createElement('pre');
      pre.className = 'result';
      pre.textContent = finished.text;
      body.appendChild(pre);
    }

    nav.appendChild(btn('Пройти заново', 'btn btn--ghost', () => {
      finished = null; step = 0; Engine.reset(); prevCode = ''; render();
    }));
  }

  function btn(label, cls, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  Engine.build();
  render();
})();
