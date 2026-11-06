# 安裝或更新 MoneyPrinterTurbo（官方套件 mpt）到 %USERPROFILE%\MoneyPrinterTurbo\.venv
# 用法：powershell -ExecutionPolicy Bypass -File install.ps1 [-Upgrade]
param([switch]$Upgrade)
$ErrorActionPreference = "Stop"
$HomeDir = Join-Path $env:USERPROFILE "MoneyPrinterTurbo"
$Venv = Join-Path $HomeDir ".venv"
$VenvPy = Join-Path $Venv "Scripts\python.exe"

if ($Upgrade -and (Test-Path $VenvPy)) {
  & $VenvPy -m pip install --upgrade mpt
  exit 0
}

$Py = $null
foreach ($v in @("3.13", "3.12", "3.11")) {
  try { & py "-$v" --version *> $null; if ($LASTEXITCODE -eq 0) { $Py = @("py", "-$v"); break } } catch {}
}
if (-not $Py) {
  Write-Error "找不到 Python 3.11–3.13。請先從 https://www.python.org/downloads/ 安裝 Python 3.13（勾選 Add to PATH）後再執行。"
  exit 1
}

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null
if (-not (Test-Path $VenvPy)) { & $Py[0] $Py[1] -m venv $Venv }
& $VenvPy -m pip install -q --upgrade pip
& $VenvPy -m pip install --upgrade mpt

$Launcher = Join-Path $HomeDir "啟動MoneyPrinterTurbo.bat"
@"
@echo off
cd /d %USERPROFILE%
start "" cmd /c "timeout /t 8 >nul & start http://127.0.0.1:8501"
"%USERPROFILE%\MoneyPrinterTurbo\.venv\Scripts\mpt.exe" webui --port 8501 --headless
"@ | Set-Content -Path $Launcher -Encoding Default

Write-Host "安裝完成。啟動檔：$Launcher"
