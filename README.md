# Monster Manor

A headless life-sim. The household is a trio of classic public-domain monsters
and the antagonist is the village's **Suspicion**. Keep everyone fed, rested
and inconspicuous for seven nights and you win. Let Suspicion hit 100 and the
mob is at the door.

There is no renderer yet. The simulation is pure, deterministic TypeScript that
emits a plain event log; the bundled CLI prints that log as prose.

```text
Night 3 — The Count worked a quiet shift as night watchman (Suspicion -8). The Wolf Man ate (hunger +50). The Golem spent the evening at the inn (social +10). Suspicion 40 -> 38.
  · The Golem sat on the piano and it did not survive (house comfort -10).
  · The Wolf Man is fuming about fun (anger +10).
  · The village calms down a little.
```

## Quick start

Requires Node 22.18+ and pnpm.

```sh
pnpm install
pnpm test                       # all Gherkin scenarios, via Vitest
pnpm play --seed 42             # 7 nights with the default plan
pnpm play --seed 7 --plan plans/example.json
pnpm play --seed 42 --verbose   # one plain-English line per event
pnpm play --seed 42 --json      # raw Event[] instead of prose
pnpm lint                       # oxlint, warnings denied
pnpm check                      # lint + typecheck + test, what CI runs
pnpm typecheck
```

The CLI exits 0 on a win and 1 on a loss. The same seed and plan always
produce the same log.

### Plan files

A plan is the dusk schedule: for each night, the action each monster is
assigned, plus an optional `day` slot (only the Wolf Man can use it). If the
plan is shorter than the run, its last night repeats.

```json
{
  "nights": [
    { "night": { "count": "feed", "wolfman": "coverJob", "golem": "sleep" } },
    { "night": { "count": "socialise", "wolfman": "sleep", "golem": "repair" },
      "day":   { "wolfman": "coverJob" } }
  ]
}
```

A bare array of assignment objects is accepted as shorthand. Monster ids are
`count`, `wolfman`, `golem`; actions are `feed`, `sleep`, `socialise`,
`coverJob`, `repair`, `lieLow`. A monster left out of a night idles.

## The model

Everything lives in `src/sim` and is plain data plus pure functions. There is
no DOM, no `Date.now`, and all randomness comes from a seeded RNG stored in the
game state.

### Needs

Eight needs per monster, each clamped to 0–100: `hunger`, `energy`, `social`,
`fun`, `hygiene`, `comfort`, `bladder`, `anger`. For every need except anger,
100 means satisfied. Anger is inverted: 0 is calm, 100 is furious. At dawn each
monster's `decay` is subtracted; a need crossing below 20 emits a
`needCritical` event. Then anger rises by 10 if any need they care about is
below 20 and falls by 5 otherwise. The house's `householdAnger` is the
mean anger of the residents; at 70 or more the shouting adds Suspicion.

### Monsters

| Monster      | Quirks |
| ------------ | ------ |
| The Count    | Hunger only fills from `feed` at night. Energy does not decay at dawn but drains by 15 in daylight. Hygiene never changes and never angers him (no reflection). Socialising charms a villager: recruit progress +25, Suspicion +5. Feeding leaves a pale villager: Suspicion +3. |
| The Wolf Man | Every 7th night is a full moon: at dusk hygiene and comfort drop to 0 and fun to 100; at night whatever he was assigned is lost, the kitchen is wrecked and Suspicion rises by 15 (+10 more if he was on a cover-job shift). He remembers nothing. He is the only monster who may take a `day` action. |
| The Golem    | Social is capped at 20 (villagers flee), and he does not mind. Energy only recharges while the house has its lightning rod. Each night there is a 40% chance he breaks a piece of furniture, costing everyone 10 comfort. |

Quirks are hook objects in `src/sim/quirks.ts`, looked up by id, so a
`Monster` stays serialisable.

### House and village

The house has rooms, a furniture list with `broken` flags, a `lightningRod`
and `householdAnger`. `repair` fixes the rod first and then up to two pieces of
furniture. A mob attack on the roof takes the rod with it.

The village has `suspicion` 0–100, `recruitProgress` and a list of `allies`.
Suspicion thresholds:

| Suspicion | Effect |
| --------- | ------ |
| 40        | Gossip. Cover jobs are 10 points more likely to fail. |
| 70        | Van Helsing is snooping. Each dawn adds +3 unless someone lay low that night. |
| 90        | The mob gathers. Each day there is a 50% chance it storms a random room. |
| 100       | The mob is at the door. Game over. |

