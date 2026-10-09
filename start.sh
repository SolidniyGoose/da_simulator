#!/usr/bin/env bash
# Запуск симулятора на Mac/Linux: проверка обновлений на GitHub, затем открытие index.html.
# git-клон → git pull; иначе сравниваем версию и скачиваем архив ветки (нужны curl и unzip).
cd "$(dirname "$0")" || exit 1
ROOT="$(pwd)"

field() { sed -n "s/.*$1:[[:space:]]*'\([^']*\)'.*/\1/p" | head -n1; }
LOCAL=$(field version < js/version.js)
REPO=$(field repo < js/version.js)
BRANCH=$(field branch < js/version.js); BRANCH=${BRANCH:-main}
echo "Симулятор, версия $LOCAL"

update() {
  case "$REPO" in ''|OWNER/*) echo "Адрес репозитория не задан в js/version.js — проверка обновлений пропущена."; return ;; esac
  if [ -d .git ] && command -v git >/dev/null 2>&1; then
    echo "Обновляюсь через git pull..."; git pull --ff-only; return
  fi
  command -v curl >/dev/null 2>&1 && command -v unzip >/dev/null 2>&1 || { echo "Нет curl или unzip — пропускаю обновление."; return; }
  REMOTE=$(curl -fsSL --max-time 10 "https://raw.githubusercontent.com/$REPO/$BRANCH/js/version.js?t=$(date +%s)" 2>/dev/null | field version)
  [ -n "$REMOTE" ] || { echo "Не удалось проверить обновления — запускаю текущую версию."; return; }
  NEWEST=$(printf '%s\n%s\n' "$LOCAL" "$REMOTE" | sort -V | tail -n1)
  if [ "$REMOTE" = "$LOCAL" ] || [ "$NEWEST" = "$LOCAL" ]; then echo "Обновлений нет."; return; fi
  echo "Доступна версия $REMOTE — скачиваю..."
  TMP=$(mktemp -d)
  if curl -fsSL --max-time 60 -o "$TMP/src.zip" "https://codeload.github.com/$REPO/zip/refs/heads/$BRANCH" && unzip -q "$TMP/src.zip" -d "$TMP"; then
    SRC=$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n1)
    cp -R "$SRC"/. "$ROOT"/ && echo "Готово: обновлено до версии $REMOTE."
  else
    echo "Не удалось скачать обновление — запускаю текущую версию."
  fi
  rm -rf "$TMP"
}
update

if command -v open >/dev/null 2>&1; then open "$ROOT/index.html"
elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$ROOT/index.html" >/dev/null 2>&1 &
else echo "Открой в браузере: $ROOT/index.html"; fi
