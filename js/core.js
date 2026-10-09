/* Каркас: реестр тем, полоса символов, отрисовка деревьев, утилиты для текстов шагов. */
(function (G) {
  'use strict';
  const App = (G.App = G.App || {});
  App.topics = [];
  App.register = (t) => { App.topics.push(t); return t; };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  App.esc = esc;

  // Вставки в тексты шагов: символ, подстрока, нижний индекс
  App.fmt = {
    c: (x) => `<span class="kc">${x === undefined ? '∅' : esc(x)}</span>`,
    s: (x) => (x === '' ? '<span class="ks">ε</span>' : `<span class="ks">${esc(x)}</span>`),
    sub: (n) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]),
  };

  /* ---------- полоса символов: строки на общей сетке столбцов ---------- */
  const cell = (col, text, cls) => `<div class="c${cls ? ' ' + cls : ''}" style="grid-column:${col}">${text}</div>`;

  function lanes(items) {
    const out = [];
    for (const it of items.slice().sort((a, b) => a.from - b.from)) {
      let ln = out.find((l) => l.end < it.from);
      if (!ln) { ln = { end: -Infinity, items: [] }; out.push(ln); }
      ln.items.push(it);
      ln.end = it.to;
    }
    return out;
  }

  // rows: {type:'idx'|'chars'|'nums'|'marks'|'spans', label, start, cell(j) → класс, ...}
  App.strip = function (cols, rows) {
    let h = `<div class="strip" style="--cols:${cols}">`;
    for (const r of rows) {
      if (!r) continue;
      if (r.type === 'spans') {
        const its = (r.items || []).filter((x) => x && x.to >= x.from);
        lanes(its).forEach((ln, k) => {
          h += `<div class="r r-spans"><div class="lab">${k === 0 && r.label ? r.label : ''}</div>`;
          for (const it of ln.items)
            h += `<div class="sp ${it.cls || ''}" style="grid-column:${2 + it.from}/${3 + it.to}"><span>${it.text || ''}</span></div>`;
          h += '</div>';
        });
        continue;
      }
      h += `<div class="r r-${r.type}${r.cls ? ' ' + r.cls : ''}"><div class="lab">${r.label || ''}</div>`;
      const st = r.start || 0;
      if (r.type === 'idx') {
        const n = r.n == null ? cols : r.n;
        for (let j = 0; j < n; j++) h += cell(2 + st + j, j + (r.base || 0), r.cell ? r.cell(j) : '');
      } else if (r.type === 'chars') {
        for (let j = 0; j < r.chars.length; j++) h += cell(2 + st + j, esc(r.chars[j]), r.cell ? r.cell(j) : '');
      } else if (r.type === 'nums') {
        r.values.forEach((v, j) => {
          if (v === undefined) return;
          h += cell(2 + st + j, v === null ? '' : esc(v), (v === null ? 'nil ' : '') + (r.cell ? r.cell(j) : ''));
        });
      } else if (r.type === 'marks') {
        const at = new Map();
        for (const it of r.items || []) {
          if (!it || it.at == null || it.at < 0 || it.at >= cols) continue;
          const e = at.get(it.at) || { t: [], cls: it.cls || '' };
          e.t.push(it.text);
          at.set(it.at, e);
        }
        for (const [a, e] of at) h += cell(2 + a, esc(e.t.join(',')), e.cls);
      }
      h += '</div>';
    }
    return h + '</div>';
  };

  App.legend = (items) =>
    `<div class="legend">${items.map(([c, t]) => `<span><i class="${c}"></i>${t}</span>`).join('')}</div>`;

  /* ---------- дерево: корень слева, листья столбиком справа ----------
     M = { root, nodes: {id: {kids, parent, edge:[{t,cls}], shape:'root'|'circle'|'leaf', text, tag, cls, ecls}},
           links: [{from, to, kind:'sl'|'out', cls}], rowH } */
  let uid = 0;
  App.tree = function (M) {
    const N = M.nodes, rowH = M.rowH || 38, CW = 7.9, STUB = 12;
    const leafW = (n) => Math.max(28, String(n.text ?? '').length * 7 + 10);
    const hw = (n) => (n.shape === 'leaf' ? leafW(n) / 2 : n.shape === 'root' ? 8 : 11);
    const HW = Math.max(14, ...Object.values(N).map(hw));
    const depth = {}, y = {}, colW = [0];
    let leaves = 0, maxD = 0;
    const lw = (n) => (n.edge ? n.edge.reduce((s, p) => s + [...p.t].length, 0) : 1) * CW + 8;
    (function walk(id, d) {
      const n = N[id];
      depth[id] = d;
      if (d > maxD) maxD = d;
      if (d > 0) colW[d] = Math.max(colW[d] || 0, lw(n));
      if (!n.kids.length) y[id] = leaves++ * rowH;
      else {
        n.kids.forEach((k) => walk(k, d + 1));
        y[id] = (y[n.kids[0]] + y[n.kids[n.kids.length - 1]]) / 2;
      }
    })(M.root, 0);
    const X = [24];
    for (let d = 1; d <= maxD; d++) X[d] = X[d - 1] + 14 + STUB + Math.max(colW[d] || 0, 16) + 8 + HW;
    const padT = M.padT || 26, padB = M.padB || 22;
    const W = X[maxD] + HW + (M.tagW || 40), H = Math.max(0, leaves - 1) * rowH + padT + padB;
    const P = (id) => [X[depth[id]], y[id] + padT];
    const id0 = 'tv' + ++uid;

    let eBase = '', eHot = '', labs = '', nodes = '', links = '';
    for (const id of Object.keys(N)) {
      const n = N[id];
      if (+id === +M.root || depth[id] === undefined) continue;
      const [cx, cy] = P(id), [px, py] = P(n.parent);
      const x0 = px + hw(N[n.parent]), xs = x0 + STUB, x1 = cx - hw(n);
      const path = `<path class="tv-e ${n.ecls || ''}" d="M${x0} ${py}H${xs}V${cy}H${x1}"/>`;
      if (n.ecls) eHot += path; else eBase += path;
      if (n.edge)
        labs += `<text class="tv-l${n.lcls ? ' ' + n.lcls : ''}" x="${xs + 5}" y="${cy - 6}">${n.edge
          .map((p) => `<tspan${p.cls ? ` class="${p.cls}"` : ''}>${esc(p.t)}</tspan>`)
          .join('')}</text>`;
    }
    for (const L of M.links || []) {
      if (depth[L.from] === undefined || depth[L.to] === undefined) continue;
      const [ax, ay] = P(L.from), [bx, by] = P(L.to);
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, bend = Math.min(80, 16 + len * 0.22);
      const qx = (ax + bx) / 2 + nx * bend, qy = (ay + by) / 2 + ny * bend;
      const tr = (x, yy, r) => {
        const ddx = qx - x, ddy = qy - yy, l = Math.hypot(ddx, ddy) || 1;
        return [x + (ddx / l) * r, yy + (ddy / l) * r];
      };
      const a = tr(ax, ay, hw(N[L.from]) + 1), b = tr(bx, by, hw(N[L.to]) + 2);
      const kind = L.kind === 'out' ? 'out' : 'sl';
      links += `<path class="tv-k ${kind === 'out' ? 'out ' : ''}${L.cls || ''}" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}" marker-end="url(#${id0}-${kind})"/>`;
    }
    for (const id of Object.keys(N)) {
      const n = N[id];
      if (depth[id] === undefined) continue;
      const [x, yy] = P(id);
      const cls = `tv-n ${n.shape || 'circle'} ${n.cls || ''}`;
      if (n.shape === 'leaf')
        nodes += `<g class="${cls}"><rect x="${x - leafW(n) / 2}" y="${yy - 10}" width="${leafW(n)}" height="20" rx="5"/><text x="${x}" y="${yy + 4}">${esc(n.text ?? '')}</text></g>`;
      else
        nodes += `<g class="${cls}"><circle cx="${x}" cy="${yy}" r="${hw(n)}"/>${n.text != null && n.text !== '' ? `<text x="${x}" y="${yy + 3.5}">${esc(n.text)}</text>` : ''}</g>`;
      if (n.tag) nodes += `<text class="tv-tag" x="${x}" y="${yy + hw(n) + 12}">${n.tag}</text>`;
    }
    const defs = ['sl', 'out']
      .map((k) => `<marker id="${id0}-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="tv-ah ${k}"/></marker>`)
      .join('');
    return `<div class="tree-wrap"><svg class="tv" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(M.aria || 'дерево')}"><defs>${defs}</defs>${eBase}${eHot}${links}${labs}${nodes}</svg></div>`;
  };

  // Сортировка символов для детей узла: $ в конце, как в учебниках
  App.chCmp = (a, b) => (a === '$') - (b === '$') || (a < b ? -1 : a > b ? 1 : 0);

  // Случайная строка с повторами (интереснее для Z, sp, N)
  App.randStr = function (alpha, len) {
    let s = '';
    const R = (k) => Math.floor(Math.random() * k);
    while (s.length < len) {
      if (s.length >= 2 && Math.random() < 0.5) {
        const a = Math.random() < 0.6 ? 0 : R(s.length);
        s += s.substr(a, 1 + R(Math.min(4, s.length - a)));
      } else s += alpha[R(alpha.length)];
    }
    return s.slice(0, len);
  };
})(typeof window !== 'undefined' ? window : globalThis);
