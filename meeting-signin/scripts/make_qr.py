#!/usr/bin/env python3
"""產生會議簽到 QR Code（PNG）。

用法：
  python3 make_qr.py "https://script.google.com/macros/s/xxxx/exec" "11月校務會議" [輸出檔名.png]

會自動在網址後面加上 ?m=會議名稱（已正確編碼中文），並在圖片下方印出會議名稱。
需要套件：pip install "qrcode[pil]"
"""
import sys
import urllib.parse

try:
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit('請先安裝套件：pip install "qrcode[pil]"')


def build_url(base, meeting):
    base = base.strip()
    if not meeting:
        return base
    sep = '&' if '?' in base else '?'
    return base + sep + 'm=' + urllib.parse.quote(meeting)


def find_font(size):
    candidates = [
        '/System/Library/Fonts/PingFang.ttc',                      # macOS
        '/System/Library/Fonts/STHeiti Medium.ttc',
        'C:/Windows/Fonts/msjh.ttc',                               # Windows 微軟正黑體
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',  # Linux
        '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return None


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    base = sys.argv[1]
    meeting = sys.argv[2] if len(sys.argv) > 2 else ''
    out = sys.argv[3] if len(sys.argv) > 3 else f'簽到QRCode_{meeting or "會議"}.png'
    url = build_url(base, meeting)

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=16, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white').convert('RGB')

    font = find_font(56)
    if meeting and font:
        w, h = img.size
        canvas = Image.new('RGB', (w, h + 180), 'white')
        canvas.paste(img, (0, 0))
        d = ImageDraw.Draw(canvas)
        for text, y, f in ((meeting, h - 10, font), ('請用手機相機掃描簽到', h + 80, find_font(40) or font)):
            tw = d.textlength(text, font=f)
            d.text(((w - tw) / 2, y), text, fill='black', font=f)
        img = canvas

    img.save(out)
    print('QR Code 已儲存：' + out)
    print('網址：' + url)


if __name__ == '__main__':
    main()
