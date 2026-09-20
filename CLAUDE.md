# 小工具大幫手 Design-tools — 開工守則

Bay 的線上工具站（對外網站）。**這份是新增 / 修改工具的唯一依據，動工前先讀完。**

**正式網址：https://bay-design-tools.vercel.app/**（Vercel，推到 GitHub `main` 就自動部署）。推完要驗「線上檔名有沒有換」就對這個網址驗。

⚠️ 別拿錯網址驗：GitHub repo 首頁欄位寫的 `design-tools-ten.vercel.app` 已失效（404）、`design-tools.vercel.app` 是別人的站、Vercel 自動產生的長網址要登入、GitHub Pages 那份跑的是沒建置的原始碼（卡片圖全部 404）—— 這些都不是正式站。

## 這站是什麼

- Vite **多頁式**網站：首頁一頁，每個小工具各自一頁，彼此獨立不共用狀態
- **純前端、無後端、無資料庫**。使用者上傳的圖只活在瀏覽器記憶體，重整就沒了 — 首頁對使用者是這樣寫的，新工具不准打破這個承諾
- **零 API、零費用**。不要為了新功能加需要金鑰或連外的服務

## 檔案架構

| 東西 | 位置 | 說明 |
|---|---|---|
| 首頁 | `index.html` | 只有骨架，卡片是 JS 塞進去的 |
| 卡片清單 | `main.js` 最上面的 `widgets` 陣列 | **新增工具要在這裡加一筆** |
| 首頁樣式 | `style.css` | 只管首頁，工具頁不吃這份 |
| 建置入口 | `vite.config.ts` 的 `rollupOptions.input` | **沒登記的頁 build 不會產出** |
| 卡片圖（上線用） | `public/card-<名字>.png` | **512×512 色盤 PNG**，網址是 `/card-xxx.png` |
| 卡片母檔 | `assets/cards-original/` | 1024 原尺寸，設計改圖用。**不會被打包，不上線** |
| 卡片空白模板 | `assets/card-空白模板.png`、`assets/svg/card-空白模板*.svg` | 做新卡片的底 |
| 卡片壓縮腳本 | `tools/optimize-card.py` | 換完卡片圖跑一次 |
| 各工具 | `<工具資料夾>/index.html` | 一個資料夾一個工具 |
| 浮動斗內（Ko-fi） | `index.html` 最底下 + `style.css` 最後一段 | **預設收起**，右下角一顆兩行的按鈕：第一行 **Ko-fi 官方 logo＋英文「Ko-fi」**、第二行「斗內支持」（logo 直接連 `storage.ko-fi.com/cdn/brandasset/v2/kofi_symbol.png`，這是 Ko-fi 提供給人嵌入用的官方圖，不要自己畫別人的商標；圖掛了會自動拿掉只剩文字）。按鈕黃底，會輕輕往上飄（3.4 秒一輪、最高 7px，**只往上不往下**，捲到頁尾才不會壓到；底下的影子留在原地跟著縮放變淡；滑過去或鍵盤聚焦時暫停；系統開「減少動態」就完全不飄）。飄動用 CSS 的 `translate` 屬性，**不要改成 `transform`**，會蓋掉 hover 往上抬的效果。點開是原尺寸 2/3 的視窗（Ko-fi 照原尺寸載入再整塊縮小，大小只改 `--kofi-scale`），金額是美金，**打開才載入 Ko-fi**；× 或 Esc 收起。手機點開是原尺寸全寬。預設狀態由 CSS 決定，**不要改回用 JS 在開頁時判斷**（背景分頁載入會量到寬度 0 而卡住）。捲到頁尾往上抬、載完／回上一頁（`pageshow`）重算位置都是直接算的，**不要包 `requestAnimationFrame`**（頁面沒在畫時會暫停）。2026-09-13 試過「預設展開＋半尺寸」，Bay 覺得沒比較好，改回收起 —— 別再提預設展開 |
| 更新紀錄 | `CHANGELOG.md` | 每次改版本號就順手寫一筆 |
| 建置產物 | `dist/` | 已 gitignore，不進版控 |

指令：**雙擊 `啟動開發.bat`**（第一次會自動 npm install，然後開 dev server 並跳瀏覽器）。
手動的話：`npm run dev`（port 3000）、`npm run build`（建置到 dist）、`npm run preview`（預覽建置結果）。

