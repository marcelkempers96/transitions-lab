# Under the Engine — design system

Everything the eye sees. Light theme only, sharp edges, 1 px rules, engineering typography. The aesthetic is a workshop manual that has learned to pulse.

See `01-SPEC.md` for product scope and `03-FUNCTIONS.md` for behaviour.

---

## Design principles

1. **Workshop clarity over web polish.** Thin lines, hairline grids, sharp corners, no shadows beyond functional drop-shadows for a highlight state. No border-radius above `6 px` and only on obvious control surfaces (buttons, cards). Everything else is 90°.
2. **One voice, one hierarchy.** The eye scans in exactly this order on every panel: label (`mono · small · uppercase · muted`) → number (`mono · large · bold · ink`) → prose (`sans · body · ink-soft`). Nothing competes.
3. **Colour tells function.** Warm orange = interactive / live. Green = electric. Blue = cold / intake. Grey = exhaust / spent. Yellow = ignition flash. The palette never decorates — every colour is a token with a meaning.
4. **Mono for numbers, sans for prose.** Any digit, unit, label or control name is `IBM Plex Mono`. Any paragraph is `IBM Plex Sans`. This is the strongest single signal of the aesthetic.
5. **One primary action per surface.** Big green hold-to-act button owns the component stage. Mode switch owns the top bar. Everything else is secondary.

---

## Colour tokens

Declare these as CSS custom properties on `:root`.

```css
:root {
  /* Surfaces */
  --paper:        #F6F5F2;    /* page background */
  --paper-2:      #EFEAE0;    /* panel/card background */
  --surface:      #FFFFFF;    /* elevated surface (buttons, cards on paper) */

  /* Ink */
  --ink:          #0A0A0A;    /* primary text, 1 px rules, strokes */
  --ink-soft:     #2A2A26;    /* body text */
  --line:         #B9B3A4;    /* strong rule, divider */
  --line-soft:    #DDD9CF;    /* faint rule, grid line */
  --mute:         #6B6963;    /* label text, metadata */

  /* Signal / function */
  --accent:       #1D6B55;    /* electric mode accent, success */
  --warm:         #C2502A;    /* interactive, live, highlighted */
  --heat:         #E2A93B;    /* ignition flash, warning */
  --intake:       #3E6FB7;    /* cold charge, intake path */
  --exhaust:      #7A6E60;    /* spent gas, exhaust path */
  --elec:         #1D6B55;    /* electric mode (same as accent) */
}
```

**Rules of thumb**

- Backgrounds: `--paper` for the page, `--surface` or `--paper-2` for cards. Never white-on-white — always a 1 px `--ink` border between stacked panels.
- Text: titles in `--ink`, body in `--ink-soft`, labels/metadata in `--mute`. Never pure black-on-white; `--ink` is `#0A0A0A` on purpose.
- Interactive state: the only element that gets to flash in `--warm` is something the user can touch. If it pulses, it is interactive. If it is interactive but not pulsing (e.g. a slider), it is still at rest until you grab it.
- Electric mode gets the `--elec` green on the active mode-switch button, the mode badge if you keep one, and the LED headlight tint. Everywhere else it still uses the shared palette.

---

## Typography

Load both weights of both families from Google Fonts:

```
IBM Plex Mono: 400, 500, 600
IBM Plex Sans: 400, 500, 600, 700
```

CSS variables:

```css
:root {
  --sans: "IBM Plex Sans", system-ui, -apple-system, Arial, sans-serif;
  --mono: "IBM Plex Mono", "Courier New", monospace;
}
```

### Scale

| Role                     | Family | Size   | Weight | Letter-spacing | Transform | Colour       |
|--------------------------|--------|--------|--------|----------------|-----------|--------------|
| Page section H2          | sans   | 20 px  | 600    | -0.015em       | none      | `--ink`      |
| Panel heading H2 (cview) | sans   | 22 px  | 700    | -0.015em       | none      | `--ink`      |
| Card heading H4          | sans   | 12 px  | 700    | 0.06em         | uppercase | `--mute`     |
| Body paragraph           | sans   | 13 px  | 400    | 0              | none      | `--ink-soft` |
| Interactive chip label   | mono   | 10.5px | 600    | 0.08em         | uppercase | `--ink`      |
| Status chip title        | sans   | 13.5px | 700    | 0              | none      | `--warm`     |
| Status chip description  | sans   | 12.5px | 400    | 0              | none      | `--ink-soft` |
| Live number (chip)       | mono   | 15 px  | 700    | 0              | none      | `--ink`      |
| Stat label               | mono   | 10 px  | 500    | 0.08em         | uppercase | `--mute`     |
| Stat value               | mono   | 17-20px| 700    | -0.01em        | none      | `--ink`      |
| Stat unit                | mono   | 10.5px | 400    | 0              | none      | `--mute`     |
| Callout label (SVG)      | mono   | 10.5px | 500    | 0.08em         | uppercase | `--mute`     |
| Overview sub-copy        | sans   | 13 px  | 400    | 0              | none      | `--mute`     |

