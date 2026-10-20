Feature: The manor and its rooms
  Rooms have windows facing the village. A lit window at night is exposure,
  and exposure is what Van Helsing and the mob point at.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: Exposure counts windows, light and wreckage
    Then the parlour's exposure is 30 and the kitchen's is 20
    When the kitchen is lit
    Then the kitchen's exposure is 35
    When the piano is broken
    Then the parlour's exposure is 35
    And the crypt's exposure is 0

  Scenario: The most exposed room is the one with the most windows, until something changes
    Then the most exposed room is the parlour

  Scenario: Acting in a room at night lights it and the village sees
    When the Wolf Man feeds and the Golem sleeps for a full night
    Then the kitchen and the workshop were lit
    And the log says "Lamplight showed in the kitchen and the workshop"
    And the night ends with Suspicion 32
    When the next dusk falls
    Then no room is lit

  Scenario: Lying low keeps every light off
    When everyone lies low for a full night
    Then the log does not say "Lamplight"
    And the night ends with Suspicion 21

  Scenario: Some rooms have a secret passage
    Then the crypt has a secret passage
    And the kitchen does not
