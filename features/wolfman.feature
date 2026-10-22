Feature: The Wolf Man
  The Wolf Man is an ordinary fellow six nights out of seven. On the seventh
  the moon is full and nobody, least of all him, knows what happened.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: The moon is full every 7th night
    Then nights 1 to 6 are not full-moon nights
    And nights 7 and 14 are full-moon nights

  Scenario: Full moon crashes hygiene and comfort and maxes fun
    Given it is the dusk of night 7
    And the Wolf Man's hygiene is 80, comfort is 80 and fun is 60
    When dusk falls
    Then the Wolf Man's hygiene is 0, comfort is 0 and fun is 100

  Scenario: Full moon blackout wrecks the kitchen and raises Suspicion
    Given it is the dusk of night 7
    When the Wolf Man is assigned to sleep and the night runs
    Then the Wolf Man never completed his action
    And every piece of kitchen furniture is broken
    And the log says the Wolf Man "remembers nothing"
    And the night ends with Suspicion 49

  Scenario: A cover-job shift on a full moon is a disaster
    Given it is the dusk of night 7
    When the Wolf Man is assigned to his cover job and the night runs
    Then the log says the Wolf Man's shift "ended in disaster"
    And the night ends with Suspicion 59

  Scenario: On an ordinary night he just does his job
    Given it is the dusk of night 3
    When the Wolf Man is assigned to sleep and the night runs
    Then the Wolf Man completed his action
    And no kitchen furniture is broken

  Scenario: Only the Wolf Man can act in daylight
    Given everyone is also assigned a daytime cover job
    When everyone lies low for a full night
    Then the Wolf Man completed a daytime action
    And the Count was refused a daytime action
    And the Golem was refused a daytime action
