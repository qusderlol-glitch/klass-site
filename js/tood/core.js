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

    // ───── Lühike kood (ainult panga küsimustega töö) ─────
    // Kuju: <minutid>-<id>-<id>…  näiteks 10-1-4-7-12
    codeOf(work) {
      if (!work.questions.length || !work.questions.every((q) => q.bank)) return '';
      return [work.minutes || 0].concat(work.questions.map((q) => q.bank)).join('-');
    },
    fromCode(code) {
      const parts = String(code).trim().split(/[^0-9]+/).filter(Boolean).map(Number);
      if (parts.length < 2) return null;
      const [minutes, ...ids] = parts;
      if (!ids.every((id) => BANK.some((b) => b.id === id))) return null;
      return {
        id: 'c' + parts.join('-'),
        title: '',   // pealkiri tuleb õpilase keeles (vt Core.title)
        minutes,
        questions: ids.map((id) => ({ bank: id, points: 1 })),
        teacher: {},
        showAnswers: true,
        code: parts.join('-')
      };
    },

    // Töö pealkiri (koodiga tööl — õpilase keeles)
    title(w) { return w.title || L('Töö koodiga ', 'Работа с кодом ') + (w.code || ''); },

    // Küsimus valitud keeles (panga küsimus võetakse pangast)
    q(question) {
      if (!question.bank) return question;
      const b = BANK.find((x) => x.id === question.bank);
      if (!b) return Object.assign({ type: 'short', q: '?', answers: [] }, question);
      const t = b[LANG.get()] || b.et;
      return Object.assign({}, b, { q: t.q, a: t.a, points: question.points || 1, bank: b.id });
    },

    // ───── Hindamine ─────
    norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, '').replace(/[.!?,;:]+$/, ''); },

    check(q, a) {
      if (q.type === 'single') return a === q.right;
      if (q.type === 'multi') return Array.isArray(a) && JSON.stringify(a.slice().sort()) === JSON.stringify(q.right.slice().sort());
      if (q.type === 'short') return (q.answers || []).some((x) => Core.norm(x) === Core.norm(a));
      return null; // tekst ja hääl — hindab õpetaja
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
        const ok = Core.check(q, answers[i]);
        if (ok === null) manual += pts;
        else { max += pts; if (ok) points += pts; }
        return { ok, pts };
      });
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
        const ok = r.per[i].ok;
        const mark = ok === null ? '✎' : ok ? '✓' : '✗';
        f[(i + 1) + '. ' + q.q] = mark + ' ' + Core.answerText(q, entry.answers[i]) + (ok === false ? ' (' + L('õige: ', 'верно: ') + Core.rightText(q) + ')' : '');
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
