"""
把首頁小卡壓成適合網頁的大小。

用法（在 Design-tools 資料夾下）：
    python tools/optimize-card.py                 # 處理 public/ 裡所有 card-*.png
    python tools/optimize-card.py card-paper.png  # 只處理指定那張

做兩件事：
  1. 檢查尺寸應為 512x512（卡片在網頁上只顯示 254px，512 就是 2 倍視網膜用量）
  2. 把 PNG 轉成 256 色色盤圖 —— 這種扁平色塊圖可以小 3~4 倍，而且不像 WebP
     那樣會在黃配粉的邊緣壓出色暈

原尺寸 1024 的設計母檔請留在 assets/cards-original/，不要放 public/。
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from quantize import process

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pub = os.path.join(root, 'public')
args = sys.argv[1:]
names = args if args else sorted(f for f in os.listdir(pub)
                                 if f.startswith('card-') and f.endswith('.png'))
tb = ta = 0
for n in names:
    p = os.path.join(pub, n)
    if not os.path.exists(p):
        print('  找不到', n); continue
    r = process(p)
    tb += r['before_kb']; ta += r['after_kb']
    warn = '' if r['colors'] else ''
    print(f"{r['name']:24} {r['before_kb']:>4}KB -> {r['after_kb']:>3}KB   最大色差 {r['max_err']}")
print(f"\n合計 {tb}KB -> {ta}KB")
