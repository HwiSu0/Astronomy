@echo off
cd /d "%~dp0"

set "PYEXE="

rem 1) Windows py launcher (most reliable)
py -3 --version >nul 2>&1
if not errorlevel 1 set "PYEXE=py -3"
if defined PYEXE goto :found

rem 2) python on PATH (can be a non-functional Microsoft Store stub on some PCs)
python --version >nul 2>&1
if not errorlevel 1 set "PYEXE=python"
if defined PYEXE goto :found

rem 3) python3 on PATH
python3 --version >nul 2>&1
if not errorlevel 1 set "PYEXE=python3"
if defined PYEXE goto :found

rem 4) common install locations
if exist "%LocalAppData%\Python\bin\python.exe" set "PYEXE=%LocalAppData%\Python\bin\python.exe"
if defined PYEXE goto :found

if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python313\python.exe"
if defined PYEXE goto :found

if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python312\python.exe"
if defined PYEXE goto :found

if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python311\python.exe"
if defined PYEXE goto :found

if exist "%LocalAppData%\Programs\Python\Python310\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python310\python.exe"
if defined PYEXE goto :found

if exist "%LocalAppData%\Programs\Python\Python39\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python39\python.exe"
if defined PYEXE goto :found

if exist "C:\Python313\python.exe" set "PYEXE=C:\Python313\python.exe"
if defined PYEXE goto :found

if exist "C:\Python312\python.exe" set "PYEXE=C:\Python312\python.exe"
if defined PYEXE goto :found

if exist "C:\Python311\python.exe" set "PYEXE=C:\Python311\python.exe"
if defined PYEXE goto :found

chcp 65001 > nul
echo Python을 찾을 수 없습니다.
echo https://www.python.org/downloads/ 에서 Python을 설치한 뒤 다시 실행해주세요.
echo (설치 시 "Add python.exe to PATH" 옵션을 체크하세요)
pause
exit /b 1

:found
chcp 65001 > nul
echo Astronomy Lab 로컬 서버를 시작합니다: http://localhost:8000
echo 끝내려면 이 창을 닫으세요.
start "" http://localhost:8000
%PYEXE% -m http.server 8000
