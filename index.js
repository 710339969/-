import { extension_settings, getContext, loadExtensionSettings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { createPopup, callGenericPopup, POPUP_TYPE } from '../../../../popup.js';

const extensionName = 'Floating Ball Panel';
const extensionId = 'floating-ball-panel';

// 默认设置
const defaultSettings = {
    ballSize: 50,
    panelWidth: 400,
    panelHeight: 500,
    ballPosition: { x: 20, y: 20 },
    panelPosition: { x: 100, y: 100 },
    isPanelOpen: false,
};

// 全局变量
let settings = { ...defaultSettings };
let floatingBall = null;
let panel = null;
let isDraggingBall = false;
let isDraggingPanel = false;
let dragOffset = { x: 0, y: 0 };
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// 初始化扩展
async function init() {
    // 加载设置
    await loadExtensionSettings(extensionId);
    Object.assign(settings, extension_settings[extensionId] || {});
    
    // 创建悬浮球和面板
    createFloatingBall();
    createPanel();
    
    // 绑定事件
    bindEvents();
    
    console.log(`[${extensionName}] 扩展已初始化`);
}

// 创建悬浮球
function createFloatingBall() {
    floatingBall = document.createElement('div');
    floatingBall.id = 'st-floating-ball';
    floatingBall.className = 'st-floating-ball';
    floatingBall.style.width = `${settings.ballSize}px`;
    floatingBall.style.height = `${settings.ballSize}px`;
    floatingBall.style.left = `${settings.ballPosition.x}px`;
    floatingBall.style.top = `${settings.ballPosition.y}px`;
    
    // 地球图标
    floatingBall.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
    `;
    
    document.body.appendChild(floatingBall);
}

// 创建面板
function createPanel() {
    panel = document.createElement('div');
    panel.id = 'st-floating-panel';
    panel.className = 'st-floating-panel';
    panel.style.width = `${settings.panelWidth}px`;
    panel.style.height = `${settings.panelHeight}px`;
    panel.style.left = `${settings.panelPosition.x}px`;
    panel.style.top = `${settings.panelPosition.y}px`;
    panel.style.display = settings.isPanelOpen ? 'flex' : 'none';
    
    panel.innerHTML = `
        <div class="st-floating-panel-header">
            <span class="st-floating-panel-title">空白面板</span>
            <button class="st-floating-panel-close">×</button>
        </div>
        <div class="st-floating-panel-content">
            <!-- 这里可以添加你的内容 -->
            <div class="st-floating-panel-placeholder">
                <p>这是一个空白面板</p>
                <p>你可以在这里添加任何内容</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
}

// 绑定事件
function bindEvents() {
    // 悬浮球点击事件
    floatingBall.addEventListener('click', togglePanel);
    
    // 悬浮球拖拽事件
    floatingBall.addEventListener('mousedown', startDragBall);
    floatingBall.addEventListener('touchstart', startDragBall, { passive: false });
    
    // 面板拖拽事件
    panel.querySelector('.st-floating-panel-header').addEventListener('mousedown', startDragPanel);
    panel.querySelector('.st-floating-panel-header').addEventListener('touchstart', startDragPanel, { passive: false });
    
    // 关闭按钮事件
    panel.querySelector('.st-floating-panel-close').addEventListener('click', closePanel);
    
    // 全局事件
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', handleDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
    
    // 手机端点击外部关闭
    if (isMobile) {
        document.addEventListener('click', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick);
    }
    
    // 窗口大小变化事件
    window.addEventListener('resize', handleResize);
}

// 切换面板显示/隐藏
function togglePanel(e) {
    if (isDraggingBall) return;
    
    if (settings.isPanelOpen) {
        closePanel();
    } else {
        openPanel();
    }
}

// 打开面板
function openPanel() {
    settings.isPanelOpen = true;
    panel.style.display = 'flex';
    floatingBall.classList.add('active');
    saveSettings();
}

// 关闭面板
function closePanel() {
    settings.isPanelOpen = false;
    panel.style.display = 'none';
    floatingBall.classList.remove('active');
    saveSettings();
}

// 开始拖拽悬浮球
function startDragBall(e) {
    e.preventDefault();
    isDraggingBall = true;
    
    const rect = floatingBall.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    
    floatingBall.style.zIndex = '10000';
}

// 开始拖拽面板
function startDragPanel(e) {
    e.preventDefault();
    isDraggingPanel = true;
    
    const rect = panel.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    
    panel.style.zIndex = '10000';
}

// 处理拖拽
function handleDrag(e) {
    if (isDraggingBall) {
        e.preventDefault();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        let x = clientX - dragOffset.x;
        let y = clientY - dragOffset.y;
        
        // 限制在屏幕内
        x = Math.max(0, Math.min(x, window.innerWidth - settings.ballSize));
        y = Math.max(0, Math.min(y, window.innerHeight - settings.ballSize));
        
        floatingBall.style.left = `${x}px`;
        floatingBall.style.top = `${y}px`;
        
        settings.ballPosition = { x, y };
    } else if (isDraggingPanel) {
        e.preventDefault();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        let x = clientX - dragOffset.x;
        let y = clientY - dragOffset.y;
        
        // 限制在屏幕内
        x = Math.max(0, Math.min(x, window.innerWidth - settings.panelWidth));
        y = Math.max(0, Math.min(y, window.innerHeight - settings.panelHeight));
        
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        
        settings.panelPosition = { x, y };
    }
}

// 停止拖拽
function stopDrag() {
    if (isDraggingBall || isDraggingPanel) {
        isDraggingBall = false;
        isDraggingPanel = false;
        saveSettings();
    }
}

// 处理手机端点击外部关闭
function handleOutsideClick(e) {
    if (!settings.isPanelOpen) return;
    
    const target = e.target;
    if (!panel.contains(target) && !floatingBall.contains(target)) {
        closePanel();
    }
}

// 处理窗口大小变化
function handleResize() {
    // 调整悬浮球位置
    let x = Math.min(settings.ballPosition.x, window.innerWidth - settings.ballSize);
    let y = Math.min(settings.ballPosition.y, window.innerHeight - settings.ballSize);
    
    floatingBall.style.left = `${x}px`;
    floatingBall.style.top = `${y}px`;
    
    // 调整面板位置
    x = Math.min(settings.panelPosition.x, window.innerWidth - settings.panelWidth);
    y = Math.min(settings.panelPosition.y, window.innerHeight - settings.panelHeight);
    
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    
    saveSettings();
}

// 保存设置
function saveSettings() {
    Object.assign(extension_settings[extensionId], settings);
    saveSettingsDebounced();
}

// 初始化
init();