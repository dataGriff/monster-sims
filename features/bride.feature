Feature: The Bride
  Made, not asked. She runs on the lightning rod like the Golem and will not
  be paired with him, and lying low ends in a shriek.

  Background:
    Given a new game with seed 42 and Suspicion 30, with the Count, the Golem and the Bride

  Scenario: She will not be paired with the Golem
    When the Golem and the Bride are both assigned to sleep and the night runs
    Then the Bride lay low instead
    And the log says the Bride "was not asked"

  Scenario: Lying low ends in a shriek
    When the Bride lies low for a full night
    Then the Bride's fun was 90 before dawn
    And the night ends with Suspicion 35

  Scenario: Without the lightning rod she does not recharge
    Given the house has no lightning rod
    And the Bride's energy is 50
    When the Bride sleeps and the Golem feeds for the night
    Then the Bride's energy is 50 after the night phase
