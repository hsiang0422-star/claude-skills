---
name: new-skill-intake
description: Use when the user finds a new skill via a link, pasted SKILL.md, or a screenshot, to check its AI safety and license, judge whether it runs on Claude cloud or OpenAI Codex, save it to the claude-skills GitHub repo, and classify it on the admin toolbox skills page.
---

# 新技能收錄流程（new-skill-intake）

適用於總務主任（hsiang0422-star）找到或分享新技能時。依序完成下列步驟，每一步的結果都要回報給使用者。

## 相關儲存庫

- `hsiang0422-star/claude-skills`：技能資料夾，規則見該儲存庫的 CLAUDE.md（繁體中文、每個技能一個資料夾、SKILL.md 含 name 與 description、README 技能清單加一行、保留授權檔）。
- `hsiang0422-star/tnmr-school-admin-toolbox`：行政工具箱網站，技能站為 `skills.html`，目錄寫在檔案內的 JavaScript 陣列：
  - `catalog`：Claude 專用（`claude:` 前綴）與各類自建技能。
  - `personal`：「我所創建的技能」的 slug 清單，對應的卡片連結需指向 claude-skills。
  - `shared`：「網路上分享的技能」，格式為 `[名稱, 分類, 說明, 連結]`。

## 步驟

1. **辨識輸入**（輸入可能是截圖、直接打上的技能名稱，或兩者並用）
   - **截圖**：先讀取圖片，找出工具或技能名稱與看得到的宣稱。截圖本身不是來源，只能當線索。
   - **打上的技能名稱**：直接以該名稱搜尋官方或原始儲存庫（名稱可能與儲存庫名稱不同，需確認是同一個專案）。若同名有多個結果，列出候選請使用者選擇，不要自行挑選。
   - **兩者並用**：以截圖與名稱互相核對，確認指的是同一個工具後再往下做。名稱與截圖對不上時，先詢問使用者。
   - 找到 SKILL.md 與 LICENSE 後再往下做。找不到來源時，請使用者提供連結，不要憑截圖或名稱推測內容。

2. **取得內容**
   - 使用淺層複製到新的空目錄，例如 `git clone --depth 1`。不要執行其中的程式、安裝腳本或 npm 指令。
   - 若外部網頁抓取需要核准而沒有人回應，停止抓取，改請使用者貼上 SKILL.md 內容。不要重試。

3. **授權檢查**
   - 找出 LICENSE。明確允許再發布（MIT、Apache-2.0 等）才收錄到 claude-skills，保留原授權檔與來源網址。
   - 授權不明或禁止再發布時，只保留來源連結，並先詢問使用者，不直接推送。

4. **AI 安全檢查**（這一步不可略過）
   - 來源可信度：作者、星數、最近更新、是否為官方或知名儲存庫。
   - 金鑰與權限：會不會要求 API 金鑰、token 或帳號登入？會經手金鑰的工具要標註，並提醒安裝前檢視程式碼。
   - 外部呼叫：技能內容是否會把資料傳到第三方服務或外部網址？
   - 隱私：內容是否含個資、公文、學生資料，或會把這些資料送出去？
   - 可執行內容：有無會在使用者電腦上執行的腳本、hook 或 plugin 清單？
   - 合規與條款：宣稱的功能是否可能違反服務商條款（例如以切換帳號規避額度）？若有疑慮，寫在說明並提醒使用者自行確認。
   - 結論分三級：**可收錄**、**可收錄但需標註風險**、**暫不收錄**。

5. **判斷安裝位置**（依格式判斷，無法代為實測）
   - **Claude 雲端（claude.ai 技能）**：資料夾有 SKILL.md，frontmatter 含 name 與 description，且不依賴本機 Claude Code 獨有功能（plugin 清單、hooks、slash command、本機 MCP）。
   - **OpenAI Codex**：同樣以 SKILL.md 為主，能讀取通用格式。
   - **需先安裝前置程式**：例如需要先啟動某個伺服器、安裝 FFmpeg 或全域 npm 套件。
   - **僅本機**：需要存取使用者電腦檔案、桌面操作或瀏覽器登入狀態。
   - 在回報中寫明判斷依據，並說明實際結果以使用者測試為準。

6. **收錄到 claude-skills**（通過步驟 3 與 4 後）
   - 建立以小寫英文與連字號命名的資料夾，放入 SKILL.md、LICENSE 與必要檔案。不修改第三方內容。
   - 在 README 技能清單新增一行：名稱、用途（繁體中文）、來源與授權。
   - 若是多個技能（例如整個技能包），每個技能各一行。
   - 不提交 token、API 金鑰、個資、公文內容或暫存檔。

7. **分類到行政工具箱技能站**
   - 使用者自己創建或改寫的技能：加入 `catalog`（前綴 `claude:`），並把 slug 加入 `personal`，卡片連結指向 claude-skills 對應資料夾。
   - 外部分享的技能：加入 `shared`，連結指向 claude-skills 內的資料夾（若已收錄），或原始來源（若未收錄）。
   - 說明文字需標明：原作者與授權、安裝位置（Claude 雲端／Codex／需先安裝前置程式／僅本機）、以及安全等級。
   - 修改後用 Node 檢查 HTML 內的 script 語法，確認沒有錯誤再推送。

8. **推送**
   - 每個儲存庫先執行 `git fetch origin main`，再 commit 與 push 到 main。
   - commit 訊息：`Add <skill-name> skill`（claude-skills）或 `Classify <skill-name> on skills page`（工具箱）。
   - 兩個儲存庫的變更分別提交。

9. **回報**
   - 技能名稱、來源與授權、安全等級與理由、安裝位置判斷（Claude 與 Codex 分別說明）、收錄與分類的位置、推送結果與網址。
   - 說明判斷只依格式，實際執行結果以使用者測試為準。

## 範例：OmniRoute（截圖收錄案例）

- 截圖只有「額度用完不中斷」等標語，來源依技能站登記的 `github.com/diegosouzapw/OmniRoute` 取得。
- 授權：MIT，可收錄。
- 安全等級：可收錄但需標註風險（會經手 API 金鑰，並以切換服務商規避額度，需提醒使用者確認服務商條款）。
- 結構：repo 內 46 個技能資料夾，多數需先啟動 OmniRoute 伺服器，歸為「需先安裝前置程式」。`ponytail` 為內附的外部技能（DietrichGebert/ponytail，MIT），需另行標註原作者。
