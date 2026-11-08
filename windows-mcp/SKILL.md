---
name: windows-mcp
description: 透過 Windows-MCP 讓 AI 代理操作 Windows 桌面，包括瀏覽檔案、開啟與切換應用程式、點擊與輸入文字，也能執行 PowerShell 指令。只能在 Windows 7 至 11 使用，需 Python 3.14 以上與 uv。執行前請確認操作的電腦沒有學生個資、公文或帳號密碼。
---

# Windows-MCP

讓 AI 代理透過 MCP 操作 Windows 電腦：瀏覽檔案、啟動與切換應用程式、點擊介面與輸入文字，並可執行 PowerShell 指令。

- 原作者：CursorTouch/Windows-MCP（著作權人 JEOMON GEORGE）
- 來源：https://github.com/CursorTouch/Windows-MCP
- 授權：MIT，原授權檔保留於 `LICENSE.md`
- 本資料夾只收錄這份說明，不含上游程式碼。

## 使用前須知

- **只能在 Windows 電腦上使用。** macOS 與 Linux 無法執行。
- 需要 Python 3.14 以上，並安裝 uv（`pip install uv`）。
- 代理能控制整台電腦，包括開啟程式、移動檔案與執行 PowerShell，影響範圍大於一般技能。
  - 第一次使用請在測試電腦或測試資料夾進行，不要直接在存有學生資料或公文的電腦上操作。
  - 請只交代明確的工作範圍，不要讓代理自行探索或操作不熟悉的程式與網站。
  - 任何會刪除、寄送、送出表單或變更系統設定的動作，執行前都要先確認。
- 上游版本更新快，安裝前請對照官方 README 與 PyPI 頁面：https://pypi.org/project/windows-mcp/

## 安裝

在 Windows 電腦上，先確認 uv 可以執行：

```bash
uvx windows-mcp serve
```

在 Claude Desktop 使用時，於 `claude_desktop_config.json` 的 `mcpServers` 加入：

```json
{
  "mcpServers": {
    "windows-mcp": {
      "command": "uvx",
      "args": ["windows-mcp", "serve"]
    }
  }
}
```

Windows 版 Claude Desktop 的設定檔位置與 `uvx.exe` 完整路徑寫法，請依上游 README 的 Windows 說明設定。

## 注意

- 這是本機 MCP 服務，請勿把它開放到網路上（上游也提供 SSE 與 streamable-http 模式，預設僅建議本機使用）。
- 安裝與設定方式以上游官方為準，本說明不保證最新版本相容。
