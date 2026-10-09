/* Билет 3. Поразрядная сортировка: LSD по десятичным разрядам, LSD по битам через сдвиги, MSD. */
(function (App) {
  'use strict';
  const esc = App.esc;
  const parseNums = (s) => s.split(/[\s,;]+/).filter(Boolean);

  // таблица «список чисел» с выделенным разрядом
  const table = (rows, o) => {
    let h = `<table class="sa"><tr><th>№</th><th>${o.head || 'число'}</th>${o.extraHead || ''}</tr>`;
    rows.forEach((r, i) => {
      h += `<tr class="${r.cls || ''}"><td class="num">${i + 1}</td><td class="lft"><span class="str">${r.digits.map((d, k) => `<b class="${o.dcls(k, r) || ''}">${esc(d)}</b>`).join('')}</span>${r.tag ? ` <span class="kc">${esc(r.tag)}</span>` : ''}</td>${r.extra || ''}</tr>`;
    });
    return h + '</table>';
  };
  const bucketsChips = (B, label, on) =>
    `<div class="chips"><b>${label}</b>${B.map((b, d) => `<span class="${d === on ? 'on' : b.length ? 'ok' : ''}">${d}: ${b.length ? b.join(' ') : '—'}</span>`).join('')}</div>`;

  /* ---------- LSD, десятичные разряды ---------- */
  function runDec({ A: src }) {
    const A = parseNums(src).map(Number), F = [];
    const m = Math.max(...A.map((x) => String(x).length));
    const pad = (x) => String(x).padStart(m, '0');
    let cur = A.slice();
    const push = (line, msg, x = {}) => F.push({ line, msg, m, rows: cur.map(pad), ...x, vars: [['n', A.length], ['m разрядов', m], ['основание', 10], ...(x.vars || [])] });
    push(0, `Этап 1: наибольшее число разрядов m = ${m}.`, { big: true });
    push(1, `Этап 2: дополняем числа ведущими нулями до ${m} разрядов, чтобы у всех был одинаковый разряд с каждым номером.`, {});
    for (let d = 0; d < m; d++) {
      const pos = m - 1 - d, B = Array.from({ length: 10 }, () => []);
      push(2, `Этап 3, проход ${d + 1}: устойчиво сортируем подсчётом по ${d} разряду (${d === 0 ? 'единицы' : d === 1 ? 'десятки' : d === 2 ? 'сотни' : `10^${d}`}). Цифра разряда = ⌊x / 10^${d}⌋ mod 10.`, { pos, big: true });
      for (const x of cur) {
        const dig = Math.floor(x / 10 ** d) % 10;
        B[dig].push(pad(x));
      }
      push(2, `Распределили по цифрам ${d} разряда, сохраняя текущий порядок внутри каждой цифры (сортировка подсчётом устойчива).`, { pos, B });
      cur = B.flat().map(Number);
      push(2, `После прохода ${d + 1} список упорядочен по последним ${d + 1} разрядам.`, { pos, done1: d });
    }
    push([], `Готово: ${cur.join(', ')}. Проходов m = ${m}, каждый — сортировка подсчётом за O(n + 10): всего O(m·(n + 10)) = O(n) при фиксированном m.`, { big: true, fin: true });
    return F;
  }
  const renderDec = (f) => {
    const m = f.m;
    const h = table(f.rows.map((r) => ({ digits: [...r] })), {
      dcls: (k) => (f.fin || f.pos == null ? '' : k === f.pos ? 'blk' : k > f.pos ? 'ok' : ''),
    });
    return h + (f.B ? bucketsChips(f.B, `Карманы по ${m - 1 - f.pos} разряду:`) : '');
  };

  /* ---------- LSD по битам: (x >> s) & mask ---------- */
  function runBits({ A: src, r: rs }) {
    const A = parseNums(src).map(Number), r = +rs, F = [], mask = (1 << r) - 1;
    const maxv = Math.max(...A, 1), b = Math.max(r, Math.ceil(Math.log2(maxv + 1) / r) * r);
    const bin = (x) => x.toString(2).padStart(b, '0');
    let cur = A.slice();
    const passes = b / r;
    const push = (line, msg, x = {}) => F.push({ line, msg, b, r, rows: cur.slice(), ...x, vars: [['n', A.length], ['бит в ключе b', b], ['r бит за проход', r], ['mask', `${mask} = ${mask.toString(2)}₂`], ['проходов b/r', passes]] });
    push(0, `Ключи храним в двоичном виде: b = ${b} бит. «Разряд» — группа из r = ${r} бит, то есть основание 2^r = ${1 << r}. Вместо деления и остатка берём цифру сдвигом и маской: digit = (x >> s) & ${mask} (mask = 2^r − 1 = ${mask.toString(2).padStart(r, '0')}₂).`, { big: true });
    for (let p = 0; p < passes; p++) {
      const s = p * r, B = Array.from({ length: 1 << r }, () => []);
      push([1, 2], `Проход ${p + 1}: сдвиг s = ${p}·r = ${s}. x >> ${s} убирает ${s} младших бит, & ${mask} оставляет следующие ${r} — это биты ${s}…${s + r - 1} (считая с младшего, с 0).`, { s, big: true });
      for (const x of cur) B[(x >> s) & mask].push(x);
      push([2, 3], `Устойчивая сортировка подсчётом по digit: ${cur.map((x) => `(${x} >> ${s}) & ${mask} = ${(x >> s) & mask}`).slice(0, 4).join(', ')}${cur.length > 4 ? ', …' : ''}.`, { s, B, digits: true });
      cur = B.flat();
      push(3, `Список упорядочен по младшим ${s + r} битам.`, { s, sorted: s + r });
    }
    push([], `Готово: ${cur.join(', ')}. Проходов ⌈b/r⌉ = ${passes}, каждый O(n + 2^r): итого O((b/r)·(n + 2^r)). Выбор r ≈ log₂ n даёт O(b·n / log n); для 32-битных ключей и r = 8 — 4 прохода по 256 карманам.`, { big: true, fin: true });
    return F;
  }
  const renderBits = (f) => {
    const { b, r, s } = f;
    const h = table(f.rows.map((x) => ({
      digits: [...x.toString(2).padStart(b, '0')],
      tag: String(x),
      extra: s != null && f.digits ? `<td class="num">(${x} >> ${s}) &amp; ${(1 << r) - 1} = <b>${(x >> s) & ((1 << r) - 1)}</b></td>` : '',
    })), {
      head: `двоичная запись (бит ${b - 1} … 0) и число`,
      extraHead: f.digits ? '<th>digit</th>' : '',
      dcls: (k) => {
        if (f.fin || s == null) return '';
        const bit = b - 1 - k;
        if (bit >= s && bit < s + r) return 'blk';
        if (bit < s) return f.sorted != null || f.digits ? 'ok' : 'dim';
        return '';
      },
    });
    return h + (f.B ? bucketsChips(f.B, `Карманы digit (0…${(1 << r) - 1}):`) : '');
  };

  /* ---------- MSD ---------- */
  function runMSD({ A: src }) {
    const A = parseNums(src).map(Number), F = [];
    const m = Math.max(...A.map((x) => String(x).length));
    const pad = (x) => String(x).padStart(m, '0');
    let arr = A.map(pad);
    const groups = [];
    const push = (line, msg, x = {}) => F.push({ line, msg, m, rows: arr.slice(), ...x, vars: [['n', A.length], ['m разрядов', m]] });
    push(0, `MSD: идём от старшего разряда к младшему. После сортировки по очередному разряду список делится на группы с равными старшими разрядами, и дальше каждая группа сортируется отдельно.`, { big: true });
    const rec = (lo, hi, pos) => {
      if (hi - lo <= 1 || pos >= m) {
        if (hi - lo >= 1) push(3, hi - lo === 1 ? `Группа [${lo + 1}] из одного числа — уже на месте.` : `Разряды кончились: числа ${lo + 1}…${hi} равны.`, { lo, hi, pos });
        return;
      }
      const B = Array.from({ length: 10 }, () => []);
      for (let i = lo; i < hi; i++) B[+arr[i][pos]].push(arr[i]);
      push(1, `Группа строк ${lo + 1}…${hi}: сортируем подсчётом по ${m - 1 - pos} разряду (${pos + 1}-я цифра слева).`, { lo, hi, pos, B, big: lo === 0 && hi === arr.length });
      const flat = B.flat();
      for (let i = lo; i < hi; i++) arr[i] = flat[i - lo];
      let s = lo;
      const parts = [];
      for (const g of B) if (g.length) { parts.push([s, s + g.length]); s += g.length; }
      groups.push(...parts);
      push(2, `Делим на группы с одинаковой цифрой: ${parts.map(([a, b]) => (b - a > 1 ? `${a + 1}…${b}` : `${a + 1}`)).join(' | ')}. Каждую группу сортируем по следующему разряду отдельно.`, { lo, hi, pos, parts });
      for (const [a, b] of parts) rec(a, b, pos + 1);
    };
    rec(0, arr.length, 0);
    push([], `Готово: ${arr.map(Number).join(', ')}. Время тоже O(m·(n + 10)), но MSD может остановиться раньше, если группы стали из одного элемента, и подходит для строк разной длины (лексикографический порядок).`, { big: true, fin: true });
    return F;
  }
  const renderMSD = (f) => {
    const h = table(f.rows.map((x, i) => ({ digits: [...x], cls: f.lo != null && !f.fin && (i < f.lo || i >= f.hi) ? 'dim' : '' })), {
      dcls: (k) => (f.fin || f.pos == null ? '' : k < f.pos ? 'ok' : k === f.pos ? 'blk' : ''),
    });
    return h + (f.B ? bucketsChips(f.B, 'Карманы по цифре:') : '') + (f.parts ? `<div class="chips"><b>Группы:</b>${f.parts.map(([a, b]) => `<span>${a + 1}${b - a > 1 ? '…' + b : ''}</span>`).join('')}</div>` : '');
  };

  const vNums = (max) => (v) => {
    const a = parseNums(v.A);
    return !a.length || a.length > 14 || a.some((x) => !/^\d+$/.test(x) || +x > max) ? `Нужно от 1 до 14 целых чисел от 0 до ${max}.` : null;
  };

  App.register({
    id: 'radixsort', block: 1, num: 3, title: 'Поразрядная сортировка',
    full: '3. Поразрядная сортировка. Доказательство линейности алгоритма.',
    modes: [
      {
        id: 'dec', label: 'LSD, десятичные разряды',
        inputs: [{ id: 'A', label: 'Массив A', raw: true, value: '329 87 907 131 5 228 320 19', max: 80, w: 24 }],
        validate: vNums(9999),
        presets: [
          { label: 'как в конспекте', v: { A: '329 87 907 131 5 228 320 19' } },
          { label: 'Кормен', v: { A: '329 457 657 839 436 720 355' } },
        ],
        legend: [['blk', 'текущий разряд'], ['ok', 'уже упорядочено']],
        code: [
          'm = наибольшее число разрядов',
          'дополнить числа ведущими нулями до m разрядов',
          'for d = 0 .. m − 1:  (от младшего разряда к старшему)',
          '  устойчивая сортировка подсчётом по цифре ⌊x / 10^d⌋ mod 10',
        ],
        run: runDec, render: renderDec,
      },
      {
        id: 'bits', label: 'LSD по битам: сдвиги',
        note: 'Тот же LSD, но основание — степень двойки 2^r. Цифра берётся не делением, а битовыми операциями: digit = (x >> s) & (2^r − 1).',
        inputs: [
          { id: 'A', label: 'Массив A (0…255)', raw: true, value: '170 45 75 90 2 24 200 66', max: 80, w: 24 },
          { id: 'r', label: 'r бит за проход', type: 'select', value: '2', options: [['1', '1 (основание 2)'], ['2', '2 (основание 4)'], ['4', '4 (основание 16)']] },
        ],
        validate: vNums(255),
        presets: [
          { label: 'r = 2', v: { A: '170 45 75 90 2 24 200 66', r: '2' } },
          { label: 'r = 1 (по одному биту)', v: { A: '13 6 11 2 9 4 15 0', r: '1' } },
          { label: 'r = 4 (шестнадцатеричные цифры)', v: { A: '171 26 205 74 239 18 160', r: '4' } },
        ],
        legend: [['blk', 'биты текущей цифры'], ['ok', 'уже упорядоченные младшие биты']],
        code: [
          'mask = (1 << r) − 1',
          'for s = 0, r, 2r, …  пока s < b:',
          '  digit(x) = (x >> s) & mask',
          '  устойчивая сортировка подсчётом по digit (2^r карманов)',
        ],
        run: runBits, render: renderBits,
      },
      {
        id: 'msd', label: 'MSD',
        inputs: [{ id: 'A', label: 'Массив A', raw: true, value: '329 357 31 907 324 339 355 21', max: 80, w: 24 }],
        validate: vNums(9999),
        presets: [
          { label: 'общие префиксы', v: { A: '329 357 31 907 324 339 355 21' } },
          { label: 'Кормен', v: { A: '329 457 657 839 436 720 355' } },
        ],
        legend: [['blk', 'текущий разряд'], ['ok', 'уже равные старшие разряды']],
        code: [
          'msd(группа, разряд):',
          '  устойчивая сортировка подсчётом группы по разряду',
          '  делим на подгруппы с равной цифрой',
          '  для каждой подгруппы из > 1 элемента: msd(подгруппа, следующий разряд)',
        ],
        run: runMSD, render: renderMSD,
      },
    ],
    theory: `
<h3>Постановка задачи</h3>
<p>Есть неупорядоченный массив A из элементов «ключ — значение», ключ — целое число от 0 до k. Требуется получить упорядоченный массив B из элементов A.</p>
<div class="def"><b>Поразрядная сортировка</b> (radix sort) — устойчивый алгоритм сортировки целых чисел (или объектов с таким ключом), работающий за линейное время при фиксированном числе разрядов. Ключ рассматривается как последовательность цифр (разрядов), и сортировка идёт по одному разряду за проход.</div>
<p>Есть два варианта: <b>LSD</b> (Least Significant Digit — от младшего разряда) и <b>MSD</b> (Most Significant Digit — от старшего).</p>
<h3>LSD — три этапа</h3>
<ol><li>Нахождение наибольшего числа разрядов m среди ключей.</li>
<li>Составление списка чисел, дополняя недостающие разряды до m нулями.</li>
<li>Сортировка подсчётом по разрядам, двигаясь <b>от младшего разряда к старшему</b>. В итоге список устойчиво отсортирован.</li></ol>
<div class="proof"><p><b>Корректность</b> — индукция по числу проходов: после d проходов список упорядочен по последним d разрядам. Проход d + 1 сортирует по разряду d + 1; числа с разной цифрой встают в правильном порядке, а числа с равной цифрой остаются в прежнем порядке (устойчивость!) — то есть по младшим d разрядам. Поэтому важна именно устойчивая сортировка на каждом проходе.</p></div>
<h3>MSD</h3>
<p>Всё аналогично, но сортировка подсчётом идёт <b>от старших разрядов к младшим</b>, и после сортировки по очередному разряду список делится на группы по равным старшим разрядам; каждая группа дальше сортируется отдельно (рекурсивно). Подходит для строк разной длины — даёт лексикографический порядок, и группы из одного элемента дальше не обрабатываются.</p>

<h3>Битовые сдвиги: основание 2<sup>r</sup></h3>
<p>Разряд не обязан быть десятичным. Удобнее взять основание 2<sup>r</sup>: тогда «цифра» — это группа из r бит двоичной записи, и вместо деления и остатка (медленные операции) достаточно сдвига и маски:</p>
<p class="m">digit<sub>p</sub>(x) = (x &gt;&gt; (p·r)) &amp; (2<sup>r</sup> − 1)</p>
<ul>
<li><code>x &gt;&gt; s</code> — сдвиг вправо на s бит: младшие s бит выбрасываются, остальные съезжают вниз. Это деление на 2<sup>s</sup> нацело.</li>
<li><code>&amp; mask</code>, где mask = 2<sup>r</sup> − 1 = 11…1₂ (r единиц), обнуляет всё, кроме младших r бит. Это остаток от деления на 2<sup>r</sup>.</li>
<li>Проход p = 0, 1, 2, … смотрит на биты p·r … p·r + r − 1 — от младших к старшим (LSD).</li>
</ul>
<p>Пример: x = 170 = 10101010₂, r = 2, mask = 3 = 11₂. Проход 0: (170 &gt;&gt; 0) &amp; 3 = 10₂ = 2; проход 1: (170 &gt;&gt; 2) &amp; 3 = 101010₂ &amp; 11₂ = 10₂ = 2; проход 2: (170 &gt;&gt; 4) &amp; 3 = 1010₂ &amp; 11₂ = 2; проход 3: (170 &gt;&gt; 6) &amp; 3 = 10₂ = 2.</p>
<p>Для b-битных ключей нужно ⌈b/r⌉ проходов, в каждом 2<sup>r</sup> карманов сортировки подсчётом. Типичный выбор для 32-битных чисел — r = 8 (4 прохода по 256 карманам) или r = 16 (2 прохода по 65 536 карманам).</p>

<h3>Доказательство линейности</h3>
<div class="thm"><b>Теорема.</b> Поразрядная сортировка n ключей из m цифр в системе счисления с основанием k работает за O(m·(n + k)).</div>
<div class="proof">
<p>Нахождение m и дополнение нулями — O(n·m). Каждый из m проходов — сортировка подсчётом по цифре от 0 до k − 1: O(n + k) (билет 2). Итого O(m·(n + k)).</p>
<p>Если m — константа и k = O(n), получаем O(n). Для b-битных ключей и основания 2<sup>r</sup>: m = ⌈b/r⌉, k = 2<sup>r</sup>, время O((b/r)·(n + 2<sup>r</sup>)). При r = log₂ n это O(b·n / log n). Если ключи — числа до n<sup>c</sup> (b = c·log₂ n бит), получаем O(c·n) — линейное время, быстрее, чем Ω(n log n) у сортировок сравнением.</p>
</div>`,
  });
})(window.App);
