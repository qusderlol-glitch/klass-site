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
    voice: L('Vasta häälega', 'Ответь голосом')
  }[t]);

  const statusBadge = (e) => {
    if (!e || e.status === 'new') return `<span class="badge">${L('Alustamata', 'Не начата')}</span>`;
    if (e.status === 'progress') return `<span class="badge badge--warn">${L('Pooleli', 'В процессе')}</span>`;
    return `<span class="badge badge--ok">${L('Esitatud', 'Сдана')}${e.result && e.result.mark ? ' · ' + L('hinne ', 'оценка ') + e.result.mark : ''}</span>`;
  };

  // Lingist või koodist töö avamine
  function parseInput(v) {
    v = v.trim();
    const m = v.match(/#\/ava\/([A-Za-z0-9_-]+)/);
    if (m) return { enc: m[1] };
    if (/^[0-9]+([^0-9]+[0-9]+)+$/.test(v)) return { code: v };
    return null;
  }

  async function deliver(entry) {
    const u = Core.user() || {};
    const w = entry.work;
    const teacherR = (Sender.recipients() || []).find((r) => r.id === 'teacher');
    const email = (w.teacher && w.teacher.email) || (teacherR && teacherR.email) || '';
    if (!email) return { mode: 'copy' };
    const rep = Core.report(entry);
    const fields = Object.assign({}, rep.fields);
    if (u.email) { fields._cc = u.email; fields._replyto = u.email; }
    const res = await Sender.post(email, L('Töö', 'Работа') + ': ' + Core.title(w) + ' — ' + (u.name || '') + (u.klass ? ', ' + u.klass : ''), fields);
    return { mode: 'email', ok: res.ok, error: res.error, to: email, at: Date.now() };
  }

  const Student = {
    // ───────── Minu tööd ─────────
    list() {
      const works = Object.values(Core.myWorks()).sort((a, b) => (b.added || 0) - (a.added || 0));
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>${L('Minu tööd', 'Мои работы')}</h1>
            <p class="muted">${L('Siin on tööd, mille õpetaja sulle andis. Vali töö ja vajuta «Alusta».', 'Здесь работы, которые дал учитель. Выбери работу и нажми «Начать».')}</p>
          </div>

          <section class="card add-work" id="addWork">
            <h2>${icon('pencil')} ${L('Lisa töö', 'Добавить работу')}</h2>
            <p class="muted small">${L('Sisesta kood tahvlilt (näiteks 10-1-4-7) või kleebi link, mille õpetaja saatis Stuudiumis või e-postiga.', 'Введи код с доски (например 10-1-4-7) или вставь ссылку, которую учитель прислал в Stuudium или по e-mail.')}</p>
            <form class="row row--tight" data-add>
              <input class="input" type="text" placeholder="${L('Kood või link', 'Код или ссылка')}" aria-label="${L('Kood või link', 'Код или ссылка')}" data-input>
              <button class="btn" type="submit">${L('Ava', 'Открыть')}</button>
            </form>
            <p class="alert alert--warn" data-err hidden></p>
          </section>

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
                <p class="muted">${L('Õpetaja saadab lingi Stuudiumis või e-postiga või näitab koodi tahvlil. Sisesta see ülal.', 'Учитель пришлёт ссылку в Stuudium или по e-mail, или покажет код на доске. Введи его выше.')}</p>
              </div>`}
          </section>
        </div>`);

      const form = el.querySelector('[data-add]');
      const err = el.querySelector('[data-err]');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = parseInput(form.querySelector('[data-input]').value);
        if (!p) { err.hidden = false; err.textContent = L('See ei ole kood ega töö link. Kontrolli ja proovi uuesti.', 'Это не код и не ссылка на работу. Проверь и попробуй ещё раз.'); return; }
        location.hash = p.enc ? '#/ava/' + p.enc : '#/kood/' + p.code;
      });
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
    openCode(code) {
      const w = Core.fromCode(decodeURIComponent(code));
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
          ${back('#/', L('Minu tööd', 'Мои работы'))}
          <article class="card">
            <p class="eyebrow">${icon('tests')} ${L('Töö', 'Работа')}</p>
            <h1>${esc(Core.title(w))}</h1>
            <dl class="facts-grid">
              <dt>${L('Õpetaja', 'Учитель')}</dt><dd>${esc((w.teacher && w.teacher.name) || '—')}</dd>
              ${w.subject ? `<dt>${L('Aine', 'Предмет')}</dt><dd>${esc(w.subject)}</dd>` : ''}
              ${w.klass ? `<dt>${L('Klass', 'Класс')}</dt><dd>${esc(w.klass)}</dd>` : ''}
              <dt>${L('Küsimusi', 'Вопросов')}</dt><dd>${w.questions.length}</dd>
              <dt>${L('Aeg', 'Время')}</dt><dd>${minutesText(w.minutes)}</dd>
              <dt>${L('Punkte', 'Баллов')}</dt><dd>${g.max + g.manual}</dd>
              <dt>${L('Olek', 'Статус')}</dt><dd>${statusBadge(e)}</dd>
            </dl>
            ${w.instructions ? `<div class="instructions"><b>${L('Juhend', 'Инструкция')}</b><p>${esc(w.instructions)}</p></div>` : ''}
            <ul class="rules">
              <li>${icon('check')} ${L('Vastused salvestuvad automaatselt — võid vahepeal lehe sulgeda.', 'Ответы сохраняются сами — можно закрыть страницу и вернуться.')}</li>
              ${w.minutes ? `<li>${icon('clock')} ${L('Aeg hakkab jooksma, kui vajutad «Alusta». Kui aeg saab otsa, töö esitatakse ise.', 'Время пойдёт после «Начать». Когда время выйдет, работа сдастся сама.')}</li>` : ''}
              <li>${icon('megaphone')} ${L('Lõpus vajuta «Esita» — tulemus läheb õpetajale.', 'В конце нажми «Сдать» — результат уйдёт учителю.')}</li>
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
      if (e.status === 'new') {
        e.status = 'progress';
        e.startedAt = Date.now();
        e.answers = w.questions.map((q) => (Core.q(q).type === 'multi' ? [] : null));
        Core.saveEntry(id, e);
      }
      const qs = w.questions.map(Core.q);
      const recorders = {};
      let i = Math.min(e.current || 0, qs.length - 1);
      let timer = null, finishing = false;

      const el = h(`
        <div class="page exam">
          <div class="exam__bar card">
            <div><p class="eyebrow">${L('Töö', 'Работа')}</p><b class="exam__title">${esc(Core.title(w))}</b></div>
            ${w.minutes ? `<div class="exam__time"><span class="muted small">${L('Aega jäänud', 'Осталось')}</span><span class="timer" data-timer>--:--</span></div>` : ''}
          </div>
          <div class="exam__grid">
            <nav class="exam__nav card" aria-label="${L('Küsimused', 'Вопросы')}"><p class="label">${L('Küsimused', 'Вопросы')}</p><div class="dots" data-dots></div></nav>
            <section class="card exam__q" data-q></section>
          </div>
          <div class="exam__foot card">
            <span class="muted" data-count></span>
            <button class="btn btn--ok btn--lg" type="button" data-finish>${icon('check')} ${L('Lõpeta ja esita', 'Закончить и сдать')}</button>
          </div>
        </div>`);
      const qBox = el.querySelector('[data-q]');
      const dots = el.querySelector('[data-dots]');
      const count = el.querySelector('[data-count]');

      const answered = (k) => { const a = e.answers[k]; return Array.isArray(a) ? a.length > 0 : a != null && a !== ''; };
      const save = () => { e.current = i; Core.saveEntry(id, e); };

      function drawDots() {
        dots.innerHTML = qs.map((_, k) => `<button type="button" class="dot ${k === i ? 'is-current' : ''} ${answered(k) ? 'is-done' : ''}" data-go="${k}" aria-label="${L('Küsimus', 'Вопрос')} ${k + 1}">${k + 1}</button>`).join('');
        dots.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { i = Number(b.dataset.go); draw(); }));
        const n = qs.filter((_, k) => answered(k)).length;
        count.textContent = L('Vastatud ', 'Отвечено ') + n + ' / ' + qs.length;
      }

      function draw() {
        save();
        const q = qs[i];
        const pts = Number(w.questions[i].points != null ? w.questions[i].points : 1);
        qBox.innerHTML = `
          <p class="eyebrow">${L('Küsimus', 'Вопрос')} ${i + 1} / ${qs.length} · ${qType(q.type)} · ${pts} ${L('p', 'б.')}</p>
          <h2 class="test__q">${esc(q.q)}</h2>
          <div data-area></div>
          <div class="row row--between test__nav">
            <button class="btn btn--ghost" type="button" data-prev ${i === 0 ? 'disabled' : ''}>← ${L('Eelmine', 'Назад')}</button>
            ${i < qs.length - 1 ? `<button class="btn" type="button" data-next>${L('Järgmine', 'Дальше')} →</button>` : ''}
          </div>`;
        const area = qBox.querySelector('[data-area]');
        const set = (v) => { e.answers[i] = v; save(); drawDots(); };

        if (q.type === 'single' || q.type === 'multi') {
          const list = h('<div class="opts"></div>');
          q.a.forEach((txt, j) => {
            const on = q.type === 'multi' ? (e.answers[i] || []).includes(j) : e.answers[i] === j;
            const opt = h(`<label class="opt ${on ? 'is-on' : ''}"><input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="ans" ${on ? 'checked' : ''}><span>${esc(txt)}</span></label>`);
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
          const inp = h(`<input class="input input--lg" type="text" maxlength="100" autocomplete="off" placeholder="${L('Sinu vastus', 'Твой ответ')}" aria-label="${L('Sinu vastus', 'Твой ответ')}">`);
          inp.value = e.answers[i] || '';
          inp.addEventListener('input', () => set(inp.value.trim()));
          area.appendChild(inp);
          setTimeout(() => inp.focus(), 0);
        } else if (q.type === 'text') {
          const box = h(`<div><textarea class="input textarea" rows="7" placeholder="${L('Kirjuta siia…', 'Пиши здесь…')}" aria-label="${L('Sinu vastus', 'Твой ответ')}"></textarea><p class="muted small" data-wc></p></div>`);
          const ta = box.querySelector('textarea');
          const wc = box.querySelector('[data-wc]');
          ta.value = e.answers[i] || '';
          const upd = () => {
            const n = ta.value.trim().split(/\s+/).filter(Boolean).length;
            wc.textContent = L('Sõnu: ', 'Слов: ') + n + (q.minWords ? L(' (soovitus vähemalt ', ' (желательно хотя бы ') + q.minWords + ')' : '');
          };
          ta.addEventListener('input', () => { upd(); set(ta.value); });
          upd();
          area.appendChild(box);
        } else if (q.type === 'voice') {
          if (!recorders[i]) {
            const k = i;
            recorders[k] = UI.recorder({ minSec: q.minSec, maxSec: 180, onRecorded(r) { e.answers[k] = { seconds: r.seconds }; save(); drawDots(); } });
          }
          area.appendChild(recorders[i].el);
          if (e.answers[i] && e.answers[i].seconds) area.appendChild(h(`<p class="muted small">${L('Salvestis on olemas', 'Запись есть')}: ${e.answers[i].seconds} ${L('s', 'сек')}.</p>`));
          area.appendChild(h(`<p class="muted small">${L('Häälvastust hindab õpetaja. Salvestis jääb sellesse arvutisse.', 'Голосовой ответ оценивает учитель. Запись остаётся на этом компьютере.')}</p>`));
        }

        const pv = qBox.querySelector('[data-prev]');
        if (pv) pv.addEventListener('click', () => { i--; draw(); });
        const nx = qBox.querySelector('[data-next]');
        if (nx) nx.addEventListener('click', () => { i++; draw(); });
        drawDots();
      }

      async function finish(byTime) {
        if (finishing) return;
        if (!byTime) {
          const empty = qs.filter((_, k) => !answered(k)).length;
          const msg = empty
            ? L('Vastamata küsimusi: ' + empty + '. Kas esitad töö ikkagi?', 'Без ответа: ' + empty + '. Всё равно сдать работу?')
            : L('Kas esitad töö? Pärast esitamist vastuseid muuta ei saa.', 'Сдать работу? После этого ответы изменить нельзя.');
          if (!confirm(msg)) return;
        }
        finishing = true;
        clearInterval(timer);
        Object.values(recorders).forEach((r) => r.destroy());
        e.status = 'done';
        e.submittedAt = Date.now();
        e.byTime = Boolean(byTime);
        e.result = Core.grade(w, e.answers);
        Core.saveEntry(id, e);

        el.innerHTML = `<div class="card empty"><div class="empty__icon">${icon('megaphone')}</div><h1>${L('Saadan tulemust õpetajale…', 'Отправляю результат учителю…')}</h1><p class="muted" data-slow></p></div>`;
        const slow = setTimeout(() => { const s = el.querySelector('[data-slow]'); if (s) s.textContent = L('Natuke veel… (kuni 30 sekundit)', 'Ещё чуть-чуть… (до 30 секунд)'); }, 4000);
        e.delivery = await deliver(e);
        clearTimeout(slow);
        Core.saveEntry(id, e);
        location.replace('#/tulemus/' + id);
      }

      el.querySelector('[data-finish]').addEventListener('click', () => finish(false));

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
        destroy() { clearInterval(timer); Object.values(recorders).forEach((r) => r.destroy()); }
      };
    },

    // ───────── Tulemus ─────────
    result(id) {
      const e = Core.entry(id);
      if (!e || e.status !== 'done') return Student.broken();
      const w = e.work;
      const r = e.result;
      const d = e.delivery || { mode: 'copy' };
      const rep = Core.report(e);
      const teacherEmail = (w.teacher && w.teacher.email) || '';
      const mailto = 'mailto:' + encodeURIComponent(teacherEmail) + '?subject=' + encodeURIComponent(L('Töö', 'Работа') + ': ' + Core.title(w)) + '&body=' + encodeURIComponent(rep.text.slice(0, 1800));

      const el = h(`
        <div class="page page--narrow">
          ${back('#/', L('Minu tööd', 'Мои работы'))}
          <section class="card">
            ${e.byTime ? `<div class="alert alert--warn">${L('Aeg sai otsa — töö esitati automaatselt.', 'Время вышло — работа сдана автоматически.')}</div>` : ''}
            <div class="result">
              <div class="mark ${r.mark ? 'mark--' + Math.max(2, r.mark) : ''}">${r.mark || '✎'}</div>
              <div>
                <h1>${L('Töö on esitatud!', 'Работа сдана!')}</h1>
                <p>${esc(Core.title(w))}</p>
                ${r.max ? `<p><b>${r.points} / ${r.max}</b> ${L('punkti', 'баллов')} (${r.percent}%)${r.mark ? ' · ' + L('hinne ', 'оценка ') + r.mark : ''}</p>` : ''}
                ${r.manual ? `<p class="muted">${icon('pencil')} ${L('Pikad ja häälvastused hindab õpetaja', 'Развёрнутые и голосовые ответы оценит учитель')} (${r.manual} ${L('p', 'б.')}).</p>` : ''}
              </div>
            </div>
          </section>

          <section class="card">
            <h2>${icon('megaphone')} ${L('Kas õpetaja sai tulemuse?', 'Получил ли учитель результат?')}</h2>
            ${d.mode === 'email' && d.ok ? `<div class="alert alert--ok">${icon('check')} ${L('Tulemus saadeti õpetaja e-postile', 'Результат отправлен учителю на почту')} (${esc(d.to)}).</div>` : ''}
            ${d.mode === 'email' && !d.ok ? `<div class="alert alert--warn">${icon('cross')} ${L('E-posti saatmine ebaõnnestus', 'Отправка на почту не удалась')}: ${esc(d.error || '')}</div>
              <div class="row"><button class="btn" type="button" data-resend>${L('Saada uuesti', 'Отправить ещё раз')}</button></div>` : ''}
            ${d.mode === 'copy' ? `<div class="alert alert--info">${L('Õpetaja e-post pole lisatud. Saada tulemus Stuudiumis: kopeeri tekst ja kleebi see õpetajale saadetavasse sõnumisse.', 'У учителя не указана почта. Отправь результат в Stuudium: скопируй текст и вставь его в сообщение учителю.')}</div>` : ''}
            <details class="copy-details" ${d.mode === 'email' && d.ok ? '' : 'open'}>
              <summary>${L('Saada Stuudiumis või e-postiga ise', 'Отправить самому через Stuudium или e-mail')}</summary>
              <p class="muted small">${L('Stuudium → Sõnumid → Uus sõnum → vali õpetaja → kleebi tekst (Ctrl + V) → saada.', 'Stuudium → Сообщения → Новое сообщение → выбери учителя → вставь текст (Ctrl + V) → отправь.')}</p>
              <textarea class="input textarea" readonly rows="8" data-text></textarea>
              <div class="row">
                <button class="btn" type="button" data-copy>${icon('pencil')} ${L('Kopeeri tekst', 'Скопировать текст')}</button>
                <a class="btn btn--ghost" href="${mailto}">${icon('megaphone')} ${L('Ava e-kiri', 'Открыть письмо')}</a>
              </div>
            </details>
          </section>

          ${w.showAnswers !== false ? `
          <section class="card">
            <h2>${L('Vastuste ülevaade', 'Разбор ответов')}</h2>
            <ol class="review">${w.questions.map((raw, k) => {
              const q = Core.q(raw);
              const ok = r.per[k].ok;
              return `<li class="review__item ${ok === null ? 'is-voice' : ok ? 'is-ok' : 'is-bad'}">
                <span class="review__icon">${icon(ok === null ? 'pencil' : ok ? 'check' : 'cross')}</span>
                <div><b>${esc(q.q)}</b>
                  <p>${L('Sinu vastus', 'Твой ответ')}: ${esc(Core.answerText(q, e.answers[k]))}</p>
                  ${ok === false ? `<p class="review__right">${L('Õige', 'Правильно')}: ${esc(Core.rightText(q))}</p>` : ''}
                  ${ok === null ? `<p class="muted small">${L('Hindab õpetaja', 'Оценит учитель')}</p>` : ''}
                </div></li>`;
            }).join('')}</ol>
          </section>` : ''}
        </div>`);

      el.querySelector('[data-text]').value = rep.text;
      el.querySelector('[data-copy]').addEventListener('click', async () => {
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
