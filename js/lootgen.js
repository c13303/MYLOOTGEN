function compute() {
    if (typeof state === "undefined") return;

    const levels = state.levels || 1;
    const categories = state.categories || [];
    const items = state.items || [];
    const slots = (state.equipment_slots || []).map((s) => s.name);

    const results = [];
    const jsonData = [];

    const runSeed = Math.random() * 1000000;
    const pseudoRand = (seed) => {
        const x = Math.sin(seed + runSeed) * 10000;
        return x - Math.floor(x);
    };

    const pickCategory = (seed) => {
        if (!categories.length) return { name: "none" };
        const idx = Math.floor(pseudoRand(seed) * categories.length) % categories.length;
        return categories[idx];
    };

    const pickItem = (slot, seed) => {
        const available = items.filter((it) => it.equipment_slot === slot);
        if (!available.length) return { name: "None", equipment_slot: slot || "slot", category: "none" };
        const idx = Math.floor(pseudoRand(seed) * available.length) % available.length;
        return available[idx];
    };

    for (let lvl = 1; lvl <= levels; lvl += 1) {
        const lootCount = Math.max(1, Math.round(state.additional_loot_factor || 1));
        const lootList = [];
        for (let i = 0; i < lootCount; i += 1) {
            const cat = pickCategory(lvl + i + 1);
            const slot = slots.length
                ? slots[Math.floor(pseudoRand(lvl + i + 7) * slots.length) % slots.length]
                : "slot";
            const item = pickItem(slot, lvl + i + 13);
            lootList.push({
                slot,
                category: cat?.name || "none",
                name: item.name,
                bonuses: [],
                dmgAdds: {},
                baseAdds: {},
                dmgMods: {},
                resAdds: {},
                atkBonus: 0
            });
        }

        const lootRows = lootList.map((l) => {
            const catColor = (categories.find((c) => c.name === l.category)?.color) || "#e2e8f0";
            return `
      <tr>
        <td><span style="color:#facc15">${l.slot}</span></td>
        <td><span style="color:${catColor}">${l.name}</span></td>
        <td><span style="color:${catColor}">${l.category}</span></td>
        <td>None</td>
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

        const summaryText = `<span class="summary-col base">Lvl ${lvl} | 0 DPS | <span class="dim-blue">0m</span> | <span class="dim-blue">loot ~ ${lootList.length}</span></span><span class="summary-col mix"><span style="opacity:0.7">No mix</span></span><span class="summary-col loot"><span style="color:#ef4444">Nice Loot Found: 0</span></span>`;

        results.push(`
<details class="compute-card" ${lvl === levels ? "open" : ""}>
  <summary>${summaryText}</summary>
  <div class="body">
    <div class="level-meta">
      <div>Distribution: none</div>    
      <div>Attrib range for loot: 0-0</div>
      <div class="loot-meta">Base dmg minimum: 0</div>
      <div class="loot-meta">Median mod: 0%</div>
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
          <div class="build-line">Stats: none</div>
          <div class="build-line">Attack Speed: 0</div>
          <div class="build-line">Resists: none</div>
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
            time_readable: "0m",
            loot_count: lootList.length,
            xp_level: 0,
            xp_total: 0,
            distribution: "none",
            stats: {},
            attr_bounds: {},
            attr_range: "0-0",
            gear: [],
            all_loot: lootList,
            totals: {
                damage: {},
                resists: {},
                attack_speed: 0,
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
    }
}
