Feature: Story events
  Twenty scripted collisions. At most one fires per dusk, each once per run,
  two nights apart unless urgent. The plan picks the branch; otherwise the
  first branch happens. Off by default in the bare sim, on in the CLI.

  Scenario: The catalogue
    Then there are 20 stories, each with at least two branches with distinct ids

  Scenario: The first branch happens unless the plan says otherwise
    Given a story game with Suspicion 30 at the dusk of night 2
    When everyone idles for a full night
    Then the log says "A lost traveller at the door"
    And the night ends with Suspicion 36
    Given another story game with Suspicion 30 at the dusk of night 2
    When the plan chooses "takeIn" for "lostTraveller" and everyone idles
    Then everyone's social rose by 10 before decay
    And the night ends with Suspicion 28

  Scenario: Each story fires once, two nights apart
    Given a story game with only the Count and the Wolf Man, Suspicion 30, at the dusk of night 2
    When three full nights pass
    Then stories fired on nights 2 and 4 but not 3
    And no story fired twice

  Scenario: Urgent stories ignore the cooldown
    Given a story game with Suspicion 30 at the dusk of night 2
    And the house has no lightning rod
    When two full nights pass
    Then the log says "A storm over the manor" on night 3
    And the house has a lightning rod

  Scenario: The Count takes care of the traveller
    Given a story game with Suspicion 30 at the dusk of night 2
    When the plan chooses "feedOnThem" for "lostTraveller" and everyone idles
    Then the Count's hunger was 100 before decay
    And the night ends with Suspicion 44

  Scenario: Full moon on the Count's shift
    Given a story game with Suspicion 30 at the dusk of night 7
    When the Count is assigned his cover job and the Wolf Man to sleep
    Then the Count lay low instead
    And the log says "sat up with the Wolf Man"
    And the night ends with Suspicion 38

  Scenario: The Invisible Man handles the census
    Given a story game with the Invisible Man, Suspicion 30, at the dusk of night 3, the traveller already dealt with
    When everyone idles for a full night
    Then the log says "gentleman, retired"
    And the night ends with Suspicion 25

  Scenario: Stories are off unless asked for
    Given a new game with seed 42 and Suspicion 30 at the dusk of night 2
    When everyone idles for a full night
    Then no story fired

  Scenario: Plans carry choices and shopping lists
    When a plan night with "build" and "choices" is parsed
    Then both come through
    And a plan with non-string choices is rejected
