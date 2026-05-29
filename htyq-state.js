// 状态管理模块 - 完整版（包含所有面板字段）
window.HTYQ_STATE = (function() {
    const DEFAULT_DLCS = {
        world_engine: true,
        group_dynamics: true,
        active_contact: true,
        revenge: true,
        blackmarket: true,
        economy: true,
        accident: true,
        reputation: true,
        power_peak: true,
        group_relation: true,
        secret_asset: true
    };

    function getDefaultWorldState() {
        return {
            round: 0,
            worldDigest: '世界正在苏醒，一切尚未可知。',
            astrology: '平稳',
            chronicles: [],
            events: [],
            factions: [],
            factionRelations: [],
            rumors: [],
            reputation: { jianghu: '默默无闻', official: '默默无闻', folk: '默默无闻', underworld: '默默无闻' },
            economy: { userGold: 1000, userAssets: [], marketTrend: '平稳', keyResources: [], fundsStatus: '勉强糊口', economyVisibility: { behavior: '', visible: false, witnesses: [], rumorGenerated: false } },
            blackMarket: [],
            secretBox: { actions: [], assets: [] },
            accidentCooldown: 0,
            noContactCounter: 0,
            breaker: 0,
            autoBindCharacterWorld: true,
            selectedWorlds: [],
            // 详细面板字段
            worldTime: '',
            overallAtmosphere: '',
            drivingEvent: '',
            citizenMood: '',
            securityStatus: '',
            directLayer: '',
            nearLayer: '',
            farLayer: '',
            upcomingSchedules: [],
            recentActions: [],
            memorySummary: '',
            causalChain: [],
            randomEvents: [],
            powerPeaks: [],
            internalMessages: [],
            // 新增缺失模块
            characterStates: [],          // 已出场角色状态 [{ name, importance, status, emotion, attitudeToUser, relationshipMap }]
            diplomaticEvents: [],         // 本轮外交事件
            pendingEvents: [],            // 待爆发事件链（可自动计算，但保留字段）
            pendingForeshadowing: [],     // 待回收伏笔
            keyValuesMemo: '',            // 关键数值备忘
            roundFocus: '',               // 本轮重点
            crossRegionMemo: '',          // 跨区域角色备忘
            bloodFeudMemo: '',            // 血仇备忘
            reputationChange: ''          // 声誉本轮变化原因
        };
    }

    let globalApiSettings = {
        apiMode: 'tavern',
        customUrl: '',
        customKey: '',
        customModel: '',
        autoInject: true,
        autoPollMode: 'auto',
        autoPollInterval: 1,
        enabledDlcs: { ...DEFAULT_DLCS },
        injectWorldInfo: true,
        worldInfoMaxChars: 2000,
        customWorldInfo: ''
    };

    let worldState = getDefaultWorldState();

    function getCurrentChatId() {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            return ctx.chatId || 'default';
        } catch(e) { return 'default'; }
    }

    function saveWorldState() {
        const chatId = getCurrentChatId();
        localStorage.setItem(`htyq_world_${chatId}`, JSON.stringify(worldState));
    }

    function loadWorldState() {
        const chatId = getCurrentChatId();
        const stored = localStorage.getItem(`htyq_world_${chatId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                worldState = { ...getDefaultWorldState(), ...parsed };
                // 确保新字段存在
                const defaults = getDefaultWorldState();
                for (let key in defaults) {
                    if (worldState[key] === undefined) worldState[key] = defaults[key];
                }
                // 确保子对象结构
                if (!worldState.economy.economyVisibility) worldState.economy.economyVisibility = defaults.economy.economyVisibility;
                if (!worldState.economy.fundsStatus) worldState.economy.fundsStatus = defaults.economy.fundsStatus;
            } catch(e) { worldState = getDefaultWorldState(); }
        } else {
            worldState = getDefaultWorldState();
        }
    }

    function saveGlobalSettings() {
        localStorage.setItem('htyq_global_settings', JSON.stringify(globalApiSettings));
    }

    function loadGlobalSettings() {
        const stored = localStorage.getItem('htyq_global_settings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                globalApiSettings = { ...globalApiSettings, ...parsed };
                if (globalApiSettings.enabledDlcs) {
                    globalApiSettings.enabledDlcs = { ...DEFAULT_DLCS, ...globalApiSettings.enabledDlcs };
                }
            } catch(e) {}
        }
    }

    function addChronicle(type, title, content) {
        worldState.chronicles.unshift({
            round: worldState.round,
            timestamp: Date.now(),
            type: type,
            title: title,
            content: content
        });
        if (worldState.chronicles.length > 100) worldState.chronicles.pop();
        saveWorldState();
    }

    function showFloatingWarning(message, isRed = true) {
        let warnDiv = document.getElementById('htyq-float-warning');
        if (!warnDiv) {
            warnDiv = document.createElement('div');
            warnDiv.id = 'htyq-float-warning';
            warnDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10003;
                background: ${isRed ? 'rgba(220, 38, 38, 0.95)' : 'rgba(0,0,0,0.8)'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                backdrop-filter: blur(4px);
                border-left: 5px solid #fbbf24;
                max-width: 350px;
                pointer-events: auto;
                cursor: pointer;
                font-size: 14px;
            `;
            warnDiv.onclick = () => warnDiv.remove();
            document.body.appendChild(warnDiv);
        }
        warnDiv.innerHTML = `⚠️ ${message}<br><small style="font-size:10px;">点击关闭</small>`;
        warnDiv.style.opacity = '1';
        setTimeout(() => {
            if (warnDiv && warnDiv.parentNode) warnDiv.style.opacity = '0';
            setTimeout(() => { if (warnDiv && warnDiv.parentNode) warnDiv.remove(); }, 500);
        }, 5000);
    }

    function escapeHtml(str) { return String(str).replace(/[&<>]/g, function(m) { if(m === '&') return '&amp;'; if(m === '<') return '&lt;'; if(m === '>') return '&gt;'; return m; }); }

    return {
        DEFAULT_DLCS,
        getDefaultWorldState,
        globalApiSettings,
        worldState,
        getCurrentChatId,
        saveWorldState,
        loadWorldState,
        saveGlobalSettings,
        loadGlobalSettings,
        addChronicle,
        showFloatingWarning,
        escapeHtml
    };
})();
