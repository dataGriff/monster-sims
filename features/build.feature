Feature: Basic build mode
  Coin comes from cover-job shifts. At dusk the plan's shopping list is bought
  in order while the coin lasts: beds, furniture, the lightning rod, and the
  defences the mob will meet.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: The catalogue and the purse
    Then the catalogue lists 15 items including a coffin, a slab, a sarcophagus, a tub and a lightning rod
    And the house starts with 20 coin

  Scenario: A successful shift pays
    Given a seed on which the next cover-job roll succeeds
    When the Golem works his cover job for the night
    Then the house has 26 coin

  Scenario: Buying replaces a broken bed
    Given the camp cot is broken
    When the plan buys a "cot" at dusk
    Then the camp cot is fixed
    And the house has 15 coin
    And the log says "Bought a camp cot"

  Scenario: You cannot buy what you already have or cannot afford
    When the plan buys a "cot" and a "drawbridge" at dusk
    Then the log says "already in the attic"
    And the log says "Could not afford the drawbridge"
    And the house still has 20 coin

  Scenario: A broken bed halves what sleep restores
    Given the coffin is broken
    And the Count's energy is 30
    When the Count sleeps for the night
    Then the Count's energy is 50 after the night phase
    And the log says the Count "on the floor"

  Scenario: Buying the lightning rod brings the Golem back to life
    Given the house has no lightning rod
    When the plan buys a "lightningRod" at dusk
    Then the house has a lightning rod
    And the house has 0 coin
