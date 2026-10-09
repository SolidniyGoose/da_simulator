/* Билет 9. B-деревья с характеристическим числом t: поиск, вставка (разбиение на спуске),
   удаление (балансировка на спуске: «своровать у брата» или слить). */
(function (App) {
  'use strict';
  const kl = (a) => `[${a.join(' ')}]`;

  function run({ ops: src, t: ts }) {
    const { ops } = App.parseOps(src);
    const t = +ts, MAX = 2 * t - 1, MIN = t - 1;
    const N = {}, F = [];
    let root = null, seq = 0, opi = -1;
    const node = (keys = [], kids = []) => { const id = ++seq; N[id] = { id, keys, kids }; return id; };
    const leaf = (x) => N[x].kids.length === 0;
    const height = () => { let h = 0; for (let v = root; v != null; v = N[v].kids[0]) { h++; if (leaf(v)) break; } return h; };
    const count = () => Object.values(N).reduce((s, x) => s + x.keys.length, 0);
    const snap = () => { const o = {}; for (const id in N) o[id] = { keys: N[id].keys.slice(), kids: N[id].kids.slice() }; return { N: o, root }; };
    const push = (line, msg, x = {}) => F.push({
      line, msg, S: snap(), ops, opi, ...x,
      vars: [['t', t], ['ключей в узле', `${MIN}…${MAX} (в корне 1…${MAX})`], ['ключей', count()], ['высота', height()], ['операция', opi >= 0 && opi < ops.length ? App.opName(ops[opi]) : '—']],
    });
    const pos = (x, k) => { let i = 0; while (i < N[x].keys.length && k > N[x].keys[i]) i++; return i; };
    const contains = (k) => { for (let x = root; x != null;) { const i = pos(x, k); if (N[x].keys[i] === k) return true; if (leaf(x)) return false; x = N[x].kids[i]; } return false; };
    const between = (x, i) => { const a = N[x].keys[i - 1], b = N[x].keys[i]; return a == null ? `меньше ${b}` : b == null ? `больше ${a}` : `между ${a} и ${b}`; };

    // разбиение полного сына c_i вершины x: средний ключ поднимается в x
    const splitChild = (x, i) => {
      const y = N[x].kids[i], Y = N[y], med = Y.keys[t - 1];
      const z = node(Y.keys.slice(t), Y.kids.slice(t));
      Y.keys = Y.keys.slice(0, t - 1);
      Y.kids = Y.kids.slice(0, leaf(y) ? 0 : t);
      N[x].keys.splice(i, 0, med);
      N[x].kids.splice(i + 1, 0, z);
      return { y, z, med };
    };
    // слияние c_i, ключа k_i и c_{i+1} в c_i
    const mergeKids = (x, i) => {
      const y = N[x].kids[i], z = N[x].kids[i + 1];
      N[y].keys = [...N[y].keys, N[x].keys[i], ...N[z].keys];
      N[y].kids = [...N[y].kids, ...N[z].kids];
      N[x].keys.splice(i, 1);
      N[x].kids.splice(i + 1, 1);
      delete N[z];
      return y;
    };
    const shrink = (line) => {
      if (root != null && N[root].keys.length === 0) {
        const old = root;
        root = N[old].kids.length ? N[old].kids[0] : null;
        delete N[old];
        push(line, root != null ? 'Корень опустел — его единственный сын становится новым корнем. Высота дерева уменьшилась на 1 (только так она и уменьшается).' : 'Дерево стало пустым.', { cls: { [root]: 'cur' }, big: true });
      }
    };

    const search = (k) => {
      push(0, `Поиск ${k}: в каждой вершине ищем ключ бинарным поиском; не нашли — идём в сына между соседними ключами.`, { big: true });
      let x = root, path = [];
      while (x != null) {
        path.push(x);
        const i = pos(x, k);
        if (N[x].keys[i] === k) { push(0, `В вершине ${kl(N[x].keys)} есть ${k} — нашли. Просмотрено вершин: ${path.length} (= высоте, O(log_t n)).`, { cls: { [x]: 'cur' }, kcls: { [x]: { [i]: 'cur' } } }); return; }
        if (leaf(x)) { push(0, `В листе ${kl(N[x].keys)} ключа ${k} нет — пришли в nullptr, ключа нет.`, { cls: { [x]: 'cur' } }); return; }
        push(0, `${kl(N[x].keys)}: ${k} ${between(x, i)} → идём в сына c${App.fmt.sub(i)}.`, { cls: { [x]: 'cur' }, edge: [x, i] });
        x = N[x].kids[i];
      }
      push(0, 'Дерево пустое.', {});
    };

    const insert = (k) => {
      push(1, `Вставка ${k}.`, { big: true });
      if (root == null) { root = node([k]); push(3, `Дерево пустое — создаём корень ${kl([k])}.`, { cls: { [root]: 'new' } }); return; }
      if (contains(k)) { push(1, `Ключ ${k} уже есть — ничего не делаем.`, {}); return; }
      if (N[root].keys.length === MAX) {
        push(1, `Корень ${kl(N[root].keys)} полон (2t − 1 = ${MAX} ключей). Разбиваем его заранее: средний ключ станет новым корнем.`, { cls: { [root]: 'full' }, big: true });
        const r = node([], [root]);
        root = r;
        const { y, z, med } = splitChild(r, 0);
        push(1, `Новый корень ${kl([med])}, слева ${kl(N[y].keys)}, справа ${kl(N[z].keys)}. Высота выросла на 1 — дерево растёт только вверх, поэтому все листья остаются на одном уровне.`, { cls: { [r]: 'new', [y]: 'mv', [z]: 'mv' }, big: true });
      }
      let x = root;
      for (;;) {
        let i = pos(x, k);
        if (leaf(x)) {
          N[x].keys.splice(i, 0, k);
          push(3, `${kl(N[x].keys)} — лист: вставляем ${k} на своё место. В листе ${N[x].keys.length} ≤ ${MAX} ключей — места хватает, потому что полные вершины мы разбили по дороге. Конец вставки.`, { cls: { [x]: 'new' }, kcls: { [x]: { [i]: 'new' } }, big: true });
          return;
        }
        push(2, `${kl(N[x].keys)}: ${k} ${between(x, i)} → дальше в сына c${App.fmt.sub(i)} = ${kl(N[N[x].kids[i]].keys)}.`, { cls: { [x]: 'cur' }, edge: [x, i] });
        const c = N[x].kids[i];
        if (N[c].keys.length === MAX) {
          push(4, `Балансировка: в сыне ${kl(N[c].keys)} уже 2t − 1 = ${MAX} ключей. Поднимаем его средний ключ ${N[c].keys[t - 1]} в текущую вершину, оставшиеся 2(t − 1) ключей делим пополам — это левый и правый сыновья поднятого ключа.`, { cls: { [x]: 'cur', [c]: 'full' }, big: true });
          const { y, z, med } = splitChild(x, i);
          push(4, `Получили ${kl(N[x].keys)} с сыновьями ${kl(N[y].keys)} и ${kl(N[z].keys)}. В отце было меньше 2t − 1 ключей (его разбили бы раньше), поэтому место для ${med} есть.`, { cls: { [x]: 'cur', [y]: 'mv', [z]: 'mv' }, kcls: { [x]: { [i]: 'mv' } } });
          if (k > N[x].keys[i]) i++;
        }
        x = N[x].kids[i];
      }
    };

    const del = (x, k) => {
      const X = N[x], i = pos(x, k), has = X.keys[i] === k;
      if (has && leaf(x)) {
        push(8, `${k} в листе ${kl(X.keys)} — просто удаляем. Балансировка на спуске гарантировала, что в листе больше t − 1 = ${MIN} ключей (или это корень).`, { cls: { [x]: 'cur' }, kcls: { [x]: { [i]: 'del' } } });
        X.keys.splice(i, 1);
        push(8, `Получили ${X.keys.length ? kl(X.keys) : 'пустой корень'}.`, { cls: { [x]: 'cur' } });
        return;
      }
      if (has) {
        const y = X.kids[i], z = X.kids[i + 1];
        if (N[y].keys.length >= t) {
          let v = y; while (!leaf(v)) v = N[v].kids[N[v].kids.length - 1];
          const pr = N[v].keys[N[v].keys.length - 1];
          push(9, `${k} во внутренней вершине ${kl(X.keys)}. У левого сына ${kl(N[y].keys)} больше t − 1 ключей — сведём к удалению из листа: меняем ${k} на ближайший ключ — максимум левого поддерева ${pr} — и удаляем ${pr} из левого поддерева.`, { cls: { [x]: 'cur', [y]: 'mv', [v]: 'mv' }, kcls: { [x]: { [i]: 'del' }, [v]: { [N[v].keys.length - 1]: 'mv' } } });
          X.keys[i] = pr;
          push(9, `Теперь в вершине ${kl(X.keys)}; удаляем ${pr} из сына.`, { cls: { [x]: 'cur' }, kcls: { [x]: { [i]: 'mv' } } });
          del(y, pr);
          return;
        }
        if (N[z].keys.length >= t) {
          let v = z; while (!leaf(v)) v = N[v].kids[0];
          const su = N[v].keys[0];
          push(9, `${k} во внутренней вершине ${kl(X.keys)}. Левый сын бедный, а у правого ${kl(N[z].keys)} больше t − 1 ключей: меняем ${k} на минимум правого поддерева ${su} и удаляем ${su} оттуда.`, { cls: { [x]: 'cur', [z]: 'mv', [v]: 'mv' }, kcls: { [x]: { [i]: 'del' }, [v]: { 0: 'mv' } } });
          X.keys[i] = su;
          push(9, `Теперь в вершине ${kl(X.keys)}; удаляем ${su} из сына.`, { cls: { [x]: 'cur' }, kcls: { [x]: { [i]: 'mv' } } });
          del(z, su);
          return;
        }
        push(10, `${k} во внутренней вершине, а в обоих детях по t − 1 = ${MIN} ключей: объединяем левого сына ${kl(N[y].keys)}, ключ ${k} и правого сына ${kl(N[z].keys)} в одну вершину и запускаем удаление из неё.`, { cls: { [x]: 'cur', [y]: 'mv', [z]: 'mv' }, kcls: { [x]: { [i]: 'mv' } }, big: true });
        mergeKids(x, i);
        push(10, `Слили: ${kl(N[y].keys)}.`, { cls: { [y]: 'new' } });
        shrink(11);
        del(y, k);
        return;
      }
      if (leaf(x)) { push(8, `Ключа ${k} нет в дереве — пришли в лист ${kl(X.keys)} и не нашли.`, { cls: { [x]: 'cur' } }); return; }
      let ci = i, c = X.kids[ci];
      push(5, `${kl(X.keys)}: ${k} ${between(x, i)} → собираемся идти в сына c${App.fmt.sub(i)} = ${kl(N[c].keys)}. Проверяем, есть ли в нём хотя бы t = ${t} ключей, чтобы потом было что удалять.`, { cls: { [x]: 'cur', [c]: 'path' }, edge: [x, i] });
      if (N[c].keys.length === MIN) {
        const ls = ci > 0 ? X.kids[ci - 1] : null, rs = ci < X.kids.length - 1 ? X.kids[ci + 1] : null;
        if (ls != null && N[ls].keys.length >= t) {
          push(6, `В сыне t − 1 = ${MIN} ключей, а у левого брата ${kl(N[ls].keys)} больше — воруем у брата: ключ отца ${X.keys[ci - 1]} спускается в сына, крайний правый ключ брата ${N[ls].keys[N[ls].keys.length - 1]} поднимается на его место${leaf(ls) ? '' : ', а крайний правый ребёнок брата подвязывается к спущенному ключу'}.`, { cls: { [x]: 'cur', [c]: 'path', [ls]: 'mv' }, kcls: { [x]: { [ci - 1]: 'mv' }, [ls]: { [N[ls].keys.length - 1]: 'mv' } }, big: true });
          N[c].keys.unshift(X.keys[ci - 1]);
          X.keys[ci - 1] = N[ls].keys.pop();
          if (!leaf(ls)) N[c].kids.unshift(N[ls].kids.pop());
          push(6, `Теперь в сыне ${kl(N[c].keys)} — можно спускаться.`, { cls: { [c]: 'new', [ls]: 'mv' }, kcls: { [x]: { [ci - 1]: 'mv' }, [c]: { 0: 'mv' } } });
        } else if (rs != null && N[rs].keys.length >= t) {
          push(6, `В сыне t − 1 = ${MIN} ключей, а у правого брата ${kl(N[rs].keys)} больше — воруем у брата: ключ отца ${X.keys[ci]} между сыном и братом спускается в сына, ближайший ключ брата ${N[rs].keys[0]} поднимается в отца${leaf(rs) ? '' : ', ближайший ребёнок брата подвязывается к спущенному ключу'}.`, { cls: { [x]: 'cur', [c]: 'path', [rs]: 'mv' }, kcls: { [x]: { [ci]: 'mv' }, [rs]: { 0: 'mv' } }, big: true });
          N[c].keys.push(X.keys[ci]);
          X.keys[ci] = N[rs].keys.shift();
          if (!leaf(rs)) N[c].kids.push(N[rs].kids.shift());
          push(6, `Теперь в сыне ${kl(N[c].keys)} — можно спускаться.`, { cls: { [c]: 'new', [rs]: 'mv' }, kcls: { [x]: { [ci]: 'mv' }, [c]: { [N[c].keys.length - 1]: 'mv' } } });
        } else {
          const j = rs != null ? ci : ci - 1, other = rs != null ? rs : ls;
          push(7, `В сыне и его брате ${kl(N[other].keys)} по t − 1 = ${MIN} ключей — объединяем сына, брата и ключ отца ${X.keys[j]} между ними в одну вершину (2t − 1 = ${MAX} ключей).`, { cls: { [x]: 'cur', [c]: 'path', [other]: 'mv' }, kcls: { [x]: { [j]: 'mv' } }, big: true });
          c = mergeKids(x, j);
          push(7, `Слили: ${kl(N[c].keys)}.`, { cls: { [c]: 'new' } });
          shrink(11);
        }
      } else push(5, `В сыне ${N[c].keys.length} ≥ t ключей — балансировка не нужна, спускаемся.`, { cls: { [c]: 'path' } });
      del(c, k);
    };

    push([], `B-дерево с t = ${t}: в каждой вершине от t − 1 = ${MIN} до 2t − 1 = ${MAX} ключей (в корне от 1), у вершины с n ключами n + 1 детей, все листья на одном уровне.`, { big: true });
    for (opi = 0; opi < ops.length; opi++) {
      const o = ops[opi];
      if (o.t === '+') insert(o.k);
      else if (o.t === '?') search(o.k);
      else {
        push(5, `Удаление ${o.k}: спускаемся от корня, по пути балансируем каждую вершину, в которую идём.`, { big: true });
        if (root == null) push(5, 'Дерево пустое.', {});
        else { del(root, o.k); shrink(11); }
      }
    }
    opi = ops.length;
    push([], `Готово. Ключей ${count()}, высота ${height()}. Оценка: h ≤ 1 + log_t((n + 1)/2).`, { big: true });
    return F;
  }

  App.register({
    id: 'btree', block: 2, num: 9, title: 'B-деревья',
    full: '9. B-деревья. Основные операции. Оценка алгоритмической сложности выполнения операций.',
    modes: [{
      id: 'main', label: 'Операции',
      note: 'Операции через пробел: «7» — вставка, «-7» — удаление, «?7» — поиск. t — характеристическое число.',
      inputs: [
        { id: 'ops', label: 'Операции', raw: true, value: '10 20 30 40 50 60 70 80 90 25 35 -60 -70 -20', max: 120, w: 30 },
        { id: 't', label: 't', type: 'select', value: '2', options: [['2', 't = 2 (1…3 ключа)'], ['3', 't = 3 (2…5 ключей)']] },
      ],
      validate: (v) => { const r = App.parseOps(v.ops); return r.err || (r.ops.filter((o) => o.t === '+').length > 30 ? 'Не больше 30 вставок.' : null); },
      presets: [
        { label: 'рост вверх', v: { ops: '10 20 30 40 50 60 70 80 90', t: '2' } },
        { label: 'все случаи удаления', v: { ops: '10 70 20 40 60 80 50 90 100 30 -70 -80 -10', t: '2' } },
        { label: 'удаления: воровство и слияние', v: { ops: '10 20 30 40 50 60 70 80 90 25 35 -60 -70 -20', t: '2' } },
        { label: 'удаление из внутренней', v: { ops: '1 2 3 4 5 6 7 8 9 10 -4 -8 -2', t: '2' } },
        { label: 't = 3', v: { ops: '5 10 15 20 25 30 35 40 45 50 12 -30 -35 -40', t: '3' } },
      ],
      legend: [['blk', 'текущая вершина / ключ'], ['bad', 'полная вершина / удаляемый ключ'], ['skip', 'переезжающие ключи'], ['ok', 'результат шага']],
      code: [
        'поиск: бинпоиск в вершине; не нашли — в сына между ключами',
        'вставка: корень полон (2t − 1) → разбить, высота +1',
        '  спускаемся к листу, в каждой вершине выбираем сына',
        '  лист: вставляем ключ на его место',
        '  сын полон → средний ключ вверх, остальное пополам',
        'удаление: спуск; в сыне должно быть ≥ t ключей',
        '  у сына t − 1, у брата ≥ t → своровать через отца',
        '  у сына и братьев по t − 1 → слить с ключом отца',
        '  ключ в листе → просто удалить',
        '  ключ во внутренней, у сына ≥ t → заменить соседним, удалить его',
        '  ключ во внутренней, у детей по t − 1 → слить, удалять дальше',
        '  корень опустел → высота −1',
      ],
      run,
      render: (f) => App.opsChips(f.ops, f.opi) + App.bbtree(f.S, {
        cls: (id) => (f.cls || {})[id],
        kcls: (id, i) => ((f.kcls || {})[id] || {})[i],
        edge: (id, i) => (f.edge && f.edge[0] === id && f.edge[1] === i ? 'path' : ''),
      }),
    }],
    theory: `
<p>B-деревья нужны для хранения большого количества элементов на диске, а не в ОЗУ: подгружаем только нужные вершины, а ключи одной вершины лежат в памяти подряд — их читают за одно обращение к диску.</p>
<div class="def"><b>Определение.</b> Сильноветвящееся дерево с характеристическим числом t (t ≥ 2), в котором:
<ul><li>в каждой вершине t − 1 ≤ n ≤ 2t − 1 ключей (в корне — только верхняя граница), k₁ &lt; … &lt; k<sub>n</sub>;</li>
<li>у внутренней вершины n + 1 детей c₀, …, c<sub>n</sub> (тоже B-деревья), и все ключи в c<sub>i</sub> лежат между k<sub>i</sub> и k<sub>i+1</sub> (k₀ = −∞, k<sub>n+1</sub> = +∞);</li>
<li>все листья на одном уровне — дерево идеально сбалансировано.</li></ul></div>

<h3>Высота — O(log<sub>t</sub> n)</h3>
<p>Минимальное число ключей в дереве высоты h: в корне 1 ключ, на уровне i ≥ 1 не меньше 2t<sup>i−1</sup> вершин по t − 1 ключей:</p>
<p class="m">n ≥ 1 + (t − 1)·Σ<sub>i=1</sub><sup>h−1</sup> 2t<sup>i−1</sup> = 1 + 2(t − 1)·(t<sup>h−1</sup> − 1)/(t − 1) = 2t<sup>h−1</sup> − 1.</p>
<p>Отсюда (n + 1)/2 ≥ t<sup>h−1</sup>, то есть h ≤ 1 + log<sub>t</sub>((n + 1)/2) = O(log<sub>t</sub> n).</p>

<h3>Поиск — O(log n)</h3>
<p>В вершине ищем ключ бинарным поиском. Если k<sub>i</sub> = key — нашли. Иначе ключ лежит между какими-то k<sub>i</sub> &lt; key &lt; k<sub>i+1</sub> — ищем дальше в c<sub>i</sub>. Пришли в nullptr — ключа нет.</p>
<p>Сложность: O(log<sub>t</sub> n) загрузок вершин с диска; бинарный поиск в вершине O(log<sub>2</sub> t) на уровне; итого O(log<sub>t</sub> n · log<sub>2</sub> t) = O(log<sub>2</sub> n) операций процессора.</p>

<h3>Вставка — O(t·log<sub>t</sub> n)</h3>
<p>Идём до листа, попутно запуская балансировку от каждой вершины, и вставляем ключ в лист. Балансировка вершины x перед спуском в сына:</p>
<ul><li>если в сыне меньше 2t − 1 ключей — ничего не делаем;</li>
<li>иначе поднимаем средний ключ сына в x, а оставшиеся 2(t − 1) ключей делим пополам — они становятся левым и правым сыном поднятого ключа.</li></ul>
<p>Если полон сам корень, его разбивают, и средний ключ становится новым корнем — только так растёт высота, поэтому листья всегда на одном уровне. Разбиение стоит O(t), их не больше одного на уровень.</p>

<h3>Удаление — O(t·log<sub>t</sub> n)</h3>
<p>Сначала ищем, откуда удалять, попутно балансируя каждую вершину, в которую идём (начиная с корня). Балансировка: у ребёнка c<sub>i</sub>, куда идём, должно быть хотя бы t ключей, чтобы потом было что забрать. Три случая:</p>
<ol><li>в ребёнке больше t − 1 ключей — ничего не делаем, идём дальше;</li>
<li>в ребёнке t − 1 ключей, но у брата больше: ключ отца между ними спускается в ребёнка, ближайший к ребёнку ключ брата поднимается в отца, ближайший ребёнок брата подвязывается к спущенному ключу;</li>
<li>в ребёнке и его братьях по t − 1 ключей: объединяем в одну вершину ребёнка, брата и ключ отца между ними. Это единственный случай, когда высота может уменьшиться — если он произошёл в корне и тот опустел.</li></ol>
<p><b>Удаление из листа</b> (случаи параллельны балансировке): если в листе больше t − 1 ключей — просто удаляем; если t − 1, но у брата больше — воруем через отца; если и у брата t − 1 — объединяемся с братом, спустив ключ отца. При балансировке на спуске до листа всегда доходим с ≥ t ключами, и остаётся первый случай.</p>
<p><b>Удаление из внутренней вершины:</b></p>
<ul><li>есть сын, у которого больше t − 1 ключей — сводим к удалению из листа: меняем удаляемый ключ на ближайший в этом сыне (максимум левого или минимум правого поддерева) и удаляем тот ключ;</li>
<li>в обоих детях по t − 1 ключей — объединяем их с удаляемым ключом и запускаем удаление из новой объединённой вершины.</li></ul>`,
  });
})(window.App);
