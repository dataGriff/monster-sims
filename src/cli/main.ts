import { readFileSync, writeFileSync } from 'node:fs';
import { createGame, runNight } from '../sim/loop.ts';
import { VALLEY_HOUSEHOLD } from '../sim/monsters.ts';
import { DEFAULT_PLAN, VALLEY_PLAN, parsePlan, planForNight } from '../sim/plan.ts';
import { loadGame, parseSave, saveGame } from '../sim/save.ts';
import type { Plan } from '../sim/types.ts';
import { USAGE, parseArgs } from './args.ts';
import { formatGame, formatVerbose } from './format.ts';

function main(argv: readonly string[]): number {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  let plan: Plan = args.setting === 'valley' && !args.household ? VALLEY_PLAN : DEFAULT_PLAN;
  if (args.plan) {
    plan = parsePlan(JSON.parse(readFileSync(args.plan, 'utf8')));
  }
  const state = args.load
    ? loadGame(parseSave(JSON.parse(readFileSync(args.load, 'utf8'))))
    : createGame({
        seed: args.seed,
        nightsToSurvive: args.nights,
        ...(args.household ? { household: args.household } : args.setting === 'valley' ? { household: [...VALLEY_HOUSEHOLD] } : {}),
        ...(args.difficulty ? { difficulty: args.difficulty } : {}),
        ...(args.sandbox ? { sandbox: true } : {}),
        ...(args.setting ? { setting: args.setting } : {}),
      });
  const seed = state.options.seed;
  while (state.status === 'running' && (args.until === undefined || state.night < args.until)) {
    runNight(state, planForNight(plan, state.night + 1));
  }
  if (args.save) writeFileSync(args.save, JSON.stringify(saveGame(state), null, 2) + '\n');
  if (args.json) {
    process.stdout.write(JSON.stringify(state.log, null, 2) + '\n');
  } else if (args.verbose) {
    process.stdout.write(formatVerbose(state, seed) + '\n');
  } else {
    process.stdout.write(formatGame(state, seed) + '\n');
  }
  if (state.status === 'running') {
    process.stdout.write(`(stopped after night ${state.night}; run is still going)\n`);
    return 0;
  }
  return state.status === 'won' ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n${USAGE}`);
  process.exitCode = 2;
}
