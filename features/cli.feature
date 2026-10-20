Feature: Text-mode runner
  `pnpm play` turns the event log into a readable night-by-night story.

  Scenario: Arguments
    When "--seed 7 --plan p.json --nights 14 --verbose" is parsed
    Then seed is 7, plan is "p.json", nights is 14 and verbose is on
    And "--seed abc" is rejected

  Scenario: The compact log has one headline per night and a result
    When seed 42 is played and formatted
    Then there is a line starting "Night 1 —" through "Night 7 —"
    And every headline ends with "Suspicion a -> b."
    And the output ends with a result line

  Scenario: The verbose log prints one plain-English line per event
    When seed 42 is played and formatted verbosely
    Then there is exactly one line per event, grouped under night and phase headers
