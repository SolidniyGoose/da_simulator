/* Обновления.
   • На GitHub Pages регистрируем service worker (sw.js): онлайн всегда свежая версия, офлайн — последняя сохранённая.
   • В локальной копии (file:// или localhost) сверяем версию с GitHub и показываем плашку, если вышла новая. */
(function () {
  'use strict';
  const B = (window.App && window.App.BUILD) || {};
  const onPages = /\.github\.io$/i.test(location.hostname);

  if (onPages && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* без офлайн-режима всё работает */ });
    return;
  }
  const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!local || !B.repo || /^OWNER\//.test(B.repo)) return;

  const cmp = (a, b) => {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  };
  const url = `https://raw.githubusercontent.com/${B.repo}/${B.branch || 'main'}/js/version.js?t=${Date.now()}`;
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 6000);
  fetch(url, { cache: 'no-store', signal: ctrl.signal })
    .then((r) => (r.ok ? r.text() : ''))
    .then((txt) => {
      const m = /version:\s*'([\d.]+)'/.exec(txt);
      if (!m || cmp(m[1], B.version) <= 0) return;
      const bar = document.createElement('div');
      bar.className = 'upd-bar';
      bar.setAttribute('role', 'status');
      bar.innerHTML = `<span>Вышла новая версия симулятора (${m[1]}, у тебя ${B.version}). Закрой страницу и запусти <b>start.bat</b> (на Mac/Linux — <b>start.sh</b>) — обновление скачается само.</span><button type="button" aria-label="Скрыть">✕</button>`;
      bar.querySelector('button').onclick = () => bar.remove();
      document.body.prepend(bar);
    })
    .catch(() => { /* нет сети — молча работаем с текущей версией */ });
})();
