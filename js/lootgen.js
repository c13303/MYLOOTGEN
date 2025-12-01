function compute() {
    if (typeof state === "undefined") return;

    const levels = state.levels || 1;
    const rarities = state.rarities || [];
    const items = state.items || [];
    const slots = (state.equipment_slots || []).map((s) => s.name);
    const rarityBaseWeights = state.rarity_base_weights || {};
    const rarityWeightGrowth = state.rarity_weight_growth || 0;
    const damageTypes = state.damage_types || [];
    const normalizeTypeName = (name) => (typeof name === "string" ? name.trim() : name);
    const defaultDamageTypeEntry = damageTypes.find((dt) => dt.default_damage_type) || damageTypes[0] || { name: "Physical" };
    const defaultDmgType = normalizeTypeName(defaultDamageTypeEntry.name);
    const colorMap = damageTypes.reduce((map, dt) => {
        const key = normalizeTypeName(dt.name);
        map[key] = dt.color || "#e2e8f0";
        return map;
    }, {});
    const damageTypeMap = damageTypes.reduce((map, dt) => {
        const key = normalizeTypeName(dt.name);
        map[key] = dt;
        return map;
    }, {});
    const getRarityPower = (cat) => Math.max(0, Number(cat?.rarity_power ?? 1));
    const colorForType = (type) => colorMap[normalizeTypeName(type)] || "#e2e8f0";
    const toRgba = (hex, alpha = 0.2) => {
        if (!hex) return `rgba(255, 255, 255, ${alpha})`;
        let sanitized = hex.replace("#", "").trim();
        if (sanitized.length === 3) sanitized = sanitized.split("").map((char) => `${char}${char}`).join("");
        const parsed = parseInt(sanitized, 16);
        if (Number.isNaN(parsed)) return `rgba(255, 255, 255, ${alpha})`;
        const r = (parsed >> 16) & 255;
        const g = (parsed >> 8) & 255;
        const b = parsed & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    const colorizeBonus = (bonus) => {
        for (const dt of damageTypes) {
            const name = dt.name;
            if (bonus.includes(name)) {
                const isRes = bonus.toLowerCase().includes("res");
                return `<span style="color:${dt.color || "#e2e8f0"}" ${isRes ? 'class="resisttext"' : ""}>${bonus}</span>`;
            }
        }
        return bonus;
    };
    const colorizeTypeLabel = (type, label = type) => `<span style="color:${colorForType(type)}">${label}</span>`;
    const renderBuildLine = (label, value) => `<div class="build-line"><span class="build-line-label">${label}</span><span class="build-line-value">${value}</span></div>`;
    const lootTime = state.median_time_per_loot || 1;
    const additionalLootFactor = state.additional_loot_factor || 1;
    const computeTimeLevelForLevel = (lvl) => {
        const timeMin = Number(state.time_level_min ?? 60);
        const timeMax = Number(state.time_level_max ?? 7200);
        const power = Number(state.time_level_curve ?? 1);
        const denom = Math.max(1, (state.levels || levels) - 1);
        const t = Math.min(1, Math.max(0, (lvl - 1) / denom));
        return timeMin + (timeMax - timeMin) * Math.pow(t, power);
    };
    const generatePercent = Math.max(0, Math.min(100, state.generate_percent ?? 100));
    const attributes = state.attributes || {};
    const attrNames = Object.keys(attributes);
    const baseStats = {};
    attrNames.forEach((attr) => {
        const bounds = attributes[attr] || {};
        baseStats[attr] = Math.round(bounds.min ?? 0);
    });
    const currentStats = { ...baseStats };
    const normalizeAttrKey = (key) => {
        if (key === "physical") return "force";
        if (key === "energy") return "intelligence";
        return key;
    };
    const applyStatGain = (lvl) => {
        if (lvl === 1) return;
        const model = (state.stats_progression_model || "balanced").toLowerCase();
        const gainPerLevel = state.gain_per_level || 0;
        let target = "force";
        if (model === "favorite_intelligence" || model === "favorite_energy") target = "intelligence";
        else if (model === "favorite_dexterity") target = "dexterity";
        else if (model === "balanced") {
            if (attrNames.length > 0) {
                const idx = Math.floor(pseudoRand(lvl * 3.1415) * attrNames.length) % attrNames.length;
                target = normalizeAttrKey(attrNames[idx]);
            }
        } else if (model.startsWith("favorite_")) {
            const specified = normalizeAttrKey(model.replace("favorite_", ""));
            if (attrNames.includes(specified)) target = specified;
        }
        const bounds = attributes[target] || { max: currentStats[target] + gainPerLevel };
        currentStats[target] = Math.min(bounds.max ?? (currentStats[target] + gainPerLevel), currentStats[target] + gainPerLevel);
    };
    const affixHeadroom = state.affix_growth_headroom ?? 5; // extra affixes unlocked by max level
    const baseAttackSpeed = Number(state.attack_speed_min ?? 0);
    const baseResists = {};
    if (state.base_physical_resistance) baseResists.Physical = state.base_physical_resistance;
    const asSlotsAllowed = (state.equipment_slots || []).filter((slot) => slot.allow_attack_speed !== false).length;
    const asSlotDivider = Math.max(1, asSlotsAllowed || state.attack_speed_slots_auto || 1);
    state.attack_speed_slots_auto = asSlotsAllowed;
    const modSlotsAllowed = (state.equipment_slots || []).filter((slot) => slot.allow_damage_mod !== false).length;
    const modSlotDivider = Math.max(1, modSlotsAllowed || state.mod_damage_slots_auto || 1);
    state.mod_damage_slots_auto = modSlotsAllowed;
    const flatSlotsAllowed = (state.equipment_slots || []).filter((slot) => slot.allow_flat_damage !== false).length;
    const flatSlotDivider = Math.max(1, flatSlotsAllowed || state.flat_damage_equipement_slots_auto || 1);
    state.flat_damage_equipement_slots_auto = flatSlotsAllowed;
    const slotRules = new Map((state.equipment_slots || []).map((s) => [s.name, s]));
    const slotPositionMap = new Map();
    (state.equipment_slots || []).forEach((slot, idx) => {
        const pos = Number.isFinite(slot.position) ? slot.position : idx;
        slotPositionMap.set(slot.name, pos);
    });
    const getSlotPriority = (slotName) => {
        if (!slotName) return Number.MAX_SAFE_INTEGER;
        if (slotPositionMap.has(slotName)) return slotPositionMap.get(slotName);
        return slotPositionMap.size + 1;
    };
    let persistedGear = {};
    const offHandSlotName = (state.equipment_slots || []).find((slot) => slot.allow_off_hand)?.name;
    const mainHandSlotName = (state.equipment_slots || []).find((slot) => slot.allow_two_handed)?.name;

    const results = [];
    const jsonData = [];

    const runSeed = Math.random() * 1000000;
    const pseudoRand = (seed) => {
        const x = Math.sin(seed + runSeed) * 10000;
        return x - Math.floor(x);
    };
    const applyPctJitter = (value, pct, seed) => {
        const spread = Math.max(0, pct);
        if (spread === 0) return value;
        const offset = (pseudoRand(seed) * 2 - 1) * spread;
        return Math.max(0, value * (1 + offset));
    };
    const computeAttackSpeedBonusForLevel = (lvl) => {
        const asMin = Number(state.attack_speed_min ?? 0);
        const asMax = Number(state.attack_speed_max ?? asMin);
        const power = Number(state.attack_speed_power_progression ?? 1);
        const denom = Math.max(1, (state.levels || levels) - 1);
        const t = Math.min(1, Math.max(0, (lvl - 1) / denom));
        const aps = asMin + (asMax - asMin) * Math.pow(t, power); // target APS for the build
        const baseAps = Number(state.attack_speed_min ?? 1);
        const delta = Math.max(0, aps - baseAps);
        const pctTotal = baseAps > 0 ? (delta / baseAps) * 100 : 0;
        const pctPerSlot = pctTotal / asSlotDivider;
        return pctPerSlot;
    };
    const computeDamageModForLevel = (lvl) => {
        const modMin = Number(state.mod_damage_min ?? 0);
        const modMax = Number(state.mod_damage_max ?? modMin);
        const power = Number(state.mod_damage_power_progression ?? 1);
        const denom = Math.max(1, (state.levels || levels) - 1);
        const t = Math.min(1, Math.max(0, (lvl - 1) / denom));
        const total = modMin + (modMax - modMin) * Math.pow(t, power);
        return total / modSlotDivider;
    };
    const computeFlatDamageForLevel = (lvl) => {
        const min = Number(state.flat_damage_min ?? 0);
        const median = Number(state.flat_damage_max ?? min);
        const power = Number(state.flat_damage_power_progression ?? 1);
        const denom = Math.max(1, (state.levels || levels) - 1);
        const t = Math.min(1, Math.max(0, (lvl - 1) / denom));
        const total = min + (median - min) * Math.pow(t, power);
        return total / flatSlotDivider;
    };
    const resistSlotsAllowed = (state.equipment_slots || []).filter((slot) => slot.allow_resist !== false).length;
    state.resistance_slots_auto = resistSlotsAllowed;
    const computeResistanceForLevel = (lvl) => {
        const resistMin = Number(state.resistance_affix_min ?? 0);
        const resistMax = Number(state.resistance_affix_max ?? resistMin);
        const power = Number(state.resistance_curve ?? 1);
        const denom = Math.max(1, (state.levels || levels) - 1);
        const t = Math.min(1, Math.max(0, (lvl - 1) / denom));
        const total = resistMin + (resistMax - resistMin) * Math.pow(t, power);
        return total; // No division by slots - each resist affix gets full value
    };
    const applyJitter = (value, seed) => {
        const pct = Math.max(0, Number(state.flat_damage_jitter_pct ?? 0));
        if (pct === 0) return value;
        const offset = (pseudoRand(seed) * 2 - 1) * pct;
        return Math.max(0, value * (1 + offset));
    };
    const buildSlices = (count, maxSlice, seedBase) => {
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
    const formatTime = (sec) => {
        const minutes = sec / 60;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${Math.round(minutes)}m`;
    };

    const computeItemLevel = (playerLevel, seed) => {
        const variance = Math.max(0, Math.min(100, Number(state.item_level_variance ?? 0)));
        if (variance === 0) return playerLevel;

        // Calculate the range based on variance percentage
        // variance% means items can be ±(variance% of max level) from player level
        const maxLevel = state.levels || levels;
        const rangeSize = Math.max(1, Math.round((variance / 100) * maxLevel));

        // Calculate min and max item level with overlap
        const minItemLevel = Math.max(1, playerLevel - Math.floor(rangeSize / 2));
        const maxItemLevel = Math.min(maxLevel, playerLevel + Math.ceil(rangeSize / 2));

        // Random roll within the range
        const rand = pseudoRand(seed);
        const itemLevel = Math.round(minItemLevel + rand * (maxItemLevel - minItemLevel));

        return Math.max(1, Math.min(maxLevel, itemLevel));
    };

    const pickCategory = (seed, currentLevel) => {
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

    const pickItem = (slot, seed) => {
        const available = items.filter((it) => it.equipment_slot === slot);
        if (!available.length) return null;
        const idx = Math.floor(pseudoRand(seed) * available.length) % available.length;
        return available[idx];
    };

    let totalTimeCumulated = 0;
    for (let lvl = 1; lvl <= levels; lvl += 1) {
        applyStatGain(lvl);
        const levelTime = computeTimeLevelForLevel(lvl);
        totalTimeCumulated += levelTime;
        const lootCountRaw = Math.max(1, Math.floor(levelTime / lootTime));
        const lootCount = Math.max(1, Math.round(lootCountRaw * additionalLootFactor));
        const rolledLootCount = Math.max(0, Math.floor(lootCount * generatePercent / 100));
        const readable = formatTime(levelTime);
        const readableTotal = formatTime(totalTimeCumulated);
        const weights = rarities.map((cat) => {
            const unlock = cat.unlock_level || 1;
            if (lvl < unlock) return 0;
            const baseWeight = rarityBaseWeights[cat.name] ?? cat.rarity ?? 0;
            return Math.max(0, baseWeight + rarityWeightGrowth * (lvl - 1));
        });
        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        const percents = weightSum > 0
            ? weights.map((w) => (w / weightSum) * 100)
            : rarities.map(() => 0);
        const distribution = rarities.map((cat, idx) => {
            const unlock = cat.unlock_level || 1;
            if (lvl < unlock) return `${cat.name}: 0%`;
            return `${cat.name}: ${Math.round((percents[idx] || 0) * 10) / 10}%`;
        }).join(", ");
        const baseFlatDmg = computeFlatDamageForLevel(lvl);
        const availableSlots = slots.filter((slotName) => items.some((it) => it.equipment_slot === slotName));
        const lootList = [];
        const asBonuses = [];
        const modBonuses = [];
        const resBonuses = [];
        for (let i = 0; i < rolledLootCount; i += 1) {
            if (!availableSlots.length) break;
            const itemLevel = computeItemLevel(lvl, lvl * 1000 + i * 37);
            const cat = pickCategory(lvl + i + 1, lvl);
            const slot = availableSlots[Math.floor(pseudoRand(lvl + i + 7) * availableSlots.length) % availableSlots.length];
            const item = pickItem(slot, lvl + i + 13);
            if (!item) continue;
            const flatMin = state.flat_damage_types_per_item_min ?? 1;
            const flatMax = state.flat_damage_types_per_item_max ?? 2;
            const sourceSlots = Math.max(0, item.flat_damage_sources || 0);
            const allowFlat = slotRules.get(slot)?.allow_flat_damage !== false;
            let maxSources = allowFlat && sourceSlots > 0 ? Math.max(flatMin, Math.min(flatMax, sourceSlots)) : 0;
            if (maxSources > 1) {
                const multiChance = Math.min(1, Math.max(0, item.flat_damage_sources_multi_chance ?? 0));
                const rollMulti = pseudoRand((lvl + i + 101) * 0.37);
                if (rollMulti > multiChance) {
                    maxSources = 1;
                }
            }
            const growthRatio = levels > 1 ? (lvl - 1) / (levels - 1) : 0;
            const growthSlots = Math.round(affixHeadroom * growthRatio);
            const baseAffixes = Math.max(0, cat?.attributes ?? 0);
            const maxAllowed = item.affix_max ?? (baseAffixes + affixHeadroom);
            let affixLimit = Math.max(0, Math.min(maxAllowed, baseAffixes + growthSlots));
            const typePool = (item.damage_types && item.damage_types.length)
                ? item.damage_types
                : (cat?.attribute_types && cat.attribute_types.length)
                    ? cat.attribute_types
                    : damageTypes.map((dt) => dt.name);
            const typePoolFinal = (cat?.name === "common") ? [defaultDmgType] : typePool;
            if (cat?.name === "common") {
                affixLimit = Math.min(1, affixLimit); // commons: single affix
            }
            const rarityFactor = getRarityPower(cat);
            const bonuses = [];
            const baseAdds = {};
            const dmgAdds = {};
            const dmgMods = {};
            const resAdds = {};
            let atkBonus = 0;
            let damageModType = null; // track single damage type for all damage mods on this item

            const usedDamageTypes = new Set();
            const usedResistanceTypes = new Set(); // track resistance types to avoid duplicates
            const pickType = (seed) => typePoolFinal[Math.floor(pseudoRand(seed) * typePoolFinal.length) % typePoolFinal.length] || defaultDmgType;

            // flat damage sources (only if item allows)
            if (maxSources > 0) {
                const typePoolRemaining = typePoolFinal.filter((t) => !usedDamageTypes.has(t));
                const availableTypes = typePoolRemaining.length || typePoolFinal.length;
                const sourceCount = Math.max(1, Math.min(maxSources, availableTypes));
                let totalBaseDmg = computeFlatDamageForLevel(itemLevel);
                const isOneHand = (slot === "weapon_right" || slot === "hand_left") && !(item.two_handed);
                if (isOneHand) {
                    const ratio = Math.max(0, Number(state.flat_damage_onehand_ratio ?? 1));
                    totalBaseDmg *= ratio;
                }
                const maxSlice = Math.min(1, Math.max(0, item.flat_damage_multiple_max_slice ?? 0.9));
                const weights = buildSlices(sourceCount, maxSlice, (lvl + i + 999));
                for (let s = 0; s < sourceCount; s += 1) {
                    const type = pickType((lvl + i + 101 + s) * (s + 1));
                    if (usedDamageTypes.has(type)) continue;
                    usedDamageTypes.add(type);
                    const sliceBase = totalBaseDmg * (weights[s] ?? 0);
                    const roll = applyJitter(sliceBase, (lvl + i + 101 + s) * 11);
                    const rolledValue = Math.max(1, Math.round(roll * rarityFactor));
                    baseAdds[type] = rolledValue;
                    bonuses.push(`+${rolledValue} ${type} flat dmg`);
                }
            }

            // affix slots (mod/res/AS) up to affixLimit
            for (let a = bonuses.length; a < affixLimit; a += 1) {
                const roll = pseudoRand(lvl + i + a * 17);
                // prioritize mod/res, add AS if allowed and rolled
                if (cat?.allow_attack_speed_mod && roll > 0.85 && !bonuses.some((b) => b.includes("Attack Speed"))) {
                    const baseAtk = Math.round(computeAttackSpeedBonusForLevel(itemLevel));
                    const scaledAtk = baseAtk > 0 ? Math.max(1, Math.round(baseAtk * rarityFactor)) : 0;
                    atkBonus = scaledAtk;
                    if (atkBonus > 0) {
                        asBonuses.push(atkBonus);
                        bonuses.push(`+${atkBonus}% Attack Speed`);
                    }
                } else if (item.damage_modifier !== false && roll > 0.35) {
                    // All damage mods on an item must be the same type, and only ONE damage mod affix per item
                    if (!damageModType) {
                        damageModType = pickType((lvl + i + a * 23) * 1.3);
                        const type = damageModType;
                        const key = type;
                        const baseMod = computeDamageModForLevel(itemLevel);
                        const jittered = applyPctJitter(baseMod, Number(state.mod_damage_jitter_pct ?? 0), (lvl + i + a * 23) * 5.7);
                        const rolledMod = Math.round(jittered * rarityFactor);
                        if (rolledMod > 0) {
                            if (!dmgMods[key]) dmgMods[key] = 0;
                            dmgMods[key] += rolledMod;
                            modBonuses.push(rolledMod);
                            bonuses.push(`+${rolledMod}% ${type} dmg mod`);
                        }
                    }
                    // If damageModType already exists, skip this affix slot (no duplicate dmg mods)
                } else {
                    // Try to pick a resistance type that hasn't been used yet on this item
                    let type = pickType((lvl + i + a * 31) * 1.7);
                    let attempts = 0;
                    while (usedResistanceTypes.has(type) && attempts < typePoolFinal.length) {
                        type = pickType((lvl + i + a * 31 + attempts) * 1.7);
                        attempts += 1;
                    }
                    // Only add resistance if this type hasn't been used yet
                    if (!usedResistanceTypes.has(type)) {
                        usedResistanceTypes.add(type);
                        const key = type;
                        const baseRes = computeResistanceForLevel(itemLevel);
                        const jittered = applyPctJitter(baseRes, Number(state.resistance_jitter ?? 0), (lvl + i + a * 31) * 6.3);
                        const resistCap = Number(state.resistance_cap ?? 100);
                        const cappedRes = Math.min(jittered * rarityFactor * 100, resistCap); // convert to percentage and apply cap
                        const rolledRes = Math.round(cappedRes);
                        if (rolledRes > 0) {
                            if (!resAdds[key]) resAdds[key] = 0;
                            resAdds[key] += rolledRes;
                            resBonuses.push(rolledRes);
                            bonuses.push(`+${rolledRes}% ${type} res`);
                        }
                    }
                }
            }

            const lootItem = {
                slot,
                category: cat?.name || "none",
                name: item.name,
                itemLevel: itemLevel,
                bonuses,
                dmgAdds,
                baseAdds,
                dmgMods,
                resAdds,
                atkBonus
            };
            lootItem.foundThisLevel = false;
            lootList.push(lootItem);
        }

        const lootFlatValuesRaw = lootList.flatMap((l) => Object.values(l.baseAdds || {}));
        const lootFlatValues = lootFlatValuesRaw.filter((v) => v > 0);
        const flatMinSource = lootFlatValues.length ? Math.min(...lootFlatValues) : 0;
        const flatMaxSource = lootFlatValues.length ? Math.max(...lootFlatValues) : 0;
        const lootWeaponTotalsRaw = lootList.map((l) => Object.values(l.baseAdds || {}).reduce((sum, v) => sum + v, 0));
        const lootWeaponTotals = lootWeaponTotalsRaw.filter((v) => v > 0);
        const flatMinWeapon = lootWeaponTotals.length ? Math.min(...lootWeaponTotals) : 0;
        const flatMaxWeapon = lootWeaponTotals.length ? Math.max(...lootWeaponTotals) : 0;
        const asMin = asBonuses.length ? Math.min(...asBonuses) : 0;
        const asMax = asBonuses.length ? Math.max(...asBonuses) : 0;
        const modMin = modBonuses.length ? Math.min(...modBonuses) : 0;
        const modMax = modBonuses.length ? Math.max(...modBonuses) : 0;
        const resMin = resBonuses.length ? Math.min(...resBonuses) : 0;
        const resMax = resBonuses.length ? Math.max(...resBonuses) : 0;

        const safeResistanceCap = Math.max(0, Number(state.resistance_cap ?? 0));
        const clampResistMap = (resists) => {
            const result = {};
            Object.entries(resists || {}).forEach(([type, value]) => {
                const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
                result[type] = Math.max(0, Math.min(safeResistanceCap, numeric));
            });
            return result;
        };

        const resistanceScoreWeight = Number(state.resistance_score_weight ?? 0.1);
        const computeBuildScore = (evaluation) => {
            const base = evaluation?.dps ?? 0;
            if (!resistanceScoreWeight) return base;
            const totalResists = Object.values(evaluation.resists || {}).reduce((sum, value) => sum + Math.max(0, value), 0);
            return base + totalResists * resistanceScoreWeight;
        };

        const evaluateGear = (equippedGear, stats, baseAPS, unarmedDamage, currentLvl) => {
            const totals = {
                flat: {},
                mods: {},
                resists: { ...baseResists },
                atkBonus: 0,
            };

            Object.values(equippedGear).forEach(item => {
                if (!item) return;
                for (const type in item.baseAdds) {
                    totals.flat[type] = (totals.flat[type] || 0) + item.baseAdds[type];
                }
                for (const type in item.dmgMods) {
                    totals.mods[type] = (totals.mods[type] || 0) + item.dmgMods[type];
                }
                for (const type in item.resAdds) {
                    totals.resists[type] = (totals.resists[type] || 0) + item.resAdds[type];
                }
                totals.atkBonus += item.atkBonus || 0;
            });

            const finalAPS = baseAPS * (1 + totals.atkBonus / 100);
            const finalUnarmed = unarmedDamage;

            let totalDPS = 0;

            const allDmgTypes = new Set([...Object.keys(totals.flat), ...Object.keys(totals.mods), defaultDmgType]);

            if (Object.keys(totals.flat).length === 0) {
                totals.flat[defaultDmgType] = finalUnarmed;
            } else {
                totals.flat[defaultDmgType] = (totals.flat[defaultDmgType] || 0) + finalUnarmed;
            }

            allDmgTypes.forEach(type => {
                const flat = totals.flat[type] || 0;
                const mod = totals.mods[type] || 0;
                const dtConfig = damageTypeMap[type];
                const attributeKey = normalizeAttrKey(dtConfig?.attribute ?? defaultDmgType);
                const attrValue = stats[attributeKey] ?? 0;
                const modifier = Number(dtConfig?.attribute_modifier ?? state.attribute_modifier_default ?? 0);
                const attrMultiplier = Math.max(0, 1 + modifier * attrValue);
                totalDPS += flat * (1 + mod / 100) * finalAPS * attrMultiplier;
            });

            return { dps: totalDPS, resists: clampResistMap(totals.resists) };
        };

        const summarizeItemImpact = (gearItem) => {
            if (!gearItem) return { flat: {}, mod: {}, atk: 0, res: {} };
            const flatStats = {};
            const modStats = {};
            const resStats = {};
            Object.entries(gearItem.baseAdds || {}).forEach(([type, value]) => {
                flatStats[type] = value || 0;
            });
            Object.entries(gearItem.dmgMods || {}).forEach(([type, value]) => {
                modStats[type] = value || 0;
            });
            Object.entries(gearItem.resAdds || {}).forEach(([type, value]) => {
                resStats[type] = value || 0;
            });
            const atk = gearItem.atkBonus || 0;
            return { flat: flatStats, mod: modStats, atk, res: resStats };
        };

        const computeTypeDeltas = (prevMap, nextMap) => {
            const deltas = {};
            const types = new Set([...Object.keys(prevMap || {}), ...Object.keys(nextMap || {})]);
            types.forEach((type) => {
                deltas[type] = (nextMap[type] || 0) - (prevMap[type] || 0);
            });
            return deltas;
        };

        const findBestTypeDelta = (deltas) => {
            let best = { type: null, value: Number.NEGATIVE_INFINITY };
            Object.entries(deltas).forEach(([type, value]) => {
                if (value > best.value) {
                    best = { type, value };
                }
            });
            if (best.value === Number.NEGATIVE_INFINITY) {
                return { type: null, value: 0 };
            }
            return best;
        };

        const describeSwapReason = (prevItem, candidate, prevDPS, newDPS) => {
            const prevStats = summarizeItemImpact(prevItem);
            const newStats = summarizeItemImpact(candidate);
            const flatDeltas = computeTypeDeltas(prevStats.flat, newStats.flat);
            const modDeltas = computeTypeDeltas(prevStats.mod, newStats.mod);
            const resDeltas = computeTypeDeltas(prevStats.res, newStats.res);
            const bestFlat = findBestTypeDelta(flatDeltas);
            const bestMod = findBestTypeDelta(modDeltas);
            const atkDelta = newStats.atk - prevStats.atk;

            const candidates = [
                { name: "flat", value: bestFlat.value, type: bestFlat.type || defaultDmgType },
                { name: "mod", value: bestMod.value, type: bestMod.type || defaultDmgType },
                { name: "atk", value: atkDelta, type: null }
            ];
            const best = candidates.reduce((acc, curr) => (curr.value > acc.value ? curr : acc), { name: "flat", value: Number.NEGATIVE_INFINITY, type: defaultDmgType });

            const formatValue = (val) => `${val >= 0 ? "+" : ""}${Math.round(val)}`;
            const dpsDelta = Math.round(newDPS - prevDPS);
            const resistEntries = Object.entries(resDeltas).filter(([, delta]) => delta !== 0);
            const formatResistDelta = (type, value) => `<span class="resisttext" style="color:${colorForType(type)}">${type} ${formatValue(value)}%</span>`;
            const resistLine = resistEntries.length
                ? `<div class="swap-reason-detail">Resistances : ${resistEntries.map(([type, delta]) => formatResistDelta(type, delta)).join(", ")}</div>`
                : "";

            const showDpsLine = dpsDelta !== 0;
            const roundedBestValue = Math.round(best.value);
            const showDescription = roundedBestValue !== 0;

            let description = "";
            if (showDescription) {
                if (best.name === "atk") {
                    description = `AS ${formatValue(best.value)}%`;
                } else {
                    const statLabel = best.name === "flat" ? "flat" : "mod";
                    const typeName = best.type || defaultDmgType;
                    const statDescription = `${typeName} ${statLabel} ${formatValue(best.value)}`;
                    description = `<span style="color:${colorForType(typeName)}">${statDescription}</span>`;
                }
            }

            if (!showDpsLine && !showDescription && !resistLine) {
                return null;
            }

            const dpsLine = showDpsLine ? `<div class="swap-reason-detail">DPS ${formatValue(dpsDelta)}</div>` : "";
            return {
                text: `${dpsLine}${description}${resistLine}`,
                param: best.name,
            };
        };

        let bestGear = { ...persistedGear };
        Object.values(bestGear).forEach((item) => {
            if (item) item.foundThisLevel = false;
        });
        const unarmedDamage = state.unarmed_physical_damage || 0;
        let bestEvaluation = evaluateGear(bestGear, currentStats, baseAttackSpeed, unarmedDamage, lvl);
        let bestScore = computeBuildScore(bestEvaluation);
        const iterationLimit = Math.max(1, (lootList.length || 1) * 2);
        let iterations = 0;
        while (iterations < iterationLimit) {
            let bestSwap = null;
            lootList.forEach((item) => {
                const slotName = item.slot;
                if (!slotName || bestGear[slotName] === item) return;
                const tempGear = { ...bestGear, [slotName]: item };

                // If equipping a two-handed weapon, remove off-hand
                if (item.two_handed && offHandSlotName && offHandSlotName !== slotName) {
                    tempGear[offHandSlotName] = undefined;
                }

                // If equipping an off-hand, remove two-handed weapon from main hand
                if (slotName === offHandSlotName && mainHandSlotName) {
                    const mainHandItem = tempGear[mainHandSlotName];
                    if (mainHandItem?.two_handed) {
                        tempGear[mainHandSlotName] = undefined;
                    }
                }

                const tempEvaluation = evaluateGear(tempGear, currentStats, baseAttackSpeed, unarmedDamage, lvl);
                const tempScore = computeBuildScore(tempEvaluation);
                const delta = tempScore - bestScore;
                if (!bestSwap || delta > bestSwap.delta) {
                    bestSwap = {
                        delta,
                        slotName,
                        item,
                        tempGear,
                        evaluation: tempEvaluation,
                        score: tempScore,
                        prevItem: bestGear[slotName]
                    };
                }
            });
            if (!bestSwap || bestSwap.delta <= 0) break;
            const prevDps = bestEvaluation.dps;
            const swapReason = describeSwapReason(bestSwap.prevItem, bestSwap.item, prevDps, bestSwap.evaluation.dps);
            if (swapReason) {
                bestSwap.item.swapReason = swapReason;
            }
            bestGear = bestSwap.tempGear;
            bestEvaluation = bestSwap.evaluation;
            bestScore = bestSwap.score;
            iterations += 1;
        }

        const finalScore = Math.max(0, bestScore);

        const equippedGearList = Object.values(bestGear).filter(Boolean).sort((a, b) => getSlotPriority(a.slot) - getSlotPriority(b.slot));
        const equippedItems = new Set(equippedGearList);
        lootList.forEach((l) => {
            const isEquipped = equippedItems.has(l);
            l.foundThisLevel = isEquipped;
            l.equippedStatus = isEquipped ? 'Equipped' : 'Not equipped';
        });
        const newItemsEquipped = equippedGearList.filter((item) => item.foundThisLevel).length;

        const lootRows = lootList.map((l) => {
            const catColor = (rarities.find((c) => c.name === l.category)?.color) || "#e2e8f0";
            const sortedBonuses = (l.bonuses || []).slice().sort((a, b) => {
                const getOrder = (bonus) => {
                    if (bonus.includes("flat dmg")) return 0;
                    if (bonus.includes("dmg mod")) return 1;
                    if (bonus.includes("res")) return 2;
                    if (bonus.includes("Attack Speed")) return 3;
                    return 4;
                };
                return getOrder(a) - getOrder(b);
            });
            const bonusText = (sortedBonuses && sortedBonuses.length) ? sortedBonuses.map((b) => colorizeBonus(b)).join("<br>") : "None";
            const statusText = l.equippedStatus === 'Equipped' ? `<span class="equip-reason equipped">${l.equippedStatus}</span>` : `<span class="equip-reason muted">${l.equippedStatus}</span>`;
            const itemLevelBadge = `<span style="color:#94a3b8">iLvl ${l.itemLevel || lvl}</span>`;
            return `
      <tr>
        <td><span style="color:#facc15">${l.slot}</span></td>
        <td><span style="color:${catColor}">${l.name}</span> ${itemLevelBadge}</td>
        <td><span style="color:${catColor}">${l.category}</span></td>
        <td>${bonusText}</td>
        <td>${statusText}</td>
      </tr>`;
        }).join("");

        const allLootHtml = lootList.length ? `<div class="loot-table"><table>...</table></div>` : '<div class="loot-table empty">No loot</div>'; // Simplified for brevity

        const equippedGearRows = equippedGearList.map((l) => {
            const catColor = (rarities.find((c) => c.name === l.category)?.color) || "#e2e8f0";
            const sortedBonuses = (l.bonuses || []).slice().sort((a, b) => {
                const getOrder = (bonus) => {
                    if (bonus.includes("flat dmg")) return 0;
                    if (bonus.includes("mod")) return 1;
                    if (bonus.includes("res")) return 2;
                    if (bonus.includes("AS")) return 3;
                    return 4;
                };
                return getOrder(a) - getOrder(b);
            });
            const bonusText = (sortedBonuses && sortedBonuses.length) ? sortedBonuses.map((b) => colorizeBonus(b)).join("<br>") : "None";
            /*             const foundBadge = l.foundThisLevel ? `<span class="found-indicator">found in this level</span>` : '&mdash;'; */
            const swapReasonHtml = (l.foundThisLevel && l.swapReason) ? `<div class="swap-reason">${l.swapReason.text}</div>` : "";
            const itemLevelBadge = `<span style="color:#94a3b8">iLvl ${l.itemLevel || lvl}</span>`;
            return `
                <tr>
                    <td><span style="color:#facc15">${l.slot}</span></td>
                    <td><span style="color:${catColor}">${l.name}</span> ${itemLevelBadge}</td>
                    <td><span style="color:${catColor}">${l.category}</span></td>
                    <td>${bonusText}</td>
                    <td>${swapReasonHtml}</td>
                </tr>`;
        }).join("");

        const gearScoreHtml = `<div class="gear-score">Equiped Score : ${Math.round(finalScore)}</div>`;
        const gearTableWithData = `<div class="gear-table"><table><thead><tr><th>Slot</th><th>Item</th><th>Cat.</th><th class="bonustd">Bonuses</th><th>Found this lvl</th></tr></thead><tbody>${equippedGearRows}</tbody></table></div>`;
        const gearTableHtml = equippedItems.size > 0
            ? `${gearScoreHtml}${gearTableWithData}`
            : `<div class="gear-table empty">${gearScoreHtml}<div>No gear</div></div>`;

        const finalTotals = { flat: {}, mods: {}, resists: { ...baseResists }, atkBonus: 0 };
        equippedItems.forEach(item => {
            for (const type in item.baseAdds) finalTotals.flat[type] = (finalTotals.flat[type] || 0) + item.baseAdds[type];
            for (const type in item.dmgMods) finalTotals.mods[type] = (finalTotals.mods[type] || 0) + item.dmgMods[type];
            for (const type in item.resAdds) finalTotals.resists[type] = (finalTotals.resists[type] || 0) + item.resAdds[type];
            finalTotals.atkBonus += item.atkBonus || 0;
        });
        finalTotals.resists = clampResistMap(finalTotals.resists);

        const finalAPS = baseAttackSpeed * (1 + finalTotals.atkBonus / 100);
        const finalUnarmed = (state.unarmed_physical_damage || 0);
        if (Object.keys(finalTotals.flat).length === 0) {
            finalTotals.flat[defaultDmgType] = finalUnarmed;
        } else {
            finalTotals.flat[defaultDmgType] = (finalTotals.flat[defaultDmgType] || 0) + finalUnarmed;
        }

        const damageBreakdown = {};
        const allFinalDmgTypes = new Set([...Object.keys(finalTotals.flat), ...Object.keys(finalTotals.mods), defaultDmgType]);
        allFinalDmgTypes.forEach(type => {
            const flat = finalTotals.flat[type] || 0;
            const mod = finalTotals.mods[type] || 0;
            damageBreakdown[type] = {
                flat: flat,
                mod: mod,
                dps: flat * (1 + mod / 100) * finalAPS,
            };
        });

        const breakdownEntries = Object.entries(damageBreakdown)
            .filter(([, data]) => Math.round(data.dps) > 0)
            .sort(([, a], [, b]) => b.dps - a.dps);
        const breakdownHtml = breakdownEntries.length > 0
            ? `<div class="build-table">
                <table>
                    <thead><tr><th>Type</th><th>Flat</th><th>Mod</th><th>DPS</th></tr></thead>
                    <tbody>
                        ${breakdownEntries.map(([type, data]) => {
                const rowColor = colorForType(type);
                const modDisplay = `${data.mod >= 0 ? "+" : ""}${Math.round(data.mod)}%`;
                return `
                        <tr class="build-damage-row" style="border-left: 4px solid ${rowColor};">
                            <td><span class="build-damage-type" style="color:${rowColor}">${type}</span></td>
                            <td style="color:${rowColor}">${Math.round(data.flat)}</td>
                            <td style="color:${rowColor}">${modDisplay}</td>
                            <td style="color:${rowColor}">${Math.round(data.dps)}</td>
                        </tr>`;
            }).join("")}
                    </tbody>
                </table>
            </div>`
            : '<div class="build-table empty">No damage</div>';

        const totalDPS = Object.values(damageBreakdown).reduce((sum, data) => sum + data.dps, 0);
        const statsLinePretty = attrNames.length ? attrNames.map((a) => `${a}: ${currentStats[a] ?? 0}`).join(" | ") : "none";
        const resistEntries = Object.entries(finalTotals.resists);
        const formatResistBadge = ([type, value]) => {
            const color = colorForType(type);
            const background = toRgba(color, 0.18);
            return `<span class="resisttext" style=" color:${color};">${type}: ${value}%</span> <br/>`;
        };
        const resLinePretty = resistEntries.length
            ? resistEntries.map(formatResistBadge).join(" ")
            : "none";
        const totalDPSDisplay = Math.round(totalDPS);
        const breakdownSummaryChips = breakdownEntries.map(([type, data]) => {
            const percent = totalDPS ? Math.round((data.dps / totalDPS) * 100) : 0;
            if (percent <= 15) return "";
            const color = colorForType(type);
            return `<span class="summary-dps-chip" style="border-color:${color}; background:${toRgba(color, 0.22)}; color:${color};">${type} ${percent}%</span> <br/>`;
        }).filter(Boolean);
        const equippedNotice = newItemsEquipped
            ? `<span class="summary-gear-notice">${newItemsEquipped} item${newItemsEquipped === 1 ? "" : "s"} equipped </span>`
            : `<span class="summary-gear-notice summary-gear-empty">no items equipped !</span>`;
        const scoreBadge = `<span class="summary-score-chip">Score ${Math.round(finalScore)}</span>`;
        const mixSegment = breakdownSummaryChips.length
            ? `<span class="summary-mix-line"><span class="summary-dps-total">${totalDPSDisplay} DPS</span> ${breakdownSummaryChips.join(" ")} ${equippedNotice}</span>`
            : `<span class="summary-mix-line">${equippedNotice}</span>`;
        const baseSummaryParts = [
            `Lvl ${lvl}`,
            `<span class="dim-blue">${readable}</span>`,
            `<span class="dim-blue">Total: ${readableTotal}</span>`,
            `<span class="dim-blue">loot ~ ${lootList.length}</span>`
        ];
        const summaryText = `<span class="summary-col base">${baseSummaryParts.join(" | ")}</span><span class="summary-col mix">${mixSegment}</span>`;

        results.push(`
<details class="compute-card" ${lvl === levels ? "open" : ""}>
  <summary>${summaryText}</summary>
  <div class="body">
    <div class="level-meta">
      <div>Distribution: ${distribution || "none"}</div>    
      <div class="loot-meta">Loot Values : Flat dmg: ${flatMinSource}-${flatMaxSource} (src) | ${flatMinWeapon}-${flatMaxWeapon} (weapon) | Dmg mod: +${modMin}% - +${modMax}% | Resists: +${resMin}% - +${resMax}% | AS: +${asMin}% - +${asMax}%</div>
    </div>
    <div class="level-grid">
      <div class="level-col lootlist">
       
        ${gearTableHtml}
        <details>
          <summary style="color:#cbd5e1; background-color: #27182d;">🧰 See all loot generated in this level (${lootList.length})</summary>
          <div class="loot-table"><table>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Item</th>
                  <th>Cat.</th>
                  <th>Bonuses</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${lootRows}
              </tbody>
            </table></div>
        </details>
      </div>
      <div class="level-col buildie">
        <div class="build-block">
          <div class="build-heading">Build snapshot</div>
          ${renderBuildLine("Stats : ", statsLinePretty)}
          ${renderBuildLine("Attack Speed : ", finalAPS.toFixed(2))}
          ${renderBuildLine("Resists : ", resLinePretty)}
          <div class="build-subtitle">Damage breakdown</div>
          ${breakdownHtml}
          ${renderBuildLine("DPS total : ", Math.round(totalDPS))}
        </div>
      </div>
    </div>
  </div>
</details>
        `);

        persistedGear = { ...bestGear };

        jsonData.push({
            level: lvl,
            time_readable: readable,
            loot_count: lootList.length,
            xp_level: 0,
            xp_total: 0,
            distribution,
            stats: { ...currentStats },
            attr_bounds: {},
            attr_range: "0-0",
            gear: Object.values(bestGear).filter(Boolean),
            all_loot: lootList,
            totals: {
                damage: damageBreakdown,
                resists: finalTotals.resists,
                attack_speed: finalAPS,
                dps_total: totalDPS,
                score: finalScore
            }
        });
    }

    const container = document.getElementById("compute-result");
    if (container) {
        const levelDetails = results.join("");
        const wrapped = `<details class="compute-levels" open><summary class="section-title">Level per level details</summary>${levelDetails}</details>`;
        container.innerHTML = ['<div class="result-title">BUILD SIMPLIFIED</div>', wrapped].join("") + `<div class="compute-actions"><button type="button" class="compute-json-btn" id="recompute-btn">Compute again</button><button type="button" class="compute-json-btn" id="copy-headers">Copy Leveling Headers</button><button type="button" class="compute-json-btn" id="copy-loot">Copy Loot Progression</button></div>`;

        const copyText = (text) => {
            try {
                if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                    navigator.clipboard.writeText(text).catch(() => { });
                    return;
                }
            } catch (_) { /* fall back */ }
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand("copy"); } catch (_) { }
            document.body.removeChild(ta);
        };

        const copyHeadersBtn = document.getElementById("copy-headers");
        if (copyHeadersBtn) {
            copyHeadersBtn.onclick = () => {
                const headers = jsonData.map((entry) => `Lvl ${entry.level} | ${Math.round(entry.totals.dps_total)} DPS | ${entry.time_readable} | ${entry.loot_count} loot`).join("\n");
                copyText(headers);
            };
        }

        const copyLootBtn = document.getElementById("copy-loot");
        if (copyLootBtn) {
            copyLootBtn.onclick = () => {
                const lootText = jsonData.map((entry) => {
                    const header = `Lvl ${entry.level} | ${entry.time_readable} | loot ~ ${entry.loot_count}`;
                    const lootLines = (entry.all_loot || []).map((loot) => `  - ${loot.slot}: ${loot.name} [${loot.category}]`);
                    return [header, ...lootLines].join("\n");
                }).join("\n\n");
                copyText(lootText);
            };
        }

        const recomputeBtn = document.getElementById("recompute-btn");
        if (recomputeBtn) {
            recomputeBtn.onclick = () => {
                if (typeof compute === "function") compute();
            };
        }

        // scroll to last level and ensure it's open
        const lastLevel = container.querySelector(".compute-card:last-of-type");
        if (lastLevel) {
            lastLevel.open = true;
            setTimeout(() => {
                lastLevel.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
        }
    }
}
