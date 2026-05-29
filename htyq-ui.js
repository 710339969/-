// UI 渲染模块 - 含世界书条目选择
window.HTYQ_UI = (function() {
    const STATE = window.HTYQ_STATE;
    if (!STATE) { console.error('HTYQ_STATE 未加载'); return {}; }

    let currentTab = 'dashboard';
    let isEditing = false;

    function escapeHtml(str) { return STATE.escapeHtml(str); }

    // ---------- 获取当前所有世界书条目（用于显示）----------
    function getAllWorldInfoEntries() {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            return ctx.worldInfo?.entries || [];
        } catch(e) { return []; }
    }

    // ---------- 渲染各个标签页 ----------
    function renderDashboard(container) { /* 与之前相同，略，保持简洁 */ 
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-card"><h3>🌍 世界状态摘要</h3><div class="htyq-digest">${escapeHtml(s.worldDigest)}</div></div>
            <div class="htyq-card"><h3>⭐ 星象分野</h3><div>${escapeHtml(s.astrology)}</div></div>
            <div class="htyq-card"><h3>🔥 活跃事件链</h3><ul>${s.events.slice(0,3).map(e => `<li>【${escapeHtml(e.name)}】${escapeHtml(e.stage)} (${e.currentRound}/${e.totalRounds}轮)</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>🗣️ 最新流言</h3><ul>${s.rumors.slice(0,3).map(r => `<li>${escapeHtml(r.text.substring(0,80))}...</li>`).join('') || '<li>无</li>'}</ul></div>
        `;
    }
    function renderChronicle(container) { /* 省略，保持原样 */ }
    function renderEvents(container) { /* 省略 */ }
    function renderFactions(container) { /* 省略 */ }
    function renderRelations(container) { /* 省略 */ }
    function renderRumors(container) { /* 省略 */ }
    function renderEconomy(container) { /* 省略 */ }
    function renderBlackMarket(container) { /* 省略 */ }
    function renderReputation(container) { /* 省略 */ }

    // 重点：设置页面，包含世界书条目选择
    function renderSettings(container) {
        const set = STATE.globalApiSettings;
        const entries = getAllWorldInfoEntries();
        const selectedIds = STATE.worldState.selectedWorldInfoEntries || [];

        container.innerHTML = `
            <div class="htyq-settings-section">
                <h3>🔌 API 设置</h3>
                <div class="htyq-option-row"><label><input type="radio" name="apiMode" value="tavern" ${set.apiMode === 'tavern' ? 'checked' : ''}> 使用酒馆自带模型</label></div>
                <div class="htyq-option-row"><label><input type="radio" name="apiMode" value="custom" ${set.apiMode === 'custom' ? 'checked' : ''}> 使用自定义API</label></div>
                <div id="htyq-custom-settings" style="display: ${set.apiMode === 'custom' ? 'block' : 'none'}; margin-left: 20px;">
                    <input type="text" id="htyq-custom-url" placeholder="API Base URL" value="${escapeHtml(set.customUrl)}" style="width:100%; margin-bottom:5px;">
                    <input type="password" id="htyq-custom-key" placeholder="API Key" value="${escapeHtml(set.customKey)}" style="width:100%; margin-bottom:5px;">
                    <input type="text" id="htyq-custom-model" placeholder="模型名称" value="${escapeHtml(set.customModel)}" style="width:100%; margin-bottom:5px;">
                    <button id="htyq-fetch-models" class="htyq-small-btn">获取模型列表</button>
                    <select id="htyq-model-list" style="display:none; width:100%; margin-top:5px;"></select>
                </div>
                <button id="htyq-save-api" class="htyq-small-btn">保存API设置</button>
            </div>
            <div class="htyq-settings-section">
                <h3>⚙️ 引擎设置</h3>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-auto-inject" ${set.autoInject ? 'checked' : ''}> 自动注入世界摘要到AI</label></div>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-auto-poll" ${set.autoPollMode === 'auto' ? 'checked' : ''}> 自动推演 (每轮对话后)</label></div>
                <div id="htyq-poll-interval-group" style="display: ${set.autoPollMode === 'auto' ? 'block' : 'none'}; margin-left:20px;">
                    每 <input type="number" id="htyq-poll-interval" value="${set.autoPollInterval}" min="1" style="width:70px;"> 轮推演一次
                </div>
                <button id="htyq-save-engine" class="htyq-small-btn">保存引擎设置</button>
            </div>
            <div class="htyq-settings-section">
                <h3>📖 世界书条目绑定（按需勾选）</h3>
                <div id="htyq-worldinfo-entries-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #334155; padding: 8px; border-radius: 8px; background: #0f172a;">
                    ${entries.map(entry => `
                        <label class="htyq-checkbox-label" style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                            <input type="checkbox" data-uid="${entry.uid}" ${selectedIds.includes(String(entry.uid)) ? 'checked' : ''} style="margin-top: 2px;">
                            <div style="margin-left: 8px;">
                                <strong>${escapeHtml(entry.comment || '未命名')}</strong><br>
                                <span style="font-size: 11px; color: #94a3b8;">${escapeHtml((entry.content || '').substring(0, 100))}...</span>
                            </div>
                        </label>
                    `).join('') || '<div style="color:#64748b;">当前没有世界书条目，请先在酒馆中激活世界书。</div>'}
                </div>
                <button id="htyq-save-worldinfo-entries" class="htyq-small-btn" style="margin-top: 12px;">保存勾选的世界书条目</button>
                <div style="margin-top: 12px;">
                    <label>额外自定义背景（总是注入）:</label>
                    <textarea id="htyq-custom-worldinfo" rows="3" style="width:100%; background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:6px; padding:8px;">${escapeHtml(set.customWorldInfo)}</textarea>
                </div>
            </div>
            <div class="htyq-settings-section">
                <h3>🎲 DLC 开关</h3>
                <div id="htyq-dlcs-container" style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px;"></div>
                <button id="htyq-save-dlcs" class="htyq-small-btn">保存DLC设置</button>
            </div>
            <div class="htyq-settings-section">
                <h3>📁 数据管理</h3>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="htyq-reset-world" class="htyq-small-btn" style="background:#ef4444;">重置当前聊天世界</button>
                    <button id="htyq-export-world" class="htyq-small-btn" style="background:#3b82f6;">导出世界状态</button>
                    <button id="htyq-import-world" class="htyq-small-btn" style="background:#3b82f6;">导入世界状态</button>
                </div>
            </div>
        `;

        // 填充 DLC 复选框
        const dlcMap = { world_engine:'活体世界引擎', group_dynamics:'社会群体法则', active_contact:'主动接触判定', revenge:'恩怨录', blackmarket:'黑市', economy:'经济脉搏', accident:'意外事件', reputation:'声誉系统', power_peak:'权力顶点', group_relation:'团体关系', secret_asset:'信息黑盒' };
        const dlcContainer = document.getElementById('htyq-dlcs-container');
        if (dlcContainer) {
            dlcContainer.innerHTML = '';
            for (const [key, label] of Object.entries(dlcMap)) {
                const checked = set.enabledDlcs[key] !== false;
                dlcContainer.innerHTML += `<label class="htyq-checkbox-label"><input type="checkbox" data-dlc="${key}" ${checked ? 'checked' : ''}> ${label}</label>`;
            }
        }

        // 绑定事件
        document.querySelectorAll('input[name="apiMode"]').forEach(r => r.addEventListener('change', (e) => {
            document.getElementById('htyq-custom-settings').style.display = e.target.value === 'custom' ? 'block' : 'none';
        }));
        document.getElementById('htyq-auto-poll')?.addEventListener('change', (e) => {
            document.getElementById('htyq-poll-interval-group').style.display = e.target.checked ? 'block' : 'none';
        });
        document.getElementById('htyq-fetch-models')?.addEventListener('click', async () => {
            // 获取模型列表（代码略，与之前相同）
        });
        document.getElementById('htyq-save-api')?.addEventListener('click', () => {
            const selected = document.querySelector('input[name="apiMode"]:checked');
            if (selected) STATE.globalApiSettings.apiMode = selected.value;
            STATE.globalApiSettings.customUrl = document.getElementById('htyq-custom-url')?.value || '';
            STATE.globalApiSettings.customKey = document.getElementById('htyq-custom-key')?.value || '';
            STATE.globalApiSettings.customModel = document.getElementById('htyq-custom-model')?.value || '';
            STATE.saveGlobalSettings();
            STATE.showFloatingWarning('API设置已保存', false);
        });
        document.getElementById('htyq-save-engine')?.addEventListener('click', () => {
            STATE.globalApiSettings.autoInject = document.getElementById('htyq-auto-inject')?.checked || false;
            STATE.globalApiSettings.autoPollMode = document.getElementById('htyq-auto-poll')?.checked ? 'auto' : 'manual';
            const interval = document.getElementById('htyq-poll-interval');
            if (interval) STATE.globalApiSettings.autoPollInterval = parseInt(interval.value) || 1;
            STATE.saveGlobalSettings();
            STATE.showFloatingWarning('引擎设置已保存', false);
        });
        document.getElementById('htyq-save-worldinfo-entries')?.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#htyq-worldinfo-entries-list input[type="checkbox"]');
            const selected = [];
            checkboxes.forEach(cb => { if (cb.checked) selected.push(cb.dataset.uid); });
            STATE.worldState.selectedWorldInfoEntries = selected;
            STATE.saveWorldState();
            STATE.showFloatingWarning(`已保存 ${selected.length} 个世界书条目`, false);
        });
        document.getElementById('htyq-save-dlcs')?.addEventListener('click', () => {
            document.querySelectorAll('#htyq-dlcs-container input[type="checkbox"]').forEach(cb => {
                STATE.globalApiSettings.enabledDlcs[cb.dataset.dlc] = cb.checked;
            });
            STATE.saveGlobalSettings();
            STATE.showFloatingWarning('DLC设置已保存', false);
        });
        document.getElementById('htyq-reset-world')?.addEventListener('click', () => {
            if (confirm('重置当前聊天世界？')) { STATE.worldState = STATE.getDefaultWorldState(); STATE.saveWorldState(); renderCurrentTab(); STATE.showFloatingWarning('世界已重置', false); }
        });
        document.getElementById('htyq-export-world')?.addEventListener('click', () => {
            const dataStr = JSON.stringify(STATE.worldState, null, 2);
            const blob = new Blob([dataStr], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `htyq_world_${STATE.getCurrentChatId()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        document.getElementById('htyq-import-world')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const imported = JSON.parse(ev.target.result);
                        STATE.worldState = { ...STATE.worldState, ...imported };
                        STATE.saveWorldState();
                        renderCurrentTab();
                        STATE.showFloatingWarning('世界状态导入成功', false);
                    } catch(err) { STATE.showFloatingWarning('导入失败', true); }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }

    function renderCurrentTab() {
        const viewDiv = document.getElementById(`htyq-view-${currentTab}`);
        if (!viewDiv) return;
        switch (currentTab) {
            case 'dashboard': renderDashboard(viewDiv); break;
            case 'chronicle': renderChronicle(viewDiv); break;
            case 'events': renderEvents(viewDiv); break;
            case 'factions': renderFactions(viewDiv); break;
            case 'relations': renderRelations(viewDiv); break;
            case 'rumors': renderRumors(viewDiv); break;
            case 'economy': renderEconomy(viewDiv); break;
            case 'blackmarket': renderBlackMarket(viewDiv); break;
            case 'reputation': renderReputation(viewDiv); break;
            case 'settings': renderSettings(viewDiv); break;
        }
        const roundSpan = document.getElementById('htyq-round');
        const goldSpan = document.getElementById('htyq-gold');
        if (roundSpan) roundSpan.textContent = STATE.worldState.round;
        if (goldSpan) goldSpan.textContent = STATE.worldState.economy.userGold;
    }

    function buildUI() {
        const container = document.getElementById('htyq-panel-content');
        if (!container) return;
        container.innerHTML = `
            <div class="htyq-tabs">
                <select id="htyq-tab-select" class="htyq-mobile-select" style="display:none;"></select>
                <div class="htyq-tab-buttons">
                    <button data-tab="dashboard" class="htyq-tab-btn active">📊 仪表</button>
                    <button data-tab="chronicle" class="htyq-tab-btn">📜 编年史</button>
                    <button data-tab="events" class="htyq-tab-btn">⚡ 事件链</button>
                    <button data-tab="factions" class="htyq-tab-btn">🏛️ 势力</button>
                    <button data-tab="relations" class="htyq-tab-btn">🔗 关系</button>
                    <button data-tab="rumors" class="htyq-tab-btn">🗣️ 流言</button>
                    <button data-tab="economy" class="htyq-tab-btn">💰 经济</button>
                    <button data-tab="blackmarket" class="htyq-tab-btn">🕶️ 黑市</button>
                    <button data-tab="reputation" class="htyq-tab-btn">⭐ 声誉</button>
                    <button data-tab="settings" class="htyq-tab-btn">⚙️ 设置</button>
                </div>
            </div>
            <div class="htyq-view active" id="htyq-view-dashboard"></div>
            <div class="htyq-view" id="htyq-view-chronicle"></div>
            <div class="htyq-view" id="htyq-view-events"></div>
            <div class="htyq-view" id="htyq-view-factions"></div>
            <div class="htyq-view" id="htyq-view-relations"></div>
            <div class="htyq-view" id="htyq-view-rumors"></div>
            <div class="htyq-view" id="htyq-view-economy"></div>
            <div class="htyq-view" id="htyq-view-blackmarket"></div>
            <div class="htyq-view" id="htyq-view-reputation"></div>
            <div class="htyq-view" id="htyq-view-settings"></div>
            <div class="htyq-footer">
                <button id="htyq-evolve-btn" class="htyq-evolve-btn">🌀 手动推演一轮</button>
                <div class="htyq-stats">轮次: <span id="htyq-round">0</span> | 金币: <span id="htyq-gold">0</span></div>
            </div>
        `;
        const tabBtns = container.querySelectorAll('.htyq-tab-btn');
        const views = container.querySelectorAll('.htyq-view');
        const mobileSelect = container.querySelector('#htyq-tab-select');
        function switchTab(tabId) {
            currentTab = tabId;
            tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
            views.forEach(view => view.classList.toggle('active', view.id === `htyq-view-${tabId}`));
            if (mobileSelect) mobileSelect.value = tabId;
            renderCurrentTab();
        }
        tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
        if (mobileSelect) mobileSelect.addEventListener('change', (e) => switchTab(e.target.value));
        const evolveBtn = document.getElementById('htyq-evolve-btn');
        if (evolveBtn) evolveBtn.addEventListener('click', () => { if (window.HTYQ_EVOLUTION) window.HTYQ_EVOLUTION.runEvolution(true); });
        function adjustForMobile() {
            const isM = window.innerWidth < 768;
            const btnDiv = container.querySelector('.htyq-tab-buttons');
            if (isM) {
                if (btnDiv) btnDiv.style.display = 'none';
                if (mobileSelect) {
                    mobileSelect.style.display = 'block';
                    mobileSelect.innerHTML = '';
                    const tabs = ['dashboard','chronicle','events','factions','relations','rumors','economy','blackmarket','reputation','settings'];
                    tabs.forEach(t => { const opt = document.createElement('option'); opt.value = t; opt.textContent = t.charAt(0).toUpperCase() + t.slice(1); if (t === currentTab) opt.selected = true; mobileSelect.appendChild(opt); });
                }
            } else {
                if (btnDiv) btnDiv.style.display = 'flex';
                if (mobileSelect) mobileSelect.style.display = 'none';
            }
        }
        window.addEventListener('resize', adjustForMobile);
        adjustForMobile();
        renderCurrentTab();
    }

    function refresh() { renderCurrentTab(); }
    return { buildUI, refresh, setEditingMode: (editing) => { isEditing = editing; refresh(); }, getEditingMode: () => isEditing };
})();
