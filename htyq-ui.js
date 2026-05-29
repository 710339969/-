// UI 渲染模块 - 依赖 HTYQ_STATE 和 HTYQ_RULES
window.HTYQ_UI = (function() {
    // 获取状态和工具函数
    const STATE = window.HTYQ_STATE;
    if (!STATE) {
        console.error('HTYQ_STATE 未加载，请确保 htyq-state.js 已加载');
        return {};
    }

    // 获取规则模块（用于需要时，但UI本身不直接依赖规则）
    // 辅助函数：转义HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // 当前标签页
    let currentTab = 'dashboard';
    // 编辑模式标志
    let isEditing = false;

    // ---------- 各面板渲染函数 ----------
    function renderDashboard(container) {
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-card"><h3>🌍 世界状态摘要</h3><div class="htyq-digest">${escapeHtml(s.worldDigest)}</div></div>
            <div class="htyq-card"><h3>⭐ 星象分野</h3><div>${escapeHtml(s.astrology)}</div></div>
            <div class="htyq-card"><h3>🔥 活跃事件链</h3><ul>${s.events.slice(0,3).map(e => `<li>【${escapeHtml(e.name)}】${escapeHtml(e.stage)} (${e.currentRound}/${e.totalRounds}轮)</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>🗣️ 最新流言</h3><ul>${s.rumors.slice(0,3).map(r => `<li>${escapeHtml(r.text.substring(0,80))}...</li>`).join('') || '<li>无</li>'}</ul></div>
        `;
    }

    function renderChronicle(container) {
        const s = STATE.worldState;
        container.innerHTML = `<div class="htyq-chronicle-list">${s.chronicles.map(c => `
            <div class="htyq-chronicle-item">
                <div class="htyq-chronicle-title">[第${c.round}轮] ${escapeHtml(c.title)}</div>
                <div class="htyq-chronicle-content">${escapeHtml(c.content)}</div>
                <div class="htyq-chronicle-date">${new Date(c.timestamp).toLocaleString()}</div>
            </div>
        `).join('') || '<div>暂无编年史记录</div>'}</div>`;
    }

    function renderEvents(container) {
        const s = STATE.worldState;
        container.innerHTML = `<button id="htyq-add-event" class="htyq-small-btn">+ 添加事件链</button>
            <div class="htyq-event-list">${s.events.map((e, idx) => `
            <div class="htyq-event-item">
                <strong>${escapeHtml(e.name)}</strong> (Lv.${escapeHtml(e.level)}) - ${escapeHtml(e.stage)} (${e.currentRound}/${e.totalRounds}轮)<br>
                状态: ${escapeHtml(e.status)}<br>${escapeHtml(e.description)}${e.status === '挂起' ? `<br>原因: ${escapeHtml(e.reason)} | 恢复: ${escapeHtml(e.recoverCondition)}` : ''}
                ${isEditing ? `<button class="htyq-del-btn" data-idx="${idx}" data-type="event">删除</button>` : ''}
            </div>
        `).join('') || '<div>无事件链</div>'}</div>`;
        const addBtn = document.getElementById('htyq-add-event');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                let name = prompt('事件名称');
                if (name) {
                    s.events.push({
                        id: Date.now() + '',
                        name: name,
                        level: 'Lv.1',
                        stage: '萌芽',
                        currentRound: 0,
                        totalRounds: 5,
                        status: '活跃',
                        description: '新的事件链',
                        reason: '',
                        recoverCondition: ''
                    });
                    STATE.saveWorldState();
                    renderCurrentTab();
                }
            });
        }
        document.querySelectorAll('.htyq-del-btn[data-type="event"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                s.events.splice(idx, 1);
                STATE.saveWorldState();
                renderCurrentTab();
            });
        });
    }

    function renderFactions(container) {
        const s = STATE.worldState;
        container.innerHTML = `<button id="htyq-add-faction" class="htyq-small-btn">+ 添加势力</button>
            <div class="htyq-faction-list">${s.factions.map((f, idx) => `
            <div class="htyq-faction-item">
                <strong>${escapeHtml(f.name)}</strong> (${escapeHtml(f.region)})<br>
                资源: ${escapeHtml(f.resources)} | 凝聚力: ${escapeHtml(f.cohesion)} | 对玩家: ${escapeHtml(f.attitudeToUser)}<br>
                核心人物: ${escapeHtml(f.corePerson)}<br>目标: ${escapeHtml(f.goal)} | 进度: ${escapeHtml(f.progress)}
                ${isEditing ? `<button class="htyq-del-btn" data-idx="${idx}" data-type="faction">删除</button>` : ''}
            </div>
        `).join('') || '<div>无势力</div>'}</div>`;
        const addBtn = document.getElementById('htyq-add-faction');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                let name = prompt('势力名称');
                if (name) {
                    s.factions.push({
                        id: Date.now() + '',
                        name: name,
                        region: '未知区域',
                        resources: '充足',
                        cohesion: '团结一致',
                        attitudeToUser: '中立',
                        corePerson: '未知',
                        goal: '发展',
                        progress: '初始',
                        obstacle: '无',
                        infoNetwork: '无'
                    });
                    STATE.saveWorldState();
                    renderCurrentTab();
                }
            });
        }
        document.querySelectorAll('.htyq-del-btn[data-type="faction"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                s.factions.splice(idx, 1);
                STATE.saveWorldState();
                renderCurrentTab();
            });
        });
    }

    function renderRelations(container) {
        const s = STATE.worldState;
        container.innerHTML = `<button id="htyq-add-relation" class="htyq-small-btn">+ 添加关系</button>
            <div class="htyq-relation-list">${s.factionRelations.map((r, idx) => `
            <div class="htyq-relation-item">
                ${escapeHtml(r.factionA)} ↔ ${escapeHtml(r.factionB)} : <strong>${escapeHtml(r.relation)}</strong> (趋势: ${escapeHtml(r.trend)})
                ${isEditing ? `<button class="htyq-del-btn" data-idx="${idx}" data-type="relation">删除</button>` : ''}
            </div>
        `).join('') || '<div>无关系记录</div>'}</div>`;
        const addBtn = document.getElementById('htyq-add-relation');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                let fa = prompt('势力A'), fb = prompt('势力B');
                if (fa && fb) {
                    s.factionRelations.push({
                        factionA: fa,
                        factionB: fb,
                        relation: '中立',
                        trend: '稳定',
                        lastChangeRound: s.round
                    });
                    STATE.saveWorldState();
                    renderCurrentTab();
                }
            });
        }
        document.querySelectorAll('.htyq-del-btn[data-type="relation"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                s.factionRelations.splice(idx, 1);
                STATE.saveWorldState();
                renderCurrentTab();
            });
        });
    }

    function renderRumors(container) {
        const s = STATE.worldState;
        container.innerHTML = `<div class="htyq-rumor-list">${s.rumors.map((r, idx) => `
            <div class="htyq-rumor-item">
                ${escapeHtml(r.text)}<br>
                范围: ${escapeHtml(r.scope)} | 可信度: ${escapeHtml(r.credibility)} | 来源: ${escapeHtml(r.source)}
                ${isEditing ? `<button class="htyq-del-btn" data-idx="${idx}" data-type="rumor">删除</button>` : ''}
            </div>
        `).join('') || '<div>无流言</div>'}</div>`;
        document.querySelectorAll('.htyq-del-btn[data-type="rumor"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                s.rumors.splice(idx, 1);
                STATE.saveWorldState();
                renderCurrentTab();
            });
        });
    }

    function renderEconomy(container) {
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-card"><h3>💰 个人资产</h3>
                <div>金币: ${s.economy.userGold}</div>
                <div>关键物资: ${s.economy.keyResources.map(k => `${escapeHtml(k.name)}:${k.amount}`).join(', ') || '无'}</div>
                <button id="htyq-add-gold" class="htyq-small-btn">+ 增加金币</button>
                <button id="htyq-sub-gold" class="htyq-small-btn">- 减少金币</button>
            </div>
            <div class="htyq-card"><h3>📈 市场动态</h3>
                <div>趋势: ${escapeHtml(s.economy.marketTrend)}</div>
                <div>持有资产: ${s.economy.userAssets.map(a => escapeHtml(a)).join(', ') || '无'}</div>
            </div>
        `;
        const addGold = document.getElementById('htyq-add-gold');
        const subGold = document.getElementById('htyq-sub-gold');
        if (addGold) {
            addGold.addEventListener('click', () => {
                let amt = parseInt(prompt('增加金币', '100'));
                if (!isNaN(amt)) {
                    s.economy.userGold += amt;
                    STATE.saveWorldState();
                    renderCurrentTab();
                }
            });
        }
        if (subGold) {
            subGold.addEventListener('click', () => {
                let amt = parseInt(prompt('减少金币', '100'));
                if (!isNaN(amt)) {
                    s.economy.userGold = Math.max(0, s.economy.userGold - amt);
                    STATE.saveWorldState();
                    renderCurrentTab();
                }
            });
        }
    }

    function renderBlackMarket(container) {
        const s = STATE.worldState;
        container.innerHTML = `<div class="htyq-blackmarket-list">${s.blackMarket.map((item, idx) => `
            <div class="htyq-blackmarket-item">
                <strong>${escapeHtml(item.name)}</strong> - ${item.price}G<br>
                类型: ${escapeHtml(item.type)} | ${escapeHtml(item.description)}
                <button class="htyq-buy-btn" data-idx="${idx}">购买</button>
                ${isEditing ? `<button class="htyq-del-btn" data-idx="${idx}" data-type="blackmarket">删除</button>` : ''}
            </div>
        `).join('') || '<div>黑市暂无货物</div>'}</div>`;
        document.querySelectorAll('.htyq-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const item = s.blackMarket[idx];
                if (s.economy.userGold >= item.price) {
                    s.economy.userGold -= item.price;
                    if (item.type === 'intel') {
                        s.secretBox.assets.push(item.name);
                    } else {
                        s.economy.userAssets.push(item.name);
                    }
                    s.blackMarket.splice(idx, 1);
                    STATE.saveWorldState();
                    renderCurrentTab();
                    STATE.showFloatingWarning(`购买了 ${item.name}`, false);
                } else {
                    STATE.showFloatingWarning('金币不足', true);
                }
            });
        });
        document.querySelectorAll('.htyq-del-btn[data-type="blackmarket"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                s.blackMarket.splice(idx, 1);
                STATE.saveWorldState();
                renderCurrentTab();
            });
        });
    }

    function renderReputation(container) {
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-reputation-grid">
                <div>🏮 江湖声望: ${escapeHtml(s.reputation.jianghu)}</div>
                <div>🏛️ 官府评价: ${escapeHtml(s.reputation.official)}</div>
                <div>👥 民间口碑: ${escapeHtml(s.reputation.folk)}</div>
                <div>🗡️ 黑道地位: ${escapeHtml(s.reputation.underworld)}</div>
            </div>
            <button id="htyq-adjust-rep" class="htyq-small-btn">手动调整声誉</button>
        `;
        const adjustBtn = document.getElementById('htyq-adjust-rep');
        if (adjustBtn) {
            adjustBtn.addEventListener('click', () => {
                const dim = prompt('维度 (jianghu/official/folk/underworld)');
                const val = prompt('新等级 (天怒人怨/声名狼藉/默默无闻/小有名气/受人尊敬/万众敬仰)');
                if (dim && val && s.reputation.hasOwnProperty(dim)) {
                    s.reputation[dim] = val;
                    STATE.saveWorldState();
                    renderCurrentTab();
                }
            });
        }
    }

    function renderSettings(container) {
        const set = STATE.globalApiSettings;
        container.innerHTML = `
            <div class="htyq-settings-section">
                <h3>🔌 API 设置 (全局)</h3>
                <div class="htyq-option-row"><label><input type="radio" name="apiMode" value="tavern" ${set.apiMode === 'tavern' ? 'checked' : ''}> 使用酒馆自带模型</label></div>
                <div class="htyq-option-row"><label><input type="radio" name="apiMode" value="custom" ${set.apiMode === 'custom' ? 'checked' : ''}> 使用自定义API</label></div>
                <div id="htyq-custom-settings" class="htyq-nested-settings" style="display: ${set.apiMode === 'custom' ? 'block' : 'none'};">
                    <input type="text" id="htyq-custom-url" placeholder="API Base URL" value="${escapeHtml(set.customUrl)}">
                    <input type="password" id="htyq-custom-key" placeholder="API Key" value="${escapeHtml(set.customKey)}">
                    <input type="text" id="htyq-custom-model" placeholder="模型名称" value="${escapeHtml(set.customModel)}">
                    <button id="htyq-fetch-models" class="htyq-small-btn">获取模型列表</button>
                    <select id="htyq-model-list" style="display:none;"></select>
                </div>
                <button id="htyq-save-api" class="htyq-small-btn">保存API设置</button>
            </div>
            <div class="htyq-settings-section">
                <h3>⚙️ 引擎设置</h3>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-auto-inject" ${set.autoInject ? 'checked' : ''}> 自动注入世界摘要到AI</label></div>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-auto-poll" ${set.autoPollMode === 'auto' ? 'checked' : ''}> 自动推演 (每轮对话后)</label></div>
                <div id="htyq-poll-interval-group" class="htyq-nested-settings" style="display: ${set.autoPollMode === 'auto' ? 'block' : 'none'};">
                    每 <input type="number" id="htyq-poll-interval" value="${set.autoPollInterval}" min="1" style="width:70px;"> 轮推演一次
                </div>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-inject-worldinfo" ${set.injectWorldInfo ? 'checked' : ''}> 注入世界书设定到推演</label></div>
                <div id="htyq-worldinfo-maxchars-group" class="htyq-nested-settings">
                    世界书最大注入长度: <input type="number" id="htyq-worldinfo-maxchars" value="${set.worldInfoMaxChars}" min="500" max="5000" step="100" style="width:90px;"> 字符
                </div>
                <div style="margin-top:12px;">
                    <label>自定义世界背景（额外注入）:</label>
                    <textarea id="htyq-custom-worldinfo" rows="3" style="width:100%; background:#111827; color:#e5e7eb; border:1px solid #4b5563; border-radius:6px; padding:8px;">${escapeHtml(set.customWorldInfo)}</textarea>
                </div>
                <button id="htyq-save-engine" class="htyq-small-btn">保存引擎设置</button>
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

        // 填充DLC复选框
        const dlcMap = {
            world_engine: '活体世界引擎',
            group_dynamics: '社会群体法则',
            active_contact: '主动接触判定',
            revenge: '恩怨录',
            blackmarket: '黑市',
            economy: '经济脉搏',
            accident: '意外事件',
            reputation: '声誉系统',
            power_peak: '权力顶点',
            group_relation: '团体关系',
            secret_asset: '信息黑盒'
        };
        const dlcContainer = document.getElementById('htyq-dlcs-container');
        if (dlcContainer) {
            dlcContainer.innerHTML = '';
            for (const [key, label] of Object.entries(dlcMap)) {
                const checked = set.enabledDlcs[key] !== false;
                dlcContainer.innerHTML += `<label class="htyq-checkbox-label"><input type="checkbox" data-dlc="${key}" ${checked ? 'checked' : ''}> ${label}</label>`;
            }
        }

        // 绑定事件（这些事件处理函数中调用了 STATE 的方法，但需要访问外部的渲染刷新）
        const radioTavern = document.querySelector('input[value="tavern"]');
        const radioCustom = document.querySelector('input[value="custom"]');
        if (radioTavern && radioCustom) {
            radioTavern.addEventListener('change', () => {
                const customDiv = document.getElementById('htyq-custom-settings');
                if (customDiv) customDiv.style.display = 'none';
            });
            radioCustom.addEventListener('change', () => {
                const customDiv = document.getElementById('htyq-custom-settings');
                if (customDiv) customDiv.style.display = 'block';
            });
        }

        const autoPoll = document.getElementById('htyq-auto-poll');
        if (autoPoll) {
            autoPoll.addEventListener('change', (e) => {
                const intervalGroup = document.getElementById('htyq-poll-interval-group');
                if (intervalGroup) intervalGroup.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        const fetchModels = document.getElementById('htyq-fetch-models');
        if (fetchModels) {
            fetchModels.addEventListener('click', async () => {
                const url = document.getElementById('htyq-custom-url').value.trim();
                const key = document.getElementById('htyq-custom-key').value.trim();
                if (!url) {
                    STATE.showFloatingWarning('请填写API URL', true);
                    return;
                }
                const fetchUrl = url.replace(/\/$/, '') + (url.endsWith('/v1') ? '/models' : '/v1/models');
                try {
                    const resp = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${key}` } });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const data = await resp.json();
                    if (data.data && Array.isArray(data.data)) {
                        const select = document.getElementById('htyq-model-list');
                        select.innerHTML = '<option value="">-- 选择模型 --</option>';
                        data.data.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.id;
                            opt.textContent = m.id;
                            select.appendChild(opt);
                        });
                        select.style.display = 'block';
                        select.onchange = () => {
                            const modelInput = document.getElementById('htyq-custom-model');
                            if (modelInput) modelInput.value = select.value;
                        };
                        STATE.showFloatingWarning(`获取到 ${data.data.length} 个模型`, false);
                    } else {
                        STATE.showFloatingWarning('无法解析模型列表', true);
                    }
                } catch (e) {
                    STATE.showFloatingWarning('获取模型失败: ' + e.message, true);
                }
            });
        }

        const saveApi = document.getElementById('htyq-save-api');
        if (saveApi) {
            saveApi.addEventListener('click', () => {
                const selected = document.querySelector('input[name="apiMode"]:checked');
                if (selected) STATE.globalApiSettings.apiMode = selected.value;
                STATE.globalApiSettings.customUrl = document.getElementById('htyq-custom-url')?.value || '';
                STATE.globalApiSettings.customKey = document.getElementById('htyq-custom-key')?.value || '';
                STATE.globalApiSettings.customModel = document.getElementById('htyq-custom-model')?.value || '';
                STATE.saveGlobalSettings();
                STATE.showFloatingWarning('API设置已保存', false);
            });
        }

        const saveEngine = document.getElementById('htyq-save-engine');
        if (saveEngine) {
            saveEngine.addEventListener('click', () => {
                STATE.globalApiSettings.autoInject = document.getElementById('htyq-auto-inject')?.checked || false;
                STATE.globalApiSettings.autoPollMode = document.getElementById('htyq-auto-poll')?.checked ? 'auto' : 'manual';
                const interval = document.getElementById('htyq-poll-interval');
                if (interval) STATE.globalApiSettings.autoPollInterval = parseInt(interval.value) || 1;
                STATE.globalApiSettings.injectWorldInfo = document.getElementById('htyq-inject-worldinfo')?.checked || false;
                const maxChars = document.getElementById('htyq-worldinfo-maxchars');
                if (maxChars) STATE.globalApiSettings.worldInfoMaxChars = parseInt(maxChars.value) || 2000;
                const customText = document.getElementById('htyq-custom-worldinfo');
                if (customText) STATE.globalApiSettings.customWorldInfo = customText.value;
                STATE.saveGlobalSettings();
                STATE.showFloatingWarning('引擎设置已保存', false);
            });
        }

        const saveDlcs = document.getElementById('htyq-save-dlcs');
        if (saveDlcs) {
            saveDlcs.addEventListener('click', () => {
                document.querySelectorAll('#htyq-dlcs-container input[type="checkbox"]').forEach(cb => {
                    STATE.globalApiSettings.enabledDlcs[cb.dataset.dlc] = cb.checked;
                });
                STATE.saveGlobalSettings();
                STATE.showFloatingWarning('DLC设置已保存', false);
            });
        }

        const resetWorld = document.getElementById('htyq-reset-world');
        if (resetWorld) {
            resetWorld.addEventListener('click', () => {
                if (confirm('重置当前聊天世界？不可撤销！')) {
                    STATE.worldState = STATE.getDefaultWorldState();
                    STATE.saveWorldState();
                    renderCurrentTab();
                    STATE.showFloatingWarning('世界已重置', false);
                }
            });
        }

        const exportWorld = document.getElementById('htyq-export-world');
        if (exportWorld) {
            exportWorld.addEventListener('click', () => {
                const dataStr = JSON.stringify(STATE.worldState, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `htyq_world_${STATE.getCurrentChatId()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        const importWorld = document.getElementById('htyq-import-world');
        if (importWorld) {
            importWorld.addEventListener('click', () => {
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
                        } catch (err) {
                            STATE.showFloatingWarning('导入失败: 无效JSON', true);
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }
    }

    // 根据当前标签页渲染对应视图
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
        // 更新底部统计
        const roundSpan = document.getElementById('htyq-round');
        const goldSpan = document.getElementById('htyq-gold');
        if (roundSpan) roundSpan.textContent = STATE.worldState.round;
        if (goldSpan) goldSpan.textContent = STATE.worldState.economy.userGold;
    }

    // 构建完整UI（标签页、视图容器、底部按钮）
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
        if (evolveBtn) {
            evolveBtn.addEventListener('click', () => {
                if (window.HTYQ_EVOLUTION && window.HTYQ_EVOLUTION.runEvolution) {
                    window.HTYQ_EVOLUTION.runEvolution(true);
                } else {
                    console.warn('推演模块未加载');
                }
            });
        }

        // 响应式适配
        function adjustForMobile() {
            const isM = window.innerWidth < 768;
            const btnDiv = container.querySelector('.htyq-tab-buttons');
            if (isM) {
                if (btnDiv) btnDiv.style.display = 'none';
                if (mobileSelect) {
                    mobileSelect.style.display = 'block';
                    mobileSelect.innerHTML = '';
                    const tabs = ['dashboard','chronicle','events','factions','relations','rumors','economy','blackmarket','reputation','settings'];
                    tabs.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t;
                        opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
                        if (t === currentTab) opt.selected = true;
                        mobileSelect.appendChild(opt);
                    });
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

    // 刷新UI（供外部调用）
    function refresh() {
        if (document.getElementById('htyq-panel-content')) {
            renderCurrentTab();
        }
    }

    // 公开接口
    return {
        buildUI: buildUI,
        refresh: refresh,
        setEditingMode: function(editing) { isEditing = editing; refresh(); },
        getEditingMode: function() { return isEditing; }
    };
})();
