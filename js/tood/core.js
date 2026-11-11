/*
 * Tööde süsteemi tuum: kasutaja, tööde salvestamine, lingid ja koodid, hindamine.
 * Server puudub: töö liigub õpilaseni lingis (kokkupakitult) või lühikese koodina.
 */
(function () {
  const KEY_USER = 'klass-user';
  const KEY_TEACHER = 'klass-teacher-works';

  const read = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  // base64url <-> baidid
  const toB64 = (bytes) => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromB64 = (str) => {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

  const Core = {
    // ───── Kasutaja ─────
    user() { return read(KEY_USER, null); },
    setUser(u) { write(KEY_USER, u); },
    logout() { try { localStorage.removeItem(KEY_USER); } catch (e) { /* ei midagi */ } },
    isTeacher() { const u = Core.user(); return Boolean(u && u.role === 'teacher'); },

    // ───── Õpilase tööd (iga kasutaja omad) ─────
    stKey() {
      const u = Core.user() || {};
      return 'klass-st:' + String(u.email || (u.name || '') + '|' + (u.klass || '')).toLowerCase();
    },
    myWorks() { return read(Core.stKey(), {}); },
    saveMyWorks(m) { write(Core.stKey(), m); },
    entry(id) { return Core.myWorks()[id] || null; },
    saveEntry(id, e) { const m = Core.myWorks(); m[id] = e; Core.saveMyWorks(m); },
    addWork(work) {
      const m = Core.myWorks();
      if (!m[work.id]) m[work.id] = { work, status: 'new', answers: [], added: Date.now() };
      else m[work.id].work = work;   // õpetaja võis tööd uuendada
      Core.saveMyWorks(m);
      return m[work.id];
    },

    // ───── Õpetaja koostatud tööd ─────
    teacherWorks() { return read(KEY_TEACHER, {}); },
    saveTeacherWork(w) { const m = Core.teacherWorks(); m[w.id] = w; write(KEY_TEACHER, m); },
    deleteTeacherWork(id) { const m = Core.teacherWorks(); delete m[id]; write(KEY_TEACHER, m); },
    newId() { return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

    // ───── Töö lingis ─────
    async encode(work) {
      const bytes = new TextEncoder().encode(JSON.stringify(Core.sealWork(work)));
      if (window.CompressionStream) {
        try { return 'z' + toB64(await pipe(bytes, new CompressionStream('deflate-raw'))); } catch (e) { /* ilma pakkimiseta */ }
      }
      return 'j' + toB64(bytes);
    },
    async decode(str) {
      try {
        const kind = str[0];
        let bytes = fromB64(str.slice(1));
        if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
        else if (kind !== 'j') return null;
        const w = JSON.parse(new TextDecoder().decode(bytes));
        return w && w.id && Array.isArray(w.questions) ? w : null;
      } catch (e) { return null; }
    },
    workUrl(enc) { return new URL('tood.html', location.href).href + '#/ava/' + enc; },
    siteUrl() { return new URL('index.html', location.href).href.replace(/^https?:\/\//, '').replace(/index\.html$/, ''); },

    // ───── Töö kood: tähed ja numbrid ─────
    // Töö number kirjutatakse 5 märgiga: täht, number, täht, täht, täht.
    // Täht tähendab numbrit tähestikus: A=1, B=2 … I=9, J=0. Tühi koht: täht A, numbri kohal 1.
    // Töö 1 = A1AAA, töö 23 = B3AAA, töö 247 = B4GAA.
    // Numbrid, mille kood oleks juba kasutusel (11 = A1AAA nagu 1), jäetakse vahele.
    codeOf(n) {
      const d = String(n).split('');
      if (!n || d.length > 5) return '';
      const L1 = 'JABCDEFGHI';
      const letter = (k) => (d[k] != null ? L1[Number(d[k])] : 'A');
      return letter(0) + (d[1] != null ? d[1] : '1') + letter(2) + letter(3) + letter(4);
    },
    numOf(code) {
      const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!/^[A-J][0-9][A-J]{3}$/.test(c)) return null;
      const s = c.split('');
      let len = 5;
      while (len > 2 && s[len - 1] === 'A') len--;
      if (len === 2 && s[1] === '1') len = 1;
      const L1 = 'JABCDEFGHI';
      let num = '';
      for (let k = 0; k < len; k++) num += k === 1 ? s[k] : String(L1.indexOf(s[k]));
      return Number(num);
    },
    validNum(n) { return Core.numOf(Core.codeOf(n)) === n; },
    nextNum(last) { let n = (last || 0) + 1; while (!Core.validNum(n)) n++; return n; },
    normCode(code) { return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); },

    // Töö pealkiri
    title(w) { return w.title || L('Töö ', 'Работа ') + (w.code || ''); },

    // ───── Õiged vastused peidetakse (et neid ei saaks koodist lihtsalt vaadata) ─────
    obf(obj) {
      const key = 'arvutiklass:' + 2026;
      const b = new TextEncoder().encode(JSON.stringify(obj));
      for (let i = 0; i < b.length; i++) b[i] ^= key.charCodeAt(i % key.length);
      return toB64(b);
    },
    deobf(str) {
      try {
        const key = 'arvutiklass:' + 2026;
        const b = fromB64(str);
        for (let i = 0; i < b.length; i++) b[i] ^= key.charCodeAt(i % key.length);
        return JSON.parse(new TextDecoder().decode(b));
      } catch (e) { return {}; }
    },
    sealQ(q) {
      if (!q || q.bank || q.x) return q;
      const c = Object.assign({}, q);
      const hide = {};
      ['right', 'answers'].forEach((k) => { if (c[k] !== undefined) { hide[k] = c[k]; delete c[k]; } });
      if (c.type === 'copy' && c.mode === 'dictation' && c.source != null) { hide.source = c.source; delete c.source; }
      if (Object.keys(hide).length) c.x = Core.obf(hide);
      return c;
    },
    unsealQ(q) {
      if (!q || !q.x) return q;
      const c = Object.assign({}, q, Core.deobf(q.x));
      delete c.x;
      return c;
    },
    mapQs(work, fn) {
      const w = JSON.parse(JSON.stringify(work));
      w.questions = w.questions.map((q) => (q.type === 'group' ? Object.assign(q, { items: (q.items || []).map(fn) }) : fn(q)));
      return w;
    },
    sealWork(work) { return Core.mapQs(work, Core.sealQ); },
    unsealWork(work) { return Core.mapQs(work, Core.unsealQ); },

    // Küsimus valitud keeles (panga küsimus võetakse pangast), vastused lahti
    q(question) {
      if (!question.bank) return Core.unsealQ(question);
      const b = BANK.find((x) => x.id === question.bank);
      if (!b) return Object.assign({ type: 'short', q: '?', answers: [] }, question);
      const t = b[LANG.get()] || b.et;
      return Object.assign({}, b, { q: t.q, a: t.a, points: question.points || 1, bank: b.id, image: question.image, cols: question.cols });
    },

    // Kõik vastatavad küsimused järjest (ülesande sees olevad küsimused eraldi)
    leaves(work) {
      const out = [];
      work.questions.forEach((raw, t) => {
        if (raw.type === 'group') (raw.items || []).forEach((it, s) => out.push({ raw: it, top: t, sub: s, label: (t + 1) + '.' + (s + 1) }));
        else out.push({ raw, top: t, sub: -1, label: String(t + 1) });
      });
      return out;
    },

    // Kui palju küsimusest on tehtud: 0, 0.5 või 1 (ring täitub)
    fill(q, a) {
      if (a == null || a === '' || (Array.isArray(a) && !a.length)) return 0;
      if (q.type === 'text') {
        const n = String(a).trim().split(/\s+/).filter(Boolean).length;
        if (!n) return 0;
        return q.minWords && n < q.minWords ? 0.5 : 1;
      }
      if (q.type === 'copy') {
        const len = String(a).trim().length;
        if (!len) return 0;
        const src = String(q.source || '').length;
        return src && len < src * 0.6 ? 0.5 : 1;
      }
      if (q.type === 'voice') return a.short ? 0.5 : 1;
      return 1;
    },
    topFill(work, answers, t) {
      const ls = Core.leaves(work).map((lf, i) => ({ lf, i })).filter((x) => x.lf.top === t);
      if (!ls.length) return 0;
      const f = ls.map((x) => Core.fill(Core.q(x.lf.raw), answers[x.i]));
      if (f.every((v) => v === 1)) return 1;
      return f.some((v) => v > 0) ? 0.5 : 0;
    },

    // ───── Hindamine ─────
    // Tagastab { ok: true/false/null, part: 0…1, typo, score }
    check(q, a, allowTypos) {
      if (q.type === 'single') { const ok = a === q.right; return { ok, part: ok ? 1 : 0 }; }
      if (q.type === 'multi') {
        const ok = Array.isArray(a) && Array.isArray(q.right) && JSON.stringify(a.slice().sort()) === JSON.stringify(q.right.slice().sort());
        return { ok, part: ok ? 1 : 0 };
      }
      if (q.type === 'short') {
        const m = Fuzzy.matchShort(a, q.answers, allowTypos !== false);
        return { ok: m.ok, part: m.ok ? 1 : 0, typo: m.typo };
      }
      if (q.type === 'copy') {
        const score = Fuzzy.copyScore(q.source || '', a || '');
        const part = Math.round(score * 20) / 20;
        return { ok: score >= 0.95, part, score };
      }
      return { ok: null, part: 0 }; // tekst ja hääl — hindab õpetaja
    },

    // Eesti 5-palliline skaala
    mark(percent) {
      if (percent >= 90) return 5;
      if (percent >= 75) return 4;
      if (percent >= 50) return 3;
      if (percent >= 20) return 2;
      return 1;
    },

    grade(work, answers) {
      let points = 0, max = 0, manual = 0;
      const per = Core.leaves(work).map((lf, i) => {
        const q = Core.q(lf.raw);
        const pts = Number(lf.raw.points != null ? lf.raw.points : 1);
        const c = Core.check(q, answers[i], work.allowTypos);
        const earned = c.ok === null ? 0 : Math.round(pts * c.part * 10) / 10;
        if (c.ok === null) manual += pts;
        else { max += pts; points += earned; }
        return Object.assign({ pts, earned, label: lf.label }, c);
      });
      points = Math.round(points * 10) / 10;
      const percent = max ? Math.round((points / max) * 100) : 0;
      return { points, max, manual, percent, mark: max ? Core.mark(percent) : null, per };
    },

    answerText(q, a) {
      if (a == null || a === '' || (Array.isArray(a) && !a.length)) return L('— vastamata —', '— нет ответа —');
      if (q.type === 'single') return q.a[a];
      if (q.type === 'multi') return a.map((j) => q.a[j]).join(', ');
      if (q.type === 'voice') return L('häälvastus ', 'голосовой ответ ') + (a.seconds || 0) + L(' s (salvestis õpilase arvutis)', ' сек (запись на компьютере ученика)');
      return String(a);
    },
    rightText(q) {
      if (q.type === 'single') return q.a[q.right];
      if (q.type === 'multi') return (q.right || []).map((j) => q.a[j]).join(', ');
      if (q.type === 'short') return (q.answers || []).join(' / ');
      if (q.type === 'copy') return q.source || '';
      return L('hindab õpetaja', 'оценивает учитель');
    },

    /*
     * Tulemus kirja jaoks: väljad (FormSubmit tabel) ja tekst (Stuudium).
     * forStudent: õpilane näeb seda teksti — siis ilma punktide ja õigete vastusteta.
     */
    report(entry, forStudent) {
      const u = Core.user() || {};
      const w = entry.work;
      const r = entry.result;
      const f = {};
      f[L('Töö', 'Работа')] = Core.title(w) + (w.code ? ' (' + w.code + ')' : '');
      f[L('Õpilane', 'Ученик')] = u.name || '—';
      f[L('Klass', 'Класс')] = u.klass || '—';
      if (u.email) f[L('Õpilase e-post', 'E-mail ученика')] = u.email;
      f[L('Esitatud', 'Сдано')] = new Date(entry.submittedAt).toLocaleString(LANG.locale()) + (entry.byTime ? ' (' + L('aeg sai otsa', 'время вышло') + ')' : '');
      if (!forStudent) {
        f[L('Punktid (automaatselt)', 'Баллы (автоматически)')] = r.points + ' / ' + r.max + ' (' + r.percent + '%)';
        if (r.mark) f[L('Hinne (automaatne)', 'Оценка (автоматическая)')] = String(r.mark);
        if (r.manual) f[L('Õpetaja hinnata', 'Проверить учителю')] = r.manual + L(' punkti', ' балл.');
        const away = entry.away || { count: 0, seconds: 0 };
        f[L('Lahkus testist', 'Уходил из теста')] = away.count
          ? away.count + L(' korda, kokku ', ' раз, всего ') + away.seconds + L(' s', ' сек')
          : L('ei lahkunud', 'не уходил');
      }
      Core.leaves(w).forEach((lf, i) => {
        const q = Core.q(lf.raw);
        const p = r.per[i];
        let line = Core.answerText(q, entry.answers[i]);
        if (!forStudent) {
          const mark = p.ok === null ? '✎' : p.ok ? '✓' : p.earned > 0 ? '½' : '✗';
          line = mark + ' ' + line;
          if (p.typo) line += ' (' + L('väike trükiviga, loetud õigeks', 'небольшая опечатка, засчитано') + ')';
          if (q.type === 'copy') line += ' (' + L('kattuvus ', 'совпадение ') + Math.round((p.score || 0) * 100) + '%, ' + p.earned + '/' + p.pts + ')';
          else if (p.ok === false) line += ' (' + L('õige: ', 'верно: ') + Core.rightText(q) + ')';
        }
        f[lf.label + '. ' + q.q] = line;
      });
      const text = Object.keys(f).map((k) => k + ': ' + f[k]).join('\n');
      return { fields: f, text };
    },

    // Kujundus: sama mootor mis klassi saidil; vaikimisi EIS-stiil
    initTheme(extraClass) {
      Engine.fillDefaults = true;
      Engine.answers = Engine.loadSaved() || {};
      if (!Engine.answers.style) Engine.answers.style = 'eis';
      Engine.onChange((ctx) => UI.applyTheme(ctx, extraClass));
      Engine.build();
    }
  };

  window.Core = Core;
})();
