@echo off
REM 双击启动天命 dev mode·直接读 Desktop/tianming/web 源码·改了 Ctrl+R 立即生效
REM 不影响 installed .exe·两者可并存运行
cd /d "%~dp0"
echo [dev-start] webRoot = %CD%\web
echo [dev-start] 改源码后窗口里按 Ctrl+R reload
echo.
call npx electron . %*
