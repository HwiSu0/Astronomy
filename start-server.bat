@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo Astronomy Lab 로컬 서버를 시작합니다: http://localhost:8000
echo 끝내려면 이 창을 닫으세요.
start "" http://localhost:8000
python -m http.server 8000
