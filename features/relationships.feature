Feature: Transform / Infect relationship tree
  Every villager can be worked up the tree: friend → confidant → thrall →
  turned. Anyone can make friends. Only the Count's charm takes a villager
  past confidant, and turning one adds a resident and a Suspicion spike.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: One charm makes a friend
    When the Count socialises for a full night
    Then the Count's mark is a friend
    And the log says "now counts The Count a friend"
    And the night ends with Suspicion 41

  Scenario: Two charms make a confidant who keeps the secret
    When the Count socialises for 2 full nights
    Then the Count's mark is a confidant
    And the manor has 1 ally
    And the log says "now keeps the manor's secrets"
    And the night ends with Suspicion 42

  Scenario: Three charms make a thrall who talks the rumours down
    When the Count socialises for 3 full nights
    Then the Count's mark is a thrall
    And the log says "talked the rumours down"
    And the night ends with Suspicion 52

  Scenario: Four charms turn the villager
    When the Count socialises for 4 full nights
    Then the Count's mark is turned
    And the household has 4 members including one whose id starts with "turned-"
    And the mark's neighbours have awareness 30
    And the night ends with Suspicion 83

  Scenario: A turned villager takes orders like anyone else
    Given the Count has turned a villager
    When the turned villager is assigned to feed for the night
    Then the log says the turned villager "went out to feed"

  Scenario: Other monsters make friends but never thralls
    Given the ferryman is a confidant of the manor
    When the Wolf Man meets the ferryman ten more times
    Then the ferryman is still a confidant
    When the Wolf Man socialises for 10 full nights
    Then some townie has warmed to him
    And no townie is beyond confidant
    And nobody has been turned
