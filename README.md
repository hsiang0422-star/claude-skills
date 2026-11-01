# claude-skills

國立臺南特殊教育學校總務處主任（hsiang0422-star）存放 Claude 專用技能的儲存庫。每個技能是獨立資料夾，技能說明在各自的 `SKILL.md`。

## 技能清單

| 技能 | 用途 | 來源 |
| --- | --- | --- |
| [hallmark](./hallmark) | 網站與新頁面設計技能，讓成品看起來經過設計，而不是 AI 生成的樣子 | [nutlope/hallmark](https://github.com/nutlope/hallmark)，授權見 `hallmark/LICENSE` |
| [handraw-style](./handraw-style) | 手繪風格技能套件，包含 365 種畫風、排版圖型與配色，以及 23 個子技能 | [yang0/handraw-style](https://github.com/yang0/handraw-style)，MIT 授權（附署名要求），見 `handraw-style/LICENSE` |
| [security-audit](./security-audit) | 程式碼與網站安全稽核技能，以多階段流程找出可驗證的漏洞並提供修正建議 | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill)，MIT 授權，見 `security-audit/LICENSE` |
| [dashi-ppt](./dashi-ppt) | 製作 PPT、演示文稿與匯報材料，產生可離線開啟的 HTML 簡報，並可匯出 PPTX / PDF | [chuspeeism/dashi-ppt-skill](https://github.com/chuspeeism/dashi-ppt-skill)，GNU AGPL-3.0，見 `dashi-ppt/LICENSE` |
| [faster-whisper](./faster-whisper) | 把會議錄音、課程或訪談音檔轉成逐字稿（txt）或字幕（srt） | 原創，使用 [faster-whisper](https://github.com/SYSTRAN/faster-whisper) 套件 |
| [ppt-master](./ppt-master) | 把文件或主題製作成可編輯的原生 PowerPoint，支援動畫、圖表、音訊旁白與自訂 .pptx 範本 | [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master)，MIT 授權，見 `ppt-master/LICENSE` |
| [taste-skill](./taste-skill) | 網站與 App 畫面設計技能（安裝名稱 design-taste-frontend），提供美術方向與參考圖，並以瀏覽器檢查成品，避免制式的 AI 生成頁面 | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)，MIT 授權，見 `taste-skill/LICENSE` |

## 安裝與使用

每個技能資料夾都可以直接複製到 Claude 的技能目錄使用。`handraw-style` 的安裝入口是 `handraw-style/SKILL.md`，部分腳本需要先安裝 `handraw-style/requirements.txt` 中的 Python 套件。

## 署名

`handraw-style` 依照原作者的 MIT 授權（附署名要求）保留 LICENSE，並在此標示原作者 yang0 與原始儲存庫網址：https://github.com/yang0/handraw-style 。

## 參考清單

以下是他人整理的技能清單，本儲存庫不複製其內容，只提供連結供查找：

- [ammosu/awesome-claude-skills-zh-tw](https://github.com/ammosu/awesome-claude-skills-zh-tw)：繁體中文版的 Claude 技能清單，授權為 Apache-2.0。清單中各技能可能有不同授權，安裝前請檢查各技能資料夾的授權資訊。
