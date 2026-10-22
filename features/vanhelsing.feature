Feature: Van Helsing
  At Suspicion 70 a man who knows about these things takes a room at the inn.
  Each dawn he snoops the most exposed room. He can be distracted, befriended,
  sent packing, or, with enough charm, turned.

  Background:
    Given a new game with seed 42

  Scenario: He arrives at 70
    Given Suspicion is 70
    When everyone idles for a full night
    Then Van Helsing is in the village
    And the log says "taken a room at the inn"

  Scenario: He snoops the most exposed room unless someone lies low
    Given Suspicion is 70
    When everyone idles for a full night
    Then the log says "snooped around the parlour"
    And the night ends with Suspicion 77
    When the Count lies low for a full night
    Then the log says "found the curtains drawn"

  Scenario: A secret passage leaves him nothing to find
    Given Suspicion is 70
    And no room but the crypt is exposed
    When everyone idles for a full night
    Then the log says "nothing but a draught"
    And the night ends with Suspicion 67

  Scenario: He can be distracted by a good talker
    Given Suspicion is 70 and Van Helsing is already in the village
    And a seed on which the Wolf Man bumps into Van Helsing
    When the Wolf Man socialises for a full night
    Then the log says "snooped nowhere"
    And the night ends with Suspicion 76

  Scenario: A befriended hunter stops snooping
    Given Suspicion is 70 and Van Helsing is already in the village
    And Van Helsing is a confidant of the manor
    When everyone idles for a full night
    Then the log does not say "snooped"
    And the night ends with Suspicion 67

  Scenario: He leaves when Suspicion drops below 50
    Given Suspicion is 45 and Van Helsing is already in the village
    When everyone idles for a full night
    Then the log says "left on the morning coach"
    And Van Helsing is not in the village

  Scenario: He can be turned
    Given Suspicion is 70 and Van Helsing is already in the village
    And Van Helsing is a thrall of the manor
    When the Count socialises for a full night
    Then the household includes "The Monster hunter (turned)"
