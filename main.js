// ── Tool registry ──────────────────────────────────────────────────
// To add a new tool: append an object to this array.
// size is ignored now (cards are always 1-col in the 3-col grid).
const widgets = [
    {
        id: 'diy-pattern-generator',
        title: 'DIY 圖樣生成器',
        description: '上傳 PNG 圖片，快速生成各種可愛的背景圖樣與無縫圖樣Pattern素材。',
        image: './assets/card-pattern.png',
        path: './diy-pattern-generator/index.html',
    },
    {
        id: 'image-ultra-resizer',
        title: '圖片快捷縮放工具',
        description: '一鍵將高解析圖片輸出為三種尺寸供網頁用（XL / S / WebP）',
        image: './assets/card-resizer.png',
        path: './image-ultra-resizer/index.html',
    },
    {
        id: 'collage-studio',
        title: 'STITCHER STUDIO',
        description: '圖片拼接小幫手，輕鬆整理多張變一大張的JPG。',
        image: './assets/card-collage.png',
        path: './collage-studio/index.html',
    },
    {
        id: 'coming-soon',
        title: '即將推出...',
        description: '更多有趣的小工具正在開發中，敬請期待！',
        image: null,       // null = show emoji placeholder
        icon: '✨',
        path: '#',
    },
];

// ── Render ─────────────────────────────────────────────────────────
function createCard(widget) {
    const a = document.createElement('a');
    a.href = widget.path;
    a.className = 'tool-card';
    a.id = `tool-${widget.id}`;

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
