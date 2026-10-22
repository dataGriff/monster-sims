# M0 playtest log review (MM-12)

Ten seeds, default plan, 7 nights, run with `pnpm play --seed N` at the end of
M0. Purpose: find out which emergent collisions got a laugh and which lines are
filler, as the gate for M1 content decisions.

## Results

| Seed | Outcome | Suspicion by dawn | Peak | Failed shifts | Notable |
| ---- | ------- | ----------------- | ---- | ------------- | ------- |
| 1 | won | 29 → 40 → 38 → 37 → 32 → 22 → 35 | 40 | 2/7 | 2 breakages |
| 2 | won | 29 → 40 → 38 → 50 → 58 → 47 → 60 | 60 | 2/7 | 4 breakages |
| 3 | won | 29 → 40 → 38 → 37 → 32 → 22 → 35 | 40 | 0/7 | 5 breakages |
| 4 | won | 29 → 40 → 38 → 37 → 32 → 22 → 35 | 40 | 1/7 | 2 breakages |
| 5 | won | 29 → 40 → 38 → 37 → 32 → 22 → 35 | 40 | 1/7 | 2 breakages |
| 6 | won | 29 → 40 → 51 → 50 → 45 → 34 → 47 | 51 | 2/7 | 3 breakages |
| 7 | won | 42 → 53 → 51 → 50 → 45 → 34 → 47 | 53 | 2/7 | 5 breakages |
| 8 | won | 42 → 53 → 51 → 63 → 71 → 70 → 83 | 83 | 4/7 | Van Helsing arrives night 5 |
| 9 | won | 42 → 53 → 51 → 63 → 58 → 47 → 60 | 63 | 3/7 | 2 breakages |
| 10 | won | 29 → 40 → 38 → 50 → 45 → 34 → 47 | 50 | 1/7 | 5 mood swings |

Event totals across the ten runs: 220 actions, 80 anger lines, 61 rumour
lines, 40 critical-need lines, 29 breakages, 25 village mood changes, 10 full
moons, 10 blackouts, 1 snooping, 0 mob attacks, 0 recruits.

## What got a laugh (keep, and build on)

1. **The Golem sat on the coffin and it did not survive.** The random
   furniture pick lands on things that matter to someone else. Seed 3 broke the
   coffin on night 4 and the Wolf Man fixed it on night 6; that is a tiny story
   nobody wrote. Give furniture owners so the victim can react.
2. **The full-moon blackout on the last night.** Every run ends with the
   kitchen wrecked and the Wolf Man remembering nothing, right after the Count
   and Golem have spent the night lying low to keep things calm. The timing is
   the joke. Worth protecting when run length becomes configurable (MM-33):
   the final night should still be a full moon.
3. **"A villager woke up pale."** Reads as an aside and lands every time the
   Count feeds. Rotating the victim through the townie roster (MM-17) would
   make it land harder: "the baker woke up pale" and then the baker's bread is
   bad all week.
4. **"The Golem bought a plant and no one came."** Only fires when his social
   is already at the cap, which the default plan never arranges. Seed 1 of the
   earlier reckless plan got it on night 1. Should be the *default* flavour of
   his socialising, with the inn line as the rare variant.
5. **Van Helsing taking a room at the inn (seed 8).** One sentence and the run
   changes mood. He then does nothing but add +3. He needs a routine (MM-18).

## What was dull (cut or compress)

1. **"The village had something to talk about (+4)."** Appears 61 times in 70
   nights. It is bookkeeping, not an event. Fold the number into the Suspicion
   line and only emit a sentence when the *reason* is interesting.
2. **"X is fuming about fun" every night from night 3.** Fun decays faster
   than anything restores it under the default plan, so the Wolf Man is
   permanently fuming. Either the plan needs a fun action or fun decay is too
   fast. The critical-need line plus the anger line on the same dawn is also
   redundant in the compact view.
3. **Default plan is too safe.** Ten wins out of ten and four seeds share the
   same curve to the digit. The only sources of variance are cover-job rolls
   and furniture. The mob never gathered, nobody was recruited. M1 needs more
   dice in the village (gossip spreading between townies, Van Helsing
   snooping specific rooms) and the default plan should be riskier.
4. **"Lay dormant through the day and did not recharge."** Correct, but the
   Golem says it every day the rod is down and the player cannot see why from
   the compact log. Mention the rod.

## Decisions for M1

- Townies with names and jobs before any new monster: most of the funny lines
  get funnier with a named victim.
- Rumour becomes a number on the Suspicion line, not a sentence.
- Rebalance fun or give the default plan a fun night.
- Make the Golem's "no one came" the default and keep the inn as the surprise.
- The seed-8 curve (peak 83, Van Helsing arriving mid-run) is the shape a
  default run should have more often.
