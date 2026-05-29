// 悬浮地球面板 - 修复动态加载路径
(function() {
    if (window.__FLOATING_GLOBE_LOADED__) return;
    window.__FLOATING_GLOBE_LOADED__ = true;

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window && window.matchMedia("(pointer: coarse)").matches);

    // 创建悬浮球
    const globe = document.createElement('div');
    globe.className = 'st-floating-globe';
    globe.innerHTML = '<span class="st-globe-icon">🌐</span>';
    document.body.appendChild(globe);

    // 创建面板
    const panel = document.createElement('div');
    panel.className = 'st-floating-panel';
    panel.innerHTML = `
        <div class="st-panel-header">
            <span class="st-panel-title">📋 活体世界引擎</span>
            <button class="st-panel-close" aria-label="关闭">✕</button>
        </div>
        <div class="st-panel-content" id="htyq-panel-content">
            <div style="padding: 20px; text-align: center; color: #aaa;">
                ⏳ 加载引擎模块中...
            </div>
        </div>
    `;
    document.body.appendChild(panel);
    const closeBtn = panel.querySelector('.st-panel-close');

    const STORAGE_KEY_GLOBE = 'st_floating_globe_pos';
    const STORAGE_KEY_PANEL = 'st_floating_panel_pos';

    // 位置辅助函数
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
        // 设置面板默认尺寸（PC端）
        if (window.innerWidth > 768) {
            panel.style.width = '540px';
            panel.style.height = '600px';
        }
        const w = panel.offsetWidth, h = panel.offsetHeight;
        const defaultLeft = Math.max(20, (window.innerWidth - w) / 2);
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

    // 拖拽逻辑（与原版相同，略）
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

    // 开关面板逻辑
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
        // 每次打开面板时，如果引擎未加载则加载
        if (!window.__HTYQ_ENGINE_LOADED__) {
            loadEngineModules();
        }
    }

    function togglePanel() {
        panelVisible ? closePanel() : openPanel();
    }

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePanel();
    });

    // ---------- 动态加载模块（路径自动检测）----------
    function getScriptBaseUrl() {
        // 方法1：从当前运行的脚本中查找 main.js 的路径
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src;
            if (src && src.includes('main.js')) {
                return src.substring(0, src.lastIndexOf('/'));
            }
        }
        // 方法2：降级使用相对路径（假设插件放在 plugins 目录下）
        return './plugins/floating-globe-panel';  // 如果上面失败，请手动修改为您的实际文件夹名
    }

    function loadEngineModules() {
        const baseUrl = getScriptBaseUrl();
        console.log('模块加载基础路径:', baseUrl);
        const modules = ['htyq-rules.js', 'htyq-state.js', 'htyq-ui.js', 'htyq-evolution.js'];
        let loadedCount = 0;
        let errors = [];

        function onModuleLoaded() {
            loadedCount++;
            if (loadedCount === modules.length) {
                if (window.HTYQ_UI && window.HTYQ_UI.buildUI) {
                    window.HTYQ_UI.buildUI();
                    console.log('活体引擎UI已构建');
                } else {
                    console.error('UI模块未正确加载');
                    document.getElementById('htyq-panel-content').innerHTML = '<div style="padding:20px;color:red;">UI模块加载失败，请刷新页面重试。</div>';
                }
                if (window.HTYQ_EVOLUTION && window.HTYQ_EVOLUTION.start) {
                    window.HTYQ_EVOLUTION.start();
                }
                window.__HTYQ_ENGINE_LOADED__ = true;
            }
        }

        function onModuleError(module) {
            errors.push(module);
            console.error(`加载模块失败: ${module}`);
            document.getElementById('htyq-panel-content').innerHTML = `
                <div style="padding:20px;color:red;">
                    <strong>模块加载失败</strong><br>
                    无法加载 ${module}，请确保文件存在于插件目录。<br>
                    当前路径: ${baseUrl}/${module}<br>
                    可能原因：文件缺失或路径不正确。
                </div>
            `;
        }

        modules.forEach(module => {
            const script = document.createElement('script');
            script.src = `${baseUrl}/${module}`;
            script.onload = onModuleLoaded;
            script.onerror = () => onModuleError(module);
            document.head.appendChild(script);
        });

        // 设置超时，防止永远卡住
        setTimeout(() => {
            if (loadedCount < modules.length) {
                const missing = modules.filter(m => !window[`__HTYQ_${m.toUpperCase().replace('.js','')}_LOADED__`]);
                if (missing.length) {
                    document.getElementById('htyq-panel-content').innerHTML = `
                        <div style="padding:20px;color:orange;">
                            <strong>加载超时</strong><br>
                            以下模块未加载成功：${missing.join(', ')}<br>
                            请检查文件是否存在并刷新页面。
                        </div>
                    `;
                }
            }
        }, 10000);
    }

    initGlobe();
    initPanel();
    panel.style.display = 'none';
})();
