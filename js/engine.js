/*
 * Движок «сайт, который пишет сам себя».
 *
 * У каждого вопроса анкеты есть свой маленький кусочек кода (apply) для каждого варианта ответа.
 * Когда ответы меняются, движок с нуля прогоняет кусочки всех выбранных вариантов,
 * собирает из них готовый CSS + список разделов и отдаёт сайту.
 * Поэтому не нужно делать отдельный сайт на каждое сочетание ответов:
 * 6 вопросов по 2–5 вариантов — это сотни сочетаний, а кусочков кода всего около 20.
 *
 * Этот файл общий: его используют и анкета (index.html), и сайт класса (site.html).
 */
(function () {
  const STORAGE_KEY = 'klass-config';

  const Engine = {
    questions: [],
    answers: {},          // id вопроса -> id варианта (или массив id для multi)
    result: null,         // последний результат сборки
    fillDefaults: false,  // сайт подставляет значения по умолчанию для пропущенных вопросов
    listeners: [],

    register(question) { this.questions.push(question); },
    onChange(fn) { this.listeners.push(fn); },
    getQuestion(id) { return this.questions.find((q) => q.id === id); },

    selectedIds(qid) {
      const a = this.answers[qid];
      if (a === undefined || a === null) return [];
      return Array.isArray(a) ? a : [a];
    },

    isAnswered(qid) { return this.selectedIds(qid).length > 0; },

    // Ответы, по которым реально собирается сайт (с подстановкой значений по умолчанию)
    effectiveIds(q) {
      const ids = this.selectedIds(q.id);
      if (ids.length || !this.fillDefaults || q.default === undefined) return ids;
      return Array.isArray(q.default) ? q.default : [q.default];
    },

    choose(qid, optionId) {
      const q = this.getQuestion(qid);
      if (q.type === 'multi') {
        const cur = new Set(this.selectedIds(qid));
        cur.has(optionId) ? cur.delete(optionId) : cur.add(optionId);
        this.answers[qid] = q.options.map((o) => o.id).filter((id) => cur.has(id));
      } else {
        this.answers[qid] = optionId;
      }
      this.build();
    },

    setAll(answers) {
      this.answers = this.clean(answers || {});
      this.build();
    },

    reset() {
      this.answers = {};
      this.build();
    },

    // Оставляем только существующие вопросы и варианты
    clean(answers) {
      const out = {};
      for (const q of this.questions) {
        const raw = answers[q.id];
        if (raw === undefined || raw === null) continue;
        const ids = (Array.isArray(raw) ? raw : [raw]).filter((id) => q.options.some((o) => o.id === id));
        if (q.type === 'multi') out[q.id] = ids;
        else if (ids.length) out[q.id] = ids[0];
      }
      return out;
    },

    // ───── Сборка сайта из кусочков кода ─────
    build() {
      const ctx = {
        vars: {},
        classes: new Set(),
        features: [],
        css(obj) { Object.assign(this.vars, obj); },
        cls(name) { this.classes.add(name); },
        feature(name) { if (!this.features.includes(name)) this.features.push(name); },
        has(name) { return this.features.includes(name); }
      };

      for (const q of this.questions) {
        for (const id of this.effectiveIds(q)) {
          const opt = q.options.find((o) => o.id === id);
          if (opt && typeof opt.apply === 'function') opt.apply(ctx);
        }
      }

      ctx.generatedCSS = this.toCSS(ctx);
      ctx.generatedConfig = this.toConfig(ctx);
      this.result = ctx;
      this.listeners.forEach((fn) => fn(ctx));
      return ctx;
    },

    toCSS(ctx) {
      const keys = Object.keys(ctx.vars);
      if (!keys.length) return '/* пока нет ответов — оформление по умолчанию */';
      return '.site {\n' + keys.map((k) => '  ' + k + ': ' + ctx.vars[k] + ';').join('\n') + '\n}';
    },

    toConfig(ctx) {
      return (
        'сайт.классы  = ' + JSON.stringify(Array.from(ctx.classes)) + ';\n' +
        'сайт.разделы = ' + JSON.stringify(ctx.features) + ';'
      );
    },

    // ───── Сохранение ответов: адрес страницы и память браузера ─────
    encode() {
      const p = new URLSearchParams();
      for (const q of this.questions) {
        const ids = this.selectedIds(q.id);
        if (ids.length) p.set(q.id, ids.join(','));
      }
      return p.toString();
    },

    decode(search) {
      const p = new URLSearchParams(search);
      const out = {};
      let found = false;
      for (const q of this.questions) {
        if (!p.has(q.id)) continue;
        found = true;
        const ids = p.get(q.id).split(',').filter(Boolean);
        out[q.id] = q.type === 'multi' ? ids : ids[0];
      }
      return found ? this.clean(out) : null;
    },

    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.answers)); } catch (e) { /* память недоступна */ }
    },

    loadSaved() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? this.clean(JSON.parse(raw)) : null;
      } catch (e) { return null; }
    },

    forget() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ничего */ }
    },

    // Человеческое описание ответов — для письма и проверки
    describe() {
      return this.questions.map((q) => {
        const labels = this.selectedIds(q.id).map((id) => q.options.find((o) => o.id === id).label);
        return { id: q.id, question: q.title, answer: labels.length ? labels.join(', ') : '' };
      });
    }
  };

  window.Engine = Engine;
})();
