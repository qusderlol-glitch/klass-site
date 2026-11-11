/* Стартовая страница: значки и адресаты из config.js */
(function () {
  document.querySelectorAll('[data-icon]').forEach((n) => { n.innerHTML = UI.icon(n.dataset.icon); });
  document.querySelectorAll('[data-icon-before]').forEach((n) => { n.insertAdjacentHTML('afterbegin', UI.icon(n.dataset.iconBefore)); });
  // текст пункта — в один <span>, чтобы значок и текст стояли рядом
  document.querySelectorAll('[data-ticks] li').forEach((li) => { li.innerHTML = UI.icon('check') + '<span>' + li.innerHTML + '</span>'; });

  const recips = (window.CONFIG && CONFIG.RECIPIENTS) || [];
  document.querySelectorAll('[data-recipient]').forEach((n) => {
    const r = recips.find((x) => x.id === n.dataset.recipient);
    if (!r) { n.textContent = ''; return; }
    n.textContent = r.email ? 'на почту' : r.suhtlus ? 'через Suhtlus (копировать текст)' : 'копировать текст';
  });
})();
