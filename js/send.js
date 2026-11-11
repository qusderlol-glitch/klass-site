/*
 * Отправка анкеты на почту.
 * Сайт статический (без своего сервера), поэтому письма отправляет бесплатный сервис FormSubmit.
 * Если в config.js почта не указана — результат просто показывается на экране.
 */
(function () {
  function buildText(info) {
    const lines = Engine.describe().map((x) => x.question + '\n  → ' + (x.answer || '— нет ответа —'));
    return (
      'Ученик: ' + (info.name || '— не указано —') +
      (info.klass ? ' (' + info.klass + ')' : '') + '\n\n' +
      lines.join('\n\n') +
      '\n\nПожелания: ' + (info.comment || '— нет —')
    );
  }

  const Sender = {
    hasEmail() {
      return Boolean(window.CONFIG && window.CONFIG.EMAIL);
    },

    // info: { name, klass, comment, honey }
    async send(info) {
      const text = buildText(info);
      if (!this.hasEmail()) return { ok: true, mode: 'local', text };

      const body = {
        _subject: (window.CONFIG.SUBJECT || 'Анкета') + (info.name ? ' — ' + info.name : ''),
        _template: 'table',
        _captcha: 'false',
        _honey: info.honey || '',
        'Ученик': info.name || '— не указано —',
        'Класс': info.klass || '— не указан —'
      };
      Engine.describe().forEach((x) => { body[x.question] = x.answer || '— нет ответа —'; });
      body['Пожелания'] = info.comment || '— нет —';
      body['Ссылка на сайт с этими ответами'] = location.href.replace(/[^/]*$/, '') + 'site.html?' + Engine.encode();

      try {
        const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(window.CONFIG.EMAIL), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === 'false' || data.success === false) {
          return { ok: false, text, error: data.message || 'Почтовый сервис не принял анкету.' };
        }
        return { ok: true, mode: 'email', text };
      } catch (e) {
        return { ok: false, text, error: 'Нет связи с интернетом или почтовый сервис недоступен.' };
      }
    }
  };

  window.Sender = Sender;
})();
