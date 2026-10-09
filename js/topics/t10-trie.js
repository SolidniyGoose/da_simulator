/* Билет 10. Trie (бор) и compact trie (сжатый бор): поиск, вставка, удаление. */
(function (App) {
  'use strict';
  const { c: C, s: SS } = App.fmt;

  const parseWords = (s) => {
    const out = [];
    for (const t of s.split(/[\s,;]+/).filter(Boolean)) {
      const m = /^([+\-?]?)([a-zа-яё]{1,10})$/i.exec(t);
      if (!m) return { err: `Не понял «${t}». Слова из букв (до 10): «cat» — вставка, «-cat» — удаление, «?cat» — поиск.` };
      out.push({ t: m[1] || '+', w: m[2].toLowerCase() });
    }
    return { ops: out };
  };
  const opName = (o) => ({ '+': 'вставка', '-': 'удаление', '?': 'поиск' })[o.t] + ' ' + o.w;

  function engine(compact, sentinel) {
    const N = [{ id: 0, par: -1, lab: '', ch: {}, term: false }];
    const snap = () => N.map((x) => (x ? { ...x, ch: { ...x.ch } } : null));
    const add = (par, lab) => { const id = N.length; N.push({ id, par, lab, ch: {}, term: false }); N[par].ch[lab[0]] = id; return id; };
    const word = (id) => { let s = ''; for (let v = id; v > 0; v = N[v].par) s = N[v].lab + s; return s; };
    const count = () => N.filter(Boolean).length;
    return { N, snap, add, word, count, compact, sentinel };
  }

  function run({ ops: src, mode, end }) {
    const compact = mode === 'compact', sentinel = end === 'sentinel';
    const { ops } = parseWords(src);
    const E = engine(compact, sentinel), N = E.N, F = [];
    let opi = -1, steps = 0;
    const push = (line, msg, x = {}) => F.push({ line, msg, nodes: E.snap(), ops, opi, compact, ...x,
      vars: [['операция', opi >= 0 && opi < ops.length ? opName(ops[opi]) : '—'], ['вершин', E.count()], ['слов', N.filter((v) => v && v.term).length], ['шагов', steps]] });
    const key = (w) => (sentinel ? w + '$' : w);
    const nm = (v) => (v === 0 ? 'корень' : `вершина «${E.word(v)}»`);

    // спуск по слову: возвращает {node, ok, path, off}; off — сколько символов ребра пройдено, если остановились посреди
    const walk = (w, line, verb) => {
      let cur = 0, i = 0;
      const path = [0];
      while (i < w.length) {
        const c = N[cur].ch[w[i]];
        steps++;
        if (c == null) { push(line, `Из ${nm(cur)} нет перехода по ${C(w[i])} — ${verb}.`, { cur, path: path.slice() }); return { node: cur, ok: false, i, path }; }
        const lab = N[c].lab;
        let q = 0;
        while (q < lab.length && i + q < w.length && lab[q] === w[i + q]) q++;
        path.push(c);
        if (q < lab.length) {
          push(line, compact ? `Ребро ${SS(lab)}: совпало ${q} симв. из ${lab.length} — ${verb}.` : '', { cur: c, path: path.slice() });
          return { node: c, ok: false, i: i + q, path, mid: q, parent: cur };
        }
        i += q;
        push(line, compact ? `Ребро ${SS(lab)} совпало целиком → ${nm(c)}.` : `Есть переход по ${C(lab)} → ${nm(c)}.`, { cur: c, path: path.slice() });
        cur = c;
      }
      return { node: cur, ok: true, path };
    };

    const search = (w0) => {
      const w = key(w0);
      push(0, `Поиск ${SS(w0)}: начинаем с корня и идём по символам ${sentinel ? '(с сентинелом $) ' : ''}.`, { cur: 0, big: true });
      const r = walk(w, 1, 'слова нет');
      if (!r.ok) return;
      const found = N[r.node].term;
      push(2, found ? `Все символы пройдены, ${nm(r.node)} помечена как конец слова — слово найдено. O(|w|).` : `Все символы пройдены, но ${nm(r.node)} не помечена как конец слова: ${SS(w0)} — только префикс других слов, слова нет.`, { cur: r.node, path: r.path, big: true });
    };

    const insert = (w0) => {
      const w = key(w0);
      push(3, `Вставка ${SS(w0)}${sentinel ? ` (как ${SS(w)})` : ''}: начинаем с корня.`, { cur: 0, big: true });
      let cur = 0, i = 0;
      const path = [0];
      while (i < w.length) {
        const c = N[cur].ch[w[i]];
        steps++;
        if (c == null) {
          if (compact) {
            const id = E.add(cur, w.slice(i));
            N[id].term = true;
            path.push(id);
            push(4, `Из ${nm(cur)} нет ребра на ${C(w[i])} — в сжатом боре создаём одну вершину с меткой ребра ${SS(w.slice(i))} (весь остаток слова) и помечаем конец слова.`, { cur: id, path: path.slice(), fresh: [id] });
            return;
          }
          const id = E.add(cur, w[i]);
          path.push(id);
          push(4, `Из ${nm(cur)} нет перехода по ${C(w[i])} — создаём новую вершину.`, { cur: id, path: path.slice(), fresh: [id] });
          cur = id; i++;
          continue;
        }
        const lab = N[c].lab;
        let q = 0;
        while (q < lab.length && i + q < w.length && lab[q] === w[i + q]) q++;
        if (q === lab.length) {
          path.push(c);
          push(4, compact ? `Ребро ${SS(lab)} совпало целиком → ${nm(c)}.` : `Переход по ${C(lab)} уже есть → ${nm(c)}.`, { cur: c, path: path.slice() });
          cur = c; i += q;
          continue;
        }
        // compact: делим ребро
        const mid = E.add(cur, lab.slice(0, q));
        N[c].lab = lab.slice(q);
        N[c].par = mid;
        N[mid].ch[N[c].lab[0]] = c;
        path.push(mid);
        push(6, `Ребро ${SS(lab)} совпало только на ${q} симв. (${SS(lab.slice(0, q))}) — делим его: новая вершина с меткой ${SS(lab.slice(0, q))}, под ней старый хвост ${SS(lab.slice(q))}.`, { cur: mid, path: path.slice(), fresh: [mid] });
        if (i + q === w.length) {
          N[mid].term = true;
          push(6, `Слово закончилось ровно в точке разбиения — помечаем новую вершину как конец слова.`, { cur: mid, path: path.slice(), fresh: [mid] });
        } else {
          const id = E.add(mid, w.slice(i + q));
          N[id].term = true;
          path.push(id);
          push(6, `Добавляем рядом лист с остатком ${SS(w.slice(i + q))} и помечаем конец слова.`, { cur: id, path: path.slice(), fresh: [mid, id] });
        }
        return;
      }
      if (N[cur].term) { push(5, `Слово ${SS(w0)} уже есть.`, { cur, path }); return; }
      N[cur].term = true;
      push(5, `Символы закончились — помечаем ${nm(cur)} как конец слова${sentinel ? '' : ' (булевский флаг)'}.`, { cur, path, fresh: [cur], big: true });
    };

    const remove = (w0) => {
      const w = key(w0);
      push(7, `Удаление ${SS(w0)}: находим вершину последнего символа поиском.`, { cur: 0, big: true });
      const r = walk(w, 7, 'слова нет, удалять нечего');
      if (!r.ok) return;
      let v = r.node;
      if (!N[v].term) { push(7, `${nm(v)} не помечена как конец слова — слова нет.`, { cur: v, path: r.path }); return; }
      N[v].term = false;
      if (Object.keys(N[v].ch).length) {
        push(9, `Вершина используется другими словами (у неё есть дети) — просто снимаем пометку конца слова.`, { cur: v, path: r.path, big: true });
        if (compact && Object.keys(N[v].ch).length === 1 && v !== 0) {
          const c = Object.values(N[v].ch)[0];
          push(10, `В сжатом боре вершина с одним ребёнком и без пометки лишняя — склеиваем её ребро с ребром ребёнка: ${SS(N[v].lab)} + ${SS(N[c].lab)}.`, { cur: v, path: r.path, del: [v] });
          N[c].lab = N[v].lab + N[c].lab;
          N[c].par = N[v].par;
          N[N[v].par].ch[N[c].lab[0]] = c;
          N[v] = null;
          push(10, 'Склеили.', { cur: c });
        }
        return;
      }
      push(8, `Вершина используется только этим словом — удаляем её и поднимаемся вверх, удаляя вершины, пока текущая вершина — лист без пометки.`, { cur: v, path: r.path, del: [v], big: true });
      while (v !== 0 && !N[v].term && !Object.keys(N[v].ch).length) {
        const p = N[v].par;
        delete N[p].ch[N[v].lab[0]];
        const lab = N[v].lab;
        N[v] = null;
        push(8, `Удалили ребро ${SS(lab)}. Поднимаемся в ${nm(p)}.`, { cur: p });
        v = p;
      }
      if (v !== 0) push(8, `${nm(v)} ${N[v].term ? 'помечена как конец другого слова' : 'имеет других детей'} — останавливаемся.`, { cur: v });
      if (compact && v !== 0 && !N[v].term && Object.keys(N[v].ch).length === 1) {
        const c = Object.values(N[v].ch)[0];
        push(10, `В сжатом боре у ${nm(v)} остался один ребёнок и нет пометки — склеиваем рёбра: ${SS(N[v].lab)} + ${SS(N[c].lab)}.`, { cur: v, del: [v] });
        N[c].lab = N[v].lab + N[c].lab;
        N[c].par = N[v].par;
        N[N[v].par].ch[N[c].lab[0]] = c;
        N[v] = null;
        push(10, 'Склеили.', { cur: c });
      }
    };

    push([], `${compact ? 'Сжатый бор (compact trie): цепочки вершин с одним ребёнком схлопнуты в одно ребро со строкой.' : 'Бор (trie): на рёбрах по одному символу, слово — путь от корня до вершины, помеченной как конец слова.'} ${sentinel ? 'Конец слова отмечаем сентинелом $ — тогда каждое слово кончается в листе.' : 'Конец слова отмечаем флагом (двойной ободок).'}`, { cur: 0, big: true });
    for (opi = 0; opi < ops.length; opi++) {
      const o = ops[opi];
      ({ '+': insert, '-': remove, '?': search })[o.t](o.w);
    }
    opi = ops.length;
    const words = [];
    N.forEach((v) => { if (v && v.term) words.push(E.word(v.id).replace(/\$$/, '')); });
    push([], `Готово. Слова: ${words.sort().join(', ') || '—'}. Вершин: ${E.count()}.`, { big: true });
    return F;
  }

  function render(f) {
    const M = { root: 0, nodes: {}, rowH: 46, padB: 30, tagW: 70, aria: 'бор' };
    const path = new Set(f.path || []), fresh = new Set(f.fresh || []), del = new Set(f.del || []);
    const word = (id) => { let s = ''; for (let v = id; v > 0; v = f.nodes[v].par) s = f.nodes[v].lab + s; return s; };
    for (const x of f.nodes) {
      if (!x) continue;
      const cls = [x.id === f.cur ? 'cur' : del.has(x.id) ? 'visit' : fresh.has(x.id) ? 'new' : path.has(x.id) ? 'path' : '', x.term ? 'term' : ''].join(' ');
      M.nodes[x.id] = {
        kids: Object.keys(x.ch).sort(App.chCmp).map((c) => x.ch[c]).filter((c) => f.nodes[c]),
        parent: x.par, edge: x.id ? [{ t: x.lab }] : null, shape: x.id === 0 ? 'root' : 'circle', text: '',
        tag: x.id === 0 ? 'корень' : x.term ? `<tspan class="t">${App.esc(word(x.id).replace(/\$$/, ''))}</tspan>` : '',
        cls, ecls: path.has(x.id) && x.id ? 'path' : fresh.has(x.id) ? 'new' : '',
      };
    }
    return `<div class="chips"><b>Операции:</b>${f.ops.map((o, i) => `<span class="${i === f.opi ? 'on' : i < f.opi ? 'ok' : ''}">${o.t === '+' ? '' : o.t}${App.esc(o.w)}</span>`).join('')}</div>` + App.tree(M);
  }

  const mk = (id, label, compact) => ({
    id, label,
    inputs: [
      { id: 'ops', label: 'Операции', raw: true, value: 'tea ten to inn in team -ten ?te ?tea', max: 120, w: 28 },
      { id: 'end', label: 'Конец слова', type: 'select', value: 'flag', options: [['flag', 'флаг в вершине'], ['sentinel', 'сентинел $']] },
    ],
    validate: (v) => { const r = parseWords(v.ops); return r.err || (r.ops.length > 16 ? 'Не больше 16 операций.' : null); },
    presets: [
      { label: 'tea ten to inn…', v: { ops: 'tea ten to inn in team -ten ?te ?tea' } },
      { label: 'префиксы друг друга', v: { ops: 'a an ant and -an ?an ?ant' } },
      { label: 'romane romanus…', v: { ops: 'romane romanus romulus rubens ruber rubicon rubicundus -romulus' } },
    ],
    legend: [['new', 'текущая вершина'], ['ring', 'путь'], ['ok', 'конец слова / новое']],
    code: [
      'поиск: с корня; для каждого символа — есть ли переход',
      '  перехода нет → слова нет',
      '  символы кончились: вершина помечена как конец слова → нашли',
      'вставка: с корня по символам слова',
      '  перехода нет → создаём вершину (в сжатом — сразу весь остаток)',
      '  символы кончились → помечаем конец слова',
      '  (сжатый) ребро совпало частично → делим ребро новой вершиной',
      'удаление: находим вершину конца слова поиском',
      '  используется только этим словом → удаляем, пока текущая — лист',
      '  используется другими → снимаем пометку конца слова',
      '  (сжатый) вершина с одним ребёнком без пометки → склеиваем рёбра',
    ],
    run: (v) => run({ ...v, mode: compact ? 'compact' : 'trie' }),
    render,
  });

  App.register({
    id: 'trie', block: 2, num: 10, title: 'Trie и compact trie',
    full: '10. Trie. Основные операции. Compact trie. Оценка алгоритмической сложности выполнения операций.',
    modes: [mk('trie', 'Trie', false), mk('compact', 'Compact trie', true)],
    theory: `
<div class="def"><b>Trie</b> (бор, префиксное дерево) — структура данных для хранения набора строк: дерево с символами на рёбрах. Строки получаются последовательной записью всех символов на рёбрах между корнем и терминальной вершиной. У вершины не больше одного ребра с данным символом.</div>
<p><b>Как бороться с тем, что слова могут быть префиксами других слов</b> (in и inn, tea и team)?</p>
<ol><li>Помечать вершины, в которых заканчиваются слова (например, булевский флаг).</li>
<li>К каждому слову добавить сентинел — символ $, которого нет в алфавите. Тогда каждое слово заканчивается в листе.</li></ol>

<h3>Поиск — O(|w|)</h3>
<ol><li>Начинаем с корня.</li>
<li>Для каждого символа искомого слова проверяем, есть ли соответствующий переход из текущей вершины.</li>
<li>Если есть — переходим и продолжаем со следующим символом.</li>
<li>Если на каком-то этапе перехода нет — слова в trie нет.</li>
<li>Если все символы пройдены и вершина помечена как конец слова — слово найдено.</li></ol>
<h3>Вставка — O(|w|)</h3>
<ol><li>Начинаем с корня.</li>
<li>Для каждого символа проверяем, есть ли переход; если нет — создаём новую вершину.</li>
<li>Переходим к следующему символу.</li>
<li>Когда символы закончились, помечаем текущую вершину как конец слова.</li></ol>
<h3>Удаление — O(|w|)</h3>
<ol><li>Находим вершину последнего символа слова поиском. Не нашли — слова нет.</li>
<li>Если вершина используется только этим словом (лист), удаляем её и поднимаемся вверх, удаляя вершины, которые больше не используются: удаляем, пока текущая вершина — лист без пометки.</li>
<li>Если вершина используется другими словами — просто снимаем пометку конца слова.</li></ol>
<h3>Сложность</h3>
<ul><li>Время каждой операции — O(|w|·t), где t — время найти переход из вершины: O(1) при массиве на |Σ| ссылок, O(log |Σ|) при сбалансированном дереве или сортированном массиве, O(1) в среднем при хеш-таблице. Не зависит от числа слов n!</li>
<li>Память: вершин не больше суммарной длины слов L + 1; при массиве детей — O(L·|Σ|), что для больших алфавитов много.</li></ul>

<h3>Compact trie (сжатый бор)</h3>
<p>Обычный trie тратит вершину на каждый символ, даже на длинных «хвостах» без ветвлений. В compact trie цепочки вершин с одним ребёнком (и без пометки конца слова) схлопываются в одно ребро, помеченное строкой.</p>
<ul><li>Каждая внутренняя вершина (кроме корня) имеет ≥ 2 детей или помечена как конец слова, поэтому вершин O(n), где n — число слов (не больше 2n).</li>
<li>Метку ребра хранят как ссылку на слово и пару индексов (как в суффиксном дереве) — O(1) памяти на ребро.</li>
<li><b>Поиск</b> — сравниваем с метками рёбер, O(|w|).</li>
<li><b>Вставка</b> — если слово расходится с меткой посреди ребра, ребро делится новой вершиной, и к ней подвешивается лист с остатком слова. O(|w|).</li>
<li><b>Удаление</b> — как в trie, плюс если у вершины остался один ребёнок и нет пометки, её ребро склеивается с ребром ребёнка. O(|w|).</li></ul>
<p>Суффиксное дерево (билет 18) — это compact trie всех суффиксов строки.</p>`,
  });
})(window.App);
