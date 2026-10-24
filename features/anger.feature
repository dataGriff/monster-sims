Feature: Household Anger
  A shared 0–100 meter: the mean anger of everyone living in the manor.
  A calm house can do things together. A furious one fights, goes off-plan,
  and eventually empties.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: A calm household can hold a game night
    Given household anger is 10
    When everyone plays a game night
    Then the Wolf Man's fun is 85, social is 75 and anger is 0 after the night phase
    And the Golem's social is still 20 after the night phase
    And the log says the Count "dealt cards in the parlour"

  Scenario: A cross household just bickers
    Given household anger is 40
    When everyone plays a game night
    Then the Wolf Man's fun is 55 and anger is 15 after the night phase
    And the log says "too cross to play"

  Scenario: A game night for one is patience
    When the Count plays a game night alone
    Then the Count's fun is 65 after the night phase

  Scenario: An angry household fights and the lane hears it
    Given household anger is 60
    And a seed on which the Golem is careful and the fight roll lands
    When everyone idles for a full night
    Then the log says "shouting match"
    And exactly 1 piece of furniture is broken
    And the night ends with Suspicion 37

  Scenario: A furious household sends someone off-plan
    Given household anger is 80
    And a seed on which the rogue roll lands and nothing else goes wrong
    When everyone lies low for a full night
    Then the log says "ignored the plan"
    And exactly one monster did nothing in particular
    And the night ends with Suspicion 36

  Scenario: Someone at the end of their tether moves out
    Given the Wolf Man's anger is 95, so still 90 after a calm dawn
    When everyone idles for a full night
    Then the log says the Wolf Man "moved out"
    And the household has 2 members
    And the departed list contains the Wolf Man

  Scenario: An empty manor is a loss
    Given everyone's anger is 95
    When everyone idles for a full night
    Then the game is lost
    And the log says "The manor stands empty"
