@echo off
echo Cleaning Android build cache...

REM Stop any running Gradle daemons
call gradlew.bat --stop

REM Clean build directories
call gradlew.bat clean

REM Remove build cache
if exist "app\build" rmdir /s /q "app\build"
if exist "build" rmdir /s /q "build"
if exist "app\.cxx" rmdir /s /q "app\.cxx"

REM Remove lint cache
if exist "app\build\intermediates\lint-cache" rmdir /s /q "app\build\intermediates\lint-cache"

echo Build cache cleaned successfully!
pause





