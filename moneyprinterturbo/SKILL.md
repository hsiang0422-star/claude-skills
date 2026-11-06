---
name: moneyprinterturbo
description: 安裝、啟動、更新 MoneyPrinterTurbo（harry0703/MoneyPrinterTurbo，一鍵生成短影音：給主題自動寫腳本、配素材、配音、上字幕）。當使用者說「安裝/開啟/更新 MoneyPrinterTurbo」「一鍵生成短影音」「幫我做短影片」時使用。
---

# MoneyPrinterTurbo 安裝與使用

MoneyPrinterTurbo 是開源（MIT）的 AI 短影音產生器：輸入主題 → 自動產生腳本、抓素材、配音、字幕、配樂並剪成影片。官方套件名稱為 `mpt`（PyPI 上叫 `MoneyPrinterTurbo` 的是第三方套件，不要裝）。

## 安裝位置慣例

- 程式：`~/MoneyPrinterTurbo/.venv`（獨立虛擬環境，不影響系統 Python）
- 設定檔（首次啟動自動建立）：
  - macOS：`~/Library/Application Support/MoneyPrinterTurbo/config.toml`
  - Windows：`%LOCALAPPDATA%\MoneyPrinterTurbo\config.toml`
- 網頁介面：http://127.0.0.1:8501

## 步驟

1. **先確認是否已安裝**：檢查 `~/MoneyPrinterTurbo/.venv/bin/mpt`（Windows：`%USERPROFILE%\MoneyPrinterTurbo\.venv\Scripts\mpt.exe`）。已存在就跳到第 3 步。
2. **安裝**（需要 Python 3.11–3.13；3.14 以上太新，部分套件不支援）：
   - macOS / Linux：執行本 skill 目錄下的 `scripts/install.sh`
   - Windows：用 PowerShell 執行 `scripts/install.ps1`
   - 腳本會自動找 3.11–3.13 的 Python；找不到時會停下並提示安裝方式。不要自行改用 3.14+。
   - 腳本也會在 `~/MoneyPrinterTurbo` 建立雙擊啟動檔。
3. **啟動**：在背景執行 `scripts/start.sh`（Windows：`scripts/start.ps1`），等 http://127.0.0.1:8501 回應 200 後再打開瀏覽器。首次載入需 10–20 秒，畫面空白屬正常，稍等即可。
4. **更新**：執行 `install.sh --upgrade`（Windows：`install.ps1 -Upgrade`），會把 `mpt` 升級到最新版。

## 首次使用要告訴使用者的事

- 介面右上角「设置」：選一家大模型（Claude、OpenAI、Gemini、DeepSeek…）並填入 API Key，按測試連線。
- 素材來源 Pexels 需要免費 API Key：https://www.pexels.com/api/
- 配音預設 Edge TTS，免費、不需金鑰；可選台灣中文聲音（zh-TW）。
- 介面是簡體中文。
- API Key 由使用者自己在介面輸入；Claude 不代填金鑰。

## 疑難排解

- `mpt` 找不到：重新執行安裝腳本。
- 埠 8501 被占用：改用 `mpt webui --port 8503 --headless`。
- 背景服務會在 Claude 對話結束時停止；之後請使用者雙擊 `~/MoneyPrinterTurbo/啟動MoneyPrinterTurbo.command`（Windows：`啟動MoneyPrinterTurbo.bat`）。
