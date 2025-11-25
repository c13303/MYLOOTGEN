// Example data structures

const level_range_structure_example = ["level_min_int", "level_max_int", "rarity"];  // rarity is between 0 and 1


const damage_structure_example = {
    "name": "Damage Type Name",
    "is_over_time": false,
    "ranges": [] // contains "level_range_structure" objects
}




const state = {
    attributes: {
        physical: { min: 100, max: 300 },
        energy: { min: 100, max: 150 },
        dexterity: { min: 100, max: 150 }
    },
    gain_per_level: 3,
    levels: 60,
    skill_slots: 4,
    equipment_slots: {
        "head": true,
        "torso": true,
        "weapon_right": true,
        "weapon_left": true,
        "hands": true,
        "belt": true,
        "boots": true
    },
    damage_types: [
        {
            "name": "Physical",
            "is_over_time": false,
            "ranges": [[0, 100, 1]], /// means from 0 to 50 = 50% rarity, from 50 to 100 = 60%
            "base_damage": 100,
        },
        {
            "name": "Fire",
            "is_over_time": false,
            "ranges": [[0, 50, 0.5], [50, 100, 0.6]], /// means from 0 to 50 = 50% rarity, from 50 to 100 = 60%
            "base_damage": 100 // some damage types hit harder by default but will likely be rarer
        },
        {
            "name": "Ice",
            "is_over_time": false,
            "ranges": [[0, 50, 0.5], [50, 100, 0.6]], /// means from 0 to 50 = 50% rarity, from 50 to 100 = 60%
            "base_damage": 100 // some damage types hit harder by default but will likely be rarer
        },
        {
            "name": "Shock",
            "is_over_time": false,
            "ranges": [[0, 50, 0.5], [50, 100, 0.6]], /// means from 0 to 50 = 50% rarity, from 50 to 100 = 60%
            "base_damage": 100 // some damage types hit harder by default but will likely be rarer
        },
        {
            "name": "Poison",
            "ranges": [[0, 50, 0.5], [50, 100, 0.6]], /// means from 0 to 50 = 50% rarity, from 50 to 100 = 60%
            "base_damage": 10,
            "is_over_time": true
        },
        {
            "name": "Chaos",
            "is_over_time": false,
            "ranges": [[0, 50, 0.1], [50, 100, 0.6]], /// means from 0 to 50 = 50% rarity, from 50 to 100 = 60%
            "base_damage": 120 // some damage types hit harder by default but will likely be rarer
        }


    ],
    categories: [
        {
            "name": "common",
            "rarity": 1,
            "attributes": 0
        },
        {
            "name": "rare",
            "rarity": 0.5,
            "attributes": 1
        },
        {
            "name": "magic",
            "rarity": 0.5,
            "attributes": 2
        },
        {
            "name": "legendary",
            "rarity": 0.2,
            "attributes": 3,
            "skill_mod": 1
        },
        {
            "name": "unique",
            "rarity": 0.1,
            "attributes": 4,
            "skill_mod": 2
        }
    ],
    items: [
        {
            "name": "sword",
            "equipment_slot": "weapon_right",
            "size": 3 // nb of grid boxes
        },
        {
            "name": "iron helm",
            "equipment_slot": "head",
            "size": 2
        },
        {
            "name": "mage hood",
            "equipment_slot": "head",
            "size": 1
        },
        {
            "name": "chainmail",
            "equipment_slot": "torso",
            "size": 4
        },
        {
            "name": "leather armor",
            "equipment_slot": "torso",
            "size": 3
        },
        {
            "name": "longsword",
            "equipment_slot": "weapon_right",
            "size": 3
        },
        {
            "name": "dagger",
            "equipment_slot": "weapon_right",
            "size": 1
        },
        {
            "name": "wooden shield",
            "equipment_slot": "weapon_left",
            "size": 2
        },
        {
            "name": "spell tome",
            "equipment_slot": "weapon_left",
            "size": 2
        },
        {
            "name": "steel gauntlets",
            "equipment_slot": "hands",
            "size": 2
        },
        {
            "name": "leather gloves",
            "equipment_slot": "hands",
            "size": 1
        },
        {
            "name": "utility belt",
            "equipment_slot": "belt",
            "size": 2
        },
        {
            "name": "potion bandolier",
            "equipment_slot": "belt",
            "size": 2
        },
        {
            "name": "leather boots",
            "equipment_slot": "boots",
            "size": 2
        },
        {
            "name": "steel greaves",
            "equipment_slot": "boots",
            "size": 3
        }

    ],
    skills: [
        {
            "name": "Fireball",
            "cooldown": 6,
            "energy_cost": 20,
            "type": "damage",
            "damage_type": "Fire",
            "level_min": 5
        },
        {
            "name": "Frost Shield",
            "cooldown": 12,
            "energy_cost": 15,
            "type": "buff",
            "level_min": 3
        },
        {
            "name": "Lightning Strike",
            "cooldown": 8,
            "energy_cost": 18,
            "type": "damage",
            "damage_type": "Shock",
            "level_min": 10
        },
        {
            "name": "Poison Cloud",
            "cooldown": 10,
            "energy_cost": 22,
            "type": "damage",
            "damage_type": "Poison",
            "level_min": 8
        },
        {
            "name": "Rally",
            "cooldown": 15,
            "energy_cost": 10,
            "type": "buff",
            "level_min": 4
        },
        {
            "name": "Chaos Blast",
            "cooldown": 20,
            "energy_cost": 30,
            "type": "damage",
            "damage_type": "Chaos",
            "level_min": 15
        }
    ]
};
