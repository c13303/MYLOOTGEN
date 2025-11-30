// Example data structures

const level_range_structure_example = ["level_min_int", "level_max_int", "rarity"];  // rarity is between 0 and 1


const damage_structure_example = {
    "name": "Damage Type Name",
    "is_over_time": false,
    "ranges": [] // contains "level_range_structure" objects
}




const state = {
    attributes: {
        force: { min: 1, max: 120 },
        intelligence: { min: 1, max: 120 },
        dexterity: { min: 1, max: 60 }
    },
    stats_progression_model: "balanced",
    gain_per_level: 2,
    median_time_per_loot: 10,
    median_time_per_level: 600,
    level_time_multiplier: 1,
    rarity_growth_factor: 1,
    generate_percent: 15,
    unarmed_physical_damage: 1,
    base_physical_resistance: 0,
    attack_speed_base: 1.6,
    attack_speed_min: 5,
    attack_speed_max: 20,
    attack_speed_power_progression: 1.2,
    attack_speed_slots_auto: 2,
    affix_rarity_scale: 0.08, // scales affix min/max with category rarity
    common_decay: 0.08, // exponential decay applied to categories unlocked at level 1
    flat_damage_types_per_item_min: 1,
    flat_damage_types_per_item_max: 2,
    damage_affix_types_limit: 1,
    damage_types_total_limit: 2,
    // scaling knobs (exposed in UI)
    // Loot scaling knobs
    flat_damage_power_progression: 1.8, // exponent for flat dmg per level (lvl^power)
    flat_damage_min: 2, // floor to guarantee lvl 1 >= 2
    flat_damage_max: 500,
    flat_damage_formula_progression: "dmg = (flat_damage_min + (flat_damage_max - flat_damage_min) * ((level - 1) / max(1, levels - 1))^flat_damage_power_progression) / flat_damage_equipement_slots_auto",
    flat_damage_jitter_pct: 0.2, // +/- jitter applied around median (0.2 = ±20%)
    flat_damage_onehand_ratio: 0.75,
    flat_damage_equipement_slots_auto: 2,
    mod_damage_min: 10,
    mod_damage_max: 250,
    mod_damage_power_progression: 1.2,
    mod_damage_jitter_pct: 0.05,
    mod_damage_slots_auto: 2,
    affix_growth_headroom: 5, // how many extra affixes unlock from lvl 1 to max
    rarity_weight_growth: 0.05,
    attr_per_level_factor: 0.04,
    attribute_modifier_default: 0.02,
    additional_loot_factor: 1.2,
    unarmed_growth: 0.03,
    xp_base: 500,
    xp_growth: 1.15,
    xp_multiplier: 1,
    levels: 60,
    skill_slots: 4,
    rarity_base_weights: {
        common: 16,
        magic: 8,
        rare: 3,
        legendary: 1,
        unique: 0.5
    },
    rarity_soft_caps: {
        unique: 3,
        legendary: 10,
        rare: 25,
        magic: 35
    },
    rarity_pity_thresholds: {
        legendary: 15,
        unique: 35
    },
    rarity_unlock_window: 10,
    rarity_sigmoid_k: 0.4,
    equipment_slots: [
        { name: "head", position: 1, allow_flat_damage: false, allow_damage_mod: true, allow_attack_speed: true, allow_resist: true },
        { name: "torso", position: 2, allow_flat_damage: false, allow_damage_mod: true, allow_attack_speed: true, allow_resist: true },
        { name: "weapon_right", position: 3, allow_flat_damage: true, allow_two_handed: true, allow_off_hand: false, allow_damage_mod: true, allow_attack_speed: true, allow_resist: true },
        { name: "hand_left", position: 4, allow_flat_damage: false, allow_two_handed: false, allow_off_hand: true, allow_damage_mod: true, allow_attack_speed: true, allow_resist: true },
        { name: "hands", position: 5, allow_flat_damage: false, allow_two_handed: false, allow_off_hand: false, allow_damage_mod: true, allow_attack_speed: true, allow_resist: true },
        { name: "belt", position: 6, allow_flat_damage: false, allow_two_handed: false, allow_off_hand: false, allow_damage_mod: true, allow_attack_speed: true, allow_resist: true },
        { name: "boots", position: 7, allow_flat_damage: false, allow_two_handed: false, allow_off_hand: false, allow_damage_mod: true, allow_attack_speed: true, allow_resist: true }
    ],
    damage_types: [
        {
            "name": "Physical",
            "default_damage_type": true,
            "is_over_time": false,
            "ranges": [
                [0, 100, 0.5]
            ],
            "color": "#d4d4d4",
            "attribute": "force",
            "attribute_modifier": 0.02
        },
        {
            "name": "Fire",
            "default_damage_type": false,
            "is_over_time": false,
            "ranges": [[0, 100, 0.5]],
            "color": "#f97316",
            "attribute": "intelligence",
            "attribute_modifier": 0.02
        },
        {
            "name": "Ice",
            "default_damage_type": false,
            "is_over_time": false,
            "ranges": [[0, 100, 0.5]],
            "color": "#38bdf8",
            "attribute": "intelligence",
            "attribute_modifier": 0.02
        },
        {
            "name": "Shock",
            "default_damage_type": false,
            "is_over_time": false,
            "ranges": [[0, 100, 0.5]],
            "color": "#a855f7",
            "attribute": "intelligence",
            "attribute_modifier": 0.02
        },
        {
            "name": "Poison",
            "default_damage_type": false,
            "is_over_time": true,
            "ranges": [[0, 100, 0.5]],
            "color": "#22c55e",
            "attribute": "intelligence",
            "attribute_modifier": 0.02
        },
        {
            "name": "Chaos",
            "default_damage_type": false,
            "is_over_time": false,
            "ranges": [[0, 100, 0.5]],
            "color": "#eab308",
            "attribute": "intelligence",
            "attribute_modifier": 0.02
        },
        {
            "name": "Fire Burn",
            "default_damage_type": false,
            "is_over_time": true,
            "ranges": [[0, 100, 0.5]],
            "color": "#fb7185",
            "attribute": "intelligence",
            "attribute_modifier": 0.02
        }
    ],
    categories: [
        {
            "name": "common",
            "rarity": 1,
            "attributes": 1,
            "attribute_types": ["Physical"],
            "allow_attack_speed_mod": false,
            "unlock_level": 1,
            "power_scale": 1,
            "color": "#cbd5e1"
        },
        {
            "name": "rare",
            "rarity": 0.5,
            "attributes": 2,
            "attribute_types": ["Physical", "Fire", "Ice", "Shock"],
            "allow_attack_speed_mod": true,
            "unlock_level": 2,
            "power_scale": 2,
            "color": "#38bdf8"
        },
        {
            "name": "magic",
            "rarity": 0.5,
            "attributes": 3,
            "attribute_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn"],
            "allow_attack_speed_mod": true,
            "unlock_level": 8,
            "power_scale": 3,
            "color": "#a855f7"
        },
        {
            "name": "legendary",
            "rarity": 0.2,
            "attributes": 4,
            "attribute_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
            "allow_attack_speed_mod": true,
            "skill_mod": 1,
            "unlock_level": 15,
            "power_scale": 4,
            "color": "#f59e0b"
        },
        {
            "name": "unique",
            "rarity": 0.1,
            "attributes": 5,
            "attribute_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
            "allow_attack_speed_mod": true,
            "skill_mod": 2,
            "unlock_level": 30,
            "power_scale": 4,
            "color": "#f43f5e"
        }
    ],
    items: [
        {
            "name": "sword",
            "equipment_slot": "weapon_right",
            "size": 3, // nb of grid boxes
            "affix_max": 6,
            "flat_damage_sources": 1,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "iron helm",
            "equipment_slot": "head",
            "size": 2,
            "affix_max": 3,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "mage hood",
            "equipment_slot": "head",
            "size": 1,
            "affix_max": 3,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "chainmail",
            "equipment_slot": "torso",
            "size": 4,
            "affix_max": 4,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "leather armor",
            "equipment_slot": "torso",
            "size": 3,
            "affix_max": 3,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "longsword",
            "equipment_slot": "weapon_right",
            "size": 3,
            "affix_max": 6,
            "flat_damage_sources": 1,
            "flat_damage_sources_multi_chance": 0.9,
            "flat_damage_multiple_max_slice": 0.9,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "dagger",
            "equipment_slot": "weapon_right",
            "size": 1,
            "affix_max": 3,
            "flat_damage_sources": 1,
            "flat_damage_sources_multi_chance": 0.9,
            "flat_damage_multiple_max_slice": 0.9,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "great hammer",
            "equipment_slot": "weapon_right",
            "size": 4,
            "affix_max": 6,
            "flat_damage_sources": 2,
            "flat_damage_sources_multi_chance": 0.9,
            "flat_damage_multiple_max_slice": 0.9,
            "two_handed": true,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "greatsword",
            "equipment_slot": "weapon_right",
            "size": 4,
            "affix_max": 6,
            "flat_damage_sources": 2,
            "flat_damage_sources_multi_chance": 0.9,
            "flat_damage_multiple_max_slice": 0.9,
            "two_handed": true,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "great axe",
            "equipment_slot": "weapon_right",
            "size": 4,
            "affix_max": 6,
            "flat_damage_sources": 2,
            "flat_damage_sources_multi_chance": 0.9,
            "flat_damage_multiple_max_slice": 0.9,
            "two_handed": true,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "wooden shield",
            "equipment_slot": "weapon_left",
            "size": 2,
            "affix_max": 3,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "spell tome",
            "equipment_slot": "weapon_left",
            "size": 2,
            "affix_max": 3,
            "flat_damage_sources": 1,
            "flat_damage_sources_multi_chance": 0.9,
            "flat_damage_multiple_max_slice": 0.9,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "steel gauntlets",
            "equipment_slot": "hands",
            "size": 2,
            "affix_max": 3,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "leather gloves",
            "equipment_slot": "hands",
            "size": 1,
            "affix_max": 2,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "utility belt",
            "equipment_slot": "belt",
            "size": 2,
            "affix_max": 2,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "potion bandolier",
            "equipment_slot": "belt",
            "size": 2,
            "affix_max": 2,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "leather boots",
            "equipment_slot": "boots",
            "size": 2,
            "affix_max": 2,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        },
        {
            "name": "steel greaves",
            "equipment_slot": "boots",
            "size": 3,
            "affix_max": 3,
            "flat_damage_sources": 0,
            "damage_modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"],
        }

    ],
    skills: [
        {
            "name": "Cleave",
            "cooldown": 4,
            "energy_cost": 8,
            "type": "damage",
            "damage_type": "Physical",
            "level_min": 1
        },
        {
            "name": "Shield Bash",
            "cooldown": 6,
            "energy_cost": 10,
            "type": "damage",
            "damage_type": "Physical",
            "level_min": 1
        },
        {
            "name": "Flame Slash",
            "cooldown": 8,
            "energy_cost": 12,
            "type": "damage",
            "damage_type": "Fire",
            "level_min": 5
        },
        {
            "name": "Scorching Brand",
            "cooldown": 12,
            "energy_cost": 14,
            "type": "damage",
            "damage_type": "Fire Burn",
            "level_min": 10
        },
        {
            "name": "Blazing Arc",
            "cooldown": 9,
            "energy_cost": 16,
            "type": "damage",
            "damage_type": "Fire",
            "level_min": 20
        },
        {
            "name": "Inferno Surge",
            "cooldown": 14,
            "energy_cost": 18,
            "type": "damage",
            "damage_type": "Fire",
            "level_min": 30
        },
        {
            "name": "Phoenix Crash",
            "cooldown": 18,
            "energy_cost": 22,
            "type": "damage",
            "damage_type": "Fire",
            "level_min": 40
        }
    ]
};
