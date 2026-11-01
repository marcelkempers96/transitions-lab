# Under the Engine — functions & behaviour

How every piece works. Written as a build order — top to bottom roughly matches the sequence to implement.

See `01-SPEC.md` for product scope and `02-DESIGN.md` for the visual language.

---

## 1. State model

A single global state object. No store library needed.

```js
const S = {
  // ─ Mode / view ───────────────────────────
  mode: '4t',               // '4t' | '2t' | 'elec'
  view: 'diagram',          // 'diagram' | '3d'
  category: 'all',          // 'all' | 'powertrain' | 'electrical' | 'chassis' | 'transmission' | 'frame' | 'wheels'
  selected_part: null,      // null | <part key>

  // ─ Engine simulation ─────────────────────
  running: true,
  rpm: 2400,                // display RPM (drives the animation)
  bore_mm: 72,
  stroke_mm: 58,
  compression: 10.5,
  crank_deg: 0,             // 0..720 for 4T, 0..360 for 2T

  // ─ Electric subsystem ────────────────────
  elec: {
    rpm: 0,
    torque: 0,
    motor_temp: 60,         // °C
    controller_temp: 50,
    battery_soc: 85,        // %
  },

  // ─ Rider inputs (0..1 unless noted) ──────
  rider: {
    throttle: 0,
    brake: 0,
    clutch: 0,
    horn: 0,
    kill: false,
    throttle_hold: false,
    brake_hold: false,
    clutch_hold: false,
  },

  // ─ Interactive component view locals ─────
  cv: {
    charge: 0,              // ignition coil charge 0..100
    charge_was: false,
    charge_fire_t: -1,
    brake_pct: 0,
    fork_pct: 0,
    gear_rpm: 0,
    particles: [],          // throttle demo
    carb_pct: 0,
    carb_hold: false,
    spark_hold: false,
    gear_hold: false,
  },

  // ─ Dyno recording ────────────────────────
  dyno: {
    recording: false,
    start_ms: 0,
    samples: [],            // { t, speed, rpm, throttle, brake, power }
    maxSamples: 600,
    peak_speed: 0,
    peak_rpm: 0,
    peak_power: 0,
    tto100: null,
    avg_throttle: 0,
  },

  last_tick_ms: 0,
  last_dyno_sample_ms: 0,
};
```

Constants:

```js
const GEAR = { primary: 2.1, final: 2.6, gear3: 1.3, wheel_r_m: 0.30 };
```

---

## 2. Mode switching

```js
function switchMode(mode) {
  if (!['4t','2t','elec'].includes(mode) || mode === S.mode) return;
  S.mode = mode;
  S.crank_deg = 0;
  S.selected_part = null;
  render();                 // full re-render; mode changes the overview SVG
}
```

Wire the mode-switch buttons' click handlers to this. When mode is `elec`, the active mode-switch button and any mode badge switch to `--elec` green via a CSS class / attribute.

---

## 3. View switching (Diagram ↔ 3D)

```js
function wireViewSwitch() {
  document.querySelectorAll('.ute-view-toggle button').forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.getAttribute('data-view');
      if (v === S.view) return;
      S.view = v;
      // Toggle 'is-on' on the right button
      // Re-mount only the overview SVG; keep component view + rider + dyno as-is
      mountOverviewSVG();
    });
  });
}
```

`mountOverviewSVG()` picks the drawer by mode + view:

```js
function mountOverviewSVG() {
  const svg = document.querySelector('#ute-moto');
  svg.innerHTML = '';
  svg.classList.toggle('is-3d', S.view === '3d');
  if (S.view === '3d') {
    if (S.mode === '4t')      drawClassic4T3D(svg);
    else if (S.mode === '2t') drawMotocross2T3D(svg);
    else                      drawElectricBike3D(svg);
  } else {
    if (S.mode === '4t')      drawClassic4T(svg);
    else if (S.mode === '2t') drawMotocross2T(svg);
    else                      drawElectricBike(svg);
  }
  wireOverviewClicks(svg);
  applyMotoHighlight();
  applyMotoCategory();
  requestAnimationFrame(() => paintInteractiveDots());
}
```

---

## 4. Overview drawing contract

Each `draw*` function (diagram or 3D) must emit shapes that satisfy this contract:

