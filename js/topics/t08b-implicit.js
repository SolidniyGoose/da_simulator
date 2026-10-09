/* Дополнение к билету 8. Неявное декартово дерево (treap с неявным ключом):
   ключ вершины — её позиция в массиве = число вершин левее. split по количеству, merge,
   вставка/удаление по индексу, разворот и сумма на отрезке с ленивым флагом разворота. Индексы с 0. */
(function (App) {
  'use strict';
  const SRC = 'Seidel R., Aragon C. «Randomized Search Trees»; Mehta D., Sahni S. «Handbook of Data Structures and Applications», гл. 28; конспекты ИТМО (neerc.ifmo.ru/wiki)';

  const parseOps = (s) => {
    const out = [];
    for (const part of s.split(/[;,\n]+/).map((x) => x.trim()).filter(Boolean)) {
      const m = /^(ins|del|rev|sum|get)\s+(\d{1,2})(?:\s+(-?\d{1,3}))?$/i.exec(part);
      if (!m) return { err: `Не понял «${part}». Команды через «;»: ins i x, del i, rev l r, sum l r, get i.` };
      const op = m[1].toLowerCase(), a = +m[2], b = m[3] != null ? +m[3] : null;
      if ((op === 'ins' || op === 'rev' || op === 'sum') && b == null) return { err: `В «${part}» не хватает второго числа.` };
      out.push({ op, a, b });
    }
    return { ops: out };
  };
  const opName = (o) => ({ ins: `вставить ${o.b} на позицию ${o.a}`, del: `удалить позицию ${o.a}`, rev: `развернуть [${o.a}, ${o.b}]`, sum: `сумма [${o.a}, ${o.b}]`, get: `элемент ${o.a}` })[o.op];

  function run({ arr, ops: src }) {
    const vals = arr.split(/[\s,;]+/).filter(Boolean).map(Number), { ops } = parseOps(src);
    const T = new App.BT(), F = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return 1 + (seed % 99); };
    const N = T.N;
    const cnt = (t) => (t == null ? 0 : N[t].cnt);
    const sum = (t) => (t == null ? 0 : N[t].sum);
    const upd = (t) => { if (t != null) { N[t].cnt = 1 + cnt(N[t].l) + cnt(N[t].r); N[t].sum = N[t].key + sum(N[t].l) + sum(N[t].r); } };
    const updAll = (t) => { if (t == null) return; updAll(N[t].l); updAll(N[t].r); upd(t); };
    let forest = null, opi = -1;
    const arrayOf = (t, flip = false, out = []) => {
      if (t == null) return out;
      const f = flip !== !!N[t].rev, a = f ? N[t].r : N[t].l, b = f ? N[t].l : N[t].r;
      arrayOf(a, f, out); out.push(N[t].key); arrayOf(b, f, out);
      return out;
    };
    const push = (line, msg, x = {}) => {
      if (forest) forest.forEach((f) => updAll(f.root)); else updAll(T.root);
      F.push({ line, msg, S: T.snap(), forest: forest ? forest.map((f) => ({ ...f })) : null, arr: forest ? null : arrayOf(T.root), ops, opi, ...x,
        vars: [['операция', opi >= 0 && opi < ops.length ? opName(ops[opi]) : '—'], ['элементов', cnt(T.root) || (forest ? forest.reduce((s, f) => s + cnt(f.root), 0) : 0)]] });
    };
    // проталкивание флага разворота
    const pushDown = (t, line) => {
      if (t == null || !N[t].rev) return;
      const X = N[t];
      [X.l, X.r] = [X.r, X.l];
      for (const c of [X.l, X.r]) if (c != null) N[c].rev = !N[c].rev;
      X.rev = false;
      push(line, `У вершины ${X.key} стоит флаг разворота: проталкиваем его — меняем местами детей и переносим флаг на них. Делаем это перед любым спуском через вершину.`, { mark: { [t]: 'rot' } });
    };

    // split(t, k): в L — первые k элементов, в R — остальные
    const split = (t, k, line, labels = ['L (первые ' + k + ')', 'R']) => {
      let a = null, b = null, la = null, ra = null, cur = t, need = k;
      const show = (msg, mark = {}, big) => { forest = [{ root: a, label: labels[0] }, { root: b, label: labels[1] }, { root: cur, label: 'ещё делим' }]; push(line, msg, { mark, big }); };
      show(`split(T, ${k}): отделяем первые ${k} элементов. Ключ неявный — сравниваем не ключи, а размеры: cnt(левого поддерева) + 1 — позиция вершины внутри её поддерева.`, cur != null ? { [cur]: 'cur' } : {}, true);
      while (cur != null) {
        pushDown(cur, line);
        const C = N[cur], left = cnt(C.l), was = cur, need0 = need;
        if (left < need) {
          const nx = C.r;
          C.r = null; if (nx != null) N[nx].p = null;
          if (la == null) { a = cur; C.p = null; } else { N[la].r = cur; C.p = la; }
          la = cur; need -= left + 1; cur = nx;
          show(`cnt(left) = ${left} < ${need0}: вершина ${C.key} и её левое поддерево (${left + 1} эл.) целиком в левой части. Дальше делим правое поддерево, отделяя ещё ${need}.`, { [was]: 't1' });
        } else {
          const nx = C.l;
          C.l = null; if (nx != null) N[nx].p = null;
          if (ra == null) { b = cur; C.p = null; } else { N[ra].l = cur; C.p = ra; }
          ra = cur; cur = nx;
          show(`cnt(left) = ${left} ≥ ${need}: вершина ${C.key} и правое поддерево — в правой части. Дальше делим левое поддерево, отделяя ${need}.`, { [was]: 't2' });
        }
      }
      show('Пришли в nullptr — split закончен. Размеры поддеревьев пересчитываются на выходе из рекурсии.', {}, true);
      forest = null;
      return [a, b];
    };
    const merge = (a, b, line, la = 'L', lb = 'R') => {
      let res = null, hp = null, hs = null;
      const attach = (id) => { if (hp == null) { res = id; N[id].p = null; } else { N[hp][hs] = id; N[id].p = hp; } };
      const show = (msg, mark = {}, big) => { forest = [{ root: res, label: 'результат' }, { root: a, label: la }, { root: b, label: lb }]; push(line, msg, { mark, big }); };
      show(`merge(${la}, ${lb}): элементы ${la} идут раньше элементов ${lb}. Больший приоритет становится корнем.`, {}, true);
      while (a != null && b != null) {
        if (N[a].pri > N[b].pri) {
          pushDown(a, line);
          const nx = N[a].r, was = a;
          N[a].r = null; if (nx != null) N[nx].p = null;
          attach(a); hp = a; hs = 'r'; a = nx;
          show(`p(${N[was].key}) = ${N[was].pri} > p(${N[b].key}) = ${N[b].pri}: корень — ${N[was].key}, его правое поддерево = merge(R, ${lb}).`, { [was]: 'done' });
        } else {
          pushDown(b, line);
          const nx = N[b].l, was = b;
          N[b].l = null; if (nx != null) N[nx].p = null;
          attach(b); hp = b; hs = 'l'; b = nx;
          show(`p(${N[a].key}) = ${N[a].pri} ≤ p(${N[was].key}) = ${N[was].pri}: корень — ${N[was].key}, его левое поддерево = merge(${la}, L).`, { [was]: 'done' });
        }
      }
      const rest = a ?? b;
      if (rest != null) attach(rest);
      show('Одно из деревьев закончилось — подвешиваем остаток целиком.', {}, true);
      forest = null;
      return res;
    };

    // построение: последовательная вставка в конец через merge (без кадров)
    for (const v of vals) {
      const id = T.add(v, { pri: rnd(), cnt: 1, sum: v, rev: false });
      let r = T.root, res = null, hp = null, hs = null, a = r, b = id;
      while (a != null && b != null) {
        if (N[a].pri > N[b].pri) { const nx = N[a].r; N[a].r = null; if (nx != null) N[nx].p = null; if (hp == null) { res = a; N[a].p = null; } else { N[hp][hs] = a; N[a].p = hp; } hp = a; hs = 'r'; a = nx; }
        else { const nx = N[b].l; N[b].l = null; if (nx != null) N[nx].p = null; if (hp == null) { res = b; N[b].p = null; } else { N[hp][hs] = b; N[b].p = hp; } hp = b; hs = 'l'; b = nx; }
      }
      const rest = a ?? b;
      if (rest != null) { if (hp == null) { res = rest; N[rest].p = null; } else { N[hp][hs] = rest; N[rest].p = hp; } }
      T.root = res;
      updAll(T.root);
    }
    push([], `Неявное декартово дерево массива [${vals.join(', ')}]: симметричный обход даёт массив по порядку, а «ключ» вершины — её индекс — нигде не хранится. Храним размер поддерева cnt (бейдж «c»), сумму и флаг разворота. Бейдж «p» — приоритет.`, { big: true });

    for (opi = 0; opi < ops.length; opi++) {
      const o = ops[opi], n = cnt(T.root);
      if (o.op === 'ins') {
        const i = Math.min(o.a, n);
        push(0, `Вставка ${o.b} на позицию ${i}: split(T, ${i}) → L (первые ${i}) и R; merge(merge(L, ⟨${o.b}⟩), R).`, { big: true });
        const [L, R] = split(T.root, i, 1); T.root = null;
        const id = T.add(o.b, { pri: rnd(), cnt: 1, sum: o.b, rev: false });
        const L2 = merge(L, id, 2, 'L', `⟨${o.b}⟩`);
        T.root = merge(L2, R, 2, 'L + ⟨' + o.b + '⟩', 'R');
        push(2, `Готово: ${o.b} стоит на позиции ${i}. O(log n) в среднем.`, { mark: { [id]: 'new' } });
      } else if (o.op === 'del') {
        if (o.a >= n) { push(3, `Позиции ${o.a} нет (элементов ${n}).`, {}); continue; }
        push(3, `Удаление позиции ${o.a}: split(T, ${o.a}) → L, R; split(R, 1) → M (один элемент), R′; merge(L, R′).`, { big: true });
        const [L, R] = split(T.root, o.a, 3); T.root = null;
        const [M, R2] = split(R, 1, 3, ['M (удаляемый)', 'R′']);
        push(3, `Отделили элемент ${N[M].key} — выбрасываем его.`, { mark: { [M]: 'del' } });
        delete N[M];
        T.root = merge(L, R2, 4, 'L', 'R′');
        push(4, 'Готово.', {});
      } else if (o.op === 'get') {
        if (o.a >= n) { push(5, `Позиции ${o.a} нет.`, {}); continue; }
        push(5, `Элемент на позиции ${o.a}: спускаемся по размерам поддеревьев.`, { big: true });
        let t = T.root, k = o.a;
        const path = [];
        while (t != null) {
          pushDown(t, 5);
          path.push(t);
          const left = cnt(N[t].l);
          if (k === left) { push(5, `cnt(left) = ${left} = ${k} — это вершина ${N[t].key}. Ответ: ${N[t].key}.`, { mark: App.markPath(path, t, { [t]: 'new' }) }); break; }
          if (k < left) { push(5, `cnt(left) = ${left} > ${k} → влево.`, { mark: App.markPath(path, t) }); t = N[t].l; }
          else { push(5, `cnt(left) = ${left} < ${k} → вправо, ищем позицию ${k} − ${left} − 1 = ${k - left - 1}.`, { mark: App.markPath(path, t) }); k -= left + 1; t = N[t].r; }
        }
      } else {
        const l = Math.min(o.a, o.b), r = Math.min(Math.max(o.a, o.b), n - 1);
        push(6, `${o.op === 'rev' ? 'Разворот' : 'Сумма'} на отрезке [${l}, ${r}]: вырезаем его двумя split, работаем с вырезанным деревом и склеиваем обратно.`, { big: true });
        const [A, BC] = split(T.root, l, 6, ['A (до l)', 'B + C']); T.root = null;
        const [B, Cc] = split(BC, r - l + 1, 6, ['B = [l, r]', 'C (после r)']);
        if (o.op === 'rev') {
          N[B].rev = !N[B].rev;
          forest = [{ root: A, label: 'A' }, { root: B, label: 'B — флаг разворота' }, { root: Cc, label: 'C' }];
          push(7, `Не переставляем элементы B сразу — ставим в корень ${N[B].key} флаг разворота (O(1)). Поменять местами детей и передать флаг дальше успеем, когда будем спускаться через вершину.`, { mark: { [B]: 'rot' }, big: true });
          forest = null;
        } else {
          forest = [{ root: A, label: 'A' }, { root: B, label: 'B = [l, r]' }, { root: Cc, label: 'C' }];
          push(7, `Сумма отрезка хранится в корне B: sum = ${sum(B)}. O(log n).`, { mark: { [B]: 'new' }, big: true });
          forest = null;
        }
        const AB = merge(A, B, 8, 'A', 'B');
        T.root = merge(AB, Cc, 8, 'A + B', 'C');
        push(8, `Склеили обратно. Массив: [${arrayOf(T.root).join(', ')}].`, {});
      }
    }
    opi = ops.length;
    push([], `Готово. Массив: [${arrayOf(T.root).join(', ')}]. Каждая операция — O(1) split/merge, то есть O(log n) в среднем.`, { big: true });
    return F;
  }

  function render(f) {
    let h = `<div class="chips"><b>Операции:</b>${f.ops.map((o, i) => `<span class="${i === f.opi ? 'on' : i < f.opi ? 'ok' : ''}">${App.esc(opName(o))}</span>`).join('')}</div>`;
    if (f.arr) h += App.strip(Math.max(f.arr.length, 1), [{ type: 'idx', n: f.arr.length }, { type: 'chars', label: 'массив', chars: f.arr.map(String) }]);
    h += App.btree(f.S, {
      forest: f.forest,
      label: (id) => String(f.S.N[id].key) + (f.S.N[id].rev ? ' ↔' : ''),
      badge: (id) => `p${f.S.N[id].pri} c${f.S.N[id].cnt}`,
      cls: (id) => (f.mark || {})[id],
    });
    return h;
  }

  App.register({
    id: 'itreap', block: 2, num: 8.5, label: '8+', title: 'Неявные декартовы деревья',
    full: 'Дополнение к билету 8. Декартово дерево по неявному ключу: операции над массивом по индексам.',
    modes: [{
      id: 'main', label: 'Операции над массивом',
      note: 'Команды через «;»: ins i x — вставить x на позицию i, del i — удалить позицию i, get i — элемент, rev l r — развернуть отрезок, sum l r — сумма отрезка. Индексы с 0. Бейджи: p — приоритет, c — размер поддерева; ↔ — флаг разворота.',
      inputs: [
        { id: 'arr', label: 'Исходный массив', raw: true, value: '5 1 4 2 8 3', max: 60, w: 16 },
        { id: 'ops', label: 'Команды', raw: true, value: 'rev 1 4; get 2; ins 0 7; sum 1 3; del 3', max: 120, w: 28 },
      ],
      validate: (v) => {
        const a = v.arr.split(/[\s,;]+/).filter(Boolean);
        if (!a.length || a.length > 12 || a.some((x) => !/^-?\d{1,3}$/.test(x))) return 'Массив: от 1 до 12 целых чисел.';
        const r = parseOps(v.ops);
        return r.err || (r.ops.length > 6 ? 'Не больше 6 команд — каждая даёт много шагов.' : null);
      },
      presets: [
        { label: 'разворот и сумма', v: { arr: '5 1 4 2 8 3', ops: 'rev 1 4; get 2; ins 0 7; sum 1 3; del 3' } },
        { label: 'вставки по индексу', v: { arr: '1 2 3', ops: 'ins 1 9; ins 0 8; ins 5 7; get 4' } },
        { label: 'циклический сдвиг', v: { arr: '1 2 3 4 5 6', ops: 'rev 0 5; rev 0 1; rev 2 5' } },
      ],
      legend: [['t1', 'ушло в левую часть'], ['t2', 'ушло в правую часть'], ['ok', 'выбрано при merge'], ['rot', 'флаг разворота']],
      code: [
        'вставка x на позицию i:',
        '  (L, R) = split(T, i)                     // по количеству',
        '  T = merge(merge(L, ⟨x⟩), R)',
        'удаление позиции i:  (L, R) = split(T, i);  (M, R′) = split(R, 1)',
        '  T = merge(L, R′)',
        'элемент i: cnt(left) = i → здесь; меньше → вправо (i −= cnt(left)+1); больше → влево',
        'отрезок [l, r]:  (A, BC) = split(T, l);  (B, C) = split(BC, r − l + 1)',
        '  rev: B.rev ^= 1 (лениво);  sum: ответ = B.sum',
        '  T = merge(merge(A, B), C)',
      ],
      run, render,
    }],
    theory: `
<h3>Идея</h3>
<p>Возьмём декартово дерево и вместо ключа будем использовать позицию элемента в массиве. Саму позицию не храним: ключ вершины — это количество вершин левее неё в симметричном обходе. Внутри поддерева он равен cnt(левого поддерева), поэтому в каждой вершине храним <b>cnt</b> — размер поддерева — и пересчитываем его на выходе из split и merge: cnt = 1 + cnt(L) + cnt(R).</p>
<p>Приоритеты по-прежнему случайные, поэтому ожидаемая высота O(log n), как у обычного декартова дерева. Порядок элементов — симметричный обход, то есть дерево хранит массив.</p>

<h3>split по количеству — O(log n)</h3>
<p>split(T, k) отделяет первые k элементов. В вершине с cnt(L) = s:</p>
<ul><li>s &lt; k — вершина и всё левое поддерево идут в левую часть, рекурсивно split(R, k − s − 1), левая часть результата становится правым сыном вершины;</li>
<li>s ≥ k — вершина и правое поддерево идут в правую часть, рекурсивно split(L, k), правая часть результата становится левым сыном.</li></ul>
<h3>merge — O(log n)</h3>
<p>Как в обычном декартовом дереве: корнем становится вершина с бо́льшим приоритетом. Все элементы первого дерева в массиве стоят раньше элементов второго.</p>

<h3>Операции</h3>
<ul>
<li><b>Вставка x на позицию i:</b> (L, R) = split(T, i); T = merge(merge(L, ⟨x⟩), R).</li>
<li><b>Удаление позиции i:</b> (L, R) = split(T, i); (M, R′) = split(R, 1); T = merge(L, R′).</li>
<li><b>Элемент на позиции i:</b> спуск по размерам: если cnt(L) = i — ответ в вершине, если больше — влево, иначе вправо с i − cnt(L) − 1.</li>
<li><b>Операции на отрезке [l, r]:</b> вырезаем его — (A, BC) = split(T, l), (B, C) = split(BC, r − l + 1) — и работаем с корнем B: сумма, минимум и т. п. хранятся в вершинах и пересчитываются вместе с cnt. Потом T = merge(merge(A, B), C).</li>
<li><b>Разворот отрезка</b> — ленивая операция: в корень B ставим флаг rev. Перед любым спуском через вершину флаг «проталкиваем»: меняем местами детей и переворачиваем флаги у детей. Поэтому разворот стоит O(log n), а не O(r − l).</li>
<li><b>Циклический сдвиг</b> — три разворота или split + merge в другом порядке.</li>
</ul>
<p>Каждая операция — константное число split и merge: O(log n) в среднем. Неявное декартово дерево — удобная реализация «верёвки» (rope) — массива со вставкой, удалением, конкатенацией и разворотом кусков за O(log n).</p>
<p class="note">Где почитать (источники лектора): ${SRC}.</p>`,
  });
})(window.App);
