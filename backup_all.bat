@echo off
title F.O.C.U.S. MMM Web - backup
rem Timestamped copies of the project files into backups\ (run before every edit session).
cd /d "%~dp0"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
if not exist backups mkdir backups
copy "index.html"     "backups\index_%TS%.html" >nul && echo   [OK] index.html
copy "mmm-math.js"    "backups\mmm-math_%TS%.js" >nul && echo   [OK] mmm-math.js
copy "README.md"      "backups\README_%TS%.md" >nul && echo   [OK] README.md
copy "CLAUDE.md"      "backups\CLAUDE_%TS%.md" >nul && echo   [OK] CLAUDE.md
copy "start.bat"      "backups\start_%TS%.bat" >nul && echo   [OK] start.bat
copy "cf-worker-mmm.js" "backups\cf-worker-mmm_%TS%.js" >nul && echo   [OK] cf-worker-mmm.js
copy "generate_web_guide.py" "backups\generate_web_guide_%TS%.py" >nul && echo   [OK] generate_web_guide.py
echo.
echo Backup done: backups\*_%TS%.*
