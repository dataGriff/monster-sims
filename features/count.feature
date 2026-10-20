Feature: The Count
  The Count is a nocturnal aristocrat. He feeds at night, wilts in daylight,
  owns no mirror, and is far too charming for the household's good.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: Hunger only fills from "feed" at night
    Given the Count's hunger is 40
    When the Count lies low for the night
    Then the Count's hunger is still 40 after the night phase
    But a Wolf Man who lies low with hunger 40 has hunger 45 after the night phase

  Scenario: Feeding fills hunger and leaves a pale villager
    Given the Count's hunger is 40
    When the Count feeds for the night
    Then the Count's hunger is 90 after the night phase
    And the night ends with Suspicion 37
    And the log says the Count "went out to feed"

  Scenario: Energy drains in daylight instead of recovering
    Given the Count's energy is 80
    And the Wolf Man's energy is 80
    When everyone lies low for a full night
    Then the Count's energy is 65
    And the Wolf Man's energy is 100

  Scenario: Hygiene is ignored because he has no reflection
    Given the Count's hygiene is 10
    When everyone lies low for 3 full nights
    Then the Count's hygiene is still 10
    And the Count never fumes about hygiene

  Scenario: Charm fills recruit progress and raises Suspicion
    When the Count socialises for the night
    Then the log says the Count "charmed"
    And recruit progress is 25
    And the night ends with Suspicion 41

  Scenario: Enough charm recruits a villager who keeps the secret
    When the Count socialises for 4 full nights
    Then the manor has 1 ally
    And recruit progress is back to 0
    And the log says a villager "now keeps the manor's secrets"