⚠️ **`public/` 裡的東西會原封不動被複製到上線目錄**，所以不要把沒在用的圖、母檔、素材丟進去。

## 新增一個小工具：7 步

照順序做，少一步就會壞。

**1. 建資料夾** — `<工具名>/index.html`（英文小寫連字號，例：`paper-poster`）

**2. 回首頁入口 — 一定要有，但要「長得像這個工具的一部分」**

規則只有三條：連到 `../index.html`、**放畫面左上**、使用者找得到。
**外觀不要照抄別的工具**，先看這個工具自己的配色、字體、圓角、按鈕長相，再設計一顆融進去的。
唐突的按鈕（例如深色工具上貼一顆白底黑框硬陰影）等於沒做。

參考現有兩種解法：

| 工具 | 做法 |
|---|---|
| `gif-maker`、`present-helper` | 白底黑框硬陰影按鈕，固定右下角。適合本身就是亮色扁平風的工具 |
| `paper-poster` | 深色工具，做成畫布左上的浮層小膠囊，半透明深色底加毛玻璃，hover 變金色 |
| `holo-effect` | 像素復古風，做成舞台左上的黃色圓角膠囊，2px 深咖啡邊＋硬陰影，按下去會往右下沉，圖示用 `crispEdges` 的像素箭頭 |

⚠️ **位置統一放畫面左上**（不是右下、也不要塞進面板裡）。工具左邊有固定面板的話用 `position:fixed`，
舞台本身是 `position:relative` 的就用 `position:absolute` 放進舞台。記得 `white-space:nowrap`，窄視窗才不會斷行。

工具右側或下方有固定面板時，別讓按鈕壓到控制項；窄螢幕要有退路。

**3. 作者 credit — 視情況，有適合的位子才放**

不是必要項。工具本身有自然的空位（面板底部、設定頁尾、about 區塊）就放，硬塞就不要。
放的話用站上統一那組字：`𝘽🜁𝙔𝘽🜁𝙔 ⊹ @blahbay____`，連到 `https://www.instagram.com/blahbay____`。
**這串字直接從根目錄 `index.html` 複製**，不要自己打 unicode 碼位（那幾個字是數學字體區的特殊碼位，手打會變成別的字母）。
`paper-poster` 是放在控制面板最下面，跟「本機運算，圖不上傳」擺一起。

**4. 登記建置入口** — `vite.config.ts` 的 `input` 加一行（key 用 camelCase）：

```js
paperPoster: path.resolve(__dirname, 'paper-poster/index.html'),
```

**5. 做首頁小卡 — 一定要用黃卡模板，不要自己另創風格**

首頁所有卡片是同一套視覺：**黃底圓角 + 上方藍色糖果（裡面放一個白色小圖示）+ 中間粉紅色全大寫英文名 + 下方白色粉筆線**。

| 東西 | 位置 |
|---|---|
| 空白模板（PNG，直接當底圖用） | `assets/card-空白模板.png` |
| 可編輯原稿（SVG） | `assets/svg/card-空白模板.svg`、`card-空白模板-含佔位字.svg` |
| 現有卡片的 1024 母檔 | `assets/cards-original/` |

設計規格（從現有卡片量出來的，照著做才會整齊）：

- 設計時用 **1024×1024**，四角透明
- 黃底 `#ffe708`、粉紅字 `#ff9ccf`、糖果藍 `#3cbedc`
- 糖果範圍 x 372–654 / y 150–302，中心 `(513, 226)` — **糖果裡放一個白色小圖示**代表這個工具在幹嘛
- 標題：全大寫英文，1–2 行，**所有行同一個字級**（抓最長那行去縮），最寬 730px，行距 168，整塊中心 y = 543
- 字體 **Outfit 800**（首頁本來就在載這個字體）

**輸出規格（這步不能跳，不然會拖慢整站）：**

卡片在網頁上只顯示 **254px 寬**（首頁 1100px 容器切 4 欄）。所以：

1. 1024 母檔存進 `assets/cards-original/`
2. 縮到 **512×512**（2 倍視網膜用量）存進 `public/card-<名字>.png`
3. 跑 `python tools/optimize-card.py` 轉成 256 色色盤 PNG
4. 目標 **一張 ≤ 25KB**

