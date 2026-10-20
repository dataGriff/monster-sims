Feature: Dusk plans
  A plan is the dusk schedule: which action each monster is assigned, night by
  night, with an optional daytime slot.

  Scenario: Plans accept the long form and the shorthand
    When a plan file with a "nights" array is parsed
    Then it yields 2 nights with a day slot on the second
    When a plan file that is a bare array of assignments is parsed
    Then it yields 1 night with no day slot

  Scenario: Unknown monsters and actions are rejected
    Then a plan naming the monster "mummy" is rejected
    And a plan assigning the action "haunt" is rejected

  Scenario: A short plan repeats its last night
    Given a plan with 2 nights
    Then night 5 uses the second night's assignments

  Scenario: The default plan covers 7 nights
    Then the default plan has 7 nights
