/**
 * Story events (MM-28): scripted collisions that fire at dusk, one at most per
 * night, each once per run, with a branch chosen on the plan (`choices`) or
 * the first branch by default.
 */
import { addSuspicion, adjustNeed, emit, isFullMoon, type Ctx } from './context.ts';
import { advanceBond } from './townies.ts';
import type { GameState, Monster, NightPlan, Townie } from './types.ts';

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
        label: 'The Count abandons his shift to sit with the Wolf Man',
        apply: (ctx) => {
          const count = find(ctx.state, 'count')!;
          count.assignedAction = 'lieLow';
          addSuspicion(ctx, -8);
          return 'The Count sent word he was unwell and sat up with the Wolf Man instead. Fewer howls reached the village (Suspicion -8).';
        },
      },
      {
        id: 'leaveHim',
        label: 'The Count goes to work and leaves him to it',
        apply: () => 'The Count went to work. Whatever happened at home, he was elsewhere, and said so to anyone who asked.',
      },
    ],
  },
  {
    id: 'lostTraveller',
    title: 'A lost traveller at the door',
    when: (s) => s.night >= 2 && s.village.suspicion < 70,
    choices: [
      {
        id: 'turnAway',
        label: 'Turn them away',
        apply: (ctx) => {
          addSuspicion(ctx, 2);
          return 'The traveller was sent back down the lane in the dark. They will mention the unfriendly house (Suspicion +2).';
        },
      },
      {
        id: 'takeIn',
        label: 'Give them a bed',
        apply: (ctx) => {
          everyone(ctx, 'social', 10);
          ctx.state.pendingSuspicion -= 2;
          return 'The traveller had soup in the kitchen and left at first light speaking well of the place (everyone social +10, Suspicion -2).';
        },
      },
      {
        id: 'feedOnThem',
        label: 'The Count takes care of it',
        apply: (ctx) => {
          const count = find(ctx.state, 'count');
          if (!count) return 'There was nobody in the house inclined to take care of it, so the traveller was turned away.';
          adjustNeed(ctx, count, 'hunger', 40, 'feed');
          addSuspicion(ctx, 10);
          return 'The Count took care of it. The traveller was seen arriving and not seen leaving (Count hunger +40, Suspicion +10).';
        },
      },
    ],
  },
  {
    id: 'villageFete',
    title: 'The village fête',
    when: (s) => s.village.suspicion >= 40 && s.monsters.some((m) => m.daylightActive),
    choices: [
      {
        id: 'sendSomeone',
        label: 'Send whoever can bear daylight',
        apply: (ctx) => {
          const walker = ctx.state.monsters.find((m) => m.daylightActive)!;
          adjustNeed(ctx, walker, 'fun', 15, 'quirk');
          addSuspicion(ctx, -8);
          return `${walker.name} went to the fête, lost at the coconut shy and was seen to be an ordinary person (fun +15, Suspicion -8).`;
        },
      },
      {
        id: 'stayHome',
        label: 'Nobody goes',
        apply: (ctx) => {
          addSuspicion(ctx, 3);
          return 'The manor sent nobody and no cake. People noticed (Suspicion +3).';
        },
      },
    ],
  },
  {
    id: 'censusTaker',
    title: 'The census taker',
    when: (s) => s.night >= 3,
    choices: [
      {
        id: 'answerTheDoor',
        label: 'Answer the door',
        apply: (ctx) => {
          const inv = find(ctx.state, 'invisible');
          if (inv) {
            addSuspicion(ctx, -5);
            return 'The Invisible Man answered in his hat and scarf and gave the dullest possible account of the household. The form says "gentleman, retired" (Suspicion -5).';
          }
          addSuspicion(ctx, 4);
          return `${first(ctx.state)?.name ?? 'Somebody'} answered the door and the census taker left with a form full of crossings-out (Suspicion +4).`;
        },
      },
      {
        id: 'pretendOut',
        label: 'Pretend nobody is home',
        apply: (ctx) => {
          addSuspicion(ctx, 2);
          return 'The census taker knocked for a long time. "Unoccupied", he wrote, underlining it (Suspicion +2).';
        },
      },
    ],
  },
  {
    id: 'pianoTuner',
    title: 'The piano tuner calls',
    when: (s) => s.night >= 2 && s.house.furniture.some((f) => f.id === 'piano' && !f.broken),
    choices: [
      {
        id: 'letHimIn',
        label: 'Let him in',
        apply: (ctx) => {
          everyone(ctx, 'fun', 5);
          addSuspicion(ctx, 3);
          return 'The piano is in tune for the first time in a century. The tuner left humming and talking (everyone fun +5, Suspicion +3).';
        },
      },
      { id: 'sendAway', label: 'Send him away', apply: () => 'The piano tuner was told the instrument was not for tuning and went away puzzled.' },
    ],
  },
  {
    id: 'chimneySweep',
    title: 'The chimney sweep',
    when: (s) => s.night >= 2,
    choices: [
      {
        id: 'letHimUp',
        label: 'Let him up the flues',
        apply: (ctx) => {
          everyone(ctx, 'comfort', 5);
          addSuspicion(ctx, 6);
          return 'The flues draw beautifully now. The sweep came down the crypt chimney and did not stay for tea (everyone comfort +5, Suspicion +6).';
        },
      },
      {
        id: 'turnAway',
        label: 'Not today',
        apply: (ctx) => {
          addSuspicion(ctx, 1);
          return 'The sweep was turned away and the kitchen smoked all evening (Suspicion +1).';
        },
      },
    ],
  },
  {
    id: 'breadDelivery',
    title: 'The bread round',
    when: (s) => notAlly(townie(s, 'baker')),
    choices: [
      {
        id: 'tip',
        label: 'Tip the baker',
        apply: (ctx) => {
          const baker = townie(ctx.state, 'baker')!;
          ctx.state.house.coin = Math.max(0, ctx.state.house.coin - 3);
          baker.awareness = Math.max(0, baker.awareness - 10);
          return 'The baker was tipped handsomely for the bread and decided the household was eccentric but generous (3 coin, baker less wary).';
        },
      },
      {
        id: 'noAnswer',
        label: 'Leave the bread on the step',
        apply: (ctx) => {
          const baker = townie(ctx.state, 'baker')!;
          baker.awareness = Math.min(100, baker.awareness + 5);
          return 'The bread sat on the step until dusk. The baker noticed (baker more wary).';
        },
      },
    ],
  },
  {
    id: 'lightningStorm',
    title: 'A storm over the manor',
    urgent: true,
    when: (s) => s.night >= 2 && s.monsters.some((m) => m.quirks.includes('lightningPowered')),
    choices: [
      {
        id: 'raiseTheRod',
        label: 'Get everyone up on the roof with the rod',
        apply: (ctx) => {
          ctx.state.house.lightningRod = true;
          for (const m of ctx.state.monsters) if (m.quirks.includes('lightningPowered')) adjustNeed(ctx, m, 'energy', 40, 'sleep');
          return 'The storm broke over the roof and the rod sang. Anyone who runs on lightning is fizzing (energy +40, lightning rod up).';
        },
      },
      { id: 'stayInBed', label: 'Let it pass', apply: () => 'The storm passed over. The rod, if there was one, caught what it caught.' },
    ],
  },
  {
    id: 'constablesRounds',
    title: "The constable's rounds",
    when: (s) => s.village.suspicion >= 50 && notAlly(townie(s, 'constable')),
    choices: [
      {
        id: 'inviteHimIn',
        label: 'Invite him in for a drink',
        apply: (ctx) => {
          const c = townie(ctx.state, 'constable')!;
          advanceBond(c, 25, 'confidant');
          addSuspicion(ctx, 3);
          return 'The constable had a brandy in the parlour and saw nothing he could put in a report, though he will mention the brandy (constable warmer, Suspicion +3).';
        },
      },
      {
        id: 'doorStaysShut',
        label: 'Keep the door shut',
        apply: (ctx) => {
          const c = townie(ctx.state, 'constable')!;
          c.awareness = Math.min(100, c.awareness + 15);
          return 'The constable walked the length of the wall with his lantern and went away thinking (constable more wary).';
        },
      },
    ],
  },
  {
    id: 'strayDog',
    title: 'A stray dog follows the Wolf Man home',
    when: (s) => has(s, 'wolfman'),
    choices: [
      {
        id: 'keepIt',
        label: 'Keep it',
        apply: (ctx) => {
          const w = find(ctx.state, 'wolfman')!;
          adjustNeed(ctx, w, 'social', 20, 'quirk');
          adjustNeed(ctx, w, 'comfort', 5, 'quirk');
          return 'The dog has taken to sleeping across the Wolf Man\'s feet and treats him as a slightly larger dog (Wolf Man social +20, comfort +5).';
        },
      },
      {
        id: 'shooIt',
        label: 'Shoo it away',
        apply: (ctx) => {
          const w = find(ctx.state, 'wolfman')!;
          adjustNeed(ctx, w, 'anger', 5, 'quirk');
          return 'The dog was shooed off. The Wolf Man took it personally (anger +5).';
        },
      },
    ],
  },
  {
    id: 'mirrorSalesman',
    title: 'A travelling salesman with a cart of mirrors',
    when: (s) => has(s, 'count'),
    choices: [
      {
        id: 'buyOne',
        label: 'Buy one to be polite',
        apply: (ctx) => {
          ctx.state.house.coin = Math.max(0, ctx.state.house.coin - 8);
          const c = find(ctx.state, 'count')!;
          adjustNeed(ctx, c, 'anger', 10, 'quirk');
          return 'A mirror now hangs in the hall. The Count walks past it very quickly (8 coin, Count anger +10).';
        },
      },
      {
        id: 'refuse',
        label: 'Refuse',
        apply: (ctx) => {
          addSuspicion(ctx, 2);
          return 'The salesman could not understand a house with no mirrors in it and said so at the inn (Suspicion +2).';
        },
      },
    ],
  },
  {
    id: 'bandageShortage',
    title: 'A bandage shortage',
    when: (s) => has(s, 'mummy') || has(s, 'invisible'),
    choices: [
      {
        id: 'buyFromApothecary',
        label: 'Buy from the apothecary',
        apply: (ctx) => {
          ctx.state.house.coin = Math.max(0, ctx.state.house.coin - 6);
          const a = townie(ctx.state, 'apothecary');
          if (a) advanceBond(a, 10, 'confidant');
          return 'The apothecary sold the manor every bandage in the shop and asked no questions, which is a kind of friendship (6 coin).';
        },
      },
      {
        id: 'tearSheets',
        label: 'Tear up the sheets',
        apply: (ctx) => {
          everyone(ctx, 'comfort', -10);
          return 'The good linen is now in strips. Nobody is sleeping well (everyone comfort -10).';
        },
      },
    ],
  },
  {
    id: 'disturbedGraves',
    title: 'The sexton notices disturbed graves',
    when: (s) => has(s, 'golem') && notAlly(townie(s, 'sexton')),
    choices: [
      {
        id: 'blameFoxes',
        label: 'Blame foxes',
        apply: (ctx) => {
          addSuspicion(ctx, 4);
          return 'Foxes, the household said. Very large foxes, the sexton said (Suspicion +4).';
        },
      },
      {
        id: 'golemLiesLow',
        label: 'The Golem stays in for a while',
        apply: (ctx) => {
          const g = find(ctx.state, 'golem')!;
          g.assignedAction = 'lieLow';
          ctx.state.pendingSuspicion -= 2;
          return 'The Golem stayed in and the graves stayed put. The sexton calmed down (Suspicion -2).';
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
        label: 'Throw it back',
        apply: (ctx) => {
          addSuspicion(ctx, -3);
          return 'The ball came back over the wall with a wave. The children have decided the manor is all right (Suspicion -3).';
        },
      },
      {
        id: 'keepIt',
        label: 'Keep it',
        apply: (ctx) => {
          const m = first(ctx.state);
          if (m) adjustNeed(ctx, m, 'fun', 10, 'quirk');
          addSuspicion(ctx, 3);
          return `${m?.name ?? 'Somebody'} kept the ball. The children have decided the manor is not all right (fun +10, Suspicion +3).`;
        },
      },
    ],
  },
  {
    id: 'innOutOfBeer',
    title: 'The inn has run dry',
    when: (s) => s.monsters.some((m) => m.assignedAction === 'socialise'),
    choices: [
      {
        id: 'drinkAtHome',
        label: 'Make a night of it at home instead',
        apply: (ctx) => {
          for (const m of ctx.state.monsters) if (m.assignedAction === 'socialise') m.assignedAction = 'gameNight';
          return 'With the inn dry, the evening moved to the parlour (socialising became a game night).';
        },
      },
      {
        id: 'goAnyway',
        label: 'Go anyway',
        apply: (ctx) => {
          for (const m of ctx.state.monsters) if (m.assignedAction === 'socialise') adjustNeed(ctx, m, 'fun', -10, 'quirk');
          return 'A dry inn is a long evening (socialisers fun -10).';
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
        label: 'Close the shutters',
        apply: (ctx) => {
          addSuspicion(ctx, -2);
          return 'Forty children filed past a perfectly ordinary shuttered house (Suspicion -2).';
        },
      },
      {
        id: 'wave',
        label: 'Wave',
        apply: (ctx) => {
          const m = first(ctx.state);
          addSuspicion(ctx, 5);
          return `${m?.name ?? 'Somebody'} waved from an upstairs window. Forty children waved back and went home with questions (Suspicion +5).`;
        },
      },
    ],
  },
  {
    id: 'ferrymanOffer',
    title: 'The ferryman offers a night on the river',
    when: (s) => {
      const f = townie(s, 'ferryman');
      return !!f && f.relationship !== 'stranger' && f.relationship !== 'turned';
    },
    choices: [
      {
        id: 'tripDownriver',
        label: 'Somebody goes',
        apply: (ctx) => {
          const m = first(ctx.state);
          if (!m) return 'There was nobody to go.';
          m.assignedAction = 'lieLow';
          ctx.state.pendingSuspicion -= 5;
          adjustNeed(ctx, m, 'fun', 15, 'quirk');
          return `${m.name} spent the night on the water with the ferryman, miles from anyone's window (fun +15, Suspicion -5).`;
        },
      },
      { id: 'decline', label: 'Decline', apply: () => 'The ferryman was thanked and went downriver alone.' },
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
        label: 'Everyone takes a spoonful',
        apply: (ctx) => {
          everyone(ctx, 'hygiene', 20);
          return 'The remedy smells of tar and lavender and everyone is somehow cleaner for it (everyone hygiene +20).';
        },
      },
      { id: 'decline', label: 'Pour it away', apply: () => 'The remedy went down the drain and killed something in the moat.' },
    ],
  },
  {
    id: 'villageWedding',
    title: 'A wedding in the village',
    when: (s) => s.night >= 4,
    choices: [
      {
        id: 'attend',
        label: 'The household attends',
        apply: (ctx) => {
          everyone(ctx, 'social', 10);
          addSuspicion(ctx, -6);
          return 'The household stood at the back of the chapel and gave a very good present. People remember the present (everyone social +10, Suspicion -6).';
        },
      },
      {
        id: 'stayHome',
        label: 'Stay home while the village is busy',
        apply: (ctx) => {
          ctx.state.pendingSuspicion -= 2;
          return 'With the whole village at the wedding, nobody was watching the manor for once (Suspicion -2).';
        },
      },
    ],
  },
  {
    id: 'harvestMoon',
    title: 'A harvest moon, bright but not full',
    when: (s) => s.night >= 5 && !isFullMoon(s.night) && has(s, 'wolfman'),
    choices: [
      {
        id: 'lockHimIn',
        label: 'Lock the Wolf Man in to be safe',
        apply: (ctx) => {
          const w = find(ctx.state, 'wolfman')!;
          w.assignedAction = 'lieLow';
          adjustNeed(ctx, w, 'comfort', -10, 'quirk');
          return 'The Wolf Man spent the night locked in the attic, perfectly human and very bored (comfort -10).';
        },
      },
      {
        id: 'letHimRoam',
        label: 'Let him walk',
        apply: (ctx) => {
          const w = find(ctx.state, 'wolfman')!;
          adjustNeed(ctx, w, 'fun', 20, 'quirk');
          addSuspicion(ctx, 6);
          return 'The Wolf Man walked for miles under the big moon and was seen on three farms (fun +20, Suspicion +6).';
        },
      },
    ],
  },
];

export function storyById(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

/** Dusk: fire at most one story, honouring the cooldown unless it is urgent. */
export function maybeStory(ctx: Ctx, plan: NightPlan): Story | undefined {
  const { state } = ctx;
  if (!state.options.stories) return undefined;
  const coolingDown = state.night - state.stories.lastNight < STORY_COOLDOWN;
  const story = STORIES.find((s) => !state.stories.fired.includes(s.id) && (s.urgent || !coolingDown) && s.when(state));
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
