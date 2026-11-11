/*
 * Движок «сайт, который пишет сам себя».
 *
 * Идея: у каждого вопроса есть свой маленький кусочек кода (apply) для каждого варианта ответа.
 * Когда человек выбирает ответ, движок с нуля прогоняет кусочки ВСЕХ выбранных ответов,
 * собирает из них готовый CSS + список возможностей и вписывает это в страницу.
 * Поэтому не нужно переделывать сайт под каждое сочетание ответов
 * (4 вопроса по 5 вариантов — это 625 сайтов, а кусочков кода всего 20).
 */
(function () {
  const Engine = {
    questions: [],
    answers: {},      // id вопроса -> id варианта (или массив id для multi)
    result: null,     // последний результат сборки
    listeners: [],

    register(question) {
      this.questions.push(question);
    },

    onChange(fn) {
      this.listeners.push(fn);
    },

    getQuestion(id) {
      return this.questions.find((q) => q.id === id);
    },

    // Выбранные id вариантов в виде массива (для single и multi одинаково)
    selectedIds(qid) {
      const a = this.answers[qid];
      if (a === undefined || a === null) return [];
      return Array.isArray(a) ? a : [a];
    },

    isAnswered(qid) {
      return this.selectedIds(qid).length > 0;
    },

    // Выбрать/снять вариант
    choose(qid, optionId) {
      const q = this.getQuestion(qid);
      if (q.type === 'multi') {
        const cur = new Set(this.selectedIds(qid));
        cur.has(optionId) ? cur.delete(optionId) : cur.add(optionId);
        // порядок как в описании вопроса — чтобы сборка была предсказуемой
        this.answers[qid] = q.options.map((o) => o.id).filter((id) => cur.has(id));
      } else {
        this.answers[qid] = optionId;
      }
      this.build();
    },

    reset() {
      this.answers = {};
      this.build();
    },

    // Сборка сайта из кусочков кода выбранных вариантов
    build() {
      const ctx = {
        vars: {},                 // CSS-переменные темы
        classes: new Set(),       // классы на корне сайта
        features: [],             // какие разделы есть на сайте
        css(obj) { Object.assign(this.vars, obj); },
        cls(name) { this.classes.add(name); },
        feature(name) { if (!this.features.includes(name)) this.features.push(name); }
      };

      for (const q of this.questions) {
        for (const id of this.selectedIds(q.id)) {
          const opt = q.options.find((o) => o.id === id);
          if (opt && typeof opt.apply === 'function') opt.apply(ctx);
        }
      }

      ctx.generatedCSS = this.toCSS(ctx);
      ctx.generatedConfig = this.toConfig(ctx);
      this.result = ctx;
      this.listeners.forEach((fn) => fn(ctx));
    },

    toCSS(ctx) {
      const keys = Object.keys(ctx.vars);
      if (!keys.length) return '/* пока нет ответов — тема по умолчанию */';
      const lines = keys.map((k) => '  ' + k + ': ' + ctx.vars[k] + ';');
      return '.site {\n' + lines.join('\n') + '\n}';
    },

    toConfig(ctx) {
      const cls = Array.from(ctx.classes);
      return (
        'сайт.классы   = ' + JSON.stringify(cls) + ';\n' +
        'сайт.разделы  = ' + JSON.stringify(ctx.features) + ';'
      );
    },

    // Человеческое описание ответов — для письма
    describe() {
      return this.questions.map((q) => {
        const labels = this.selectedIds(q.id).map((id) => q.options.find((o) => o.id === id).label);
        return { id: q.id, question: q.title, answer: labels.length ? labels.join(', ') : '— нет ответа —' };
      });
    }
  };

  window.Engine = Engine;
})();