- Every clickable region is a group `<g data-shape="<key>" class="ute-shape">` wrapping its paths/circles.
- Shapes that take a fill tint on highlight carry `data-fillable=""`.
- Callouts are groups `<g class="ute-callout" data-part="<key>">` with a leader `<path class="ute-callout-leader">`, a dot `<circle class="ute-callout-dot">` and a label `<text class="ute-callout-label">`.
- Labels fit into 4 lanes (two above, two below the bike) with at least ~100 px between adjacent labels in the same lane. See `callout()` helper below.

Reference lane layout for a 1200 × 600 viewBox:

```js
const laneY = { 1: 28, 2: 70, 3: 530, 4: 570 };
```

Helper for callouts:

```js
function callout({ key, sx, sy, lx, lane, label }) {
  const ly = laneY[lane];
  const grp = ns('g', { class: 'ute-callout', 'data-part': key });
  const d = `M ${sx} ${sy} L ${lx} ${ly + (lane <= 2 ? 10 : -10)}`;
  grp.appendChild(ns('path', { class: 'ute-callout-leader', d }));
  grp.appendChild(ns('circle', { class: 'ute-callout-dot', cx: sx, cy: sy, r: 3 }));
  const t = ns('text', { class: 'ute-callout-label', x: lx, y: ly, 'text-anchor': 'middle' });
  t.textContent = label.toUpperCase();
  grp.appendChild(t);
  return grp;
}
```

### Rotating wheels

Each wheel on the overview includes an inner `<g>` with:

```html
<g data-wheel="front_wheel" data-cx="254" data-cy="395" transform="rotate(0 254 395)">
  <!-- hub + spokes -->
</g>
```

Per tick, if `S.rider.throttle > 0.05`, compute wheel angular velocity from engine RPM and the gearing constants, and rotate each `<g data-wheel>` group:

```js
function updateOverviewTick(dt) {
  const svg = document.querySelector('#ute-moto');
  if (!svg) return;
  const wheelRPM = (S.rider.throttle > 0.05)
    ? (S.rpm / GEAR.primary / GEAR.gear3 / GEAR.final) : 0;
  const degStep = wheelRPM / 60 * 360 * dt;
  svg.querySelectorAll('[data-wheel]').forEach((g) => {
    const cur = parseFloat(g.getAttribute('data-rot') || '0') + degStep;
    g.setAttribute('data-rot', cur);
    const cx = g.getAttribute('data-cx'), cy = g.getAttribute('data-cy');
    g.setAttribute('transform', `rotate(${cur} ${cx} ${cy})`);
  });
}
```

---

## 5. Click → component view

### Routing

```js
function selectPart(key) {
  S.selected_part = (S.selected_part === key || key == null) ? null : key;
  applyMotoHighlight();
  renderComponentView();
  if (window.matchMedia('(max-width: 960px)').matches) {
    document.querySelector('#ute-cview-slot').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
```

### Click wiring

Every `[data-shape]` and `.ute-callout` on the overview SVG, plus every `[data-part]` list button, dispatches to `selectPart()`.

### Render router

```js
function renderComponentView() {
  const slot = document.querySelector('#ute-cview-slot');
  if (!S.selected_part) { slot.innerHTML = emptyCViewHTML(); return; }
  const cfg = COMPONENT_VIEWS[S.selected_part] || basicCard(S.selected_part);
  if (!cfg) { slot.innerHTML = emptyCViewHTML(); return; }
  slot.innerHTML = `
    <div class="ute-cview-head">
      <div><span class="ute-label">${cfg.kind || 'Component'}</span><h2>${cfg.title}</h2></div>
      <button class="ute-cview-close" type="button" data-cv-close>Close ✕</button>
    </div>
    <div class="ute-cview-stage" id="ute-cview-stage">${cfg.html()}</div>
    ${cfg.sideHTML ? cfg.sideHTML() : ''}
  `;
  if (cfg.mount) cfg.mount();
  slot.querySelector('[data-cv-close]')?.addEventListener('click', () => selectPart(null));
}
```

Each entry in `COMPONENT_VIEWS`:

