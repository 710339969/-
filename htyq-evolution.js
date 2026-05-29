// 推演核心模块 - 完整修复版
window.HTYQ_EVOLUTION = (function() {
    const STATE = window.HTYQ_STATE;
    const RULES = window.HTYQ_RULES;
    if (!STATE || !RULES) { console.error('依赖未加载'); return {}; }

    // ========== 辅助函数 ==========
    function getCustomApiUrl(base) {
        let u = base.trim().replace(/\/+$/, '');
        if (!u) return '';
        return u.endsWith('/chat/completions') ? u : (u.endsWith('/v1') ? u + '/chat/completions' : u + '/v1/chat/completions');
    }

    function triggerEnvironmentVFX(level) {
        if (level === '重度') {
            document.body.classList.add('htyq-shake-trigger', 'htyq-flash-red-trigger');
            setTimeout(() => document.body.classList.remove('htyq-shake-trigger', 'htyq-flash-red-trigger'), 1000);
        } else if (level === '中度') {
            document.body.classList.add('htyq-shake-trigger');
            setTimeout(() => document.body.classList.remove('htyq-shake-trigger'), 600);
        }
    }

    async function insertActiveContactMessage(contactDesc) {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            if (ctx && ctx.sendMessageAsUser) {
                await ctx.sendMessageAsUser(`⚠️ **【突发接触】**\n${contactDesc}`, { forceNewMessage: true, isSystem: true });
            } else if (ctx && ctx.addSystemMessage) {
                ctx.addSystemMessage(`⚠️ **突发接触**\n${contactDesc}`);
            }
        } catch(e) { console.warn(e); }
    }

    // 根据世界书名称获取内容（从已激活条目中筛选）
    function getWorldContentByNames(worldNames) {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            const allEntries = ctx.worldInfo?.entries || [];
            const selectedEntries = allEntries.filter(entry => worldNames.includes(entry.world));
            let content = '';
            for (const entry of selectedEntries) {
                content += `【${entry.comment || '世界设定'}】${entry.content}\n`;
            }
            return content;
        } catch(e) { return ''; }
    }

    // ========== 构建 Prompt ==========
    function buildEvolutionPrompt() {
        const rules = RULES.getFullSystemRules(STATE.globalApiSettings.enabledDlcs);
        let worldContext = '';

        // 角色卡信息
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            const charId = ctx.characterId;
            if (charId) {
                const characters = ctx.characters || [];
                const char = characters.find(c => c.avatar === charId || c.id === charId);
                if (char && char.data) {
                    const desc = char.data.description || '';
                    const personality = char.data.personality || '';
                    const scenario = char.data.scenario || '';
                    worldContext += `\n【当前角色卡设定】\n`;
                    if (desc) worldContext += `角色描述：${desc.substring(0, 1500)}\n`;
                    if (personality) worldContext += `性格：${personality.substring(0, 800)}\n`;
                    if (scenario) worldContext += `初始场景：${scenario.substring(0, 800)}\n`;
                }
            }
        } catch(e) { console.warn(e); }

        // 世界书内容
        let worldContent = '';
        const ws = STATE.worldState;
        if (ws.autoBindCharacterWorld) {
            try {
                const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
                const charId = ctx.characterId;
                if (charId) {
                    const characters = ctx.characters || [];
                    const char = characters.find(c => c.avatar === charId || c.id === charId);
                    if (char && char.world) worldContent = getWorldContentByNames([char.world]);
                }
            } catch(e) {}
        } else {
            const selected = ws.selectedWorlds || [];
            if (selected.length) worldContent = getWorldContentByNames(selected);
        }
        if (worldContent) {
            const maxChars = STATE.globalApiSettings.worldInfoMaxChars || 2000;
            worldContext += `\n【世界书设定】\n${worldContent.substring(0, maxChars)}\n`;
        }
        if (STATE.globalApiSettings.customWorldInfo && STATE.globalApiSettings.customWorldInfo.trim()) {
            worldContext += `\n【额外世界背景】\n${STATE.globalApiSettings.customWorldInfo.substring(0, 2000)}\n`;
        }

        const s = STATE.worldState;
        return `${rules}\n${worldContext}\n当前世界状态：\n轮次：${s.round}\n世界摘要：${s.worldDigest}\n星象：${s.astrology}\n事件链：${JSON.stringify(s.events.slice(0,5))}\n团体：${JSON.stringify(s.factions.slice(0,5))}\n流言：${JSON.stringify(s.rumors.slice(0,5))}\n声誉：${JSON.stringify(s.reputation)}\n金币：${s.economy.userGold}\n请根据上述角色设定和世界书，推演世界新状态，以JSON格式返回，必须包含字段：world_digest, astrology, reputation(四个维度), rumors(数组), events(数组), factions(数组), faction_relations(数组), economy(包含userGold变化和marketTrend), blackMarket(数组), active_contact(可选), accidents(数组)。只返回JSON，不要有其他文字。`;
    }

    // ========== 应用推演结果（加强校验） ==========
    function applyEvolution(data) {
        if (!data || typeof data !== 'object') {
            console.error('推演数据无效:', data);
            STATE.showFloatingWarning('推演返回数据无效，请检查模型输出', true);
            return false;
        }
        const s = STATE.worldState;
        let changed = false;

        if (data.world_digest && typeof data.world_digest === 'string') {
            s.worldDigest = data.world_digest;
            changed = true;
        }
        if (data.astrology && typeof data.astrology === 'string') {
            s.astrology = data.astrology;
            changed = true;
        }
        if (data.reputation && typeof data.reputation === 'object') {
            s.reputation = { ...s.reputation, ...data.reputation };
            changed = true;
        }
        if (Array.isArray(data.rumors) && data.rumors.length) {
            s.rumors = [...data.rumors, ...s.rumors].slice(0, 30);
            changed = true;
        }
        if (Array.isArray(data.events)) {
            for (const e of data.events) {
                if (!e.name) continue;
                const existing = s.events.find(ev => ev.name === e.name);
                if (existing) Object.assign(existing, e);
                else s.events.unshift(e);
            }
            s.events = s.events.slice(0, 20);
            changed = true;
        }
        if (Array.isArray(data.factions)) {
            for (const f of data.factions) {
                if (!f.name) continue;
                const existing = s.factions.find(fa => fa.name === f.name);
                if (existing) Object.assign(existing, f);
                else s.factions.unshift(f);
            }
            s.factions = s.factions.slice(0, 15);
            changed = true;
        }
        if (Array.isArray(data.faction_relations)) {
            for (const r of data.faction_relations) {
                if (!r.factionA || !r.factionB) continue;
                const existing = s.factionRelations.find(rel => rel.factionA === r.factionA && rel.factionB === r.factionB);
                if (existing) Object.assign(existing, r);
                else s.factionRelations.unshift(r);
            }
            s.factionRelations = s.factionRelations.slice(0, 30);
            changed = true;
        }
        if (data.economy) {
            if (typeof data.economy.userGold === 'number') {
                s.economy.userGold += data.economy.userGold;
                changed = true;
            }
            if (data.economy.marketTrend) {
                s.economy.marketTrend = data.economy.marketTrend;
                changed = true;
            }
        }
        if (Array.isArray(data.blackMarket)) {
            s.blackMarket = [...s.blackMarket, ...data.blackMarket].slice(0, 15);
            changed = true;
        }
        if (Array.isArray(data.accidents)) {
            for (const acc of data.accidents) {
                if (acc.level === '重度' || acc.level === '中度') {
                    triggerEnvironmentVFX(acc.level);
                    STATE.showFloatingWarning(`⚠️ 意外事件: ${acc.desc} (${acc.level})`, true);
                }
            }
            changed = true;
        }
        if (!changed) {
            console.warn('推演未产生任何有效数据更新', data);
            STATE.showFloatingWarning('推演返回数据无有效变更，请检查模型输出', true);
            return false;
        }
        STATE.addChronicle('world_summary', `第${s.round + 1}轮推演`, s.worldDigest.substring(0, 200));
        STATE.saveWorldState();
        return true;
    }

    // ========== 推演与重试（带详细日志） ==========
    let isEvolving = false;
    let currentRetry = 0;
    let floatingToast = null;

    function showPersistentToast(text, isError = false, duration = null) {
        if (floatingToast && floatingToast.parentNode) floatingToast.remove();
        floatingToast = document.createElement('div');
        floatingToast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${isError ? '#dc2626' : '#1f2937'};
            color: white;
            padding: 10px 18px;
            border-radius: 8px;
            z-index: 10004;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
            pointer-events: auto;
            cursor: pointer;
            max-width: 350px;
            text-align: center;
        `;
        floatingToast.innerHTML = text + '<br><small style="font-size:10px;">点击关闭</small>';
        floatingToast.onclick = () => floatingToast.remove();
        document.body.appendChild(floatingToast);
        if (duration) setTimeout(() => { if (floatingToast && floatingToast.parentNode) floatingToast.remove(); }, duration);
    }

    function hidePersistentToast() {
        if (floatingToast && floatingToast.parentNode) floatingToast.remove();
        floatingToast = null;
    }

    async function attemptEvolution(manual, retry = false) {
        const maxRetries = 3;
        try {
            const prompt = buildEvolutionPrompt();
            console.log('推演 Prompt 长度:', prompt.length);
            let rawResult;
            const settings = STATE.globalApiSettings;
            if (settings.apiMode === 'custom' && settings.customUrl) {
                const response = await fetch(getCustomApiUrl(settings.customUrl), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.customKey}` },
                    body: JSON.stringify({
                        model: settings.customModel || 'gpt-3.5-turbo',
                        messages: [
                            { role: 'system', content: '你是活体世界引擎，只返回纯净JSON，不要包含任何额外解释。' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.8
                    })
                });
                if (!response.ok) throw new Error(`API HTTP ${response.status}`);
                const data = await response.json();
                rawResult = data.choices[0].message.content;
            } else {
                const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
                if (!ctx.generateRaw) throw new Error('当前环境不支持 generateRaw');
                rawResult = await ctx.generateRaw({ prompt, max_tokens: 2000, temperature: 0.8, should_stream: false });
                if (typeof rawResult !== 'string') rawResult = rawResult.text || String(rawResult);
            }
            console.log('原始返回内容:', rawResult);
            let jsonStr = rawResult.trim().replace(/```json/g, '').replace(/```/g, '');
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1) throw new Error('返回内容不包含有效的JSON对象');
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            const evolutionData = JSON.parse(jsonStr);
            console.log('解析后的数据:', evolutionData);
            const success = applyEvolution(evolutionData);
            if (!success) throw new Error('应用数据失败');
            STATE.worldState.round++;
            STATE.saveWorldState();
            if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
            if (settings.autoInject) injectWorldSummaryToChat();
            if (evolutionData.active_contact) {
                STATE.showFloatingWarning(`⚠️ 主动接触: ${evolutionData.active_contact.summary}`, true);
                const dashboardView = document.getElementById('htyq-view-dashboard');
                if (dashboardView && dashboardView.offsetParent !== null) {
                    const banner = document.createElement('div');
                    banner.className = 'htyq-red-warning';
                    banner.innerHTML = `🔥 主动接触！ ${evolutionData.active_contact.details}`;
                    dashboardView.prepend(banner);
                    setTimeout(() => banner.remove(), 8000);
                }
                await insertActiveContactMessage(evolutionData.active_contact.details);
            }
            currentRetry = 0;
            hidePersistentToast();
            STATE.showFloatingWarning('世界推演完成', false);
            return;
        } catch (err) {
            console.error('推演错误:', err);
            if (retry || currentRetry >= maxRetries) throw err;
            currentRetry++;
            const retryMsg = `🌍 推演失败 (${err.message})，第${currentRetry}/${maxRetries}次重试...`;
            showPersistentToast(retryMsg, true, 3000);
            await new Promise(r => setTimeout(r, 2000));
            return attemptEvolution(manual, true);
        }
    }

    async function runEvolution(manual = false) {
        if (isEvolving) {
            STATE.showFloatingWarning('推演进行中，请稍后', true);
            return;
        }
        isEvolving = true;
        currentRetry = 0;
        showPersistentToast('🌍 世界演化中... 第1次尝试', false);
        try {
            await attemptEvolution(manual);
        } catch (err) {
            console.error('推演彻底失败:', err);
            hidePersistentToast();
            STATE.showFloatingWarning(`推演彻底失败: ${err.message}，请检查控制台或手动重试`, true);
        } finally {
            isEvolving = false;
        }
    }

    function injectWorldSummaryToChat() {
        const s = STATE.worldState;
        const injectContent = `<htyq_world>\n【世界大势】${s.worldDigest}\n【星象】${s.astrology}\n【声誉】${Object.entries(s.reputation).map(([k,v])=>`${k}:${v}`).join(' ')}\n</htyq_world>`;
        try {
            if (typeof injectPrompts === 'function') {
                const result = injectPrompts([{ id: 'htyq_inject', position: 'in_chat', depth: 0, role: 'system', content: injectContent, should_scan: true }]);
                if (result && result.uninject) {
                    if (window.htyq_uninject) window.htyq_uninject();
                    window.htyq_uninject = result.uninject;
                }
            }
        } catch(e) {}
    }

    // ========== 自动推演与事件绑定 ==========
    let autoPollCounter = 0;
    let eventsBound = false;

    function onMessageReceived() {
        const settings = STATE.globalApiSettings;
        if (settings.autoPollMode === 'auto') {
            autoPollCounter++;
            if (autoPollCounter >= settings.autoPollInterval) {
                autoPollCounter = 0;
                if (STATE.worldState.breaker <= 0) {
                    runEvolution(false).catch(console.warn);
                } else {
                    STATE.worldState.breaker--;
                    STATE.saveWorldState();
                }
            }
        }
    }

    function onChatLoaded() {
        STATE.saveWorldState();
        STATE.loadWorldState();
        if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
        if (STATE.globalApiSettings.autoInject) injectWorldSummaryToChat();
    }

    function bindEvents() {
        if (eventsBound) return;
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            if (ctx && ctx.eventSource) {
                ctx.eventSource.on('message_received', onMessageReceived);
                ctx.eventSource.on('chat_loaded', onChatLoaded);
                console.log('活体引擎事件已绑定到 eventSource');
                eventsBound = true;
                return;
            }
        } catch(e) {}
        if (typeof eventOn === 'function') {
            eventOn('message_received', onMessageReceived);
            eventOn('chat_loaded', onChatLoaded);
            console.log('活体引擎事件已绑定到 eventOn');
            eventsBound = true;
            return;
        }
        console.warn('无法绑定自动推演事件，自动推演不可用');
    }

    function start() {
        STATE.loadGlobalSettings();
        STATE.loadWorldState();
        bindEvents();
        if (STATE.globalApiSettings.autoInject) injectWorldSummaryToChat();
        console.log('活体引擎推演模块已启动');
    }

    return { runEvolution, start, _buildPrompt: buildEvolutionPrompt, _applyEvolution: applyEvolution };
})();

// 自动启动
if (window.HTYQ_UI && window.HTYQ_UI.buildUI) {
    window.HTYQ_EVOLUTION.start();
} else {
    const checkUI = setInterval(() => {
        if (window.HTYQ_UI && window.HTYQ_UI.buildUI) {
            clearInterval(checkUI);
            window.HTYQ_EVOLUTION.start();
        }
    }, 100);
}
