/* Билет 12. Простейший алгоритм поиска подстроки. */
(function (App) {
  'use strict';
  const { c: C } = App.fmt;

  function run({ T, P, rtl }) {
    const n = T.length, m = P.length, F = [], occ = [];
    let cmp = 0;
    const V = (s, i) => [['s', s ?? '—'], ['i', i ?? '—'], ['сравнений', cmp], ['вхождений', occ.length]];
    F.push({ line: [], big: true, s: null, occ: [], msg: `n = |T| = ${n}, m = |P| = ${m}. Прикладываем образец ко всем позициям s = 0…${n - m} и ${rtl ? 'сравниваем справа налево' : 'сравниваем слева направо'} до первого несовпадения.`, vars: V() });
    for (let s = 0; s <= n - m; s++) {
      const ok = [];
      F.push({ line: 0, big: true, s, ok: [], occ: occ.slice(), msg: `Прикладываем P к позиции s = ${s}: под P[0] стоит T[${s}].`, vars: V(s) });
      let i = rtl ? m - 1 : 0, good = true;
      while (rtl ? i >= 0 : i < m) {
        cmp++;
        if (P[i] === T[s + i]) {
          ok.push(i);
          F.push({ line: 2, s, ok: ok.slice(), cur: i, occ: occ.slice(), msg: `P[${i}] = ${C(P[i])} и T[${s + i}] = ${C(T[s + i])} — совпали, идём ${rtl ? 'влево' : 'вправо'}.`, vars: V(s, i) });
          i += rtl ? -1 : 1;
        } else {
          F.push({ line: 2, s, ok: ok.slice(), cur: i, bad: i, occ: occ.slice(), msg: `P[${i}] = ${C(P[i])} ≠ T[${s + i}] = ${C(T[s + i])} — несовпадение. Всё, что совпало (${ok.length} симв.), алгоритм забывает и сдвигает образец на 1.`, vars: V(s, i) });
          good = false;
          break;
        }
      }
      if (good) {
        occ.push(s);
        F.push({ line: 4, big: true, s, ok: ok.slice(), occ: occ.slice(), msg: `Совпали все ${m} символов — вхождение P в позиции ${s}. Сдвигаем образец на 1.`, vars: V(s) });
      }
    }
    F.push({ line: [], big: true, s: null, occ: occ.slice(), msg: `Готово. Вхождения: ${occ.length ? occ.join(', ') : 'нет'}. Сравнений: ${cmp}. Худший случай: (n − m + 1)·m = ${(n - m + 1) * m}.`, vars: V() });
    return F;
  }

  function render(f, { T, P }) {
    const n = T.length, m = P.length;
    const inOcc = (j) => f.occ.some((s) => j >= s && j < s + m);
    return App.strip(n, [
      { type: 'idx', n },
      {
        type: 'chars', label: 'T', chars: T,
        cell: (j) => {
          if (f.s == null) return inOcc(j) ? 'ok' : '';
          const i = j - f.s;
          if (i < 0 || i >= m) return 'dim';
          return (i === f.bad ? 'bad' : f.ok.includes(i) ? 'ok' : '') + (i === f.cur ? ' focus' : '');
        },
      },
      f.s != null && {
        type: 'chars', label: 'P', start: f.s, chars: P,
        cell: (i) => (i === f.bad ? 'bad' : f.ok.includes(i) ? 'ok' : '') + (i === f.cur ? ' focus' : ''),
      },
      { type: 'spans', label: '', items: f.occ.map((s) => ({ from: s, to: s + m - 1, text: 'вх. ' + s, cls: 'occ' })) },
    ]);
  }

  App.register({
    id: 'naive', block: 3, num: 12, title: 'Простейший поиск',
    full: '12. Поиск подстроки в строке. Простейший алгоритм поиска.',
    modes: [{
      id: 'main', label: 'Поиск',
      inputs: [
        { id: 'T', label: 'Текст T', value: 'abaabacabaaba', max: 40, w: 22 },
        { id: 'P', label: 'Образец P', value: 'abaa', max: 12, w: 9 },
        { id: 'rtl', label: 'сравнивать справа налево', type: 'check', value: false },
      ],
      validate: (v) => (v.P.length > v.T.length ? 'Образец длиннее текста.' : null),
      presets: [
        { label: 'обычный', v: { T: 'abaabacabaaba', P: 'abaa' } },
        { label: 'худший случай', v: { T: 'aaaaaaaaaaaaaaa', P: 'aaaab' } },
        { label: 'много вхождений', v: { T: 'aaaaaaaaaa', P: 'aaa' } },
      ],
      legend: [['ok', 'совпадение'], ['bad', 'несовпадение']],
      code: (v) => [
        'for s = 0 .. n − m:                 // все позиции приложения',
        v.rtl ? '  i = m − 1' : '  i = 0',
        v.rtl ? '  while i ≥ 0 and P[i] = T[s + i]: i = i − 1' : '  while i < m and P[i] = T[s + i]: i = i + 1',
        v.rtl ? '  if i < 0:' : '  if i = m:',
        '    вхождение в позиции s',
      ],
      run, render,
    }],
    theory: `
<h3>Постановка</h3>
<p>Дан текст <i>T</i> длины <i>n</i> и образец <i>P</i> длины <i>m</i>. Нужно найти все позиции <i>s</i>, для которых T[s..s+m−1] = P.</p>
<h3>Алгоритм</h3>
<p>Прикладываем P к каждой позиции s = 0, 1, …, n − m и сравниваем символы слева направо до первого несовпадения. Если совпали все m символов, записываем вхождение. После каждой проверки сдвигаем образец на 1.</p>
<h3>Сложность</h3>
<ul>
<li>Худший случай Θ((n − m + 1)·m) = O(nm). Пример: T = aaa…a, P = aa…ab. На каждой из n − m + 1 позиций делается m сравнений.</li>
<li>Дополнительная память O(1).</li>
<li>В среднем на случайном тексте над алфавитом из σ ≥ 2 символов на одну позицию уходит меньше σ/(σ − 1) ≤ 2 сравнений (вероятность дойти до k-го символа равна σ<sup>−k</sup>), поэтому на практике алгоритм почти линейный.</li>
</ul>
<h3>Чем плох</h3>
<p>После несовпадения алгоритм «забывает», какие символы текста уже совпали, и сравнивает их снова. Все следующие алгоритмы блока используют эту информацию:</p>
<ul>
<li>Z-функция и КМП — знают, на сколько можно сдвинуть образец, не пропустив вхождения;</li>
<li>Бойер-Мур — сравнивает справа налево и прыгает сразу на много позиций;</li>
<li>Апостолико-Джанкарло — помнит, что уже совпало, и не сравнивает это повторно;</li>
<li>Ахо-Корасик — ищет сразу много образцов.</li>
</ul>
<p>Все они работают за O(n + m).</p>
<p class="note">Попробуй пример «худший случай»: при n = 15 и m = 5 получается 55 сравнений.</p>`,
  });
})(window.App);
