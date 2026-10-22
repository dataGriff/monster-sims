Feature: The village
  Ten named villagers with jobs, routines and fences to talk over. Each has
  their own private awareness of the manor; gossip carries it along the lane.

  Background:
    Given a new game with seed 42 and Suspicion 30

  Scenario: The roster
    Then there are 10 townies, each with a job, a weight from 1 to 3 and two neighbours
    And 5 of them are abroad at night

  Scenario: The Count's victim remembers the night
    When the Count feeds for the night
    Then the log says the Count "woke up pale" and names a townie
    And that townie's awareness is 20

  Scenario: A townie whose awareness is still 50 after the night says so out loud
    Given the baker's awareness is 55
    When everyone idles for a full night
    Then the log says "The baker is now saying out loud"
    And the night ends with Suspicion 32
    And the baker does not say it twice

  Scenario: Gossip spreads along the fences once the village is gossiping
    Given Suspicion is 50
    And the baker's awareness is 60 and the baker is already outspoken
    When everyone idles for a full night
    Then the miller's awareness is 5 and the widow's awareness is 5
    And the baker's awareness is 55

  Scenario: Gossip does not spread while the village is calm
    Given the baker's awareness is 60 and the baker is already outspoken
    When everyone idles for a full night
    Then the miller's awareness is 0

  Scenario: A quiet night lets townies forget
    Given the baker's awareness is 20
    When everyone idles for a full night
    Then the baker's awareness is 15

  Scenario: Allies do not gossip and forget nothing
    Given Suspicion is 50
    And the innkeeper is a confidant of the manor
    And the baker's awareness is 60 and the baker is already outspoken
    When everyone idles for a full night
    Then the innkeeper's awareness is 0
    And the manor's allies are the innkeeper
