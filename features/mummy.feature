Feature: The Mummy
  The Mummy is in no hurry. Nothing tires him and nothing passes through him,
  but his bandages are going, everything takes him two nights, and he will
  not stop bringing things home.

  Background:
    Given a new game with seed 42 and Suspicion 30, with the Mummy in the household

  Scenario: Energy is always full and there is no bladder
    Given the Mummy's energy is 50 and bladder is 30
    When everyone idles for a full night
    Then the Mummy's energy is 100 and bladder is 100
    And the Mummy never fumes about energy or bladder

  Scenario: Comfort drops as the bandages unravel
    When everyone idles for a full night
    Then the Mummy's comfort is 68

  Scenario: A night in the sarcophagus rewraps him
    Given the Mummy's comfort is 50
    When the Mummy sleeps for the night
    Then the Mummy's comfort is 80 after the night phase
    And the log says the Mummy "rewrapped by morning"

  Scenario: Without a sarcophagus he just unravels on the floor
    Given the sarcophagus is broken
    And the Mummy's comfort is 50
    When the Mummy sleeps for the night
    Then the Mummy's comfort is 50 after the night phase
    And the log says the Mummy "unravelled a little more"

  Scenario: Every action costs two slots
    When the Mummy is assigned to feed on 3 consecutive nights
    Then the Mummy completed 2 actions
    And the log says the Mummy "cannot feed yet" once

  Scenario: He hoards artefacts and they cheer him up
    Given a seed on which the Mummy's hoarding roll lands
    When the Mummy works his cover job for a full night
    Then there is an artefact in the crypt
    And the log says the Mummy "under one arm"
    And the Mummy's fun is 47

  Scenario: Moving an artefact curses the mover
    Given a canopic jar in the crypt
    When the Wolf Man repairs for the night
    Then the Wolf Man's comfort is 70, hygiene is 70 and anger is 20 after the night phase
    And the log says the Wolf Man "moved the canopic jar"

  Scenario: The Mummy may handle his own things
    Given a canopic jar in the crypt
    When the Mummy repairs for the night
    Then the log does not say "A dry wind"

  Scenario: Breaking an artefact is worse luck still
    Given a canopic jar in the crypt
    And a seed on which the Golem breaks the artefact
    When everyone idles for the night
    Then the log says the Golem "broke the canopic jar"
