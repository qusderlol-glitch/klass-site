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
                <p class="muted">${L('Koosta oma esimene test — see saab koodi A1AAA.', 'Создайте свой первый тест — он получит код A1AAA.')}</p>
                <div class="row row--center"><a class="btn btn--lg" href="#/uus">${L('Koosta test', 'Создать тест')}</a></div>
              </div>`}
          </section>
        </div>`);
      el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
        if (!confirm(L('Kustutada töö? Õpilastel, kes selle juba avasid, jääb see alles.', 'Удалить работу? У учеников, которые её уже открыли, она останется.'))) return;
        DB.remove(b.dataset.del).then(() => App.render()).catch((e) => UI.toast(String(e.message || e)));
      }));
      return { el };
    },

    // ───────── Testi koostamine (liivakast) ─────────
    async edit(id) {
      const u = Core.user() || {};
      const existing = id ? await loadWork(id) : null;
      if (id && !existing) return { el: h(`<div class="page"><p>${L('Tööd ei leitud.', 'Работа не найдена.')}</p></div>`) };
      const w = existing ? Core.unsealWork(existing) : {
        id: Core.newId(), title: '', subject: L('Informaatika', 'Информатика'), klass: '', minutes: 20, instructions: '', description: '',
        teacher: { name: u.name || '', email: u.email || '' }, showAnswers: false, allowTypos: true, shuffleOptions: true, shuffleQuestions: false,
        created: Date.now(), questions: []
      };
      if (w.shuffleOptions === undefined) w.shuffleOptions = true;

      const el = h(`
        <div class="page">
          ${back('#/', L('Töölaud', 'Главная'))}
          <div class="page-head">
            <h1>${existing ? L('Muuda testi', 'Изменить тест') + (w.code ? ' ' + esc(w.code) : '') : L('Koosta uus test', 'Новый тест')}</h1>
            <p class="muted">${L('Nagu liivakast: vajuta «+», et lisada küsimus ükskõik kuhu, lohista ⠿ abil teise kohta, lisa pilte ja ülesandeid ülesande sisse.', 'Как песочница: нажми «+», чтобы добавить вопрос куда угодно, перетаскивай за ⠿, добавляй картинки и задания внутри задания.')}</p>
          </div>
          <section class="card">
            <h2>1. ${L('Põhiandmed', 'Основное')}</h2>
            <div class="form-grid">
              <label class="field-row form-grid__wide"><span class="label">${L('Pealkiri', 'Название')} *</span><input class="input" data-w="title" maxlength="90" placeholder="${L('nt Arvuti osad', 'напр. Части компьютера')}"></label>
              <label class="field-row form-grid__wide"><span class="label">${L('Kirjeldus (näha testide nimekirjas)', 'Описание (видно в списке тестов)')}</span><input class="input" data-w="description" maxlength="160"></label>
              <label class="field-row"><span class="label">${L('Aine', 'Предмет')}</span><input class="input" data-w="subject" maxlength="40"></label>
              <label class="field-row"><span class="label">${L('Klass', 'Класс')}</span><input class="input" data-w="klass" maxlength="10" placeholder="6A"></label>
              <label class="field-row"><span class="label">${L('Aeg minutites (0 = piiramatu)', 'Время в минутах (0 = без ограничения)')}</span><input class="input" data-w="minutes" type="number" min="0" max="180"></label>
              <label class="field-row form-grid__wide"><span class="label">${L('Juhend õpilastele', 'Инструкция ученикам')}</span><textarea class="input" data-w="instructions" rows="2" maxlength="400"></textarea></label>
              <label class="field-row form-grid__wide"><span class="label">${L('Tulemused saata e-postile', 'Результаты отправлять на e-mail')}</span><input class="input" data-w="email" type="email" maxlength="80" placeholder="opetaja@kool.ee">
                <span class="muted small">${L('Kui jätad tühjaks, saadavad õpilased vastused Stuudiumis.', 'Если оставить пустым, ученики пришлют ответы в Stuudium.')}</span></label>
              <label class="check-row form-grid__wide"><input type="checkbox" data-w="allowTypos"> ${L('Paranda väikesed trükivead (nt «klaviatuuur» = «klaviatuur»)', 'Исправлять мелкие опечатки (напр. «процесор» = «процессор»)')}</label>
              <label class="check-row form-grid__wide"><input type="checkbox" data-w="shuffleOptions"> ${L('Sega vastusevariandid (igal õpilasel erinev järjekord — raskem maha kirjutada)', 'Перемешивать варианты ответа (у каждого ученика свой порядок — труднее списать)')}</label>
              <label class="check-row form-grid__wide"><input type="checkbox" data-w="shuffleQuestions"> ${L('Sega küsimuste järjekord', 'Перемешивать порядок вопросов')}</label>
            </div>
          </section>

          <section class="card">
            <div class="row row--between card-head">
              <h2>2. ${L('Küsimused ja ülesanded', 'Вопросы и задания')} <span class="badge" data-qcount></span></h2>
              <button class="btn btn--ghost" type="button" data-bank>${icon('book')} ${L('Küsimuste pangast', 'Из банка вопросов')}</button>
            </div>
            <div class="sandbox" data-qs></div>
          </section>

          <div class="card save-bar">
            <p class="alert alert--warn" data-err hidden></p>
            <div class="row row--between">
              <a class="btn btn--ghost" href="#/">${L('Tühista', 'Отмена')}</a>
              <button class="btn btn--lg" type="button" data-save>${icon('check')} ${L('Salvesta ja jaga', 'Сохранить и поделиться')}</button>
            </div>
          </div>
        </div>`);

      // ── põhiandmed ──
      const wf = (k) => el.querySelector(`[data-w="${k}"]`);
      ['title', 'description', 'subject', 'klass', 'instructions'].forEach((k) => { wf(k).value = w[k] || ''; });
      wf('minutes').value = w.minutes || 0;
      wf('email').value = (w.teacher && w.teacher.email) || '';
      ['allowTypos', 'shuffleOptions'].forEach((k) => { wf(k).checked = w[k] !== false; });
      wf('shuffleQuestions').checked = Boolean(w.shuffleQuestions);
      el.querySelectorAll('[data-w]').forEach((inp) => {
        const upd = () => {
          const k = inp.dataset.w;
          if (k === 'minutes') w.minutes = Math.max(0, Math.min(180, Number(inp.value) || 0));
          else if (k === 'email') w.teacher.email = inp.value.trim();
          else if (inp.type === 'checkbox') w[k] = inp.checked;
          else w[k] = inp.value;
        };
        inp.addEventListener('input', upd);
        inp.addEventListener('change', upd);
      });

      const box = el.querySelector('[data-qs]');

      // ── andmed: tee "3" või "3.1" (ülesande sees) ──
      const listOf = (path) => {
        const p = String(path).split('.').map(Number);
        return p.length === 1 ? { list: w.questions, i: p[0] } : { list: w.questions[p[0]].items, i: p[1] };
      };
      const get = (path) => { const { list, i } = listOf(path); return list[i]; };

      function blank(type) {
        if (type === 'single' || type === 'multi') return { type, q: '', a: ['', ''], right: type === 'multi' ? [] : 0, points: 1 };
        if (type === 'short') return { type, q: '', answers: [], points: 1 };
        if (type === 'text') return { type, q: '', minWords: 20, points: 2 };
        if (type === 'copy') return { type, q: L('Kirjuta tekst', 'Напиши текст'), source: '', mode: 'copy', points: 5 };
        if (type === 'group') return { type, q: '', items: [blank('single')] };
        return { type: 'voice', q: '', minSec: 15, points: 2 };
      }
      function unbank(path) {
        const raw = get(path);
        const q = Core.q(raw);
        const c = { type: q.type, q: q.q, points: raw.points || 1, image: raw.image, cols: raw.cols };
        ['a', 'answers'].forEach((k) => { if (q[k]) c[k] = q[k].slice(); });
        if (q.right != null) c.right = Array.isArray(q.right) ? q.right.slice() : q.right;
        if (q.minWords) c.minWords = q.minWords;
        if (q.minSec) c.minSec = q.minSec;
        const { list, i } = listOf(path);
        list[i] = c;
      }

      const typeNames = () => TYPES().concat([['group', L('Ülesanne (mitu küsimust sees)', 'Задание (несколько вопросов внутри)')]]);

      // «+» koht: avab tüüpide valiku
      function insertZone(listPath, index, inGroup) {
        const z = h(`<div class="ins" data-ins="${listPath}" data-at="${index}">
          <button type="button" class="ins__btn" aria-label="${L('Lisa siia', 'Добавить сюда')}">+ <span>${L('Lisa siia', 'Добавить сюда')}</span></button>
          <div class="ins__menu" hidden>${typeNames().filter((t) => !(inGroup && t[0] === 'group')).map(([v, t]) => `<button type="button" class="btn btn--ghost btn--sm" data-add="${v}">${t}</button>`).join('')}
            <button type="button" class="btn btn--ghost btn--sm" data-add="bank">${icon('book')} ${L('Pangast', 'Из банка')}</button></div>
        </div>`);
        return z;
      }

      function imageRow(q, path) {
        const wrap = h('<div class="q-img"></div>');
        if (q.image) {
          wrap.appendChild(Images.view(q.image, { query: q.q, onPick: (u) => { get(path).image = u || undefined; if (!u) delete get(path).image; draw(); } }));
        } else {
          const b = h(`<button type="button" class="btn btn--ghost btn--sm" data-act="img">${icon('monitor')} ${L('Lisa pilt', 'Добавить картинку')}</button>`);
          wrap.appendChild(b);
        }
        return wrap;
      }

      function card(raw, path, num, inGroup) {
        const q = raw.bank ? Core.q(raw) : raw;
        const isGroup = raw.type === 'group';
        const c = h(`
          <div class="qcard ${isGroup ? 'qcard--group' : ''}" data-path="${path}" draggable="false">
            <div class="qcard__head">
              <span class="qcard__drag" draggable="true" title="${L('Lohista teise kohta', 'Перетащи в другое место')}" aria-label="${L('Lohista', 'Перетащить')}">⠿</span>
              <b class="qcard__n">${num}.</b>
              <select class="input qcard__type" data-f="type" aria-label="${L('Tüüp', 'Тип')}">${typeNames().filter((t) => !(inGroup && t[0] === 'group')).map(([v, t]) => `<option value="${v}" ${v === q.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
              ${isGroup ? '' : `<label class="qcard__pts"><input class="input" type="number" min="0" max="50" data-f="points" value="${raw.points != null ? raw.points : 1}" aria-label="${L('Punktid', 'Баллы')}"> ${L('p', 'б.')}</label>`}
              <span class="qcard__tools">
                <button class="btn btn--ghost btn--sm" type="button" data-act="dup" title="${L('Tee koopia', 'Копия')}">⧉</button>
                <button class="btn btn--ghost btn--sm btn--danger" type="button" data-act="del" title="${L('Kustuta', 'Удалить')}">✕</button>
              </span>
            </div>
            <div data-body></div>
          </div>`);
        const body = c.querySelector('[data-body]');

        if (raw.bank) {
          body.innerHTML = `
            <p class="muted small">${icon('book')} ${L('Küsimuste pangast', 'Из банка вопросов')} #${raw.bank}</p>
            <p><b>${esc(q.q)}</b></p>
            ${q.a ? `<ul class="plain">${q.a.map((x, j) => `<li>${(Array.isArray(q.right) ? q.right.includes(j) : q.right === j) ? '✓ ' : ''}${esc(x)}</li>`).join('')}</ul>` : ''}
            <button class="btn btn--ghost btn--sm" type="button" data-act="unbank">${L('Muuda teksti', 'Изменить текст')}</button>`;
          body.appendChild(imageRow(raw, path));
          return c;
        }

        body.appendChild(h(`<textarea class="input" rows="2" data-f="q" placeholder="${isGroup ? L('Ülesande tekst (nt lugu või juhend), küsimused tulevad allpool', 'Текст задания (рассказ или инструкция), вопросы — ниже') : L('Küsimuse tekst', 'Текст вопроса')}">${esc(q.q || '')}</textarea>`));
        body.appendChild(imageRow(raw, path));

        if (isGroup) {
          const inner = h(`<div class="qgroup"><p class="label small">${L('Küsimused selle ülesande sees', 'Вопросы внутри этого задания')}</p></div>`);
          (raw.items || []).forEach((it, s) => {
            inner.appendChild(insertZone(path, s, true));
            inner.appendChild(card(it, path + '.' + s, num + '.' + (s + 1), true));
          });
          inner.appendChild(insertZone(path, (raw.items || []).length, true));
          body.appendChild(inner);
          return c;
        }

        if (q.type === 'single' || q.type === 'multi') {
          const opts = h(`<div class="qopts"><div class="row row--between row--tight"><p class="muted small">${L('Märgi õige vastus', 'Отметьте правильный ответ')}${q.type === 'multi' ? L(' (võib mitu)', ' (можно несколько)') : ''}</p>
            <select class="input input--sm" data-f="cols" aria-label="${L('Veerud', 'Колонки')}">
              ${[1, 2, 3].map((n) => `<option value="${n}" ${Number(q.cols || 1) === n ? 'selected' : ''}>${n} ${L(n === 1 ? 'veerg' : 'veergu', n === 1 ? 'колонка' : 'колонки')}</option>`).join('')}
            </select></div></div>`);
          q.a.forEach((txt, j) => {
            const isRight = q.type === 'multi' ? (q.right || []).includes(j) : q.right === j;
            opts.appendChild(h(`
              <div class="qopt">
                <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="right-${path}" data-right="${j}" ${isRight ? 'checked' : ''} aria-label="${L('Õige', 'Правильный')}">
                <input class="input" data-opt="${j}" value="${esc(txt)}" placeholder="${L('Variant', 'Вариант')} ${j + 1}">
                <button class="btn btn--ghost btn--sm" type="button" data-delopt="${j}" ${q.a.length <= 2 ? 'disabled' : ''} aria-label="${L('Eemalda', 'Убрать')}">✕</button>
              </div>`));
          });
          opts.appendChild(h(`<button class="btn btn--ghost btn--sm" type="button" data-act="addopt">+ ${L('Lisa variant', 'Добавить вариант')}</button>`));
          body.appendChild(opts);
        } else if (q.type === 'short') {
          body.appendChild(h(`<label class="field-row"><span class="label small">${L('Õiged vastused (komaga eraldatud)', 'Правильные ответы (через запятую)')}</span><input class="input" data-f="answers" value="${esc((q.answers || []).join(', '))}" placeholder="8, kaheksa"></label>`));
        } else if (q.type === 'text') {
          body.appendChild(h(`<label class="field-row field-row--short"><span class="label small">${L('Soovituslik sõnade arv', 'Желательное число слов')}</span><input class="input" type="number" min="0" max="500" data-f="minWords" value="${q.minWords || 0}"></label>`));
        } else if (q.type === 'copy') {
          body.appendChild(h(`<div class="qopts">
            <label class="field-row"><span class="label small">${L('Kuidas õpilane kirjutab?', 'Как ученик пишет?')}</span>
              <select class="input" data-f="mode">
                <option value="copy" ${q.mode !== 'dictation' ? 'selected' : ''}>${L('Kirjutab ümber (tekst on ekraanil)', 'Переписывает (текст на экране)')}</option>
                <option value="dictation" ${q.mode === 'dictation' ? 'selected' : ''}>${L('Etteütlus (õpetaja loeb ette)', 'Диктант (учитель читает)')}</option>
              </select></label>
            <label class="field-row"><span class="label small">${L('Õige tekst', 'Правильный текст')}</span><textarea class="input" rows="3" data-f="source">${esc(q.source || '')}</textarea></label>
          </div>`));
        } else {
          body.appendChild(h(`<label class="field-row field-row--short"><span class="label small">${L('Vähemalt sekundeid', 'Минимум секунд')}</span><input class="input" type="number" min="0" max="180" data-f="minSec" value="${q.minSec || 0}"></label>`));
        }
        return c;
      }

      function draw() {
        const leaves = Core.leaves(w).length;
        el.querySelector('[data-qcount]').textContent = w.questions.length + ' · ' + leaves + ' ' + L('vastust', 'ответов');
        box.innerHTML = '';
        w.questions.forEach((raw, t) => {
          box.appendChild(insertZone('', t, false));
          box.appendChild(card(raw, String(t), String(t + 1), false));
        });
        box.appendChild(insertZone('', w.questions.length, false));
        if (!w.questions.length) box.insertAdjacentHTML('afterbegin', `<p class="muted sandbox__empty">${L('Test on tühi. Vajuta «+ Lisa siia» ja vali küsimuse tüüp.', 'Тест пустой. Нажми «+ Добавить сюда» и выбери тип вопроса.')}</p>`);
      }

      function insertAt(listPath, at, items) {
        const list = listPath === '' ? w.questions : get(listPath).items;
        list.splice(at, 0, ...items);
        draw();
      }

      // ── sündmused (üks kuulaja kõigile kaartidele) ──
      box.addEventListener('input', (ev) => {
        const t = ev.target;
        const cEl = t.closest('[data-path]');
        if (!cEl) return;
        const cur = get(cEl.dataset.path);
        if (t.dataset.f === 'points') cur.points = Math.max(0, Number(t.value) || 0);
        else if (t.dataset.f === 'q') cur.q = t.value;
        else if (t.dataset.f === 'answers') cur.answers = t.value.split(',').map((s) => s.trim()).filter(Boolean);
        else if (t.dataset.f === 'minWords') cur.minWords = Number(t.value) || 0;
        else if (t.dataset.f === 'minSec') cur.minSec = Number(t.value) || 0;
        else if (t.dataset.f === 'source') cur.source = t.value;
        else if (t.dataset.opt != null) cur.a[Number(t.dataset.opt)] = t.value;
      });
      box.addEventListener('change', (ev) => {
        const t = ev.target;
        const cEl = t.closest('[data-path]');
        if (!cEl) return;
        const path = cEl.dataset.path;
        const cur = get(path);
        if (t.dataset.f === 'type') {
          if (cur.bank) unbank(path);
          const old = get(path);
          const n = blank(t.value);
          if (old.q) n.q = old.q;
          if (old.image) n.image = old.image;
          if (old.points != null && old.points !== 1 && n.points != null) n.points = old.points;
          if ((n.type === 'single' || n.type === 'multi') && old.a) n.a = old.a.slice();
          const { list, i } = listOf(path);
          list[i] = n;
          draw();
        } else if (t.dataset.f === 'mode') cur.mode = t.value;
        else if (t.dataset.f === 'cols') { cur.cols = Number(t.value); }
        else if (t.dataset.right != null) {
          const j = Number(t.dataset.right);
          if (cur.type === 'multi') {
            const s = new Set(cur.right || []);
            t.checked ? s.add(j) : s.delete(j);
            cur.right = Array.from(s).sort();
          } else cur.right = j;
        }
      });
      box.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        // «+» kohad
        const z = b.closest('[data-ins]');
        if (z) {
          if (b.classList.contains('ins__btn')) {
            const m = z.querySelector('.ins__menu');
            box.querySelectorAll('.ins__menu').forEach((x) => { if (x !== m) x.hidden = true; });
            m.hidden = !m.hidden;
            return;
          }
          if (b.dataset.add) {
            const at = Number(z.dataset.at);
            const lp = z.dataset.ins;
            if (b.dataset.add === 'bank') bankPicker((ids) => insertAt(lp, at, ids.map((bid) => ({ bank: bid, points: 1 }))));
            else insertAt(lp, at, [blank(b.dataset.add)]);
            const last = box.querySelector(`[data-path="${lp === '' ? at : lp + '.' + at}"] textarea`);
            if (last) last.focus();
          }
          return;
        }
        const cEl = b.closest('[data-path]');
        if (!cEl) return;
        const path = cEl.dataset.path;
        const cur = get(path);
        const { list, i } = listOf(path);
        if (b.dataset.act === 'del') {
          if (cur.type === 'group' && (cur.items || []).length && !confirm(L('Kustutada ülesanne koos küsimustega?', 'Удалить задание вместе с вопросами?'))) return;
          list.splice(i, 1); draw();
        } else if (b.dataset.act === 'dup') { list.splice(i + 1, 0, JSON.parse(JSON.stringify(cur))); draw(); }
        else if (b.dataset.act === 'unbank') { unbank(path); draw(); }
        else if (b.dataset.act === 'addopt') { cur.a.push(''); draw(); }
        else if (b.dataset.act === 'img') { Images.pick(cur.q || '', (u) => { if (u) { get(path).image = u; draw(); } }); }
        else if (b.dataset.delopt != null) {
          const j = Number(b.dataset.delopt);
          cur.a.splice(j, 1);
          if (cur.type === 'multi') cur.right = (cur.right || []).filter((x) => x !== j).map((x) => (x > j ? x - 1 : x));
          else if (cur.right === j) cur.right = 0; else if (cur.right > j) cur.right--;
          draw();
        }
      });

      // ── lohistamine ⠿ ──
      let dragPath = null;
      box.addEventListener('dragstart', (ev) => {
        const hnd = ev.target.closest('.qcard__drag');
        if (!hnd) return;
        const cEl = hnd.closest('[data-path]');
        dragPath = cEl.dataset.path;
        cEl.classList.add('is-dragging');
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', dragPath);
      });
      box.addEventListener('dragend', () => { dragPath = null; box.querySelectorAll('.is-dragging, .is-target').forEach((x) => x.classList.remove('is-dragging', 'is-target')); });
      const zoneOk = (z) => {
        if (!z || dragPath == null) return false;
        const fromGroup = dragPath.includes('.');
        const toGroup = z.dataset.ins !== '';
        const isGroup = get(dragPath).type === 'group';
        if (isGroup && toGroup) return false;               // ülesannet ei saa panna teise ülesande sisse
        if (toGroup && z.dataset.ins === dragPath) return false;
        return fromGroup || !toGroup || !isGroup;
      };
      box.addEventListener('dragover', (ev) => {
        const z = ev.target.closest('[data-ins]');
        if (!zoneOk(z)) return;
        ev.preventDefault();
        box.querySelectorAll('.is-target').forEach((x) => x.classList.remove('is-target'));
        z.classList.add('is-target');
      });
      box.addEventListener('drop', (ev) => {
        const z = ev.target.closest('[data-ins]');
        if (!zoneOk(z)) return;
        ev.preventDefault();
        const from = listOf(dragPath);
        const item = from.list[from.i];
        const toList = z.dataset.ins === '' ? w.questions : get(z.dataset.ins).items;
        let at = Number(z.dataset.at);
        from.list.splice(from.i, 1);
        if (toList === from.list && at > from.i) at--;
        toList.splice(at, 0, item);
        dragPath = null;
        draw();
      });

      el.querySelector('[data-bank]').addEventListener('click', () => bankPicker((ids) => insertAt('', w.questions.length, ids.map((bid) => ({ bank: bid, points: 1 })))));

      // ── salvestamine ──
      el.querySelector('[data-save]').addEventListener('click', async () => {
        const err = el.querySelector('[data-err]');
        const problems = [];
        if (!w.title.trim()) problems.push(L('Lisa pealkiri.', 'Добавьте название.'));
        if (!w.questions.length) problems.push(L('Lisa vähemalt üks küsimus.', 'Добавьте хотя бы один вопрос.'));
        w.questions.forEach((g, t) => { if (g.type === 'group' && !(g.items || []).length) problems.push((t + 1) + '. ' + L('ülesandes pole küsimusi.', 'в задании нет вопросов.')); });
        Core.leaves(w).forEach((lf) => {
          const q = lf.raw;
          if (q.bank) return;
          const n = lf.label + '. ';
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
        const size = JSON.stringify(w).length;
        if (size > 900000) problems.push(L('Arvutist lisatud pilte on liiga palju (test on liiga suur). Kasuta internetist otsitud pilte või vähem pilte.', 'Слишком много картинок с компьютера (тест слишком большой). Используй картинки из поиска или меньше картинок.'));
        if (problems.length) {
          err.hidden = false;
          err.innerHTML = problems.map(esc).join('<br>');
          err.scrollIntoView({ block: 'center' });
          return;
        }
        err.hidden = true;
        w.teacher.name = (Core.user() || {}).name || w.teacher.name;
        const btn = el.querySelector('[data-save]');
        btn.disabled = true;
        try {
          const saved = await DB.publish(Core.sealWork(w));
          UI.toast(L('Test salvestatud, kood ', 'Тест сохранён, код ') + saved.code);
          location.hash = '#/jaga/' + saved.id;
        } catch (e) {
          btn.disabled = false;
          err.hidden = false;
          err.textContent = L('Salvestamine ebaõnnestus: ', 'Не удалось сохранить: ') + String(e.message || e);
        }
      });

      draw();
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
                <a class="btn btn--ghost" href="juhend.html${code ? '?kood=' + encodeURIComponent(code) : ''}" target="_blank" rel="noopener">${icon('book')} ${L('Juhend õpilastele (prindi)', 'Инструкция для учеников (печать)')}</a>
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
              <ol class="keys keys--plain">${Core.leaves(w).map((lf) => { const q = Core.q(lf.raw); return `<li><span><b>${lf.label}.</b> ${esc(q.q)}</span><b>${esc(Core.rightText(q))}</b></li>`; }).join('')}</ol>
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
