import { DIFFICULTIES, RUN_LENGTHS, type RunLength } from '../sim/difficulty.ts';
import { PLAYABLE } from '../sim/monsters.ts';
import type { Archetype, Difficulty, Setting } from '../sim/types.ts';

export interface CliArgs {
  seed: number;
  household?: Archetype[];
  difficulty?: Difficulty;
  setting?: Setting;
  sandbox: boolean;
  stories: boolean;
  plan?: string;
  save?: string;
  load?: string;
  telemetry?: string;
  until?: number;
  nights: number;
  json: boolean;
  verbose: boolean;
  help: boolean;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { seed: 42, nights: 7, json: false, verbose: false, sandbox: false, stories: true, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} needs a value`);
      return v;
    };
    switch (arg) {
      case '--seed':
        args.seed = Number(next());
        if (!Number.isFinite(args.seed)) throw new Error('--seed must be a number');
        break;
      case '--plan':
        args.plan = next();
        break;
      case '--household': {
        const list = next().split(',').map((x) => x.trim()).filter(Boolean);
        for (const a of list) {
          if (!(PLAYABLE as readonly string[]).includes(a)) {
            throw new Error(`--household: unknown monster "${a}" (expected ${PLAYABLE.join(', ')})`);
          }
        }
        args.household = list as Archetype[];
        break;
      }
      case '--save':
        args.save = next();
        break;
      case '--load':
        args.load = next();
        break;
      case '--telemetry':
        args.telemetry = next();
        break;
      case '--until':
        args.until = Number(next());
        if (!Number.isInteger(args.until) || args.until < 1) throw new Error('--until must be a positive integer');
        break;
      case '--nights':
        args.nights = Number(next());
        if (!Number.isInteger(args.nights) || args.nights < 1) throw new Error('--nights must be a positive integer');
        break;
      case '--json':
        args.json = true;
        break;
      case '--difficulty': {
        const d = next();
        if (!(d in DIFFICULTIES)) throw new Error(`--difficulty must be one of ${Object.keys(DIFFICULTIES).join(', ')}`);
        args.difficulty = d as Difficulty;
        break;
      }
      case '--run': {
        const r = next();
        if (!(r in RUN_LENGTHS)) throw new Error(`--run must be one of ${Object.keys(RUN_LENGTHS).join(', ')}`);
        args.nights = RUN_LENGTHS[r as RunLength];
        break;
      }
      case '--sandbox':
        args.sandbox = true;
        break;
      case '--no-stories':
        args.stories = false;
        break;
      case '--setting': {
        const v = next();
        if (v !== 'manor' && v !== 'valley') throw new Error('--setting must be manor or valley');
        args.setting = v;
        break;
      }
      case '--verbose':
      case '-v':
        args.verbose = true;
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

export const USAGE = `Monster Manor (headless)

Usage: pnpm play [--seed N] [--plan plan.json] [--nights N] [--until N] [--save f] [--load f] [--verbose] [--json]

  --seed N       RNG seed (default 42). Same seed + plan = same log.
  --plan FILE    JSON dusk schedule; see plans/example.json.
  --household L  Comma list of residents from: ${PLAYABLE.join(',')}.
  --nights N     Nights to survive (default 7).
  --run R        short (7), standard (14) or long (28) nights.
  --difficulty D gentle, standard or harsh: tunes drift, rumour and the mob.
  --sandbox      The mob never ends the run.
  --no-stories   Turn off the scripted story events at dusk.
  --setting S    manor (default) or valley: the Welsh folklore village. The valley
                 defaults its household to gwyllgi,cwnannwn,gwrach.
  --until N      Stop after night N without finishing the run (pair with --save).
  --save FILE    Write a save (seed, options, plan history) when the run stops.
  --load FILE    Resume from a save, then keep playing with the plan.
  --telemetry F  Opt in: append one JSON line of run statistics to F (no
                 timestamps, no machine details). Summarise with pnpm telemetry F.
  --verbose, -v  One plain-English line per event, grouped by night and phase.
  --json         Print the raw Event[] log instead of prose.
`;
