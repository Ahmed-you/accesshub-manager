$root = 'C:\Users\JoyBoy\Documents\Codex\2026-04-22-hello\accesshub-manager'
$php = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe'
$log = Join-Path $root 'storage\logs\windows-scheduler.log'
$errorLog = Join-Path $root 'storage\logs\windows-scheduler-error.log'

Set-Location $root
Add-Content -Path $log -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] AccessHub scheduler tick"
& $php artisan schedule:run *>> $log 2>> $errorLog
