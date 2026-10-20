export interface CliArgs {
  seed: number;
  plan?: string;
  save?: string;
  load?: string;
  until?: number;
  nights: number;
  json: boolean;
  verbose: boolean;
  help: boolean;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { seed: 42, nights: 7, json: false, verbose: false, help: false };
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
      case '--save':
        args.save = next();
        break;
      case '--load':
        args.load = next();
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
  --nights N     Nights to survive (default 7).
  --until N      Stop after night N without finishing the run (pair with --save).
  --save FILE    Write a save (seed, options, plan history) when the run stops.
  --load FILE    Resume from a save, then keep playing with the plan.
  --verbose, -v  One plain-English line per event, grouped by night and phase.
  --json         Print the raw Event[] log instead of prose.
`;
