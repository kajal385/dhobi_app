@echo off
title DhobiPro PHP Admin Panel
echo ===================================================
echo           Starting DhobiPro PHP Admin Panel
echo ===================================================
echo.
echo Admin Panel URL: http://127.0.0.1:8080
echo.
echo Make sure your Laravel backend is running at:
echo http://127.0.0.1:8000
echo.
echo Starting server... Press Ctrl+C to stop.
echo ===================================================

:: Open browser with clean URL after server initializes
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:8080/auth/login.php"

php -S 127.0.0.1:8080 -t "%~dp0"
pause
