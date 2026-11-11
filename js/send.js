/*
 * Отправка писем: анкеты и результатов ученика.
 * Сайт статический (без своего сервера), поэтому письма отправляет бесплатный сервис FormSubmit.
 * Кому отправлять — список RECIPIENTS в config.js.
 * Если у адресата нет почты (например, учительница пишет в Suhtlus), ученик получает
 * готовый текст и копирует его сам.
 */
(function () {
  const cfg = () => window.CONFIG || {};
  const tr = (et, ru) => (window.L ? window.L(et, ru) : ru);   // eesti või vene keel

  const Sender = {
    recipients() { return cfg().RECIPIENTS || []; },
    recipient(id) { return this.recipients().find((r) => r.id === id); },

    // Текст анкеты: то, что нужно для сайта, в понятном виде
    surveyText(info) {
      const lines = Engine.describe().map((x) => x.question + '\n  → ' + (x.answer || '— нет ответа —'));
      return (
        'Анкета: сайт для компьютерного класса\n' +
        'Ученик: ' + (info.name || '— не указано —') + (info.klass ? ', класс ' + info.klass : '') + '\n\n' +
        lines.join('\n\n') +
        '\n\nСвоя идея для сайта: ' + (info.comment || '— нет —') +
        '\n\nСайт с этими ответами: ' + this.siteLink()
      );
    },

    surveyFields(info) {
      const f = {
        'Ученик': info.name || '— не указано —',
        'Класс': info.klass || '— не указан —'
      };
      Engine.describe().forEach((x) => { f[x.question] = x.answer || '— нет ответа —'; });
      f['Своя идея для сайта'] = info.comment || '— нет —';
      f['Сайт с этими ответами'] = this.siteLink();
      return f;
    },

    siteLink() {
      return new URL('site.html?' + Engine.encode(), location.href).href;
    },

    async post(email, subject, fields, honey) {
      // Красивое письмо: шаблон «box» (карточки) и значки у главных полей
      const ICONS = [
        [/^(Töö|Работа)$/, '📝'], [/^(Õpilane|Ученик)$/, '👤'], [/^(Klass|Класс)$/, '🏫'],
        [/e-post|e-mail/i, '✉️'], [/^(Esitatud|Сдано)$/, '🕒'], [/^(Punktid|Баллы)/, '📊'],
        [/^(Hinne|Оценка)/, '⭐'], [/^(Õpetaja hinnata|Проверить учителю)/, '✎'],
        [/^(Lahkus testist|Уходил из теста)/, '🚪'], [/^\d+(\.\d+)?\. /, '❓']
      ];
      const pretty = {};
      Object.keys(fields).forEach((k) => {
        const hit = ICONS.find(([re]) => re.test(k));
        pretty[hit ? hit[1] + ' ' + k : k] = fields[k];
      });
      const body = Object.assign({
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        _honey: honey || ''
      }, pretty);
      // почтовый сервис иногда отвечает 20–30 секунд — ждём до минуты
      const ctrl = window.AbortController ? new AbortController() : null;
      const limit = setTimeout(() => ctrl && ctrl.abort(), 60000);
      try {
        const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
          signal: ctrl ? ctrl.signal : undefined
        });
        clearTimeout(limit);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === 'false' || data.success === false) {
          const msg = String(data.message || '');
          if (/activat/i.test(msg)) {
            return { ok: false, error: tr('E-post pole veel ühendatud: aadressi omanik sai kirja nupuga «Activate».', 'Почта ещё не подключена: владельцу адреса пришло письмо с кнопкой «Activate».') };
          }
          return { ok: false, error: msg || tr('E-posti teenus ei võtnud kirja vastu.', 'Почтовый сервис не принял письмо.') };
        }
        return { ok: true };
      } catch (e) {
        clearTimeout(limit);
        return { ok: false, error: e && e.name === 'AbortError'
          ? tr('E-posti teenus ei vastanud liiga kaua.', 'Почтовый сервис слишком долго не отвечал.')
          : tr('Interneti-ühendus puudub või e-posti teenus ei tööta.', 'Нет связи с интернетом или почтовый сервис недоступен.') };
      }
    },

    /*
     * Доставить письмо выбранным адресатам.
     * Возвращает список: { recipient, mode: 'email' | 'copy', ok, error }
     */
    async deliver(ids, { subject, fields, text, honey }) {
      const out = [];
      for (const id of ids) {
        const r = this.recipient(id);
        if (!r) continue;
        if (!r.email) { out.push({ recipient: r, mode: 'copy', ok: true, text }); continue; }
        const res = await this.post(r.email, subject, fields, honey);
        out.push(Object.assign({ recipient: r, mode: 'email', text }, res));
      }
      return out;
    }
  };

  window.Sender = Sender;
})();