```js
COMPONENT_VIEWS.<key> = {
  title: 'Human-readable name',
  kind: 'Combustion · Interactive',   // badge in the head
  html: () => `<!-- the stage content: chip + svg + controls -->`,
  sideHTML: () => `<!-- optional 3-column cards -->`,
  mount: () => { /* build SVG, wire buttons, cache paths */ },
  update: (dt) => { /* called by the main tick if present */ },
};
```

### Empty state

```js
function emptyCViewHTML() {
  return `<div class="ute-cview-empty">No part selected · click one above</div>`;
}
```

### Basic card (fallback)

For parts that have a PARTS entry but no custom component view, render a stripped-down card: chip + static SVG + 2 side cards (`Role`, `Note`). See the PARTS map further down.

---

## 6. System category filter

```js
const PART_CATEGORY = {
  // Powertrain (ICE)
  engine: 'powertrain', cylinder: 'powertrain', piston: 'powertrain',
  conrod: 'powertrain', crankshaft: 'powertrain', spark_plug: 'powertrain',
  valve_in: 'powertrain', valve_ex: 'powertrain',
  port_ex: 'powertrain', port_tr: 'powertrain',
  carb: 'powertrain', air_filter: 'powertrain',
  fuel_tank: 'powertrain', exhaust: 'powertrain',
  // Powertrain (electric)
  motor: 'powertrain', controller: 'powertrain', charge_port: 'powertrain',
  // Electrical + wiring
  battery: 'electrical', wiring: 'electrical',
  instruments: 'electrical', headlight: 'electrical', tail_light: 'electrical',
  // Frame + body
  frame: 'frame', seat: 'frame',
  // Chassis (suspension + brakes)
  forks: 'chassis', swingarm: 'chassis', rear_shock: 'chassis', brake: 'chassis',
  // Transmission
  chain: 'transmission', rear_sprocket: 'transmission',
  // Wheels
  front_wheel: 'wheels', rear_wheel: 'wheels',
};

const CATEGORIES = [
  { k: 'all',          label: 'All' },
  { k: 'powertrain',   label: 'Powertrain' },
  { k: 'electrical',   label: 'Electrical' },
  { k: 'chassis',      label: 'Chassis' },
  { k: 'transmission', label: 'Transmission' },
  { k: 'frame',        label: 'Frame + Body' },
  { k: 'wheels',       label: 'Wheels' },
];

function applyMotoCategory() {
  const svg = document.querySelector('#ute-moto');
  svg.setAttribute('data-cat', S.category);
  svg.querySelectorAll('.ute-shape').forEach((el) => el.classList.remove('in-cat'));
  if (S.category === 'all') return;
  svg.querySelectorAll('[data-shape]').forEach((el) => {
    const cat = PART_CATEGORY[el.getAttribute('data-shape')];
    if (cat === S.category && el.classList.contains('ute-shape')) el.classList.add('in-cat');
  });
}
```

CSS does the fade:

```css
.ute-moto-svg[data-cat]:not([data-cat="all"]) .ute-shape:not(.in-cat) {
  opacity: 0.22;
}
.ute-moto-svg[data-cat]:not([data-cat="all"]) .ute-shape.in-cat {
  opacity: 1;
}
@media (hover: hover) {
  .ute-moto-svg .ute-shape:hover { opacity: 1 !important; }
}
```

The `Wiring →` chip in the row has `data-open-cv="wiring"`. Clicking it calls `selectPart('wiring')` instead of changing `S.category`.

---

## 7. Interactive-part indicators

```js
const INTERACTIVE_PARTS = new Set([
  'engine','cylinder','piston','crankshaft','spark_plug','carb',
  'brake','chain','rear_sprocket','motor','controller','battery','wiring',
]);

function paintInteractiveDots() {
  const svg = document.querySelector('#ute-moto');
  svg.querySelectorAll('.ute-ix-dot').forEach((el) => el.remove());
  const seen = new Set();
  svg.querySelectorAll('[data-shape]').forEach((el) => {
    const k = el.getAttribute('data-shape');
    if (!k || seen.has(k) || !INTERACTIVE_PARTS.has(k)) return;
    seen.add(k);
    const shape = el.closest('.ute-shape') || el;
    try {
      const b = shape.getBBox();
      svg.appendChild(ns('circle', {
        class: 'ute-ix-dot',
        cx: b.x + b.width / 2,
        cy: b.y + b.height / 2,
        r: 5,
        'data-ix': k,
      }));
    } catch (e) { /* bbox not ready yet */ }
  });
}
```

