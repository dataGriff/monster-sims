Feature: Web client view-model
  The renderer, planning UI and HUD draw only from the sim's state and events.
  The pieces that decide what to draw are pure and tested here.

  Scenario: The manor has a place for every room
    Then every room id has a cell in the isometric layout
    And isometric cells map to distinct screen points

  Scenario: Sprites follow the night's events
    Given seed 42 after one night with the Count feeding, the Wolf Man sleeping and the Golem repairing
    Then at night the Count is out, the Wolf Man is asleep in the attic and the Golem is acting in the workshop
    And by day everyone is asleep in their own room

  Scenario: The HUD reads the state
    Given a new game with seed 42 and Suspicion 30
    Then the HUD shows night 0 of 7, Suspicion 30, mood calm, 20 coin and a full moon in 7 nights
    And every monster card has eight need bars

  Scenario: The moon
    Then nights 7 and 14 are full, night 1 is new and night 6 is nearly full

  Scenario: Risk hints warn before the plan is confirmed
    Given it is the dusk of night 7
    Then assigning the Wolf Man a cover job warns of disaster
    And assigning the Golem to sleep without a lightning rod warns about energy
    And a cover job quotes its failure chance

  Scenario: Accents are distinct per archetype
    Then every playable archetype has its own accent colour
