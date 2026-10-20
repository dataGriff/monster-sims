Feature: The Lake Creature
  An original lake-dweller. He must stay wet, the tub is always full, and the
  hall floor is never quite dry.

  Background:
    Given a new game with seed 42 and Suspicion 30, with the Count, the Wolf Man and the Lake Creature

  Scenario: Wetness drains fast
    When everyone idles for a full night
    Then the Lake Creature's hygiene is 80

  Scenario: Below 20 he dries out
    Given the Lake Creature's hygiene is 30
    When everyone idles for a full night
    Then the Lake Creature's comfort is 60
    And the log says the Lake Creature "drying out"

  Scenario: A night in the tub soaks him back to full
    Given the Lake Creature's hygiene is 30
    And a seed on which the tub does not go over
    When the Lake Creature sleeps for the night
    Then the Lake Creature's hygiene is 100 after the night phase
    And the log says the Lake Creature "soaked all night"

  Scenario: Half the time the tub goes over and the hall floods
    Given a seed on which the tub goes over
    When the Lake Creature sleeps for a full night
    Then the log says "water ran out under the front door"
    And the Count's comfort is 70
    And the night ends with Suspicion 37

  Scenario: Without a tub he sleeps damp on the flagstones
    Given the claw-foot tub is broken
    And the Lake Creature's hygiene is 30
    When the Lake Creature sleeps for the night
    Then the Lake Creature's hygiene is 30 after the night phase
    And the log says the Lake Creature "no tub"

  Scenario: He feeds from the moat, not the kitchen
    When the Lake Creature feeds for a full night
    Then the log says the Lake Creature "carp"
    And the log does not say "Lamplight"