Call it inside a `requestAnimationFrame` after mountOverviewSVG so `getBBox()` resolves.

---

## 8. Interactive component views

Every interactive view follows the same pattern:

1. A **status chip** at the top of the stage with: dot · title (bold warm) · description (soft ink) · live number (mono right-aligned).
2. The **drawing** (SVG) built in `mount()` with cached refs.
3. **Hold-to-act button** at the bottom-centre. Pointer-down sets a `*_hold` boolean on `S.cv`; pointer-up clears it.
4. **Side cards** (3 columns): `Live state` with stat tiles, `Parts` with a tight bullet list, and either `How` / `Rule` / `Timing` depending on the view.
5. A `update(dt)` function registered on the main tick that advances state and mutates the cached SVG elements.

### Engine (`engine`, 4T + 2T)

- Full engine cross-section with piston, con-rod, crankshaft, valves (4T) or ports (2T), spark plug, gas pocket. Parameters (RPM, bore, stroke, compression) scale the drawing in real time: piston width grows with bore, crank throw grows with stroke, head clearance shrinks with compression.
- Side cards: `Parameters` (4 sliders) · `Outputs` (displacement cc, compression ratio, torque Nm, power kW) · `Run` (Pause / Step +30° buttons).
- Below the stage, a timing strip with coloured segments and a moving needle (720° for 4T, 360° for 2T).
- Animation: at 60× slow-motion. Spark flashes near TDC. Valves lift on their stroke. 2T ports change opacity when the piston uncovers them. Gas colour cycles blue (intake) → cream (compression) → warm (power) → grey (exhaust).

Formulas:

```js
function displacementCC(bore_mm, stroke_mm) {
  return (Math.PI / 4) * bore_mm * bore_mm * stroke_mm / 1000;
}
function approxTorqueNm(disp_cc, mode, cr) {
  const base = (mode === '4t') ? 10 : (mode === '2t') ? 8 : 10;   // BMEP bar
  const bmep_bar = base * (1 + 0.03 * (cr - 10));
  const V = disp_cc * 1e-6;
  const nR = (mode === '4t') ? 2 : 1;
  return bmep_bar * 1e5 * V / (2 * Math.PI * nR);
}
```

### Electric motor (`motor`)

- Round PMAC motor cutaway: 12-tooth stator with copper windings, 8-pole rotor with alternating N/S magnets, air gap, output shaft, cooling fins. 3-phase cables emerge in copper / green / black.
- Rotor spins at `S.elec.rpm` (slow-motion). Running controls at the top-right play/pause toggle it.
- Side cards: `Live state` (RPM, torque, temp, SoC) · `Why it beats ICE` (peak torque at 0 rpm, ~90 % efficient, one moving part) · `How it spins`.

### Carburetor (`carb`) — hold GAS

- Intake tube cross-section with venturi, butterfly throttle plate, float bowl, main jet.
- Hold GAS → butterfly rotates from closed (ellipse rx=46) to open (rx=4). Blue air particles spawn and travel through the tube, bunching at the plate when closed. Local RPM climbs from 900 to ~7900.
- Side cards: `Live state` (throttle %, air g/s, fuel g/s) · `Parts` · `Target 14.7:1 AFR`.

### Spark plug / ignition (`spark_plug`) — hold IGNITE, release to fire

- Battery → coil (primary + secondary windings) → HT wire → spark plug cutaway → chamber with piston + gas pocket.
- Hold IGNITE: charge bar fills (0→100). Release: if charge ≥ 50, draw a zigzag arc across the gap and flash the chamber warm orange for ~400 ms. If charge < 50, chip reads **Misfire**.
- Side cards: `How` (12 V → ~25 kV) · `Parts` · `Timing` (fires once per 2 rev for 4T, every rev for 2T).

### Chain + gearing (`chain`, aliased from `rear_sprocket`) — hold REV

- Engine box on the left, small output sprocket, chain with hatching, large rear sprocket with teeth and lightening holes, rear wheel with spokes.
- Hold REV: engine RPM climbs 0 → 8000. Front sprocket spins at engine RPM, chain hatch slides via `stroke-dashoffset`, rear sprocket + wheel spin at `engine_rpm / final_ratio`.
- Side cards: `Live gearing` (engine rpm, wheel rpm, chain m/s, km/h, final ratio) · `Parts` · `Rule` (smaller rear = faster top, larger rear = quicker acceleration).

