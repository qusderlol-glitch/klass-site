/*
 * Тур по сайту: подсвечивает части страницы и объясняет, что где.
 * Tour.start(steps, { key }) — steps: [{ el: 'css-селектор' | null, title, text }]
 * Если el не найден на странице (раздел выключен), шаг пропускается.
 * key — запомнить, что тур уже показан (чтобы не показывать каждый раз).
 */
(function () {
  const PAD = 6;

  const Tour = {
    seen(key) {
      try { return localStorage.getItem('klass-tour-' + key) === '1'; } catch (e) { return true; }
    },
    markSeen(key) {
      try { localStorage.setItem('klass-tour-' + key, '1'); } catch (e) { /* ничего */ }
    },

    start(allSteps, opts = {}) {
      const steps = allSteps.filter((s) => !s.el || document.querySelector(s.el));
      if (!steps.length) return;
      if (Tour.active) Tour.active();

      let i = 0;
      const root = UI.h(`
        <div class="tour" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
          <div class="tour__shade"></div>
          <div class="tour__spot" aria-hidden="true"></div>
          <div class="tour__card">
            <p class="tour__count"></p>
            <h2 class="tour__title" id="tourTitle"></h2>
            <p class="tour__text"></p>
            <div class="tour__dots" aria-hidden="true">${steps.map(() => '<span></span>').join('')}</div>
            <div class="tour__actions">
              <button class="btn btn--ghost btn--sm" type="button" data-skip>Пропустить</button>
              <span class="tour__gap"></span>
              <button class="btn btn--ghost" type="button" data-prev>Назад</button>
              <button class="btn" type="button" data-next>Далее</button>
            </div>
          </div>
        </div>`);
      document.body.appendChild(root);
      const shade = root.querySelector('.tour__shade');
      const spot = root.querySelector('.tour__spot');
      const card = root.querySelector('.tour__card');
      const prev = root.querySelector('[data-prev]');
      const next = root.querySelector('[data-next]');
      const lastFocus = document.activeElement;

      function place() {
        const s = steps[i];
        const target = s.el && document.querySelector(s.el);
        const vw = window.innerWidth, vh = window.innerHeight;
        const cw = Math.min(360, vw - 24);
        card.style.width = cw + 'px';
        if (!target) {
          spot.hidden = true;
          shade.hidden = false;
          card.style.left = Math.round((vw - cw) / 2) + 'px';
          card.style.top = Math.max(12, Math.round((vh - card.offsetHeight) / 2)) + 'px';
          return;
        }
        shade.hidden = true;
        spot.hidden = false;
        const r = target.getBoundingClientRect();
        spot.style.left = r.left - PAD + 'px';
        spot.style.top = r.top - PAD + 'px';
        spot.style.width = r.width + PAD * 2 + 'px';
        spot.style.height = r.height + PAD * 2 + 'px';
        const ch = card.offsetHeight;
        let left, top;
        if (r.right + 16 + cw <= vw - 12) {          // справа
          left = r.right + 16;
          top = r.top;
        } else if (r.bottom + 14 + ch <= vh - 12) {  // снизу
          left = r.left;
          top = r.bottom + 14;
        } else if (r.top - 14 - ch >= 12) {          // сверху
          left = r.left;
          top = r.top - 14 - ch;
        } else {                                      // поверх, внизу экрана
          left = (vw - cw) / 2;
          top = vh - ch - 12;
        }
        card.style.left = Math.round(Math.min(Math.max(12, left), vw - cw - 12)) + 'px';
        card.style.top = Math.round(Math.min(Math.max(12, top), vh - ch - 12)) + 'px';
      }

      function show() {
        const s = steps[i];
        root.querySelector('.tour__count').textContent = 'Шаг ' + (i + 1) + ' из ' + steps.length;
        root.querySelector('.tour__title').textContent = s.title;
        root.querySelector('.tour__text').innerHTML = s.text;
        root.querySelectorAll('.tour__dots span').forEach((d, k) => d.classList.toggle('is-on', k === i));
        prev.disabled = i === 0;
        next.textContent = i === steps.length - 1 ? 'Понятно!' : 'Далее';
        const target = s.el && document.querySelector(s.el);
        if (target) target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        place();
        next.focus();
      }

      function end() {
        window.removeEventListener('resize', place);
        window.removeEventListener('scroll', place, true);
        document.removeEventListener('keydown', onKey, true);
        root.remove();
        Tour.active = null;
        if (opts.key) Tour.markSeen(opts.key);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }

      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); end(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      }

      function go(d) {
        const n = i + d;
        if (n < 0) return;
        if (n >= steps.length) { end(); return; }
        i = n;
        show();
      }

      next.addEventListener('click', () => go(1));
      prev.addEventListener('click', () => go(-1));
      root.querySelector('[data-skip]').addEventListener('click', end);
      shade.addEventListener('click', end);
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
      document.addEventListener('keydown', onKey, true);
      Tour.active = end;
      show();
    }
  };

  window.Tour = Tour;
})();
