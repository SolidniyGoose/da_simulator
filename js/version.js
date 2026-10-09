/* Версия сборки — единственное место, где она задаётся.
   repo — «логин/репозиторий» на GitHub, branch — ветка, из которой берутся обновления.
   Версию повышает tools/release.ps1 (формат год.месяц.день.номер). */
(function (G) {
  (G.App = G.App || {}).BUILD = { version: '2026.10.9.1', repo: 'SolidniyGoose/da_simulator', branch: 'main' };
})(typeof window !== 'undefined' ? window : globalThis);
