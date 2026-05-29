// 悬浮地球面板 + 活体引擎 - 稳定占位版
(function() {
    if (window.__FLOATING_GLOBE_LOADED__) return;
    window.__FLOATING_GLOBE_LOADED__ = true;

    // ======================== 原有拖拽面板逻辑 ========================
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window && window.matchMedia("(pointer: coarse)").matches);

    const globe = document.createElement('div');
    globe.className = 'st-floating-globe';
    globe.innerHTML = '<span class="st-globe-icon">🌐</span>';
    document.body.appendChild(globe);

    const panel = document.createElement('div');
    panel.className = 'st-floating-panel';
    panel.innerHTML = `
        <div class="st-panel-header">
            <span class="st-panel-title">📋 活体世界引擎</span>
            <button class="st-panel-close" aria-label="关闭">✕</button>
        </div>
        <div class="st-panel-content" id="htyq-panel-content"></div>
    `;
    document.body.appendChild(panel);
    const closeBtn = panel.querySelector('.st-panel-close');

    const STORAGE_KEY_GLOBE = 'st_floating_globe_pos';
    const STORAGE_KEY_PANEL = 'st_floating_panel_pos';

    function getSavedPosition(key, defaultLeft, defaultTop, w, h) {
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const pos = JSON.parse(saved);
                let { left, top } = pos;
                const maxX = window.innerWidth - w;
                const maxY = window.innerHeight - h;
                left = Math.min(Math.max(left, 10), maxX);
                top = Math.min(Math.max(top, 10), maxY);
                return { left, top };
            } catch(e) {}
        }
        return { left: defaultLeft, top: defaultTop };
    }

    function savePosition(key, left, top) {
        localStorage.setItem(key, JSON.stringify({ left, top }));
    }

    function setPos(el, left, top) {
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    }

    function initGlobe() {
        const w = globe.offsetWidth, h = globe.offsetHeight;
        const defaultLeft = window.innerWidth - w - 20;
        const defaultTop = window.innerHeight - h - 20;
        const { left, top } = getSavedPosition(STORAGE_KEY_GLOBE, defaultLeft, defaultTop, w, h);
        setPos(globe, left, top);
    }

    function initPanel() {
        const w = panel.offsetWidth, h = panel.offsetHeight;
        const defaultLeft = Math.max(20, (window.innerWidth - w) / 2 + 40);
        const defaultTop = Math.max(20, (window.innerHeight - h) / 2);
        const { left, top } = getSavedPosition(STORAGE_KEY_PANEL, defaultLeft, defaultTop, w, h);
        setPos(panel, left, top);
    }

    function clampPosition(el, key) {
        const rect = el.getBoundingClientRect();
        let left = rect.left, top = rect.top;
        const w = rect.width, h = rect.height;
        const maxX = window.innerWidth - w;
        const maxY = window.innerHeight - h;
        let changed = false;
        if (left < 0) { left = 10; changed = true; }
        if (top < 0) { top = 10; changed = true; }
        if (left > maxX) { left = maxX - 10; changed = true; }
        if (top > maxY) { top = maxY - 10; changed = true; }
        if (changed) {
            setPos(el, left, top);
            savePosition(key, left, top);
        }
    }

    window.addEventListener('resize', () => {
        clampPosition(globe, STORAGE_KEY_GLOBE);
        if (panel.style.display !== 'none') clampPosition(panel, STORAGE_KEY_PANEL);
    });

    function makeDraggable(el, onDragEnd, handleSelector = null) {
        let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;
        const dragHandle = handleSelector ? el.querySelector(handleSelector) : el;
        if (!dragHandle) return;

        const onMove = (e) => {
            if (!dragging) return;
            e.preventDefault();
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            let newLeft = startLeft + (clientX - startX);
            let newTop = startTop + (clientY - startY);
            const maxX = window.innerWidth - el.offsetWidth;
            const maxY = window.innerHeight - el.offsetHeight;
            newLeft = Math.min(Math.max(newLeft, 0), maxX);
            newTop = Math.min(Math.max(newTop, 0), maxY);
            setPos(el, newLeft, newTop);
            if (onDragEnd) onDragEnd(newLeft, newTop);
        };
        const onUp = () => {
            if (!dragging) return;
            dragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
            document.body.style.userSelect = '';
        };
        const onDown = (e) => {
            if (e.target.closest && e.target.closest('.st-panel-close')) return;
            e.preventDefault();
            dragging = true;
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            startX = clientX; startY = clientY;
            startLeft = el.offsetLeft; startTop = el.offsetTop;
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
        };
        dragHandle.addEventListener('mousedown', onDown);
        dragHandle.addEventListener('touchstart', onDown, { passive: false });
    }

    makeDraggable(globe, (l,t) => savePosition(STORAGE_KEY_GLOBE, l, t));
    makeDraggable(panel, (l,t) => savePosition(STORAGE_KEY_PANEL, l, t), '.st-panel-header');

    let dragMoved = false, dragStarted = false;
    globe.addEventListener('mousedown', () => { dragMoved = false; dragStarted = true; });
    globe.addEventListener('touchstart', () => { dragMoved = false; dragStarted = true; });
    globe.addEventListener('mousemove', () => { if (dragStarted) dragMoved = true; });
    globe.addEventListener('touchmove', () => { if (dragStarted) dragMoved = true; });
    globe.addEventListener('mouseup', () => {
        if (dragStarted && !dragMoved) togglePanel();
        dragStarted = false; dragMoved = false;
    });
    globe.addEventListener('touchend', () => {
        if (dragStarted && !dragMoved) togglePanel();
        dragStarted = false; dragMoved = false;
    });

    let panelVisible = false;
    let outsideClickListener = null;

    function closePanel() {
        if (!panelVisible) return;
        panel.style.display = 'none';
        panelVisible = false;
        if (outsideClickListener) {
            document.removeEventListener('click', outsideClickListener);
            document.removeEventListener('touchstart', outsideClickListener);
            outsideClickListener = null;
        }
    }

    function openPanel() {
        if (panelVisible) return;
        if (panel.offsetWidth === 0) initPanel();
        else clampPosition(panel, STORAGE_KEY_PANEL);
        panel.style.display = 'flex';
        panelVisible = true;
        if (isMobile) {
            outsideClickListener = (e) => {
                if (!panel.contains(e.target) && !globe.contains(e.target)) closePanel();
            };
            document.addEventListener('click', outsideClickListener);
            document.addEventListener('touchstart', outsideClickListener);
        }
    }

    function togglePanel() {
        panelVisible ? closePanel() : openPanel();
    }

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePanel();
    });

    initGlobe();
    initPanel();
    panel.style.display = 'none';

    // ======================== 活体引擎占位内容 ========================
    // 确保面板打开时显示内容
    function showEnginePlaceholder() {
        const contentDiv = document.getElementById('htyq-panel-content');
        if (contentDiv && contentDiv.innerHTML.trim() === '') {
            contentDiv.innerHTML = `
                <div style="padding:20px; text-align:center;">
                    <h3>🌍 活体引擎即将上线</h3>
                    <p>完整版本正在准备中...</p>
                    <button id="test-btn" style="background:#3b82f6; color:white; border:none; padding:8px 16px; border-radius:6px; margin-top:10px;">测试交互</button>
                </div>
            `;
            document.getElementById('test-btn')?.addEventListener('click', () => alert('悬浮球拖拽功能正常，引擎占位运行中'));
        }
    }

    // 监听面板打开
    const originalOpenPanel = openPanel;
    window.openPanel = openPanel;
    openPanel = function() {
        originalOpenPanel();
        setTimeout(showEnginePlaceholder, 50);
    };
    // 覆盖全局引用
    window.openPanel = openPanel;
    showEnginePlaceholder();
})();
