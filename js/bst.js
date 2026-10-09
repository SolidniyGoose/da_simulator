/* Движок деревьев блока II: бинарное дерево с родительскими ссылками, повороты, разбор операций,
   отрисовка бинарного дерева (сверху вниз) и B-дерева. */
(function (App) {
  'use strict';
  const esc = App.esc;

  class BT {
    constructor() { this.N = {}; this.root = null; this.seq = 0; }
    add(key, o = {}) { const id = ++this.seq; this.N[id] = { id, key, l: null, r: null, p: null, ...o }; return id; }
    snap() { const N = {}; for (const k in this.N) N[k] = { ...this.N[k] }; return { N, root: this.root }; }
    h(id) { return id == null ? 0 : 1 + Math.max(this.h(this.N[id].l), this.h(this.N[id].r)); }
    side(id) { const p = this.N[id].p; return p == null ? null : this.N[p].l === id ? 'l' : 'r'; }
    setChild(p, side, c) {
      if (p == null) this.root = c; else this.N[p][side] = c;
      if (c != null) this.N[c].p = p;
    }
    // поворот: x поднимается над своим отцом
    rotUp(x) {
      const X = this.N[x], p = X.p, P = this.N[p], g = P.p, ps = this.side(p);
      if (P.l === x) { P.l = X.r; if (X.r != null) this.N[X.r].p = p; X.r = p; }
      else { P.r = X.l; if (X.l != null) this.N[X.l].p = p; X.l = p; }
      P.p = x; X.p = g;
      if (g == null) this.root = x; else this.N[g][ps] = x;
    }
    keys(id = this.root, out = []) { if (id != null) { this.keys(this.N[id].l, out); out.push(this.N[id].key); this.keys(this.N[id].r, out); } return out; }
    size() { return Object.keys(this.N).length; }
  }
  App.BT = BT;

  // «10 20 -5 ?7 8:40» → [{t:'+', k:10}, {t:'-', k:5}, {t:'?', k:7}, {t:'+', k:8, p:40}]
  App.parseOps = function (s, withPri) {
    const out = [];
    for (const tok of String(s).split(/[\s,;]+/).filter(Boolean)) {
      const m = /^([+\-?^]?)(\d{1,3})(?::(\d{1,3}))?$/.exec(tok);
      if (!m) return { err: `Не понял «${tok}». Пиши числа 0–999: «7» или «+7» — вставка, «-7» — удаление, «?7» — поиск${withPri ? ', «7:40» — ключ с приоритетом' : ''}.` };
      out.push({ t: m[1] || '+', k: +m[2], p: m[3] != null ? +m[3] : null });
    }
    return { ops: out };
  };
  App.opName = (o) => ({ '+': 'вставка', '-': 'удаление', '?': 'поиск', '^': 'поворот' })[o.t] + ' ' + o.k;

  /* ---------- отрисовка бинарного дерева ----------
     S = {N, root}; o: {forest:[{root,label}], badge(id)→текст, cls(id)→класс состояния, color(id)→'red'|'black', nil:{parent, side, label}} */
  let uid = 0;
  App.btree = function (S, o = {}) {
    const N = S.N, trees = o.forest || [{ root: S.root }];
    // o.label(id) → текст узла-«таблетки» (например ⟨50, 90⟩) вместо кружка с ключом
    const txt = (id) => (o.label ? o.label(+id) : String(N[id].key));
    const hwOf = (id) => (o.label ? txt(id).length * 3.9 + 11 : 17);
    const maxHW = o.label ? Math.max(17, ...Object.keys(N).map(hwOf)) : 17;
    const W = Math.max(46, 2 * maxHW + 10), H = 64, R = o.label ? 14 : 17;
    const pos = {}, heads = [];
    let x0 = 0, maxD = 0;
    for (const T of trees) {
      let i = 0;
      const walk = (id, d) => {
        if (id == null || N[id] == null) return;
        walk(N[id].l, d + 1);
        pos[id] = [x0 + i++ * W, d];
        if (d > maxD) maxD = d;
        walk(N[id].r, d + 1);
      };
      walk(T.root, 0);
      const w = Math.max(i, 1);
      heads.push({ x: x0 + ((w - 1) * W) / 2, label: T.label, empty: T.root == null });
      x0 += w * W + (trees.length > 1 ? 34 : 0);
    }
    const lab = trees.some((t) => t.label);
    const padX = 28, padT = lab ? 52 : 28;
    const X = (id) => padX + pos[id][0];
    const Y = (id) => padT + pos[id][1] * H;
    const Wd = padX * 2 + x0 - (trees.length > 1 ? 34 : 0) - W + 30, Ht = padT + maxD * H + R + (o.nil ? 56 : 30);
    let edges = '', nodes = '', top = '';
    for (const id in pos) {
      const n = N[id];
      for (const c of [n.l, n.r]) if (c != null && pos[c]) {
        const x1 = X(id), y1 = Y(id), x2 = X(c), y2 = Y(c), L = Math.hypot(x2 - x1, y2 - y1);
        const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
        if (o.label) { edges += `<line class="bt-e ${o.edge ? o.edge(c) || '' : ''}" x1="${x1}" y1="${y1 + R}" x2="${x2}" y2="${y2 - R}"/>`; continue; }
        edges += `<line class="bt-e ${o.edge ? o.edge(c) || '' : ''}" x1="${(x1 + ux * R).toFixed(1)}" y1="${(y1 + uy * R).toFixed(1)}" x2="${(x2 - ux * R).toFixed(1)}" y2="${(y2 - uy * R).toFixed(1)}"/>`;
      }
    }
    for (const id in pos) {
      const x = X(id), y = Y(id), st = o.cls ? o.cls(+id) || '' : '', col = o.color ? o.color(+id) : '';
      if (o.label) {
        const hw = hwOf(id);
        const bd = o.badge ? o.badge(+id) : null;
        nodes += `<g class="bt-n pill ${col} ${st}">${st ? `<rect class="ring" x="${x - hw - 4}" y="${y - R - 4}" width="${2 * hw + 8}" height="${2 * R + 8}" rx="${R + 4}"/>` : ''}<rect x="${x - hw}" y="${y - R}" width="${2 * hw}" height="${2 * R}" rx="${R}"/><text x="${x}" y="${y + 4.5}">${esc(txt(id))}</text>${bd != null && bd !== '' ? `<text class="bt-b" x="${x - hw + 2}" y="${y - R - 5}">${esc(bd)}</text>` : ''}</g>`;
        continue;
      }
      nodes += `<g class="bt-n ${col} ${st}">${st ? `<circle class="ring" cx="${x}" cy="${y}" r="${R + 4}"/>` : ''}<circle cx="${x}" cy="${y}" r="${R}"/><text x="${x}" y="${y + 4.5}">${esc(N[id].key)}</text>`;
      const b = o.badge ? o.badge(+id) : null;
      if (b != null && b !== '') nodes += `<text class="bt-b" x="${x + R - 2}" y="${y - R + 1}">${esc(b)}</text>`;
      nodes += '</g>';
    }
    if (o.nil && pos[o.nil.parent]) {
      const px = X(o.nil.parent), py = Y(o.nil.parent), nx = px + (o.nil.side === 'l' ? -22 : 22), ny = py + 44;
      edges += `<line class="bt-e hot" x1="${px}" y1="${py + R}" x2="${nx}" y2="${ny - 7}"/>`;
      nodes += `<g class="bt-nil"><rect x="${nx - 8}" y="${ny - 7}" width="16" height="14" rx="2"/><text x="${nx}" y="${ny + 22}">${esc(o.nil.label || 'nil')}</text></g>`;
    }
    for (const hd of heads) {
      if (hd.label) top += `<text class="bt-h" x="${padX + hd.x}" y="20">${esc(hd.label)}</text>`;
      if (hd.empty) top += `<text class="bt-h dim" x="${padX + hd.x}" y="${padT + 5}">∅</text>`;
    }
    // подписи рёбер (например «≤» / «>» в дереве решений)
    let elabs = '';
    if (o.edgeLabel) for (const id in pos) for (const [c, sd] of [[N[id].l, -1], [N[id].r, 1]]) if (c != null && pos[c]) {
      const t = o.edgeLabel(+c);
      if (t) elabs += `<text class="bt-el" x="${(X(id) + X(c)) / 2 + sd * 10}" y="${(Y(id) + Y(c)) / 2 - 2}">${esc(t)}</text>`;
    }
    // обратные ссылки (PATRICIA): {from, to, side:'l'|'r', cls}
    let back = '', defs = '';
    if (o.links && o.links.length) {
      const mid = 'bk' + ++uid;
      defs = `<defs><marker id="${mid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="tv-ah"/></marker></defs>`;
      for (const L of o.links) {
        if (!pos[L.from] || !pos[L.to]) continue;
        const hwA = hwOf(L.from), hwB = hwOf(L.to), s = L.side === 'l' ? -1 : 1;
        const ax = X(L.from) + s * hwA, ay = Y(L.from) + 3;
        let d;
        if (L.from === L.to) d = `M${ax} ${ay - 6}C${ax + s * 34} ${ay - 30} ${ax + s * 34} ${ay + 28} ${ax + s * 2} ${ay + 9}`;
        else {
          const bx = X(L.to) + s * hwB, by = Y(L.to) + (Y(L.to) < ay ? 6 : -6);
          const ccx = s > 0 ? Math.max(ax, bx) + 36 + Math.abs(ay - by) * 0.25 : Math.min(ax, bx) - 36 - Math.abs(ay - by) * 0.25;
          d = `M${ax} ${ay}Q${ccx.toFixed(1)} ${((ay + by) / 2).toFixed(1)} ${bx} ${by}`;
        }
        back += `<path class="tv-k ${L.cls || ''}" d="${d}" marker-end="url(#${mid})"/>`;
      }
    }
    const extra = o.links && o.links.length ? 90 : 0;
    const Wt = Math.max(Wd, 120) + extra, sh = extra / 2;
    return `<div class="tree-wrap"><svg class="bt" width="${Wt}" height="${Ht}" viewBox="${-sh} 0 ${Wt} ${Ht}" role="img" aria-label="дерево">${defs}${top}${edges}${back}${elabs}${nodes}</svg></div>`;
  };

  /* ---------- отрисовка B-дерева ----------
     S = {N:{id:{keys, kids}}, root}; o: {cls(id), kcls(id, i), edge(parentId, childIdx)} */
  App.bbtree = function (S, o = {}) {
    const N = S.N, KW = 30, NH = 30, VG = 66, HG = 18;
    if (S.root == null || !N[S.root]) return '<p class="hint">Дерево пустое.</p>';
    const nw = (id) => Math.max(N[id].keys.length, 1) * KW + 8;
    const sw = {};
    const measure = (id) => {
      const k = N[id].kids;
      let s = 0;
      k.forEach((c, i) => { s += measure(c) + (i ? HG : 0); });
      return (sw[id] = Math.max(nw(id), s));
    };
    measure(S.root);
    const cx = {}, dep = {};
    let maxD = 0;
    const place = (id, left, d) => {
      dep[id] = d;
      if (d > maxD) maxD = d;
      const k = N[id].kids;
      if (!k.length) { cx[id] = left + sw[id] / 2; return; }
      let span = 0;
      k.forEach((c, i) => { span += sw[c] + (i ? HG : 0); });
      let x = left + (sw[id] - span) / 2;
      for (const c of k) { place(c, x, d + 1); x += sw[c] + HG; }
      cx[id] = (cx[k[0]] + cx[k[k.length - 1]]) / 2;
    };
    place(S.root, 0, 0);
    const pad = 20, Wd = sw[S.root] + pad * 2, Ht = (maxD + 1) * NH + maxD * (VG - NH) + pad * 2;
    let edges = '', boxes = '';
    for (const id in cx) {
      const n = N[id], w = nw(id), left = pad + cx[id] - w / 2, top = pad + dep[id] * VG;
      n.kids.forEach((c, i) => {
        const x1 = left + 4 + i * KW, y1 = top + NH, x2 = pad + cx[c], y2 = pad + dep[c] * VG;
        edges += `<line class="bt-e ${o.edge ? o.edge(+id, i) || '' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      });
      boxes += `<g class="bb-n ${o.cls ? o.cls(+id) || '' : ''}"><rect class="box" x="${left}" y="${top}" width="${w}" height="${NH}" rx="6"/>`;
      n.keys.forEach((k, i) => {
        const kc = o.kcls ? o.kcls(+id, i) || '' : '';
        if (kc) boxes += `<rect class="key ${kc}" x="${left + 4 + i * KW + 1}" y="${top + 3}" width="${KW - 2}" height="${NH - 6}" rx="4"/>`;
        if (i) boxes += `<line class="sep" x1="${left + 4 + i * KW}" y1="${top + 5}" x2="${left + 4 + i * KW}" y2="${top + NH - 5}"/>`;
        boxes += `<text x="${left + 4 + i * KW + KW / 2}" y="${top + NH / 2 + 4.5}">${esc(k)}</text>`;
      });
      boxes += '</g>';
    }
    return `<div class="tree-wrap"><svg class="bt" width="${Wd}" height="${Ht}" viewBox="0 0 ${Wd} ${Ht}" role="img" aria-label="B-дерево">${edges}${boxes}</svg></div>`;
  };

  // Спуск по дереву поиска с кадром на каждое сравнение
  App.markPath = (path, cur, extra = {}) => {
    const m = {};
    for (const id of path) m[id] = 'path';
    if (cur != null) m[cur] = 'cur';
    return Object.assign(m, extra);
  };
  App.descend = function (T, k, push, line) {
    let cur = T.root, parent = null, side = null;
    const path = [];
    if (cur == null) { push(line, 'Дерево пустое.', {}); return { found: null, parent, side, path }; }
    while (cur != null) {
      path.push(cur);
      const v = T.N[cur].key;
      if (k === v) { push(line, `${k} = ${v} — ключ найден.`, { mark: App.markPath(path, cur) }); return { found: cur, parent, side, path }; }
      const d = k < v ? 'l' : 'r';
      push(line, `${k} ${k < v ? '<' : '>'} ${v} → идём ${k < v ? 'влево' : 'вправо'}${T.N[cur][d] == null ? ', а там пусто' : ''}.`, { mark: App.markPath(path, cur) });
      parent = cur; side = d; cur = T.N[cur][d];
    }
    return { found: null, parent, side, path };
  };
  // Преемник: минимум в правом поддереве (с кадрами)
  App.succ = function (T, z, push, line) {
    let s = T.N[z].r;
    const path = [z];
    while (T.N[s].l != null) { path.push(s); s = T.N[s].l; }
    path.push(s);
    push(line, `У ${T.N[z].key} два ребёнка. Ищем следующий по значению ключ: шаг вправо, потом влево до упора → ${T.N[s].key}. У него не больше одного ребёнка (правого).`, { mark: App.markPath(path, s, { [z]: 'del' }) });
    return s;
  };

  App.opsChips = (ops, k) =>
    `<div class="chips"><b>Операции:</b>${ops.map((o, i) => `<span class="${i === k ? 'on' : i < k ? 'ok' : ''}">${o.t === '+' ? '+' : o.t}${o.k}${o.p != null ? ':' + o.p : ''}</span>`).join('')}</div>`;
})(window.App);