Line-height is `1.5` for prose, `1.1` for stat values, `1.2` for headings.

---

## Layout & spacing

### Page

The root is a vertical flex column that fills `100dvh`:

```
header (sticky, 1px --ink bottom border)
└─ overview       (section, 1px --ink bottom border)
   ├─ overview-head (title + view toggle + legend)
   ├─ chip row (categories)
   └─ moto-wrap (bordered box with the SVG)
└─ cview-slot     (empty state OR cview-head + cview-stage + 3 cards)
└─ rider          (section with handlebar wrap + 5-cell dash)
└─ dyno           (section with chart grid + findings bar)
└─ footer         (1px --ink top border, mono muted copy)
```

- Section padding: `20px 24px` desktop, `16px 14px` mobile.
- Panels: `1px solid var(--ink)` border, `--surface` or `--paper-2` background.
- Vertical rhythm: 24 px between sections; inside a section, 10–14 px between the head and its content.

### Grid of cards (component view side panel)

Three equal columns on desktop:

```css
.ute-cview-side { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
```

Collapse to one column below 960 px.

### Component view stage

```css
.ute-cview-stage {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--ink);
  min-height: 560px;
  padding: 72px 20px 120px;         /* top for chip, bottom for action button */
  display: grid; grid-template-rows: auto 1fr auto; gap: 14px;
}
```

The chip is pinned top; the action button is pinned bottom-centre.

### Chip row

Flex, 6 px gap, wraps. Chips: `padding: 5-8px 11-16px`, border `1px solid var(--line)` (chip) or `1px solid var(--ink)` (segmented control), background `--surface`, active state is `--ink` background + `--paper` text. For the electric mode active state, swap to `--elec`.

### Dyno chart grid

```css
.ute-dyno-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
```

Collapse to one column below 720 px.

---

## Components (visual recipes)

### Mode switch — segmented control

- Container: `display: inline-flex; gap: 2px; background: var(--ink); border: 1px solid var(--ink);`
- Buttons: `padding: 8px 14px; mono 11.5px 600 uppercase; color: var(--ink); background: var(--surface);`
- Active: `background: var(--ink); color: var(--paper);` (or `--elec` for Electric)
- Gap of 2 px gives the segmented divider via the container's ink background bleeding through.

### View toggle — same visual language, smaller padding

`padding: 6px 12px; mono 10.5px 600 uppercase.`

### Category chip

- `padding: 5px 11px; mono 10.5px 600 uppercase;`
- Border: `1px solid var(--line)`; hover `--ink`.
- Active: `background: var(--ink); color: var(--paper); border-color: var(--ink);`
- The `Wiring →` chip gets `border-color: var(--warm); color: var(--warm);` to signal it is a direct action, not a filter.

### Status chip (above the component stage, Dyno header)

- `padding: 10px 14px; background: var(--surface); border: 2px solid var(--warm);`
- Three columns: dot (10 px round `--warm`) · stacked `title / description` text block · trailing live number (mono, bold, nowrap).
- The dot never animates. The description text can change on hover / interaction.

### Interactive-part dot (on overview)

```css
.ute-ix-dot {
  pointer-events: none;
  fill: var(--warm); stroke: var(--surface); stroke-width: 1.5;
  animation: ute-ix-pulse 2s ease-in-out infinite;
}
@keyframes ute-ix-pulse {
  0%, 100% { r: 5; opacity: 0.95; }
  50%      { r: 7; opacity: 0.65; }
}
```

