Feature: Component kit
  The interface is built from a small kit of components that return plain
  view trees (docs/design-system.md). These scenarios render the real views
  in Node, without a browser.

  Scenario: Views build plain trees
    Then h() drops false, null and undefined children and turns numbers into text
    And fragments expand into their parent when rendered

  Scenario: Every control has an accessible name
    Given seed 42 after one night with the Wolf Man able to act by day
    Then every button, input, select, radio group and meter in the header, HUD, plan and bestiary has a non-empty accessible name

  Scenario: Meters report their values
    Then the Suspicion gauge reports the village's Suspicion
    And every need bar reports that resident's need
    And critical needs are marked critical

  Scenario: The plan reflects and edits the draft
    Then each resident's checked tile is their drafted action
    When a tile's change handler fires
    Then the draft records the new action and the plan asks to re-render

  Scenario: The bestiary shows what has been met
    Given the Count and the Mummy have been met
    Then two plates are open and the rest are locked silhouettes

  Scenario: The diary keys entries to residents
    Then each revealed entry is listed under its phase and carries its resident's accent

  Scenario: Rendering maps trees to the DOM faithfully
    When a tree is rendered into a fake document
    Then attributes, properties, styles, event listeners and canvas drawing are all applied
    And SVG elements are created in the SVG namespace

  Scenario: Every need, action and chip has an icon
    Then every need, every action, idle and every HUD chip has a line icon
    And every icon's path data is well formed and stays on the 24-unit grid
    And icons are hidden from assistive technology and always sit beside a text label
