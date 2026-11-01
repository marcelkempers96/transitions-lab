/*
 * Under the Engine — motorcycle anatomy explorer (v0.3).
 *
 * Mounts into <div id="ute-root"></div> in /motorcycle-anatomy.html.
 *
 * v0.3 architecture:
 *   • Mode switch: 4-stroke CLASSIC · 2-stroke MOTOCROSS · ELECTRIC.
 *     Each mode draws its own overview motorcycle.
 *   • Click any labelled part on the overview → a 3-D-styled Component
 *     view opens below with the right close-up (engine cross-section,
 *     electric motor cutaway, carb cutaway, chain + sprockets, brake
 *     caliper, battery, etc). Interactive views have hold-to-act
 *     buttons; the engine view carries its own sliders + timing strip.
 *   • Ride the motorcycle — top-down handlebar with throttle (hold),
 *     front brake, horn, kill switch. The throttle feeds the engine
 *     RPM so the overview + any open component view respond in real
 *     time.
 *
 * Light theme only. Sharp edges, 1 px rules, IBM Plex Sans + Mono.
 */

const ROOT = document.getElementById('ute-root');

const ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

// ───────────────────────── State ────────────────────────────────
const S = {
  mode: '4t',            // '4t' | '2t' | 'elec'
  view: 'diagram',       // 'diagram' | 'blueprint'
  selected_part: null,
  running: true,
  rpm: 2400,
  bore_mm: 72,
  stroke_mm: 58,
  compression: 10.5,
  crank_deg: 0,
  // electric subsystem
  elec: { rpm: 0, torque: 0, motor_temp: 60, controller_temp: 50, battery_soc: 85 },
  // rider inputs (drive the overview + any open interactive component)
  rider: { throttle: 0, brake: 0, clutch: 0, horn: 0, kill: false, starter_hold: 0 },
  // interactive component view local states
  cv: { charge: 0, charge_was: false, charge_fire_t: -1, brake_pct: 0, fork_pct: 0, gear_rpm: 0, particles: [] },
  // Dyno test track
  dyno: {
    recording: false,
    start_ms: 0,
    samples: [],       // { t, speed, rpm, throttle, brake, power }
    maxSamples: 600,   // ~30 s at 20 Hz
    peak_speed: 0,
    peak_rpm: 0,
    peak_power: 0,
    tto100: null,      // seconds to reach 100 km/h
    avg_throttle: 0,
  },
  last_tick_ms: 0,
  last_dyno_sample_ms: 0,
};

const GEAR = { primary: 2.1, final: 2.6, gear3: 1.3, wheel_r_m: 0.30 };

// ───────────────────────── Shell + top-level render ─────────────
function render() {
  ROOT.innerHTML = shellHTML();
  mountOverviewSVG();
  renderComponentView();
  mountRiderSVG();
  wireChromeLocal();
  wireModeSwitch();
  wireViewSwitch();
  renderDynoCharts();
  renderDynoFindings();
  wireDynoButtons();
}

function shellHTML() {
  return `
    <header class="ute-topbar">
      <a class="ute-brand" href="/motorcycle" aria-label="Under the Engine on transitionslab.org">
        <span class="ute-brand-mark" aria-hidden="true"></span>
        <span class="ute-brand-name">Under the Engine</span>
        <span class="ute-brand-sub">Transitions Lab</span>
      </a>
      <div class="ute-mode-switch" role="group" aria-label="Vehicle mode">
        <button type="button" data-mode="4t"   class="${S.mode==='4t'?'is-on':''}">4-stroke</button>
        <button type="button" data-mode="2t"   class="${S.mode==='2t'?'is-on':''}">2-stroke</button>
        <button type="button" data-mode="elec" class="${S.mode==='elec'?'is-on':''}">Electric</button>
      </div>
      <div class="ute-tools">
        <button class="ute-tbtn ute-run-toggle ${S.running?'is-on':''}" type="button" aria-label="${S.running?'Pause':'Play'}" title="${S.running?'Pause':'Play'} (Space)">
          ${S.running ? ICON_PAUSE : ICON_PLAY}
        </button>
        <button class="ute-tbtn ute-help" type="button" aria-label="Help" title="How this tool works">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>
        </button>
      </div>
    </header>

    <div class="ute-stack">

      <section class="ute-overview">
        <div class="ute-overview-head">
          <div>
            <h2>${modeTitle()}</h2>
            <p>Click a part &rarr; close-up below.</p>
          </div>
          <div style="display:inline-flex; gap:10px; align-items:center;">
            <div class="ute-view-toggle" role="group" aria-label="Overview view">
              <button type="button" data-view="diagram"   class="${S.view==='diagram'?'is-on':''}">Diagram</button>
              <button type="button" data-view="blueprint" class="${S.view==='blueprint'?'is-on':''}">Blueprint</button>
              <button type="button" data-view="3d"        class="${S.view==='3d'?'is-on':''}">3D</button>
            </div>
            <span class="ute-overview-badge" data-m="${S.mode}">${modeShort()}</span>
          </div>
        </div>
        <div class="ute-moto-wrap ${S.view==='blueprint'?'is-blueprint':''} ${S.view==='3d'?'is-3d':''}" id="ute-moto-wrap">
          <svg class="ute-moto-svg ${S.view==='blueprint'?'is-blueprint':''}" id="ute-moto" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid meet" aria-label="Motorcycle anatomy diagram"></svg>
        </div>
      </section>

      <section class="ute-cview" id="ute-cview-slot">
        ${emptyCViewHTML()}
      </section>

      <section class="ute-rider">
        <div class="ute-rider-head">
          <div>
            <h2>Ride</h2>
            <p>Twist the throttle, pull the brake, honk the horn.</p>
          </div>
        </div>
        <div class="ute-rider-wrap">
          <div class="ute-rider-toast" id="ute-rider-toast">BEEP!</div>
          <svg class="ute-rider-svg" id="ute-rider" viewBox="0 0 900 480" preserveAspectRatio="xMidYMid meet" aria-label="Rider handlebar"></svg>
        </div>
        <div class="ute-rider-dash" id="ute-rider-dash"></div>
      </section>

      <section class="ute-dyno">
        <div class="ute-dyno-head">
          <div>
            <h2>Dyno</h2>
            <p>Record a run. Hit START, ride, HIT STOP. The charts trace what happened second by second.</p>
          </div>
          <div class="ute-dyno-controls">
            <button class="ute-dyno-btn" type="button" id="ute-dyno-start">${S.dyno.recording ? 'Stop' : 'Start test'}</button>
            <button class="ute-dyno-btn is-reset" type="button" id="ute-dyno-reset">Reset</button>
          </div>
        </div>
        <div class="ute-dyno-charts" id="ute-dyno-charts"></div>
        <div class="ute-dyno-findings" id="ute-dyno-findings"></div>
      </section>

      <footer class="ute-foot">
        <span>v0.3 · ${modeShort()} · Transitions Lab</span>
        <span>Inspired by <a href="https://www.underthehood.online" target="_blank" rel="noopener">underthehood.online</a></span>
      </footer>
    </div>
  `;
}

function modeTitle() {
  return S.mode === '4t'   ? 'Classic four-stroke'
       : S.mode === '2t'   ? 'Motocross two-stroke'
       : 'Electric motorcycle';
}
function modeShort() {
  return S.mode === '4t' ? 'Four-stroke · Classic' : S.mode === '2t' ? 'Two-stroke · Motocross' : 'Electric · Naked';
}

function emptyCViewHTML() {
  return `<div class="ute-cview-empty">No part selected · click one above</div>`;
}

// ───────────────────────── Mode switching ────────────────────────
function switchMode(mode) {
  if (!['4t','2t','elec'].includes(mode) || mode === S.mode) return;
  S.mode = mode;
  S.crank_deg = 0;
  S.selected_part = null;
  render();
}

function wireModeSwitch() {
  ROOT.querySelectorAll('.ute-mode-switch button').forEach((b) => {
    b.addEventListener('click', () => switchMode(b.getAttribute('data-mode')));
  });
}

function wireChromeLocal() {
  const rt = ROOT.querySelector('.ute-run-toggle');
  if (rt) rt.addEventListener('click', toggleRun);
  const h = ROOT.querySelector('.ute-help');
  if (h) h.addEventListener('click', openHelp);
}

function wireChromeGlobal() {
  if (document.__uteKeys) return;
  document.__uteKeys = true;
  document.addEventListener('keydown', (ev) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || '')) return;
    if (ev.key === ' ') { ev.preventDefault(); toggleRun(); }
    else if (ev.key === '?' || ev.key === '/') { openHelp(); }
    else if (ev.key === 'Escape') { selectPart(null); }
  });
}

function toggleRun() {
  S.running = !S.running;
  const rt = ROOT.querySelector('.ute-run-toggle');
  if (rt) {
    rt.innerHTML = S.running ? ICON_PAUSE : ICON_PLAY;
    rt.classList.toggle('is-on', S.running);
    rt.setAttribute('aria-label', S.running ? 'Pause' : 'Play');
  }
  S.last_tick_ms = performance.now();
}

function openHelp() {
  alert([
    'Under the Engine — v0.3',
    '',
    '• Pick 4-stroke / 2-stroke / Electric in the top bar — the whole motorcycle changes.',
    '• Click any labelled part on the overview to open a 3-D close-up with its own controls.',
    '• Ride the motorcycle at the bottom — hold the throttle, pull the front brake, press the horn.',
    '• Space pauses / resumes the engine animation.',
    '• Esc clears a selection.',
  ].join('\n'));
}

// ───────────────────────── Loop ─────────────────────────────────
function startLoop() { S.last_tick_ms = performance.now(); requestAnimationFrame(tick); }
function tick(now) {
  const dt = Math.min(0.1, (now - S.last_tick_ms) / 1000);
  S.last_tick_ms = now;

  // Rider throttle feeds engine RPM
  if (S.rider.throttle > 0.02) {
    const target = 900 + S.rider.throttle * 100 * 70;
    S.rpm += (target - S.rpm) * Math.min(1, 2.0 * dt);
  } else if (!S.rider.kill) {
    S.rpm += (900 - S.rpm) * Math.min(1, 1.0 * dt);
  } else {
    S.rpm = Math.max(0, S.rpm - 1200 * dt);
  }

  if (S.running && !S.rider.kill && S.rpm > 10) {
    const shaftDegPerSec = (360 * S.rpm / 60) / 60;    // 60× slow-mo
    const cycleDeg = (S.mode === '4t') ? 720 : 360;
    S.crank_deg = (S.crank_deg + shaftDegPerSec * dt) % cycleDeg;
  }

  // Electric subsystem
  if (S.mode === 'elec') {
    const target = S.rider.throttle * 10000;
    S.elec.rpm += (target - S.elec.rpm) * Math.min(1, 3.0 * dt);
    const load = S.rider.throttle;
    S.elec.motor_temp += (60 + load * 60 - S.elec.motor_temp) * 0.3 * dt;
    S.elec.controller_temp += (50 + load * 40 - S.elec.controller_temp) * 0.3 * dt;
    S.elec.battery_soc = Math.max(0, S.elec.battery_soc - load * 0.015 * dt);
    S.elec.torque = load * 95;
  }

  // Update overview motorcycle wheels (rotation only — nothing moves otherwise)
  updateOverviewTick(dt);

  // Update any open interactive component view
  if (S.selected_part && COMPONENT_VIEWS[S.selected_part] && COMPONENT_VIEWS[S.selected_part].update) {
    COMPONENT_VIEWS[S.selected_part].update(dt);
  }

  // Rider view (speedo needles, brake light, etc.)
  updateRiderTick(dt);

  // Dyno sampling + chart redraw while recording
  if (S.dyno.recording) {
    recordDynoSample(now);
    // Light-weight re-render of chart paths every ~3 frames
    if (!S._dynoFrame) S._dynoFrame = 0;
    S._dynoFrame++;
    if (S._dynoFrame % 3 === 0) {
      renderDynoCharts();
      renderDynoFindings();
    }
  }

  requestAnimationFrame(tick);
}

// ───────────────────────── Selection + highlight ────────────────
function selectPart(key) {
  S.selected_part = (S.selected_part === key || key == null) ? null : key;
  applyMotoHighlight();
  renderComponentView();
  const cv = ROOT.querySelector('#ute-cview-slot');
  if (cv && window.matchMedia('(max-width: 960px)').matches) {
    cv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function applyMotoHighlight() {
  const svg = ROOT.querySelector('#ute-moto');
  if (!svg) return;
  svg.querySelectorAll('.ute-shape').forEach((el) => el.classList.remove('is-highlight'));
  if (!S.selected_part) return;
  svg.querySelectorAll(`[data-shape="${S.selected_part}"]`).forEach((el) => {
    if (el.classList && el.classList.contains('ute-shape')) el.classList.add('is-highlight');
  });
  svg.querySelectorAll('.ute-callout').forEach((grp) => grp.classList.toggle('is-on', grp.getAttribute('data-part') === S.selected_part));
}

// ───────────────────────── Overview per-mode SVG ────────────────
function mountOverviewSVG() {
  const svg = ROOT.querySelector('#ute-moto');
  const wrap = ROOT.querySelector('#ute-moto-wrap');
  if (!svg) return;
  svg.innerHTML = '';
  svg.classList.toggle('is-blueprint', S.view === 'blueprint');
  svg.classList.toggle('is-3d', S.view === '3d');
  if (wrap) {
    wrap.classList.toggle('is-blueprint', S.view === 'blueprint');
    wrap.classList.toggle('is-3d', S.view === '3d');
  }
  if (S.view === 'blueprint') {
    if (S.mode === '4t')      drawClassic4TBlueprint(svg);
    else if (S.mode === '2t') drawMotocross2TBlueprint(svg);
    else                      drawElectricBikeBlueprint(svg);
  } else if (S.view === '3d') {
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
}

function wireViewSwitch() {
  ROOT.querySelectorAll('.ute-view-toggle button').forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.getAttribute('data-view');
      if (v === S.view) return;
      S.view = v;
      ROOT.querySelectorAll('.ute-view-toggle button').forEach((bb) => bb.classList.toggle('is-on', bb.getAttribute('data-view') === v));
      mountOverviewSVG();
    });
  });
}

function wireOverviewClicks(svg) {
  svg.querySelectorAll('[data-shape]').forEach((el) => {
    el.addEventListener('click', (ev) => { ev.stopPropagation(); selectPart(el.getAttribute('data-shape')); });
  });
  svg.querySelectorAll('.ute-callout').forEach((grp) => {
    grp.addEventListener('click', (ev) => { ev.stopPropagation(); selectPart(grp.getAttribute('data-part')); });
  });
}

function updateOverviewTick(dt) {
  // Rotate wheels on overview if we have them
  const svg = ROOT.querySelector('#ute-moto');
  if (!svg) return;
  const wheelRPM = (S.rider.throttle > 0.05) ? (S.rpm / GEAR.primary / GEAR.gear3 / GEAR.final) : 0;
  const degStep = wheelRPM / 60 * 360 * dt;
  svg.querySelectorAll('[data-wheel]').forEach((g) => {
    const cur = parseFloat(g.getAttribute('data-rot') || '0') + degStep;
    g.setAttribute('data-rot', cur);
    const cx = g.getAttribute('data-cx'), cy = g.getAttribute('data-cy');
    g.setAttribute('transform', `rotate(${cur} ${cx} ${cy})`);
  });
}

// ───────────────────────── Overview helpers ─────────────────────
function callout(cfg) {
  // cfg: { key, sx, sy, lx, lane: 1..4, label, laneY }
  const laneY = cfg.laneY || { 1: 28, 2: 70, 3: 530, 4: 570 };
  const ly = laneY[cfg.lane];
  const grp = ns('g', { class: 'ute-callout' + (S.selected_part === cfg.key ? ' is-on' : ''), 'data-part': cfg.key });
  const d = `M ${cfg.sx} ${cfg.sy} L ${cfg.lx} ${ly + (cfg.lane <= 2 ? 10 : -10)}`;
  grp.appendChild(ns('path', { class: 'ute-callout-leader', d }));
  grp.appendChild(ns('circle', { class: 'ute-callout-dot', cx: cfg.sx, cy: cfg.sy, r: 3 }));
  const label = ns('text', { class: 'ute-callout-label', x: cfg.lx, y: ly, 'text-anchor': 'middle' });
  label.textContent = cfg.label.toUpperCase();
  grp.appendChild(label);
  return grp;
}

