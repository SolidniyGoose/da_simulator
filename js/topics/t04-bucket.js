/* Билет 4. Карманная (блочная) сортировка чисел из [0, 1). */
(function (App) {
  'use strict';
  const esc = App.esc;
  const parse = (s) => s.split(/[\s,;]+/).filter(Boolean).map((x) => x.replace(',', '.'));

  function run({ A: src, k: ks }) {
    const A = parse(src).map(Number), n = A.length, k = ks === 'n' ? n : +ks, F = [];
    const B = Array.from({ length: k }, () => []);
    let out = [], moves = 0;
    const push = (line, msg, x = {}) => F.push({ line, msg, A, k, B: B.map((b) => b.slice()), out: out.slice(), ...x, vars: [['n', n], ['k карманов', k], ['сдвигов при сортировке', moves]] });
    push([], `Отрезок [0, 1) делим на k = ${k} одинаковых карманов шириной 1/${k}. Число x попадает в карман ⌊k·x⌋. При равномерном распределении в каждом кармане окажется мало чисел.`, { big: true });
    A.forEach((x, i) => {
      const b = Math.floor(k * x);
      B[b].push(x);
      push(0, `${x}: ⌊${k} · ${x}⌋ = ⌊${(k * x).toFixed(2)}⌋ = ${b} → карман ${b} [${(b / k).toFixed(2)}, ${((b + 1) / k).toFixed(2)}).`, { ai: i, bi: b });
    });
    push(1, 'Все числа разложены. Теперь сортируем каждый карман отдельно — любым способом, например вставками: в кармане обычно 0–2 числа.', { big: true });
    for (let b = 0; b < k; b++) {
      if (B[b].length < 2) continue;
      const before = B[b].join(', ');
      for (let i = 1; i < B[b].length; i++) {
        const v = B[b][i];
        let j = i - 1;
        while (j >= 0 && B[b][j] > v) { B[b][j + 1] = B[b][j]; j--; moves++; }
        B[b][j + 1] = v;
      }
      push(1, `Карман ${b}: ${before} → ${B[b].join(', ')} (вставками).`, { bi: b });
    }
    for (let b = 0; b < k; b++) {
      if (!B[b].length) continue;
      out = out.concat(B[b]);
      push(2, `Выписываем карман ${b}: ${B[b].join(', ')}.`, { bi: b });
    }
    push([], `Готово: ${out.join(', ')}. Распределение и склейка — O(n + k); сортировки внутри карманов при равномерных данных в среднем O(n) суммарно. Самый большой карман: ${Math.max(...B.map((b) => b.length))} элемент(а).`, { big: true, done: true });
    return F;
  }

  function render(f) {
    let h = `<div class="chips"><b>A:</b>${f.A.map((x, i) => `<span class="${i === f.ai ? 'on' : ''}">${esc(x)}</span>`).join('')}</div>`;
    // отрезок [0,1) с границами карманов и точками
    const W = 640, L = 20, Rr = 620, yy = 40, X = (v) => L + (Rr - L) * v;
    let svg = `<svg class="bt" width="${W}" height="76" viewBox="0 0 ${W} 76" role="img" aria-label="отрезок [0, 1)"><line class="bt-e" x1="${L}" y1="${yy}" x2="${Rr}" y2="${yy}"/>`;
    for (let b = 0; b <= f.k; b++) svg += `<line class="bt-e ${b === f.bi || b === f.bi + 1 ? 'path' : ''}" x1="${X(b / f.k)}" y1="${yy - 12}" x2="${X(b / f.k)}" y2="${yy + 12}"/>`;
    for (let b = 0; b < f.k; b++) svg += `<text class="bt-el" x="${X((b + 0.5) / f.k)}" y="${yy + 28}">${b}</text>`;
    f.A.forEach((x, i) => { svg += `<circle cx="${X(x)}" cy="${yy}" r="${i === f.ai ? 6 : 4}" class="bkt-dot${i === f.ai ? ' on' : ''}"/>`; });
    svg += `<text class="bt-el" x="${L}" y="14">0</text><text class="bt-el" x="${Rr}" y="14">1</text></svg>`;
    h += `<div class="tree-wrap">${svg}</div>`;
    h += '<table class="mini"><caption>Карманы</caption><tr><th>№</th><th>интервал</th><th>числа</th></tr>';
    f.B.forEach((b, i) => { h += `<tr><td class="${i === f.bi ? 'on' : ''}">${i}</td><td class="mut">[${(i / f.k).toFixed(2)}, ${((i + 1) / f.k).toFixed(2)})</td><td style="text-align:left">${b.length ? b.map(esc).join(', ') : '—'}</td></tr>`; });
    h += '</table>';
    if (f.out.length) h += `<div class="chips"><b>Результат:</b>${f.out.map((x) => `<span class="ok">${esc(x)}</span>`).join('')}</div>`;
    return h;
  }

  App.register({
    id: 'bucket', block: 1, num: 4, title: 'Карманная сортировка',
    full: '4. Карманная сортировка.',
    modes: [{
      id: 'main', label: 'Сортировка',
      inputs: [
        { id: 'A', label: 'Числа из [0, 1)', raw: true, value: '0.78 0.17 0.39 0.26 0.72 0.94 0.21 0.12 0.23 0.68', max: 120, w: 30 },
        { id: 'k', label: 'Карманов k', type: 'select', value: 'n', options: [['n', 'k = n'], ['5', '5'], ['10', '10'], ['4', '4']] },
      ],
      validate: (v) => { const a = parse(v.A); return !a.length || a.length > 16 || a.some((x) => !/^0?\.\d+$|^0$/.test(x)) ? 'Нужно от 1 до 16 чисел вида 0.42 (от 0 включительно до 1 не включительно).' : null; },
      presets: [
        { label: 'Кормен', v: { A: '0.78 0.17 0.39 0.26 0.72 0.94 0.21 0.12 0.23 0.68', k: 'n' } },
        { label: 'конспект', v: { A: '0.02 0.1 0.12 0.2 0.33 0.37 0.42 0.62 0.7 0.87', k: '10' } },
        { label: 'неравномерные (плохо)', v: { A: '0.11 0.12 0.15 0.13 0.18 0.14 0.17 0.9', k: 'n' } },
      ],
      legend: [['blk', 'текущий карман / число']],
      code: [
        'for x in A:  B[⌊k·x⌋].append(x)              // O(n)',
        'for i = 0 .. k − 1:  отсортировать B[i]       // вставками',
        'результат = B[0] + B[1] + … + B[k − 1]        // O(n + k)',
      ],
      run, render,
    }],
    theory: `
<h3>Алгоритм</h3>
<p>Разбиваем отрезок [0, 1) с равномерным распределением элементов входного массива на k одинаковых отрезков (карманов) и раскладываем по этим карманам n входных величин: число x попадает в карман ⌊k·x⌋.</p>
<p>Поскольку входные числа распределены равномерно, предполагается, что в каждый карман попадёт небольшое количество чисел. Затем последовательно сортируются числа в карманах (любым способом, обычно вставками). Отсортированный массив получается последовательным перечислением элементов каждого кармана.</p>
<p>Если значения во входном списке равномерно распределены и k ≈ n, карманная сортировка работает за O(n) в среднем: сортировки в карманах быстрые из-за малого количества элементов.</p>
<h3>Корректность</h3>
<p>Если x &lt; y лежат в разных карманах, то ⌊k·x⌋ ≤ ⌊k·y⌋, и карман x выписывается раньше. Внутри кармана порядок обеспечивает его сортировка.</p>
<h3>Оценка среднего времени (k = n)</h3>
<div class="proof">
<p>Распределение и склейка — O(n). Пусть n<sub>i</sub> — число элементов в кармане i; сортировка вставками кармана стоит O(n<sub>i</sub><sup>2</sup>). Время T(n) = Θ(n) + Σ O(n<sub>i</sub><sup>2</sup>).</p>
<p>Введём индикаторы X<sub>ij</sub> = [элемент j попал в карман i], P = 1/n. Тогда n<sub>i</sub> = Σ<sub>j</sub> X<sub>ij</sub> и E[n<sub>i</sub><sup>2</sup>] = Σ<sub>j</sub> E[X<sub>ij</sub><sup>2</sup>] + Σ<sub>j≠l</sub> E[X<sub>ij</sub>X<sub>il</sub>] = n·(1/n) + n(n − 1)·(1/n<sup>2</sup>) = 2 − 1/n.</p>
<p>E[T(n)] = Θ(n) + n·O(2 − 1/n) = Θ(n).</p>
</div>
<h3>Худший случай</h3>
<p>Если все числа попали в один карман (данные неравномерны), время определяется сортировкой этого кармана: O(n<sup>2</sup>) вставками или O(n log n), если сортировать карманы, например, слиянием. Попробуй пример «неравномерные».</p>`,
  });
})(window.App);
