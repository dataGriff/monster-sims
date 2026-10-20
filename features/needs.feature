Feature: Needs
  Eight needs per monster, each 0–100, with a decay table per monster.
  Anger is the odd one out: 0 is calm and 100 is furious.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: Needs are clamped to 0–100
    Given the Wolf Man's hunger is 90
    When the Wolf Man feeds for the night
    Then the Wolf Man's hunger is 100 after the night phase

  Scenario: Each monster decays by its own table at dawn
    When everyone idles for a full night
    Then the Wolf Man lost 15 hunger and the Golem lost 5 hunger overnight

  Scenario: A need crossing below 20 emits a critical event
    Given the Wolf Man's hunger is 25
    When everyone idles for a full night
    Then the log says the Wolf Man's "hunger has become critical"

  Scenario: A need already below 20 does not re-announce itself
    Given the Wolf Man's hunger is 5
    When everyone idles for a full night
    Then the log does not say "hunger has become critical"

  Scenario: Anger rises while a need is critical and falls otherwise
    Given the Wolf Man's hunger is 5 and anger is 20
    And the Golem's anger is 20
    When everyone idles for a full night
    Then the Wolf Man's anger is 30
    And the Golem's anger is 15
