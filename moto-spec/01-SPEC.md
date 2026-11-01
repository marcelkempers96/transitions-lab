# Under the Engine — product spec

A standalone, light-theme, single-page web app that teaches how a motorcycle actually works. The learner picks a **mode** (4-stroke / 2-stroke / Electric), scans a labelled motorcycle **overview**, clicks any part to open a **3-D component close-up** below with its own controls, uses a **rider view** (handlebar top-down) to twist a throttle / pull a brake / honk, and records a run on a **dyno** with four live line charts.

This file is a top-level spec. See `02-DESIGN.md` for visual language, `03-FUNCTIONS.md` for interaction behaviour.

---

## Goals

- Make the invisible visible. Every clickable part of a motorcycle should open a 3-D close-up that shows what it does and lets you drive it.
- Teach by doing, not by reading. Short labels + live numbers + big hold-to-act buttons replace walls of prose.
- Make the differences between **ICE and EV** obvious — same overview layout, same category chips, same wiring view, but swap out powertrain and gas path for motor, controller and HV pack.
- Light, loadable, no login, no sign-up. One page, no dependencies beyond fonts.

## Non-goals

- Not a technical manual. Numbers are illustrative, not spec-sheet accurate.
- Not a 3-D CAD viewer. Visuals read as 3-D via SVG shading or supplied PNG/GLB assets, but no real-time ray tracing.
- Not a service tool. No parts catalogue, no OEM data, no fault codes.

---

## Framework & stack

**Preferred**: vanilla HTML + CSS + JS + inline SVG. No build step. Serves fine as static files behind any CDN.
**Alternative that works**: React + Vite + TypeScript, same visual language, same component boundaries. Three.js only if you add real 3-D models (`.glb`); otherwise skip it.
**Styling**: hand-written CSS tokens on `:root`. No Tailwind. No CSS-in-JS. No component library (no Radix, no shadcn).
**Fonts**: IBM Plex Sans + IBM Plex Mono via Google Fonts.
**Icons**: inline SVG, no icon library.

The app renders inside one container element (`<div id="ute-root"></div>`). A single JS module boots it. No router — everything is on one URL, state transitions happen inside the page.

---

## File / folder structure

```
/
├─ index.html                     # standalone shell, mounts #ute-root
├─ /assets/
│   ├─ styles.css                 # all CSS (design tokens + components)
│   ├─ app.js                     # all JS (state + render + components)
│   └─ /models/                   # (optional) PNG renders or GLB files per part
│       ├─ overview-4t.png
│       ├─ overview-2t.png
│       ├─ overview-elec.png
│       ├─ engine-4t.png / .glb
│       ├─ engine-2t.png / .glb
│       ├─ motor.png / .glb
│       ├─ piston.png / .glb
│       ├─ crankshaft.png / .glb
│       ├─ … one per interactive part
│       └─ handlebar-topdown.png
└─ /moto-spec/                    # these spec files
```

If you render with React, keep the same split: one global stylesheet, one state module, one tree of components. The point is **one page, one app**.

---

## Pages / routes

There is **one route**: `/` (or `/motorcycle-anatomy`, your choice).

Within the page, the state has these axes:

- `mode`: `'4t' | '2t' | 'elec'`
- `view`: `'diagram' | '3d'`
- `category`: `'all' | 'powertrain' | 'electrical' | 'chassis' | 'transmission' | 'frame' | 'wheels'`
- `selected_part`: `null | <part-key>`
- `running`: `boolean` (engine animation on/off)
- Numeric engine parameters (RPM, bore, stroke, compression)
- Rider inputs (throttle, brake, clutch, horn, kill)
- Dyno recording buffer

Nothing is persisted. Reload = fresh state.

---

## Page shell — top to bottom

```
┌─ TOP BAR ─────────────────────────────────────────────────────┐
│ [brand mark + wordmark]   [MODE SWITCH: 4t | 2t | elec]   [▶/⏸ ?]│
└──────────────────────────────────────────────────────────────┘

┌─ OVERVIEW ───────────────────────────────────────────────────┐
│ H2: active mode name (e.g. "Classic four-stroke")            │
│ [Diagram | 3D]  = interactive                                │
│ [All][Powertrain][Electrical][Chassis]...[Wiring →]          │
│ ┌────────────────────────────────────────────────────────┐   │
│ │  Big motorcycle SVG, labelled callouts, pulsing orange │   │
│ │  dots on interactive parts, category-filter fade       │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌─ COMPONENT VIEW (empty state when nothing selected) ─────────┐
│ Kind · Interactive                                 [Close ✕] │
│ H2: component name                                           │
│ ┌─ STAGE ────────────────────────────────────────────────┐   │
│ │ [status chip with live state + big number]             │   │
│ │ [the actual drawing / animation]                       │   │
│ │ [hold-to-act button] [hint]                            │   │
│ └────────────────────────────────────────────────────────┘   │
│ 3-column side cards: Parameters | Outputs | How / Parts      │
└──────────────────────────────────────────────────────────────┘

┌─ RIDE ───────────────────────────────────────────────────────┐
│ H2 Ride     Twist the throttle, pull the brake, honk the horn│
│ ┌─ handlebar top-down SVG ──────────────────────────────┐    │
│ │  [grip ← clutch]  [speedo]  [tacho]  [throttle grip →]│    │
│ │       [horn] [turn]  [kill switch] [starter button]   │    │
│ └───────────────────────────────────────────────────────┘    │
│ Dash: throttle % · brake % · clutch % · engine rpm · km/h    │
└──────────────────────────────────────────────────────────────┘

┌─ DYNO ───────────────────────────────────────────────────────┐
│ H2 Dyno        [Start test] [Reset]                          │
│ ┌─ 2×2 chart grid ─────────────────────────────────────┐     │
│ │  Speed km/h  |  RPM                                  │     │
│ │  Throttle %  |  Brake %                              │     │
│ └──────────────────────────────────────────────────────┘     │
│ Findings row: status · run time · peak speed · peak RPM ·    │
│ peak power · 0→100 km/h · avg throttle · samples             │
└──────────────────────────────────────────────────────────────┘

┌─ FOOTER ─────────────────────────────────────────────────────┐
│ project · brand                            inspired-by link  │
└──────────────────────────────────────────────────────────────┘
```

