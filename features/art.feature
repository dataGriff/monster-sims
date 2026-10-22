Feature: Art direction
  The manor is drawn procedurally in a monochrome, leaning, theatre-set style
  with one accent colour per resident (docs/art-direction.md). These scenarios
  draw onto a recording canvas, so they run without a browser.

  Scenario: Every resident has their own figure
    Then every playable archetype and the turned fledgling has a figure drawer
    And each draws in the idle, walk, act and asleep poses without bad coordinates
    And each draws in the stage, plate and shadow styles
    And no two archetypes draw the same figure

  Scenario: Reduced motion holds every figure still
    When a walking figure is drawn at two different moments with animation off
    Then both drawings are identical
    But with animation on they differ

  Scenario: Everything the house can hold has a drawing
    Then every piece of furniture any household starts with has its own drawer
    And every item in the build catalogue draws as an icon

  Scenario: The stage is deterministic
    Given seed 42 after one night
    When the stage is drawn twice for the same frame
    Then both drawings are identical and contain no bad coordinates
    And with animation off, two different frames are identical too

  Scenario: Every kind of night draws
    Then the stage draws at dusk, at night and by day
    And with the mob gathered, the hunter in town and every defence built
    And in the valley with the Welsh household
    And with a broken lightning rod and broken furniture
    And every resident on stage gets a hit box for hover captions

  Scenario: Hover finds the resident under the pointer
    Given the stage has been drawn
    Then pointing at a resident's hit box finds that resident
    And pointing at empty sky finds nobody

  Scenario: Accents stay legible on the dark stage
    Then every playable archetype's accent has at least 3:1 contrast against ink
    And every accent is distinct

  Scenario: The moon is drawn to its phase
    Then the full moon is fully lit and the new moon almost dark
    And waxing phases grow
    And every phase has an SVG path for the HUD

  Scenario: The field guide has a plate for every resident
    Then every playable archetype has a binomial and a field note
    And plates are numbered in Roman numerals

  Scenario: Title cards letter any title
    Then a one-line and a two-line title card both draw
