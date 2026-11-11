/*
 * Keel / Язык. Vaikimisi eesti keel, saab vahetada vene keele vastu.
 * L('eesti tekst', 'русский текст') — tagastab teksti valitud keeles.
 */
(function () {
  const KEY = 'klass-lang';
  let lang = 'et';
  try { if (localStorage.getItem(KEY) === 'ru') lang = 'ru'; } catch (e) { /* vaikimisi eesti */ }
  const listeners = [];

  window.LANG = {
    get: () => lang,
    set(l) {
      lang = l === 'ru' ? 'ru' : 'et';
      try { localStorage.setItem(KEY, lang); } catch (e) { /* ei saa salvestada */ }
      document.documentElement.lang = lang;
      listeners.forEach((f) => f(lang));
    },
    on(f) { listeners.push(f); },
    locale: () => (lang === 'ru' ? 'ru-RU' : 'et-EE'),

    // Keele lüliti HTML; nupud vahetavad keelt ise
    toggle() {
      return `<div class="lang" role="group" aria-label="Keel / Язык">
        <button type="button" data-lang="et" class="${lang === 'et' ? 'is-on' : ''}" aria-pressed="${lang === 'et'}">ET</button>
        <button type="button" data-lang="ru" class="${lang === 'ru' ? 'is-on' : ''}" aria-pressed="${lang === 'ru'}">RU</button>
      </div>`;
    }
  };

  window.L = (et, ru) => (lang === 'ru' ? ru : et);
  document.documentElement.lang = lang;

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (b) LANG.set(b.dataset.lang);
  });
})();
