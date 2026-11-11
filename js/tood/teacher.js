/* Õpetaja vaated: töölaud, töö koostamine, jagamine, tulemused ja vastused, taimer. */
(function () {
  const { h, icon, esc, fmtTime, plural } = UI;
  const back = (href, text) => `<a class="back" href="${href}">${icon('back')}<span>${text}</span></a>`;
  const TYPES = () => [
    ['single', L('Üks õige vastus', 'Один правильный ответ')],
    ['multi', L('Mitu õiget vastust', 'Несколько правильных')],
    ['short', L('Lühivastus (sõna või number)', 'Короткий ответ (слово или число)')],
    ['text', L('Pikk vastus (tekst)', 'Развёрнутый ответ (текст)')],
    ['voice', L('Häälvastus', 'Голосовой ответ')],
    ['copy', L('Kiri: ümberkirjutamine või etteütlus', 'Письмо: переписать или диктант')]
  ];

  function drawQR(el, text, size) {
    el.innerHTML = '';
    if (!window.QRCode) { el.innerHTML = `<p class="muted small">${L('QR-kood ei laadinud (interneti puudumine?).', 'QR-код не загрузился (нет интернета?).')}</p>`; return; }
    try {
      new QRCode(el, { text, width: size, height: size, colorDark: '#111111', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.L });
      el.title = '';
    } catch (e) {
      el.innerHTML = `<p class="muted small">${L('Töö on QR-koodi jaoks liiga suur — kasuta linki.', 'Работа слишком большая для QR-кода — используй ссылку.')}</p>`;
    }
  }

  // Tahvel / projektor: kõik suurelt
  function projector(w, url) {
    const code = w.code || '';
    const ov = h(`
      <div class="projector" role="dialog" aria-modal="true">
        <div class="projector__bar">
          <button class="btn btn--ghost" type="button" data-full>${icon('monitor')} ${L('Täisekraan', 'На весь экран')}</button>
          <button class="btn" type="button" data-close>${icon('cross')} ${L('Sulge (Esc)', 'Закрыть (Esc)')}</button>
        </div>
        <div class="projector__body">
          <div class="projector__text">
            <p class="projector__topic">${esc(w.title)}</p>
            <ol class="projector__steps">
              <li>${L('Ava sait ja sisene:', 'Открой сайт и войди:')}<b class="projector__url">${esc(Core.siteUrl())}</b></li>
              ${code
                ? `<li>${L('Vahekaart «Testid» → sisesta kood:', 'Вкладка «Testid» → введи код:')}<b class="projector__code">${esc(code)}</b></li>`
                : `<li>${L('Ava link, mille saatsin Stuudiumis, või skaneeri QR-kood.', 'Открой ссылку из Stuudium или отсканируй QR-код.')}</li>`}
              <li>${L('Vajuta «Alusta testi». Lõpus «Esita».', 'Нажми «Начать тест». В конце «Сдать».')}</li>
            </ol>
          </div>
          <div class="projector__qr"><div data-qr></div><p>${L('või skaneeri telefoniga', 'или отсканируй телефоном')}</p></div>
        </div>
      </div>`);
    document.body.appendChild(ov);
    drawQR(ov.querySelector('[data-qr]'), url, Math.min(360, Math.round(window.innerHeight * 0.42)));
    const close = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); document.removeEventListener('keydown', onKey); ov.remove(); };
    const onKey = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) close(); };
    document.addEventListener('keydown', onKey);
    ov.querySelector('[data-close]').addEventListener('click', close);
    ov.querySelector('[data-full]').addEventListener('click', () => { if (ov.requestFullscreen) ov.requestFullscreen().catch(() => UI.toast('F11')); });
  }

  async function loadWork(id) {
    if (id && id[0] === 'k') { try { return await DB.get(id.slice(1)); } catch (e) { return null; } }
    return Core.teacherWorks()[id] || null;
  }

  const offlineNote = () => DB.online ? '' : `<div class="alert alert--warn">${icon('megaphone')} ${L('Firebase pole veel ühendatud: testid on näha ainult selles arvutis. Kui Firebase on config.js-is, näevad kõik õpilased teste oma arvutis.', 'Firebase ещё не подключён: тесты видны только на этом компьютере. Когда Firebase будет в config.js, все ученики увидят тесты на своих компьютерах.')}</div>`;

  function sampleWork() {
    const u = Core.user() || {};
    return {
      id: Core.newId(),
      title: L('Arvuti ja turvalisus (näidis)', 'Компьютер и безопасность (пример)'),
      subject: L('Informaatika', 'Информатика'),
      klass: '',
      minutes: 15,
      instructions: L('Loe küsimused hoolikalt läbi. Lõpus vajuta «Esita».', 'Внимательно читай вопросы. В конце нажми «Сдать».'),
      description: L('Arvuti osad, paroolid ja internetiturvalisus.', 'Части компьютера, пароли и безопасность в интернете.'),
      allowTypos: true,
      teacher: { name: u.name || '', email: u.email || '' },
      showAnswers: true,
      created: Date.now(),
      questions: [1, 3, 5, 6, 9, 14].map((id) => ({ bank: id, points: 1 }))
    };
  }

  // Taimer jookseb edasi ka teisel lehel
  const T = { total: 300, left: 300, running: false, endAt: 0, done: false, onUpdate: null, tick: null };
  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.45, 0.9].forEach((t) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.4, ac.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.35);
        o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.4);
      });
      setTimeout(() => ac.close(), 1600);
    } catch (e) { /* ilma helita */ }
  }

  const Teacher = {
    // ───────── Töölaud ─────────
    async dash() {
      const u = Core.user() || {};
      let works = [];
      try { works = await DB.list(); } catch (e) { works = []; }
      const el = h(`
        <div class="page">
          ${offlineNote()}
          <section class="hero card">
            <div>
              <p class="hero__date">${new Date().toLocaleDateString(LANG.locale(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <h1>${L('Tere', 'Здравствуйте')}, ${esc(u.name || '')}!</h1>
              <p class="muted">${L('Siin koostad töid. Õpilased näevad neid oma lehel «Minu tööd», lahendavad ja esitavad.', 'Здесь вы создаёте работы. Ученики видят их на странице «Мои работы», выполняют и сдают.')}</p>
            </div>
            <div class="hero__art" aria-hidden="true">${icon('book')}</div>
          </section>

          <h2 class="section-title">${L('Kolm sammu', 'Три шага')}</h2>
          <ol class="steps-cards">
            <li class="card"><span class="steps-cards__n">1</span><h3>${L('Koosta töö', 'Создайте работу')}</h3>
              <p class="muted">${L('Kirjuta küsimused ise või vali küsimuste pangast.', 'Напишите вопросы сами или возьмите из банка.')}</p>
              <a class="btn" href="#/uus">${L('Koosta uus töö', 'Создать работу')}</a></li>
            <li class="card"><span class="steps-cards__n">2</span><h3>${L('Jaga õpilastega', 'Отправьте ученикам')}</h3>
              <p class="muted">${L('Stuudiumi sõnumis, e-postiga või koodina tahvlil.', 'В сообщении Stuudium, по e-mail или кодом на доске.')}</p>
              <span class="muted small">${L('Nupp «Jaga» on töö juures.', 'Кнопка «Поделиться» — у каждой работы.')}</span></li>
            <li class="card"><span class="steps-cards__n">3</span><h3>${L('Saa tulemused', 'Получите результаты')}</h3>
              <p class="muted">${u.email ? L('Tulemused tulevad e-postile ', 'Результаты придут на почту ') + esc(u.email) + '.' : L('Lisa oma e-post seadetes — siis tulevad tulemused automaatselt. Muidu saadavad õpilased need Stuudiumis.', 'Укажите e-mail в настройках — тогда результаты будут приходить сами. Иначе ученики пришлют их в Stuudium.')}</p>
              <a class="btn btn--ghost" href="#/tulemused">${L('Tulemused ja vastused', 'Результаты и ответы')}</a></li>
          </ol>

          <section class="card" id="myWorks">
            <div class="row row--between card-head">
              <h2>${icon('tests')} ${L('Minu koostatud tööd', 'Мои работы')}</h2>
              <a class="btn" href="#/uus">${icon('pencil')} ${L('Uus töö', 'Новая работа')}</a>
            </div>
            ${works.length ? `
              <div class="table-wrap"><table class="table works">
                <thead><tr><th>${L('Kood', 'Код')}</th><th>${L('Töö', 'Работа')}</th><th>${L('Küsimusi', 'Вопросов')}</th><th>${L('Aeg', 'Время')}</th><th>${L('Loodud', 'Создана')}</th><th></th></tr></thead>
                <tbody>${works.map((w) => `
                  <tr>
                    <td><b class="code-chip">${esc(w.code || '')}</b></td>
                    <td><b>${esc(w.title)}</b>${w.klass ? `<br><span class="muted small">${esc(w.klass)}</span>` : ''}</td>
                    <td>${w.questions.length}</td>
                    <td>${w.minutes ? w.minutes + ' ' + L('min', 'мин') : '—'}</td>
                    <td class="muted">${new Date(w.created || w.updated || Date.now()).toLocaleDateString(LANG.locale())}</td>
                    <td class="works__act">
                      <a class="btn btn--sm" href="#/jaga/${w.id}">${L('Jaga', 'Поделиться')}</a>
                      <a class="btn btn--ghost btn--sm" href="#/muuda/${w.id}">${L('Muuda', 'Изменить')}</a>
                      <button class="btn btn--ghost btn--sm btn--danger" type="button" data-del="${esc(w.code || '')}">${L('Kustuta', 'Удалить')}</button>
                    </td>
                  </tr>`).join('')}</tbody>
              </table></div>` : `
              <div class="empty empty--inline">
                <p><b>${L('Sul pole veel töid.', 'У вас пока нет работ.')}</b></p>
                <p class="muted">${L('Koosta uus töö või proovi kohe näidistööd.', 'Создайте работу или попробуйте готовый пример.')}</p>
                <div class="row row--center"><a class="btn" href="#/uus">${L('Koosta töö', 'Создать работу')}</a><button class="btn btn--ghost" type="button" data-sample>${L('Lisa näidistöö', 'Добавить пример')}</button></div>
              </div>`}
          </section>
        </div>`);
      el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
        if (!confirm(L('Kustutada töö? Õpilastel, kes selle juba avasid, jääb see alles.', 'Удалить работу? У учеников, которые её уже открыли, она останется.'))) return;
        DB.remove(b.dataset.del).then(() => App.render()).catch((e) => UI.toast(String(e.message || e)));
      }));
      const s = el.querySelector('[data-sample]');
      if (s) s.addEventListener('click', async () => { s.disabled = true; const w = await DB.publish(sampleWork()); location.hash = '#/jaga/' + w.id; });
      return { el };
    },

    // ───────── Töö koostamine / muutmine ─────────
    async edit(id) {
      const u = Core.user() || {};
      const existing = id ? await loadWork(id) : null;
      if (id && !existing) return { el: h(`<div class="page"><p>${L('Tööd ei leitud.', 'Работа не найдена.')}</p></div>`) };
      const w = existing ? JSON.parse(JSON.stringify(existing)) : {
        id: Core.newId(), title: '', subject: L('Informaatika', 'Информатика'), klass: '', minutes: 20, instructions: '',
        teacher: { name: u.name || '', email: u.email || '' }, showAnswers: true, allowTypos: true, description: '', created: Date.now(), questions: []
      };

      const el = h(`
        <div class="page">
          ${back('#/', L('Töölaud', 'Главная'))}
          <div class="page-head">
            <h1>${existing ? L('Muuda tööd', 'Изменить работу') : L('Koosta uus töö', 'Новая работа')}</h1>
            <p class="muted">${L('Täida põhiandmed, lisa küsimused ja salvesta. Siis saad töö õpilastega jagada.', 'Заполните данные, добавьте вопросы и сохраните. Потом работой можно поделиться.')}</p>
          </div>
          <section class="card">
            <h2>1. ${L('Põhiandmed', 'Основное')}</h2>
            <div class="form-grid">
              <label class="field-row form-grid__wide"><span class="label">${L('Pealkiri', 'Название')} *</span><input class="input" data-w="title" maxlength="90" placeholder="${L('nt Arvuti osad', 'напр. Части компьютера')}"></label>
              <label class="field-row"><span class="label">${L('Aine', 'Предмет')}</span><input class="input" data-w="subject" maxlength="40"></label>
              <label class="field-row"><span class="label">${L('Klass', 'Класс')}</span><input class="input" data-w="klass" maxlength="10" placeholder="6A"></label>
              <label class="field-row"><span class="label">${L('Aeg minutites (0 = piiramatu)', 'Время в минутах (0 = без ограничения)')}</span><input class="input" data-w="minutes" type="number" min="0" max="180"></label>
              <label class="field-row form-grid__wide"><span class="label">${L('Kirjeldus (näha testide nimekirjas)', 'Описание (видно в списке тестов)')}</span><input class="input" data-w="description" maxlength="160" placeholder="${L('nt Arvuti osad ja nende ülesanded', 'напр. Части компьютера и их задачи')}"></label>
              <label class="field-row form-grid__wide"><span class="label">${L('Juhend õpilastele', 'Инструкция ученикам')}</span><textarea class="input" data-w="instructions" rows="2" maxlength="400"></textarea></label>
              <label class="field-row form-grid__wide"><span class="label">${L('Tulemused saata e-postile', 'Результаты отправлять на e-mail')}</span><input class="input" data-w="email" type="email" maxlength="80" placeholder="opetaja@kool.ee">
                <span class="muted small">${L('Kui jätad tühjaks, saadavad õpilased tulemuse Stuudiumis (kopeerivad teksti).', 'Если оставить пустым, ученики пришлют результат в Stuudium (скопируют текст).')}</span></label>
              <label class="check-row form-grid__wide"><input type="checkbox" data-w="allowTypos"> ${L('Paranda väikesed trükivead (nt «klaviatuuur» = «klaviatuur»)', 'Исправлять мелкие опечатки (напр. «процесор» = «процессор»)')}</label>
              <label class="check-row form-grid__wide"><input type="checkbox" data-w="showAnswers"> ${L('Näita õpilasele pärast esitamist õigeid vastuseid', 'Показывать ученику правильные ответы после сдачи')}</label>
            </div>
          </section>

          <section class="card">
            <div class="row row--between card-head">
              <h2>2. ${L('Küsimused', 'Вопросы')} <span class="badge" data-qcount></span></h2>
              <div class="row row--tight">
                <button class="btn" type="button" data-addq>${icon('pencil')} ${L('Lisa küsimus', 'Добавить вопрос')}</button>
                <button class="btn btn--ghost" type="button" data-bank>${icon('book')} ${L('Küsimuste pangast', 'Из банка вопросов')}</button>
              </div>
            </div>
            <div data-qs></div>
          </section>

          <div class="card save-bar">
            <p class="alert alert--warn" data-err hidden></p>
            <div class="row row--between">
              <a class="btn btn--ghost" href="#/">${L('Tühista', 'Отмена')}</a>
              <button class="btn btn--lg" type="button" data-save>${icon('check')} ${L('Salvesta ja jaga', 'Сохранить и поделиться')}</button>
            </div>
          </div>
        </div>`);

      // põhiandmed
      const wf = (k) => el.querySelector(`[data-w="${k}"]`);
      wf('title').value = w.title; wf('subject').value = w.subject || ''; wf('klass').value = w.klass || '';
      wf('minutes').value = w.minutes || 0; wf('instructions').value = w.instructions || '';
      wf('email').value = (w.teacher && w.teacher.email) || ''; wf('showAnswers').checked = w.showAnswers !== false;
      wf('description').value = w.description || ''; wf('allowTypos').checked = w.allowTypos !== false;
      el.querySelectorAll('[data-w]').forEach((inp) => inp.addEventListener('input', () => {
        const k = inp.dataset.w;
        if (k === 'minutes') w.minutes = Math.max(0, Math.min(180, Number(inp.value) || 0));
        else if (k === 'email') w.teacher.email = inp.value.trim();
        else if (k === 'showAnswers') w.showAnswers = inp.checked;
        else if (k === 'allowTypos') w.allowTypos = inp.checked;
        else w[k] = inp.value;
      }));
      wf('showAnswers').addEventListener('change', () => { w.showAnswers = wf('showAnswers').checked; });
      wf('allowTypos').addEventListener('change', () => { w.allowTypos = wf('allowTypos').checked; });

      const qsBox = el.querySelector('[data-qs]');

      function blank(type) {
        if (type === 'single' || type === 'multi') return { type, q: '', a: ['', ''], right: type === 'multi' ? [] : 0, points: 1 };
        if (type === 'short') return { type, q: '', answers: [], points: 1 };
        if (type === 'text') return { type, q: '', minWords: 20, points: 2 };
        if (type === 'copy') return { type, q: L('Kirjuta tekst', 'Напиши текст'), source: '', mode: 'copy', points: 5 };
        return { type: 'voice', q: '', minSec: 15, points: 2 };
      }
      // panga küsimus → oma küsimus (saab muuta)
      function unbank(k) {
        const q = Core.q(w.questions[k]);
        const c = { type: q.type, q: q.q, points: w.questions[k].points || 1 };
        if (q.a) c.a = q.a.slice();
        if (q.right != null) c.right = Array.isArray(q.right) ? q.right.slice() : q.right;
        if (q.answers) c.answers = q.answers.slice();
        if (q.minWords) c.minWords = q.minWords;
        if (q.minSec) c.minSec = q.minSec;
        if (q.source) { c.source = q.source; c.mode = q.mode; }
        w.questions[k] = c;
      }

      function drawQs() {
        el.querySelector('[data-qcount]').textContent = w.questions.length;
        if (!w.questions.length) {
          qsBox.innerHTML = `<div class="empty empty--inline"><p class="muted">${L('Küsimusi veel pole. Lisa küsimus või vali pangast.', 'Вопросов пока нет. Добавьте вопрос или выберите из банка.')}</p></div>`;
          return;
        }
        qsBox.innerHTML = '';
        w.questions.forEach((raw, k) => {
          const q = raw.bank ? Core.q(raw) : raw;
          const card = h(`
            <div class="qcard">
              <div class="qcard__head">
                <b class="qcard__n">${k + 1}.</b>
                <select class="input qcard__type" data-f="type" aria-label="${L('Küsimuse tüüp', 'Тип вопроса')}">${TYPES().map(([v, t]) => `<option value="${v}" ${v === q.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
                <label class="qcard__pts"><input class="input" type="number" min="0" max="20" data-f="points" value="${raw.points != null ? raw.points : 1}" aria-label="${L('Punktid', 'Баллы')}"> ${L('p', 'б.')}</label>
                <span class="qcard__tools">
                  <button class="btn btn--ghost btn--sm" type="button" data-act="up" ${k === 0 ? 'disabled' : ''} aria-label="${L('Üles', 'Вверх')}">↑</button>
                  <button class="btn btn--ghost btn--sm" type="button" data-act="down" ${k === w.questions.length - 1 ? 'disabled' : ''} aria-label="${L('Alla', 'Вниз')}">↓</button>
                  <button class="btn btn--ghost btn--sm btn--danger" type="button" data-act="del" aria-label="${L('Kustuta', 'Удалить')}">✕</button>
                </span>
              </div>
              <div data-body></div>
            </div>`);
          const body = card.querySelector('[data-body]');
          if (raw.bank) {
            body.innerHTML = `
              <p class="muted small">${icon('book')} ${L('Küsimuste pangast', 'Из банка вопросов')} #${raw.bank} · ${L('õpilane näeb seda oma keeles', 'ученик видит его на своём языке')}</p>
              <p><b>${esc(q.q)}</b></p>
              ${q.a ? `<ul class="plain">${q.a.map((x, j) => `<li>${(Array.isArray(q.right) ? q.right.includes(j) : q.right === j) ? '✓ ' : ''}${esc(x)}</li>`).join('')}</ul>` : ''}
              ${q.answers ? `<p class="muted small">${L('Õiged vastused', 'Правильные ответы')}: ${esc(q.answers.join(', '))}</p>` : ''}
              <button class="btn btn--ghost btn--sm" type="button" data-act="unbank">${L('Muuda teksti', 'Изменить текст')}</button>`;
          } else {
            body.innerHTML = `<textarea class="input" rows="2" data-f="q" placeholder="${L('Küsimuse tekst', 'Текст вопроса')}" aria-label="${L('Küsimuse tekst', 'Текст вопроса')}">${esc(q.q || '')}</textarea>`;
            if (q.type === 'single' || q.type === 'multi') {
              const opts = h(`<div class="qopts"><p class="muted small">${L('Märgi õige vastus', 'Отметьте правильный ответ')}${q.type === 'multi' ? L(' (võib mitu)', ' (можно несколько)') : ''}:</p></div>`);
              q.a.forEach((txt, j) => {
                const isRight = q.type === 'multi' ? (q.right || []).includes(j) : q.right === j;
                opts.appendChild(h(`
                  <div class="qopt">
                    <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="right-${k}" data-right="${j}" ${isRight ? 'checked' : ''} aria-label="${L('Õige', 'Правильный')}">
                    <input class="input" data-opt="${j}" value="${esc(txt)}" placeholder="${L('Variant', 'Вариант')} ${j + 1}">
                    <button class="btn btn--ghost btn--sm" type="button" data-delopt="${j}" ${q.a.length <= 2 ? 'disabled' : ''} aria-label="${L('Eemalda', 'Убрать')}">✕</button>
                  </div>`));
              });
              opts.appendChild(h(`<button class="btn btn--ghost btn--sm" type="button" data-addopt>+ ${L('Lisa variant', 'Добавить вариант')}</button>`));
              body.appendChild(opts);
            } else if (q.type === 'short') {
              body.appendChild(h(`<label class="field-row"><span class="label small">${L('Õiged vastused (komaga eraldatud)', 'Правильные ответы (через запятую)')}</span><input class="input" data-f="answers" value="${esc((q.answers || []).join(', '))}" placeholder="8, kaheksa"></label>`));
            } else if (q.type === 'copy') {
              body.appendChild(h(`<div class="qopts">
                <label class="field-row"><span class="label small">${L('Kuidas õpilane kirjutab?', 'Как ученик пишет?')}</span>
                  <select class="input" data-f="mode">
                    <option value="copy" ${q.mode !== 'dictation' ? 'selected' : ''}>${L('Kirjutab ümber (tekst on ekraanil)', 'Переписывает (текст на экране)')}</option>
                    <option value="dictation" ${q.mode === 'dictation' ? 'selected' : ''}>${L('Etteütlus (õpetaja loeb ette, teksti ei näe)', 'Диктант (учитель читает, текста не видно)')}</option>
                  </select></label>
                <label class="field-row"><span class="label small">${L('Õige tekst (selle järgi kontrollitakse)', 'Правильный текст (по нему проверяется)')}</span>
                  <textarea class="input" rows="3" data-f="source" placeholder="${L('Kass istub aknal ja vaatab lund.', 'Кот сидит на окне и смотрит на снег.')}">${esc(q.source || '')}</textarea></label>
                <p class="muted small">${L('Punktid antakse kattuvuse järgi: 90% sarnane tekst = 90% punktidest. Väike trükiviga sõnas on pool viga.', 'Баллы по совпадению: текст совпал на 90% = 90% баллов. Мелкая опечатка в слове — половина ошибки.')}</p>
              </div>`));
            } else if (q.type === 'text') {
              body.appendChild(h(`<label class="field-row field-row--short"><span class="label small">${L('Soovituslik sõnade arv', 'Желательное число слов')}</span><input class="input" type="number" min="0" max="500" data-f="minWords" value="${q.minWords || 0}"></label>`));
            } else {
              body.appendChild(h(`<label class="field-row field-row--short"><span class="label small">${L('Vähemalt sekundeid', 'Минимум секунд')}</span><input class="input" type="number" min="0" max="180" data-f="minSec" value="${q.minSec || 0}"></label>`));
            }
          }

          // sündmused
          card.addEventListener('input', (ev) => {
            const t = ev.target;
            const cur = w.questions[k];
            if (t.dataset.f === 'points') cur.points = Math.max(0, Number(t.value) || 0);
            else if (t.dataset.f === 'q') cur.q = t.value;
            else if (t.dataset.f === 'answers') cur.answers = t.value.split(',').map((s) => s.trim()).filter(Boolean);
            else if (t.dataset.f === 'minWords') cur.minWords = Number(t.value) || 0;
            else if (t.dataset.f === 'minSec') cur.minSec = Number(t.value) || 0;
            else if (t.dataset.f === 'source') cur.source = t.value;
            else if (t.dataset.opt != null) cur.a[Number(t.dataset.opt)] = t.value;
          });
          card.addEventListener('change', (ev) => {
            const t = ev.target;
            const cur = w.questions[k];
            if (t.dataset.f === 'type') {
              if (cur.bank) unbank(k);
              const old = w.questions[k];
              const n = blank(t.value);
              n.q = old.q || n.q;
              n.points = old.points;
              if ((n.type === 'single' || n.type === 'multi') && old.a) n.a = old.a.slice();
              w.questions[k] = n;
              drawQs();
            } else if (t.dataset.f === 'mode') {
              cur.mode = t.value;
            } else if (t.dataset.right != null) {
              const j = Number(t.dataset.right);
              if (cur.type === 'multi') {
                const s = new Set(cur.right || []);
                t.checked ? s.add(j) : s.delete(j);
                cur.right = Array.from(s).sort();
              } else cur.right = j;
            }
          });
          card.addEventListener('click', (ev) => {
            const b = ev.target.closest('button');
            if (!b) return;
            const cur = w.questions[k];
            if (b.dataset.act === 'del') { w.questions.splice(k, 1); drawQs(); }
            else if (b.dataset.act === 'up') { [w.questions[k - 1], w.questions[k]] = [w.questions[k], w.questions[k - 1]]; drawQs(); }
            else if (b.dataset.act === 'down') { [w.questions[k + 1], w.questions[k]] = [w.questions[k], w.questions[k + 1]]; drawQs(); }
            else if (b.dataset.act === 'unbank') { unbank(k); drawQs(); }
            else if (b.dataset.addopt != null) { cur.a.push(''); drawQs(); }
            else if (b.dataset.delopt != null) {
              const j = Number(b.dataset.delopt);
              cur.a.splice(j, 1);
              if (cur.type === 'multi') cur.right = (cur.right || []).filter((x) => x !== j).map((x) => (x > j ? x - 1 : x));
              else if (cur.right === j) cur.right = 0; else if (cur.right > j) cur.right--;
              drawQs();
            }
          });
          qsBox.appendChild(card);
        });
      }

      el.querySelector('[data-addq]').addEventListener('click', () => {
        w.questions.push(blank('single'));
        drawQs();
        const last = qsBox.lastElementChild;
        if (last) { last.scrollIntoView({ block: 'center' }); const t = last.querySelector('textarea'); if (t) t.focus(); }
      });
      el.querySelector('[data-bank]').addEventListener('click', () => bankPicker((ids) => {
        ids.forEach((bid) => w.questions.push({ bank: bid, points: 1 }));
        drawQs();
      }));

      el.querySelector('[data-save]').addEventListener('click', async () => {
        const err = el.querySelector('[data-err]');
        const problems = [];
        if (!w.title.trim()) problems.push(L('Lisa pealkiri.', 'Добавьте название.'));
        if (!w.questions.length) problems.push(L('Lisa vähemalt üks küsimus.', 'Добавьте хотя бы один вопрос.'));
        w.questions.forEach((q, k) => {
          if (q.bank) return;
          const n = k + 1 + '. ';
          if (!String(q.q || '').trim()) problems.push(n + L('küsimuse tekst puudub.', 'нет текста вопроса.'));
          if (q.type === 'single' || q.type === 'multi') {
            q.a = q.a.map((s) => s.trim());
            if (q.a.filter(Boolean).length < 2) problems.push(n + L('vaja vähemalt 2 varianti.', 'нужно хотя бы 2 варианта.'));
            if (q.a.some((s) => !s)) problems.push(n + L('tühi variant — täida või eemalda.', 'пустой вариант — заполните или уберите.'));
            if (q.type === 'multi' && !(q.right || []).length) problems.push(n + L('märgi õiged vastused.', 'отметьте правильные ответы.'));
          }
          if (q.type === 'short' && !(q.answers || []).length) problems.push(n + L('lisa õige vastus.', 'добавьте правильный ответ.'));
          if (q.type === 'copy' && !String(q.source || '').trim()) problems.push(n + L('lisa õige tekst.', 'добавьте правильный текст.'));
        });
        if (w.teacher.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(w.teacher.email)) problems.push(L('Kontrolli e-posti aadressi.', 'Проверьте e-mail.'));
        if (problems.length) {
          err.hidden = false;
          err.innerHTML = problems.map(esc).join('<br>');
          err.scrollIntoView({ block: 'center' });
          return;
        }
        w.teacher.name = (Core.user() || {}).name || w.teacher.name;
        const btn = el.querySelector('[data-save]');
        btn.disabled = true;
        try {
          const saved = await DB.publish(w);
          UI.toast(L('Test salvestatud, kood ', 'Тест сохранён, код ') + saved.code);
          location.hash = '#/jaga/' + saved.id;
        } catch (e) {
          btn.disabled = false;
          err.hidden = false;
          err.textContent = L('Salvestamine ebaõnnestus: ', 'Не удалось сохранить: ') + String(e.message || e);
        }
      });

      drawQs();
      return { el };
    },

    // ───────── Jagamine ─────────
    async share(id) {
      const w = await loadWork(id);
      if (!w) return { el: h(`<div class="page"><p>${L('Tööd ei leitud.', 'Работа не найдена.')}</p></div>`) };
      const enc = await Core.encode(w);
      const url = Core.workUrl(enc);
      const code = w.code || '';
      const email = (w.teacher && w.teacher.email) || '';
      const stuudiumMsg = L(
        'Tere! Uus test: «' + w.title + '».' + (code ? '\nKood: ' + code + ' (vahekaart «Testid»)' : '') + '\n1) Ava link: ' + url + '\n2) Sisene oma nimega.\n3) Vajuta «Alusta testi» ja lõpus «Esita».' + (w.minutes ? '\nAeg: ' + w.minutes + ' min.' : ''),
        'Здравствуйте! Новый тест: «' + w.title + '».' + (code ? '\nКод: ' + code + ' (вкладка «Testid»)' : '') + '\n1) Откройте ссылку: ' + url + '\n2) Войдите под своим именем.\n3) Нажмите «Начать тест», в конце «Сдать».' + (w.minutes ? '\nВремя: ' + w.minutes + ' мин.' : '')
      );
      const mailto = 'mailto:?subject=' + encodeURIComponent(L('Uus töö: ', 'Новая работа: ') + w.title) + '&body=' + encodeURIComponent(stuudiumMsg);

      const el = h(`
        <div class="page">
          ${back('#/', L('Töölaud', 'Главная'))}
          <div class="page-head">
            <h1>${L('Jaga tööd', 'Поделиться работой')}: ${esc(w.title)}</h1>
            <p class="muted">${L('Vali üks viis. Õpilane avab töö, siseneb ja vajutab «Alusta».', 'Выберите способ. Ученик откроет работу, войдёт и нажмёт «Начать».')}</p>
          </div>
          <div class="grid grid--lesson">
            <div>
              <section class="card share-way">
                <h2>${icon('megaphone')} Stuudium</h2>
                <p class="muted">${L('Kopeeri valmis sõnum ja saada see klassile: Stuudium → Sõnumid → Uus sõnum → vali klass → kleebi (Ctrl + V).', 'Скопируйте готовое сообщение и отправьте классу: Stuudium → Сообщения → Новое сообщение → выберите класс → вставьте (Ctrl + V).')}</p>
                <button class="btn" type="button" data-copy-msg>${icon('pencil')} ${L('Kopeeri sõnum Stuudiumi jaoks', 'Скопировать сообщение для Stuudium')}</button>
              </section>
              <section class="card share-way">
                <h2>${icon('megaphone')} ${L('E-post', 'E-mail')}</h2>
                <p class="muted">${L('Avab e-kirja valmis tekstiga. Lisa saajaks õpilased või klassi list.', 'Откроет письмо с готовым текстом. Добавьте получателями учеников или список класса.')}</p>
                <a class="btn" href="${mailto}">${icon('megaphone')} ${L('Ava e-kiri', 'Открыть письмо')}</a>
              </section>
              <section class="card share-way">
                <h2>${icon('monitor')} ${L('Tahvel / projektor', 'Доска / проектор')}</h2>
                <p class="muted">${L('Õpilased avavad vahekaardi «Testid», sisestavad koodi ja vajutavad «Alusta testi».', 'Ученики открывают вкладку «Testid», вводят код и нажимают «Начать тест».')}</p>
                <button class="btn" type="button" data-proj>${icon('monitor')} ${L('Näita tahvlil', 'Показать на доске')}</button>
              </section>
              <section class="card share-way">
                <h2>${icon('pencil')} ${L('Link', 'Ссылка')}</h2>
                <div class="row row--tight"><input class="input" readonly value="${esc(url)}" aria-label="${L('Töö link', 'Ссылка на работу')}"><button class="btn btn--ghost" type="button" data-copy-link>${L('Kopeeri', 'Копировать')}</button></div>
                <div class="row"><a class="btn btn--ghost" href="${esc(url)}" target="_blank" rel="noopener">${L('Proovi õpilasena', 'Проверить как ученик')} ↗</a></div>
              </section>
            </div>
            <div>
              <section class="card share">
                ${offlineNote()}
                ${code ? `<div class="share__code"><span class="small muted">${L('Testi kood', 'Код теста')}</span><b>${esc(code)}</b></div>` : ''}
                <div class="share__qr" data-qr></div>
                <p class="muted small">${L('QR-kood avab töö otse.', 'QR-код открывает работу сразу.')}</p>
              </section>
              <section class="card">
                <h2>${icon('chart')} ${L('Kuhu tulemused tulevad?', 'Куда придут результаты?')}</h2>
                ${email ? `
                  <p>${L('E-postile', 'На почту')} <b>${esc(email)}</b>.</p>
                  <p class="muted small">${L('Esimesel korral saadab teenus FormSubmit kirja nupuga «Activate Form» — vajuta seda üks kord. Proovi enne tundi:', 'В первый раз сервис FormSubmit пришлёт письмо с кнопкой «Activate Form» — нажмите её один раз. Проверьте до урока:')}</p>
                  <button class="btn btn--ghost" type="button" data-test>${L('Saada proovikiri', 'Отправить пробное письмо')}</button>
                  <p class="small" data-test-out></p>` : `
                  <p>${L('E-posti pole lisatud — õpilased saadavad tulemuse Stuudiumis (kopeerivad teksti).', 'E-mail не указан — ученики пришлют результат в Stuudium (скопируют текст).')}</p>
                  <a class="btn btn--ghost" href="#/muuda/${w.id}">${L('Lisa e-post', 'Добавить e-mail')}</a>`}
              </section>
            </div>
          </div>
        </div>`);

      let qrT = setTimeout(() => drawQR(el.querySelector('[data-qr]'), url, 220), 30);
      el.querySelector('[data-copy-msg]').addEventListener('click', async () => { await UI.copy(stuudiumMsg); UI.toast(L('Sõnum kopeeritud — kleebi Stuudiumisse', 'Сообщение скопировано — вставьте в Stuudium')); });
      el.querySelector('[data-copy-link]').addEventListener('click', async () => { await UI.copy(url); UI.toast(L('Link kopeeritud', 'Ссылка скопирована')); });
      el.querySelector('[data-proj]').addEventListener('click', () => projector(w, url));
      const tb = el.querySelector('[data-test]');
      if (tb) tb.addEventListener('click', async () => {
        const out = el.querySelector('[data-test-out]');
        tb.disabled = true;
        out.textContent = L('Saadan… (kuni 30 s)', 'Отправляю… (до 30 сек)');
        const f = {};
        f[L('Teade', 'Сообщение')] = L('Proovikiri: e-post töötab! Siia tulevad õpilaste tulemused.', 'Пробное письмо: почта работает! Сюда будут приходить результаты учеников.');
        f[L('Töö', 'Работа')] = w.title;
        const r = await Sender.post(email, L('Proovikiri — Arvutiklassi tööd', 'Пробное письмо — Работы класса'), f);
        tb.disabled = false;
        out.innerHTML = r.ok ? '✓ ' + L('Saadetud! Vaata postkasti.', 'Отправлено! Проверьте почту.') : '✗ ' + esc(r.error);
      });
      return { el, destroy() { clearTimeout(qrT); } };
    },

    // ───────── Tulemused ja vastused ─────────
    async results() {
      let works = [];
      try { works = await DB.list(); } catch (e) { works = []; }
      const el = h(`
        <div class="page">
          <div class="page-head">
            <h1>${L('Tulemused ja vastused', 'Результаты и ответы')}</h1>
            <p class="muted">${L('Sait ei hoia tulemusi serveris. Iga õpilase tulemus tuleb kirjana.', 'Сайт не хранит результаты на сервере. Результат каждого ученика приходит письмом.')}</p>
          </div>
          <div class="grid grid--2">
            <section class="card"><h2>${icon('megaphone')} ${L('E-postiga', 'По e-mail')}</h2>
              <p>${L('Kui töös on sinu e-post, tuleb pärast «Esita» kiri tabeliga: õpilane, klass, punktid, hinne ja iga vastus (✓ õige, ✗ vale, ✎ hinda ise).', 'Если в работе указан ваш e-mail, после «Сдать» придёт письмо с таблицей: ученик, класс, баллы, оценка и каждый ответ (✓ верно, ✗ неверно, ✎ проверить самому).')}</p></section>
            <section class="card"><h2>${icon('pencil')} Stuudium</h2>
              <p>${L('Kui e-posti pole, kopeerib õpilane sama teksti ja saadab selle sulle Stuudiumi sõnumis.', 'Если e-mail не указан, ученик копирует тот же текст и отправляет его вам сообщением в Stuudium.')}</p></section>
          </div>
          <p class="muted small">${L('Hinne arvutatakse automaatselt: 90% → 5, 75% → 4, 50% → 3, 20% → 2. Pikad ja häälvastused hindad ise.', 'Оценка считается автоматически: 90% → 5, 75% → 4, 50% → 3, 20% → 2. Развёрнутые и голосовые ответы оцениваете сами.')}</p>
          <h2 class="section-title">${L('Vastuste võtmed', 'Ключи ответов')}</h2>
          ${works.length ? works.map((w) => `
            <details class="card key-card">
              <summary><b class="code-chip">${esc(w.code || '')}</b> <b>${esc(w.title)}</b> <span class="muted small">· ${w.questions.length} ${L('küsimust', 'вопр.')}</span></summary>
              <ol class="keys">${w.questions.map((raw) => { const q = Core.q(raw); return `<li><span>${esc(q.q)}</span><b>${esc(Core.rightText(q))}</b></li>`; }).join('')}</ol>
            </details>`).join('') : `<p class="muted">${L('Töid veel pole.', 'Работ пока нет.')}</p>`}
        </div>`);
      return { el };
    },

    // ───────── Klassi leht (lihtkood) ─────────
    async leht() {
      let text = '';
      try { text = await DB.getPage(); } catch (e) { text = ''; }
      const el = h(`
        <div class="page page--wide">
          <div class="page-head">
            <h1>${L('Klassi leht', 'Страница класса')}</h1>
            <p class="muted">${L('Tee õpilastele leht ilma programmeerimata: kirjuta lihtsaid käske või vajuta plokinuppe. Paremal näed kohe tulemust. Õpilased näevad lehte vahekaardil «Klassi leht».', 'Сделайте страницу для учеников без программирования: пишите простые команды или нажимайте кнопки-блоки. Справа сразу видно результат. Ученики увидят её во вкладке «Страница класса».')}</p>
          </div>
          ${offlineNote()}
          <div data-ed></div>
        </div>`);
      el.querySelector('[data-ed]').appendChild(Lihtkood.editor(text, (t) => DB.savePage(t)));
      return { el };
    },

    // ───────── Taimer ─────────
    timer() {
      const el = h(`
        <div class="page">
          <div class="page-head"><h1>${L('Taimer', 'Таймер')}</h1>
            <p class="muted">${L('Näita tahvlil, kui palju aega on jäänud. Lõpus kõlab signaal.', 'Покажите на доске, сколько осталось. В конце прозвучит сигнал.')}</p></div>
          <section class="card timer-card" data-box>
            <div class="timer-card__digits" data-digits>05:00</div>
            <div class="meter timer-card__meter"><span data-bar></span></div>
            <div class="row row--center">
              <button class="btn btn--lg" type="button" data-start></button>
              <button class="btn btn--lg btn--ghost" type="button" data-reset>${L('Lähtesta', 'Сброс')}</button>
              <button class="btn btn--lg btn--ghost" type="button" data-full>${icon('monitor')} ${L('Täisekraan', 'На весь экран')}</button>
            </div>
            <div class="row row--center">${[1, 3, 5, 10, 15, 20, 30, 45].map((m) => `<button class="btn btn--ghost btn--sm" type="button" data-min="${m}">${m} ${L('min', 'мин')}</button>`).join('')}</div>
          </section>
        </div>`);
      const box = el.querySelector('[data-box]');
      const digits = el.querySelector('[data-digits]');
      const bar = el.querySelector('[data-bar]');
      const start = el.querySelector('[data-start]');
      const paint = () => {
        digits.textContent = T.done ? L('Aeg on läbi!', 'Время вышло!') : fmtTime(Math.ceil(T.left));
        bar.style.width = (T.total ? (T.left / T.total) * 100 : 0) + '%';
        start.textContent = T.running ? L('Paus', 'Пауза') : L('Start', 'Старт');
        box.classList.toggle('is-low', T.running && T.left <= 30);
        box.classList.toggle('is-done', T.done);
      };
      const set = (m) => { T.total = T.left = m * 60; T.running = false; T.done = false; paint(); };
      start.addEventListener('click', () => {
        if (T.running) { T.running = false; T.left = Math.max(0, (T.endAt - Date.now()) / 1000); }
        else {
          if (T.left <= 0) { T.left = T.total; T.done = false; }
          T.endAt = Date.now() + T.left * 1000;
          T.running = true;
          clearInterval(T.tick);
          T.tick = setInterval(() => {
            if (!T.running) return;
            T.left = Math.max(0, (T.endAt - Date.now()) / 1000);
            if (T.left <= 0) { T.running = false; T.done = true; beep(); }
            if (T.onUpdate) T.onUpdate();
          }, 200);
        }
        paint();
      });
      el.querySelector('[data-reset]').addEventListener('click', () => set(T.total / 60));
      el.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => set(Number(b.dataset.min))));
      el.querySelector('[data-full]').addEventListener('click', () => { if (box.requestFullscreen) box.requestFullscreen().catch(() => {}); });
      T.onUpdate = paint;
      paint();
      return { el, destroy() { T.onUpdate = null; } };
    }
  };

  // Küsimuste panga valik (aken)
  function bankPicker(onPick) {
    const topics = { arvuti: L('Arvuti', 'Компьютер'), turvalisus: L('Turvalisus', 'Безопасность'), failid: L('Failid', 'Файлы'), kirjutamine: L('Kirjutamine', 'Письмо'), suuline: L('Suuline', 'Устно') };
    const ov = h(`
      <div class="modal" role="dialog" aria-modal="true" aria-label="${L('Küsimuste pank', 'Банк вопросов')}">
        <div class="modal__box card">
          <div class="row row--between"><h2>${icon('book')} ${L('Küsimuste pank', 'Банк вопросов')}</h2><button class="btn btn--ghost btn--sm" type="button" data-x>✕</button></div>
          <p class="muted small">${L('Vali küsimused. Kui töös on ainult panga küsimused, saab see lühikese koodi ja õpilane näeb küsimusi oma keeles.', 'Выберите вопросы. Если в работе только вопросы из банка, у неё будет короткий код, и ученик увидит вопросы на своём языке.')}</p>
          <div class="modal__list">${Object.keys(topics).map((t) => `
            <p class="label">${topics[t]}</p>
            ${BANK.filter((b) => b.topic === t).map((b) => `
              <label class="opt opt--sm"><input type="checkbox" value="${b.id}"><span>#${b.id} · ${esc((b[LANG.get()] || b.et).q)}</span></label>`).join('')}`).join('')}
          </div>
          <div class="row row--between"><button class="btn btn--ghost" type="button" data-all>${L('Vali kõik', 'Выбрать все')}</button><button class="btn" type="button" data-ok>${L('Lisa valitud', 'Добавить выбранные')}</button></div>
        </div>
      </div>`);
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('[data-x]').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelector('[data-all]').addEventListener('click', () => ov.querySelectorAll('input').forEach((i) => { i.checked = true; }));
    ov.querySelector('[data-ok]').addEventListener('click', () => {
      onPick(Array.from(ov.querySelectorAll('input:checked')).map((i) => Number(i.value)));
      close();
    });
  }

  window.Teacher = Teacher;
})();
