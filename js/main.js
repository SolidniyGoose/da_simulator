/* Оболочка: оглавление билетов, вкладки темы, плеер шагов, тренажёр. */
(function () {
  'use strict';
  const App = window.App, esc = App.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('dasim:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('dasim:' + k, JSON.stringify(v)); } catch (e) { /* хранилище недоступно — работаем без него */ }
    },
  };

  const BLOCKS = [
    { id: 3, roman: 'III', title: 'Поиск образца в тексте' },
    { id: 4, roman: 'IV', title: 'С(к)уффиксные деревья' },
    { id: 2, roman: 'II', title: 'Сбалансированные и сильноветвящиеся деревья' },
    { id: 1, roman: 'I', title: 'Сортировки за линейное время' },
  ];
  const TICKETS = [
    [1, 1, 'Нижняя оценка сортировок сравнением', 'Теорема об оценке времени работы сортировок, использующих сравнение элементов.'],
    [2, 1, 'Сортировка подсчётом', 'Сортировка подсчетом. Доказательство линейности алгоритма.'],
    [3, 1, 'Поразрядная сортировка', 'Поразрядная сортировка. Доказательство линейности алгоритма.'],
    [4, 1, 'Карманная сортировка', 'Карманная сортировка.'],
    [5, 2, 'Бинарные деревья поиска', 'Бинарные деревья поиска. Основные операции (поиск, вставка, удаление, поворот).'],
    [6, 2, 'AVL-деревья', 'AVL-деревья. Основные операции. Теорема о высоте AVL-дерева.'],
    [7, 2, 'Красно-чёрные деревья', 'Красно-черные деревья. Основные операции. Теорема о высоте красно-черного дерева.'],
    [8, 2, 'Декартовы деревья', 'Декартовы деревья. Основные операции. Операции split и merge. Оценка алгоритмической сложности.'],
    [9, 2, 'B-деревья', 'B-деревья. Основные операции. Оценка алгоритмической сложности выполнения операций.'],
    [10, 2, 'Trie, compact trie', 'Trie. Основные операции. Compact trie. Оценка алгоритмической сложности выполнения операций.'],
    [11, 2, 'PATRICIA', 'PATRICIA Trie. Основные операции. Оценка алгоритмической сложности выполнения операций.'],
  ];
  const byNum = (n) => App.topics.find((t) => t.num === n);
  const done = () => store.get('done', {});

  /* ---------- оглавление ---------- */
  function buildSide() {
    const side = $('#side');
    const d = done();
    const ver = App.BUILD ? `<br><small class="ver">версия ${esc(App.BUILD.version)}</small>` : '';
    let h = `<div class="brand"><div><small>Дискретный анализ</small><br><b>Симулятор</b>${ver}</div>
      <button class="btn side-toggle" id="sideT" aria-expanded="false">Билеты</button></div>`;
    for (const b of BLOCKS) {
      h += `<section class="blk"><h2><span>${b.roman}</span>${esc(b.title)}</h2><ul>`;
      const items = App.topics.filter((t) => t.block === b.id).map((t) => [t.num, t.title, t]);
      for (const [num, , full] of TICKETS.filter((x) => x[1] === b.id)) if (!byNum(num)) items.push([num, full, null]);
      items.sort((a, b2) => a[0] - b2[0]);
      for (const [num, title, t] of items) {
        if (t) h += `<li><a class="tk" href="#${t.id}" data-id="${t.id}"><span class="n">${num}</span><span>${esc(t.title)}</span>${d[t.id] ? '<span class="ck" title="разобрано">✓</span>' : '<span></span>'}</a></li>`;
        else {
          const tk = TICKETS.find((x) => x[0] === num);
          h += `<li><a class="tk off" href="#soon-${num}"><span class="n">${num}</span><span>${esc(tk ? tk[2] : title)}</span><span class="st">скоро</span></a></li>`;
        }
      }
      h += '</ul></section>';
    }
    side.innerHTML = h;
    $('#sideT').onclick = () => {
      const o = side.classList.toggle('open');
      $('#sideT').setAttribute('aria-expanded', o);
    };
  }
  function markSide(id) {
    $$('.tk[data-id]').forEach((a) => a.classList.toggle('on', a.dataset.id === id));
    $('#side').classList.remove('open');
  }

  /* ---------- плеер ---------- */
  const IC = {
    first: '<svg viewBox="0 0 16 16"><path d="M3 2h2v12H3zM14 2v12L6 8z"/></svg>',
    prevK: '<svg viewBox="0 0 16 16"><path d="M8 2v12L1 8zM15 2v12L8 8z"/></svg>',
    prev: '<svg viewBox="0 0 16 16"><path d="M12 2v12L4 8z"/></svg>',
    play: '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z"/></svg>',
    pause: '<svg viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
    next: '<svg viewBox="0 0 16 16"><path d="M4 2v12l8-6z"/></svg>',
    nextK: '<svg viewBox="0 0 16 16"><path d="M1 2v12l7-6zM8 2v12l7-6z"/></svg>',
    last: '<svg viewBox="0 0 16 16"><path d="M11 2h2v12h-2zM2 2v12l8-6z"/></svg>',
  };
  let S = null; // состояние открытой темы

  function stop() {
    if (S && S.timer) { clearInterval(S.timer); S.timer = null; }
    const b = $('#bPlay');
    if (b) { b.innerHTML = IC.play; b.title = 'Пуск (пробел)'; }
  }
  function play() {
    if (!S || !S.frames.length) return;
    if (S.idx >= S.frames.length - 1) show(0);
    stop();
    S.timer = setInterval(() => {
      if (S.idx >= S.frames.length - 1) return stop();
      show(S.idx + 1);
    }, +$('#speed').value);
    $('#bPlay').innerHTML = IC.pause;
    $('#bPlay').title = 'Пауза (пробел)';
  }
  function jumpKey(dir) {
    const F = S.frames;
    for (let k = S.idx + dir; k >= 0 && k < F.length; k += dir) if (F[k].big) return show(k);
    show(dir > 0 ? F.length - 1 : 0);
  }

  function show(k) {
    if (!S || !S.frames.length) return;
    S.idx = Math.max(0, Math.min(S.frames.length - 1, k));
    const f = S.frames[S.idx];
    const stage = $('#stage');
    const keep = stage.scrollLeft;
    try {
      stage.innerHTML = S.mode.render(f, S.v);
    } catch (e) {
      stage.innerHTML = `<p class="err">Ошибка отрисовки: ${esc(e.message)}</p>`;
      console.error(e);
    }
    stage.scrollLeft = keep;
    $('#msg').innerHTML = f.msg || '';
    $('#phase').textContent = f.phase || '';
    $('#vars').innerHTML = (f.vars || []).map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('#vars').hidden = !(f.vars && f.vars.length);
    const lines = new Set([].concat(f.line == null ? [] : f.line));
    const code = $('#code');
    let first = null;
    $$('li', code).forEach((li, i) => {
      const on = lines.has(i);
      li.classList.toggle('on', on);
      if (on && !first) first = li;
    });
    if (first) {
      const top = first.offsetTop, bot = top + first.offsetHeight;
      if (top < code.scrollTop || bot > code.scrollTop + code.clientHeight) code.scrollTop = top - code.clientHeight / 3;
    }
    $('#pos').textContent = `${S.idx + 1} / ${S.frames.length}`;
    $('#scrub').value = S.idx;
    const fe = stage.querySelector('.focus');
    if (fe) {
      const sr = stage.getBoundingClientRect(), er = fe.getBoundingClientRect();
      if (er.right > sr.right - 24) stage.scrollLeft += er.right - sr.right + sr.width / 3;
      else if (er.left < sr.left + 48) stage.scrollLeft -= sr.left + 48 - er.left + sr.width / 4;
    }
  }

  /* ---------- ввод ---------- */
  const valKey = (t, m) => `inp:${t.id}:${m.id}`;
  function readInputs(mode) {
    const v = {};
    for (const inp of mode.inputs) {
      const el = $('#in-' + inp.id);
      if (inp.type === 'check') v[inp.id] = el.checked;
      else if (inp.type === 'select') v[inp.id] = el.value;
      else if (inp.type === 'list') v[inp.id] = el.value.split(/[\s,;]+/).filter(Boolean);
      else v[inp.id] = inp.raw ? el.value.trim().replace(/\s+/g, ' ') : el.value.replace(/\s+/g, '');
    }
    return v;
  }
  function validate(mode, v) {
    for (const inp of mode.inputs) {
      const x = v[inp.id];
      if (inp.type === 'text' || !inp.type) {
        if (!x.length) return `Поле «${inp.label}» пустое.`;
        if (inp.max && x.length > inp.max) return `«${inp.label}»: не длиннее ${inp.max} символов (сейчас ${x.length}) — иначе картинка не поместится.`;
      }
      if (inp.type === 'list') {
        if (!x.length) return `Поле «${inp.label}» пустое.`;
        if (inp.maxItems && x.length > inp.maxItems) return `«${inp.label}»: не больше ${inp.maxItems} слов.`;
        if (inp.max && x.some((w) => w.length > inp.max)) return `«${inp.label}»: каждое слово не длиннее ${inp.max} символов.`;
      }
    }
    return mode.validate ? mode.validate(v) : null;
  }
  function fieldHTML(inp, val) {
    const id = 'in-' + inp.id;
    if (inp.type === 'check')
      return `<label class="fld chk"><input type="checkbox" id="${id}"${val ? ' checked' : ''}> ${esc(inp.label)}</label>`;
    if (inp.type === 'select')
      return `<label class="fld"><span>${esc(inp.label)}</span><select id="${id}">${inp.options
        .map(([k, l]) => `<option value="${esc(k)}"${k === val ? ' selected' : ''}>${esc(l)}</option>`)
        .join('')}</select></label>`;
    const shown = inp.type === 'list' ? (Array.isArray(val) ? val.join(', ') : val) : val;
    return `<label class="fld"><span>${esc(inp.label)}</span><input type="text" id="${id}" spellcheck="false" autocomplete="off" style="--w:${inp.w || 16}rem" value="${esc(shown)}"></label>`;
  }
  function codeHTML(lines) {
    return lines
      .map((ln) => {
        const k = ln.indexOf('//');
        return k < 0 ? `<li>${esc(ln)}</li>` : `<li>${esc(ln.slice(0, k))}<span class="cm">${esc(ln.slice(k))}</span></li>`;
      })
      .join('');
  }

  /* ---------- тема ---------- */
  function openTopic(id) {
    stop();
    const m = /^soon-(\d+)$/.exec(id);
    if (m) return openSoon(+m[1]);
    const t = App.topics.find((x) => x.id === id) || App.topics[0];
    store.set('last', t.id);
    markSide(t.id);
    const blk = BLOCKS.find((b) => b.id === t.block);
    const main = $('#main');
    main.innerHTML = `
      <header class="th">
        <div class="eyebrow">Блок ${blk.roman} · ${esc(blk.title)} · билет ${t.num}</div>
        <div class="th-row"><h1>${esc(t.title)}</h1>
          <label class="done-t"><input type="checkbox" id="doneT"${done()[t.id] ? ' checked' : ''}> разобрано</label></div>
        <p class="q">${esc(t.full)}</p>
      </header>
      <nav class="tabs" role="tablist">
        <button role="tab" data-tab="sim" aria-selected="true">Симуляция</button>
        <button role="tab" data-tab="theory" aria-selected="false">Теория</button>
        ${t.quiz ? '<button role="tab" data-tab="quiz" aria-selected="false">Тренажёр</button>' : ''}
      </nav>
      <section id="tab-sim"></section>
      <section id="tab-theory" hidden><div class="theory">${typeof t.theory === 'function' ? t.theory() : t.theory}</div></section>
      ${t.quiz ? '<section id="tab-quiz" hidden></section>' : ''}`;
    $('#doneT').onchange = (e) => {
      const d = done();
      if (e.target.checked) d[t.id] = 1; else delete d[t.id];
      store.set('done', d);
      buildSide();
      markSide(t.id);
    };
    $$('.tabs button').forEach((b) => (b.onclick = () => selectTab(b.dataset.tab)));
    S = { t, mode: null, frames: [], idx: 0, timer: null, v: null };
    const mi = store.get('mode:' + t.id, 0);
    buildSim(t, t.modes[mi] ? mi : 0);
    if (t.quiz) buildQuiz(t);
    selectTab(store.get('tab:' + t.id, 'sim') === 'quiz' && !t.quiz ? 'sim' : store.get('tab:' + t.id, 'sim'));
    window.scrollTo(0, 0);
  }

  function selectTab(name) {
    stop();
    $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === name));
    for (const s of ['sim', 'theory', 'quiz']) { const el = $('#tab-' + s); if (el) el.hidden = s !== name; }
    if (S) store.set('tab:' + S.t.id, name);
  }

  function buildSim(t, mi) {
    const mode = t.modes[mi];
    S.mode = mode;
    store.set('mode:' + t.id, mi);
    const saved = store.get(valKey(t, mode), {});
    const val = (inp) => (saved[inp.id] !== undefined ? saved[inp.id] : inp.value);
    const code = typeof mode.code === 'function' ? null : mode.code;
    const sec = $('#tab-sim');
    sec.innerHTML = `
      ${t.modes.length > 1 ? `<div class="modes" role="group">${t.modes.map((m, k) => `<button data-k="${k}" aria-pressed="${k === mi}">${esc(m.label)}</button>`).join('')}</div>` : ''}
      ${mode.note ? `<p class="qz-intro">${mode.note}</p>` : ''}
      <form class="inputs" id="inp">${mode.inputs.map((i) => fieldHTML(i, val(i))).join('')}
        <button class="btn primary" type="submit">Запустить</button></form>
      <p class="err" id="err" hidden></p>
      ${mode.presets ? `<div class="presets">Примеры:${mode.presets.map((p, k) => `<button type="button" data-p="${k}">${esc(p.label)}</button>`).join('')}</div>` : ''}
      <div class="stage-card"><div class="stage" id="stage"></div><div id="legend"></div></div>
      <div class="transport">
        <div class="tp-btns">
          <button id="bFirst" title="В начало (Home)">${IC.first}</button>
          <button id="bPrevK" title="К предыдущему ключевому шагу (Shift + ←)">${IC.prevK}</button>
          <button id="bPrev" title="Шаг назад (←)">${IC.prev}</button>
          <button id="bPlay" class="play" title="Пуск (пробел)">${IC.play}</button>
          <button id="bNext" title="Шаг вперёд (→)">${IC.next}</button>
          <button id="bNextK" title="К следующему ключевому шагу (Shift + →)">${IC.nextK}</button>
          <button id="bLast" title="В конец (End)">${IC.last}</button>
        </div>
        <input type="range" id="scrub" min="0" max="0" value="0" aria-label="Номер шага">
        <span class="pos" id="pos">0 / 0</span>
        <label class="speed">Скорость <select id="speed">
          <option value="1600">медленно</option><option value="850" selected>средне</option>
          <option value="380">быстро</option><option value="110">очень быстро</option></select></label>
      </div>
      <div class="panes">
        <div class="pane"><h3>Что происходит <span class="phase" id="phase"></span></h3><div class="msg" id="msg"></div><dl class="vars" id="vars"></dl></div>
        <div class="pane"><h3>Псевдокод</h3><ol class="code" id="code">${code ? codeHTML(code) : ''}</ol></div>
      </div>
      <p class="hint">Клавиши: <span class="kbd">←</span> <span class="kbd">→</span> — шаги, <span class="kbd">Shift</span> + стрелки — ключевые шаги, <span class="kbd">пробел</span> — пуск/пауза.</p>`;
    $$('.modes button', sec).forEach((b) => (b.onclick = () => { stop(); buildSim(t, +b.dataset.k); }));
    $('#inp').onsubmit = (e) => { e.preventDefault(); rebuild(); };
    $$('.presets button', sec).forEach((b) => (b.onclick = () => {
      const p = mode.presets[+b.dataset.p];
      for (const inp of mode.inputs) if (p.v[inp.id] !== undefined) {
        const el = $('#in-' + inp.id);
        if (inp.type === 'check') el.checked = p.v[inp.id];
        else el.value = Array.isArray(p.v[inp.id]) ? p.v[inp.id].join(', ') : p.v[inp.id];
      }
      rebuild();
    }));
    $$('#inp input[type="checkbox"], #inp select').forEach((el) => (el.onchange = rebuild));
    $('#bFirst').onclick = () => { stop(); show(0); };
    $('#bLast').onclick = () => { stop(); show(S.frames.length - 1); };
    $('#bPrev').onclick = () => { stop(); show(S.idx - 1); };
    $('#bNext').onclick = () => { stop(); show(S.idx + 1); };
    $('#bPrevK').onclick = () => { stop(); jumpKey(-1); };
    $('#bNextK').onclick = () => { stop(); jumpKey(1); };
    $('#bPlay').onclick = () => (S.timer ? stop() : play());
    $('#scrub').oninput = (e) => { stop(); show(+e.target.value); };
    $('#speed').onchange = () => { if (S.timer) play(); };
    rebuild();
  }

  function rebuild() {
    stop();
    const mode = S.mode;
    const v = readInputs(mode);
    const err = validate(mode, v);
    $('#err').hidden = !err;
    $('#err').textContent = err || '';
    if (err) return;
    store.set(valKey(S.t, mode), Object.fromEntries(mode.inputs.map((i) => [i.id, v[i.id]])));
    S.v = v;
    if (typeof mode.code === 'function') $('#code').innerHTML = codeHTML(mode.code(v));
    try {
      S.frames = mode.run(v);
    } catch (e) {
      console.error(e);
      S.frames = [{ msg: `<p class="err">Ошибка симуляции: ${esc(e.message)}</p>` }];
    }
    const lg = typeof mode.legend === 'function' ? mode.legend(v) : mode.legend;
    $('#legend').innerHTML = lg ? App.legend(lg) : '';
    $('#scrub').max = S.frames.length - 1;
    $('#stage').scrollLeft = 0;
    show(0);
  }

  /* ---------- тренажёр ---------- */
  function buildQuiz(t) {
    const q = t.quiz, sec = $('#tab-quiz');
    sec.innerHTML = `
      <p class="qz-intro">${q.intro}</p>
      <div class="qz-ctrl">
        <label class="fld"><span>Алфавит</span><select id="qA"><option value="ab">a, b</option><option value="abc" selected>a, b, c</option></select></label>
        <label class="fld"><span>Длина</span><select id="qL">${[6, 7, 8, 9, 10, 11, 12, 14].map((n) => `<option${n === (q.len || 9) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="fld"><span>Своя строка</span><input type="text" id="qS" spellcheck="false" style="--w:12rem" placeholder="или впиши сам"></label>
        <button class="btn" id="qNew" type="button">Новая строка</button>
      </div>
      <div class="stage-card"><div class="stage" id="qStage"></div></div>
      <div class="qz-act">
        <button class="btn primary" id="qCheck" type="button">Проверить</button>
        <button class="btn" id="qShow" type="button">Показать ответ</button>
        <button class="btn" id="qClear" type="button">Очистить</button>
        <span class="qz-res" id="qRes"></span>
      </div>`;
    let cur = null;
    let ctx = null;
    const draw = (s) => {
      const arrs = q.arrays(s, ctx), n = s.length, base = q.base || 0;
      cur = { s, arrs };
      let h = ctx != null ? `<div class="chips" style="margin-bottom:.6rem"><b>${esc(q.ctxLabel || 'P')} =</b><span>${esc(ctx)}</span></div>` : '';
      h += `<div class="strip" style="--cols:${n}">`;
      h += `<div class="r r-idx"><div class="lab"></div>${[...s].map((_, j) => `<div class="c" style="grid-column:${j + 2}">${j + base}</div>`).join('')}</div>`;
      h += `<div class="r r-chars"><div class="lab">${esc(q.sLabel || 'S')}</div>${[...s].map((c, j) => `<div class="c" style="grid-column:${j + 2}">${esc(c)}</div>`).join('')}</div>`;
      for (const a of arrs) {
        h += `<div class="r r-inp"><div class="lab">${a.label}</div>`;
        for (let j = 0; j < n; j++) {
          if (a.skip && a.skip.includes(j)) h += `<div class="c" style="grid-column:${j + 2};color:var(--muted)">·</div>`;
          else h += `<input class="c" style="grid-column:${j + 2}" data-a="${a.key}" data-j="${j}" inputmode="numeric" aria-label="${esc(a.key)}[${j}]">`;
        }
        h += '</div>';
      }
      $('#qStage').innerHTML = h + '</div>' + (q.note ? `<p class="hint">${q.note}</p>` : '');
      $('#qRes').textContent = '';
    };
    const norm = (x) => { x = String(x).trim(); return ['-', '—', '−', ''].includes(x) ? '−' : x; };
    const fresh = () => {
      if (q.ctx) ctx = q.ctx($('#qA').value);
      draw(App.randStr($('#qA').value, +$('#qL').value));
    };
    $('#qNew').onclick = () => { $('#qS').value = ''; fresh(); };
    $('#qS').onchange = (e) => {
      const s = e.target.value.replace(/\s+/g, '').slice(0, 20);
      if (s) draw(s);
    };
    $('#qClear').onclick = () => { $$('#qStage input').forEach((i) => { i.value = ''; i.className = 'c'; }); $('#qRes').textContent = ''; };
    $('#qShow').onclick = () => {
      for (const a of cur.arrs) $$(`#qStage input[data-a="${a.key}"]`).forEach((i) => { i.value = a.ans[+i.dataset.j]; i.className = 'c'; });
      $('#qRes').textContent = 'Ответ показан. Сравни со своим решением на бумаге.';
      $('#qRes').className = 'qz-res';
    };
    $('#qCheck').onclick = () => {
      let ok = 0, all = 0;
      for (const a of cur.arrs)
        $$(`#qStage input[data-a="${a.key}"]`).forEach((i) => {
          all++;
          const right = norm(i.value) === norm(a.ans[+i.dataset.j]);
          if (right) ok++;
          i.className = 'c ' + (right ? 'right' : 'wrong');
        });
      const r = $('#qRes');
      r.textContent = ok === all ? `Всё верно: ${ok} из ${all}.` : `Верно ${ok} из ${all}. Красные клетки — ошибки.`;
      r.className = 'qz-res ' + (ok === all ? 'good' : 'meh');
    };
    fresh();
  }

  function openSoon(num) {
    const tk = TICKETS.find((x) => x[0] === num);
    markSide('');
    const blk = BLOCKS.find((b) => b.id === (tk ? tk[1] : 1));
    $('#main').innerHTML = `<header class="th"><div class="eyebrow">Блок ${blk.roman} · ${esc(blk.title)} · билет ${num}</div>
      <h1>${esc(tk ? tk[2] : 'Билет ' + num)}</h1><p class="q">${esc(tk ? tk[3] : '')}</p></header>
      <div class="soon"><h2>Этот билет ещё не готов</h2>
      <p>Сейчас в симуляторе блоки III (поиск образца) и IV (суффиксные деревья) — они в приоритете. Блоки II и I добавим следующими: деревья поиска, AVL, красно-чёрные, декартовы, B-деревья, trie и PATRICIA, затем линейные сортировки.</p></div>`;
  }

  /* ---------- клавиатура и маршрут ---------- */
  document.addEventListener('keydown', (e) => {
    if (!S || $('#tab-sim') == null || $('#tab-sim').hidden) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'select', 'textarea'].includes(tag) && e.target.id !== 'scrub') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); stop(); e.shiftKey ? jumpKey(1) : show(S.idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); e.shiftKey ? jumpKey(-1) : show(S.idx - 1); }
    else if (e.key === ' ' && tag !== 'button') { e.preventDefault(); S.timer ? stop() : play(); }
    else if (e.key === 'Home') { e.preventDefault(); stop(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); stop(); show(S.frames.length - 1); }
  });

  function route() {
    const h = location.hash.slice(1);
    openTopic(h || store.get('last', 'z'));
  }
  window.addEventListener('hashchange', route);
  buildSide();
  route();
})();
