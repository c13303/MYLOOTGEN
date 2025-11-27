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
    const $attackSpeedBonusMin = $("#attack-speed-bonus-min");
    const $attackSpeedBonusMax = $("#attack-speed-bonus-max");
    const $attackSpeedAffixLevelScale = $("#attack-speed-affix-level-scale");
    const $attackSpeedAffixRarityScale = $("#attack-speed-affix-rarity-scale");
    const $attackSpeedCap = $("#attack-speed-cap");
    const $affixRarityScale = $("#affix-rarity-scale");
    const $flatDamagePower = $("#flat-damage-power");
    const $flatDamageMin = $("#flat-damage-min");
    const $flatDamageMedian = $("#flat-damage-median");
    const $flatDamageFormulaDisplay = $("#flat-damage-formula-display");
    const $affixCap = $("#affix-cap");
    const $rarityWeightGrowth = $("#rarity-weight-growth");
    const $attrPerLevelFactor = $("#attr-per-level-factor"); 
    const $additionalLootFactor = $("#additional-loot-factor");
    const $unarmedGrowth = $("#unarmed-growth");
    const $xpBase = $("#xp-base");
    const $xpGrowth = $("#xp-growth");
    const $xpMultiplier = $("#xp-multiplier");
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
    }

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
            state.equipment_slots.push({ name, position: posVal });
            renderTags("equipment_slots");
            renderPreview();
            $overlay.remove();
        });

        $actions.append($cancel, $submit);
        $form.append($name, $pos, $actions);
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

        $modal.append($title, $pos, $close);
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
        const $sourceDamageSlots = $('<input type="number" placeholder="Damage sources (count)" step="1" min="0">').css(fieldStyle);
        const $flatDamage = $('<input type="number" placeholder="Flat damage (points)" step="1" min="0">').css(fieldStyle);
        const $resChance = $('<input type="number" placeholder="Resist min chance (0-1)" step="0.01" min="0" max="1">').css(fieldStyle);
        const $defaultResFactor = $('<input type="number" placeholder="Default Damage Resistance Factor" step="0.1" min="0">').css(fieldStyle);
        const $modifierWrap = $('<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" class="modifier-flag" checked> Modifier (%)</label>');

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

        function toggleFlatDamage() {
            const count = parseInt($sourceDamageSlots.val(), 10);
            const on = !Number.isNaN(count) && count > 0;
            $flatDamage.prop("disabled", !on);
        }
        toggleFlatDamage();
        $sourceDamageSlots.on("input", toggleFlatDamage);

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
            const flatDamageVal = parseInt($flatDamage.val(), 10);
            const modifierFlag = $modifierWrap.find("input").is(":checked");
            const typeList = Array.from(selectedTypes);
            const resChanceVal = parseFloat($resChance.val());
            const defaultResFactorVal = parseFloat($defaultResFactor.val());

            if (!name || !slot || Number.isNaN(size) || size < 1 || Number.isNaN(affixMax) || affixMax < 1) {
                alert("Please fill every field correctly (size/affix max >= 1 and select a slot).");
                return;
            }
            if (!Number.isNaN(sourceDamageSlots) && sourceDamageSlots > 0 && (Number.isNaN(flatDamageVal) || flatDamageVal < 0)) {
                alert("Flat damage must be >= 0 when damage sources > 0.");
                return;
            }
            if (typeList.length === 0) {
                alert("Select at least one damage type.");
                return;
            }
            if (Number.isNaN(defaultResFactorVal) || defaultResFactorVal < 0) {
                alert("Default damage resistance factor must be >= 0.");
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
                source_damage_slots: Number.isNaN(sourceDamageSlots) ? 0 : sourceDamageSlots,
                flat_damage: (!Number.isNaN(sourceDamageSlots) && sourceDamageSlots > 0) ? flatDamageVal : 0,
                modifier: modifierFlag,
                damage_types: typeList,
                ...(Number.isNaN(resChanceVal) ? {} : { resist_affix_min_chance: resChanceVal }),
                default_damage_resistance_factor: defaultResFactorVal
            });

            renderTags("items");
            renderPreview();
            $overlay.remove();
        });

        $actions.append($cancel, $submit);
        $form.append($name, $slot, $size, $affixMax, $sourceDamageSlots, $flatDamage, $resChance, $defaultResFactor, $modifierWrap, $typesContainer, $actions);
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
        const $source = $(`<p><strong>Damage sources:</strong> ${item.source_damage_slots ?? 0}</p>`).css({ margin: "0 0 8px" });
        const $base = $(`<p><strong>Flat damage:</strong> ${item.flat_damage ?? item.base_damage ?? 0}</p>`).css({ margin: "0 0 8px" });
        const $mod = $(`<p><strong>Modifier:</strong> ${item.modifier ? "Yes" : "No"}</p>`).css({ margin: "0 0 8px" });
        const $drf = $(`<p><strong>Default Damage Resistance Factor:</strong> ${item.default_damage_resistance_factor ?? 0}</p>`).css({ margin: "0 0 8px" });
        const typeList = (item.damage_types && item.damage_types.length) ? item.damage_types.join(", ") : "-";
        const $types = $(`<p><strong>Damage types:</strong> ${typeList}</p>`).css({ margin: "0 0 14px" });
        const $resChance = $(`<p><strong>Resist min chance:</strong> ${item.resist_affix_min_chance ?? "-"}</p>`).css({ margin: "0 0 14px" });

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

        $modal.append($title, $slot, $size, $source, $base, $mod, $drf, $types, $resChance, $close);
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
                                ? `${value.name} (pos ${value.position ?? "-"})`
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
    $attackSpeedBonusMin.val(state.attack_speed_bonus_min ?? 10);
    $attackSpeedBonusMax.val(state.attack_speed_bonus_max ?? 20);
    $attackSpeedAffixLevelScale.val(state.attack_speed_affix_level_scale ?? 0.5);
    $attackSpeedAffixRarityScale.val(state.attack_speed_affix_rarity_scale ?? 0.1);
    $attackSpeedCap.val(state.attack_speed_cap ?? 0);
    $affixRarityScale.val(state.affix_rarity_scale ?? 0.1);
    if (typeof state.flat_damage_formula_progression === "undefined") {
        state.flat_damage_formula_progression = "dmg = flat_damage_min + (flat_damage_median_at_max_level - flat_damage_min) * ((current_level - 1) / max(1, levels - 1))^flat_damage_power_progression";
    }
    if (typeof state.flat_damage_median_at_max_level === "undefined") {
        state.flat_damage_median_at_max_level = 100;
    }
    if (typeof state.flat_damage_power_progression === "undefined") {
        state.flat_damage_power_progression = 2;
    }
    $flatDamagePower.val(state.flat_damage_power_progression);
    $flatDamageMin.val(state.flat_damage_min ?? 2);
    $flatDamageMedian.val(state.flat_damage_median_at_max_level);
    updateFlatDamageFormulaDisplay();
    $affixCap.val(state.affix_cap);
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
    renderPreview();

    $levels.on("input", function () {
        const value = parseInt($(this).val(), 10);
        if (!Number.isNaN(value)) {
            state.levels = value;
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

    $attackSpeedBonusMin.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_bonus_min = value;
            renderPreview();
        }
    });

    $attackSpeedBonusMax.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_bonus_max = value;
            renderPreview();
        }
    });
    $attackSpeedAffixLevelScale.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_affix_level_scale = value;
            renderPreview();
        }
    });
    $attackSpeedAffixRarityScale.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_affix_rarity_scale = value;
            renderPreview();
        }
    });
    $attackSpeedCap.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.attack_speed_cap = value;
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

    const setFlatDamagePower = (value) => {
        if (Number.isNaN(value)) return;
        state.flat_damage_power_progression = value;
        $flatDamagePower.val(value);
        renderPreview();
    };

    $flatDamagePower.on("input", function () {
        setFlatDamagePower(parseFloat($(this).val()));
    });

    $flatDamageMin.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.flat_damage_min = value;
            renderPreview();
        }
    });

    $flatDamageMedian.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.flat_damage_median_at_max_level = value;
            renderPreview();
        }
    });

    $affixCap.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.affix_cap = value;
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
            renderPreview();
        }
    });

    $xpGrowth.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.xp_growth = value;
            renderPreview();
        }
    });

    $xpMultiplier.on("input", function () {
        const value = parseFloat($(this).val());
        if (!Number.isNaN(value)) {
            state.xp_multiplier = value;
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
