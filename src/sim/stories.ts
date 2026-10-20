/**
 * Story events (MM-28): scripted collisions that fire at dusk, one at most per
 * night, each once per run, with a branch chosen on the plan (`choices`) or
 * the first branch by default.
 */
import { addSuspicion, adjustNeed, emit, isFullMoon, type Ctx } from './context.ts';
import { advanceBond } from './townies.ts';
import type { GameState, Monster, NightPlan, Townie } from './types.ts';
import { t as tr } from './i18n.ts';

export interface Choice {
  id: string;
  label: string;
  /** Apply the branch and return the sentence that goes in the log. */
  apply: (ctx: Ctx) => string;
}

export interface Story {
  id: string;
  title: string;
  /** Urgent stories ignore the cooldown between stories. */
  urgent?: boolean;
  when: (state: GameState) => boolean;
  choices: Choice[];
}

export const STORY_COOLDOWN = 2;

const has = (state: GameState, archetype: Monster['archetype']) => state.monsters.some((m) => m.archetype === archetype);
const find = (state: GameState, archetype: Monster['archetype']) => state.monsters.find((m) => m.archetype === archetype);
const townie = (state: GameState, id: string): Townie | undefined => state.village.townies.find((t) => t.id === id);
const notAlly = (t: Townie | undefined) => !!t && t.relationship !== 'confidant' && t.relationship !== 'thrall' && t.relationship !== 'turned';
const first = (state: GameState) => state.monsters[0];
const everyone = (ctx: Ctx, key: Parameters<typeof adjustNeed>[2], delta: number) => {
  for (const m of ctx.state.monsters) adjustNeed(ctx, m, key, delta, 'quirk');
};

