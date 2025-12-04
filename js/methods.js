window.LootGenMethods = (() => {
    const createPseudoRand = (runSeed = Math.random() * 1000000) => (seed) => {
        const x = Math.sin(seed + runSeed) * 10000;
        return x - Math.floor(x);
    };

    const buildSlices = (count, maxSlice, seedBase, pseudoRand) => {
        if (count <= 1) return [1];
        const cap = Math.min(1, Math.max(0, maxSlice));
        let weights = Array.from({ length: count }, (_, idx) => Math.max(1e-6, pseudoRand(seedBase + idx + 1)));
        let sum = weights.reduce((a, b) => a + b, 0) || 1;
        weights = weights.map((w) => w / sum);
        let safety = 0;
        while (safety < 10) {
            let idxMax = 0;
            for (let i = 1; i < weights.length; i += 1) {
                if (weights[i] > weights[idxMax]) idxMax = i;
            }
            if (weights[idxMax] <= cap) break;
            const excess = weights[idxMax] - cap;
            weights[idxMax] = cap;
            const othersTotal = weights.reduce((s, w, i) => (i === idxMax ? s : s + w), 0);
            if (othersTotal <= 0) {
                const even = (1 - cap) / Math.max(1, (count - 1));
                weights = weights.map((_, i) => (i === idxMax ? cap : even));
                break;
            }
            weights = weights.map((w, i) => (i === idxMax ? w : w + (w / othersTotal) * excess));
            safety += 1;
        }
        const sum2 = weights.reduce((a, b) => a + b, 0) || 1;
        return weights.map((w) => w / sum2);
    };

    const applyPctJitter = (value, pct, seed, pseudoRand) => {
        const spread = Math.max(0, pct);
        if (spread === 0) return value;
        const offset = (pseudoRand(seed) * 2 - 1) * spread;
        return Math.max(0, value * (1 + offset));
    };

    const computeItemLevel = (state, levels, playerLevel, seed, pseudoRand) => {
        const variance = Math.max(0, Math.min(100, Number(state.item_level_variance ?? 0)));
        if (variance === 0) return playerLevel;

        const maxLevel = levels || state.levels || 1;
        const rangeSize = Math.max(1, Math.round((variance / 100) * maxLevel));
        const minItemLevel = Math.max(1, playerLevel - Math.floor(rangeSize / 2));
        const maxItemLevel = Math.min(maxLevel, playerLevel + Math.ceil(rangeSize / 2));
        const rand = pseudoRand(seed);
        const itemLevel = Math.round(minItemLevel + rand * (maxItemLevel - minItemLevel));
        return Math.max(1, Math.min(maxLevel, itemLevel));
    };

    const pickCategory = (state, currentLevel, seed, pseudoRand) => {
        const rarities = state.rarities || [];
        const rarityBaseWeights = state.rarity_base_weights || {};
        const rarityWeightGrowth = state.rarity_weight_growth || 0;
        const eligible = rarities.filter((cat) => (cat.unlock_level || 1) <= currentLevel);
        if (!eligible.length) return { name: "none" };
        const weights = eligible.map((cat) => {
            const baseWeight = rarityBaseWeights[cat.name] ?? cat.rarity ?? 0;
            return Math.max(0, baseWeight + rarityWeightGrowth * (currentLevel - 1));
        });
        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        const rand = pseudoRand(seed) * (weightSum || 1);
        let acc = 0;
        for (let i = 0; i < eligible.length; i += 1) {
            acc += weights[i];
            if (rand <= acc) return eligible[i];
        }
        return eligible[eligible.length - 1];
    };

    const pickItem = (state, slot, seed, pseudoRand) => {
        if (!slot) return null;
        const items = state.items || [];
        const available = items.filter((it) => it.equipment_slot === slot);
        if (!available.length) return null;
        const idx = Math.floor(pseudoRand(seed) * available.length) % available.length;
        return available[idx];
    };

    const computeFlatDamageForLevel = (state, levels, lvl) => {
        const min = Number(state.flat_damage_min ?? 0);
        const median = Number(state.flat_damage_max ?? min);
        const power = Number(state.flat_damage_power_progression ?? 1);
        const denom = Math.max(1, (levels || state.levels || 1) - 1);
        const t = Math.min(1, Math.max(0, (lvl - 1) / denom));
        const flatSlotsAllowed = (state.equipment_slots || []).filter((slot) => slot.allow_flat_damage !== false).length;
        const flatSlotDivider = Math.max(1, flatSlotsAllowed || state.flat_damage_equipement_slots_auto || 1);
        const total = min + (median - min) * Math.pow(t, power);
        return total / flatSlotDivider;
    };

    const generateLootPiece = (state, lvl, context = {}) => {
        const {
            index = 0,
            pseudoRand,
            levels,
            slotRules,
            slots = (state.equipment_slots || []).map((s) => s.name),
            damageTypes = state.damage_types || [],
            defaultDmgType = "Physical"
        } = context;
        const slotRulesMap = slotRules || new Map((state.equipment_slots || []).map((slot) => [slot.name, slot]));
        if (!pseudoRand) return null;
        const availableSlots = slots.filter((slotName) => (state.items || []).some((it) => it.equipment_slot === slotName));
        if (!availableSlots.length) return null;
        const slotSeed = lvl + index + 7;
        const slot = availableSlots[Math.floor(pseudoRand(slotSeed) * availableSlots.length) % availableSlots.length];
        if (!slot) return null;
        const item = pickItem(state, slot, lvl + index + 13, pseudoRand);
        if (!item) return null;
        const cat = pickCategory(state, lvl + index + 1, lvl, pseudoRand);
        const itemLevel = computeItemLevel(state, levels, lvl, lvl * 1000 + index * 37, pseudoRand);
        const flatMin = state.flat_damage_types_per_item_min ?? 1;
        const flatMax = state.flat_damage_types_per_item_max ?? 2;
        const sourceSlots = Math.max(0, item.flat_damage_sources || 0);
        const allowFlat = slotRulesMap.get(slot)?.allow_flat_damage !== false;
        let maxSources = allowFlat && sourceSlots > 0 ? Math.max(flatMin, Math.min(flatMax, sourceSlots)) : 0;
        if (maxSources > 1) {
            const multiChance = Math.min(1, Math.max(0, item.flat_damage_sources_multi_chance ?? 0));
            const rollMulti = pseudoRand((lvl + index + 101) * 0.37);
            if (rollMulti > multiChance) {
                maxSources = 1;
            }
        }
        const affixHeadroom = state.affix_growth_headroom ?? 5;
        const growthRatio = (state.levels || levels || 1) > 1 ? (lvl - 1) / ((state.levels || levels || 1) - 1) : 0;
        const growthSlots = Math.round(affixHeadroom * growthRatio);
        const baseAffixes = Math.max(0, cat?.attributes ?? 0);
        const maxAllowed = item.affix_max ?? (baseAffixes + affixHeadroom);
        let affixLimit = Math.max(0, Math.min(maxAllowed, baseAffixes + growthSlots));
        const damagePool = (item.damage_types && item.damage_types.length)
            ? item.damage_types
            : (cat?.attribute_types && cat.attribute_types.length)
                ? cat.attribute_types
                : damageTypes.map((dt) => dt.name);
        const defaultDamageTypeEntry = damageTypes.find((dt) => dt.default_damage_type) || damageTypes[0];
        const defaultDamageName = defaultDamageTypeEntry?.name || defaultDmgType;
        const typePoolFinal = (cat?.name === "common") ? [defaultDamageName] : damagePool;
        if (cat?.name === "common") {
            affixLimit = Math.min(1, affixLimit);
        }
        const rarityFactor = Math.max(0, Number(cat?.rarity_power ?? 1));
        const bonuses = [];
        const baseAdds = {};
        const dmgMods = {};
        const resAdds = {};
        let atkBonus = 0;
        const usedDamageTypes = new Set();
        const usedResistanceTypes = new Set();
        const pickType = (seed) => typePoolFinal[Math.floor(pseudoRand(seed) * typePoolFinal.length) % typePoolFinal.length] || defaultDmgType;
        if (item.implicit) {
            if (item.implicit.flat_damage) {
                for (const [type, value] of Object.entries(item.implicit.flat_damage)) {
                    baseAdds[type] = (baseAdds[type] || 0) + value;
                    bonuses.push(`${value} ${type} flat dmg (implicit)`);
                }
            }
            if (item.implicit.damage_modifier) {
                for (const [type, value] of Object.entries(item.implicit.damage_modifier)) {
                    dmgMods[type] = (dmgMods[type] || 0) + value;
                    bonuses.push(`+${value}% ${type} dmg mod (implicit)`);
                }
            }
            if (item.implicit.attack_speed_bonus) {
                atkBonus += item.implicit.attack_speed_bonus;
                bonuses.push(`+${item.implicit.attack_speed_bonus}% Attack Speed (implicit)`);
            }
            if (item.implicit.resist) {
                for (const [type, value] of Object.entries(item.implicit.resist)) {
                    resAdds[type] = (resAdds[type] || 0) + value;
                    bonuses.push(`+${value}% ${type} res (implicit)`);
                }
            }
        }
        if (maxSources > 0) {
            const totalBaseDmg = computeFlatDamageForLevel(state, levels, itemLevel);
            const isOneHand = (slot === "weapon_right" || slot === "hand_left") && !(item.two_handed);
            const baseDamageAfterHand = isOneHand
                ? totalBaseDmg * Math.max(0, Number(state.flat_damage_onehand_ratio ?? 1))
                : totalBaseDmg;
            const maxSlice = Math.min(1, Math.max(0, item.flat_damage_multiple_max_slice ?? 0.9));
            const weights = buildSlices(maxSources, maxSlice, (lvl + index + 999), pseudoRand);
            for (let s = 0; s < maxSources; s += 1) {
                const type = pickType((lvl + index + 101 + s) * (s + 1));
                if (usedDamageTypes.has(type)) continue;
                usedDamageTypes.add(type);
                const sliceBase = baseDamageAfterHand * (weights[s] ?? 0);
                const roll = applyPctJitter(sliceBase, (lvl + index + 101 + s) * 11, pseudoRand);
                const rolledValue = Math.max(1, Math.round(roll * rarityFactor));
                baseAdds[type] = rolledValue;
                bonuses.push(`+${rolledValue} ${type} flat dmg`);
            }
        }
        if (damagePool.length && affixLimit > bonuses.length) {
            for (let a = bonuses.length; a < affixLimit; a += 1) {
                const rollBase = pseudoRand(lvl + index + a * 17);
                if (cat?.allow_attack_speed_mod && rollBase > 0.85 && !bonuses.some((b) => b.includes("Attack Speed"))) {
                    atkBonus += Number(state.attack_speed_slots_auto || 0) > 0 ? 1 : 0;
                    bonuses.push(`+${Math.round(atkBonus)}% Attack Speed`);
                    continue;
                }
                if (cat?.allow_damage_mod && rollBase > 0.65) {
                    const type = pickType((lvl + index + a * 11));
                    if (!dmgMods[type]) {
                        const baseMod = pseudoRand((lvl + index + a * 23) * 5.7);
                        const jittered = applyPctJitter(baseMod * 100, Number(state.mod_damage_jitter_pct ?? 0), (lvl + index + a * 23) * 5.7, pseudoRand);
                        const modVal = Math.round(jittered);
                        if (modVal > 0) {
                            dmgMods[type] = modVal;
                            bonuses.push(`+${modVal}% ${type} dmg mod`);
                        }
                    }
                    continue;
                }
                if (cat?.allow_resist !== false) {
                    const type = pickType((lvl + index + a * 13));
                    if (!usedResistanceTypes.has(type)) {
                        const baseRes = pseudoRand((lvl + index + a * 31) * 6.3) * 10;
                        const jitteredRes = applyPctJitter(baseRes, Number(state.resistance_jitter ?? 0), (lvl + index + a * 31) * 6.3, pseudoRand);
                        const resVal = Math.round(jitteredRes);
                        if (resVal > 0) {
                            resAdds[type] = resVal;
                            usedResistanceTypes.add(type);
                            bonuses.push(`+${resVal}% ${type} res`);
                        }
                    }
                }
            }
        }
        return {
            slot,
            item,
            category: cat,
            itemLevel,
            bonuses,
            baseAdds,
            dmgMods,
            resAdds,
            atkBonus,
            affixLimit,
            typePoolFinal
        };
    };

    return {
        createPseudoRand,
        buildSlices,
        applyPctJitter,
        computeItemLevel,
        pickCategory,
        pickItem,
        computeFlatDamageForLevel,
        generateLootPiece
    };
})();
