Feature: Design framework
  Tokens are the single source of every colour, size and timing in the
  interface (docs/design-system.md). These scenarios lint the stylesheet and
  the tokens so the system cannot quietly drift.

  Scenario: The generated token stylesheet is current
    Then design/tokens.css equals what `pnpm tokens` would write from design/tokens.ts

  Scenario: The stylesheet uses tokens for every colour
    Then styles.css contains no hex, rgb, hsl or named colour values
    And every custom property styles.css uses is defined

  Scenario: The canvas and the interface share one palette
    Then the canvas palette's ink, bone, lamp, warn and alarm come from the token primitives
    And the night theme's text, background and lamp are those same primitives