export const STORIES: readonly Story[] = [
  {
    id: 'fullMoonShift',
    title: "Full moon on the Count's shift",
    urgent: true,
    when: (s) => isFullMoon(s.night) && has(s, 'wolfman') && find(s, 'count')?.assignedAction === 'coverJob',
    choices: [
      {
        id: 'sitWithHim',
        label: tr('stories.sitWithHim.1'),
        apply: (ctx) => {
          const count = find(ctx.state, 'count')!;
          count.assignedAction = 'lieLow';
          addSuspicion(ctx, -8);
          return tr('stories.sitWithHim.2');
        },
      },
      {
        id: 'leaveHim',
        label: tr('stories.leaveHim.1'),
        apply: () => tr('stories.leaveHim.2'),
      },
    ],
  },
  {
    id: 'lostTraveller',
    title: tr('stories.lostTraveller.1'),
    when: (s) => s.night >= 2 && s.village.suspicion < 70,
    choices: [
      {
        id: 'turnAway',
        label: tr('stories.turnAway.1'),
        apply: (ctx) => {
          addSuspicion(ctx, 2);
          return tr('stories.turnAway.2');
        },
      },
      {
        id: 'takeIn',
        label: tr('stories.takeIn.1'),
        apply: (ctx) => {
          everyone(ctx, 'social', 10);
          ctx.state.pendingSuspicion -= 2;
          return tr('stories.takeIn.2');
        },
      },
      {
        id: 'feedOnThem',
        label: tr('stories.feedOnThem.1'),
        apply: (ctx) => {
          const count = find(ctx.state, 'count');
          if (!count) return tr('stories.feedOnThem.2');
          adjustNeed(ctx, count, 'hunger', 40, 'feed');
          addSuspicion(ctx, 10);
          return tr('stories.feedOnThem.3');
        },
      },
    ],
  },
  {
    id: 'villageFete',
    title: tr('stories.villageFete.1'),
    when: (s) => s.village.suspicion >= 40 && s.monsters.some((m) => m.daylightActive),
    choices: [
      {
        id: 'sendSomeone',
        label: tr('stories.sendSomeone.1'),
        apply: (ctx) => {
          const walker = ctx.state.monsters.find((m) => m.daylightActive)!;
          adjustNeed(ctx, walker, 'fun', 15, 'quirk');
          addSuspicion(ctx, -8);
          return tr('stories.sendSomeone.2', { name: walker.name });
        },
      },
      {
        id: 'stayHome',
        label: tr('stories.stayHome.1'),
        apply: (ctx) => {
          addSuspicion(ctx, 3);
          return tr('stories.stayHome.2');
        },
      },
    ],
  },
  {
    id: 'censusTaker',
    title: tr('stories.censusTaker.1'),
    when: (s) => s.night >= 3,
    choices: [
      {
        id: 'answerTheDoor',
        label: tr('stories.answerTheDoor.1'),
        apply: (ctx) => {
          const inv = find(ctx.state, 'invisible');
          if (inv) {
            addSuspicion(ctx, -5);
            return tr('stories.answerTheDoor.2');
          }
          addSuspicion(ctx, 4);
          return tr('stories.answerTheDoor.3', { v: first(ctx.state)?.name ?? 'Somebody' });
        },
      },
      {
        id: 'pretendOut',
        label: tr('stories.pretendOut.1'),
        apply: (ctx) => {
          addSuspicion(ctx, 2);
          return tr('stories.pretendOut.2');
        },
      },
    ],
  },
  {
    id: 'pianoTuner',
    title: tr('stories.pianoTuner.1'),
    when: (s) => s.night >= 2 && s.house.furniture.some((f) => f.id === 'piano' && !f.broken),
    choices: [
      {
        id: 'letHimIn',
        label: tr('stories.letHimIn.1'),
        apply: (ctx) => {
          everyone(ctx, 'fun', 5);
          addSuspicion(ctx, 3);
          return tr('stories.letHimIn.2');
        },
      },
      { id: 'sendAway', label: tr('stories.sendAway.1'), apply: () => tr('stories.sendAway.2') },
    ],
  },
  {
    id: 'chimneySweep',
    title: tr('stories.chimneySweep.1'),
    when: (s) => s.night >= 2,
    choices: [
      {
        id: 'letHimUp',
        label: tr('stories.letHimUp.1'),
        apply: (ctx) => {
          everyone(ctx, 'comfort', 5);
          addSuspicion(ctx, 6);
          return tr('stories.letHimUp.2');
        },
      },
      {
        id: 'turnAway',
        label: tr('stories.turnAway.3'),
        apply: (ctx) => {
          addSuspicion(ctx, 1);
          return tr('stories.turnAway.4');
        },
      },
    ],
  },
  {
    id: 'breadDelivery',
    title: tr('stories.breadDelivery.1'),
    when: (s) => notAlly(townie(s, 'baker')),
    choices: [
      {
        id: 'tip',
        label: tr('stories.tip.1'),
        apply: (ctx) => {
          const baker = townie(ctx.state, 'baker')!;
          ctx.state.house.coin = Math.max(0, ctx.state.house.coin - 3);
          baker.awareness = Math.max(0, baker.awareness - 10);
          return tr('stories.tip.2');
        },
      },
      {
        id: 'noAnswer',
        label: tr('stories.noAnswer.1'),
        apply: (ctx) => {
          const baker = townie(ctx.state, 'baker')!;
          baker.awareness = Math.min(100, baker.awareness + 5);
          return tr('stories.noAnswer.2');
        },
      },
    ],
  },
  {
    id: 'lightningStorm',
    title: tr('stories.lightningStorm.1'),
    urgent: true,
    when: (s) => s.night >= 2 && s.monsters.some((m) => m.quirks.includes('lightningPowered')),
    choices: [
      {
        id: 'raiseTheRod',
        label: tr('stories.raiseTheRod.1'),
        apply: (ctx) => {
          ctx.state.house.lightningRod = true;
          for (const m of ctx.state.monsters) if (m.quirks.includes('lightningPowered')) adjustNeed(ctx, m, 'energy', 40, 'sleep');
          return tr('stories.raiseTheRod.2');
        },
      },
      { id: 'stayInBed', label: tr('stories.stayInBed.1'), apply: () => tr('stories.stayInBed.2') },
    ],
  },
  {
    id: 'constablesRounds',
    title: "The constable's rounds",
    when: (s) => s.village.suspicion >= 50 && notAlly(townie(s, 'constable')),
    choices: [
      {
        id: 'inviteHimIn',
        label: tr('stories.inviteHimIn.1'),
        apply: (ctx) => {
          const c = townie(ctx.state, 'constable')!;
          advanceBond(c, 25, 'confidant');
          addSuspicion(ctx, 3);
          return tr('stories.inviteHimIn.2');
        },
      },
      {
        id: 'doorStaysShut',
        label: tr('stories.doorStaysShut.1'),
        apply: (ctx) => {
          const c = townie(ctx.state, 'constable')!;
          c.awareness = Math.min(100, c.awareness + 15);
          return tr('stories.doorStaysShut.2');
        },
      },
    ],
  },
  {
    id: 'strayDog',
    title: tr('stories.strayDog.1'),
    when: (s) => has(s, 'wolfman'),
    choices: [
      {
        id: 'keepIt',
        label: 'Keep it',
        apply: (ctx) => {
          const w = find(ctx.state, 'wolfman')!;
          adjustNeed(ctx, w, 'social', 20, 'quirk');
          adjustNeed(ctx, w, 'comfort', 5, 'quirk');
          return tr('stories.keepIt.1');
        },
      },
      {
        id: 'shooIt',
        label: tr('stories.shooIt.1'),
        apply: (ctx) => {
          const w = find(ctx.state, 'wolfman')!;
          adjustNeed(ctx, w, 'anger', 5, 'quirk');
          return tr('stories.shooIt.2');
        },
      },
    ],
  },
  {
    id: 'mirrorSalesman',
    title: tr('stories.mirrorSalesman.1'),
    when: (s) => has(s, 'count'),
    choices: [
      {
        id: 'buyOne',
        label: tr('stories.buyOne.1'),
        apply: (ctx) => {
          ctx.state.house.coin = Math.max(0, ctx.state.house.coin - 8);
          const c = find(ctx.state, 'count')!;
          adjustNeed(ctx, c, 'anger', 10, 'quirk');
          return tr('stories.buyOne.2');
        },
      },
      {
        id: 'refuse',
        label: 'Refuse',
        apply: (ctx) => {
          addSuspicion(ctx, 2);
          return tr('stories.refuse.1');
        },
      },
    ],
  },
  {
    id: 'bandageShortage',
    title: tr('stories.bandageShortage.1'),
    when: (s) => has(s, 'mummy') || has(s, 'invisible'),
    choices: [
      {
        id: 'buyFromApothecary',
        label: tr('stories.buyFromApothecary.1'),
        apply: (ctx) => {
          ctx.state.house.coin = Math.max(0, ctx.state.house.coin - 6);
          const a = townie(ctx.state, 'apothecary');
          if (a) advanceBond(a, 10, 'confidant');
          return tr('stories.buyFromApothecary.2');
        },
      },
      {
        id: 'tearSheets',
        label: tr('stories.tearSheets.1'),
        apply: (ctx) => {
          everyone(ctx, 'comfort', -10);
          return tr('stories.tearSheets.2');
        },
      },
    ],
  },
  {
    id: 'disturbedGraves',
    title: tr('stories.disturbedGraves.1'),
    when: (s) => has(s, 'golem') && notAlly(townie(s, 'sexton')),
    choices: [
      {
        id: 'blameFoxes',
        label: tr('stories.blameFoxes.1'),
        apply: (ctx) => {
          addSuspicion(ctx, 4);
          return tr('stories.blameFoxes.2');
        },
      },
      {
        id: 'golemLiesLow',
        label: tr('stories.golemLiesLow.1'),
        apply: (ctx) => {
          const g = find(ctx.state, 'golem')!;
          g.assignedAction = 'lieLow';
          ctx.state.pendingSuspicion -= 2;
          return tr('stories.golemLiesLow.2');
        },
      },
    ],
  },
  {
    id: 'childsBall',
    title: "A child's ball comes over the wall",
    when: (s) => s.night >= 2,
    choices: [
      {
        id: 'throwItBack',
        label: tr('stories.throwItBack.1'),
        apply: (ctx) => {
          addSuspicion(ctx, -3);
          return tr('stories.throwItBack.2');
        },
      },
      {
        id: 'keepIt',
        label: 'Keep it',
        apply: (ctx) => {
          const m = first(ctx.state);
          if (m) adjustNeed(ctx, m, 'fun', 10, 'quirk');
          addSuspicion(ctx, 3);
          return tr('stories.keepIt.2', { v: m?.name ?? 'Somebody' });
        },
      },
    ],
  },
  {
    id: 'innOutOfBeer',
    title: tr('stories.innOutOfBeer.1'),
    when: (s) => s.monsters.some((m) => m.assignedAction === 'socialise'),
    choices: [
      {
        id: 'drinkAtHome',
        label: tr('stories.drinkAtHome.1'),
        apply: (ctx) => {
          for (const m of ctx.state.monsters) if (m.assignedAction === 'socialise') m.assignedAction = 'gameNight';
          return tr('stories.drinkAtHome.2');
        },
      },
      {
        id: 'goAnyway',
        label: tr('stories.goAnyway.1'),
        apply: (ctx) => {
          for (const m of ctx.state.monsters) if (m.assignedAction === 'socialise') adjustNeed(ctx, m, 'fun', -10, 'quirk');
          return tr('stories.goAnyway.2');
        },
      },
    ],
  },
  {
    id: 'natureWalk',
    title: "The schoolmistress's nature walk goes past the gate",
    when: (s) => s.village.suspicion >= 40 && notAlly(townie(s, 'schoolmistress')),
    choices: [
      {
        id: 'closeShutters',
        label: tr('stories.closeShutters.1'),
        apply: (ctx) => {
          addSuspicion(ctx, -2);
          return tr('stories.closeShutters.2');
        },
      },
      {
        id: 'wave',
        label: 'Wave',
        apply: (ctx) => {
          const m = first(ctx.state);
          addSuspicion(ctx, 5);
          return tr('stories.wave.1', { v: m?.name ?? 'Somebody' });
        },
      },
    ],
  },
  {
    id: 'ferrymanOffer',
    title: tr('stories.ferrymanOffer.1'),
    when: (s) => {
      const f = townie(s, 'ferryman');
      return !!f && f.relationship !== 'stranger' && f.relationship !== 'turned';
    },
    choices: [
      {
        id: 'tripDownriver',
        label: tr('stories.tripDownriver.1'),
        apply: (ctx) => {
          const m = first(ctx.state);
          if (!m) return tr('stories.tripDownriver.2');
          m.assignedAction = 'lieLow';
          ctx.state.pendingSuspicion -= 5;
          adjustNeed(ctx, m, 'fun', 15, 'quirk');
          return tr('stories.tripDownriver.3', { name: m.name });
        },
      },
      { id: 'decline', label: 'Decline', apply: () => tr('stories.decline.1') },
    ],
  },
  {
    id: 'apothecaryRemedy',
    title: "The apothecary's remedy",
    when: (s) => {
      const a = townie(s, 'apothecary');
      return !!a && a.relationship !== 'stranger' && a.relationship !== 'turned';
    },
    choices: [
      {
        id: 'takeIt',
        label: tr('stories.takeIt.1'),
        apply: (ctx) => {
          everyone(ctx, 'hygiene', 20);
          return tr('stories.takeIt.2');
        },
      },
      { id: 'decline', label: tr('stories.decline.2'), apply: () => tr('stories.decline.3') },
    ],
  },
  {
    id: 'villageWedding',
    title: tr('stories.villageWedding.1'),
    when: (s) => s.night >= 4,
    choices: [
      {
        id: 'attend',
        label: tr('stories.attend.1'),
        apply: (ctx) => {
          everyone(ctx, 'social', 10);
          addSuspicion(ctx, -6);
          return tr('stories.attend.2');
        },
      },
      {
        id: 'stayHome',
        label: tr('stories.stayHome.3'),
        apply: (ctx) => {
          ctx.state.pendingSuspicion -= 2;
          return tr('stories.stayHome.4');
        },
      },
    ],
  },
  {
    id: 'harvestMoon',
    title: tr('stories.harvestMoon.1'),
    when: (s) => s.night >= 5 && !isFullMoon(s.night) && has(s, 'wolfman'),
    choices: [
      {
        id: 'lockHimIn',
        label: tr('stories.lockHimIn.1'),
        apply: (ctx) => {
          const w = find(ctx.state, 'wolfman')!;
          w.assignedAction = 'lieLow';
          adjustNeed(ctx, w, 'comfort', -10, 'quirk');
          return tr('stories.lockHimIn.2');
        },
      },
      {
        id: 'letHimRoam',
        label: tr('stories.letHimRoam.1'),
        apply: (ctx) => {
          const w = find(ctx.state, 'wolfman')!;
          adjustNeed(ctx, w, 'fun', 20, 'quirk');
          addSuspicion(ctx, 6);
          return tr('stories.letHimRoam.2');
        },
      },
    ],
  },
];

export function storyById(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

/** The story that would fire at this dusk, if any, without firing it. */
export function pendingStory(state: GameState): Story | undefined {
  if (!state.options.stories) return undefined;
  const coolingDown = state.night - state.stories.lastNight < STORY_COOLDOWN;
  return STORIES.find((s) => !state.stories.fired.includes(s.id) && (s.urgent || !coolingDown) && s.when(state));
}

/** Dusk: fire at most one story, honouring the cooldown unless it is urgent. */
export function maybeStory(ctx: Ctx, plan: NightPlan): Story | undefined {
  const { state } = ctx;
  const story = pendingStory(state);
  if (!story) return undefined;
  const wanted = plan.choices?.[story.id];
  const choice = story.choices.find((c) => c.id === wanted) ?? story.choices[0]!;
  const text = choice.apply(ctx);
  state.stories.fired.push(story.id);
  state.stories.lastNight = state.night;
  emit(ctx, 'story', `${story.title}: ${text}`, {
    data: { story: story.id, choice: choice.id, options: story.choices.map((c) => c.id).join(',') },
  });
  return story;
}
