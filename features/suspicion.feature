Feature: Village Suspicion
  Suspicion is the antagonist. It creeps up every night, crosses thresholds
  that change how the village behaves, and at 100 the game is over.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: Thresholds
    Then Suspicion 39 means the village is calm
    And Suspicion 40 means gossip
    And Suspicion 70 means Van Helsing is snooping
    And Suspicion 90 means the mob gathers
    And Suspicion 100 means the mob is at the door

  Scenario: Rumour drifts upward every night
    When everyone idles for a full night
    Then the night ends with Suspicion 34

  Scenario: Crossing 40 starts the gossip
    Given Suspicion is 38
    When everyone idles for a full night
    Then the night ends with Suspicion 42
    And the log says "Gossip about the manor spreads"

  Scenario: Gossip makes cover jobs riskier and allies make them safer
    Then the Count's cover job fails 20% of the time at Suspicion 30
    And the Count's cover job fails 30% of the time at Suspicion 45
    And the Count's cover job fails 15% of the time at Suspicion 30 with one ally

  Scenario: A successful cover job lowers Suspicion
    Given a seed on which the next cover-job roll succeeds
    When the Golem works his cover job for the night
    Then the night ends with Suspicion 26

  Scenario: A failed cover job raises Suspicion
    Given a seed on which the next cover-job roll fails
    When the Golem works his cover job for the night
    Then the night ends with Suspicion 39

  Scenario: Van Helsing snoops at 70 unless someone lies low
    Given Suspicion is 70
    When everyone idles for a full night
    Then the night ends with Suspicion 77
    And the log says "Van Helsing snooped"

  Scenario: Lying low keeps Van Helsing away
    Given Suspicion is 70
    When the Count lies low for a full night
    Then the night ends with Suspicion 71
    And the log does not say "Van Helsing snooped"

  Scenario: At 90 the mob gathers and may attack a room by day
    Given Suspicion is 90
    And a seed on which the Golem is careful and the mob's attack roll lands
    When everyone idles for a full night
    Then the log says "The mob stormed"
    And some furniture is broken
    And everyone's comfort is 60 and anger is 15

  Scenario: A gathered mob does not always attack
    Given Suspicion is 90
    And a seed on which the Golem is careful and the mob's attack roll misses
    When everyone idles for a full night
    Then the log does not say "The mob stormed"

  Scenario: An angry household is heard across the valley
    Given everyone's anger is 80
    When everyone idles for a full night
    Then the night ends with Suspicion 39
    And the log says "Shouting from the manor"

  Scenario: Suspicion 100 means the mob is at the door and the game is lost
    Given Suspicion is 96
    When everyone idles for a full night
    Then the game is lost
    And the log says "The mob is at the door"
    And nothing happens in the day phase
    And running another night does nothing

  Scenario: Surviving 7 nights is a win
    When a 7-night game is played with the default plan
    Then the game is won after night 7
    And the log says "The household survived"

  Scenario: The same seed and plan replay the same log
    When seed 42 is played twice with the default plan
    Then both logs are identical
    And a game with seed 43 produces a different log
