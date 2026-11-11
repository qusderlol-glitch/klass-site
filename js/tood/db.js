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

  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* täis */ } };
  const loadScript = (src) => new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error('load ' + src));
    document.head.appendChild(s);
  });

  let fs = null;       // Firestore
  let ready = null;

  const DB = {
    online: false,
    error: '',

    init() {
      if (ready) return ready;
      const cfg = window.CONFIG && CONFIG.FIREBASE;
      if (!cfg || !cfg.projectId) { ready = Promise.resolve(false); return ready; }
      ready = (async () => {
        try {
          await loadScript(SDK + 'firebase-app-compat.js');
          await loadScript(SDK + 'firebase-firestore-compat.js');
          if (!firebase.apps.length) firebase.initializeApp(cfg);
          fs = firebase.firestore();
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
