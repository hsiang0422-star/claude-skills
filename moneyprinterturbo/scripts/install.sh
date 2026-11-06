#!/bin/bash
# 安裝或更新 MoneyPrinterTurbo（官方套件 mpt）到 ~/MoneyPrinterTurbo/.venv
# 用法：install.sh [--upgrade]
set -e
HOME_DIR="$HOME/MoneyPrinterTurbo"
VENV="$HOME_DIR/.venv"

if [ "$1" = "--upgrade" ] && [ -x "$VENV/bin/python" ]; then
  "$VENV/bin/python" -m pip install --upgrade mpt
  "$VENV/bin/python" -m pip show mpt | grep -i '^version'
  exit 0
fi

PY=""
for c in python3.13 python3.12 python3.11 "$HOME/.local/bin/python3.13" python3; do
  if command -v "$c" >/dev/null 2>&1; then
    v=$("$c" -c 'import sys;print(f"{sys.version_info[0]}.{sys.version_info[1]}")')
    case "$v" in 3.11|3.12|3.13) PY="$c"; break;; esac
  fi
done

if [ -z "$PY" ]; then
  echo "找不到 Python 3.11–3.13。請先安裝 Python 3.13：https://www.python.org/downloads/ （或 brew install python@3.13）後再執行本腳本。" >&2
  exit 1
fi
echo "使用 $PY ($("$PY" --version))"

mkdir -p "$HOME_DIR"
[ -x "$VENV/bin/python" ] || "$PY" -m venv "$VENV"
"$VENV/bin/python" -m pip install -q --upgrade pip
"$VENV/bin/python" -m pip install --upgrade mpt

LAUNCHER="$HOME_DIR/啟動MoneyPrinterTurbo.command"
cat > "$LAUNCHER" <<'EOF'
#!/bin/zsh
cd ~
(sleep 8; open http://127.0.0.1:8501) &
~/MoneyPrinterTurbo/.venv/bin/mpt webui --port 8501 --headless
EOF
chmod +x "$LAUNCHER"

echo "安裝完成：$("$VENV/bin/python" -m pip show mpt | grep -i '^version')"
echo "啟動檔：$LAUNCHER"
