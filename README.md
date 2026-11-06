# claude-skills

國立臺南特殊教育學校總務處主任（hsiang0422-star）存放 Claude 專用技能的儲存庫。每個技能是獨立資料夾，技能說明在各自的 `SKILL.md`。

## 技能清單

| 技能 | 用途 | 來源 |
| --- | --- | --- |
| [hallmark](./hallmark) | 網站與新頁面設計技能，讓成品看起來經過設計，而不是 AI 生成的樣子 | [nutlope/hallmark](https://github.com/nutlope/hallmark)，授權見 `hallmark/LICENSE` |
| [handraw-style](./handraw-style) | 手繪風格技能套件，包含 365 種畫風、排版圖型與配色，以及 23 個子技能 | [yang0/handraw-style](https://github.com/yang0/handraw-style)，MIT 授權（附署名要求），見 `handraw-style/LICENSE` |
| [speak-human-tw](./speak-human-tw) | 繁體中文去 AI 味改寫技能：抓出 AI 寫作痕跡、校正中國用語與半形標點，改寫成像真人寫的文字 | [Raymondhou0917/speak-human-tw](https://github.com/Raymondhou0917/speak-human-tw)，MIT 授權，見 `speak-human-tw/LICENSE` |
| [security-audit](./security-audit) | 程式碼與網站安全稽核技能，以多階段流程找出可驗證的漏洞並提供修正建議 | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill)，MIT 授權，見 `security-audit/LICENSE` |
| [dashi-ppt](./dashi-ppt) | 製作 PPT、演示文稿與匯報材料，產生可離線開啟的 HTML 簡報，並可匯出 PPTX / PDF | [chuspeeism/dashi-ppt-skill](https://github.com/chuspeeism/dashi-ppt-skill)，GNU AGPL-3.0，見 `dashi-ppt/LICENSE` |
| [faster-whisper](./faster-whisper) | 把會議錄音、課程或訪談音檔轉成逐字稿（txt）或字幕（srt） | 原創，使用 [faster-whisper](https://github.com/SYSTRAN/faster-whisper) 套件 |
| [ppt-master](./ppt-master) | 把文件或主題製作成可編輯的原生 PowerPoint，支援動畫、圖表、音訊旁白與自訂 .pptx 範本 | [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master)，MIT 授權，見 `ppt-master/LICENSE` |
| [taste-skill](./taste-skill) | 網站與 App 畫面設計技能（安裝名稱 design-taste-frontend），提供美術方向與參考圖，並以瀏覽器檢查成品，避免制式的 AI 生成頁面 | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)，MIT 授權，見 `taste-skill/LICENSE` |
| [video-shotcraft](./video-shotcraft) | 用 Remotion 製作電影感產品宣傳影片，內含 124 張鏡頭配方卡、完整模板與音效工具；另含可選的社群發布腳本（需使用者明確要求） | [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)，Apache-2.0 授權，見 `video-shotcraft/LICENSE` |
| [hyperframes](./hyperframes) | 用 HTML 與動畫製作 MP4 影片的主要技能，製作、編輯與渲染影片都從這裡開始 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [hyperframes-cli](./hyperframes-cli) | HyperFrames 命令列工具的各項操作：建立專案、檢查、預覽與渲染 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [hyperframes-registry](./hyperframes-registry) | 約 450 個可直接取用的 HyperFrames 區塊與元件（轉場、版型等） | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [media-use](./media-use) | 為 HyperFrames 影片取得音樂、音效、圖片、圖示、標誌與旁白 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [reverse-any-video](./reverse-any-video) | 把任一影片還原成可編輯的 HyperFrames 專案 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [remotion-to-hyperframes](./remotion-to-hyperframes) | 把既有的 Remotion 影片程式或素材移入 HyperFrames，並逐格比對原始影片 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [slideshow](./slideshow) | 製作可現場簡報的 HyperFrames 投影片，含分段揭露與互動熱點 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [figma](./figma) | 把 Figma 內容（素材、品牌色票、元件、分鏡）帶入 HyperFrames 影片 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [style-sampling](./style-sampling) | 依既有影片風格（如 Collage 或 Finance Explainer）製作新一集 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)，Apache-2.0 授權，各資料夾內保留 `LICENSE` |
| [univer-cli](./univer-cli) | 用 Univer CLI 直接讀寫試算表、文件、簡報與 .univer 檔，支援匯入匯出、驗證與截圖。需先安裝 `npm install -g univer-cli` | [dream-num/skills](https://github.com/dream-num/skills)，Apache-2.0 授權，見 `univer-cli/LICENSE` |
| [moneyprinterturbo](./moneyprinterturbo) | 安裝、啟動與更新 MoneyPrinterTurbo（一鍵生成短影音：給主題就自動寫腳本、配素材、配音、上字幕），含 Mac 與 Windows 安裝腳本 | 原創，用於安裝 [harry0703/MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)（MIT 授權，本儲存庫不含其程式碼） |

## 安裝與使用

### 用外掛市集安裝（可自動更新）

本儲存庫也是 Claude Code 外掛市集 `hsiang-skills`（設定檔 `.claude-plugin/marketplace.json`）。在其他電腦的終端機執行：

```bash
claude plugin marketplace add hsiang0422-star/claude-skills
claude plugin install moneyprinterturbo@hsiang-skills --scope user
```

要自動更新：在 Claude Code 輸入 `/plugin` → Marketplaces → `hsiang-skills` → Enable auto-update。電腦沒有設定 GitHub SSH 金鑰時，先設定環境變數 `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`。

目前列入市集的技能：`moneyprinterturbo`。要把其他技能也列入，在 `marketplace.json` 的 `plugins` 加一筆 `{"name": "<技能名>", "source": "./<技能名>"}`。

### 直接複製資料夾

每個技能資料夾都可以直接複製到 Claude 的技能目錄使用。`handraw-style` 的安裝入口是 `handraw-style/SKILL.md`，部分腳本需要先安裝 `handraw-style/requirements.txt` 中的 Python 套件。

## 署名

`handraw-style` 依照原作者的 MIT 授權（附署名要求）保留 LICENSE，並在此標示原作者 yang0 與原始儲存庫網址：https://github.com/yang0/handraw-style 。

## 參考清單

以下是他人整理的技能清單，本儲存庫不複製其內容，只提供連結供查找：

- [ammosu/awesome-claude-skills-zh-tw](https://github.com/ammosu/awesome-claude-skills-zh-tw)：繁體中文版的 Claude 技能清單，授權為 Apache-2.0。清單中各技能可能有不同授權，安裝前請檢查各技能資料夾的授權資訊。
