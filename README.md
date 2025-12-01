# LootGen AI Brief

Purpose: keep this repository description lean and structured so future AI assistants can quickly understand the project, avoid repeated questions, and use tokens more efficiently.

## What the project does
- Generates a progression simulation for a loot-based ARPG:
  * Builds per-level time/xp/loot curves.
  * Produces loot drops using configurable equipment slots, categories/rarities, damage types, and items.
  * Simulates gear swaps based on DPS impact (flat damage, damage mods, attack speed), including attribute modifiers per damage type.
  * Shows build snapshot, DPS breakdown, and swap reasons per item.

## Key folders
- `js/defaults.js`: canonical state fixture (attributes, slots, damage types, rarities). All “default values” should live here; the form reads from it.  
- `js/form.js`: UI glue and helper logic for the configuration form (syncs input, renders charts, manages tags, updates auto counts).  
- `js/lootgen.js`: simulation engine (loot generation, DPS calculation, swap evaluation, UI rendering).  
- `css/nodal.css`, `index.html`, `js/nodal.js`: supporting styles and glue for the SPA layout.

## Important concepts
- **State**: single object exported by `defaults.js`; keys map directly to input `name` attributes. Tooltips and form rendering assume this.
- **Rarity power**: each rarity/category carries a `rarity_power` multiplier (0.5…1) applied to every affix/value so commons naturally stay near the floor while uniques can tap the full curve.
- **Damage types** now include attribute modifiers (`attribute_modifier`) and map to stats (force/intelligence) when computing DPS.
- **Swap reason**: when a loot roll is equipped, the engine records the dominant stat change (flat/mod/AS) and shows the DPS delta to explain the swap.
 
## Tips for AI helpers
1. **Refer to `state` values** before suggesting defaults because this is the single source of truth.  
2. **Preserve existing tooltips/labels** when editing the form to avoid losing the “state variable” hints.  
3. **Loot logic touches**: changes often require touching `rarities`, `slots`, and DPS calculations together—verify the swap reason, DPS, and UI tables stay in sync.  
4. **Use the charts/forms** as examples of how the state keys map to UI inputs; matching `name` attributes keeps JS and HTML coherent.

## Running the simulation
1. Edit `js/defaults.js` or tweak the form inside `index.html`.  
2. Open `index.html` in the browser; the form renders the `state` values and allows recomputing via the “Compute all levels” button.  
3. Inspect the console for validation helpers (the UI writes JSON into the preview and exposes “Copy headers/loot” buttons under the results).

Keeping this README current will reduce redundant explanations in chats and let the next assistant hit the ground running.
