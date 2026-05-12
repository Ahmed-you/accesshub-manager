@echo off
set "ROOT=C:\Users\JoyBoy\Documents\Codex\2026-04-22-hello\accesshub-manager"
set "PHP=%LOCALAPPDATA%\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe"

cd /d "%ROOT%"
echo [%date% %time%] AccessHub scheduler tick >> "%ROOT%\storage\logs\windows-scheduler.log"
"%PHP%" artisan schedule:run >> "%ROOT%\storage\logs\windows-scheduler.log" 2>> "%ROOT%\storage\logs\windows-scheduler-error.log"
