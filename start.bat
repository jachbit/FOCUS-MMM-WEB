@echo off
title F.O.C.U.S. MMM Options Cone Simulator - Jachbit 2026
rem Local preview on port 8136 (static page, no credentials). Close this window to stop it.
cd /d "%~dp0"
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8136"
python -m http.server 8136