The order is deliberate. Overview is the hero; component view appears only when the user asks for it; ride view is the "feel" of the bike; dyno is the measurement surface. Nothing above the fold tries to be clever.

---

## Mode switching

Three modes share the shell: `4t`, `2t`, `elec`. Switching mode:

- Re-draws the overview SVG for that mode.
- Clears the current `selected_part` (otherwise the component view may be nonsensical in the new mode, e.g. `spark_plug` in Electric).
- Resets `crank_deg` to 0 so the animation is in a known state.
- Keeps `view` and `category` as they were.

Each mode has a distinct silhouette. The user's live assets will decide the exact look (we recommend one of): 4T = Bonneville-style classic; 2T = motocross dirt bike; Electric = flat-track scrambler. Only the active mode's name is shown anywhere — no three-way label repetition in the subtitle or footer.

---

## View switching

Two views for the overview: **Diagram** (clean line-art, labels, interactive dots) and **3D** (shaded render, same clickable regions). The toggle is a two-button segmented control; one is always active.

Both views carry the same `data-shape` attributes on their shapes so the click → component-view routing works identically. Only the artwork differs.

---

## System categories

Chip row above the overview SVG:

`All · Powertrain · Electrical · Chassis · Transmission · Frame + Body · Wheels · Wiring →`

Clicking a chip fades every shape **not** in that category to 22 % opacity and keeps in-category shapes at 100 %. `All` resets. The `Wiring →` chip is the odd one out — it is a shortcut to open the Wiring component view, not a filter.

The category of each part lives in a single `PART_CATEGORY` map (see `03-FUNCTIONS.md`).

---

## Click → component view

Clicking any shape with a `data-shape` attribute, or any callout label, or any list entry, calls `selectPart(key)`. The component view slot renders the config for that key.

Interactive parts (hold-to-act, animated, with sliders) are flagged with a **pulsing warm-orange dot** on the overview so the user can see at a glance which parts have a rich view. A small `= interactive` legend chip next to the view toggle explains the dot.

Parts that only have a static card still open — the component view falls back to a `basicCard` renderer that shows the part name, kind, description, static artwork and a few static stats.

---

## Rider view

A top-down handlebar SVG with pressable regions:

- **Throttle grip** (right): hold to climb RPM. Grip twists visually. Feeds `S.rpm` so the overview wheels start spinning and any open interactive component view (engine piston cycling, motor rotor spinning) tracks the throttle.
- **Front brake lever** (right, forward of grip): hold to bleed speed. If the brake component view is open, caliper pistons visibly squeeze.
- **Clutch lever** (left): hold to disengage drive.
- **Horn** (red button): press for a BEEP toast.
- **Kill switch** (red): toggle engine off.
- **Starter button** (black): restart.

Below the SVG, a 5-cell dashboard shows live `throttle % · brake % · clutch % · engine rpm · km/h`.

---

## Dyno

A separate section at the bottom.

- **Start test**: begins recording at 20 Hz into a rolling 30 s buffer, up to 600 samples.
- **Stop**: freeze the charts. Peaks and findings persist.
- **Reset**: clear everything.

Four live-updating SVG line charts in a 2×2 grid, each with:

- A header: label + current value + unit.
- A hand-rolled SVG `<path>` for the line + a faint fill under it.
- Three grid lines (33 % / 50 % / 66 %) + an axis along the left and bottom.
- Max value as a tick at the top-left; elapsed seconds at the bottom-right.

Charts: **Speed (km/h, 0–240) · RPM (0–10 000) · Throttle (0–100 %) · Brake (0–100 %)**.

Findings bar below: `Status · Run time · Peak speed · Peak RPM · Peak power · 0 → 100 km/h · Avg throttle · Samples`.

---

## Keyboard shortcuts

- `Space` — toggle running (engine animation on/off).
- `Esc` — clear selection, close the component view.
- `? / /` — open the help modal.

Shortcuts never fire while an input/textarea/select has focus.

---

## Accessibility & responsive

- Light theme only. No dark-mode variant.
- Mobile-first: everything stacks in reading order (top bar → overview → component view → rider → dyno).
- Breakpoints: 960 px (bench collapses to one column), 540 px (chip padding tightens, dash font shrinks).
- All interactive controls are real `<button>`s. SVG shapes with click handlers get `cursor: pointer` and warm-orange outline on hover + focus.
- Reduced-motion: the pulsing interactive dot can be swapped for a static orange dot under `prefers-reduced-motion`.

---

## What this spec deliberately leaves open

- The exact silhouette of each motorcycle — supply your own asset.
- The visual language of each component close-up — supply your own renders.
- The precise copy on cards (short and declarative; see `03-FUNCTIONS.md` for voice).
- Whether to use three.js for 3-D models or SVG shading — both are viable; pick based on your assets.

Everything else is prescribed. If you follow this spec, two independent builds end up looking like siblings.
