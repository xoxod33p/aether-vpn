@echo off
setlocal enabledelayedexpansion

title AetherVPN Build Tool

echo ======================================================================
echo                     AetherVPN Build System
echo ======================================================================
echo.

:: Detect build mode
set "BUILD_MODE=installer"
if /i "%~1"=="portable" set "BUILD_MODE=portable"
if /i "%~1"=="test" set "BUILD_MODE=test"
if /i "%~1"=="dev" set "BUILD_MODE=dev"
if /i "%~1"=="clean" set "BUILD_MODE=clean"
if /i "%~1"=="help" goto :show_help
if /i "%~1"=="-h" goto :show_help
if /i "%~1"=="--help" goto :show_help

:: 1. Verify Prerequisites
echo [*] Checking build dependencies...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js from https://nodejs.org
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not found in PATH.
    exit /b 1
)

where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Rust / Cargo is not found in PATH. Please install Rust from https://rustup.rs
    exit /b 1
)

echo [OK] Node.js, npm, and Rust Cargo detected.
echo.

:: Handle clean
if "%BUILD_MODE%"=="clean" (
    echo [*] Cleaning build artifacts...
    if exist "dist" rmdir /s /q "dist"
    if exist "installer" rmdir /s /q "installer"
    cargo clean --manifest-path src-tauri/Cargo.toml
    echo [OK] Clean completed.
    exit /b 0
)

:: 2. Ensure node_modules installed
if not exist "node_modules\" (
    echo [*] Installing npm dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed.
        exit /b %ERRORLEVEL%
    )
)

:: 3. Verify sing-box core binary exists
if not exist "src-tauri\bin\sing-box.exe" (
    echo [WARNING] src-tauri\bin\sing-box.exe not found!
    if exist "bin\sing-box.exe" (
        echo [*] Copying bin\sing-box.exe to src-tauri\bin\sing-box.exe...
        if not exist "src-tauri\bin\" mkdir "src-tauri\bin"
        copy /y "bin\sing-box.exe" "src-tauri\bin\sing-box.exe" >nul
    ) else (
        echo [ERROR] sing-box.exe not found in either bin\ or src-tauri\bin\.
        echo Please ensure sing-box.exe is placed into src-tauri\bin\ before building.
        exit /b 1
    )
)

:: Ensure bin\sing-box.exe is synced
if not exist "bin\" mkdir "bin"
if not exist "bin\sing-box.exe" (
    copy /y "src-tauri\bin\sing-box.exe" "bin\sing-box.exe" >nul
)

:: Handle test mode
if "%BUILD_MODE%"=="test" (
    echo [*] Running automated test suite...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Frontend build/type-check failed.
        exit /b %ERRORLEVEL%
    )
    cargo test --lib --manifest-path src-tauri/Cargo.toml
    exit /b %ERRORLEVEL%
)

:: Handle dev mode
if "%BUILD_MODE%"=="dev" (
    echo [*] Starting AetherVPN development mode...
    npx tauri dev
    exit /b %ERRORLEVEL%
)

:: Handle portable mode
if "%BUILD_MODE%"=="portable" (
    echo [*] Building standalone portable binary with Tauri...
    call npx tauri build --no-bundle
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Tauri build failed.
        exit /b !ERRORLEVEL!
    )

    if not exist "installer\" mkdir "installer"
    taskkill /f /im aether-vpn-portable.exe >nul 2>nul
    taskkill /f /im aether-vpn.exe >nul 2>nul
    ping 127.0.0.1 -n 2 >nul
    copy /y "src-tauri\target\release\aether-vpn.exe" "installer\aether-vpn-portable.exe" >nul
    if exist "bin\sing-box.exe" (
        copy /y "bin\sing-box.exe" "installer\sing-box.exe" >nul
    )

    echo.
    echo ======================================================================
    echo [SUCCESS] Portable executable generated:
    echo     installer\aether-vpn-portable.exe
    echo     installer\sing-box.exe
    echo ======================================================================
    exit /b 0
)

:: Handle default installer mode
echo [*] Building full Tauri application & NSIS setup installer...
call npx tauri build
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Tauri build failed.
    exit /b !ERRORLEVEL!
)

:: Copy artifacts to installer/ directory
if not exist "installer\" mkdir "installer"
taskkill /f /im aether-vpn-portable.exe >nul 2>nul
taskkill /f /im aether-vpn.exe >nul 2>nul
ping 127.0.0.1 -n 2 >nul
if exist "src-tauri\target\release\bundle\nsis\AetherVPN_0.1.0_x64-setup.exe" (
    copy /y "src-tauri\target\release\bundle\nsis\AetherVPN_0.1.0_x64-setup.exe" "installer\AetherVPN_0.1.0_x64-setup.exe" >nul
)
if exist "src-tauri\target\release\aether-vpn.exe" (
    copy /y "src-tauri\target\release\aether-vpn.exe" "installer\aether-vpn-portable.exe" >nul
)
if exist "bin\sing-box.exe" (
    copy /y "bin\sing-box.exe" "installer\sing-box.exe" >nul
)

echo.
echo ======================================================================
echo [SUCCESS] Build completed successfully!
echo.
echo Deliverables created in installer\ directory:
echo   1. Windows Setup Installer:
echo      installer\AetherVPN_0.1.0_x64-setup.exe
echo.
echo   2. Standalone Portable Binary:
echo      installer\aether-vpn-portable.exe
echo ======================================================================
echo.
exit /b 0

:show_help
echo Usage: build.cmd [command]
echo.
echo Commands:
echo   (none)       Build complete NSIS setup installer and portable binary (Default)
echo   portable     Build standalone release binary only (fast, skips NSIS packaging)
echo   test         Run frontend type-checking and automated Rust test suite
echo   dev          Start application in hot-reloading development mode
echo   clean        Clean all build artifacts (dist\, target\, installer\)
echo   help         Display this help message
echo.
exit /b 0
