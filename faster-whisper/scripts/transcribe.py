#!/usr/bin/env python3
"""使用 faster-whisper 將音檔轉為逐字稿（txt）或字幕（srt）。"""

import argparse
import sys
from pathlib import Path


def format_timestamp(seconds: float) -> str:
    """將秒數轉為 SRT 時間格式 HH:MM:SS,mmm。"""
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main() -> int:
    parser = argparse.ArgumentParser(description="faster-whisper 語音轉文字")
    parser.add_argument("audio", help="音檔路徑")
    parser.add_argument("--model", default="small",
                        help="模型大小：tiny、base、small、medium、large-v3")
    parser.add_argument("--language", default=None,
                        help="語言代碼，例如 zh、en；省略則自動偵測")
    parser.add_argument("--format", choices=["txt", "srt"], default="txt",
                        help="輸出格式")
    parser.add_argument("--output", default=None, help="輸出檔案路徑")
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda"],
                        help="運算裝置")
    args = parser.parse_args()

    audio_path = Path(args.audio)
    if not audio_path.is_file():
        print(f"找不到音檔：{audio_path}", file=sys.stderr)
        return 1

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("尚未安裝 faster-whisper，請先執行：pip install -r requirements.txt",
              file=sys.stderr)
        return 1

    compute_type = "float16" if args.device == "cuda" else "int8"
    model = WhisperModel(args.model, device=args.device, compute_type=compute_type)

    segments, info = model.transcribe(
        str(audio_path),
        language=args.language,
        vad_filter=True,
    )
    print(f"偵測語言：{info.language}（機率 {info.language_probability:.2f}）",
          file=sys.stderr)

    output_path = Path(args.output) if args.output else audio_path.with_suffix(f".{args.format}")

    lines = []
    for index, seg in enumerate(segments, start=1):
        text = seg.text.strip()
        if args.format == "srt":
            lines.append(str(index))
            lines.append(f"{format_timestamp(seg.start)} --> {format_timestamp(seg.end)}")
            lines.append(text)
            lines.append("")
        else:
            lines.append(text)

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"已輸出：{output_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
