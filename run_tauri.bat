@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" arm64_x64
cd /d "C:\Users\wangkewen\Desktop\OneClipProMax\OneClip-Windows"
set CARGO_BUILD_TARGET=x86_64-pc-windows-msvc
npm run tauri dev
