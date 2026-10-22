# Monster Manor — Backlog

Milestones in order. Each issue: `MM-nn` · title · labels · acceptance criteria.
Labels: `sim` `cli` `render` `ui` `content` `audio` `art` `build` `qa` `biz`.
Priority: P0 = milestone-blocking, P1 = needed for the milestone, P2 = nice-to-have.

---

## M0 — Headless MVP (prove the joke)

**MM-01 · Project scaffold** · `build` · P0
Vite + TS strict + Vitest + pnpm. `pnpm test`, `pnpm play`, `pnpm lint` all run. README stub.

**MM-02 · Seeded RNG and deterministic tick** · `sim` · P0
`createRng(seed)`; same seed + same plan ⇒ identical event log. Test: two runs diff to zero.

**MM-03 · Needs model** · `sim` · P0
Eight needs 0–100 with per-monster decay tables. Clamp, decay per phase, critical threshold events.

**MM-04 · Monster: The Count** · `sim` `content` · P0
Hunger fills only from `feed` at night; energy drains in daylight; hygiene ignored. `charm` raises recruit progress and Suspicion. Feature file + tests.

**MM-05 · Monster: The Wolf Man** · `sim` `content` · P0
Full moon every 7th night: hygiene/comfort crash, fun maxes, blackout event (kitchen wrecked, Suspicion +15). Can act by day. Feature file + tests.

**MM-06 · Monster: The Golem** · `sim` `content` · P0
Social capped at 20; energy only via lightning rod; random furniture breakage. Feature file + tests.

**MM-07 · Suspicion meter and thresholds** · `sim` · P0
0–100; thresholds 40/70/90/100 emit gossip / Van Helsing / mob gathers / mob at door. Decay toward baseline on quiet nights.

**MM-08 · Dusk→Night→Dawn→Day loop** · `sim` · P0
`runNight(plan)` resolves actions in order, applies decay, computes Suspicion delta, emits `Event[]`.

**MM-09 · Actions and cover jobs** · `sim` · P0
feed, sleep, socialise, coverJob, repair, lieLow. One cover job per monster; failure cases (Wolf Man full-moon shift).

**MM-10 · 7-night run with win/lose** · `sim` · P0
Survive 7 nights = win; Suspicion 100 = mob at door = lose. Run summary event.

**MM-11 · CLI runner** · `cli` · P0
`pnpm play --seed N [--plan plan.json]` prints a readable night log. Log lines are plain English, one per event.

**MM-12 · Playtest log review** · `qa` · P1
Play 10 seeds. Record which emergent collisions got a laugh. Output: a short notes file ranking the funniest events and the dull ones. Gate for M1.

---

## M1 — Vertical slice (it's a game now)

**MM-13 · Monster: The Mummy** · `sim` `content` · P1
Energy always full, no bladder, comfort drops as bandages unravel. Every action costs two slots. Artefact hoarding and curse-on-move.

**MM-14 · Monster: The Invisible Man** · `sim` `content` · P1
Social fills only when "visible" (bandages on). Fun via pranks. Steals food (+household anger). Lowest Suspicion gain.

**MM-15 · Household Anger meter** · `sim` · P1
Shared 0–100. Low unlocks group actions; high triggers fights, move-outs, rogue nights.

**MM-16 · Transform / Infect relationship tree** · `sim` · P1
Townie relationships: friend → confidant → thrall → turned. Turning adds a household member and a Suspicion spike.

**MM-17 · Townie roster and village sim** · `sim` `content` · P1
8–12 named villagers with jobs, suspicion weight and routines. Gossip spreads between neighbours.

**MM-18 · Van Helsing NPC** · `sim` `content` · P1
Appears at Suspicion 70. Snoops rooms, can be distracted, befriended, or eventually turned.

**MM-19 · Mob behaviour** · `sim` · P1
Crowd targets the room with highest exposure. Defences: drawbridge, fog machine, decoy coffins, organ. Loss outcomes: lose a monster vs lose the manor.

**MM-20 · Manor and rooms model** · `sim` · P1
Rooms, furniture, exposure score per room (windows, lights), secret passages.

**MM-21 · Basic build mode** · `sim` `ui` · P1
Place beds (coffin, slab, sarcophagus, tub), lightning rod, furniture. Cost in a simple currency earned from cover jobs.

**MM-22 · 2D isometric renderer** · `render` · P0
Pixi or canvas; one manor floor; monsters as sprites with idle/walk/act; day/night lighting pass. Renders purely from the sim's state + events.

**MM-23 · Dusk planning UI** · `ui` · P0
Assign one action per monster per night; preview risk hints; confirm → run night with event ticker.

