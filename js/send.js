/*
 * Отправка результатов на почту.
 * Сайт статический (без своего сервера), поэтому письма отправляет бесплатный сервис FormSubmit.
 * Если в config.js почта не указана — результат просто показывается на экране.
 */
(function () {
  function buildText(name, comment) {
    const lines = Engine.describe().map((x) => x.question + '\n  → ' + x.answer);
    return (
      lines.join('\n\n') +
      '\n\nИмя: ' + (name || '— не указано —') +
      '\nПожелания: ' + (comment || '— нет —')
    );
  }

  const Sender = {
    hasEmail() {
      return Boolean(window.CONFIG && window.CONFIG.EMAIL);
    },

    async send(name, comment, honey) {
      const text = buildText(name, comment);

      if (!this.hasEmail()) {
        return { ok: true, mode: 'local', text };
      }

      const body = {
        _subject: window.CONFIG.SUBJECT || 'Опрос',
        _template: 'table',
        _captcha: 'false',
        _honey: honey || ''
      };
      Engine.describe().forEach((x) => { body[x.question] = x.answer; });
      body['Имя'] = name || '— не указано —';
      body['Пожелания'] = comment || '— нет —';
      body['Собранный код (тема)'] = Engine.result ? Engine.result.generatedCSS : '';
      body['Разделы сайта'] = Engine.result ? Engine.result.features.join(', ') : '';

      try {
        const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(window.CONFIG.EMAIL), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === 'false' || data.success === false) {
          return { ok: false, text, error: data.message || 'Сервер почты не принял ответ.' };
        }
        return { ok: true, mode: 'email', text };
      } catch (e) {
        return { ok: false, text, error: 'Нет связи с интернетом или сервис почты недоступен.' };
      }
    }
  };

  window.Sender = Sender;
})();
