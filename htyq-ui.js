// UI 渲染模块 - 完整修复版（修复流言显示、实现完整渲染、世界书列表本地获取）
window.HTYQ_UI = (function() {
    const STATE = window.HTYQ_STATE;
    if (!STATE) { console.error('HTYQ_STATE 未加载'); return {}; }

    let currentTab = 'dashboard';
    let isEditing = false;
    function escapeHtml(str) { return STATE.escapeHtml(str); }

    // 【修复】直接通过 context.worldInfo.entries 获取世界书列表（无需 HTTP 请求）
    async function getAllWorlds() {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            const entries = ctx.worldInfo?.entries || [];
            const worlds = new Set();
            for (const entry of entries) {
                if (entry.world) worlds.add(entry.world);
            }
            return Array.from(worlds);
        } catch(e) {
            console.warn('获取世界书列表失败', e);
            return [];
        }
    }

    function getActiveWorlds() {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            if (ctx.worldInfo && ctx.worldInfo.entries) {
                const worlds = new Set();
                ctx.worldInfo.entries.forEach(entry => { if (entry.world) worlds.add(entry.world); });
                return Array.from(worlds);
            }
        } catch(e) {}
        return [];
    }

    // ---------- 渲染函数（完整实现）----------
    function renderDashboard(container) {
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-card"><h3>🌍 世界状态摘要</h3><div class="htyq-digest">${escapeHtml(s.worldDigest)}</div></div>
            <div class="htyq-card"><h3>⭐ 星象分野</h3><div>${escapeHtml(s.astrology)}</div></div>
            <div class="htyq-card"><h3>🔥 活跃事件链</h3><ul>${s.events.slice(0,3).map(e => `<li>【${escapeHtml(e.name)}】${escapeHtml(e.stage || '萌芽')} (${e.currentRound || 0}/${e.totalRounds || 0}轮)</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>🗣️ 最新流言</h3><ul>${s.rumors.slice(0,3).map(r => `<li>${escapeHtml((r.content || r.text || '')).substring(0,80)}...</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>💰 经济趋势</h3><div>${escapeHtml(s.economy.marketTrend)}</div></div>
            <div class="htyq-card"><h3>⭐ 声誉</h3><div>江湖:${s.reputation.jianghu} 官府:${s.reputation.official} 民间:${s.reputation.folk} 黑道:${s.reputation.underworld}</div></div>
        `;
    }

    function renderChronicle(container) {
        const s = STATE.worldState;
        if (!s.chronicles.length) {
            container.innerHTML = '<div class="htyq-card">暂无编年史记录</div>';
            return;
        }
        container.innerHTML = `<div class="htyq-chronicle-list">${s.chronicles.map(c => `
            <div class="htyq-chronicle-item">
                <div class="htyq-chronicle-title">${escapeHtml(c.title)}</div>
                <div class="htyq-chronicle-content">${escapeHtml(c.content)}</div>
                <div class="htyq-chronicle-date">第${c.round}轮 · ${new Date(c.timestamp).toLocaleString()}</div>
            </div>
        `).join('')}</div>`;
    }

    function renderEvents(container) {
        const s = STATE.worldState;
        if (!s.events.length) {
            container.innerHTML = '<div class="htyq-card">暂无事件链</div>';
            return;
        }
        container.innerHTML = s.events.map(e => `
            <div class="htyq-event-item">
                <strong>${escapeHtml(e.name)}</strong> (Lv.${e.level || '?'})<br>
                阶段: ${escapeHtml(e.stage || '萌芽')} (${e.currentRound || 0}/${e.totalRounds || 0})<br>
                描述: ${escapeHtml(e.desc || '')}
            </div>
        `).join('');
    }

    function renderFactions(container) {
        const s = STATE.worldState;
        if (!s.factions.length) {
            container.innerHTML = '<div class="htyq-card">暂无势力</div>';
            return;
        }
        container.innerHTML = s.factions.map(f => `
            <div class="htyq-faction-item">
                <strong>${escapeHtml(f.name)}</strong><br>
                目标: ${escapeHtml(f.current_goal || '无')}<br>
                进度: ${escapeHtml(f.progress || '未知')}<br>
                凝聚力: ${escapeHtml(f.cohesion || '未知')} | 资源: ${escapeHtml(f.resources || '未知')}<br>
                对主角关注: ${escapeHtml(f.attention_to_user || '无')}
            </div>
        `).join('');
    }

    function renderRelations(container) {
        const s = STATE.worldState;
        if (!s.factionRelations.length) {
            container.innerHTML = '<div class="htyq-card">暂无团体关系</div>';
            return;
        }
        container.innerHTML = s.factionRelations.map(r => `
            <div class="htyq-relation-item">
                ${escapeHtml(r.factionA)} ↔ ${escapeHtml(r.factionB)}<br>
                关系: ${escapeHtml(r.relation)} (${r.level || '?'}/8) | 趋势: ${escapeHtml(r.trend || '稳定')}
            </div>
        `).join('');
    }

    function renderRumors(container) {
        const s = STATE.worldState;
        if (!s.rumors.length) {
            container.innerHTML = '<div class="htyq-card">暂无流言</div>';
            return;
        }
        container.innerHTML = s.rumors.map(r => `
            <div class="htyq-rumor-item">
                <strong>${escapeHtml(r.type || '流言')}</strong><br>
                ${escapeHtml(r.content || r.text || '')}<br>
                <small>范围: ${escapeHtml(r.scope || '未知')} | 可信度: ${escapeHtml(r.credibility || '未知')} | 来源: ${escapeHtml(r.source || '未知')}</small>
            </div>
        `).join('');
    }

    function renderEconomy(container) {
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-card"><h3>💰 玩家资金</h3><div>${s.economy.userGold} 金币</div></div>
            <div class="htyq-card"><h3>📈 市场趋势</h3><div>${escapeHtml(s.economy.marketTrend)}</div></div>
            <div class="htyq-card"><h3>📦 关键物资</h3><ul>${(s.economy.keyResources || []).map(k => `<li>${escapeHtml(k)}</li>`).join('') || '<li>无</li>'}</ul></div>
        `;
    }

    function renderBlackMarket(container) {
        const s = STATE.worldState;
        if (!s.blackMarket.length) {
            container.innerHTML = '<div class="htyq-card">暂无黑市交易</div>';
            return;
        }
        container.innerHTML = s.blackMarket.map(item => `
            <div class="htyq-blackmarket-item">
                <strong>${escapeHtml(item.type)}</strong><br>
                ${escapeHtml(item.description)}<br>
                价格: ${escapeHtml(item.price)} | 风险: ${escapeHtml(item.risk)}
            </div>
        `).join('');
    }

    function renderReputation(container) {
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-card">
                <h3>⭐ 四维声誉</h3>
                <div class="htyq-reputation-grid">
                    <div>江湖声望: ${s.reputation.jianghu}</div>
                    <div>官府评价: ${s.reputation.official}</div>
                    <div>民间口碑: ${s.reputation.folk}</div>
                    <div>黑道地位: ${s.reputation.underworld}</div>
                </div>
            </div>
        `;
    }

    // 设置页面（保持不变，但内部 getAllWorlds 已修复）
    function renderSettings(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;

        container.innerHTML = `
            <div class="htyq-settings-section">
                <h3>🔌 API 设置</h3>
                <div class="htyq-option-row"><label><input type="radio" name="apiMode" value="tavern" ${set.apiMode === 'tavern' ? 'checked' : ''}> 使用酒馆自带模型</label></div>
                <div class="htyq-option-row"><label><input type="radio" name="apiMode" value="custom" ${set.apiMode === 'custom' ? 'checked' : ''}> 使用自定义API</label></div>
                <div id="htyq-custom-settings" style="display: ${set.apiMode === 'custom' ? 'block' : 'none'}; margin-left:20px;">
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
                <h3>📚 世界书绑定</h3>
                <div class="htyq-option-row"><label><input type="radio" name="worldBindMode" value="auto" ${worldState.autoBindCharacterWorld ? 'checked' : ''}> 自动跟随角色卡绑定的世界书</label></div>
                <div class="htyq-option-row"><label><input type="radio" name="worldBindMode" value="manual" ${!worldState.autoBindCharacterWorld ? 'checked' : ''}> 手动选择世界书（可多选）</label></div>
                <div id="htyq-manual-worlds-container" style="margin-left: 20px; display: ${worldState.autoBindCharacterWorld ? 'none' : 'block'};">
                    <button id="htyq-refresh-worlds" class="htyq-small-btn">刷新世界书列表</button>
                    <div id="htyq-worlds-list" style="max-height: 150px; overflow-y: auto; border: 1px solid #334155; padding: 6px; border-radius: 8px; margin-top: 8px; font-size:12px;">
                        <div style="color:#64748b;">点击刷新按钮加载世界书...</div>
                    </div>
                </div>
                <button id="htyq-save-world-bind" class="htyq-small-btn" style="margin-top: 12px;">保存世界书绑定设置</button>
            </div>
            <div class="htyq-settings-section">
                <h3>🎲 DLC 开关</h3>
                <div id="htyq-dlcs-container" style="display:grid; grid-template-columns:repeat(2,1fr); gap:6px;"></div>
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

        const dlcMap = { world_engine:'活体世界引擎', group_dynamics:'社会群体法则', active_contact:'主动接触判定', revenge:'恩怨录', blackmarket:'黑市', economy:'经济脉搏', accident:'意外事件', reputation:'声誉系统', power_peak:'权力顶点', group_relation:'团体关系', secret_asset:'信息黑盒' };
        const dlcContainer = document.getElementById('htyq-dlcs-container');
        if (dlcContainer) {
            dlcContainer.innerHTML = '';
            for (const [key, label] of Object.entries(dlcMap)) {
                const checked = set.enabledDlcs[key] !== false;
                dlcContainer.innerHTML += `<label class="htyq-checkbox-label"><input type="checkbox" data-dlc="${key}" ${checked ? 'checked' : ''}> ${label}</label>`;
            }
        }

        async function refreshWorldsListUI() {
            const listDiv = document.getElementById('htyq-worlds-list');
            if (!listDiv) return;
            listDiv.innerHTML = '<div style="color:#fbbf24;">🔄 加载中...</div>';
            const worlds = await getAllWorlds();
            if (!worlds.length) {
                listDiv.innerHTML = '<div style="color:#ef4444;">❌ 没有找到世界书文件，请确保 worlds 目录下有 .json 文件。</div>';
                return;
            }
            const selected = STATE.worldState.selectedWorlds || [];
            listDiv.innerHTML = worlds.map(w => `
                <label class="htyq-checkbox-label" style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <input type="checkbox" data-world="${escapeHtml(w)}" ${selected.includes(w) ? 'checked' : ''}>
                    <span style="font-size:12px;">${escapeHtml(w)}</span>
                </label>
            `).join('');
        }

        const refreshBtn = document.getElementById('htyq-refresh-worlds');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await refreshWorldsListUI();
                STATE.showFloatingWarning('世界书列表已刷新', false);
            });
        }

        if (!worldState.autoBindCharacterWorld) {
            refreshWorldsListUI();
        }

        document.querySelectorAll('input[name="worldBindMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isAuto = e.target.value === 'auto';
                const manualDiv = document.getElementById('htyq-manual-worlds-container');
                if (manualDiv) manualDiv.style.display = isAuto ? 'none' : 'block';
                STATE.worldState.autoBindCharacterWorld = isAuto;
                if (!isAuto) refreshWorldsListUI();
            });
        });

        const saveWorldBtn = document.getElementById('htyq-save-world-bind');
        if (saveWorldBtn) {
            saveWorldBtn.addEventListener('click', async () => {
                const checkboxes = document.querySelectorAll('#htyq-worlds-list input[type="checkbox"]');
                const selected = [];
                checkboxes.forEach(cb => { if (cb.checked) selected.push(cb.dataset.world); });
                // 合法性过滤
                const validWorlds = await getAllWorlds();
                const validSelected = selected.filter(w => validWorlds.includes(w));
                STATE.worldState.selectedWorlds = validSelected;
                STATE.saveWorldState();
                STATE.showFloatingWarning(`已保存 ${validSelected.length} 个世界书`, false);
            });
        }

        // 其他事件绑定
        document.querySelectorAll('input[name="apiMode"]').forEach(r => r.addEventListener('change', (e) => {
            document.getElementById('htyq-custom-settings').style.display = e.target.value === 'custom' ? 'block' : 'none';
        }));
        document.getElementById('htyq-auto-poll')?.addEventListener('change', (e) => {
            document.getElementById('htyq-poll-interval-group').style.display = e.target.checked ? 'block' : 'none';
        });
        document.getElementById('htyq-fetch-models')?.addEventListener('click', async () => {
            const url = document.getElementById('htyq-custom-url').value.trim();
            const key = document.getElementById('htyq-custom-key').value.trim();
            if (!url) { STATE.showFloatingWarning('请填写API URL', true); return; }
            const fetchUrl = url.replace(/\/$/, '') + (url.endsWith('/v1') ? '/models' : '/v1/models');
            try {
                const resp = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${key}` } });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                if (data.data && Array.isArray(data.data)) {
                    const select = document.getElementById('htyq-model-list');
                    select.innerHTML = '<option value="">-- 选择模型 --</option>';
                    data.data.forEach(m => { const opt = document.createElement('option'); opt.value = m.id; opt.textContent = m.id; select.appendChild(opt); });
                    select.style.display = 'block';
                    select.onchange = () => { document.getElementById('htyq-custom-model').value = select.value; };
                    STATE.showFloatingWarning(`获取到 ${data.data.length} 个模型`, false);
                } else STATE.showFloatingWarning('无法解析模型列表', true);
            } catch(e) { STATE.showFloatingWarning('获取模型失败: ' + e.message, true); }
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

        const evolveBtn = document.getElementById('htyq-evolve-btn');
        if (evolveBtn) {
            evolveBtn.addEventListener('click', () => {
                if (window.HTYQ_EVOLUTION && window.HTYQ_EVOLUTION.runEvolution) {
                    window.HTYQ_EVOLUTION.runEvolution(true);
                } else {
                    STATE.showFloatingWarning('推演模块未就绪，请刷新页面', true);
                }
            });
        }

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
