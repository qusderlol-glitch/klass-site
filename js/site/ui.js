/* Общие детали интерфейса: значки, кнопки, запись голоса, оценки. */
(function () {
  const ICONS = {
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    tests: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
    game: '<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="18" cy="14" r="1"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    chart: '<path d="M3 20h18"/><path d="M6 20v-6M11 20V8M16 20v-9M21 20V5" />',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    megaphone: '<path d="M3 10v4h4l6 4V6L7 10H3z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
    book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
    cards: '<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const UI = {
    esc,

    icon(name, cls) {
      return `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    },

    // HTML-строка → элемент
    h(html) {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      return t.content.firstElementChild;
    },

    fmtTime(sec) {
      sec = Math.max(0, Math.floor(sec));
      return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    },

    fmtDate(ts) {
      if (!ts) return '';
      return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    },

    today() {
      const s = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
      return s.charAt(0).toUpperCase() + s.slice(1);
    },

    plural(n, one, few, many) {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return one;
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
      return many;
    },

    grade(percent) {
      if (percent >= 85) return { mark: 5, word: 'Отлично' };
      if (percent >= 65) return { mark: 4, word: 'Хорошо' };
      if (percent >= 45) return { mark: 3, word: 'Удовлетворительно' };
      return { mark: 2, word: 'Нужно повторить' };
    },

    toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('is-on');
      clearTimeout(UI._toastT);
      UI._toastT = setTimeout(() => t.classList.remove('is-on'), 2600);
    },

    // ───── Запись голоса ─────
    // opts: { minSec, maxSec, onRecorded({ seconds, url }) }
    recorder(opts = {}) {
      const maxSec = opts.maxSec || 180;
      const el = UI.h(`
        <div class="rec">
          <div class="rec__row">
            <button class="btn" type="button" data-rec>${UI.icon('mic')}<span>Записать</span></button>
            <span class="rec__time" data-time>00:00</span>
            <span class="rec__meter" aria-hidden="true"><span data-level></span></span>
          </div>
          <p class="rec__state muted" data-state>Нажми «Записать» и говори в микрофон.</p>
          <audio controls data-audio hidden></audio>
          <p class="alert alert--warn" data-err hidden></p>
        </div>`);
      const btn = el.querySelector('[data-rec]');
      const label = btn.querySelector('span');
      const time = el.querySelector('[data-time]');
      const level = el.querySelector('[data-level]');
      const state = el.querySelector('[data-state]');
      const audio = el.querySelector('[data-audio]');
      const err = el.querySelector('[data-err]');

      let rec = null, stream = null, chunks = [], tick = null, raf = null, started = 0, actx = null;
      let lastUrl = null;

      const showErr = (m) => { err.textContent = m; err.hidden = !m; };

      function cleanupStream() {
        clearInterval(tick);
        cancelAnimationFrame(raf);
        level.style.width = '0';
        if (stream) stream.getTracks().forEach((t) => t.stop());
        stream = null;
        if (actx) { actx.close().catch(() => {}); actx = null; }
      }

      function meter() {
        try {
          actx = new (window.AudioContext || window.webkitAudioContext)();
          const src = actx.createMediaStreamSource(stream);
          const an = actx.createAnalyser();
          an.fftSize = 512;
          src.connect(an);
          const buf = new Uint8Array(an.fftSize);
          const loop = () => {
            an.getByteTimeDomainData(buf);
            let peak = 0;
            for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
            level.style.width = Math.min(100, (peak / 64) * 100) + '%';
            raf = requestAnimationFrame(loop);
          };
          loop();
        } catch (e) { /* индикатор громкости не обязателен */ }
      }

      async function start() {
        showErr('');
        if (!navigator.mediaDevices || !window.MediaRecorder) {
          showErr('Этот браузер не умеет записывать звук. Открой сайт в Chrome, Edge или Яндекс Браузере.');
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          showErr('Микрофон не включился. Разреши доступ к микрофону (значок слева от адреса сайта) и проверь, что он подключён.');
          return;
        }
        chunks = [];
        rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = () => {
          const seconds = Math.round((Date.now() - started) / 1000);
          cleanupStream();
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          if (lastUrl) URL.revokeObjectURL(lastUrl);
          lastUrl = URL.createObjectURL(blob);
          audio.src = lastUrl;
          audio.hidden = false;
          el.classList.remove('is-recording');
          label.textContent = 'Записать заново';
          btn.querySelector('svg').outerHTML = UI.icon('mic');
          const short = opts.minSec && seconds < opts.minSec;
          state.textContent = short
            ? 'Запись слишком короткая: нужно хотя бы ' + opts.minSec + ' сек. Попробуй ещё раз.'
            : 'Готово! Послушай запись. Если не нравится — запиши заново.';
          if (opts.onRecorded) opts.onRecorded({ seconds, url: lastUrl, short });
        };
        rec.start();
        started = Date.now();
        el.classList.add('is-recording');
        label.textContent = 'Стоп';
        btn.querySelector('svg').outerHTML = UI.icon('stop');
        state.textContent = 'Идёт запись… Говори чётко. Нажми «Стоп», когда закончишь.';
        audio.hidden = true;
        time.textContent = '00:00';
        tick = setInterval(() => {
          const s = (Date.now() - started) / 1000;
          time.textContent = UI.fmtTime(s);
          if (s >= maxSec) stop();
        }, 250);
        meter();
      }

      function stop() { if (rec && rec.state === 'recording') rec.stop(); }

      btn.addEventListener('click', () => (rec && rec.state === 'recording' ? stop() : start()));

      return {
        el,
        destroy() {
          if (rec && rec.state === 'recording') { rec.onstop = null; rec.stop(); }
          cleanupStream();
        }
      };
    }
  };

  window.UI = UI;
})();