After a **noisy** night (anything raised Suspicion: a charm, a pale villager,
a failed shift, a blackout, snooping) the dawn adds +4 of rumour on top. After
a **quiet** night Suspicion drifts 3 points toward its baseline of 30, in
either direction: the village forgets, but a house of strangers is never quite
trusted. When
the Count's recruit progress reaches 100 a villager becomes an ally, Suspicion
drops by 10 and each ally makes cover jobs 5 points safer.

### Actions

Queued at dusk, resolved at night in household order (Count, Wolf Man, Golem).

| Action      | Effect |
| ----------- | ------ |
| `feed`      | hunger +50 |
| `sleep`     | energy +40, bladder +50 |
| `socialise` | social +30, fun +20, Suspicion +2 |
| `coverJob`  | energy -10, fun -10. Success: Suspicion -8. Failure (base 15–20%): Suspicion +5. |
| `repair`    | fixes the lightning rod and up to 2 broken items; everyone comfort +10, repairer fun +10 |
| `lieLow`    | Suspicion -3, comfort +10, fun +10, hunger +5, bladder +30 |

### The night loop

`runNight(state, plan)` runs four phases, each exported separately for tests:

1. **dusk** — advance the night counter, assign actions from the plan, run
   `onDusk` quirks (the full moon rises here).
2. **night** — resolve each monster's action; quirks may cancel or replace it
   (`beforeAction`) and rewrite the log line (`afterAction`); then `onNight`
   quirks (the Golem's clumsiness).
3. **dawn** — apply decay and anger, add rumour, snooping and angry-house
   Suspicion, settle the night's Suspicion delta into one `Suspicion a -> b`
   event, emit threshold crossings, and end the game at 100.
4. **day** — everyone sleeps (energy +30) unless they are the Wolf Man with a
   day action, or the Count, who drains instead; a gathered mob may attack;
   surviving the final night wins.

Both endings close the log with a single `summary` event carrying the outcome,
nights survived, final Suspicion, household anger, broken furniture and allies.

Every phase appends `Event` objects to `state.log`. An event is
`{ night, phase, kind, monsterId?, text, data? }`; `text` is what the CLI
prints, `data` carries the numbers so a future UI can render from the same log.

## Layout

```text
src/sim/        pure simulation
  types.ts      Monster, Needs, Action, Event, House, Village, GameState, Plan
  rng.ts        seeded RNG (mulberry32)
  needs.ts      defaults and clamping
  context.ts    emit / adjustNeed / addSuspicion helpers shared by hooks
  quirks.ts     the quirk registry: every monster-specific rule
  monsters.ts   factories for the Count, the Wolf Man and the Golem
  house.ts      rooms, furniture, lightning rod
  village.ts    thresholds, moods and Suspicion constants
  actions.ts    the six actions and the cover-job roll
  plan.ts       default plan and plan-file parsing
  loop.ts       dusk / night / dawn / day, runNight, runGame, play
src/cli/        text-mode runner (`pnpm play`)
features/       Gherkin .feature files: needs, each monster, suspicion, plans, cli
tests/          one Vitest spec per feature; steps.ts maps steps to sim calls
plans/          example plan file
docs/           the backlog and playtest notes
.github/        CI: lint, typecheck, test, replayable smoke play
```

## How to add a monster

1. Add its id to `MonsterId` in `src/sim/types.ts`, and the ids of any new
   quirks to `QuirkId`.
2. Implement the quirks in `src/sim/quirks.ts`. A quirk is an object with any
   of `onDusk`, `beforeAction`, `afterAction`, `onNight`, `onDawn`, `onDay`
   and `filterNeedChange`, plus `ignoredNeeds` for needs it should not get
   angry about. Prefer `filterNeedChange` for "this need only moves when…"
   rules and `beforeAction` for "tonight it does something else instead".
3. Add a factory to `src/sim/monsters.ts` with its needs, dawn `decay`,
   quirk list, cover job and whether it is `daylightActive`, and append it to
   `createMonsters()`. Order matters: actions resolve in that order.
4. Add it to `MONSTER_IDS` in `src/sim/plan.ts` so plan files can name it,
   and give it a slot in `DEFAULT_PLAN`.
5. Write `features/<monster>.feature` describing each rule as a scenario,
   then `tests/<monster>.spec.ts` implementing the scenarios with the helpers
   in `tests/steps.ts`. Use `seedWhere` to pin down any random roll instead
   of mocking the RNG.
6. Run `pnpm test` and `pnpm play --seed 42` and check the prose still reads.

All creatures and names are drawn from folklore and public-domain literature.
