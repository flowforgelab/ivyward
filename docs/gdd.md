# Ivyward — Game Design Document

**Team:** [inferred: GitHub `brennenlester/ivyward`; no studio name in source]
**Platform:** Web browser (desktop sit-down RPG; treat the browser as a PC client) [session answer]
**Genre:** Folklore RPG (isometric exploration, creature befriend/spar, shrine crafting)
**Target Session:** Hour+ sit-down sessions [session answer]
**Monetization:** ❌ **TBD** (not decided) [session answer]
**Last Updated:** 2026-08-20
**Imported by:** /game-import from README.md + live `src/game/` implementation (design of record; no prior GDD file)

---

## 1. Overview & Core Concept

A browser folklore RPG: explore isometric zones, befriend creatures, spar for materials, craft at Moon Shrine, then invite friends into your world.

**Play (canonical):** [ivyward-brennen1.vercel.app](https://ivyward-brennen1.vercel.app) (tracks latest production). Fallbacks: [ivyward-git-main-brennen1.vercel.app](https://ivyward-git-main-brennen1.vercel.app) or [poke-wine-kappa.vercel.app](https://poke-wine-kappa.vercel.app). [moved from README]

**Audience / session** [session answer]: Desktop sit-down RPG. Hour+ sessions. Keyboard/mouse. The web client is the PC client, not a 3-minute casual drop-in.

**Controls** [moved from README How to play]:

| Input | Action |
| --- | --- |
| Arrow keys or WASD | Move (hold to keep walking) |
| E | Interact: Moon Shrine, cottage door, villager, cottage minigame, moor/board/disembark boat |
| I | Copy friend invite link (host only) |
| Copy invite link (status panel) | Same as I; works on touch |
| Party (status panel) | Active party (max 7) and reserve scroll/swap |
| Inventory (status panel) | Materials and items. After Portable Moonshrine: 4×4 craft grid and Use on tonic / draught / crystal |
| Recipes | Every shaped crafting pattern (status panel, Inventory, or Moon Shrine) |
| Codex | Habitat codex: what lives where (fills in as you encounter creatures) |
| Reset game | Wipe local host save and start fresh |

**FTUE / confined region** [moved from README]: Start in **Whisper Grove**, walk map exits through **Moon Shrine** to **Hearth Crossing**. North of the village are **Folklore Fields** (north gate into **Moonwake Harbor**, east into **Mistwood Reach** / **Emberfen Hollow**), locked until Story quest 2 is complete. From Harbor, sail east past East Landing into the open **Archipelago** sea.

---

## 2. Core Loop

Repeating cycle:

1. **Walk** isometric zones (hold WASD / arrows).
2. **Encounter** a wild creature (Befriend, Spar, or Flee).
3. **Payoff:** Befriend adds a companion. Spar win grants creature materials, Folklore Dust, and XP. Flee exits.
4. **Spend / grow:** Craft on the Moon Shrine 4×4 grid (or Portable Moonshrine after it is crafted). Use tonic / draught / crystal. Apply shrine effects / fusion at the real shrine.
5. **Open the map:** Story 2 (win a spar) opens the overworld gate. Further walking yields new habitats, village asks, sailing, and islands.
6. **Repeat** from walk. Host progress saves automatically in `localStorage`.

**FTUE close (once):** four story quests on the HUD (`Story N/4` + Next hint):

1. Befriend a wild creature.
2. Win a training spar — this **opens the overworld gate**.
3. Reach Hearth Crossing (Grove → Shrine → Village).
4. Craft a relic at Moon Shrine (stand on the moon altar, press E, craft any relic).

Gate status reads `Overworld gate: LOCKED (Story 2/4)` until the spar quest is done, then `OPEN`.

**Session loop:** one sit-down can cover FTUE plus overworld/harbor/islands. [inferred from hour+ session answer + current map size]

**Meta loop:** unfinished collection (Codex), fusion line (Sovereigns), and new content unlocks (zones / creatures / relics). [session answer + shipped systems]

---

## 3. Progression & Retention

**Shipped progression** [moved from README + inferred from `src/game/`]:

- **Story 4/4** as above. Skill/content gate: first spar win unlocks the overworld.
- **Party:** active party max 7; extras in reserve. [inferred: `ACTIVE_PARTY_LIMIT`]
- **Levels:** creatures level from spar XP. [inferred: `XP_PER_SPAR_WIN` = 70 total shared across actives; `MAX_LEVEL` = 50; cumulative XP for level L is `10*(L-1) + 2*(L-1)^2`]
- **Codex:** encountering a creature once lists it under every habitat that can spawn it. 27 encounter-table species required for the hidden **Codex Keeper** achievement (evolution-only `Bramblewarden` and `Hearthflame` are not required). Once per save: Brook Tonic ×5 and Moonwake Draught ×5.
- **Village side asks** (host only, after first-visit gift):
  - Warden Bryn: word of five different creatures → Brook Tonic ×2
  - Weaver Sable: Wood ×5 and Wild Fiber ×3 → Brook Tonic ×2
  - Hearthkeep Odd: travel with three companions → Moonwake Draught ×1
- **Shrine growth:** item effects on specific creatures (attack buff + typed dual move including a 5th move slot; health buff; evolutions Mossling→Bramblewarden, Ember Wisp→Hearthflame at min levels). Fusion stays at the real shrine.
- **Sovereign line:** Sovereign Seal fuses Tide Sovereign + Cairn Sovereign → Horizon Sovereign (up to twice). Two Horizons fuse into Eclipse Sovereign.
- **Map unlocks:** Folklore Fields, Mistwood Reach, Emberfen Hollow, Moonwake Harbor, Archipelago (100×100 ocean, 9×9 island grid).

**Retention hook (stated):** new content unlocks — "I want to see the next zone / creature / relic." [session answer]

❌ **TBD:** explicit D1 / D7 / D30 retention design (what the second session, the week-later session, and the month-later session each promise). Content-gate intent is recorded; the calendar hooks are not.

---

## 4. Economy & Monetization

**Monetization:** ❌ **TBD** (not decided). No IAP, ads, or store SKU in the current client. README license: private project. [session answer]

**Currencies / resources** (in-game only):

| Resource | Role | Faucet | Sink |
| --- | --- | --- | --- |
| Wood, Stone, Wild Fiber, Pebble | Gather nodes | Chop/mine/gather/collect on world props, 30s cooldown [inferred: `gatherNodes.ts`] | Craft patterns; Sable delivery (Wood ×5, Wild Fiber ×3) |
| Creature materials (Moss Fiber, Ember Ash, Brook Pearl, … per species) | Spar loot | Win a spar vs that species | Craft glyphs (subset: moss, ember, pearl, etc.) |
| Folklore Dust | Spar loot | +1 per spar win [inferred: `sparRewards.ts`] | Craft (glyph D) |
| Brook Tonic | Heal | Craft ×3; NPC gifts/asks; Codex Keeper ×5 | Use |
| Moonwake Draught | Revive | Craft ×3; Odd ask ×1; Codex Keeper ×5 | Use |
| Brook Crystal | Item | Craft (single pearl) | Use |
| Relics / tools | Unique or repeatable crafts | 4×4 shrine/inventory grid | Equip/use (Boat, Portable Moonshrine, weapons, charms, salves, Sovereign Seal) |

**Craft outputs** [inferred from `recipes.ts`; Recipes panel is player-facing]:

- Sovereign Seal (altar pattern; fusion key)
- Wood Cudgel, Stone Knife, Ember Charm, Moss Salve
- Brook Tonic ×3, Brook Crystal, Moonwake Draught ×3
- Boat (dock placement enforces one boat at a time)
- Portable Moonshrine (altar-only, unique owned): unlocks inventory craft grid + Use on tonic/draught/crystal; Use on the relic opens Craft + Use anywhere. Fusion stays at the real shrine.

**Visitor economy:** visitors never receive villager gifts, first-win minigame gifts, or side-ask rewards. They cannot craft, encounter, or advance quests.

---

## 5. Player Motivation & Fantasy

**Stated fantasy** [session answer]: **power fantasy and discovery together**.

- Power fantasy: "I'm getting stronger, I'm in control" (spars, levels, shrine buffs, fusion, relics).
- Discovery: "What's on that island? What happens if I befriend this?" (zones, habitats, Codex, Archipelago).

Implied by README but not named until this session: collect folklore companions and host a world friends can walk. Social hosting is a feature (invite links), not the primary stated feeling.

---

## 6. Systems & Mechanics Detail

### Encounters

Walk in zones to trigger encounters: **Befriend**, **Spar**, or **Flee**. Cottage interiors are safe rooms (no wild spawns). Harbor has no wild table yet. Archipelago: **on foot** on islands can meet island-exclusive creatures; **sailing skips** wild encounters.

[inferred: travel threshold `ENCOUNTER_TRAVEL_THRESHOLD` = 0.75 tiles of movement before a roll.]

**Habitat encounter tables** [inferred from `encounters/tables.ts`]:

| Habitat | Typical wilds |
| --- | --- |
| Whisper Grove | Mossling, Ember Wisp |
| Moon Shrine | Ember Wisp, Brook Nymph |
| Hearth Crossing | Brook Nymph, Mossling |
| Folklore Fields | Rootwalker, Lantern Fox, Stone Hound |
| Mistwood Reach | Thunder Finch, Lantern Fox, Mist Serpent |
| Emberfen Hollow | Peat Sprite, Cinder Toad, Bog Lantern |
| Moonwake Harbor | (none) |
| Archipelago islands | One exclusive per island (Isle Fernling, Salt Scuttle, Shoal Wisp, Tide Urchin, Coral Skitter, Drift Kelpie, Dune Hermit, Brackish Newt, Pearl Moth, Reef Spinner, Mist Anemone, Barnacle Toad, Gulf Lantern, Spray Finch, Lagoon Hare, Atoll Wisp) |

Codex: encountering a creature once lists it under **every** habitat that can spawn it. Blank habitats stay blank until you meet something from that pool.

### Combat (spars)

Creatures and moves have folklore **types**. Spars use accuracy, hunter matchups (~1.5×), and rare immunity traits on signature creatures. [moved from README]

**Types** [inferred: `folkloreTypes.ts`]: woodland, ember, water, earth, mist, storm, hearth, twilight, fen, will-o-wisp.

Hunter chart (attacker → defender it hunts, 1.5×): woodland→fen, ember→woodland, water→ember, earth→storm, mist→twilight, storm→water, hearth→mist, twilight→will-o-wisp, fen→hearth, will-o-wisp→earth.

Immunities apply only when the defender has rolled an immunity trait (signature creatures), not for every creature of that type. Pair map: mist immune to earth, water to ember, earth to storm, twilight to will-o-wisp.

### Party

Active party max 7. Reserve holds the rest. Host-only befriend/spar/quest.

### Shrine, fusion, gods

Moon Shrine: stand on the moon altar, press E. 4×4 grid; drag materials into shape; tap the result.

Relic effects on party creatures (examples shipped): Ember Charm on Mossling (min Lv.3) attack buff + Ember Lash; Moss Salve on Ember Wisp (min Lv.3) HP buff; evolutions at min Lv.5. [inferred: `shrineEffects.ts`]

**Sovereigns:** Tide Sovereign (god sail encounter) and Cairn Sovereign (god land encounter) fuse with a Sovereign Seal into Horizon Sovereign (max two Horizon fusions). Two Horizons fuse into Eclipse Sovereign (once). [README + inferred: `godFusion.ts`, `MAX_HORIZON_FUSIONS = 2`]

### World / sailing

From Folklore Fields, north gate into Moonwake Harbor. Press E near the west Harbor dock while holding a Boat to moor (persists in save; visitors cannot place). Board and sail Harbor water. East Landing is an optional dock. Sailing east off the Harbor water edge enters the **Archipelago**: 100×100 open ocean, 2D grid of multi-biome 9×9 islands (lush, barren, mixed) and docks. E at island docks to disembark/reboard. Mid-sail and on-island stands restore from save. Older Folklore Fields boat stands migrate into Harbor.

### Village, cottages, minigames

Three cottages, enter via door + E; leave through the bottom doorway.

| Villager | Home | First-visit gift |
| --- | --- | --- |
| Warden Bryn | Warden's Cottage | Wild Fiber ×3 |
| Weaver Sable | Weaver's Cottage | Moss Fiber ×3 |
| Hearthkeep Odd | Hearthkeep Cottage | Brook Tonic ×1 |

Once per save, host only. Then local talk. Side asks as in section 3.

House prop + E = minigame (same reach as talking; standing on the villager still talks):

| House | Prop | Minigame | First win (once per save, host) |
| --- | --- | --- | --- |
| Warden's Cottage | Shelf | **Ward the Crossing** — place copies of living party on 3 lanes, hold 3 waves | Wild Fiber ×2 |
| Weaver's Cottage | Loom | **Loom Pattern** — repeat three thread sequences | Moss Fiber ×2 |
| Hearthkeep Cottage | Hearth | **Hearth Lots** — roll one die, 12-round property board vs Odd | Brook Tonic ×1 |

Ward the Crossing needs at least one living **active** companion. Overworld HP does not change. Hearth Lots uses play money; inventory only changes on that first-win tonic. Visitors can play but never receive the first-win gift.

### Friend invites

1. Host: Copy invite link (status panel) or I. Phones copy when possible, else share sheet / selectable URL.
2. Open the link in another browser/tab as a **visitor**.
3. Visitors explore the host snapshot but **cannot** trigger encounters, craft, or advance quests.
4. Broken or tampered `?join=` links show an error screen and do not change the local save.

### Save

Host progress (party, inventory, quests, position, gate) lives in `localStorage`. `?new=1` or **Reset game** starts over. A valid `?join=` invite always takes precedence over the local save.

### Secrets

One hidden achievement, never listed before earn: fill every codex page (27 encounter-table creatures) → **Codex Keeper**. See section 3.

### Dev-only (not player design)

Local Vite only: **U** toggles the overworld gate; `?encounter=` / `?spar=` preview. Not part of normal play. [moved from README Development]

---

## 7. Technical Specs

- **Engine:** Phaser 3 (`phaser` ^3.90.0) [inferred: `package.json`]
- **Stack:** TypeScript, Vite 6, Vitest. Node.js 20.9+.
- **Platform:** Web. Production on Vercel. Canonical play URL aliased to latest production (`ivyward-brennen1.vercel.app`).
- **Persistence:** host `localStorage`. Visitor mode is a snapshot (`?join=`), not a shared live simulation of encounters/crafting.
- **Layout:** `src/game/` Phaser bootstrap and scenes; `story/` quests; `world/` zones, collision, invites, saves; `creatures/` catalog and party; `inventory/` / `crafting/` / `shrine/` materials and Moon Shrine.
- **CI:** PRs to `main` run `npm ci`, `npm test`, `npm run build`. Merges deploy via Vercel.
- **Assets:** Imagine texture atlas (`npm run pack:atlas`).
- **License:** Private project.

---

## 8. Milestones & Roadmap

**Current milestone (shipped):** vertical slice = current production at the canonical play URL. The player can complete the core loop (explore → encounter → craft) and continue into overworld, harbor, and Archipelago, plus invite visitors into a snapshot. [session answer]

**Later milestones:** ❌ **Not yet defined** (no named post-slice content drops, platforms, or "done" criteria beyond the live build). `package.json` version is `0.0.0`.

**Smallest showable version:** already surpassed. Core mechanic and one complete loop exist inside the vertical slice.

---

## GDD Status

- **Completeness:** 6/8 sections (6 ✅ present, 2 ⚠️ partial, 0 ❌ TBD sections; monetization model and D1/D7/D30 pair remain TBD inside otherwise-present sections)
- **Imported from:** README.md (player how-to) + `src/game/` implementation; gap answers from /game-import session 2026-08-20
- **Import date:** 2026-08-20
- **Sections needing work:** Progression (name D1/D7/D30 hooks); Economy (choose a monetization model or explicitly "hobby")
- **Recommended next skill:** /game-review — GDD is standardized at 6/8; review the design, then /player-experience