**MM-24 · HUD** · `ui` · P1
Needs bars per monster, Suspicion gauge, Anger gauge, night counter, moon phase.

**MM-25 · Bestiary (6 pages)** · `content` `art` `ui` · P1
Illustrated 1930s field-guide pages unlocked on first meeting; doubles as tutorial.

**MM-26 · Save/load** · `sim` `build` · P1
Serialise seed + plan history; resume mid-run.

---

## M2 — Content and feel

**MM-27 · Monster: The Gill-man** · `sim` `content` · P2
Must stay wet; bathtub always full; floods hall. Original lake-creature design only.

**MM-28 · Story events** · `content` · P1
Scripted collisions: full moon on the Count's shift, lost traveller at the door, village fête, census taker. ~20 events with branches.

**MM-29 · Cover job progression** · `sim` · P2
Promotions, shift clashes, workplace suspicion as its own sub-meter.

**MM-30 · Leitmotifs and ambience** · `audio` · P1
Theremin/organ themes per monster; critical-need stings; thunder, creaks, village hubbub by Suspicion level.

**MM-31 · Art direction pass** · `art` · P1
Monochrome palette with one accent per monster, expressionist angles, grain/vignette toggle. Style sheet + first key art.

**MM-32 · Full build mode** · `ui` · P2
Walls, doors, windows (exposure), secret passages, lab equipment that animates furniture, Dread stat.

**MM-33 · Difficulty and run length** · `sim` · P2
7 / 14 / 28-night runs; Suspicion decay tuning; sandbox mode.

**MM-34 · Accessibility** · `ui` · P1
Colour-blind safe accents, text scaling, screen-reader labels on HUD, remappable keys.

---

## M3 — Expansion and release

**MM-35 · Phantom, Bride, Hunchback** · `sim` `content` · P2
Three more archetypes with distinct inversions.

**MM-36 · Welsh folklore set (optional DLC)** · `content` · P2
Gwyllgi, Cŵn Annwn, Gwrach y Rhibyn; alternative valley village.

**MM-37 · Tauri desktop builds** · `build` · P0
Win/mac/Linux; CI builds on tag; auto-update off by default.

**MM-38 · Steam page and box art** · `biz` `art` · P1
DOS-era painted key art, lurid title treatment, trailer from in-engine footage.

**MM-39 · Localisation scaffold** · `build` `content` · P2
All event text through a string table; English + Welsh first.

**MM-40 · IP audit** · `biz` · P0
Confirm no Universal-owned designs, names or marketing language. Checklist against each monster's silhouette and text.

**MM-41 · Telemetry (opt-in)** · `build` · P2
Which events fire, where runs end, average Suspicion curve — for tuning only.

**MM-42 · Release candidate playtest** · `qa` · P0
10 external players, 3 runs each; fix list triaged; go/no-go.

---

## M4 — Design framework

Filed after the art-direction pass, to turn it into a system.

**MM-43 · Design tokens as a single source of truth** · `design` `ui` `build` · P1
One typed source for colour roles, generated CSS, canvas palette reading the same primitives; no raw colours in the stylesheet.

**MM-44 · Type, spacing, radius and motion scales with a design lint** · `design` `ui` `qa` · P1
Scales for type, space and motion in CSS and JS; a lint test enforcing them, focus styles and breakpoints; checked at phone width.

**MM-45 · Themes: night, paper and high contrast, with contrast tests** · `design` `ui` · P1
Three themes from the same roles; WCAG AA asserted for every text role on every surface.

**MM-46 · A component kit the tests can reach** · `design` `ui` `qa` · P1
Dependency-free `h()` view layer, reusable components, pure views; accessible-name and state tests in Node.

**MM-47 · An icon set in the house line style** · `design` `art` `ui` · P2
Line icons for needs, actions and chips, always beside a label.

**MM-48 · A living style guide page** · `design` `ui` `content` · P1
`styleguide.html`: tokens per theme, scales, components, icons, figures, furniture, stage variants.

**MM-49 · Visual regression tests and a capture script** · `design` `qa` `build` · P1
Fingerprint snapshots of every drawing; `pnpm shots` for the reference images.

**MM-50 · Design system documentation** · `design` `content` · P2
`docs/design-system.md` with how-to guides; linked from the art direction and README.

---

## Dependencies (high level)

- M0 is strictly sequential: 01 → 02 → 03 → 04–06 → 07 → 08 → 09 → 10 → 11 → 12.
- MM-22 (renderer) and MM-23 (planning UI) block every other M1 UI issue.
- MM-16 depends on MM-17; MM-19 depends on MM-20.
- MM-37 and MM-40 gate release.
- M4: MM-43 → MM-44 → MM-45; MM-46 before MM-47 and MM-48; MM-49 and MM-50 last.
