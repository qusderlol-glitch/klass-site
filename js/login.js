/* Sisenemine / registreerimine (EIS-stiilis). Kasutaja andmed jäävad ainult sellesse brauserisse. */
(function () {
  const { icon, esc } = UI;
  const root = document.getElementById('login');
  const foot = document.getElementById('foot');
  Core.initTheme();

  let role = 'student';
  let method = 'name';

  const go = () => {
    let pending = '';
    try { pending = sessionStorage.getItem('klass-pending') || ''; sessionStorage.removeItem('klass-pending'); } catch (e) { /* ei midagi */ }
    location.href = 'tood.html' + (pending || '#/');
  };

  function header() {
    document.querySelectorAll('[data-icon]').forEach((n) => { n.innerHTML = icon(n.dataset.icon); });
    document.querySelector('[data-t="brand"]').textContent = L('Arvutiklass', 'Компьютерный класс');
    document.querySelector('[data-t="brandSub"]').textContent = L('Tööd ja ülesanded', 'Работы и задания');
    document.getElementById('langSlot').innerHTML = LANG.toggle();
    document.title = L('Arvutiklass — sisene', 'Компьютерный класс — вход');
  }

  function methods() {
    const list = [
      { id: 'name', title: L('Nimi ja klass', 'Имя и класс'), desc: L('Kõige lihtsam: kirjuta oma nimi', 'Проще всего: напиши своё имя'), on: true },
      { id: 'email', title: L('E-post', 'E-mail'), desc: role === 'teacher' ? L('Tulemused tulevad sinu e-postile', 'Результаты будут приходить на твою почту') : L('Saad tulemuste koopia e-postile', 'Копия результатов придёт тебе на почту'), on: true }
    ];
    return list.map((m) => `
      <button type="button" class="method ${m.id === method ? 'is-on' : ''} ${m.on ? '' : 'is-off'}" data-method="${m.id}" aria-pressed="${m.id === method}">
        <span class="method__title">${m.title}</span>
        <span class="method__desc">${m.desc}</span>
      </button>`).join('');
  }

  function fields() {
    const nameF = `
      <label class="field-row"><span class="label">${role === 'teacher' ? L('Õpetaja nimi', 'Имя учителя') : L('Ees- ja perekonnanimi', 'Имя и фамилия')} *</span>
        <input class="input" name="name" type="text" maxlength="50" required autocomplete="name"></label>`;
    const klassF = role === 'student' ? `
      <label class="field-row field-row--short"><span class="label">${L('Klass', 'Класс')}</span>
        <input class="input" name="klass" type="text" maxlength="6" placeholder="6A" autocomplete="off"></label>` : '';
    const emailF = (required) => `
      <label class="field-row"><span class="label">${L('E-post', 'E-mail')}${required ? ' *' : ''}</span>
        <input class="input" name="email" type="email" maxlength="80" ${required ? 'required' : ''} autocomplete="email" placeholder="nimi@kool.ee"></label>`;
    const pinF = role === 'teacher' ? `
      <label class="field-row field-row--short"><span class="label">${L('Õpetaja kood', 'Код учителя')} *</span>
        <input class="input" name="pin" type="password" maxlength="64" required autocomplete="current-password"></label>
      <p class="muted small">${L('Ühine kood kõigile õpetajatele. Sellega saad teste teha ja tulemusi vaadata.', 'Общий код для всех учителей. С ним можно создавать тесты и смотреть результаты.')}</p>` : '';
    if (role === 'teacher') return nameF + emailF(method === 'email') + pinF;
    return nameF + klassF + (method === 'email' ? emailF(true) : '');
  }

  function render() {
    header();
    const u = Core.user();
    if (u) {
      root.innerHTML = `
        <section class="login__card card">
          <h1>${L('Tere', 'Здравствуй')}, ${esc(u.name)}!</h1>
          <p class="muted">${u.role === 'teacher' ? L('Oled sisse logitud õpetajana.', 'Ты вошёл как учитель.') : L('Oled sisse logitud õpilasena', 'Ты вошёл как ученик') + (u.klass ? ' (' + esc(u.klass) + ')' : '') + '.'}</p>
          <div class="row">
            <button class="btn btn--lg" type="button" data-continue>${L('Jätka', 'Продолжить')} →</button>
            <button class="btn btn--ghost" type="button" data-logout>${L('Logi välja', 'Выйти')}</button>
          </div>
        </section>
        ${howTo()}`;
      root.querySelector('[data-continue]').addEventListener('click', go);
      root.querySelector('[data-logout]').addEventListener('click', async () => { Core.logout(); try { await DB.signOut(); } catch (e) { /* ei midagi */ } render(); });
      renderFoot();
      return;
    }

    root.innerHTML = `
      <section class="login__card card">
        <h1>${L('Sisene', 'Вход')}</h1>
        <p class="muted">${L('Esimesel korral loome sulle konto selles arvutis — see ongi registreerimine.', 'В первый раз мы создадим тебе аккаунт на этом компьютере — это и есть регистрация.')}</p>
        <div class="role-tabs" role="tablist">
          <button type="button" role="tab" data-role="student" class="${role === 'student' ? 'is-on' : ''}" aria-selected="${role === 'student'}">${icon('user')} ${L('Õpilane', 'Ученик')}</button>
          <button type="button" role="tab" data-role="teacher" class="${role === 'teacher' ? 'is-on' : ''}" aria-selected="${role === 'teacher'}">${icon('book')} ${L('Õpetaja', 'Учитель')}</button>
        </div>
        <p class="label">${L('Kuidas sisened?', 'Как войти?')}</p>
        <div class="methods">${methods()}</div>
        <form class="login__form" novalidate>
          ${fields()}
          <p class="alert alert--warn" data-err hidden></p>
          <button class="btn btn--lg login__submit" type="submit">${L('Sisene', 'Войти')}</button>
        </form>
      </section>
      ${howTo()}`;

    root.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => { role = b.dataset.role; render(); }));
    root.querySelectorAll('[data-method]').forEach((b) => b.addEventListener('click', () => { method = b.dataset.method; render(); }));

    const form = root.querySelector('form');
    const err = root.querySelector('[data-err]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
      const btn = form.querySelector('[type="submit"]');
      const fail = (m) => { err.hidden = false; err.textContent = m; btn.disabled = false; };
      if (!v('name')) return fail(L('Kirjuta oma nimi.', 'Напиши своё имя.'));
      const email = v('email');
      if (method === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(L('Kontrolli e-posti aadressi.', 'Проверь адрес e-mail.'));
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(L('Kontrolli e-posti aadressi.', 'Проверь адрес e-mail.'));
      if (role === 'teacher') {
        // Õpetaja kood = ühise õpetajakonto parool Firebase'is. Koodi ei ole saidi koodis — seda kontrollib Google.
        const cfg = window.CONFIG || {};
        if (cfg.FIREBASE && cfg.TEACHER_EMAIL) {
          btn.disabled = true;
          err.hidden = true;
          try {
            await DB.signIn(cfg.TEACHER_EMAIL, form.elements.pin.value);
          } catch (er) {
            const m = String(er.message || er);
            return fail(/Firebase/.test(m) ? m : L('Õpetaja kood ei sobi.', 'Неверный код учителя.'));
          }
        } else {
          const pin = String(cfg.TEACHER_PIN || '');
          if (pin && v('pin') !== pin) return fail(L('Õpetaja kood ei sobi.', 'Неверный код учителя.'));
        }
      }
      if (role === 'student') { try { await DB.signOut(); } catch (er) { /* ei midagi */ } }
      Core.setUser({ role, name: v('name'), klass: v('klass'), email, method, since: Date.now() });
      go();
    });
    renderFoot();
  }

  function howTo() {
    return `
      <aside class="login__how card">
        <h2>${L('Kuidas see töötab?', 'Как это работает?')}</h2>
        <ol class="how">
          <li><b>${L('Õpetaja', 'Учитель')}</b> ${L('siseneb ja koostab töö: küsimused, aeg, juhend.', 'входит и создаёт работу: вопросы, время, инструкцию.')}</li>
          <li>${L('Õpetaja <b>saadab töö lingi</b> Stuudiumis või e-postiga või näitab koodi tahvlil.', 'Учитель <b>отправляет ссылку</b> в Stuudium или по e-mail, или показывает код на доске.')}</li>
          <li><b>${L('Õpilane', 'Ученик')}</b> ${L('siseneb, sisestab koodi, vajutab <b>«Alusta testi»</b> ja vastab.', 'входит, вводит код, нажимает <b>«Alusta testi»</b> и отвечает.')}</li>
          <li>${L('Pärast <b>«Esita töö»</b> näeb õpetaja vastuseid saidil vahekaardil «Tulemused».', 'После <b>«Esita töö»</b> учитель видит ответы на сайте во вкладке «Tulemused».')}</li>
        </ol>
      </aside>`;
  }

  function renderFoot() {
    foot.innerHTML = `
      <a href="juhend.html"><b>${L('Juhend: kuidas testi teha', 'Инструкция: как пройти тест')}</b></a>
      <a href="anketa.html">${L('Küsitlus: milline sait olema peab (vene k.)', 'Анкета: каким быть сайту')}</a>
      <a href="site.html">${L('Harjutused ja mängud (vene k.)', 'Упражнения и игры')}</a>`;
  }

  LANG.on(render);
  render();
})();
