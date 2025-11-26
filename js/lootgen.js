function compute() {
    if (typeof state === "undefined") return;
    const levels = state.levels || 1;
    const categories = state.categories || [];
    const baseLevelTime = state.median_time_per_level || 0;
    const lootTime = state.median_time_per_loot || 1;
    const timeMult = state.level_time_multiplier || 0;
    const xpBase = state.xp_base || 0;
    const xpGrowth = state.xp_growth || 1;
    const xpMult = state.xp_multiplier || 1;
    const gainPerLevel = state.gain_per_level || 0;
    const attributes = state.attributes || {};
    if (attributes.physical && !attributes.force) {
        attributes.force = attributes.physical;
        delete attributes.physical;
    }
    if (attributes.energy && !attributes.intelligence) {
        attributes.intelligence = attributes.energy;
        delete attributes.energy;
    }
    if (state.stats_progression_model === "favorite_physical") state.stats_progression_model = "favorite_force";
    if (state.stats_progression_model === "favorite_energy") state.stats_progression_model = "favorite_intelligence";
    const attrNames = Object.keys(attributes);
    const slotsList = (state.equipment_slots || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
    const slots = slotsList.map((s) => s.name);
    const slotPositions = slotsList.reduce((map, s) => {
        map[s.name] = s.position;
        return map;
    }, {});
    const normalizeAttrKey = (key) => {
        if (key === "physical") return "force";
        if (key === "energy") return "intelligence";
        return key;
    };

    const items = state.items || [];
    const damageTypes = state.damage_types || [];
    const attributeModifierDefault = typeof state.attribute_modifier_default === "number" ? state.attribute_modifier_default : 0.6;
    damageTypes.forEach((dt) => {
        if (!dt.attribute) dt.attribute = dt.name === "Physical" ? "force" : "intelligence";
        if (typeof dt.attribute_modifier !== "number") dt.attribute_modifier = attributeModifierDefault;
    });
    const damageTypeAttrMap = damageTypes.reduce((map, dt) => {
        map[dt.name] = {
            attr: normalizeAttrKey(dt.attribute || "force"),
            mod: typeof dt.attribute_modifier === "number" ? dt.attribute_modifier : attributeModifierDefault
        };
        return map;
    }, {});
    const damageTypesSorted = [...damageTypes].sort((a, b) => (b.name || "").length - (a.name || "").length);
    const rarityBaseWeights = state.rarity_base_weights || {};
    const raritySoftCaps = state.rarity_soft_caps || {};
    const rarityPityThresholds = state.rarity_pity_thresholds || {};
    const rarityUnlockWindow = state.rarity_unlock_window ?? 10;
    const raritySigmoidK = state.rarity_sigmoid_k ?? 0.4;
    const colorMap = damageTypesSorted.reduce((map, dt) => {
        map[dt.name] = dt.color || "#ffffff";
        return map;
    }, {});
    const categoryColorMap = (state.categories || []).reduce((map, cat) => {
        map[cat.name] = cat.color || "#ffffff";
        return map;
    }, {});
    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const growthRate = state.base_damage_growth_rate || 1;
    const jitterPct = state.base_damage_jitter_pct || 0;
    const rollGrowth = (baseVal, lvl, seed) => {
        if (!baseVal || growthRate <= 0) return 0;
        const median = baseVal * Math.pow(growthRate, Math.max(0, lvl - 1));
        const jitter = 1 + (pseudoRand(seed) * jitterPct); // upward-only jitter to avoid regressions
        return Math.max(0, Math.round(median * jitter));
    };
    const colorizeTypeText = (text) => {
        let result = text;
        damageTypesSorted.forEach((dt) => {
            const name = dt.name;
            const color = dt.color || "#ffffff";
            const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, "g");
            result = result.replace(regex, `<span style="color:${color}">${name}</span>`);
        });
        return result;
    };
    const colorizeBonus = (bonus) => {
        for (const dt of damageTypesSorted) {
            const name = dt.name;
            if (bonus.includes(name)) {
                const isRes = bonus.toLowerCase().includes("res");
                return `<span style="color:${dt.color || "#ffffff"}" ${isRes ? 'class="resisttext"' : ""}>${bonus}</span>`;
            }
        }
        return bonus;
    };
    const baseUnarmed = state.unarmed_physical_damage || 0;
    const basePhysRes = state.base_physical_resistance || 0;
    const generatePercent = state.generate_percent || 0;
    const lootRandRange = state.loot_rand_range || 0;
    const fmt = (v, digits = 0) => {
        if (!Number.isFinite(v)) return "0";
        const factor = 10 ** digits;
        return `${Math.round(v * factor) / factor}`;
    };
    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    let totalXp = 0;
    let totalSeconds = 0;
    const results = [];
    const jsonData = [];
    const dpsSeries = [];
    const pityCounters = {};
    categories.forEach((cat) => {
        pityCounters[cat.name] = 0;
    });

    // persist best gear across levels to avoid DPS drops
    const gearBySlot = {}; // slot -> { loot, atkBonus, dmgAdds, resAdds }

    const runSeed = Math.random() * 1000000;
    const pseudoRand = (seed) => {
        const x = Math.sin(seed + runSeed) * 10000;
        return x - Math.floor(x);
    };

    const applySoftCaps = (percents) => {
        const capped = [];
        let surplus = 0;
        percents.forEach((pct, idx) => {
            const cat = categories[idx];
            const cap = raritySoftCaps[cat.name];
            if (typeof cap === "number" && cap >= 0 && pct > cap) {
                capped[idx] = cap;
                surplus += pct - cap;
            } else {
                capped[idx] = pct;
            }
        });
        if (surplus <= 0) return capped;
        let recipientTotal = 0;
        const recipients = [];
        capped.forEach((pct, idx) => {
            const cap = raritySoftCaps[categories[idx].name];
            const isCapped = typeof cap === "number" && pct >= cap;
            if (!isCapped && pct > 0) {
                recipientTotal += pct;
                recipients.push(idx);
            }
        });
        if (recipientTotal <= 0 || recipients.length === 0) return capped;
        recipients.forEach((idx) => {
            const share = capped[idx] / recipientTotal;
            capped[idx] += surplus * share;
        });
        return capped;
    };

    const damagePoolForLevel = (level, allowedNames) => {
        const allowed = new Set(
            (allowedNames && allowedNames.length)
                ? allowedNames
                : damageTypes.map((dt) => dt.name)
        );
        if (level <= 5 && allowed.has("Physical")) {
            return [{ name: "Physical", weight: 1 }];
        }
        const weighted = damageTypes
            .filter((dt) => allowed.has(dt.name))
            .map((dt) => {
                const weight = (dt.ranges || []).reduce((sum, range) => {
                    const [min, max, rarity] = range;
                    if (level >= min && level <= max) {
                        return sum + (rarity ?? 1);
                    }
                    return sum;
                }, 0);
                return { name: dt.name, weight };
            })
            .filter((entry) => entry.weight > 0);

        if (weighted.length > 0) return weighted;

        // Fallback: keep allowed types but unweighted to avoid empty pools
        const fallback = damageTypes
            .filter((dt) => allowed.has(dt.name))
            .map((dt) => ({ name: dt.name, weight: 1 }));
        if (fallback.length > 0) return fallback;

        // Absolute fallback
        return [{ name: "Physical", weight: 1 }];
    };

    const pickWeightedDamageType = (pool, seed) => {
        if (!pool || pool.length === 0) return null;
        const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
        if (total <= 0) return pool[0].name;
        let target = pseudoRand(seed) * total;
        for (let i = 0; i < pool.length; i += 1) {
            target -= pool[i].weight;
            if (target <= 0) return pool[i].name;
        }
        return pool[pool.length - 1].name;
    };

    const pickDamage = (seed) => {
        if (damageTypes.length === 0) return "Physical";
        const idx = Math.floor(pseudoRand(seed) * damageTypes.length) % damageTypes.length;
        return damageTypes[idx].name;
    };

    const extractAtkBonus = (bonuses) => bonuses
        .filter((b) => b.includes("Attack Speed"))
        .reduce((sum, b) => sum + (parseInt(b.replace(/\D/g, ""), 10) || 0), 0);

    const aggregateWithGear = (baseDamage, baseResists, unarmedBase, slotOverride, lootOverride) => {
        const damageAdds = { ...baseDamage };
        const baseFromGear = new Set();
        const resists = { ...baseResists };
        const damageMods = {};
        let atkBonus = 0;
        let hasWeaponDamage = false;
        const slotsToApply = new Set([...Object.keys(gearBySlot), ...(slotOverride ? [slotOverride] : [])]);
        slotsToApply.forEach((slot) => {
            const source = slot === slotOverride ? lootOverride : gearBySlot[slot]?.loot;
            if (!source) return;
            const isWeaponSlot = slot === "weapon_right" || slot === "weapon_left";
            Object.entries(source.baseAdds || {}).forEach(([k, v]) => {
                damageAdds[k] = (damageAdds[k] || 0) + v;
                baseFromGear.add(k);
                if (isWeaponSlot && v > 0) hasWeaponDamage = true;
            });
            Object.entries(source.dmgAdds || {}).forEach(([k, v]) => {
                damageAdds[k] = (damageAdds[k] || 0) + v;
                baseFromGear.add(k);
            });
            Object.entries(source.dmgMods || {}).forEach(([k, v]) => { damageMods[k] = (damageMods[k] || 0) + v; });
            Object.entries(source.resAdds || {}).forEach(([k, v]) => { resists[k] = (resists[k] || 0) + v; });
            atkBonus += source.atkBonus || 0;
        });
        if (!hasWeaponDamage && unarmedBase > 0) {
            damageAdds.Physical = (damageAdds.Physical || 0) + unarmedBase;
        }
        const damage = {};
        const allTypes = new Set([...Object.keys(damageAdds), ...Object.keys(damageMods)]);
        allTypes.forEach((k) => {
            const baseRaw = damageAdds[k] || 0;
            const attrMeta = damageTypeAttrMap[k];
            const shouldScaleWithAttr = baseFromGear.has(k);
            const attrScale = baseRaw > 0 && shouldScaleWithAttr && attrMeta
                ? 1 + (currentStats[attrMeta.attr] || 0) * (attrMeta.mod || 0)
                : 1;
            const base = baseRaw * attrScale;
            const mod = damageMods[k] || 0;
            damage[k] = base * (1 + mod / 100);
        });
        return { damage, resists, atkBonus, adds: damageAdds, mods: damageMods };
    };

    const computeTotalDps = (damageTotals, attackSpeed) => {
        const values = Object.values(damageTotals || {});
        if (values.length === 0) return 0;
        return values.reduce((sum, v) => sum + v * attackSpeed, 0);
    };

    const currentStats = {};
    attrNames.forEach((attr) => {
        const norm = normalizeAttrKey(attr);
        const bounds = attributes[norm] || { min: 0 };
        currentStats[norm] = Math.round(bounds.min || 0);
    });

    const applyStatGain = (lvl) => {
        if (lvl === 1) return;
        const model = (state.stats_progression_model || "balanced").toLowerCase();
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

    for (let lvl = 1; lvl <= levels; lvl += 1) {
        applyStatGain(lvl);
        const growth = Math.pow(1 + 0.05 * timeMult, lvl - 1);
        const levelTime = baseLevelTime * growth;
        const lootCountRaw = Math.max(1, Math.floor(levelTime / lootTime));
        const lootCount = Math.max(1, Math.round(lootCountRaw * (state.additional_loot_factor || 1)));
        const xpForLevel = xpBase * Math.pow(lvl, xpGrowth) * xpMult;
        totalXp += xpForLevel;
        totalSeconds += levelTime;

        const weights = categories.map((cat) => {
            const baseWeight = rarityBaseWeights[cat.name] ?? cat.rarity ?? 0;
            const unlock = cat.unlock_level || 1;
            if (lvl < unlock) return 0;
            const unlockFactor = 0.5 + 0.5 * clamp01((lvl - unlock) / Math.max(1, rarityUnlockWindow));
            const sigmoidInput = (lvl - unlock) - rarityUnlockWindow / 2;
            const progress = 1 / (1 + Math.exp(-raritySigmoidK * sigmoidInput));
            let w = baseWeight * unlockFactor * progress;
            const decay = (cat.common_decay ?? state.common_decay) ?? 0;
            if (decay > 0 && unlock === 1) {
                const decayPower = Math.max(0, lvl - (unlock + 4)); // decay commons after first few levels
                w *= Math.exp(-decay * decayPower);
            }
            return w;
        });

        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        const basePercents = weightSum > 0
            ? weights.map((w) => (w / weightSum) * 100)
            : categories.map(() => 0);
        let percentsRaw = applySoftCaps(basePercents);
        if (percentsRaw.every((p) => p === 0) && categories.length > 0) {
            percentsRaw = categories.map((_, idx) => (idx === 0 ? 100 : 0));
        }
        const percents = percentsRaw.map((p) => Math.round(p * 10) / 10);
        const distribution = categories.map((cat, idx) => `${cat.name}: ${percents[idx]}%`).join(", ");

        const formatTime = (sec) => {
            const minutes = sec / 60;
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        };
        const readable = formatTime(levelTime);
        const readableTotal = formatTime(totalSeconds);

        const stats = {};
        attrNames.forEach((attr) => {
            stats[attr] = Math.round(currentStats[attr] || 0);
        });
        const attackSpeedBaseVal = state.attack_speed_base || 0;
        const attackSpeedBase = attackSpeedBaseVal;

        const damageTotalsBase = {};
        const resistTotalsBase = {};
        const unarmedGrowth = state.unarmed_growth || 0;
        const scaledUnarmed = baseUnarmed * (1 + unarmedGrowth * lvl);
        if (basePhysRes > 0) resistTotalsBase.Physical = basePhysRes;

        const pickCategory = (seed) => {
            const forced = categories
                .filter((cat) => {
                    const threshold = rarityPityThresholds[cat.name];
                    return typeof threshold === "number" && (pityCounters[cat.name] || 0) >= threshold;
                })
                .sort((a, b) => (rarityBaseWeights[a.name] ?? a.rarity ?? 0) - (rarityBaseWeights[b.name] ?? b.rarity ?? 0));
            if (forced.length) return forced[0];
            const totalPct = percents.reduce((sum, p) => sum + p, 0) || 1;
            const rand = pseudoRand(seed) * totalPct;
            let acc = 0;
            for (let i = 0; i < percents.length; i += 1) {
                acc += percents[i];
                if (rand <= acc) return categories[i];
            }
            return categories[categories.length - 1];
        };

        // simulate loot batch
        const totalDrops = Math.max(1, Math.floor((lootCount * generatePercent) / 100));
        const lootList = [];
        const droppedThisLevel = new Set();
        let lastMinAttrVal = 0;
        let lastMaxAttrVal = 0;
        for (let d = 0; d < totalDrops; d += 1) {
            const cat = pickCategory(lvl + d + 3);
            droppedThisLevel.add(cat.name);
            pityCounters[cat.name] = 0;
            const affixPower = state.affix_power || 1;
            const lvlPow = Math.pow(lvl, affixPower);
            const affixCap = state.affix_cap || Infinity;
            const rarityScale = state.affix_rarity_scale ?? 0;
            const rarityFactor = 1 + rarityScale * (cat?.rarity ?? 1);
            const powerScale = cat?.power_scale ?? 1;
            const minAttrValRaw = Math.max(1, Math.round((lootRandRange + lvlPow * (state.affix_min_slope || 0.9)) * rarityFactor));
            const maxAttrValRaw = Math.max(
                Math.round((lootRandRange * (state.affix_max_multiplier || 2.2) + lvlPow * (state.affix_max_slope || 1.3)) * rarityFactor)
            );
            const ratioMinRaw = state.affix_min_ratio ?? 0.6;
            const ratioMin = Math.min(1, Math.max(0, ratioMinRaw));
            let minAttrValRatio = Math.max(1, Math.round(maxAttrValRaw * ratioMin));
            let minAttrVal = Math.min(minAttrValRaw, minAttrValRatio);
            let maxAttrVal = maxAttrValRaw;
            minAttrVal = Math.max(1, Math.round(minAttrVal * powerScale));
            maxAttrVal = Math.max(minAttrVal + 1, Math.round(maxAttrVal * powerScale));
            if (minAttrVal > maxAttrVal) minAttrVal = maxAttrVal;
            minAttrVal = Math.max(1, Math.min(minAttrVal, affixCap));
            maxAttrVal = Math.max(minAttrVal, Math.min(maxAttrVal, affixCap));
            lastMinAttrVal = minAttrVal;
            lastMaxAttrVal = maxAttrVal;
            const slot = slots.length ? slots[Math.floor(pseudoRand((lvl + 7) * (d + 1)) * slots.length) % slots.length] : "slot";
            const available = items.filter((it) => it.equipment_slot === slot);
            const chosenItem = available.length ? available[Math.floor(pseudoRand((lvl + 13) * (d + 1)) * available.length) % available.length] : { name: "None" };
            const attrGrowth = state.attr_per_level_factor || 0;
            const attrs = cat.attributes && cat.attributes > 0
                ? Math.max(1, cat.attributes + Math.floor(lvl * attrGrowth))
                : 1;
            const affixLimit = chosenItem.affix_max || attrs;
            const typePoolWeighted = damagePoolForLevel(
                lvl,
                (cat.attribute_types && cat.attribute_types.length) ? cat.attribute_types : null
            );
            const typePool = typePoolWeighted.map((t) => t.name);
            const bonuses = [];
            const dmgAdds = {};
            const baseAdds = {};
            const dmgMods = {};
            const resAdds = {};
            let localAtkBonus = 0;
            let hasAtkSpeed = false;
            const allowAtkSpeedThisItem = cat.allow_attack_speed_mod && pseudoRand((lvl + d + 31) * 0.37) < 0.25;
            const usedDamageTypes = new Set(); // dmg/base
            const usedModTypes = new Set();
            const usedResTypes = new Set();
            const baseTypes = new Set();
            const atkBonusMinBase = Math.max(0, state.attack_speed_bonus_min ?? 10);
            const atkBonusMaxBase = Math.max(0, state.attack_speed_bonus_max ?? 20);
            const asLevelScale = state.attack_speed_affix_level_scale ?? 0.5;
            const asRarityScale = state.attack_speed_affix_rarity_scale ?? 0.1;
            const asLvlFactor = 1 + asLevelScale * (levels > 1 ? (lvl - 1) / (levels - 1) : 0);
            const asRarityFactor = 1 + asRarityScale * (cat?.rarity ?? 1);
            const atkBonusMin = Math.round(atkBonusMinBase * asLvlFactor * asRarityFactor);
            const atkBonusMaxRaw = Math.round(atkBonusMaxBase * asLvlFactor * asRarityFactor);
            const atkBonusMax = Math.max(atkBonusMin, atkBonusMaxRaw);

            const itemDamagePoolWeighted = damagePoolForLevel(
                lvl,
                (chosenItem.damage_types && chosenItem.damage_types.length) ? chosenItem.damage_types : typePool
            );
            const sourcesToUseRaw = Math.max(0, chosenItem.source_damage_slots || 0);
            const baseMin = state.base_damage_types_per_item_min ?? 1;
            const baseMax = state.base_damage_types_per_item_max ?? 2;
            const maxSources = sourcesToUseRaw > 0
                ? Math.max(baseMin, Math.min(baseMax, sourcesToUseRaw))
                : 0; // keep non-damage items free of base damage rolls
            const isDamageSource = maxSources > 0;
            if (isDamageSource && chosenItem.base_damage > 0 && itemDamagePoolWeighted.length) {
                const pickedTypes = new Set();
                const scaledBaseDamage = rollGrowth((chosenItem.base_damage || 0) * powerScale, lvl, (lvl + d + 101));
                for (let s = 0; s < maxSources; s += 1) {
                    const seed = (lvl + d + 101 + s) * (d + 1);
                    const type = pickWeightedDamageType(itemDamagePoolWeighted, seed) || typePool[0] || "Physical";
                    if (pickedTypes.has(type)) continue;
                    pickedTypes.add(type);
                    baseAdds[type] = (baseAdds[type] || 0) + scaledBaseDamage;
                    baseTypes.add(type);
                    usedDamageTypes.add(type);
                    bonuses.push(`+${scaledBaseDamage} ${type} dmg (BASE)`);
                }
            }
            let affixCount = 0;
            for (let k = 0; k < Math.min(attrs, affixLimit); k += 1) {
                const useAttackSpeed = allowAtkSpeedThisItem && !hasAtkSpeed && pseudoRand(k + lvl + d) < 0.1;
                const roll = pseudoRand(k + d + lvl);
                let kind = "damage";
                if (useAttackSpeed) kind = "attack";
                else if (roll < 0.45) kind = "damage";
                else if (roll < 0.75 && chosenItem.modifier !== false) kind = "modifier";
                else kind = "resist";
                // if item is not a source of damage, push toward modifier/resist
                if (!isDamageSource && kind === "damage") {
                    // no flat damage on non-damage sources
                    kind = (roll < 0.75 && chosenItem.modifier !== false) ? "modifier" : "resist";
                }

                const targetSet = kind === "modifier"
                    ? usedModTypes
                    : kind === "resist"
                        ? usedResTypes
                        : usedDamageTypes;

                let typeName = null;
                const damageLimit = state.damage_affix_types_limit ?? 1;
                const damageTypesCount = baseTypes.size;
                for (let tries = 0; tries < 6; tries += 1) {
                    const candidate = pickWeightedDamageType(typePoolWeighted, (lvl + 11 + tries) * (d + 1) * (k + 1)) || "Physical";
                    const totalDamageLimit = state.damage_types_total_limit ?? 2;
                    const wouldAddNewDamageType = kind === "damage" && !baseTypes.has(candidate);
                    if (kind === "damage" && damageTypesCount >= damageLimit && wouldAddNewDamageType) continue;
                    if (kind === "damage" && baseTypes.size >= totalDamageLimit && wouldAddNewDamageType) continue;
                    if (kind === "damage" && baseTypes.has(candidate) && targetSet.has(candidate)) continue;
                    if (!targetSet.has(candidate)) {
                        typeName = candidate;
                        break;
                    }
                }
                if (!typeName) continue;

                let bonus = Math.max(minAttrVal, Math.round(minAttrVal + pseudoRand(k + d + lvl) * (maxAttrVal - minAttrVal)));
                if (kind === "attack") {
                    const atkRand = pseudoRand(k + lvl + d + 999);
                    const atkVal = Math.round(atkBonusMin + atkRand * (atkBonusMax - atkBonusMin));
                    bonus = Math.max(atkBonusMin, Math.min(atkBonusMax, atkVal));
                    hasAtkSpeed = true;
                    localAtkBonus += bonus;
                    bonuses.push(`+${bonus}% Attack Speed`);
                    affixCount += 1;
                } else if (kind === "damage") {
                    const scaledBonus = rollGrowth(bonus, lvl, (lvl + d + k + 7));
                    bonuses.push(`+${scaledBonus} ${typeName} dmg (BASE)`);
                    baseAdds[typeName] = (baseAdds[typeName] || 0) + scaledBonus;
                    targetSet.add(typeName);
                    baseTypes.add(typeName);
                    affixCount += 1;
                } else if (kind === "modifier") {
                    const scaledBonus = Math.max(10, bonus); // guarantee meaningful modifier even at low levels
                    dmgMods[typeName] = (dmgMods[typeName] || 0) + scaledBonus;
                    bonuses.push(`+${scaledBonus}% ${typeName} dmg modifier`);
                    targetSet.add(typeName);
                    usedModTypes.add(typeName);
                    affixCount += 1;
                } else if (kind === "resist") {
                    resAdds[typeName] = (resAdds[typeName] || 0) + bonus;
                    bonuses.push(`+${bonus}% ${typeName} res`);
                    usedResTypes.add(typeName);
                    affixCount += 1;
                }
            }
            const resChance = (chosenItem.resist_affix_min_chance ?? state.resist_affix_min_chance ?? 0);
            if (resChance > 0 && affixCount < affixLimit && usedResTypes.size === 0 && pseudoRand(lvl + d + 9999) < resChance) {
                let resType = null;
                for (let tries = 0; tries < 6; tries += 1) {
                    const candidate = pickWeightedDamageType(typePoolWeighted, (lvl + 17 + tries) * (d + 1)) || "Physical";
                    if (!usedResTypes.has(candidate)) {
                        resType = candidate;
                        break;
                    }
                }
                resType = resType || typePool[0] || "Physical";
                const resBonus = Math.max(minAttrVal, Math.round(minAttrVal + pseudoRand(lvl + d + 42) * (maxAttrVal - minAttrVal)));
                resAdds[resType] = (resAdds[resType] || 0) + resBonus;
                bonuses.push(`+${resBonus}% ${resType} res`);
                usedResTypes.add(resType);
                affixCount += 1;
            }
            lootList.push({
                slot,
                category: cat.name,
                name: chosenItem.name,
                bonuses,
                dmgAdds,
                baseAdds,
                dmgMods,
                resAdds,
                atkBonus: localAtkBonus || extractAtkBonus(bonuses)
            });
        }
        categories.forEach((cat) => {
            if (!droppedThisLevel.has(cat.name)) {
                pityCounters[cat.name] = (pityCounters[cat.name] || 0) + 1;
            }
        });

        // try equipping each new loot if it improves total DPS compared to current gear
        const equippedThisLevel = new Map();
        let {
            damage: currentDamage,
            resists: currentResists,
            atkBonus: currentAtkBonus,
            adds: currentAdds,
            mods: currentMods
        } = aggregateWithGear(damageTotalsBase, resistTotalsBase, scaledUnarmed);
        const attackSpeedBaseCurrent = attackSpeedBaseVal;
        let currentAttackSpeedRaw = attackSpeedBaseCurrent * (1 + currentAtkBonus / 100);
        const atkCap = state.attack_speed_cap || 0;
        let currentAttackSpeed = atkCap > 0 ? Math.min(currentAttackSpeedRaw, atkCap) : currentAttackSpeedRaw;
        let currentTotalDps = computeTotalDps(currentDamage, currentAttackSpeed);

        lootList.forEach((loot, lootIdx) => {
            const agg = aggregateWithGear(damageTotalsBase, resistTotalsBase, scaledUnarmed, loot.slot, loot);
            const candidateAttackSpeedRaw = attackSpeedBaseCurrent * (1 + agg.atkBonus / 100);
            const candidateAttackSpeed = atkCap > 0 ? Math.min(candidateAttackSpeedRaw, atkCap) : candidateAttackSpeedRaw;
            const candidateTotalDps = computeTotalDps(agg.damage, candidateAttackSpeed);
            const prev = gearBySlot[loot.slot]?.loot;
            const candidateScore = candidateTotalDps;
            const currentScore = currentTotalDps;
            const hasPrev = Boolean(gearBySlot[loot.slot]?.loot);
            const minGain = currentScore > 0 ? currentScore * 0.005 : 0.01; // require small positive gain
            const topBaseDelta = (() => {
                let best = null;
                Object.entries(agg.adds || {}).forEach(([k, v]) => {
                    const delta = v - (currentAdds?.[k] || 0);
                    if (delta > 0 && (!best || delta > best.delta)) best = { k, delta };
                });
                return best;
            })();
            const topModDelta = (() => {
                let best = null;
                Object.entries(agg.mods || {}).forEach(([k, v]) => {
                    const delta = v - (currentMods?.[k] || 0);
                    if (delta > 0 && (!best || delta > best.delta)) best = { k, delta };
                });
                return best;
            })();
            let reasonText;
            if (!prev) {
                if (topBaseDelta) reasonText = `New slot: base +${fmt(topBaseDelta.delta)} ${topBaseDelta.k}`;
                else if (topModDelta) reasonText = `New slot: modifier +${fmt(topModDelta.delta)}% ${topModDelta.k}`;
                else reasonText = `Slot was empty -> ${candidateTotalDps.toFixed(1)} DPS`;
            } else if (candidateScore > currentScore) {
                if (topBaseDelta && (!topModDelta || topBaseDelta.delta >= topModDelta.delta)) {
                    reasonText = `Base damage +${fmt(topBaseDelta.delta)} ${topBaseDelta.k}`;
                } else if (topModDelta) {
                    reasonText = `Modifier +${fmt(topModDelta.delta)}% ${topModDelta.k}`;
                } else {
                    reasonText = `Higher DPS ${currentScore.toFixed(1)} -> ${candidateScore.toFixed(1)}`;
                }
            } else {
                reasonText = `Tie on DPS (${candidateScore.toFixed(1)})`;
            }
            const isMeaningfulGain = !hasPrev
                ? candidateScore > 0
                : candidateScore >= currentScore + minGain;

            if (isMeaningfulGain) {
                gearBySlot[loot.slot] = {
                    loot: {
                        ...loot,
                        atkBonus: loot.atkBonus || 0,
                        equippedLevel: lvl,
                        dpsDelta: candidateScore - currentScore
                    }
                };
                currentDamage = agg.damage;
                currentResists = agg.resists;
                currentAtkBonus = agg.atkBonus;
                currentAttackSpeedRaw = candidateAttackSpeedRaw;
                currentAttackSpeed = candidateAttackSpeed;
                currentTotalDps = candidateTotalDps;
                currentAdds = agg.adds;
                currentMods = agg.mods;
                equippedThisLevel.set(lootIdx, reasonText);
            }
        });

        const equippedLoot = Object.values(gearBySlot).map((v) => v.loot);
        const orderBonuses = (bonuses) => {
            const dmg = [];
            const mod = [];
            const atk = [];
            const res = [];
            const other = [];
            bonuses.forEach((b) => {
                const lower = b.toLowerCase();
                if (lower.includes("modifier")) mod.push(b);
                else if (lower.includes("dmg")) dmg.push(b);
                else if (lower.includes("attack speed")) atk.push(b);
                else if (lower.includes("res")) res.push(b);
                else other.push(b);
            });
            return [...dmg, ...mod, ...atk, ...res, ...other];
        };

        const gearLines = equippedLoot.map((loot) => {
            const ordered = orderBonuses(loot.bonuses);
            const bonusesColored = ordered.map((b) => colorizeBonus(b));
            const catColor = categoryColorMap[loot.category] || "#e2e8f0";
            return `    <span style="color:#facc15">${loot.slot}</span>: <span style="color:${catColor}">${loot.name}</span> <span style="color:${catColor}">[${loot.category}]</span> ${bonusesColored.join(", ")}`;
        });

        const equippedSorted = [...equippedLoot].sort((a, b) => {
            const pa = slotPositions[a.slot] ?? 9999;
            const pb = slotPositions[b.slot] ?? 9999;
            if (pa !== pb) return pa - pb;
            return (a.slot || "").localeCompare(b.slot || "");
        });

        const dpsTypesActive = new Set(Object.entries(currentDamage || {}).filter(([, v]) => v > 0).map(([k]) => k.toLowerCase()));
        const gearTableRows = equippedSorted.map((loot) => {
            const ordered = orderBonuses(loot.bonuses);
            const bonusesColored = ordered.map((b) => {
                const lower = b.toLowerCase();
                let matchedType = null;
                dpsTypesActive.forEach((t) => { if (!matchedType && lower.includes(t.toLowerCase())) matchedType = t; });
                const isAtk = lower.includes("attack speed");
                const baseText = (() => {
                    if (b.includes("(BASE)")) {
                        return `<strong>${colorizeBonus(b.replace(" (BASE)", ""))}</strong>`;
                    }
                    if (lower.includes("modifier")) {
                        return colorizeBonus(b.replace(" modifier", ""));
                    }
                    return colorizeBonus(b);
                })();
                if (!matchedType && !isAtk) return baseText;
                const ringColor = matchedType ? (colorMap[matchedType] || "#38bdf8") : "#38bdf8";
                return `<span class="dps-affix" style="border-color:${ringColor};background:rgba(56,189,248,0.08)">${baseText}</span>`;
            }).join(", ");
            const catColor = categoryColorMap[loot.category] || "#e2e8f0";
            const newBadge = loot.equippedLevel === lvl
                ? '<span class="gear-new-badge">Found this level!</span>'
                : "";
            const dpsImpact = loot.equippedLevel === lvl && typeof loot.dpsDelta === "number"
                ? `${loot.dpsDelta > 0 ? "+" : ""}${fmt((loot.dpsDelta / Math.max(1, currentTotalDps - loot.dpsDelta)) * 100, 1)}%`
                : "";
            return `
      <tr>
        <td><span style="color:#facc15">${loot.slot}</span></td>
        <td>${newBadge}</td>
        <td><span style="color:${catColor}">${loot.name}</span></td>
        <td><span style="color:${catColor}">${loot.category}</span></td>
        <td>${bonusesColored}</td>
        <td>${dpsImpact}</td>
      </tr>`;
        });

        const gearTableHtml = gearTableRows.length
            ? `<div class="gear-table"><table>
      <thead>
        <tr>
          <th>Slot</th>
          <th>New</th>
          <th>Item</th>
          <th>Cat.</th>
          <th>Bonuses</th>
          <th>DPS impact</th>
        </tr>
      </thead>
      <tbody>
        ${gearTableRows.join("")}
      </tbody>
    </table></div>`
            : '<div class="gear-table empty">No gear</div>';

        const colorize = (k, text) => `<span style="color:${colorMap[k] || "#e2e8f0"}">${text}</span>`;
        const dmgTypesAll = new Set([
            ...Object.keys(currentAdds || {}),
            ...Object.keys(currentMods || {}),
            ...Object.keys(currentDamage || {})
        ]);
        const dmgSummary = Array.from(dmgTypesAll).map((k) => {
            const base = currentAdds?.[k] || 0;
            const mod = currentMods?.[k] || 0;
            const total = currentDamage?.[k] || 0;
            return colorize(k, `${k}: Base ${fmt(base)} | Mod ${fmt(mod)}% | Total ${fmt(total)}`);
        }).join(", ") || "None";
        const resSummary = Object.entries(currentResists).map(([k, v]) => colorize(k, `${k}: +${fmt(v)}% res`)).join(", ") || "None";
        const attrBounds = attrNames.map((a) => {
            const bounds = attributes[a] || { min: 0, max: 0 };
            return `${a}: ${bounds.min}-${bounds.max}`;
        }).join(" | ");

        const allLootRows = lootList.map((l, idx) => {
            const ordered = orderBonuses(l.bonuses);
            const bonusesColored = ordered.map((b) => {
                if (b.includes("(BASE)")) {
                    return `<strong>${colorizeBonus(b.replace(" (BASE)", ""))}</strong>`;
                }
                if (b.toLowerCase().includes("modifier")) {
                    return colorizeBonus(b.replace(" modifier", ""));
                }
                return colorizeBonus(b);
            }).join(", ");
            const catColor = categoryColorMap[l.category] || "#e2e8f0";
            const equipInfo = equippedThisLevel.get(idx);
            const equipCell = equipInfo
                ? `<div class="equip-flag"><span class="equip-badge">Equipped</span><span class="equip-reason">${equipInfo}</span></div>`
                : '<span class="equip-reason muted">Not equipped</span>';
            return `
      <tr>
        <td><span style="color:#facc15">${l.slot}</span></td>
        <td><span style="color:${catColor}">${l.name}</span></td>
        <td><span style="color:${catColor}">${l.category}</span></td>
        <td>${bonusesColored}</td>
        <td>${equipCell}</td>
      </tr>`;
        });

        const modMedian = fmt((lastMinAttrVal + lastMaxAttrVal) / 2);
        const allLootHtml = lootList.length
            ? `<div class="loot-table"><table>
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
        ${allLootRows.join("")}
      </tbody>
    </table></div>`
            : '<div class="loot-table empty">No loot</div>';
        const attrRangeText = `Attrib range for loot: ${lastMinAttrVal}-${lastMaxAttrVal}%`;
        const attackSpeed = attackSpeedBase * (1 + currentAtkBonus / 100);

        const dpsParts = Object.entries(currentDamage).map(([k, v]) => colorize(k, `${k}: ${fmt(v * currentAttackSpeed)} DPS`));
        const dpsLine = dpsParts.length ? dpsParts.join(" | ") : "None";
        const dmgBreakdownRows = (() => {
            const allTypes = new Set([...Object.keys(currentAdds || {}), ...Object.keys(currentMods || {}), ...Object.keys(currentDamage || {})]);
            const rows = Array.from(allTypes).map((k) => {
                const base = currentAdds?.[k] || 0;
                const mod = currentMods?.[k] || 0;
                const total = currentDamage?.[k] || 0;
                const dpsVal = total * attackSpeed;
                const label = colorize(k, k);
                return { k, base, mod, total, dpsVal, label };
            });
            rows.sort((a, b) => (b.dpsVal || 0) - (a.dpsVal || 0));
            return rows.map((row) => {
                const rowColor = colorMap[row.k] || "#e2e8f0";
                return `
          <tr style="color:${rowColor}">
            <td>${row.label}</td>
            <td>${fmt(row.base)}</td>
            <td>${fmt(row.mod)}%</td>
            <td>${fmt(row.total)}</td>
            <td>${fmt(row.dpsVal)}</td>
          </tr>`;
            }).join("");
        })();
        const dpsMixText = (() => {
            if (!currentTotalDps) return "";
            const entries = Object.entries(currentDamage || {});
            if (!entries.length) return "";
            const parts = entries
                .map(([k, v]) => {
                    const dpsVal = v * currentAttackSpeed;
                    if (dpsVal <= 0) return null;
                    const pct = dpsVal / currentTotalDps * 100;
                    return colorize(k, `${k} (${fmt(pct, 0)}%)`);
                })
                .filter(Boolean);
            return parts.length ? parts.join(" · ") : "";
        })();
        const sep = `<span style="color:#0ea5e9; opacity:0.9"> | </span>`;
        const equipCountText = equippedThisLevel.size === 0
            ? `<span style="color:#ef4444">Nice Loot Found: 0 (plateau)</span>`
            : `Nice Loot Found: ${equippedThisLevel.size}`;
        const baseInfo = `Lvl ${lvl} ${sep}${Math.round(currentTotalDps)} DPS ${sep}<span class="dim-blue">${readable}</span> ${sep}<span class="dim-blue">${readableTotal}</span> ${sep}<span class="dim-blue">loot ~ ${lootCount}</span>`;
        const mixInfo = dpsMixText || '<span style="opacity:0.7">No mix</span>';
        const summaryText = `<span class="summary-col base">${baseInfo}</span><span class="summary-col mix">${mixInfo}</span><span class="summary-col loot">${equipCountText}</span>`;
        const dmgBreakdownTable = dmgBreakdownRows
            ? `<div class="build-table"><table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Base</th>
          <th>Modifier</th>
          <th>Total</th>
          <th>DPS</th>
        </tr>
      </thead>
      <tbody>
        ${dmgBreakdownRows}
      </tbody>
    </table></div>`
            : '<div class="build-table empty">No damage</div>';
        const statsLinePretty = attrNames.map((a) => `${a}: ${stats[a]}`).join(" | ");

        dpsSeries.push({ level: lvl, dps: currentTotalDps });

        jsonData.push({
            level: lvl,
            time_readable: readable,
            loot_count: lootCount,
            xp_level: Math.round(xpForLevel),
            xp_total: Math.round(totalXp),
            distribution,
            stats,
            attr_bounds: attrBounds,
            attr_range: `${lastMinAttrVal}-${lastMaxAttrVal}%`,
            gear: gearLines,
            all_loot: lootList,
            totals: {
                damage: currentDamage,
                resists: currentResists,
                attack_speed: currentAttackSpeed,
                dps: dpsParts,
                dps_total: currentTotalDps
            }
        });

        const isLast = lvl === levels;
        results.push(`
<details class="compute-card" ${isLast ? "open" : ""}>
  <summary>${summaryText}</summary>
  <div class="body">
    <div>Distribution: ${distribution}</div>    
    <div>${attrRangeText}</div>
    <div class="loot-meta">Median base dmg: ${fmt(lastMinAttrVal)}-${fmt(lastMaxAttrVal)} | Median mod: ${modMedian}%</div>
    <div>Gear:</div>
    ${gearTableHtml}
    <details>
      <summary style="color:#cbd5e1; background-color: #27182d;">🧰 See all loot of this level (${lootList.length})</summary>
      ${allLootHtml}
    </details>
    <div class="build-block">
      <div class="build-heading">Build snapshot</div>
      <div class="build-line">Stats: ${statsLinePretty}</div>
      <div class="build-line">Attack Speed: ${fmt(currentAttackSpeed, 2)} /s</div>
      <div class="build-line">Resists: ${resSummary}</div>
      <div class="build-subtitle">Damage breakdown</div>
      ${dmgBreakdownTable}
      <div class="build-line">DPS total: ${Math.round(currentTotalDps)}</div>
    </div>
  </div>
</details>
        `);
    }

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.round((totalSeconds % 3600) / 60);
    const totalReadable = `${totalHours}h ${totalMins}m`;
    const plateauThreshold = 0.02; // <2% growth
    const spikeThreshold = 1.0; // >=100% growth
    let plateauCount = 0;
    let spikeCount = 0;
    let steadyCount = 0;
    for (let i = 1; i < dpsSeries.length; i += 1) {
        const prev = dpsSeries[i - 1].dps || 0;
        const curr = dpsSeries[i].dps || 0;
        if (prev <= 0) continue;
        const growth = (curr - prev) / prev;
        if (growth < plateauThreshold) plateauCount += 1;
        else if (growth >= spikeThreshold) spikeCount += 1;
        else steadyCount += 1;
    }
    const diagnostic = `<div class="dps-diagnostic">
  <span style="color:#ef4444">Plateaux (&lt;2%): ${plateauCount}</span> |
  <span style="color:#8b5cf6">Spikes (&ge;100%): ${spikeCount}</span> |
  <span style="color:#22c55e">OK: ${steadyCount}</span>
</div>`;
    const levelDetails = results.join("");
    const summarySection = `<div><strong>Total time:</strong> ${totalReadable}</div>`;
    const wrapped = `<details class="compute-levels" open><summary class="section-title">Level per level details</summary>${levelDetails}</details><div class="section-title">Progression Analysis</div>${diagnostic}`;
    results.length = 0;
    results.push('<div class="result-title">BUILD SIMULATED !</div>');
    results.push(summarySection);
    results.push(wrapped);

    const container = document.getElementById("compute-result");
    if (container) {
        container.innerHTML = results.join("") + `<div class="compute-actions"><button type="button" class="compute-json-btn" id="recompute-btn">Compute again</button><button type="button" class="compute-json-btn" id="copy-headers">Copy Leveling Headers</button><button type="button" class="compute-json-btn" id="copy-loot">Copy Loot Progression</button></div>`;
        // append chart placeholder
        const chartId = "dps-chart";
        container.innerHTML += `<div id="${chartId}" class="dps-chart"></div>`;
        const copyHeadersBtn = document.getElementById("copy-headers");
        if (copyHeadersBtn) {
            copyHeadersBtn.onclick = () => {
                const headers = jsonData.map((entry) => {
                    const dpsVal = Math.round(entry.totals?.dps_total ?? 0);
                    const line = `Lvl ${entry.level} | ${dpsVal} DPS | ${entry.time_readable} | ${entry.loot_count} loot`;
                    return line;
                }).join("\n");
                navigator.clipboard.writeText(headers);
            };
        }
        const copyLootBtn = document.getElementById("copy-loot");
        if (copyLootBtn) {
            copyLootBtn.onclick = () => {
                const lootText = jsonData.map((entry) => {
                    const header = `Lvl ${entry.level} | ${entry.time_readable} | loot ~ ${entry.loot_count}`;
                    const lootLines = (entry.all_loot || []).map((loot) => {
                        const bonuses = (loot.bonuses || []).join(", ");
                        return `  - ${loot.slot}: ${loot.name} [${loot.category}] ${bonuses}`;
                    });
                    return [header, ...lootLines].join("\n");
                }).join("\n\n");
                navigator.clipboard.writeText(lootText);
            };
        }
        const recomputeBtn = document.getElementById("recompute-btn");
        if (recomputeBtn) {
            recomputeBtn.onclick = () => {
                if (typeof compute === "function") compute();
            };
        }
        const chartEl = document.getElementById(chartId);
        if (chartEl && dpsSeries.length) {
            const width = 700;
            const height = 220;
            const pad = 20;
            const maxDps = Math.max(...dpsSeries.map((p) => p.dps), 1);
            const points = dpsSeries.map((p) => {
                const x = pad + ((p.level - 1) / Math.max(1, levels - 1)) * (width - pad * 2);
                const y = pad + (1 - p.dps / maxDps) * (height - pad * 2);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ");
            chartEl.innerHTML = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <polyline points="${points}" fill="none" stroke="#38bdf8" stroke-width="2.5" />
  ${dpsSeries.map((p) => {
                const x = pad + ((p.level - 1) / Math.max(1, levels - 1)) * (width - pad * 2);
                const y = pad + (1 - p.dps / maxDps) * (height - pad * 2);
                return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#38bdf8" />`;
            }).join("")}
  <text x="${width / 2}" y="${height - 4}" fill="#94a3b8" font-size="12" text-anchor="middle">Level</text>
  <text x="6" y="${height / 2}" fill="#94a3b8" font-size="12" transform="rotate(-90 6 ${height / 2})" text-anchor="middle">DPS</text>
</svg>`;
        }
        // scroll to last level and open it
        const cards = container.querySelectorAll(".compute-card");
        if (cards.length > 0) {
            const last = cards[cards.length - 1];
            last.open = true;
            last.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }
}
