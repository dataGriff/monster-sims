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

  Scenario: Sizes and timings come from the scales
    Then every font-size in styles.css is a type-scale token
    And every padding, margin and gap is built from spacing-scale tokens, 0 or auto
    And every transition uses a motion-duration token
    And the smallest type step is at least 0.72rem
    And the media-query widths in styles.css are the breakpoint tokens

  Scenario: The client's timings come from the motion tokens
    Then main.ts contains no bare millisecond timings
    And with animation off every motion duration becomes zero or instant

  Scenario: Keyboard focus is always visible
    Then styles.css has a global :focus-visible rule with an outline
    And every custom input control that hides its native input shows focus on its label
