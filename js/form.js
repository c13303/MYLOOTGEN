$(function () {

    /// check structures in defaults.js
 
    const $levels = $("#levels");
    const $skillSlots = $("#skill-slots");
    const $attrRanges = $(".attr-number");
    const $gainPerLevel = $("#gain-per-level");
    const $statsProgressionModel = $("#stats-progression-model");
    const $medianTimePerLoot = $("#median-time-per-loot");
    const $medianTimePerLevel = $("#median-time-per-level");
    const $levelTimeMultiplier = $("#level-time-multiplier");
    const $rarityGrowthFactor = $("#rarity-growth-factor");
    const $unarmedPhysicalDamage = $("#unarmed-physical-damage");
    const $basePhysicalResistance = $("#base-physical-resistance");
    const $generatePercent = $("#generate-percent");
    const $attackSpeedBase = $("#attack-speed-base");
    const $attackSpeedMin = $("#attack-speed-min");
    const $attackSpeedMax = $("#attack-speed-max");
    const $attackSpeedPower = $("#attack-speed-power");
    const $attackSpeedSlotsAuto = $("#attack-speed-slots-auto");
    const $attackSpeedFormulaDisplay = $("#attack-speed-formula-display");
    const $attackSpeedChart = $("#attack-speed-chart");
    const $affixRarityScale = $("#affix-rarity-scale");
    const $flatDamagePower = $("#flat-damage-power");
    const $flatDamageMin = $("#flat-damage-min");
    const $flatDamageMedian = $("#flat-damage-median");
    const $flatDamageJitter = $("#flat-damage-jitter");
    const $flatDamageFormulaDisplay = $("#flat-damage-formula-display");
    const $flatDamageSlotsAuto = $("#flat-damage-slots-auto");
    const $flatDamageSlotsMeta = $("#flat-damage-slots-meta");
    const $flatDamageOneHandRatio = $("#flat-damage-onehand-ratio");
    const $flatDamageChart = $("#flat-damage-chart");
    const $modDamageMin = $("#mod-damage-min");
    const $modDamageMax = $("#mod-damage-max");
    const $modDamagePower = $("#mod-damage-power");
    const $modDamageJitter = $("#mod-damage-jitter");
    const $modDamageSlotsAuto = $("#mod-damage-slots-auto");
    const $modDamageFormulaDisplay = $("#mod-damage-formula-display");
    const $modDamageChart = $("#mod-damage-chart");
    const $dpsPlanningChart = $("#dps-planning-chart");
    const $dpsPlanningList = $("#dps-planning-list");
    const $attackSpeedSlotsMeta = $("#attack-speed-slots-meta");
    const $rarityWeightGrowth = $("#rarity-weight-growth");
    const $attrPerLevelFactor = $("#attr-per-level-factor"); 
    const $additionalLootFactor = $("#additional-loot-factor");
    const $unarmedGrowth = $("#unarmed-growth");
    const $xpBase = $("#xp-base");
    const $xpGrowth = $("#xp-growth");
    const $xpMultiplier = $("#xp-multiplier");
    const $xpCurve = $("#xp-curve");
    const $xpLevels = $("#xp-levels");
    const $configAlert = $("#config-alert");
    const $preview = $("#config-preview");
    const attrNames = ["force", "intelligence", "dexterity"];

    if (state.attributes?.physical && !state.attributes.force) {
        state.attributes.force = state.attributes.physical;
        delete state.attributes.physical;
    }
    if (state.attributes?.energy && !state.attributes.intelligence) {
        state.attributes.intelligence = state.attributes.energy;
        delete state.attributes.energy;
    }
    if (state.stats_progression_model === "favorite_physical") state.stats_progression_model = "favorite_force";
    if (state.stats_progression_model === "favorite_energy") state.stats_progression_model = "favorite_intelligence";

    const migrateScalarKey = (oldKey, newKey) => {
        if (Object.prototype.hasOwnProperty.call(state, oldKey)) {
            if (typeof state[newKey] === "undefined") {
                state[newKey] = state[oldKey];
            }
            delete state[oldKey];
        }
    };

    migrateScalarKey("base_damage_power_progression", "flat_damage_power_progression");
    migrateScalarKey("base_damage_min", "flat_damage_min");
    migrateScalarKey("base_damage_jitter_pct", "flat_damage_jitter_pct");
    migrateScalarKey("base_damage_types_per_item_min", "flat_damage_types_per_item_min");
    migrateScalarKey("base_damage_types_per_item_max", "flat_damage_types_per_item_max");

    const migrateDamageValue = (entry) => {
        if (!entry || typeof entry !== "object") return entry;
        const updated = { ...entry };
        if (Object.prototype.hasOwnProperty.call(updated, "base_damage")) {
            if (typeof updated.flat_damage === "undefined") {
                updated.flat_damage = updated.base_damage;
            }
            delete updated.base_damage;
        }
        return updated;
    };

    if (Array.isArray(state.damage_types)) {
        state.damage_types = state.damage_types.map(migrateDamageValue);
    }
    if (Array.isArray(state.items)) {
        state.items = state.items.map(migrateDamageValue);
        state.items = state.items.map((item) => {
            const updated = { ...item };
            if (Object.prototype.hasOwnProperty.call(updated, "source_damage_slots") && typeof updated.flat_damage_sources === "undefined") {
                updated.flat_damage_sources = updated.source_damage_slots;
            }
            delete updated.source_damage_slots;
            if (Object.prototype.hasOwnProperty.call(updated, "modifier") && typeof updated.damage_modifier === "undefined") {
                updated.damage_modifier = updated.modifier;
            }
            delete updated.modifier;
            delete updated.flat_damage;
            delete updated.resist_affix_min_chance;
            delete updated.default_damage_resistance_factor;
            const sourcesCount = updated.flat_damage_sources || 0;
            if (typeof updated.flat_damage_sources_multi_chance === "undefined" && sourcesCount > 1) {
                updated.flat_damage_sources_multi_chance = 0.9;
            }
            if (typeof updated.flat_damage_multiple_max_slice === "undefined" && sourcesCount > 1) {
                updated.flat_damage_multiple_max_slice = 0.9;
            }
            return updated;
        });
    }

    if (Array.isArray(state.equipment_slots)) {
        state.equipment_slots = state.equipment_slots.map((slot) => {
            const name = slot?.name || "";
            const defaultFlat = typeof slot.allow_flat_damage !== "undefined"
                ? slot.allow_flat_damage
                : name.toLowerCase().includes("weapon");
            const defaultOffHand = typeof slot.allow_off_hand !== "undefined"
                ? slot.allow_off_hand
                : name.toLowerCase().includes("hand_left");
            return {
                allow_flat_damage: defaultFlat,
                allow_two_handed: typeof slot.allow_two_handed === "undefined" ? false : slot.allow_two_handed,
                allow_off_hand: defaultOffHand,
                allow_damage_mod: typeof slot.allow_damage_mod === "undefined" ? true : slot.allow_damage_mod,
                allow_attack_speed: typeof slot.allow_attack_speed === "undefined" ? true : slot.allow_attack_speed,
                allow_resist: typeof slot.allow_resist === "undefined" ? true : slot.allow_resist,
                ...slot
            };
        });
    }
    updateFlatDamageSlotsAutoCount();

    function openDamageForm() {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "520px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $("<h3>Add damage type</h3>").css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const $form = $('<form class="damage-form"></form>').css({
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        });

        const $name = $('<input type="text" placeholder="Name">').css({
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0"
        });

        const $flatDamage = $('<input type="number" placeholder="Flat damage" step="1" min="0">').css({
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0"
        });

        const $attributeSelect = $('<select></select>').css({
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0"
        });
        $attributeSelect.append('<option value="force">Force</option>');
        $attributeSelect.append('<option value="dexterity">Dexterity</option>');
        $attributeSelect.append('<option value="intelligence">Intelligence</option>');

        const $attributeModifier = $('<input type="number" placeholder="Attribute modifier (e.g. 0.02)" step="0.01" min="0">').css({
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0"
        }).val(0.02);

        const $overTimeWrapper = $('<label style="display:flex; align-items:center; gap:8px;"></label>');
        const $overTime = $('<input type="checkbox">');
        const $overTimeText = $("<span>Over time</span>");
        $overTimeWrapper.append($overTime, $overTimeText).css({ cursor: "pointer", userSelect: "none" });

        const $defaultWrap = $('<label style="display:flex; align-items:center; gap:8px;"></label>');
        const $defaultType = $('<input type="checkbox">');
        const $defaultText = $("<span>Default damage type</span>");
        $defaultWrap.append($defaultType, $defaultText).css({ cursor: "pointer", userSelect: "none" });

        const $color = $('<input type="color" value="#ffffff">').css({
            padding: "4px",
            borderRadius: "6px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0",
            width: "100%"
        });

        const $rangeList = $('<div class="range-list"></div>').css({
            display: "flex",
            flexDirection: "column",
            gap: "8px"
        });

        function addRangeRow(defaults = { min: 0, max: 10, rarity: 0.5 }) {
            const $row = $('<div class="range-row"></div>').css({
                display: "grid",
                gridTemplateColumns: "90px 90px 1fr auto",
                gap: "6px",
                alignItems: "center"
            });

            const $min = $(`<input type="number" placeholder="Min level" value="${defaults.min}" step="1" min="0">`).css({
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid rgba(226,232,240,0.2)",
                background: "rgba(15,23,42,0.7)",
                color: "#e2e8f0",
                width: "100%"
            });
            const $max = $(`<input type="number" placeholder="Max level" value="${defaults.max}" step="1" min="0">`).css({
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid rgba(226,232,240,0.2)",
                background: "rgba(15,23,42,0.7)",
                color: "#e2e8f0",
                width: "100%"
            });
            const $rarity = $(`<input type="number" placeholder="Rarity (0-1)" value="${defaults.rarity}" step="0.01" min="0" max="1">`).css({
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid rgba(226,232,240,0.2)",
                background: "rgba(15,23,42,0.7)",
                color: "#e2e8f0"
            });
            const $remove = $('<button type="button">x</button>').css({
                padding: "6px 10px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(226,232,240,0.15)",
                color: "#e2e8f0",
                cursor: "pointer"
            });

            $remove.on("click", () => {
                $row.remove();
            });

            $row.append($min, $max, $rarity, $remove);
            $rangeList.append($row);
        }

        addRangeRow();

        const $addRange = $('<button type="button">Add range</button>').css({
            padding: "8px 10px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $addRange.on("click", () => {
            addRangeRow();
        });

        const $actions = $('<div class="actions"></div>').css({
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "6px"
        });

        const $cancel = $('<button type="button">Cancel</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "rgba(226,232,240,0.15)",
            color: "#e2e8f0",
            cursor: "pointer"
        });

        const $submit = $('<button type="submit">Add</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $cancel.on("click", () => {
            $overlay.remove();
        });

        $form.on("submit", (event) => {
            event.preventDefault();
            const damageName = $name.val().trim();
            const flatDamage = parseFloat($flatDamage.val());
            const isOverTime = $overTime.is(":checked");
            const attribute = $attributeSelect.val() || "force";
            const attributeModifier = parseFloat($attributeModifier.val());
            const ranges = [];
            let invalid = false;

            $rangeList.find(".range-row").each(function () {
                const $row = $(this);
                const min = parseInt($row.find('input[placeholder="Min level"]').val(), 10);
                const max = parseInt($row.find('input[placeholder="Max level"]').val(), 10);
                const rarity = parseFloat($row.find('input[placeholder="Rarity (0-1)"]').val());

                if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(rarity) || rarity < 0 || rarity > 1 || max < min) {
                    invalid = true;
                    return false;
                }
                ranges.push([min, max, rarity]);
            });

            if (!damageName || Number.isNaN(flatDamage) || Number.isNaN(attributeModifier) || ranges.length === 0 || invalid) {
                alert("Please fill every field correctly (rarity between 0 and 1, max level >= min level).");
                return;
            }

            state.damage_types.push({
                name: damageName,
                flat_damage: flatDamage,
                is_over_time: isOverTime,
                attribute,
                attribute_modifier: attributeModifier,
                ranges,
                color: $color.val() || "#ffffff",
                default_damage_type: $defaultType.is(":checked")
            });

            renderTags("damage_types");
            renderPreview();
            $overlay.remove();
        });

        $actions.append($cancel, $submit);
        $form.append(
            $name,
            $flatDamage,
            $("<label>Attribute</label>").css({ fontWeight: "600" }),
            $attributeSelect,
            $("<label>Attribute modifier</label>").css({ fontWeight: "600" }),
            $attributeModifier,
            $("<label>Color</label>").css({ fontWeight: "600" }),
            $color,
            $overTimeWrapper,
            $defaultWrap,
            $("<label>Level ranges</label>").css({ fontWeight: "600" }),
            $rangeList,
            $addRange,
            $actions
        );
        $modal.append($title, $form);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function openDamageSummary(damage) {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "420px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $(`<h3>${damage.name}</h3>`).css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const $base = $(`<p><strong>Flat damage:</strong> ${damage.flat_damage ?? damage.base_damage}</p>`).css({
            margin: "0 0 10px"
        });
        const $overTime = $(`<p><strong>Over time:</strong> ${damage.is_over_time ? "Yes" : "No"}</p>`).css({
            margin: "0 0 10px"
        });
        const attrLabel = (() => {
            const attr = damage.attribute || "force";
            if (attr === "dexterity") return "Dexterity";
            if (attr === "intelligence") return "Intelligence";
            return "Force";
        })();
        const $attribute = $(`<p><strong>Attribute:</strong> ${attrLabel}</p>`).css({
            margin: "0 0 8px"
        });
        const $attributeMod = $(`<p><strong>Attribute modifier:</strong> ${damage.attribute_modifier ?? "-"}x</p>`).css({
            margin: "0 0 10px"
        });
        const $color = $(`<p><strong>Color:</strong> <span style="color:${damage.color || "#fff"}">${damage.color || "default"}</span></p>`).css({
            margin: "0 0 10px"
        });

        const $rangesTitle = $("<p><strong>Level ranges</strong></p>").css({
            margin: "0 0 6px"
        });

        const $list = $("<ul></ul>").css({
            paddingLeft: "18px",
            margin: "0 0 14px"
        });

        (damage.ranges || []).forEach((range) => {
            const [min, max, rarity] = range;
            $list.append($(`<li>Min ${min} - Max ${max} : Rarity ${rarity}</li>`).css({ marginBottom: "4px" }));
        });

        const $close = $('<button type="button">Close</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center"
        });

        $close.on("click", () => $overlay.remove());

        $modal.append($title, $base, $overTime, $attribute, $attributeMod, $color, $rangesTitle, $list, $close);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function openSlotForm() {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "380px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $("<h3>Add equipment slot</h3>").css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const fieldStyle = {
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0",
            width: "100%"
        };

        const $form = $('<form class="slot-form"></form>').css({
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        });

        const $name = $('<input type="text" placeholder="Name">').css(fieldStyle);
        const $pos = $('<input type="number" placeholder="Position (order)" step="1" min="1">').css(fieldStyle);
        const checkboxStyle = {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(15,23,42,0.7)",
            border: "1px solid rgba(226,232,240,0.2)",
            borderRadius: "8px",
            padding: "8px 10px",
            color: "#e2e8f0"
        };
        const $allowFlat = $('<label></label>').css(checkboxStyle).append(
            $('<input type="checkbox">').css({ accentColor: "#38bdf8" }),
            $("<span>Allow Flat dmg</span>")
        );
        const $allowTwoHanded = $('<label></label>').css(checkboxStyle).append(
            $('<input type="checkbox">').css({ accentColor: "#38bdf8" }),
            $("<span>Allow two-handed</span>")
        );
        const $allowOffHand = $('<label></label>').css(checkboxStyle).append(
            $('<input type="checkbox">').css({ accentColor: "#38bdf8" }),
            $("<span>Allow off hand</span>")
        );
        const $allowMod = $('<label></label>').css(checkboxStyle).append(
            $('<input type="checkbox" checked>').css({ accentColor: "#38bdf8" }),
            $("<span>Allow dmg mod</span>")
        );
        const $allowAS = $('<label></label>').css(checkboxStyle).append(
            $('<input type="checkbox" checked>').css({ accentColor: "#38bdf8" }),
            $("<span>Allow AS</span>")
        );
        const $allowResist = $('<label></label>').css(checkboxStyle).append(
            $('<input type="checkbox" checked>').css({ accentColor: "#38bdf8" }),
            $("<span>Allow Resist</span>")
        );

        const $actions = $('<div class="actions"></div>').css({
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "6px"
        });

        const $cancel = $('<button type="button">Cancel</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "rgba(226,232,240,0.15)",
            color: "#e2e8f0",
            cursor: "pointer"
        });

        const $submit = $('<button type="submit">Add</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $cancel.on("click", () => $overlay.remove());

        $form.on("submit", (event) => {
            event.preventDefault();
            const name = $name.val().trim();
            const posVal = parseInt($pos.val(), 10);
            if (!name || Number.isNaN(posVal) || posVal < 1) {
                alert("Please fill name and position >= 1.");
                return;
            }
            const exists = (state.equipment_slots || []).some((s) => s.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                alert("Slot name already exists.");
                return;
            }
            state.equipment_slots = state.equipment_slots || [];
            state.equipment_slots.push({
                name,
                position: posVal,
                allow_flat_damage: $allowFlat.find("input").prop("checked"),
                allow_two_handed: $allowTwoHanded.find("input").prop("checked"),
                allow_off_hand: $allowOffHand.find("input").prop("checked"),
                allow_damage_mod: $allowMod.find("input").prop("checked"),
                allow_attack_speed: $allowAS.find("input").prop("checked"),
                allow_resist: $allowResist.find("input").prop("checked")
            });
            renderTags("equipment_slots");
            renderPreview();
            $overlay.remove();
        });

        $actions.append($cancel, $submit);
        $form.append($name, $pos, $allowFlat, $allowTwoHanded, $allowOffHand, $allowMod, $allowAS, $allowResist, $actions);
        $modal.append($title, $form);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function openSlotSummary(slot) {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "320px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $(`<h3>${slot.name}</h3>`).css({
            margin: "0 0 12px",
            fontSize: "18px"
        });
        const $pos = $(`<p><strong>Position:</strong> ${slot.position ?? "-"}</p>`).css({ margin: "0 0 12px" });
        const $allowFlat = $(`<p><strong>Allow Flat dmg:</strong> ${slot.allow_flat_damage ? "Yes" : "No"}</p>`).css({ margin: "0 0 6px" });
        const $allowTwoHanded = $(`<p><strong>Allow two-handed:</strong> ${slot.allow_two_handed ? "Yes" : "No"}</p>`).css({ margin: "0 0 6px" });
        const $allowOffHand = $(`<p><strong>Allow off hand:</strong> ${slot.allow_off_hand ? "Yes" : "No"}</p>`).css({ margin: "0 0 6px" });
        const $allowMod = $(`<p><strong>Allow dmg mod:</strong> ${slot.allow_damage_mod ? "Yes" : "No"}</p>`).css({ margin: "0 0 6px" });
        const $allowAS = $(`<p><strong>Allow AS:</strong> ${slot.allow_attack_speed ? "Yes" : "No"}</p>`).css({ margin: "0 0 6px" });
        const $allowRes = $(`<p><strong>Allow Resist:</strong> ${slot.allow_resist ? "Yes" : "No"}</p>`).css({ margin: "0 0 12px" });

        const $close = $('<button type="button">Close</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $close.on("click", () => $overlay.remove());

        $modal.append($title, $pos, $allowFlat, $allowTwoHanded, $allowOffHand, $allowMod, $allowAS, $allowRes, $close);
        $overlay.append($modal);
        $("body").append($overlay);
    }
    function openCategoryForm() {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "420px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $("<h3>Add category</h3>").css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const fieldStyle = {
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0",
            width: "100%"
        };

        const $form = $('<form class="category-form"></form>').css({
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        });

        const $name = $('<input type="text" placeholder="Name">').css(fieldStyle);
        const $rarity = $('<input type="number" placeholder="Rarity (0-1)" step="0.01" min="0" max="1">').css(fieldStyle);
        const $attributes = $('<input type="number" placeholder="Affix count" step="1" min="0">').css(fieldStyle);
        const $unlockLevel = $('<input type="number" placeholder="Unlock level" step="1" min="1">').css(fieldStyle);
        const $skillMod = $('<input type="number" placeholder="Skill mod (optional)" step="1" min="0">').css(fieldStyle);
        const $allowAtkSpeed = $('<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" class="allow-atk-speed"> Allow attack speed mod</label>');
        const $attrTypeSelect = $('<select></select>').css(fieldStyle);
        const $attrTypesWrap = $('<div></div>').css({ display: "grid", gap: "6px" });
        const $color = $('<input type="color" value="#ffffff">').css({
            padding: "4px",
            borderRadius: "6px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0",
            width: "100%"
        });
        const attrTypes = [];

        function renderAttrTypeSelect() {
            $attrTypeSelect.empty();
            $attrTypeSelect.append('<option value="">Select damage/resistance type</option>');
            (state.damage_types || []).forEach((dt) => {
                $attrTypeSelect.append($(`<option value="${dt.name}">${dt.name}</option>`));
            });
        }

        const $attrTypeTags = $('<div class="tag-list"></div>').css({ gap: "6px" });

        function renderAttrTypeTags() {
            $attrTypeTags.empty();
            attrTypes.forEach((t) => {
                const $tag = $('<span class="tag"></span>').text(t);
                const $x = $('<button type="button" class="remove-tag">x</button>');
                $x.on("click", () => {
                    const idx = attrTypes.indexOf(t);
                    if (idx >= 0) attrTypes.splice(idx, 1);
                    renderAttrTypeTags();
                });
                $tag.append($x);
                $attrTypeTags.append($tag);
            });
        }

        const $addAttrType = $('<button type="button">Add affix type</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $addAttrType.on("click", () => {
            const val = $attrTypeSelect.val();
            if (val && !attrTypes.includes(val)) {
                attrTypes.push(val);
                renderAttrTypeTags();
            }
        });

        $attrTypesWrap.append($attrTypeSelect, $addAttrType, $attrTypeTags);
        renderAttrTypeSelect();
        renderAttrTypeTags();

        const $actions = $('<div class="actions"></div>').css({
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "6px"
        });

        const $cancel = $('<button type="button">Cancel</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "rgba(226,232,240,0.15)",
            color: "#e2e8f0",
            cursor: "pointer"
        });

        const $submit = $('<button type="submit">Add</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $cancel.on("click", () => $overlay.remove());

        $form.on("submit", (event) => {
            event.preventDefault();
            const name = $name.val().trim();
            const rarityVal = parseFloat($rarity.val());
            const attrVal = parseInt($attributes.val(), 10);
            const skillValRaw = $skillMod.val().trim();
            const unlockLevelVal = parseInt($unlockLevel.val(), 10);
            const skillVal = skillValRaw === "" ? null : parseInt(skillValRaw, 10);
            const colorVal = $color.val() || "#ffffff";

            if (!name || Number.isNaN(rarityVal) || rarityVal < 0 || rarityVal > 1 || Number.isNaN(attrVal)) {
                alert("Please fill every field correctly (rarity between 0 and 1).");
                return;
            }
            if (Number.isNaN(unlockLevelVal) || unlockLevelVal < 1) {
                alert("Unlock level must be >= 1.");
                return;
            }

            if (skillValRaw !== "" && Number.isNaN(skillVal)) {
                alert("Skill mod must be a number or left empty.");
                return;
            }

            const exists = state.categories.some((cat) => cat.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                alert("Category name already exists.");
                return;
            }

            const newCat = {
                name,
                rarity: rarityVal,
                attributes: attrVal,
                attribute_types: [...attrTypes],
                allow_attack_speed_mod: $allowAtkSpeed.find("input").is(":checked"),
                unlock_level: unlockLevelVal,
                color: colorVal
            };
            if (skillVal !== null) {
                newCat.skill_mod = skillVal;
            }

            state.categories.push(newCat);
            renderTags("categories");
            renderPreview();
            $overlay.remove();
        });

        $actions.append($cancel, $submit);
        $form.append(
            $name,
            $rarity,
            $attributes,
            $unlockLevel,
            $allowAtkSpeed,
            $skillMod,
            $("<label>Color</label>").css({ fontWeight: "600" }),
            $color,
            $("<label>Affix types</label>").css({ fontWeight: "600" }),
            $attrTypesWrap,
            $actions
        );
        $modal.append($title, $form);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function openCategorySummary(cat) {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "420px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $(`<h3>${cat.name}</h3>`).css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const $rarity = $(`<p><strong>Rarity:</strong> ${cat.rarity}</p>`).css({ margin: "0 0 8px" });
        const $attrs = $(`<p><strong>Affix count:</strong> ${cat.attributes}</p>`).css({ margin: "0 0 8px" });
        const attrTypes = (cat.attribute_types && cat.attribute_types.length) ? cat.attribute_types.join(", ") : "-";
        const $types = $(`<p><strong>Affix types:</strong> ${attrTypes}</p>`).css({ margin: "0 0 8px" });
        const $atk = $(`<p><strong>Allow attack speed:</strong> ${cat.allow_attack_speed_mod ? "Yes" : "No"}</p>`).css({ margin: "0 0 14px" });
        const $skill = $(`<p><strong>Skill mod:</strong> ${cat.skill_mod ?? "-"}</p>`).css({ margin: "0 0 14px" });
        const $unlock = $(`<p><strong>Unlock level:</strong> ${cat.unlock_level ?? 1}</p>`).css({ margin: "0 0 14px" });
        const $colorRow = $(`<p><strong>Color:</strong> <span style="color:${cat.color || "#fff"}">${cat.color || "default"}</span></p>`).css({ margin: "0 0 14px" });

        const $close = $('<button type="button">Close</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $close.on("click", () => $overlay.remove());

        $modal.append($title, $rarity, $attrs, $types, $atk, $skill, $unlock, $colorRow, $close);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function openItemForm() {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "420px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $("<h3>Add item</h3>").css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const fieldStyle = {
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0",
            width: "100%"
        };

        const $form = $('<form class="item-form"></form>').css({
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        });

        const $name = $('<input type="text" placeholder="Name">').css(fieldStyle);

        const slotOptions = (state.equipment_slots || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0)).map((s) => s.name);
        const $slot = $('<select></select>').css(fieldStyle);
        slotOptions.forEach((slot) => {
            $slot.append($(`<option value="${slot}">${slot}</option>`));
        });
        if (slotOptions.length === 0) {
            $slot.append($('<option value="">No slots available</option>'));
        }

        const $size = $('<input type="number" placeholder="Size (grid cells)" step="1" min="1">').css(fieldStyle);
        const $affixMax = $('<input type="number" placeholder="Affix max" step="1" min="1">').css(fieldStyle);
        const $sourceDamageSlots = $('<input type="number" placeholder="Flat dmg sources (count)" step="1" min="0">').css(fieldStyle);
        const $sourceMulti = $('<input type="number" placeholder="Chance of multiple sources (0-1)" step="0.01" min="0" max="1">').css(fieldStyle);
        const $sourceMaxSlice = $('<input type="number" placeholder="Max slice per source (0-1)" step="0.01" min="0" max="1">').css(fieldStyle);
        const $modifierWrap = $('<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" class="modifier-flag" checked> Damage modifier (%)</label>');
        const $twoHandedWrap = $('<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" class="twohand-flag"> Two-handed</label>');

        const dmgTypes = (state.damage_types || []).map((d) => d.name);
        const $typesContainer = $('<div class="tag-list"></div>').css({ gap: "6px", flexWrap: "wrap" });
        const selectedTypes = new Set(dmgTypes);
        dmgTypes.forEach((t) => {
            const $lbl = $('<label class="tag"></label>').css({ cursor: "pointer" });
            const $cb = $(`<input type="checkbox" checked value="${t}">`);
            const $txt = $(`<span>${t}</span>`);
            $cb.on("change", function () {
                if ($(this).is(":checked")) selectedTypes.add(t);
                else selectedTypes.delete(t);
            });
            $lbl.append($cb, $txt);
            $typesContainer.append($lbl);
        });

        const $actions = $('<div class="actions"></div>').css({
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "6px"
        });

        const $cancel = $('<button type="button">Cancel</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "rgba(226,232,240,0.15)",
            color: "#e2e8f0",
            cursor: "pointer"
        });

        const $submit = $('<button type="submit">Add</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $cancel.on("click", () => $overlay.remove());

        $form.on("submit", (event) => {
            event.preventDefault();
            const name = $name.val().trim();
            const slot = $slot.val();
            const size = parseInt($size.val(), 10);
            const affixMax = parseInt($affixMax.val(), 10);
            const sourceDamageSlots = parseInt($sourceDamageSlots.val(), 10);
            const sourceMulti = parseFloat($sourceMulti.val());
            const sourceMaxSlice = parseFloat($sourceMaxSlice.val());
            const modifierFlag = $modifierWrap.find("input").is(":checked");
            const twoHandedFlag = $twoHandedWrap.find("input").is(":checked");
            const typeList = Array.from(selectedTypes);

            if (!name || !slot || Number.isNaN(size) || size < 1 || Number.isNaN(affixMax) || affixMax < 1) {
                alert("Please fill every field correctly (size/affix max >= 1 and select a slot).");
                return;
            }
            if (typeList.length === 0) {
                alert("Select at least one damage type.");
                return;
            }

            const exists = state.items.some((item) => item.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                alert("Item name already exists.");
                return;
            }

            state.items.push({
                name,
                equipment_slot: slot,
                size,
                affix_max: affixMax,
                flat_damage_sources: Number.isNaN(sourceDamageSlots) ? 0 : sourceDamageSlots,
                ...(Number.isNaN(sourceMulti) ? {} : { flat_damage_sources_multi_chance: sourceMulti }),
                ...(Number.isNaN(sourceMaxSlice) ? {} : { flat_damage_multiple_max_slice: sourceMaxSlice }),
                damage_modifier: modifierFlag,
                ...(twoHandedFlag ? { two_handed: true } : {}),
                damage_types: typeList
            });

            renderTags("items");
            renderPreview();
            $overlay.remove();
        });

        $actions.append($cancel, $submit);
        $form.append($name, $slot, $size, $affixMax, $sourceDamageSlots, $sourceMulti, $sourceMaxSlice, $modifierWrap, $twoHandedWrap, $typesContainer, $actions);
        $modal.append($title, $form);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function openItemSummary(item) {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "420px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $(`<h3>${item.name}</h3>`).css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const $slot = $(`<p><strong>Slot:</strong> ${item.equipment_slot}</p>`).css({ margin: "0 0 8px" });
        const $size = $(`<p><strong>Size:</strong> ${item.size}</p>`).css({ margin: "0 0 14px" });
        const $source = $(`<p><strong>Flat dmg sources:</strong> ${item.flat_damage_sources ?? 0}</p>`).css({ margin: "0 0 8px" });
        const $sourceMulti = $(`<p><strong>Multi-source chance:</strong> ${typeof item.flat_damage_sources_multi_chance !== "undefined" ? item.flat_damage_sources_multi_chance : "-"}</p>`).css({ margin: "0 0 8px" });
        const $sourceMaxSlice = $(`<p><strong>Max slice per source:</strong> ${typeof item.flat_damage_multiple_max_slice !== "undefined" ? item.flat_damage_multiple_max_slice : "-"}</p>`).css({ margin: "0 0 8px" });
        const $twoHanded = $(`<p><strong>Two-handed:</strong> ${item.two_handed ? "Yes" : "No"}</p>`).css({ margin: "0 0 8px" });
        const $mod = $(`<p><strong>Dmg mod:</strong> ${item.damage_modifier ? "Yes" : "No"}</p>`).css({ margin: "0 0 8px" });
        const typeList = (item.damage_types && item.damage_types.length) ? item.damage_types.join(", ") : "-";
        const $types = $(`<p><strong>Damage types:</strong> ${typeList}</p>`).css({ margin: "0 0 14px" });

        const $close = $('<button type="button">Close</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $close.on("click", () => $overlay.remove());

        $modal.append($title, $slot, $size, $source, $sourceMulti, $sourceMaxSlice, $twoHanded, $mod, $types, $close);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function openSkillForm() {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "420px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $("<h3>Add skill</h3>").css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const fieldStyle = {
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(226,232,240,0.2)",
            background: "rgba(15,23,42,0.7)",
            color: "#e2e8f0",
            width: "100%"
        };

        const $form = $('<form class="skill-form"></form>').css({
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        });

        const $name = $('<input type="text" placeholder="Name">').css(fieldStyle);
        const $cooldown = $('<input type="number" placeholder="Cooldown" step="0.1" min="0">').css(fieldStyle);
        const $energy = $('<input type="number" placeholder="Energy cost" step="1" min="0">').css(fieldStyle);

        const $type = $('<select></select>').css(fieldStyle);
        $type.append('<option value="damage">Damage</option>');
        $type.append('<option value="buff">Buff</option>');

        const damageOptions = (state.damage_types || []).map((d) => d.name);
        const $damageType = $('<select></select>').css(fieldStyle);
        $damageType.append('<option value="">Select damage type</option>');
        damageOptions.forEach((name) => {
            $damageType.append($(`<option value="${name}">${name}</option>`));
        });

        const $levelMin = $('<input type="number" placeholder="Min level" step="1" min="0">').css(fieldStyle);

        function toggleDamageType() {
            const isDamage = $type.val() === "damage";
            $damageType.prop("disabled", !isDamage);
        }
        $type.on("change", toggleDamageType);
        toggleDamageType();

        const $actions = $('<div class="actions"></div>').css({
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "6px"
        });

        const $cancel = $('<button type="button">Cancel</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "rgba(226,232,240,0.15)",
            color: "#e2e8f0",
            cursor: "pointer"
        });

        const $submit = $('<button type="submit">Add</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $cancel.on("click", () => $overlay.remove());

        $form.on("submit", (event) => {
            event.preventDefault();
            const name = $name.val().trim();
            const cooldown = parseFloat($cooldown.val());
            const energy = parseFloat($energy.val());
            const type = $type.val();
            const damageType = $damageType.val();
            const levelMin = parseInt($levelMin.val(), 10);

            const isDamage = type === "damage";

            if (!name || Number.isNaN(cooldown) || Number.isNaN(energy) || Number.isNaN(levelMin)) {
                alert("Please fill every field correctly.");
                return;
            }
            if (isDamage && !damageType) {
                alert("Please choose a damage type for damage skills.");
                return;
            }

            const exists = state.skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                alert("Skill name already exists.");
                return;
            }

            const newSkill = {
                name,
                cooldown,
                energy_cost: energy,
                type,
                level_min: levelMin
            };
            if (isDamage) {
                newSkill.damage_type = damageType;
            }

            state.skills.push(newSkill);
            renderTags("skills");
            renderPreview();
            $overlay.remove();
        });

        $actions.append($cancel, $submit);
        $form.append($name, $cooldown, $energy, $type, $damageType, $levelMin, $actions);
        $modal.append($title, $form);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function openSkillSummary(skill) {
        const $overlay = $('<div class="modal-overlay"></div>').css({
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        });

        const $modal = $('<div class="modal"></div>').css({
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "20px",
            borderRadius: "12px",
            width: "420px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            border: "1px solid rgba(226,232,240,0.1)"
        });

        const $title = $(`<h3>${skill.name}</h3>`).css({
            margin: "0 0 12px",
            fontSize: "18px"
        });

        const $type = $(`<p><strong>Type:</strong> ${skill.type}</p>`).css({ margin: "0 0 8px" });
        const $cooldown = $(`<p><strong>Cooldown:</strong> ${skill.cooldown}</p>`).css({ margin: "0 0 8px" });
        const $energy = $(`<p><strong>Energy cost:</strong> ${skill.energy_cost}</p>`).css({ margin: "0 0 8px" });
        const $level = $(`<p><strong>Min level:</strong> ${skill.level_min}</p>`).css({ margin: "0 0 8px" });
        const $damage = skill.damage_type ? $(`<p><strong>Damage type:</strong> ${skill.damage_type}</p>`).css({ margin: "0 0 14px" }) : null;

        const $close = $('<button type="button">Close</button>').css({
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "700",
            cursor: "pointer"
        });

        $close.on("click", () => $overlay.remove());

        $modal.append($title, $type, $cooldown, $energy, $level);
        if ($damage) $modal.append($damage);
        $modal.append($close);
        $overlay.append($modal);
        $("body").append($overlay);
    }

    function renderTags(key) {
        const $container = $(`.tag-list[data-tags="${key}"]`);
        $container.empty();

        const items = key === "equipment_slots"
            ? (state[key] || [])
            : state[key];

        items.forEach((value, index) => {
            const label = key === "damage_types"
                ? `${value.name}${value.default_damage_type ? " [default]" : ""}${value.is_over_time ? " (over time)" : ""}${value.attribute ? ` | ${value.attribute}${value.attribute_modifier ? ` x${value.attribute_modifier}` : ""}` : ""}`
                : key === "categories"
                    ? value.name
                : key === "items"
                    ? value.name
                    : key === "skills"
                        ? value.name
                : key === "equipment_slots"
                    ? value.name
                    : value;
            const $tag = $('<span class="tag"></span>').attr("data-index", index);
            if (key === "damage_types" && value.color) {
                $tag.css({ borderColor: value.color, color: value.color });
            }
            if (key === "categories" && value.color) {
                $tag.css({ borderColor: value.color, color: value.color });
            }
            const $text = $('<span class="tag-label"></span>').text(label);
            const $remove = $('<button type="button" class="remove-tag" aria-label="Remove">x</button>');

            $remove.on("click", (event) => {
                event.stopPropagation();
                if (key === "equipment_slots") {
                    state[key].splice(index, 1);
                } else if (key === "items" || key === "skills") {
                    state[key].splice(index, 1);
                } else {
                    state[key].splice(index, 1);
                }
                renderTags(key);
                renderPreview();
            });

            if (key === "damage_types") {
                $tag.on("click", () => openDamageSummary(value));
            }
            if (key === "categories") {
                $tag.on("click", () => openCategorySummary(value));
            }
            if (key === "items") {
                $tag.on("click", () => openItemSummary(value));
            }
            if (key === "skills") {
                $tag.on("click", () => openSkillSummary(value));
            }
            if (key === "equipment_slots") {
                $tag.on("click", () => openSlotSummary(value));
            }

            $tag.append($text, $remove);
            $container.append($tag);
        });

        if (key === "equipment_slots") {
            updateFlatDamageSlotsAutoCount();
            renderFlatDamageChart();
            updateAttackSpeedSlotsAutoCount();
            renderAttackSpeedChart();
            updateModDamageSlotsAutoCount();
            renderModDamageChart();
            renderDpsPlanningChart();
        }
    }

    function renderPreview() {
        $preview.text(JSON.stringify(state, null, 2));
    }

    function syncAttribute(attr, changedKind) {
        const minInput = $(`.attr-number[data-attr="${attr}"][data-kind="min"]`);
        const maxInput = $(`.attr-number[data-attr="${attr}"][data-kind="max"]`);
        let minVal = parseInt(minInput.val(), 10);
        let maxVal = parseInt(maxInput.val(), 10);

        if (Number.isNaN(minVal)) minVal = state.attributes?.[attr]?.min ?? 10;
        if (Number.isNaN(maxVal)) maxVal = state.attributes?.[attr]?.max ?? 10;

        minVal = Math.max(10, Math.min(200, minVal));
        maxVal = Math.max(10, Math.min(200, maxVal));

        if (minVal > maxVal) {
            if (changedKind === "min") {
                maxVal = minVal;
            } else {
                minVal = maxVal;
            }
        }

        minInput.val(minVal);
        maxInput.val(maxVal);

        state.attributes[attr] = { min: minVal, max: maxVal };
        renderPreview();
    }

    function initAttributes() {
        attrNames.forEach((attr) => {
            const defaults = state.attributes?.[attr] || { min: 10, max: 10 };
            const minInput = $(`.attr-number[data-attr="${attr}"][data-kind="min"]`);
            const maxInput = $(`.attr-number[data-attr="${attr}"][data-kind="max"]`);
            minInput.val(defaults.min);
            maxInput.val(defaults.max);
        });
    }

    function addTag(key, $input) {
        if (key === "damage_types") {
            openDamageForm();
            if ($input && $input.length) {
                $input.val("");
            }
            return;
        }
        if (key === "categories") {
            openCategoryForm();
            if ($input && $input.length) {
                $input.val("");
            }
            return;
        }
        if (key === "equipment_slots") {
            openSlotForm();
            if ($input && $input.length) {
                $input.val("");
            }
            return;
        }
        if (key === "items") {
            openItemForm();
            if ($input && $input.length) {
                $input.val("");
            }
        }
        if (key === "skills") {
            openSkillForm();
            if ($input && $input.length) {
                $input.val("");
            }
        }
    }

    $levels.val(state.levels);
    $skillSlots.val(state.skill_slots);
    initAttributes();
    $gainPerLevel.val(state.gain_per_level);
    $statsProgressionModel.val(state.stats_progression_model || "balanced");
    $medianTimePerLoot.val(state.median_time_per_loot);
    $medianTimePerLevel.val(state.median_time_per_level);
    $levelTimeMultiplier.val(state.level_time_multiplier);
    $rarityGrowthFactor.val(state.rarity_growth_factor);
    $unarmedPhysicalDamage.val(state.unarmed_physical_damage);
    $basePhysicalResistance.val(state.base_physical_resistance);
    $generatePercent.val(state.generate_percent);
    $attackSpeedBase.val(state.attack_speed_base);
    if (typeof state.attack_speed_min === "undefined") state.attack_speed_min = 5;
    if (typeof state.attack_speed_max === "undefined") state.attack_speed_max = 20;
    if (typeof state.attack_speed_power_progression === "undefined") state.attack_speed_power_progression = 1.2;
    if (typeof state.attack_speed_slots_auto === "undefined") {
        state.attack_speed_slots_auto = (state.equipment_slots || []).filter((slot) => slot.allow_attack_speed !== false).length;
    }
    $attackSpeedMin.val(state.attack_speed_min);
    $attackSpeedMax.val(state.attack_speed_max);
    $attackSpeedPower.val(state.attack_speed_power_progression);
    $attackSpeedSlotsAuto.val(state.attack_speed_slots_auto);
    $affixRarityScale.val(state.affix_rarity_scale ?? 0.1);
    if (typeof state.flat_damage_formula_progression === "undefined") {
        state.flat_damage_formula_progression = "dmg = flat_damage_min + (flat_damage_max - flat_damage_min) * ((level - 1) / max(1, levels - 1))^flat_damage_power_progression";
    }
    if (typeof state.flat_damage_max === "undefined") {
        state.flat_damage_max = 100;
    }
    if (typeof state.flat_damage_power_progression === "undefined") {
        state.flat_damage_power_progression = 2;
    }
    $flatDamagePower.val(state.flat_damage_power_progression);
    $flatDamageMin.val(state.flat_damage_min ?? 2);
    $flatDamageMedian.val(state.flat_damage_max);
    $flatDamageJitter.val(state.flat_damage_jitter_pct ?? 0.2);
    $flatDamageSlotsAuto.val(state.flat_damage_equipement_slots_auto ?? 0);
    $flatDamageOneHandRatio.val(state.flat_damage_onehand_ratio ?? 0.75);
    if (typeof state.mod_damage_min === "undefined") state.mod_damage_min = 10;
    if (typeof state.mod_damage_max === "undefined") state.mod_damage_max = 250;
    if (typeof state.mod_damage_power_progression === "undefined") state.mod_damage_power_progression = 1.2;
    if (typeof state.mod_damage_jitter_pct === "undefined") state.mod_damage_jitter_pct = 0.05;
    if (typeof state.mod_damage_slots_auto === "undefined") {
        state.mod_damage_slots_auto = (state.equipment_slots || []).filter((slot) => slot.allow_damage_mod !== false).length;
    }
    $modDamageMin.val(state.mod_damage_min);
    $modDamageMax.val(state.mod_damage_max);
    $modDamagePower.val(state.mod_damage_power_progression);
    $modDamageJitter.val(state.mod_damage_jitter_pct);
    $modDamageSlotsAuto.val(state.mod_damage_slots_auto);
    updateFlatDamageFormulaDisplay();
    renderFlatDamageChart();
    updateAttackSpeedFormulaDisplay();
    renderAttackSpeedChart();
    updateModDamageFormulaDisplay();
    renderModDamageChart();
    renderDpsPlanningChart();
    renderXpCurve();
    $attrPerLevelFactor.val(state.attr_per_level_factor);
    $rarityWeightGrowth.val(state.rarity_weight_growth);
    $additionalLootFactor.val(state.additional_loot_factor);
    $unarmedGrowth.val(state.unarmed_growth);
    $xpBase.val(state.xp_base);
    $xpGrowth.val(state.xp_growth);
    $xpMultiplier.val(state.xp_multiplier);
    renderTags("equipment_slots");
        renderTags("damage_types");
        renderTags("categories");
        renderTags("items");
        renderTags("skills");
        updateModDamageSlotsAutoCount();
        updateAttackSpeedSlotsAutoCount();
        renderAttackSpeedChart();
        validateConfig();
        renderPreview();

    $levels.on("input", function () {
        const value = parseInt($(this).val(), 10);
        if (!Number.isNaN(value)) {
            state.levels = value;
            renderFlatDamageChart();
            renderXpCurve();
            renderPreview();
        }
    });

    $skillSlots.on("input", function () {
        const value = parseInt($(this).val(), 10);
        if (!Number.isNaN(value)) {
            state.skill_slots = value;
            renderPreview();
        }
    });

    $attrRanges.on("input", function () {
        const attr = $(this).data("attr");
        const kind = $(this).data("kind");
        if (attr && kind) {
            syncAttribute(attr, kind);
        }
    });

    $gainPerLevel.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.gain_per_level = value;
            renderPreview();
        }
    });

    $statsProgressionModel.on("change", function () {
        const value = $(this).val();
        state.stats_progression_model = value;
        renderPreview();
    });

    $medianTimePerLoot.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.median_time_per_loot = value;
            renderPreview();
        }
    });

    $medianTimePerLevel.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.median_time_per_level = value;
            renderPreview();
        }
    });

    $levelTimeMultiplier.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.level_time_multiplier = value;
            renderPreview();
        }
    });

    $rarityGrowthFactor.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.rarity_growth_factor = value;
            renderPreview();
        }
    });

    $unarmedPhysicalDamage.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.unarmed_physical_damage = value;
            renderPreview();
        }
    });

    $basePhysicalResistance.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.base_physical_resistance = value;
            renderPreview();
        }
    });

    $generatePercent.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.generate_percent = value;
            renderPreview();
        }
    });

    $attackSpeedBase.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_base = value;
            renderPreview();
        }
    });

    $attackSpeedMin.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_min = value;
            renderAttackSpeedChart();
            renderDpsPlanningChart();
            renderPreview();
        }
    });
    $attackSpeedMax.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_max = value;
            renderAttackSpeedChart();
            renderDpsPlanningChart();
            renderPreview();
        }
    });
    $attackSpeedPower.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_power_progression = value;
            renderAttackSpeedChart();
            renderDpsPlanningChart();
            renderPreview();
        }
    });
    $affixRarityScale.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.affix_rarity_scale = value;
            renderPreview();
        }
    });

    function updateFlatDamageFormulaDisplay() {
        $flatDamageFormulaDisplay.text(state.flat_damage_formula_progression || "");
    }

    function updateFlatDamageSlotsAutoCount() {
        const allowed = (state.equipment_slots || []).filter((slot) => slot.allow_flat_damage !== false).length;
        state.flat_damage_equipement_slots_auto = allowed;
        if ($flatDamageSlotsAuto.length) {
            $flatDamageSlotsAuto.val(allowed);
        }
        if ($flatDamageSlotsMeta.length) {
            $flatDamageSlotsMeta.text(`${allowed}`);
        }
    }

    function validateConfig() {
        const messages = [];
        const slotMap = new Map((state.equipment_slots || []).map((s) => [s.name, s]));
        (state.items || []).forEach((item) => {
            const slot = slotMap.get(item.equipment_slot);
            const sources = item.flat_damage_sources || 0;
            if (slot && slot.allow_flat_damage && sources <= 0) {
                messages.push(`Item "${item.name}" in slot "${slot.name}" has no flat dmg sources while the slot allows them.`);
            }
            if (slot && slot.allow_flat_damage === false && sources > 0) {
                messages.push(`Item "${item.name}" in slot "${slot.name}" has flat dmg sources but the slot disallows them.`);
            }
        });
        if ($configAlert.length) {
            if (messages.length) {
                $configAlert.html(messages.map((m) => `<div>${m}</div>`).join(""));
                $configAlert.show();
            } else {
                $configAlert.hide().empty();
            }
        }
    }

    function renderFlatDamageChart() {
        if (!$flatDamageChart.length) return;
        const canvas = $flatDamageChart[0];
        const ctx = canvas.getContext("2d");
        const width = canvas.clientWidth || 600;
        const height = canvas.height || 240;
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        const lvlMax = Math.max(1, parseInt(state.levels, 10) || 1);
        const lvlCount = Math.max(2, lvlMax);
        const dmgMin = Number(state.flat_damage_min ?? 0);
        const dmgMax = Number(state.flat_damage_max ?? dmgMin);
        const power = Number(state.flat_damage_power_progression ?? 1);
        const jitter = Math.max(0, Number(state.flat_damage_jitter_pct ?? 0));

        const points = [];
        const jitterPoints = [];
        for (let lvl = 1; lvl <= lvlCount; lvl += 1) {
            const tRaw = (lvl - 1) / Math.max(1, lvlCount - 1);
            const t = Math.min(1, Math.max(0, tRaw));
            const dmg = dmgMin + (dmgMax - dmgMin) * Math.pow(t, power);
            points.push({ lvl, dmg });
            const j = dmg * jitter;
            jitterPoints.push({ lvl, dmgLow: dmg - j, dmgHigh: dmg + j });
        }

        const jitterLows = jitterPoints.map((p) => p.dmgLow);
        const jitterHighs = jitterPoints.map((p) => p.dmgHigh);
        const yMinRaw = Math.min(...points.map((p) => p.dmg), ...jitterLows);
        const yMaxRaw = Math.max(...points.map((p) => p.dmg), ...jitterHighs);
        const yPadding = Math.max(1, (yMaxRaw - yMinRaw) * 0.1);
        const yMin = yMinRaw - yPadding;
        const yMax = yMaxRaw + yPadding;

        const pad = 36;
        const xScale = (width - pad * 2) / Math.max(1, lvlCount - 1);
        const yScale = (height - pad * 2) / Math.max(1, yMax - yMin);

        // axes
        ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad / 2);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(width - pad / 2, height - pad);
        ctx.stroke();

        // labels
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillText("Dmg", pad + 4, pad - 10);
        ctx.fillText("Level", width - pad - 30, height - pad + 24);

        // line
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.dmg - yMin) * yScale;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // jitter band (red)
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        jitterPoints.forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.dmgHigh - yMin) * yScale;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        jitterPoints.slice().reverse().forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.dmgLow - yMin) * yScale;
            if (idx === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
        ctx.fill();
        ctx.stroke();

        // dots
        ctx.fillStyle = "#f8fafc";
        points.forEach((p) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.dmg - yMin) * yScale;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        const allowed = (state.equipment_slots || []).filter((slot) => slot.allow_flat_damage !== false).length;
        state.flat_damage_equipement_slots_auto = allowed;
        if ($flatDamageSlotsAuto.length) {
            $flatDamageSlotsAuto.val(allowed);
        }
    }

    function updateAttackSpeedFormulaDisplay() {
        const asMin = state.attack_speed_min ?? "as_min";
        const asMax = state.attack_speed_max ?? "as_max";
        const asPow = state.attack_speed_power_progression ?? "p";
        const formula = `APS = as_min + (as_max - as_min) * ((level - 1) / max(1, levels - 1))^as_power`;
        $attackSpeedFormulaDisplay.text(formula.replace("as_min", asMin).replace("as_max", asMax).replace("as_power", asPow));
    }

    function updateAttackSpeedSlotsAutoCount() {
        const allowed = (state.equipment_slots || []).filter((slot) => slot.allow_attack_speed !== false).length;
        state.attack_speed_slots_auto = allowed;
        if ($attackSpeedSlotsAuto.length) {
            $attackSpeedSlotsAuto.val(allowed);
        }
        if ($attackSpeedSlotsMeta.length) {
            $attackSpeedSlotsMeta.text(`${allowed}`);
        }
        renderAttackSpeedChart();
        renderDpsPlanningChart();
    }

    function updateModDamageFormulaDisplay() {
        const modMin = state.mod_damage_min ?? 0;
        const modMax = state.mod_damage_max ?? 0;
        const modPow = state.mod_damage_power_progression ?? 1;
        const slots = state.mod_damage_slots_auto ?? 1;
        const formula = `dmg_mod = (min + (max - min) * ((level - 1) / max(1, levels - 1))^p) / ${slots}`;
        $modDamageFormulaDisplay.text(formula.replace("min", modMin).replace("max", modMax).replace("p", modPow));
    }

    function updateModDamageSlotsAutoCount() {
        const allowed = (state.equipment_slots || []).filter((slot) => slot.allow_damage_mod !== false).length;
        state.mod_damage_slots_auto = allowed;
        if ($modDamageSlotsAuto.length) {
            $modDamageSlotsAuto.val(allowed);
        }
    }

    function renderModDamageChart() {
        if (!$modDamageChart.length) return;
        const canvas = $modDamageChart[0];
        const ctx = canvas.getContext("2d");
        const width = canvas.clientWidth || 600;
        const height = canvas.height || 240;
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        const lvlMax = Math.max(1, parseInt(state.levels, 10) || 1);
        const lvlCount = Math.max(2, lvlMax);
        const dmgMin = Number(state.mod_damage_min ?? 0);
        const dmgMax = Number(state.mod_damage_max ?? dmgMin);
        const power = Number(state.mod_damage_power_progression ?? 1);
        const jitter = Math.max(0, Number(state.mod_damage_jitter_pct ?? 0));

        const points = [];
        const jitterPoints = [];
        for (let lvl = 1; lvl <= lvlCount; lvl += 1) {
            const t = Math.min(1, Math.max(0, (lvl - 1) / Math.max(1, lvlCount - 1)));
            const val = dmgMin + (dmgMax - dmgMin) * Math.pow(t, power);
            points.push({ lvl, val });
            const j = val * jitter;
            jitterPoints.push({ lvl, valLow: val - j, valHigh: val + j });
        }

        const lows = jitterPoints.map((p) => p.valLow);
        const highs = jitterPoints.map((p) => p.valHigh);
        const yMinRaw = Math.min(...points.map((p) => p.val), ...lows);
        const yMaxRaw = Math.max(...points.map((p) => p.val), ...highs);
        const yPadding = Math.max(1, (yMaxRaw - yMinRaw) * 0.1);
        const yMin = yMinRaw - yPadding;
        const yMax = yMaxRaw + yPadding;

        const pad = 36;
        const xScale = (width - pad * 2) / Math.max(1, lvlCount - 1);
        const yScale = (height - pad * 2) / Math.max(1, yMax - yMin);

        ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad / 2);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(width - pad / 2, height - pad);
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillText("Mod %", pad + 4, pad - 10);
        ctx.fillText("Level", width - pad - 30, height - pad + 24);

        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.val - yMin) * yScale;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        jitterPoints.forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.valHigh - yMin) * yScale;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        jitterPoints.slice().reverse().forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.valLow - yMin) * yScale;
            if (idx === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        points.forEach((p) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.val - yMin) * yScale;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        updateModDamageFormulaDisplay();
    }

    function renderDpsPlanningChart() {
        if (!$dpsPlanningChart.length) return;
        const canvas = $dpsPlanningChart[0];
        const ctx = canvas.getContext("2d");
        const width = canvas.clientWidth || 600;
        const height = canvas.height || 240;
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        const lvlMax = Math.max(1, parseInt(state.levels, 10) || 1);
        const lvlCount = Math.max(2, lvlMax);
        const fdMin = Number(state.flat_damage_min ?? 0);
        const fdMax = Number(state.flat_damage_max ?? fdMin);
        const fdPow = Number(state.flat_damage_power_progression ?? 1);
        const modMin = Number(state.mod_damage_min ?? 0);
        const modMax = Number(state.mod_damage_max ?? modMin);
        const modPow = Number(state.mod_damage_power_progression ?? 1);
        const asMin = Number(state.attack_speed_min ?? 0);
        const asMax = Number(state.attack_speed_max ?? asMin);
        const asPow = Number(state.attack_speed_power_progression ?? 1);
        console.log("renderDpsPlanningChart", { flatPow: fdPow, modPow, asPow });

        const points = [];
        const jitterPoints = [];
        const flatJ = Math.max(0, Number(state.flat_damage_jitter_pct ?? 0));
        const modJ = Math.max(0, Number(state.mod_damage_jitter_pct ?? 0));
        for (let lvl = 1; lvl <= lvlCount; lvl += 1) {
            const t = Math.min(1, Math.max(0, (lvl - 1) / Math.max(1, lvlCount - 1)));
            const flatVal = fdMin + (fdMax - fdMin) * Math.pow(t, fdPow);
            const modVal = modMin + (modMax - modMin) * Math.pow(t, modPow);
            const asVal = asMin + (asMax - asMin) * Math.pow(t, asPow);
            const dps = flatVal * (1 + modVal / 100) * Math.max(0, asVal);
            points.push({ lvl, dps });
            const flatLow = flatVal * (1 - flatJ);
            const flatHigh = flatVal * (1 + flatJ);
            const modLow = modVal * (1 - modJ);
            const modHigh = modVal * (1 + modJ);
            const dpsLow = flatLow * (1 + modLow / 100) * Math.max(0, asVal);
            const dpsHigh = flatHigh * (1 + modHigh / 100) * Math.max(0, asVal);
            jitterPoints.push({ lvl, dpsLow, dpsHigh });
        }

        const lows = jitterPoints.map((p) => p.dpsLow);
        const highs = jitterPoints.map((p) => p.dpsHigh);
        const yMinRaw = Math.min(...points.map((p) => p.dps), ...lows);
        const yMaxRaw = Math.max(...points.map((p) => p.dps), ...highs);
        const yPadding = Math.max(1, (yMaxRaw - yMinRaw) * 0.1);
        const yMin = yMinRaw - yPadding;
        const yMax = yMaxRaw + yPadding;

        const pad = 36;
        const xScale = (width - pad * 2) / Math.max(1, lvlCount - 1);
        const yScale = (height - pad * 2) / Math.max(1, yMax - yMin);

        ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad / 2);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(width - pad / 2, height - pad);
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillText("DPS", pad + 4, pad - 10);
        ctx.fillText("Level", width - pad - 30, height - pad + 24);

        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.dps - yMin) * yScale;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.strokeStyle = "rgba(167, 139, 250, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        jitterPoints.forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.dpsHigh - yMin) * yScale;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        jitterPoints.slice().reverse().forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.dpsLow - yMin) * yScale;
            if (idx === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(167, 139, 250, 0.12)";
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        points.forEach((p) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.dps - yMin) * yScale;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        renderDpsLevels(points);
    }
    function renderDpsLevels(points) {
        if (!$dpsPlanningList.length) return;
        const rows = points.map((p) => `
            <div class="dps-row">
                <span class="dps-label">Lvl ${p.lvl}</span>
                <span class="dps-value">${Math.round(p.dps)}</span>
            </div>`);
        $dpsPlanningList.html(rows.join(""));
    }
    function renderXpCurve() {
        if (!$xpCurve.length) return;
        const canvas = $xpCurve[0];
        const ctx = canvas.getContext("2d");
        const width = canvas.clientWidth || 600;
        const height = canvas.height || 240;
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        const lvlMax = Math.max(1, parseInt(state.levels, 10) || 1);
        const lvlCount = Math.max(2, lvlMax);
        const base = Number(state.xp_base ?? 500);
        const growth = Number(state.xp_growth ?? 1.15);
        const mult = Number(state.xp_multiplier ?? 1);

        const points = [];
        for (let lvl = 1; lvl <= lvlCount; lvl += 1) {
            const xp = base * Math.pow(lvl, growth) * mult;
            points.push({ lvl, xp });
        }

        const yMinRaw = Math.min(...points.map((p) => p.xp));
        const yMaxRaw = Math.max(...points.map((p) => p.xp));
        const yPadding = Math.max(1, (yMaxRaw - yMinRaw) * 0.1);
        const yMin = yMinRaw - yPadding;
        const yMax = yMaxRaw + yPadding;

        const pad = 36;
        const xScale = (width - pad * 2) / Math.max(1, lvlCount - 1);
        const yScale = (height - pad * 2) / Math.max(1, yMax - yMin);

        ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad / 2);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(width - pad / 2, height - pad);
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillText("XP", pad + 1, pad - 10);
        ctx.fillText("Level", width - pad - 30, height - pad + 24);

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.xp - yMin) * yScale;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        points.forEach((p) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.xp - yMin) * yScale;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
        renderXpLevels(points);
    }

    function renderXpLevels(points) {
        if (!$xpLevels.length) return;
        const rows = points.map((p) => `<div class="xp-row"><span>Lvl ${p.lvl}</span><span>${Math.round(p.xp).toLocaleString()} XP</span></div>`);
        $xpLevels.html(rows.join(""));
    }
    function renderAttackSpeedChart() {
        if (!$attackSpeedChart.length) return;
        const canvas = $attackSpeedChart[0];
        const ctx = canvas.getContext("2d");
        const width = canvas.clientWidth || 600;
        const height = canvas.height || 240;
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        const lvlMax = Math.max(1, parseInt(state.levels, 10) || 1);
        const lvlCount = Math.max(2, lvlMax);
        const asMin = Number(state.attack_speed_min ?? 0);
        const asMax = Number(state.attack_speed_max ?? asMin);
        const power = Number(state.attack_speed_power_progression ?? 1);

        const points = [];
        for (let lvl = 1; lvl <= lvlCount; lvl += 1) {
            const t = Math.min(1, Math.max(0, (lvl - 1) / Math.max(1, lvlCount - 1)));
            const val = asMin + (asMax - asMin) * Math.pow(t, power);
            points.push({ lvl, val });
        }

        const yMinRaw = Math.min(...points.map((p) => p.val));
        const yMaxRaw = Math.max(...points.map((p) => p.val));
        const yPadding = Math.max(0.01, (yMaxRaw - yMinRaw) * 0.1);
        const yMin = yMinRaw - yPadding;
        const yMax = yMaxRaw + yPadding;

        const pad = 36;
        const xScale = (width - pad * 2) / Math.max(1, lvlCount - 1);
        const yScale = (height - pad * 2) / Math.max(1, yMax - yMin);

        ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad / 2);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(width - pad / 2, height - pad);
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillText("AS", pad + 4, pad - 10);
        ctx.fillText("Level", width - pad - 30, height - pad + 24);

        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((p, idx) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.val - yMin) * yScale;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        points.forEach((p) => {
            const x = pad + (p.lvl - 1) * xScale;
            const y = height - pad - (p.val - yMin) * yScale;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        updateAttackSpeedFormulaDisplay();
    }

    const setFlatDamagePower = (value) => {
        if (Number.isNaN(value)) return;
        state.flat_damage_power_progression = value;
        $flatDamagePower.val(value);
        renderFlatDamageChart();
        renderDpsPlanningChart();
        renderPreview();
    };

    $flatDamagePower.on("input", function () {
        setFlatDamagePower(parseFloat($(this).val()));
    });

    $flatDamageMin.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.flat_damage_min = value;
            renderFlatDamageChart();
            renderPreview();
        }
    });

    $flatDamageMedian.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.flat_damage_max = value;
            renderFlatDamageChart();
            renderPreview();
        }
    });

    $flatDamageJitter.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.flat_damage_jitter_pct = value;
            renderFlatDamageChart();
            renderDpsPlanningChart();
            renderPreview();
        }
    });

    $flatDamageOneHandRatio.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.flat_damage_onehand_ratio = value;
            renderPreview();
        }
    });

    $modDamageMin.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.mod_damage_min = value;
            renderModDamageChart();
            renderDpsPlanningChart();
            renderPreview();
        }
    });
    $modDamageMax.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.mod_damage_max = value;
            renderModDamageChart();
            renderDpsPlanningChart();
            renderPreview();
        }
    });
    $modDamagePower.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.mod_damage_power_progression = value;
            renderModDamageChart();
            renderDpsPlanningChart();
            renderPreview();
        }
    });
    $modDamageJitter.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.mod_damage_jitter_pct = value;
            renderModDamageChart();
            renderDpsPlanningChart();
            renderPreview();
        }
    });

    $rarityWeightGrowth.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.rarity_weight_growth = value;
            renderPreview();
        }
    });

    $attrPerLevelFactor.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attr_per_level_factor = value;
            renderPreview();
        }
    });

    $additionalLootFactor.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.additional_loot_factor = value;
            renderPreview();
        }
    });

    $unarmedGrowth.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.unarmed_growth = value;
            renderPreview();
        }
    });


    $xpBase.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.xp_base = value;
            renderXpCurve();
            renderPreview();
        }
    });

    $xpGrowth.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.xp_growth = value;
            renderXpCurve();
            renderPreview();
        }
    });

    $xpMultiplier.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.xp_multiplier = value;
            renderXpCurve();
            renderPreview();
        }
    });

    $(".tag-input button").on("click", function () {
        const target = $(this).data("target");
        const $input = $(`.tag-input input[data-target="${target}"]`);
        addTag(target, $input);
    });

    $("#compute-btn, #compute-btn-top").on("click", function () {
        if (typeof compute === "function") {
            compute();
        }
    });

    // auto-compute on initial page load once all scripts are ready
});