### Brake (`brake`) — hold BRAKE

- Large brake disc with venting holes rotating with wheel speed, floating caliper on the right with two visible hydraulic pistons.
- Hold BRAKE: pistons squeeze inward (translate `-10 px` × brake %), disc rotation slows proportionally, line pressure stat climbs 0 → 25 bar.
- Side cards: `Live state` (line pressure, pad squeeze, disc temp) · `Parts` · `How`.

### Battery (`battery`)

Static view, two variants by mode. ICE: a 12 V lead-acid / lithium starter battery (`12 V · 8–14 Ah · 120 A cold crank`). Electric: a big HV pack with visible cell cluster, "SWITCH"-style brand plate, cooling slits (`400 V · ~12 kWh · ~96 cells in series`). Side card: `Charge` — DC fast ~30 min or 4–8 h home AC for electric; trickle charger for ICE.

### Controller / inverter (`controller`) — electric only

- Heat sink base with fins. 6 SiC MOSFETs in three colour-coded phases (red / green / black). DC bus bars across the bottom.
- `update()` reads `S.elec.controller_temp` and updates a stat tile.
- Side cards: `Live state` (temp, DC input V, load, switching freq) · `Parts` (6 MOSFETs, gate driver, DC-link cap, MCU, cold plate) · `How` (chops DC into 3-phase AC at 16 kHz).

### Wiring + electrical (`wiring`) — interactive diagram

A single-level schematic that teaches V / A / W / Ω by hover.

- Nodes are small rounded rectangles with a title and a sub-label (the first spec, e.g. "12 V" or "25 000 V"). Mode-specific layouts:
  - **ICE** nodes: `Battery (12 V)` · `Main fuse (30 A)` · `Ignition switch` · `ECU` · `Ignition coil` · `Spark plug` · `Alternator` · `Rectifier / reg.` · `Headlight` · `Tail / brake` · `Horn` · `Instruments` · `Starter motor`.
  - **Electric** nodes: `Charge port` · `HV battery pack` · `BMS` · `Controller` · `Motor` · `DC-DC` · `12 V aux battery` · `Headlight (LED)` · `Instruments` · `Tail / brake`.
- Edges are right-angle elbows coloured by function: red = +12 V, black = ground, green dashed = HV DC, amber = AC phase, blue dashed = low-current signal.
- Hover any node → a sticky top-right pop-up with the node's title and 2–4 `label : value` rows pulled from its `specs` array.
- Legend across the bottom explains the five wire colours.
- Side cards: `How to read` (colour key in prose) · `Key laws` (`V = I·R`, `P = V·I`, 55 W bulb → 4.6 A at 12 V) · mode-specific context ("Why two bus voltages" for electric, "Why a battery AND an alternator" for ICE).

Node + link data lives in two per-mode arrays — see the shape in `01-SPEC.md` or the shipped reference implementation.

---

## 9. Rider view

Top-down handlebar SVG with pressable regions.

### Mount

- Horizontal crossbar across the top with grips at each end.
- **Right grip** carries a visible red twist stripe that rotates up to 30° based on `S.rider.throttle`.
- **Front brake lever** forward of the right grip; rotates `-20°` as `S.rider.brake` climbs.
- **Clutch lever** forward of the left grip; rotates `+20°` as `S.rider.clutch` climbs.
- Two round switch cubes under the bars: left cube has horn (red circle) + turn-signal; right cube has kill switch (red square) + starter (black circle with white arrow).
- Two round instruments in the centre: speedo (0–240 km/h) and tacho (0–10 ×1000 rpm), each with a warm-orange needle.
- Mirror stems peek out above the grips with chrome ellipses on top.

### Wiring

- Right grip + brake lever + clutch lever: `pointerdown` sets `*_hold = true`, `pointerup` clears it.
- Horn: `pointerdown` triggers a 500 ms "BEEP!" toast.
- Kill: `pointerdown` toggles `S.rider.kill`, swap button fill red↔black, 900 ms toast ("ENGINE KILLED" / "ENGINE LIVE").
- Starter: `pointerdown` sets `S.rider.kill = false`, 700 ms "STARTED" toast.

