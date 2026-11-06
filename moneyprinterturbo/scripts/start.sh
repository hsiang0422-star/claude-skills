#!/bin/bash
# 啟動 MoneyPrinterTurbo 網頁介面（預設埠 8501）
PORT="${1:-8501}"
MPT="$HOME/MoneyPrinterTurbo/.venv/bin/mpt"
if [ ! -x "$MPT" ]; then
  echo "尚未安裝，請先執行 install.sh" >&2
  exit 1
fi
cd "$HOME"
exec "$MPT" webui --port "$PORT" --headless
