Feature: Cover job progression
  A cover job is a career. Good shifts earn promotions, bad ones heat up the
  workplace until the employer asks questions and then shows you the door.
  Two shifts in one turn of the clock is a clash.

  Background:
    Given a new game with seed 42 and Suspicion 30, with only the Count and the Wolf Man

  Scenario: Three good shifts earn a promotion
    Given a seed on which the next three cover-job rolls succeed
    When the Wolf Man works his cover job for 3 full nights
    Then the Wolf Man is a level 2 "senior carter" with relief 10
    And the log says the Wolf Man "Promoted"

  Scenario: A bad shift heats up the workplace
    Given a seed on which the next cover-job roll fails
    When the Wolf Man works his cover job for the night
    Then the Wolf Man's workplace heat is 15 and his streak is 0

  Scenario: A good shift cools it
    Given the Wolf Man's workplace heat is 20
    And a seed on which the next cover-job roll succeeds
    When the Wolf Man works his cover job for the night
    Then the Wolf Man's workplace heat is 15

  Scenario: At 50 heat the employer asks questions
    Given the Wolf Man's workplace heat is 50
    Then the Wolf Man's cover job fails 30% of the time

  Scenario: At 100 heat he is sacked
    Given the Wolf Man's workplace heat is 90
    And a seed on which the next cover-job roll fails
    When the Wolf Man works his cover job for 2 full nights
    Then the Wolf Man is unemployed
    And the log says the Wolf Man "is sacked"
    And the log says the Wolf Man "no job to go to"

  Scenario: A night shift and a day shift clash
    Given the Wolf Man is assigned a cover job by night and by day
    Then his day shift fails 35% of the time
    Given a seed on which both rolls succeed
    When the night runs
    Then the log says the Wolf Man "Two shifts in one turn of the clock"
