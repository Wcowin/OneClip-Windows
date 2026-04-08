param(
  [switch]$SkipBundle
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

Write-Step "检查工具链"
node --version
npm --version
rustc --version
cargo --version

Write-Step "安装依赖"
npm install

Write-Step "前端构建检查"
npm run build

Write-Step "Rust 编译检查"
Push-Location src-tauri
cargo check
Pop-Location

Write-Step "检查 Updater 公钥配置"
$tauriConf = Get-Content -Raw -Path (Join-Path $PSScriptRoot "..\src-tauri\tauri.conf.json")
if ($tauriConf -match "REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY") {
  throw "tauri.conf.json 中 updater.pubkey 仍是占位符，请先替换为真实公钥。"
}

if (-not $SkipBundle) {
  Write-Step "打包安装程序 (MSI + NSIS)"
  npm run tauri:build
}

Write-Step "输出安装包路径"
$bundleRoot = Join-Path $PSScriptRoot "..\src-tauri\target\release\bundle"
if (Test-Path $bundleRoot) {
  Get-ChildItem -Path $bundleRoot -Recurse -File | ForEach-Object {
    $_.FullName
  }
} else {
  Write-Warning "未找到 bundle 目录: $bundleRoot"
}

Write-Host ""
Write-Host "Smoke 检查完成。" -ForegroundColor Green
