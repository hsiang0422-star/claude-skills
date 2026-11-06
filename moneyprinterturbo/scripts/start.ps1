# 啟動 MoneyPrinterTurbo 網頁介面（預設埠 8501）
param([int]$Port = 8501)
$Mpt = Join-Path $env:USERPROFILE "MoneyPrinterTurbo\.venv\Scripts\mpt.exe"
if (-not (Test-Path $Mpt)) { Write-Error "尚未安裝，請先執行 install.ps1"; exit 1 }
Set-Location $env:USERPROFILE
& $Mpt webui --port $Port --headless
