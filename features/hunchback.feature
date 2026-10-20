Feature: The Hunchback
  Villagers are not company, gargoyles are. The roof is sanctuary. The bells
  never fail him, and leave him deaf to everyone else.

  Background:
    Given a new game with seed 42 and Suspicion 30, with the Count, the Wolf Man and the Hunchback

  Scenario: Villagers are not company
    Given the Hunchback's social is 40
    When the Hunchback socialises for the night
    Then the Hunchback's social is still 40 after the night phase

  Scenario: Lying low on the roof is sanctuary among the gargoyles
    Given the Hunchback's social is 40
    When the Hunchback lies low for a full night
    Then the Hunchback's social was 55 before dawn
    And the log says the Hunchback "claimed sanctuary"
    And the night ends with Suspicion 24

  Scenario: The bells never fail him but leave him deaf
    Then the Hunchback's cover job fails 2% of the time
    Given a seed on which the bells go well
    And the Hunchback's social is 40
    When the Hunchback works his cover job for a full night
    Then the log says the Hunchback "ears rang"
    And the night ends with Suspicion 20

  Scenario: He can ring the noon bell too
    Given the Hunchback is assigned a daytime cover job
    When everyone lies low for a full night
    Then the Hunchback completed a daytime action
