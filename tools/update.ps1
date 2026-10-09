# Обновление локальной копии симулятора с GitHub.
# Если папка — git-клон и Git установлен: git pull. Иначе сравниваем версию с GitHub
# и при необходимости скачиваем архив ветки и распаковываем поверх. Ошибки не мешают запуску.
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$root = Split-Path -Parent $PSScriptRoot

function Read-Build([string]$text) {
    $v = [regex]::Match($text, "version:\s*'([\d.]+)'").Groups[1].Value
    $r = [regex]::Match($text, "repo:\s*'([^']+)'").Groups[1].Value
    $b = [regex]::Match($text, "branch:\s*'([^']+)'").Groups[1].Value
    if (-not $b) { $b = 'main' }
    return @{ version = $v; repo = $r; branch = $b }
}

try {
    $local = Read-Build ([IO.File]::ReadAllText((Join-Path $root 'js\version.js')))
    Write-Host "Симулятор, версия $($local.version)"
    if (-not $local.repo -or $local.repo -like 'OWNER/*') {
        Write-Host 'Адрес репозитория не задан в js\version.js — проверка обновлений пропущена.'
        exit 0
    }

    $git = Get-Command git -ErrorAction SilentlyContinue
    if ((Test-Path (Join-Path $root '.git')) -and $git) {
        Write-Host 'Обновляюсь через git pull...'
        & git -C $root pull --ff-only
        exit 0
    }

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $raw = "https://raw.githubusercontent.com/$($local.repo)/$($local.branch)/js/version.js?t=$([DateTime]::UtcNow.Ticks)"
    $remote = Read-Build (Invoke-WebRequest -Uri $raw -UseBasicParsing -TimeoutSec 10).Content
    if (-not $remote.version -or [version]$remote.version -le [version]$local.version) {
        Write-Host 'Обновлений нет.'
        exit 0
    }

    Write-Host "Доступна версия $($remote.version) — скачиваю..."
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('da_sim_' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    $zip = Join-Path $tmp 'src.zip'
    Invoke-WebRequest -Uri "https://codeload.github.com/$($local.repo)/zip/refs/heads/$($local.branch)" -OutFile $zip -UseBasicParsing -TimeoutSec 60
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $src = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1
    Copy-Item -Path (Join-Path $src.FullName '*') -Destination $root -Recurse -Force
    Get-ChildItem -Path $root -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
    Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Готово: обновлено до версии $($remote.version)."
}
catch {
    Write-Host "Не удалось проверить обновления ($($_.Exception.Message)). Запускаю текущую версию."
}
exit 0
