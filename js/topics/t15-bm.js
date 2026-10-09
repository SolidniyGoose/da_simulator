/* Билет 15. Алгоритм Бойера-Мура: правило плохого символа, правило хорошего суффикса. Индексация с 0. */
(function (App) {
  'use strict';
  const A = App.algo, esc = App.esc, { c: C, s: SS } = App.fmt;
  const dash = (v) => (v == null ? null : v < 0 ? '−' : v);

  /* ---------- режим 1: предподсчёт ---------- */
  function runPre({ P }) {
    const m = P.length, F = [];
    const R = {}, Pr = [...P].reverse().join(''), zr = A.z(Pr);
    const N = new Array(m).fill(null), Lp = new Array(m).fill(null), lp = new Array(m + 1).fill(null);
    const push = (line, phase, msg, o = {}) =>
      F.push({ line, phase, msg, R: { ...R }, N: N.slice(), Lp: Lp.slice(), lp: lp.slice(), Pr, zr, ...o });

    push(0, 'ППС', 'Слабое правило плохого символа: идём по P слева направо и для каждого символа x запоминаем его последнее (самое правое) вхождение R(x).', { big: true });
    for (let i = 0; i < m; i++) {
      const had = P[i] in R;
      R[P[i]] = i;
      push(0, 'ППС', `P[${i}] = ${C(P[i])} → R(${C(P[i])}) = ${i}${had ? ' — перезаписываем, нужно самое правое вхождение' : ''}.`, { cur: i, vars: [['i', i]] });
    }
    const lists = {};
    for (let i = m - 1; i >= 0; i--) (lists[P[i]] = lists[P[i]] || []).push(i);
    push(1, 'ППС', 'Для сильного ППС храним все позиции каждого символа (проходя справа налево, самые правые оказываются в начале списка). При несовпадении в позиции i ищем в списке символа первую позицию меньше i.', { lists, big: true });

    push(2, 'N', `ПХС считается через массив N: N[j] — длина наибольшего суффикса P[0..j], который одновременно является суффиксом всего P. Переворачиваем образец: Pʳ = ${SS(Pr)}, и строим Z(Pʳ) — она ищет совпадения с префиксом Pʳ, то есть с суффиксом P.`, { rev: true, big: true });
    for (let j = 0; j < m; j++) {
      N[j] = j === m - 1 ? m : zr[m - 1 - j];
      const k = N[j];
      push(3, 'N', j === m - 1
        ? `N[${m - 1}] = m = ${m}: весь P — суффикс самого себя.`
        : `N[${j}] = Zʳ[${m - 1 - j}] = ${k}. ${k ? `Суффикс P[0..${j}] длины ${k} = ${SS(P.slice(j - k + 1, j + 1))} совпадает с суффиксом P.` : `Уже последний символ P[${j}] = ${C(P[j])} не равен P[m − 1] = ${C(P[m - 1])}.`}`,
      { rev: true, zrI: m - 1 - j, setN: j, A1: k ? [j - k + 1, j] : null, B1: k ? [m - k, m - 1] : null, vars: [['j', j], ['N[j]', k]] });
    }

    for (let i = 1; i < m; i++) Lp[i] = -1;
    push(4, 'L′', 'L′[i] (i ≥ 1) — наибольший индекс j &lt; m − 1, такой что P[i..m−1] — суффикс P[0..j], а символ перед этой копией ≠ P[i − 1]. Сначала все L′ не определены (−).', { big: true });
    for (let j = 0; j < m - 1; j++) {
      const k = N[j];
      if (!k) { push([5, 6], 'L′', `j = ${j}: N[${j}] = 0 — пропускаем.`, { curN: j, vars: [['j', j], ['N[j]', 0]] }); continue; }
      const i = m - k, old = Lp[i];
      Lp[i] = j;
      const before = j - k >= 0
        ? `Символы перед ними различны: P[${j - k}] = ${C(P[j - k])} ≠ P[${i - 1}] = ${C(P[i - 1])} — иначе N[${j}] было бы больше.`
        : 'Копия начинается с самого начала P, слева символа нет — условие выполнено.';
      push([5, 6, 7, 8], 'L′', `j = ${j}: N[${j}] = ${k}, i = m − N[j] = ${i}. Суффикс t = P[${i}..${m - 1}] = ${SS(P.slice(i))} встречается ещё раз и заканчивается в j = ${j}. ${before} Значит L′[${i}] = ${j}${old >= 0 ? ` (было ${old}: идём слева направо, остаётся наибольший j)` : ''}.`,
        { curN: j, setL: i, A1: [j - k + 1, j], B1: [i, m - 1], badc: j - k >= 0 ? [j - k, i - 1] : null, vars: [['j', j], ['N[j]', k], ['i', i]], big: true });
    }

    lp[m] = 0;
    push(9, 'l′', 'l′[i] — длина наибольшего суффикса P[i..m−1], который является префиксом P. Префикс длины k является суффиксом ⇔ N[k − 1] = k. Считаем справа налево, l′[m] = 0.', { big: true });
    for (let i = m - 1; i >= 1; i--) {
      const k = m - i;
      if (N[k - 1] === k) {
        lp[i] = k;
        push([10, 11], 'l′', `i = ${i}, k = m − i = ${k}: N[${k - 1}] = ${k} — префикс ${SS(P.slice(0, k))} является суффиксом P. l′[${i}] = ${k}.`,
          { setl: i, A1: [m - k, m - 1], B1: [0, k - 1], curN: k - 1, vars: [['i', i], ['k', k]] });
      } else {
        lp[i] = lp[i + 1];
        push([10, 11], 'l′', `i = ${i}, k = ${k}: N[${k - 1}] = ${N[k - 1]} ≠ ${k} — префикс длины ${k} не суффикс. l′[${i}] = l′[${i + 1}] = ${lp[i]}.`,
          { setl: i, curN: k - 1, vars: [['i', i], ['k', k]] });
      }
    }
    const pre = A.bm(P);
    const gsShift = [...P].map((_, i) => (i === m - 1 ? '−' : A.goodSuffix(pre, i, true).shift));
    push([], 'итог', `Готово, всё за O(m). Строка «ПХС» внизу — сдвиг по сильному ПХС при несовпадении в P[i]: m − 1 − L′[i+1], если L′[i+1] определено, иначе m − l′[i+1]. После найденного вхождения сдвиг m − l′[1] = ${A.afterMatch(pre)}.`,
      { lists, gsShift, done: true, big: true });
    return F;
  }

  function renderPre(f, { P }) {
    const m = P.length;
    const inr = (r, k) => r && k >= r[0] && k <= r[1];
    const rows = [
      { type: 'idx', n: m },
      {
        type: 'chars', label: 'P', chars: P,
        cell: (k) => {
          if (f.badc && f.badc.includes(k)) return 'bad';
          const c = [];
          if (inr(f.A1, k)) c.push('blk');
          if (inr(f.B1, k)) c.push('pre');
          if (k === f.cur) c.push('new');
          return c.join(' ');
        },
      },
      (f.A1 || f.B1) && { type: 'spans', items: [] },
    ];
    if (f.rev) {
      rows.push({ type: 'chars', label: 'Pʳ', chars: f.Pr, cell: (t) => (t === f.zrI ? 'src' : '') });
      rows.push({ type: 'nums', label: 'Zʳ', values: f.zr.map((z, t) => (t === 0 ? '–' : z)), cell: (t) => (t === f.zrI ? 'src' : '') });
    }
    rows.push({ type: 'nums', label: 'N', values: f.N, cell: (k) => (k === f.setN ? 'new' : k === f.curN ? 'src' : '') });
    rows.push({ type: 'nums', label: 'L′', values: f.Lp.map((v, k) => (k === 0 ? undefined : dash(v))), cell: (k) => (k === f.setL ? 'new' : '') });
    rows.push({ type: 'nums', label: 'l′', values: f.lp.slice(0, m).map((v, k) => (k === 0 ? undefined : v)), cell: (k) => (k === f.setl ? 'new' : '') });
    if (f.gsShift) rows.push({ type: 'nums', label: 'ПХС', values: f.gsShift });
    let h = App.strip(m, rows);
    const keys = Object.keys(f.R);
    h += `<div class="chips"><b>Слабое ППС R(x):</b>${keys.length ? keys.map((x) => `<span class="${f.cur != null && P[f.cur] === x ? 'on' : ''}">${esc(x)} → ${f.R[x]}</span>`).join('') : '<span>пока пусто</span>'}</div>`;
    if (f.lists) h += `<div class="chips"><b>Сильное ППС, позиции:</b>${Object.keys(f.lists).map((x) => `<span>${esc(x)}: ${f.lists[x].join(', ')}</span>`).join('')}</div>`;
    return h;
  }

  /* ---------- режим 2: поиск ---------- */
  function runSearch({ T, P, bc, gs }) {
    const n = T.length, m = P.length, pre = A.bm(P), F = [], occ = [];
    let s = 0, cmp = 0, al = 0;
    const V = (i) => [['s', s], ['h = s+m−1', s + m - 1], ['i', i ?? '—'], ['сравнений', cmp], ['прикладываний', al]];
    const push = (line, msg, o = {}) => F.push({ line, msg, s, occ: occ.slice(), vars: V(o.cur), pre, ...o });
    const rule = (k) => (k === 'strong' ? 'сильное' : k === 'weak' ? 'слабое' : 'выкл.');

    push([0, 1], `Предподсчёт за O(m): R для ППС, N → L′ и l′ для ПХС (см. режим «Предподсчёт»). ППС: ${rule(bc)}, ПХС: ${rule(gs)}. Образец прикладываем слева направо, а сравниваем справа налево.`, { big: true });
    while (s <= n - m) {
      al++;
      push([2, 3], `Прикладываем P в позицию s = ${s} (правый край h = ${s + m - 1}). Сравнение начинаем с последнего символа P[${m - 1}].`, { ok: [], big: true });
      let i = m - 1;
      const ok = [];
      while (i >= 0) {
        cmp++;
        if (P[i] === T[s + i]) {
          ok.push(i);
          push(4, `P[${i}] = ${C(P[i])} = T[${s + i}] — совпали, идём влево.`, { ok: ok.slice(), cur: i });
          i--;
        } else {
          push(4, `P[${i}] = ${C(P[i])} ≠ T[${s + i}] = ${C(T[s + i])} — несовпадение. Плохой символ — ${C(T[s + i])}${ok.length ? `, хороший суффикс t = ${SS(P.slice(i + 1))}` : ''}.`, { ok: ok.slice(), cur: i, bad: i });
          break;
        }
      }
      if (i < 0) {
        occ.push(s);
        const sh = A.afterMatch(pre), l1 = m > 1 ? pre.lp[1] : 0;
        push([5, 6], `Совпали все символы — вхождение в позиции ${s}. Сдвиг = m − l′[1] = ${m} − ${l1} = ${sh}: наибольший собственный суффикс P, являющийся префиксом, — ${SS(P.slice(0, l1))}, совмещаем его с концом найденного вхождения.`,
          { ok: ok.slice(), ghost: s + sh, gh: l1 ? [0, l1 - 1] : null, gcls: 'blk', tab: { row: 'lp', idx: 1 }, big: true });
        s += sh;
        continue;
      }
      const x = T[s + i], t = P.slice(i + 1);
      let bcs = 0, gss = 0;
      if (bc !== 'off') {
        const r = A.badChar(pre, P, i, x, bc === 'strong');
        bcs = r.shift;
        let msg;
        if (bc === 'weak') {
          if (r.pos < 0) msg = `Слабое ППС: символа ${C(x)} в P нет вообще → сдвигаем образец целиком за него: ППС = i + 1 = ${bcs}.`;
          else if (r.pos > i) msg = `Слабое ППС: R(${C(x)}) = ${r.pos} — правее позиции несовпадения ${i}. Правило даёт i − R(x) = ${bcs} ≤ 0, то есть сдвиг влево; его отсекает max(1, …).`;
          else msg = `Слабое ППС: самое правое вхождение ${C(x)} в P — R(${C(x)}) = ${r.pos}. Ставим его под T[${s + i}]: ППС = i − R(x) = ${i} − ${r.pos} = ${bcs}.`;
        } else {
          msg = r.pos < 0
            ? `Сильное ППС: левее позиции ${i} символа ${C(x)} в P нет → сдвигаем образец за него: ППС = i + 1 = ${bcs}.`
            : `Сильное ППС: самое правое вхождение ${C(x)} левее позиции ${i} — позиция ${r.pos}. Ставим его под T[${s + i}]: ППС = ${i} − ${r.pos} = ${bcs}.`;
        }
        push([7, 8], msg, { ok, cur: i, bad: i, pmark: r.pos >= 0 ? [r.pos, r.pos] : null, ghost: bcs > 0 ? s + bcs : null, gh: r.pos >= 0 && bcs > 0 ? [r.pos, r.pos] : null, gcls: 'src' });
      }
      if (gs !== 'off') {
        const g = A.goodSuffix(pre, i, gs === 'strong');
        gss = g.shift;
        const nmL = gs === 'strong' ? 'L′' : 'L';
        let msg, o = {};
        if (g.kind === 'none') msg = 'ПХС: несовпадение на первом же сравнении, хорошего суффикса нет — правило ничего не даёт (0).';
        else if (g.kind === 'L') {
          const a = g.L - t.length + 1;
          msg = `ПХС: совпал t = ${SS(t)}. ${nmL}[${i + 1}] = ${g.L}: ещё одна копия t в P заканчивается в позиции ${g.L}` +
            (gs === 'strong' ? `, и слева от неё ${a > 0 ? `символ P[${a - 1}] = ${C(P[a - 1])} ≠ P[${i}] = ${C(P[i])}` : 'символа нет'} — значит, после сдвига несовпадение не повторится` : '') +
            `. Ставим эту копию под совпавший t: ПХС = m − 1 − ${nmL}[${i + 1}] = ${m - 1} − ${g.L} = ${gss}.`;
          o = { pmark: [a, g.L], gh: [a, g.L], tab: { row: gs === 'strong' ? 'Lp' : 'L', idx: i + 1 } };
        } else {
          msg = `ПХС: совпал t = ${SS(t)}, но ${gs === 'strong' ? 'подходящей копии (с другим символом слева)' : 'другой копии'} в P нет: ${nmL}[${i + 1}] = −. Ищем наибольший суффикс t, который является префиксом P: l′[${i + 1}] = ${g.l}${g.l ? ` (${SS(P.slice(0, g.l))})` : ''}. ПХС = m − l′[${i + 1}] = ${gss}.`;
          o = { pmark: g.l ? [0, g.l - 1] : null, gh: g.l ? [0, g.l - 1] : null, tab: { row: 'lp', idx: i + 1 } };
        }
        push(9, msg, { ok, cur: i, bad: i, tspan: t.length ? [s + i + 1, s + m - 1] : null, ghost: gss > 0 ? s + gss : null, gcls: 'src', ...o });
      }
      const sh = Math.max(1, bcs, gss);
      push([10, 11], `Сдвиг = max(1, ППС, ПХС) = max(1, ${bcs}, ${gss}) = ${sh}. Оба правила не пропускают вхождений, поэтому берём больший сдвиг.`, { ok, cur: i, bad: i, ghost: s + sh, big: true });
      s += sh;
    }
    let naive = 0;
    for (let q = 0; q <= n - m; q++) for (let k = 0; k < m; k++) { naive++; if (P[k] !== T[q + k]) break; }
    push([], `Готово. Вхождения: ${occ.length ? occ.join(', ') : 'нет'}. Сравнений: ${cmp} за ${al} прикладываний. Простейший алгоритм на этих данных сделал бы ${naive} сравнений.`, { done: true, big: true });
    return F;
  }

  function renderSearch(f, { T, P }) {
    const n = T.length, m = P.length, s = f.s;
    const cols = Math.max(n, f.done ? 0 : s + m, f.ghost != null ? f.ghost + m : 0);
    const ok = f.ok || [];
    const inr = (r, k) => r && k >= r[0] && k <= r[1];
    const rows = [
      { type: 'idx', n },
      { type: 'marks', items: [!f.done && { at: s, text: 's', cls: 'm' }, !f.done && { at: s + m - 1, text: 'h', cls: 'm' }] },
      {
        type: 'chars', label: 'T', chars: T,
        cell: (j) => {
          if (f.done) return f.occ.some((o) => j >= o && j < o + m) ? 'ok' : '';
          const i = j - s;
          if (i < 0 || i >= m) return '';
          if (i === f.bad) return 'bad focus';
          if (ok.includes(i)) return 'ok' + (i === f.cur ? ' focus' : '');
          return '';
        },
      },
      !f.done && {
        type: 'chars', label: 'P', start: s, chars: P,
        cell: (i) => {
          const c = [];
          if (i === f.bad) c.push('bad', 'focus');
          else if (inr(f.pmark, i)) c.push('src');
          else if (ok.includes(i)) c.push('ok');
          if (i === f.cur && i !== f.bad) c.push('focus');
          return c.join(' ');
        },
      },
      f.ghost != null && !f.done && {
        type: 'chars', label: 'сдвиг', start: f.ghost, chars: P,
        cell: (i) => 'ghost' + (inr(f.gh, i) ? ' ' + (f.gcls || 'blk') : ''),
      },
      {
        type: 'spans', items: [
          f.tspan && { from: f.tspan[0], to: f.tspan[1], text: 't' },
          ...f.occ.map((o) => ({ from: o, to: o + m - 1, text: 'вх. ' + o, cls: 'occ' })),
        ],
      },
    ];
    let h = App.strip(cols, rows);
    const pre = f.pre, tb = f.tab || {};
    h += App.strip(m, [
      { type: 'idx', n: m },
      { type: 'chars', label: 'P', chars: P, cell: (i) => (!f.done && i === f.bad ? 'bad' : '') },
      { type: 'nums', label: 'N', values: pre.N },
      { type: 'nums', label: 'L′', values: pre.Lp.map((v, k) => (k === 0 ? undefined : dash(v))), cell: (k) => (tb.row === 'Lp' && tb.idx === k ? 'new' : '') },
      { type: 'nums', label: 'L', values: pre.L.map((v, k) => (k === 0 ? undefined : dash(v))), cell: (k) => (tb.row === 'L' && tb.idx === k ? 'new' : '') },
      { type: 'nums', label: 'l′', values: pre.lp.slice(0, m).map((v, k) => (k === 0 ? undefined : v)), cell: (k) => (tb.row === 'lp' && tb.idx === k ? 'new' : '') },
    ]);
    return h;
  }

  App.register({
    id: 'bm', block: 3, num: 15, title: 'Бойер-Мур',
    full: '15. Алгоритм Бойера-Мура. Правило плохого символа, правило хорошего суффикса.',
    modes: [
      {
        id: 'search', label: 'Поиск',
        inputs: [
          { id: 'T', label: 'Текст T', value: 'abacbabcabcabbcabacbcab', max: 44, w: 24 },
          { id: 'P', label: 'Образец P', value: 'cabcab', max: 14, w: 10 },
          { id: 'bc', label: 'ППС', type: 'select', value: 'strong', options: [['strong', 'сильное'], ['weak', 'слабое'], ['off', 'выключено']] },
          { id: 'gs', label: 'ПХС', type: 'select', value: 'strong', options: [['strong', 'сильное (L′)'], ['weak', 'слабое (L)'], ['off', 'выключено']] },
        ],
        validate: (v) => (v.P.length > v.T.length ? 'Образец длиннее текста.' : null),
        presets: [
          { label: 'обычный', v: { T: 'abacbabcabcabbcabacbcab', P: 'cabcab', bc: 'strong', gs: 'strong' } },
          { label: 'ПХС и ППС по очереди', v: { T: 'bcbbacbabacbcbacbbcb', P: 'cbacb', bc: 'strong', gs: 'strong' } },
          { label: 'плохого символа нет в P', v: { T: 'aabzaabaabzaaab', P: 'aaab', bc: 'strong', gs: 'strong' } },
          { label: 'худший для БМ', v: { T: 'aaaaaaaaaaaa', P: 'aaa', bc: 'strong', gs: 'strong' } },
        ],
        legend: [['ok', 'совпало (хороший суффикс)'], ['bad', 'плохой символ'], ['src', 'на что опирается правило'], ['ghost', 'положение после сдвига']],
        code: [
          'предподсчёт: R (ППС), N → L′, l′ (ПХС)',
          's = 0',
          'while s ≤ n − m:',
          '  i = m − 1',
          '  while i ≥ 0 and P[i] = T[s + i]:  i = i − 1   // справа налево',
          '  if i < 0:',
          '    вхождение в позиции s;  сдвиг = m − l′[1]',
          '  else:',
          '    ППС = сдвиг по плохому символу T[s + i]',
          '    ПХС = сдвиг по хорошему суффиксу P[i+1..m−1]',
          '    сдвиг = max(1, ППС, ПХС)',
          '  s = s + сдвиг',
        ],
        run: runSearch, render: renderSearch,
      },
      {
        id: 'pre', label: 'Предподсчёт: R, N, L′, l′',
        inputs: [{ id: 'P', label: 'Образец P', value: 'abcaabcab', max: 20, w: 16 }],
        presets: [
          { label: 'abcaabcab', v: { P: 'abcaabcab' } },
          { label: 'cabcab', v: { P: 'cabcab' } },
          { label: 'babcbab', v: { P: 'babcbab' } },
          { label: 'aabaabaab', v: { P: 'aabaabaab' } },
        ],
        legend: [['blk', 'суффикс P[0..j] / копия t'], ['pre', 'суффикс P / префикс'], ['bad', 'различные символы слева'], ['src', 'откуда берём'], ['new', 'записали']],
        code: [
          'for i = 0 .. m − 1:  R[P[i]] = i           // слабое ППС',
          'списки позиций каждого символа             // сильное ППС',
          'Pʳ = перевёрнутый P;  Zʳ = Z(Pʳ)',
          'for j = 0 .. m − 1:  N[j] = Zʳ[m − 1 − j]',
          'L′[1..m−1] = −',
          'for j = 0 .. m − 2:',
          '  if N[j] > 0:',
          '    i = m − N[j]',
          '    L′[i] = j',
          'l′[m] = 0',
          'for i = m − 1 downto 1:',
          '  k = m − i;  l′[i] = (N[k−1] = k) ? k : l′[i+1]',
        ],
        run: runPre, render: renderPre,
      },
    ],
    theory: `
<h3>Три отличия от простейшего поиска</h3>
<ol>
<li>Образец прикладывается к тексту слева направо, а сравнивается справа налево.</li>
<li>Проверяется правило плохого символа (ППС).</li>
<li>Проверяется правило хорошего суффикса (ПХС).</li>
</ol>
<p>Простейший вариант: идём справа налево; нашли несовпадение — сдвигаем P на 1 и снова сравниваем справа налево; дошли до начала P — записываем вхождение. Правила позволяют сдвигать сразу на много позиций. Итоговый сдвиг — <b>max(1, ППС, ПХС)</b>: каждое правило безопасно, то есть не пропускает вхождений, поэтому можно брать наибольший.</p>

<h3>Правило плохого символа</h3>
<p>Пусть на сравнении символ паттерна P[i] не совпал с символом текста A. Ищем самое правое вхождение A в паттерне и сдвигаем так, чтобы оно встало под A в тексте. Если A в паттерне нет, смело сдвигаем паттерн целиком за A, то есть на i + 1.</p>
<p>Замечание: если самое правое A стоит в паттерне правее позиции несовпадения, правило велит сдвигать влево (например, на −2). Такой случай исключает общее правило max(1, ППС, ПХС), потому что 1 &gt; −2.</p>
<ul>
<li><b>Слабое ППС.</b> Проходим паттерн слева направо и для каждого символа x записываем его последнее вхождение R(x). Сдвиг i − R(x).</li>
<li><b>Сильное ППС.</b> Берём не самое правое вхождение символа вообще, а самое правое вхождение <i>до позиции несовпадения</i>. Сохраняем все позиции каждой буквы (удобно идти справа налево, тогда правые позиции окажутся в начале списка) и ищем наибольшую позицию j &lt; i. Сдвиг i − j.</li>
</ul>

<h3>Правило хорошего суффикса</h3>
<p>Совпал суффикс t = P[i+1..m−1], а следующий символ P[i] не совпал.</p>
<ul>
<li><b>Слабое ПХС.</b> Ищем в паттерне такую же подстроку t; если их несколько, берём самую правую (не совпадающую с самим суффиксом) и сдвигаем так, чтобы она встала под t в тексте.</li>
<li><b>Сильное ПХС.</b> Ищем копию t, у которой слева стоит символ, отличный от символа несовпадения P[i]. Иначе после сдвига под тот же символ текста встал бы тот же символ, и было бы новое несовпадение.</li>
<li>Если такой подстроки нет, ищем наибольший суффикс t, который является и префиксом P, и сдвигаем так, чтобы они совпали. Если нет и такого — сдвиг на m.</li>
</ul>

<h3>Предподсчёт ПХС через Z-функцию</h3>
<div class="def"><b>N[j]</b> — длина наибольшего суффикса P[0..j], который является суффиксом всего P. Берём паттерн, отзеркаливаем его, строим Z-функцию; отзеркаленная Z-функция — это массив N: N[j] = Z(Pʳ)[m − 1 − j].</div>
<div class="def"><b>L′[i]</b> хранит наибольший индекс j, такой что P[i..m−1] — суффикс P[0..j], и символ перед этим суффиксом в P[0..j] не равен P[i − 1]. По сути это перевёрнутая сильная префикс-функция из КМП.</div>
<p>Подсчёт L′: идём слева направо индексом j = 0..m−2; если N[j] = 0 — пропускаем; иначе i = m − N[j] и L′[i] = j. Поскольку идём слева направо, остаётся наибольший j.</p>
<div class="def"><b>l′[i]</b> — длина наибольшего суффикса P[i..m−1], который является префиксом P. Префикс длины k — суффикс ⇔ N[k − 1] = k, поэтому l′[i] = k = m − i, если N[k − 1] = k, иначе l′[i] = l′[i + 1].</div>
<p>Слабое ПХС использует L[i] = max(L[i − 1], L′[i]) — без условия на символ слева.</p>

<h3>Сдвиги (индексы с 0)</h3>
<ul>
<li>Символ P[i − 1] не совпал с текстом (совпал t = P[i..m−1]): если L′[i] определено, сдвиг <b>m − 1 − L′[i]</b>, иначе <b>m − l′[i]</b>.</li>
<li>Несовпадение на первом же сравнении (на P[m − 1]): хорошего суффикса нет, ПХС ничего не даёт.</li>
<li>Найдено вхождение: сдвиг <b>m − l′[1]</b>.</li>
</ul>

<h3>Сложность</h3>
<ul>
<li>Предподсчёт O(m + |Σ|).</li>
<li>С одним ППС худший случай O(nm): T = aaa…a, P = baa…a — на каждой позиции m сравнений и сдвиг на 1.</li>
<li>С сильным ПХС, если P не входит в T, число сравнений линейно: Коул доказал оценку ≤ 3n. При многих вхождениях возможно O(nm) (P = aaa, T = aaa…a), это исправляют правилом Галила или алгоритмом Апостолико-Джанкарло (билет 16).</li>
<li>На практике при большом алфавите БМ сублинеен: часто сдвигается сразу почти на m, а многие символы текста вообще не смотрит.</li>
</ul>`,
    quiz: {
      intro: 'Заполни N, L′ и l′ для образца (индексы с 0). L′ и l′ начинаются с индекса 1; неопределённое L′ пиши как «-».',
      sLabel: 'P', len: 8,
      arrays: (s) => {
        const pre = A.bm(s);
        return [
          { key: 'N', label: 'N', ans: pre.N.map(String) },
          { key: 'Lp', label: 'L′', ans: pre.Lp.map((v) => (v < 0 ? '−' : String(v))), skip: [0] },
          { key: 'lp', label: 'l′', ans: pre.lp.slice(0, s.length).map(String), skip: [0] },
        ];
      },
    },
  });
})(window.App);