function wheelSVG(cx, cy, r, key, knobby) {
  const g = ns('g', { 'data-shape': key, class: 'ute-shape' });
  g.appendChild(ns('circle', { cx, cy, r, fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': key }));
  // Knobby tread for motocross
  if (knobby) {
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * 2 * Math.PI;
      const rr = (i % 2 === 0) ? (r - 5) : (r - 9);
      const x1 = cx + Math.cos(a) * (r - 3), y1 = cy + Math.sin(a) * (r - 3);
      const x2 = cx + Math.cos(a) * rr, y2 = cy + Math.sin(a) * rr;
      g.appendChild(ns('line', { x1, y1, x2, y2, stroke: '#0A0A0A', 'stroke-width': 3, 'data-shape': key }));
    }
  } else {
    g.appendChild(ns('circle', { cx, cy, r: r - 12, fill: 'none', stroke: '#2A2A26', 'stroke-width': 1, 'data-shape': key }));
  }
  // Rim
  g.appendChild(ns('circle', { cx, cy, r: r - 25, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': key, 'data-fillable': '' }));
  // Rotating group (hub + spokes)
  const rot = ns('g', { 'data-wheel': key, 'data-cx': cx, 'data-cy': cy, 'data-shape': key });
  rot.appendChild(ns('circle', { cx, cy, r: 16, fill: '#4A4642', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': key }));
  rot.appendChild(ns('circle', { cx, cy, r: 4,  fill: '#0A0A0A', 'data-shape': key }));
  // Spokes (3 twin-pairs for sportbike/classic, radial 20 for spoked wheels)
  if (knobby) {
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * 2 * Math.PI;
      rot.appendChild(ns('line', { x1: cx + Math.cos(a)*16, y1: cy + Math.sin(a)*16, x2: cx + Math.cos(a)*(r-26), y2: cy + Math.sin(a)*(r-26), stroke: '#B9B3A4', 'stroke-width': 1.5, 'data-shape': key }));
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const a1 = (i / 3) * 2 * Math.PI;
      const a2 = a1 + 0.18;
      rot.appendChild(ns('line', { x1: cx + Math.cos(a1)*16, y1: cy + Math.sin(a1)*16, x2: cx + Math.cos(a1)*(r-27), y2: cy + Math.sin(a1)*(r-27), stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': key }));
      rot.appendChild(ns('line', { x1: cx + Math.cos(a2)*16, y1: cy + Math.sin(a2)*16, x2: cx + Math.cos(a2)*(r-27), y2: cy + Math.sin(a2)*(r-27), stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': key }));
    }
  }
  g.appendChild(rot);
  return g;
}

// ───────────────────────── SVG helpers ──────────────────────────
function ns(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function txt(x, y, s, anchor, size) {
  const t = ns('text', { x, y, fill: '#6B6963', 'font-family': 'IBM Plex Mono, monospace', 'font-size': size || 11, 'letter-spacing': '0.08em', 'text-anchor': anchor || 'start' });
  t.textContent = s;
  return t;
}

// ───────────────────────── Three motorcycle silhouettes ─────────
// These are drawn as blueprint-style line-art plus a few filled shapes
// so that each major component is a clickable region. Each silhouette
// also carries callouts labelling the parts.

function drawClassic4T(svg) {
  const g = ns('g');
  // Ground
  g.appendChild(ns('line', { x1: 0, y1: 490, x2: 1200, y2: 490, stroke: '#B9B3A4', 'stroke-dasharray': '4 6' }));

  // ── Frame rails (steel tube) ──────────────────────────────────
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  // Top tube
  frame.appendChild(ns('path', { d: 'M 300 240 L 430 235 L 670 245 L 720 270', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': 'frame' }));
  // Downtube
  frame.appendChild(ns('path', { d: 'M 305 245 L 435 380 L 540 410', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': 'frame' }));
  // Seat rail
  frame.appendChild(ns('path', { d: 'M 680 255 L 820 258 L 905 262', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 3, 'data-shape': 'frame' }));
  // Rear subframe triangle
  frame.appendChild(ns('path', { d: 'M 720 400 L 820 260 L 820 400 Z', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 2.5, 'data-shape': 'frame' }));
  // Steering head
  frame.appendChild(ns('rect', { x: 288, y: 225, width: 28, height: 55, fill: '#E6E1D4', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // ── Front forks ───────────────────────────────────────────────
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  // Classic telescopic (right-side-up): rubber gaiters on upper, chrome lower
  forks.appendChild(ns('line', { x1: 298, y1: 235, x2: 258, y2: 395, stroke: '#D4CFC2', 'stroke-width': 11, 'data-shape': 'forks' }));
  forks.appendChild(ns('line', { x1: 316, y1: 235, x2: 276, y2: 395, stroke: '#D4CFC2', 'stroke-width': 11, 'data-shape': 'forks' }));
  // Gaiter wrinkles
  for (let i = 0; i < 4; i++) {
    forks.appendChild(ns('line', { x1: 254 + i*5, y1: 290 + i*8, x2: 320 - i*5, y2: 290 + i*8, stroke: '#B9B3A4', 'stroke-width': 0.6, 'data-shape': 'forks' }));
  }
  // Top triple
  forks.appendChild(ns('rect', { x: 282, y: 215, width: 54, height: 14, fill: '#2A2A26', stroke: '#0A0A0A', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Handlebar
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  bar.appendChild(ns('path', { d: 'M 309 210 L 365 165 L 440 158', fill: 'none', stroke: '#111', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 309 210 L 265 185 L 200 180', fill: 'none', stroke: '#111', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-shape': 'instruments' }));
  // Grips
  bar.appendChild(ns('rect', { x: 190, y: 174, width: 24, height: 12, fill: '#111', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 430, y: 152, width: 24, height: 12, fill: '#111', 'data-shape': 'instruments' }));
  // Mirror
  bar.appendChild(ns('ellipse', { cx: 215, cy: 140, rx: 15, ry: 9, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'instruments' }));
  bar.appendChild(ns('line', { x1: 215, y1: 148, x2: 215, y2: 175, stroke: '#111', 'stroke-width': 2, 'data-shape': 'instruments' }));
  // Round instruments (two)
  bar.appendChild(ns('circle', { cx: 350, cy: 185, r: 20, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'instruments', 'data-fillable': '' }));
  bar.appendChild(ns('circle', { cx: 390, cy: 185, r: 20, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'instruments' }));
  bar.appendChild(ns('line', { x1: 350, y1: 185, x2: 362, y2: 173, stroke: '#C2502A', 'stroke-width': 1.5, 'data-shape': 'instruments' }));
  bar.appendChild(ns('line', { x1: 390, y1: 185, x2: 400, y2: 178, stroke: '#C2502A', 'stroke-width': 1.5, 'data-shape': 'instruments' }));
  svg.appendChild(bar);

  // ── Headlight (classic round, chrome bezel) ───────────────────
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('circle', { cx: 265, cy: 260, r: 44, fill: '#F2EEE2', stroke: '#0A0A0A', 'stroke-width': 2.5, 'data-shape': 'headlight', 'data-fillable': '' }));
  hl.appendChild(ns('circle', { cx: 265, cy: 260, r: 32, fill: '#E2A93B', 'data-shape': 'headlight' }));
  hl.appendChild(ns('circle', { cx: 258, cy: 253, r: 7, fill: '#FFFFFF', opacity: 0.75, 'data-shape': 'headlight' }));
  svg.appendChild(hl);

  // Front fender (classic chrome arc)
  const fender = ns('path', { d: 'M 170 350 Q 258 310 345 355 L 340 365 Q 258 325 180 365 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'front_wheel', class: 'ute-shape' });
  svg.appendChild(fender);

  // ── Fuel tank (classic teardrop) ──────────────────────────────
  const tank = ns('g', { 'data-shape': 'fuel_tank', class: 'ute-shape' });
  tank.appendChild(ns('path', { d: 'M 420 255 Q 460 220 540 215 Q 630 215 680 240 L 685 275 Q 580 290 440 282 Z', fill: '#C2502A', stroke: '#0A0A0A', 'stroke-width': 2.5, 'data-shape': 'fuel_tank', 'data-fillable': '' }));
  tank.appendChild(ns('path', { d: 'M 440 268 Q 560 282 680 262', fill: 'none', stroke: '#5B2415', 'stroke-width': 1, 'data-shape': 'fuel_tank' }));
  tank.appendChild(ns('rect', { x: 530, y: 232, width: 60, height: 6, fill: '#F6F5F2', 'data-shape': 'fuel_tank' })); // chrome stripe
  tank.appendChild(ns('circle', { cx: 575, cy: 225, r: 7, fill: '#2A2A26', stroke: '#0A0A0A', 'data-shape': 'fuel_tank' }));
  svg.appendChild(tank);

  // ── Air filter (round, side-mounted) ──────────────────────────
  const air = ns('g', { 'data-shape': 'air_filter', class: 'ute-shape' });
  air.appendChild(ns('circle', { cx: 560, cy: 320, r: 28, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'air_filter', 'data-fillable': '' }));
  air.appendChild(ns('circle', { cx: 560, cy: 320, r: 20, fill: 'none', stroke: '#9A9385', 'stroke-width': 1, 'data-shape': 'air_filter' }));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 2 * Math.PI;
    air.appendChild(ns('line', { x1: 560 + Math.cos(a)*21, y1: 320 + Math.sin(a)*21, x2: 560 + Math.cos(a)*27, y2: 320 + Math.sin(a)*27, stroke: '#9A9385', 'data-shape': 'air_filter' }));
  }
  svg.appendChild(air);

  // ── Carb / throttle body ──────────────────────────────────────
  const carb = ns('g', { 'data-shape': 'carb', class: 'ute-shape' });
  carb.appendChild(ns('rect', { x: 592, y: 300, width: 32, height: 40, fill: '#B9B3A4', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'carb', 'data-fillable': '' }));
  carb.appendChild(ns('line', { x1: 608, y1: 300, x2: 608, y2: 340, stroke: '#0A0A0A', 'data-shape': 'carb' }));
  // Float bowl bump
  carb.appendChild(ns('ellipse', { cx: 608, cy: 358, rx: 18, ry: 10, fill: '#B9B3A4', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'carb' }));
  svg.appendChild(carb);

  // ── Engine (parallel twin: two cylinders) ─────────────────────
  const eng = ns('g', { 'data-shape': 'engine', class: 'ute-shape' });
  // Crankcase
  eng.appendChild(ns('path', { d: 'M 530 350 L 700 350 L 710 440 L 525 440 Z', fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2.5, 'data-shape': 'engine', 'data-fillable': '' }));
  // Bolt pattern
  for (let i = 0; i < 5; i++) eng.appendChild(ns('circle', { cx: 540 + i*35, cy: 432, r: 2, fill: '#0A0A0A', 'data-shape': 'engine' }));
  // Clutch cover
  eng.appendChild(ns('circle', { cx: 620, cy: 400, r: 24, fill: 'none', stroke: '#9A9385', 'stroke-width': 1.5, 'data-shape': 'engine' }));
  eng.appendChild(ns('circle', { cx: 620, cy: 400, r: 7, fill: '#9A9385', 'data-shape': 'engine' }));
  svg.appendChild(eng);

  // Cylinders (two, side by side)
  const cyl = ns('g', { 'data-shape': 'cylinder', class: 'ute-shape' });
  // Left cylinder
  cyl.appendChild(ns('path', { d: 'M 548 350 L 552 275 L 598 275 L 594 350 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'cylinder', 'data-fillable': '' }));
  // Right cylinder
  cyl.appendChild(ns('path', { d: 'M 626 350 L 630 275 L 676 275 L 672 350 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'cylinder' }));
  // Cooling fins
  for (let i = 0; i < 6; i++) {
    const y = 290 + i*10;
    cyl.appendChild(ns('line', { x1: 550 + i*0.5, y1: y, x2: 596 - i*0.5, y2: y, stroke: '#0A0A0A', 'stroke-width': 1, 'data-shape': 'cylinder' }));
    cyl.appendChild(ns('line', { x1: 628 + i*0.5, y1: y, x2: 674 - i*0.5, y2: y, stroke: '#0A0A0A', 'stroke-width': 1, 'data-shape': 'cylinder' }));
  }
  // Heads
  cyl.appendChild(ns('rect', { x: 548, y: 265, width: 54, height: 12, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'cylinder' }));
  cyl.appendChild(ns('rect', { x: 626, y: 265, width: 54, height: 12, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'cylinder' }));
  // Spark plug stubs
  cyl.appendChild(ns('rect', { x: 568, y: 255, width: 14, height: 12, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'cylinder' }));
  cyl.appendChild(ns('rect', { x: 646, y: 255, width: 14, height: 12, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'cylinder' }));
  svg.appendChild(cyl);

  // ── Exhaust (dual pipes exiting right, upswept) ───────────────
  const ex = ns('g', { 'data-shape': 'exhaust', class: 'ute-shape' });
  ex.appendChild(ns('path', { d: 'M 596 350 C 620 400 650 430 790 440 L 970 440', fill: 'none', stroke: '#D4CFC2', 'stroke-width': 10, 'stroke-linecap': 'round', 'data-shape': 'exhaust' }));
  ex.appendChild(ns('path', { d: 'M 674 350 C 700 390 740 420 820 435 L 990 435', fill: 'none', stroke: '#D4CFC2', 'stroke-width': 10, 'stroke-linecap': 'round', 'data-shape': 'exhaust' }));
  // Dual mufflers (slash-cut)
  ex.appendChild(ns('path', { d: 'M 970 420 L 1120 418 L 1125 455 L 975 455 Z', fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'exhaust', 'data-fillable': '' }));
  ex.appendChild(ns('path', { d: 'M 990 415 L 1130 412 L 1135 450 L 995 450 Z', fill: '#E6E1D4', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'exhaust' }));
  svg.appendChild(ex);

  // ── Rear suspension: swingarm + shock ─────────────────────────
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 710 400 L 940 400 L 945 418 L 715 414 Z', fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'swingarm', 'data-fillable': '' }));
  sw.appendChild(ns('circle', { cx: 710, cy: 408, r: 9, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'swingarm' }));
  svg.appendChild(sw);

  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  // Classic dual shocks (just the near one shown)
  shock.appendChild(ns('line', { x1: 800, y1: 275, x2: 870, y2: 395, stroke: '#C2502A', 'stroke-width': 9, 'data-shape': 'rear_shock' }));
  // Spring coils
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = 800 + (870 - 800) * t, y = 275 + (395 - 275) * t;
    shock.appendChild(ns('line', { x1: x - 7, y1: y - 2, x2: x + 7, y2: y + 2, stroke: '#2A2A26', 'stroke-width': 2, 'data-shape': 'rear_shock' }));
  }
  svg.appendChild(shock);

  // Battery (visible side cover)
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('rect', { x: 710, y: 310, width: 42, height: 32, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'battery', 'data-fillable': '' }));
  bat.appendChild(ns('line', { x1: 718, y1: 318, x2: 724, y2: 318, stroke: '#C2502A', 'stroke-width': 2, 'data-shape': 'battery' }));
  bat.appendChild(ns('line', { x1: 738, y1: 318, x2: 744, y2: 318, stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'battery' }));
  const t = ns('text', { x: 731, y: 334, fill: '#0A0A0A', 'font-family': 'IBM Plex Mono', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', 'data-shape': 'battery' });
  t.textContent = '12V'; bat.appendChild(t);
  svg.appendChild(bat);

  // ── Chain + sprockets ─────────────────────────────────────────
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('line', { x1: 696, y1: 400, x2: 940, y2: 410, stroke: '#2A2A26', 'stroke-width': 3, 'data-shape': 'chain' }));
  chain.appendChild(ns('line', { x1: 696, y1: 414, x2: 940, y2: 424, stroke: '#2A2A26', 'stroke-width': 3, 'data-shape': 'chain' }));
  for (let x = 700; x < 940; x += 14) chain.appendChild(ns('line', { x1: x, y1: 398, x2: x + 1, y2: 426, stroke: '#B9B3A4', 'stroke-width': 1, 'data-shape': 'chain' }));
  svg.appendChild(chain);

  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('circle', { cx: 940, cy: 418, r: 54, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'rear_sprocket', 'data-fillable': '' }));
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * 2 * Math.PI;
    const x1 = 940 + Math.cos(a) * 54, y1 = 418 + Math.sin(a) * 54;
    const x2 = 940 + Math.cos(a) * 58, y2 = 418 + Math.sin(a) * 58;
    rsp.appendChild(ns('line', { x1, y1, x2, y2, stroke: '#0A0A0A', 'stroke-width': 1.2, 'data-shape': 'rear_sprocket' }));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI + 0.2;
    rsp.appendChild(ns('circle', { cx: 940 + Math.cos(a)*28, cy: 418 + Math.sin(a)*28, r: 7, fill: '#F6F5F2', stroke: '#0A0A0A', 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  // Wheels (classic spoked)
  svg.appendChild(wheelSVG(254, 395, 92, 'front_wheel', false));
  svg.appendChild(wheelSVG(940, 418, 92, 'rear_wheel', false));

  // Brake
  const brake = ns('g', { 'data-shape': 'brake', class: 'ute-shape' });
  brake.appendChild(ns('circle', { cx: 254, cy: 395, r: 48, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 2, 'data-shape': 'brake' }));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 2 * Math.PI;
    brake.appendChild(ns('circle', { cx: 254 + Math.cos(a)*42, cy: 395 + Math.sin(a)*42, r: 2, fill: '#0A0A0A', 'data-shape': 'brake' }));
  }
  brake.appendChild(ns('rect', { x: 296, y: 378, width: 20, height: 34, fill: '#C2502A', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'brake', 'data-fillable': '' }));
  svg.appendChild(brake);

  // Seat (classic flat bench)
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 695 265 L 820 258 L 860 268 L 710 282 Z', fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'seat', 'data-fillable': '' }));
  seat.appendChild(ns('path', { d: 'M 710 282 L 715 275 L 850 272', fill: 'none', stroke: '#5A5852', 'data-shape': 'seat' }));
  svg.appendChild(seat);

  // Tail light
  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('ellipse', { cx: 902, cy: 275, rx: 16, ry: 10, fill: '#C2502A', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'tail_light', 'data-fillable': '' }));
  svg.appendChild(tl);

  // Side stand
  svg.appendChild(ns('line', { x1: 575, y1: 440, x2: 595, y2: 490, stroke: '#2A2A26', 'stroke-width': 4 }));
  // Foot pegs
  svg.appendChild(ns('circle', { cx: 720, cy: 445, r: 4, fill: '#2A2A26' }));
  svg.appendChild(ns('line', { x1: 720, y1: 445, x2: 745, y2: 450, stroke: '#2A2A26', 'stroke-width': 3 }));

  svg.appendChild(g);

  // Callouts
  const callouts = [
    { key: 'headlight',   sx: 265, sy: 220, lx:  110, lane: 1, label: 'Headlight' },
    { key: 'instruments', sx: 370, sy: 170, lx:  350, lane: 1, label: 'Instruments' },
    { key: 'fuel_tank',   sx: 575, sy: 225, lx:  580, lane: 1, label: 'Fuel tank' },
    { key: 'seat',        sx: 760, sy: 270, lx:  785, lane: 1, label: 'Seat' },
    { key: 'tail_light',  sx: 905, sy: 275, lx: 1000, lane: 1, label: 'Tail light' },
    { key: 'forks',       sx: 275, sy: 300, lx:   90, lane: 2, label: 'Forks' },
    { key: 'air_filter',  sx: 560, sy: 310, lx:  470, lane: 2, label: 'Air filter' },
    { key: 'carb',        sx: 610, sy: 320, lx:  645, lane: 2, label: 'Carb / EFI' },
    { key: 'cylinder',    sx: 615, sy: 290, lx:  790, lane: 2, label: 'Cylinder' },
    { key: 'front_wheel', sx: 254, sy: 395, lx:  250, lane: 3, label: 'Front wheel' },
    { key: 'brake',       sx: 306, sy: 395, lx:  395, lane: 3, label: 'Brake disc' },
    { key: 'engine',      sx: 615, sy: 410, lx:  565, lane: 3, label: 'Engine' },
    { key: 'chain',       sx: 810, sy: 415, lx:  790, lane: 3, label: 'Chain' },
    { key: 'swingarm',    sx: 850, sy: 410, lx:  950, lane: 3, label: 'Swingarm' },
    { key: 'rear_wheel',  sx: 940, sy: 418, lx: 1150, lane: 3, label: 'Rear wheel' },
    { key: 'frame',       sx: 490, sy: 270, lx:  445, lane: 4, label: 'Frame' },
    { key: 'battery',     sx: 732, sy: 318, lx:  690, lane: 4, label: 'Battery' },
    { key: 'rear_shock',  sx: 835, sy: 335, lx:  870, lane: 4, label: 'Rear shock' },
    { key: 'rear_sprocket', sx: 940, sy: 465, lx: 1000, lane: 4, label: 'Rear sprocket' },
    { key: 'exhaust',     sx: 1040, sy: 435, lx: 1140, lane: 4, label: 'Exhaust' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

function drawMotocross2T(svg) {
  // Tall motocross dirt bike with knobby tyres, high mudguards, upswept
  // expansion-chamber exhaust, long travel suspension, number plate.
  const g = ns('g');
  g.appendChild(ns('line', { x1: 0, y1: 500, x2: 1200, y2: 500, stroke: '#B9B3A4', 'stroke-dasharray': '4 6' }));

  // Frame (perimeter trellis)
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  frame.appendChild(ns('path', { d: 'M 320 250 L 440 220 L 650 230 L 720 260', fill: 'none', stroke: '#1D6B55', 'stroke-width': 5, 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 325 258 L 440 400 L 540 420', fill: 'none', stroke: '#1D6B55', 'stroke-width': 5, 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 650 240 L 790 260 L 870 280', fill: 'none', stroke: '#1D6B55', 'stroke-width': 4, 'data-shape': 'frame' }));
  frame.appendChild(ns('rect', { x: 305, y: 240, width: 30, height: 55, fill: '#E6E1D4', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // ── Front forks (inverted, long travel) ───────────────────────
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  // Upper (gold USD look)
  forks.appendChild(ns('line', { x1: 304, y1: 253, x2: 260, y2: 380, stroke: '#E2A93B', 'stroke-width': 13, 'data-shape': 'forks' }));
  forks.appendChild(ns('line', { x1: 322, y1: 253, x2: 278, y2: 380, stroke: '#E2A93B', 'stroke-width': 13, 'data-shape': 'forks' }));
  // Lower sliders (black)
  forks.appendChild(ns('line', { x1: 268, y1: 360, x2: 240, y2: 405, stroke: '#1A1A17', 'stroke-width': 11, 'data-shape': 'forks' }));
  forks.appendChild(ns('line', { x1: 286, y1: 360, x2: 258, y2: 405, stroke: '#1A1A17', 'stroke-width': 11, 'data-shape': 'forks' }));
  forks.appendChild(ns('rect', { x: 282, y: 228, width: 58, height: 20, fill: '#2A2A26', stroke: '#0A0A0A', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Hand guards + bars
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  bar.appendChild(ns('path', { d: 'M 311 220 L 365 170 L 420 160', fill: 'none', stroke: '#111', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 311 220 L 265 190 L 210 185', fill: 'none', stroke: '#111', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 200, y: 178, width: 24, height: 14, fill: '#E2A93B', 'data-shape': 'instruments' })); // orange grip
  bar.appendChild(ns('rect', { x: 410, y: 154, width: 24, height: 14, fill: '#E2A93B', 'data-shape': 'instruments' }));
  // Hand guards
  bar.appendChild(ns('path', { d: 'M 190 150 L 185 195 L 225 200 L 230 155 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 408 128 L 405 170 L 445 174 L 450 132 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'instruments' }));
  svg.appendChild(bar);

  // Headlight + number plate (front)
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('path', { d: 'M 275 220 L 330 215 L 345 265 L 275 268 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'headlight', 'data-fillable': '' }));
  hl.appendChild(ns('ellipse', { cx: 310, cy: 245, rx: 18, ry: 12, fill: '#E2A93B', 'data-shape': 'headlight' }));
  // Number plate above
  hl.appendChild(ns('path', { d: 'M 275 195 L 335 190 L 340 220 L 275 222 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'headlight' }));
  const tn = ns('text', { x: 305, y: 212, 'font-family': 'IBM Plex Mono', 'font-size': 14, 'font-weight': 700, 'text-anchor': 'middle', fill: '#0A0A0A', 'data-shape': 'headlight' });
  tn.textContent = '42';
  hl.appendChild(tn);
  svg.appendChild(hl);

  // Front mudguard (high + wide)
  svg.appendChild(ns('path', { d: 'M 160 320 Q 240 275 350 320 L 345 335 Q 245 290 170 335 Z', fill: '#1D6B55', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'front_wheel', class: 'ute-shape' }));

  // Fuel tank (small)
  const tank = ns('g', { 'data-shape': 'fuel_tank', class: 'ute-shape' });
  tank.appendChild(ns('path', { d: 'M 420 275 Q 450 240 540 240 Q 620 240 650 265 L 650 300 Q 540 310 435 300 Z', fill: '#1D6B55', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'fuel_tank', 'data-fillable': '' }));
  tank.appendChild(ns('circle', { cx: 540, cy: 254, r: 6, fill: '#2A2A26', stroke: '#0A0A0A', 'data-shape': 'fuel_tank' }));
  svg.appendChild(tank);

  // Air filter + carb (2T uses carb usually)
  const air = ns('g', { 'data-shape': 'air_filter', class: 'ute-shape' });
  air.appendChild(ns('rect', { x: 650, y: 275, width: 60, height: 50, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'air_filter', 'data-fillable': '' }));
  for (let i = 0; i < 5; i++) air.appendChild(ns('line', { x1: 655 + i*12, y1: 282, x2: 655 + i*12, y2: 318, stroke: '#9A9385', 'data-shape': 'air_filter' }));
  svg.appendChild(air);

  const carb = ns('g', { 'data-shape': 'carb', class: 'ute-shape' });
  carb.appendChild(ns('rect', { x: 616, y: 300, width: 32, height: 40, fill: '#B9B3A4', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'carb', 'data-fillable': '' }));
  carb.appendChild(ns('ellipse', { cx: 632, cy: 358, rx: 18, ry: 10, fill: '#B9B3A4', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'carb' }));
  svg.appendChild(carb);

  // 2-stroke engine (single, compact)
  const eng = ns('g', { 'data-shape': 'engine', class: 'ute-shape' });
  eng.appendChild(ns('path', { d: 'M 530 360 L 680 355 L 695 445 L 525 445 Z', fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2.5, 'data-shape': 'engine', 'data-fillable': '' }));
  for (let i = 0; i < 5; i++) eng.appendChild(ns('circle', { cx: 540 + i*32, cy: 437, r: 2, fill: '#0A0A0A', 'data-shape': 'engine' }));
  eng.appendChild(ns('circle', { cx: 610, cy: 405, r: 22, fill: 'none', stroke: '#9A9385', 'stroke-width': 1.5, 'data-shape': 'engine' }));
  svg.appendChild(eng);

  // Single cylinder (tall, slightly forward lean)
  const cyl = ns('g', { 'data-shape': 'cylinder', class: 'ute-shape' });
  cyl.appendChild(ns('path', { d: 'M 575 360 L 582 265 L 648 265 L 652 360 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'cylinder', 'data-fillable': '' }));
  for (let i = 0; i < 7; i++) {
    const y = 275 + i*12;
    cyl.appendChild(ns('line', { x1: 579 + i*0.5, y1: y, x2: 650 - i*0.5, y2: y, stroke: '#0A0A0A', 'stroke-width': 1, 'data-shape': 'cylinder' }));
  }
  cyl.appendChild(ns('rect', { x: 580, y: 255, width: 68, height: 12, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'cylinder' }));
  cyl.appendChild(ns('rect', { x: 608, y: 244, width: 14, height: 12, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'cylinder' }));
  svg.appendChild(cyl);

  // ── Upswept expansion-chamber exhaust (iconic 2-stroke shape) ─
  const ex = ns('g', { 'data-shape': 'exhaust', class: 'ute-shape' });
  // Expansion chamber: cylinder exit → down → curve back right, bulging
  ex.appendChild(ns('path', { d: 'M 615 358 Q 620 400 580 420 L 500 430 Q 420 440 400 420 Q 390 400 400 380 L 480 340 Q 530 310 580 330 Q 620 345 650 330 L 750 290 L 810 285 L 850 275', fill: 'none', stroke: '#D4CFC2', 'stroke-width': 9, 'stroke-linecap': 'round', 'data-shape': 'exhaust' }));
  // Fat belly of the chamber
  ex.appendChild(ns('ellipse', { cx: 540, cy: 395, rx: 95, ry: 32, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'exhaust', 'data-fillable': '' }));
  // End can
  ex.appendChild(ns('path', { d: 'M 840 268 L 940 258 L 945 290 L 845 300 Z', fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'exhaust' }));
  svg.appendChild(ex);

  // Swingarm (long)
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 700 400 L 970 415 L 975 435 L 705 418 Z', fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'swingarm', 'data-fillable': '' }));
  sw.appendChild(ns('circle', { cx: 700, cy: 408, r: 9, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'swingarm' }));
  svg.appendChild(sw);

  // Mono-shock linkage
  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('line', { x1: 740, y1: 300, x2: 740, y2: 405, stroke: '#C2502A', 'stroke-width': 10, 'data-shape': 'rear_shock' }));
  for (let i = 0; i < 7; i++) shock.appendChild(ns('line', { x1: 732, y1: 320 + i*11, x2: 748, y2: 328 + i*11, stroke: '#2A2A26', 'stroke-width': 2, 'data-shape': 'rear_shock' }));
  shock.appendChild(ns('path', { d: 'M 740 405 L 760 420 L 760 440 L 720 435 L 740 420 Z', fill: '#2A2A26', 'data-shape': 'rear_shock' }));
  svg.appendChild(shock);

  // Chain + sprockets
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('line', { x1: 686, y1: 400, x2: 970, y2: 415, stroke: '#2A2A26', 'stroke-width': 3, 'data-shape': 'chain' }));
  chain.appendChild(ns('line', { x1: 686, y1: 414, x2: 970, y2: 429, stroke: '#2A2A26', 'stroke-width': 3, 'data-shape': 'chain' }));
  for (let x = 690; x < 970; x += 14) chain.appendChild(ns('line', { x1: x, y1: 398, x2: x + 1, y2: 431, stroke: '#B9B3A4', 'data-shape': 'chain' }));
  svg.appendChild(chain);

  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('circle', { cx: 970, cy: 420, r: 58, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'rear_sprocket', 'data-fillable': '' }));
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * 2 * Math.PI;
    rsp.appendChild(ns('line', { x1: 970 + Math.cos(a)*58, y1: 420 + Math.sin(a)*58, x2: 970 + Math.cos(a)*62, y2: 420 + Math.sin(a)*62, stroke: '#0A0A0A', 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  // Wheels (knobby)
  svg.appendChild(wheelSVG(254, 405, 96, 'front_wheel', true));
  svg.appendChild(wheelSVG(970, 420, 96, 'rear_wheel', true));

  // Front brake
  const brake = ns('g', { 'data-shape': 'brake', class: 'ute-shape' });
  brake.appendChild(ns('circle', { cx: 254, cy: 405, r: 42, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 2, 'data-shape': 'brake' }));
  brake.appendChild(ns('rect', { x: 296, y: 388, width: 20, height: 34, fill: '#1D6B55', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'brake', 'data-fillable': '' }));
  svg.appendChild(brake);

  // Narrow long seat
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 625 240 L 870 272 L 875 290 L 630 265 Z', fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'seat', 'data-fillable': '' }));
  svg.appendChild(seat);

  // Rear fender/tail (small)
  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('path', { d: 'M 870 275 L 920 272 L 925 300 L 875 302 Z', fill: '#1D6B55', stroke: '#0A0A0A', 'data-shape': 'tail_light', 'data-fillable': '' }));
  tl.appendChild(ns('rect', { x: 905, y: 282, width: 12, height: 8, fill: '#C2502A', 'data-shape': 'tail_light' }));
  svg.appendChild(tl);

  // Side stand
  svg.appendChild(ns('line', { x1: 565, y1: 445, x2: 590, y2: 495, stroke: '#2A2A26', 'stroke-width': 4 }));
  svg.appendChild(ns('circle', { cx: 715, cy: 448, r: 4, fill: '#2A2A26' }));

  // Battery (small, hidden under seat)
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('rect', { x: 700, y: 300, width: 36, height: 24, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'battery', 'data-fillable': '' }));
  const tx = ns('text', { x: 718, y: 318, fill: '#0A0A0A', 'font-family': 'IBM Plex Mono', 'font-size': 9, 'font-weight': 700, 'text-anchor': 'middle', 'data-shape': 'battery' });
  tx.textContent = '12V'; bat.appendChild(tx);
  svg.appendChild(bat);

  svg.appendChild(g);

  const callouts = [
    { key: 'headlight',   sx: 310, sy: 220, lx:  100, lane: 1, label: 'Number plate' },
    { key: 'instruments', sx: 410, sy: 170, lx:  360, lane: 1, label: 'Bars / guards' },
    { key: 'fuel_tank',   sx: 535, sy: 250, lx:  575, lane: 1, label: 'Fuel tank' },
    { key: 'seat',        sx: 760, sy: 262, lx:  785, lane: 1, label: 'Seat' },
    { key: 'tail_light',  sx: 895, sy: 282, lx: 1000, lane: 1, label: 'Tail' },
    { key: 'forks',       sx: 275, sy: 320, lx:   90, lane: 2, label: 'Forks (USD)' },
    { key: 'air_filter',  sx: 680, sy: 290, lx:  680, lane: 2, label: 'Air box' },
    { key: 'carb',        sx: 632, sy: 330, lx:  490, lane: 2, label: 'Carb' },
    { key: 'cylinder',    sx: 615, sy: 285, lx:  770, lane: 2, label: 'Cylinder' },
    { key: 'front_wheel', sx: 254, sy: 405, lx:  250, lane: 3, label: 'Front wheel' },
    { key: 'brake',       sx: 306, sy: 405, lx:  395, lane: 3, label: 'Brake disc' },
    { key: 'engine',      sx: 610, sy: 420, lx:  570, lane: 3, label: 'Engine' },
    { key: 'exhaust',     sx: 540, sy: 395, lx:  830, lane: 3, label: 'Expansion chamber' },
    { key: 'swingarm',    sx: 860, sy: 414, lx:  970, lane: 3, label: 'Swingarm' },
    { key: 'rear_wheel',  sx: 970, sy: 420, lx: 1150, lane: 3, label: 'Rear wheel' },
    { key: 'frame',       sx: 490, sy: 265, lx:  445, lane: 4, label: 'Frame' },
    { key: 'battery',     sx: 718, sy: 315, lx:  680, lane: 4, label: 'Battery' },
    { key: 'rear_shock',  sx: 740, sy: 360, lx:  870, lane: 4, label: 'Monoshock' },
    { key: 'rear_sprocket', sx: 970, sy: 470, lx: 1000, lane: 4, label: 'Rear sprocket' },
    { key: 'chain',       sx: 820, sy: 420, lx: 1140, lane: 4, label: 'Chain' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

function drawElectricBike(svg) {
  const g = ns('g');
  g.appendChild(ns('line', { x1: 0, y1: 490, x2: 1200, y2: 490, stroke: '#B9B3A4', 'stroke-dasharray': '4 6' }));

  // Trellis frame + battery enclosure
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  frame.appendChild(ns('path', { d: 'M 310 230 L 420 240 L 650 240 L 720 265', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 315 240 L 440 380 L 540 410', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 650 245 L 790 258 L 870 268', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 3, 'data-shape': 'frame' }));
  frame.appendChild(ns('rect', { x: 295, y: 220, width: 30, height: 55, fill: '#E6E1D4', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // Inverted forks (modern streetfighter)
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  forks.appendChild(ns('line', { x1: 302, y1: 235, x2: 260, y2: 380, stroke: '#DDD9CF', 'stroke-width': 13, 'data-shape': 'forks' }));
  forks.appendChild(ns('line', { x1: 320, y1: 235, x2: 278, y2: 380, stroke: '#DDD9CF', 'stroke-width': 13, 'data-shape': 'forks' }));
  forks.appendChild(ns('line', { x1: 266, y1: 360, x2: 240, y2: 405, stroke: '#1A1A17', 'stroke-width': 11, 'data-shape': 'forks' }));
  forks.appendChild(ns('line', { x1: 284, y1: 360, x2: 258, y2: 405, stroke: '#1A1A17', 'stroke-width': 11, 'data-shape': 'forks' }));
  forks.appendChild(ns('rect', { x: 282, y: 210, width: 56, height: 18, fill: '#2A2A26', stroke: '#0A0A0A', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Angular LED headlight
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('path', { d: 'M 268 218 L 345 205 L 365 255 L 275 268 Z', fill: '#0A0A0A', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'headlight', 'data-fillable': '' }));
  hl.appendChild(ns('path', { d: 'M 285 232 L 345 222 L 352 248 L 288 258 Z', fill: '#1D6B55', 'data-shape': 'headlight' }));
  hl.appendChild(ns('line', { x1: 290, y1: 240, x2: 345, y2: 232, stroke: '#F6F5F2', 'stroke-width': 2, 'data-shape': 'headlight' }));
  svg.appendChild(hl);

  // Angular front fender
  svg.appendChild(ns('path', { d: 'M 190 335 L 290 315 L 335 340 L 320 358 L 240 350 L 200 360 Z', fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'front_wheel', class: 'ute-shape' }));

  // Handlebar
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  bar.appendChild(ns('path', { d: 'M 311 215 L 365 170 L 440 160', fill: 'none', stroke: '#111', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 311 215 L 265 180 L 200 175', fill: 'none', stroke: '#111', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 190, y: 168, width: 24, height: 14, fill: '#111', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 430, y: 154, width: 24, height: 14, fill: '#111', 'data-shape': 'instruments' }));
  // TFT dash
  bar.appendChild(ns('rect', { x: 345, y: 155, width: 70, height: 36, fill: '#0A0A0A', stroke: '#0A0A0A', 'data-shape': 'instruments', 'data-fillable': '' }));
  bar.appendChild(ns('text', { x: 380, y: 175, 'font-family': 'IBM Plex Mono', 'font-size': 12, 'font-weight': 700, fill: '#1D6B55', 'text-anchor': 'middle', 'data-shape': 'instruments' })).textContent = 'EV';
  bar.appendChild(ns('text', { x: 380, y: 186, 'font-family': 'IBM Plex Mono', 'font-size': 8, fill: '#E2A93B', 'text-anchor': 'middle', 'data-shape': 'instruments' })).textContent = '85%';
  svg.appendChild(bar);

  // Battery pack (big, where engine would be) — the hero shape
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('path', { d: 'M 430 255 L 710 260 L 720 405 L 435 410 Z', fill: '#F0ECE1', stroke: '#0A0A0A', 'stroke-width': 2.5, 'data-shape': 'battery', 'data-fillable': '' }));
  // Cell cluster hatching
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 4; j++) {
      bat.appendChild(ns('circle', { cx: 465 + i*38, cy: 285 + j*32, r: 10, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 1, 'data-shape': 'battery' }));
      bat.appendChild(ns('circle', { cx: 465 + i*38, cy: 285 + j*32, r: 3, fill: '#C2502A', 'data-shape': 'battery' }));
    }
  }
  // Terminals on top
  bat.appendChild(ns('rect', { x: 460, y: 250, width: 50, height: 8, fill: '#C2502A', 'data-shape': 'battery' }));
  bat.appendChild(ns('rect', { x: 620, y: 250, width: 50, height: 8, fill: '#0A0A0A', 'data-shape': 'battery' }));
  svg.appendChild(bat);

  // Controller (box on top of battery)
  const ctl = ns('g', { 'data-shape': 'controller', class: 'ute-shape' });
  ctl.appendChild(ns('rect', { x: 475, y: 220, width: 200, height: 32, fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'controller', 'data-fillable': '' }));
  // Heat sink fins
  for (let i = 0; i < 10; i++) ctl.appendChild(ns('line', { x1: 480 + i*20, y1: 225, x2: 480 + i*20, y2: 250, stroke: '#9A9385', 'data-shape': 'controller' }));
  // Power/data cables
  ctl.appendChild(ns('path', { d: 'M 475 240 L 440 260', fill: 'none', stroke: '#C2502A', 'stroke-width': 3, 'data-shape': 'controller' }));
  ctl.appendChild(ns('path', { d: 'M 675 240 L 710 260', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 3, 'data-shape': 'controller' }));
  const txc = ns('text', { x: 575, y: 243, 'font-family': 'IBM Plex Mono', 'font-size': 10, 'font-weight': 600, 'text-anchor': 'middle', fill: '#F6F5F2', 'data-shape': 'controller' });
  txc.textContent = 'CONTROLLER / INVERTER';
  ctl.appendChild(txc);
  svg.appendChild(ctl);

  // Electric motor (round, at swingarm pivot)
  const motor = ns('g', { 'data-shape': 'motor', class: 'ute-shape' });
  motor.appendChild(ns('circle', { cx: 720, cy: 400, r: 50, fill: '#D4CFC2', stroke: '#0A0A0A', 'stroke-width': 2.5, 'data-shape': 'motor', 'data-fillable': '' }));
  // Cooling fins (radial)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 2 * Math.PI;
    motor.appendChild(ns('line', { x1: 720 + Math.cos(a)*34, y1: 400 + Math.sin(a)*34, x2: 720 + Math.cos(a)*48, y2: 400 + Math.sin(a)*48, stroke: '#9A9385', 'stroke-width': 1.5, 'data-shape': 'motor' }));
  }
  // Hub
  motor.appendChild(ns('circle', { cx: 720, cy: 400, r: 20, fill: '#2A2A26', 'data-shape': 'motor' }));
  motor.appendChild(ns('circle', { cx: 720, cy: 400, r: 7, fill: '#C2502A', 'data-shape': 'motor' }));
  // Phase cables (3)
  motor.appendChild(ns('path', { d: 'M 685 365 Q 660 350 650 320', fill: 'none', stroke: '#C2502A', 'stroke-width': 3, 'data-shape': 'motor' }));
  motor.appendChild(ns('path', { d: 'M 680 400 Q 630 400 620 390', fill: 'none', stroke: '#1D6B55', 'stroke-width': 3, 'data-shape': 'motor' }));
  motor.appendChild(ns('path', { d: 'M 685 435 Q 660 450 650 460', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 3, 'data-shape': 'motor' }));
  svg.appendChild(motor);

  // Charge port (near the frame)
  const cp = ns('g', { 'data-shape': 'charge_port', class: 'ute-shape' });
  cp.appendChild(ns('rect', { x: 395, y: 335, width: 30, height: 24, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'charge_port', 'data-fillable': '' }));
  cp.appendChild(ns('circle', { cx: 410, cy: 347, r: 6, fill: '#1D6B55', 'data-shape': 'charge_port' }));
  svg.appendChild(cp);

  // Swingarm (shorter, strong)
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 760 395 L 970 400 L 975 420 L 765 415 Z', fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'swingarm', 'data-fillable': '' }));
  sw.appendChild(ns('circle', { cx: 760, cy: 404, r: 9, fill: '#B9B3A4', 'data-shape': 'swingarm' }));
  svg.appendChild(sw);

  // Rear mono-shock
  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('line', { x1: 790, y1: 305, x2: 790, y2: 400, stroke: '#B9B3A4', 'stroke-width': 10, 'data-shape': 'rear_shock' }));
  for (let i = 0; i < 6; i++) shock.appendChild(ns('line', { x1: 782, y1: 322 + i*11, x2: 798, y2: 330 + i*11, stroke: '#2A2A26', 'stroke-width': 2, 'data-shape': 'rear_shock' }));
  svg.appendChild(shock);

  // Belt drive (electrics often use belt not chain, but we'll keep chain data-shape for the live stats)
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('rect', { x: 735, y: 395, width: 230, height: 7, fill: '#2A2A26', 'data-shape': 'chain' }));
  chain.appendChild(ns('rect', { x: 735, y: 410, width: 230, height: 7, fill: '#2A2A26', 'data-shape': 'chain' }));
  for (let x = 740; x < 965; x += 10) chain.appendChild(ns('line', { x1: x, y1: 395, x2: x, y2: 417, stroke: '#B9B3A4', 'data-shape': 'chain' }));
  svg.appendChild(chain);

  // Rear sprocket / pulley
  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('circle', { cx: 970, cy: 405, r: 50, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'rear_sprocket', 'data-fillable': '' }));
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    rsp.appendChild(ns('line', { x1: 970 + Math.cos(a)*50, y1: 405 + Math.sin(a)*50, x2: 970 + Math.cos(a)*54, y2: 405 + Math.sin(a)*54, stroke: '#0A0A0A', 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  // Wheels (modern cast alloy)
  svg.appendChild(wheelSVG(254, 400, 92, 'front_wheel', false));
  svg.appendChild(wheelSVG(970, 405, 92, 'rear_wheel', false));

  // Brake
  const brake = ns('g', { 'data-shape': 'brake', class: 'ute-shape' });
  brake.appendChild(ns('circle', { cx: 254, cy: 400, r: 48, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 2, 'data-shape': 'brake' }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    brake.appendChild(ns('circle', { cx: 254 + Math.cos(a)*42, cy: 400 + Math.sin(a)*42, r: 2, fill: '#0A0A0A', 'data-shape': 'brake' }));
  }
  brake.appendChild(ns('rect', { x: 296, y: 383, width: 20, height: 34, fill: '#1D6B55', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'brake', 'data-fillable': '' }));
  svg.appendChild(brake);

  // Compact tail + seat
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 710 258 L 830 258 L 865 275 L 715 280 Z', fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'seat', 'data-fillable': '' }));
  seat.appendChild(ns('path', { d: 'M 865 275 L 905 260 L 920 285 L 870 290 Z', fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'seat' }));
  svg.appendChild(seat);

  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('rect', { x: 905, y: 270, width: 16, height: 6, fill: '#C2502A', 'data-shape': 'tail_light', 'data-fillable': '' }));
  svg.appendChild(tl);

  svg.appendChild(g);

  const callouts = [
    { key: 'headlight',   sx: 310, sy: 230, lx:  100, lane: 1, label: 'LED headlight' },
    { key: 'instruments', sx: 380, sy: 170, lx:  370, lane: 1, label: 'TFT dash' },
    { key: 'controller',  sx: 575, sy: 225, lx:  580, lane: 1, label: 'Controller' },
    { key: 'seat',        sx: 770, sy: 268, lx:  790, lane: 1, label: 'Seat' },
    { key: 'tail_light',  sx: 912, sy: 274, lx: 1000, lane: 1, label: 'Tail light' },
    { key: 'forks',       sx: 275, sy: 310, lx:   90, lane: 2, label: 'Forks (USD)' },
    { key: 'battery',     sx: 575, sy: 330, lx:  450, lane: 2, label: 'Battery pack' },
    { key: 'charge_port', sx: 410, sy: 347, lx:  660, lane: 2, label: 'Charge port' },
    { key: 'motor',       sx: 720, sy: 400, lx:  790, lane: 2, label: 'Motor' },
    { key: 'front_wheel', sx: 254, sy: 400, lx:  260, lane: 3, label: 'Front wheel' },
    { key: 'brake',       sx: 306, sy: 400, lx:  405, lane: 3, label: 'Brake disc' },
    { key: 'frame',       sx: 490, sy: 258, lx:  570, lane: 3, label: 'Frame' },
    { key: 'swingarm',    sx: 870, sy: 410, lx:  870, lane: 3, label: 'Swingarm' },
    { key: 'rear_wheel',  sx: 970, sy: 405, lx: 1150, lane: 3, label: 'Rear wheel' },
    { key: 'rear_shock',  sx: 790, sy: 355, lx:  440, lane: 4, label: 'Rear shock' },
    { key: 'chain',       sx: 870, sy: 408, lx:  700, lane: 4, label: 'Belt drive' },
    { key: 'rear_sprocket', sx: 970, sy: 455, lx:  990, lane: 4, label: 'Belt pulley' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

// ───────────────────────── Blueprint overview drawers ──────────
// A patent-blueprint-style line-art rendering of each motorcycle,
// inspired by the US design-patent drawings Marcel shared. Fine
// strokes, hatching for shaded surfaces, proper spoked wheels,
// knobby tyres on the motocross bike. Every shape still carries
// data-shape so clicks still open the component views.

function bpWheel(cx, cy, r, key, opts) {
  opts = opts || {};
  const knobby = !!opts.knobby;
  const spokes = opts.spokes || 32;
  const g = ns('g', { 'data-shape': key, class: 'ute-shape' });
  // Outer + inner tyre edges
  g.appendChild(ns('circle', { cx, cy, r, class: 'bp-ln', 'data-shape': key }));
  g.appendChild(ns('circle', { cx, cy, r: r - 10, class: 'bp-ln-fine', 'data-shape': key }));
  // Knobby tread blocks for off-road tyres
  if (knobby) {
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * 2 * Math.PI;
      const dx = Math.cos(a), dy = Math.sin(a);
      const outR = r - 1, inR = r - 10;
      const px = -dy * 3, py = dx * 3;
      const x1a = cx + dx * outR + px, y1a = cy + dy * outR + py;
      const x1b = cx + dx * outR - px, y1b = cy + dy * outR - py;
      const x2a = cx + dx * inR  + px * 0.6, y2a = cy + dy * inR + py * 0.6;
      const x2b = cx + dx * inR  - px * 0.6, y2b = cy + dy * inR - py * 0.6;
      g.appendChild(ns('path', { d: `M ${x1a} ${y1a} L ${x1b} ${y1b} L ${x2b} ${y2b} L ${x2a} ${y2a} Z`, class: 'bp-fill-knob', 'data-shape': key }));
    }
  }
  // Rim
  const rimR = r - 22;
  g.appendChild(ns('circle', { cx, cy, r: rimR, class: 'bp-ln', 'data-shape': key }));
  g.appendChild(ns('circle', { cx, cy, r: rimR - 3, class: 'bp-ln-fine', 'data-shape': key }));
  // Spokes
  const hubR = 16;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * 2 * Math.PI + 0.05;
    g.appendChild(ns('line', { x1: cx + Math.cos(a) * hubR, y1: cy + Math.sin(a) * hubR, x2: cx + Math.cos(a) * (rimR - 3), y2: cy + Math.sin(a) * (rimR - 3), class: 'bp-ln-fine', 'data-shape': key }));
  }
  // Hub (axle + bearing)
  g.appendChild(ns('circle', { cx, cy, r: hubR, class: 'bp-fill-paper', 'data-shape': key }));
  g.appendChild(ns('circle', { cx, cy, r: 5, class: 'bp-ln', 'data-shape': key }));
  return g;
}

function bpBrake(cx, cy, r, key) {
  const g = ns('g', { 'data-shape': key, class: 'ute-shape' });
  g.appendChild(ns('circle', { cx, cy, r, class: 'bp-ln-fine', 'data-shape': key }));
  g.appendChild(ns('circle', { cx, cy, r: r - 8, class: 'bp-ln-fine', 'data-shape': key }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    g.appendChild(ns('circle', { cx: cx + Math.cos(a) * (r - 12), cy: cy + Math.sin(a) * (r - 12), r: 2.5, class: 'bp-ln-fine', 'data-shape': key }));
  }
  // Caliper
  const cax = cx + r, cay = cy - 10;
  g.appendChild(ns('path', { d: `M ${cax - 4} ${cay} L ${cax + 20} ${cay - 8} L ${cax + 26} ${cay + 8} L ${cax + 24} ${cay + 24} L ${cax - 2} ${cay + 20} Z`, class: 'bp-tint-strong', 'data-shape': key, 'data-fillable': '' }));
  return g;
}

function bpHatch(x1, y1, x2, y2, spacing, len) {
  // Produce an array of hatch lines across a box
  const lines = [];
  const dx = x2 - x1, dy = y2 - y1;
  const L = Math.sqrt(dx*dx + dy*dy);
  const n = Math.floor(L / spacing);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x1 + dx * t, py = y1 + dy * t;
    lines.push(ns('line', { x1: px, y1: py, x2: px + len * 0.5, y2: py + len, class: 'bp-ln-fine' }));
  }
  return lines;
}

function drawMotocross2TBlueprint(svg) {
  const g = ns('g');
  // Ground reference
  g.appendChild(ns('line', { x1: 0, y1: 510, x2: 1200, y2: 510, class: 'bp-ln-fine', 'stroke-dasharray': '4 6' }));

  // ─── Frame (perimeter spar + downtube + rear subframe) ──────
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  // Top spar (steering head → under seat)
  frame.appendChild(ns('path', { d: 'M 320 240 Q 400 230 500 232 Q 620 236 720 268', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  // Downtube (steering head → engine mount)
  frame.appendChild(ns('path', { d: 'M 316 252 Q 360 320 400 390 L 500 420', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  // Rear subframe (seat support triangle)
  frame.appendChild(ns('path', { d: 'M 720 268 L 870 282 L 870 342 L 700 345', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  // Diagonal brace
  frame.appendChild(ns('line', { x1: 720, y1: 268, x2: 870, y2: 342, class: 'bp-ln-fine', 'data-shape': 'frame' }));
  // Steering head tube
  frame.appendChild(ns('path', { d: 'M 300 220 L 338 220 L 332 260 L 304 260 Z', class: 'bp-tint', 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // ─── Front forks (inverted USD) ─────────────────────────────
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  // Upper tubes (thicker, held by triple-tree)
  forks.appendChild(ns('path', { d: 'M 300 230 L 265 390 M 318 230 L 283 390', class: 'bp-ln-thick', 'data-shape': 'forks' }));
  // Gaiter indicator (short banded lines)
  for (let i = 0; i < 5; i++) forks.appendChild(ns('line', { x1: 300 - i*3, y1: 290 + i*18, x2: 318 - i*3, y2: 290 + i*18, class: 'bp-ln-fine', 'data-shape': 'forks' }));
  // Lower sliders (black, wider)
  forks.appendChild(ns('path', { d: 'M 262 360 L 240 420 L 252 428 L 274 365 Z', class: 'bp-tint-strong', 'data-shape': 'forks' }));
  forks.appendChild(ns('path', { d: 'M 280 360 L 258 420 L 270 428 L 292 365 Z', class: 'bp-tint-strong', 'data-shape': 'forks' }));
  // Triple-tree top yoke
  forks.appendChild(ns('path', { d: 'M 284 210 L 336 210 L 332 230 L 290 230 Z', class: 'bp-tint-strong', 'data-shape': 'forks' }));
  forks.appendChild(ns('path', { d: 'M 288 198 L 332 198 L 330 212 L 290 212 Z', class: 'bp-ln', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // ─── Handlebar + hand guards ────────────────────────────────
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  // Fat crossbar
  bar.appendChild(ns('path', { d: 'M 310 206 Q 330 170 390 160 L 450 150', class: 'bp-ln-thick', 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 310 206 Q 290 180 240 168 L 190 160', class: 'bp-ln-thick', 'data-shape': 'instruments' }));
  // Hand guards (big wrap)
  bar.appendChild(ns('path', { d: 'M 195 130 L 185 198 Q 184 206 192 206 L 240 206 L 248 138 Q 248 132 240 132 Z', class: 'bp-tint', 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 460 130 L 450 198 Q 449 206 457 206 L 480 206 L 488 138 Q 488 132 480 132 Z', class: 'bp-tint', 'data-shape': 'instruments' }));
  // Grips
  bar.appendChild(ns('rect', { x: 192, y: 158, width: 42, height: 12, class: 'bp-tint-strong', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 452, y: 150, width: 42, height: 12, class: 'bp-tint-strong', 'data-shape': 'instruments' }));
  // Grip ridges
  for (let i = 0; i < 10; i++) bar.appendChild(ns('line', { x1: 196 + i*4, y1: 158, x2: 196 + i*4, y2: 170, class: 'bp-ln-fine', 'data-shape': 'instruments' }));
  for (let i = 0; i < 10; i++) bar.appendChild(ns('line', { x1: 456 + i*4, y1: 150, x2: 456 + i*4, y2: 162, class: 'bp-ln-fine', 'data-shape': 'instruments' }));
  svg.appendChild(bar);

  // ─── Headlight shroud + number plate ────────────────────────
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  // Number plate (top, holding a number)
  hl.appendChild(ns('path', { d: 'M 275 195 L 338 192 L 348 230 L 275 232 Z', class: 'bp-fill-paper', 'data-shape': 'headlight', 'data-fillable': '' }));
  const num = ns('text', { x: 310, y: 220, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 20, 'font-weight': 800, 'text-anchor': 'middle', fill: 'currentColor', 'data-shape': 'headlight' });
  num.textContent = '42'; hl.appendChild(num);
  // Shroud shape below plate going back to the tank area
  hl.appendChild(ns('path', { d: 'M 280 232 L 400 258 L 440 280 L 410 296 L 280 288 Z', class: 'bp-tint', 'data-shape': 'headlight' }));
  // Tiny headlight oval inside shroud
  hl.appendChild(ns('ellipse', { cx: 320, cy: 258, rx: 20, ry: 10, class: 'bp-ln-fine', 'data-shape': 'headlight' }));
  svg.appendChild(hl);

  // ─── Front mudguard (high wide motocross) ────────────────────
  svg.appendChild(ns('path', { d: 'M 160 320 Q 240 270 350 320 Q 340 330 335 335 Q 240 288 170 335 Z', class: 'bp-tint', 'data-shape': 'front_wheel', 'data-fillable': '' }));

  // ─── Radiator shrouds (big side panels covering tank + top of engine) ─
  // Draw them as the main body panel of a motocross bike
  const shrouds = ns('g', { 'data-shape': 'fuel_tank', class: 'ute-shape' });
  // Left shroud (outer)
  shrouds.appendChild(ns('path', { d: 'M 400 240 Q 460 232 540 232 Q 620 232 680 254 L 695 312 Q 620 322 540 318 Q 460 318 420 300 Z', class: 'bp-tint-strong', 'data-shape': 'fuel_tank', 'data-fillable': '' }));
  // Tank seam detail
  shrouds.appendChild(ns('path', { d: 'M 420 278 Q 540 290 680 276', class: 'bp-ln-fine', 'data-shape': 'fuel_tank' }));
  // Fuel cap
  shrouds.appendChild(ns('circle', { cx: 540, cy: 242, r: 8, class: 'bp-ln', 'data-shape': 'fuel_tank' }));
  shrouds.appendChild(ns('circle', { cx: 540, cy: 242, r: 4, class: 'bp-tint-strong', 'data-shape': 'fuel_tank' }));
  svg.appendChild(shrouds);

  // Radiator louvre lines (as fine hatching on the shroud leading edge)
  for (let i = 0; i < 7; i++) {
    svg.appendChild(ns('line', { x1: 420 + i*4, y1: 262, x2: 420 + i*4, y2: 302, class: 'bp-ln-fine' }));
  }

  // ─── Air box ─────────────────────────────────────────────────
  const air = ns('g', { 'data-shape': 'air_filter', class: 'ute-shape' });
  air.appendChild(ns('path', { d: 'M 650 272 L 780 268 L 782 328 L 652 332 Z', class: 'bp-tint', 'data-shape': 'air_filter', 'data-fillable': '' }));
  for (let i = 0; i < 6; i++) air.appendChild(ns('line', { x1: 660 + i*20, y1: 278, x2: 660 + i*20, y2: 324, class: 'bp-ln-fine', 'data-shape': 'air_filter' }));
  svg.appendChild(air);

  // ─── Carb / Reed valve body (behind cylinder, below airbox) ─
  const carb = ns('g', { 'data-shape': 'carb', class: 'ute-shape' });
  carb.appendChild(ns('path', { d: 'M 620 310 L 660 310 L 660 350 L 620 350 Z', class: 'bp-tint-strong', 'data-shape': 'carb', 'data-fillable': '' }));
  carb.appendChild(ns('ellipse', { cx: 640, cy: 365, rx: 22, ry: 10, class: 'bp-ln', 'data-shape': 'carb' }));
  svg.appendChild(carb);

  // ─── Engine case (2-stroke, compact) ─────────────────────────
  const eng = ns('g', { 'data-shape': 'engine', class: 'ute-shape' });
  // Case outline with angled bottom
  eng.appendChild(ns('path', { d: 'M 500 352 L 710 352 L 720 438 L 510 448 Q 490 448 490 428 L 496 365 Z', class: 'bp-tint-strong', 'data-shape': 'engine', 'data-fillable': '' }));
  // Clutch cover (big round on right side)
  eng.appendChild(ns('circle', { cx: 660, cy: 400, r: 36, class: 'bp-fill-paper', 'data-shape': 'engine' }));
  eng.appendChild(ns('circle', { cx: 660, cy: 400, r: 28, class: 'bp-ln-fine', 'data-shape': 'engine' }));
  eng.appendChild(ns('circle', { cx: 660, cy: 400, r: 8,  class: 'bp-tint-strong', 'data-shape': 'engine' }));
  // Case bolts
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI + 0.2;
    eng.appendChild(ns('circle', { cx: 660 + Math.cos(a)*32, cy: 400 + Math.sin(a)*32, r: 1.6, class: 'bp-fill-knob', 'data-shape': 'engine' }));
  }
  // Front engine mount bolts
  for (let i = 0; i < 4; i++) eng.appendChild(ns('circle', { cx: 510 + i*22, cy: 440, r: 2, class: 'bp-fill-knob', 'data-shape': 'engine' }));
  // Oil drain plug
  eng.appendChild(ns('circle', { cx: 580, cy: 448, r: 4, class: 'bp-ln', 'data-shape': 'engine' }));
  svg.appendChild(eng);

  // ─── Cylinder (tall, finned, slight forward lean, with reed port) ─
  const cyl = ns('g', { 'data-shape': 'cylinder', class: 'ute-shape' });
  cyl.appendChild(ns('path', { d: 'M 536 352 L 548 240 L 616 240 L 622 352 Z', class: 'bp-fill-paper', 'data-shape': 'cylinder', 'data-fillable': '' }));
  // Fins
  for (let i = 0; i < 11; i++) {
    const y = 254 + i*8;
    cyl.appendChild(ns('line', { x1: 540 + i*0.3, y1: y, x2: 620 - i*0.3, y2: y, class: 'bp-ln-fine', 'data-shape': 'cylinder' }));
  }
  // Head on top
  cyl.appendChild(ns('path', { d: 'M 546 232 L 618 232 L 614 242 L 550 242 Z', class: 'bp-tint-strong', 'data-shape': 'cylinder' }));
  // Spark plug stub + boot wire
  cyl.appendChild(ns('rect', { x: 574, y: 220, width: 16, height: 14, class: 'bp-tint-strong', 'data-shape': 'cylinder' }));
  cyl.appendChild(ns('path', { d: 'M 582 220 Q 598 198 650 194', class: 'bp-ln', 'data-shape': 'cylinder' }));
  svg.appendChild(cyl);

  // ─── Expansion chamber (iconic 2T exhaust — big bulging shape) ─
  const ex = ns('g', { 'data-shape': 'exhaust', class: 'ute-shape' });
  // Stinger from cylinder forward and down
  ex.appendChild(ns('path', { d: 'M 548 350 Q 540 395 495 410 L 440 420 Q 395 430 390 405 Q 390 385 420 365 L 500 342 Q 530 332 548 350 Z', class: 'bp-tint-strong', 'data-shape': 'exhaust', 'data-fillable': '' }));
  // Big belly of the chamber (goes under the bike, bulging)
  ex.appendChild(ns('path', { d: 'M 420 430 Q 500 480 640 475 Q 760 470 820 450 L 870 440 Q 920 428 940 410 Q 960 390 920 384 L 820 390 Q 700 400 580 400 Q 480 400 420 430 Z', class: 'bp-tint-strong', 'data-shape': 'exhaust', 'data-fillable': '' }));
  // Narrow stinger exit → silencer
  ex.appendChild(ns('path', { d: 'M 920 388 L 1000 360 L 1050 330 L 1080 300', class: 'bp-ln-thick', 'data-shape': 'exhaust' }));
  // Silencer at end (small can)
  ex.appendChild(ns('path', { d: 'M 1060 275 L 1180 240 L 1190 275 L 1070 310 Z', class: 'bp-tint-strong', 'data-shape': 'exhaust', 'data-fillable': '' }));
  ex.appendChild(ns('line', { x1: 1180, y1: 240, x2: 1190, y2: 275, class: 'bp-ln', 'data-shape': 'exhaust' }));
  // Chamber ridge line (contour hint)
  ex.appendChild(ns('path', { d: 'M 450 440 Q 580 460 760 455 Q 870 448 920 420', class: 'bp-ln-fine', 'data-shape': 'exhaust' }));
  svg.appendChild(ex);

  // ─── Swingarm (long aluminium beam, tapered) ─────────────────
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 710 400 L 970 408 L 980 428 L 715 420 Z', class: 'bp-tint-strong', 'data-shape': 'swingarm', 'data-fillable': '' }));
  // Lightening holes
  sw.appendChild(ns('ellipse', { cx: 790, cy: 414, rx: 18, ry: 5, class: 'bp-fill-paper', 'data-shape': 'swingarm' }));
  sw.appendChild(ns('ellipse', { cx: 860, cy: 416, rx: 14, ry: 5, class: 'bp-fill-paper', 'data-shape': 'swingarm' }));
  // Pivot
  sw.appendChild(ns('circle', { cx: 710, cy: 410, r: 10, class: 'bp-ln', 'data-shape': 'swingarm' }));
  // Chain adjuster at axle end
  sw.appendChild(ns('path', { d: 'M 965 400 L 985 390 L 988 425 L 970 430 Z', class: 'bp-ln-fine', 'data-shape': 'swingarm' }));
  svg.appendChild(sw);

  // ─── Mono-shock + linkage ───────────────────────────────────
  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('rect', { x: 702, y: 292, width: 18, height: 110, class: 'bp-tint-strong', 'data-shape': 'rear_shock' }));
  // Spring coils
  for (let i = 0; i < 8; i++) shock.appendChild(ns('line', { x1: 696, y1: 308 + i*11, x2: 726, y2: 316 + i*11, class: 'bp-ln-fine', 'data-shape': 'rear_shock' }));
  // Linkage dog-bone
  shock.appendChild(ns('path', { d: 'M 702 402 L 680 425 L 700 440 L 724 420 L 718 402 Z', class: 'bp-tint', 'data-shape': 'rear_shock' }));
  svg.appendChild(shock);

  // ─── Chain + sprockets ───────────────────────────────────────
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('line', { x1: 700, y1: 400, x2: 970, y2: 410, class: 'bp-ln', 'data-shape': 'chain' }));
  chain.appendChild(ns('line', { x1: 700, y1: 416, x2: 970, y2: 426, class: 'bp-ln', 'data-shape': 'chain' }));
  for (let x = 702; x < 965; x += 10) chain.appendChild(ns('line', { x1: x, y1: 400, x2: x, y2: 426, class: 'bp-ln-fine', 'data-shape': 'chain' }));
  svg.appendChild(chain);

  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('circle', { cx: 970, cy: 418, r: 56, class: 'bp-ln', 'data-shape': 'rear_sprocket' }));
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    rsp.appendChild(ns('line', { x1: 970 + Math.cos(a)*56, y1: 418 + Math.sin(a)*56, x2: 970 + Math.cos(a)*60, y2: 418 + Math.sin(a)*60, class: 'bp-ln-fine', 'data-shape': 'rear_sprocket' }));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI + 0.2;
    rsp.appendChild(ns('circle', { cx: 970 + Math.cos(a)*32, cy: 418 + Math.sin(a)*32, r: 6, class: 'bp-fill-paper', 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  // ─── Wheels (knobby, spoked) ────────────────────────────────
  svg.appendChild(bpWheel(250, 405, 100, 'front_wheel', { knobby: true, spokes: 32 }));
  svg.appendChild(bpWheel(970, 418, 100, 'rear_wheel',  { knobby: true, spokes: 32 }));

  // ─── Brakes (disc + caliper hint) ───────────────────────────
  svg.appendChild(bpBrake(250, 405, 54, 'brake'));

  // ─── Seat (long narrow, slopes up) ──────────────────────────
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 620 232 L 880 268 L 892 290 L 630 262 Z', class: 'bp-tint-strong', 'data-shape': 'seat', 'data-fillable': '' }));
  // Seat grip texture
  for (let i = 0; i < 32; i++) seat.appendChild(ns('circle', { cx: 640 + i*7, cy: 254 + i*0.5, r: 0.8, class: 'bp-fill-knob', 'data-shape': 'seat' }));
  svg.appendChild(seat);

  // Rear fender + tail (small)
  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('path', { d: 'M 880 268 L 940 262 L 950 300 L 892 302 Z', class: 'bp-tint', 'data-shape': 'tail_light', 'data-fillable': '' }));
  tl.appendChild(ns('rect', { x: 915, y: 276, width: 20, height: 10, class: 'bp-tint-strong', 'data-shape': 'tail_light' }));
  svg.appendChild(tl);

  // Battery (small, hidden under seat)
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('rect', { x: 720, y: 302, width: 32, height: 24, class: 'bp-fill-paper', 'data-shape': 'battery', 'data-fillable': '' }));
  const tbat = ns('text', { x: 736, y: 318, 'font-family': 'IBM Plex Mono', 'font-size': 9, 'font-weight': 700, 'text-anchor': 'middle', fill: 'currentColor', 'data-shape': 'battery' });
  tbat.textContent = '12V'; bat.appendChild(tbat);
  svg.appendChild(bat);

  // ─── Foot peg + shifter + brake lever ───────────────────────
  svg.appendChild(ns('circle', { cx: 720, cy: 448, r: 4, class: 'bp-fill-knob' }));
  svg.appendChild(ns('line', { x1: 720, y1: 448, x2: 760, y2: 460, class: 'bp-ln-fine' }));
  // Shifter forward of engine
  svg.appendChild(ns('path', { d: 'M 500 444 L 450 462 L 442 472 L 456 476 L 510 458', class: 'bp-ln-fine' }));

  svg.appendChild(g);

  // Callouts (same lanes as diagram view)
  const callouts = [
    { key: 'headlight',   sx: 310, sy: 215, lx:  100, lane: 1, label: 'Number plate' },
    { key: 'instruments', sx: 410, sy: 160, lx:  360, lane: 1, label: 'Bars + guards' },
    { key: 'fuel_tank',   sx: 540, sy: 250, lx:  580, lane: 1, label: 'Tank + shrouds' },
    { key: 'seat',        sx: 760, sy: 258, lx:  785, lane: 1, label: 'Seat' },
    { key: 'tail_light',  sx: 905, sy: 282, lx: 1000, lane: 1, label: 'Tail' },
    { key: 'forks',       sx: 275, sy: 320, lx:   90, lane: 2, label: 'Forks (USD)' },
    { key: 'air_filter',  sx: 710, sy: 300, lx:  680, lane: 2, label: 'Airbox' },
    { key: 'carb',        sx: 640, sy: 330, lx:  480, lane: 2, label: 'Reed / carb' },
    { key: 'cylinder',    sx: 580, sy: 280, lx:  790, lane: 2, label: 'Cylinder' },
    { key: 'front_wheel', sx: 250, sy: 405, lx:  250, lane: 3, label: 'Front wheel' },
    { key: 'brake',       sx: 305, sy: 400, lx:  395, lane: 3, label: 'Brake disc' },
    { key: 'engine',      sx: 605, sy: 400, lx:  570, lane: 3, label: 'Engine' },
    { key: 'exhaust',     sx: 600, sy: 430, lx:  830, lane: 3, label: 'Expansion chamber' },
    { key: 'swingarm',    sx: 860, sy: 412, lx:  970, lane: 3, label: 'Swingarm' },
    { key: 'rear_wheel',  sx: 970, sy: 418, lx: 1150, lane: 3, label: 'Rear wheel' },
    { key: 'frame',       sx: 480, sy: 260, lx:  445, lane: 4, label: 'Frame' },
    { key: 'battery',     sx: 736, sy: 316, lx:  680, lane: 4, label: 'Battery' },
    { key: 'rear_shock',  sx: 712, sy: 360, lx:  870, lane: 4, label: 'Monoshock' },
    { key: 'rear_sprocket', sx: 970, sy: 465, lx:  998, lane: 4, label: 'Rear sprocket' },
    { key: 'chain',       sx: 820, sy: 418, lx: 1140, lane: 4, label: 'Chain' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

// ─── Classic 4T blueprint (placeholder until Marcel sends ref) ─
function drawClassic4TBlueprint(svg) {
  const g = ns('g');
  g.appendChild(ns('line', { x1: 0, y1: 500, x2: 1200, y2: 500, class: 'bp-ln-fine', 'stroke-dasharray': '4 6' }));

  // Frame (double cradle, classic)
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  frame.appendChild(ns('path', { d: 'M 310 240 Q 410 232 530 236 Q 650 240 720 272', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 305 250 L 440 390 L 540 415', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 680 260 L 820 262 L 900 268', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 720 410 L 820 262 L 820 400 Z', class: 'bp-ln-fine', 'data-shape': 'frame' }));
  frame.appendChild(ns('rect', { x: 288, y: 220, width: 30, height: 60, class: 'bp-tint', 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // Front forks (right-side-up, telescopic)
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  forks.appendChild(ns('path', { d: 'M 298 240 L 262 395 M 316 240 L 280 395', class: 'bp-ln-thick', 'data-shape': 'forks' }));
  for (let i = 0; i < 6; i++) forks.appendChild(ns('line', { x1: 258 + i*2.5, y1: 295 + i*14, x2: 320 - i*2.5, y2: 295 + i*14, class: 'bp-ln-fine', 'data-shape': 'forks' }));
  forks.appendChild(ns('rect', { x: 284, y: 218, width: 54, height: 14, class: 'bp-tint-strong', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Round headlight (chrome bezel)
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('circle', { cx: 265, cy: 268, r: 46, class: 'bp-fill-paper', 'data-shape': 'headlight', 'data-fillable': '' }));
  hl.appendChild(ns('circle', { cx: 265, cy: 268, r: 36, class: 'bp-ln-fine', 'data-shape': 'headlight' }));
  hl.appendChild(ns('circle', { cx: 265, cy: 268, r: 26, class: 'bp-tint-strong', 'data-shape': 'headlight' }));
  hl.appendChild(ns('circle', { cx: 258, cy: 261, r: 6, class: 'bp-fill-paper', 'data-shape': 'headlight' }));
  svg.appendChild(hl);

  // Front fender (classic chrome)
  svg.appendChild(ns('path', { d: 'M 170 358 Q 250 322 335 358 L 328 370 Q 250 332 180 370 Z', class: 'bp-tint', 'data-shape': 'front_wheel', 'data-fillable': '' }));

  // Handlebar + mirror + round instruments
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  bar.appendChild(ns('path', { d: 'M 310 212 Q 345 180 420 165 L 460 158', class: 'bp-ln-thick', 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 310 212 Q 280 186 220 175 L 180 170', class: 'bp-ln-thick', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 180, y: 168, width: 28, height: 12, class: 'bp-tint-strong', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 452, y: 158, width: 28, height: 12, class: 'bp-tint-strong', 'data-shape': 'instruments' }));
  bar.appendChild(ns('ellipse', { cx: 210, cy: 135, rx: 18, ry: 10, class: 'bp-fill-paper', 'data-shape': 'instruments' }));
  bar.appendChild(ns('circle', { cx: 355, cy: 190, r: 22, class: 'bp-fill-paper', 'data-shape': 'instruments', 'data-fillable': '' }));
  bar.appendChild(ns('circle', { cx: 395, cy: 190, r: 22, class: 'bp-fill-paper', 'data-shape': 'instruments' }));
  bar.appendChild(ns('line', { x1: 355, y1: 190, x2: 370, y2: 176, class: 'bp-ln', 'data-shape': 'instruments' }));
  bar.appendChild(ns('line', { x1: 395, y1: 190, x2: 408, y2: 180, class: 'bp-ln', 'data-shape': 'instruments' }));
  svg.appendChild(bar);

  // Teardrop fuel tank
  const tank = ns('g', { 'data-shape': 'fuel_tank', class: 'ute-shape' });
  tank.appendChild(ns('path', { d: 'M 420 260 Q 465 222 540 220 Q 625 220 680 244 L 686 282 Q 580 294 440 288 Z', class: 'bp-tint-strong', 'data-shape': 'fuel_tank', 'data-fillable': '' }));
  tank.appendChild(ns('path', { d: 'M 440 274 Q 560 286 680 266', class: 'bp-ln-fine', 'data-shape': 'fuel_tank' }));
  tank.appendChild(ns('circle', { cx: 575, cy: 232, r: 7, class: 'bp-ln', 'data-shape': 'fuel_tank' }));
  svg.appendChild(tank);

  // Air filter (round)
  const air = ns('g', { 'data-shape': 'air_filter', class: 'ute-shape' });
  air.appendChild(ns('circle', { cx: 560, cy: 328, r: 28, class: 'bp-tint', 'data-shape': 'air_filter', 'data-fillable': '' }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    air.appendChild(ns('line', { x1: 560 + Math.cos(a)*18, y1: 328 + Math.sin(a)*18, x2: 560 + Math.cos(a)*26, y2: 328 + Math.sin(a)*26, class: 'bp-ln-fine', 'data-shape': 'air_filter' }));
  }
  svg.appendChild(air);

  // Carb
  const carb = ns('g', { 'data-shape': 'carb', class: 'ute-shape' });
  carb.appendChild(ns('rect', { x: 594, y: 310, width: 32, height: 36, class: 'bp-tint-strong', 'data-shape': 'carb', 'data-fillable': '' }));
  carb.appendChild(ns('ellipse', { cx: 610, cy: 360, rx: 18, ry: 10, class: 'bp-ln', 'data-shape': 'carb' }));
  svg.appendChild(carb);

  // Engine (parallel twin — two cylinders)
  const eng = ns('g', { 'data-shape': 'engine', class: 'ute-shape' });
  eng.appendChild(ns('path', { d: 'M 528 358 L 702 358 L 712 442 L 522 442 Z', class: 'bp-tint-strong', 'data-shape': 'engine', 'data-fillable': '' }));
  eng.appendChild(ns('circle', { cx: 620, cy: 405, r: 30, class: 'bp-fill-paper', 'data-shape': 'engine' }));
  eng.appendChild(ns('circle', { cx: 620, cy: 405, r: 22, class: 'bp-ln-fine', 'data-shape': 'engine' }));
  for (let i = 0; i < 5; i++) eng.appendChild(ns('circle', { cx: 540 + i*35, cy: 435, r: 1.8, class: 'bp-fill-knob', 'data-shape': 'engine' }));
  svg.appendChild(eng);

  // Two cylinders
  const cyl = ns('g', { 'data-shape': 'cylinder', class: 'ute-shape' });
  cyl.appendChild(ns('path', { d: 'M 544 358 L 548 282 L 596 282 L 592 358 Z', class: 'bp-fill-paper', 'data-shape': 'cylinder', 'data-fillable': '' }));
  cyl.appendChild(ns('path', { d: 'M 626 358 L 630 282 L 678 282 L 674 358 Z', class: 'bp-fill-paper', 'data-shape': 'cylinder' }));
  for (let i = 0; i < 7; i++) {
    const y = 294 + i*8;
    cyl.appendChild(ns('line', { x1: 548 + i*0.3, y1: y, x2: 594 - i*0.3, y2: y, class: 'bp-ln-fine', 'data-shape': 'cylinder' }));
    cyl.appendChild(ns('line', { x1: 630 + i*0.3, y1: y, x2: 676 - i*0.3, y2: y, class: 'bp-ln-fine', 'data-shape': 'cylinder' }));
  }
  cyl.appendChild(ns('rect', { x: 544, y: 272, width: 54, height: 12, class: 'bp-tint-strong', 'data-shape': 'cylinder' }));
  cyl.appendChild(ns('rect', { x: 626, y: 272, width: 54, height: 12, class: 'bp-tint-strong', 'data-shape': 'cylinder' }));
  cyl.appendChild(ns('rect', { x: 566, y: 262, width: 12, height: 12, class: 'bp-tint-strong', 'data-shape': 'cylinder' }));
  cyl.appendChild(ns('rect', { x: 648, y: 262, width: 12, height: 12, class: 'bp-tint-strong', 'data-shape': 'cylinder' }));
  svg.appendChild(cyl);

  // Dual exhaust pipes
  const ex = ns('g', { 'data-shape': 'exhaust', class: 'ute-shape' });
  ex.appendChild(ns('path', { d: 'M 594 358 C 620 410 650 435 790 445 L 970 445', class: 'bp-ln-thick', 'data-shape': 'exhaust' }));
  ex.appendChild(ns('path', { d: 'M 674 358 C 700 394 740 420 820 438 L 990 438', class: 'bp-ln-thick', 'data-shape': 'exhaust' }));
  ex.appendChild(ns('path', { d: 'M 970 422 L 1130 418 L 1138 458 L 975 462 Z', class: 'bp-tint-strong', 'data-shape': 'exhaust', 'data-fillable': '' }));
  ex.appendChild(ns('path', { d: 'M 990 414 L 1140 410 L 1148 452 L 995 456 Z', class: 'bp-ln', 'data-shape': 'exhaust' }));
  svg.appendChild(ex);

  // Rear suspension (dual shocks visible from side — one shown)
  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('line', { x1: 800, y1: 275, x2: 870, y2: 395, class: 'bp-ln-thick', 'data-shape': 'rear_shock' }));
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const x = 800 + (870 - 800) * t, y = 275 + (395 - 275) * t;
    shock.appendChild(ns('line', { x1: x - 7, y1: y - 2, x2: x + 7, y2: y + 2, class: 'bp-ln-fine', 'data-shape': 'rear_shock' }));
  }
  svg.appendChild(shock);

  // Swingarm
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 710 404 L 940 410 L 944 426 L 715 420 Z', class: 'bp-tint', 'data-shape': 'swingarm', 'data-fillable': '' }));
  sw.appendChild(ns('circle', { cx: 710, cy: 412, r: 8, class: 'bp-ln', 'data-shape': 'swingarm' }));
  svg.appendChild(sw);

  // Chain + sprockets
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('line', { x1: 700, y1: 406, x2: 940, y2: 416, class: 'bp-ln', 'data-shape': 'chain' }));
  chain.appendChild(ns('line', { x1: 700, y1: 420, x2: 940, y2: 430, class: 'bp-ln', 'data-shape': 'chain' }));
  for (let x = 702; x < 935; x += 10) chain.appendChild(ns('line', { x1: x, y1: 406, x2: x, y2: 430, class: 'bp-ln-fine', 'data-shape': 'chain' }));
  svg.appendChild(chain);

  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('circle', { cx: 940, cy: 420, r: 52, class: 'bp-ln', 'data-shape': 'rear_sprocket' }));
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * 2 * Math.PI;
    rsp.appendChild(ns('line', { x1: 940 + Math.cos(a)*52, y1: 420 + Math.sin(a)*52, x2: 940 + Math.cos(a)*56, y2: 420 + Math.sin(a)*56, class: 'bp-ln-fine', 'data-shape': 'rear_sprocket' }));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI + 0.3;
    rsp.appendChild(ns('circle', { cx: 940 + Math.cos(a)*28, cy: 420 + Math.sin(a)*28, r: 6, class: 'bp-fill-paper', 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  // Wheels (spoked, no knobby)
  svg.appendChild(bpWheel(254, 400, 96, 'front_wheel', { knobby: false, spokes: 36 }));
  svg.appendChild(bpWheel(940, 420, 96, 'rear_wheel',  { knobby: false, spokes: 36 }));
  svg.appendChild(bpBrake(254, 400, 50, 'brake'));

  // Flat bench seat
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 690 268 L 830 262 L 870 272 L 705 286 Z', class: 'bp-tint-strong', 'data-shape': 'seat', 'data-fillable': '' }));
  seat.appendChild(ns('path', { d: 'M 710 286 L 712 274 L 860 268', class: 'bp-ln-fine', 'data-shape': 'seat' }));
  svg.appendChild(seat);

  // Tail light
  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('ellipse', { cx: 900, cy: 278, rx: 16, ry: 10, class: 'bp-tint-strong', 'data-shape': 'tail_light', 'data-fillable': '' }));
  svg.appendChild(tl);

  // Battery
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('rect', { x: 714, y: 315, width: 42, height: 30, class: 'bp-fill-paper', 'data-shape': 'battery', 'data-fillable': '' }));
  const t = ns('text', { x: 735, y: 335, 'font-family': 'IBM Plex Mono', 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle', fill: 'currentColor', 'data-shape': 'battery' });
  t.textContent = '12V'; bat.appendChild(t);
  svg.appendChild(bat);

  svg.appendChild(g);

  const callouts = [
    { key: 'headlight',   sx: 265, sy: 222, lx:  110, lane: 1, label: 'Headlight' },
    { key: 'instruments', sx: 370, sy: 170, lx:  350, lane: 1, label: 'Instruments' },
    { key: 'fuel_tank',   sx: 575, sy: 232, lx:  580, lane: 1, label: 'Fuel tank' },
    { key: 'seat',        sx: 760, sy: 272, lx:  785, lane: 1, label: 'Seat' },
    { key: 'tail_light',  sx: 900, sy: 278, lx: 1000, lane: 1, label: 'Tail light' },
    { key: 'forks',       sx: 275, sy: 305, lx:   90, lane: 2, label: 'Forks' },
    { key: 'air_filter',  sx: 560, sy: 315, lx:  470, lane: 2, label: 'Air filter' },
    { key: 'carb',        sx: 610, sy: 325, lx:  645, lane: 2, label: 'Carb / EFI' },
    { key: 'cylinder',    sx: 615, sy: 300, lx:  790, lane: 2, label: 'Cylinders' },
    { key: 'front_wheel', sx: 254, sy: 400, lx:  250, lane: 3, label: 'Front wheel' },
    { key: 'brake',       sx: 306, sy: 400, lx:  395, lane: 3, label: 'Brake disc' },
    { key: 'engine',      sx: 615, sy: 410, lx:  565, lane: 3, label: 'Engine' },
    { key: 'chain',       sx: 810, sy: 418, lx:  790, lane: 3, label: 'Chain' },
    { key: 'swingarm',    sx: 850, sy: 414, lx:  950, lane: 3, label: 'Swingarm' },
    { key: 'rear_wheel',  sx: 940, sy: 420, lx: 1150, lane: 3, label: 'Rear wheel' },
    { key: 'frame',       sx: 490, sy: 275, lx:  445, lane: 4, label: 'Frame' },
    { key: 'battery',     sx: 735, sy: 325, lx:  690, lane: 4, label: 'Battery' },
    { key: 'rear_shock',  sx: 835, sy: 335, lx:  870, lane: 4, label: 'Rear shock' },
    { key: 'rear_sprocket', sx: 940, sy: 470, lx: 1000, lane: 4, label: 'Rear sprocket' },
    { key: 'exhaust',     sx: 1040, sy: 445, lx: 1140, lane: 4, label: 'Exhaust' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

// ─── Electric blueprint ─────────────────────────────────────
function drawElectricBikeBlueprint(svg) {
  const g = ns('g');
  g.appendChild(ns('line', { x1: 0, y1: 500, x2: 1200, y2: 500, class: 'bp-ln-fine', 'stroke-dasharray': '4 6' }));

  // Frame
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  frame.appendChild(ns('path', { d: 'M 310 230 Q 420 240 540 240 Q 660 240 720 265', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 315 240 L 440 380 L 540 410', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 650 245 L 790 258 L 870 268', class: 'bp-ln-thick', 'data-shape': 'frame' }));
  frame.appendChild(ns('rect', { x: 295, y: 220, width: 30, height: 55, class: 'bp-tint', 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // Forks (USD, modern)
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  forks.appendChild(ns('path', { d: 'M 302 230 L 260 380 M 320 230 L 278 380', class: 'bp-ln-thick', 'data-shape': 'forks' }));
  forks.appendChild(ns('path', { d: 'M 262 370 L 240 405 L 252 414 L 272 376 Z', class: 'bp-tint-strong', 'data-shape': 'forks' }));
  forks.appendChild(ns('path', { d: 'M 280 370 L 258 405 L 270 414 L 290 376 Z', class: 'bp-tint-strong', 'data-shape': 'forks' }));
  forks.appendChild(ns('rect', { x: 282, y: 210, width: 56, height: 18, class: 'bp-tint-strong', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Angular LED headlight
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('path', { d: 'M 268 218 L 345 205 L 365 255 L 275 268 Z', class: 'bp-tint-strong', 'data-shape': 'headlight', 'data-fillable': '' }));
  hl.appendChild(ns('path', { d: 'M 285 232 L 345 222 L 352 248 L 288 258 Z', class: 'bp-tint', 'data-shape': 'headlight' }));
  hl.appendChild(ns('line', { x1: 290, y1: 240, x2: 345, y2: 232, class: 'bp-ln', 'data-shape': 'headlight' }));
  svg.appendChild(hl);

  // Front fender (angular)
  svg.appendChild(ns('path', { d: 'M 190 335 L 290 315 L 335 340 L 320 358 L 240 350 L 200 360 Z', class: 'bp-tint-strong', 'data-shape': 'front_wheel', 'data-fillable': '' }));

  // Handlebar + TFT dash
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  bar.appendChild(ns('path', { d: 'M 311 215 Q 345 180 420 165 L 460 158', class: 'bp-ln-thick', 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 311 215 Q 280 182 220 172 L 180 170', class: 'bp-ln-thick', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 190, y: 168, width: 24, height: 14, class: 'bp-tint-strong', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 450, y: 158, width: 24, height: 14, class: 'bp-tint-strong', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 345, y: 155, width: 70, height: 36, class: 'bp-tint-strong', 'data-shape': 'instruments', 'data-fillable': '' }));
  const txA = ns('text', { x: 380, y: 180, 'font-family': 'IBM Plex Mono', 'font-size': 14, 'font-weight': 800, fill: 'currentColor', 'text-anchor': 'middle', 'data-shape': 'instruments' });
  txA.textContent = 'EV 85%'; bar.appendChild(txA);
  svg.appendChild(bar);

  // Battery pack (big) with cell cluster
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('path', { d: 'M 430 255 L 710 260 L 720 405 L 435 410 Z', class: 'bp-tint-strong', 'data-shape': 'battery', 'data-fillable': '' }));
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 4; j++) {
      bat.appendChild(ns('circle', { cx: 465 + i*38, cy: 285 + j*32, r: 10, class: 'bp-fill-paper', 'data-shape': 'battery' }));
      bat.appendChild(ns('circle', { cx: 465 + i*38, cy: 285 + j*32, r: 3, class: 'bp-fill-knob', 'data-shape': 'battery' }));
    }
  }
  bat.appendChild(ns('rect', { x: 460, y: 250, width: 50, height: 8, class: 'bp-tint-strong', 'data-shape': 'battery' }));
  bat.appendChild(ns('rect', { x: 620, y: 250, width: 50, height: 8, class: 'bp-ln', 'data-shape': 'battery' }));
  svg.appendChild(bat);

  // Controller
  const ctl = ns('g', { 'data-shape': 'controller', class: 'ute-shape' });
  ctl.appendChild(ns('rect', { x: 475, y: 220, width: 200, height: 32, class: 'bp-tint-strong', 'data-shape': 'controller', 'data-fillable': '' }));
  for (let i = 0; i < 10; i++) ctl.appendChild(ns('line', { x1: 480 + i*20, y1: 225, x2: 480 + i*20, y2: 250, class: 'bp-ln-fine', 'data-shape': 'controller' }));
  const txC = ns('text', { x: 575, y: 243, 'font-family': 'IBM Plex Mono', 'font-size': 10, 'font-weight': 600, 'text-anchor': 'middle', fill: 'currentColor', 'data-shape': 'controller' });
  txC.textContent = 'CONTROLLER / INVERTER'; ctl.appendChild(txC);
  svg.appendChild(ctl);

  // Motor
  const motor = ns('g', { 'data-shape': 'motor', class: 'ute-shape' });
  motor.appendChild(ns('circle', { cx: 720, cy: 400, r: 50, class: 'bp-tint-strong', 'data-shape': 'motor', 'data-fillable': '' }));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 2 * Math.PI;
    motor.appendChild(ns('line', { x1: 720 + Math.cos(a)*34, y1: 400 + Math.sin(a)*34, x2: 720 + Math.cos(a)*48, y2: 400 + Math.sin(a)*48, class: 'bp-ln-fine', 'data-shape': 'motor' }));
  }
  motor.appendChild(ns('circle', { cx: 720, cy: 400, r: 20, class: 'bp-tint-strong', 'data-shape': 'motor' }));
  motor.appendChild(ns('circle', { cx: 720, cy: 400, r: 7, class: 'bp-fill-knob', 'data-shape': 'motor' }));
  svg.appendChild(motor);

  // Charge port
  const cp = ns('g', { 'data-shape': 'charge_port', class: 'ute-shape' });
  cp.appendChild(ns('rect', { x: 395, y: 335, width: 30, height: 24, class: 'bp-fill-paper', 'data-shape': 'charge_port', 'data-fillable': '' }));
  cp.appendChild(ns('circle', { cx: 410, cy: 347, r: 6, class: 'bp-ln', 'data-shape': 'charge_port' }));
  svg.appendChild(cp);

  // Swingarm
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 760 395 L 970 400 L 975 420 L 765 415 Z', class: 'bp-tint-strong', 'data-shape': 'swingarm', 'data-fillable': '' }));
  sw.appendChild(ns('circle', { cx: 760, cy: 404, r: 9, class: 'bp-ln', 'data-shape': 'swingarm' }));
  svg.appendChild(sw);

  // Mono-shock
  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('line', { x1: 790, y1: 305, x2: 790, y2: 400, class: 'bp-ln-thick', 'data-shape': 'rear_shock' }));
  for (let i = 0; i < 6; i++) shock.appendChild(ns('line', { x1: 782, y1: 322 + i*11, x2: 798, y2: 330 + i*11, class: 'bp-ln-fine', 'data-shape': 'rear_shock' }));
  svg.appendChild(shock);

  // Belt + pulley
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('rect', { x: 735, y: 395, width: 230, height: 7, class: 'bp-tint-strong', 'data-shape': 'chain' }));
  chain.appendChild(ns('rect', { x: 735, y: 410, width: 230, height: 7, class: 'bp-tint-strong', 'data-shape': 'chain' }));
  for (let x = 740; x < 965; x += 10) chain.appendChild(ns('line', { x1: x, y1: 395, x2: x, y2: 417, class: 'bp-ln-fine', 'data-shape': 'chain' }));
  svg.appendChild(chain);

  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('circle', { cx: 970, cy: 405, r: 50, class: 'bp-ln', 'data-shape': 'rear_sprocket' }));
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    rsp.appendChild(ns('line', { x1: 970 + Math.cos(a)*50, y1: 405 + Math.sin(a)*50, x2: 970 + Math.cos(a)*54, y2: 405 + Math.sin(a)*54, class: 'bp-ln-fine', 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  svg.appendChild(bpWheel(254, 400, 96, 'front_wheel', { knobby: false, spokes: 20 }));
  svg.appendChild(bpWheel(970, 405, 96, 'rear_wheel',  { knobby: false, spokes: 20 }));
  svg.appendChild(bpBrake(254, 400, 54, 'brake'));

  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 710 258 L 830 258 L 865 275 L 715 280 Z', class: 'bp-tint-strong', 'data-shape': 'seat', 'data-fillable': '' }));
  seat.appendChild(ns('path', { d: 'M 865 275 L 905 260 L 920 285 L 870 290 Z', class: 'bp-tint-strong', 'data-shape': 'seat' }));
  svg.appendChild(seat);

  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('rect', { x: 905, y: 270, width: 16, height: 6, class: 'bp-tint-strong', 'data-shape': 'tail_light', 'data-fillable': '' }));
  svg.appendChild(tl);

  svg.appendChild(g);

  const callouts = [
    { key: 'headlight',   sx: 310, sy: 230, lx:  100, lane: 1, label: 'LED headlight' },
    { key: 'instruments', sx: 380, sy: 170, lx:  370, lane: 1, label: 'TFT dash' },
    { key: 'controller',  sx: 575, sy: 225, lx:  580, lane: 1, label: 'Controller' },
    { key: 'seat',        sx: 770, sy: 268, lx:  790, lane: 1, label: 'Seat' },
    { key: 'tail_light',  sx: 912, sy: 274, lx: 1000, lane: 1, label: 'Tail light' },
    { key: 'forks',       sx: 275, sy: 310, lx:   90, lane: 2, label: 'Forks (USD)' },
    { key: 'battery',     sx: 575, sy: 330, lx:  450, lane: 2, label: 'Battery pack' },
    { key: 'charge_port', sx: 410, sy: 347, lx:  660, lane: 2, label: 'Charge port' },
    { key: 'motor',       sx: 720, sy: 400, lx:  790, lane: 2, label: 'Motor' },
    { key: 'front_wheel', sx: 254, sy: 400, lx:  260, lane: 3, label: 'Front wheel' },
    { key: 'brake',       sx: 306, sy: 400, lx:  405, lane: 3, label: 'Brake disc' },
    { key: 'frame',       sx: 490, sy: 258, lx:  570, lane: 3, label: 'Frame' },
    { key: 'swingarm',    sx: 870, sy: 410, lx:  870, lane: 3, label: 'Swingarm' },
    { key: 'rear_wheel',  sx: 970, sy: 405, lx: 1150, lane: 3, label: 'Rear wheel' },
    { key: 'rear_shock',  sx: 790, sy: 355, lx:  440, lane: 4, label: 'Rear shock' },
    { key: 'chain',       sx: 870, sy: 408, lx:  700, lane: 4, label: 'Belt drive' },
    { key: 'rear_sprocket', sx: 970, sy: 455, lx:  990, lane: 4, label: 'Belt pulley' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

// ───────────────────────── 3D overview drawers ───────────────────
// Pseudo-3D "render" view: 3/4 front-right angle of each motorcycle,
// using SVG linear + radial gradients to fake metallic / paint
// shading. Still fully clickable — every shape carries data-shape.

function td_defs(svg, paintColor) {
  const defs = ns('defs');
  const lin = (id, c1, c2, c3, horizontal) => {
    const g = ns('linearGradient', { id, x1: 0, y1: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1 });
    g.appendChild(ns('stop', { offset: '0%',   'stop-color': c1 }));
    g.appendChild(ns('stop', { offset: '50%',  'stop-color': c2 }));
    g.appendChild(ns('stop', { offset: '100%', 'stop-color': c3 }));
    return g;
  };
  const rad = (id, c1, c2) => {
    const g = ns('radialGradient', { id, cx: '45%', cy: '35%', r: '70%' });
    g.appendChild(ns('stop', { offset: '0%',   'stop-color': c1 }));
    g.appendChild(ns('stop', { offset: '100%', 'stop-color': c2 }));
    return g;
  };
  defs.appendChild(lin('td-chrome',  '#E8E4D8', '#FFFFFF', '#8A867A'));
  defs.appendChild(lin('td-chrome-v','#8E867A', '#F5F2EA', '#5B574E', true));
  defs.appendChild(lin('td-black',   '#2A2824', '#5B574E', '#0E0D0B'));
  defs.appendChild(lin('td-tyre',    '#2A2824', '#4A4642', '#0E0D0B'));
  defs.appendChild(lin('td-rubber',  '#1A1A17', '#3A3833', '#0A0A0A'));
  defs.appendChild(lin('td-engine',  '#5A574E', '#B9B3A4', '#2A2824'));
  defs.appendChild(lin('td-engine2', '#B9B3A4', '#E6E1D4', '#5A574E', true));
  defs.appendChild(lin('td-amber',   '#C27E1E', '#F4D06F', '#8B5A1E'));
  defs.appendChild(lin('td-red',     '#8B2415', '#C2502A', '#4A1208'));
  defs.appendChild(lin('td-grn',     '#1A4A3A', '#2F7F65', '#0A2A1E'));
  defs.appendChild(lin('td-cu',      '#8A4A28', '#C2502A', '#5B2415'));
  // Paint — pass in via tagged id below
  defs.appendChild(lin('td-paint',   paintColor.light, paintColor.mid, paintColor.dark));
  defs.appendChild(lin('td-paint-h', paintColor.mid, paintColor.light, paintColor.mid, true));
  // Shadow
  const shad = ns('radialGradient', { id: 'td-shadow', cx: '50%', cy: '50%', r: '50%' });
  shad.appendChild(ns('stop', { offset: '0%',   'stop-color': '#000000', 'stop-opacity': '0.45' }));
  shad.appendChild(ns('stop', { offset: '100%', 'stop-color': '#000000', 'stop-opacity': '0' }));
  defs.appendChild(shad);
  // Glossy ellipse highlight
  const gloss = ns('radialGradient', { id: 'td-gloss', cx: '35%', cy: '25%', r: '60%' });
  gloss.appendChild(ns('stop', { offset: '0%',   'stop-color': '#FFFFFF', 'stop-opacity': '0.7' }));
  gloss.appendChild(ns('stop', { offset: '100%', 'stop-color': '#FFFFFF', 'stop-opacity': '0' }));
  defs.appendChild(gloss);
  svg.appendChild(defs);
}

function td_wheel(cx, cy, rx, ry, key, { spoke = 20, knobby = false, rimColor = 'url(#td-chrome)' } = {}) {
  const g = ns('g', { 'data-shape': key, class: 'ute-shape' });
  // Tyre (ellipse, foreshortened)
  g.appendChild(ns('ellipse', { cx, cy, rx, ry, fill: 'url(#td-rubber)', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': key }));
  // Tread band
  g.appendChild(ns('ellipse', { cx, cy, rx: rx * 0.9, ry: ry * 0.9, fill: 'none', stroke: '#000', 'stroke-width': 0.5, 'data-shape': key }));
  if (knobby) {
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * 2 * Math.PI;
      const x = cx + Math.cos(a) * rx * 0.95;
      const y = cy + Math.sin(a) * ry * 0.95;
      g.appendChild(ns('rect', { x: x - 2, y: y - 2, width: 4, height: 4, fill: '#1A1A17', 'data-shape': key }));
    }
  }
  // Rim
  g.appendChild(ns('ellipse', { cx, cy, rx: rx * 0.65, ry: ry * 0.65, fill: rimColor, stroke: '#2A2A26', 'stroke-width': 1.2, 'data-shape': key }));
  g.appendChild(ns('ellipse', { cx, cy, rx: rx * 0.6, ry: ry * 0.6, fill: 'none', stroke: '#9A9385', 'stroke-width': 0.7, 'data-shape': key }));
  // Hub
  g.appendChild(ns('ellipse', { cx, cy, rx: 11, ry: 6, fill: 'url(#td-black)', stroke: '#0A0A0A', 'data-shape': key }));
  g.appendChild(ns('ellipse', { cx, cy, rx: 3, ry: 2, fill: '#0A0A0A', 'data-shape': key }));
  // Spokes (projected onto the ellipse)
  for (let i = 0; i < spoke; i++) {
    const a = (i / spoke) * 2 * Math.PI;
    g.appendChild(ns('line', { x1: cx + Math.cos(a) * 10, y1: cy + Math.sin(a) * 5.5, x2: cx + Math.cos(a) * rx * 0.6, y2: cy + Math.sin(a) * ry * 0.6, stroke: '#8A867A', 'stroke-width': 0.7, 'data-shape': key }));
  }
  return g;
}

function td_shadow(cx, cy, rx, ry) {
  return ns('ellipse', { cx, cy, rx, ry, fill: 'url(#td-shadow)' });
}

// ─── 4-stroke CLASSIC in 3/4 view (XS-650 inspired) ─────────────
function drawClassic4T3D(svg) {
  td_defs(svg, { light: '#2A6B4A', mid: '#1D5236', dark: '#0F2E1F' });  // british racing green
  const g = ns('g');

  // Ground shadow
  g.appendChild(td_shadow(640, 540, 420, 42));

  // Rear wheel (behind-left, smaller, foreshortened)
  g.appendChild(td_wheel(230, 480, 90, 32, 'rear_wheel', { spoke: 32 }));
  // Rear brake drum
  g.appendChild(ns('ellipse', { cx: 230, cy: 480, rx: 24, ry: 10, fill: 'url(#td-chrome)', stroke: '#2A2A26' }));

  // Front wheel (foreground-right, larger, foreshortened)
  g.appendChild(td_wheel(970, 500, 110, 38, 'front_wheel', { spoke: 36 }));
  // Front brake disc / caliper
  const brake = ns('g', { 'data-shape': 'brake', class: 'ute-shape' });
  brake.appendChild(ns('ellipse', { cx: 970, cy: 500, rx: 46, ry: 16, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 1.5, 'data-shape': 'brake' }));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 2 * Math.PI;
    brake.appendChild(ns('ellipse', { cx: 970 + Math.cos(a)*40, cy: 500 + Math.sin(a)*14, rx: 2, ry: 1.2, fill: '#2A2A26', 'data-shape': 'brake' }));
  }
  svg.appendChild(brake);

  // Front forks (two tubes to triple-tree)
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  forks.appendChild(ns('path', { d: 'M 942 500 L 905 240 L 925 230 L 962 500 Z', fill: 'url(#td-chrome-v)', stroke: '#2A2A26', 'stroke-width': 1, 'data-shape': 'forks', 'data-fillable': '' }));
  forks.appendChild(ns('path', { d: 'M 990 500 L 956 240 L 976 230 L 1010 500 Z', fill: 'url(#td-chrome-v)', stroke: '#2A2A26', 'stroke-width': 1, 'data-shape': 'forks' }));
  // Rubber gaiters
  forks.appendChild(ns('rect', { x: 912, y: 330, width: 22, height: 90, fill: 'url(#td-rubber)', 'data-shape': 'forks' }));
  forks.appendChild(ns('rect', { x: 962, y: 330, width: 22, height: 90, fill: 'url(#td-rubber)', 'data-shape': 'forks' }));
  // Top triple-tree (chrome)
  forks.appendChild(ns('path', { d: 'M 898 215 L 1015 215 L 1005 240 L 905 240 Z', fill: 'url(#td-chrome)', stroke: '#2A2A26', 'stroke-width': 1.5, 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Front fender (chrome, over front wheel)
  svg.appendChild(ns('path', { d: 'M 870 470 Q 970 410 1075 475 Q 1080 490 1075 495 Q 970 430 865 495 Z', fill: 'url(#td-chrome)', stroke: '#2A2A26', 'stroke-width': 1, 'data-shape': 'front_wheel', class: 'ute-shape' }));

  // Headlight (big round chrome)
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('circle', { cx: 850, cy: 240, r: 56, fill: 'url(#td-chrome)', stroke: '#2A2A26', 'stroke-width': 2, 'data-shape': 'headlight', 'data-fillable': '' }));
  hl.appendChild(ns('circle', { cx: 850, cy: 240, r: 44, fill: 'url(#td-amber)', 'data-shape': 'headlight' }));
  hl.appendChild(ns('circle', { cx: 850, cy: 240, r: 36, fill: '#F3B64B', 'data-shape': 'headlight' }));
  // Specular highlight
  hl.appendChild(ns('circle', { cx: 836, cy: 226, r: 14, fill: 'url(#td-gloss)', 'data-shape': 'headlight' }));
  svg.appendChild(hl);

  // Handlebar + grips + mirrors + indicators
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  // Cross bar (chrome)
  bar.appendChild(ns('path', { d: 'M 650 200 Q 760 150 870 158 L 1000 170 L 1000 184 Q 870 174 760 164 Q 650 214 650 214 Z', fill: 'url(#td-chrome)', stroke: '#2A2A26', 'data-shape': 'instruments' }));
  // Grips (left + right)
  bar.appendChild(ns('rect', { x: 1000, y: 162, width: 42, height: 24, rx: 4, fill: 'url(#td-black)', stroke: '#0A0A0A', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 610, y: 196, width: 42, height: 24, rx: 4, fill: 'url(#td-black)', stroke: '#0A0A0A', 'data-shape': 'instruments' }));
  // Mirrors (round, chrome, on stems)
  bar.appendChild(ns('line', { x1: 1015, y1: 162, x2: 1030, y2: 110, stroke: '#2A2A26', 'stroke-width': 3, 'data-shape': 'instruments' }));
  bar.appendChild(ns('circle', { cx: 1055, cy: 95, r: 24, fill: 'url(#td-chrome)', stroke: '#2A2A26', 'stroke-width': 2, 'data-shape': 'instruments' }));
  bar.appendChild(ns('circle', { cx: 1050, cy: 90, r: 12, fill: 'url(#td-gloss)', 'data-shape': 'instruments' }));
  bar.appendChild(ns('line', { x1: 630, y1: 200, x2: 625, y2: 148, stroke: '#2A2A26', 'stroke-width': 3, 'data-shape': 'instruments' }));
  bar.appendChild(ns('circle', { cx: 595, cy: 135, r: 22, fill: 'url(#td-chrome)', stroke: '#2A2A26', 'stroke-width': 2, 'data-shape': 'instruments' }));
  // Indicators (orange teardrops)
  bar.appendChild(ns('ellipse', { cx: 890, cy: 185, rx: 12, ry: 10, fill: 'url(#td-amber)', stroke: '#2A2A26', 'data-shape': 'instruments' }));
  bar.appendChild(ns('ellipse', { cx: 810, cy: 195, rx: 12, ry: 10, fill: 'url(#td-amber)', stroke: '#2A2A26', 'data-shape': 'instruments' }));
  // Instrument cluster (two round gauges mounted on bars)
  bar.appendChild(ns('ellipse', { cx: 810, cy: 220, rx: 28, ry: 16, fill: 'url(#td-chrome)', stroke: '#2A2A26', 'data-shape': 'instruments', 'data-fillable': '' }));
  bar.appendChild(ns('ellipse', { cx: 870, cy: 220, rx: 28, ry: 16, fill: 'url(#td-chrome)', stroke: '#2A2A26', 'data-shape': 'instruments' }));
  svg.appendChild(bar);

  // Fuel tank (teardrop, painted green with gloss)
  const tank = ns('g', { 'data-shape': 'fuel_tank', class: 'ute-shape' });
  // Right side (visible from this angle)
  tank.appendChild(ns('path', { d: 'M 520 280 Q 580 220 700 215 Q 820 220 860 260 Q 855 310 820 322 Q 700 340 530 320 Z', fill: 'url(#td-paint)', stroke: '#1A1A17', 'stroke-width': 1.5, 'data-shape': 'fuel_tank', 'data-fillable': '' }));
  // Specular highlight along the top ridge
  tank.appendChild(ns('path', { d: 'M 580 232 Q 700 220 820 236 Q 790 252 700 240 Q 620 240 580 252 Z', fill: 'url(#td-gloss)', 'data-shape': 'fuel_tank' }));
  // XS 650 style badge (silver scallop)
  tank.appendChild(ns('path', { d: 'M 565 290 Q 700 285 830 295 L 830 310 Q 700 305 565 308 Z', fill: 'url(#td-chrome)', stroke: '#1A1A17', 'stroke-width': 0.7, 'data-shape': 'fuel_tank' }));
  const tk = ns('text', { x: 700, y: 304, 'font-family': 'IBM Plex Mono', 'font-size': 11, 'font-weight': 800, 'text-anchor': 'middle', fill: '#0A0A0A', 'data-shape': 'fuel_tank' });
  tk.textContent = 'XS 650';
  tank.appendChild(tk);
  // Fuel cap
  tank.appendChild(ns('circle', { cx: 710, cy: 232, r: 10, fill: 'url(#td-black)', stroke: '#1A1A17', 'data-shape': 'fuel_tank' }));
  tank.appendChild(ns('circle', { cx: 708, cy: 230, r: 3, fill: 'url(#td-chrome)', 'data-shape': 'fuel_tank' }));
  svg.appendChild(tank);

  // Seat (black bench with cushion ridge)
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 300 300 Q 390 282 500 285 L 520 318 Q 400 322 300 332 Z', fill: 'url(#td-black)', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'seat', 'data-fillable': '' }));
  // Side panel plates
  seat.appendChild(ns('path', { d: 'M 300 300 L 320 320 L 340 330 Q 290 340 275 335 Z', fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'seat' }));
  svg.appendChild(seat);

  // Engine (parallel twin, from 3/4 — two cylinders rising)
  const eng = ns('g', { 'data-shape': 'engine', class: 'ute-shape' });
  // Crankcase
  eng.appendChild(ns('path', { d: 'M 440 370 Q 470 340 720 345 Q 800 348 850 380 Q 860 440 830 450 L 480 460 Q 430 450 440 370 Z', fill: 'url(#td-engine)', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'engine', 'data-fillable': '' }));
  // Cooling fins (ribs along engine)
  for (let i = 0; i < 12; i++) {
    eng.appendChild(ns('path', { d: `M ${460 + i*32} 380 Q ${500 + i*32} 340 ${540 + i*32} 342`, fill: 'none', stroke: '#2A2A26', 'stroke-width': 0.8, 'data-shape': 'engine' }));
  }
  // Clutch cover round plate (right side, chrome)
  eng.appendChild(ns('ellipse', { cx: 820, cy: 420, rx: 42, ry: 30, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'engine' }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    eng.appendChild(ns('circle', { cx: 820 + Math.cos(a)*32, cy: 420 + Math.sin(a)*22, r: 2, fill: '#1A1A17', 'data-shape': 'engine' }));
  }
  // Engine badge
  eng.appendChild(ns('circle', { cx: 820, cy: 420, r: 10, fill: 'url(#td-paint)', stroke: '#0A0A0A', 'data-shape': 'engine' }));
  svg.appendChild(eng);

  // Cylinders (sticking up out of engine)
  const cyl = ns('g', { 'data-shape': 'cylinder', class: 'ute-shape' });
  cyl.appendChild(ns('path', { d: 'M 530 345 L 540 300 L 605 300 L 595 345 Z', fill: 'url(#td-engine2)', stroke: '#0A0A0A', 'stroke-width': 1.2, 'data-shape': 'cylinder', 'data-fillable': '' }));
  cyl.appendChild(ns('path', { d: 'M 635 345 L 645 300 L 710 300 L 700 345 Z', fill: 'url(#td-engine2)', stroke: '#0A0A0A', 'stroke-width': 1.2, 'data-shape': 'cylinder' }));
  for (let i = 0; i < 5; i++) {
    const y = 306 + i*8;
    cyl.appendChild(ns('line', { x1: 534 + i*0.5, y1: y, x2: 601 - i*0.5, y2: y, stroke: '#0A0A0A', 'stroke-width': 0.6, 'data-shape': 'cylinder' }));
    cyl.appendChild(ns('line', { x1: 639 + i*0.5, y1: y, x2: 706 - i*0.5, y2: y, stroke: '#0A0A0A', 'stroke-width': 0.6, 'data-shape': 'cylinder' }));
  }
  // Rocker covers (chrome tops)
  cyl.appendChild(ns('path', { d: 'M 530 300 L 605 300 L 603 290 L 532 290 Z', fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'cylinder' }));
  cyl.appendChild(ns('path', { d: 'M 635 300 L 710 300 L 708 290 L 637 290 Z', fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'cylinder' }));
  svg.appendChild(cyl);

  // Carburetors (round polished bells)
  const carb = ns('g', { 'data-shape': 'carb', class: 'ute-shape' });
  carb.appendChild(ns('ellipse', { cx: 490, cy: 330, rx: 30, ry: 22, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'carb', 'data-fillable': '' }));
  carb.appendChild(ns('ellipse', { cx: 490, cy: 330, rx: 22, ry: 16, fill: '#2A2A26', 'data-shape': 'carb' }));
  svg.appendChild(carb);

  // Air box (behind carb — side cover)
  const air = ns('g', { 'data-shape': 'air_filter', class: 'ute-shape' });
  air.appendChild(ns('path', { d: 'M 395 310 Q 390 350 410 380 L 450 376 L 450 322 Z', fill: 'url(#td-chrome)', stroke: '#1A1A17', 'data-shape': 'air_filter', 'data-fillable': '' }));
  svg.appendChild(air);

  // Dual exhaust pipes (chrome, exiting right from engine)
  const ex = ns('g', { 'data-shape': 'exhaust', class: 'ute-shape' });
  // Upper pipe
  ex.appendChild(ns('path', { d: 'M 530 420 Q 440 460 240 490 L 70 500 L 70 512 L 240 502 Q 450 480 540 436 Z', fill: 'url(#td-chrome)', stroke: '#1A1A17', 'stroke-width': 1, 'data-shape': 'exhaust', 'data-fillable': '' }));
  // Lower pipe
  ex.appendChild(ns('path', { d: 'M 540 436 Q 450 476 250 504 L 85 510 L 85 522 L 250 516 Q 460 496 548 450 Z', fill: 'url(#td-chrome)', stroke: '#1A1A17', 'stroke-width': 1, 'data-shape': 'exhaust' }));
  // Muffler end caps (slash-cut)
  ex.appendChild(ns('ellipse', { cx: 72, cy: 507, rx: 7, ry: 10, fill: '#1A1A17', 'data-shape': 'exhaust' }));
  ex.appendChild(ns('ellipse', { cx: 86, cy: 517, rx: 7, ry: 10, fill: '#1A1A17', 'data-shape': 'exhaust' }));
  svg.appendChild(ex);

  // Side stand
  svg.appendChild(ns('line', { x1: 480, y1: 460, x2: 460, y2: 540, stroke: '#2A2A26', 'stroke-width': 4 }));

  // Battery / electrics area under seat (visible side cover)
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('path', { d: 'M 380 332 L 380 390 L 440 388 L 440 332 Z', fill: 'url(#td-paint)', stroke: '#0A0A0A', 'data-shape': 'battery', 'data-fillable': '' }));
  const btxt = ns('text', { x: 410, y: 367, 'font-family': 'IBM Plex Mono', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', fill: '#F6F5F2', 'data-shape': 'battery' });
  btxt.textContent = '12V'; bat.appendChild(btxt);
  svg.appendChild(bat);

  // Rear shock + tail light
  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('line', { x1: 270, y1: 330, x2: 232, y2: 460, stroke: 'url(#td-chrome)', 'stroke-width': 10, 'data-shape': 'rear_shock' }));
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = 270 + (232 - 270) * t, y = 330 + (460 - 330) * t;
    shock.appendChild(ns('line', { x1: x - 5, y1: y - 2, x2: x + 5, y2: y + 2, stroke: '#2A2A26', 'stroke-width': 2, 'data-shape': 'rear_shock' }));
  }
  svg.appendChild(shock);

  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('ellipse', { cx: 268, cy: 310, rx: 14, ry: 10, fill: 'url(#td-red)', stroke: '#0A0A0A', 'data-shape': 'tail_light', 'data-fillable': '' }));
  svg.appendChild(tl);

  // Frame rails (black, barely visible from this angle)
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  frame.appendChild(ns('path', { d: 'M 900 260 Q 820 270 760 285', fill: 'none', stroke: '#1A1A17', 'stroke-width': 3, 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 900 260 Q 780 320 540 340', fill: 'none', stroke: '#1A1A17', 'stroke-width': 3, 'data-shape': 'frame' }));
  frame.appendChild(ns('path', { d: 'M 500 285 Q 400 300 280 310', fill: 'none', stroke: '#1A1A17', 'stroke-width': 3, 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // Swingarm
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 460 450 Q 350 460 240 475 L 240 490 Q 350 476 465 464 Z', fill: 'url(#td-chrome-v)', stroke: '#1A1A17', 'data-shape': 'swingarm', 'data-fillable': '' }));
  svg.appendChild(sw);

  // Chain (barely visible)
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('line', { x1: 460, y1: 448, x2: 240, y2: 476, stroke: '#1A1A17', 'stroke-width': 2.5, 'data-shape': 'chain' }));
  for (let x = 240; x < 460; x += 10) chain.appendChild(ns('line', { x1: x, y1: 475 - (x-240)*0.013, x2: x, y2: 477 - (x-240)*0.013, stroke: '#9A9385', 'stroke-width': 1.5, 'data-shape': 'chain' }));
  svg.appendChild(chain);

  // Rear sprocket (on wheel, visible edge)
  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('ellipse', { cx: 230, cy: 480, rx: 48, ry: 17, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'rear_sprocket', 'data-fillable': '' }));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 2 * Math.PI;
    rsp.appendChild(ns('line', { x1: 230 + Math.cos(a)*48, y1: 480 + Math.sin(a)*17, x2: 230 + Math.cos(a)*52, y2: 480 + Math.sin(a)*18.5, stroke: '#0A0A0A', 'stroke-width': 0.7, 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  svg.appendChild(g);

  // Minimal callouts (just a few key ones to avoid cluttering the beautiful render)
  const callouts = [
    { key: 'headlight',   sx: 850, sy: 184, lx:  820, lane: 1, label: 'Headlight' },
    { key: 'instruments', sx: 840, sy: 220, lx:  980, lane: 1, label: 'Instruments' },
    { key: 'fuel_tank',   sx: 700, sy: 230, lx:  700, lane: 1, label: 'Tank · XS 650' },
    { key: 'cylinder',    sx: 670, sy: 300, lx:  540, lane: 1, label: 'Twin cylinder' },
    { key: 'carb',        sx: 490, sy: 330, lx:  440, lane: 1, label: 'Carb' },
    { key: 'front_wheel', sx: 970, sy: 500, lx: 1140, lane: 3, label: 'Front wheel' },
    { key: 'rear_wheel',  sx: 230, sy: 480, lx:   90, lane: 3, label: 'Rear wheel' },
    { key: 'exhaust',     sx: 150, sy: 510, lx:  200, lane: 4, label: 'Dual exhaust' },
    { key: 'engine',      sx: 640, sy: 420, lx:  620, lane: 4, label: 'Engine' },
    { key: 'seat',        sx: 400, sy: 300, lx:  380, lane: 4, label: 'Seat' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

// ─── 2-stroke MOTOCROSS 3D ──────────────────────────────────────
function drawMotocross2T3D(svg) {
  td_defs(svg, { light: '#E8542C', mid: '#C2502A', dark: '#7A2810' });  // moto orange
  const g = ns('g');
  g.appendChild(td_shadow(640, 540, 420, 42));

  // Wheels (knobby, bigger)
  g.appendChild(td_wheel(230, 480, 100, 36, 'rear_wheel',  { spoke: 36, knobby: true, rimColor: 'url(#td-chrome)' }));
  g.appendChild(td_wheel(970, 500, 110, 40, 'front_wheel', { spoke: 36, knobby: true, rimColor: 'url(#td-chrome)' }));

  // Brake disc
  const brake = ns('g', { 'data-shape': 'brake', class: 'ute-shape' });
  brake.appendChild(ns('ellipse', { cx: 970, cy: 500, rx: 42, ry: 15, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 1.5, 'data-shape': 'brake' }));
  svg.appendChild(brake);

  // Front forks (USD gold)
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  forks.appendChild(ns('path', { d: 'M 942 490 L 905 220 L 930 212 L 962 490 Z', fill: 'url(#td-amber)', stroke: '#5B2415', 'stroke-width': 1, 'data-shape': 'forks', 'data-fillable': '' }));
  forks.appendChild(ns('path', { d: 'M 990 490 L 956 220 L 982 212 L 1010 490 Z', fill: 'url(#td-amber)', stroke: '#5B2415', 'stroke-width': 1, 'data-shape': 'forks' }));
  // Lower sliders (black)
  forks.appendChild(ns('rect', { x: 925, y: 400, width: 44, height: 100, fill: 'url(#td-black)', 'data-shape': 'forks' }));
  forks.appendChild(ns('rect', { x: 973, y: 400, width: 44, height: 100, fill: 'url(#td-black)', 'data-shape': 'forks' }));
  // Triple
  forks.appendChild(ns('path', { d: 'M 895 200 L 1020 200 L 1010 230 L 905 230 Z', fill: 'url(#td-black)', stroke: '#1A1A17', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Front mudguard (high, orange)
  svg.appendChild(ns('path', { d: 'M 870 420 Q 970 340 1080 420 Q 1080 440 1075 450 Q 970 370 865 450 Z', fill: 'url(#td-paint)', stroke: '#5B2415', 'stroke-width': 1, 'data-shape': 'front_wheel', class: 'ute-shape' }));

  // Number plate (front)
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('path', { d: 'M 820 180 Q 855 165 905 170 L 915 230 Q 860 234 815 228 Z', fill: '#F6F5F2', stroke: '#1A1A17', 'stroke-width': 1.5, 'data-shape': 'headlight', 'data-fillable': '' }));
  const nn = ns('text', { x: 865, y: 215, 'font-family': 'IBM Plex Mono', 'font-size': 32, 'font-weight': 800, 'text-anchor': 'middle', fill: '#1A1A17', 'data-shape': 'headlight' });
  nn.textContent = '42'; hl.appendChild(nn);
  svg.appendChild(hl);

  // Bars + hand guards
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  bar.appendChild(ns('path', { d: 'M 650 180 Q 760 140 870 150 L 1000 160 L 1000 176 Q 870 164 760 154 Q 650 194 650 194 Z', fill: 'url(#td-black)', stroke: '#0A0A0A', 'data-shape': 'instruments' }));
  // Hand guards (big wrap, orange)
  bar.appendChild(ns('path', { d: 'M 580 130 Q 600 110 660 130 L 668 206 Q 600 216 580 194 Z', fill: 'url(#td-paint)', stroke: '#5B2415', 'data-shape': 'instruments' }));
  bar.appendChild(ns('path', { d: 'M 990 120 Q 1010 100 1070 118 L 1078 194 Q 1010 204 990 182 Z', fill: 'url(#td-paint)', stroke: '#5B2415', 'data-shape': 'instruments' }));
  svg.appendChild(bar);

  // Shrouds / tank panels (big orange)
  const tank = ns('g', { 'data-shape': 'fuel_tank', class: 'ute-shape' });
  tank.appendChild(ns('path', { d: 'M 540 265 Q 600 230 720 230 Q 830 240 850 290 Q 820 332 720 342 Q 580 338 540 320 Z', fill: 'url(#td-paint)', stroke: '#1A1A17', 'stroke-width': 1.5, 'data-shape': 'fuel_tank', 'data-fillable': '' }));
  tank.appendChild(ns('path', { d: 'M 580 245 Q 700 232 820 245 Q 780 258 700 248 Q 620 248 580 262 Z', fill: 'url(#td-gloss)', 'data-shape': 'fuel_tank' }));
  // Radiator louvres on side
  for (let i = 0; i < 7; i++) tank.appendChild(ns('line', { x1: 560 + i*4, y1: 290, x2: 560 + i*4, y2: 328, stroke: '#5B2415', 'stroke-width': 0.6, 'data-shape': 'fuel_tank' }));
  svg.appendChild(tank);

  // Seat (narrow, long, white/orange)
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 300 300 Q 400 272 530 272 L 540 310 Q 400 324 300 332 Z', fill: 'url(#td-paint)', stroke: '#1A1A17', 'stroke-width': 1.5, 'data-shape': 'seat', 'data-fillable': '' }));
  // Grip texture
  for (let i = 0; i < 32; i++) seat.appendChild(ns('circle', { cx: 320 + i*7, cy: 294 + i*0.4, r: 0.9, fill: '#1A1A17', 'data-shape': 'seat' }));
  svg.appendChild(seat);

  // Engine (compact 2T)
  const eng = ns('g', { 'data-shape': 'engine', class: 'ute-shape' });
  eng.appendChild(ns('path', { d: 'M 460 370 Q 500 340 700 345 Q 800 348 820 390 Q 820 450 760 460 L 480 468 Q 440 450 460 370 Z', fill: 'url(#td-engine)', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'engine', 'data-fillable': '' }));
  // Clutch cover
  eng.appendChild(ns('ellipse', { cx: 790, cy: 420, rx: 42, ry: 30, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'engine' }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    eng.appendChild(ns('circle', { cx: 790 + Math.cos(a)*32, cy: 420 + Math.sin(a)*22, r: 1.6, fill: '#1A1A17', 'data-shape': 'engine' }));
  }
  svg.appendChild(eng);

  // Cylinder (single, tilted forward)
  const cyl = ns('g', { 'data-shape': 'cylinder', class: 'ute-shape' });
  cyl.appendChild(ns('path', { d: 'M 580 345 L 600 262 L 680 258 L 670 345 Z', fill: 'url(#td-engine2)', stroke: '#0A0A0A', 'data-shape': 'cylinder', 'data-fillable': '' }));
  for (let i = 0; i < 11; i++) {
    const y = 272 + i*7;
    cyl.appendChild(ns('line', { x1: 584 + i*0.3, y1: y, x2: 676 - i*0.3, y2: y, stroke: '#0A0A0A', 'stroke-width': 0.6, 'data-shape': 'cylinder' }));
  }
  cyl.appendChild(ns('path', { d: 'M 600 262 L 680 258 L 678 248 L 602 252 Z', fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'cylinder' }));
  // Spark plug
  cyl.appendChild(ns('circle', { cx: 635, cy: 240, r: 7, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'cylinder' }));
  svg.appendChild(cyl);

  // Expansion chamber (iconic 2T, chrome, bulging)
  const ex = ns('g', { 'data-shape': 'exhaust', class: 'ute-shape' });
  // Stinger out of cylinder going forward and down
  ex.appendChild(ns('path', { d: 'M 585 345 Q 560 390 500 440 Q 400 470 200 490 Q 120 495 100 475 Q 120 435 240 410 Q 400 380 500 360 Q 560 355 590 362 Z', fill: 'url(#td-chrome)', stroke: '#1A1A17', 'stroke-width': 1.2, 'data-shape': 'exhaust', 'data-fillable': '' }));
  // Chamber highlight
  ex.appendChild(ns('path', { d: 'M 220 420 Q 350 400 450 390', fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2, opacity: 0.4, 'data-shape': 'exhaust' }));
  // End silencer
  ex.appendChild(ns('path', { d: 'M 100 475 L 50 486 L 48 500 L 110 490 Z', fill: 'url(#td-chrome)', stroke: '#1A1A17', 'data-shape': 'exhaust' }));
  svg.appendChild(ex);

  // Battery
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('rect', { x: 388, y: 330, width: 44, height: 32, fill: '#F6F5F2', stroke: '#0A0A0A', 'data-shape': 'battery', 'data-fillable': '' }));
  const bt = ns('text', { x: 410, y: 350, 'font-family': 'IBM Plex Mono', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', fill: '#0A0A0A', 'data-shape': 'battery' });
  bt.textContent = '12V'; bat.appendChild(bt);
  svg.appendChild(bat);

  // Swingarm (aluminium)
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 470 460 Q 350 470 230 480 L 230 494 Q 350 484 475 472 Z', fill: 'url(#td-chrome-v)', stroke: '#1A1A17', 'data-shape': 'swingarm', 'data-fillable': '' }));
  svg.appendChild(sw);

  // Mono-shock
  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('rect', { x: 440, y: 300, width: 20, height: 120, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'rear_shock', 'data-fillable': '' }));
  for (let i = 0; i < 10; i++) shock.appendChild(ns('line', { x1: 434, y1: 310 + i*12, x2: 466, y2: 320 + i*12, stroke: '#C2502A', 'stroke-width': 2, 'data-shape': 'rear_shock' }));
  svg.appendChild(shock);

  // Chain + rear sprocket (large on rear wheel)
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('line', { x1: 465, y1: 462, x2: 240, y2: 478, stroke: '#1A1A17', 'stroke-width': 2.5, 'data-shape': 'chain' }));
  svg.appendChild(chain);

  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('ellipse', { cx: 230, cy: 480, rx: 50, ry: 17, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'rear_sprocket', 'data-fillable': '' }));
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * 2 * Math.PI;
    rsp.appendChild(ns('line', { x1: 230 + Math.cos(a)*50, y1: 480 + Math.sin(a)*17, x2: 230 + Math.cos(a)*54, y2: 480 + Math.sin(a)*18.5, stroke: '#0A0A0A', 'stroke-width': 0.7, 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  // Rear fender + tail
  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('path', { d: 'M 270 275 Q 290 255 335 258 L 340 300 Q 290 305 270 300 Z', fill: 'url(#td-paint)', stroke: '#1A1A17', 'data-shape': 'tail_light', 'data-fillable': '' }));
  svg.appendChild(tl);

  // Frame rails (visible)
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  frame.appendChild(ns('path', { d: 'M 895 245 Q 820 260 760 285', fill: 'none', stroke: '#2A6B4A', 'stroke-width': 3, 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // Air box (behind cylinder)
  const air = ns('g', { 'data-shape': 'air_filter', class: 'ute-shape' });
  air.appendChild(ns('path', { d: 'M 450 305 L 540 310 L 540 360 L 450 360 Z', fill: 'url(#td-black)', stroke: '#1A1A17', 'data-shape': 'air_filter', 'data-fillable': '' }));
  svg.appendChild(air);

  // Carb
  const carb = ns('g', { 'data-shape': 'carb', class: 'ute-shape' });
  carb.appendChild(ns('ellipse', { cx: 555, cy: 335, rx: 20, ry: 15, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'carb', 'data-fillable': '' }));
  svg.appendChild(carb);

  svg.appendChild(g);

  const callouts = [
    { key: 'headlight',   sx: 865, sy: 200, lx:  820, lane: 1, label: 'Number plate' },
    { key: 'instruments', sx: 820, sy: 170, lx:  980, lane: 1, label: 'Bars + guards' },
    { key: 'fuel_tank',   sx: 700, sy: 260, lx:  680, lane: 1, label: 'Shrouds + tank' },
    { key: 'cylinder',    sx: 640, sy: 290, lx:  540, lane: 1, label: 'Cylinder' },
    { key: 'front_wheel', sx: 970, sy: 500, lx: 1140, lane: 3, label: 'Front wheel' },
    { key: 'rear_wheel',  sx: 230, sy: 480, lx:   90, lane: 3, label: 'Rear wheel' },
    { key: 'exhaust',     sx: 300, sy: 430, lx:  200, lane: 4, label: 'Expansion chamber' },
    { key: 'engine',      sx: 640, sy: 420, lx:  620, lane: 4, label: 'Engine' },
    { key: 'seat',        sx: 400, sy: 290, lx:  380, lane: 4, label: 'Seat' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

// ─── Electric 3D ────────────────────────────────────────────────
function drawElectricBike3D(svg) {
  td_defs(svg, { light: '#2A2A26', mid: '#4A4642', dark: '#0A0A0A' });  // naked black
  const g = ns('g');
  g.appendChild(td_shadow(640, 540, 420, 42));

  g.appendChild(td_wheel(230, 480, 100, 36, 'rear_wheel',  { spoke: 20, knobby: false, rimColor: 'url(#td-chrome)' }));
  g.appendChild(td_wheel(970, 500, 110, 40, 'front_wheel', { spoke: 20, knobby: false, rimColor: 'url(#td-chrome)' }));

  const brake = ns('g', { 'data-shape': 'brake', class: 'ute-shape' });
  brake.appendChild(ns('ellipse', { cx: 970, cy: 500, rx: 48, ry: 17, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 1.5, 'data-shape': 'brake' }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    brake.appendChild(ns('ellipse', { cx: 970 + Math.cos(a)*42, cy: 500 + Math.sin(a)*14, rx: 2, ry: 1.2, fill: '#2A2A26', 'data-shape': 'brake' }));
  }
  svg.appendChild(brake);

  // Inverted forks (modern)
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  forks.appendChild(ns('path', { d: 'M 942 490 L 905 220 L 930 212 L 962 490 Z', fill: 'url(#td-chrome-v)', stroke: '#2A2A26', 'data-shape': 'forks', 'data-fillable': '' }));
  forks.appendChild(ns('path', { d: 'M 990 490 L 956 220 L 982 212 L 1010 490 Z', fill: 'url(#td-chrome-v)', stroke: '#2A2A26', 'data-shape': 'forks' }));
  forks.appendChild(ns('rect', { x: 925, y: 380, width: 44, height: 120, fill: 'url(#td-black)', 'data-shape': 'forks' }));
  forks.appendChild(ns('rect', { x: 973, y: 380, width: 44, height: 120, fill: 'url(#td-black)', 'data-shape': 'forks' }));
  forks.appendChild(ns('path', { d: 'M 895 200 L 1020 200 L 1010 230 L 905 230 Z', fill: 'url(#td-black)', stroke: '#1A1A17', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Angular LED headlight
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('path', { d: 'M 820 192 L 920 180 L 940 245 L 835 258 Z', fill: 'url(#td-black)', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'headlight', 'data-fillable': '' }));
  hl.appendChild(ns('path', { d: 'M 835 210 L 920 198 L 926 232 L 840 244 Z', fill: 'url(#td-grn)', 'data-shape': 'headlight' }));
  hl.appendChild(ns('line', { x1: 840, y1: 220, x2: 920, y2: 210, stroke: '#F6F5F2', 'stroke-width': 2, 'data-shape': 'headlight' }));
  svg.appendChild(hl);

  // Bars + TFT dash
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  bar.appendChild(ns('path', { d: 'M 650 180 Q 760 140 870 150 L 1000 160 L 1000 176 Q 870 164 760 154 Q 650 194 650 194 Z', fill: 'url(#td-black)', stroke: '#0A0A0A', 'data-shape': 'instruments' }));
  bar.appendChild(ns('rect', { x: 790, y: 148, width: 110, height: 58, rx: 6, fill: 'url(#td-black)', stroke: '#0A0A0A', 'data-shape': 'instruments', 'data-fillable': '' }));
  const txEV = ns('text', { x: 845, y: 180, 'font-family': 'IBM Plex Mono', 'font-size': 16, 'font-weight': 800, 'text-anchor': 'middle', fill: '#2F7F65', 'data-shape': 'instruments' });
  txEV.textContent = 'EV'; bar.appendChild(txEV);
  const txP = ns('text', { x: 845, y: 198, 'font-family': 'IBM Plex Mono', 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle', fill: '#E2A93B', 'data-shape': 'instruments' });
  txP.textContent = '85%'; bar.appendChild(txP);
  svg.appendChild(bar);

  // Battery pack (large, where tank + engine would be)
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('path', { d: 'M 400 268 Q 440 258 500 258 L 720 265 Q 760 275 760 340 Q 760 395 720 410 L 450 425 Q 400 420 400 370 Z', fill: 'url(#td-engine2)', stroke: '#1A1A17', 'stroke-width': 1.5, 'data-shape': 'battery', 'data-fillable': '' }));
  // Cell cluster visible through side vents
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 3; j++) {
      bat.appendChild(ns('circle', { cx: 440 + i*42, cy: 300 + j*32, r: 10, fill: '#5A574E', stroke: '#1A1A17', 'data-shape': 'battery' }));
      bat.appendChild(ns('circle', { cx: 440 + i*42, cy: 300 + j*32, r: 3, fill: 'url(#td-cu)', 'data-shape': 'battery' }));
    }
  }
  svg.appendChild(bat);

  // Controller box on top of battery
  const ctl = ns('g', { 'data-shape': 'controller', class: 'ute-shape' });
  ctl.appendChild(ns('rect', { x: 460, y: 230, width: 240, height: 38, fill: 'url(#td-black)', stroke: '#1A1A17', 'stroke-width': 1.5, 'data-shape': 'controller', 'data-fillable': '' }));
  for (let i = 0; i < 12; i++) ctl.appendChild(ns('line', { x1: 470 + i*20, y1: 236, x2: 470 + i*20, y2: 262, stroke: '#9A9385', 'stroke-width': 1, 'data-shape': 'controller' }));
  svg.appendChild(ctl);

  // Motor at swingarm pivot
  const motor = ns('g', { 'data-shape': 'motor', class: 'ute-shape' });
  motor.appendChild(ns('circle', { cx: 500, cy: 455, r: 54, fill: 'url(#td-engine)', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'motor', 'data-fillable': '' }));
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * 2 * Math.PI;
    motor.appendChild(ns('line', { x1: 500 + Math.cos(a)*36, y1: 455 + Math.sin(a)*36, x2: 500 + Math.cos(a)*52, y2: 455 + Math.sin(a)*52, stroke: '#2A2824', 'stroke-width': 1.5, 'data-shape': 'motor' }));
  }
  motor.appendChild(ns('circle', { cx: 500, cy: 455, r: 20, fill: '#0A0A0A', 'data-shape': 'motor' }));
  motor.appendChild(ns('circle', { cx: 500, cy: 455, r: 7, fill: 'url(#td-cu)', 'data-shape': 'motor' }));
  // Phase cables (3)
  motor.appendChild(ns('path', { d: 'M 452 420 Q 420 400 410 380', fill: 'none', stroke: 'url(#td-cu)', 'stroke-width': 4, 'data-shape': 'motor' }));
  motor.appendChild(ns('path', { d: 'M 448 455 L 410 455', fill: 'none', stroke: 'url(#td-grn)', 'stroke-width': 4, 'data-shape': 'motor' }));
  motor.appendChild(ns('path', { d: 'M 452 490 Q 420 510 410 530', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': 'motor' }));
  svg.appendChild(motor);

  // Charge port
  const cp = ns('g', { 'data-shape': 'charge_port', class: 'ute-shape' });
  cp.appendChild(ns('rect', { x: 710, y: 380, width: 32, height: 24, fill: 'url(#td-chrome)', stroke: '#1A1A17', 'data-shape': 'charge_port', 'data-fillable': '' }));
  cp.appendChild(ns('circle', { cx: 726, cy: 392, r: 7, fill: 'url(#td-grn)', 'data-shape': 'charge_port' }));
  svg.appendChild(cp);

  // Seat (small, angular)
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  seat.appendChild(ns('path', { d: 'M 280 260 Q 380 240 460 248 L 470 290 Q 380 300 290 310 Z', fill: 'url(#td-black)', stroke: '#0A0A0A', 'data-shape': 'seat', 'data-fillable': '' }));
  svg.appendChild(seat);

  // Tail light
  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('rect', { x: 260, y: 275, width: 24, height: 10, fill: 'url(#td-red)', 'data-shape': 'tail_light', 'data-fillable': '' }));
  svg.appendChild(tl);

  // Swingarm (massive, aluminium)
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 500 455 Q 400 465 230 480 L 230 494 Q 400 480 500 468 Z', fill: 'url(#td-chrome-v)', stroke: '#1A1A17', 'data-shape': 'swingarm', 'data-fillable': '' }));
  svg.appendChild(sw);

  // Belt drive
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  chain.appendChild(ns('rect', { x: 230, y: 478, width: 270, height: 6, fill: '#1A1A17', 'data-shape': 'chain' }));
  for (let x = 240; x < 490; x += 10) chain.appendChild(ns('line', { x1: x, y1: 477, x2: x, y2: 485, stroke: '#9A9385', 'stroke-width': 0.8, 'data-shape': 'chain' }));
  svg.appendChild(chain);

  // Belt pulley
  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('ellipse', { cx: 230, cy: 480, rx: 50, ry: 17, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'rear_sprocket', 'data-fillable': '' }));
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    rsp.appendChild(ns('line', { x1: 230 + Math.cos(a)*50, y1: 480 + Math.sin(a)*17, x2: 230 + Math.cos(a)*53, y2: 480 + Math.sin(a)*18, stroke: '#0A0A0A', 'stroke-width': 0.6, 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  // Shock
  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('rect', { x: 500, y: 320, width: 20, height: 130, fill: 'url(#td-chrome)', stroke: '#0A0A0A', 'data-shape': 'rear_shock', 'data-fillable': '' }));
  svg.appendChild(shock);

  // Frame rails (black trellis)
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  frame.appendChild(ns('path', { d: 'M 895 240 L 760 258 Q 700 262 500 266', fill: 'none', stroke: '#1A1A17', 'stroke-width': 3, 'data-shape': 'frame' }));
  svg.appendChild(frame);

  svg.appendChild(g);

  const callouts = [
    { key: 'headlight',   sx: 870, sy: 200, lx:  820, lane: 1, label: 'LED' },
    { key: 'instruments', sx: 845, sy: 175, lx:  970, lane: 1, label: 'TFT dash' },
    { key: 'controller',  sx: 580, sy: 240, lx:  580, lane: 1, label: 'Controller' },
    { key: 'battery',     sx: 580, sy: 340, lx:  440, lane: 1, label: 'Battery pack' },
    { key: 'motor',       sx: 500, sy: 455, lx:  600, lane: 4, label: 'Motor' },
    { key: 'front_wheel', sx: 970, sy: 500, lx: 1140, lane: 3, label: 'Front wheel' },
    { key: 'rear_wheel',  sx: 230, sy: 480, lx:   90, lane: 3, label: 'Rear wheel' },
    { key: 'charge_port', sx: 726, sy: 392, lx:  740, lane: 4, label: 'Charge port' },
    { key: 'seat',        sx: 370, sy: 275, lx:  380, lane: 4, label: 'Seat' },
  ];
  const gc = ns('g');
  callouts.forEach((c) => gc.appendChild(callout(c)));
  svg.appendChild(gc);
}

// ───────────────────────── Component view router ────────────────
function renderComponentView() {
  const slot = ROOT.querySelector('#ute-cview-slot');
  if (!slot) return;
  if (!S.selected_part) {
    slot.innerHTML = emptyCViewHTML();
    return;
  }
  const cfg = COMPONENT_VIEWS[S.selected_part] || basicCard(S.selected_part);
  if (!cfg) { slot.innerHTML = emptyCViewHTML(); return; }
  slot.innerHTML = `
    <div class="ute-cview-head">
      <div>
        <span class="ute-label">${cfg.kind || 'Component'}</span>
        <h2>${cfg.title}</h2>
      </div>
      <button class="ute-cview-close" type="button" data-cv-close>Close ✕</button>
    </div>
    <div class="ute-cview-stage" id="ute-cview-stage">${cfg.html()}</div>
    ${cfg.sideHTML ? cfg.sideHTML() : ''}
  `;
  if (cfg.mount) cfg.mount();
  const close = slot.querySelector('[data-cv-close]');
  if (close) close.addEventListener('click', () => selectPart(null));
}

// ───────────────────────── Component view configs ───────────────
// Each config: { title, kind, html(), mount(), update(dt)?, sideHTML()? }
// Interactive ones register an update() ticked by the main loop.

const COMPONENT_VIEWS = {};

function basicCard(key) {
  const p = PARTS[key];
  if (!p) return null;
  return {
    title: p.name, kind: p.tag,
    html: () => `
      <div class="ute-cview-chip">
        <div class="ute-cview-chip-dot"></div>
        <div><span class="k">${p.name}</span><span class="d">${p.desc}</span></div>
        <div class="n">${p.tag}</div>
      </div>
      <svg class="ute-cview-svg" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet">
        ${p.svg ? p.svg : ''}
      </svg>
    `,
    sideHTML: () => `
      <div class="ute-cview-side">
        <div class="card"><h4>What it does</h4><p>${p.desc}</p></div>
        <div class="card"><h4>Live state</h4>
          <div class="ute-stats">${p.stats ? p.stats().map((s) => `<div class="stat"><span class="k">${s.k}</span><span class="v">${s.v}</span></div>`).join('') : '<div class="stat"><span class="k">—</span><span class="v">—</span></div>'}</div>
        </div>
        <div class="card"><h4>Notes</h4><p>${p.notes || 'Static component. See the overview to see where it fits on the whole bike.'}</p></div>
      </div>
    `,
  };
}

// ─── Shared SVG primitives: fake-3D helpers ─────────────────────
function iso3DBox(x, y, w, h, d, colors) {
  const g = ns('g');
  const dx = d * 0.5, dy = d * 0.4;
  g.appendChild(ns('polygon', { points: `${x},${y+h} ${x+w},${y+h} ${x+w+dx},${y+h-dy} ${x+dx},${y+h-dy}`, fill: colors.bottom || colors.right || colors.front, opacity: 0.8 }));
  g.appendChild(ns('rect', { x, y, width: w, height: h, fill: colors.front, stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('polygon', { points: `${x},${y} ${x+w},${y} ${x+w+dx},${y-dy} ${x+dx},${y-dy}`, fill: colors.top, stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('polygon', { points: `${x+w},${y} ${x+w+dx},${y-dy} ${x+w+dx},${y+h-dy} ${x+w},${y+h}`, fill: colors.right, stroke: '#0A0A0A', 'stroke-width': 2 }));
  return g;
}

function iso3DCylinder(cx, cy, r, h, colors) {
  // Vertical cylinder: ellipse top, body with gradient, ellipse bottom
  const g = ns('g');
  const ry = r * 0.35;
  g.appendChild(ns('path', { d: `M ${cx-r} ${cy} L ${cx-r} ${cy+h} A ${r} ${ry} 0 0 0 ${cx+r} ${cy+h} L ${cx+r} ${cy} Z`, fill: colors.side, stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('ellipse', { cx, cy, rx: r, ry, fill: colors.top, stroke: '#0A0A0A', 'stroke-width': 2 }));
  return g;
}

function defsPackMetals(svg) {
  const defs = ns('defs');
  const stops = (id, c1, c2, c3, horizontal) => {
    const g = ns('linearGradient', { id, x1: 0, y1: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1 });
    g.appendChild(ns('stop', { offset: '0%',   'stop-color': c1 }));
    g.appendChild(ns('stop', { offset: '50%',  'stop-color': c2 }));
    g.appendChild(ns('stop', { offset: '100%', 'stop-color': c3 }));
    return g;
  };
  defs.appendChild(stops('g3-case',    '#4A4642', '#8E867A', '#2A2824'));
  defs.appendChild(stops('g3-steel',   '#8E867A', '#D4CFC2', '#5B574E'));
  defs.appendChild(stops('g3-alum',    '#B9B3A4', '#F2EEE4', '#8B8371'));
  defs.appendChild(stops('g3-copper',  '#8A4A28', '#C2502A', '#5B2415'));
  defs.appendChild(stops('g3-cu-dark', '#5B2415', '#8A4A28', '#3F1A0E'));
  defs.appendChild(stops('g3-gold',    '#A7742A', '#F4D06F', '#8B5A1E'));
  defs.appendChild(stops('g3-black',   '#2A2A26', '#5B574E', '#0A0A0A'));
  defs.appendChild(stops('g3-green',   '#0F4A3A', '#1D6B55', '#092E22'));
  defs.appendChild(stops('g3-amber',   '#E2A93B', '#F4D06F', '#B07F1C'));
  defs.appendChild(stops('g3-tube',    '#8E867A', '#DBD4C4', '#6D675D', true));
  svg.appendChild(defs);
}

// ─── ENGINE close-up (4T or 2T) ─────────────────────────────────
let ENGINE_PATHS = {};
function cvEngineHTML() {
  return `
    <div class="ute-cview-chip">
      <div class="ute-cview-chip-dot"></div>
      <div><span class="k" id="ute-cv-stroke">Compression</span><span class="d" id="ute-cv-stroke-desc">Both valves shut. Piston rising, charge compressing.</span></div>
      <div class="n" id="ute-cv-rpm">0 rpm</div>
    </div>
    <svg class="ute-cview-svg" id="ute-cv-engine-svg" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet" aria-label="Engine cross-section"></svg>
    <div class="ute-timing" id="ute-cv-timing"></div>
  `;
}
function cvEngineSide() {
  return `
    <div class="ute-cview-side">
      <div class="card">
        <h4>Parameters</h4>
        ${slider('rpm',        'RPM',          600, 10000, 50,  S.rpm,        'rpm')}
        ${slider('bore_mm',    'Bore',         40,  110,   1,   S.bore_mm,    'mm')}
        ${slider('stroke_mm',  'Stroke',       40,  110,   1,   S.stroke_mm,  'mm')}
        ${slider('compression','Compression',  6,   14,    0.1, S.compression,':1')}
      </div>
      <div class="card">
        <h4>Outputs</h4>
        <div class="ute-stats" id="ute-cv-reads"></div>
      </div>
      <div class="card">
        <h4>Run</h4>
        <div class="ute-run">
          <button type="button" data-run="toggle">${S.running?'Pause':'Play'}</button>
          <button type="button" data-run="step">Step +30°</button>
        </div>
      </div>
    </div>
  `;
}
function slider(key, label, min, max, step, value, unit) {
  const v = Number(value);
  const fmt = (unit === ':1') ? v.toFixed(1) : (step < 1 ? v.toFixed(1) : Math.round(v).toLocaleString('en-GB'));
  return `
    <div class="ute-param" data-key="${key}">
      <div class="ute-param-head">
        <span class="ute-label">${label}</span>
        <span class="ute-param-value"><span data-param-value="${key}">${fmt}</span> <span class="ute-u">${unit}</span></span>
      </div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-param="${key}">
    </div>`;
}
function readsHTML() {
  const disp = displacementCC(S.bore_mm, S.stroke_mm);
  const tq = approxTorqueNm(disp, S.mode, S.compression);
  const kw = tq * S.rpm / 9549; const hp = kw * 1.341;
  return `
    <div class="stat"><span class="k">Displacement</span><span class="v">${Math.round(disp)}<span class="u">cc</span></span></div>
    <div class="stat"><span class="k">Compression</span><span class="v">${S.compression.toFixed(1)}<span class="u">:1</span></span></div>
    <div class="stat"><span class="k">Torque</span><span class="v">${tq.toFixed(1)}<span class="u">Nm</span></span></div>
    <div class="stat"><span class="k">Power</span><span class="v">${kw.toFixed(1)}<span class="u">kW · ${hp.toFixed(0)} hp</span></span></div>
  `;
}
function cvEngineMount() {
  const svg = ROOT.querySelector('#ute-cv-engine-svg');
  if (!svg) return;
  defsPackMetals(svg);
  const g = ns('g');
  // Crankcase box in 3-D
  g.appendChild(iso3DBox(230, 280, 440, 130, 60, { front: 'url(#g3-case)', top: 'url(#g3-steel)', right: '#2A2824' }));
  // Dashed crank orbit
  g.appendChild(ns('circle', { cx: 450, cy: 345, r: 55, fill: 'none', stroke: '#B9B3A4', 'stroke-dasharray': '4 4' }));
  // Cylinder barrel (3D) — base wide enough for max bore (110 mm → ~146 px piston)
  g.appendChild(iso3DBox(370, 90, 160, 190, 50, { front: 'url(#g3-alum)', top: 'url(#g3-steel)', right: '#8B8371' }));
  // Cooling fins
  for (let i = 0; i < 7; i++) {
    g.appendChild(ns('line', { x1: 346, y1: 110 + i*22, x2: 370, y2: 110 + i*22, stroke: '#0A0A0A' }));
    g.appendChild(ns('line', { x1: 530, y1: 110 + i*22, x2: 555, y2: 110 + i*22, stroke: '#0A0A0A' }));
  }
  // Head
  g.appendChild(ns('path', { d: 'M 365 90 L 365 40 Q 365 24 380 24 L 520 24 Q 535 24 535 40 L 535 90 Z', fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'cylinder', class: 'ute-shape' }));
  // Spark plug
  const sparkG = ns('g', { 'data-shape': 'spark_plug', class: 'ute-shape' });
  sparkG.appendChild(ns('rect', { x: 440, y: 0, width: 20, height: 30, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'spark_plug', 'data-fillable': '' }));
  sparkG.appendChild(ns('line', { x1: 450, y1: 30, x2: 450, y2: 42, stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'spark_plug' }));
  sparkG.appendChild(ns('circle', { id: 'ute-cv-spark-flash', cx: 450, cy: 45, r: 0, fill: '#E2A93B', 'data-shape': 'spark_plug' }));
  g.appendChild(sparkG);
  // Gas (updated per tick)
  g.appendChild(ns('rect', { id: 'ute-cv-gas', x: 402, y: 90, width: 96, height: 160, fill: '#DAD3C1', opacity: 0.78 }));

  if (S.mode === '4t') {
    // 4T valves
    g.appendChild(ns('rect', { x: 410, y: 30, width: 30, height: 60, fill: 'none', stroke: '#0A0A0A' }));
    g.appendChild(ns('path', { d: 'M 410 70 L 350 60 L 350 30 L 310 30', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    g.appendChild(ns('rect', { id: 'ute-cv-valve-in', x: 408, y: 80, width: 34, height: 10, fill: '#2A2A26' }));
    g.appendChild(ns('rect', { x: 460, y: 30, width: 30, height: 60, fill: 'none', stroke: '#0A0A0A' }));
    g.appendChild(ns('path', { d: 'M 490 70 L 550 60 L 550 30 L 590 30', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    g.appendChild(ns('rect', { id: 'ute-cv-valve-ex', x: 458, y: 80, width: 34, height: 10, fill: '#2A2A26' }));
    g.appendChild(txt(240, 24, 'INTAKE', 'start', 10));
    g.appendChild(txt(660, 24, 'EXHAUST', 'start', 10));
  } else if (S.mode === '2t') {
    // 2T ports
    g.appendChild(ns('rect', { id: 'ute-cv-port-ex', x: 490, y: 225, width: 20, height: 30, fill: '#7A6E60', stroke: '#0A0A0A' }));
    g.appendChild(ns('rect', { id: 'ute-cv-port-tr', x: 390, y: 230, width: 20, height: 30, fill: '#3E6FB7', stroke: '#0A0A0A' }));
    g.appendChild(ns('path', { d: 'M 510 240 L 580 240 L 580 210 L 640 210', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    g.appendChild(ns('path', { d: 'M 390 250 L 340 250 L 340 380 L 320 380', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    g.appendChild(ns('rect', { x: 240, y: 370, width: 70, height: 32, fill: '#F6F5F2', stroke: '#0A0A0A' }));
    g.appendChild(txt(236, 362, 'REED / CARB', 'end', 10));
    g.appendChild(txt(645, 207, 'EXHAUST', 'start', 10));
  }

  // Con-rod + piston
  g.appendChild(ns('line', { id: 'ute-cv-rod', x1: 450, y1: 230, x2: 450, y2: 345, stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': 'conrod', class: 'ute-shape' }));
  g.appendChild(ns('rect', { id: 'ute-cv-piston', x: 402, y: 190, width: 96, height: 60, fill: '#D8D4CA', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'piston', class: 'ute-shape', 'data-fillable': '' }));
  g.appendChild(ns('line', { id: 'ute-cv-ring1', x1: 402, y1: 200, x2: 498, y2: 200, stroke: '#0A0A0A' }));
  g.appendChild(ns('line', { id: 'ute-cv-ring2', x1: 402, y1: 205, x2: 498, y2: 205, stroke: '#0A0A0A' }));
  // Crank
  const crankG = ns('g', { 'data-shape': 'crankshaft', class: 'ute-shape' });
  crankG.appendChild(ns('circle', { cx: 450, cy: 345, r: 70, fill: 'none', stroke: '#0A0A0A', 'data-shape': 'crankshaft' }));
  crankG.appendChild(ns('circle', { id: 'ute-cv-crankpin', cx: 450, cy: 345, r: 8, fill: '#0A0A0A', 'data-shape': 'crankshaft' }));
  crankG.appendChild(ns('circle', { cx: 450, cy: 345, r: 3, fill: '#F6F5F2', 'data-shape': 'crankshaft' }));
  crankG.appendChild(ns('circle', { cx: 450, cy: 345, r: 5, fill: '#0A0A0A', 'data-shape': 'crankshaft' }));
  g.appendChild(crankG);

  svg.appendChild(g);
  ENGINE_PATHS = {
    piston: svg.querySelector('#ute-cv-piston'), ring1: svg.querySelector('#ute-cv-ring1'), ring2: svg.querySelector('#ute-cv-ring2'),
    rod: svg.querySelector('#ute-cv-rod'), pin: svg.querySelector('#ute-cv-crankpin'),
    gas: svg.querySelector('#ute-cv-gas'),
    vIn: svg.querySelector('#ute-cv-valve-in'), vEx: svg.querySelector('#ute-cv-valve-ex'),
    pEx: svg.querySelector('#ute-cv-port-ex'), pTr: svg.querySelector('#ute-cv-port-tr'),
    spark: svg.querySelector('#ute-cv-spark-flash'),
  };

  // Timing strip
  const timing = ROOT.querySelector('#ute-cv-timing');
  if (timing) {
    const segs = (S.mode === '4t')
      ? [{s:'intake',from:0,to:180,label:'Intake'},{s:'compression',from:180,to:360,label:'Compression'},{s:'power',from:360,to:540,label:'Power'},{s:'exhaust',from:540,to:720,label:'Exhaust'}]
      : [{s:'power',from:0,to:110,label:'Power'},{s:'exhaust',from:110,to:180,label:'Blowdown'},{s:'scavenge',from:180,to:230,label:'Scavenge'},{s:'compression',from:230,to:360,label:'Compression'}];
    const total = (S.mode === '4t') ? 720 : 360;
    timing.innerHTML = `<div class="ute-timing-track" id="ute-cv-timing-track">
      ${segs.map((seg) => `<div class="ute-timing-seg" data-s="${seg.s}" style="left:${(seg.from/total)*100}%; width:${((seg.to-seg.from)/total)*100}%;">${seg.label}</div>`).join('')}
      <div class="ute-timing-needle" id="ute-cv-timing-needle"></div>
    </div>`;
  }

  // Wire sliders + run buttons
  ROOT.querySelectorAll('input[type="range"][data-param]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const key = inp.getAttribute('data-param');
      S[key] = parseFloat(inp.value);
      const span = ROOT.querySelector(`[data-param-value="${key}"]`);
      if (span) { const step = parseFloat(inp.getAttribute('step'))||1; span.textContent = (step < 1) ? S[key].toFixed(1) : Math.round(S[key]).toLocaleString('en-GB'); }
      const reads = ROOT.querySelector('#ute-cv-reads'); if (reads) reads.innerHTML = readsHTML();
    });
  });
  ROOT.querySelectorAll('[data-run]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.getAttribute('data-run') === 'toggle') toggleRun();
      else { S.crank_deg = (S.crank_deg + 30) % ((S.mode==='4t')?720:360); }
      ROOT.querySelectorAll('[data-run="toggle"]').forEach((bb) => bb.textContent = S.running ? 'Pause' : 'Play');
    });
  });
  const reads = ROOT.querySelector('#ute-cv-reads'); if (reads) reads.innerHTML = readsHTML();
}
function cvEngineUpdate(dt) {
  if (!ENGINE_PATHS.piston) return;
  const cycle = (S.mode === '4t') ? 720 : 360;
  const shaftDeg = S.crank_deg % 360;
  const theta = shaftDeg * Math.PI / 180;
  // Scale geometry from parameters: bigger bore → wider piston,
  // bigger stroke → longer crank throw, higher CR → smaller head clearance.
  const boreScale = (S.bore_mm / 72);                 // base 72mm
  const pistonW = Math.max(60, Math.min(130, 96 * boreScale));
  const pistonX = 450 - pistonW / 2;
  const crankR  = Math.max(30, Math.min(80, 55 * (S.stroke_mm / 58)));
  const topClearance = Math.max(6, 32 - (S.compression - 6) * 2.3);  // CR 6 → 32 px, CR 14 → ~14 px
  const headBottomY = 90;
  const cx = 450, cy = 345, rodLen = 150;
  const pinX = cx + crankR * Math.cos(theta - Math.PI/2);
  const pinY = cy + crankR * Math.sin(theta - Math.PI/2);
  const pistonPinY = cy - Math.sqrt(Math.max(0, rodLen*rodLen - Math.pow(pinX - cx, 2)));
  const minTopY = headBottomY + topClearance;        // CR limits how far up it goes
  const pistonTopY = Math.max(minTopY, Math.min(230, pistonPinY - 55));
  ENGINE_PATHS.piston.setAttribute('x', pistonX);
  ENGINE_PATHS.piston.setAttribute('width', pistonW);
  ENGINE_PATHS.piston.setAttribute('y', pistonTopY);
  ENGINE_PATHS.ring1.setAttribute('x1', pistonX + 2); ENGINE_PATHS.ring1.setAttribute('x2', pistonX + pistonW - 2);
  ENGINE_PATHS.ring1.setAttribute('y1', pistonTopY + 10); ENGINE_PATHS.ring1.setAttribute('y2', pistonTopY + 10);
  ENGINE_PATHS.ring2.setAttribute('x1', pistonX + 2); ENGINE_PATHS.ring2.setAttribute('x2', pistonX + pistonW - 2);
  ENGINE_PATHS.ring2.setAttribute('y1', pistonTopY + 15); ENGINE_PATHS.ring2.setAttribute('y2', pistonTopY + 15);
  ENGINE_PATHS.rod.setAttribute('y1', pistonTopY + 55); ENGINE_PATHS.rod.setAttribute('x2', pinX); ENGINE_PATHS.rod.setAttribute('y2', pinY);
  ENGINE_PATHS.pin.setAttribute('cx', pinX); ENGINE_PATHS.pin.setAttribute('cy', pinY);
  ENGINE_PATHS.gas.setAttribute('x', pistonX);
  ENGINE_PATHS.gas.setAttribute('width', pistonW);
  ENGINE_PATHS.gas.setAttribute('y', headBottomY);
  ENGINE_PATHS.gas.setAttribute('height', Math.max(2, pistonTopY - headBottomY));
  const si = currentStroke(S.crank_deg, S.mode);
  ENGINE_PATHS.gas.setAttribute('fill', ({intake:'#D8E3F0',compression:'#DAD3C1',power:'#F2CDB9',exhaust:'#D7D1C4',scavenge:'#CDE1EE'})[si.s] || '#DAD3C1');
  if (S.mode === '4t') {
    if (ENGINE_PATHS.vIn) ENGINE_PATHS.vIn.setAttribute('y', 80 + (si.s === 'intake' ? 10 : 0));
    if (ENGINE_PATHS.vEx) ENGINE_PATHS.vEx.setAttribute('y', 80 + (si.s === 'exhaust' ? 10 : 0));
  } else if (S.mode === '2t') {
    const ex = (pistonTopY + 60) > 225; const tr = (pistonTopY + 60) > 230;
    if (ENGINE_PATHS.pEx) ENGINE_PATHS.pEx.setAttribute('fill-opacity', ex ? 1 : 0.25);
    if (ENGINE_PATHS.pTr) ENGINE_PATHS.pTr.setAttribute('fill-opacity', tr ? 1 : 0.25);
  }
  const sparkDeg = (S.mode === '4t') ? 360 : 0;
  const dSpark = Math.abs(((S.crank_deg - sparkDeg + cycle) % cycle));
  ENGINE_PATHS.spark.setAttribute('r', (dSpark < 15 || dSpark > cycle - 15) ? 10 : 0);
  const needle = ROOT.querySelector('#ute-cv-timing-needle');
  if (needle) needle.style.left = (100 * S.crank_deg / cycle) + '%';
  const strokeEl = ROOT.querySelector('#ute-cv-stroke'); if (strokeEl) strokeEl.textContent = si.label;
  const strokeDescEl = ROOT.querySelector('#ute-cv-stroke-desc'); if (strokeDescEl) strokeDescEl.textContent = si.caption;
  const rpmEl = ROOT.querySelector('#ute-cv-rpm'); if (rpmEl) rpmEl.textContent = `${Math.round(S.rpm).toLocaleString('en-GB')} rpm`;
}
COMPONENT_VIEWS.engine = { title: 'Engine (cross-section)', kind: 'Combustion · Interactive', html: cvEngineHTML, sideHTML: cvEngineSide, mount: cvEngineMount, update: cvEngineUpdate };

function currentStroke(deg, mode) {
  if (mode === '4t') {
    if (deg < 180) return { s:'intake', label:'Intake', caption:'Intake valve open; piston descending. Fresh charge rushes in.' };
    if (deg < 360) return { s:'compression', label:'Compression', caption:'Both valves shut. Piston rising, charge compressing — pressure and temperature climbing fast.' };
    if (deg < 540) return { s:'power', label:'Power', caption:'Spark at TDC. Expanding gas drives the piston down.' };
    return { s:'exhaust', label:'Exhaust', caption:'Exhaust valve opens. Rising piston pushes burnt gas out.' };
  } else if (mode === '2t') {
    if (deg < 110) return { s:'power', label:'Power', caption:'Spark at TDC. Burning gas pushes the piston down.' };
    if (deg < 180) return { s:'exhaust', label:'Blowdown', caption:'Piston uncovers the exhaust port. Burnt gas blows down.' };
    if (deg < 230) return { s:'scavenge', label:'Scavenge', caption:'Transfer port opens. Fresh charge sweeps up.' };
    return { s:'compression', label:'Compression', caption:'Piston rises past the ports. Charge above is compressed.' };
  } else {
    return { s:'elec', label:'Running', caption:'Three-phase motor. Smooth torque from zero RPM.' };
  }
}
function displacementCC(bore_mm, stroke_mm) { return (Math.PI / 4) * (bore_mm * bore_mm) * stroke_mm / 1000; }
function approxTorqueNm(disp_cc, mode, cr) {
  const base = (mode === '4t') ? 10 : (mode === '2t') ? 8 : 10;
  const bmep_bar = base * (1 + 0.03 * (cr - 10));
  const V = disp_cc * 1e-6; const nR = (mode === '4t') ? 2 : 1;
  return bmep_bar * 1e5 * V / (2 * Math.PI * nR);
}

// ─── MOTOR (electric) ───────────────────────────────────────────
function cvMotorHTML() {
  return `
    <div class="ute-cview-chip">
      <div class="ute-cview-chip-dot"></div>
      <div><span class="k" id="ute-cv-stroke">Running</span><span class="d" id="ute-cv-stroke-desc">A permanent-magnet BLDC rotor spun by three alternating phases.</span></div>
      <div class="n" id="ute-cv-rpm">0 rpm</div>
    </div>
    <svg class="ute-cview-svg" id="ute-cv-motor-svg" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet"></svg>
  `;
}
function cvMotorSide() {
  return `
    <div class="ute-cview-side">
      <div class="card"><h4>Live state</h4>
        <div class="ute-stats" id="ute-cv-motor-reads"></div>
      </div>
      <div class="card"><h4>Why it beats ICE</h4>
        <p>Peak torque at 0 rpm. ~90 % efficient vs ~30 %. One moving part. No valves, no ignition, no exhaust.</p>
      </div>
      <div class="card"><h4>How it spins</h4>
        <p>Three phases of AC alternate through the stator teeth; the magnetic field drags the permanent-magnet rotor.</p>
      </div>
    </div>
  `;
}
function cvMotorMount() {
  const svg = ROOT.querySelector('#ute-cv-motor-svg'); if (!svg) return;
  defsPackMetals(svg);
  const g = ns('g');
  // Motor casing (big circle with cooling fins)
  g.appendChild(ns('circle', { cx: 450, cy: 220, r: 160, fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 2.5 }));
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * 2 * Math.PI;
    g.appendChild(ns('line', { x1: 450 + Math.cos(a)*160, y1: 220 + Math.sin(a)*160, x2: 450 + Math.cos(a)*180, y2: 220 + Math.sin(a)*180, stroke: '#9A9385', 'stroke-width': 2 }));
  }
  // Cutaway window: inner stator ring + rotor
  g.appendChild(ns('circle', { cx: 450, cy: 220, r: 140, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Stator slots (12 teeth)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    const x = 450 + Math.cos(a) * 110, y = 220 + Math.sin(a) * 110;
    g.appendChild(ns('rect', { x: x - 16, y: y - 10, width: 32, height: 20, fill: 'url(#g3-copper)', stroke: '#0A0A0A', 'stroke-width': 1, transform: `rotate(${a * 180 / Math.PI + 90} ${x} ${y})` }));
  }
  // Air gap
  g.appendChild(ns('circle', { cx: 450, cy: 220, r: 72, fill: 'none', stroke: '#B9B3A4', 'stroke-dasharray': '2 3' }));
  // Rotor (rotates)
  const rotor = ns('g', { id: 'ute-cv-rotor', transform: `rotate(0 450 220)` });
  rotor.appendChild(ns('circle', { cx: 450, cy: 220, r: 65, fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Magnets: 8 alternating N/S
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    const x = 450 + Math.cos(a) * 50, y = 220 + Math.sin(a) * 50;
    rotor.appendChild(ns('rect', { x: x - 14, y: y - 8, width: 28, height: 16, fill: (i % 2 === 0 ? '#C2502A' : '#1D6B55'), stroke: '#0A0A0A', 'stroke-width': 1, transform: `rotate(${a * 180 / Math.PI + 90} ${x} ${y})` }));
    const tt = ns('text', { x, y: y + 4, 'font-family': 'IBM Plex Mono', 'font-size': 11, 'font-weight': 700, fill: '#FFFFFF', 'text-anchor': 'middle', transform: `rotate(${a * 180 / Math.PI + 90} ${x} ${y})` });
    tt.textContent = i % 2 === 0 ? 'N' : 'S';
    rotor.appendChild(tt);
  }
  // Shaft hub
  rotor.appendChild(ns('circle', { cx: 450, cy: 220, r: 20, fill: '#2A2A26', stroke: '#0A0A0A' }));
  rotor.appendChild(ns('circle', { cx: 450, cy: 220, r: 4, fill: '#E2A93B' }));
  g.appendChild(rotor);
  // Three-phase cable set
  g.appendChild(ns('path', { d: 'M 290 180 Q 230 160 220 100', fill: 'none', stroke: '#C2502A', 'stroke-width': 4 }));
  g.appendChild(ns('path', { d: 'M 290 220 L 190 220', fill: 'none', stroke: '#1D6B55', 'stroke-width': 4 }));
  g.appendChild(ns('path', { d: 'M 290 260 Q 230 290 220 350', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 4 }));
  g.appendChild(txt(210, 90, 'U', 'end', 12));
  g.appendChild(txt(180, 225, 'V', 'end', 12));
  g.appendChild(txt(210, 355, 'W', 'end', 12));

  svg.appendChild(g);
  const reads = ROOT.querySelector('#ute-cv-motor-reads'); if (reads) reads.innerHTML = motorReadsHTML();
}
function motorReadsHTML() {
  return `
    <div class="stat"><span class="k">Motor RPM</span><span class="v">${Math.round(S.elec.rpm).toLocaleString('en-GB')}</span></div>
    <div class="stat"><span class="k">Torque</span><span class="v">${S.elec.torque.toFixed(0)}<span class="u">Nm</span></span></div>
    <div class="stat"><span class="k">Motor temp</span><span class="v">${S.elec.motor_temp.toFixed(0)}<span class="u">°C</span></span></div>
    <div class="stat"><span class="k">Pack SoC</span><span class="v">${S.elec.battery_soc.toFixed(1)}<span class="u">%</span></span></div>
  `;
}
function cvMotorUpdate(dt) {
  const rotor = ROOT.querySelector('#ute-cv-rotor');
  if (rotor) {
    const cur = parseFloat(rotor.getAttribute('data-rot') || '0');
    const degStep = (S.elec.rpm / 60) * 360 * dt * 0.03;  // slow-mo
    const next = (cur + degStep) % 360;
    rotor.setAttribute('data-rot', next);
    rotor.setAttribute('transform', `rotate(${next} 450 220)`);
  }
  const rpmEl = ROOT.querySelector('#ute-cv-rpm'); if (rpmEl) rpmEl.textContent = `${Math.round(S.elec.rpm).toLocaleString('en-GB')} rpm`;
  const reads = ROOT.querySelector('#ute-cv-motor-reads'); if (reads) reads.innerHTML = motorReadsHTML();
}
COMPONENT_VIEWS.motor = { title: 'Electric motor (cutaway)', kind: 'Electric · Interactive', html: cvMotorHTML, sideHTML: cvMotorSide, mount: cvMotorMount, update: cvMotorUpdate };

// ─── CARBURETOR / THROTTLE close-up (hold-to-act) ───────────────
function cvCarbHTML() {
  return `
    <div class="ute-cview-chip">
      <div class="ute-cview-chip-dot"></div>
      <div><span class="k" id="ute-cv-carb-state">Idle</span><span class="d" id="ute-cv-carb-desc">Throttle plate almost closed. Just enough air sneaks past to idle.</span></div>
      <div class="n" id="ute-cv-carb-rpm">900 rpm</div>
    </div>
    <svg class="ute-cview-svg" id="ute-cv-carb-svg" viewBox="0 0 900 360" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="ute-cview-controls">
      <button class="ute-cview-action" type="button" id="ute-cv-carb-act">GAS</button>
      <span class="ute-cview-hint">Press and hold</span>
    </div>
  `;
}
function cvCarbSide() {
  return `
    <div class="ute-cview-side">
      <div class="card"><h4>Live state</h4><div class="ute-stats" id="ute-cv-carb-reads"></div></div>
      <div class="card"><h4>Parts</h4>
        <ul style="list-style:disc; padding-left:20px; font-size:13px; color:var(--ink-soft); line-height:1.5; margin:0;">
          <li>Venturi — narrow, drops pressure</li>
          <li>Butterfly — throttle plate</li>
          <li>Main / pilot jet — meter fuel</li>
          <li>Float + needle — keeps bowl level</li>
        </ul>
      </div>
      <div class="card"><h4>Target</h4><p>14.7 : 1 air : fuel for petrol.</p></div>
    </div>
  `;
}
function cvCarbMount() {
  const svg = ROOT.querySelector('#ute-cv-carb-svg'); if (!svg) return;
  defsPackMetals(svg);
  const g = ns('g');
  // Intake tube with venturi (narrow in middle)
  g.appendChild(ns('path', { d: 'M 80 110 L 80 220 L 280 220 Q 340 220 350 180 Q 350 165 350 150 Q 350 125 410 125 Q 460 125 460 150 Q 460 165 460 180 Q 470 220 530 220 L 820 220 L 820 110 Z', fill: 'url(#g3-tube)', stroke: '#0A0A0A', 'stroke-width': 2, opacity: 0.3 }));
  g.appendChild(ns('path', { d: 'M 80 110 L 80 220 L 280 220 Q 340 220 350 180 Q 350 165 350 150 Q 350 125 410 125 Q 460 125 460 150 Q 460 165 460 180 Q 470 220 530 220 L 820 220', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 2.5 }));
  g.appendChild(ns('path', { d: 'M 80 110 L 820 110', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 2.5 }));
  // Float bowl under the venturi
  g.appendChild(ns('path', { d: 'M 350 225 Q 400 310 460 225', fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('rect', { x: 395, y: 260, width: 20, height: 20, fill: '#F6F5F2', stroke: '#0A0A0A' }));  // float
  // Fuel level
  g.appendChild(ns('line', { x1: 362, y1: 265, x2: 448, y2: 265, stroke: '#C2502A', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
  // Main jet (vertical pipe from bowl into venturi)
  g.appendChild(ns('line', { x1: 405, y1: 260, x2: 405, y2: 165, stroke: '#8B5A1E', 'stroke-width': 4 }));
  g.appendChild(txt(360, 300, 'FLOAT BOWL', 'start', 10));
  g.appendChild(txt(360, 190, 'VENTURI', 'start', 10));
  // Butterfly throttle plate (rotates based on cv.throttle)
  g.appendChild(ns('line', { x1: 630, y1: 110, x2: 630, y2: 220, stroke: '#2A2A26', 'stroke-width': 2 }));  // spindle
  g.appendChild(ns('ellipse', { id: 'ute-cv-carb-bfly', cx: 630, cy: 165, rx: 46, ry: 50, fill: 'url(#g3-gold)', stroke: '#1E150A', 'stroke-width': 2 }));
  g.appendChild(txt(620, 100, 'THROTTLE', 'end', 10));
  // Flow particles layer
  const pg = ns('g', { id: 'ute-cv-carb-particles' });
  svg.appendChild(g); svg.appendChild(pg);
  S.cv.particles = [];
  // Hold button
  wireHoldButton('cv-carb', 'throttle');
}
function cvCarbUpdate(dt) {
  // Reuse rider.throttle so GAS button + handlebar throttle share state
  const target = S.cv.carb_hold ? 100 : (S.rider.throttle * 100);
  if (!S.cv.carb_pct) S.cv.carb_pct = 0;
  S.cv.carb_pct += ((target - S.cv.carb_pct) * Math.min(1, (S.cv.carb_hold ? 4 : 2) * dt));
  const openness = S.cv.carb_pct / 100;
  const bfly = ROOT.querySelector('#ute-cv-carb-bfly');
  if (bfly) bfly.setAttribute('rx', 46 * (1 - openness) + 4 * openness);
  const localRPM = 900 + S.cv.carb_pct * 70;
  // Spawn + advance particles
  if (!S.cv.particles) S.cv.particles = [];
  const spawnRate = 2 + openness * 60;
  S.cv.spawnBudget = (S.cv.spawnBudget || 0) + spawnRate * dt;
  while (S.cv.spawnBudget > 1) {
    S.cv.spawnBudget -= 1;
    S.cv.particles.push({ x: 90, y: 120 + Math.random() * 90, vx: 70 + openness * 450, life: 0, ttl: 2.5 });
  }
  for (const p of S.cv.particles) {
    p.x += p.vx * dt;
    if (openness < 0.1 && Math.abs(p.x - 630) < 20) p.x += (p.vx * dt) * -0.9;
    p.life += dt;
  }
  S.cv.particles = S.cv.particles.filter((p) => p.life < p.ttl && p.x < 830);
  const pg = ROOT.querySelector('#ute-cv-carb-particles');
  if (pg) {
    pg.innerHTML = '';
    for (const p of S.cv.particles) pg.appendChild(ns('circle', { cx: p.x, cy: p.y, r: 2.4, fill: '#3E6FB7', opacity: 0.85 }));
  }
  const state = ROOT.querySelector('#ute-cv-carb-state');
  const desc  = ROOT.querySelector('#ute-cv-carb-desc');
  const rpm   = ROOT.querySelector('#ute-cv-carb-rpm');
  if (rpm) rpm.textContent = `${Math.round(localRPM).toLocaleString('en-GB')} rpm`;
  if (state && desc) {
    if (S.cv.carb_pct < 3) { state.textContent = 'Idle'; desc.textContent = 'Throttle plate almost closed. Just enough air sneaks past to idle.'; }
    else if (S.cv.carb_pct < 60) { state.textContent = 'Accelerating'; desc.textContent = 'Plate tilts open; more air rushes in and the engine spins faster.'; }
    else { state.textContent = 'Wide open'; desc.textContent = 'Plate parallel to the flow. Air pours in; engine screams toward redline.'; }
  }
  const reads = ROOT.querySelector('#ute-cv-carb-reads');
  if (reads) {
    const disp = displacementCC(S.bore_mm, S.stroke_mm);
    const volPerSec = disp/1e6 * (localRPM / 60) * (S.mode === '4t' ? 0.5 : 1);
    const airKgS = volPerSec * 1.2 * 0.85;
    const fuelGS = airKgS / 14.7 * 1000;
    reads.innerHTML = `
      <div class="stat"><span class="k">Throttle</span><span class="v">${S.cv.carb_pct.toFixed(0)}<span class="u">%</span></span></div>
      <div class="stat"><span class="k">Air</span><span class="v">${(airKgS*1000).toFixed(1)}<span class="u">g/s</span></span></div>
      <div class="stat"><span class="k">Fuel</span><span class="v">${fuelGS.toFixed(2)}<span class="u">g/s</span></span></div>
    `;
  }
}
function wireHoldButton(idSuffix, stateKey) {
  const btn = ROOT.querySelector('#ute-cv-' + idSuffix.replace('cv-','') + '-act');
  if (!btn) return;
  const stateProp = idSuffix === 'cv-carb' ? 'carb_hold' : idSuffix === 'cv-brake' ? 'brake_hold' : idSuffix === 'cv-spark' ? 'spark_hold' : idSuffix === 'cv-chain' ? 'gear_hold' : 'fork_hold';
  const press = () => { S.cv[stateProp] = true; btn.classList.add('is-holding'); };
  const release = () => { S.cv[stateProp] = false; btn.classList.remove('is-holding'); };
  btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); press(); try { btn.setPointerCapture(ev.pointerId); } catch(e) {} });
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
}
COMPONENT_VIEWS.carb = { title: 'Carburetor / throttle body', kind: 'Fuel · Interactive', html: cvCarbHTML, sideHTML: cvCarbSide, mount: cvCarbMount, update: cvCarbUpdate };

// ─── SPARK PLUG / IGNITION (hold-to-act) ────────────────────────
function cvSparkHTML() {
  return `
    <div class="ute-cview-chip">
      <div class="ute-cview-chip-dot"></div>
      <div><span class="k" id="ute-cv-spark-state">Idle</span><span class="d" id="ute-cv-spark-desc">The coil is cold. Hold to charge; release to fire.</span></div>
      <div class="n" id="ute-cv-spark-charge">0 %</div>
    </div>
    <svg class="ute-cview-svg" id="ute-cv-spark-svg" viewBox="0 0 900 360" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="ute-cview-controls">
      <button class="ute-cview-action" type="button" id="ute-cv-spark-act">IGNITE</button>
      <span class="ute-cview-hint">Hold to charge · release to fire</span>
    </div>
  `;
}
function cvSparkSide() {
  return `
    <div class="ute-cview-side">
      <div class="card"><h4>How</h4><p>12 V in &rarr; coil steps up to ~25 000 V &rarr; arc jumps the plug gap at TDC.</p></div>
      <div class="card"><h4>Parts</h4>
        <ul style="list-style:disc; padding-left:20px; font-size:13px; color:var(--ink-soft); line-height:1.5; margin:0;">
          <li>Primary winding (thick, 12 V)</li>
          <li>Secondary winding (thin, HV)</li>
          <li>Ceramic insulator</li>
          <li>Centre + ground electrodes</li>
        </ul>
      </div>
      <div class="card"><h4>Timing</h4><p>Fires once per 2 revolutions (4T) or every revolution (2T). Advances with RPM.</p></div>
    </div>
  `;
}
function cvSparkMount() {
  const svg = ROOT.querySelector('#ute-cv-spark-svg'); if (!svg) return;
  defsPackMetals(svg);
  const g = ns('g');
  // Battery
  g.appendChild(iso3DBox(70, 180, 120, 90, 30, { front: 'url(#g3-alum)', top: '#F2EEE4', right: '#8B8371' }));
  g.appendChild(txt(130, 232, '12 V', 'middle', 14));
  g.appendChild(ns('rect', { x: 90, y: 170, width: 20, height: 12, fill: '#2A2A26' }));
  g.appendChild(ns('rect', { x: 150, y: 170, width: 20, height: 12, fill: '#2A2A26' }));
  // LV wire
  g.appendChild(ns('path', { d: 'M 100 170 L 100 100 L 290 100', fill: 'none', stroke: '#C2502A', 'stroke-width': 3 }));
  // Coil
  g.appendChild(iso3DBox(290, 90, 160, 170, 40, { front: 'url(#g3-copper)', top: 'url(#g3-cu-dark)', right: '#5B2415' }));
  g.appendChild(txt(370, 112, 'IGNITION COIL', 'middle', 11));
  for (let i = 0; i < 11; i++) g.appendChild(ns('line', { x1: 300 + i*14, y1: 128, x2: 310 + i*14, y2: 148, stroke: '#F6F5F2', 'stroke-width': 2, opacity: 0.9 }));
  for (let i = 0; i < 18; i++) g.appendChild(ns('line', { x1: 300 + i*8, y1: 160, x2: 308 + i*8, y2: 210, stroke: '#DAD3C1', 'stroke-width': 1 }));
  g.appendChild(ns('rect', { x: 310, y: 224, width: 120, height: 12, fill: '#1A1816', stroke: '#F6F5F2' }));
  g.appendChild(ns('rect', { id: 'ute-cv-spark-bar', x: 312, y: 226, width: 0, height: 8, fill: '#E2A93B' }));
  // HT wire
  g.appendChild(ns('path', { d: 'M 450 180 C 520 180 580 60 680 40', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 3 }));
  // Chamber + spark plug
  g.appendChild(iso3DBox(620, 110, 220, 170, 40, { front: 'url(#g3-alum)', top: '#F2EEE4', right: '#8B8371' }));
  g.appendChild(ns('rect', { id: 'ute-cv-spark-gas', x: 624, y: 114, width: 212, height: 70, fill: '#DAD3C1', opacity: 0.85 }));
  g.appendChild(ns('rect', { x: 624, y: 188, width: 212, height: 48, fill: '#DDD6C7', stroke: '#0A0A0A' }));
  // Plug housing
  g.appendChild(ns('rect', { x: 714, y: 46, width: 32, height: 24, fill: '#B9B3A4', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('rect', { x: 718, y: 70, width: 24, height: 40, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
  // Electrodes
  g.appendChild(ns('line', { x1: 730, y1: 112, x2: 730, y2: 140, stroke: '#2A2A26', 'stroke-width': 3 }));
  g.appendChild(ns('path', { d: 'M 716 120 L 716 144 L 728 144', fill: 'none', stroke: '#2A2A26', 'stroke-width': 3 }));
  // Spark + flash
  g.appendChild(ns('polyline', { id: 'ute-cv-spark-arc', points: '728,140 723,142 729,144 723,145', fill: 'none', stroke: '#E2A93B', 'stroke-width': 2.5, opacity: 0, 'stroke-linecap': 'round' }));
  g.appendChild(ns('circle', { id: 'ute-cv-spark-flash', cx: 730, cy: 144, r: 0, fill: '#F3B64B', opacity: 0.85 }));
  svg.appendChild(g);
  // Hold button
  const btn = ROOT.querySelector('#ute-cv-spark-act');
  if (btn) {
    const press = () => { S.cv.spark_hold = true; S.cv.spark_was = true; btn.classList.add('is-holding'); };
    const release = () => {
      S.cv.spark_hold = false;
      // On release, decide if good spark
      if (S.cv.charge >= 50) { S.cv.sparkOk = true; S.cv.charge_fire_t = performance.now(); }
      else S.cv.sparkOk = false;
      btn.classList.remove('is-holding');
    };
    btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); press(); try { btn.setPointerCapture(ev.pointerId); } catch(e) {} });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  }
}
function cvSparkUpdate(dt) {
  if (S.cv.spark_hold) S.cv.charge = Math.min(100, (S.cv.charge || 0) + 100 * dt);
  else S.cv.charge = Math.max(0, (S.cv.charge || 0) - 220 * dt);
  const bar = ROOT.querySelector('#ute-cv-spark-bar');
  if (bar) { bar.setAttribute('width', (S.cv.charge / 100) * 116); bar.setAttribute('fill', S.cv.charge > 80 ? '#C2502A' : '#E2A93B'); }
  const spark = ROOT.querySelector('#ute-cv-spark-arc');
  const flash = ROOT.querySelector('#ute-cv-spark-flash');
  const gas   = ROOT.querySelector('#ute-cv-spark-gas');
  const now = performance.now();
  if (S.cv.sparkOk === true) {
    const t = (now - S.cv.charge_fire_t) / 1000;
    if (t < 0.14) { spark.setAttribute('opacity', 1); flash.setAttribute('r', 10 + 36 * t); if (gas) gas.setAttribute('fill', '#F2CDB9'); }
    else if (t < 0.4) { spark.setAttribute('opacity', 0); flash.setAttribute('r', Math.max(0, 46 - 100 * (t - 0.14))); if (gas) gas.setAttribute('fill', '#F2CDB9'); }
    else { flash.setAttribute('r', 0); if (gas) gas.setAttribute('fill', '#DAD3C1'); }
  } else { if (spark) spark.setAttribute('opacity', 0); if (flash) flash.setAttribute('r', 0); if (gas) gas.setAttribute('fill', '#DAD3C1'); }
  const state = ROOT.querySelector('#ute-cv-spark-state');
  const desc = ROOT.querySelector('#ute-cv-spark-desc');
  const n    = ROOT.querySelector('#ute-cv-spark-charge');
  if (n) n.textContent = `${Math.round(S.cv.charge || 0)} %`;
  if (state && desc) {
    if (S.cv.spark_hold) { state.textContent = (S.cv.charge < 50) ? 'Charging' : 'Dwell complete'; desc.textContent = (S.cv.charge < 50) ? 'Current builds in the primary winding.' : 'Field saturated. Release to fire the plug.'; }
    else if (S.cv.sparkOk === true && (now - S.cv.charge_fire_t) < 400) { state.textContent = 'Spark!'; desc.textContent = '~25 000 V jumps the plug gap. The gas ignites.'; }
    else if (S.cv.sparkOk === false) { state.textContent = 'Misfire'; desc.textContent = 'Released too soon. Not enough energy stored.'; }
    else { state.textContent = 'Idle'; desc.textContent = 'The coil is cold. Hold to charge; release to fire.'; }
  }
}
COMPONENT_VIEWS.spark_plug = { title: 'Ignition system', kind: 'Ignition · Interactive', html: cvSparkHTML, sideHTML: cvSparkSide, mount: cvSparkMount, update: cvSparkUpdate };

// ─── CHAIN / GEARING ────────────────────────────────────────────
function cvChainHTML() {
  return `
    <div class="ute-cview-chip">
      <div class="ute-cview-chip-dot"></div>
      <div><span class="k" id="ute-cv-gear-state">Idle</span><span class="d" id="ute-cv-gear-desc">Hold REV to spin the output; watch the chain and rear wheel.</span></div>
      <div class="n" id="ute-cv-gear-kmh">0 km/h</div>
    </div>
    <svg class="ute-cview-svg" id="ute-cv-gear-svg" viewBox="0 0 900 360" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="ute-cview-controls">
      <button class="ute-cview-action" type="button" id="ute-cv-chain-act">REV</button>
      <span class="ute-cview-hint">Press and hold</span>
    </div>
  `;
}
function cvChainSide() {
  return `
    <div class="ute-cview-side">
      <div class="card"><h4>Live gearing</h4><div class="ute-stats" id="ute-cv-gear-reads"></div></div>
      <div class="card"><h4>Parts</h4>
        <ul style="list-style:disc; padding-left:20px; font-size:13px; color:var(--ink-soft); line-height:1.5; margin:0;">
          <li>Front sprocket (gearbox output)</li>
          <li>Rear sprocket (bolted to wheel)</li>
          <li>Chain: plate + pin + bush + roller</li>
          <li>Tensioner on the swingarm</li>
        </ul>
      </div>
      <div class="card"><h4>Rule</h4><p>Smaller rear → faster top. Larger rear → quicker acceleration.</p></div>
    </div>
  `;
}
function cvChainMount() {
  const svg = ROOT.querySelector('#ute-cv-gear-svg'); if (!svg) return;
  defsPackMetals(svg);
  const g = ns('g');
  // Engine block
  g.appendChild(iso3DBox(60, 140, 150, 150, 40, { front: 'url(#g3-case)', top: 'url(#g3-steel)', right: '#2A2824' }));
  g.appendChild(txt(135, 164, 'ENGINE', 'middle', 11));
  // Output sprocket + rear sprocket + chain
  const spA_cx = 220, spA_cy = 254, spA_r = 36;
  const spB_cx = 740, spB_cy = 190, spB_r = 95;
  // Rear wheel ring
  g.appendChild(ns('circle', { cx: spB_cx, cy: spB_cy, r: spB_r + 60, fill: 'url(#g3-black)', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('circle', { cx: spB_cx, cy: spB_cy, r: spB_r + 32, fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Chain lines
  g.appendChild(ns('line', { x1: spA_cx, y1: spA_cy - spA_r, x2: spB_cx, y2: spB_cy - spB_r, stroke: 'url(#g3-black)', 'stroke-width': 10 }));
  g.appendChild(ns('line', { x1: spA_cx, y1: spA_cy + spA_r, x2: spB_cx, y2: spB_cy + spB_r, stroke: 'url(#g3-black)', 'stroke-width': 10 }));
  // Chain hatching (animated via stroke-dashoffset)
  g.appendChild(ns('line', { x1: spA_cx + 6, y1: spA_cy - spA_r, x2: spB_cx - 8, y2: spB_cy - spB_r, stroke: '#F6F5F2', 'stroke-width': 1.5, id: 'ute-cv-gear-hatch-top', 'stroke-dasharray': '6 6' }));
  g.appendChild(ns('line', { x1: spA_cx + 6, y1: spA_cy + spA_r, x2: spB_cx - 8, y2: spB_cy + spB_r, stroke: '#F6F5F2', 'stroke-width': 1.5, id: 'ute-cv-gear-hatch-bot', 'stroke-dasharray': '6 6' }));
  // Sprockets (re-drawn each tick via drawSprocket)
  svg.appendChild(g);
  drawSprocket(svg, 'ute-cv-gear-spA', spA_cx, spA_cy, spA_r, 20, 0);
  drawSprocket(svg, 'ute-cv-gear-spB', spB_cx, spB_cy, spB_r, 42, 0);
  // Wheel spokes
  const spokeG = ns('g', { id: 'ute-cv-gear-spokes', transform: `rotate(0 ${spB_cx} ${spB_cy})` });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 2 * Math.PI;
    spokeG.appendChild(ns('line', { x1: spB_cx, y1: spB_cy, x2: spB_cx + Math.cos(a) * (spB_r + 24), y2: spB_cy + Math.sin(a) * (spB_r + 24), stroke: '#2A2A26', 'stroke-width': 5 }));
  }
  svg.appendChild(spokeG);
  svg.appendChild(ns('circle', { cx: spB_cx, cy: spB_cy, r: 7, fill: '#0A0A0A' }));
  svg.appendChild(ns('line', { x1: 30, y1: 330, x2: 870, y2: 330, stroke: '#B9B3A4', 'stroke-dasharray': '4 6' }));
  const reads = ROOT.querySelector('#ute-cv-gear-reads'); if (reads) reads.innerHTML = gearReadsHTML(0);
  wireHoldButton('cv-chain', 'gear');
}
function drawSprocket(svg, id, cx, cy, r, teeth, angle) {
  const prev = svg.querySelector('#' + id); if (prev) prev.remove();
  const g = ns('g', { id, transform: `rotate(${angle} ${cx} ${cy})` });
  g.appendChild(ns('circle', { cx, cy, r, fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 2 }));
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * 2 * Math.PI;
    g.appendChild(ns('line', { x1: cx + Math.cos(a)*r, y1: cy + Math.sin(a)*r, x2: cx + Math.cos(a)*(r+5), y2: cy + Math.sin(a)*(r+5), stroke: '#0A0A0A', 'stroke-width': 1.4 }));
  }
  if (r > 50) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 2 * Math.PI + 0.3;
      g.appendChild(ns('circle', { cx: cx + Math.cos(a)*(r*0.55), cy: cy + Math.sin(a)*(r*0.55), r: 7, fill: '#F6F5F2', stroke: '#0A0A0A' }));
    }
  }
  g.appendChild(ns('circle', { cx, cy, r: 7, fill: '#2A2A26' }));
  svg.appendChild(g);
}
function gearReadsHTML(wheelRPM, kmh, chainMps) {
  return `
    <div class="stat"><span class="k">Engine</span><span class="v">${Math.round(S.cv.gear_rpm || 0).toLocaleString('en-GB')}<span class="u">rpm</span></span></div>
    <div class="stat"><span class="k">Wheel</span><span class="v">${(wheelRPM||0).toFixed(0)}<span class="u">rpm</span></span></div>
    <div class="stat"><span class="k">Chain</span><span class="v">${(chainMps||0).toFixed(1)}<span class="u">m/s</span></span></div>
    <div class="stat"><span class="k">Speed</span><span class="v">${(kmh||0).toFixed(0)}<span class="u">km/h</span></span></div>
    <div class="stat"><span class="k">Final</span><span class="v">${GEAR.final.toFixed(2)}<span class="u">:1</span></span></div>
  `;
}
function cvChainUpdate(dt) {
  if (!S.cv.gear_rpm) S.cv.gear_rpm = 0;
  if (S.cv.gear_hold) S.cv.gear_rpm = Math.min(8000, S.cv.gear_rpm + 2500 * dt);
  else                S.cv.gear_rpm = Math.max(0,    S.cv.gear_rpm - 1800 * dt);
  const degA = (S.cv.gear_rpm / 60) * 360 * dt;
  S.cv.spA_ang = ((S.cv.spA_ang || 0) + degA) % 360;
  S.cv.spB_ang = ((S.cv.spB_ang || 0) + degA / GEAR.final) % 360;
  S.cv.chain_off = ((S.cv.chain_off || 0) - degA * 0.05) % 100;
  const svg = ROOT.querySelector('#ute-cv-gear-svg');
  if (svg) {
    drawSprocket(svg, 'ute-cv-gear-spA', 220, 254, 36, 20, S.cv.spA_ang);
    drawSprocket(svg, 'ute-cv-gear-spB', 740, 190, 95, 42, S.cv.spB_ang);
    const sp = svg.querySelector('#ute-cv-gear-spokes'); if (sp) sp.setAttribute('transform', `rotate(${S.cv.spB_ang} 740 190)`);
    const ht = svg.querySelector('#ute-cv-gear-hatch-top'); if (ht) ht.setAttribute('stroke-dashoffset', S.cv.chain_off);
    const hb = svg.querySelector('#ute-cv-gear-hatch-bot'); if (hb) hb.setAttribute('stroke-dashoffset', -S.cv.chain_off);
  }
  const wheelRPM = S.cv.gear_rpm / GEAR.primary / GEAR.gear3 / GEAR.final;
  const kmh = (wheelRPM / 60) * (2 * Math.PI * GEAR.wheel_r_m) * 3.6;
  const chainMps = (wheelRPM / 60) * (2 * Math.PI * 0.11);
  const state = ROOT.querySelector('#ute-cv-gear-state');
  const desc  = ROOT.querySelector('#ute-cv-gear-desc');
  const kmhEl = ROOT.querySelector('#ute-cv-gear-kmh');
  if (kmhEl) kmhEl.textContent = `${kmh.toFixed(0)} km/h`;
  if (state && desc) {
    if (S.cv.gear_rpm < 20) { state.textContent = 'Idle'; desc.textContent = 'Hold REV to spin the output; watch the chain and rear wheel.'; }
    else { state.textContent = 'Pulling'; desc.textContent = `Engine ${Math.round(S.cv.gear_rpm).toLocaleString('en-GB')} rpm · chain ${chainMps.toFixed(1)} m/s · final drive ${GEAR.final.toFixed(2)} : 1.`; }
  }
  const reads = ROOT.querySelector('#ute-cv-gear-reads'); if (reads) reads.innerHTML = gearReadsHTML(wheelRPM, kmh, chainMps);
}
COMPONENT_VIEWS.chain = { title: 'Chain & gearing', kind: 'Transmission · Interactive', html: cvChainHTML, sideHTML: cvChainSide, mount: cvChainMount, update: cvChainUpdate };
COMPONENT_VIEWS.rear_sprocket = COMPONENT_VIEWS.chain;

// ─── BRAKE caliper (hold-to-act) ────────────────────────────────
function cvBrakeHTML() {
  return `
    <div class="ute-cview-chip">
      <div class="ute-cview-chip-dot"></div>
      <div><span class="k" id="ute-cv-brake-state">Idle</span><span class="d" id="ute-cv-brake-desc">Hold BRAKE — hydraulic pistons squeeze the pads against the disc.</span></div>
      <div class="n" id="ute-cv-brake-force">0 bar</div>
    </div>
    <svg class="ute-cview-svg" id="ute-cv-brake-svg" viewBox="0 0 900 360" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="ute-cview-controls">
      <button class="ute-cview-action" type="button" id="ute-cv-brake-act">BRAKE</button>
      <span class="ute-cview-hint">Press and hold</span>
    </div>
  `;
}
function cvBrakeSide() {
  return `
    <div class="ute-cview-side">
      <div class="card"><h4>Live state</h4><div class="ute-stats" id="ute-cv-brake-reads"></div></div>
      <div class="card"><h4>Parts</h4>
        <ul style="list-style:disc; padding-left:20px; font-size:13px; color:var(--ink-soft); line-height:1.5; margin:0;">
          <li>Disc (steel, bolted to wheel)</li>
          <li>Caliper body + 2–6 pistons</li>
          <li>Pads: friction on steel plate</li>
          <li>DOT 4 fluid (incompressible)</li>
        </ul>
      </div>
      <div class="card"><h4>How</h4><p>Lever → fluid pressure → pistons squeeze pads → kinetic energy becomes heat.</p></div>
    </div>
  `;
}
function cvBrakeMount() {
  const svg = ROOT.querySelector('#ute-cv-brake-svg'); if (!svg) return;
  defsPackMetals(svg);
  const g = ns('g');
  // Rotor (big disc, rotating subtly)
  const disc = ns('g', { id: 'ute-cv-brake-disc' });
  disc.appendChild(ns('circle', { cx: 450, cy: 200, r: 135, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2.5 }));
  disc.appendChild(ns('circle', { cx: 450, cy: 200, r: 110, fill: '#DDD9CF', stroke: '#B9B3A4', 'stroke-width': 1.5 }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    disc.appendChild(ns('circle', { cx: 450 + Math.cos(a) * 70, cy: 200 + Math.sin(a) * 70, r: 5, fill: '#F6F5F2', stroke: '#0A0A0A' }));
  }
  disc.appendChild(ns('circle', { cx: 450, cy: 200, r: 30, fill: '#4A4642', stroke: '#0A0A0A' }));
  disc.appendChild(ns('circle', { cx: 450, cy: 200, r: 5, fill: '#0A0A0A' }));
  svg.appendChild(disc);
  // Caliper body (right side)
  g.appendChild(iso3DBox(585, 158, 72, 84, 32, { front: 'url(#g3-copper)', top: '#F4D06F', right: '#8A4A28' }));
  g.appendChild(txt(620, 254, 'CALIPER', 'middle', 10));
  // Pistons visible on inner edge (move inward when braking)
  g.appendChild(ns('circle', { id: 'ute-cv-brake-pst1', cx: 598, cy: 180, r: 14, fill: '#4A4642', stroke: '#0A0A0A' }));
  g.appendChild(ns('circle', { id: 'ute-cv-brake-pst2', cx: 598, cy: 220, r: 14, fill: '#4A4642', stroke: '#0A0A0A' }));
  // Pad (black rectangle inside the caliper, pushes against disc)
  g.appendChild(ns('rect', { id: 'ute-cv-brake-pad', x: 579, y: 170, width: 8, height: 60, fill: '#1A1A17', stroke: '#0A0A0A' }));
  // Brake line
  g.appendChild(ns('path', { d: 'M 657 190 Q 800 180 820 100', fill: 'none', stroke: '#2A2A26', 'stroke-width': 4 }));
  g.appendChild(ns('circle', { cx: 820, cy: 100, r: 10, fill: '#C2502A', stroke: '#0A0A0A' }));
  g.appendChild(txt(820, 80, 'TO LEVER', 'middle', 10));

  svg.appendChild(g);
  const btn = ROOT.querySelector('#ute-cv-brake-act');
  if (btn) {
    const press = () => { S.cv.brake_hold = true; btn.classList.add('is-holding'); };
    const release = () => { S.cv.brake_hold = false; btn.classList.remove('is-holding'); };
    btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); press(); try { btn.setPointerCapture(ev.pointerId); } catch(e) {} });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  }
}
function cvBrakeUpdate(dt) {
  if (!S.cv.brake_pct) S.cv.brake_pct = 0;
  const target = S.cv.brake_hold ? 100 : (S.rider.brake * 100);
  S.cv.brake_pct += ((target - S.cv.brake_pct) * Math.min(1, 5 * dt));
  // Rotate disc (slowing down proportional to brake)
  const wheelRPM = (S.rider.throttle > 0.05 && !S.rider.kill) ? (S.rpm / GEAR.primary / GEAR.gear3 / GEAR.final) * (1 - S.cv.brake_pct / 110) : 0;
  const degStep = wheelRPM / 60 * 360 * dt;
  const disc = ROOT.querySelector('#ute-cv-brake-disc');
  if (disc) {
    const cur = parseFloat(disc.getAttribute('data-rot') || '0') + degStep;
    disc.setAttribute('data-rot', cur);
    disc.setAttribute('transform', `rotate(${cur} 450 200)`);
  }
  // Pistons squeeze inward based on brake %
  const squeeze = (S.cv.brake_pct / 100) * 10;
  const p1 = ROOT.querySelector('#ute-cv-brake-pst1'); if (p1) p1.setAttribute('cx', 598 - squeeze);
  const p2 = ROOT.querySelector('#ute-cv-brake-pst2'); if (p2) p2.setAttribute('cx', 598 - squeeze);
  const pad = ROOT.querySelector('#ute-cv-brake-pad'); if (pad) pad.setAttribute('x', 579 - squeeze);
  // Chip
  const state = ROOT.querySelector('#ute-cv-brake-state');
  const desc  = ROOT.querySelector('#ute-cv-brake-desc');
  const n     = ROOT.querySelector('#ute-cv-brake-force');
  const bar = (S.cv.brake_pct / 100) * 25;
  if (n) n.textContent = `${bar.toFixed(1)} bar`;
  if (state && desc) {
    if (S.cv.brake_pct < 3) { state.textContent = 'Released'; desc.textContent = 'Pads clear the disc. No drag.'; }
    else if (S.cv.brake_pct < 60) { state.textContent = 'Braking'; desc.textContent = 'Pistons squeeze pads against the disc. Kinetic energy becomes heat.'; }
    else { state.textContent = 'Hard brake'; desc.textContent = 'Maximum clamp. Disc temperature climbing fast — watch for fade on long descents.'; }
  }
  const reads = ROOT.querySelector('#ute-cv-brake-reads');
  if (reads) reads.innerHTML = `
    <div class="stat"><span class="k">Line pressure</span><span class="v">${bar.toFixed(1)}<span class="u">bar</span></span></div>
    <div class="stat"><span class="k">Pad squeeze</span><span class="v">${squeeze.toFixed(1)}<span class="u">mm</span></span></div>
    <div class="stat"><span class="k">Disc temp</span><span class="v">${(60 + S.cv.brake_pct * 4).toFixed(0)}<span class="u">°C</span></span></div>
  `;
}
COMPONENT_VIEWS.brake = { title: 'Brake disc + caliper', kind: 'Chassis · Interactive', html: cvBrakeHTML, sideHTML: cvBrakeSide, mount: cvBrakeMount, update: cvBrakeUpdate };

// ─── BATTERY (12V or electric pack) ─────────────────────────────
function cvBatteryHTML() {
  const isElec = (S.mode === 'elec');
  return `
    <div class="ute-cview-chip">
      <div class="ute-cview-chip-dot"></div>
      <div><span class="k">${isElec ? 'High-voltage pack' : '12 V service battery'}</span>
      <span class="d">${isElec ? 'Hundreds of 21700 cells in series × parallel groups. Monitored by the BMS.' : 'Lead-acid or lithium starter battery. Turns the starter motor, feeds lights and ECU.'}</span></div>
      <div class="n">${isElec ? `${S.elec.battery_soc.toFixed(1)} %` : '12 V'}</div>
    </div>
    <svg class="ute-cview-svg" id="ute-cv-bat-svg" viewBox="0 0 900 360" preserveAspectRatio="xMidYMid meet"></svg>
  `;
}
function cvBatterySide() {
  const isElec = (S.mode === 'elec');
  return `
    <div class="ute-cview-side">
      <div class="card"><h4>Live state</h4>
        <div class="ute-stats">
          ${isElec ? `
            <div class="stat"><span class="k">SoC</span><span class="v">${S.elec.battery_soc.toFixed(1)}<span class="u">%</span></span></div>
            <div class="stat"><span class="k">Nominal</span><span class="v">400<span class="u">V</span></span></div>
            <div class="stat"><span class="k">Capacity</span><span class="v">~12<span class="u">kWh</span></span></div>
          ` : `
            <div class="stat"><span class="k">Voltage</span><span class="v">12<span class="u">V</span></span></div>
            <div class="stat"><span class="k">Capacity</span><span class="v">8–14<span class="u">Ah</span></span></div>
            <div class="stat"><span class="k">Cold crank</span><span class="v">120<span class="u">A</span></span></div>
          `}
        </div>
      </div>
      <div class="card"><h4>Parts</h4>
        <ul style="list-style:disc; padding-left:20px; font-size:13px; color:var(--ink-soft); line-height:1.5; margin:0;">
          <li>${isElec ? 'Lithium cells, sealed' : 'Lead plates in acid (or lithium)'}</li>
          <li>${isElec ? 'BMS board' : 'Terminals + vent'}</li>
          <li>${isElec ? 'Cooling plates / coolant' : 'Case + strap'}</li>
        </ul>
      </div>
      <div class="card"><h4>Charge</h4><p>${isElec ? 'DC fast ~30 min. Home AC 4–8 h.' : 'Trickle charger if standing long.'}</p></div>
    </div>
  `;
}
function cvBatteryMount() {
  const svg = ROOT.querySelector('#ute-cv-bat-svg'); if (!svg) return;
  defsPackMetals(svg);
  const g = ns('g');
  const isElec = (S.mode === 'elec');
  if (isElec) {
    // Big pack with cell cluster
    g.appendChild(iso3DBox(90, 90, 720, 190, 50, { front: 'url(#g3-alum)', top: '#F2EEE4', right: '#8B8371' }));
    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 4; j++) {
        g.appendChild(ns('circle', { cx: 120 + i*50, cy: 115 + j*42, r: 15, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 1 }));
        g.appendChild(ns('circle', { cx: 120 + i*50, cy: 115 + j*42, r: 5, fill: '#C2502A' }));
      }
    }
    g.appendChild(ns('rect', { x: 110, y: 75, width: 80, height: 10, fill: '#C2502A' }));  // + terminal
    g.appendChild(ns('rect', { x: 720, y: 75, width: 80, height: 10, fill: '#0A0A0A' }));  // - terminal
    g.appendChild(txt(150, 70, '+', 'middle', 20));
    g.appendChild(txt(760, 70, '−', 'middle', 20));
    g.appendChild(txt(450, 320, `${S.elec.battery_soc.toFixed(1)}% CHARGED`, 'middle', 14));
  } else {
    g.appendChild(iso3DBox(260, 90, 380, 180, 60, { front: 'url(#g3-alum)', top: '#F2EEE4', right: '#8B8371' }));
    g.appendChild(ns('rect', { x: 300, y: 70, width: 40, height: 24, fill: '#C2502A' }));
    g.appendChild(ns('rect', { x: 560, y: 70, width: 40, height: 24, fill: '#2A2A26' }));
    g.appendChild(txt(320, 65, '+', 'middle', 20));
    g.appendChild(txt(580, 65, '−', 'middle', 20));
    g.appendChild(txt(450, 190, '12 V', 'middle', 42));
    g.appendChild(txt(450, 230, 'MOTORCYCLE BATTERY', 'middle', 12));
  }
  svg.appendChild(g);
}
COMPONENT_VIEWS.battery = { title: 'Battery', kind: 'Electrical', html: cvBatteryHTML, sideHTML: cvBatterySide, mount: cvBatteryMount };

// ─── CONTROLLER (electric) ──────────────────────────────────────
function cvControllerHTML() {
  return `
    <div class="ute-cview-chip">
      <div class="ute-cview-chip-dot"></div>
      <div><span class="k">Inverter / controller</span><span class="d">Switches DC pack voltage into 3-phase AC for the motor, thousands of times per second.</span></div>
      <div class="n" id="ute-cv-ctl-t">${S.elec.controller_temp.toFixed(0)} °C</div>
    </div>
    <svg class="ute-cview-svg" id="ute-cv-ctl-svg" viewBox="0 0 900 360" preserveAspectRatio="xMidYMid meet"></svg>
  `;
}
function cvControllerSide() {
  return `
    <div class="ute-cview-side">
      <div class="card"><h4>Live state</h4><div class="ute-stats" id="ute-cv-ctl-reads"></div></div>
      <div class="card"><h4>Parts</h4>
        <ul style="list-style:disc; padding-left:20px; font-size:13px; color:var(--ink-soft); line-height:1.5; margin:0;">
          <li>6 SiC MOSFETs (2 per phase)</li>
          <li>Gate driver</li>
          <li>DC-link capacitor</li>
          <li>MCU — field-oriented control</li>
          <li>Liquid-cooled cold plate</li>
        </ul>
      </div>
      <div class="card"><h4>How</h4><p>Chops DC into 3-phase AC via pulse-width modulation — tens of thousands of switch events per second.</p></div>
    </div>
  `;
}
function cvControllerMount() {
  const svg = ROOT.querySelector('#ute-cv-ctl-svg'); if (!svg) return;
  defsPackMetals(svg);
  const g = ns('g');
  // Heat sink base
  g.appendChild(iso3DBox(80, 110, 640, 170, 50, { front: 'url(#g3-alum)', top: '#F2EEE4', right: '#8B8371' }));
  // Fins
  for (let i = 0; i < 32; i++) g.appendChild(ns('line', { x1: 95 + i*20, y1: 80, x2: 95 + i*20, y2: 110, stroke: '#9A9385', 'stroke-width': 2 }));
  // Power modules (6 MOSFETs, two per phase row)
  for (let p = 0; p < 3; p++) {
    const colors = ['#C2502A', '#1D6B55', '#0A0A0A'];
    g.appendChild(ns('rect', { x: 140 + p*180, y: 150, width: 150, height: 100, fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 2 }));
    g.appendChild(ns('rect', { x: 150 + p*180, y: 162, width: 60, height: 36, fill: colors[p], stroke: '#F6F5F2' }));
    g.appendChild(ns('rect', { x: 220 + p*180, y: 162, width: 60, height: 36, fill: colors[p], stroke: '#F6F5F2' }));
    g.appendChild(txt(215 + p*180, 220, 'MOSFET', 'middle', 10));
    g.appendChild(txt(215 + p*180, 236, ['PHASE U','PHASE V','PHASE W'][p], 'middle', 11));
  }
  // DC bus bars
  g.appendChild(ns('rect', { x: 80, y: 290, width: 640, height: 12, fill: '#C2502A' }));
  g.appendChild(ns('rect', { x: 80, y: 310, width: 640, height: 12, fill: '#0A0A0A' }));
  svg.appendChild(g);
  const reads = ROOT.querySelector('#ute-cv-ctl-reads');
  if (reads) reads.innerHTML = `
    <div class="stat"><span class="k">Temp</span><span class="v">${S.elec.controller_temp.toFixed(0)}<span class="u">°C</span></span></div>
    <div class="stat"><span class="k">DC input</span><span class="v">400<span class="u">V</span></span></div>
    <div class="stat"><span class="k">AC output</span><span class="v">3-phase</span></div>
    <div class="stat"><span class="k">Switching</span><span class="v">16<span class="u">kHz</span></span></div>
  `;
}
function cvControllerUpdate(dt) {
  const t = ROOT.querySelector('#ute-cv-ctl-t');
  if (t) t.textContent = `${S.elec.controller_temp.toFixed(0)} °C`;
  const reads = ROOT.querySelector('#ute-cv-ctl-reads');
  if (reads) reads.innerHTML = `
    <div class="stat"><span class="k">Temp</span><span class="v">${S.elec.controller_temp.toFixed(0)}<span class="u">°C</span></span></div>
    <div class="stat"><span class="k">DC input</span><span class="v">400<span class="u">V</span></span></div>
    <div class="stat"><span class="k">Load</span><span class="v">${(S.rider.throttle*100).toFixed(0)}<span class="u">%</span></span></div>
    <div class="stat"><span class="k">Switching</span><span class="v">16<span class="u">kHz</span></span></div>
  `;
}
COMPONENT_VIEWS.controller = { title: 'Controller / inverter', kind: 'Electric', html: cvControllerHTML, sideHTML: cvControllerSide, mount: cvControllerMount, update: cvControllerUpdate };

// ─── PARTS data (for basicCard fallback) ────────────────────────
const PARTS = {
  piston: { name: 'Piston', tag: 'Combustion', desc: 'The moving plug that seals the combustion chamber. Converts gas pressure into linear force, which the connecting rod turns into torque at the crank.', notes: 'Mean piston speed is a key stress indicator; above 25 m/s is motorsport territory.' },
  conrod: { name: 'Connecting rod', tag: 'Combustion', desc: 'Links piston (small end) to crank pin (big end). Its swing is what turns reciprocating motion into rotation.', notes: 'Rod length / stroke ratio around 1.75 is a sweet spot for a street engine.' },
  crankshaft: { name: 'Crankshaft', tag: 'Combustion', desc: 'Collects torque from the con-rod and sends it to the gearbox. Offset throw sets the stroke; its mass acts as a short-term flywheel between power pulses.', notes: 'In a parallel twin, two throws 360° apart give a smoother firing order.' },
  valve_in: { name: 'Intake valve', tag: 'Gas path', desc: 'Opens on the intake stroke to let fresh charge in; shut otherwise.', notes: 'Diameter typically larger than the exhaust valve to maximise flow.' },
  valve_ex: { name: 'Exhaust valve', tag: 'Gas path', desc: 'Opens on the exhaust stroke to let burnt gas out as the piston rises.', notes: 'Runs hotter than the intake valve — may be sodium-cooled on hard-used engines.' },
  air_filter: { name: 'Air filter', tag: 'Fuel', desc: 'Removes dust and grit from the air going into the engine.', notes: 'A clogged filter runs the mixture rich and loses power.' },
  fuel_tank: { name: 'Fuel tank', tag: 'Fuel', desc: 'Reservoir of petrol between rider and engine. Gravity-fed on simple bikes, pump-fed on injected ones.', notes: 'Typical capacity 10–18 L. ~32 MJ per litre.' },
  exhaust: { name: 'Exhaust', tag: 'Gas path', desc: 'Carries burnt gas away from the cylinder. A 2-stroke exhaust is tuned (an expansion chamber) so pressure waves help scavenge the cylinder.', notes: 'A 4-stroke muffler is a simple pipe + absorption media. Catalytic converter reduces NOx + HC.' },
  instruments: { name: 'Instruments', tag: 'Rider', desc: 'Speedometer, tachometer, warning lights. Modern bikes bundle these into one TFT panel.', notes: 'Electric bikes show pack SoC, power demand and estimated range instead of fuel level.' },
  headlight: { name: 'Headlight', tag: 'Rider', desc: 'Front lighting. On classic bikes driven directly from the alternator; on modern bikes it is LED and switched by the ECU.', notes: 'Typical 55 W halogen, ~25 W LED.' },
  tail_light: { name: 'Tail light', tag: 'Rider', desc: 'Rear position + brake light. Brighter when the brake lever is pulled.', notes: '5 W position, 21 W brake on an incandescent bulb; roughly the same effective brightness at 1/3 the power for LED.' },
  seat: { name: 'Seat', tag: 'Rider', desc: 'Where the rider sits. Seat height sets how much of your weight the chassis has to control under braking and acceleration.', notes: 'Classic bikes: flat bench, often sprung. Motocross: narrow, long, slopes up at the back.' },
  frame: { name: 'Frame', tag: 'Chassis', desc: 'The structural backbone. Modern frames use the engine as a stressed member, with steel tubes or aluminium beams wrapping around it.', notes: 'Steel trellis = Ducati Monster. Aluminium twin-spar = litre-class sportbike.' },
  forks: { name: 'Forks', tag: 'Chassis', desc: 'Front suspension. Telescopic tubes with hydraulic damping that let the front wheel follow the road and absorb braking loads.', notes: 'Inverted forks ("USD") put the thicker tube at the top for more rigidity.' },
  rear_shock: { name: 'Rear shock', tag: 'Chassis', desc: 'One or two spring-and-damper units mounted between the swingarm and the frame.', notes: 'Monoshock linkage gives a rising rate — soft at the top of the stroke, firmer at the bottom.' },
  swingarm: { name: 'Swingarm', tag: 'Chassis', desc: 'The hinged arm that holds the rear wheel. Pivots at the frame and moves against the rear shock.', notes: 'Longer swingarm = more stability, less chain squat under acceleration.' },
  front_wheel: { name: 'Front wheel', tag: 'Chassis', desc: 'Supports the front of the bike, steers it, and carries the brake disc.', notes: 'Classic: 36 wire spokes. Modern: cast alloy, 10 spokes or fewer.' },
  rear_wheel: { name: 'Rear wheel', tag: 'Chassis', desc: 'Supports the rear of the bike, transmits engine torque to the road, carries the rear brake disc.', notes: 'Driven by the chain or belt. Width varies 120–240 mm.' },
  charge_port: { name: 'Charge port', tag: 'Electric', desc: 'DC fast-charging or AC home-charging socket. Standards: CCS, J1772, Type 2 in Europe.', notes: 'Fast DC: 0–80 % in ~30 minutes. Home AC: 4–8 hours.' },
};
// Alias missing visuals back to basic card
['valve_in','valve_ex','air_filter','fuel_tank','exhaust','instruments','headlight','tail_light','seat','frame','forks','rear_shock','swingarm','front_wheel','rear_wheel','charge_port','piston','conrod','crankshaft'].forEach((k) => {
  if (!COMPONENT_VIEWS[k]) COMPONENT_VIEWS[k] = { title: PARTS[k]?.name || k, kind: PARTS[k]?.tag || 'Component',
    html: () => `
      <div class="ute-cview-chip">
        <div class="ute-cview-chip-dot"></div>
        <div><span class="k">${PARTS[k]?.name || k}</span><span class="d">${PARTS[k]?.desc || ''}</span></div>
        <div class="n">${PARTS[k]?.tag || ''}</div>
      </div>
      <svg class="ute-cview-svg" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet" id="ute-cv-generic-svg"></svg>
    `,
    sideHTML: () => `
      <div class="ute-cview-side">
        <div class="card"><h4>Role</h4><p>${PARTS[k]?.desc || ''}</p></div>
        <div class="card"><h4>Note</h4><p>${PARTS[k]?.notes || ''}</p></div>
      </div>
    `,
    mount: () => mountGenericPart(k),
  };
});

function mountGenericPart(key) {
  const svg = ROOT.querySelector('#ute-cv-generic-svg'); if (!svg) return;
  defsPackMetals(svg);
  // Simple centred 3D rendering per part
  if (key === 'piston') {
    svg.appendChild(iso3DBox(300, 120, 200, 140, 60, { front: 'url(#g3-alum)', top: '#F2EEE4', right: '#8B8371' }));
    svg.appendChild(ns('line', { x1: 300, y1: 150, x2: 500, y2: 150, stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('line', { x1: 300, y1: 162, x2: 500, y2: 162, stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('line', { x1: 300, y1: 175, x2: 500, y2: 175, stroke: '#0A0A0A', 'stroke-width': 1 }));
    svg.appendChild(ns('circle', { cx: 400, cy: 200, r: 20, fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(txt(400, 285, 'PISTON', 'middle', 11));
  } else if (key === 'conrod') {
    svg.appendChild(ns('path', { d: 'M 400 70 Q 420 70 420 90 L 420 180 Q 420 200 400 200 L 400 230 Q 350 240 350 265 Q 350 290 400 300 Q 450 290 450 265 Q 450 240 400 230 Z', fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2.5 }));
    svg.appendChild(ns('circle', { cx: 400, cy: 90, r: 18, fill: '#2A2A26', stroke: '#0A0A0A' }));
    svg.appendChild(ns('circle', { cx: 400, cy: 265, r: 24, fill: '#2A2A26', stroke: '#0A0A0A' }));
    svg.appendChild(ns('circle', { cx: 400, cy: 265, r: 8, fill: '#F6F5F2' }));
    svg.appendChild(txt(400, 60, 'SMALL END', 'middle', 10));
    svg.appendChild(txt(400, 305, 'BIG END', 'middle', 10));
  } else if (key === 'crankshaft') {
    // Shaft with 2 throws
    svg.appendChild(ns('rect', { x: 150, y: 140, width: 500, height: 36, fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
    // Throws
    svg.appendChild(ns('circle', { cx: 300, cy: 158, r: 60, fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('circle', { cx: 500, cy: 158, r: 60, fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('circle', { cx: 300, cy: 110, r: 14, fill: '#2A2A26' }));
    svg.appendChild(ns('circle', { cx: 500, cy: 210, r: 14, fill: '#2A2A26' }));
    // Counterweights
    svg.appendChild(ns('path', { d: 'M 240 158 L 300 158 L 290 90 L 250 90 Z', fill: '#8E867A', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    svg.appendChild(ns('path', { d: 'M 560 158 L 500 158 L 510 230 L 550 230 Z', fill: '#8E867A', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    svg.appendChild(txt(400, 300, 'CRANKSHAFT · 2 THROWS 360° APART', 'middle', 11));
  } else if (key === 'valve_in' || key === 'valve_ex') {
    const c = key === 'valve_in' ? '#1D6B55' : '#C2502A';
    svg.appendChild(ns('rect', { x: 390, y: 60, width: 20, height: 200, fill: 'url(#g3-steel)', stroke: '#0A0A0A' }));
    svg.appendChild(ns('path', { d: 'M 340 230 Q 400 290 460 230 L 460 265 Q 400 320 340 265 Z', fill: c, stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('rect', { x: 350, y: 60, width: 100, height: 10, fill: '#2A2A26' }));
    svg.appendChild(txt(400, 50, key === 'valve_in' ? 'INTAKE VALVE' : 'EXHAUST VALVE', 'middle', 11));
  } else if (key === 'forks') {
    svg.appendChild(ns('rect', { x: 320, y: 40, width: 60, height: 120, fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('rect', { x: 420, y: 40, width: 60, height: 120, fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('rect', { x: 310, y: 160, width: 80, height: 140, fill: '#1A1A17', stroke: '#0A0A0A' }));
    svg.appendChild(ns('rect', { x: 410, y: 160, width: 80, height: 140, fill: '#1A1A17', stroke: '#0A0A0A' }));
    svg.appendChild(txt(400, 20, 'TELESCOPIC FORKS', 'middle', 11));
    svg.appendChild(txt(350, 180, 'SLIDER', 'middle', 9));
    svg.appendChild(txt(350, 130, 'TUBE', 'middle', 9));
  } else if (key === 'fuel_tank') {
    svg.appendChild(ns('path', { d: 'M 180 140 Q 240 90 400 85 Q 560 85 620 130 L 625 220 Q 400 240 175 230 Z', fill: 'url(#g3-copper)', stroke: '#0A0A0A', 'stroke-width': 2.5 }));
    // Fuel level
    svg.appendChild(ns('rect', { x: 190, y: 170, width: 420, height: 60, fill: '#E2A93B', opacity: 0.7 }));
    svg.appendChild(ns('line', { x1: 190, y1: 170, x2: 610, y2: 170, stroke: '#8B5A1E', 'stroke-dasharray': '4 4' }));
    svg.appendChild(ns('circle', { cx: 400, cy: 110, r: 7, fill: '#2A2A26' }));
    svg.appendChild(txt(400, 280, 'FUEL TANK · ~65% FULL', 'middle', 11));
  } else if (key === 'air_filter') {
    svg.appendChild(ns('rect', { x: 220, y: 100, width: 360, height: 150, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2.5 }));
    for (let i = 0; i < 24; i++) {
      svg.appendChild(ns('line', { x1: 230 + i*15, y1: 108, x2: 230 + i*15, y2: 242, stroke: '#9A9385', 'stroke-width': 1 }));
    }
    svg.appendChild(txt(400, 285, 'PLEATED PAPER AIR FILTER', 'middle', 11));
  } else if (key === 'exhaust') {
    svg.appendChild(ns('path', { d: 'M 60 180 Q 150 170 250 180 L 350 185 Q 500 190 580 180', fill: 'none', stroke: '#2A2A26', 'stroke-width': 14, 'stroke-linecap': 'round' }));
    svg.appendChild(iso3DBox(580, 140, 180, 80, 24, { front: 'url(#g3-alum)', top: '#F2EEE4', right: '#8B8371' }));
    svg.appendChild(ns('line', { x1: 760, y1: 140, x2: 764, y2: 220, stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(txt(670, 282, 'MUFFLER · ABSORPTION PACKING', 'middle', 11));
  } else if (key === 'rear_shock') {
    svg.appendChild(ns('rect', { x: 370, y: 40, width: 60, height: 240, fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
    for (let i = 0; i < 10; i++) {
      svg.appendChild(ns('line', { x1: 360, y1: 60 + i*22, x2: 440, y2: 72 + i*22, stroke: '#C2502A', 'stroke-width': 3 }));
    }
    svg.appendChild(ns('circle', { cx: 400, cy: 50, r: 10, fill: '#2A2A26' }));
    svg.appendChild(ns('circle', { cx: 400, cy: 290, r: 10, fill: '#2A2A26' }));
    svg.appendChild(txt(400, 20, 'MONOSHOCK', 'middle', 11));
  } else if (key === 'frame') {
    svg.appendChild(ns('path', { d: 'M 100 220 L 230 100 L 500 100 L 650 180 L 700 240 L 500 260 L 230 260 Z', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 5 }));
    svg.appendChild(ns('path', { d: 'M 230 100 L 230 260', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 5 }));
    svg.appendChild(ns('path', { d: 'M 500 100 L 500 260', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 5 }));
    svg.appendChild(txt(400, 290, 'FRAME · TRELLIS LAYOUT', 'middle', 11));
  } else if (key === 'swingarm') {
    svg.appendChild(ns('path', { d: 'M 150 140 L 650 170 L 650 210 L 150 180 Z', fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('circle', { cx: 150, cy: 160, r: 20, fill: '#2A2A26' }));
    svg.appendChild(ns('circle', { cx: 650, cy: 190, r: 20, fill: '#2A2A26' }));
    svg.appendChild(txt(400, 240, 'SWINGARM · PIVOT ← → AXLE', 'middle', 11));
  } else if (key === 'front_wheel' || key === 'rear_wheel') {
    svg.appendChild(ns('circle', { cx: 400, cy: 160, r: 130, fill: 'url(#g3-black)', stroke: '#0A0A0A', 'stroke-width': 2.5 }));
    svg.appendChild(ns('circle', { cx: 400, cy: 160, r: 92, fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('circle', { cx: 400, cy: 160, r: 24, fill: '#4A4642', stroke: '#0A0A0A' }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 2 * Math.PI;
      svg.appendChild(ns('line', { x1: 400 + Math.cos(a)*24, y1: 160 + Math.sin(a)*24, x2: 400 + Math.cos(a)*90, y2: 160 + Math.sin(a)*90, stroke: '#2A2A26', 'stroke-width': 6 }));
    }
    svg.appendChild(txt(400, 310, 'CAST ALLOY WHEEL', 'middle', 11));
  } else if (key === 'headlight') {
    svg.appendChild(ns('circle', { cx: 400, cy: 160, r: 100, fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 3 }));
    svg.appendChild(ns('circle', { cx: 400, cy: 160, r: 75, fill: '#E2A93B' }));
    svg.appendChild(ns('circle', { cx: 400, cy: 160, r: 55, fill: '#F4D06F' }));
    svg.appendChild(ns('circle', { cx: 385, cy: 145, r: 15, fill: '#F6F5F2', opacity: 0.7 }));
    svg.appendChild(txt(400, 290, 'HEADLIGHT · CHROME BEZEL', 'middle', 11));
  } else if (key === 'tail_light') {
    svg.appendChild(ns('rect', { x: 240, y: 130, width: 320, height: 70, fill: '#C2502A', stroke: '#0A0A0A', 'stroke-width': 2 }));
    for (let i = 0; i < 12; i++) svg.appendChild(ns('circle', { cx: 260 + i*25, cy: 165, r: 8, fill: '#F3B64B' }));
    svg.appendChild(txt(400, 240, 'LED TAIL LIGHT', 'middle', 11));
  } else if (key === 'seat') {
    svg.appendChild(ns('path', { d: 'M 150 180 L 650 160 L 680 210 L 160 230 Z', fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('path', { d: 'M 200 190 L 180 170 L 630 170 L 600 190', fill: 'none', stroke: '#5A5852' }));
    svg.appendChild(txt(400, 260, 'SEAT · FOAM OVER STEEL PAN', 'middle', 11));
  } else if (key === 'instruments') {
    svg.appendChild(ns('rect', { x: 180, y: 100, width: 440, height: 140, fill: '#0A0A0A', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('rect', { x: 190, y: 110, width: 210, height: 120, fill: '#111' }));
    svg.appendChild(ns('rect', { x: 410, y: 110, width: 200, height: 120, fill: '#111' }));
    svg.appendChild(txt(295, 170, 'SPEED', 'middle', 24));
    svg.appendChild(txt(510, 170, 'RPM', 'middle', 24));
    svg.appendChild(txt(295, 210, Math.round((S.rpm / GEAR.primary / GEAR.gear3 / GEAR.final) / 60 * 2 * Math.PI * GEAR.wheel_r_m * 3.6) + ' km/h', 'middle', 14));
    svg.appendChild(txt(510, 210, Math.round(S.rpm) + ' rpm', 'middle', 14));
  } else if (key === 'charge_port') {
    svg.appendChild(iso3DBox(260, 110, 280, 140, 50, { front: 'url(#g3-alum)', top: '#F2EEE4', right: '#8B8371' }));
    svg.appendChild(ns('circle', { cx: 350, cy: 180, r: 24, fill: '#1D6B55', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('circle', { cx: 450, cy: 180, r: 16, fill: '#1D6B55', stroke: '#0A0A0A', 'stroke-width': 2 }));
    svg.appendChild(ns('circle', { cx: 350, cy: 180, r: 10, fill: '#0A0A0A' }));
    svg.appendChild(ns('circle', { cx: 450, cy: 180, r: 7, fill: '#0A0A0A' }));
    svg.appendChild(txt(400, 290, 'CCS CHARGE PORT · DC + AC', 'middle', 11));
  }
}

// ─── Rider view ─────────────────────────────────────────────────
function mountRiderSVG() {
  const svg = ROOT.querySelector('#ute-rider'); if (!svg) return;
  svg.innerHTML = '';
  defsPackMetals(svg);
  const g = ns('g');

  // Big handlebar top-down (crossbar)
  g.appendChild(ns('path', { d: 'M 160 180 L 740 180', fill: 'none', stroke: 'url(#g3-black)', 'stroke-width': 22, 'stroke-linecap': 'round' }));
  // Grips
  g.appendChild(ns('rect', { x: 60, y: 160, width: 110, height: 44, fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 2, rx: 6 }));  // LEFT GRIP
  g.appendChild(ns('rect', { id: 'ute-rider-right-grip', x: 730, y: 160, width: 110, height: 44, fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 2, rx: 6 }));  // RIGHT GRIP (throttle)
  // Throttle twist indicator — a stripe that rotates visually around the right grip
  g.appendChild(ns('line', { id: 'ute-rider-throttle-mark', x1: 785, y1: 160, x2: 785, y2: 180, stroke: '#C2502A', 'stroke-width': 3 }));
  // Grip ridges
  for (let i = 0; i < 7; i++) g.appendChild(ns('line', { x1: 70 + i*14, y1: 160, x2: 70 + i*14, y2: 204, stroke: '#5B574E', 'stroke-width': 1 }));
  for (let i = 0; i < 7; i++) g.appendChild(ns('line', { x1: 740 + i*14, y1: 160, x2: 740 + i*14, y2: 204, stroke: '#5B574E', 'stroke-width': 1 }));

  // Front brake lever (right side, forward of grip)
  const brakeLever = ns('g', { id: 'ute-rider-brake-lever' });
  brakeLever.appendChild(ns('path', { d: 'M 718 155 L 850 110 L 870 125 L 740 170 Z', fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(brakeLever);

  // Clutch lever (left side, forward of grip)
  const clutchLever = ns('g', { id: 'ute-rider-clutch-lever' });
  clutchLever.appendChild(ns('path', { d: 'M 180 155 L 60 110 L 40 125 L 160 170 Z', fill: 'url(#g3-steel)', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(clutchLever);

  // Switchgear box left (horn, turn signals, light)
  g.appendChild(iso3DBox(170, 220, 90, 50, 20, { front: '#2A2A26', top: '#5B574E', right: '#1A1816' }));
  // Horn button (red)
  g.appendChild(ns('circle', { id: 'ute-rider-horn', cx: 200, cy: 245, r: 14, fill: '#C2502A', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(txt(200, 290, 'HORN', 'middle', 9));
  // Turn signal slider
  g.appendChild(ns('rect', { x: 230, y: 240, width: 24, height: 10, fill: '#E2A93B', stroke: '#0A0A0A' }));
  g.appendChild(txt(242, 290, 'TURN', 'middle', 9));

  // Switchgear box right (kill switch, starter)
  g.appendChild(iso3DBox(640, 220, 90, 50, 20, { front: '#2A2A26', top: '#5B574E', right: '#1A1816' }));
  g.appendChild(ns('rect', { id: 'ute-rider-kill', x: 652, y: 230, width: 30, height: 30, fill: '#C2502A', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(txt(667, 290, 'KILL', 'middle', 9));
  g.appendChild(ns('circle', { id: 'ute-rider-start', cx: 710, cy: 245, r: 14, fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('path', { d: 'M 702 240 L 718 245 L 702 250 Z', fill: '#F6F5F2' }));
  g.appendChild(txt(710, 290, 'START', 'middle', 9));

  // Instruments (two round gauges in centre)
  g.appendChild(ns('circle', { cx: 350, cy: 310, r: 72, fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 3 }));
  g.appendChild(ns('circle', { cx: 350, cy: 310, r: 62, fill: '#F6F5F2', stroke: '#0A0A0A' }));
  // Tick marks (0..240 km/h)
  for (let i = 0; i <= 10; i++) {
    const a = (-Math.PI * 1.25) + (i / 10) * (Math.PI * 1.5);
    const x1 = 350 + Math.cos(a) * 55, y1 = 310 + Math.sin(a) * 55;
    const x2 = 350 + Math.cos(a) * 62, y2 = 310 + Math.sin(a) * 62;
    g.appendChild(ns('line', { x1, y1, x2, y2, stroke: '#0A0A0A', 'stroke-width': 1.5 }));
  }
  g.appendChild(ns('line', { id: 'ute-rider-speed-needle', x1: 350, y1: 310, x2: 350, y2: 260, stroke: '#C2502A', 'stroke-width': 3 }));
  g.appendChild(ns('circle', { cx: 350, cy: 310, r: 5, fill: '#0A0A0A' }));
  g.appendChild(txt(350, 400, 'KM/H', 'middle', 10));

  g.appendChild(ns('circle', { cx: 550, cy: 310, r: 72, fill: 'url(#g3-alum)', stroke: '#0A0A0A', 'stroke-width': 3 }));
  g.appendChild(ns('circle', { cx: 550, cy: 310, r: 62, fill: '#F6F5F2', stroke: '#0A0A0A' }));
  for (let i = 0; i <= 10; i++) {
    const a = (-Math.PI * 1.25) + (i / 10) * (Math.PI * 1.5);
    const x1 = 550 + Math.cos(a) * 55, y1 = 310 + Math.sin(a) * 55;
    const x2 = 550 + Math.cos(a) * 62, y2 = 310 + Math.sin(a) * 62;
    g.appendChild(ns('line', { x1, y1, x2, y2, stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    const lbl = ns('text', { x: 550 + Math.cos(a) * 46, y: 310 + Math.sin(a) * 46 + 4, 'font-family': 'IBM Plex Mono', 'font-size': 9, 'text-anchor': 'middle', fill: '#0A0A0A' });
    lbl.textContent = i;
    g.appendChild(lbl);
  }
  g.appendChild(ns('line', { id: 'ute-rider-rpm-needle', x1: 550, y1: 310, x2: 550, y2: 260, stroke: '#C2502A', 'stroke-width': 3 }));
  g.appendChild(ns('circle', { cx: 550, cy: 310, r: 5, fill: '#0A0A0A' }));
  g.appendChild(txt(550, 400, 'RPM × 1000', 'middle', 10));

  // Mirror stems peeking out at top
  g.appendChild(ns('line', { x1: 115, y1: 160, x2: 115, y2: 90, stroke: '#2A2A26', 'stroke-width': 4 }));
  g.appendChild(ns('ellipse', { cx: 90, cy: 70, rx: 42, ry: 24, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('line', { x1: 785, y1: 160, x2: 785, y2: 90, stroke: '#2A2A26', 'stroke-width': 4 }));
  g.appendChild(ns('ellipse', { cx: 810, cy: 70, rx: 42, ry: 24, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2 }));

  // Fuel tank hint (centred, below bars) — just for context
  g.appendChild(ns('path', { d: 'M 320 420 Q 400 405 480 420 L 475 470 L 325 470 Z', fill: '#F0ECE1', stroke: '#B9B3A4' }));

  svg.appendChild(g);
  wireRiderControls();
}

function wireRiderControls() {
  // Throttle: hold → ramp
  const grip = ROOT.querySelector('#ute-rider-right-grip');
  if (grip) {
    const press = () => { S.rider.throttle_hold = true; };
    const release = () => { S.rider.throttle_hold = false; };
    grip.style.cursor = 'grab';
    grip.addEventListener('pointerdown', (ev) => { ev.preventDefault(); press(); try { grip.setPointerCapture(ev.pointerId); } catch(e) {} });
    grip.addEventListener('pointerup', release);
    grip.addEventListener('pointercancel', release);
  }
  // Brake lever
  const brake = ROOT.querySelector('#ute-rider-brake-lever');
  if (brake) {
    const press = () => { S.rider.brake_hold = true; };
    const release = () => { S.rider.brake_hold = false; };
    brake.style.cursor = 'pointer';
    brake.addEventListener('pointerdown', (ev) => { ev.preventDefault(); press(); try { brake.setPointerCapture(ev.pointerId); } catch(e) {} });
    brake.addEventListener('pointerup', release);
    brake.addEventListener('pointercancel', release);
  }
  // Clutch lever
  const cl = ROOT.querySelector('#ute-rider-clutch-lever');
  if (cl) {
    cl.style.cursor = 'pointer';
    cl.addEventListener('pointerdown', (ev) => { ev.preventDefault(); S.rider.clutch_hold = true; });
    cl.addEventListener('pointerup',   () => { S.rider.clutch_hold = false; });
  }
  // Horn
  const horn = ROOT.querySelector('#ute-rider-horn');
  if (horn) {
    horn.style.cursor = 'pointer';
    horn.addEventListener('pointerdown', () => {
      S.rider.horn = 1;
      const toast = ROOT.querySelector('#ute-rider-toast');
      if (toast) { toast.textContent = 'BEEP!'; toast.classList.add('is-on'); setTimeout(() => toast.classList.remove('is-on'), 500); }
    });
  }
  // Kill switch (toggle)
  const kill = ROOT.querySelector('#ute-rider-kill');
  if (kill) {
    kill.style.cursor = 'pointer';
    kill.addEventListener('pointerdown', () => {
      S.rider.kill = !S.rider.kill;
      kill.setAttribute('fill', S.rider.kill ? '#1A1A17' : '#C2502A');
      const toast = ROOT.querySelector('#ute-rider-toast');
      if (toast) { toast.textContent = S.rider.kill ? 'ENGINE KILLED' : 'ENGINE LIVE'; toast.classList.add('is-on'); setTimeout(() => toast.classList.remove('is-on'), 900); }
    });
  }
  // Starter
  const start = ROOT.querySelector('#ute-rider-start');
  if (start) {
    start.style.cursor = 'pointer';
    start.addEventListener('pointerdown', () => {
      S.rider.kill = false;
      const kB = ROOT.querySelector('#ute-rider-kill'); if (kB) kB.setAttribute('fill', '#C2502A');
      const toast = ROOT.querySelector('#ute-rider-toast');
      if (toast) { toast.textContent = 'STARTED'; toast.classList.add('is-on'); setTimeout(() => toast.classList.remove('is-on'), 700); }
    });
  }
}

// ───────────────────────── Dyno (test track) ──────────────────
const DYNO_CHARTS = [
  { k: 'speed',    label: 'Speed',    unit: 'km/h', color: '#C2502A', max: 240 },
  { k: 'rpm',      label: 'RPM',      unit: 'rpm',  color: '#1D6B55', max: 10000 },
  { k: 'throttle', label: 'Throttle', unit: '%',    color: '#3E6FB7', max: 100 },
  { k: 'brake',    label: 'Brake',    unit: '%',    color: '#E2A93B', max: 100 },
];

function wireDynoButtons() {
  const start = ROOT.querySelector('#ute-dyno-start');
  const reset = ROOT.querySelector('#ute-dyno-reset');
  if (start) start.addEventListener('click', () => {
    if (S.dyno.recording) {
      S.dyno.recording = false;
      start.textContent = 'Start test';
      start.classList.remove('is-rec');
    } else {
      S.dyno.recording = true;
      S.dyno.samples = [];
      S.dyno.start_ms = performance.now();
      S.dyno.peak_speed = 0; S.dyno.peak_rpm = 0; S.dyno.peak_power = 0;
      S.dyno.tto100 = null; S.dyno.avg_throttle = 0;
      start.textContent = 'Stop';
      start.classList.add('is-rec');
    }
    renderDynoFindings();
  });
  if (reset) reset.addEventListener('click', () => {
    S.dyno.recording = false;
    S.dyno.samples = [];
    S.dyno.peak_speed = 0; S.dyno.peak_rpm = 0; S.dyno.peak_power = 0;
    S.dyno.tto100 = null; S.dyno.avg_throttle = 0;
    if (start) { start.textContent = 'Start test'; start.classList.remove('is-rec'); }
    renderDynoCharts();
    renderDynoFindings();
  });
}

function recordDynoSample(now) {
  if (!S.dyno.recording) return;
  if (now - S.last_dyno_sample_ms < 50) return;  // 20 Hz
  S.last_dyno_sample_ms = now;
  const wheelRPM = S.rpm / GEAR.primary / GEAR.gear3 / GEAR.final;
  const kmh = (wheelRPM / 60) * (2 * Math.PI * GEAR.wheel_r_m) * 3.6 * (1 - S.rider.brake * 0.9);
  const disp = displacementCC(S.bore_mm, S.stroke_mm);
  const tq = approxTorqueNm(disp, S.mode === 'elec' ? '4t' : S.mode, S.compression);
  const kw = (S.mode === 'elec')
    ? (S.elec.torque * S.elec.rpm / 9549)
    : (tq * S.rpm / 9549);
  const t = (now - S.dyno.start_ms) / 1000;
  S.dyno.samples.push({ t, speed: kmh, rpm: (S.mode === 'elec' ? S.elec.rpm : S.rpm), throttle: S.rider.throttle*100, brake: S.rider.brake*100, power: kw });
  if (S.dyno.samples.length > S.dyno.maxSamples) S.dyno.samples.shift();
  if (kmh > S.dyno.peak_speed) S.dyno.peak_speed = kmh;
  const nowRPM = S.mode === 'elec' ? S.elec.rpm : S.rpm;
  if (nowRPM > S.dyno.peak_rpm) S.dyno.peak_rpm = nowRPM;
  if (kw > S.dyno.peak_power) S.dyno.peak_power = kw;
  if (S.dyno.tto100 == null && kmh >= 100) S.dyno.tto100 = t;
  const sumT = S.dyno.samples.reduce((a, s) => a + s.throttle, 0);
  S.dyno.avg_throttle = sumT / S.dyno.samples.length;
}

function renderDynoCharts() {
  const slot = ROOT.querySelector('#ute-dyno-charts');
  if (!slot) return;
  const latest = S.dyno.samples[S.dyno.samples.length - 1] || { speed: 0, rpm: 0, throttle: 0, brake: 0 };
  slot.innerHTML = DYNO_CHARTS.map((c) => {
    const now = latest[c.k] || 0;
    const unit = c.unit;
    const nowFmt = (c.k === 'rpm') ? Math.round(now).toLocaleString('en-GB') : now.toFixed(c.k === 'speed' ? 0 : 0);
    return `
      <div class="ute-dyno-chart">
        <div class="ute-dyno-chart-head">
          <span class="k">${c.label}</span>
          <span class="v">${nowFmt}<span class="u">${unit}</span></span>
        </div>
        <svg viewBox="0 0 400 110" preserveAspectRatio="none" id="ute-dyno-chart-${c.k}">
          ${chartPathSVG(c)}
        </svg>
      </div>
    `;
  }).join('');
}

function chartPathSVG(c) {
  const samples = S.dyno.samples;
  const n = samples.length;
  if (n < 2) {
    return `
      <line class="axis" x1="0" y1="100" x2="400" y2="100"/>
      <line class="axis" x1="0" y1="10" x2="0" y2="100"/>
      <line class="grid" x1="0" y1="55" x2="400" y2="55"/>
      <text class="axis-label" x="4" y="22">${c.max}</text>
      <text class="axis-label" x="4" y="95">0</text>
    `;
  }
  // Time window: last 30 s, or less if fewer samples
  const tEnd = samples[n - 1].t;
  const tStart = Math.max(0, tEnd - 30);
  const w = 400, h = 100, x0 = 0, y0 = 10;
  const xOf = (t) => x0 + ((t - tStart) / Math.max(0.001, tEnd - tStart)) * w;
  const yOf = (v) => y0 + (1 - Math.max(0, Math.min(1, v / c.max))) * (h - y0);
  // Build path
  let d = '';
  let dArea = '';
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    if (s.t < tStart) continue;
    const x = xOf(s.t), y = yOf(s[c.k]);
    if (!d) { d = `M ${x.toFixed(1)} ${y.toFixed(1)}`; dArea = `M ${x.toFixed(1)} 100`; }
    else d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    dArea += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  if (dArea) dArea += ` L 400 100 Z`;
  return `
    <line class="axis" x1="0" y1="100" x2="400" y2="100"/>
    <line class="axis" x1="0" y1="10" x2="0" y2="100"/>
    <line class="grid" x1="0" y1="32" x2="400" y2="32"/>
    <line class="grid" x1="0" y1="55" x2="400" y2="55"/>
    <line class="grid" x1="0" y1="78" x2="400" y2="78"/>
    <path class="area" fill="${c.color}" d="${dArea}"/>
    <path class="ln" stroke="${c.color}" d="${d}"/>
    <text class="axis-label" x="4" y="22">${c.max}</text>
    <text class="axis-label" x="4" y="95">0</text>
    <text class="axis-label" x="395" y="95" text-anchor="end">${tEnd.toFixed(1)}s</text>
  `;
}

function renderDynoFindings() {
  const slot = ROOT.querySelector('#ute-dyno-findings');
  if (!slot) return;
  const run = S.dyno.samples.length > 1 ? (S.dyno.samples[S.dyno.samples.length - 1].t) : 0;
  slot.innerHTML = `
    <div class="cell"><span class="k">Status</span><span class="v">${S.dyno.recording ? 'Recording' : (S.dyno.samples.length ? 'Stopped' : 'Idle')}</span></div>
    <div class="cell"><span class="k">Run time</span><span class="v">${run.toFixed(1)}<span class="u">s</span></span></div>
    <div class="cell"><span class="k">Peak speed</span><span class="v">${S.dyno.peak_speed.toFixed(0)}<span class="u">km/h</span></span></div>
    <div class="cell"><span class="k">Peak RPM</span><span class="v">${Math.round(S.dyno.peak_rpm).toLocaleString('en-GB')}</span></div>
    <div class="cell"><span class="k">Peak power</span><span class="v">${S.dyno.peak_power.toFixed(1)}<span class="u">kW</span></span></div>
    <div class="cell"><span class="k">0 → 100 km/h</span><span class="v">${S.dyno.tto100 == null ? '—' : S.dyno.tto100.toFixed(1) + 's'}</span></div>
    <div class="cell"><span class="k">Avg throttle</span><span class="v">${S.dyno.avg_throttle.toFixed(0)}<span class="u">%</span></span></div>
    <div class="cell"><span class="k">Samples</span><span class="v">${S.dyno.samples.length}</span></div>
  `;
}

function updateRiderTick(dt) {
  // Throttle: if holding, climb to 1.0; else decay to 0.0
  if (S.rider.throttle_hold) S.rider.throttle = Math.min(1, S.rider.throttle + 1.8 * dt);
  else                        S.rider.throttle = Math.max(0, S.rider.throttle - 1.2 * dt);
  if (S.rider.brake_hold)     S.rider.brake = Math.min(1, S.rider.brake + 3.0 * dt);
  else                        S.rider.brake = Math.max(0, S.rider.brake - 2.5 * dt);
  if (S.rider.clutch_hold)    S.rider.clutch = Math.min(1, S.rider.clutch + 3.0 * dt);
  else                        S.rider.clutch = Math.max(0, S.rider.clutch - 2.5 * dt);

  // Throttle grip twist visual
  const mark = ROOT.querySelector('#ute-rider-throttle-mark');
  if (mark) {
    const twist = S.rider.throttle * 30;  // deg
    mark.setAttribute('transform', `rotate(${twist} 785 182)`);
  }
  const brakeEl = ROOT.querySelector('#ute-rider-brake-lever');
  if (brakeEl) brakeEl.setAttribute('transform', `rotate(${-S.rider.brake * 20} 718 155)`);
  const clEl = ROOT.querySelector('#ute-rider-clutch-lever');
  if (clEl) clEl.setAttribute('transform', `rotate(${S.rider.clutch * 20} 180 155)`);

  // Needles
  const wheelRPM = S.rpm / GEAR.primary / GEAR.gear3 / GEAR.final;
  const kmh = (wheelRPM / 60) * (2 * Math.PI * GEAR.wheel_r_m) * 3.6 * (1 - S.rider.brake * 0.9);
  const speedPct = Math.max(0, Math.min(1, kmh / 240));
  const rpmPct = Math.max(0, Math.min(1, S.rpm / 10000));
  const speedA = (-Math.PI * 1.25) + speedPct * (Math.PI * 1.5);
  const rpmA = (-Math.PI * 1.25) + rpmPct * (Math.PI * 1.5);
  const sN = ROOT.querySelector('#ute-rider-speed-needle');
  if (sN) { sN.setAttribute('x2', 350 + Math.cos(speedA) * 50); sN.setAttribute('y2', 310 + Math.sin(speedA) * 50); }
  const rN = ROOT.querySelector('#ute-rider-rpm-needle');
  if (rN) { rN.setAttribute('x2', 550 + Math.cos(rpmA) * 50); rN.setAttribute('y2', 310 + Math.sin(rpmA) * 50); }

  // Dash
  const dash = ROOT.querySelector('#ute-rider-dash');
  if (dash) {
    dash.innerHTML = `
      <div class="cell"><span class="k">Throttle</span><span class="v">${(S.rider.throttle * 100).toFixed(0)}%</span></div>
      <div class="cell"><span class="k">Brake</span><span class="v">${(S.rider.brake * 100).toFixed(0)}%</span></div>
      <div class="cell"><span class="k">Clutch</span><span class="v">${(S.rider.clutch * 100).toFixed(0)}%</span></div>
      <div class="cell"><span class="k">Engine</span><span class="v">${S.rider.kill ? 'OFF' : Math.round(S.rpm).toLocaleString('en-GB') + ' rpm'}</span></div>
      <div class="cell"><span class="k">Speed</span><span class="v">${kmh.toFixed(0)} km/h</span></div>
    `;
  }
}

// ───────────────────────── Boot ─────────────────────────────────
if (ROOT) {
  render();
  wireChromeGlobal();
  startLoop();
}
