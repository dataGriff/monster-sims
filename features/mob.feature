Feature: Mob behaviour
  Once Suspicion reaches 90 the mob gathers, and by day it may march on the
  most exposed room. Defences change what it finds. At 100 the manor loses a
  resident, a decoy, or everything.

  Background:
    Given a new game with seed 42 and Suspicion 90

  Scenario: The mob targets the most exposed room
    Given a seed on which the Golem is careful and the mob's attack roll lands
    When everyone idles for a full night
    Then the mob stormed the parlour
    And everyone's comfort is 60

  Scenario: A raised drawbridge keeps the mob out
    Given the house has a drawbridge
    And a seed on which the Golem is careful and the mob's attack roll lands
    When everyone idles for a full night
    Then the log says "found the drawbridge raised"
    And no furniture is broken
    And everyone's comfort is 75

  Scenario: The fog machine may lose the mob in the millpond
    Given the house has a fog machine
    And a seed on which the Golem is careful, the attack roll lands and the fog roll lands
    When everyone idles for a full night
    Then the log says "ended up in the millpond"
    And no furniture is broken

  Scenario: Decoy coffins send the mob home satisfied, once
    Given the house has decoy coffins
    And a seed on which the Golem is careful and the mob's attack roll lands
    When everyone idles for a full night
    Then the log says "burned them in the yard"
    And the decoy coffins are gone
    And Suspicion is now 87

  Scenario: The organ halves the chance the mob works up the nerve
    Given the house has a pipe organ
    And a seed on which the Golem is careful and the attack roll is between 0.25 and 0.5
    When everyone idles for a full night
    Then the log says "The organ played a dirge"
    And the log does not say "The mob stormed"

  Scenario: A secret passage lets the household slip out
    Given Suspicion is 94, because the passage foils Van Helsing too
    And the parlour has 1 window and the kitchen has a secret passage
    And a seed on which the Golem is careful and the mob's attack roll lands
    When everyone idles for a full night
    Then the mob stormed the kitchen
    And the log says "slipped out through the passage"
    And everyone's comfort is 75

  Scenario: At 100 the mob takes the resident whose light they watched
    Given Suspicion is 96
    When the Golem sleeps for a full night
    Then the game is still running
    And the Golem was taken
    And the household has 2 members
    And Suspicion is now 75

  Scenario: At 100 decoy coffins buy the manor another chance
    Given Suspicion is 96
    And the house has decoy coffins
    When everyone idles for a full night
    Then the game is still running
    And the decoy coffins are gone
    And Suspicion is now 80

  Scenario: At 100 with nobody exposed and no decoys, the manor falls
    Given Suspicion is 96
    When everyone idles for a full night
    Then the game is lost
