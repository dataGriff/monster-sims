Feature: The Invisible Man
  Nobody can see him, which is the problem. Company only counts when he has
  bothered to wrap up, fun comes from pranks, food goes missing, and almost
  nothing he does is noticed in the village.

  Background:
    Given a new game with seed 42 and Suspicion 30, with the Invisible Man in the household

  Scenario: Social only fills while he is visible
    Given household anger is 10
    And the Invisible Man's social is 40
    When everyone plays a game night
    Then the Wolf Man's social is 75 after the night phase
    But the Invisible Man's social is still 40 after the night phase
    And the log says the Invisible Man "Nobody could see him"

  Scenario: Going out means wrapping up, and then company counts
    Given the Invisible Man's social is 40
    When the Invisible Man socialises for the night
    Then the Invisible Man's social is 70 after the night phase
    And the log says the Invisible Man "put the hat on"

  Scenario: Lying low means pranks
    When the Invisible Man lies low for the night
    Then the Invisible Man's fun is 85 after the night phase
    And one housemate's comfort is 70 after the night phase
    And the log says the Invisible Man "short-sheeted"

  Scenario: Food goes missing and the household gets cross
    Given a seed on which the Golem is careful and the pantry roll lands
    When everyone idles for the night
    Then the Invisible Man's hunger is 90 after the night phase
    And exactly one eater has hunger 70 and anger 20
    And the log says "walked off the plate"

  Scenario: Whatever he does raises the least Suspicion
    When the Invisible Man socialises for a full night
    Then the night ends with Suspicion 35, where the Wolf Man would have left it at 36
    And the log says the Invisible Man "Hardly anyone noticed"

  Scenario: Even a bad shift is only half noticed
    Given a seed on which the next cover-job roll fails
    When the Invisible Man works his cover job for a full night
    Then the night ends with Suspicion 37
