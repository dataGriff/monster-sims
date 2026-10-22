Feature: IP audit
  No studio-owned names, designs or marketing language anywhere in the text.
  docs/ip-audit.md is the checklist; this feature enforces its term list.

  Scenario: The audit document lists terms and covers every archetype
    Then docs/ip-audit.md has a terms fence with at least 15 entries
    And it has a checklist row for every playable archetype

  Scenario: None of the forbidden terms appear in the repository text
    When src, features, tests, plans, README.md and docs are scanned
    Then no file contains any forbidden term
