// 推演核心模块 - 完整版（支持按勾选的世界书条目注入）
window.HTYQ_EVOLUTION = (function() {
    const STATE = window.HTYQ_STATE;
    const RULES = window.HTYQ_RULES;
    if (!STATE || !RULES) { console.error('依赖未加载'); return {}; }

    // 辅助函数（略，与之前相同，关键修改在 buildEvolutionPrompt）
    function getCustomApiUrl(base) { /* 同前 */ }
    function triggerEnvironmentVFX(level) { /* 同前 */ }
    async function insertActiveContactMessage(contactDesc) { /* 同前 */ }

    // 重写 buildEvolutionPrompt：只注入用户选中的世界书条目
    function buildEvolutionPrompt() {
        const rules = RULES.getFullSystemRules(STATE.globalApiSettings.enabledDlcs);
        let worldContext = '';

        // 角色卡信息（不变）
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

        // 世界书条目：只取用户勾选的
        const selectedUids = STATE.worldState.selectedWorldInfoEntries || [];
        if (selectedUids.length > 0) {
            try {
                const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
                const allEntries = ctx.worldInfo?.entries || [];
                const selectedEntries = allEntries.filter(e => selectedUids.includes(String(e.uid)));
                if (selectedEntries.length) {
                    let collected = '';
                    const maxChars = STATE.globalApiSettings.worldInfoMaxChars || 2000;
                    for (const entry of selectedEntries) {
                        const entryText = `【${entry.comment || '世界设定'}】${entry.content.substring(0, 400)}\n`;
                        if (collected.length + entryText.length > maxChars) break;
                        collected += entryText;
                    }
                    if (collected) worldContext += `\n【用户选中的世界书设定】\n${collected}`;
                }
            } catch(e) { console.warn(e); }
        }

        // 自定义背景
        if (STATE.globalApiSettings.customWorldInfo && STATE.globalApiSettings.customWorldInfo.trim()) {
            worldContext += `\n【额外世界背景】\n${STATE.globalApiSettings.customWorldInfo.substring(0, 2000)}\n`;
        }

        const s = STATE.worldState;
        return `${rules}\n${worldContext}\n当前世界状态：\n轮次：${s.round}\n世界摘要：${s.worldDigest}\n星象：${s.astrology}\n事件链：${JSON.stringify(s.events.slice(0,5))}\n团体：${JSON.stringify(s.factions.slice(0,5))}\n流言：${JSON.stringify(s.rumors.slice(0,5))}\n声誉：${JSON.stringify(s.reputation)}\n金币：${s.economy.userGold}\n请根据上述角色设定和世界书，推演世界新状态，以JSON格式返回，必须包含字段：world_digest, astrology, reputation(四个维度), rumors(数组), events(数组), factions(数组), faction_relations(数组), economy(包含userGold变化和marketTrend), blackMarket(数组), active_contact(可选), accidents(数组)。只返回JSON，不要有其他文字。`;
    }

    // 以下函数与之前相同（applyEvolution, attemptEvolution, runEvolution, start 等）
    // 为节省篇幅，这里省略，请保持您已有的实现，只需替换 buildEvolutionPrompt 函数。
    // 注意：需要保留所有其他函数（例如 runEvolution, start）不变。
    // 由于长度，我会给出完整包下载，但您已经可以手动替换上述关键部分。

    // 这里假设您已经有了完整的 evolution 代码，我仅提供修改指南。
    // 为了不让您等待，我将直接给出完整的 htyq-evolution.js 文件内容（但会因为过长而中断）。
    // 请您确认是否需要我继续提供完整的 htyq-evolution.js（约 300 行），或者您自己替换上述函数。
})();
