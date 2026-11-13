/*
 * Lihtkood / Простой код — keel, millega õpetaja teeb klassi lehe ilma programmeerimata.
 * Üks rida = üks plokk:   Kirjuta "Tere!" (K)     /   Написать "Привет!" (Ц)
 * Sulgudes täht ütleb, kuhu plokk läheb. Tab-klahv vahetab tähte.
 */
(function () {
  const { esc } = UI;

  // Käsud mõlemas keeles. tpl — mall, mis lisatakse nupust / vihjest
  const CMDS = [
    { id: 'title', et: 'Pealkiri', ru: 'Заголовок', tplEt: 'Pealkiri "Meie klass" (K)', tplRu: 'Заголовок "Наш класс" (Ц)', helpEt: 'suur pealkiri', helpRu: 'большой заголовок', color: '#2f6fd6' },
    { id: 'text', et: 'Kirjuta', ru: 'Написать', tplEt: 'Kirjuta "Tere!" (V)', tplRu: 'Написать "Привет!" (Л)', helpEt: 'tavaline tekst', helpRu: 'обычный текст', color: '#7a4fd0' },
    { id: 'list', et: 'Loend', ru: 'Список', tplEt: 'Loend "esimene; teine; kolmas"', tplRu: 'Список "первое; второе; третье"', helpEt: 'punktid, eralda ;-ga', helpRu: 'пункты через ;', color: '#c05a00' },
    { id: 'table', et: 'Tabel', ru: 'Таблица', tplEt: 'Tabel "Päev | Tund"', tplRu: 'Таблица "День | Урок"', helpEt: 'tabeli päis, veerud |-ga', helpRu: 'шапка таблицы, столбцы через |', color: '#16865a' },
    { id: 'row', et: 'Rida', ru: 'Строка', tplEt: 'Rida "Esmaspäev | Informaatika"', tplRu: 'Строка "Понедельник | Информатика"', helpEt: 'rida eelmisesse tabelisse', helpRu: 'строка в последнюю таблицу', color: '#16865a' },
    { id: 'button', et: 'Nupp', ru: 'Кнопка', tplEt: 'Nupp "Ava test" -> A1AAA', tplRu: 'Кнопка "Открыть тест" -> A1AAA', helpEt: 'nupp: testi kood või link', helpRu: 'кнопка: код теста или ссылка', color: '#c2185b' },
    { id: 'image', et: 'Pilt', ru: 'Картинка', tplEt: 'Pilt "https://…/pilt.png" (K)', tplRu: 'Картинка "https://…/kartinka.png" (Ц)', helpEt: 'pilt internetist', helpRu: 'картинка из интернета', color: '#00838f' },
    { id: 'line', et: 'Joon', ru: 'Линия', tplEt: 'Joon', tplRu: 'Линия', helpEt: 'eraldusjoon', helpRu: 'разделительная линия', color: '#6b7280' }
  ];
  // Asukohad: täht → tähendus. Tab vahetab järjekorras.
  const POS = {
    et: [['Ü', 'top', 'üleval (lehe alguses)'], ['K', 'center', 'keskel'], ['V', 'left', 'vasakul'], ['P', 'right', 'paremal'], ['A', 'bottom', 'all (lehe lõpus)']],
    ru: [['В', 'top', 'вверху страницы'], ['Ц', 'center', 'по центру'], ['Л', 'left', 'слева'], ['П', 'right', 'справа'], ['Н', 'bottom', 'внизу страницы']]
  };
  const posOf = (letter) => {
    const up = String(letter || '').toUpperCase();
    for (const lang of ['et', 'ru']) { const p = POS[lang].find((x) => x[0] === up); if (p) return p[1]; }
    return null;
  };

  const lang = () => LANG.get();
  const cmdByWord = (w) => {
    const low = w.toLowerCase();
    return CMDS.find((c) => c.et.toLowerCase() === low || c.ru.toLowerCase() === low);
  };
  const suggest = (w) => {
    let best = null, bs = 0;
    CMDS.forEach((c) => [c.et, c.ru].forEach((n) => { const s = Fuzzy.similarity(w, n); if (s > bs) { bs = s; best = n; } }));
    return bs >= 0.5 ? best : null;
  };

  // ───── Tõlgendamine: tekst → plokid + vead ─────
  function parse(text) {
    const blocks = [], errors = [];
    String(text || '').split('\n').forEach((raw, i) => {
      const line = raw.trim();
      const n = i + 1;
      if (!line || line.startsWith('#')) return;   // tühi rida või kommentaar
      const m = line.match(/^([^\s"(]+)\s*(.*)$/);
      const cmd = cmdByWord(m[1]);
      if (!cmd) {
        const s = suggest(m[1]);
        errors.push({ line: n, msg: L('Ma ei tunne käsku «' + m[1] + '».', 'Не знаю команду «' + m[1] + '».') + (s ? L(' Kas mõtlesid «' + s + '»?', ' Может, «' + s + '»?') : '') });
        return;
      }
      let rest = m[2];
      let pos = null;
      const pm = rest.match(/\(([^)]{1})\)\s*$/);
      if (pm) { pos = posOf(pm[1]); rest = rest.slice(0, pm.index).trim(); if (!pos) errors.push({ line: n, msg: L('Tundmatu asukoht (' + pm[1] + '). Vajuta Tab, et valida.', 'Неизвестное место (' + pm[1] + '). Нажми Tab, чтобы выбрать.') }); }
      const q = rest.match(/^"([^"]*)"\s*(.*)$/);
      if (cmd.id === 'line') { blocks.push({ id: 'line', pos, line: n }); return; }
      if (!q) { errors.push({ line: n, msg: L('Tekst peab olema jutumärkides: ', 'Текст должен быть в кавычках: ') + (lang() === 'ru' ? cmd.tplRu : cmd.tplEt) }); return; }
      const extra = q[2].trim();
      if (extra && cmd.id !== 'button') {
        errors.push({ line: n, msg: L('Pärast jutumärke on üleliigne «' + extra + '». Kustuta see või vajuta Tab, et asukoht valida.', 'После кавычек лишнее «' + extra + '». Удали это или нажми Tab, чтобы выбрать место.') });
        return;
      }
      const b = { id: cmd.id, text: q[1], pos, line: n };
      if (cmd.id === 'button') {
        const t = q[2].match(/^->\s*"?([^"\s]+)"?\s*$/);
        if (!t) { errors.push({ line: n, msg: L('Nupul puudub siht: lisa -> ja testi kood või link.', 'У кнопки нет цели: добавь -> и код теста или ссылку.') }); return; }
        b.target = t[1];
      }
      if (cmd.id === 'row') {
        const last = [...blocks].reverse().find((x) => x.id === 'table');
        if (!last) { errors.push({ line: n, msg: L('Rida peab tulema pärast tabelit.', 'Строка должна идти после таблицы.') }); return; }
        last.rows.push(q[1].split('|').map((s) => s.trim()));
        return;
      }
      if (cmd.id === 'table') b.rows = [];
      blocks.push(b);
    });
    return { blocks, errors };
  }

  // ───── Joonistamine: plokid → HTML ─────
  function render(blocks, opts = {}) {
    const order = blocks.filter((b) => b.pos === 'top').concat(blocks.filter((b) => b.pos !== 'top' && b.pos !== 'bottom'), blocks.filter((b) => b.pos === 'bottom'));
    if (!order.length) return `<p class="muted">${L('Leht on tühi.', 'Страница пустая.')}</p>`;
    return order.map((b) => {
      const align = b.pos === 'center' || b.pos === 'left' || b.pos === 'right' ? ` lk-${b.pos}` : '';
      const del = opts.editable ? `<button type="button" class="lk-del" data-del-line="${b.line}" title="${L('Kustuta', 'Удалить')}" aria-label="${L('Kustuta rida', 'Удалить строку')} ${b.line}">✕</button>` : '';
      let inner = '';
      if (b.id === 'title') inner = `<h2>${esc(b.text)}</h2>`;
      else if (b.id === 'text') inner = `<p>${esc(b.text)}</p>`;
      else if (b.id === 'list') inner = `<ul>${b.text.split(';').map((s) => s.trim()).filter(Boolean).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
      else if (b.id === 'line') inner = '<hr>';
      else if (b.id === 'image') inner = /^https?:\/\//.test(b.text) ? `<img src="${esc(b.text)}" alt="" loading="lazy">` : `<p class="muted">${L('Pildi aadress peab algama https://', 'Адрес картинки должен начинаться с https://')}</p>`;
      else if (b.id === 'button') {
        const code = Core.normCode(b.target);
        const href = Core.numOf(code) != null ? 'tood.html#/kood/' + code : /^https?:\/\//.test(b.target) ? b.target : '#';
        inner = `<a class="btn" href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(b.text)}</a>`;
      } else if (b.id === 'table') {
        const head = b.text.split('|').map((s) => s.trim());
        inner = `<div class="table-wrap"><table class="table"><thead><tr>${head.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${head.map((_, k) => `<td>${esc(r[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
      return `<div class="lk-block${align}">${del}${inner}</div>`;
    }).join('');
  }

  const sample = () => (lang() === 'ru' ? [
    'Заголовок "Наш компьютерный класс" (Ц)',
    'Написать "Сегодня пишем тест про устройство компьютера." (Л)',
    'Кнопка "Начать тест" -> A1AAA',
    'Линия',
    'Таблица "День | Урок | Кабинет"',
    'Строка "Понедельник | Информатика | 204"',
    'Строка "Четверг | Информатика | 204"',
    'Список "Не ешь у компьютера; Выключай монитор; Не трогай провода"',
    'Написать "Удачи!" (Н)'
  ] : [
    'Pealkiri "Meie arvutiklass" (K)',
    'Kirjuta "Täna teeme testi arvuti osade kohta." (V)',
    'Nupp "Alusta testi" -> A1AAA',
    'Joon',
    'Tabel "Päev | Tund | Klass"',
    'Rida "Esmaspäev | Informaatika | 204"',
    'Rida "Neljapäev | Informaatika | 204"',
    'Loend "Ära söö arvuti juures; Lülita monitor välja; Ära puuduta juhtmeid"',
    'Kirjuta "Edu!" (A)'
  ]).join('\n');

  // ───── Redaktor: vihjed, Tab, plokinupud, eelvaade ─────
  function editor(initial, onSave) {
    const el = UI.h(`
      <div class="lk-editor">
        <div class="lk-palette" aria-label="${L('Plokid', 'Блоки')}">
          <span class="lk-palette__title">${L('Lisa plokk:', 'Добавить блок:')}</span>
          ${CMDS.map((c) => `<button type="button" class="lk-chip" style="--c:${c.color}" data-tpl="${c.id}" title="${esc(lang() === 'ru' ? c.helpRu : c.helpEt)}">${esc(lang() === 'ru' ? c.ru : c.et)}</button>`).join('')}
        </div>
        <div class="lk-grid">
          <div class="lk-code">
            <div class="lk-code__head">
              <b>${L('Sinu kood', 'Твой код')}</b>
              <span class="muted small">${L('Tab — vali asukoht · Enter — uus rida', 'Tab — выбрать место · Enter — новая строка')}</span>
            </div>
            <div class="lk-area">
              <div class="lk-nums" aria-hidden="true"></div>
              <textarea class="lk-text" spellcheck="false" aria-label="${L('Lihtkood', 'Простой код')}"></textarea>
            </div>
            <div class="lk-hints" role="listbox" hidden></div>
            <div class="lk-errors" aria-live="polite"></div>
            <details class="lk-help">
              <summary>${L('Kuidas kirjutada?', 'Как писать?')}</summary>
              <p>${L('Iga rida on üks plokk: <b>käsk</b>, siis <b>"tekst jutumärkides"</b>, lõpus võib olla <b>(täht)</b> — kuhu plokk läheb.', 'Каждая строка — один блок: <b>команда</b>, потом <b>"текст в кавычках"</b>, в конце можно <b>(букву)</b> — куда поставить блок.')}</p>
              <ul>${POS[lang()].map((p) => `<li><b>(${p[0]})</b> — ${p[2]}</li>`).join('')}</ul>
              <ul>${CMDS.map((c) => `<li><code>${esc(lang() === 'ru' ? c.tplRu : c.tplEt)}</code> — ${esc(lang() === 'ru' ? c.helpRu : c.helpEt)}</li>`).join('')}</ul>
              <p class="muted small">${L('Rida, mis algab märgiga #, on märkus ja seda ei näidata.', 'Строка, которая начинается с #, — заметка, её не видно.')}</p>
            </details>
          </div>
          <div class="lk-preview-wrap">
            <div class="lk-code__head"><b>${L('Nii näevad õpilased', 'Так увидят ученики')}</b><span class="muted small">${L('✕ kustutab ploki', '✕ удаляет блок')}</span></div>
            <div class="lk-preview card"></div>
          </div>
        </div>
        <div class="row">
          <button class="btn btn--lg" type="button" data-save>${L('Salvesta ja näita õpilastele', 'Сохранить и показать ученикам')}</button>
          <button class="btn btn--ghost" type="button" data-sample>${L('Alusta mallist', 'Начать с шаблона')}</button>
          <span class="muted small" data-status></span>
        </div>
      </div>`);
    const ta = el.querySelector('.lk-text');
    const nums = el.querySelector('.lk-nums');
    const prev = el.querySelector('.lk-preview');
    const errs = el.querySelector('.lk-errors');
    const hints = el.querySelector('.lk-hints');
    let hintList = [], hintIdx = 0;
    ta.value = initial || '';

    const lineAt = () => {
      const before = ta.value.slice(0, ta.selectionStart);
      const start = before.lastIndexOf('\n') + 1;
      let end = ta.value.indexOf('\n', ta.selectionStart);
      if (end < 0) end = ta.value.length;
      return { start, end, text: ta.value.slice(start, end) };
    };
    const replaceLine = (ln, txt, caret) => {
      ta.value = ta.value.slice(0, ln.start) + txt + ta.value.slice(ln.end);
      const c = ln.start + (caret != null ? caret : txt.length);
      ta.setSelectionRange(c, c);
      update();
    };

    function update() {
      const lines = ta.value.split('\n');
      nums.innerHTML = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
      const { blocks, errors } = parse(ta.value);
      prev.innerHTML = render(blocks, { editable: true });
      errs.innerHTML = errors.length
        ? errors.map((e) => `<p class="lk-err">${L('Rida', 'Строка')} ${e.line}: ${esc(e.msg)}</p>`).join('')
        : `<p class="lk-ok">✓ ${L('Vigu pole', 'Ошибок нет')}</p>`;
      showHints();
    }

    function showHints() {
      const ln = lineAt();
      const word = ln.text.trim();
      hintList = [];
      if (word && !/\s/.test(word) && !cmdByWord(word)) {
        const low = word.toLowerCase();
        hintList = CMDS.filter((c) => c.et.toLowerCase().startsWith(low) || c.ru.toLowerCase().startsWith(low));
      }
      if (!hintList.length || document.activeElement !== ta) { hints.hidden = true; return; }
      hintIdx = Math.min(hintIdx, hintList.length - 1);
      hints.hidden = false;
      hints.innerHTML = hintList.map((c, k) => `<button type="button" role="option" class="lk-hint ${k === hintIdx ? 'is-on' : ''}" data-hint="${k}"><code>${esc(lang() === 'ru' ? c.tplRu : c.tplEt)}</code> <span class="muted small">${esc(lang() === 'ru' ? c.helpRu : c.helpEt)}</span></button>`).join('') +
        `<p class="muted small lk-hints__tip">${L('Tab või Enter — vali', 'Tab или Enter — выбрать')}</p>`;
    }

    function acceptHint(k) {
      const c = hintList[k];
      if (!c) return;
      const tpl = lang() === 'ru' ? c.tplRu : c.tplEt;
      const ln = lineAt();
      const q = tpl.indexOf('"');
      replaceLine(ln, tpl, q >= 0 ? q + 1 : tpl.length);
      // vali tekst jutumärkide vahel, et kohe üle kirjutada
      if (q >= 0) { const e = tpl.indexOf('"', q + 1); ta.setSelectionRange(ln.start + q + 1, ln.start + e); }
      hints.hidden = true;
    }

    // Tab: vaheta asukoha tähte (Ü→K→V→P→A); kui tähte pole, lisa
    function cyclePos() {
      const ln = lineAt();
      const list = POS[lang()];
      const m = ln.text.match(/\(([^)]{1})\)\s*$/);
      let next;
      // kui lõpus on poolik sulg, nt « (» või « (Ц», asendame selle
      if (!m) next = ln.text.replace(/\s*\([^)"]{0,2}$/, '').replace(/\s*$/, '') + ' (' + list[0][0] + ')';
      else {
        const cur = list.findIndex((p) => p[0] === m[1].toUpperCase());
        const other = POS[lang() === 'ru' ? 'et' : 'ru'].findIndex((p) => p[0] === m[1].toUpperCase());
        const idx = cur >= 0 ? (cur + 1) % list.length : other >= 0 ? (other + 1) % list.length : 0;
        next = ln.text.slice(0, m.index) + '(' + list[idx][0] + ')';
      }
      replaceLine(ln, next);
      const mm = next.match(/\(([^)])\)$/);
      const p = list.find((x) => x[0] === (mm && mm[1]));
      if (p) UI.toast(L('Asukoht: ', 'Место: ') + p[2]);
    }

    ta.addEventListener('input', () => { hintIdx = 0; update(); });
    ta.addEventListener('click', showHints);
    ta.addEventListener('keyup', (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && hints.hidden) showHints(); });
    ta.addEventListener('blur', () => setTimeout(() => { hints.hidden = true; }, 150));
    ta.addEventListener('scroll', () => { nums.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', (e) => {
      if (!hints.hidden && hintList.length) {
        if (e.key === 'ArrowDown') { e.preventDefault(); hintIdx = (hintIdx + 1) % hintList.length; showHints(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); hintIdx = (hintIdx - 1 + hintList.length) % hintList.length; showHints(); return; }
        if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); acceptHint(hintIdx); return; }
        if (e.key === 'Escape') { hints.hidden = true; return; }
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        const ln = lineAt();
        if (ln.text.trim()) { e.preventDefault(); cyclePos(); }
      }
    });
    hints.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-hint]'); if (b) { e.preventDefault(); acceptHint(Number(b.dataset.hint)); } });

    // plokinupud (nagu Scratch): lisavad rea lõppu
    el.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => {
      const c = CMDS.find((x) => x.id === b.dataset.tpl);
      const tpl = lang() === 'ru' ? c.tplRu : c.tplEt;
      ta.value = ta.value.replace(/\s*$/, '') + (ta.value.trim() ? '\n' : '') + tpl;
      ta.focus();
      const end = ta.value.length;
      const q = ta.value.lastIndexOf('\n') + 1 + tpl.indexOf('"');
      if (tpl.includes('"')) ta.setSelectionRange(q + 1, ta.value.indexOf('"', q + 1)); else ta.setSelectionRange(end, end);
      update();
    }));
    // ✕ eelvaates kustutab rea koodist
    prev.addEventListener('click', (e) => {
      const b = e.target.closest('[data-del-line]');
      if (!b) return;
      const n = Number(b.dataset.delLine);
      const lines = ta.value.split('\n');
      const cmd = (lines[n - 1] || '').trim().split(/\s/)[0];
      const c = cmdByWord(cmd || '');
      lines.splice(n - 1, 1);
      // tabeli kustutamisel kustuta ka selle read
      if (c && c.id === 'table') while (lines[n - 1] != null && /^(rida|строка)\b/i.test(lines[n - 1].trim())) lines.splice(n - 1, 1);
      ta.value = lines.join('\n');
      update();
    });
    el.querySelector('[data-sample]').addEventListener('click', () => {
      if (ta.value.trim() && !confirm(L('Asendada praegune kood malliga?', 'Заменить текущий код шаблоном?'))) return;
      ta.value = sample();
      update();
    });
    el.querySelector('[data-save]').addEventListener('click', async () => {
      const st = el.querySelector('[data-status]');
      st.textContent = L('Salvestan…', 'Сохраняю…');
      try { await onSave(ta.value); st.textContent = '✓ ' + L('Salvestatud', 'Сохранено'); }
      catch (e) { st.textContent = '✗ ' + String(e.message || e); }
    });
    update();
    return el;
  }

  window.Lihtkood = { parse, render, editor, sample };
})();
