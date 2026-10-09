/* Билет 8. Декартовы деревья (нисходящий приоритет: у отца приоритет больше, чем у детей).
   Поиск, вставка/удаление поворотами, split и merge, вставка/удаление через split/merge. */
(function (App) {
  'use strict';
  const autoPri = (k) => ((k * 2654435761) >>> 0) % 97 + 1;

  function engine(push0) {
    const T = new App.BT();
    let ctx = { opi: -1 };
    const K = (id) => T.N[id].key, P = (id) => T.N[id].pri;
    const push = (line, msg, x = {}) => push0(T, line, msg, { ...ctx, ...x });

    // split(T, k): T₁ — ключи ≤ k, T₂ — ключи > k. Строим оба дерева сверху вниз (это развёрнутая рекурсия).
    const split = (root, k, lines) => {
      let t1 = null, t2 = null, la = null, ra = null, cur = root, line = lines[0];
      T.root = null;
      const show = (msg, mark = {}, big) => push(line, msg, { forest: [{ root: t1, label: `T₁ (≤ ${k})` }, { root: t2, label: `T₂ (> ${k})` }, { root: cur, label: 'ещё делим' }], mark, big });
      show(`split(T, ${k}): разделяем дерево по ключу ${k} на T₁ (ключи ≤ ${k}) и T₂ (ключи > ${k}).`, cur != null ? { [cur]: 'cur' } : {}, true);
      while (cur != null) {
        const C = T.N[cur], was = cur;
        line = C.key <= k ? lines[1] : lines[2];
        if (C.key <= k) {
          const nx = C.r;
          C.r = null;
          if (nx != null) T.N[nx].p = null;
          if (la == null) { t1 = cur; C.p = null; } else { T.N[la].r = cur; C.p = la; }
          la = cur; cur = nx;
          show(`${C.key} ≤ ${k}: в левом поддереве ${C.key} все ключи меньше, значит, ${C.key} вместе с левым поддеревом идёт в T₁. Запускаем split(R, ${k}) от правого поддерева: его часть R₁ станет правым сыном ${C.key}${la !== t1 ? ' (на картинке — подвешиваем к уже собранному T₁)' : ''}.`, { [was]: 't1' });
        } else {
          const nx = C.l;
          C.l = null;
          if (nx != null) T.N[nx].p = null;
          if (ra == null) { t2 = cur; C.p = null; } else { T.N[ra].l = cur; C.p = ra; }
          ra = cur; cur = nx;
          show(`${C.key} > ${k}: ${C.key} вместе с правым поддеревом идёт в T₂. Запускаем split(L, ${k}) от левого поддерева: его часть L₂ станет левым сыном ${C.key}.`, { [was]: 't2' });
        }
      }
      line = lines[3];
      show('Пришли в nullptr — конец split. Оба дерева — корректные декартовы: порядок ключей и приоритетов внутри частей сохранился.', {}, true);
      return [t1, t2];
    };

    // merge(A, B): все ключи A меньше ключей B
    const merge = (a, b, la, lb, lines) => {
      let res = null, hp = null, hs = null, line = lines[0];
      const attach = (id) => { if (hp == null) { res = id; T.N[id].p = null; } else { T.N[hp][hs] = id; T.N[id].p = hp; } };
      const show = (msg, mark = {}, big) => push(line, msg, { forest: [{ root: res, label: 'результат' }, { root: a, label: la }, { root: b, label: lb }], mark, big });
      show(`merge(${la}, ${lb}): все ключи ${la} меньше ключей ${lb}. Сравниваем приоритеты корней — больший становится корнем.`, {}, true);
      while (a != null && b != null) {
        line = P(a) > P(b) ? lines[1] : lines[2];
        if (P(a) > P(b)) {
          const nx = T.N[a].r, was = a;
          T.N[a].r = null;
          if (nx != null) T.N[nx].p = null;
          attach(a); hp = a; hs = 'r'; a = nx;
          show(`p(${K(was)}) = ${P(was)} > p(${K(b)}) = ${P(b)}: корнем становится ${K(was)} (чтобы выполнялось условие приоритетов), его левое поддерево остаётся, а правое = merge(R₁, ${lb}).`, { [was]: 'done', [b]: 'cur' });
        } else {
          const nx = T.N[b].l, was = b;
          T.N[b].l = null;
          if (nx != null) T.N[nx].p = null;
          attach(b); hp = b; hs = 'l'; b = nx;
          show(`p(${K(a)}) = ${P(a)} < p(${K(was)}) = ${P(was)}: корнем становится ${K(was)}, его правое поддерево остаётся, а левое = merge(${la}, L₂).`, { [was]: 'done', [a]: 'cur' });
        }
      }
      const rest = a ?? b;
      if (rest != null) attach(rest);
      line = lines[3];
      show(rest != null ? `Одно из деревьев пустое: слияние непустого с пустым возвращает непустое — подвешиваем ${K(rest)} целиком.` : 'Оба дерева закончились.', {}, true);
      return res;
    };

    const bstInsertRot = (k, pri, line) => {
      const d = App.descend(T, k, push, line);
      if (d.found != null) { push(line, `Ключ ${k} уже есть.`, { mark: { [d.found]: 'cur' } }); return null; }
      const id = T.add(k, { pri });
      T.setChild(d.parent, d.side, id);
      push(line, `Вставляем ⟨${k}, ${pri}⟩ как лист бинарного дерева поиска. Теперь чиним приоритеты.`, { mark: { [id]: 'new' } });
      while (T.N[id].p != null && P(T.N[id].p) < pri) {
        const p = T.N[id].p;
        push(line + 1, `Приоритет отца ${K(p)} (${P(p)}) меньше ${pri} — нарушено свойство кучи. Поворот между ${k} и ${K(p)}: ${k} поднимается.`, { mark: { [id]: 'rot', [p]: 'rot' } });
        T.rotUp(id);
        push(line + 1, `После поворота порядок ключей сохранился, ${k} стал выше.`, { mark: { [id]: 'cur' } });
      }
      push(line + 1, T.N[id].p == null ? `${k} стал корнем — приоритеты в порядке.` : `У отца ${K(T.N[id].p)} приоритет ${P(T.N[id].p)} ≥ ${pri} — приоритеты в порядке, конец.`, { mark: { [id]: 'cur' } });
      return id;
    };
    return { T, split, merge, bstInsertRot, setCtx: (c) => (ctx = c), K, P };
  }

  const pushFactory = (F) => (T, line, msg, x) => {
    const S = T.snap();
    F.push({ line, msg, S, ...x, vars: [['вершин', Object.keys(S.N).length], ['высота', x.forest ? '—' : T.h(T.root)], ...(x.ops ? [['операция', x.opi >= 0 && x.opi < x.ops.length ? App.opName(x.ops[x.opi]) : '—']] : [])] });
  };
  const withPri = (ops) => ops.map((o) => ({ ...o, p: o.p != null ? o.p : autoPri(o.k) }));

  /* ---------- режим 1: вставка/удаление поворотами («не крутые») ---------- */
  function runRot({ ops: src }) {
    const ops = withPri(App.parseOps(src, true).ops), F = [];
    const E = engine(pushFactory(F)), T = E.T, K = E.K, P = E.P;
    const push = (line, msg, x = {}) => pushFactory(F)(T, line, msg, { ops, opi, ...x });
    let opi = -1;
    push([], `Нисходящий приоритет: у отца приоритет больше, чем у детей. Вершины показаны как ⟨ключ, приоритет⟩. Приоритеты без «:p» выбраны псевдослучайно.`, { big: true });
    for (opi = 0; opi < ops.length; opi++) {
      E.setCtx({ ops, opi });
      const o = ops[opi];
      if (o.t === '+') { push(0, `Вставка ⟨${o.k}, ${o.p}⟩ (не крутая): как в дереве поиска, потом повороты вверх.`, { big: true }); E.bstInsertRot(o.k, o.p, 1); }
      else if (o.t === '?') {
        push(0, `Поиск ${o.k} — как в дереве поиска, O(h).`, { big: true });
        const d = App.descend(T, o.k, push, 0);
        push(0, d.found != null ? `Нашли за ${d.path.length} сравнений.` : `Ключа ${o.k} нет.`, {});
      } else {
        push(3, `Удаление ${o.k} (не крутое).`, { big: true });
        const d = App.descend(T, o.k, push, 3);
        if (d.found == null) { push(3, `Ключа ${o.k} нет.`, {}); continue; }
        const z = d.found;
        while (T.N[z].l != null && T.N[z].r != null) {
          const L = T.N[z].l, R = T.N[z].r, c = P(L) > P(R) ? L : R;
          push(4, `У ${o.k} два ребёнка: ${K(L)} (p = ${P(L)}) и ${K(R)} (p = ${P(R)}). Берём ребёнка с бо́льшим приоритетом — ${K(c)} — и делаем поворот между ним и ${o.k}: ${o.k} опускается, куча не нарушается.`, { mark: { [z]: 'del', [c]: 'rot' } });
          T.rotUp(c);
          push(4, `${o.k} опустился на уровень ниже.`, { mark: { [z]: 'del', [c]: 'cur' } });
        }
        const ch = T.N[z].l ?? T.N[z].r, p = T.N[z].p, side = p == null ? null : T.side(z);
        T.setChild(p, side, ch);
        delete T.N[z];
        push(5, `Детей меньше двух — удаляем, как в дереве поиска${ch != null ? `: на место ${o.k} встаёт ${K(ch)}` : ''}.`, {});
      }
    }
    opi = ops.length;
    push([], `Готово. Ключи: ${T.keys().join(', ') || '—'}; высота ${T.h(T.root)}.`, { big: true });
    return F;
  }

  /* ---------- режим 2: split и merge ---------- */
  function runSM({ keys: src, K: kk }) {
    const items = withPri(App.parseOps(src, true).ops.filter((o) => o.t === '+')), F = [];
    const E = engine(pushFactory(F)), T = E.T;
    const silent = engine(() => {});
    for (const it of items) silent.bstInsertRot(it.k, it.p, 0);
    Object.assign(T, { N: silent.T.N, root: silent.T.root, seq: silent.T.seq });
    const k = +kk;
    pushFactory(F)(T, [], `Исходное декартово дерево из ${items.length} пар ⟨ключ, приоритет⟩. По ключам — дерево поиска, по приоритетам — куча (у отца больше). Сначала split по ключу ${k}, затем merge обратно.`, { big: true });
    const [t1, t2] = E.split(T.root, k, [0, 2, 3, [1, 4]]);
    const r = E.merge(t1, t2, 'T₁', 'T₂', [5, 7, 8, [6, 9]]);
    T.root = r;
    pushFactory(F)(T, [], `merge(T₁, T₂) собрал исходное дерево обратно${T.keys().length ? ` (ключи ${T.keys().join(', ')})` : ''}. Обе операции работают за O(h): на каждом шаге спускаемся на уровень ниже в одном из деревьев.`, { big: true });
    return F;
  }

  /* ---------- режим 3: вставка и удаление через split/merge («крутые») ---------- */
  function runCool({ ops: src }) {
    const ops = withPri(App.parseOps(src, true).ops), F = [];
    let opi = -1;
    const E = engine(pushFactory(F)), T = E.T, K = E.K;
    const push = (line, msg, x = {}) => pushFactory(F)(T, line, msg, { ops, opi, ...x });
    push([], 'Вставка: способ 1 (split + два merge). Удаление: способ 2 (вместо вершины — merge её детей).', { big: true });
    for (opi = 0; opi < ops.length; opi++) {
      E.setCtx({ ops, opi });
      const o = ops[opi];
      if (o.t === '+') {
        if (T.keys().includes(o.k)) { push(0, `Ключ ${o.k} уже есть.`, { big: true }); continue; }
        push(0, `Вставка ⟨${o.k}, ${o.p}⟩: создаём дерево T_k из одной вершины и разделяем T по ключу ${o.k}.`, { big: true });
        const [t1, t2] = E.split(T.root, o.k, [1, 1, 1, 1]);
        const n = T.add(o.k, { pri: o.p });
        const t1p = E.merge(t1, n, 'T₁', `T_k = ⟨${o.k}⟩`, [2, 2, 2, 2]);
        T.root = null;
        const r = E.merge(t1p, t2, 'T₁′', 'T₂', [3, 3, 3, 3]);
        T.root = r;
        push(3, `Новое дерево со вставленной вершиной ${o.k}.`, { mark: { [n]: 'cur' }, big: true });
      } else if (o.t === '-') {
        push(4, `Удаление ${o.k}: ищем вершину, как в дереве поиска.`, { big: true });
        const d = App.descend(T, o.k, push, 4);
        if (d.found == null) { push(4, `Ключа ${o.k} нет.`, {}); continue; }
        const z = d.found, p = T.N[z].p, side = p == null ? null : T.side(z), L = T.N[z].l, R = T.N[z].r;
        const keep = T.root;
        T.N[z].l = T.N[z].r = null;
        if (L != null) T.N[L].p = null;
        if (R != null) T.N[R].p = null;
        if (p != null) T.N[p][side] = null;
        delete T.N[z];
        T.root = p == null ? null : keep;
        push(5, `Вместо вершины ${o.k} ставим merge(L, R) её левого и правого поддеревьев (все ключи L меньше ключей R).`, {});
        const m = E.merge(L, R, 'L', 'R', [5, 5, 5, 5]);
        if (p == null) T.root = m; else { T.root = keep; T.setChild(p, side, m); }
        push(5, `Подвешиваем результат на место удалённой вершины.`, { mark: m != null ? { [m]: 'cur' } : {}, big: true });
      } else {
        push(0, `Поиск ${o.k}.`, { big: true });
        const d = App.descend(T, o.k, push, 0);
        push(0, d.found != null ? 'Нашли.' : 'Нет такого ключа.', {});
      }
    }
    opi = ops.length;
    push([], `Готово. Ключи: ${T.keys().join(', ') || '—'}; высота ${T.h(T.root)}.`, { big: true });
    return F;
  }

  const render = (f) =>
    (f.ops ? App.opsChips(f.ops.map((o) => ({ ...o })), f.opi) : '') +
    App.btree(f.S, { forest: f.forest, label: (id) => `⟨${f.S.N[id].key}, ${f.S.N[id].pri}⟩`, cls: (id) => (f.mark || {})[id] });
  const vOps = (v) => { const r = App.parseOps(v.ops, true); return r.err || (r.ops.filter((o) => o.t === '+').length > 16 ? 'Не больше 16 вставок.' : null); };

  App.register({
    id: 'treap', block: 2, num: 8, title: 'Декартовы деревья',
    full: '8. Декартовы деревья. Основные операции. Операции split и merge. Оценка алгоритмической сложности.',
    modes: [
      {
        id: 'sm', label: 'split и merge',
        note: 'Пары «ключ:приоритет» через пробел (без «:p» приоритет выбирается псевдослучайно). Вершина показана как ⟨ключ, приоритет⟩.',
        inputs: [
          { id: 'keys', label: 'Вершины', raw: true, value: '50:90 30:70 70:80 20:40 40:60 60:30 80:50 35:20 45:10', max: 90, w: 30 },
          { id: 'K', label: 'Ключ split', value: '42', max: 3, w: 5 },
        ],
        validate: (v) => vOps({ ops: v.keys }) || (/^\d{1,3}$/.test(v.K) ? null : 'Ключ split — число 0–999.'),
        presets: [
          { label: 'по 42', v: { keys: '50:90 30:70 70:80 20:40 40:60 60:30 80:50 35:20 45:10', K: '42' } },
          { label: 'по 65', v: { keys: '50:90 30:70 70:80 20:40 40:60 60:30 80:50 35:20 45:10', K: '65' } },
          { label: 'всё в одну часть', v: { keys: '10:5 20:9 30:7', K: '99' } },
        ],
        legend: [['t1', 'ушло в T₁ / текущий'], ['t2', 'ушло в T₂'], ['ok', 'выбрано корнем при merge'], ['ring', 'с кем сравниваем']],
        code: [
          'split(T, key) → (T₁, T₂):',
          '  T = nullptr → (nullptr, nullptr)',
          '  key(T) ≤ key: (R₁, R₂) = split(T.R, key);  T.R = R₁;  return (T, R₂)',
          '  key(T) > key: (L₁, L₂) = split(T.L, key);  T.L = L₂;  return (L₁, T)',
          '  все ключи T₁ ≤ key < все ключи T₂',
          'merge(T₁, T₂):  (ключи T₁ < ключи T₂)',
          '  одно пустое → вернуть другое',
          '  p₁ > p₂: T₁.R = merge(T₁.R, T₂);  return T₁',
          '  p₁ < p₂: T₂.L = merge(T₁, T₂.L);  return T₂',
          '  время O(h₁ + h₂)',
        ],
        run: runSM, render,
      },
      {
        id: 'rot', label: 'Вставка и удаление поворотами',
        note: 'Операции через пробел: «7:40» — вставка ключа 7 с приоритетом 40 («7» — со случайным), «-7» — удаление, «?7» — поиск.',
        inputs: [{ id: 'ops', label: 'Операции', raw: true, value: '50:60 30:40 70:50 20:30 40:80 -50', max: 90, w: 28 }],
        validate: vOps,
        presets: [
          { label: 'всплытие в корень', v: { ops: '50:60 30:40 70:50 20:30 40:80 -50' } },
          { label: 'по возрастанию ключей', v: { ops: '1 2 3 4 5 6 7 8 9 10' } },
          { label: 'удаление корня', v: { ops: '50:99 30:70 70:80 20:10 40:60 60:50 80:40 -50' } },
        ],
        legend: [['ring', 'текущая вершина'], ['rot', 'поворот'], ['ok', 'новая вершина']],
        code: [
          'поиск — как в дереве поиска, O(h)',
          'вставка: как в дереве поиска — новый лист',
          '  пока у отца приоритет меньше — поворот вершины с отцом',
          'удаление: найти вершину',
          '  пока два ребёнка — поворот с ребёнком с бо́льшим приоритетом',
          '  детей < 2 — удалить, как в дереве поиска',
        ],
        run: runRot, render,
      },
      {
        id: 'cool', label: 'Вставка и удаление через split/merge',
        note: '«Крутые» операции: вставка — split и два merge, удаление — merge детей удаляемой вершины.',
        inputs: [{ id: 'ops', label: 'Операции', raw: true, value: '50:60 30:40 70:50 20:30 40:80 -40', max: 90, w: 28 }],
        validate: vOps,
        presets: [
          { label: 'обычный', v: { ops: '50:60 30:40 70:50 20:30 40:80 -40' } },
          { label: 'вставка в корень', v: { ops: '20:30 60:40 40:90' } },
        ],
        legend: [['t1', 'T₁ / текущий'], ['t2', 'T₂'], ['ok', 'выбрано корнем при merge']],
        code: [
          'поиск — как в дереве поиска',
          'вставка ⟨k, p⟩:  (T₁, T₂) = split(T, k)',
          '  T₁′ = merge(T₁, ⟨k, p⟩)',
          '  T = merge(T₁′, T₂)',
          'удаление k: найти вершину, как в дереве поиска',
          '  вместо неё — merge(её L, её R)',
        ],
        run: runCool, render,
      },
    ],
    theory: `
<div class="def"><b>Определение.</b> Декартово дерево (treap) — объединение бинарного дерева поиска и кучи. В каждой вершине пара ⟨ключ, приоритет⟩. Ключи в левом сыне меньше ключа вершины, в правом — больше. Приоритет в детях всегда либо больше (восходящий приоритет), либо меньше (нисходящий). Дальше — нисходящий: у отца приоритет больше.</div>
<p>Интересное свойство: при фиксированных парах дерево определено однозначно — корень всегда вершина с наибольшим приоритетом, слева от неё ключи меньше, справа — больше. Поэтому при вставке в любом порядке получается одно и то же дерево.</p>

<h3>Поиск — O(h)</h3>
<p>Так же, как в бинарном дереве поиска.</p>

<h3>Вставка и удаление поворотами («не крутые») — O(h)</h3>
<ul>
<li><b>Вставка:</b> вставляем как в дереве поиска (новый лист) и чиним приоритеты: пока у отца приоритет меньше, чем у вершины, делаем поворот между ней и отцом.</li>
<li><b>Удаление:</b> если детей меньше двух — удаляем как в дереве поиска. Пока детей два — берём ребёнка с бо́льшим приоритетом и делаем поворот между ним и нашей вершиной. Когда вершина опустилась (детей < 2), удаляем её.</li>
</ul>

<h3>split — O(h)</h3>
<p>Разделяет одно дерево по ключу на два: split(T, key) → (T₁, T₂), T₁ ∪ T₂ = T, T₁ ∩ T₂ = ∅, все ключи T₁ ≤ key, все ключи T₂ &gt; key.</p>
<ul>
<li>Если пришёл nullptr — конец (возвращаем два пустых дерева).</li>
<li>Если ключ в вершине ≤ key, то в её левом поддереве все ключи тоже меньше key. Запускаем split(R, key) от правого поддерева, получаем R₁ (ключи ≤ key) и R₂ (&gt; key). Составляем T₁: корень — данная вершина, левое поддерево без изменений, правым становится R₁. T₂ = R₂.</li>
<li>Если ключ в вершине &gt; key — симметрично: split(L, key) = (L₁, L₂), левым сыном вершины становится L₂, T₁ = L₁, T₂ — данная вершина.</li>
</ul>
<p>Каждый вызов спускается на уровень ниже — O(h).</p>

<h3>merge — O(h₁ + h₂)</h3>
<p>Собирает одно дерево из двух, если все ключи T₁ меньше ключей T₂. Слияние непустого дерева с пустым возвращает непустое. Иначе корни ⟨k₁, p₁⟩ и ⟨k₂, p₂⟩:</p>
<ul>
<li>p₁ &gt; p₂: корнем становится ⟨k₁, p₁⟩ (чтобы выполнялось условие приоритетов), левое поддерево остаётся, правое = merge(R₁, T₂);</li>
<li>p₁ &lt; p₂: корнем становится ⟨k₂, p₂⟩, правое поддерево остаётся, левое = merge(T₁, L₂).</li>
</ul>

<h3>«Крутые» вставка и удаление — O(h)</h3>
<ul>
<li><b>Вставка, способ 1:</b> создаём дерево T<sub>k</sub> из одной вершины; split(T, key) → T₁, T₂; T₁′ = merge(T₁, T<sub>k</sub>); T = merge(T₁′, T₂).</li>
<li><b>Вставка, способ 2:</b> спускаемся как в дереве поиска, пока приоритет в вершине больше p. Как только встретили вершину с меньшим приоритетом — наша вершина должна стать корнем этого поддерева T′: делаем split(T′, key) и подвешиваем T₁ и T₂ детьми новой вершины.</li>
<li><b>Удаление, способ 1:</b> split(T, key) → T₁ (≤ key), T₂; split(T₁, key − ε) → T₁′ (&lt; key) и дерево из одной вершины key; T = merge(T₁′, T₂).</li>
<li><b>Удаление, способ 2:</b> находим вершину, как в дереве поиска, и ставим на её место merge её левого и правого поддеревьев.</li>
</ul>

<h3>Высота</h3>
<div class="thm"><b>Теорема.</b> Если приоритеты независимы и равномерно распределены, математическое ожидание высоты O(log n), поэтому все операции работают в среднем за O(log n).</div>
<div class="proof"><p>Пусть ключи отсортированы: x₁ &lt; … &lt; x<sub>n</sub>. Вершина x<sub>i</sub> — предок x<sub>j</sub> тогда и только тогда, когда у x<sub>i</sub> наибольший приоритет среди x<sub>min(i,j)</sub>, …, x<sub>max(i,j)</sub> (иначе их разделит вершина с бо́льшим приоритетом между ними). Вероятность этого 1/(|i − j| + 1). Значит, ожидаемая глубина x<sub>j</sub> = Σ<sub>i≠j</sub> 1/(|i − j| + 1) ≤ 2·H<sub>n</sub> ≈ 2 ln n = O(log n). Это та же оценка, что для случайного дерева поиска: декартово дерево — дерево поиска, в которое ключи вставлены в порядке убывания приоритетов.</p></div>`,
  });
})(window.App);
