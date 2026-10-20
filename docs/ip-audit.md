# IP audit (MM-40)

Monster Manor draws only on folklore and public-domain literature. The
household must never read as a specific studio's version of these creatures,
in name, in text, or (once there is art) in silhouette. This document is the
checklist; `tests/ip.spec.ts` enforces the text half of it by scanning the
repository for the terms listed at the bottom and failing if any appear.

## Per-monster checklist

Each row says where the archetype comes from, what we deliberately avoid, and
what a future artist must not draw.

| Archetype | Source we rely on | Text: avoid | Silhouette: avoid |
| --- | --- | --- | --- |
| The Count | Stoker, *Dracula* (1897); European vampire folklore | Any actor's name; the "I never drink… wine" cadence; studio taglines | Widow's peak + high collared opera cape as a unit; medallion on a ribbon |
| The Wolf Man | Werewolf folklore; Marryat, Housman, Endore (1933) is *not* PD, avoid its plot | "Even a man who is pure in heart" verse; the surname of the 1941 character | Flat ape-like snout with a wedge of combed-back hair; dark work shirt and braces |
| The Golem | Prague golem legend; Meyrink, *Der Golem* (1915) | "It's alive"; the word *monster* attached to a maker's surname | Flat-topped skull, forehead scar, neck electrodes, shortened jacket sleeves |
| The Mummy | Egyptian funerary custom; Stoker, *Jewel of Seven Stars* (1903); Doyle, *Lot No. 249* (1892) | The 1932 character's names (ancient and modern); the "tana leaves" device | A specific actor's wrinkled face; fez-and-robe modern guise |
| The Invisible Man | Wells, *The Invisible Man* (1897) | Nothing beyond Wells; we do not use the character's surname | Goggles-plus-bandages is Wells's own description and fine; avoid a specific film's striped dressing gown |
| The Lake Creature | Original. Lake and river spirits of European folklore | The studio's two-word nickname for its amphibian; the title phrase containing "lagoon" | The 1954 suit: ridged head-crest, gill flares at the jaw, scaled chest plates |
| The Phantom | Leroux, *Le Fantôme de l'Opéra* (1910) | Nothing beyond Leroux | A specific film's half-mask design; we describe "a mask", never its shape |
| The Bride | Shelley, *Frankenstein* (1818), the unfinished companion | The 1935 film title; the word "bride" joined to a maker's surname | Tall hair with a lightning streak; bandaged wedding-dress |
| The Hunchback | Hugo, *Notre-Dame de Paris* (1831) | Nothing beyond Hugo; we do not use the character's name | A specific actor's make-up |
| Y Gwyllgi, Cŵn Annwn, Gwrach y Rhibyn | Welsh folklore (the *Mabinogion* for Annwn; collected tales for the others) | Nothing: no studio has a claim | n/a |
| Van Helsing / the dyn hysbys | Stoker (1897); Welsh folk tradition | Any film franchise's version of the hunter | Wide-brimmed hat and crossbow kit |

## Marketing language

- No "Universal Monsters", "Dark Universe", "Classic Monsters" as a brand.
- No film taglines, poster copy, or "the original" claims.
- The game's own tagline stays about the household and the village.

## Process

- The terms below are checked by `pnpm test` (`tests/ip.spec.ts`) against
  `src/`, `features/`, `tests/`, `plans/`, `README.md` and `docs/` (except this
  file and the imported backlog, which quotes one of them as a working title).
- Add a term here when a new archetype arrives. Add a row above too.
- Before any art lands (MM-31), re-run the silhouette column against the
  concept sheets with a second pair of eyes.

## Forbidden terms

Case-insensitive. One per line inside the fence.

```terms
Universal
Gill-man
Gillman
Gill man
Black Lagoon
Creature from the
Karloff
Lugosi
Chaney
Imhotep
Kharis
Ardeth Bey
Talbot
Bride of Frankenstein
Frankenstein's monster
neck bolt
flat-top
flattop
Dark Universe
Classic Monsters
It's alive
pure in heart
tana leaves
```
