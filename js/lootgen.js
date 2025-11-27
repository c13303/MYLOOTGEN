function compute() {
    if (typeof state === "undefined") return;

    const levels = state.levels || 1;
    const categories = state.categories || [];
    const items = state.items || [];
    const slots = (state.equipment_slots || []).map((s) => s.name);
    const rarityBaseWeights = state.rarity_base_weights || {};
    const rarityWeightGrowth = state.rarity_weight_growth || 0;
    const damageTypes = state.damage_types || [];
    const defaultDmgType = (damageTypes.find((dt) => dt.default_damage_type) || damageTypes[0] || { name: "Physical" }).name;
    const colorMap = damageTypes.reduce((map, dt) => {
        map[dt.name] = dt.color || "#e2e8f0";
        return map;
    }, {});
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
    const baseLevelTime = state.median_time_per_level || 0;
    const lootTime = state.median_time_per_loot || 1;
    const timeMult = state.level_time_multiplier || 0;
    const additionalLootFactor = state.additional_loot_factor || 1;
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
    const baseAttackSpeed = state.attack_speed_base || 0;
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
        const baseAps = Number(state.attack_speed_base ?? 1);
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

    const pickCategory = (seed, currentLevel) => {
        const eligible = categories.filter((cat) => (cat.unlock_level || 1) <= currentLevel);
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
        if (!available.length) return { name: "None", equipment_slot: slot || "slot", category: "none" };
        const idx = Math.floor(pseudoRand(seed) * available.length) % available.length;
        return available[idx];
    };

    for (let lvl = 1; lvl <= levels; lvl += 1) {
        applyStatGain(lvl);
        const growth = Math.pow(1 + 0.05 * timeMult, Math.max(0, lvl - 1));
        const levelTime = baseLevelTime * growth;
        const lootCountRaw = Math.max(1, Math.floor(levelTime / lootTime));
        const lootCount = Math.max(1, Math.round(lootCountRaw * additionalLootFactor));
        const rolledLootCount = Math.max(0, Math.floor(lootCount * generatePercent / 100));
        const readable = formatTime(levelTime);
        const weights = categories.map((cat) => {
            const unlock = cat.unlock_level || 1;
            if (lvl < unlock) return 0;
            const baseWeight = rarityBaseWeights[cat.name] ?? cat.rarity ?? 0;
            return Math.max(0, baseWeight + rarityWeightGrowth * (lvl - 1));
        });
        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        const percents = weightSum > 0
            ? weights.map((w) => (w / weightSum) * 100)
            : categories.map(() => 0);
        const distribution = categories.map((cat, idx) => {
            const unlock = cat.unlock_level || 1;
            if (lvl < unlock) return `${cat.name}: 0%`;
            return `${cat.name}: ${Math.round((percents[idx] || 0) * 10) / 10}%`;
        }).join(", ");
        const baseFlatDmg = computeFlatDamageForLevel(lvl);
        const lootList = [];
        const asBonuses = [];
        const modBonuses = [];
        for (let i = 0; i < rolledLootCount; i += 1) {
            const cat = pickCategory(lvl + i + 1, lvl);
            const slot = slots.length
                ? slots[Math.floor(pseudoRand(lvl + i + 7) * slots.length) % slots.length]
                : "slot";
            const item = pickItem(slot, lvl + i + 13);
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
            const bonuses = [];
            const baseAdds = {};
            const dmgAdds = {};
            const dmgMods = {};
            const resAdds = {};
            let atkBonus = 0;

            const usedDamageTypes = new Set();
            const pickType = (seed) => typePoolFinal[Math.floor(pseudoRand(seed) * typePoolFinal.length) % typePoolFinal.length] || defaultDmgType;

            // flat damage sources (only if item allows)
            if (maxSources > 0) {
                const typePoolRemaining = typePoolFinal.filter((t) => !usedDamageTypes.has(t));
                const availableTypes = typePoolRemaining.length || typePoolFinal.length;
                const sourceCount = Math.max(1, Math.min(maxSources, availableTypes));
                let totalBaseDmg = computeFlatDamageForLevel(lvl);
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
                    const rolledValue = Math.round(roll);
                    baseAdds[type] = rolledValue;
                    bonuses.push(`+${rolledValue} ${type} flat dmg`);
                }
            }

            // affix slots (mod/res/AS) up to affixLimit
            for (let a = bonuses.length; a < affixLimit; a += 1) {
                const roll = pseudoRand(lvl + i + a * 17);
                // prioritize mod/res, add AS if allowed and rolled
                if (cat?.allow_attack_speed_mod && roll > 0.85 && !bonuses.some((b) => b.includes("Attack Speed"))) {
                    atkBonus = Math.max(1, Math.round(computeAttackSpeedBonusForLevel(lvl)));
                    if (atkBonus > 0) asBonuses.push(atkBonus);
                    bonuses.push(`+${atkBonus}% Attack Speed`);
                } else if (item.damage_modifier !== false && roll > 0.35) {
                    const type = pickType((lvl + i + a * 23) * 1.3);
                    const key = type;
                    const baseMod = computeDamageModForLevel(lvl);
                    const jittered = applyPctJitter(baseMod, Number(state.mod_damage_jitter_pct ?? 0), (lvl + i + a * 23) * 5.7);
                    const rolledMod = Math.round(jittered);
                    if (!dmgMods[key]) dmgMods[key] = 0;
                    dmgMods[key] += rolledMod;
                    if (rolledMod > 0) modBonuses.push(rolledMod);
                    bonuses.push(`+${rolledMod}% ${type} dmg mod`);
                } else {
                    const type = pickType((lvl + i + a * 31) * 1.7);
                    const key = type;
                    if (!resAdds[key]) resAdds[key] = 0;
                    bonuses.push(`+0% ${type} res`);
                }
            }

            lootList.push({
                slot,
                category: cat?.name || "none",
                name: item.name,
                bonuses,
                dmgAdds,
                baseAdds,
                dmgMods,
                resAdds,
                atkBonus
            });
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

        const lootRows = lootList.map((l) => {
            const catColor = (categories.find((c) => c.name === l.category)?.color) || "#e2e8f0";
            const bonusText = (l.bonuses && l.bonuses.length)
                ? l.bonuses.map((b) => colorizeBonus(b)).join(", ")
                : "None";
            return `
      <tr>
        <td><span style="color:#facc15">${l.slot}</span></td>
        <td><span style="color:${catColor}">${l.name}</span></td>
        <td><span style="color:${catColor}">${l.category}</span></td>
        <td>${bonusText}</td>
        <td><span class="equip-reason muted">Not equipped</span></td>
      </tr>`;
        }).join("");

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
        ${lootRows}
      </tbody>
    </table></div>`
            : '<div class="loot-table empty">No loot</div>';

        const statsLinePretty = attrNames.length
            ? attrNames.map((a) => `${a}: ${currentStats[a] ?? 0}`).join(" | ")
            : "none";
        const resLinePretty = Object.keys(baseResists).length
            ? Object.entries(baseResists).map(([k, v]) => `${k}: ${v}`).join(" | ")
            : "none";

        const summaryText = `<span class="summary-col base">Lvl ${lvl} | 0 DPS | <span class="dim-blue">${readable}</span> | <span class="dim-blue">loot ~ ${lootList.length}</span></span><span class="summary-col mix"><span style="opacity:0.7">No mix</span></span>`;

    results.push(`
<details class="compute-card" ${lvl === levels ? "open" : ""}>
  <summary>${summaryText}</summary>
  <div class="body">
    <div class="level-meta">
      <div>Distribution: ${distribution || "none"}</div>    
      <div class="loot-meta">Loot Values : Flat dmg: ${flatMinSource}-${flatMaxSource} (src) | ${flatMinWeapon}-${flatMaxWeapon} (weapon) | Dmg mod: +${modMin}% - +${modMax}% | Resists: +0-0% | AS: +${asMin}% - +${asMax}%</div>
    </div>
    <div class="level-grid">
      <div class="level-col">
        <div>Gear:</div>
        <div class="gear-table empty">No gear</div>
        <details>
          <summary style="color:#cbd5e1; background-color: #27182d;">🧰 See all loot of this level (${lootList.length})</summary>
          ${allLootHtml}
        </details>
      </div>
      <div class="level-col">
        <div class="build-block">
          <div class="build-heading">Build snapshot</div>
          <div class="build-line">Stats: ${statsLinePretty}</div>
          <div class="build-line">Attack Speed: ${baseAttackSpeed}</div>
          <div class="build-line">Resists: ${resLinePretty}</div>
          <div class="build-subtitle">Damage breakdown</div>
          <div class="build-table empty">No damage</div>
          <div class="build-line">DPS total: 0</div>
        </div>
      </div>
    </div>
  </div>
</details>
        `);

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
            gear: [],
            all_loot: lootList,
            totals: {
                damage: {},
                resists: baseResists,
                attack_speed: baseAttackSpeed,
                dps: [],
                dps_total: 0
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
                    navigator.clipboard.writeText(text).catch(() => {});
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
            try { document.execCommand("copy"); } catch (_) {}
            document.body.removeChild(ta);
        };

        const copyHeadersBtn = document.getElementById("copy-headers");
        if (copyHeadersBtn) {
            copyHeadersBtn.onclick = () => {
                const headers = jsonData.map((entry) => `Lvl ${entry.level} | 0 DPS | ${entry.time_readable} | ${entry.loot_count} loot`).join("\n");
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
