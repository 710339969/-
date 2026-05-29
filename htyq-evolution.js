// 推演核心模块 - 依赖 HTYQ_STATE 和 HTYQ_RULES
window.HTYQ_EVOLUTION = (function() {
    const STATE = window.HTYQ_STATE;
    const RULES = window.HTYQ_RULES;
    if (!STATE || !RULES) {
        console.error('HTYQ_STATE 或 HTYQ_RULES 未加载，无法启动推演模块');
        return {};
    }

    // ---------- 辅助函数 ----------
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
        } catch(e) { console.warn('插入主动接触消息失败', e); }
    }

    // ---------- 推演 Prompt 构建 ----------
    function buildEvolutionPrompt() {
        const rules = RULES.getFullSystemRules(STATE.globalApiSettings.enabledDlcs);
        let worldContext = '';

        // 获取角色卡信息
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
        } catch(e) { console.warn('获取角色卡信息失败', e); }

        // 注入世界书设定
        if (STATE.globalApiSettings.injectWorldInfo) {
            try {
                const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
                const worldInfo = ctx.worldInfo;
                if (worldInfo && worldInfo.entries && worldInfo.entries.length) {
                    const maxChars = STATE.globalApiSettings.worldInfoMaxChars || 2000;
                    let collected = '';
                    const sortedEntries = [...worldInfo.entries].sort((a,b) => (b.constant ? 1 : 0) - (a.constant ? 1 : 0));
                    for (const entry of sortedEntries) {
                        if (entry.disable) continue;
                        const entryText = `【${entry.comment || '世界设定'}】${entry.content.substring(0, 400)}\n`;
                        if (collected.length + entryText.length > maxChars) break;
                        collected += entryText;
                    }
                    if (collected) worldContext += `\n【当前激活的世界书设定】\n${collected}`;
                }
            } catch(e) { console.warn('获取世界书信息失败', e); }
        }

        if (STATE.globalApiSettings.customWorldInfo && STATE.globalApiSettings.customWorldInfo.trim()) {
            worldContext += `\n【额外世界背景】\n${STATE.globalApiSettings.customWorldInfo.substring(0, 2000)}\n`;
        }

        const s = STATE.worldState;
        return `${rules}\n${worldContext}\n当前世界状态：\n轮次：${s.round}\n世界摘要：${s.worldDigest}\n星象：${s.astrology}\n事件链：${JSON.stringify(s.events.slice(0,5))}\n团体：${JSON.stringify(s.factions.slice(0,5))}\n流言：${JSON.stringify(s.rumors.slice(0,5))}\n声誉：${JSON.stringify(s.reputation)}\n金币：${s.economy.userGold}\n请根据上述角色设定和世界书，推演世界新状态，以JSON格式返回，必须包含字段：world_digest, astrology, reputation(四个维度), rumors(数组), events(数组), factions(数组), faction_relations(数组), economy(包含userGold变化和marketTrend), blackMarket(数组), active_contact(可选), accidents(数组)。只返回JSON，不要有其他文字。`;
    }

    // ---------- 应用推演结果 ----------
    function applyEvolution(data) {
        const s = STATE.worldState;
        if (data.world_digest) s.worldDigest = data.world_digest;
        if (data.astrology) s.astrology = data.astrology;
        if (data.reputation) s.reputation = { ...s.reputation, ...data.reputation };
        if (data.rumors) s.rumors = [...data.rumors, ...s.rumors].slice(0, 30);
        if (data.events) {
            for (const e of data.events) {
                const existing = s.events.find(ev => ev.name === e.name);
                if (existing) Object.assign(existing, e);
                else s.events.unshift(e);
            }
            s.events = s.events.slice(0, 20);
        }
        if (data.factions) {
            for (const f of data.factions) {
                const existing = s.factions.find(fa => fa.name === f.name);
                if (existing) Object.assign(existing, f);
                else s.factions.unshift(f);
            }
            s.factions = s.factions.slice(0, 15);
        }
        if (data.faction_relations) {
            for (const r of data.faction_relations) {
                const existing = s.factionRelations.find(rel => rel.factionA === r.factionA && rel.factionB === r.factionB);
                if (existing) Object.assign(existing, r);
                else s.factionRelations.unshift(r);
            }
            s.factionRelations = s.factionRelations.slice(0, 30);
        }
        if (data.economy) {
            if (data.economy.userGold !== undefined) s.economy.userGold += data.economy.userGold;
            if (data.economy.marketTrend) s.economy.marketTrend = data.economy.marketTrend;
        }
        if (data.blackMarket) s.blackMarket = [...s.blackMarket, ...data.blackMarket].slice(0, 15);
        if (data.accidents) {
            for (const acc of data.accidents) {
                if (acc.level === '重度' || acc.level === '中度') {
                    triggerEnvironmentVFX(acc.level);
                    STATE.showFloatingWarning(`⚠️ 意外事件: ${acc.desc} (${acc.level})`, true);
                }
            }
        }
        STATE.addChronicle('world_summary', `第${s.round + 1}轮推演`, s.worldDigest.substring(0, 200));
        STATE.saveWorldState();
    }

    // ---------- 推演重试逻辑 ----------
    let isEvolving = false;
    let evolveRetryCount = 0;
    let floatingToast = null;

    function showEvolvingToast(text, isError = false) {
        if (floatingToast && floatingToast.parentNode) floatingToast.remove();
        floatingToast = document.createElement('div');
        floatingToast.style.cssText = `position:fixed; bottom:20px; right:20px; background:${isError ? '#dc2626' : '#1f2937'}; color:white; padding:8px 16px; border-radius:8px; z-index:10004; font-size:14px; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,0.3); pointer-events:none;`;
        floatingToast.textContent = text;
        document.body.appendChild(floatingToast);
    }
    function hideEvolvingToast() {
        if (floatingToast && floatingToast.parentNode) floatingToast.remove();
        floatingToast = null;
    }

    async function attemptEvolution(manual, retry = false) {
        const maxRetries = 3;
        try {
            const prompt = buildEvolutionPrompt();
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
            let jsonStr = rawResult.trim().replace(/```json/g, '').replace(/```/g, '');
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1) throw new Error('返回内容不含JSON');
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            const evolutionData = JSON.parse(jsonStr);
            applyEvolution(evolutionData);
            STATE.worldState.round++;
            STATE.saveWorldState();

            // 刷新UI
            if (window.HTYQ_UI && window.HTYQ_UI.refresh) {
                window.HTYQ_UI.refresh();
            }
            if (settings.autoInject) injectWorldSummaryToChat();

            // 处理主动接触
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
            evolveRetryCount = 0;
            return;
        } catch (err) {
            if (retry || evolveRetryCount >= maxRetries) throw err;
            evolveRetryCount++;
            showEvolvingToast(`🌍 推演失败，第${evolveRetryCount}次重试...`, true);
            await new Promise(r => setTimeout(r, 2000));
            return attemptEvolution(manual, true);
        }
    }

    // 公开的推演入口
    async function runEvolution(manual = false) {
        if (isEvolving) {
            STATE.showFloatingWarning('推演进行中，请稍后', true);
            return;
        }
        isEvolving = true;
        evolveRetryCount = 0;
        showEvolvingToast('🌍 世界演化中... 第1次尝试');
        try {
            await attemptEvolution(manual);
            hideEvolvingToast();
            STATE.showFloatingWarning('世界推演完成', false);
        } catch (err) {
            console.error(err);
            hideEvolvingToast();
            STATE.showFloatingWarning(`推演失败: ${err.message}，请手动重试`, true);
        } finally {
            isEvolving = false;
        }
    }

    // 自动推演相关（使用事件监听，兼容不同环境）
    let autoPollCounter = 0;
    let messageListenerAttached = false;

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

    // 注册事件（兼容 eventOn 或直接监听 ST 的 eventSource）
    let eventsBound = false;
    function bindEvents() {
        if (eventsBound) return;
        // 优先使用 SillyTavern 的 eventSource
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            if (ctx && ctx.eventSource) {
                ctx.eventSource.on('message_received', onMessageReceived);
                ctx.eventSource.on('chat_loaded', onChatLoaded);
                console.log('已绑定活体引擎事件到 eventSource');
                eventsBound = true;
                return;
            }
        } catch(e) {}
        // 降级使用全局 eventOn（如果存在）
        if (typeof eventOn === 'function') {
            eventOn('message_received', onMessageReceived);
            eventOn('chat_loaded', onChatLoaded);
            console.log('已绑定活体引擎事件到 eventOn');
            eventsBound = true;
            return;
        }
        // 最后警告
        console.warn('无法绑定自动推演事件，自动推演和聊天切换功能不可用，但手动推演正常');
    }

    // 启动推演模块
    function start() {
        STATE.loadGlobalSettings();
        STATE.loadWorldState();
        bindEvents();
        if (STATE.globalApiSettings.autoInject) injectWorldSummaryToChat();
        console.log('活体引擎推演模块已启动');
    }

    // 公开API
    return {
        runEvolution: runEvolution,
        start: start,
        _buildPrompt: buildEvolutionPrompt,
        _applyEvolution: applyEvolution
    };
})();

// 自动启动推演模块（等待UI模块先加载完成）
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
