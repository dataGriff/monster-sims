Feature: Save and load
  A save is the seed, the options and every dusk plan applied so far. Loading
  replays them, which is exact because the sim is deterministic.

  Scenario: A save replays to the identical state
    Given seed 42 played for 3 nights with the default plan
    When the game is saved and loaded
    Then the loaded state is identical, log and all

  Scenario: A resumed run finishes the same as an unbroken one
    Given seed 42 played for 3 nights with the default plan, saved and loaded
    When the loaded game is played to the end
    Then its final state matches seed 42 played straight through

  Scenario: Garbage saves are rejected
    Then a save without a version is rejected
    And a save without a seed is rejected

  Scenario: The CLI can stop early, save, and resume
    When "--until 3 --save s.json" is parsed
    Then until is 3 and save is "s.json"
    When "--load s.json" is parsed
    Then load is "s.json"
