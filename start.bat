@echo off
rem Simulator launcher: checks GitHub for updates, then opens index.html
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\update.ps1"
start "" "%~dp0index.html"
