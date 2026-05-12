@echo off
cd /d C:\Users\JoyBoy\Documents\Codex\2026-04-22-hello\accesshub-manager
"C:\Users\JoyBoy\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe" -d max_execution_time=0 artisan serve --host=127.0.0.1 --port=8020 --no-reload > "storage\logs\artisan-serve-8020.log" 2> "storage\logs\artisan-serve-8020-error.log"
