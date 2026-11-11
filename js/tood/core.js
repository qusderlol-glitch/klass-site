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
      const bytes = new TextEncoder().encode(JSON.stringify(work));
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

    // Küsimus valitud keeles (panga küsimus võetakse pangast)
    q(question) {
      if (!question.bank) return question;
      const b = BANK.find((x) => x.id === question.bank);
      if (!b) return Object.assign({ type: 'short', q: '?', answers: [] }, question);
      const t = b[LANG.get()] || b.et;
      return Object.assign({}, b, { q: t.q, a: t.a, points: question.points || 1, bank: b.id });
    },

    // ───── Hindamine ─────
    // Tagastab { ok: true/false/null, part: 0…1, typo, score }
    check(q, a, allowTypos) {
      if (q.type === 'single') { const ok = a === q.right; return { ok, part: ok ? 1 : 0 }; }
      if (q.type === 'multi') {
        const ok = Array.isArray(a) && JSON.stringify(a.slice().sort()) === JSON.stringify(q.right.slice().sort());
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
      const per = work.questions.map((raw, i) => {
        const q = Core.q(raw);
        const pts = Number(raw.points != null ? raw.points : 1);
        const c = Core.check(q, answers[i], work.allowTypos);
        const earned = c.ok === null ? 0 : Math.round(pts * c.part * 10) / 10;
        if (c.ok === null) manual += pts;
        else { max += pts; points += earned; }
        return Object.assign({ pts, earned }, c);
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
      if (q.type === 'multi') return q.right.map((j) => q.a[j]).join(', ');
      if (q.type === 'short') return (q.answers || []).join(' / ');
      if (q.type === 'copy') return q.source || '';
      return L('hindab õpetaja', 'оценивает учитель');
    },

    // Tulemus kirja jaoks: väljad (FormSubmit tabel) ja tekst (Stuudium)
    report(entry) {
      const u = Core.user() || {};
      const w = entry.work;
      const r = entry.result;
      const f = {};
      f[L('Töö', 'Работа')] = Core.title(w);
      f[L('Õpilane', 'Ученик')] = u.name || '—';
      f[L('Klass', 'Класс')] = u.klass || '—';
      if (u.email) f[L('Õpilase e-post', 'E-mail ученика')] = u.email;
      f[L('Esitatud', 'Сдано')] = new Date(entry.submittedAt).toLocaleString(LANG.locale());
      f[L('Punktid (automaatselt)', 'Баллы (автоматически)')] = r.points + ' / ' + r.max + ' (' + r.percent + '%)';
      if (r.mark) f[L('Hinne (automaatne)', 'Оценка (автоматическая)')] = String(r.mark);
      if (r.manual) f[L('Õpetaja hinnata', 'Проверить учителю')] = r.manual + L(' punkti', ' балл.');
      w.questions.forEach((raw, i) => {
        const q = Core.q(raw);
        const p = r.per[i];
        const mark = p.ok === null ? '✎' : p.ok ? '✓' : p.earned > 0 ? '½' : '✗';
        let line = mark + ' ' + Core.answerText(q, entry.answers[i]);
        if (p.typo) line += ' (' + L('väike trükiviga, loetud õigeks', 'небольшая опечатка, засчитано') + ')';
        if (q.type === 'copy') line += ' (' + L('kattuvus ', 'совпадение ') + Math.round((p.score || 0) * 100) + '%, ' + p.earned + '/' + p.pts + ')';
        else if (p.ok === false) line += ' (' + L('õige: ', 'верно: ') + Core.rightText(q) + ')';
        f[(i + 1) + '. ' + q.q] = line;
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