### Tick

```js
function updateRiderTick(dt) {
  // Throttle / brake / clutch chase their holds
  S.rider.throttle = S.rider.throttle_hold
    ? Math.min(1, S.rider.throttle + 1.8 * dt)
    : Math.max(0, S.rider.throttle - 1.2 * dt);
  S.rider.brake = S.rider.brake_hold
    ? Math.min(1, S.rider.brake + 3.0 * dt)
    : Math.max(0, S.rider.brake - 2.5 * dt);
  S.rider.clutch = S.rider.clutch_hold
    ? Math.min(1, S.rider.clutch + 3.0 * dt)
    : Math.max(0, S.rider.clutch - 2.5 * dt);

  // Visuals: twist mark, lever rotations
  // Needles: speedo + tacho
  // Dash: five mono cells
}
```

Needles map linearly over 270° of sweep (-225° to +45° in SVG coords).

---

## 10. Main loop

```js
function startLoop() { S.last_tick_ms = performance.now(); requestAnimationFrame(tick); }

function tick(now) {
  const dt = Math.min(0.1, (now - S.last_tick_ms) / 1000);
  S.last_tick_ms = now;

  // Rider throttle feeds engine RPM
  if (S.rider.throttle > 0.02) {
    const target = 900 + S.rider.throttle * 100 * 70;      // → ~7900 at full
    S.rpm += (target - S.rpm) * Math.min(1, 2.0 * dt);
  } else if (!S.rider.kill) {
    S.rpm += (900 - S.rpm) * Math.min(1, 1.0 * dt);
  } else {
    S.rpm = Math.max(0, S.rpm - 1200 * dt);
  }

  if (S.running && !S.rider.kill && S.rpm > 10) {
    const shaftDegPerSec = (360 * S.rpm / 60) / 60;         // 60× slow-mo
    const cycleDeg = (S.mode === '4t') ? 720 : 360;
    S.crank_deg = (S.crank_deg + shaftDegPerSec * dt) % cycleDeg;
  }

  // Electric subsystem
  if (S.mode === 'elec') {
    const target = S.rider.throttle * 10000;
    S.elec.rpm += (target - S.elec.rpm) * Math.min(1, 3.0 * dt);
    const load = S.rider.throttle;
    S.elec.motor_temp     += (60 + load * 60 - S.elec.motor_temp) * 0.3 * dt;
    S.elec.controller_temp+= (50 + load * 40 - S.elec.controller_temp) * 0.3 * dt;
    S.elec.battery_soc    = Math.max(0, S.elec.battery_soc - load * 0.015 * dt);
    S.elec.torque         = load * 95;
  }

  updateOverviewTick(dt);
  const cfg = COMPONENT_VIEWS[S.selected_part];
  if (cfg?.update) cfg.update(dt);
  updateRiderTick(dt);

  if (S.dyno.recording) {
    recordDynoSample(now);
    if ((++S._dynoFrame) % 3 === 0) { renderDynoCharts(); renderDynoFindings(); }
  }

  requestAnimationFrame(tick);
}
```

---

## 11. Dyno

### Charts config

```js
const DYNO_CHARTS = [
  { k: 'speed',    label: 'Speed',    unit: 'km/h', color: '#C2502A', max: 240 },
  { k: 'rpm',      label: 'RPM',      unit: 'rpm',  color: '#1D6B55', max: 10000 },
  { k: 'throttle', label: 'Throttle', unit: '%',    color: '#3E6FB7', max: 100 },
  { k: 'brake',    label: 'Brake',    unit: '%',    color: '#E2A93B', max: 100 },
];
```

### Sampling

