/**
 * Field-guide copy for the bestiary (MM-25). Each plate has a mock-Latin
 * binomial and a field note that doubles as the tutorial for that resident.
 * Habits come from the sim's own quirk descriptions, so the guide cannot
 * drift from the rules.
 */
import type { Archetype } from '../../sim/types.ts';

export interface PlateCopy {
  binomial: string;
  note: string;
}

export const PLATES: Record<Exclude<Archetype, 'fledgling'>, PlateCopy> = {
  count: {
    binomial: 'Sanguisuga nobilis',
    note: 'Feed him at night or he starves; nothing else fills him. Keep him out of daylight. His charm wins villagers over, but every evening out is talked about.',
  },
  wolfman: {
    binomial: 'Lupus intermittens',
    note: 'Plan around every seventh night. Never send him to work under a full moon. He alone of the original household can take a day shift.',
  },
  golem: {
    binomial: 'Homo argillaceus',
    note: 'Keep the lightning rod standing or he cannot recharge. Expect breakages and schedule repairs. Company is wasted on him; he does not mind.',
  },
  mummy: {
    binomial: 'Fasciatus perennis',
    note: 'Everything takes him two nights. Give him a sarcophagus to rewrap in, and never let anyone else move his collection.',
  },
  invisible: {
    binomial: 'Homo pellucidus',
    note: 'Left at home he plays pranks on the household. Send him out instead; hardly anyone notices what he does.',
  },
  lakeling: {
    binomial: 'Rana lacustris maior',
    note: 'He must stay wet. Keep the tub in one piece and let him soak, and accept that the hall will flood.',
  },
  phantom: {
    binomial: 'Larva musica',
    note: 'Only music amuses him: buy a pipe organ. Do not let his temper reach the chandelier.',
  },
  bride: {
    binomial: 'Sponsa fulminata',
    note: 'Runs on the lightning rod. Never assign her the same task as the Golem; nobody asked her.',
  },
  hunchback: {
    binomial: 'Campanarius gibbosus',
    note: 'The steadiest cover job in the house, and the village is fond of him. Let him rest on the roof among the gargoyles.',
  },
  gwyllgi: {
    binomial: 'Canis tenebrarum',
    note: 'Do not send him into the village; a black dog on the road frightens people. Only the household counts as company.',
  },
  cwnannwn: {
    binomial: 'Canes Annuvii',
    note: 'Every third night the hunt rides and whatever you planned for them is lost. The whole valley hears it.',
  },
  gwrach: {
    binomial: 'Ululatrix vallis',
    note: 'Calm villagers are safe from her. Frightened ones get a visit at the window before dawn.',
  },
};

export function romanNumeral(n: number): string {
  const table: Array<[number, string]> = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let rest = n;
  for (const [v, s] of table) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}
