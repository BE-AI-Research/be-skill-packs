@echo off
if defined SHLINT ( "%SHLINT%" %* & exit /b %errorlevel% )
if exist "%USERPROFILE%\.be-code\bin\shlint.exe" ( "%USERPROFILE%\.be-code\bin\shlint.exe" %* & exit /b %errorlevel% )
where shlint >nul 2>nul && ( shlint %* & exit /b %errorlevel% )
echo {"file":"","code":"PACK-TOOLMISSING","severity":"error","message":"shlint not found","signature":"PACK-TOOLMISSING:shlint"}
exit /b 1
