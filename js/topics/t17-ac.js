/* Билет 17. Алгоритм Ахо-Корасик: бор, суффиксные (fail) и словарные (out) ссылки, поиск. */
(function (App) {
  'use strict';
  const { c: C, s: SS, sub } = App.fmt;
  const keys = (o) => Object.keys(o).sort(App.chCmp);

  function run({ Ps, T }) {
    const pats = [...new Set(Ps)];
    const n = T.length, F = [];
    const nodes = [{ id: 0, d: 0, par: -1, c: '', ch: {}, fail: null, out: null, term: [], str: '' }];
    const snap = () => nodes.map((x) => ({ ...x, ch: { ...x.ch }, term: x.term.slice() }));
    const found = [];
    let fails = 0;
    const nm = (v) => (v === 0 ? 'корень' : `узел ${v} (${SS(nodes[v].str)})`);
    const push = (o) => F.push({ nodes: snap(), found: found.slice(), pats, ...o });
    const Pn = (k) => `P${sub(k + 1)}`;

    /* 1. бор */
    push({ phase: 'Бор', line: 0, msg: `Строим бор (trie) из ${pats.length} образцов: ${pats.map((p, k) => `${Pn(k)} = ${SS(p)}`).join(', ')}. Корень соответствует пустой строке; каждый узел — префиксу какого-то образца.`, cur: 0, big: true });
    pats.forEach((p, k) => {
      let v = 0;
      push({ phase: 'Бор', line: [1, 2], msg: `Добавляем ${Pn(k)} = ${SS(p)}: идём от корня по его символам.`, cur: 0, big: true });
      const path = [0];
      for (const c of p) {
        if (nodes[v].ch[c] != null) {
          v = nodes[v].ch[c];
          path.push(v);
          push({ phase: 'Бор', line: 3, msg: `Переход по ${C(c)} уже есть → ${nm(v)}. Общий префикс образцов хранится один раз.`, cur: v, path: path.slice() });
        } else {
          const u = nodes.length;
          nodes.push({ id: u, d: nodes[v].d + 1, par: v, c, ch: {}, fail: null, out: null, term: [], str: nodes[v].str + c });
          nodes[v].ch[c] = u;
          v = u;
          path.push(v);
          push({ phase: 'Бор', line: 3, msg: `Перехода по ${C(c)} нет — создаём ${nm(u)}.`, cur: u, path: path.slice(), fresh: u });
        }
      }
      nodes[v].term.push(k);
      push({ phase: 'Бор', line: 4, msg: `${nm(v)} — конец ${Pn(k)}: помечаем его терминальным.`, cur: v, path: path.slice() });
    });

    /* 2. ссылки обходом в ширину */
    const q = [];
    for (const c of keys(nodes[0].ch)) { const u = nodes[0].ch[c]; nodes[u].fail = 0; q.push(u); }
    push({ phase: 'Ссылки', line: 5, msg: 'Суффиксные ссылки fail(v) — на узел наибольшего собственного суффикса строки v, который есть в боре. Строим их обходом в ширину: ссылка узла указывает на менее глубокий узел, чья ссылка уже готова. У детей корня fail = корень (собственный суффикс одного символа — пустая строка).', queue: q.slice(), big: true });
    while (q.length) {
      const v = q.shift();
      for (const c of keys(nodes[v].ch)) {
        const u = nodes[v].ch[c];
        q.push(u);
        let w = nodes[v].fail;
        const visit = [w];
        push({ phase: 'Ссылки', line: [6, 7], msg: `Узел ${u} = ${SS(nodes[u].str)}: родитель ${v}, последний символ ${C(c)}. Кандидаты на fail — переходы по ${C(c)} из узлов цепочки fail(${v}), fail(fail(${v})), … Начинаем с w = fail(${v}) = ${w === 0 ? 'корень' : w}.`, cur: u, visit: visit.slice(), queue: q.slice() });
        while (w !== 0 && nodes[w].ch[c] == null) {
          const w2 = nodes[w].fail;
          visit.push(w2);
          push({ phase: 'Ссылки', line: 8, msg: `Из ${nm(w)} нет перехода по ${C(c)} → w = fail(${w}) = ${w2 === 0 ? 'корень' : w2}.`, cur: u, visit: visit.slice(), queue: q.slice(), hot: [w, w2] });
          w = w2;
        }
        const t = nodes[w].ch[c] != null && nodes[w].ch[c] !== u ? nodes[w].ch[c] : 0;
        nodes[u].fail = t;
        push({ phase: 'Ссылки', line: 9, msg: t
          ? `Из ${nm(w)} есть переход по ${C(c)} → fail(${u}) = ${t}: ${SS(nodes[t].str)} — наибольший собственный суффикс ${SS(nodes[u].str)}, который есть в боре.`
          : `Ни в одном узле цепочки (включая корень) нет подходящего перехода по ${C(c)} → fail(${u}) = корень.`,
        cur: u, visit: visit.slice(), queue: q.slice(), hot: [u, t], big: true });
        nodes[u].out = nodes[t].term.length ? t : nodes[t].out;
        if (nodes[u].out != null)
          push({ phase: 'Ссылки', line: 10, msg: `Словарная ссылка: ${nodes[t].term.length ? `fail(${u}) = ${t} — терминальный` : `fail(${u}) = ${t} не терминальный, берём out(${t})`} → out(${u}) = ${nodes[u].out} (${SS(nodes[nodes[u].out].str)}). Попав в узел ${u}, мы найдём и этот образец — он суффикс текущей строки.`,
            cur: u, queue: q.slice(), hotOut: [u, nodes[u].out] });
      }
    }
    push({ phase: 'Ссылки', line: 10, msg: 'Все ссылки построены. Теперь бор — автомат: читаем текст по одному символу.', big: true });

    /* 3. поиск */
    let v = 0;
    push({ phase: 'Поиск', line: 11, msg: `Идём по тексту T длины ${n}, начиная из корня.`, cur: 0, pos: -1, big: true });
    for (let c = 0; c < n; c++) {
      const x = T[c];
      while (v !== 0 && nodes[v].ch[x] == null) {
        const w = nodes[v].fail;
        fails++;
        push({ phase: 'Поиск', line: [12, 13], msg: `T[${c}] = ${C(x)}: из ${nm(v)} нет перехода по ${C(x)} → идём по fail-ссылке в ${w === 0 ? 'корень' : w}. Глубина уменьшается с ${nodes[v].d} до ${nodes[w].d}.`, cur: v, pos: c, hot: [v, w], fails });
        v = w;
      }
      let msg;
      if (nodes[v].ch[x] != null) { v = nodes[v].ch[x]; msg = `T[${c}] = ${C(x)}: переходим в ${nm(v)}.`; }
      else msg = `T[${c}] = ${C(x)}: даже из корня перехода нет — остаёмся в корне.`;
      const outs = [];
      if (nodes[v].term.length) outs.push(v);
      for (let o = nodes[v].out; o != null; o = nodes[o].out) outs.push(o);
      const got = [];
      for (const u of outs) for (const k of nodes[u].term) { found.push({ k, end: c, start: c - pats[k].length + 1 }); got.push(`${Pn(k)} = ${SS(pats[k])} в позиции ${c - pats[k].length + 1}`); }
      if (got.length) msg += ` Выдаём ${outs.length > 1 || !nodes[v].term.length ? 'по цепочке словарных ссылок ' : ''}: ${got.join('; ')}.`;
      push({ phase: 'Поиск', line: got.length ? [14, 15] : 14, msg, cur: v, pos: c, outNodes: outs, fails, big: got.length > 0 });
    }
    push({ phase: 'Итог', line: [], msg: `Готово. Найдено вхождений: ${found.length}. Переходов по fail: ${fails} ≤ n = ${n}: глубина растёт максимум на 1 за символ, а каждый fail её уменьшает.`, cur: v, pos: n, fails, big: true });
    return F;
  }

  function render(f, v) {
    const { T } = v, n = T.length;
    const pats = f.pats;
    const P = (k) => `P${sub(k + 1)}`;
    let h = '';
    if (f.pos != null) {
      h += App.strip(n, [
        { type: 'idx', n },
        { type: 'chars', label: 'T', chars: T, cell: (j) => (j === f.pos ? 'blk focus' : j < f.pos ? '' : 'dim') },
        { type: 'spans', items: f.found.map((o) => ({ from: o.start, to: o.end, text: P(o.k), cls: 'occ' })) },
      ]);
    } else {
      h += `<div class="chips"><b>Образцы:</b>${pats.map((p, k) => `<span>${P(k)} = ${App.esc(p)}</span>`).join('')}</div>`;
    }
    const N = {};
    const visit = new Set(f.visit || []), path = new Set(f.path || []), outN = new Set(f.outNodes || []);
    for (const x of f.nodes) {
      const cls = [];
      if (x.id === f.cur) cls.push('cur');
      else if (outN.has(x.id)) cls.push('out');
      else if (visit.has(x.id)) cls.push('visit');
      else if (x.id === f.fresh) cls.push('new');
      else if (path.has(x.id)) cls.push('path');
      if (x.term.length) cls.push('term');
      N[x.id] = {
        kids: keys(x.ch).map((c) => x.ch[c]),
        parent: x.par,
        edge: x.id ? [{ t: x.c }] : null,
        shape: x.id === 0 ? 'root' : 'circle',
        text: x.id === 0 ? '' : String(x.id),
        tag: x.id === 0 ? 'корень' : `${App.esc(x.str)}${x.term.length ? ' <tspan class="t">' + x.term.map(P).join(',') + '</tspan>' : ''}`,
        cls: cls.join(' '),
        ecls: path.has(x.id) && x.id !== 0 ? 'path' : x.id === f.fresh ? 'new' : '',
      };
    }
    const links = [];
    const hot = f.hot || [], hotOut = f.hotOut || [];
    for (const x of f.nodes) {
      if (x.fail != null && x.id !== 0) {
        const isHot = hot[0] === x.id && hot[1] === x.fail;
        if (x.fail !== 0 || v.root || isHot) links.push({ from: x.id, to: x.fail, kind: 'sl', cls: isHot ? 'hot' : '' });
      }
      if (x.out != null && v.out) links.push({ from: x.id, to: x.out, kind: 'out', cls: hotOut[0] === x.id ? 'hot' : '' });
    }
    if (hot.length && !(f.nodes[hot[0]] && f.nodes[hot[0]].fail === hot[1])) links.push({ from: hot[0], to: hot[1], kind: 'sl', cls: 'hot' });
    h += App.tree({ root: 0, nodes: N, links, rowH: 50, padB: 30, tagW: 70, aria: 'бор Ахо-Корасик' });
    if (f.queue) h += `<div class="chips"><b>Очередь BFS:</b>${f.queue.length ? f.queue.map((u) => `<span>${u}</span>`).join('') : '<span>пусто</span>'}</div>`;
    return h;
  }

  App.register({
    id: 'ac', block: 3, num: 17, title: 'Ахо-Корасик',
    full: '17. Алгоритм Ахо-Корасик. Доказательство линейности алгоритма. Приложения алгоритма.',
    modes: [{
      id: 'main', label: 'Построение и поиск',
      inputs: [
        { id: 'Ps', label: 'Образцы (через запятую)', type: 'list', value: ['he', 'she', 'his', 'hers'], max: 8, maxItems: 6, w: 16 },
        { id: 'T', label: 'Текст T', value: 'ahishers', max: 30, w: 16 },
        { id: 'root', label: 'показывать fail-ссылки в корень', type: 'check', value: false },
        { id: 'out', label: 'словарные ссылки', type: 'check', value: true },
      ],
      presets: [
        { label: 'he, she, his, hers', v: { Ps: ['he', 'she', 'his', 'hers'], T: 'ahishers' } },
        { label: 'potato, tattoo…', v:{ Ps: ['potato', 'tattoo', 'theater', 'other'], T: 'otheratattoo' } },
        { label: 'вложенные', v: { Ps: ['a', 'ab', 'bab', 'bc', 'bca', 'c', 'caa'], T: 'abccab' } },
        { label: 'aab, aba, baa', v: { Ps: ['aab', 'aba', 'baa', 'b'], T: 'aabaabaa' } },
      ],
      legend: [['new', 'текущий узел'], ['skip', 'проверяемая цепочка fail'], ['ok', 'выдаётся образец'], ['sl', 'fail-ссылка'], ['out', 'словарная ссылка']],
      code: [
        'корень = пустая строка',
        'for каждый образец Pₖ:',
        '  v = корень',
        '  for c in Pₖ:  v = переход(v, c) или новый узел',
        '  v.терминальный = k',
        'fail(дети корня) = корень;  очередь = дети корня',
        'BFS: для узла v и ребёнка u = v·c:',
        '  w = fail(v)',
        '  while w ≠ корень and нет перехода(w, c): w = fail(w)',
        '  fail(u) = переход(w, c), если есть, иначе корень',
        '  out(u) = fail(u), если он терминальный, иначе out(fail(u))',
        'v = корень',
        'for c = 0 .. n − 1:',
        '  while v ≠ корень and нет перехода(v, T[c]): v = fail(v)',
        '  if есть переход(v, T[c]): v = переход(v, T[c])',
        '  выдать образцы v и всей цепочки out(v), out(out(v)), …',
      ],
      run, render,
    }],
    theory: `
<h3>Задача</h3>
<p>Дан набор образцов P<sub>1</sub>, …, P<sub>k</sub> суммарной длины M и текст T длины n. Нужно найти все вхождения всех образцов. Запускать КМП k раз — O(k·n + M); Ахо-Корасик делает всё за один проход: O(n + M + z), где z — число вхождений.</p>

<h3>Бор (trie)</h3>
<p>Строим бор образцов: каждый узел соответствует префиксу какого-то образца, рёбра помечены символами, из узла не выходят два ребра с одинаковой меткой. Узел, на котором заканчивается P<sub>i</sub>, помечаем терминальным. Время O(M).</p>

<h3>Суффиксные (fail) ссылки</h3>
<div class="def"><b>fail(v)</b> — узел, соответствующий наибольшему собственному суффиксу строки v, который есть в боре (то есть является префиксом какого-то образца). Для корня и его детей fail = корень. Это обобщение префикс-функции КМП с одного образца на бор.</div>
<p>Считаем обходом в ширину (fail ведёт в менее глубокий узел, чья ссылка уже готова). Для ребёнка u = v·c идём по цепочке w = fail(v), fail(fail(v)), … до первого узла, у которого есть переход по c; тогда fail(u) = переход(w, c). Если такого нет даже у корня — fail(u) = корень.</p>
<div class="def"><b>Словарная (выходная) ссылка out(v)</b> — ближайший терминальный узел на цепочке fail(v), fail(fail(v)), …: out(v) = fail(v), если он терминальный, иначе out(fail(v)). Нужна, чтобы найти образцы, которые являются суффиксами текущей строки (например, he внутри she), не проходя всю цепочку fail.</div>

<h3>Поиск</h3>
<p>Идём по тексту, находясь в узле v (изначально корень). Для символа x = T[c]: пока из v нет перехода по x и v ≠ корень, переходим v = fail(v). Затем переходим по x, если можно (иначе остаёмся в корне). Сообщаем образцы узла v и всех узлов цепочки словарных ссылок.</p>
<p>Инвариант: строка узла v — наибольший суффикс прочитанного текста T[0..c], который есть в боре. Поэтому любое вхождение образца, заканчивающееся в c, — суффикс строки v, и его найдёт цепочка out-ссылок.</p>

<h3>Доказательство линейности</h3>
<div class="thm"><b>Теорема.</b> Построение бора и ссылок — O(M), поиск — O(n + z).</div>
<div class="proof">
<p><b>Поиск.</b> Пусть d — глубина текущего узла. При чтении символа d растёт не больше чем на 1, а каждый переход по fail уменьшает d хотя бы на 1 (суффикс короче). Так как d ≥ 0, суммарное число переходов по fail не больше суммарного роста, то есть ≤ n. Каждый шаг по словарной ссылке выдаёт новое вхождение — всего z шагов. Итого O(n + z).</p>
<p><b>Ссылки.</b> Применим тот же аргумент к каждому образцу отдельно. Рассмотрим узлы на пути P<sub>i</sub> от корня: глубина fail-узла при переходе к следующему символу растёт не больше чем на 1, а каждый шаг цепочки в цикле while её уменьшает. Значит, на путь P<sub>i</sub> тратится O(|P<sub>i</sub>|), а на весь бор — O(M). Словарные ссылки считаются за O(1) на узел.</p>
<p class="note">Оценки даны для фиксированного алфавита; иначе переходы хранят в словаре или массиве размера |Σ|.</p>
</div>

<h3>Приложения</h3>
<ul>
<li><b>Поиск словаря.</b> Много образцов за один проход по тексту: антивирусные сигнатуры, фильтры слов, поиск мотивов в ДНК.</li>
<li><b>Поиск образца с джокерами.</b> P содержит символ φ, совпадающий с любым. Разбиваем P по φ на куски P<sub>1</sub>, …, P<sub>k</sub> с начальными позициями l<sub>1</sub>, …, l<sub>k</sub> в P. Ищем куски Ахо-Корасиком. Когда кусок P<sub>i</sub> найден, начиная с позиции s текста, увеличиваем счётчик C[s − l<sub>i</sub>]. Позиции, где C = k, — вхождения P. Время O(n + m + z), где z — число вхождений кусков (≤ k·n).</li>
<li><b>Двумерный поиск</b> (Бейкер — Бёрд): строки матрицы-образца — словарь для Ахо-Корасика. Каждую клетку текста-матрицы помечаем номером строки образца, которая в ней заканчивается, затем ищем КМП по столбцам последовательность номеров строк образца.</li>
</ul>`,
  });
})(window.App);
