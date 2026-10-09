/* Движок суффиксного дерева для билетов 18–19. Индексация строки с 1 (как у Гасфилда): s = ' ' + S.
   Узел: {id, p — родитель, a, b — метка ребра S[a..b] (b = E — глобальный конец e), ch — дети по первому символу,
          sl — суффиксная связь, leaf — номер листа j (0 у внутренних), nm — имя для текстов}. */
(function (App) {
  'use strict';
  const ST = (App.st = {});
  ST.E = -1;

  ST.create = () => ({ nodes: [{ id: 0, p: -1, a: 0, b: 0, ch: {}, sl: -1, leaf: 0, nm: 'корень' }], letters: 0 });
  ST.snap = (t) => t.nodes.map((x) => ({ ...x, ch: { ...x.ch } }));
  ST.end = (x, e) => (x.b === ST.E ? e : x.b);
  ST.len = (x, e) => ST.end(x, e) - x.a + 1;
  ST.label = (x, s, e) => s.slice(x.a, ST.end(x, e) + 1);

  ST.addLeaf = function (t, s, par, a, b, j) {
    const id = t.nodes.length;
    t.nodes.push({ id, p: par, a, b, ch: {}, sl: -1, leaf: j, nm: 'лист ' + j });
    t.nodes[par].ch[s[a]] = id;
    return id;
  };

  // Делит ребро в узел c после k символов; возвращает новый внутренний узел
  ST.split = function (t, s, c, k) {
    const x = t.nodes[c], id = t.nodes.length;
    const nm = String.fromCharCode(65 + (t.letters % 26)) + (t.letters >= 26 ? Math.floor(t.letters / 26) : '');
    t.letters++;
    t.nodes.push({ id, p: x.p, a: x.a, b: x.a + k - 1, ch: {}, sl: -1, leaf: 0, nm });
    t.nodes[x.p].ch[s[x.a]] = id;
    x.p = id;
    x.a += k;
    t.nodes[id].ch[s[x.a]] = c;
    return id;
  };

  ST.pathStr = function (nodes, id, s, e) {
    let r = '';
    for (let v = id; v > 0; v = nodes[v].p) r = ST.label(nodes[v], s, e) + r;
    return r;
  };
  ST.anc = function (nodes, id) {
    const r = [];
    for (let v = id; v >= 0; v = nodes[v].p) r.push(v);
    return r;
  };
  ST.depth = (nodes, id, e) => {
    let d = 0;
    for (let v = id; v > 0; v = nodes[v].p) d += ST.len(nodes[v], e);
    return d;
  };
  ST.leaves = function (nodes, id, out = []) {
    const x = nodes[id];
    if (x.leaf) out.push(x);
    else for (const c of Object.keys(x.ch).sort(App.chCmp)) ST.leaves(nodes, x.ch[c], out);
    return out;
  };
  ST.sub = function (nodes, id, out = []) {
    out.push(id);
    for (const c of Object.keys(nodes[id].ch)) ST.sub(nodes, nodes[id].ch[c], out);
    return out;
  };

  /* Готовое дерево без кадров (для билетов 20–22): вставка суффиксов + суффиксные связи по меткам путей.
     term — символы-терминаторы: метки листьев обрезаются на первом терминаторе (обобщённое дерево),
     суффиксы, начинающиеся с терминатора, не вставляются (кроме случая single — одной строки с $). */
  ST.build = function (str, term, single) {
    const m = str.length, s = ' ' + str, t = ST.create(), nodes = t.nodes;
    const cut = (a) => { for (let q = a; q <= m; q++) if (term.includes(s[q])) return q; return m; };
    for (let j = 1; j <= m; j++) {
      if (!single && term.includes(s[j])) continue;
      const end = cut(j);
      let cur = 0, a = j;
      for (;;) {
        const c = nodes[cur].ch[s[a]];
        if (c == null) { ST.addLeaf(t, s, cur, a, end, j); break; }
        const x = nodes[c], L = ST.len(x, m);
        let k = 1;
        while (k < L && a + k <= end && s[x.a + k] === s[a + k]) k++;
        if (k === L) { cur = c; a += L; continue; }
        const w = ST.split(t, s, c, k);
        ST.addLeaf(t, s, w, a + k, end, j);
        break;
      }
    }
    const byPath = new Map();
    for (const x of nodes) if (!x.leaf) byPath.set(ST.pathStr(nodes, x.id, s, m), x.id);
    for (const x of nodes) if (x.id && !x.leaf) { const tg = byPath.get(ST.pathStr(nodes, x.id, s, m).slice(1)); if (tg != null) x.sl = tg; }
    return t;
  };

  ST.name = (nodes, id) => (id === 0 ? 'корень' : nodes[id].leaf ? 'лист ' + nodes[id].leaf : 'узел ' + nodes[id].nm);

  /* hl: {cur, path:[], fresh:[], on, k, next, link:[a,b]} ; opt: {idx} */
  ST.model = function (nodes, s, e, hl = {}, opt = {}) {
    const M = { root: 0, nodes: {}, links: [], rowH: 34, tagW: 30, aria: 'суффиксное дерево' };
    const path = new Set(hl.path || []), fresh = new Set((hl.fresh || []).filter((x) => x != null && x >= 0));
    const order = opt.cmp || App.chCmp, mark = hl.mark || {}, tags = hl.tags || {};
    for (const x of nodes) {
      const kids = Object.keys(x.ch).sort(order).map((c) => x.ch[c]);
      let edge = null;
      if (x.id !== 0) {
        if (opt.idx) {
          edge = [{ t: `[${x.a},${x.b === ST.E ? 'e' : x.b}]` }];
          if (hl.on === x.id) edge.push({ t: ` ↓${hl.k}`, cls: 'caret' });
        } else {
          const lab = ST.label(x, s, e);
          if (hl.on === x.id) {
            edge = [{ t: lab.slice(0, hl.k), cls: 'done' }, { t: '|', cls: 'caret' }];
            if (hl.next) edge.push({ t: lab[hl.k], cls: 'next' }, { t: lab.slice(hl.k + 1) });
            else edge.push({ t: lab.slice(hl.k) });
          } else edge = [{ t: lab }];
        }
      }
      const cls = [];
      if (x.id === hl.cur) cls.push('cur');
      else if (fresh.has(x.id)) cls.push('new');
      else if (path.has(x.id)) cls.push('path');
      if (mark[x.id]) cls.push(mark[x.id]);
      if (x.g) cls.push('g' + x.g);
      M.nodes[x.id] = {
        kids, parent: x.p, edge,
        shape: x.id === 0 ? 'root' : x.leaf ? 'leaf' : 'circle',
        text: x.id === 0 ? '' : x.leaf ? x.lt || String(x.leaf) : x.nm,
        tag: tags[x.id],
        cls: cls.join(' '),
        ecls: fresh.has(x.id) ? 'new' : path.has(x.id) || hl.on === x.id ? 'path' : '',
      };
      if (x.sl >= 0 && opt.links !== false) {
        const hot = hl.link && hl.link[0] === x.id && hl.link[1] === x.sl;
        M.links.push({ from: x.id, to: x.sl, kind: 'sl', cls: hot ? 'hot' : '' });
      }
    }
    return M;
  };

  // Сцена: строка S с индексами от 1 + дерево
  ST.render = function (f, opt = {}) {
    const str = f.str, m = str.length, sv = ' ' + str;
    const st = f.strip || {};
    const inr = (r, p) => r && p >= r[0] && p <= r[1];
    const h = App.strip(m, [
      { type: 'idx', n: m, base: 1 },
      {
        type: 'chars', label: 'S', chars: str,
        cell: (k) => {
          const p = k + 1, c = [];
          if (p === st.cur) c.push('new', 'focus');
          else if (inr(st.blk, p)) c.push('blk');
          if (st.dimFrom && p >= st.dimFrom) c.push('dim');
          return c.join(' ');
        },
      },
    ]);
    return h + App.tree(ST.model(f.nodes, sv, f.e, f.hl || {}, opt));
  };
})(window.App);
