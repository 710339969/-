(function() {
    if (window.__HTYQ_ENGINE_LOADED__) return;
    window.__HTYQ_ENGINE_LOADED__ = true;
    console.log('活体引擎测试脚本已加载');

    // 等待面板内容区出现
    const container = document.getElementById('st-panel-content');
    if (!container) {
        console.error('未找到面板容器');
        return;
    }
    container.innerHTML = '<p>✅ 活体引擎测试成功！即将加载完整界面...</p>';
    // 在这里加载完整引擎代码（稍后替换）
})();
