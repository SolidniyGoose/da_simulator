/* Чистые алгоритмы над строками: используются симуляциями, теорией и тренажёром. Индексация с 0. */
(function (App) {
  'use strict';
  const A = (App.algo = {});

  // Z-функция; Z[0] = n по договорённости
  A.z = function (s) {
    const n = s.length, z = new Array(n).fill(0);
    if (!n) return z;
    z[0] = n;
    for (let i = 1, l = 0, r = 0; i < n; i++) { // [l, r) — самый правый Z-блок
      if (i < r) z[i] = Math.min(r - i, z[i - l]);
      while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
      if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
  };

  // sp (strong = false) и sp′ (strong = true) прямо по определению
  A.sp = function (p, strong) {
    const m = p.length, sp = new Array(m).fill(0);
    for (let i = 0; i < m; i++)
      for (let k = i; k > 0; k--)
        if (p.slice(0, k) === p.slice(i - k + 1, i + 1) && (!strong || i === m - 1 || p[k] !== p[i + 1])) {
          sp[i] = k;
          break;
        }
    return sp;
  };

  // sp′(i, x): длина наибольшего собственного суффикса P[0..i], равного префиксу, за которым в P идёт x; −1 если нет
  A.spX = function (p, i, x) {
    for (let k = i; k >= 0; k--) if (p.slice(0, k) === p.slice(i - k + 1, i + 1) && p[k] === x) return k;
    return -1;
  };

  // Предподсчёт Бойера-Мура
  A.bm = function (p) {
    const m = p.length;
    const R = Object.create(null); // слабое ППС: последнее вхождение символа
    for (let i = 0; i < m; i++) R[p[i]] = i;
    const zr = A.z([...p].reverse().join(''));
    const N = new Array(m);
    for (let j = 0; j < m; j++) N[j] = zr[m - 1 - j]; // N[m−1] = m
    const Lp = new Array(m).fill(-1); // L′[i], i ≥ 1
    for (let j = 0; j < m - 1; j++) if (N[j] > 0) Lp[m - N[j]] = j;
    const L = new Array(m).fill(-1); // слабое L[i] = max(L[i−1], L′[i])
    for (let i = 1; i < m; i++) L[i] = Math.max(i > 1 ? L[i - 1] : -1, Lp[i]);
    const lp = new Array(m + 1).fill(0); // l′[i], i ≥ 1; l′[m] = 0
    for (let i = m - 1; i >= 1; i--) { const k = m - i; lp[i] = N[k - 1] === k ? k : lp[i + 1]; }
    return { R, N, Lp, L, lp, m };
  };

  // ППС при несовпадении P[i] с символом x текста
  A.badChar = function (pre, p, i, x, strong) {
    const pos = strong ? (i > 0 ? p.lastIndexOf(x, i - 1) : -1) : x in pre.R ? pre.R[x] : -1;
    return { pos, shift: pos < 0 ? i + 1 : i - pos };
  };

  // ПХС при несовпадении P[i] (совпал суффикс P[i+1..m−1])
  A.goodSuffix = function (pre, i, strong) {
    const m = pre.m;
    if (i === m - 1) return { shift: 0, kind: 'none' };
    const t = i + 1, Lv = strong ? pre.Lp[t] : pre.L[t];
    if (Lv >= 0) return { shift: m - 1 - Lv, kind: 'L', L: Lv, t };
    return { shift: m - pre.lp[t], kind: 'l', l: pre.lp[t], t };
  };

  A.afterMatch = (pre) => (pre.m > 1 ? pre.m - pre.lp[1] : 1);

  // Все вхождения (для проверки)
  A.occ = function (T, P) {
    const r = [];
    for (let s = 0; s + P.length <= T.length; s++) if (T.startsWith(P, s)) r.push(s);
    return r;
  };

  // Число сравнений Бойера-Мура с сильными правилами (для сравнения с Апостолико-Джанкарло)
  A.bmCount = function (T, P) {
    const n = T.length, m = P.length, pre = A.bm(P);
    let s = 0, cmp = 0;
    while (s <= n - m) {
      let i = m - 1;
      while (i >= 0) { cmp++; if (P[i] !== T[s + i]) break; i--; }
      if (i < 0) s += A.afterMatch(pre);
      else s += Math.max(1, A.badChar(pre, P, i, T[s + i], true).shift, A.goodSuffix(pre, i, true).shift);
    }
    return cmp;
  };
})(typeof window !== 'undefined' ? window.App : globalThis.App);
