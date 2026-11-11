/*
 * Pildid / Картинки.
 * Images.view(url, { onPick }) — pilt; kui pilti pole või see ei laadi: ":(" ja «Pilt ei leitud».
 *   Õpetaja saab sellele vajutada ja pildi valida.
 * Images.pick(query, onDone) — aken: otsi internetist (Openverse + Wikimedia Commons),
 *   vali arvutist või kleebi link. Internetist otsides võetakse kohe sobivaim pilt.
 */
(function () {
  const { h, esc } = UI;

  function placeholder(editable) {
    return `<div class="img-missing">
      <span class="img-missing__face" aria-hidden="true">:(</span>
      <span>${L('Pilt ei leitud', 'Картинка не найдена')}</span>
      ${editable ? `<span class="img-missing__hint">${L('Vajuta, et pilt valida', 'Нажми, чтобы выбрать картинку')}</span>` : ''}
    </div>`;
  }

  // Pilt internetist: otsing kahest tasuta pildipangast
  // Lihtsad sõnad, mis pildiotsingut ei aita
  const STOP = new Set('milline mis kes kus kuidas miks mitu kas see on ja või ning ei the and what which how why какой какая какое какие что кто где как почему сколько это и или не на в с по из для'.split(' '));
  const keywords = (text) => String(text || '').toLowerCase().replace(/[?!.:,;«»"()\d]/g, ' ').split(/\s+/).filter((x) => x.length >= 3 && !STOP.has(x));

  // Otsib terve päringu järgi; kui midagi ei leia, proovib tähtsamaid sõnu eraldi
  async function search(q) {
    let list = await searchOnce(q);
    if (list.length) return list;
    const words = keywords(q).sort((a, b) => b.length - a.length).slice(0, 3);
    for (const wd of words) {
      if (wd === q.trim().toLowerCase()) continue;
      list = await searchOnce(wd);
      if (list.length) return list;
    }
    return [];
  }

  async function searchOnce(q) {
    const out = [];
    const tasks = [
      fetch('https://api.openverse.org/v1/images/?page_size=12&mature=false&q=' + encodeURIComponent(q))
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => (d.results || []).forEach((x) => out.push({ thumb: x.thumbnail || x.url, url: x.thumbnail || x.url, title: x.title || '', src: 'Openverse' })))
        .catch(() => {}),
      fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=500&gsrsearch=' + encodeURIComponent(q))
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => Object.values((d.query && d.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).forEach((p) => {
          const ii = p.imageinfo && p.imageinfo[0];
          if (ii && ii.thumburl) out.push({ thumb: ii.thumburl, url: ii.thumburl, title: (p.title || '').replace(/^File:/, ''), src: 'Wikimedia' });
        }))
        .catch(() => {})
    ];
    await Promise.all(tasks);
    // vahelduvalt mõlemast allikast, et esimesed oleksid parimad
    const a = out.filter((x) => x.src === 'Wikimedia'), b = out.filter((x) => x.src === 'Openverse');
    const mixed = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) mixed.push(a[i]); if (b[i]) mixed.push(b[i]); }
    return mixed;
  }

  // Arvutist: vähendame pildi, et test jääks väikeseks
  function fromFile(file) {
    return new Promise((ok, fail) => {
      if (!file || !/^image\//.test(file.type)) { fail(new Error(L('See ei ole pilt.', 'Это не картинка.'))); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 800;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail(new Error(L('Pilti ei saanud avada.', 'Не удалось открыть картинку.'))); };
      img.src = url;
    });
  }

  const Images = {
    search,

    view(url, opts = {}) {
      const editable = typeof opts.onPick === 'function';
      const el = h(`<div class="img-box ${editable ? 'img-box--edit' : ''}" ${editable ? 'role="button" tabindex="0"' : ''}></div>`);
      const showMissing = () => { el.innerHTML = placeholder(editable); el.classList.add('is-missing'); };
      if (url) {
        const img = new Image();
        img.alt = opts.alt || '';
        img.loading = 'lazy';
        img.onerror = showMissing;
        img.src = url;
        el.appendChild(img);
      } else showMissing();
      if (editable) {
        const open = () => Images.pick(opts.query || '', (u) => opts.onPick(u));
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      }
      return el;
    },

    pick(query, onDone) {
      const ov = h(`
        <div class="modal modal--anim" role="dialog" aria-modal="true" aria-label="${L('Vali pilt', 'Выбери картинку')}">
          <div class="modal__box card img-pick">
            <div class="row row--between"><h2>${L('Vali pilt', 'Выбери картинку')}</h2><button class="btn btn--ghost btn--sm" type="button" data-x>✕</button></div>
            <div class="seg" role="tablist">
              <button type="button" class="is-on" data-tab="web">${L('Otsi internetist', 'Найти в интернете')}</button>
              <button type="button" data-tab="file">${L('Arvutist', 'С компьютера')}</button>
              <button type="button" data-tab="link">${L('Link', 'Ссылка')}</button>
            </div>
            <div data-pane="web">
              <form class="row row--tight" data-search>
                <input class="input" type="search" placeholder="${L('nt kass, arvuti, klaviatuur', 'напр. кот, компьютер, клавиатура')}" aria-label="${L('Mida otsida', 'Что искать')}" data-q>
                <button class="btn" type="submit">${L('Otsi', 'Найти')}</button>
              </form>
              <p class="muted small" data-status>${L('Kirjuta, mis pildil peab olema. Sobivaim pilt valitakse kohe.', 'Напиши, что должно быть на картинке. Самая подходящая выберется сразу.')}</p>
              <div class="img-grid" data-results></div>
            </div>
            <div data-pane="file" hidden>
              <label class="img-drop">
                <input type="file" accept="image/*" data-file hidden>
                <span>${L('Vajuta siia ja vali pilt arvutist', 'Нажми сюда и выбери картинку на компьютере')}</span>
              </label>
              <p class="muted small" data-fstatus></p>
            </div>
            <div data-pane="link" hidden>
              <form class="row row--tight" data-link>
                <input class="input" type="url" placeholder="https://…" aria-label="${L('Pildi link', 'Ссылка на картинку')}" data-url>
                <button class="btn" type="submit">${L('Lisa', 'Добавить')}</button>
              </form>
            </div>
            <div class="img-preview" data-preview hidden></div>
            <div class="row row--between">
              <button class="btn btn--ghost btn--danger" type="button" data-remove>${L('Eemalda pilt', 'Убрать картинку')}</button>
              <button class="btn btn--lg" type="button" data-ok disabled>${L('Lisa see pilt', 'Добавить эту картинку')}</button>
            </div>
          </div>
        </div>`);
      document.body.appendChild(ov);
      let chosen = '';
      const okBtn = ov.querySelector('[data-ok]');
      const prev = ov.querySelector('[data-preview]');
      const choose = (u) => {
        chosen = u;
        okBtn.disabled = !u;
        prev.hidden = !u;
        prev.innerHTML = '';
        if (u) prev.appendChild(Images.view(u));
        ov.querySelectorAll('.img-grid button').forEach((b) => b.classList.toggle('is-on', b.dataset.url === u));
      };
      const close = () => ov.remove();
      ov.querySelector('[data-x]').addEventListener('click', close);
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      ov.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
        ov.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('is-on', x === b));
        ov.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
      }));

      const qIn = ov.querySelector('[data-q]');
      const status = ov.querySelector('[data-status]');
      const results = ov.querySelector('[data-results]');
      async function run() {
        const q = qIn.value.trim();
        if (!q) return;
        status.textContent = L('Otsin…', 'Ищу…');
        results.innerHTML = '';
        const list = await search(q);
        if (!list.length) { status.textContent = L('Midagi ei leitud. Proovi teist sõna (nt inglise keeles).', 'Ничего не нашлось. Попробуй другое слово (например, по-английски).'); return; }
        status.textContent = L('Valisin kõige sobivama. Võid valida ka teise.', 'Выбрал самую подходящую. Можно выбрать другую.');
        list.slice(0, 18).forEach((x) => {
          const b = h(`<button type="button" class="img-grid__item" data-url="${esc(x.url)}" title="${esc(x.title)}"><img src="${esc(x.thumb)}" alt="${esc(x.title)}" loading="lazy"></button>`);
          b.querySelector('img').onerror = () => b.remove();
          b.addEventListener('click', () => choose(x.url));
          results.appendChild(b);
        });
        choose(list[0].url);
      }
      ov.querySelector('[data-search]').addEventListener('submit', (e) => { e.preventDefault(); run(); });
      ov.querySelector('[data-file]').addEventListener('change', async (e) => {
        const st = ov.querySelector('[data-fstatus]');
        try {
          st.textContent = L('Valmistan pilti ette…', 'Готовлю картинку…');
          const d = await fromFile(e.target.files[0]);
          st.textContent = L('Valmis!', 'Готово!') + ' (' + Math.round(d.length / 1024) + ' KB)';
          choose(d);
        } catch (er) { st.textContent = er.message; }
      });
      ov.querySelector('[data-link]').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = ov.querySelector('[data-url]').value.trim();
        if (/^https?:\/\//.test(u)) choose(u);
      });
      ov.querySelector('[data-remove]').addEventListener('click', () => { onDone(''); close(); });
      okBtn.addEventListener('click', () => { onDone(chosen); close(); });

      qIn.value = keywords(query).sort((a, b) => b.length - a.length).slice(0, 2).join(' ');
      if (qIn.value) run();
      setTimeout(() => qIn.focus(), 50);
    }
  };

  window.Images = Images;
})();
