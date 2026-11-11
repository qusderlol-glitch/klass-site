/*
 * Kirjavigade parandaja / Корректор опечаток.
 * Sõna jagatakse 2- ja 3-täheliseks tükiks (n-grammid) ja võrreldakse, kui palju tükke kattub.
 * Lisaks loetakse, mitu tähte tuleb muuta (Levenshtein). Kui vastus on õigele väga sarnane,
 * loetakse see õigeks — näiteks «klaviatuuur» = «klaviatuur», «процесор» = «процессор».
 */
(function () {
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[.,!?;:"«»()]/g, ' ').replace(/\s+/g, ' ').trim();

  function grams(s, n) {
    const t = ' ' + s + ' ';
    const out = [];
    for (let i = 0; i <= t.length - n; i++) out.push(t.slice(i, i + n));
    return out;
  }

  // Dice: kui suur osa tükkidest kattub (0…1)
  function dice(a, b, n) {
    const A = grams(a, n), B = grams(b, n);
    if (!A.length || !B.length) return 0;
    const pool = new Map();
    B.forEach((g) => pool.set(g, (pool.get(g) || 0) + 1));
    let hit = 0;
    A.forEach((g) => { const c = pool.get(g); if (c) { hit++; pool.set(g, c - 1); } });
    return (2 * hit) / (A.length + B.length);
  }

  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  const Fuzzy = {
    norm,

    // Sarnasus 0…1
    similarity(a, b) {
      a = norm(a); b = norm(b);
      if (a === b) return 1;
      if (!a || !b) return 0;
      const levSim = 1 - lev(a, b) / Math.max(a.length, b.length);
      const ngram = (dice(a, b, 2) + dice(a, b, 3)) / 2;
      return Math.max(levSim, ngram);
    },

    /*
     * Lühivastuse kontroll: { ok, typo, best }
     * Numbrid ja väga lühikesed vastused (kuni 3 tähte) peavad olema täpsed.
     */
    matchShort(answer, accepted, allowTypos) {
      const a = norm(answer).replace(/\s+/g, '');
      if (!a) return { ok: false, typo: false };
      let best = 0, bestText = '';
      for (const x of accepted || []) {
        const b = norm(x).replace(/\s+/g, '');
        if (a === b) return { ok: true, typo: false, best: x };
        if (!allowTypos || /^\d+$/.test(b) || b.length <= 3) continue;
        const s = Fuzzy.similarity(a, b);
        if (s > best) { best = s; bestText = x; }
      }
      const limit = 0.8;
      return best >= limit ? { ok: true, typo: true, best: bestText } : { ok: false, typo: false };
    },

    /*
     * Ümberkirjutamine (kiri): kui palju õpilase tekst kattub originaaliga, 0…1.
     * Sõnad võrreldakse ükshaaval, väike trükiviga sõnas loetakse pooleks veaks.
     */
    copyScore(source, answer) {
      const S = norm(source).split(' ').filter(Boolean);
      const A = norm(answer).split(' ').filter(Boolean);
      if (!S.length) return 1;
      if (!A.length) return 0;
      const cost = (x, y) => (x === y ? 0 : Fuzzy.similarity(x, y) >= 0.75 ? 0.5 : 1);
      let prev = Array.from({ length: A.length + 1 }, (_, j) => j);
      for (let i = 1; i <= S.length; i++) {
        const cur = [i];
        for (let j = 1; j <= A.length; j++) {
          cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost(S[i - 1], A[j - 1]));
        }
        prev = cur;
      }
      return Math.max(0, 1 - prev[A.length] / Math.max(S.length, A.length));
    }
  };

  window.Fuzzy = Fuzzy;
})();