不要用 WebP。這種黃配粉的高彩度扁平圖，有損 WebP 會因為色度抽樣在字邊壓出色暈，而且調高品質也修不掉（實測誤差不隨品質下降）。色盤 PNG 又小又乾淨。

**真的做不出來就先把 `assets/card-空白模板.png` 複製成 `public/card-<名字>.png` 佔位**，路徑先接好讓首頁不會破圖，然後跟 Bay 說這張要手改。

**5b. Hover 預覽（選配，但很建議做）**

滑鼠移到卡片上時淡入一張「實際成品」。黃卡好認但看不出工具做出來長怎樣，這張補上那個缺口。

做法：在 `main.js` 那筆多加一行 `hoverImage`，機制就自己接上（沒填就沒有這層，不會壞）：

```js
image: '/card-holo.png',
hoverImage: '/card-holo-hover.jpg',
```

- 尺寸一樣 **512×512**
- **這張用 JPEG 不是 PNG**。成品圖多半是照片性質（漸層、雜訊、光影），色盤 PNG 會出現色階斷層；
  而且它鋪滿整張不需要透明背景。品質 0.86~0.88，一張約 30~40KB
  （黃卡本身仍然是色盤 PNG —— 那是扁平色塊，兩者不要搞混）
- **內容要是工具真的算出來的東西，不要畫示意圖**。做法是把工具跑起來、用它自己的輸出：
  `paper-poster` 直接把 canvas 設成 512 再 `toDataURL`；
  `holo-effect` 是攔截它自己的「下載 PNG」拿到 blob，再合成到格線紙底上
- 卡片是正方形（`object-fit: cover`），所以預覽也要正方形，不然會被裁
- **格式看內容選**：照片性質（漸層光影）用 JPEG 0.86~0.88；輸出本身就是有限色的（像素／點陣、扁平圖樣）改用色盤 PNG 再跑 `tools/optimize-card.py` —— 像素轉換器那張這樣做是 66KB → 5KB 而且**色差 0**
- 怎麼把工具的輸出撈出來（實測有效的順序）：
  1. 輸出是 canvas → 直接 `drawImage` 那個 canvas。WebGL 的先驗 `toDataURL` 讀不讀得到（沒開 preserveDrawingBuffer 會是空的）
  2. 輸出是 `<img>` → 找 `alt` 認得出來的那張（例如像素工具的 `Processed Glitch Output`）
  3. 只有下載按鈕 → 攔 `HTMLAnchorElement.prototype.click` 拿 blob URL（`holo-effect` 這樣做成功）
  4. 上面都不行 → 用它畫面上已經在顯示的元素自己合成（IG 排版就是讀那 9 張再排成 3×3）
- 餵輸入圖不用手動點：用 canvas 合成 → `new File([blob])` → `DataTransfer` 塞進 `input.files` → 發 `change` 事件

**6. 加首頁卡片** — `main.js` 的 `widgets` 陣列，插在 `coming-soon` 那筆**前面**：

```js
{
    id: 'paper-poster',
    title: '紙海報摺痕模擬器',
    description: '一兩句白話講清楚這工具幫使用者做什麼。',
    image: '/card-paper.png',          // public 根目錄，開頭是 /
    path: './paper-poster/index.html', // 相對首頁，開頭是 ./
},
```

外連工具（不在本站）多加 `external: true`，`path` 放完整網址。
**外連工具只做第 5 步（黃卡）和第 6 步（卡片）**，1～4 步（資料夾、回首頁、credit、vite 入口）都不適用 —— 那些是它自己網站的事。

**7. 驗證** — 見下面的驗收清單。

## 兩種工具長相

**React / TS**（現有 8 個都是）：資料夾裡有 `src/` 或 `index.tsx`，`index.html` 只有 `<div id="root">` 加一行 `<script type="module" src="./src/main.tsx">`。相依套件裝在**根目錄** `package.json`，子資料夾那些 `package.json` / `vite.config.ts` 是原始鷹架殘留，**不會被使用**，不用去改。

