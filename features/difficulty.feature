Feature: Difficulty and run length
  Three difficulties tune how fast the village forgets, how loud rumour is and
  how bold the mob gets. Three run lengths, every one ending on a full moon.
  Sandbox mode keeps the manor standing whatever happens.

  Scenario: The presets
    Then gentle, standard and harsh start Suspicion at 25, 30 and 35
    And their quiet-night drift is 5, 3 and 2
    And short, standard and long runs are 7, 14 and 28 nights, each ending on a full moon

  Scenario: A gentle village forgets faster
    Given a gentle game with Suspicion 50
    When everyone idles for a full night
    Then the night ends with Suspicion 45
    But in a harsh game it would end at 48

  Scenario: A harsh village talks louder
    Given a harsh game with Suspicion 30
    When the Wolf Man socialises for a full night
    Then the night ends with Suspicion 37

  Scenario: Sandbox mode never ends the run
    Given a sandbox game with Suspicion 96
    When everyone idles for a full night
    Then the game is still running
    And Suspicion is now 85
    And the log says "in this sandbox"

  Scenario: The CLI exposes all three
    When "--run long --difficulty harsh --sandbox" is parsed
    Then nights is 28, difficulty is harsh and sandbox is on
    And "--difficulty brutal" is rejected