```js
function recordDynoSample(now) {
  if (!S.dyno.recording) return;
  if (now - S.last_dyno_sample_ms < 50) return;                 // 20 Hz
  S.last_dyno_sample_ms = now;
  const wheelRPM = S.rpm / GEAR.primary / GEAR.gear3 / GEAR.final;
  const kmh = (wheelRPM / 60) * (2 * Math.PI * GEAR.wheel_r_m) * 3.6
            * (1 - S.rider.brake * 0.9);
  const disp = displacementCC(S.bore_mm, S.stroke_mm);
  const tq   = approxTorqueNm(disp, S.mode === 'elec' ? '4t' : S.mode, S.compression);
  const kw   = (S.mode === 'elec')
    ? (S.elec.torque * S.elec.rpm / 9549)
    : (tq * S.rpm / 9549);
  const t = (now - S.dyno.start_ms) / 1000;
  S.dyno.samples.push({ t, speed: kmh, rpm: (S.mode==='elec'?S.elec.rpm:S.rpm),
                        throttle: S.rider.throttle*100, brake: S.rider.brake*100, power: kw });
  if (S.dyno.samples.length > S.dyno.maxSamples) S.dyno.samples.shift();
  if (kmh > S.dyno.peak_speed) S.dyno.peak_speed = kmh;
  const nowRPM = S.mode === 'elec' ? S.elec.rpm : S.rpm;
  if (nowRPM > S.dyno.peak_rpm) S.dyno.peak_rpm = nowRPM;
  if (kw > S.dyno.peak_power) S.dyno.peak_power = kw;
  if (S.dyno.tto100 == null && kmh >= 100) S.dyno.tto100 = t;
  S.dyno.avg_throttle = S.dyno.samples.reduce((a, s) => a + s.throttle, 0) / S.dyno.samples.length;
}
```

### Chart drawing (per cell)

For each chart config, build an SVG `<path>` from the samples. Window the last 30 s of data. Build both a line path (`fill: none; stroke: color; stroke-width: 2`) and an area path (close back to the baseline, `fill: color; fill-opacity: 0.08`). Draw a tiny label at the top-left for the max value and at the bottom-right for the current `tEnd`.

### Findings bar

8 cells: `Status · Run time · Peak speed · Peak RPM · Peak power · 0 → 100 km/h · Avg throttle · Samples`. Each cell is a `.cell` with a mono uppercase label on top and a mono bold value below.

### Buttons

- **Start test** toggles: if not recording, start a fresh buffer with `start_ms = performance.now()`. If recording, stop. Toggle a `is-rec` class on the button so it goes warm orange while recording.
- **Reset** clears everything, resets charts to the empty state (just axes + "0" / max labels).

---

## 12. Parts data (PARTS)

Short descriptions for the basic-card fallback. Keep each `desc` to 2 sentences max, each `notes` to 1 sentence. Example entries:

```js
const PARTS = {
  piston:     { name: 'Piston',     tag: 'Combustion', desc: '…', notes: 'Mean piston speed above 25 m/s is motorsport territory.' },
  conrod:     { name: 'Connecting rod', tag: 'Combustion', desc: '…', notes: 'Rod length / stroke ratio around 1.75 is a sweet spot.' },
  crankshaft: { name: 'Crankshaft', tag: 'Combustion', desc: '…', notes: 'A parallel-twin uses two throws 360° apart for a smoother firing order.' },
  // valve_in / valve_ex / port_ex / port_tr / air_filter / fuel_tank / exhaust
  // instruments / headlight / tail_light / seat / frame / forks / rear_shock
  // swingarm / front_wheel / rear_wheel / charge_port
};
```

Any entry with no PARTS record falls back to a generic "Component" title and empty description — but every key referenced from a `data-shape` should have a PARTS entry.

---

## 13. SVG helpers

Three primitives are enough to build the whole thing without a lib:

