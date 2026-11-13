/* Õpilase vaated: Minu tööd → töö info → lahendamine → tulemus. Iga funktsioon tagastab { el, destroy? }. */
(function () {
  const { h, icon, esc, fmtTime, plural } = UI;

  const back = (href, text) => `<a class="back" href="${href}">${icon('back')}<span>${text}</span></a>`;
  const minutesText = (m) => (m ? m + ' ' + L('min', 'мин') : L('piiramatu', 'без ограничения'));
  const qType = (t) => ({
    single: L('Vali üks õige vastus', 'Выбери один ответ'),
    multi: L('Vali kõik õiged vastused', 'Выбери все правильные ответы'),
    short: L('Kirjuta lühike vastus', 'Напиши короткий ответ'),
    text: L('Kirjuta vastus', 'Напиши ответ'),
    voice: L('Vasta häälega', 'Ответь голосом'),
    copy: L('Kirjuta tekst', 'Напиши текст')
  }[t]);

  const statusBadge = (e) => {
    if (!e || e.status === 'new') return `<span class="badge">${L('Alustamata', 'Не начата')}</span>`;
    if (e.status === 'progress') return `<span class="badge badge--warn">${L('Pooleli', 'В процессе')}</span>`;
    return `<span class="badge badge--ok">${L('Esitatud', 'Сдана')}</span>`;
  };

  async function deliver(entry) {
    const u = Core.user() || {};
    const w = entry.work;
    const teacherR = (Sender.recipients() || []).find((r) => r.id === 'teacher');
    const email = (w.teacher && w.teacher.email) || (teacherR && teacherR.email) || '';
    if (!email) return { mode: 'copy' };
    const rep = Core.report(entry);
    const fields = Object.assign({}, rep.fields);
    if (u.email) fields._replyto = u.email;
    const res = await Sender.post(email, L('Töö', 'Работа') + ': ' + Core.title(w) + ' — ' + (u.name || '') + (u.klass ? ', ' + u.klass : ''), fields);
    return { mode: 'email', ok: res.ok, error: res.error, to: email, at: Date.now() };
  }

  const Student = {
    // ───────── Testid: kood + kõik tööd ─────────
    async testid() {
      let works = [];
      let failed = '';
      try { works = await DB.list(); } catch (er) { failed = String(er.message || er); }
      const mine = Core.myWorks();
      const el = h(`
        <div class="page">
          <section class="card code-hero" id="codeBox">
            <div class="code-hero__steps">
              <span class="code-step is-on"><b>1</b> ${L('Sisesta kood', 'Введи код')}</span>
              <span class="code-step"><b>2</b> ${L('Alusta testi', 'Начни тест')}</span>
              <span class="code-step"><b>3</b> ${L('Esita', 'Сдай')}</span>
            </div>
            <h1>${L('Sisesta testi kood', 'Введи код теста')}</h1>
            <p class="muted">${L('Kood on tahvlil, näiteks', 'Код на доске, например')} <b>A1AAA</b>.</p>
            <form class="code-hero__form" data-code-form>
              <input class="input code-hero__input" maxlength="5" autocomplete="off" spellcheck="false" placeholder="A1AAA" aria-label="${L('Testi kood', 'Код теста')}" data-code>
              <button class="btn btn--lg" type="submit">${L('Alusta testi', 'Начать тест')} →</button>
            </form>
            <p class="alert alert--warn" data-err hidden></p>
          </section>

          <section class="card" id="testList">
            <h2>${icon('tests')} ${L('Kõik testid', 'Все тесты')}</h2>
            ${failed ? `<div class="alert alert--warn">${L('Teste ei saanud laadida', 'Не удалось загрузить тесты')}: ${esc(failed)}</div>` : ''}
            ${!DB.online ? `<p class="muted small">${L('Näha on selles arvutis loodud testid.', 'Видны тесты, созданные на этом компьютере.')}</p>` : ''}
            ${works.length ? `<div class="test-cards">${works.map((w) => {
              const e = mine[w.id];
              return `
                <article class="test-card">
                  <div class="test-card__top"><span class="test-card__code">${esc(w.code)}</span>${statusBadge(e)}</div>
                  <h3>${esc(Core.title(w))}</h3>
                  ${w.description ? `<p class="muted">${esc(w.description)}</p>` : ''}
                  <p class="meta">${icon('tests')} ${Core.leaves(w).length} ${L('küsimust', 'вопр.')} · ${icon('clock')} ${minutesText(w.minutes)}${w.teacher && w.teacher.name ? ' · ' + icon('user') + ' ' + esc(w.teacher.name) : ''}</p>
                  ${e && e.status === 'done'
                    ? `<a class="btn btn--ghost" href="#/tulemus/${w.id}">${L('Vaata tulemust', 'Посмотреть результат')}</a>`
                    : `<button class="btn" type="button" data-start="${esc(w.code)}">${e && e.status === 'progress' ? L('Jätka', 'Продолжить') : L('Alusta testi', 'Начать тест')} →</button>`}
                </article>`;
            }).join('')}</div>` : `<div class="empty empty--inline"><p class="muted">${L('Teste veel pole. Kui õpetaja loob testi, ilmub see siia.', 'Тестов пока нет. Когда учитель создаст тест, он появится здесь.')}</p></div>`}
          </section>
        </div>`);

      const form = el.querySelector('[data-code-form]');
      const inp = form.querySelector('[data-code]');
      const err = el.querySelector('[data-err]');
      inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); err.hidden = true; });
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const v = inp.value.trim();
        if (Core.numOf(v) == null) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); err.hidden = false; err.textContent = L('Kood on 5 märki: täht, number ja 3 tähte, näiteks B3AAA.', 'Код — 5 знаков: буква, цифра и 3 буквы, например B3AAA.'); return; }
        location.hash = '#/kood/' + Core.normCode(v);
      });
      el.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => { location.hash = '#/kood/' + b.dataset.start; }));
      setTimeout(() => inp.focus(), 50);
      return { el };
    },

    // ───────── Klassi leht (õpetaja tehtud) ─────────
    async page() {
      let text = '';
      try { text = await DB.getPage(); } catch (er) { /* tühi */ }
      const { blocks } = Lihtkood.parse(text);
      return { el: h(`
        <div class="page page--narrow">
          <div class="card lk-page">${text.trim() ? Lihtkood.render(blocks) : `<p class="muted">${L('Õpetaja pole veel klassi lehte teinud.', 'Учитель ещё не сделал страницу класса.')}</p>`}</div>
        </div>`) };
    },

    // ───────── Minu tööd ─────────
    list() {
      const works = Object.values(Core.myWorks()).sort((a, b) => (b.added || 0) - (a.added || 0));
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>${L('Minu tööd', 'Мои работы')}</h1>
            <p class="muted">${L('Siin on testid, mida oled alustanud või esitanud.', 'Здесь тесты, которые ты начал или сдал.')}</p>
          </div>

          <section class="card" id="workList">
            <h2>${icon('tests')} ${L('Tööd', 'Работы')}</h2>
            ${works.length ? `
              <div class="table-wrap"><table class="table works">
                <thead><tr>
                  <th>${L('Töö', 'Работа')}</th><th>${L('Õpetaja', 'Учитель')}</th><th>${L('Küsimusi', 'Вопросов')}</th>
                  <th>${L('Aeg', 'Время')}</th><th>${L('Olek', 'Статус')}</th><th></th>
                </tr></thead>
                <tbody>${works.map((e) => {
                  const w = e.work;
                  const action = e.status === 'done'
                    ? `<a class="btn btn--ghost btn--sm" href="#/tulemus/${w.id}">${L('Tulemus', 'Результат')}</a>`
                    : e.status === 'progress'
                      ? `<a class="btn btn--sm" href="#/lahenda/${w.id}">${L('Jätka', 'Продолжить')}</a>`
                      : `<a class="btn btn--sm" href="#/too/${w.id}">${L('Alusta', 'Начать')}</a>`;
                  return `<tr>
                    <td><a href="#/too/${w.id}"><b>${esc(Core.title(w))}</b></a>${w.subject ? `<br><span class="muted small">${esc(w.subject)}</span>` : ''}</td>
                    <td>${esc((w.teacher && w.teacher.name) || '—')}</td>
                    <td>${w.questions.length}</td>
                    <td>${minutesText(w.minutes)}</td>
                    <td>${statusBadge(e)}</td>
                    <td class="works__act">${action}</td>
                  </tr>`;
                }).join('')}</tbody>
              </table></div>` : `
              <div class="empty empty--inline">
                <div class="empty__icon">${icon('tests')}</div>
                <p><b>${L('Töid veel pole.', 'Работ пока нет.')}</b></p>
                <p class="muted">${L('Ava vahekaart «Testid» ja sisesta kood.', 'Открой вкладку «Testid» и введи код.')}</p><div class="row row--center"><a class="btn" href="#/">Testid</a></div>
              </div>`}
          </section>
        </div>`);

      return { el };
    },

    // ───────── Töö avamine lingist / koodist ─────────
    async open(enc) {
      const w = await Core.decode(enc);
      if (!w) return Student.broken();
      Core.addWork(w);
      location.replace('#/too/' + w.id);
      return { el: h('<div class="page"><p class="muted">…</p></div>') };
    },
    async openCode(code) {
      let w = null;
      try { w = await DB.get(decodeURIComponent(code)); } catch (er) { w = null; }
      if (!w) return Student.broken();
      Core.addWork(w);
      location.replace('#/too/' + w.id);
      return { el: h('<div class="page"><p class="muted">…</p></div>') };
    },
    broken() {
      return { el: h(`
        <div class="page page--narrow"><div class="card empty">
          <div class="empty__icon">?</div>
          <h1>${L('Tööd ei leitud', 'Работа не найдена')}</h1>
          <p class="muted">${L('Link või kood on vigane. Küsi õpetajalt uus link.', 'Ссылка или код неверные. Попроси у учителя новую ссылку.')}</p>
          <div class="row row--center"><a class="btn" href="#/">${L('Minu tööd', 'Мои работы')}</a></div>
        </div></div>`) };
    },

    // ───────── Töö info ja «Alusta» ─────────
    intro(id) {
      const e = Core.entry(id);
      if (!e) return Student.broken();
      const w = e.work;
      const g = Core.grade(w, []);
      const el = h(`
        <div class="page page--narrow">
          ${back('#/', 'Testid')}
          <article class="card">
            <p class="eyebrow">${icon('tests')} ${L('Töö', 'Работа')}</p>
            <h1>${esc(Core.title(w))}</h1>
            <dl class="facts-grid">
              <dt>${L('Õpetaja', 'Учитель')}</dt><dd>${esc((w.teacher && w.teacher.name) || '—')}</dd>
              ${w.subject ? `<dt>${L('Aine', 'Предмет')}</dt><dd>${esc(w.subject)}</dd>` : ''}
              ${w.klass ? `<dt>${L('Klass', 'Класс')}</dt><dd>${esc(w.klass)}</dd>` : ''}
              <dt>${L('Küsimusi', 'Вопросов')}</dt><dd>${Core.leaves(w).length}</dd>
              <dt>${L('Aeg', 'Время')}</dt><dd>${minutesText(w.minutes)}</dd>
              <dt>${L('Punkte', 'Баллов')}</dt><dd>${g.max + g.manual}</dd>
              <dt>${L('Olek', 'Статус')}</dt><dd>${statusBadge(e)}</dd>
            </dl>
            ${w.instructions ? `<div class="instructions"><b>${L('Juhend', 'Инструкция')}</b><p>${esc(w.instructions)}</p></div>` : ''}
            <ul class="rules">
              <li>${icon('check')} ${L('Vastused salvestuvad automaatselt — võid vahepeal lehe sulgeda.', 'Ответы сохраняются сами — можно закрыть страницу и вернуться.')}</li>
              ${w.minutes ? `<li>${icon('clock')} ${L('Aeg hakkab jooksma, kui vajutad «Alusta». Kui aeg saab otsa, töö esitatakse ise.', 'Время пойдёт после «Начать». Когда время выйдет, работа сдастся сама.')}</li>` : ''}
              <li>${icon('megaphone')} ${L('Lõpus vajuta «Esita töö» — vastused lähevad õpetajale.', 'В конце нажми «Сдать работу» — ответы уйдут учителю.')}</li>
              <li>${icon('cross')} ${L('Testis ei saa kopeerida. Kui lahkud testist (teine aken või sakk), näeb õpetaja seda.', 'В тесте нельзя копировать. Если уйдёшь из теста (другое окно или вкладка), учитель это увидит.')}</li>
            </ul>
            <div class="row">
              ${e.status === 'done'
                ? `<a class="btn btn--lg" href="#/tulemus/${w.id}">${L('Vaata tulemust', 'Посмотреть результат')}</a>`
                : `<a class="btn btn--lg" href="#/lahenda/${w.id}">${e.status === 'progress' ? L('Jätka', 'Продолжить') : L('Alusta', 'Начать')} →</a>`}
            </div>
          </article>
        </div>`);
      return { el };
    },

    // ───────── Lahendamine ─────────
    take(id) {
      const e = Core.entry(id);
      if (!e) return Student.broken();
      if (e.status === 'done') { location.replace('#/tulemus/' + id); return { el: h('<div></div>') }; }
      const w = e.work;
      const leaves = Core.leaves(w);
      const shuffle = (n) => { const a = Array.from({ length: n }, (_, k) => k); for (let k = n - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };

      if (e.status === 'new') {
        e.status = 'progress';
        e.startedAt = Date.now();
        e.answers = leaves.map((lf) => (Core.q(lf.raw).type === 'multi' ? [] : null));
        // igal õpilasel oma järjekord — raskem naabrilt maha kirjutada
        e.order = w.shuffleQuestions ? shuffle(w.questions.length) : w.questions.map((_, k) => k);
        e.opts = leaves.map((lf) => { const q = Core.q(lf.raw); return q.a && w.shuffleOptions !== false ? shuffle(q.a.length) : null; });
        e.away = { count: 0, seconds: 0 };
        Core.saveEntry(id, e);
      }
      if (!e.order) e.order = w.questions.map((_, k) => k);
      if (!e.away) e.away = { count: 0, seconds: 0 };
      const recorders = {};
      let pos = Math.min(e.current || 0, e.order.length - 1);   // mitmes ekraan
      let timer = null, finishing = false, lastPos = pos;

      const el = h(`
        <div class="page exam no-copy">
          <div class="exam__bar card">
            <div><p class="eyebrow">${L('Test', 'Тест')}${w.code ? ' · ' + esc(w.code) : ''}</p><b class="exam__title">${esc(Core.title(w))}</b></div>
            ${w.minutes ? `<div class="exam__time"><span class="muted small">${L('Aega jäänud', 'Осталось')}</span><span class="timer" data-timer>--:--</span></div>` : ''}
          </div>
          <div class="exam__grid">
            <nav class="exam__nav card" aria-label="${L('Küsimused', 'Вопросы')}">
              <p class="label">${L('Küsimused', 'Вопросы')}</p>
              <div class="dots dots--rings" data-dots></div>
            </nav>
            <section class="card exam__q" data-q></section>
          </div>
          <p class="exam__count muted" data-count></p>
        </div>`);
      const qBox = el.querySelector('[data-q]');
      const dots = el.querySelector('[data-dots]');
      const count = el.querySelector('[data-count]');

      const save = () => { e.current = pos; Core.saveEntry(id, e); };
      const leafIdx = (t) => leaves.map((lf, i) => ({ lf, i })).filter((x) => x.lf.top === t);
      const topFill = (t) => Core.topFill(w, e.answers, t);

      function drawDots() {
        dots.innerHTML = e.order.map((t, k) => {
          const f = topFill(t);
          return `<button type="button" class="dot ring ring--${f === 1 ? '1' : f > 0 ? '5' : '0'} ${k === pos ? 'is-current' : ''}" data-go="${k}" aria-label="${L('Küsimus', 'Вопрос')} ${k + 1}: ${f === 1 ? L('valmis', 'готово') : f > 0 ? L('pooleli', 'начато') : L('pole alustatud', 'не начато')}"><span>${k + 1}</span></button>`;
        }).join('');
        dots.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { pos = Number(b.dataset.go); draw(); }));
        const done = e.order.filter((t) => topFill(t) === 1).length;
        count.textContent = L('Valmis ', 'Готово ') + done + ' / ' + e.order.length;
      }

      // Ühe küsimuse vastamise koht
      function answerArea(i, label) {
        const q = Core.q(leaves[i].raw);
        const pts = Number(leaves[i].raw.points != null ? leaves[i].raw.points : 1);
        const wrap = h(`<div class="ans-block"></div>`);
        if (label) wrap.appendChild(h(`<p class="ans-block__q"><b>${label}</b> ${esc(q.q)} <span class="muted small">· ${qType(q.type)} · ${pts} ${L('p', 'б.')}</span></p>`));
        if (q.image) wrap.appendChild(Images.view(q.image, { alt: q.q }));
        const area = h('<div></div>');
        wrap.appendChild(area);
        const set = (v) => { e.answers[i] = v; save(); drawDots(); };

        if (q.type === 'single' || q.type === 'multi') {
          const order = (e.opts && e.opts[i]) || q.a.map((_, j) => j);
          const list = h(`<div class="opts opts--cols-${Number(q.cols || 1)}"></div>`);
          order.forEach((j) => {
            const on = q.type === 'multi' ? (e.answers[i] || []).includes(j) : e.answers[i] === j;
            const opt = h(`<label class="opt ${on ? 'is-on' : ''}"><input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="ans-${i}" ${on ? 'checked' : ''}><span>${esc(q.a[j])}</span></label>`);
            opt.querySelector('input').addEventListener('change', (ev) => {
              if (q.type === 'multi') {
                const s = new Set(e.answers[i] || []);
                ev.target.checked ? s.add(j) : s.delete(j);
                set(Array.from(s).sort());
              } else set(j);
              list.querySelectorAll('.opt').forEach((o) => o.classList.toggle('is-on', o.querySelector('input').checked));
            });
            list.appendChild(opt);
          });
          area.appendChild(list);
        } else if (q.type === 'short') {
          const inp = h(`<input class="input input--lg" type="text" maxlength="100" autocomplete="off" spellcheck="false" placeholder="${L('Sinu vastus', 'Твой ответ')}" aria-label="${L('Sinu vastus', 'Твой ответ')}">`);
          inp.value = e.answers[i] || '';
          inp.addEventListener('input', () => set(inp.value.trim()));
          area.appendChild(inp);
        } else if (q.type === 'text') {
          const box = h(`<div><textarea class="input textarea" rows="6" spellcheck="false" placeholder="${L('Kirjuta siia…', 'Пиши здесь…')}" aria-label="${L('Sinu vastus', 'Твой ответ')}"></textarea><p class="muted small" data-wc></p></div>`);
          const ta = box.querySelector('textarea');
          const wc = box.querySelector('[data-wc]');
          ta.value = e.answers[i] || '';
          const upd = () => {
            const n = ta.value.trim().split(/\s+/).filter(Boolean).length;
            wc.textContent = L('Sõnu: ', 'Слов: ') + n + (q.minWords ? L(' (vaja vähemalt ', ' (нужно хотя бы ') + q.minWords + ')' : '');
          };
          ta.addEventListener('input', () => { upd(); set(ta.value); });
          upd();
          area.appendChild(box);
        } else if (q.type === 'copy') {
          const box = h(`<div>
            ${q.mode === 'dictation'
              ? `<div class="alert alert--info">${icon('megaphone')} ${L('Õpetaja loeb teksti ette. Kirjuta see allolevasse kasti.', 'Учитель диктует текст. Пиши его в поле ниже.')}</div>`
              : `<div class="copy-src"><p class="label">${L('Kirjuta see tekst ümber', 'Перепиши этот текст')}</p><p>${esc(q.source || '')}</p></div>`}
            <textarea class="input textarea" rows="5" spellcheck="false" placeholder="${L('Kirjuta siia…', 'Пиши здесь…')}" aria-label="${L('Sinu tekst', 'Твой текст')}"></textarea>
          </div>`);
          const ta = box.querySelector('textarea');
          ta.value = e.answers[i] || '';
          ta.addEventListener('input', () => set(ta.value));
          area.appendChild(box);
        } else if (q.type === 'voice') {
          if (!recorders[i]) {
            recorders[i] = UI.recorder({ minSec: q.minSec, maxSec: 180, onRecorded(r) { set({ seconds: r.seconds, short: Boolean(r.short) }); } });
          }
          area.appendChild(recorders[i].el);
          if (e.answers[i] && e.answers[i].seconds) area.appendChild(h(`<p class="muted small">${L('Salvestis on olemas', 'Запись есть')}: ${e.answers[i].seconds} ${L('s', 'сек')}${e.answers[i].short ? ' — ' + L('liiga lühike, salvesta uuesti', 'слишком коротко, запиши ещё раз') : ''}.</p>`));
        }
        return wrap;
      }

      function draw() {
        save();
        qBox.classList.remove('q-anim', 'q-anim--back');
        void qBox.offsetWidth;
        qBox.classList.add('q-anim');
        if (pos < lastPos) qBox.classList.add('q-anim--back');
        lastPos = pos;
        const t = e.order[pos];
        const top = w.questions[t];
        const items = leafIdx(t);
        const last = pos === e.order.length - 1;
        qBox.innerHTML = '';
        if (top.type === 'group') {
          qBox.appendChild(h(`<p class="eyebrow">${L('Ülesanne', 'Задание')} ${pos + 1} / ${e.order.length} · ${items.length} ${L('küsimust', 'вопр.')}</p>`));
          if (top.q) qBox.appendChild(h(`<div class="task-intro">${esc(top.q)}</div>`));
          if (top.image) qBox.appendChild(Images.view(top.image));
          items.forEach((x, s) => qBox.appendChild(answerArea(x.i, (pos + 1) + '.' + (s + 1))));
        } else {
          const q = Core.q(top);
          const pts = Number(top.points != null ? top.points : 1);
          qBox.appendChild(h(`<p class="eyebrow">${L('Küsimus', 'Вопрос')} ${pos + 1} / ${e.order.length} · ${qType(q.type)} · ${pts} ${L('p', 'б.')}</p>`));
          qBox.appendChild(h(`<h2 class="test__q">${esc(q.q)}</h2>`));
          qBox.appendChild(answerArea(items[0].i, ''));
        }
        qBox.appendChild(h(`
          <div class="row row--between test__nav">
            <button class="btn btn--ghost" type="button" data-prev ${pos === 0 ? 'disabled' : ''}>← ${L('Eelmine', 'Назад')}</button>
            ${!last
              ? `<button class="btn btn--lg" type="button" data-next>${L('Järgmine', 'Дальше')} →</button>`
              : `<button class="btn btn--ok btn--lg" type="button" data-finish>${icon('check')} ${L('Esita töö', 'Сдать работу')}</button>`}
          </div>`));
        if (last) qBox.appendChild(h(`<p class="muted small exam__last">${L('See oli viimane küsimus. Kui oled valmis, vajuta «Esita töö».', 'Это был последний вопрос. Если готов, нажми «Сдать работу».')}</p>`));
        const pv = qBox.querySelector('[data-prev]');
        if (pv) pv.addEventListener('click', () => { pos--; draw(); });
        const nx = qBox.querySelector('[data-next]');
        if (nx) nx.addEventListener('click', () => { pos++; draw(); });
        const fin = qBox.querySelector('[data-finish]');
        if (fin) fin.addEventListener('click', () => finish(false));
        const first = qBox.querySelector('input[type="text"], textarea');
        if (first && !first.value) setTimeout(() => first.focus({ preventScroll: true }), 0);
        drawDots();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Enne esitamist: selge ülevaade, mis on pooleli
      function askSubmit() {
        return new Promise((resolve) => {
          const notDone = e.order.map((t, k) => ({ k, f: topFill(t) })).filter((x) => x.f < 1);
          const ov = h(`
            <div class="modal modal--anim" role="dialog" aria-modal="true" aria-labelledby="submitTitle">
              <div class="modal__box card submit-box">
                <div class="submit-box__icon">${icon(notDone.length ? 'clock' : 'check')}</div>
                <h2 id="submitTitle">${notDone.length ? L('Mõni küsimus on veel pooleli', 'Некоторые вопросы не закончены') : L('Kõik küsimused on vastatud!', 'На все вопросы есть ответ!')}</h2>
                ${notDone.length ? `
                  <p>${L('Vajuta numbrile, et minna tagasi:', 'Нажми на номер, чтобы вернуться:')}</p>
                  <div class="dots dots--rings submit-box__dots">${notDone.map((x) => `<button type="button" class="dot ring ring--${x.f > 0 ? '5' : '0'}" data-back="${x.k}"><span>${x.k + 1}</span></button>`).join('')}</div>` : `
                  <p>${L('Pärast esitamist vastuseid muuta ei saa.', 'После сдачи ответы изменить нельзя.')}</p>`}
                <div class="row row--center">
                  <button class="btn btn--ghost btn--lg" type="button" data-no>← ${L('Tagasi', 'Назад')}</button>
                  <button class="btn btn--ok btn--lg" type="button" data-yes>${icon('check')} ${L('Jah, esita töö', 'Да, сдать работу')}</button>
                </div>
              </div>
            </div>`);
          document.body.appendChild(ov);
          const done = (v) => { ov.remove(); resolve(v); };
          ov.querySelector('[data-yes]').addEventListener('click', () => done(true));
          ov.querySelector('[data-no]').addEventListener('click', () => done(false));
          ov.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { done(false); pos = Number(b.dataset.back); draw(); }));
          ov.querySelector('[data-no]').focus();
        });
      }

      async function finish(byTime) {
        if (finishing) return;
        if (!byTime && !(await askSubmit())) return;
        finishing = true;
        stopGuard();
        clearInterval(timer);
        Object.values(recorders).forEach((r) => r.destroy());
        e.status = 'done';
        e.submittedAt = Date.now();
        e.byTime = Boolean(byTime);
        e.result = Core.grade(w, e.answers);
        Core.saveEntry(id, e);

        el.innerHTML = `<div class="card empty"><div class="empty__icon">${icon('megaphone')}</div><h1>${L('Saadan vastused õpetajale…', 'Отправляю ответы учителю…')}</h1><p class="muted" data-slow></p></div>`;
        const slow = setTimeout(() => { const s = el.querySelector('[data-slow]'); if (s) s.textContent = L('Natuke veel… (kuni 30 sekundit)', 'Ещё чуть-чуть… (до 30 секунд)'); }, 4000);
        // tulemus läheb andmebaasi — õpetaja näeb seda saidil
        try {
          const u = Core.user() || {};
          const rec = JSON.parse(JSON.stringify({
            code: w.code || '', workId: w.id, title: Core.title(w),
            student: { name: u.name || '', klass: u.klass || '', email: u.email || '' },
            result: e.result, away: e.away, submittedAt: e.submittedAt, byTime: e.byTime, lang: LANG.get()
          }));
          rec.answers = JSON.stringify(e.answers);   // Firestore ei luba massiive massiivides
          e.resultId = await DB.saveResult(rec);
        } catch (er) { e.resultError = String(er.message || er); }
        e.delivery = await deliver(e);
        clearTimeout(slow);
        Core.saveEntry(id, e);
        location.replace('#/tulemus/' + id);
      }

      // ── maha kirjutamise vastu: kopeerimine keelatud, lahkumine loetakse ──
      let awayAt = 0;
      const block = (ev) => { if (el.contains(ev.target)) { ev.preventDefault(); UI.toast(L('Testis ei saa kopeerida ega kleepida.', 'В тесте нельзя копировать и вставлять.')); } };
      const onHide = () => {
        if (finishing) return;
        if (document.hidden) { awayAt = Date.now(); return; }
        if (awayAt) {
          e.away.count += 1;
          e.away.seconds += Math.round((Date.now() - awayAt) / 1000);
          awayAt = 0;
          Core.saveEntry(id, e);
          UI.toast(L('Sa lahkusid testist — õpetaja näeb seda.', 'Ты уходил из теста — учитель это увидит.'));
        }
      };
      const onBlur = () => { if (!finishing && !document.hidden) awayAt = awayAt || Date.now(); };
      const onFocus = () => { if (!document.hidden) onHide(); };
      ['copy', 'cut', 'paste', 'contextmenu', 'drop'].forEach((t) => document.addEventListener(t, block, true));
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
      function stopGuard() {
        ['copy', 'cut', 'paste', 'contextmenu', 'drop'].forEach((t) => document.removeEventListener(t, block, true));
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
      }

      if (w.minutes) {
        const deadline = e.startedAt + w.minutes * 60000;
        const tEl = el.querySelector('[data-timer]');
        const tick = () => {
          const left = (deadline - Date.now()) / 1000;
          tEl.textContent = fmtTime(left);
          tEl.classList.toggle('is-low', left < 60);
          if (left <= 0) finish(true);
        };
        timer = setInterval(tick, 500);
        tick();
      }

      draw();
      return {
        el,
        busy: () => !finishing,
        destroy() { clearInterval(timer); stopGuard(); Object.values(recorders).forEach((r) => r.destroy()); }
      };
    },

    // ───────── Tulemus (ilma punktide ja õigete vastusteta) ─────────
    result(id) {
      const e = Core.entry(id);
      if (!e || e.status !== 'done') return Student.broken();
      const w = e.work;
      const d = e.delivery || { mode: 'copy' };
      const rep = Core.report(e, true);
      const teacherEmail = (w.teacher && w.teacher.email) || '';
      const mailto = 'mailto:' + encodeURIComponent(teacherEmail) + '?subject=' + encodeURIComponent(L('Test', 'Тест') + ': ' + Core.title(w)) + '&body=' + encodeURIComponent(rep.text.slice(0, 1800));

      const el = h(`
        <div class="page page--narrow">
          ${back('#/', 'Testid')}
          <section class="card done-card">
            ${e.byTime ? `<div class="alert alert--warn">${L('Aeg sai otsa — töö esitati automaatselt.', 'Время вышло — работа сдана автоматически.')}</div>` : ''}
            <div class="done-card__icon">${icon('check')}</div>
            <h1>${L('Töö on esitatud!', 'Работа сдана!')}</h1>
            <p class="muted">${esc(Core.title(w))}</p>
            <p>${L('Õpetaja vaatab vastused üle ja paneb hinde.', 'Учитель проверит ответы и поставит оценку.')}</p>
          </section>

          <section class="card">
            <h2>${icon('megaphone')} ${L('Kas õpetaja sai vastused?', 'Получил ли учитель ответы?')}</h2>
            ${e.resultId ? `<div class="alert alert--ok">${icon('check')} ${L('Vastused on salvestatud — õpetaja näeb neid saidil.', 'Ответы сохранены — учитель видит их на сайте.')}</div>` : ''}
            ${d.mode === 'email' && d.ok ? `<div class="alert alert--ok">${icon('check')} ${L('Vastused saadeti õpetajale.', 'Ответы отправлены учителю.')}</div>` : ''}
            ${d.mode === 'email' && !d.ok ? `<div class="alert alert--warn">${icon('cross')} ${L('Saatmine ebaõnnestus', 'Отправка не удалась')}: ${esc(d.error || '')}</div>
              <div class="row"><button class="btn" type="button" data-resend>${L('Saada uuesti', 'Отправить ещё раз')}</button></div>` : ''}
            ${d.mode === 'copy' && !e.resultId ? `<div class="alert alert--info">${L('Saada vastused Stuudiumis: kopeeri tekst ja kleebi see õpetajale saadetavasse sõnumisse.', 'Отправь ответы в Stuudium: скопируй текст и вставь его в сообщение учителю.')}</div>` : ''}
            ${(d.mode === 'email' && d.ok) || e.resultId ? '' : `
              <p class="muted small">${L('Stuudium → Sõnumid → Uus sõnum → vali õpetaja → kleebi (Ctrl + V) → saada.', 'Stuudium → Сообщения → Новое сообщение → выбери учителя → вставь (Ctrl + V) → отправь.')}</p>
              <textarea class="input textarea" readonly rows="8" data-text></textarea>
              <div class="row">
                <button class="btn" type="button" data-copy>${icon('pencil')} ${L('Kopeeri tekst', 'Скопировать текст')}</button>
                ${teacherEmail ? `<a class="btn btn--ghost" href="${mailto}">${icon('megaphone')} ${L('Ava e-kiri', 'Открыть письмо')}</a>` : ''}
              </div>`}
          </section>
        </div>`);

      const ta = el.querySelector('[data-text]');
      if (ta) ta.value = rep.text;
      const cp = el.querySelector('[data-copy]');
      if (cp) cp.addEventListener('click', async () => {
        await UI.copy(rep.text);
        UI.toast(L('Tekst kopeeritud — kleebi see Stuudiumi sõnumisse', 'Текст скопирован — вставь его в сообщение Stuudium'));
      });
      const rs = el.querySelector('[data-resend]');
      if (rs) rs.addEventListener('click', async () => {
        rs.disabled = true;
        rs.textContent = L('Saadan…', 'Отправляю…');
        e.delivery = await deliver(e);
        Core.saveEntry(id, e);
        App.render();
      });
      return { el };
    }
  };

  window.Student = Student;
})();
