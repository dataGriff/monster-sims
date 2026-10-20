import { readFileSync } from 'node:fs';
import { createGame, runGame } from '../sim/loop.ts';
import { DEFAULT_PLAN, parsePlan } from '../sim/plan.ts';
import type { Plan } from '../sim/types.ts';
import { USAGE, parseArgs } from './args.ts';
import { formatGame, formatVerbose } from './format.ts';

function main(argv: readonly string[]): number {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  let plan: Plan = DEFAULT_PLAN;
  if (args.plan) {
    plan = parsePlan(JSON.parse(readFileSync(args.plan, 'utf8')));
  }
  const state = runGame(createGame({ seed: args.seed, nightsToSurvive: args.nights }), plan);
  if (args.json) {
    process.stdout.write(JSON.stringify(state.log, null, 2) + '\n');
  } else if (args.verbose) {
    process.stdout.write(formatVerbose(state, args.seed) + '\n');
  } else {
    process.stdout.write(formatGame(state, args.seed) + '\n');
  }
  return state.status === 'won' ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n${USAGE}`);
  process.exitCode = 2;
}