```js
function ns(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function txt(x, y, s, anchor, size) {
  const t = ns('text', {
    x, y,
    fill: '#6B6963',
    'font-family': 'IBM Plex Mono, monospace',
    'font-size': size || 11,
    'letter-spacing': '0.08em',
    'text-anchor': anchor || 'start',
  });
  t.textContent = s;
  return t;
}

function iso3DBox(x, y, w, h, d, colors) {
  const g = ns('g');
  const dx = d * 0.5, dy = d * 0.4;
  g.appendChild(ns('polygon', { points: `${x},${y+h} ${x+w},${y+h} ${x+w+dx},${y+h-dy} ${x+dx},${y+h-dy}`, fill: colors.bottom || colors.right || colors.front, opacity: 0.8 }));
  g.appendChild(ns('rect',    { x, y, width: w, height: h, fill: colors.front, stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('polygon', { points: `${x},${y} ${x+w},${y} ${x+w+dx},${y-dy} ${x+dx},${y-dy}`, fill: colors.top, stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('polygon', { points: `${x+w},${y} ${x+w+dx},${y-dy} ${x+w+dx},${y+h-dy} ${x+w},${y+h}`, fill: colors.right, stroke: '#0A0A0A', 'stroke-width': 2 }));
  return g;
}

function hexBolt(cx, cy, size) {
  const g = ns('g');
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI + Math.PI / 6;
    pts.push(`${cx + Math.cos(a) * size},${cy + Math.sin(a) * size}`);
  }
  g.appendChild(ns('polygon', { points: pts.join(' '), fill: '#8E867A', stroke: '#0A0A0A', 'stroke-width': 0.7 }));
  g.appendChild(ns('circle',  { cx: cx - size*0.25, cy: cy - size*0.25, r: size * 0.4, fill: '#F2EEE4', opacity: 0.4 }));
  g.appendChild(ns('circle',  { cx, cy, r: size * 0.3, fill: '#1A1816' }));
  return g;
}
```

Add gradient defs on first use via a `defsPackMetals(svg)` helper that emits a shared palette (chrome, aluminium, copper, steel, case, cover, piston, rod). Keep gradient IDs stable so component views can reference them from CSS or path fills.

---

## 14. Interaction wiring summary

| Trigger                                     | Effect                                                                 |
|---------------------------------------------|------------------------------------------------------------------------|
| Click mode button                           | `switchMode()` — re-render, clear selection                            |
| Click view toggle                           | `S.view =`, `mountOverviewSVG()`                                       |
| Click category chip                         | `S.category =`, `applyMotoCategory()`                                  |
| Click `Wiring →` chip                       | `selectPart('wiring')`                                                 |
| Click any `[data-shape]` or `.ute-callout`  | `selectPart(key)`                                                      |
| Click `Close ✕` in component view head      | `selectPart(null)`                                                     |
| Pointer-down on hold-to-act button          | set the matching `*_hold` on `S.cv`; add `is-holding` class            |
| Pointer-up / cancel on hold-to-act          | clear the hold; remove `is-holding`                                    |
| Pointer-down on right grip (rider)          | `S.rider.throttle_hold = true`                                         |
| Pointer-down on front brake lever (rider)   | `S.rider.brake_hold = true`                                            |
| Pointer-down on clutch lever (rider)        | `S.rider.clutch_hold = true`                                           |
| Pointer-down on horn                        | 500 ms "BEEP!" toast                                                   |
| Pointer-down on kill                        | toggle `S.rider.kill`, swap fill, 900 ms toast                         |
| Pointer-down on starter                     | `S.rider.kill = false`, 700 ms "STARTED" toast                         |
| Click **Start test** on Dyno                | begin recording, reset peaks, swap button to `is-rec`                  |
| Click **Reset**                             | wipe samples + peaks, re-render charts and findings                    |
| Drag a parameter slider in Engine view      | update `S.<key>`, re-render outputs, drawing scales via `update(dt)`   |
| Hover a wiring node                         | pop up top-right card with the node's specs                            |
| Space                                       | `toggleRun()` — pauses or resumes the engine animation                 |
| Esc                                         | `selectPart(null)` — closes the component view                         |
| ? / /                                       | opens the help modal                                                   |

---

## 15. Boot

```html
<body>
  <div id="ute-root"></div>
  <script src="/assets/app.js" defer></script>
</body>
```

```js
if (document.getElementById('ute-root')) {
  render();           // full first render
  wireChromeGlobal(); // keyboard shortcuts
  startLoop();        // begin the tick
}
```

That is the whole app.

---

## What this spec does NOT cover

- The actual **artwork** of each motorcycle or component close-up. Supply your own SVG, PNG renders, or GLB models — the keys and interaction contracts above are what glue them together.
- A **router**. The whole product lives at one URL.
- A **backend**. Everything is in-memory. If you want to persist dyno runs or shared configurations, add a tiny localStorage layer at the end.
- **Analytics**. Add your own if you want them.

If you follow files 01 + 02 + 03 end-to-end, you should be able to brief Claude in a fresh repo with "build the Under the Engine app per `moto-spec/*.md`" and get back something that looks and behaves like the version Marcel has been iterating on, ready to take your assets.
