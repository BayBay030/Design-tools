// ── Tool registry ──────────────────────────────────────────────────
// To add a new tool: append an object to this array.
// size is ignored now (cards are always 1-col in the 3-col grid).
const widgets = [
    {
        id: 'diy-pattern-generator',
        title: 'DIY 圖樣生成器',
        description: '上傳 PNG 圖片，快速生成各種可愛的背景圖樣與無縫圖樣Pattern素材。',
        image: '/card-pattern.png',
        path: './diy-pattern-generator/index.html',
    },
    {
        id: 'image-ultra-resizer',
        title: '圖片快捷縮放工具',
        description: '一鍵將高解析圖片輸出為三種尺寸供網頁用（XL / S / WebP）',
        image: '/card-resizer.png',
        path: './image-ultra-resizer/index.html',
    },
    {
        id: 'collage-studio',
        title: '圖片拼圖 多併一小幫手',
        description: '圖片拼接小幫手，輕鬆整理多張變一大張的JPG。',
        image: '/card-collage.png',
        path: './collage-studio/index.html',
    },
    {
        id: 'present-helper',
        title: '設計師提案小幫手',
        description: '快速排列作品圖、加浮水印、調間距，產出好看的提案版面。',
        image: '/card-present.png',
        icon: '🖼️',
        path: './present-helper/index.html',
    },
    {
        id: 'instalayout-planner',
        title: 'IG 預覽排版小幫手',
        description: '規劃與預覽你的 Instagram 貼文排版。',
        image: '/card-ig.png',
        icon: '📱',
        path: './instalayout-planner/index.html',
    },
    {
        id: 'gif-maker',
        title: 'gif maker',
        description: '把圖片快速做成 gif 動圖。',
        image: '/card-gif.png',
        path: './gif-maker/index.html',
    },
    {
        id: 'artwork-id',
        title: '作品身分證 Art Work ID',
        description: '上傳作品圖，一鍵產出網頁用圖檔與作品資料卡。',
        image: '/card-artwork-id.png',
        path: 'https://artwork-id.vercel.app/',
        external: true,
    },
    {
        id: 'stl-viewer',
        title: 'STL 3D 模型檢視器',
        description: '上傳 STL / STEP 檔即時預覽，量測尺寸、體積與列印重量，可匯出 STL 或錄製 360° 展示影片。',
        image: '/card-stl.png',
        path: './stl-viewer/index.html',
    },
    {
        id: 'pixel-studio',
        title: '90s 復古像素轉換器',
        description: '把照片變成 90 年代電腦點陣風格，可調抖動網點、色深壓縮、故障特效與復古調色盤。',
        image: '/card-pixel.png',
        path: './90s-retro-pixel-studio/index.html',
    },
    {
        id: 'paper-poster',
        title: '紙海報摺痕模擬器',
        description: '把作品圖變成有摺痕、皺褶、折角的紙本海報，紙質與燈光都能調，可拖四角折起來，一鍵存 PNG。',
        image: '/card-paper.png',
        path: './paper-poster/index.html',
    },
    {
        id: 'holo-effect',
        title: '閃卡炫光材質產生器',
        description: '把任何圖片變成會跟著滑鼠轉的全息閃卡：方閃、碎閃、經典彩虹三種材質，可輸出 PNG 或複製 CSS 直接用在自己的專案。',
        image: '/card-holo.png',
        path: './holo-effect/index.html',
    },
    {
        id: 'coming-soon',
        title: '即將推出...',
        description: '更多有趣的小工具正在開發中，敬請期待！',
        image: '/comming.gif',
        icon: '✨', // unused when image is provided
        path: '#',
    },
];

// ── Render ─────────────────────────────────────────────────────────
function createCard(widget) {
    const a = document.createElement('a');
    a.href = widget.path;
    a.className = 'tool-card';
    a.id = `tool-${widget.id}`;
    if (widget.external) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    }

    // Image or placeholder
    let mediaHTML;
    if (widget.image) {
        mediaHTML = `<img class="tool-card-img" src="${widget.image}" alt="${widget.title}" loading="lazy">`;
    } else {
        mediaHTML = `<div class="tool-card-img-placeholder">${widget.icon || '🔧'}</div>`;
    }

    a.innerHTML = `
        ${mediaHTML}
        <div class="tool-card-body">
            <h2 class="tool-card-title">${widget.title}</h2>
            <p class="tool-card-desc">${widget.description}</p>
            <span class="tool-card-cta">開啟工具 →</span>
        </div>
    `;

    return a;
}

function renderWidgets() {
    const grid = document.getElementById('widget-grid');
    if (!grid) return;
    widgets.forEach(w => grid.appendChild(createCard(w)));
}

document.addEventListener('DOMContentLoaded', renderWidgets);
