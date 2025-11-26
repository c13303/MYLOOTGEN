// Example data structures

const level_range_structure_example = ["level_min_int", "level_max_int", "rarity"];  // rarity is between 0 and 1


const damage_structure_example = {
    "name": "Damage Type Name",
    "is_over_time": false,
    "ranges": [] // contains "level_range_structure" objects
}




const state = {
    attributes: {
        physical: { min: 140, max: 200 },
        energy: { min: 80, max: 130 },
        dexterity: { min: 90, max: 140 }
    },
    stats_progression_model: "balanced",
    gain_per_level: 2,
    median_time_per_loot: 10,
    median_time_per_level: 600,
    level_time_multiplier: 1,
    rarity_growth_factor: 1,
    generate_percent: 10,
    loot_rand_range: 3,
    unarmed_physical_damage: 10,
    base_physical_resistance: 5,
    attack_speed_base: 1,
    attack_speed_bonus_min: 10,
    attack_speed_bonus_max: 30,
    attack_speed_affix_level_scale: 0.5, // scales affix range with level/levels_max
    attack_speed_affix_rarity_scale: 0.1, // scales affix range with rarity weight (1 common -> 1+scale*rarityFactor)
    base_damage_types_per_item_min: 1,
    base_damage_types_per_item_max: 2,
    damage_affix_types_limit: 1,
    // scaling knobs (exposed in UI)
    // Loot scaling knobs
    affix_min_slope: 0.6,
    affix_min_ratio: 0.6,
    affix_max_slope: 0.9,
    affix_max_multiplier: 1.5,
    affix_power: 1.1,
    affix_cap: 120,
    rarity_weight_growth: 0.05,
    attr_per_level_factor: 0.04,
    additional_loot_factor: 1.2,
    unarmed_growth: 0.05,
    xp_base: 500,
    xp_growth: 1.15,
    xp_multiplier: 1,
    levels: 60,
    skill_slots: 4,
    equipment_slots: [
        { name: "head", position: 1 },
        { name: "torso", position: 2 },
        { name: "weapon_right", position: 3 },
        { name: "weapon_left", position: 4 },
        { name: "hands", position: 5 },
        { name: "belt", position: 6 },
        { name: "boots", position: 7 }
    ],
    damage_types: [
        {
            "name": "Physical",
            "is_over_time": false,
            "ranges": [[0, 100, 1]],
            "base_damage": 100,
            "color": "#d4d4d4"
        },
        {
            "name": "Fire",
            "is_over_time": false,
            "ranges": [[0, 50, 0.5], [50, 100, 0.6]],
            "base_damage": 100,
            "color": "#f97316"
        },
        {
            "name": "Ice",
            "is_over_time": false,
            "ranges": [[0, 50, 0.5], [50, 100, 0.6]],
            "base_damage": 100,
            "color": "#38bdf8"
        },
        {
            "name": "Shock",
            "is_over_time": false,
            "ranges": [[0, 50, 0.5], [50, 100, 0.6]],
            "base_damage": 100,
            "color": "#a855f7"
        },
        {
            "name": "Poison",
            "is_over_time": true,
            "ranges": [[0, 50, 0.5], [50, 100, 0.6]],
            "base_damage": 10,
            "color": "#22c55e"
        },
        {
            "name": "Chaos",
            "is_over_time": false,
            "ranges": [[0, 50, 0.1], [50, 100, 0.6]],
            "base_damage": 120,
            "color": "#eab308"
        },
        {
            "name": "Fire Burn",
            "is_over_time": true,
            "ranges": [[10, 100, 0.5]],
            "base_damage": 40,
            "color": "#fb7185"
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
            "color": "#cbd5e1"
        },
        {
            "name": "rare",
            "rarity": 0.5,
            "attributes": 2,
            "attribute_types": ["Physical", "Fire", "Ice", "Shock"],
            "allow_attack_speed_mod": true,
            "unlock_level": 5,
            "color": "#38bdf8"
        },
        {
            "name": "magic",
            "rarity": 0.5,
            "attributes": 3,
            "attribute_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn"],
            "allow_attack_speed_mod": true,
            "unlock_level": 8,
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
            "color": "#f43f5e"
        }
    ],
    items: [
        {
            "name": "sword",
            "equipment_slot": "weapon_right",
            "size": 3, // nb of grid boxes
            "affix_max": 5,
            "source_damage_slots": 1,
            "base_damage": 110,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "iron helm",
            "equipment_slot": "head",
            "size": 2,
            "affix_max": 3,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "mage hood",
            "equipment_slot": "head",
            "size": 1,
            "affix_max": 3,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "chainmail",
            "equipment_slot": "torso",
            "size": 4,
            "affix_max": 4,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "leather armor",
            "equipment_slot": "torso",
            "size": 3,
            "affix_max": 3,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "longsword",
            "equipment_slot": "weapon_right",
            "size": 3,
            "affix_max": 5,
            "source_damage_slots": 1,
            "base_damage": 130,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "dagger",
            "equipment_slot": "weapon_right",
            "size": 1,
            "affix_max": 3,
            "source_damage_slots": 1,
            "base_damage": 80,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "wooden shield",
            "equipment_slot": "weapon_left",
            "size": 2,
            "affix_max": 3,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "spell tome",
            "equipment_slot": "weapon_left",
            "size": 2,
            "affix_max": 3,
            "source_damage_slots": 1,
            "base_damage": 120,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "steel gauntlets",
            "equipment_slot": "hands",
            "size": 2,
            "affix_max": 3,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "leather gloves",
            "equipment_slot": "hands",
            "size": 1,
            "affix_max": 2,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "utility belt",
            "equipment_slot": "belt",
            "size": 2,
            "affix_max": 2,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "potion bandolier",
            "equipment_slot": "belt",
            "size": 2,
            "affix_max": 2,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "leather boots",
            "equipment_slot": "boots",
            "size": 2,
            "affix_max": 2,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
        },
        {
            "name": "steel greaves",
            "equipment_slot": "boots",
            "size": 3,
            "affix_max": 3,
            "source_damage_slots": 0,
            "base_damage": 0,
            "modifier": true,
            "damage_types": ["Physical", "Fire", "Ice", "Shock", "Poison", "Fire Burn", "Chaos"]
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
