Feature: The Golem
  The Golem is patient clay. Villagers flee from him, he lives on lightning,
  and the furniture does not last.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: Social can never rise above 20
    Given the Golem's social is 5
    When the Golem socialises for the night
    Then the Golem's social is 20 after the night phase

  Scenario: Socialising at the cap means nobody comes
    Given the Golem's social is 20
    When the Golem socialises for the night
    Then the Golem's social is 20 after the night phase
    And the log says the Golem "bought a plant and no one came"

  Scenario: Energy recharges through the lightning rod
    Given the house has a lightning rod
    And the Golem's energy is 30
    When the Golem sleeps for a full night
    Then the Golem's energy is 95

  Scenario: Without the lightning rod he does not recharge at all
    Given the house has no lightning rod
    And the Golem's energy is 30
    When the Golem sleeps for a full night
    Then the Golem's energy is 25
    And the log says the Golem "did not recharge"

  Scenario: He frequently breaks furniture and the whole house loses comfort
    Given a seed on which the Golem's next clumsy roll lands
    When the Golem lies low for the night
    Then exactly 1 piece of furniture is broken
    And the Count's comfort is 70 after the night phase
    And the Wolf Man's comfort is 70 after the night phase
    And the Golem's comfort is 80 after the night phase

  Scenario: On a careful night nothing breaks
    Given a seed on which the Golem's next clumsy roll misses
    When the Golem lies low for the night
    Then no furniture is broken
    And the Count's comfort is 80 after the night phase

  Scenario: Repair fixes broken furniture and the lightning rod
    Given the piano is broken
    And the house has no lightning rod
    When the Golem repairs for the night
    Then the piano is fixed
    And the house has a lightning rod
    And the Count's comfort is 90 after the night phase

  Scenario: A mob tearing up the roof takes the lightning rod with it
    Given the house has a lightning rod
    When the roof is wrecked
    Then the house has no lightning rod
