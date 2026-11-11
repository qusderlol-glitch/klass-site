/* Сайт класса: загрузка настроек, тема, меню и переходы между страницами. */
(function () {
  const { icon, esc } = UI;
  const params = new URLSearchParams(location.search);
  const EMBED = params.has('embed');      // предпросмотр на стикере в анкете

  const view = document.getElementById('view');
  const side = document.getElementById('sideNav');
  const chip = document.getElementById('studentChip');
  const dialog = document.getElementById('nameDialog');
  const nameInput = document.getElementById('nameInput');

  // значки в разметке
  document.querySelectorAll('[data-icon]').forEach((n) => { n.innerHTML = icon(n.dataset.icon); });

  let current = null;       // текущая страница { el, destroy, onConfig, busy }
  let lastFeatures = '';

  const App = {
    render() {
      if (current && current.destroy) current.destroy();
      const [route, arg] = (location.hash.replace(/^#\/?/, '') || '').split('/');
      const page = App.route(route || '', arg);
      current = page;
      view.innerHTML = '';
      view.appendChild(page.el);
      App.renderNav(route || '');
      if (!EMBED) window.scrollTo(0, 0);
    },

    route(route, arg) {
      const need = { tasks: () => Pages.sections[0].on(), tests: () => Pages.sections[1].on(), games: () => Pages.sections[2].on(), game: () => Pages.sections[2].on(), typing: () => Pages.sections[3].on() };
      if (need[route] && !need[route]()) {
        const titles = { tasks: 'Задания', tests: 'Контрольные', games: 'Игры', game: 'Игры', typing: 'Клавиатурный тренажёр' };
        return Pages.off(titles[route]);
      }
      switch (route) {
        case '': return Pages.home();
        case 'tasks': return Pages.tasks();
        case 'task': return Pages.task(arg);
        case 'tests': return Pages.tests();
        case 'test': return Pages.test(arg);
        case 'games': return Pages.games();
        case 'game': return Games[arg] && arg !== 'typing' ? Games[arg]() : Pages.notFound();
        case 'typing': return Games.typing();
        case 'results': return Pages.results();
        case 'settings': return Pages.settings();
        default: return Pages.notFound();
      }
    },

    renderNav(route) {
      const active = { task: 'tasks', test: 'tests', game: 'games' }[route] || route;
      const items = [{ id: '', href: '#/', title: 'Главная', icon: 'home' }]
        .concat(Pages.sections.filter((s) => s.on()))
        .concat([
          { id: 'settings', href: '#/settings', title: 'Настройки', icon: 'gear', bottom: true },
          { id: 'about', href: 'tood.html', title: 'Работы от учителя', icon: 'tests' }
        ]);
      side.innerHTML = items.map((s) => `
        <a class="side__link ${s.id === active ? 'is-active' : ''} ${s.bottom ? 'side__link--bottom' : ''}" href="${s.href}" ${s.id === active ? 'aria-current="page"' : ''}>
          ${icon(s.icon)}<span>${s.title}</span>
        </a>`).join('');
      const t = items.find((s) => s.id === active);
      document.title = (t && t.id ? t.title + ' — ' : '') + 'Компьютерный класс';
    },

    renderChip() {
      chip.innerHTML = icon('user') + '<span>' + (Store.name ? esc(Store.name) : 'Представься') + '</span>';
    },

    setName(name) {
      Store.setName(name);
      App.renderChip();
      UI.toast(name ? 'Приятно познакомиться, ' + name + '!' : 'Имя удалено');
      App.render();
    },

    // каждый раз, когда ответы (настройки) меняются
    onConfig(ctx) {
      UI.applyTheme(ctx, EMBED ? 'is-embed' : '');      // сайт переписывает свою тему
      const f = ctx.features.join(',');
      const changed = f !== lastFeatures;
      lastFeatures = f;
      if (!current) return;
      if (current.onConfig) { current.onConfig(ctx); App.renderNav((location.hash.replace(/^#\/?/, '') || '').split('/')[0]); return; }
      if (changed && !(current.busy && current.busy())) App.render();
    }
  };
  window.App = App;

  // ───── Имя ученика ─────
  chip.addEventListener('click', () => {
    nameInput.value = Store.name;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      nameInput.focus();
    } else {
      const v = prompt('Как тебя зовут?', Store.name);
      if (v !== null) App.setName(v.trim());
    }
  });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'save') App.setName(nameInput.value.trim());
  });

  // ───── Запуск ─────
  Store.load();
  Engine.fillDefaults = true;
  Engine.onChange(App.onConfig);

  if (EMBED) {
    Store.persist = false;
    document.documentElement.classList.add('is-embed');
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin && location.origin !== 'null') return;
      const d = e.data;
      if (!d || d.type !== 'klass-config') return;
      if (typeof d.name === 'string') Store.data.name = d.name;
      Engine.answers = Engine.decode(d.query || '') || {};
      lastFeatures = '';                       // перерисовать главную (имя, разделы)
      Engine.build();
      App.renderChip();
    });
  } else {
    const fromUrl = Engine.decode(location.search);
    if (fromUrl) {
      Engine.answers = fromUrl;
      Engine.save();
    } else {
      Engine.answers = Engine.loadSaved() || {};
    }

    // урок на сегодня — по ссылке из кабинета учителя
    if (params.has('l_tasks') || params.has('l_tests') || params.has('l_topic')) {
      const list = (k) => (params.get(k) || '').split(',').filter(Boolean);
      Store.setLesson({
        topic: params.get('l_topic') || '',
        note: params.get('l_note') || '',
        tasks: list('l_tasks'),
        tests: list('l_tests'),
        date: Date.now()
      });
    }

    // убираем всё служебное из адреса, чтобы ссылка была аккуратной
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  }

  // ───── Тур по сайту ─────
  const TOUR = [
    { el: null, title: 'Добро пожаловать!', text: 'Это сайт нашего компьютерного класса. Сейчас за минуту покажу, что где. Листай кнопкой «Далее» или стрелками на клавиатуре.' },
    { el: '#sideNav a[href="#/"]', title: 'Главная', text: 'Здесь тема урока, <b>задания на сегодня</b> от учителя, твой прогресс и объявления.' },
    { el: '#sideNav a[href="#/tasks"]', title: 'Задания', text: 'Текстовые — пишешь ответ, черновик сохраняется сам. Голосовые — записываешь ответ в микрофон.' },
    { el: '#sideNav a[href="#/tests"]', title: 'Контрольные', text: 'Вопросы с таймером. В конце сразу видно оценку и разбор ошибок.' },
    { el: '#sideNav a[href="#/games"]', title: 'Игры', text: 'Для перемены: «Найди пару» и «Правда или ложь».' },
    { el: '#sideNav a[href="#/typing"]', title: 'Клавиатурный тренажёр', text: 'Учимся печатать быстро. Подсвеченная клавиша — та, которую нажать.' },
    { el: '#sideNav a[href="#/results"]', title: 'Мои результаты', text: 'Все оценки и рекорды. Отсюда в конце урока <b>отправляешь результаты</b> учительнице.' },
    { el: '#studentChip', title: 'Твоё имя', text: 'Нажми и напиши имя — оно попадёт в результаты, которые ты отправишь.' },
    { el: '#helpBtn', title: 'Если забудешь', text: 'Нажми «?», и этот тур покажется снова. Удачи на уроке!' }
  ];
  const runTour = () => { location.hash = '#/'; setTimeout(() => Tour.start(TOUR, { key: 'student' }), 50); };
  document.getElementById('helpBtn').addEventListener('click', runTour);

  window.addEventListener('hashchange', App.render);
  App.renderChip();
  Engine.build();
  App.render();

  if (!EMBED && (params.has('tour') || !Tour.seen('student'))) setTimeout(runTour, 400);
})();
