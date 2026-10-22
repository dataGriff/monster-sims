Feature: Visual regression
  Every drawing is fingerprinted on the recording canvas and compared with
  the approved fingerprints in tests/__snapshots__/visual.spec.ts.snap. A
  deliberate change is accepted with `pnpm test -u` and reviewed in the
  diff; anything else fails. `pnpm shots` refreshes the reference images.

  Scenario: Resident figures look as approved
    Then every archetype in every pose and style matches its approved fingerprint

  Scenario: Furniture, fixtures and catalogue icons look as approved
    Then every furniture, fixture and catalogue drawing matches its approved fingerprint

  Scenario: Line icons look as approved
    Then every line icon matches its approved fingerprint

  Scenario: The stage looks as approved
    Then dusk, night, day, a siege, the valley and a title card each match their approved fingerprint
