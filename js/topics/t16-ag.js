/* Билет 16. Алгоритм Апостолико-Джанкарло. Обозначения конспекта: h — правый край образца в T,
   j — позиция в T, i — позиция в P, M[h] — сколько совпало в фазе с правым краем h. Индексация с 0. */
(function (App) {
  'use strict';
  const A = App.algo, { c: C, s: SS } = App.fmt;

  function run({ T, P }) {
    const n = T.length, m = P.length, pre = A.bm(P), N = pre.N;
    const M = new Array(n).fill(null), F = [], occ = [];
    let cmp = 0, phases = 0, h = m - 1;
    const st = { j: null, i: null, kase: '—' };
    const V = () => [['h', h], ['j', st.j ?? '—'], ['i', st.i ?? '—'], ['M[j]', st.j != null && M[st.j] != null ? M[st.j] : '—'], ['N[i]', st.i != null ? N[st.i] : '—'], ['случай', st.kase], ['сравнений', `${cmp} (≤ 2n = ${2 * n})`]];
    const push = (line, msg, o = {}) => F.push({ line, msg, h, M: M.slice(), occ: occ.slice(), N, cmp, vars: V(), j: st.j, i: st.i, ...o });

    push(0, `Предподсчёт как в БМ: N = [${N.join(', ')}] и сдвиги по сильным ППС и ПХС. Массив M длины n = ${n}: M[h] будет хранить, сколько символов совпало, когда правый край образца стоял в h. Пока M не определён.`, { big: true });
    while (h < n) {
      phases++;
      const s = h - m + 1;
      let j = h, i = m - 1;
      const ok = new Set(), skip = new Set();
      Object.assign(st, { j, i, kase: '—' });
      push([1, 2, 3], `Фаза ${phases}: правый край образца в h = ${h} (левый край s = ${s}). j = h = ${h}, i = m − 1 = ${m - 1}. Перед каждым сравнением смотрим на M[j] и N[i].`, { s, ok: [], skip: [], big: true });
      const snap = (o) => ({ s, ok: [...ok], skip: [...skip], ...o });
      let res = null;
      for (;;) {
        Object.assign(st, { j, i });
        const Mj = M[j], Ni = N[i];
        if (Mj === null || (Mj === 0 && Ni === 0)) {
          st.kase = '1';
          const why = Mj === null ? `M[${j}] не определено` : `M[${j}] = N[${i}] = 0`;
          cmp++;
          if (T[j] === P[i]) {
            ok.add(i);
            if (i === 0) {
              M[h] = m;
              push([4, 5, 6], `Случай 1 (${why}) — сравниваем: T[${j}] = ${C(T[j])} = P[0]. Совпал весь образец — вхождение в позиции ${s}. M[${h}] = m = ${m}.`, snap({ cmpAt: i, eq: true, mset: h, big: true }));
              res = { occ: true };
              break;
            }
            push([4, 5, 7], `Случай 1 (${why}) — информации нет, сравниваем: T[${j}] = ${C(T[j])} = P[${i}] — совпали, j = ${j - 1}, i = ${i - 1}.`, snap({ cmpAt: i, eq: true }));
            j--; i--;
          } else {
            M[h] = h - j;
            push([4, 5, 8], `Случай 1 (${why}) — сравниваем: T[${j}] = ${C(T[j])} ≠ P[${i}] = ${C(P[i])}. Несовпадение: M[${h}] = h − j = ${h - j} (столько символов совпало), сдвиг по правилам БМ.`, snap({ cmpAt: i, eq: false, mset: h, big: true }));
            res = { i, j };
            break;
          }
        } else if (Mj < Ni) {
          st.kase = '2';
          push([9, 10], `Случай 2: M[${j}] = ${Mj} &lt; N[${i}] = ${Ni}. Отрезок T[${j - Mj + 1}..${j}] совпадает с суффиксом P длины ${Mj}, а он же — суффикс P[0..${i}] (ведь ${Mj} &lt; N[${i}]). Значит, эти ${Mj} символов совпадают — пропускаем их без сравнений: j = ${j - Mj}, i = ${i - Mj}.`,
            snap({ mseg: Mj ? [j - Mj + 1, j] : null, nseg: [i - Ni + 1, i], jumpP: Mj ? [i - Mj + 1, i] : null }));
          for (let q = 0; q < Mj; q++) skip.add(i - q);
          j -= Mj; i -= Mj;
          Object.assign(st, { j, i });
          cmp++;
          M[h] = h - j;
          push([10, 11], `Сравниваем T[${j}] = ${C(T[j])} и P[${i}] = ${C(P[i])} — несовпадение, и оно было предсказуемо: T[${j}] ≠ P[m − 1 − ${Mj}] по определению M, а P[${i}] = P[m − 1 − ${Mj}] по определению N. M[${h}] = h − j = ${h - j}, сдвиг по БМ.`,
            snap({ cmpAt: i, eq: false, mset: h, big: true }));
          res = { i, j };
          break;
        } else if (Mj === Ni) {
          st.kase = '3';
          if (Ni === i + 1) {
            for (let q = 0; q <= i; q++) skip.add(q);
            M[h] = m;
            push([12, 13], `Случай 3: M[${j}] = N[${i}] = ${Ni}, и N[${i}] = i + 1 (в 1-индексации N<sub>i</sub> = i): оставшиеся ${i + 1} символов P[0..${i}] совпадают с суффиксом P, а тот — с текстом. Вхождение в позиции ${s}! M[${h}] = m = ${m}.`,
              snap({ mseg: [j - Mj + 1, j], nseg: [0, i], jumpP: [0, i], mset: h, big: true }));
            res = { occ: true };
            break;
          }
          push([12, 14], `Случай 3: M[${j}] = N[${i}] = ${Ni}. Эти ${Ni} символов совпадают (как в случае 2) — пропускаем: j = ${j - Mj}, i = ${i - Mj}. Про следующую пару ничего не известно: и T[${j - Mj}], и P[${i - Mj}] отличаются от P[m − 1 − ${Mj}], но друг с другом могут совпасть. Продолжаем фазу.`,
            snap({ mseg: [j - Mj + 1, j], nseg: [i - Ni + 1, i], jumpP: [i - Mj + 1, i] }));
          for (let q = 0; q < Mj; q++) skip.add(i - q);
          j -= Mj; i -= Mj;
        } else {
          st.kase = '4';
          if (Ni === i + 1) {
            for (let q = 0; q <= i; q++) skip.add(q);
            M[h] = m;
            push([15, 16], `Случай 4: M[${j}] = ${Mj} &gt; N[${i}] = ${Ni}, и N[${i}] = i + 1: весь остаток P[0..${i}] совпадает. Вхождение в позиции ${s}! M[${h}] = m = ${m}.`,
              snap({ mseg: [j - Mj + 1, j], nseg: [0, i], jumpP: [0, i], mset: h, big: true }));
            res = { occ: true };
            break;
          }
          const a = m - 1 - Ni;
          push([15, 17], `Случай 4: M[${j}] = ${Mj} &gt; N[${i}] = ${Ni}. Совпадают ещё ${Ni} символов, а следующая пара заведомо различна: T[${j - Ni}] = P[${a}] = ${C(P[a])} (лежит внутри M-отрезка), но P[${i - Ni}] = ${C(P[i - Ni])} ≠ P[${a}] — иначе N[${i}] было бы больше. Несовпадение в P[${i - Ni}] без сравнения.`,
            snap({ mseg: [j - Mj + 1, j], nseg: Ni ? [i - Ni + 1, i] : null, jumpP: Ni ? [i - Ni + 1, i] : null, predict: [j - Ni, i - Ni] }));
          for (let q = 0; q < Ni; q++) skip.add(i - q);
          j -= Ni; i -= Ni;
          Object.assign(st, { j, i });
          M[h] = h - j;
          push(17, `j = ${j}, i = ${i}. M[${h}] = h − j = ${h - j}, сдвиг по правилам БМ для несовпадения в P[${i}].`, snap({ inferred: i, mset: h, big: true }));
          res = { i, j };
          break;
        }
      }
      let sh, why;
      if (res.occ) {
        occ.push(s);
        sh = A.afterMatch(pre);
        why = `после вхождения сдвиг m − l′[1] = ${sh}`;
      } else {
        const b = A.badChar(pre, P, res.i, T[res.j], true), g = A.goodSuffix(pre, res.i, true);
        sh = Math.max(1, b.shift, g.shift);
        why = `max(1, ППС = ${b.shift}, ПХС = ${g.shift}) = ${sh}`;
      }
      st.kase = '—';
      push(18, `Сдвиг по Бойеру-Муру: ${why}. Новый правый край h = ${h + sh}.`, { s, ok: [...ok], skip: [...skip], ghost: s + sh, done1: true });
      h += sh;
    }
    st.j = st.i = null;
    h = Math.min(h, n - 1);
    const bmc = A.bmCount(T, P);
    push([], `Готово. Вхождения: ${occ.length ? occ.join(', ') : 'нет'}. Апостолико-Джанкарло: ${cmp} сравнений (≤ 2n = ${2 * n}). Бойер-Мур с теми же правилами: ${bmc}. Фаз: ${phases}.`, { done: true, big: true });
    return F;
  }

  function render(f, { T, P }) {
    const n = T.length, m = P.length, s = f.s;
    const cols = Math.max(n, f.ghost != null ? f.ghost + m : 0, s != null ? s + m : 0);
    const inr = (r, k) => r && k >= r[0] && k <= r[1];
    const ok = f.ok || [], skip = f.skip || [];
    const live = !f.done && s != null;
    const rows = [
      { type: 'idx', n },
      { type: 'marks', items: live ? [{ at: f.h, text: 'h', cls: 'm' }, f.j != null && !f.done1 && { at: f.j, text: 'j' }] : [] },
      {
        type: 'chars', label: 'T', chars: T,
        cell: (j) => {
          if (!live) return f.occ.some((o) => j >= o && j < o + m) ? 'ok' : '';
          const i = j - s;
          if (i < 0 || i >= m) return '';
          if (f.cmpAt === i) return (f.eq ? 'ok' : 'bad') + ' focus';
          if (f.predict && f.predict[0] === j) return 'bad focus';
          if (f.inferred === i) return 'bad';
          if (skip.includes(i)) return 'skip';
          if (ok.includes(i)) return 'ok';
          return inr(f.mseg, j) ? 'blk' : '';
        },
      },
      {
        type: 'nums', label: 'M', values: f.M.map((v) => (v == null ? null : v)),
        cell: (j) => (j === f.mset ? 'new' : live && j === f.j && f.M[j] != null && !f.done1 ? 'src' : ''),
      },
      live && f.mseg && { type: 'spans', label: '', items: [{ from: f.mseg[0], to: f.mseg[1], text: 'M-отрезок', cls: 'm' }] },
      live && {
        type: 'chars', label: 'P', start: s, chars: P,
        cell: (i) => {
          if (f.cmpAt === i) return (f.eq ? 'ok' : 'bad') + ' focus';
          if (f.predict && f.predict[1] === i) return 'bad focus';
          if (f.inferred === i) return 'bad';
          if (inr(f.jumpP, i) || skip.includes(i)) return 'skip';
          if (ok.includes(i)) return 'ok';
          return '';
        },
      },
      live && { type: 'nums', label: 'N', start: s, values: f.N, cell: (i) => (!f.done1 && i === f.i ? 'src' : '') },
      live && f.nseg && { type: 'spans', items: [{ from: s + f.nseg[0], to: s + f.nseg[1], text: 'N-отрезок' }] },
      live && f.ghost != null && { type: 'chars', label: 'сдвиг', start: f.ghost, chars: P, cell: () => 'ghost' },
      !live && { type: 'spans', items: f.occ.map((o) => ({ from: o, to: o + m - 1, text: 'вх. ' + o, cls: 'occ' })) },
    ];
    return App.strip(cols, rows);
  }

  App.register({
    id: 'ag', block: 3, num: 16, title: 'Апостолико-Джанкарло',
    full: '16. Алгоритм Апостолико-Джанкарло. Доказательство линейности алгоритма.',
    modes: [{
      id: 'main', label: 'Поиск',
      inputs: [
        { id: 'T', label: 'Текст T', value: 'aabaabababbaababab', max: 44, w: 24 },
        { id: 'P', label: 'Образец P', value: 'abab', max: 14, w: 10 },
      ],
      validate: (v) => (v.P.length > v.T.length ? 'Образец длиннее текста.' : null),
      presets: [
        { label: 'все 4 случая', v: { T: 'aabaabababbaababab', P: 'abab' } },
        { label: 'много перекрытий', v: { T: 'abaabaabaababaabaab', P: 'abaab' } },
        { label: 'aaa…a (худший для БМ)', v: { T: 'aaaaaaaaaaaaaa', P: 'aaaa' } },
        { label: 'обычный', v: { T: 'abacbabcabcabbcabacbcab', P: 'cabcab' } },
      ],
      legend: [['ok', 'сравнили — совпало'], ['bad', 'несовпадение'], ['skip', 'пропущено без сравнений'], ['blk', 'M-отрезок в тексте'], ['src', 'M[j] / N[i], которые сравниваем'], ['new', 'записали M[h]']],
      code: [
        'предподсчёт как в БМ (N, L′, l′, ППС);  M[0..n−1] = не опр.',
        'h = m − 1',
        'while h < n:',
        '  j = h;  i = m − 1;  повторяем:',
        '    if M[j] не опр. or M[j] = N[i] = 0:          // случай 1',
        '      сравниваем T[j] и P[i]',
        '      совпали и i = 0: вхождение, M[h] = m, конец фазы',
        '      совпали: j = j − 1;  i = i − 1',
        '      не совпали: M[h] = h − j, конец фазы',
        '    else if M[j] < N[i]:                         // случай 2',
        '      j = j − M[j];  i = i − M[j]',
        '      T[j] ≠ P[i] (гарантированно): M[h] = h − j, конец',
        '    else if M[j] = N[i]:                         // случай 3',
        '      N[i] = i + 1: вхождение, M[h] = m, конец фазы',
        '      иначе j = j − M[j];  i = i − M[j], продолжаем',
        '    else:                                        // случай 4: M[j] > N[i]',
        '      N[i] = i + 1: вхождение, M[h] = m, конец фазы',
        '      иначе j = j − N[i];  i = i − N[i];  M[h] = h − j, конец',
        '  h = h + сдвиг по БМ',
      ],
      run, render,
    }],
    theory: `
<p>Алгоритм Апостолико-Джанкарло — усовершенствование (вариация) алгоритма Бойера-Мура: <b>сначала прочитай про БМ</b>. Образец так же прикладывается слева направо и сравнивается справа налево, сдвиги те же. Разница в том, что алгоритм помнит, какие символы текста уже совпадали в прошлых фазах, и не сравнивает их повторно. Благодаря этому он линеен в худшем случае даже при множестве вхождений.</p>

<h3>Предподсчёт и обозначения</h3>
<div class="def"><b>N[i]</b> — длина наибольшего суффикса P[0..i], совпадающего с суффиксом P (как в БМ, через Z-функцию перевёрнутого образца).</div>
<div class="def"><b>M</b> — дополнительный массив длины текста; изначально заполнен нулями или неопределён (например, None в Python). M[h] хранит количество символов, которые совпали в фазе, где правый край образца стоял в позиции h: T[h − M[h] + 1..h] совпадает с суффиксом P длины M[h].</div>
<p>Фаза: прикладываем образец с правым краем в h и идём справа налево, сравнивая j-й элемент текста T<sub>j</sub> с i-м элементом паттерна P<sub>i</sub>. Но прежде чем сравнивать, делаем дополнительную проверку M<sub>j</sub>. Есть четыре случая.</p>

<h3>Четыре случая</h3>
<ol>
<li><b>M<sub>j</sub> не определено или M<sub>j</sub> = N<sub>i</sub> = 0.</b> Информации нет — сравниваем T<sub>j</sub> и P<sub>i</sub>.
  <ul><li>Не равны: делаем сдвиг, как в БМ, и записываем M<sub>h</sub> = h − j — столько символов совпало.</li>
  <li>Равны: идём дальше (j−−, i−−); если это конец паттерна — отмечаем вхождение и записываем M<sub>h</sub> = m.</li></ul></li>
<li><b>M<sub>j</sub> &lt; N<sub>i</sub>.</b> Пропускаем M<sub>j</sub> символов: j −= M<sub>j</sub>, i −= M<sub>j</sub>, и продолжаем сравнение.
  <br><span class="note">Почему можно: T[j − M<sub>j</sub> + 1..j] равно суффиксу P длины M<sub>j</sub>, а так как M<sub>j</sub> &lt; N<sub>i</sub>, этот же суффикс заканчивает и P[0..i]. Следующее сравнение обязательно даст несовпадение: T[j − M<sub>j</sub>] ≠ P[m − 1 − M<sub>j</sub>] по определению M, а P[i − M<sub>j</sub>] = P[m − 1 − M<sub>j</sub>] по определению N.</span></li>
<li><b>M<sub>j</sub> = N<sub>i</sub>.</b>
  <ul><li>Если N<sub>i</sub> = i (в 0-индексации N[i] = i + 1) — это вхождение, M<sub>h</sub> = h − j + N<sub>i</sub> = m.</li>
  <li>Иначе пропускаем M<sub>j</sub> символов (j −= M<sub>j</sub>, i −= M<sub>j</sub>) и продолжаем сравнение. Про следующую пару ничего не известно: оба символа отличаются от P[m − 1 − M<sub>j</sub>], но между собой могут совпасть.</li></ul></li>
<li><b>M<sub>j</sub> &gt; N<sub>i</sub>.</b>
  <ul><li>Если N<sub>i</sub> = i (весь остаток паттерна совпадает) — вхождение, как в случае 3.</li>
  <li>Если N<sub>i</sub> &lt; i — совпадают ещё N<sub>i</sub> символов, а следующая пара гарантированно различна: T[j − N<sub>i</sub>] = P[m − 1 − N<sub>i</sub>] (внутри M-отрезка), но P[i − N<sub>i</sub>] ≠ P[m − 1 − N<sub>i</sub>] (иначе N<sub>i</sub> было бы больше). Делаем сдвиг по правилам БМ и записываем M<sub>h</sub> = h − j (j — позиция несовпадения).</li></ul></li>
</ol>

<h3>Теорема линейности</h3>
<div class="thm"><b>Теорема.</b> Алгоритм Апостолико-Джанкарло находит все вхождения P в T, выполняя не более 2n сравнений символов и O(n + m) остальной работы.</div>
<div class="proof">
<p><b>Несовпадения.</b> Каждая фаза заканчивается не более чем одним несовпадением (найденным сравнением или выведенным в случаях 2 и 4), а фаз не больше n: правый край образца каждый раз сдвигается хотя бы на 1. Значит, несовпадений ≤ n.</p>
<p><b>Совпадения.</b> Пусть в фазе с правым краем h символ T[j] совпал при сравнении. В конце фазы M[h] ≥ h − j + 1, то есть позиция j лежит внутри отрезка [h − M[h] + 1, h]. В следующих фазах, двигаясь справа налево, алгоритм доходит до h и по значению M[h] либо перепрыгивает весь этот отрезок (случай 3), либо заканчивает фазу без сравнений внутри него (случаи 2, 4 и вхождение). Поэтому каждый символ текста участвует в удачном сравнении не больше одного раза: совпадений ≤ n.</p>
<p><b>Прочая работа.</b> Каждое обращение к M либо заканчивает фазу (не больше одного на фазу), либо пропускает отрезок, и фаза продолжается (случай 3). Пропущенный отрезок оказывается внутри нового отрезка M[h], поэтому повторно его уже не просматривают — всего таких прыжков O(n). Сдвиги по БМ — O(1) на фазу после предподсчёта за O(m).</p>
<p>Итого ≤ 2n сравнений и O(n + m) времени.</p>
</div>
<p class="note">В симуляции итоговый шаг показывает число сравнений АД и обычного БМ на тех же данных. На примере «aaa…a» БМ делает Θ(nm) сравнений, а АД — меньше 2n.</p>`,
  });
})(window.App);
