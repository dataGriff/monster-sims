export interface CliArgs {
  seed: number;
  plan?: string;
  nights: number;
  json: boolean;
  help: boolean;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { seed: 42, nights: 7, json: false, help: false };
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
      case '--nights':
        args.nights = Number(next());
        if (!Number.isInteger(args.nights) || args.nights < 1) throw new Error('--nights must be a positive integer');
        break;
      case '--json':
        args.json = true;
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

Usage: pnpm play [--seed N] [--plan plan.json] [--nights N] [--json]

  --seed N       RNG seed (default 42). Same seed + plan = same log.
  --plan FILE    JSON dusk schedule; see plans/example.json.
  --nights N     Nights to survive (default 7).
  --json         Print the raw Event[] log instead of prose.
`;