Placed at the bbox centre of each shape whose key is in the `INTERACTIVE_PARTS` set. Fades to 0.4 opacity when the category filter is active (so it doesn't dominate a focused view). A tiny legend chip next to the view toggle labels it: `= interactive`.

### Callout label (SVG, on overview)

- Leader line: thin `--mute` stroke, 0.75 px.
- Dot at the shape point: 3 px `--surface` fill with `--mute` stroke.
- Label text: mono 10.5px uppercase 0.08em letter-spacing, `--mute` fill.
- Hover + active: everything becomes `--warm`; label goes `font-weight: 700`.
- Placed in tiered lanes to avoid collisions — 2 lanes above (y ≈ 28 and 70) and 2 lanes below (y ≈ 530 and 570) the motorcycle, with a minimum 100 px horizontal spacing between labels in the same lane.

### Shape highlight on click

- Shape stroke jumps to `--warm` width 2.5, with a `drop-shadow(0 0 8px rgba(194,80,42,.55))`.
- If the shape has a `data-fillable` attribute, its fill becomes `#F9DECB` so filled regions tint warm.

### Big hold-to-act button

- `width: 190px; height: 58px; background: #2BB76E; color: #FFFFFF;`
- `mono 15px 700 uppercase 0.1em; border: 2px solid var(--ink); border-radius: 0;`
- Press state: `transform: translateY(2px); background: #1E9B59;`
- Below the button, a muted `--mute` mono 10.5px hint ("Press and hold" / "Hold to charge · release to fire").
- Position: `position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%)`.

### Stat tile

A grid of equal cells on a `--line` background (so the gap *is* the divider):

```css
.ute-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1px; background: var(--line); border: 1px solid var(--line);
}
.ute-stats .stat { background: var(--surface); padding: 10px 12px; }
```

Each stat: a small `--mute` mono uppercase label on top, a mono 17–20px 700 `--ink` value below, with the unit in `--mute` 10.5 px pushed to the right of the value.

### Line chart (dyno)

- SVG `viewBox="0 0 400 110"`, no `preserveAspectRatio` — stretches to fit cell width.
- Axis: left + bottom thin `--line` lines.
- Grid: three horizontal `--line-soft` lines at ~33 %, 50 %, 66 %.
- Fill under the line: `fill-opacity: 0.08` same colour as the stroke.
- Stroke: 2 px, chart-specific colour (`--warm` for speed, `--accent` for RPM, `--intake` for throttle, `--heat` for brake).
- Scale labels: mono 9.5 px `--mute` — max at top-left, "0" at bottom-left, elapsed time at bottom-right.

### Timing strip (ICE engine stroke bar)

A horizontal strip at the bottom of the engine stage, divided into 2 or 4 coloured segments (`intake` light blue · `compression` cream · `power` warm orange · `exhaust` warm grey, or 2T variants: `power · blowdown · scavenge · compression`). A 2 px `--ink` vertical needle sweeps left-to-right at the current crank angle.

### Stroke badge

Inline-flex pill, `padding: 4px 10px`, `background: var(--ink); color: var(--paper); mono 10.5px 600 0.12em uppercase`. 8 px square dot at the start, colour per stroke (same mapping as the timing strip).

### Toast (rider horn / kill)

Absolutely-positioned pill at the top-centre of the rider wrap, `background: var(--warm); color: var(--paper); mono 12px 700 0.1em uppercase; padding: 8px 14px.` Fades in on action, fades out after 500–900 ms.

---

## Backgrounds

### Overview wrap

An engineering-grid paper. CSS stacked backgrounds:

```css
.ute-moto-wrap {
  background:
    linear-gradient(var(--line-soft) 1px, transparent 1px) 0 0 / 48px 48px,
    linear-gradient(90deg, var(--line-soft) 1px, transparent 1px) 0 0 / 48px 48px,
    var(--paper);
  border: 1px solid var(--line);
  overflow: hidden;
}
```

### Component view stage

Same engineering grid, slightly tighter (36 px), `--paper` base. Keeps the "I'm looking at a schematic" feel even over a photorealistic render.

### 3-D overview wrap (optional)

Soft radial gradient `white → beige → stone` to feel like a photo studio floor.

---

## Motion

- **Hover**: 150 ms ease, fill/stroke only.
- **Highlight pulse** (interactive dots): 2 s ease-in-out infinite.
- **Chip category fade**: 200 ms ease.
- **Button press**: 60 ms, `translateY(2px)`.
- **Toast fade**: 180 ms ease.
- **Engine animation**: 60 Hz request-animation-frame loop; crank is advanced at `(360 * rpm / 60) / 60 degrees per second` — i.e. 60× slow-motion by convention so the stroke sequence is legible at display RPMs.
- **Dyno sampling**: 20 Hz (`50 ms` throttle). Chart redraws every 3rd frame (~20 Hz effective) to keep CPU low.

Respect `prefers-reduced-motion`: swap the interactive-dot pulse for a static dot; keep the engine animation but allow pause via the top-bar play/pause button.

---

## Iconography

- No icon library. All glyphs are inline SVG.
- Only three icons appear in the top bar: play (▶ triangle), pause (⏸ two bars), help (circle with "?" mark).
- Rider view uses symbolic shapes rather than icons: the horn is a red circle, the kill switch is a square, the starter is a circle with a right-arrow glyph inside, the throttle twist is a vertical red stripe on the right grip that rotates.

---

## Favicon / brand

- Favicon: a 22 × 22 ink square with a 2 px warm-orange stripe across the lower third. Mirrors the brand mark in the top bar.
- Brand wordmark: `UNDER THE ENGINE` in sans 15 px 700 uppercase 0.02em, followed by a vertical 1 px rule, followed by a mono 10.5 px 500 uppercase `TRANSITIONS LAB` (or your sub-brand).

---

## Theme — single rule

**Light theme only.** No dark variant. Prototyping a dark version is wasted effort — the whole aesthetic is built around paper-white, 1 px ink rules and specific warm/cool signal colours that lose their meaning on a dark background.
