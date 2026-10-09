/* Билет 1. Теорема об оценке времени работы сортировок сравнением: дерево решений, Ω(n log n). */
(function (App) {
  'use strict';
  const sub = App.fmt.sub;

  // Дерево решений сортировки вставками для 3 элементов (как в Кормене и на ИТМО-вики)
  const TREE = {
    1: { cmp: [1, 2], l: 2, r: 3 },
    2: { cmp: [2, 3], l: 4, r: 5 },
    3: { cmp: [1, 3], l: 6, r: 7 },
    4: { perm: [1, 2, 3] },
    5: { cmp: [1, 3], l: 8, r: 9 },
    6: { perm: [2, 1, 3] },
    7: { cmp: [2, 3], l: 10, r: 11 },
    8: { perm: [1, 3, 2] },
    9: { perm: [3, 1, 2] },
    10: { perm: [2, 3, 1] },
    11: { perm: [3, 2, 1] },
  };
  // номера в узлах — индексы исходных элементов (как на рисунке в Кормене)
  const snap = () => {
    const N = {};
    for (const id in TREE) {
      const t = TREE[id];
      N[id] = { id: +id, key: id, l: t.l ?? null, r: t.r ?? null, p: null };
    }
    for (const id in N) for (const c of [N[id].l, N[id].r]) if (c) N[c].p = +id;
    return { N, root: 1 };
  };
  const lbl = (id) => (TREE[id].perm ? `⟨${TREE[id].perm.join(',')}⟩` : `${TREE[id].cmp[0]} : ${TREE[id].cmp[1]}`);

  function runTree({ a }) {
    const v = a.split(/[\s,;]+/).filter(Boolean).map(Number);
    const F = [], S = snap();
    let cmp = 0;
    const push = (line, msg, x = {}) => F.push({ line, msg, S, vars: [['a', v.join(', ')], ['сравнений', cmp], ['высота дерева', 3]], ...x });
    push(0, `Дерево решений сортировки вставками для n = 3. Внутренний узел «i : j» — сравнение a${sub('i')} и a${sub('j')}: влево, если a${sub('i')} ≤ a${sub('j')}, вправо — если больше. Лист ⟨π(1), π(2), π(3)⟩ — найденный порядок a${sub('π(1)')} ≤ a${sub('π(2)')} ≤ a${sub('π(3)')}. Листьев 3! = 6.`, { mark: {}, big: true });
    let id = 1;
    const path = [];
    while (!TREE[id].perm) {
      const [i, j] = TREE[id].cmp, le = v[i - 1] <= v[j - 1];
      cmp++;
      path.push(id);
      push(1, `Узел ${i} : ${j}: a${sub(i)} = ${v[i - 1]} ${le ? '≤' : '>'} a${sub(j)} = ${v[j - 1]} → ${le ? 'влево' : 'вправо'}.`, { mark: App.markPath(path, id) });
      id = le ? TREE[id].l : TREE[id].r;
    }
    path.push(id);
    const p = TREE[id].perm;
    push(2, `Лист ⟨${p.join(', ')}⟩: a${sub(p[0])} ≤ a${sub(p[1])} ≤ a${sub(p[2])}, то есть ${p.map((i) => v[i - 1]).join(' ≤ ')}. Понадобилось ${cmp} сравнений — длина пути от корня до листа. Худший случай — высота дерева (3).`, { mark: App.markPath(path, id, { [id]: 'new' }), big: true });
    push(3, `Для любой сортировки сравнениями дерево решений должно иметь не меньше n! листьев — иначе две разные перестановки попадут в один лист, и одну из них алгоритм отсортирует неправильно. Двоичное дерево высоты h имеет не больше 2${'ʰ'} листьев: n! ≤ 2${'ʰ'}, h ≥ log₂ n! = Ω(n log n).`, { mark: App.markPath(path, id, { [id]: 'new' }) });
    return F;
  }
  const renderTree = (f) =>
    App.btree(f.S, { label: lbl, cls: (id) => [(f.mark || {})[id], TREE[id].perm ? 'leafp' : ''].filter(Boolean).join(' '), edgeLabel: (c) => (f.S.N[f.S.N[c].p].l === c ? '≤' : '>') });

  function runBound({ n }) {
    const N = +n, F = [], rows = [];
    let lf = 0;
    for (let k = 1; k <= N; k++) {
      lf += Math.log2(k);
      rows.push({ k, fact: k <= 20 ? String([...Array(k)].reduce((s, _, i) => s * BigInt(i + 1), 1n)) : '…', lf, hmin: Math.ceil(lf - 1e-9), nlog: k * Math.log2(k), stir: k * Math.log2(k / Math.E) });
      F.push({ line: [0, 1, 2], rows: rows.slice(), msg: `n = ${k}: листьев не меньше n! = ${rows[k - 1].fact}, поэтому высота дерева h ≥ ⌈log₂ n!⌉ = ${rows[k - 1].hmin}. Для сравнения n·log₂ n = ${rows[k - 1].nlog.toFixed(1)}, n·log₂(n/e) = ${rows[k - 1].stir.toFixed(1)} < log₂ n!.`, big: k === N });
    }
    return F;
  }
  function renderBound(f) {
    let h = '<table class="mini"><caption>Минимально возможное число сравнений в худшем случае</caption><tr><th>n</th><th>n!</th><th>log₂ n!</th><th>h ≥ ⌈log₂ n!⌉</th><th>n·log₂(n/e)</th><th>n·log₂ n</th></tr>';
    for (const r of f.rows) h += `<tr><td>${r.k}</td><td>${r.fact}</td><td>${r.lf.toFixed(2)}</td><td class="on">${r.hmin}</td><td>${r.stir.toFixed(1)}</td><td>${r.nlog.toFixed(1)}</td></tr>`;
    return h + '</table>';
  }

  App.register({
    id: 'lower', block: 1, num: 1, title: 'Нижняя оценка сортировки сравнением',
    full: '1. Теорема об оценке времени работы сортировок, использующих сравнение элементов (с доказательством).',
    modes: [
      {
        id: 'tree', label: 'Дерево решений (n = 3)',
        inputs: [{ id: 'a', label: 'Три числа a₁ a₂ a₃', raw: true, value: '7 3 5', max: 20, w: 10 }],
        validate: (v) => (v.a.split(/[\s,;]+/).filter(Boolean).filter((x) => /^-?\d+$/.test(x)).length === 3 && v.a.split(/[\s,;]+/).filter(Boolean).length === 3 ? null : 'Введи ровно три целых числа через пробел.'),
        presets: [
          { label: '7 3 5', v: { a: '7 3 5' } },
          { label: '1 2 3 (отсортирован)', v: { a: '1 2 3' } },
          { label: '3 2 1 (обратный)', v: { a: '3 2 1' } },
          { label: '2 3 1', v: { a: '2 3 1' } },
        ],
        legend: [['ring', 'путь сравнений'], ['ok', 'итоговый лист']],
        code: [
          'узел «i : j» — сравнение a_i и a_j',
          'a_i ≤ a_j → левое поддерево,  a_i > a_j → правое',
          'лист ⟨π(1), …, π(n)⟩ — порядок a_π(1) ≤ … ≤ a_π(n)',
          'листьев ≥ n!,  листьев ≤ 2^h  ⇒  h ≥ log₂ n! = Ω(n log n)',
        ],
        run: runTree, render: renderTree,
      },
      {
        id: 'bound', label: 'Оценка log₂ n!',
        inputs: [{ id: 'n', label: 'До n =', type: 'select', value: '12', options: [['8', '8'], ['12', '12'], ['16', '16'], ['20', '20']] }],
        code: ['листьев ≥ n!', 'h ≥ log₂ n!', 'log₂ n! > n·log₂(n/e)  (Стирлинг)  ⇒  h = Ω(n log n)'],
        run: runBound, render: renderBound,
      },
    ],
    theory: `
<div class="thm"><b>Теорема.</b> В худшем случае любой алгоритм сортировки сравнениями выполняет Ω(n log n) сравнений, где n — число сортируемых элементов.</div>
<h3>Дерево решений</h3>
<p>Сопоставим алгоритму сортировки сравнениями дерево, в котором:</p>
<ul><li>узлы — операции сравнения элементов: узел «i : j» сравнивает a<sub>i</sub> и a<sub>j</sub>;</li>
<li>рёбра — переходы между состояниями алгоритма (a<sub>i</sub> ≤ a<sub>j</sub> или a<sub>i</sub> &gt; a<sub>j</sub>);</li>
<li>листья (l штук) — перестановки элементов: лист ⟨π(1), …, π(n)⟩ означает a<sub>π(1)</sub> ≤ … ≤ a<sub>π(n)</sub>;</li>
<li>высота дерева — максимальное количество сравнений, которое делает алгоритм.</li></ul>
<p>Работа алгоритма на конкретном входе — путь от корня до листа. Попробуй в симуляции: дерево сортировки вставками для трёх элементов.</p>
<h3>Доказательство</h3>
<div class="proof">
<p>У каждого узла максимум два сына (a<sub>i</sub> ≤ a<sub>j</sub> или a<sub>i</sub> &gt; a<sub>j</sub>). Всего существует n! перестановок входной последовательности, и каждая должна встречаться в каком-то листе (иначе на соответствующем входе алгоритм ошибётся). Следовательно, листьев не меньше n!.</p>
<p>У двоичного дерева высотой h не более 2<sup>h</sup> листьев, тогда n! ≤ l ≤ 2<sup>h</sup> ⇒ log<sub>2</sub> n! ≤ h.</p>
<p>По Стирлингу n! ≈ √(2πn)·(n/e)<sup>n</sup>, поэтому log<sub>2</sub> n! ≈ ½·log<sub>2</sub>(2πn) + n·log<sub>2</sub>(n/e).</p>
<p>Итого: n·log<sub>2</sub>(n/e) &lt; log<sub>2</sub> n! ≤ h ⇒ h = Ω(n log<sub>2</sub> n).</p>
</div>
<p class="note">Без Стирлинга: n! ≥ (n/2)<sup>n/2</sup> (половина множителей не меньше n/2), откуда log<sub>2</sub> n! ≥ (n/2)·log<sub>2</sub>(n/2) = Ω(n log n).</p>
<h3>Следствия</h3>
<ul><li>Сортировки слиянием и пирамидальная асимптотически оптимальны среди сортировок сравнением.</li>
<li>Чтобы сортировать быстрее, нужно использовать не только сравнения, а структуру ключей: сортировка подсчётом, поразрядная, карманная (билеты 2–4) работают за линейное время при ограничениях на ключи.</li></ul>`,
  });
})(window.App);
