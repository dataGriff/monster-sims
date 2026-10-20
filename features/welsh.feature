Feature: The Welsh folklore set
  `--setting valley` swaps the village for a chapel-and-quarry terrace and the
  household for Y Gwyllgi, Cŵn Annwn and Gwrach y Rhibyn.

  Background:
    Given a valley game with seed 42 and Suspicion 30

  Scenario: The terrace
    Then there are 10 townies including the minister and Mam-gu at the end of the terrace
    And the household is Y Gwyllgi, Cŵn Annwn and Gwrach y Rhibyn

  Scenario: The cunning man comes down from the mountain at 70
    Given Suspicion is 70
    When everyone idles for a full night
    Then the log says "The dyn hysbys has come down from the mountain"

  Scenario: The black dog is an omen, not a friend
    Given Y Gwyllgi's social is 40
    When Y Gwyllgi socialises for a full night
    Then Y Gwyllgi's social is still 40 before dawn
    And the log says Y Gwyllgi "crossed themselves"
    And the night ends with Suspicion 40

  Scenario: Y Gwyllgi feeds on the mountain
    When Y Gwyllgi feeds for a full night
    Then the log says Y Gwyllgi "sheep"
    And the log does not say "Lamplight"

  Scenario: Every third night the hounds ride
    Then nights 3 and 6 are hunt nights and nights 1 and 2 are not
    Given it is the dusk of night 3
    When Cŵn Annwn are assigned to sleep and the night runs
    Then Cŵn Annwn never completed the action
    And Cŵn Annwn's fun is 100 and hunger is 100 before dawn
    And the night ends with Suspicion 46

  Scenario: Hygiene and bladder mean nothing to the hounds
    When everyone idles for a full night
    Then Cŵn Annwn's hygiene is 100 and bladder is 100

  Scenario: Gwrach y Rhibyn wails at a frightened villager's window
    Given the minister's awareness is 55
    When everyone idles for a full night
    Then the log says Gwrach y Rhibyn "wailed at the minister's window"
    And the minister's awareness is 70
    And Gwrach y Rhibyn's fun is 80
    And the night ends with Suspicion 39

  Scenario: Mist at the crossroads
    When Gwrach y Rhibyn lies low for a full night
    Then the night ends with Suspicion 25

  Scenario: The CLI knows the valley
    When "--setting valley" is parsed
    Then setting is valley
    And "--setting moon" is rejected
