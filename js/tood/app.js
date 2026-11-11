/* Tööde sait: sisselogimise kontroll, päis, menüü, seaded ja lehtede vahetamine. */
(function () {
  const { h, icon, esc } = UI;
  const view = document.getElementById('view');
  const side = document.getElementById('sideNav');

  // Sisselogimata → sisenemise lehele (töö link jäetakse meelde)
  function needLogin() {
    if (Core.user()) return false;
    if (/^#\/(ava|kood)\//.test(location.hash)) {
      try { sessionStorage.setItem('klass-pending', location.hash); } catch (e) { /* ei midagi */ }
    }
    location.replace('index.html');
    return true;
  }
  if (needLogin()) return;

  Core.initTheme();
  let current = null;

  function header() {
    const u = Core.user();
    const teacher = u.role === 'teacher';
    document.getElementById('brandMark').innerHTML = icon(teacher ? 'book' : 'tests');
    document.getElementById('brandTitle').textContent = teacher ? L('Õpetaja töölaud', 'Кабинет учителя') : L('Minu tööd', 'Мои работы');
    document.getElementById('brandSub').textContent = L('Arvutiklass', 'Компьютерный класс');
    document.getElementById('langSlot').innerHTML = LANG.toggle();
    document.getElementById('userChip').innerHTML = icon('user') + '<span>' + esc(u.name) + (u.klass ? ', ' + esc(u.klass) : '') + ' · ' + (teacher ? L('õpetaja', 'учитель') : L('õpilane', 'ученик')) + '</span>';
    const help = document.getElementById('helpBtn');
    help.setAttribute('aria-label', L('Kuidas kasutada', 'Как пользоваться'));
    help.title = help.getAttribute('aria-label');
    document.getElementById('logoutBtn').textContent = L('Logi välja', 'Выйти');
  }

  function nav(route) {
    const teacher = Core.isTeacher();
    const items = teacher
      ? [
          { id: '', title: L('Töölaud', 'Главная'), icon: 'home' },
          { id: 'uus', title: L('Koosta töö', 'Создать работу'), icon: 'pencil' },
          { id: 'tulemused', title: L('Tulemused ja vastused', 'Результаты и ответы'), icon: 'chart' },
          { id: 'taimer', title: L('Taimer', 'Таймер'), icon: 'clock' },
          { id: 'seaded', title: L('Seaded', 'Настройки'), icon: 'gear', bottom: true }
        ]
      : [
          { id: '', title: L('Minu tööd', 'Мои работы'), icon: 'tests' },
          { id: 'harjutused', href: 'site.html', title: L('Harjutused ja mängud', 'Упражнения и игры'), icon: 'game' },
          { id: 'kusitlus', href: 'anketa.html', title: L('Küsitlus saidi kohta', 'Анкета о сайте'), icon: 'pencil' },
          { id: 'seaded', title: L('Seaded', 'Настройки'), icon: 'gear', bottom: true }
        ];
    const active = { muuda: 'uus', jaga: '', too: '', lahenda: '', tulemus: '' }[route];
    const act = active != null ? active : route;
    side.innerHTML = items.map((n) => `
      <a class="side__link ${n.id === act ? 'is-active' : ''} ${n.bottom ? 'side__link--bottom' : ''}" href="${n.href || '#/' + n.id}" data-nav="${n.id}" ${n.id === act ? 'aria-current="page"' : ''}>
        ${icon(n.icon)}<span>${n.title}</span>
      </a>`).join('');
    const t = items.find((n) => n.id === act);
    document.title = (t ? t.title + ' — ' : '') + L('Arvutiklass', 'Компьютерный класс');
  }

  // ───── Seaded ─────
  function settings() {
    const u = Core.user();
    const qs = ['style', 'color', 'mode', 'size'].map((id) => Engine.getQuestion(id));
    const el = h(`
      <div class="page">
        <div class="page-head"><h1>${L('Seaded', 'Настройки')}</h1>
          <p class="muted">${L('Muudatused rakenduvad kohe. Kujundus kehtib ka klassi saidil.', 'Изменения применяются сразу. Оформление действует и на сайте класса.')}</p></div>
        <div class="grid grid--settings">
          <section class="card">
            <h2>${icon('book')} ${L('Keel', 'Язык')}</h2>
            <div class="seg seg--wrap"><button type="button" data-lang="et" class="${LANG.get() === 'et' ? 'is-on' : ''}">Eesti keel</button><button type="button" data-lang="ru" class="${LANG.get() === 'ru' ? 'is-on' : ''}">Русский язык</button></div>
            <h2 class="label--gap">${icon('gear')} ${L('Kujundus', 'Оформление')}</h2>
            <div data-theme></div>
          </section>
          <section class="card">
            <h2>${icon('user')} ${L('Minu andmed', 'Мои данные')}</h2>
            <label class="field-row"><span class="label">${L('Nimi', 'Имя')}</span><input class="input" data-p="name" maxlength="50" value="${esc(u.name)}"></label>
            ${u.role === 'student' ? `<label class="field-row field-row--short"><span class="label">${L('Klass', 'Класс')}</span><input class="input" data-p="klass" maxlength="6" value="${esc(u.klass || '')}"></label>` : ''}
            <label class="field-row"><span class="label">${L('E-post', 'E-mail')}</span><input class="input" data-p="email" type="email" maxlength="80" value="${esc(u.email || '')}">
              <span class="muted small">${u.role === 'teacher' ? L('Siia tulevad uute tööde tulemused.', 'Сюда будут приходить результаты новых работ.') : L('Siia tuleb sinu tulemuste koopia.', 'Сюда придёт копия твоих результатов.')}</span></label>
            <p class="alert alert--warn" data-perr hidden></p>
            <div class="row"><button class="btn" type="button" data-psave>${L('Salvesta', 'Сохранить')}</button><button class="btn btn--ghost" type="button" data-logout>${L('Logi välja', 'Выйти')}</button></div>
            <p class="muted small">${L('Sinu andmed on ainult selles arvutis.', 'Твои данные хранятся только на этом компьютере.')}</p>
          </section>
        </div>
      </div>`);

    const themeBox = el.querySelector('[data-theme]');
    function drawTheme() {
      themeBox.innerHTML = '';
      qs.forEach((q) => {
        const sel = Engine.effectiveIds(q);
        const block = h(`<div class="setting"><p class="label">${esc(L(q.titleEt || q.title, q.title))}</p><div class="seg seg--wrap"></div></div>`);
        const seg = block.querySelector('.seg');
        q.options.forEach((o) => {
          const on = sel.includes(o.id);
          const b = h(`<button type="button" class="${on ? 'is-on' : ''}" aria-pressed="${on}" title="${esc(L(o.descEt || o.desc || '', o.desc || ''))}">${o.swatch ? `<i class="swatch" style="background:${o.swatch}"></i>` : ''}${esc(L(o.labelEt || o.label, o.label))}</button>`);
          b.addEventListener('click', () => { Engine.choose(q.id, o.id); Engine.save(); drawTheme(); });
          seg.appendChild(b);
        });
        themeBox.appendChild(block);
      });
    }
    drawTheme();

    el.querySelector('[data-psave]').addEventListener('click', () => {
      const v = (k) => { const i = el.querySelector(`[data-p="${k}"]`); return i ? i.value.trim() : ''; };
      const err = el.querySelector('[data-perr]');
      if (!v('name')) { err.hidden = false; err.textContent = L('Nimi on kohustuslik.', 'Имя обязательно.'); return; }
      if (v('email') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email'))) { err.hidden = false; err.textContent = L('Kontrolli e-posti.', 'Проверь e-mail.'); return; }
      // õpilase tööd on seotud nime/e-postiga — kanname need üle
      const oldKey = Core.stKey();
      const works = Core.myWorks();
      Core.setUser(Object.assign({}, u, { name: v('name'), klass: u.role === 'student' ? v('klass') : u.klass, email: v('email') }));
      if (Core.stKey() !== oldKey) Core.saveMyWorks(Object.assign(works, Core.myWorks()));
      header();
      UI.toast(L('Salvestatud', 'Сохранено'));
    });
    el.querySelector('[data-logout]').addEventListener('click', logout);
    return { el };
  }

  function logout() {
    Core.logout();
    location.href = 'index.html';
  }

  // ───── Lehtede vahetamine ─────
  const App = {
    async render() {
      if (needLogin()) return;
      if (current && current.destroy) current.destroy();
      current = null;
      const parts = location.hash.replace(/^#\/?/, '').split('/');
      const route = parts[0] || '';
      const arg = parts.slice(1).join('/');
      const teacher = Core.isTeacher();
      header();
      nav(route);

      let page;
      const onlyTeacher = ['uus', 'muuda', 'jaga', 'tulemused', 'taimer'];
      if (onlyTeacher.includes(route) && !teacher) page = { el: h(`<div class="page"><div class="card empty"><h1>${L('Ainult õpetajale', 'Только для учителя')}</h1><div class="row row--center"><a class="btn" href="#/">${L('Minu tööd', 'Мои работы')}</a></div></div></div>`) };
      else switch (route) {
        case '': page = teacher ? Teacher.dash() : Student.list(); break;
        case 'ava': page = await Student.open(arg); break;
        case 'kood': page = Student.openCode(arg); break;
        case 'too': page = Student.intro(arg); break;
        case 'lahenda': page = Student.take(arg); break;
        case 'tulemus': page = Student.result(arg); break;
        case 'uus': page = Teacher.edit(null); break;
        case 'muuda': page = Teacher.edit(arg); break;
        case 'jaga': page = await Teacher.share(arg); break;
        case 'tulemused': page = Teacher.results(); break;
        case 'taimer': page = Teacher.timer(); break;
        case 'seaded': page = settings(); break;
        default: page = Student.broken();
      }
      current = page;
      view.innerHTML = '';
      view.appendChild(page.el);
      window.scrollTo(0, 0);
    }
  };
  window.App = App;

  // Keele vahetus joonistab lehe uuesti (aga mitte töö lahendamise ajal)
  LANG.on(() => {
    if (current && current.busy && current.busy()) { header(); nav(location.hash.replace(/^#\/?/, '').split('/')[0]); UI.toast(L('Keel vahetub pärast töö esitamist', 'Язык сменится после сдачи работы')); return; }
    App.render();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (current && current.busy && current.busy() && !confirm(L('Töö on pooleli — vastused jäävad alles. Logida välja?', 'Работа не закончена — ответы сохранятся. Выйти?'))) return;
    logout();
  });

  // ───── Tutvustus (tuur) ─────
  function tour() {
    const teacher = Core.isTeacher();
    const steps = teacher
      ? [
          { el: null, title: L('Õpetaja töölaud', 'Кабинет учителя'), text: L('Siin koostad töid ja jagad neid õpilastega. Näitan minutiga, mis kus on.', 'Здесь вы создаёте работы и отправляете их ученикам. Покажу за минуту, что где.') },
          { el: '#sideNav [data-nav="uus"]', title: L('Koosta töö', 'Создать работу'), text: L('Kirjuta küsimused ise või vali küsimuste pangast. Määra aeg ja e-post tulemuste jaoks.', 'Напишите вопросы или возьмите из банка. Укажите время и e-mail для результатов.') },
          { el: '#myWorks', title: L('Minu tööd', 'Мои работы'), text: L('Iga töö juures on nupp <b>«Jaga»</b>: Stuudiumi sõnum, e-kiri, kood ja QR tahvlile.', 'У каждой работы есть кнопка <b>«Поделиться»</b>: сообщение Stuudium, письмо, код и QR для доски.') },
          { el: '#sideNav [data-nav="tulemused"]', title: L('Tulemused ja vastused', 'Результаты и ответы'), text: L('Kuidas tulemused sinuni jõuavad ja kõigi tööde vastuste võtmed.', 'Как приходят результаты, и ключи ответов ко всем работам.') },
          { el: '#langSlot', title: L('Keel', 'Язык'), text: L('ET / RU — vaheta keelt igal ajal.', 'ET / RU — язык можно сменить в любой момент.') },
          { el: '#helpBtn', title: L('Abi', 'Помощь'), text: L('Nupp «?» näitab seda tutvustust uuesti.', 'Кнопка «?» покажет это снова.') }
        ]
      : [
          { el: null, title: L('Tere tulemast!', 'Добро пожаловать!'), text: L('Siin lahendad töid, mille õpetaja sulle andis. Näitan, kuidas.', 'Здесь ты выполняешь работы, которые дал учитель. Покажу как.') },
          { el: '#addWork', title: L('Lisa töö', 'Добавить работу'), text: L('Sisesta kood tahvlilt või kleebi link Stuudiumist. Kui avad lingi otse, lisatakse töö ise.', 'Введи код с доски или вставь ссылку из Stuudium. Если открыть ссылку сразу, работа добавится сама.') },
          { el: '#workList', title: L('Vali töö', 'Выбери работу'), text: L('Vajuta <b>«Alusta»</b>, vasta küsimustele ja lõpus <b>«Esita»</b>. Tulemus läheb õpetajale.', 'Нажми <b>«Начать»</b>, ответь на вопросы и в конце <b>«Сдать»</b>. Результат уйдёт учителю.') },
          { el: '#langSlot', title: L('Keel', 'Язык'), text: L('ET / RU — vali, kummas keeles lugeda.', 'ET / RU — выбери язык.') },
          { el: '#helpBtn', title: L('Abi', 'Помощь'), text: L('Nupp «?» näitab seda uuesti. Edu!', 'Кнопка «?» покажет это снова. Удачи!') }
        ];
    if (location.hash.replace(/^#\/?/, '') !== '') { location.hash = '#/'; setTimeout(() => Tour.start(steps, { key: teacher ? 'tood-teacher' : 'tood-student' }), 120); return; }
    Tour.start(steps, { key: teacher ? 'tood-teacher' : 'tood-student' });
  }
  document.getElementById('helpBtn').addEventListener('click', tour);

  window.addEventListener('hashchange', () => App.render());
  App.render().then(() => {
    const key = Core.isTeacher() ? 'tood-teacher' : 'tood-student';
    if (!Tour.seen(key) && (location.hash === '' || location.hash === '#/')) setTimeout(tour, 400);
  });
})();
