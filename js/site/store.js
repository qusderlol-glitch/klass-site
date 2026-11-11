/* Память сайта: имя ученика и результаты. Хранится только в этом браузере. */
(function () {
  const KEY = 'klass-data';

  const Store = {
    data: {},
    persist: true,   // в предпросмотре (на стикере) ничего не сохраняем

    load() {
      let d = {};
      try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { d = {}; }
      d.tasks = d.tasks || {};
      d.tests = d.tests || {};
      d.games = d.games || {};
      d.typing = d.typing || {};
      this.data = d;
    },

    save() {
      if (!this.persist) return;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* память недоступна */ }
    },

    get name() { return this.data.name || ''; },
    setName(name) { this.data.name = name; this.save(); },

    task(id) { return this.data.tasks[id] || { status: 'new' }; },
    updateTask(id, patch) {
      this.data.tasks[id] = Object.assign({}, this.task(id), patch);
      this.save();
    },

    test(id) { return this.data.tests[id] || null; },
    addTestResult(id, result) {
      const t = this.data.tests[id] || { attempts: 0, best: null, last: null };
      t.attempts += 1;
      t.last = result;
      if (!t.best || result.percent >= t.best.percent) t.best = result;
      this.data.tests[id] = t;
      this.save();
    },

    game(id) { return this.data.games[id] || null; },
    // better(new, old) — правда, если новый результат лучше
    setGameResult(id, value, better) {
      const old = this.data.games[id];
      const isBest = !old || better(value, old.value);
      if (isBest) {
        this.data.games[id] = { value, date: Date.now() };
        this.save();
      }
      return isBest;
    },

    typingBest() { return this.data.typing.best || null; },
    addTyping(result) {
      const best = this.data.typing.best;
      const isBest = !best || result.cpm > best.cpm;
      if (isBest) this.data.typing.best = result;
      this.data.typing.count = (this.data.typing.count || 0) + 1;
      this.save();
      return isBest;
    },

    resetResults() {
      this.data = { name: this.data.name, tasks: {}, tests: {}, games: {}, typing: {} };
      this.save();
    }
  };

  window.Store = Store;
})();
