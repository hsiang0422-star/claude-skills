---
name: faster-whisper
description: 使用 faster-whisper 把會議錄音、課程或訪談音檔轉成逐字稿（.txt）或字幕檔（.srt）。當使用者要求語音轉文字、音檔轉逐字稿、產生字幕，或提到 Whisper、faster-whisper 時使用。
---

# faster-whisper 語音轉文字

以 `scripts/transcribe.py` 呼叫 faster-whisper，將音檔轉為文字。支援繁體與簡體中文、英文等多國語言，可輸出純文字或 SRT 字幕。

## 安裝（第一次使用）

```bash
pip install -r requirements.txt
```

- 需要 Python 3.8 以上。
- 沒有 NVIDIA 顯卡時會使用 CPU，速度較慢；有顯卡可加上 `--device cuda`。
- 第一次執行會自動下載所選模型，小模型約數百 MB。

## 使用方式

```bash
python scripts/transcribe.py 音檔.m4a
python scripts/transcribe.py 會議.mp3 --model medium --language zh
python scripts/transcribe.py 課程.wav --format srt --output 課程.srt
```

| 參數 | 說明 | 預設 |
| --- | --- | --- |
| `audio` | 音檔路徑（mp3、m4a、wav、flac 等 ffmpeg 支援的格式） | 必填 |
| `--model` | 模型大小：tiny、base、small、medium、large-v3 | small |
| `--language` | 語言代碼，例如 zh、en；省略則自動偵測 | 自動偵測 |
| `--format` | 輸出格式：txt 或 srt | txt |
| `--output` | 輸出檔案路徑 | 與音檔同名 |
| `--device` | cpu 或 cuda | cpu |

## 注意事項

- 中文內容建議指定 `--language zh`，可減少誤判語言的情況。
- 模型越大越準確，但速度越慢；一般會議可先用 small，重要內容再改用 medium 或 large-v3。
- 音檔含有學生個資、公文內容或其他敏感資訊時，轉錄結果請依學校規定妥善保存，不要上傳到公開儲存庫。
- 本技能只負責轉錄，不會自動修正專有名詞；轉錄後請人工校對。
