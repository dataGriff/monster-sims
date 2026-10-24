Feature: The Phantom
  Fun comes only from music, company counts for half behind the mask, and at
  60 anger the chandelier comes down.

  Background:
    Given a new game with seed 42 and Suspicion 30, with the Count, the Wolf Man and the Phantom

  Scenario: Without an organ, lying low is humming in the dark
    When the Phantom lies low for the night
    Then the Phantom's fun is 65 after the night phase
    And the log says the Phantom "no organ in this house"

  Scenario: With an organ the music carries
    Given the house has a pipe organ
    When the Phantom lies low for a full night
    Then the Phantom's fun was 90 before dawn
    And the log says the Phantom "the music carried"
    And the night ends with Suspicion 34

  Scenario: Company is no fun and counts for half
    Given the Phantom's social is 40
    When the Phantom socialises for the night
    Then the Phantom's social is 55 and fun is 50 after the night phase

  Scenario: At 60 anger the chandelier comes down
    Given the Phantom's anger is 70
    When everyone idles for a full night
    Then the armchair is broken
    And the Phantom's anger is 35
    And the night ends with Suspicion 44
    And the log says the Phantom "brought the chandelier down"
