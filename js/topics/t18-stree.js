/* Билет 18. Суффиксные деревья, неявные суффиксные деревья, простейшие алгоритмы построения. */
(function (App) {
  'use strict';
  const ST = App.st, { c: C, s: SS, sub } = App.fmt;
  const withDollar = (S, d) => (d && !S.endsWith('$') ? S + '$' : S);

  /* ---------- режим 1: вставка суффиксов, O(m²) ---------- */
  function runInsert({ S, dollar }) {
    const str = withDollar(S, dollar), m = str.length, s = ' ' + str;
    const t = ST.create(), nodes = t.nodes, F = [];
    let cmp = 0;
    const name = (id) => ST.name(nodes, id);
    const V = (j) => [['j', j ?? '—'], ['m', m], ['сравнений', cmp]];
    const push = (o) => F.push({ nodes: ST.snap(t), e: m, str, vars: V(o.j), ...o });

    const l1 = ST.addLeaf(t, s, 0, 1, m, 1);
    push({ line: 0, j: 1, big: true, msg: `Начинаем с одного ребра: корень → лист 1 с меткой S[1..${m}] = ${SS(str)} — это самый длинный суффикс.`, hl: { fresh: [l1] }, strip: { blk: [1, m] } });
    for (let j = 2; j <= m; j++) {
      push({ line: [1, 2], j, big: true, msg: `Вставляем суффикс ${j}: S[${j}..${m}] = ${SS(s.slice(j))}. Идём от корня, сравнивая символы, пока совпадают.`, hl: { cur: 0 }, strip: { blk: [j, m] } });
      let cur = 0, a = j;
      const path = [0];
      for (;;) {
        if (a > m) {
          push({ line: 2, j, msg: `Суффикс ${j} закончился ровно в ${name(cur)} — он префикс другого суффикса, листа не будет. Без уникального символа в конце дерево получается неявным.`, hl: { cur, path }, strip: { blk: [j, m] } });
          break;
        }
        const c = nodes[cur].ch[s[a]];
        cmp++;
        if (c == null) {
          const lf = ST.addLeaf(t, s, cur, a, m, j);
          push({ line: 4, j, big: true, msg: `Из ${name(cur)} нет ребра на ${C(s[a])} → добавляем лист ${j} с меткой S[${a}..${m}] = ${SS(s.slice(a))}.`, hl: { fresh: [lf], path }, strip: { blk: [a, m] } });
          break;
        }
        const x = nodes[c], L = ST.len(x, m), lab = ST.label(x, s, m);
        let k = 1;
        while (k < L && a + k <= m && s[x.a + k] === s[a + k]) { k++; cmp++; }
        if (k < L && a + k <= m) cmp++;
        if (k === L) {
          path.push(c);
          push({ line: 2, j, msg: `Ребро ${SS(lab)} совпало целиком (${L} симв.) → спускаемся в ${name(c)}.`, hl: { cur: c, path: path.slice() }, strip: { blk: [a + L, m], cur: a + L <= m ? a + L : null } });
          cur = c; a += L;
          continue;
        }
        if (a + k > m) {
          push({ line: 2, j, msg: `Суффикс ${j} закончился внутри ребра ${SS(lab)} (после ${k} симв.) — он префикс другого суффикса и листа не получает. Допиши $, чтобы так не было.`, hl: { on: c, k, path }, strip: { blk: [j, m] } });
          break;
        }
        push({ line: 2, j, msg: `На ребре ${SS(lab)} совпало ${k} симв., затем ${C(s[x.a + k])} ≠ ${C(s[a + k])} — суффикс расходится с деревом посреди ребра.`, hl: { on: c, k, next: true, path }, strip: { blk: [a + k, m], cur: a + k } });
        const w = ST.split(t, s, c, k), lf = ST.addLeaf(t, s, w, a + k, m, j);
        push({ line: [3, 4], j, big: true, msg: `Делим ребро: новый внутренний узел ${nodes[w].nm} с меткой ${SS(lab.slice(0, k))}, от него — старый хвост ${SS(lab.slice(k))} и новый лист ${j} с меткой ${SS(s.slice(a + k))}.`, hl: { fresh: [w, lf], path }, strip: { blk: [a + k, m] } });
        break;
      }
    }
    const leaves = nodes.filter((x) => x.leaf).length, inner = nodes.length - leaves - 1;
    push({ line: [], big: true, msg: `Готово: ${leaves} листьев, ${inner} внутренних узлов (≤ m − 1). Сравнений символов: ${cmp} — в худшем случае Θ(m²), т.к. каждый суффикс проходится от корня заново.`, hl: {}, strip: {} });
    return F;
  }

  /* ---------- режим 2: неявные деревья I₁…Iₘ, фазы и продолжения, O(m³) ---------- */
  function runPhases({ S, dollar }) {
    const str = withDollar(S, dollar), m = str.length, s = ' ' + str;
    const t = ST.create(), nodes = t.nodes, F = [];
    let walked = 0, phase = 1;
    const name = (id) => ST.name(nodes, id);
    const V = (o) => [['фаза', `i + 1 = ${phase}`], ['j', o.j ?? '—'], ['β', o.beta != null ? SS(o.beta) : '—'], ['пройдено символов', walked]];
    const push = (o) => F.push({ nodes: ST.snap(t), e: m, str, vars: V(o), ...o });

    const l1 = ST.addLeaf(t, s, 0, 1, 1, 1);
    push({ line: 0, big: true, msg: `I₁ — неявное дерево строки S[1..1]: одно ребро с меткой ${SS(s[1])} к листу 1.`, hl: { fresh: [l1] }, strip: { cur: 1, dimFrom: 2 } });
    for (let i = 1; i < m; i++) {
      phase = i + 1;
      const x = s[i + 1];
      push({ line: 1, big: true, msg: `Фаза ${i + 1}: строим I${sub(i + 1)} из I${sub(i)}. Для каждого j = 1…${i + 1} добиваемся, чтобы в дереве был путь S[j..${i + 1}], то есть к концу β = S[j..${i}] приписываем ${C(x)}.`, hl: {}, strip: { cur: i + 1, dimFrom: i + 2 } });
      for (let j = 1; j <= i + 1; j++) {
        const beta = s.slice(j, i + 1);
        let cur = 0, a = j, pos = null;
        const path = [0];
        while (a <= i) {
          const c = nodes[cur].ch[s[a]], L = ST.len(nodes[c], m);
          if (i - a + 1 >= L) { cur = c; a += L; path.push(c); }
          else { pos = { node: cur, child: c, k: i - a + 1 }; break; }
        }
        if (!pos) pos = { node: cur, child: -1, k: 0 };
        walked += beta.length;
        const at = pos.child >= 0 ? { on: pos.child, k: pos.k } : { cur: pos.node };
        const strip = { blk: [j, i], cur: i + 1, dimFrom: i + 2 };
        push({ line: [2, 3], j, beta, msg: `Продолжение ${j}: спускаемся от корня по β = S[${j}..${i}] = ${SS(beta)} (${beta.length} симв.). Конец β — ${pos.child >= 0 ? `внутри ребра, после ${pos.k} симв.` : beta.length ? name(pos.node) : 'корень (β пустая)'}.`, hl: { ...at, path }, strip });
        const nextCh = pos.child >= 0 ? s[nodes[pos.child].a + pos.k] : null;
        if (pos.child < 0 && nodes[pos.node].leaf) {
          nodes[pos.node].b++;
          push({ line: 4, j, beta, msg: `β кончается в листе ${nodes[pos.node].leaf} → правило 1: дописываем ${C(x)} к метке ребра листа.`, hl: { fresh: [pos.node], path }, strip });
        } else if (pos.child >= 0 ? nextCh === x : nodes[pos.node].ch[x] != null) {
          push({ line: 6, j, beta, msg: `За концом β уже идёт ${C(x)} → правило 3: путь β${x} уже есть, ничего не делаем.`, hl: { ...at, next: true, path }, strip });
        } else {
          let par = pos.node, w = -1;
          if (pos.child >= 0) { w = ST.split(t, s, pos.child, pos.k); par = w; }
          const lf = ST.addLeaf(t, s, par, i + 1, i + 1, j);
          push({ line: 5, j, beta, msg: w >= 0
            ? `Посреди ребра за β идёт ${C(nextCh)} ≠ ${C(x)} → правило 2: делим ребро новым внутренним узлом ${nodes[w].nm} и добавляем лист ${j} с меткой ${C(x)}.`
            : `Из ${name(par)} нет ребра на ${C(x)} → правило 2: добавляем новое ребро-лист ${j} с меткой ${C(x)}.`,
          hl: { fresh: [lf, w], path }, strip });
        }
      }
      push({ line: 1, big: true, msg: `Фаза ${i + 1} закончена — это неявное дерево I${sub(i + 1)} строки ${SS(str.slice(0, i + 1))}.`, hl: {}, strip: { blk: [1, i + 1], dimFrom: i + 2 } });
    }
    const leaves = nodes.filter((x) => x.leaf).length;
    const miss = [];
    for (let j = 1; j <= m; j++) if (!nodes.some((x) => x.leaf === j)) miss.push(j);
    push({ line: [], big: true, msg: (miss.length
      ? `Готово: неявное дерево Iₘ. Листьев ${leaves} из ${m}: суффиксы ${miss.join(', ')} кончаются внутри дерева. Чтобы получить настоящее суффиксное дерево, допиши $.`
      : `Готово: все ${m} суффиксов кончаются в листьях — это настоящее суффиксное дерево.`) +
      ` Спусков от корня — ${walked} символов: Σ|β| = O(m³) в худшем случае, если идти посимвольно.`, hl: {}, strip: {} });
    return F;
  }

  const render = (f, v) => ST.render(f, { idx: v.idx });

  App.register({
    id: 'stree', block: 4, num: 18, title: 'Суффиксные деревья',
    full: '18. Суффиксные деревья. Неявные суффиксные деревья. Простейший алгоритм построения.',
    modes: [
      {
        id: 'phases', label: 'Неявные деревья: фазы и продолжения',
        inputs: [
          { id: 'S', label: 'Строка S', value: 'xabxa', max: 12, w: 12 },
          { id: 'dollar', label: 'дописать $', type: 'check', value: false },
          { id: 'idx', label: 'метки рёбер индексами', type: 'check', value: false },
        ],
        presets: [
          { label: 'xabxa', v: { S: 'xabxa', dollar: false } },
          { label: 'xabxa$', v: { S: 'xabxa', dollar: true } },
          { label: 'abab', v: { S: 'abab', dollar: false } },
          { label: 'aabaab', v: { S: 'aabaab', dollar: false } },
        ],
        legend: [['blk', 'β = S[j..i]'], ['new', 'добавляемый символ S[i+1] / текущий узел'], ['ok', 'изменено на шаге']],
        code: [
          'I₁: корень → лист 1 с меткой S[1]',
          'for i = 1 .. m − 1:                     // фаза i + 1',
          '  for j = 1 .. i + 1:                   // продолжение j',
          '    найти от корня конец пути β = S[j..i]',
          '    правило 1: β кончается в листе → дописать S[i+1] к ребру',
          '    правило 2: за β нет S[i+1] → новый лист j (+ узел, если середина ребра)',
          '    правило 3: за β уже есть S[i+1] → ничего',
        ],
        run: runPhases, render,
      },
      {
        id: 'insert', label: 'Вставка суффиксов, O(m²)',
        inputs: [
          { id: 'S', label: 'Строка S', value: 'xabxac', max: 14, w: 12 },
          { id: 'dollar', label: 'дописать $', type: 'check', value: false },
          { id: 'idx', label: 'метки рёбер индексами', type: 'check', value: false },
        ],
        presets: [
          { label: 'xabxac', v: { S: 'xabxac', dollar: false } },
          { label: 'banana$', v: { S: 'banana', dollar: true } },
          { label: 'mississippi$', v: { S: 'mississippi', dollar: true } },
          { label: 'xabxa (без $)', v: { S: 'xabxa', dollar: false } },
        ],
        legend: [['blk', 'вставляемая часть суффикса'], ['new', 'несовпавший символ'], ['ok', 'новые узлы и рёбра']],
        code: [
          'дерево = корень → лист 1 с меткой S[1..m]',
          'for j = 2 .. m:',
          '  от корня идём по S[j..m], пока символы совпадают',
          '  если остановились посреди ребра: делим ребро новым узлом',
          '  добавляем лист j с меткой оставшейся части S[..m]',
        ],
        run: runInsert, render,
      },
    ],
    theory: `
<h3>Суффиксное дерево</h3>
<div class="def"><b>Определение.</b> Суффиксное дерево строки S длины m — корневое дерево, у которого:
<ul><li>ровно m листьев, пронумерованных 1…m;</li>
<li>каждый внутренний узел, кроме корня, имеет не меньше двух детей;</li>
<li>каждое ребро помечено непустой подстрокой S;</li>
<li>метки рёбер, выходящих из одного узла, начинаются с разных символов;</li>
<li>для листа i конкатенация меток на пути от корня равна суффиксу S[i..m].</li></ul></div>
<p>Такое дерево существует не для любой строки. Если один суффикс является префиксом другого (S = xabxa: суффикс xa — префикс xabxa), он заканчивается посреди ребра и листа не получает. Поэтому в конец дописывают символ $, которого нет в S: тогда ни один суффикс S$ не является префиксом другого.</p>
<p><b>Размер.</b> Листьев m, у каждого внутреннего узла ≥ 2 детей, поэтому внутренних узлов ≤ m − 1, всего O(m) узлов. Метку ребра храним парой индексов [p, q] (S[p..q]), поэтому всё дерево занимает O(m) памяти.</p>

<h3>Неявное суффиксное дерево</h3>
<div class="def"><b>Неявное суффиксное дерево</b> строки S получается из суффиксного дерева S$: удаляем все символы $ из меток рёбер, затем рёбра без меток, затем узлы, у которых осталось меньше двух детей. I<sub>i</sub> — неявное дерево префикса S[1..i].</div>
<p>В неявном дереве есть путь для каждого суффикса S, но некоторые суффиксы могут кончаться посреди ребра или во внутреннем узле, а не в листе. Если последний символ S уникален, неявное дерево совпадает с настоящим. Поэтому строят I<sub>m</sub> для S$ — это и есть суффиксное дерево.</p>

<h3>Простейший алгоритм: вставка суффиксов, O(m²)</h3>
<p>Начинаем с одного ребра S[1..m]$ к листу 1. Для j = 2, …, m идём от корня по S[j..m]$, сравнивая символы, пока совпадают. Остановились посреди ребра — делим его новым внутренним узлом. Добавляем лист j с меткой оставшейся части. Каждая вставка O(m), всего O(m²).</p>

<h3>Фазы и продолжения (основа алгоритма Укконена), O(m³)</h3>
<p>Строим последовательно I<sub>1</sub>, I<sub>2</sub>, …, I<sub>m</sub>. В <b>фазе i + 1</b> из I<sub>i</sub> получаем I<sub>i+1</sub>: для каждого j = 1, …, i + 1 (<b>продолжение j</b>) находим конец пути β = S[j..i] и добиваемся, чтобы в дереве был путь βS[i+1]. Возможны три случая:</p>
<ol>
<li><b>Правило 1.</b> β кончается в листе — дописываем S[i+1] в конец метки ребра листа.</li>
<li><b>Правило 2.</b> За концом β нет пути, начинающегося с S[i+1], но какое-то продолжение есть (или β кончается в узле). Добавляем новое ребро-лист j с меткой S[i+1]. Если β кончился посреди ребра, сначала делим ребро новым внутренним узлом.</li>
<li><b>Правило 3.</b> За β уже идёт S[i+1] — ничего не делаем.</li>
</ol>
<p>Спуск от корня по β стоит O(|β|) = O(m), продолжений в фазе i + 1 — i + 1, фаз m: всего O(m³). Алгоритм Укконена ускоряет его до O(m) (билет 19).</p>

<h3>Зачем нужны суффиксные деревья</h3>
<ul>
<li>Поиск образца P в T за O(|P|) после построения: спускаемся по P; все листья поддерева — вхождения (+ O(z) на их вывод).</li>
<li>Наибольшая общая подстрока двух строк, наибольшая повторяющаяся подстрока, число различных подстрок — за линейное время.</li>
<li>Обобщённое суффиксное дерево набора строк — основа многих алгоритмов биоинформатики.</li>
</ul>`,
  });
})(window.App);
