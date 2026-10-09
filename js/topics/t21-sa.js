/* Билет 21. Суффиксные массивы: построение по суффиксному дереву, поиск подстроки (наивный и с LCP). Индексы с 1. */
(function (App) {
  'use strict';
  const ST = App.st, esc = App.esc, { c: C, s: SS } = App.fmt;
  const asc = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const lcpS = (a, b) => { let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; };
  const suffixArray = (T) => [...T].map((_, i) => i + 1).sort((a, b) => asc(T.slice(a - 1), T.slice(b - 1)));
  const noDollar = (v) => (/\$/.test(v.T) || (v.P && /\$/.test(v.P)) ? 'Символ $ зарезервирован под терминатор.' : null);
  const strCells = (w, cls) => `<span class="str">${[...w].map((ch, k) => `<b class="${cls ? cls(k) : ''}">${esc(ch)}</b>`).join('')}</span>`;

  /* ---------- режим 1: построение по суффиксному дереву ---------- */
  function runTree({ T }) {
    const str = T + '$', s = ' ' + str, e = str.length, nodes = ST.build(str, '$', true).nodes;
    const SA = [], LCP = [], done = new Set(), tags = {}, F = [];
    let pending = null;
    const marks = () => Object.fromEntries([...done].map((v) => [v, 'out']));
    const push = (o) => F.push({ nodes, s, e, str, SA: SA.slice(), LCP: LCP.slice(), tags: { ...tags }, vars: [['найдено суффиксов', SA.length]], ...o });
    push({ line: 0, big: true, msg: `Строим суффиксное дерево T$ (Укконен, O(n)). Символ $ считаем меньше всех букв. Суффиксный массив — номера листьев в порядке обхода в глубину, когда детей каждого узла перебираем по алфавиту.`, hl: {} });
    (function dfs(v) {
      const x = nodes[v];
      if (x.leaf) {
        done.add(v);
        const l = SA.length ? pending : null;
        SA.push(x.leaf);
        if (l != null) LCP.push(l);
        push({ line: l != null ? [2, 3] : 2, big: true, msg: `Лист ${x.leaf}: суффикс ${SS(str.slice(x.leaf - 1))} — следующий по алфавиту, SA ← ${x.leaf}.` + (l != null ? ` Lcp с предыдущим суффиксом = ${l}: это строковая глубина узла, где обход свернул на новое ребро (их наименьший общий предок).` : ''), hl: { cur: v, mark: marks() }, newRow: SA.length });
        return;
      }
      const d = ST.depth(nodes, v, e);
      if (v) tags[v] = `d=${d}`;
      const kids = Object.keys(x.ch).sort(asc);
      push({ line: 1, msg: `${v ? `${ST.name(nodes, v)} (путь ${SS(ST.pathStr(nodes, v, s, e))}, строковая глубина d = ${d})` : 'Корень'}: дети по алфавиту — ${kids.map((k) => C(k)).join(' ')}. Рёбра из узла начинаются с разных символов, поэтому порядок рёбер = порядок суффиксов в поддеревьях.`, hl: { cur: v, mark: marks() } });
      kids.forEach((c, i) => { if (i > 0) pending = d; dfs(x.ch[c]); });
    })(0);
    push({ line: 4, big: true, done: true, msg: `Обход закончен: SA с терминатором = [${SA.join(', ')}]. Первым всегда идёт суффикс «$» (лист ${str.length}) — отбрасываем его: SA = [${SA.slice(1).join(', ')}], Lcp соседних = [${LCP.slice(1).join(', ')}]. Всё за O(n).`, hl: { mark: marks() } });
    return F;
  }
  function renderTree(f) {
    let h = App.strip(f.str.length, [{ type: 'idx', n: f.str.length, base: 1 }, { type: 'chars', label: 'T$', chars: f.str }]);
    h += App.tree({ ...ST.model(f.nodes, f.s, f.e, { ...(f.hl || {}), tags: f.tags }, { cmp: asc }), rowH: 38, padB: 30 });
    if (f.SA.length) {
      h += `<table class="sa"><tr><th>k</th><th>SA[k]</th><th>Lcp(k−1, k)</th><th>суффикс</th></tr>`;
      f.SA.forEach((p, k) => {
        const drop = f.done && k === 0;
        h += `<tr class="${k + 1 === f.newRow ? 'on' : ''}${drop ? ' dim' : ''}"><td class="num">${k + 1}</td><td class="num">${p}</td><td class="num">${k ? f.LCP[k - 1] : '—'}</td><td class="lft">${strCells(f.str.slice(p - 1))}</td></tr>`;
      });
      h += '</table>';
    }
    return h;
  }

  /* ---------- режим 2: поиск подстроки ---------- */
  function runSearch({ T, P, method }) {
    const n = T.length, m = P.length, SA = suffixArray(T), F = [];
    const suf = (k) => T.slice(SA[k - 1] - 1);
    const LCP = (i, j) => lcpS(suf(i), suf(j));
    const adj = SA.map((_, k) => (k ? LCP(k, k + 1) : null));
    let L = 1, R = n, M = null, l = null, r = null, cmp = 0, it = 0, found = null;
    const fast = method === 'lcp';
    const push = (o) => F.push({
      T, P, SA, adj, L, R, M, l, r, ...o,
      vars: [['L', L], ['R', R], ['M', M ?? '—'], ...(fast ? [['l', l ?? '—'], ['r', r ?? '—']] : []), ['итераций', it], ['сравнений', `${cmp}${fast ? ` (m + log n ≈ ${m + Math.ceil(Math.log2(n + 1))})` : ''}`]],
    });
    const compare = (k, from) => {
      const w = suf(k);
      let q = from;
      while (q < m && q < w.length && P[q] === w[q]) { q++; cmp++; }
      if (q < m) cmp++;
      const res = q === m ? 'eq' : q === w.length ? 'gt' : P[q] > w[q] ? 'gt' : 'lt';
      return { q, res, w };
    };
    const say = (k, from, c) => {
      const w = c.w, pos = c.q + 1;
      const skipped = from ? `Первые ${from} симв. уже известны, начинаем с позиции ${from + 1}. ` : '';
      if (c.res === 'eq') return `${skipped}Совпали все символы P — P является префиксом суффикса SA[${k}] = ${SA[k - 1]}: вхождение!`;
      if (c.q === w.length) return `${skipped}Совпало ${c.q} симв., суффикс ${SS(w)} кончился раньше P — он меньше P.`;
      return `${skipped}Совпало ${c.q} симв., в позиции ${pos}: P[${pos}] = ${C(P[c.q])} ${c.res === 'gt' ? '>' : '<'} ${C(w[c.q])} — P ${c.res === 'gt' ? 'больше' : 'меньше'} суффикса.`;
    };
    const cmpFrame = (line, k, from, c, extra = '') =>
      push({ line, M: k, row: k, from, q: c.q, res: c.res, msg: say(k, from, c) + extra, big: c.res === 'eq' });

    push({ line: 0, big: true, msg: `Суффиксный массив T построен (n = ${n}). Все вхождения P — непрерывный блок строк SA, потому что суффиксы, начинающиеся с P, идут подряд по алфавиту. Ищем бинарным поиском${fast ? ' с ускорением через LCP: O(m + log n)' : ': каждое сравнение с первого символа, O(m log n)'}.` });

    if (!fast) {
      while (L <= R) {
        it++;
        M = Math.floor((L + R) / 2);
        push({ line: [1, 2], msg: `L = ${L}, R = ${R} → M = ⌊(L + R)/2⌋ = ${M}. Сравниваем P с суффиксом SA[${M}] = ${SA[M - 1]} с первого символа.`, row: M });
        const c = compare(M, 0);
        if (c.res === 'eq') { cmpFrame([3, 4], M, 0, c); found = M; break; }
        cmpFrame([3, 5], M, 0, c, c.res === 'gt' ? ` Вхождения могут быть только ниже: L = M + 1 = ${M + 1}.` : ` Вхождения могут быть только выше: R = M − 1 = ${M - 1}.`);
        if (c.res === 'gt') L = M + 1; else R = M - 1;
      }
    } else {
      let c = compare(1, 0);
      l = c.q;
      cmpFrame(0, 1, 0, c, ` Запоминаем l = LCP(P, suf(L)) = ${l}.`);
      if (c.res === 'eq') found = 1;
      else if (c.res === 'lt') push({ line: 0, msg: 'P меньше самого маленького суффикса — вхождений нет.' });
      else {
        c = compare(n, 0);
        r = c.q;
        cmpFrame(0, n, 0, c, ` Запоминаем r = LCP(P, suf(R)) = ${r}.`);
        if (c.res === 'eq') found = n;
        else if (c.res === 'gt') push({ line: 0, msg: 'P больше самого большого суффикса — вхождений нет.' });
        else {
          while (R - L > 1) {
            it++;
            M = Math.floor((L + R) / 2);
            const kase = l === r ? '1: l = r' : l > r ? '2: l > r' : '3: l < r';
            push({ line: [1, 2], msg: `L = ${L}, R = ${R}, M = ${M}. l = ${l}, r = ${r} → случай ${kase}.`, row: M });
            let go = null; // 'L' | 'R' | 'eq' | {from}
            if (l === r) {
              push({ line: 3, row: M, msg: `l = r = ${l}: все суффиксы от L до R начинаются с тех же ${l} символов, что и P (они зажаты между L и R). Значит, первые ${l} символов suf(M) проверять не надо — сравниваем с позиции ${l + 1}.` });
              go = { from: l, line: 3 };
            } else if (l > r) {
              const x = LCP(L, M);
              if (x === l) {
                push({ line: [4, 5], row: M, msg: `l > r, смотрим LCP(L, M) = ${x} = l: первые ${l} букв suf(M) совпадают с P, проверять их не надо. Сравниваем с позиции ${l + 1}.` });
                go = { from: l, line: 5 };
              } else if (x > l) {
                push({ line: [4, 6], row: M, msg: `l > r, LCP(L, M) = ${x} > l = ${l}. suf(L) < P, их общий префикс l, значит, в позиции ${l + 1} символ suf(L) строго меньше символа P. suf(M) совпадает с suf(L) хотя бы до позиции ${l + 1} — там тот же символ. Значит, suf(M) < P, и всё между L и M тоже меньше P: идём во вторую половину, L = M = ${M}, l не меняется.`, ded: 'lt' });
                L = M;
              } else {
                push({ line: [4, 7], row: M, msg: `l > r, LCP(L, M) = ${x} < l = ${l}. suf(L) и P совпадают на ${l} символах, а suf(L) и suf(M) — только на ${x}. В позиции ${x + 1} символ suf(M) больше символа suf(L) (массив отсортирован), а у suf(L) там тот же символ, что у P. Значит, suf(M) > P — идём в первую половину: R = M = ${M}, и сразу r = LCP(L, M) = ${x} без сравнений.`, ded: 'gt' });
                R = M; r = x;
              }
            } else {
              const y = LCP(M, R);
              if (y === r) {
                push({ line: [8, 9], row: M, msg: `l < r (зеркальный случай), LCP(M, R) = ${y} = r: первые ${r} букв suf(M) совпадают с P. Сравниваем с позиции ${r + 1}.` });
                go = { from: r, line: 9 };
              } else if (y > r) {
                push({ line: [8, 10], row: M, msg: `l < r, LCP(M, R) = ${y} > r = ${r}. suf(R) > P, и в позиции ${r + 1} символ suf(R) строго больше символа P. suf(M) совпадает с suf(R) до позиции ${r + 1}, значит, suf(M) > P: идём в первую половину, R = M = ${M}, r не меняется.`, ded: 'gt' });
                R = M;
              } else {
                push({ line: [8, 11], row: M, msg: `l < r, LCP(M, R) = ${y} < r = ${r}. suf(R) и P совпадают на ${r} символах, suf(M) и suf(R) — только на ${y}. В позиции ${y + 1} символ suf(M) меньше символа suf(R), то есть меньше символа P. Значит, suf(M) < P — идём во вторую половину: L = M = ${M}, l = LCP(M, R) = ${y} без сравнений.`, ded: 'lt' });
                L = M; l = y;
              }
            }
            if (go) {
              const cc = compare(M, go.from);
              if (cc.res === 'eq') { cmpFrame([go.line, 12], M, go.from, cc); found = M; break; }
              if (cc.res === 'gt') { cmpFrame([go.line, 12], M, go.from, cc, ` Идём во вторую половину: L = M = ${M}, l = ${cc.q}.`); L = M; l = cc.q; }
              else { cmpFrame([go.line, 12], M, go.from, cc, ` Идём в первую половину: R = M = ${M}, r = ${cc.q}.`); R = M; r = cc.q; }
            }
          }
        }
      }
    }
    if (found != null) {
      let lo = found, hi = found;
      while (lo > 1 && adj[lo - 1] >= m) lo--;
      while (hi < n && adj[hi] >= m) hi++;
      const pos = SA.slice(lo - 1, hi).sort((a, b) => a - b);
      push({ line: [], big: true, done: true, hits: [lo, hi], msg: `Найдено в строке ${found}. Соседние строки с Lcp ≥ m = ${m} тоже начинаются с P — блок строк ${lo}…${hi}. Вхождения P в T: позиции ${pos.join(', ')}. Сравнений символов: ${cmp}.` });
    } else if (!F.some((f) => /вхождений нет/.test(f.msg)))
      push({ line: [], big: true, done: true, msg: `Отрезок поиска исчерпан — P не входит в T. Сравнений символов: ${cmp}.` });
    return F;
  }
  function renderSearch(f) {
    const { T, P, SA } = f, n = T.length;
    let h = `<table class="sa"><tr><th></th><th>k</th><th>SA[k]</th><th>Lcp(k−1, k)</th><th>суффикс</th></tr>`;
    h += `<tr><td class="mk">P</td><td></td><td></td><td></td><td class="lft">${strCells(P, (k) => (f.row != null && f.q != null ? (k < f.from ? 'skip' : k < f.q ? 'ok' : k === f.q && f.res !== 'eq' ? 'bad' : 'pat') : 'pat'))}</td></tr>`;
    for (let k = 1; k <= n; k++) {
      const mk = [k === f.L && !f.done ? 'L' : '', k === f.M && !f.done ? 'M' : '', k === f.R && !f.done ? 'R' : ''].filter(Boolean).join(',');
      const hit = f.hits && k >= f.hits[0] && k <= f.hits[1];
      const out = !f.done && (k < Math.min(f.L, f.R) || k > Math.max(f.L, f.R));
      const w = T.slice(SA[k - 1] - 1);
      const cellCls = (i) => {
        if (k !== f.row || f.q == null) return f.ded && k === f.row ? '' : '';
        if (i < f.from) return 'skip';
        if (i < f.q) return 'ok';
        if (i === f.q && f.res !== 'eq') return 'bad';
        return '';
      };
      h += `<tr class="${hit ? 'hit' : k === f.row && !f.done ? 'on' : out ? 'dim' : ''}"><td class="mk">${mk}</td><td class="num">${k}</td><td class="num">${SA[k - 1]}</td><td class="num">${k > 1 ? f.adj[k - 1] : '—'}</td><td class="lft">${strCells(w, cellCls)}</td></tr>`;
    }
    return h + '</table>';
  }

  App.register({
    id: 'sa', block: 4, num: 21, title: 'Суффиксные массивы',
    full: '21. Суффиксные массивы. Алгоритм построения с использованием суффиксных деревьев. Поиск подстроки в строке с использованием суффиксного массива.',
    modes: [
      {
        id: 'search', label: 'Поиск подстроки',
        inputs: [
          { id: 'T', label: 'Текст T', value: 'abracadabra', max: 18, w: 16 },
          { id: 'P', label: 'Образец P', value: 'abra', max: 8, w: 8 },
          { id: 'method', label: 'Метод', type: 'select', value: 'lcp', options: [['lcp', 'с LCP — O(m + log n)'], ['naive', 'наивный — O(m log n)']] },
        ],
        validate: noDollar,
        presets: [
          { label: 'abracadabra / abra', v: { T: 'abracadabra', P: 'abra' } },
          { label: 'много случаев LCP', v: { T: 'abaabbaaababaab', P: 'bab' } },
          { label: 'ещё случаи', v: { T: 'baabaaaababba', P: 'babb' } },
          { label: 'нет вхождения', v: { T: 'abracadabra', P: 'acr' } },
        ],
        legend: [['skip', 'известно без сравнения'], ['ok', 'совпало'], ['bad', 'первое различие'], ['blk', 'строка M']],
        code: (v) => v.method === 'lcp' ? [
          'L = 1;  R = n;  l = LCP(P, suf(L));  r = LCP(P, suf(R))',
          'while R − L > 1:',
          '  M = ⌊(L + R)/2⌋',
          '  l = r:  сравниваем suf(M) и P с позиции l + 1',
          '  l > r:  смотрим LCP(L, M)',
          '    = l:  сравниваем с позиции l + 1',
          '    > l:  suf(M) < P  →  L = M',
          '    < l:  suf(M) > P  →  R = M;  r = LCP(L, M)',
          '  l < r:  смотрим LCP(M, R)          // зеркально',
          '    = r:  сравниваем с позиции r + 1',
          '    > r:  suf(M) > P  →  R = M',
          '    < r:  suf(M) < P  →  L = M;  l = LCP(M, R)',
          '  после сравнения: P больше → L = M, l = совпало; меньше → R = M, r = совпало; P кончился → вхождение',
        ] : [
          'L = 1;  R = n',
          'while L ≤ R:',
          '  M = ⌊(L + R)/2⌋',
          '  сравниваем P и suf(M) с первого символа',
          '  P — префикс suf(M) → вхождение',
          '  P больше → L = M + 1;  иначе R = M − 1',
        ],
        run: runSearch, render: renderSearch,
      },
      {
        id: 'tree', label: 'Построение по суффиксному дереву',
        inputs: [{ id: 'T', label: 'Текст T', value: 'abcabxab', max: 12, w: 12 }],
        validate: noDollar,
        presets: [
          { label: 'abcabxab', v: { T: 'abcabxab' } },
          { label: 'banana', v: { T: 'banana' } },
          { label: 'mississippi', v: { T: 'mississippi' } },
        ],
        legend: [['new', 'текущий узел'], ['ok', 'уже выписанные листья']],
        code: [
          'построить суффиксное дерево T$ (Укконен, O(n))',
          'обход в глубину; детей перебираем по алфавиту ($ меньше всех)',
          '  лист j:  SA.append(j)',
          '  Lcp(предыдущий, j) = строковая глубина узла, где свернули',
          'первый элемент — суффикс «$», отбрасываем',
        ],
        run: runTree, render: renderTree,
      },
    ],
    theory: `
<div class="def"><b>Определение.</b> Суффиксный массив строки T длины n — массив целых чисел от 1 до n, который хранит начальные позиции суффиксов T в лексикографическом порядке.</div>
<p>Пример: T = <code>banana</code> → суффиксы по алфавиту: a, ana, anana, banana, na, nana → SA = 6, 4, 2, 1, 5, 3.</p>
<p>Зачем: суффиксное дерево занимает много памяти (на практике 10–20 байт на символ и больше), а массив — всего n чисел. При этом он позволяет искать подстроки почти так же быстро.</p>

<h3>Построение по суффиксному дереву, O(n)</h3>
<p>Строим суффиксное дерево T$ (Укконен, O(n)), считая $ меньше всех символов. Обходим его в глубину, перебирая детей каждого узла в алфавитном порядке первых символов рёбер. Номера листьев в порядке обхода и есть суффиксный массив. Первым всегда идёт лист суффикса «$» — его отбрасываем (это суффикс-сентинел).</p>
<div class="proof"><p>Рёбра из узла начинаются с разных символов. Поэтому если суффиксы лежат в разных поддеревьях узла v, они совпадают на метке пути до v и различаются первым символом соответствующих рёбер. Обход в алфавитном порядке выдаёт их в лексикографическом порядке. Обход O(n), так как узлов O(n).</p></div>
<p>Заодно получаем Lcp(k − 1, k) соседних суффиксов: это строковая глубина их наименьшего общего предка, то есть узла, где обход свернул на новое ребро.</p>

<h3>Поиск подстроки: наивный способ, O(m log n)</h3>
<p>Все суффиксы, начинающиеся с P, идут в массиве подряд. Бинарный поиск: берём суффикс M в середине отрезка, M = ⌊(L + R)/2⌋, и сравниваем его с паттерном посимвольно.</p>
<ul>
<li>Если паттерн лексикографически больше суффикса M, первая половина отпадает (там вхождений быть не может), ищем во второй: берём её середину и снова сравниваем.</li>
<li>Если меньше — ищем в первой половине.</li>
</ul>
<p>Каждое сравнение стоит до m символов, итераций log n: O(m log n).</p>

<h3>Правильный способ, O(m + log n)</h3>
<p>Нужен LCP(i, j) — наибольший общий префикс суффиксов в позициях i и j массива. Перед алгоритмом считаем l = LCP(P, suf(L)) и r = LCP(P, suf(R)). Дальше три случая.</p>
<ol>
<li><b>l = r.</b> Все суффиксы от L до R начинаются с одних и тех же l символов (они зажаты между L и R, а с P у обоих общий префикс l). Берём suf(M) и сравниваем с паттерном с символа l + 1.
  <ul><li>Паттерн больше — по алфавиту он стоит после M: сдвигаем левую границу L = M.</li>
  <li>Символ равен — сравниваем следующий. Паттерн полностью закончился — нашли вхождение.</li>
  <li>Паттерн меньше — R = M.</li></ul>
  Обновляемая переменная (l или r) получает значение «сколько совпало при проверке».</li>
<li><b>l &gt; r.</b> Берём M и смотрим на заранее известное LCP(L, M).
  <ul>
  <li><b>LCP(L, M) = l</b>: первые l букв suf(M) совпадают с паттерном, проверять их не надо. Сравниваем дальше с символа l + 1. Паттерн больше — во вторую половину (L = M), равен — нашли вхождение, меньше — в первую (R = M).</li>
  <li><b>LCP(L, M) &gt; l</b>: известно, что L левее паттерна, то есть suf(L) &lt; P. Их общий префикс l, поэтому в позиции l + 1 символ suf(L) строго меньше символа P. По условию suf(L) и suf(M) совпадают как минимум до символа l + 1, значит, у suf(M) там такой же символ, как у suf(L), — строго меньше символа P. Итог: suf(M) &lt; P, и все строки от L до M тоже меньше паттерна. Идём во вторую половину: L = M, l не меняется.</li>
  <li><b>LCP(L, M) &lt; l</b>: L и P совпадают на первые l символов, L и M — на меньшее число X = LCP(L, M). Символ X + 1 в M строго больше символа X + 1 в L (массив отсортирован), а символ X + 1 в L совпадает с символом X + 1 паттерна, так как X &lt; l. Значит, suf(M) больше паттерна. Во второй половине искать нет смысла, идём в первую: R = M. За O(1) обновляем r = LCP(L, M) вместо ручного подсчёта LCP(M, P): общая часть M и паттерна — ровно X символов.</li>
  </ul></li>
<li><b>l &lt; r.</b> Зеркальный случай: опираемся на правую границу и LCP(M, R).
  <ul>
  <li><b>LCP(M, R) = r</b>: первые r букв suf(M) совпадают с паттерном, сравниваем с символа r + 1 и действуем как выше.</li>
  <li><b>LCP(M, R) &gt; r</b>: suf(R) &gt; P, в позиции r + 1 символ suf(R) строго больше символа P, а suf(M) там совпадает с suf(R). Значит, suf(M) больше паттерна, и все строки от M до R тоже. Идём в первую половину: R = M, r не меняется.</li>
  <li><b>LCP(M, R) &lt; r</b>: R и P совпадают на r символов, M и R — на X &lt; r. Символ X + 1 в M строго меньше символа X + 1 в R, а тот совпадает с символом паттерна. Значит, suf(M) меньше паттерна. Идём во вторую половину: L = M и l = LCP(M, R) = X.</li>
  </ul></li>
</ol>
<div class="thm"><b>Теорема.</b> Поиск с LCP выполняет O(m + log n) сравнений символов.</div>
<div class="proof"><p>Величина max(l, r) никогда не уменьшается: в случаях без сравнений она сохраняется, а после сравнения с позиции max(l, r) + 1 новое значение не меньше старого. Каждое удачное сравнение символа увеличивает max(l, r) на 1, а max(l, r) ≤ m — удачных сравнений не больше m. Неудачное сравнение — не больше одного на итерацию, итераций log n. Остальная работа — O(1) на итерацию.</p></div>
<p><b>Откуда LCP(L, M) и LCP(M, R).</b> В бинарном поиске встречаются только O(n) разных пар (L, M) и (M, R) — узлы дерева бинарного поиска. LCP соседних суффиксов берём из суффиксного дерева (строковая глубина наименьшего общего предка). Для пары из дерева поиска LCP(i, j) = min(LCP(i, M), LCP(M, j)); считаем снизу вверх за O(n).</p>
<p><b>Все вхождения</b> — непрерывный блок строк: от найденной строки расширяемся, пока Lcp соседних ≥ m (или делаем два бинарных поиска — за левую и правую границу блока).</p>
<p class="note">Почитать: Гасфилд, гл. 7.14.</p>`,
    quiz: {
      intro: 'Запиши суффиксный массив строки и Lcp соседних суффиксов (индексы с 1; столбец — номер k в массиве). Lcp(k−1, k) для k = 1 не заполняется.',
      sLabel: 'T', base: 1, len: 8,
      arrays: (s) => {
        const sa = suffixArray(s);
        return [
          { key: 'sa', label: 'SA', ans: sa.map(String) },
          { key: 'lcp', label: 'Lcp', ans: sa.map((p, k) => (k ? String(lcpS(s.slice(sa[k - 1] - 1), s.slice(p - 1))) : '−')), skip: [0] },
        ];
      },
    },
  });
})(window.App);
