# Выпуск новой версии: повышает номер в js/version.js, коммитит все изменения и отправляет на GitHub.
# Запуск из папки проекта:  powershell -ExecutionPolicy Bypass -File tools\release.ps1 "что изменилось"
param([string]$Message = 'Обновление симулятора')
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root '.git'))) {
    Write-Host 'Папка проекта не git-репозиторий — сначала выполни шаги из README (git init, git remote add).'
    exit 1
}
$file = Join-Path $root 'js\version.js'
$text = [IO.File]::ReadAllText($file)
$old = [regex]::Match($text, "version:\s*'([\d.]+)'").Groups[1].Value
$d = Get-Date
$prefix = '{0}.{1}.{2}' -f $d.Year, $d.Month, $d.Day
$n = 1
if ($old -match ('^' + [regex]::Escape($prefix) + '\.(\d+)$')) { $n = [int]$Matches[1] + 1 }
$new = "$prefix.$n"
$text = [regex]::Replace($text, "version:\s*'[\d.]+'", "version: '$new'")
[IO.File]::WriteAllText($file, $text, (New-Object Text.UTF8Encoding $false))
Write-Host "Версия: $old -> $new"
git -C $root add -A
git -C $root commit -m "$Message (v$new)"
git -C $root push
Write-Host 'Отправлено. GitHub Pages обновится примерно через минуту; локальные копии подтянут версию при следующем запуске start.bat / start.sh.'
