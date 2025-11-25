function compute() {
    if (typeof state === "undefined") return;
    const levels = state.levels || 1;
    const categories = state.categories || [];
    const baseLevelTime = state.median_time_per_level || 0;
    const lootTime = state.median_time_per_loot || 1;
    const timeMult = state.level_time_multiplier || 0;
    const rarityGrowth = state.rarity_growth_factor || 0;
    const xpBase = state.xp_base || 0;
    const xpGrowth = state.xp_growth || 1;
    const xpMult = state.xp_multiplier || 1;
    const gainPerLevel = state.gain_per_level || 0;
    const attributes = state.attributes || {};
    const attrNames = Object.keys(attributes);
    const slots = Object.keys(state.equipment_slots || {});
    const items = state.items || [];
    const damageTypes = state.damage_types || [];
    const baseUnarmed = state.unarmed_physical_damage || 0;
    const basePhysRes = state.base_physical_resistance || 0;
    const generatePercent = state.generate_percent || 0;
    const lootRandRange = state.loot_rand_range || 0;

    let totalXp = 0;
    let totalSeconds = 0;
    const results = [];
    const jsonData = [];

    // persist best gear across levels to avoid DPS drops
    const gearBySlot = {}; // slot -> { loot, atkBonus, dmgAdds, resAdds }

    const pseudoRand = (seed) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const pickDamage = (seed) => {
        if (damageTypes.length === 0) return "Physical";
        const idx = Math.floor(pseudoRand(seed) * damageTypes.length) % damageTypes.length;
        return damageTypes[idx].name;
    };

    const extractAtkBonus = (bonuses) => bonuses
        .filter((b) => b.includes("Attack Speed"))
        .reduce((sum, b) => sum + (parseInt(b.replace(/\D/g, ""), 10) || 0), 0);

    const aggregateWithGear = (baseDamage, baseResists, slotOverride, lootOverride) => {
        const damage = { ...baseDamage };
        const resists = { ...baseResists };
        let atkBonus = 0;
        const slotsToApply = new Set([...Object.keys(gearBySlot), ...(slotOverride ? [slotOverride] : [])]);
        slotsToApply.forEach((slot) => {
            const source = slot === slotOverride ? lootOverride : gearBySlot[slot]?.loot;
            if (!source) return;
            Object.entries(source.dmgAdds || {}).forEach(([k, v]) => { damage[k] = (damage[k] || 0) + v; });
            Object.entries(source.resAdds || {}).forEach(([k, v]) => { resists[k] = (resists[k] || 0) + v; });
            atkBonus += source.atkBonus || 0;
        });
        return { damage, resists, atkBonus };
    };

    const computeTotalDps = (damageTotals, attackSpeed) => {
        const values = Object.values(damageTotals || {});
        if (values.length === 0) return 0;
        return values.reduce((sum, v) => sum + v * attackSpeed, 0);
    };

    for (let lvl = 1; lvl <= levels; lvl += 1) {
        const growth = Math.pow(1 + 0.05 * timeMult, lvl - 1);
        const levelTime = baseLevelTime * growth;
        const lootCount = Math.max(1, Math.floor(levelTime / lootTime));
        const xpForLevel = xpBase * Math.pow(lvl, xpGrowth) * xpMult;
        totalXp += xpForLevel;
        totalSeconds += levelTime;

        const weights = categories.map((cat) => {
            const baseWeight = cat.rarity ?? 1;
            const unlock = cat.unlock_level || 1;
            if (lvl < unlock) return 0;
            const progress = Math.min(1, (lvl - unlock) / Math.max(1, levels - unlock));
            const factor = 0.2 + progress * (1 + rarityGrowth);
            return baseWeight * factor;
        });

        let percents = [];
        const weightSum = weights.reduce((sum, w) => sum + w, 0) || 1;
        percents = weights.map((w) => Math.round((w / weightSum) * 1000) / 10);
        const uniqueIndex = categories.findIndex((c) => (c.name || "").toLowerCase() === "unique");
        if (uniqueIndex >= 0 && percents[uniqueIndex] > 3) {
            const uniqueCap = 3;
            const otherTotal = percents.reduce((sum, p, idx) => idx === uniqueIndex ? sum : sum + p, 0);
            const scale = otherTotal > 0 ? (100 - uniqueCap) / otherTotal : 1;
            percents = percents.map((p, idx) => idx === uniqueIndex ? uniqueCap : Math.round(p * scale * 10) / 10);
        }
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
            const bounds = attributes[attr] || { min: 0, max: 0 };
            const val = Math.min(bounds.max, bounds.min + (lvl - 1) * gainPerLevel);
            stats[attr] = Math.round(val);
        });
        const attackSpeedBase = (state.attack_speed_base || 0) + lvl * (state.attack_speed_per_level || 0);

        const damageTotalsBase = {};
        const resistTotalsBase = {};
        if (baseUnarmed > 0) damageTotalsBase.Physical = baseUnarmed;
        if (basePhysRes > 0) resistTotalsBase.Physical = basePhysRes;

        const pickCategory = (seed) => {
            const rand = pseudoRand(seed);
            let acc = 0;
            for (let i = 0; i < percents.length; i += 1) {
                acc += percents[i] / 100;
                if (rand <= acc) return categories[i];
            }
            return categories[categories.length - 1];
        };

        // paliers d'affixes configurables
        const minAttrVal = Math.max(1, Math.round(lootRandRange + lvl * (state.affix_min_slope || 0.9)));
        const maxAttrVal = Math.max(
            minAttrVal + 1,
            Math.round(lootRandRange * (state.affix_max_multiplier || 2.2) + lvl * (state.affix_max_slope || 1.3))
        );

        // simulate loot batch
        const totalDrops = Math.max(1, Math.floor((lootCount * generatePercent) / 100));
        const lootList = [];
        for (let d = 0; d < totalDrops; d += 1) {
            const cat = pickCategory(lvl + d + 3);
            const slot = slots.length ? slots[Math.floor(pseudoRand((lvl + 7) * (d + 1)) * slots.length) % slots.length] : "slot";
            const available = items.filter((it) => it.equipment_slot === slot);
            const chosenItem = available.length ? available[Math.floor(pseudoRand((lvl + 13) * (d + 1)) * available.length) % available.length] : { name: "None" };
            const attrs = cat.attributes && cat.attributes > 0 ? cat.attributes : 1;
            const typePool = (cat.attribute_types && cat.attribute_types.length) ? cat.attribute_types : damageTypes.map((d) => d.name);
            const bonuses = [];
            const dmgAdds = {};
            const resAdds = {};
            let localAtkBonus = 0;
            for (let k = 0; k < attrs; k += 1) {
                const pickIdx = Math.floor(pseudoRand((lvl + 11) * (d + 1) * (k + 1)) * typePool.length) % typePool.length;
                const typeName = typePool[pickIdx] || "Physical";
                const useAttackSpeed = cat.allow_attack_speed_mod && pseudoRand(k + lvl + d) < 0.2;
                const isDamage = useAttackSpeed ? false : k % 2 === 0;
                const bonus = Math.max(minAttrVal, Math.round(minAttrVal + pseudoRand(k + d + lvl) * (maxAttrVal - minAttrVal)));
                if (useAttackSpeed) {
                    localAtkBonus += bonus;
                    bonuses.push(`+${bonus}% Attack Speed`);
                } else if (isDamage) {
                    dmgAdds[typeName] = (dmgAdds[typeName] || 0) + bonus;
                    bonuses.push(`+${bonus}% ${typeName} dmg`);
                } else {
                    resAdds[typeName] = (resAdds[typeName] || 0) + bonus;
                    bonuses.push(`+${bonus}% ${typeName} res`);
                }
            }
            lootList.push({ slot, category: cat.name, name: chosenItem.name, bonuses, dmgAdds, resAdds, atkBonus: localAtkBonus || extractAtkBonus(bonuses) });
        }

        // try equipping each new loot if it improves total DPS compared to current gear
        let { damage: currentDamage, resists: currentResists, atkBonus: currentAtkBonus } = aggregateWithGear(damageTotalsBase, resistTotalsBase);
        const attackSpeedBaseCurrent = (state.attack_speed_base || 0) + lvl * (state.attack_speed_per_level || 0);
        let currentAttackSpeed = attackSpeedBaseCurrent * (1 + currentAtkBonus / 100);
        let currentTotalDps = computeTotalDps(currentDamage, currentAttackSpeed);

        lootList.forEach((loot) => {
            const agg = aggregateWithGear(damageTotalsBase, resistTotalsBase, loot.slot, loot);
            const candidateAttackSpeed = attackSpeedBaseCurrent * (1 + agg.atkBonus / 100);
            const candidateTotalDps = computeTotalDps(agg.damage, candidateAttackSpeed);
            if (candidateTotalDps >= currentTotalDps) {
                gearBySlot[loot.slot] = { loot: { ...loot, atkBonus: loot.atkBonus || 0 } };
                currentDamage = agg.damage;
                currentResists = agg.resists;
                currentAtkBonus = agg.atkBonus;
                currentAttackSpeed = candidateAttackSpeed;
                currentTotalDps = candidateTotalDps;
            }
        });

        const equippedLoot = Object.values(gearBySlot).map((v) => v.loot);
        const gearLines = equippedLoot.map((loot) => `    ${loot.slot}: ${loot.name} [${loot.category}] ${loot.bonuses.join(", ")}`);

        const dmgSummary = Object.entries(currentDamage).map(([k, v]) => `${k}: +${v}% dmg`).join(", ") || "None";
        const resSummary = Object.entries(currentResists).map(([k, v]) => `${k}: +${v}% res`).join(", ") || "None";
        const attrBounds = attrNames.map((a) => {
            const bounds = attributes[a] || { min: 0, max: 0 };
            return `${a}: ${bounds.min}-${bounds.max}`;
        }).join(" | ");

        const gearListHtml = gearLines.map((g) => `<li>${g}</li>`).join("");
        const allLootHtml = lootList.length ? `<ul>${lootList.map((l) => `<li>${l.slot} | ${l.category} | ${l.name} | ${l.bonuses.join(", ")}</li>`).join("")}</ul>` : "No loot";
        const pickedHtml = equippedLoot.map((l) => `<li>${l.slot} | ${l.category} | ${l.name} | ${l.bonuses.join(", ")}</li>`).join("") || "No equip";
        const statsLine = attrNames.map((a) => `${a}=${stats[a]}`).join(", ");
        const summaryText = `Lvl ${lvl} | ${Math.round(currentTotalDps)} DPS | ${readable} | ${readableTotal} | loot ~ ${lootCount}`;
        const attrRangeText = `Attrib range for loot: ${minAttrVal}-${maxAttrVal}%`;
        const attackSpeed = attackSpeedBase * (1 + currentAtkBonus / 100);

        const dpsParts = Object.entries(currentDamage).map(([k, v]) => `${k}: ${(v * attackSpeed).toFixed(1)} DPS @ ${attackSpeed.toFixed(2)} AS`);
        const dpsLine = dpsParts.length ? dpsParts.join(" | ") : `None @ ${attackSpeed.toFixed(2)} AS`;

        jsonData.push({
            level: lvl,
            time_readable: readable,
            loot_count: lootCount,
            xp_level: Math.round(xpForLevel),
            xp_total: Math.round(totalXp),
            distribution,
            stats,
            attr_bounds: attrBounds,
            attr_range: `${minAttrVal}-${maxAttrVal}%`,
            gear: gearLines,
            all_loot: lootList,
            totals: {
                damage: currentDamage,
                resists: currentResists,
                attack_speed: attackSpeed,
                dps: dpsParts
            }
        });

        results.push(`
<details class="compute-card" ${lvl === 1 ? "open" : ""}>
  <summary>${summaryText}</summary>
  <div class="body">
    <div>Distribution: ${distribution}</div>
    <div>Stats: ${statsLine}</div>
    <div>Attr bounds: ${attrBounds}</div>
    <div>${attrRangeText}</div>
    <div>Gear:</div>
    <ul>${gearListHtml}</ul>
    <details>
      <summary>See all loot of this level (${lootList.length})</summary>
      ${allLootHtml}
      <div>Equipped (best guess):</div>
      <ul>${pickedHtml}</ul>
    </details>
    <div>Totals → Damage: ${dmgSummary} | Resists: ${resSummary}</div>
    <div>DPS (@ attack speed): ${dpsLine}</div>
  </div>
</details>
        `);
    }

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.round((totalSeconds % 3600) / 60);
    const totalReadable = `${totalHours}h ${totalMins}m`;
    results.push(`<div><strong>Total time:</strong> ${totalReadable}</div>`);

    const container = document.getElementById("compute-result");
    if (container) {
        container.innerHTML = results.join("") + `<button type="button" class="compute-json-btn" id="copy-json">Copy result JSON</button>`;
        const btn = document.getElementById("copy-json");
        if (btn) {
            btn.onclick = () => {
                navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
            };
        }
    }
}
