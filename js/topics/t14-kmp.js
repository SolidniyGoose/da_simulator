/* Билет 14. Алгоритм Кнута-Морриса-Пратта. Префикс-функция по Z-функции. Индексация с 0. */
(function (App) {
  'use strict';
  const A = App.algo, { c: C, s: SS } = App.fmt;

  /* ---------- режим 1: sp′ и sp по Z ---------- */
  function runPre({ P }) {
    const m = P.length, Z = A.z(P), F = [];
    const spS = new Array(m).fill(null), sp = new Array(m).fill(null);
    const V = (o) => [['i', o.i ?? '—'], ['j', o.j ?? '—'], ['Z[i]', o.i != null ? Z[o.i] : '—']];
    const push = (line, msg, o = {}) => F.push({ line, msg, Z, spS: spS.slice(), sp: sp.slice(), vars: V(o), ...o });

    push(0, `Считаем Z-функцию образца (билет 13). Z[i] — длина наибольшей подстроки с позиции i, совпадающей с префиксом P. Это и есть кандидаты в бордеры: если Z[i] = z, то P[i..i+z−1] — одновременно суффикс P[0..i+z−1] и префикс P.`, { big: true });
    spS.fill(0);
    push(1, 'Заполняем sp′ нулями и идём по i справа налево.', {});
    for (let i = m - 1; i >= 1; i--) {
      if (Z[i] === 0) {
        push([2, 3], `i = ${i}: Z[${i}] = 0 — с позиции ${i} префикс не начинается, ничего не записываем.`, { i, zi: i });
        continue;
      }
      const j = i + Z[i] - 1, old = spS[j];
      spS[j] = Z[i];
      const after = j + 1 < m
        ? `следующие символы различны: P[${j + 1}] = ${C(P[j + 1])} ≠ P[${Z[i]}] = ${C(P[Z[i]])} (иначе Z[${i}] было бы больше)`
        : 'j = m − 1, следующего символа нет — условие не нужно';
      push([2, 3, 4, 5],
        `i = ${i}: Z[${i}] = ${Z[i]}, j = i + Z[i] − 1 = ${j}. Суффикс ${SS(P.slice(i, j + 1))} подстроки P[0..${j}] совпадает с префиксом, и ${after}. Это ровно условие сильной префикс-функции → sp′[${j}] = ${Z[i]}.` +
        (old > 0 ? ` Раньше здесь было ${old} (от большего i). Идём справа налево, поэтому последней записывается длина от меньшего i — она больше.` : ''),
        { i, j, zi: i, set: j, seg: [i, j], preLen: Z[i], nxt: j + 1 < m ? [j + 1, Z[i]] : null, big: true });
    }
    sp[m - 1] = spS[m - 1];
    push(6, `sp′ готова. Обычную sp получим из неё справа налево: sp[m − 1] = sp′[m − 1] = ${sp[m - 1]}.`, { setSp: m - 1, big: true });
    for (let j = m - 2; j >= 0; j--) {
      const a = sp[j + 1] - 1, b = spS[j];
      sp[j] = Math.max(a, b);
      const why = sp[j] === 0 ? 'Бордера нет.'
        : a >= b ? `Бордер P[0..${j + 1}] длины ${sp[j + 1]} без последнего символа — бордер P[0..${j}] длины ${a}; символ после него совпадает с P[${j + 1}], поэтому sp′ его не учитывала.`
        : `Наибольший бордер P[0..${j}] — сильный, его даёт sp′[${j}].`;
      push([7, 8], `sp[${j}] = max(sp[${j + 1}] − 1, sp′[${j}]) = max(${a}, ${b}) = ${sp[j]}. ${why}`, { j, setSp: j, preLen2: sp[j], end2: j });
    }
    push([], 'Готово: sp и sp′ построены за O(m). Там, где sp ≠ sp′, символ после бордера совпадает с P[i+1] — такой перенос гарантированно дал бы повторное несовпадение, и сильная функция его отбрасывает.', { done: true, big: true });
    return F;
  }

  function renderPre(f, { P }) {
    const m = P.length;
    const seg = f.seg, pl = f.preLen || 0;
    const sp2 = f.preLen2 > 0 ? [[0, f.preLen2 - 1], [f.end2 - f.preLen2 + 1, f.end2]] : null;
    return App.strip(m, [
      { type: 'idx', n: m },
      { type: 'marks', items: [f.i != null && { at: f.i, text: 'i' }, f.j != null && { at: f.j, text: 'j', cls: 'w' }] },
      {
        type: 'chars', label: 'P', chars: P,
        cell: (k) => {
          const c = [];
          if (f.nxt && (k === f.nxt[0] || k === f.nxt[1])) c.push('bad');
          else if (seg && k >= seg[0] && k <= seg[1]) c.push('blk');
          else if (sp2 && k >= sp2[1][0] && k <= sp2[1][1]) c.push('blk');
          if ((seg && k < pl) || (sp2 && k <= sp2[0][1])) c.push('pre');
          return c.join(' ');
        },
      },
      {
        type: 'spans', items: [
          seg && { from: seg[0], to: seg[1], text: `суффикс P[0..${seg[1]}]` },
          seg && { from: 0, to: pl - 1, text: 'префикс', cls: 'pre' },
        ],
      },
      { type: 'nums', label: 'Z', values: f.Z.map((z, k) => (k === 0 ? '–' : z)), cell: (k) => (k === f.zi ? 'src' : '') },
      { type: 'nums', label: 'sp′', values: f.spS, cell: (k) => (k === f.set ? 'new' : '') },
      { type: 'nums', label: 'sp', values: f.sp, cell: (k) => (k === f.setSp ? 'new' : '') },
    ]);
  }

  /* ---------- режим 2: поиск ---------- */
  function runSearch({ T, P, fn }) {
    if (fn === 'rt') return runRT(T, P);
    const n = T.length, m = P.length, F = [], occ = [];
    const sp = A.sp(P, fn !== 'weak'), nm = fn === 'weak' ? 'sp' : 'sp′';
    let c = 0, p = 0, cmp = 0;
    const V = () => [['c', c], ['p', p], ['s = c − p', c - p], ['сравнений', `${cmp} (≤ 2n = ${2 * n})`]];
    const push = (line, msg, o = {}) => F.push({ line, msg, c, p, s: c - p, occ: occ.slice(), vars: V(), sp, nm, ...o });

    push(0, `Предподсчёт ${nm} для P: ${sp.join(', ')}. c — позиция в тексте, p — сколько символов образца уже совпало, образец приложен в позиции s = c − p.`, { big: true });
    while (c - p <= n - m) {
      cmp++;
      if (T[c] === P[p]) {
        push([1, 2, 3], `T[${c}] = ${C(T[c])} = P[${p}] — совпадение, двигаем оба указателя.`, { cur: p, eq: true });
        c++; p++;
        if (p === m) {
          occ.push(c - m);
          const k = sp[m - 1];
          push([4, 5, 6], `p = m: найдено вхождение в позиции ${c - m}. Чтобы не пропустить пересекающиеся вхождения, берём ${nm}[m − 1] = ${k}: сдвиг на m − ${k} = ${m - k}, первые ${k} символов уже совпадают.`,
            { s: c - m, p: m, ghost: c - k, k, big: true });
          p = k;
        }
      } else if (p === 0) {
        push([1, 2, 7, 8], `T[${c}] = ${C(T[c])} ≠ P[0] = ${C(P[0])}, ничего не совпало — сдвигаем образец на 1, c = ${c + 1}.`, { cur: 0, eq: false, ghost: c + 1, k: 0 });
        c++;
      } else {
        const k = sp[p - 1];
        const alpha = P.slice(0, k);
        push([1, 2, 9, 10],
          `T[${c}] = ${C(T[c])} ≠ P[${p}] = ${C(P[p])}. Совпала часть ${SS(P.slice(0, p))}. Её наибольший ${fn === 'weak' ? '' : 'сильный '}бордер — α = ${SS(alpha)}, |α| = ${nm}[${p - 1}] = ${k}. ` +
          `По утверждению КМП на позициях s … c − |α| − 1 вхождений нет, поэтому сдвигаем образец на p − |α| = ${p - k}: α встаёт под совпавший α в тексте, сравнение продолжится с того же T[${c}] и P[${k}].`,
          { cur: p, eq: false, ghost: c - k, k, big: true });
        p = k;
      }
    }
    push([], `Готово. Вхождения: ${occ.length ? occ.join(', ') : 'нет'}. Сравнений: ${cmp} ≤ 2n = ${2 * n}. Указатель c в тексте ни разу не сдвинулся назад.`, { s: null, done: true, big: true });
    return F;
  }

  function runRT(T, P) {
    const n = T.length, m = P.length, F = [], occ = [];
    const alpha = [...new Set(P)].sort();
    const tab = [];
    for (let i = 0; i < m; i++) tab.push(alpha.map((x) => A.spX(P, i, x)));
    const spS = A.sp(P, true);
    let c = 0, p = 0, cmp = 0;
    const V = () => [['c', c], ['p', p], ['s = c − p', c - p], ['обработано символов T', cmp]];
    const push = (line, msg, o = {}) => F.push({ line, msg, c, p, s: c - p, occ: occ.slice(), vars: V(), tab, alpha, rt: true, ...o });
    push([0, 1], 'Предподсчёт таблицы sp′(i, x): длина наибольшего собственного суффикса P[0..i], равного префиксу, за которым в P идёт символ x (− если такого нет). Каждый символ текста будет обработан ровно один раз.', { big: true });
    while (c - p <= n - m) {
      const x = T[c];
      cmp++;
      if (P[p] === x) {
        push([2, 3, 7], `T[${c}] = ${C(x)} = P[${p}] — совпадение, p = ${p + 1}, c = ${c + 1}.`, { cur: p, eq: true });
        p++; c++;
      } else if (p > 0 && A.spX(P, p - 1, x) >= 0) {
        const k = A.spX(P, p - 1, x);
        push([2, 4, 5, 7], `T[${c}] = ${C(x)} ≠ P[${p}]. Смотрим в таблицу: sp′(${p - 1}, ${C(x)}) = ${k}. Переносим образец так, что под T[${c}] встаёт P[${k}] = ${C(x)} — совпадение известно заранее, повторно не сравниваем. p = ${k + 1}, c = ${c + 1}.`,
          { cur: p, eq: false, ghost: c - k, k: k + 1, al: k, gx: true, look: [p - 1, x], big: true });
        p = k + 1; c++;
      } else {
        push([2, 6, 7], p > 0
          ? `T[${c}] = ${C(x)} ≠ P[${p}], и sp′(${p - 1}, ${C(x)}) не определено: ни один бордер не продолжается символом ${C(x)}. Образец целиком переносим за T[${c}]: p = 0, c = ${c + 1}.`
          : `T[${c}] = ${C(x)} ≠ P[0] — p = 0, c = ${c + 1}.`,
        { cur: p, eq: false, ghost: c + 1, k: 0, look: p > 0 ? [p - 1, x] : null });
        p = 0; c++;
      }
      if (p === m) {
        occ.push(c - m);
        const k = spS[m - 1];
        push(8, `p = m — вхождение в позиции ${c - m}. p = sp′[m − 1] = ${k}.`, { s: c - m, p: m, ghost: c - k, k, big: true });
        p = k;
      }
    }
    push([], `Готово. Вхождения: ${occ.length ? occ.join(', ') : 'нет'}. Каждый из ${cmp} просмотренных символов текста обработан за O(1) — никаких возвратов и повторных сравнений.`, { s: null, done: true, big: true });
    return F;
  }

  function renderSearch(f, { T, P }) {
    const n = T.length, m = P.length, s = f.s, k = f.k || 0, al = f.al ?? k;
    const cols = Math.max(n, (s ?? 0) + m, f.ghost != null ? f.ghost + m : 0);
    const matched = f.cur != null ? f.cur : f.p; // сколько символов P совпало до текущего сравнения
    const rows = [
      { type: 'idx', n },
      { type: 'marks', items: [!f.done && { at: f.c, text: 'c' }] },
      {
        type: 'chars', label: 'T', chars: T,
        cell: (j) => {
          if (s == null) return f.occ.some((o) => j >= o && j < o + m) ? 'ok' : '';
          if (f.cur != null && j === f.c) return (f.eq ? 'ok' : 'bad') + ' focus';
          if (j >= s && j < s + matched) return 'ok' + (f.ghost != null && !f.eq && j >= f.c - al && j < f.c ? ' blk' : '');
          return j < s ? 'dim' : '';
        },
      },
      s != null && {
        type: 'chars', label: 'P', start: s, chars: P,
        cell: (i) => {
          if (f.cur != null && i === f.cur) return (f.eq ? 'ok' : 'bad') + ' focus';
          if (i < matched) return 'ok' + (f.ghost != null && i >= matched - al ? ' blk' : '');
          return '';
        },
      },
      f.ghost != null && s != null && {
        type: 'chars', label: 'сдвиг', start: f.ghost, chars: P,
        cell: (i) => 'ghost' + (f.gx && i === k - 1 ? ' ok' : i < k ? ' blk' : ''),
      },
      {
        type: 'spans', items: [
          ...f.occ.map((o) => ({ from: o, to: o + m - 1, text: 'вх. ' + o, cls: 'occ' })),
        ],
      },
    ];
    let h = App.strip(cols, rows);
    if (f.rt) {
      h += `<table class="mini"><caption>sp′(i, x) — куда переносить образец при несовпадении</caption><tr><th>i \\ x</th>${f.alpha.map((x) => `<th>${App.esc(x)}</th>`).join('')}</tr>`;
      f.tab.forEach((row, i) => {
        h += `<tr><th>${i}</th>${row.map((v, xi) => {
          const on = f.look && f.look[0] === i && f.look[1] === f.alpha[xi];
          const mut = i + 1 < m && P[i + 1] === f.alpha[xi];
          return `<td class="${on ? 'on' : mut ? 'mut' : ''}">${v < 0 ? '−' : v}</td>`;
        }).join('')}</tr>`;
      });
      h += '</table>';
    } else {
      h += `<div class="chips"><b>${f.nm}:</b>${f.sp.map((v, i) => `<span class="${f.cur != null && !f.eq && i === f.cur - 1 ? 'on' : ''}">${i}:${v}</span>`).join('')}</div>`;
    }
    return h;
  }

  const ex = (P) => {
    const sp = A.sp(P, false), sps = A.sp(P, true);
    return `<table class="mini"><tr><th>i</th>${[...P].map((_, i) => `<th>${i}</th>`).join('')}</tr>
      <tr><th>P</th>${[...P].map((c) => `<td>${c}</td>`).join('')}</tr>
      <tr><th>sp</th>${sp.map((v) => `<td>${v}</td>`).join('')}</tr>
      <tr><th>sp′</th>${sps.map((v, i) => `<td${v !== sp[i] ? ' class="on"' : ''}>${v}</td>`).join('')}</tr></table>`;
  };

  App.register({
    id: 'kmp', block: 3, num: 14, title: 'Кнут-Моррис-Пратт',
    full: '14. Алгоритм Кнута-Морриса-Пратта. Построение префикс-функции на основе Z-функции.',
    modes: [
      {
        id: 'pre', label: 'sp′ и sp по Z-функции',
        inputs: [{ id: 'P', label: 'Образец P', value: 'abaabaabab', max: 24, w: 18 }],
        presets: [
          { label: 'abaabaabab', v: { P: 'abaabaabab' } },
          { label: 'abcabcacab', v: { P: 'abcabcacab' } },
          { label: 'aabaaab', v: { P: 'aabaaab' } },
          { label: 'aaaaaa', v: { P: 'aaaaaa' } },
        ],
        legend: [['blk', 'суффикс P[0..j]'], ['pre', 'совпадающий префикс'], ['bad', 'различные следующие символы'], ['src', 'используемое Z[i]'], ['new', 'записанное значение']],
        code: [
          'Z = Z-функция(P)                  // билет 13',
          'sp′[0..m−1] = 0',
          'for i = m − 1 downto 1:',
          '  if Z[i] > 0:',
          '    j = i + Z[i] − 1',
          '    sp′[j] = Z[i]',
          'sp[m − 1] = sp′[m − 1]',
          'for j = m − 2 downto 0:',
          '  sp[j] = max(sp[j + 1] − 1, sp′[j])',
        ],
        run: runPre, render: renderPre,
      },
      {
        id: 'search', label: 'Поиск',
        inputs: [
          { id: 'T', label: 'Текст T', value: 'abacabaababacabab', max: 40, w: 22 },
          { id: 'P', label: 'Образец P', value: 'ababacab', max: 14, w: 10 },
          { id: 'fn', label: 'Функция сдвигов', type: 'select', value: 'strong', options: [['strong', 'sp′ — сильная'], ['weak', 'sp — обычная'], ['rt', 'sp′(i, x) — реальное время']] },
        ],
        validate: (v) => (v.P.length > v.T.length ? 'Образец длиннее текста.' : null),
        presets: [
          { label: 'обычный', v: { T: 'abacabaababacabab', P: 'ababacab' } },
          { label: 'sp против sp′', v: { T: 'abababcabababaab', P: 'ababab' } },
          { label: 'пересечения', v: { T: 'aabaabaabaab', P: 'aabaab' } },
        ],
        legend: (v) => [['ok', 'совпало'], ['bad', 'несовпадение'], ['blk', v.fn === 'rt' ? 'бордер, за которым идёт x' : 'бордер α'], ['ghost', 'положение после сдвига']],
        code: (v) => v.fn === 'rt' ? [
          'предподсчёт таблицы sp′(i, x)',
          'c = 0;  p = 0',
          'while c − p ≤ n − m:',
          '  if T[c] = P[p]:  p = p + 1',
          '  else if p > 0 and sp′(p − 1, T[c]) ≠ −:',
          '    p = sp′(p − 1, T[c]) + 1      // P[sp′] = T[c] известно',
          '  else:  p = 0',
          '  c = c + 1                        // каждый символ T ровно 1 раз',
          '  if p = m:  вхождение в c − m;  p = sp′[m − 1]',
        ] : [
          `предподсчёт ${v.fn === 'weak' ? 'sp' : 'sp′'} для P;  c = 0;  p = 0`,
          'while c − p ≤ n − m:              // s = c − p — левый край P',
          '  if T[c] = P[p]:',
          '    c = c + 1;  p = p + 1',
          '    if p = m:',
          '      вхождение в позиции c − m',
          `      p = ${v.fn === 'weak' ? 'sp' : 'sp′'}[m − 1]`,
          '  else if p = 0:',
          '    c = c + 1                      // сдвиг на 1',
          '  else:',
          `    p = ${v.fn === 'weak' ? 'sp' : 'sp′'}[p − 1]           // сдвиг на p − ${v.fn === 'weak' ? 'sp' : 'sp′'}[p − 1]`,
        ],
        run: runSearch, render: renderSearch,
      },
    ],
    theory: () => `
<h3>Идея алгоритма</h3>
<p>Приложили образец P = p<sub>1</sub>…p<sub>m</sub> к тексту T в позиции j, и первое несовпадение — в позиции k текста, то есть совпала часть t<sub>j</sub>…t<sub>k−1</sub>. Пусть α — наибольший собственный суффикс совпавшей части, который одновременно является префиксом P.</p>
<div class="thm"><b>Утверждение.</b> На полуинтервале [j; k − |α|) вхождений P нет.</div>
<div class="proof"><p>Пусть вхождение начинается в h ∈ [j; k − |α|). Тогда β = t<sub>h</sub>…t<sub>k−1</sub> — суффикс совпавшей части и префикс P, причём |β| = k − h ∈ (|α|; k − j]. Получили суффикс-префикс длиннее α — противоречие с выбором α.</p></div>
<p>Поэтому образец сразу переносим в позицию k − |α|: первые |α| символов уже совпадают, и сравнение продолжаем с той же позиции k текста и позиции |α| + 1 образца. Символы текста левее k больше никогда не сравниваются.</p>

<h3>Префикс-функции</h3>
<div class="def"><b>Префикс-функция sp<sub>i</sub></b> — длина наибольшего собственного суффикса подстроки P[0..i], совпадающего с префиксом P.</div>
<div class="def"><b>Сильная префикс-функция sp′<sub>i</sub></b> — то же, но дополнительно символ после префикса не совпадает с символом после суффикса: P[sp′<sub>i</sub>] ≠ P[i + 1]. Для i = m − 1 это условие не накладывается.</div>
<p>Сильная функция избегает лишних несовпадений при переносах. Если несовпадение было на P[i+1], а P[sp<sub>i</sub>] = P[i+1], то после переноса под тот же символ текста встанет такой же символ образца — и снова несовпадение. Всегда sp′<sub>i</sub> ≤ sp<sub>i</sub>.</p>
<p>Пример для P = <code>abaabab</code> (отмечены позиции, где sp′ ≠ sp):</p>
${ex('abaabab')}

<h3>Построение sp′ по Z-функции</h3>
<p>Заполняем sp′ нулями. Пусть z<sub>i</sub> — значение Z-функции паттерна в позиции i. Идём по i от m − 1 до 1 (справа налево):</p>
<ol><li>j = i + z<sub>i</sub> − 1;</li><li>sp′<sub>j</sub> = z<sub>i</sub>.</li></ol>
<div class="proof">
<p>z<sub>i</sub> — длина наибольшего совпадения подстроки с позиции i и префикса. Значит, у подстроки P[0..j] суффикс P[i..j] длины z<sub>i</sub> совпадает с префиксом, а следующие за ними символы P[j+1] и P[z<sub>i</sub>] различны — иначе z<sub>i</sub> было бы больше. Это ровно условие сильной префикс-функции. Обратно, если sp′<sub>j</sub> = k &gt; 0, то для i = j − k + 1 выполнено z<sub>i</sub> = k.</p>
<p>Может найтись несколько i<sub>1</sub>, …, i<sub>s</sub> с i + z<sub>i</sub> − 1 = j, а нужно наибольшее z<sub>i</sub>, то есть наименьшее i. Чтобы не перебирать их, идём справа налево: последним в sp′<sub>j</sub> записывается значение от наименьшего i. Время O(m).</p>
</div>
<p>Обычная sp получается из sp′ справа налево: sp<sub>m−1</sub> = sp′<sub>m−1</sub>, sp<sub>i</sub> = max(sp<sub>i+1</sub> − 1, sp′<sub>i</sub>). Если наибольший бордер P[0..i] не сильный, то он продолжается символом P[i+1] и даёт бордер P[0..i+1].</p>

<h3>Линейность поиска</h3>
<div class="thm"><b>Теорема.</b> КМП выполняет не больше 2n сравнений, общее время O(n + m).</div>
<div class="proof"><p>Каждое удачное сравнение сдвигает указатель в тексте вправо — их не больше n. Каждое неудачное сдвигает образец вправо хотя бы на 1, а левый край образца не уходит дальше n — их тоже не больше n. Вместе с O(m) на предподсчёт получаем O(n + m).</p></div>

<h3>Алгоритм реального времени</h3>
<p>Используется функция sp′<sub>(i, x)</sub>, которая дополнительно требует, чтобы следующий после префикса символ был равен x. При несовпадении P[i+1] с символом x текста образец переносим так, что под x встаёт P[sp′<sub>(i,x)</sub>] = x. Совпадение известно заранее, поэтому после переноса не нужно снова проверять несовпавший символ: каждый символ текста сравнивается ровно один раз. Так можно обрабатывать непрерывный поток символов без дополнительных сдвигов. Таблица занимает O(m·|Σ|).</p>
<p class="note">В симуляции выбери «sp′(i, x) — реальное время», чтобы увидеть таблицу и переносы.</p>`,
    quiz: {
      intro: 'Заполни обычную sp и сильную sp′ префикс-функции образца. Подсказка: sp′ удобно считать по Z-функции справа налево.',
      sLabel: 'P',
      arrays: (s) => [
        { key: 'sp', label: 'sp', ans: A.sp(s, false).map(String) },
        { key: 'sps', label: 'sp′', ans: A.sp(s, true).map(String) },
      ],
    },
  });
})(window.App);
