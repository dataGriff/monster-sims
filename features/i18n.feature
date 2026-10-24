Feature: Localisation scaffold
  Every event sentence goes through a string table. English is complete;
  Welsh is partial and falls back to English line by line. The locale changes
  the words, never the simulation.

  Scenario: Lookup, placeholders and fallback
    Then t("actions.feed.1") fills "{name}" and "{hunger}"
    And an unknown key comes back as itself
    And a key missing from Welsh falls back to the English sentence

  Scenario: Every Welsh key exists in English
    Then no key in the Welsh table is absent from the English one
    And the Welsh table has at least 60 entries

  Scenario: The locale changes the words, never the simulation
    When seed 42 is played in English and again in Welsh
    Then the two logs have the same event kinds, nights, phases and data
    But the Welsh log says "Amheuaeth" where the English says "Suspicion"

  Scenario: The report knows what is left
    Then missingKeys("cy") lists only keys that English has and Welsh lacks
    And "--lang cy" is parsed and "--lang fr" is rejected
