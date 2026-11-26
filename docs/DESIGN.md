# Airlock design system

Reference: [hex.tech](https://hex.tech) (studied 26 Nov 2026, screenshots in the build notes). We take its *grammar*, not its assets: warm paper, a drafting-table grid, an extended grotesque headline set against an italic serif, mono labels in brackets, and buttons drawn like selected objects in a design tool. Hex's own fonts (PP Formula, PP Editorial New, Cinetype) are commercial, so we use open-source equivalents with the same shapes.

The idea the design has to carry is one boundary: **what stays on your device** and **what is allowed to cross**. Every screen shows that wall.

## Principles

1. **Paper, not glass.** Warm off-white with a faint 24 px grid and grain. Medical bills are paper; the app should feel like a desk, not a dashboard.
2. **Two colours mean two sides.** Coral is *private, on this device*. Teal is *cleared to cross*. They are never used decoratively.
3. **Show the wall.** The boundary is a visible vertical rule with a label (`┤ DEVICE │ CLOUD ├`). Data animates up to it; identity stops there.
4. **Numbers in mono.** Every amount, code and token is IBM Plex Mono so a reader can line figures up.
5. **Motion explains, then gets out of the way.** Entrances are 280–420 ms with a soft ease-out; nothing loops except the "sealing" pulse while the on-device model runs. `prefers-reduced-motion` removes every transform.

## Tokens

```css
:root {
  /* surfaces */
  --paper:      #F5F3EF;   /* page */
  --paper-2:    #EFECE6;   /* sunken panels, table stripes */
  --card:       #FBFAF8;   /* raised cards */
  --grid:       #E7E2DA;   /* 1px grid lines */
  --rule:       #DCD5CB;   /* borders */

  /* ink (hex uses a plum-black; so do we) */
  --ink:        #1D1726;
  --ink-2:      #43394C;   /* body */
  --ink-3:      #71697A;   /* secondary */
  --ink-4:      #9A93A2;   /* hints */

  /* meaning */
  --coral:      #E5484D;   /* private / stays on device */
  --coral-wash: #FBE5E4;   /* button fill, private highlights */
  --teal:       #21918C;   /* cleared / crossed to cloud */
  --teal-wash:  #DDF0EE;
  --amber:      #C98A1B;   /* a finding: money you may not owe */
  --amber-wash: #FBF0DA;
  --violet:     #5B3FD0;   /* the model is thinking */
}
```

Dark theme (`prefers-color-scheme: dark` and `[data-theme=dark]`) swaps paper for `#14141C` (hex's own dark), ink for `#EDE9F2`, and keeps coral and teal at the same hue, two steps lighter.

## Type

| Role | Family | Settings | Example |
|---|---|---|---|
| Display | **Archivo** | `wdth 125`, `wght 700–800`, tracking −2.5% | *Fight the bill.* |
| Display accent | **Instrument Serif** Italic | 1.05× the display size, tracking −1% | *not your privacy* |
| UI / body | **IBM Plex Sans** | 300 for lead text, 400 body, 500 labels | |
| Data / labels | **IBM Plex Mono** | 10–11 px uppercase, tracking +8% for eyebrows | `┤ ON THIS DEVICE ├` |

Hero sizing (desktop): display 76 px / 0.98 line-height; accent line the same. Mobile: `clamp(40px, 11vw, 76px)`.

## Components

**Button (primary).** Coral-wash fill, 1 px ink border, 0 radius, and four small circular "handles" at the corners, like a selected frame in Figma. Hover: the handles grow from 6 to 8 px and the fill deepens one step. This is hex.tech's signature, and it fits a product about *selecting* what leaves.

**Button (secondary).** Transparent, 1 px `--rule` border, ink text.

**Chip.** Inline pill inside a sentence (`Rethinking [icon] BI`): 1 px rule, radius 999, 28 px icon well. Used in the hero: *Read [icon] your bill · Seal [icon] your identity · Audit [icon] the charges*.

**Eyebrow.** Mono, 10–11 px, uppercase, tracking +8%, flanked by bracket ticks `┤ … ├`.

**Card.** `--card` fill, 1 px `--rule`, radius 6, shadow `0 1px 0 #fff inset, 0 12px 32px -18px rgba(29,23,38,.25)`. Corner crop marks (8 px L-shapes in `--ink-4`) on feature panels.

**Token.** A redacted value renders as `⟦PATIENT_NAME⟧` in mono on coral-wash, with a lock glyph. Hover shows *"stays on this device"*.

**Boundary.** A full-height 1 px dashed rule with a label at the top. Left column tinted with 2% coral, right with 2% teal.

**Inference badge.** Every model output carries its real source from the SDK (`response.inferenceSource`):
`● ON DEVICE · Gemini Nano` (coral dot) or `● IN CLOUD · Gemini` (teal dot). Never inferred, always read from the response.

## Motion

| Moment | Animation | Duration / easing |
|---|---|---|
| Section enter | 12 px rise + fade, staggered 60 ms | 420 ms, `cubic-bezier(.2,.7,.2,1)` |
| Redaction | Each identifier is struck through, then collapses into a token chip | 280 ms per token, staggered 90 ms |
| Crossing | Line items slide right across the boundary; tokens bump the wall and settle back | 600 ms, spring (stiffness 260, damping 26) |
| Model thinking | Violet 2 px progress hairline along the active card's top edge | indeterminate |
| Finding | Amber left border draws top to bottom, the amount counts up | 500 ms |
| Rehydrate | Tokens in the letter flip back to real values, left to right | 180 ms each |

Library: **Motion** (`motion/react`) for component transitions; CSS for the grid, grain and handles. No 3D, no scroll-jacking.

## Layout

- Max content width 1200 px; 12-column grid with 24 px gutters, aligned to the background grid.
- Pages sit in a frame with 1 px vertical rules at the left and right edges (as hex.tech does), and horizontal rules between sections with mono section labels.
- At ≤ 640 px: 16 px gutter, single column, the boundary becomes horizontal (device on top, cloud below).

## Voice and copy

Plain, short, specific. Say *your name never leaves this laptop*, not *privacy-first AI*. Amounts are always exact (`$1,284.00`), never rounded. Banned: *seamless, leverage, empower, revolutionize, unlock*.
