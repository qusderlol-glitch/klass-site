/*
 * Tööde hoidla / Хранилище работ.
 * Kui config.js-is on FIREBASE seaded — tööd on internetis ja kõik õpilased näevad neid koodiga.
 * Kui ei ole — tööd on ainult selles brauseris (proovimiseks).
 */
(function () {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const LOCAL_WORKS = 'klass-db-works';
  const LOCAL_META = 'klass-db-meta';
  const LOCAL_PAGE = 'klass-db-page';
  const LOCAL_RESULTS = 'klass-db-results';

  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* täis */ } };
  const loadScript = (src) => new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error('load ' + src));
    document.head.appendChild(s);
  });

  let fs = null;       // Firestore
  let auth = null;     // õpetaja sisselogimine (Firebase Auth)
  let ready = null;

  const DB = {
    online: false,
    error: '',

    init() {
      if (ready) return ready;
      const cfg = window.CONFIG && CONFIG.FIREBASE;
      // proovirežiim: localStorage 'klass-db-local' = '1' → ainult see brauser (päris andmebaasi ei puututa)
      let localOnly = false;
      try { localOnly = localStorage.getItem('klass-db-local') === '1'; } catch (e) { /* ei midagi */ }
      if (!cfg || !cfg.projectId || localOnly) { ready = Promise.resolve(false); return ready; }
      ready = (async () => {
        try {
          await loadScript(SDK + 'firebase-app-compat.js');
          await loadScript(SDK + 'firebase-firestore-compat.js');
          await loadScript(SDK + 'firebase-auth-compat.js');
          if (!firebase.apps.length) firebase.initializeApp(cfg);
          fs = firebase.firestore();
          auth = firebase.auth();
          await new Promise((res) => { const off = auth.onAuthStateChanged(() => { off(); res(); }); });
          DB.online = true;
          return true;
        } catch (e) {
          DB.error = String(e.message || e);
          DB.online = false;
          return false;
        }
      })();
      return ready;
    },

    // ───── Õpetaja sisselogimine ─────
    authUser() { return auth ? auth.currentUser : (DB.online ? null : { email: 'local' }); },
    async signIn(email, password) {
      await DB.init();
      if (!DB.online) return { email: 'local' };
      try {
        const r = await auth.signInWithEmailAndPassword(email, password);
        return r.user;
      } catch (e) {
        const c = e.code || '';
        if (/configuration-not-found|operation-not-allowed/.test(c)) throw new Error(L('Firebase-is pole e-posti sisselogimine veel sisse lülitatud (vt FIREBASE.md).', 'В Firebase ещё не включён вход по e-mail (см. FIREBASE.md).'));
        if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) throw new Error(L('Vale e-post või parool.', 'Неверный e-mail или пароль.'));
        if (/too-many-requests/.test(c)) throw new Error(L('Liiga palju katseid. Oota natuke.', 'Слишком много попыток. Подожди немного.'));
        throw e;
      }
    },
    async signOut() { if (auth) await auth.signOut(); },

    // ───── Tulemused ─────
    async saveResult(r) {
      await DB.init();
      if (DB.online) { const ref = await fs.collection('results').add(r); return ref.id; }
      const all = read(LOCAL_RESULTS, {});
      const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      all[id] = Object.assign({}, r, { id });
      write(LOCAL_RESULTS, all);
      return id;
    },
    async listResults() {
      await DB.init();
      if (DB.online) {
        const snap = await fs.collection('results').get();
        return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      }
      return Object.values(read(LOCAL_RESULTS, {}));
    },
    async getResult(id) {
      await DB.init();
      if (DB.online) { const d = await fs.collection('results').doc(id).get(); return d.exists ? Object.assign({ id: d.id }, d.data()) : null; }
      return read(LOCAL_RESULTS, {})[id] || null;
    },
    async updateResult(id, patch) {
      await DB.init();
      if (DB.online) { await fs.collection('results').doc(id).update(patch); return; }
      const all = read(LOCAL_RESULTS, {});
      all[id] = Object.assign({}, all[id], patch);
      write(LOCAL_RESULTS, all);
    },
    async removeResult(id) {
      await DB.init();
      if (DB.online) { await fs.collection('results').doc(id).delete(); return; }
      const all = read(LOCAL_RESULTS, {});
      delete all[id];
      write(LOCAL_RESULTS, all);
    },

    // Kõik avaldatud tööd (uuemad eespool)
    async list() {
      await DB.init();
      if (DB.online) {
        const snap = await fs.collection('works').get();
        return snap.docs.map((d) => d.data()).sort((a, b) => (b.num || 0) - (a.num || 0));
      }
      return Object.values(read(LOCAL_WORKS, {})).sort((a, b) => (b.num || 0) - (a.num || 0));
    },

    async get(code) {
      code = Core.normCode(code);
      if (Core.numOf(code) == null) return null;
      await DB.init();
      if (DB.online) {
        const d = await fs.collection('works').doc(code).get();
        return d.exists ? d.data() : null;
      }
      return read(LOCAL_WORKS, {})[code] || null;
    },

    // Avaldab töö. Uus töö saab järgmise vaba numbri ja koodi (A1AAA, A2AAA …)
    async publish(work) {
      await DB.init();
      const w = JSON.parse(JSON.stringify(work));
      w.updated = Date.now();
      if (DB.online) {
        if (!w.code) {
          const meta = fs.collection('meta').doc('counter');
          await fs.runTransaction(async (tx) => {
            const m = await tx.get(meta);
            const n = Core.nextNum(m.exists ? m.data().last : 0);
            w.num = n;
            w.code = Core.codeOf(n);
            w.id = 'k' + w.code;
            tx.set(meta, { last: n });
            tx.set(fs.collection('works').doc(w.code), w);
          });
        } else {
          await fs.collection('works').doc(w.code).set(w);
        }
        return w;
      }
      const all = read(LOCAL_WORKS, {});
      if (!w.code) {
        const meta = read(LOCAL_META, { last: 0 });
        w.num = Core.nextNum(meta.last);
        w.code = Core.codeOf(w.num);
        w.id = 'k' + w.code;
        write(LOCAL_META, { last: w.num });
      }
      all[w.code] = w;
      write(LOCAL_WORKS, all);
      return w;
    },

    async remove(code) {
      await DB.init();
      if (DB.online) { await fs.collection('works').doc(code).delete(); return; }
      const all = read(LOCAL_WORKS, {});
      delete all[code];
      write(LOCAL_WORKS, all);
    },

    // Klassi leht (õpetaja koostatud)
    async getPage() {
      await DB.init();
      if (DB.online) {
        const d = await fs.collection('pages').doc('main').get();
        return d.exists ? d.data().text || '' : '';
      }
      return read(LOCAL_PAGE, '');
    },
    async savePage(text) {
      await DB.init();
      if (DB.online) { await fs.collection('pages').doc('main').set({ text, updated: Date.now() }); return; }
      write(LOCAL_PAGE, text);
    }
  };

  window.DB = DB;
})();
