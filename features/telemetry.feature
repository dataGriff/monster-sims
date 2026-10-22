Feature: Telemetry (opt-in)
  Nothing is recorded unless `--telemetry FILE` is passed. A record holds what
  tuning needs: which events fired, where the run ended, the Suspicion curve.

  Scenario: A record describes one run
    When seed 42 is played and recorded
    Then the record says won after 7 nights with a 7-point Suspicion curve
    And it counts every event kind
    And it carries no timestamp

  Scenario: Records summarise
    Given records for seeds 1 to 5
    When they are summarised
    Then the summary counts 5 runs and averages the curve per night
    And the summary formats as text

  Scenario: The CLI only records when asked
    When "--telemetry runs.ndjson" is parsed
    Then telemetry is "runs.ndjson"
    And without the flag nothing is set
