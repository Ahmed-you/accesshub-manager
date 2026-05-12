@echo off
cd /d C:\Users\JoyBoy\Documents\Codex\2026-04-22-hello\accesshub-manager
"C:\Program Files\nodejs\node.exe" ".\node_modules\vite\bin\vite.js" --host 127.0.0.1 > "storage\logs\vite-dev.log" 2> "storage\logs\vite-dev-error.log"
