/* Билет 20. Приложения суффиксного дерева: поиск подстроки и набора подстрок, поиск в базе образцов,
   наибольшая общая подстрока двух и более строк, статистика совпадений. Индексы с 1. */
(function (App) {
  'use strict';
  const ST = App.st, esc = App.esc, { c: C, s: SS, sub } = App.fmt;
  const TERMS = '$#%&';
  const name = (nodes, id) => ST.name(nodes, id);
  const noTerm = (label) => (v) => {
    const bad = [].concat(v[label]).find((w) => /[$#%&]/.test(w));
    return bad ? `Символы $ # % & зарезервированы под терминаторы — убери их из «${bad}».` : null;
  };

  // Обобщённое дерево: S₁$ S₂# S₃% S₄& — метки листьев обрезаны на первом терминаторе
  function gst(strs) {
    const X = strs.map((w, k) => w + TERMS[k]).join('');
    const t = ST.build(X, TERMS, false);
    const owner = [];
    let off = 0;
    strs.forEach((w, k) => { for (let q = 1; q <= w.length + 1; q++) owner[off + q] = [k + 1, q]; off += w.length + 1; });
    for (const x of t.nodes) if (x.leaf) { const [k, q] = owner[x.leaf]; x.g = k; x.lt = `${k}:${q}`; x.pos = q; }
    return { nodes: t.nodes, s: ' ' + X, e: X.length, X };
  }

  // Спуск по образцу от корня с кадрами; возвращает узел, под которым все вхождения
  function walk(nodes, s, e, P, push, base) {
    let cur = 0, a = 0, cmp = 0;
    const path = [0];
    while (a < P.length) {
      const c = nodes[cur].ch[P[a]];
      cmp++;
      if (c == null) {
        push({ ...base, line: 3, msg: `Из ${name(nodes, cur)} нет ребра на ${C(P[a])} — образец ${SS(P)} не встречается.`, hl: { cur, path: path.slice() }, pm: a, bad: a });
        return { ok: false, cmp };
      }
      const lab = ST.label(nodes[c], s, e);
      let q = 1;
      while (q < lab.length && a + q < P.length && lab[q] === P[a + q]) { q++; cmp++; }
      path.push(c);
      if (a + q === P.length) {
        push({ ...base, line: 2, msg: `Ребро ${SS(lab)}: совпали последние ${q} симв. — образец пройден целиком${q < lab.length ? ', остановились посреди ребра' : ''}.`, hl: q < lab.length ? { on: c, k: q, path: path.slice() } : { cur: c, path: path.slice() }, pm: P.length });
        return { ok: true, at: c, path, cmp };
      }
      if (q === lab.length) {
        push({ ...base, line: 2, msg: `Ребро ${SS(lab)} совпало целиком (${q} симв.) → ${name(nodes, c)}.`, hl: { cur: c, path: path.slice() }, pm: a + q });
        cur = c; a += q;
        continue;
      }
      cmp++;
      push({ ...base, line: 3, msg: `На ребре ${SS(lab)} после ${q} симв.: ${C(lab[q])} ≠ ${C(P[a + q])} — образец не встречается.`, hl: { on: c, k: q, next: true, path: path.slice() }, pm: a + q, bad: a + q });
      return { ok: false, cmp };
    }
    return { ok: false, cmp };
  }

  const subMark = (nodes, at) => Object.fromEntries(ST.sub(nodes, at).map((v) => [v, nodes[v].leaf ? 'out' : '']));
  const patRow = (P, f, label) => ({
    type: 'chars', label, chars: P,
    cell: (k) => (k === f.bad ? 'bad focus' : f.pm != null && k < f.pm ? 'ok' : ''),
  });

  /* ---------- режим 1: поиск набора образцов в тексте ---------- */
  function runSearch({ T, Ps }) {
    const str = T + '$', s = ' ' + str, e = str.length, nodes = ST.build(str, '$', true).nodes, F = [];
    const res = [];
    let cmp = 0;
    const push = (o) => F.push({ nodes, s, e, str, res: res.slice(), vars: [['образец', o.pk != null ? `P${sub(o.pk + 1)}` : '—'], ['сравнений', cmp]], ...o });
    push({ line: 0, big: true, msg: `Строим суффиксное дерево T$ (алгоритмом Укконена — O(n), n = ${T.length}). Дальше текст не нужен: каждый образец ищем спуском от корня за O(|P|).`, hl: {} });
    Ps.forEach((P, k) => {
      const base = { pk: k, P };
      push({ ...base, line: 1, big: true, msg: `Образец P${sub(k + 1)} = ${SS(P)}: спускаемся от корня по его символам.`, hl: { cur: 0 }, pm: 0 });
      const r = walk(nodes, s, e, P, push, base);
      cmp += r.cmp;
      if (r.ok) {
        const occ = ST.leaves(nodes, r.at).map((x) => x.leaf).sort((a, b) => a - b);
        res.push({ k, occ });
        push({ ...base, line: 4, big: true, msg: `Каждый лист поддерева под концом P — суффикс, начинающийся с P. Вхождения P${sub(k + 1)}: позиции ${occ.join(', ')} (z = ${occ.length}). Обход поддерева с z листьями — O(z), т.к. у каждого внутреннего узла ≥ 2 детей.`, hl: { path: r.path, mark: subMark(nodes, r.at) }, pm: P.length, occ });
      } else res.push({ k, occ: [] });
    });
    push({ line: [], big: true, msg: `Готово. ${res.map((r) => `P${sub(r.k + 1)}: ${r.occ.length ? r.occ.join(', ') : 'нет'}`).join('; ')}. Всего O(n + Σ|Pᵢ| + z) — как у Ахо-Корасика, но предобрабатываем текст, а не образцы.`, hl: {} });
    return F;
  }
  function renderSearch(f) {
    const n = f.str.length, occ = f.occ || [], m = f.P ? f.P.length : 0;
    let h = App.strip(n, [
      { type: 'idx', n, base: 1 },
      { type: 'chars', label: 'T$', chars: f.str, cell: (k) => (occ.some((o) => k + 1 >= o && k + 1 < o + m) ? 'ok' : '') },
      { type: 'spans', items: occ.map((o) => ({ from: o - 1, to: o + m - 2, text: 'вх. ' + o, cls: 'occ' })) },
    ]);
    if (f.P) h += App.strip(f.P.length, [patRow(f.P, f, `P${sub(f.pk + 1)}`)]);
    h += App.tree(ST.model(f.nodes, f.s, f.e, f.hl || {}, {}));
    if (f.res.length) h += `<div class="chips"><b>Найдено:</b>${f.res.map((r) => `<span class="${r.occ.length ? 'ok' : ''}">P${sub(r.k + 1)}: ${r.occ.length ? r.occ.join(', ') : 'нет'}</span>`).join('')}</div>`;
    return h;
  }

  /* ---------- режим 2: поиск в базе образцов ---------- */
  function runDB({ Db, Q }) {
    const strs = Db.slice(0, 4), { nodes, s, e } = gst(strs), F = [];
    const push = (o) => F.push({ nodes, s, e, strs, Q, ...o });
    push({ line: 0, big: true, msg: `База: ${strs.map((w, k) => `S${sub(k + 1)} = ${SS(w)}`).join(', ')}. Строим обобщённое суффиксное дерево строки ${SS(strs.map((w, k) => w + TERMS[k]).join(''))}: у каждой строки свой терминатор, метку листа обрезаем на первом терминаторе. Лист «k:j» — суффикс j строки Sₖ. Время O(Σ|Sᵢ|), один раз.`, hl: {} });
    push({ line: 1, big: true, msg: `Запрос Q = ${SS(Q)}: нужно найти все строки базы, содержащие Q как подстроку. Спускаемся от корня по Q.`, hl: { cur: 0 }, pm: 0 });
    const r = walk(nodes, s, e, Q, push, {});
    if (r.ok) {
      const lv = ST.leaves(nodes, r.at);
      const ids = [...new Set(lv.map((x) => x.g))].sort();
      const detail = ids.map((k) => `S${sub(k)} (поз. ${lv.filter((x) => x.g === k).map((x) => x.pos).sort((a, b) => a - b).join(', ')})`).join('; ');
      push({ line: 4, big: true, msg: `Листья поддерева — все суффиксы строк базы, начинающиеся с Q. Q входит в: ${detail}. Время запроса O(|Q| + число ответов); если заранее записать в узлы, какие строки встречаются в поддереве, — O(|Q| + k).`, hl: { path: r.path, mark: subMark(nodes, r.at) }, pm: Q.length, ids });
    } else push({ line: [], big: true, msg: 'Q не является подстрокой ни одной строки базы.', hl: {} });
    return F;
  }
  function renderDB(f) {
    let h = `<div class="chips"><b>База:</b>${f.strs.map((w, k) => `<span class="g${k + 1}${f.ids && f.ids.includes(k + 1) ? ' ok' : ''}">S${sub(k + 1)} = ${esc(w)}${TERMS[k]}</span>`).join('')}</div>`;
    h += App.strip(f.Q.length, [{ type: 'idx', n: f.Q.length, base: 1 }, patRow(f.Q, f, 'Q')]);
    return h + App.tree(ST.model(f.nodes, f.s, f.e, f.hl || {}, {}));
  }

  /* ---------- режим 3: наибольшая общая подстрока ---------- */
  function runLCS({ Ss }) {
    const strs = Ss.slice(0, 4), K = strs.length, { nodes, s, e } = gst(strs), F = [];
    const sets = {}, tags = {}, best = {};
    const order = [];
    (function po(v) { for (const c of Object.keys(nodes[v].ch).sort(App.chCmp)) po(nodes[v].ch[c]); order.push(v); })(0);
    const setStr = (S) => `{${[...S].sort().join(',')}}`;
    const push = (o) => F.push({ nodes, s, e, strs, tags: { ...tags }, vars: [['строк K', K], ...Object.keys(best).map((k) => [`l(${k})`, best[k].d])], ...o });
    push({ line: 0, big: true, msg: `Обобщённое суффиксное дерево строк ${strs.map((w, k) => `S${sub(k + 1)} = ${SS(w)}`).join(', ')}. Лист «k:j» принадлежит строке Sₖ (цвет рамки). Подстрока α общая для строк i и j ⇔ под концом пути α есть листья обеих строк.`, hl: {} });
    push({ line: 1, msg: 'Обходим дерево снизу вверх (post-order). Для каждого внутреннего узла v считаем C(v) — множество строк, чьи листья есть в поддереве, и строковую глубину d(v) — длину метки пути.', hl: {} });
    for (const v of order) {
      const x = nodes[v];
      if (x.leaf) { sets[v] = new Set([x.g]); continue; }
      const S = new Set();
      for (const c of Object.values(x.ch)) for (const g of sets[c]) S.add(g);
      sets[v] = S;
      if (v === 0) continue;
      const d = ST.depth(nodes, v, e), lab = ST.pathStr(nodes, v, s, e);
      tags[v] = S.size === K ? `<tspan class="t">${setStr(S)}</tspan>` : setStr(S);
      const upd = [];
      for (let k = 2; k <= S.size; k++) if (!best[k] || d > best[k].d) { best[k] = { d, v, lab }; upd.push(k); }
      push({ line: [2, 3, 4], msg: `${name(nodes, v)}: путь ${SS(lab)}, d = ${d}. C = объединение множеств детей = ${setStr(S)} — подстрока встречается в ${S.size} из ${K} строк.` + (upd.length ? ` Новый рекорд для k = ${upd.join(', ')}: l(k) = ${d}.` : ''), hl: { cur: v } });
    }
    const top = best[K];
    let table = '';
    for (let k = 2; k <= K; k++) table += `k = ${k}: ${best[k] ? `${SS(best[k].lab)} (${best[k].d})` : '—'}; `;
    push({ line: 5, big: true, msg: (top ? `Наибольшая общая подстрока всех ${K} строк — ${SS(top.lab)}, длина ${top.d}: это метка пути до самого глубокого узла с C(v) = все строки.` : `Общей для всех ${K} строк непустой подстроки нет.`) + ` Таблица l(k) — наибольшая подстрока, общая хотя бы k строкам: ${table}`, hl: top ? { cur: top.v, path: ST.anc(nodes, top.v), mark: { [top.v]: 'best' } } : {}, ans: top && top.lab });
    return F;
  }
  function renderLCS(f) {
    const hl = { ...(f.hl || {}), tags: f.tags };
    let h = `<div class="chips"><b>Строки:</b>${f.strs.map((w, k) => `<span class="g${k + 1}">S${sub(k + 1)} = ${esc(w)}${TERMS[k]}</span>`).join('')}</div>`;
    if (f.ans) h += `<div class="chips"><b>Ответ:</b><span class="ok">${esc(f.ans)}</span></div>`;
    return h + App.tree({ ...ST.model(f.nodes, f.s, f.e, hl, {}), rowH: 40, padB: 30 });
  }

  /* ---------- режим 4: статистика совпадений ---------- */
  function runMS({ P, T }) {
    const str = P + '$', s = ' ' + str, e = str.length, nodes = ST.build(str, '$', true).nodes;
    const n = T.length, m = P.length, ms = new Array(n).fill(null), F = [];
    let cmp = 0, jumps = 0, links = 0, pt = { node: 0, child: -1, k: 0 }, i = 1, q = 1;
    const hlOf = (p) => (p.child >= 0 ? { on: p.child, k: p.k } : { cur: p.node });
    const push = (o) => F.push({
      nodes, s, e, str, T, ms: ms.slice(), i, q,
      vars: [['i', i], ['ms(i−1)', i > 1 && ms[i - 2] != null ? ms[i - 2] : '—'], ['сравнений', `${cmp} (≤ 2|T| = ${2 * n})`], ['прыжков', jumps], ['по связям', links]],
      ...o,
    });
    const nm = (v) => name(nodes, v);

    const matchFrom = () => {
      while (q <= n) {
        const x = T[q - 1];
        cmp++;
        if (pt.child < 0) {
          const c = nodes[pt.node].ch[x];
          if (c == null) { push({ line: 6, msg: `T[${q}] = ${C(x)}: из ${nm(pt.node)} нет ребра на ${C(x)} — совпадение закончилось.`, hl: hlOf(pt), cmpAt: q, eq: false }); return; }
          pt = { node: pt.node, child: c, k: 1 };
        } else {
          const lab = ST.label(nodes[pt.child], s, e);
          if (lab[pt.k] !== x) { push({ line: 6, msg: `T[${q}] = ${C(x)}, а на ребре дальше идёт ${C(lab[pt.k])} — совпадение закончилось.`, hl: { on: pt.child, k: pt.k, next: true }, cmpAt: q, eq: false }); return; }
          pt = { ...pt, k: pt.k + 1 };
        }
        if (pt.k === ST.len(nodes[pt.child], e)) pt = { node: pt.child, child: -1, k: 0 };
        q++;
        push({ line: 6, msg: `T[${q - 1}] = ${C(x)} совпал — идём дальше по дереву.`, hl: hlOf(pt), cmpAt: q - 1, eq: true });
      }
      push({ line: 6, msg: 'Текст закончился.', hl: hlOf(pt) });
    };
    const skip = (from, g, line) => {
      let cur = from, a = 0;
      pt = { node: from, child: -1, k: 0 };
      while (a < g.length) {
        const c = nodes[cur].ch[g[a]], L = ST.len(nodes[c], e), lab = ST.label(nodes[c], s, e), rest = g.length - a;
        jumps++;
        if (rest >= L) {
          pt = { node: c, child: -1, k: 0 };
          push({ line, msg: `Прыжок по счётчику: осталось ${rest} симв., ребро ${SS(lab)} длины ${L} ≤ ${rest} — перепрыгиваем, не сравнивая.`, hl: { cur: c } });
          cur = c; a += L;
        } else {
          pt = { node: cur, child: c, k: rest };
          push({ line, msg: `Осталось ${rest} симв. < длины ребра ${SS(lab)} — останавливаемся внутри него.`, hl: { on: c, k: rest } });
          a = g.length;
        }
      }
    };

    push({ line: 0, big: true, msg: `ms(i) — длина наибольшей подстроки T, начинающейся в позиции i, которая встречается где-то в P. Строим суффиксное дерево только для P$ = ${SS(str)} (O(|P|)) вместе с суффиксными связями и идём по T один раз.`, hl: {} });
    for (i = 1; i <= n; i++) {
      if (i === 1) push({ line: 1, big: true, msg: 'i = 1: спускаемся от корня по символам T, пока они совпадают.', hl: { cur: 0 } });
      else {
        const dPrev = ms[i - 2];
        if (dPrev === 0) {
          pt = { node: 0, child: -1, k: 0 };
          q = i;
          push({ line: [2, 3], big: true, msg: `i = ${i}: ms(${i - 1}) = 0, совпадений не было — начинаем от корня с T[${i}].`, hl: { cur: 0 } });
        } else {
          const matched = T.slice(i - 2, i - 2 + dPrev);
          if (pt.child < 0) {
            const v = pt.node, sv = nodes[v].sl;
            links++;
            pt = { node: sv, child: -1, k: 0 };
            push({ line: [2, 3, 4], big: true, msg: `i = ${i}: совпавшая часть ${SS(matched)} кончается в ${nm(v)}. По его суффиксной связи переходим в ${nm(sv)} — там кончается ${SS(matched.slice(1))}, γ пустая.`, hl: { cur: sv, link: [v, sv] } });
          } else {
            const v = pt.node, gamma = ST.label(nodes[pt.child], s, e).slice(0, pt.k);
            push({ line: [2, 3], big: true, msg: `i = ${i}: совпавшая часть ${SS(matched)} кончается посреди ребра. Поднимаемся к ${nm(v)}, γ = ${SS(gamma)}.`, hl: { cur: v } });
            if (v === 0) {
              const beta = matched.slice(1);
              push({ line: 5, msg: `${nm(v)} — корень, связи нет. Спускаемся от корня по ${SS(beta)} (совпавшая часть без первого символа) прыжками по счётчику.`, hl: { cur: 0 } });
              skip(0, beta, 5);
            } else {
              const sv = nodes[v].sl;
              links++;
              push({ line: 4, msg: `Переходим по суффиксной связи ${nm(v)} → ${nm(sv)} и спускаемся по γ = ${SS(gamma)} прыжками по счётчику.`, hl: { cur: sv, link: [v, sv] } });
              skip(sv, gamma, 4);
            }
          }
          push({ line: 6, msg: `Нашли в дереве ${SS(matched.slice(1))} = T[${i}..${q - 1}] без единого сравнения. Продолжаем сравнивать с T[${q}].`, hl: hlOf(pt) });
        }
      }
      matchFrom();
      ms[i - 1] = q - i;
      push({ line: 7, msg: `ms(${i}) = ${q - i}${q > i ? `: T[${i}..${q - 1}] = ${SS(T.slice(i - 1, q - 1))} встречается в P, а с ещё одним символом — нет` : ''}.`, hl: hlOf(pt), setI: i });
    }
    i = n;
    const occ = [], mx = Math.max(...ms), at = ms.indexOf(mx) + 1;
    ms.forEach((v, k) => { if (v === m) occ.push(k + 1); });
    push({ line: 8, big: true, done: true, msg: `Готово за O(|T|): сравнений ${cmp}. Применения: P входит в T с позиции i ⇔ ms(i) = |P| = ${m} → ${occ.length ? 'вхождения ' + occ.join(', ') : 'вхождений нет'}. Наибольшая общая подстрока T и P — max ms(i) = ${mx}: ${SS(T.slice(at - 1, at - 1 + mx))} (с позиции ${at}). Память — только дерево для P.`, hl: {}, occ, best: [at, mx] });
    return F;
  }
  function renderMS(f) {
    const n = f.T.length;
    const lo = f.i, hi = f.q - 1;
    const occ = f.occ || [];
    let h = App.strip(n, [
      { type: 'idx', n, base: 1 },
      {
        type: 'chars', label: 'T', chars: f.T,
        cell: (k) => {
          const p = k + 1;
          if (f.done) return f.best && p >= f.best[0] && p < f.best[0] + f.best[1] ? 'blk' : '';
          if (p === f.cmpAt) return (f.eq ? 'ok' : 'bad') + ' focus';
          return p >= lo && p <= hi ? 'blk' : '';
        },
      },
      { type: 'nums', label: 'ms', values: f.ms, cell: (k) => (k + 1 === f.setI ? 'new' : f.done && occ.includes(k + 1) ? 'src' : '') },
    ]);
    h += `<div class="chips"><b>P$:</b><span>${esc(f.str)}</span></div>`;
    return h + App.tree(ST.model(f.nodes, f.s, f.e, f.hl || {}, {}));
  }

  App.register({
    id: 'stapps', block: 4, num: 20, title: 'Приложения суффиксного дерева',
    full: '20. Приложения суффиксного дерева: поиск подстроки в строке, поиск набора подстрок, поиск в базе образцов, поиск наибольшей общей подстроки двух и большего числа строк, статистика совпадений.',
    modes: [
      {
        id: 'ms', label: 'Статистика совпадений',
        note: 'Пример с лекции: P = BAOBAB, T = AOBBAOABABBA, ответ ms = 3 2 1 3 2 1 2 3 2 1 2 1.',
        inputs: [
          { id: 'P', label: 'P (по нему строим дерево)', value: 'BAOBAB', max: 9, w: 10 },
          { id: 'T', label: 'Текст T', value: 'AOBBAOABABBA', max: 18, w: 16 },
        ],
        validate: (v) => noTerm('P')(v) || noTerm('T')(v),
        presets: [
          { label: 'BAOBAB / AOBBAOABABBA', v: { P: 'BAOBAB', T: 'AOBBAOABABBA' } },
          { label: 'abcab / xabcabcab', v: { P: 'abcab', T: 'xabcabcabz' } },
          { label: 'aabab / babaabaab', v: { P: 'aabab', T: 'babaabaab' } },
        ],
        legend: [['blk', 'совпавшая часть T[i..]'], ['ok', 'символ совпал'], ['bad', 'не совпал'], ['new', 'записали ms(i)'], ['sl', 'суффиксная связь']],
        code: [
          'построить суффиксное дерево P$ с суффиксными связями',
          'i = 1: спуск от корня по T, пока символы совпадают',
          'for i = 2 .. |T|:',
          '  от конца совпавшей части подняться к узлу v (≤ 1 ребро), γ — метка',
          '  v ≠ корень: v → s(v), спуск по γ прыжками по счётчику',
          '  v = корень: спуск по совпавшей части без 1-го символа прыжками',
          '  дальше сравниваем символы T после совпавшей части',
          '  ms(i) = длина совпавшей части',
          'вхождения P: ms(i) = |P|;  общая подстрока: max ms(i)',
        ],
        run: runMS, render: renderMS,
      },
      {
        id: 'search', label: 'Поиск образцов в тексте',
        inputs: [
          { id: 'T', label: 'Текст T', value: 'abcabxabcd', max: 14, w: 14 },
          { id: 'Ps', label: 'Образцы (через запятую)', type: 'list', value: ['abc', 'bx', 'cab', 'bd'], max: 6, maxItems: 4, w: 14 },
        ],
        validate: (v) => noTerm('T')(v) || noTerm('Ps')(v),
        presets: [
          { label: 'abcabxabcd', v: { T: 'abcabxabcd', Ps: ['abc', 'bx', 'cab', 'bd'] } },
          { label: 'banana', v: { T: 'banana', Ps: ['ana', 'na', 'nab'] } },
          { label: 'mississippi', v: { T: 'mississippi', Ps: ['issi', 'ss', 'pi', 'sip'] } },
        ],
        legend: [['ok', 'совпало / вхождение'], ['bad', 'несовпадение'], ['blk', 'путь спуска']],
        code: [
          'построить суффиксное дерево T$ (Укконен, O(n))',
          'for каждый образец Pₖ:',
          '  спуститься от корня по символам Pₖ',
          '  не смогли пройти Pₖ целиком → Pₖ не входит в T',
          '  иначе: листья поддерева под концом Pₖ — все вхождения',
        ],
        run: runSearch, render: renderSearch,
      },
      {
        id: 'db', label: 'Поиск в базе образцов',
        inputs: [
          { id: 'Db', label: 'Строки базы (через запятую)', type: 'list', value: ['abab', 'babb', 'aabb'], max: 6, maxItems: 4, w: 16 },
          { id: 'Q', label: 'Запрос Q', value: 'ab', max: 6, w: 8 },
        ],
        validate: (v) => noTerm('Db')(v) || noTerm('Q')(v),
        presets: [
          { label: 'abab, babb, aabb / ab', v: { Db: ['abab', 'babb', 'aabb'], Q: 'ab' } },
          { label: '… / bb', v: { Db: ['abab', 'babb', 'aabb'], Q: 'bb' } },
          { label: 'cat, act, tac / ac', v: { Db: ['cat', 'act', 'tac'], Q: 'ac' } },
        ],
        legend: [['ok', 'совпало / найденные листья'], ['bad', 'несовпадение']],
        code: [
          'обобщённое суффиксное дерево S₁$ S₂# … (O(Σ|Sᵢ|), один раз)',
          'для запроса Q: спуститься от корня по Q',
          '  символы совпадают — идём дальше',
          '  не прошли Q целиком → Q не подстрока ни одной строки',
          '  иначе: номера строк в листьях поддерева — ответ',
        ],
        run: runDB, render: renderDB,
      },
      {
        id: 'lcs', label: 'Наибольшая общая подстрока',
        inputs: [{ id: 'Ss', label: 'Строки (2–4, через запятую)', type: 'list', value: ['xabxac', 'abxab', 'babxa'], max: 7, maxItems: 4, w: 20 }],
        validate: (v) => (v.Ss.length < 2 ? 'Нужно хотя бы две строки.' : noTerm('Ss')(v)),
        presets: [
          { label: 'xabxac, abxab, babxa', v: { Ss: ['xabxac', 'abxab', 'babxa'] } },
          { label: 'две строки', v: { Ss: ['abcab', 'bcabd'] } },
          { label: 'четыре строки', v: { Ss: ['abab', 'baba', 'aabb', 'bbab'] } },
        ],
        legend: [['new', 'текущий узел'], ['ok', 'ответ']],
        code: [
          'обобщённое суффиксное дерево строк S₁ … S_K',
          'обход снизу вверх (post-order):',
          '  лист строки i: C = {i};  внутренний v: C(v) = ∪ C(детей)',
          '  d(v) = строковая глубина (длина метки пути)',
          '  для k ≤ |C(v)|: если d(v) > l(k) — запомнить v',
          'ответ для k строк: метка пути до узла с l(k)',
        ],
        run: runLCS, render: renderLCS,
      },
    ],
    theory: `
<p>Во всех задачах сначала строим суффиксное дерево за линейное время (алгоритм Укконена, билет 19), а потом отвечаем на вопросы спуском по дереву или его обходом. Индексы с 1.</p>

<h3>Поиск подстроки в строке</h3>
<p>Строим суффиксное дерево T$ за O(n). Чтобы найти P (|P| = m), спускаемся от корня по символам P. Если пройти P целиком не удалось — P не входит в T. Иначе каждый лист поддерева под концом пути P — суффикс T, начинающийся с P, то есть вхождение.</p>
<p>Время O(n + m + z), где z — число вхождений. Обход поддерева стоит O(z): у каждого внутреннего узла ≥ 2 детей, поэтому в поддереве с z листьями меньше z внутренних узлов.</p>
<p>Можно наоборот: построить дерево для P и прогнать через него T (см. статистику совпадений). Это выгодно, когда P короткий, а T длинный или приходит потоком.</p>

<h3>Поиск набора подстрок</h3>
<p>Даны образцы P<sub>1</sub>, …, P<sub>k</sub> суммарной длины M. Строим дерево T$ один раз и ищем каждый образец спуском: O(n + M + z) — та же оценка, что у Ахо-Корасика. Разница в подходе: Ахо-Корасик предобрабатывает образцы, а суффиксное дерево — текст. Поэтому оно удобно, когда текст фиксирован, а образцы приходят по одному.</p>

<h3>Обобщённое суффиксное дерево</h3>
<div class="def">Суффиксное дерево набора строк S<sub>1</sub>, …, S<sub>k</sub>: строим дерево строки S<sub>1</sub>$<sub>1</sub>S<sub>2</sub>$<sub>2</sub>…S<sub>k</sub>$<sub>k</sub> с различными терминаторами и обрезаем метку каждого листового ребра сразу после первого терминатора. Лист помечаем парой (номер строки, позиция). Время O(Σ|S<sub>i</sub>|). Можно и по-другому: строить Укконеном сначала S<sub>1</sub>, затем пропускать через дерево S<sub>2</sub> и продолжать построение.</div>

<h3>Поиск в базе образцов</h3>
<p>База строк S<sub>1</sub>, …, S<sub>k</sub> известна заранее, запросы приходят потом: по строке Q нужно найти все строки базы, которые содержат Q как подстроку. Строим обобщённое суффиксное дерево базы за O(Σ|S<sub>i</sub>|). Запрос: спускаемся по Q; номера строк в листьях поддерева — ответ. Время запроса O(|Q| + z). Если заранее записать в каждый узел список строк его поддерева, то O(|Q| + k′), где k′ — число строк в ответе.</p>

<h3>Наибольшая общая подстрока двух строк</h3>
<p>Строим обобщённое дерево S<sub>1</sub>$<sub>1</sub>S<sub>2</sub>$<sub>2</sub>. Подстрока α общая ⇔ под концом пути α есть листья обеих строк. Обходом снизу вверх помечаем внутренние узлы, в поддереве которых есть листья обеих строк, и считаем строковую глубину узлов. Ответ — метка пути до помеченного узла наибольшей строковой глубины. Время O(|S<sub>1</sub>| + |S<sub>2</sub>|).</p>

<h3>Наибольшая общая подстрока K строк</h3>
<p>Для каждого узла v считаем C(v) — число различных строк, листья которых есть в поддереве v. l(k) — наибольшая строковая глубина узла с C(v) ≥ k; метка пути до этого узла — самая длинная подстрока, общая хотя бы k строкам. Наивное объединение множеств даёт O(K·n), где n = Σ|S<sub>i</sub>|. Хуэй предложил считать C(v) через LCA за O(n), тогда вся таблица l(k) строится за O(n).</p>

<h3>Статистика совпадений</h3>
<div class="def"><b>ms(i)</b> — длина наибольшей подстроки T, начинающейся в позиции i, которая встречается где-то в P.</div>
<p><b>Вычисление.</b> Строим суффиксное дерево P$ с суффиксными связями. ms(1): спускаемся от корня по T, пока символы совпадают. Переход от i к i + 1 — как в Укконене. Совпавшая часть xβ кончается в некоторой точке дерева. Поднимаемся от неё не больше чем на одно ребро к узлу v, γ — пройденная метка. Если v — не корень, идём по связи s(v) и спускаемся по γ прыжками по счётчику; если v — корень, спускаемся по β. Мы оказались в конце β = T[i+1..i+ms(i)−1] без единого сравнения символов и дальше сравниваем посимвольно.</p>
<div class="thm"><b>Теорема.</b> Все значения ms(i) вычисляются за O(|T|) после построения дерева за O(|P|).</div>
<div class="proof">
<p>Правый конец совпавшей части i + ms(i) никогда не уменьшается. Каждое удачное сравнение сдвигает его на 1, поэтому удачных сравнений ≤ |T|. Неудачное сравнение — не больше одного на каждое i. Прыжки оцениваем, как в Укконене: за один шаг i глубина узла уменьшается не больше чем на 2 (подъём на ребро и суффиксная связь), каждый прыжок её увеличивает, а глубина ≤ |P|. Итого O(|T|).</p>
</div>
<p><b>Применения.</b></p>
<ul>
<li>Поиск подстроки: P входит в T с позиции i ⇔ ms(i) = |P|. Памяти нужно только на дерево для P, текст можно читать потоком.</li>
<li>Наибольшая общая подстрока T и P: max ms(i), сама подстрока — T[i..i+ms(i)−1].</li>
</ul>
<p class="note">Почитать: Гасфилд, гл. 7.</p>`,
    quiz: {
      intro: 'Посчитай статистику совпадений ms(i) текста T относительно образца P (индексы с 1).',
      sLabel: 'T', base: 1, len: 10,
      ctx: (alpha) => App.randStr(alpha, 5),
      arrays: (s, P) => [{ key: 'ms', label: 'ms', ans: [...s].map((_, i) => { let k = 0; while (i + k < s.length && P.includes(s.slice(i, i + k + 1))) k++; return String(k); }) }],
    },
  });
})(window.App);