**純 HTML 單檔**（`paper-poster` 是第一個）：整個工具就一個 `index.html`，樣式和程式都 inline。踩過的坑：

**script 標籤要分兩種看，弄反了上線就是白畫面：**

| 情況 | 怎麼寫 | 為什麼 |
|---|---|---|
| 程式直接寫在 HTML 裡（inline） | **不要**加 `type="module"` | 加了 Vite 會去打包它。古典 inline script 會原封不動留著 |
| 引用外部檔 `<script src="xxx.js">` | **一定要**加 `type="module"` | Vite **只處理 module**。沒加的話它既不打包也不複製那個檔，`dist/<工具>/` 裡只會有 index.html，上線直接 404 |
| 外部檔和 inline 互相依賴 | **兩支都要是 module** | module 是延後執行的。只改外部那支，inline 會搶先跑，抓不到外部檔設的全域變數 |

（`holo-effect` 就是踩這個坑：`<script src="holo.js">` 沒加 module，build 完 css 有被打包、js 沒有，整個工具在上線版是死的。）

- `<script type="x-shader/...">` 這種非 JS 型別的區塊 Vite 不會碰，可以安心拿來存 GLSL
- 不要連 CDN。字型、函式庫、圖示全部自己內嵌
- 要引 public 的檔案就用絕對路徑 `/xxx.png`
- 工具的進入點**必須叫 `index.html`**。原本叫別的名字（例如 `holo.html`）就改名，並記得同步改 `啟動.bat` 和 README 裡的參照

## 死規矩

- **介面禁用 emoji**。按鈕、圖示一律 SVG。emoji 只准出現在文案內容裡
  （`gif-maker` 和 `present-helper` 的回首頁按鈕還是舊的 🏠，是歷史遺留，之後要一起換掉）
- **不要自己 commit / push / 上線**。build 完就停，發佈是 Bay 親手做
- **不要動 `dist/`**，那是 build 產物
- 不要去改子資料夾裡沒在用的 `package.json` / `vite.config.ts` / `metadata.json` / `README.md`（都是 AI Studio 鷹架殘留）
- 新工具的說明文字用白話，站上的使用者是創作者不是工程師

## 驗收清單

做完新增或改動，這六項都要實際跑過，不能用猜的：

1. `npm run build` 沒有錯誤
2. `dist/<工具名>/index.html` 有產出，且內容完整（純 HTML 工具要確認 inline script 沒被吃掉）
3. `dist/card-<名字>.png` 有被複製過去
4. 起一個靜態伺服器指到 `dist/`，首頁看得到新卡片**而且圖有載出來**
5. 新卡片跟旁邊幾張並排看一眼 — 黃底、糖果、粉字、粉筆線四樣都對得上，而且檔案 ≤ 25KB；
   有做 hover 預覽的話，滑上去確認會淡入（別在同一批操作裡插截圖，滑鼠會被帶走，會誤判成沒生效）
6. 從首頁點進工具 → 按回首頁 → 回得來。這個來回一定要親手點過，並確認那顆按鈕不會突兀

## 現有工具一覽

| 資料夾 | 卡片標題 | 型態 |
|---|---|---|
| `diy-pattern-generator` | DIY 圖樣生成器 | React |
| `image-ultra-resizer` | 圖片快捷縮放工具 | React |
| `collage-studio` | 圖片拼圖 多併一小幫手 | React |
| `present-helper` | 設計師提案小幫手 | React |
| `instalayout-planner` | IG 預覽排版小幫手 | React |
| `gif-maker` | gif maker | React |
| `stl-viewer` | STL 3D 模型檢視器 | React |
| `90s-retro-pixel-studio` | 90s 復古像素轉換器 | React |
| `paper-poster` | 紙海報摺痕模擬器 | 純 HTML |
| `holo-effect` | 閃卡炫光材質產生器 | 純 HTML（外部 holo.css / holo.js） |
| — | 作品身分證 Art Work ID | 外連 |
| — | 語音跑馬燈 InstaWords | 外連（instawords.vercel.app，原始碼在 `C:\Bay\Claude語音跑馬燈`） |

`paper-poster` 在 `D:\創世神 World!\paper-poster\` 還有一份舊的獨立版本 —
**以本站這份為主**，功能要改就改這裡，那份只當備份。
