/*
 * Under the Engine — motorcycle anatomy explorer (v0.2).
 *
 * Mounts into <div id="ute-root"></div> in /motorcycle-anatomy.html.
 *
 * v0.2 scope:
 *   • Overview motorcycle FIRST — recognisable sportbike-ish silhouette with
 *     wheels, forks, tank, seat, swingarm, chain, engine, exhaust and so on.
 *     Each shape is clickable; so is each callout label. The selected part
 *     highlights on the diagram and surfaces its live state.
 *   • Collision-aware callout placement — labels fan out above and below the
 *     bike in tiers, never piling on top of each other.
 *   • Engine stage: 4-stroke OR 2-stroke, animated piston, con-rod, crank,
 *     valves/ports, spark. Gas-flow arrows appear in intake / exhaust /
 *     scavenge strokes so you can see where the charge is going.
 *   • Parameters (RPM, bore, stroke, compression) — now a secondary panel.
 *   • Live per-part stats: valve lift, piston speed, port-open window,
 *     wheel RPM, chain speed, etc, all computed from current state.
 *   • Light theme only. Sharp edges, 1 px rules, IBM Plex Sans + Mono.
 *
 * Next release: electric motor + controller for a side-by-side with ICE.
 */

const ROOT = document.getElementById('ute-root');

const ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

// ───────────────────────── State ────────────────────────────────
const S = {
  mode: '4t',            // '4t' | '2t'
  view: '2d',            // '2d' | '3d' (3d is an isometric cutaway)
  running: true,
  rpm: 2400,             // display RPM; drives the animation speed
  bore_mm: 72,
  stroke_mm: 58,
  compression: 10.5,
  crank_deg: 0,          // 0..720 for 4T; 0..360 for 2T
  selected_part: null,   // key into PARTS
  last_tick_ms: 0,
};

// Running gearing assumptions used for the live wheel/chain stats.
const GEAR = {
  primary: 2.1,    // crank → gearbox input
  final: 2.6,      // output sprocket → rear sprocket
  gear3: 1.3,      // assume 3rd gear
  wheel_r_m: 0.30, // tyre rolling radius, ~17" rim with sportbike tyre
};

// ───────────────────────── Render ────────────────────────────────
function render() {
  ROOT.innerHTML = shellHTML();
  mountMotoSVG();
  mountEngineSVG();
  wireChromeLocal();
  wireControls();
  updateReadouts();
  updateLivePanel();
  updateEngineSVG();
}

function shellHTML() {
  return `
    <header class="ute-topbar">
      <a class="ute-brand" href="/motorcycle" aria-label="Under the Engine on transitionslab.org">
        <span class="ute-brand-mark" aria-hidden="true"></span>
        <span class="ute-brand-name">Under the Engine</span>
        <span class="ute-brand-sub">Transitions Lab</span>
      </a>
      <div class="ute-mode-switch" role="group" aria-label="Engine mode">
        <button type="button" data-mode="4t" class="${S.mode==='4t'?'is-on':''}">Four-stroke</button>
        <button type="button" data-mode="2t" class="${S.mode==='2t'?'is-on':''}">Two-stroke</button>
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

      <!-- OVERVIEW first: the whole motorcycle, with clickable parts -->
      <section class="ute-overview">
        <div class="ute-overview-head">
          <div>
            <h2>The whole motorcycle</h2>
            <p>Click any part on the diagram or in the list below. The part highlights, and its current working state appears.</p>
          </div>
        </div>

        <div class="ute-moto-wrap">
          <svg class="ute-moto-svg" id="ute-moto" viewBox="0 0 1200 590" preserveAspectRatio="xMidYMid meet" aria-label="Motorcycle anatomy diagram"></svg>
        </div>

        <div id="ute-live-slot"></div>
      </section>

      <!-- WORKBENCH: engine cross-section + sliders + parts list -->
      <div class="ute-bench">
        <aside class="ute-col ute-col-left">
          <section class="ute-panel">
            <div class="ute-panel-h"><span class="ute-label">Running</span></div>
            <div class="ute-run">
              <button type="button" data-run="toggle">${S.running?'Pause':'Play'}</button>
              <button type="button" data-run="step">Step +30°</button>
            </div>
            <p style="margin-top:8px;">Space bar toggles play/pause. Animation is slowed ~60× below real-time so the stroke sequence stays legible.</p>
          </section>
          <section class="ute-panel ute-collapsible" id="ute-params-panel">
            <div class="ute-panel-h"><span class="ute-label">Parameters</span></div>
            <div class="ute-panel-body">
              ${slider('rpm',        'Engine speed',       600, 10000, 50,  S.rpm,        'rpm')}
              ${slider('bore_mm',    'Bore',               40,  110,   1,   S.bore_mm,    'mm')}
              ${slider('stroke_mm',  'Stroke',             40,  110,   1,   S.stroke_mm,  'mm')}
              ${slider('compression','Compression ratio',  6,   14,    0.1, S.compression,':1')}
            </div>
          </section>
          <section class="ute-panel">
            <div class="ute-panel-h"><span class="ute-label">Part catalogue</span></div>
            <ul class="ute-parts" id="ute-parts-list">
              ${partsList()}
            </ul>
          </section>
        </aside>

        <main class="ute-col ute-col-stage">
          <div class="ute-stage" id="ute-stage">
            <svg class="ute-engine-svg" id="ute-engine" viewBox="0 0 900 720" preserveAspectRatio="xMidYMid meet" aria-label="Engine cross-section"></svg>
            <div class="ute-stage-hint">${S.mode==='4t'?'Four-stroke':'Two-stroke'} · click a component</div>
            <div class="ute-stage-caption" id="ute-caption">
              <span class="ute-label">Current stroke</span>
              <p id="ute-caption-body">Press play to run the engine.</p>
            </div>
            <div class="ute-timing" aria-label="Cycle timing">
              <div class="ute-timing-track" id="ute-timing-track">
                ${timingSegmentsHTML()}
                <div class="ute-timing-needle" id="ute-timing-needle" style="left:0%;"></div>
              </div>
            </div>
          </div>
        </main>

        <aside class="ute-col ute-col-right">
          <section class="ute-panel">
            <div class="ute-panel-h">
              <span class="ute-label">Cycle</span>
              <span class="ute-stroke-badge" id="ute-stroke-badge" data-s="intake">Intake</span>
            </div>
            <p id="ute-stroke-body">The animation walks the piston through the ${S.mode==='4t'?'four-stroke':'two-stroke'} cycle. Watch the valves ${S.mode==='4t'?'open and close':'and ports uncovered by the piston'}, and the gas-flow arrows.</p>
          </section>
          <section class="ute-panel">
            <div class="ute-panel-h"><span class="ute-label">Computed outputs</span></div>
            <div class="ute-reads" id="ute-reads">
              ${readoutsHTML()}
            </div>
            <p style="margin-top:10px;">Educational estimates for a naturally-aspirated single at a BMEP of ~10 bar (4T) or ~8 bar (2T). Not a dyno trace.</p>
          </section>
        </aside>
      </div>

      <footer class="ute-foot">
        <span>Under the Engine · v0.2 · ${S.mode==='4t'?'Four-stroke':'Two-stroke'} · Transitions Lab</span>
        <span>Inspired by <a href="https://www.underthehood.online" target="_blank" rel="noopener">underthehood.online</a>. Next release: electric motor + controller.</span>
      </footer>
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

function partsList() {
  return PART_ORDER.map((k) => {
    const p = PARTS[k];
    const on = (S.selected_part === k) ? ' is-on' : '';
    return `<li><button type="button" data-part="${k}" class="${on.trim()}">
      <span class="ute-part-name">${p.name}</span>
      <span class="ute-part-tag">${p.tag}</span>
    </button></li>`;
  }).join('');
}

function timingSegmentsHTML() {
  const segs = (S.mode === '4t')
    ? [{s:'intake', from:0,   to:180,  label:'Intake'},
       {s:'compression', from:180, to:360, label:'Compression'},
       {s:'power', from:360, to:540, label:'Power'},
       {s:'exhaust', from:540, to:720, label:'Exhaust'}]
    : [{s:'power',   from:0,   to:110, label:'Power'},
       {s:'exhaust', from:110, to:180, label:'Blowdown'},
       {s:'scavenge',from:180, to:230, label:'Scavenge'},
       {s:'compression', from:230, to:360, label:'Compression'}];
  const total = (S.mode === '4t') ? 720 : 360;
  return segs.map((seg) => {
    const left = (seg.from/total)*100;
    const w = ((seg.to - seg.from)/total)*100;
    return `<div class="ute-timing-seg" data-s="${seg.s}" style="left:${left}%; width:${w}%;">${seg.label}</div>`;
  }).join('');
}

function readoutsHTML() {
  const disp = displacementCC(S.bore_mm, S.stroke_mm);
  const tq = approxTorqueNm(disp, S.mode, S.compression);
  const kw = tq * S.rpm / 9549;
  const hp = kw * 1.341;
  return `
    <div class="ute-read"><span class="ute-label">Displacement</span><span class="ute-n">${Math.round(disp)}<span class="ute-u">cc</span></span></div>
    <div class="ute-read"><span class="ute-label">Compression</span><span class="ute-n">${S.compression.toFixed(1)}<span class="ute-u">:1</span></span></div>
    <div class="ute-read"><span class="ute-label">Approx. torque</span><span class="ute-n">${tq.toFixed(1)}<span class="ute-u">Nm</span></span></div>
    <div class="ute-read"><span class="ute-label">Approx. power</span><span class="ute-n">${kw.toFixed(1)}<span class="ute-u">kW · ${hp.toFixed(0)} hp</span></span></div>
  `;
}

// ───────────────────────── Motorcycle SVG ────────────────────────
// This is the overview diagram. It aims for a readable sportbike-ish side
// profile with the parts a rider or technician actually names:
//   wheels, forks, triple-tree, handlebar, headlight fairing, mirror,
//   instruments, fuel tank, air filter, carb / EFI, engine block, cylinder
//   with cooling fins, exhaust header + muffler, seat + pillion, tail cowl,
//   tail light, battery, swingarm, rear shock, chain, front + rear sprocket,
//   brake disc, foot peg, side stand, frame rails.
//
// Each major shape carries data-shape="<part-key>" so clicking it, OR the
// matching callout label, OR the entry in the Part catalogue, selects it
// and highlights it.
function mountMotoSVG() {
  const svg = ROOT.querySelector('#ute-moto');
  if (!svg) return;
  svg.innerHTML = '';
  // Ground reference
  const gRef = ns('g');
  gRef.appendChild(ns('line', { x1: 0, y1: 490, x2: 1200, y2: 490, stroke: '#B9B3A4', 'stroke-dasharray': '4 6' }));
  svg.appendChild(gRef);

  // ─ Frame rails (behind everything) ──────────────────────────────
  // Main spar from steering head to swingarm pivot
  const frame = ns('g', { 'data-shape': 'frame', class: 'ute-shape' });
  frame.appendChild(ns('path', { d: 'M 302 235 L 440 240 L 540 260 L 690 275 L 720 350', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 7, 'stroke-linecap': 'round', 'data-shape': 'frame' }));
  // Rear subframe triangle to tail
  frame.appendChild(ns('path', { d: 'M 690 275 L 790 270 L 905 265 L 870 325 L 720 330 Z', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': 'frame' }));
  // Steering head tube
  frame.appendChild(ns('rect', { x: 288, y: 215, width: 32, height: 60, fill: '#E6E1D4', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'frame' }));
  svg.appendChild(frame);

  // ─ Forks (front suspension) ─────────────────────────────────────
  const forks = ns('g', { 'data-shape': 'forks', class: 'ute-shape' });
  // Upper fork tubes (slide inside lower sliders)
  forks.appendChild(ns('line', { x1: 300, y1: 220, x2: 260, y2: 350, stroke: '#B9B3A4', 'stroke-width': 7, 'data-shape': 'forks' }));
  forks.appendChild(ns('line', { x1: 318, y1: 220, x2: 278, y2: 350, stroke: '#B9B3A4', 'stroke-width': 7, 'data-shape': 'forks' }));
  // Lower sliders (dark, wider)
  forks.appendChild(ns('line', { x1: 265, y1: 325, x2: 245, y2: 395, stroke: '#1F1D1A', 'stroke-width': 11, 'data-shape': 'forks' }));
  forks.appendChild(ns('line', { x1: 283, y1: 325, x2: 263, y2: 395, stroke: '#1F1D1A', 'stroke-width': 11, 'data-shape': 'forks' }));
  // Top triple-tree yoke
  forks.appendChild(ns('rect', { x: 282, y: 205, width: 54, height: 16, fill: '#2A2A26', stroke: '#0A0A0A', 'data-shape': 'forks' }));
  svg.appendChild(forks);

  // Handlebar + mirror
  const bar = ns('g', { 'data-shape': 'instruments', class: 'ute-shape' });
  bar.appendChild(ns('path', { d: 'M 310 195 L 360 170 L 420 160', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-shape': 'instruments' }));
  bar.appendChild(ns('circle', { cx: 420, cy: 160, r: 5, fill: '#2A2A26', 'data-shape': 'instruments' }));
  // Mirror
  bar.appendChild(ns('path', { d: 'M 345 173 L 335 140 L 320 145 L 328 170 Z', fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'instruments' }));
  // Instrument panel
  bar.appendChild(ns('rect', { x: 390, y: 155, width: 60, height: 28, fill: '#111111', stroke: '#0A0A0A', 'data-shape': 'instruments' }));
  bar.appendChild(ns('line', { x1: 400, y1: 170, x2: 440, y2: 170, stroke: '#E2A93B', 'stroke-width': 1.5, 'data-shape': 'instruments' }));
  svg.appendChild(bar);

  // ─ Headlight fairing (swept sportbike nose) ─────────────────────
  const faring = ns('g');
  // Front fairing swept shape
  const fair = ns('path', { d: 'M 266 258 C 290 220, 330 185, 395 195 C 410 215, 410 240, 385 260 L 300 275 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'headlight', class: 'ute-shape' });
  faring.appendChild(fair);
  // Headlight proper
  const hl = ns('g', { 'data-shape': 'headlight', class: 'ute-shape' });
  hl.appendChild(ns('ellipse', { cx: 340, cy: 225, rx: 36, ry: 22, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'headlight', 'data-fillable': '' }));
  hl.appendChild(ns('ellipse', { cx: 340, cy: 225, rx: 24, ry: 14, fill: '#E2A93B', 'data-shape': 'headlight' }));
  hl.appendChild(ns('ellipse', { cx: 335, cy: 220, rx: 7, ry: 4, fill: '#FFFFFF', 'data-shape': 'headlight' }));
  faring.appendChild(hl);
  // Front fender over the tyre
  const fender = ns('path', { d: 'M 170 345 Q 250 310 335 345 L 330 360 Q 250 328 180 360 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'front_wheel', class: 'ute-shape' });
  faring.appendChild(fender);
  svg.appendChild(faring);

  // ─ Fuel tank (teardrop) ─────────────────────────────────────────
  const tank = ns('g', { 'data-shape': 'fuel_tank', class: 'ute-shape' });
  tank.appendChild(ns('path', { d: 'M 420 258 Q 460 215 560 212 Q 650 212 695 240 L 700 272 Q 580 288 440 278 Z', fill: '#F0ECE1', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'fuel_tank', 'data-fillable': '' }));
  // Tank seam line / knee indent cue
  tank.appendChild(ns('path', { d: 'M 460 255 Q 570 272 680 258', fill: 'none', stroke: '#B9B3A4', 'stroke-width': 1, 'data-shape': 'fuel_tank' }));
  // Fuel cap
  tank.appendChild(ns('circle', { cx: 575, cy: 225, r: 7, fill: '#2A2A26', stroke: '#0A0A0A', 'data-shape': 'fuel_tank' }));
  svg.appendChild(tank);

  // ─ Air filter / airbox (behind tank, visible through frame) ─────
  const air = ns('g', { 'data-shape': 'air_filter', class: 'ute-shape' });
  air.appendChild(ns('rect', { x: 530, y: 285, width: 62, height: 36, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'air_filter', 'data-fillable': '' }));
  // Hatching to signal it's a filter element
  for (let i = 0; i < 5; i++) {
    air.appendChild(ns('line', { x1: 535 + i*12, y1: 290, x2: 535 + i*12, y2: 316, stroke: '#9A9385', 'stroke-width': 1, 'data-shape': 'air_filter' }));
  }
  svg.appendChild(air);

  // ─ Carb / throttle body ─────────────────────────────────────────
  const carb = ns('g', { 'data-shape': 'carb', class: 'ute-shape' });
  carb.appendChild(ns('rect', { x: 592, y: 292, width: 46, height: 32, fill: '#B9B3A4', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'carb', 'data-fillable': '' }));
  carb.appendChild(ns('line', { x1: 615, y1: 292, x2: 615, y2: 324, stroke: '#0A0A0A', 'data-shape': 'carb' }));
  svg.appendChild(carb);

  // ─ Engine block + cylinder + head ───────────────────────────────
  // Engine case: lower, more compact trapezoid so it doesn't dominate
  const engine = ns('g', { 'data-shape': 'engine', class: 'ute-shape' });
  engine.appendChild(ns('path', { d: 'M 545 348 L 695 342 L 708 430 L 535 430 Z', fill: '#EFEAE0', stroke: '#0A0A0A', 'stroke-width': 2.5, 'data-shape': 'engine', 'data-fillable': '' }));
  // Case bolt pattern
  for (let i = 0; i < 5; i++) {
    engine.appendChild(ns('circle', { cx: 558 + i*33, cy: 422, r: 2, fill: '#0A0A0A', 'data-shape': 'engine' }));
  }
  // Side cover / clutch cover suggestion (smaller)
  engine.appendChild(ns('circle', { cx: 620, cy: 388, r: 26, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 1.5, 'data-shape': 'engine' }));
  engine.appendChild(ns('circle', { cx: 620, cy: 388, r: 7, fill: '#B9B3A4', 'data-shape': 'engine' }));
  svg.appendChild(engine);

  // Cylinder sticking up out of the engine (slight forward tilt)
  const cyl = ns('g', { 'data-shape': 'cylinder', class: 'ute-shape' });
  cyl.appendChild(ns('path', { d: 'M 600 335 L 610 268 L 672 268 L 680 335 Z', fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'cylinder', 'data-fillable': '' }));
  // Cylinder fins
  for (let i = 0; i < 5; i++) {
    const y = 282 + i*10;
    cyl.appendChild(ns('line', { x1: 604 + i*1.4, y1: y, x2: 678 - i*1.4, y2: y, stroke: '#0A0A0A', 'stroke-width': 1, 'data-shape': 'cylinder' }));
  }
  // Head on top (block)
  cyl.appendChild(ns('rect', { x: 606, y: 258, width: 70, height: 14, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'cylinder' }));
  // Spark plug stub
  cyl.appendChild(ns('rect', { x: 635, y: 248, width: 14, height: 12, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'cylinder' }));
  svg.appendChild(cyl);

  // ─ Exhaust header + muffler ─────────────────────────────────────
  const ex = ns('g', { 'data-shape': 'exhaust', class: 'ute-shape' });
  ex.appendChild(ns('path', { d: 'M 625 338 Q 650 390 730 445 L 870 448', fill: 'none', stroke: '#2A2A26', 'stroke-width': 10, 'stroke-linecap': 'round', 'data-shape': 'exhaust' }));
  ex.appendChild(ns('path', { d: 'M 865 430 L 1050 425 L 1055 465 L 870 470 Z', fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'exhaust', 'data-fillable': '' }));
  // Slash-cut muffler tip
  ex.appendChild(ns('line', { x1: 1050, y1: 425, x2: 1055, y2: 465, stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'exhaust' }));
  // Heat shield slits
  for (let i = 0; i < 6; i++) {
    ex.appendChild(ns('line', { x1: 900 + i*22, y1: 440, x2: 918 + i*22, y2: 440, stroke: '#B9B3A4', 'stroke-width': 1.5, 'data-shape': 'exhaust' }));
  }
  svg.appendChild(ex);

  // ─ Rear suspension: swingarm + shock ────────────────────────────
  const sw = ns('g', { 'data-shape': 'swingarm', class: 'ute-shape' });
  sw.appendChild(ns('path', { d: 'M 710 383 L 955 395 L 960 418 L 715 410 Z', fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'swingarm', 'data-fillable': '' }));
  sw.appendChild(ns('circle', { cx: 710, cy: 398, r: 10, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'swingarm' }));
  svg.appendChild(sw);

  const shock = ns('g', { 'data-shape': 'rear_shock', class: 'ute-shape' });
  shock.appendChild(ns('line', { x1: 760, y1: 300, x2: 760, y2: 395, stroke: '#B9B3A4', 'stroke-width': 10, 'data-shape': 'rear_shock' }));
  for (let i = 0; i < 6; i++) {
    shock.appendChild(ns('line', { x1: 752, y1: 318 + i*11, x2: 768, y2: 328 + i*11, stroke: '#2A2A26', 'stroke-width': 2, 'data-shape': 'rear_shock' }));
  }
  shock.appendChild(ns('rect', { x: 753, y: 294, width: 14, height: 10, fill: '#C2502A', 'data-shape': 'rear_shock' }));
  shock.appendChild(ns('rect', { x: 753, y: 393, width: 14, height: 10, fill: '#C2502A', 'data-shape': 'rear_shock' }));
  svg.appendChild(shock);

  // ─ Chain + sprockets ────────────────────────────────────────────
  const chain = ns('g', { 'data-shape': 'chain', class: 'ute-shape' });
  // Chain upper + lower runs
  chain.appendChild(ns('line', { x1: 696, y1: 395, x2: 955, y2: 395, stroke: '#2A2A26', 'stroke-width': 3, 'data-shape': 'chain' }));
  chain.appendChild(ns('line', { x1: 696, y1: 408, x2: 955, y2: 408, stroke: '#2A2A26', 'stroke-width': 3, 'data-shape': 'chain' }));
  // Chain link hatching
  for (let x = 700; x < 955; x += 14) {
    chain.appendChild(ns('line', { x1: x, y1: 393, x2: x, y2: 410, stroke: '#B9B3A4', 'stroke-width': 1, 'data-shape': 'chain' }));
  }
  svg.appendChild(chain);

  // Rear sprocket (large, visible behind rear wheel hub area)
  const rsp = ns('g', { 'data-shape': 'rear_sprocket', class: 'ute-shape' });
  rsp.appendChild(ns('circle', { cx: 955, cy: 400, r: 56, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'rear_sprocket', 'data-fillable': '' }));
  // Sprocket teeth suggestion
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * 2 * Math.PI;
    const x1 = 955 + Math.cos(a) * 56;
    const y1 = 400 + Math.sin(a) * 56;
    const x2 = 955 + Math.cos(a) * 60;
    const y2 = 400 + Math.sin(a) * 60;
    rsp.appendChild(ns('line', { x1, y1, x2, y2, stroke: '#0A0A0A', 'stroke-width': 1.2, 'data-shape': 'rear_sprocket' }));
  }
  // Lightening holes
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI + 0.1;
    rsp.appendChild(ns('circle', { cx: 955 + Math.cos(a)*32, cy: 400 + Math.sin(a)*32, r: 8, fill: '#F6F5F2', stroke: '#0A0A0A', 'data-shape': 'rear_sprocket' }));
  }
  svg.appendChild(rsp);

  // ─ Wheels (front + rear) ────────────────────────────────────────
  function wheel(cx, cy, key) {
    const g = ns('g', { 'data-shape': key, class: 'ute-shape' });
    // Tyre
    g.appendChild(ns('circle', { cx, cy, r: 92, fill: '#1A1A17', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': key }));
    // Tread band
    g.appendChild(ns('circle', { cx, cy, r: 80, fill: 'none', stroke: '#2A2A26', 'stroke-width': 1, 'data-shape': key }));
    // Rim
    g.appendChild(ns('circle', { cx, cy, r: 66, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': key, 'data-fillable': '' }));
    // Hub
    g.appendChild(ns('circle', { cx, cy, r: 16, fill: '#4A4642', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': key }));
    g.appendChild(ns('circle', { cx, cy, r: 4,  fill: '#0A0A0A', 'data-shape': key }));
    // Twin-spoke wheel (3 pairs = sportbike look)
    for (let i = 0; i < 3; i++) {
      const a1 = (i / 3) * 2 * Math.PI;
      const a2 = a1 + 0.18;
      g.appendChild(ns('line', { x1: cx + Math.cos(a1)*16, y1: cy + Math.sin(a1)*16, x2: cx + Math.cos(a1)*62, y2: cy + Math.sin(a1)*62, stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': key }));
      g.appendChild(ns('line', { x1: cx + Math.cos(a2)*16, y1: cy + Math.sin(a2)*16, x2: cx + Math.cos(a2)*62, y2: cy + Math.sin(a2)*62, stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': key }));
    }
    return g;
  }
  svg.appendChild(wheel(254, 395, 'front_wheel'));
  svg.appendChild(wheel(955, 400, 'rear_wheel'));

  // Front brake disc + caliper
  const brake = ns('g', { 'data-shape': 'brake', class: 'ute-shape' });
  brake.appendChild(ns('circle', { cx: 254, cy: 395, r: 48, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 2, 'data-shape': 'brake' }));
  // Disc venting holes
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 2 * Math.PI;
    brake.appendChild(ns('circle', { cx: 254 + Math.cos(a)*42, cy: 395 + Math.sin(a)*42, r: 2, fill: '#0A0A0A', 'data-shape': 'brake' }));
  }
  // Caliper
  brake.appendChild(ns('rect', { x: 296, y: 378, width: 20, height: 34, fill: '#C2502A', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'brake', 'data-fillable': '' }));
  svg.appendChild(brake);

  // ─ Seat + tail cowl + rear light ────────────────────────────────
  const seat = ns('g', { 'data-shape': 'seat', class: 'ute-shape' });
  // Rider seat
  seat.appendChild(ns('path', { d: 'M 700 268 L 790 262 L 820 272 L 710 285 Z', fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'seat', 'data-fillable': '' }));
  // Tail / pillion cowl
  seat.appendChild(ns('path', { d: 'M 820 265 L 915 258 L 930 288 L 800 290 Z', fill: '#F0ECE1', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'seat' }));
  svg.appendChild(seat);

  // Rear tail light (small shape, separate part)
  const tl = ns('g', { 'data-shape': 'tail_light', class: 'ute-shape' });
  tl.appendChild(ns('path', { d: 'M 912 272 L 940 268 L 944 285 L 915 290 Z', fill: '#C2502A', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'tail_light', 'data-fillable': '' }));
  svg.appendChild(tl);

  // ─ Battery (behind the engine, under the seat) ──────────────────
  const bat = ns('g', { 'data-shape': 'battery', class: 'ute-shape' });
  bat.appendChild(ns('rect', { x: 712, y: 300, width: 44, height: 30, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'battery', 'data-fillable': '' }));
  bat.appendChild(ns('line', { x1: 720, y1: 308, x2: 726, y2: 308, stroke: '#C2502A', 'stroke-width': 2, 'data-shape': 'battery' }));
  bat.appendChild(ns('line', { x1: 742, y1: 308, x2: 748, y2: 308, stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'battery' }));
  const batText = ns('text', { x: 734, y: 324, fill: '#0A0A0A', 'font-family': 'IBM Plex Mono, monospace', 'font-size': 10, 'font-weight': 600, 'text-anchor': 'middle', 'data-shape': 'battery' });
  batText.textContent = '12V';
  bat.appendChild(batText);
  svg.appendChild(bat);

  // Side stand (visible under engine)
  const stand = ns('g');
  stand.appendChild(ns('line', { x1: 575, y1: 455, x2: 595, y2: 490, stroke: '#2A2A26', 'stroke-width': 4 }));

  // Foot pegs
  stand.appendChild(ns('circle', { cx: 735, cy: 440, r: 4, fill: '#2A2A26' }));
  stand.appendChild(ns('line', { x1: 735, y1: 440, x2: 755, y2: 445, stroke: '#2A2A26', 'stroke-width': 3 }));
  stand.appendChild(ns('circle', { cx: 850, cy: 358, r: 3, fill: '#2A2A26' }));
  svg.appendChild(stand);

  // ─ Callouts (collision-free tiered placement) ───────────────────
  // Four lanes: 2 above, 2 below. Within each lane, label x positions are
  // picked so labels never horizontally overlap. Leaders span from the
  // shape point to the lane y + a small stub into the label base.
  const callouts = [
    // Lane 1 — upper outer (above the bike)
    { key: 'headlight',    sx: 340, sy: 213, lx:  100, lane: 1, label: 'Headlight' },
    { key: 'instruments',  sx: 415, sy: 158, lx:  335, lane: 1, label: 'Instruments' },
    { key: 'fuel_tank',    sx: 575, sy: 220, lx:  560, lane: 1, label: 'Fuel tank' },
    { key: 'seat',         sx: 755, sy: 268, lx:  785, lane: 1, label: 'Seat' },
    { key: 'tail_light',   sx: 925, sy: 278, lx: 1000, lane: 1, label: 'Tail light' },
    // Lane 2 — upper inner (above the bike, lower lane)
    { key: 'forks',        sx: 270, sy: 290, lx:   90, lane: 2, label: 'Forks' },
    { key: 'air_filter',   sx: 560, sy: 300, lx:  460, lane: 2, label: 'Air filter' },
    { key: 'carb',         sx: 615, sy: 305, lx:  625, lane: 2, label: 'Carb / EFI' },
    { key: 'cylinder',     sx: 640, sy: 285, lx:  775, lane: 2, label: 'Cylinder' },
    // Lane 3 — lower outer (below the bike)
    { key: 'front_wheel',  sx: 254, sy: 395, lx:  260, lane: 3, label: 'Front wheel' },
    { key: 'brake',        sx: 306, sy: 405, lx:  395, lane: 3, label: 'Brake disc' },
    { key: 'engine',       sx: 620, sy: 405, lx:  575, lane: 3, label: 'Engine' },
    { key: 'chain',        sx: 820, sy: 400, lx:  790, lane: 3, label: 'Chain' },
    { key: 'swingarm',     sx: 850, sy: 400, lx:  960, lane: 3, label: 'Swingarm' },
    { key: 'rear_wheel',   sx: 955, sy: 400, lx: 1150, lane: 3, label: 'Rear wheel' },
    // Lane 4 — lower inner (below the bike, lower lane)
    { key: 'frame',        sx: 500, sy: 258, lx:  445, lane: 4, label: 'Frame' },
    { key: 'battery',      sx: 734, sy: 314, lx:  695, lane: 4, label: 'Battery' },
    { key: 'rear_shock',   sx: 760, sy: 340, lx:  870, lane: 4, label: 'Rear shock' },
    { key: 'rear_sprocket',sx: 955, sy: 450, lx:  998, lane: 4, label: 'Rear sprocket' },
    { key: 'exhaust',      sx: 950, sy: 450, lx: 1140, lane: 4, label: 'Exhaust' },
  ];
  // Lane y positions (y=0 at top of the 1200×590 viewBox)
  const laneY = { 1: 28, 2: 70, 3: 520, 4: 560 };
  const gc = ns('g', { id: 'ute-callouts' });
  callouts.forEach((c) => {
    const ly = laneY[c.lane];
    const grp = ns('g', { class: 'ute-callout' + (S.selected_part === c.key ? ' is-on' : ''), 'data-part': c.key });
    // Leader: from shape point → vertical stub to lane
    const d = `M ${c.sx} ${c.sy} L ${c.lx} ${ly + (c.lane <= 2 ? 10 : -10)}`;
    grp.appendChild(ns('path', { class: 'ute-callout-leader', d }));
    grp.appendChild(ns('circle', { class: 'ute-callout-dot', cx: c.sx, cy: c.sy, r: 3 }));
    const label = ns('text', { class: 'ute-callout-label', x: c.lx, y: ly, 'text-anchor': 'middle' });
    label.textContent = c.label.toUpperCase();
    grp.appendChild(label);
    gc.appendChild(grp);
  });
  svg.appendChild(gc);

  // Wire shape + callout clicks
  svg.querySelectorAll('[data-shape]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const k = el.getAttribute('data-shape');
      selectPart(k);
    });
  });
  svg.querySelectorAll('.ute-callout').forEach((grp) => {
    grp.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectPart(grp.getAttribute('data-part'));
    });
  });

  // Apply highlight for current selection
  applyMotoHighlight();
}

function applyMotoHighlight() {
  const svg = ROOT.querySelector('#ute-moto');
  if (!svg) return;
  svg.querySelectorAll('.ute-shape').forEach((el) => el.classList.remove('is-highlight'));
  if (!S.selected_part) return;
  svg.querySelectorAll(`[data-shape="${S.selected_part}"]`).forEach((el) => {
    if (el.classList && el.classList.contains('ute-shape')) {
      el.classList.add('is-highlight');
    }
  });
  svg.querySelectorAll('.ute-callout').forEach((grp) => grp.classList.toggle('is-on', grp.getAttribute('data-part') === S.selected_part));
}

// ───────────────────────── Engine SVG ────────────────────────────
let ENGINE_PATHS = {};

function mountEngineSVG() {
  const svg = ROOT.querySelector('#ute-engine');
  if (!svg) return;
  svg.innerHTML = '';
  const g = ns('g', { id: 'ute-engine-g' });

  // Defs for flow arrowheads
  const defs = ns('defs');
  defs.appendChild(arrowMarker('ute-arr-intake', '#3E6FB7'));
  defs.appendChild(arrowMarker('ute-arr-exhaust', '#7A6E60'));
  defs.appendChild(arrowMarker('ute-arr-fire', '#C2502A'));
  g.appendChild(defs);

  // Crank circle (dashed guide)
  g.appendChild(ns('circle', { cx: 450, cy: 560, r: 70, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));

  // Crankcase (box) — shape with data-shape
  g.appendChild(ns('rect', { x: 320, y: 500, width: 260, height: 190, fill: '#EFEAE0', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'engine', class: 'ute-shape', 'data-fillable': '' }));

  // Cylinder barrel
  g.appendChild(ns('rect', { x: 400, y: 180, width: 100, height: 340, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'cylinder', class: 'ute-shape', 'data-fillable': '' }));
  // Cooling fins
  for (let i = 0; i < 8; i++) {
    g.appendChild(ns('line', { x1: 376, y1: 210 + i*34, x2: 400, y2: 210 + i*34, stroke: '#0A0A0A', 'stroke-width': 1, 'data-shape': 'cylinder' }));
    g.appendChild(ns('line', { x1: 500, y1: 210 + i*34, x2: 524, y2: 210 + i*34, stroke: '#0A0A0A', 'stroke-width': 1, 'data-shape': 'cylinder' }));
  }

  // Head (cylinder head casting)
  g.appendChild(ns('path', { d: 'M 395 180 L 395 110 Q 395 90 415 90 L 485 90 Q 505 90 505 110 L 505 180 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'cylinder', class: 'ute-shape', 'data-fillable': '' }));
  // Spark plug (stem + body) — this is clickable as a separate part
  const sparkGrp = ns('g', { 'data-shape': 'spark_plug', class: 'ute-shape' });
  sparkGrp.appendChild(ns('rect', { x: 440, y: 50, width: 20, height: 50, fill: '#B9B3A4', stroke: '#0A0A0A', 'data-shape': 'spark_plug', 'data-fillable': '' }));
  sparkGrp.appendChild(ns('rect', { x: 437, y: 40, width: 26, height: 10, fill: '#2A2A26', 'data-shape': 'spark_plug' }));
  sparkGrp.appendChild(ns('line', { id: 'ute-spark', x1: 450, y1: 100, x2: 450, y2: 115, stroke: '#0A0A0A', 'stroke-width': 2, 'data-shape': 'spark_plug' }));
  sparkGrp.appendChild(ns('circle', { id: 'ute-spark-flash', cx: 450, cy: 118, r: 0, fill: '#E2A93B', 'data-shape': 'spark_plug' }));
  g.appendChild(sparkGrp);

  // In-cylinder gas fill (updates per frame)
  const gas = ns('rect', { id: 'ute-gas', x: 402, y: 180, width: 96, height: 300, fill: '#D8E3F0', opacity: 0.72 });
  g.appendChild(gas);

  // Gas-flow arrows (hidden/shown per stroke) — must be above gas, below piston
  // 4T intake path: carb → intake runner → down past intake valve
  g.appendChild(ns('path', { id: 'ute-flow-intake', class: 'ute-flow', d: 'M 240 100 L 320 100 L 350 115 L 410 135 L 418 170 L 425 220', 'marker-end': 'url(#ute-arr-intake)' }));
  // 4T exhaust path: cylinder → exhaust port up → exhaust runner → out
  g.appendChild(ns('path', { id: 'ute-flow-exhaust', class: 'ute-flow is-exhaust', d: 'M 475 220 L 482 170 L 490 135 L 550 115 L 580 100 L 660 100', 'marker-end': 'url(#ute-arr-exhaust)' }));

  // 2T transfer flow (crankcase → up transfer port into cylinder)
  g.appendChild(ns('path', { id: 'ute-flow-transfer', class: 'ute-flow', d: 'M 350 600 L 350 465 L 395 465 L 402 445', 'marker-end': 'url(#ute-arr-intake)' }));
  // 2T exhaust port flow (out exhaust port)
  g.appendChild(ns('path', { id: 'ute-flow-port-ex', class: 'ute-flow is-exhaust', d: 'M 498 450 L 540 450 L 580 440 L 640 420', 'marker-end': 'url(#ute-arr-exhaust)' }));
  // 2T reed valve inflow (fresh charge into crankcase)
  g.appendChild(ns('path', { id: 'ute-flow-reed', class: 'ute-flow', d: 'M 220 600 L 300 600', 'marker-end': 'url(#ute-arr-intake)' }));
  // Combustion "fire" burst
  g.appendChild(ns('path', { id: 'ute-flow-fire', class: 'ute-flow is-fire', d: 'M 450 170 L 440 220 M 450 170 L 460 220 M 450 170 L 430 215 M 450 170 L 470 215', 'stroke-width': 4 }));

  if (S.mode === '4t') {
    // Valve ports (intake left, exhaust right) — clickable as separate parts
    const vIn = ns('g', { 'data-shape': 'valve_in', class: 'ute-shape' });
    vIn.appendChild(ns('rect', { x: 410, y: 100, width: 30, height: 80, fill: 'none', stroke: '#0A0A0A', 'data-shape': 'valve_in' }));
    vIn.appendChild(ns('path', { d: 'M 410 140 L 350 130 L 350 100 L 310 100', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'valve_in' }));
    vIn.appendChild(ns('rect', { id: 'ute-valve-in', x: 408, y: 170, width: 34, height: 10, fill: '#2A2A26', 'data-shape': 'valve_in' }));
    g.appendChild(vIn);

    const vEx = ns('g', { 'data-shape': 'valve_ex', class: 'ute-shape' });
    vEx.appendChild(ns('rect', { x: 460, y: 100, width: 30, height: 80, fill: 'none', stroke: '#0A0A0A', 'data-shape': 'valve_ex' }));
    vEx.appendChild(ns('path', { d: 'M 490 140 L 550 130 L 550 100 L 590 100', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'valve_ex' }));
    vEx.appendChild(ns('rect', { id: 'ute-valve-ex', x: 458, y: 170, width: 34, height: 10, fill: '#2A2A26', 'data-shape': 'valve_ex' }));
    g.appendChild(vEx);

    // Labels for intake/exhaust
    g.appendChild(txt(240, 92, 'FROM CARB', 'start'));
    g.appendChild(txt(660, 92, 'TO EXHAUST', 'start'));
  } else {
    // 2-stroke: ports in the cylinder wall
    const pEx = ns('g', { 'data-shape': 'port_ex', class: 'ute-shape' });
    pEx.appendChild(ns('rect', { id: 'ute-port-ex', x: 490, y: 430, width: 20, height: 50, fill: '#7A6E60', stroke: '#0A0A0A', 'data-shape': 'port_ex', 'data-fillable': '' }));
    pEx.appendChild(ns('path', { d: 'M 510 455 L 580 455 L 580 420 L 640 420', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'port_ex' }));
    g.appendChild(pEx);

    const pTr = ns('g', { 'data-shape': 'port_tr', class: 'ute-shape' });
    pTr.appendChild(ns('rect', { id: 'ute-port-tr', x: 390, y: 440, width: 20, height: 50, fill: '#3E6FB7', stroke: '#0A0A0A', 'data-shape': 'port_tr', 'data-fillable': '' }));
    pTr.appendChild(ns('path', { d: 'M 390 465 L 340 465 L 340 580 L 320 580', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'port_tr' }));
    g.appendChild(pTr);

    // Reed valve box
    const reed = ns('g', { 'data-shape': 'carb', class: 'ute-shape' });
    reed.appendChild(ns('rect', { x: 220, y: 580, width: 80, height: 40, fill: '#FFFFFF', stroke: '#0A0A0A', 'data-shape': 'carb', 'data-fillable': '' }));
    reed.appendChild(ns('path', { d: 'M 220 590 L 240 600 L 220 610', fill: 'none', stroke: '#0A0A0A', 'data-shape': 'carb' }));
    g.appendChild(reed);
    g.appendChild(txt(215, 572, 'REED / CARB', 'end'));
    g.appendChild(txt(645, 415, 'EXHAUST', 'start'));
  }

  // Connecting rod (updated per frame)
  g.appendChild(ns('line', { id: 'ute-conrod', x1: 450, y1: 440, x2: 450, y2: 560, stroke: '#0A0A0A', 'stroke-width': 4, 'data-shape': 'conrod', class: 'ute-shape' }));

  // Piston (updated per frame)
  g.appendChild(ns('rect', { id: 'ute-piston', x: 402, y: 380, width: 96, height: 70, fill: '#D8D4CA', stroke: '#0A0A0A', 'stroke-width': 1.5, 'data-shape': 'piston', class: 'ute-shape', 'data-fillable': '' }));
  // Piston rings
  g.appendChild(ns('line', { id: 'ute-ring-1', x1: 402, y1: 390, x2: 498, y2: 390, stroke: '#0A0A0A', 'data-shape': 'piston' }));
  g.appendChild(ns('line', { id: 'ute-ring-2', x1: 402, y1: 395, x2: 498, y2: 395, stroke: '#0A0A0A', 'data-shape': 'piston' }));

  // Crank throw + flywheel
  const crankGrp = ns('g', { 'data-shape': 'crankshaft', class: 'ute-shape' });
  crankGrp.appendChild(ns('circle', { id: 'ute-crankpin', cx: 450, cy: 560, r: 8, fill: '#0A0A0A', 'data-shape': 'crankshaft' }));
  crankGrp.appendChild(ns('circle', { cx: 450, cy: 560, r: 3, fill: '#F6F5F2', 'data-shape': 'crankshaft' }));
  crankGrp.appendChild(ns('circle', { cx: 450, cy: 560, r: 86, fill: 'none', stroke: '#0A0A0A', 'data-shape': 'crankshaft' }));
  crankGrp.appendChild(ns('circle', { cx: 450, cy: 560, r: 4, fill: '#0A0A0A', 'data-shape': 'crankshaft' }));
  g.appendChild(crankGrp);

  svg.appendChild(g);

  ENGINE_PATHS = {
    piston: svg.querySelector('#ute-piston'),
    ring1: svg.querySelector('#ute-ring-1'),
    ring2: svg.querySelector('#ute-ring-2'),
    conrod: svg.querySelector('#ute-conrod'),
    crankpin: svg.querySelector('#ute-crankpin'),
    gas: svg.querySelector('#ute-gas'),
    valveIn: svg.querySelector('#ute-valve-in'),
    valveEx: svg.querySelector('#ute-valve-ex'),
    portEx: svg.querySelector('#ute-port-ex'),
    portTr: svg.querySelector('#ute-port-tr'),
    sparkFlash: svg.querySelector('#ute-spark-flash'),
    flowIntake: svg.querySelector('#ute-flow-intake'),
    flowExhaust: svg.querySelector('#ute-flow-exhaust'),
    flowTransfer: svg.querySelector('#ute-flow-transfer'),
    flowPortEx: svg.querySelector('#ute-flow-port-ex'),
    flowReed: svg.querySelector('#ute-flow-reed'),
    flowFire: svg.querySelector('#ute-flow-fire'),
  };

  // Wire shape clicks on engine (piston, con-rod, crankshaft, cylinder, head, spark, valves, ports)
  svg.querySelectorAll('[data-shape]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectPart(el.getAttribute('data-shape'));
    });
  });
  applyEngineHighlight();
}

function arrowMarker(id, color) {
  const m = ns('marker', { id, viewBox: '0 0 12 12', refX: 10, refY: 6, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  const p = ns('path', { d: 'M 0 0 L 12 6 L 0 12 Z', fill: color });
  m.appendChild(p);
  return m;
}

function applyEngineHighlight() {
  const svg = ROOT.querySelector('#ute-engine');
  if (!svg) return;
  svg.querySelectorAll('.ute-shape').forEach((el) => el.classList.remove('is-highlight'));
  if (!S.selected_part) return;
  svg.querySelectorAll(`[data-shape="${S.selected_part}"]`).forEach((el) => {
    if (el.classList && el.classList.contains('ute-shape')) {
      el.classList.add('is-highlight');
    }
  });
}

function updateEngineSVG() {
  if (!ENGINE_PATHS.piston) return;
  const cycle = (S.mode === '4t') ? 720 : 360;
  const shaftDeg = S.crank_deg % 360;
  const theta = shaftDeg * Math.PI / 180;
  const crankR = 70;
  const centreX = 450, centreY = 560;
  const pinX = centreX + crankR * Math.cos(theta - Math.PI/2);
  const pinY = centreY + crankR * Math.sin(theta - Math.PI/2);
  const rodLen = 180;
  const pistonPinY = centreY - Math.sqrt(rodLen*rodLen - Math.pow(pinX - centreX, 2));
  const pistonTopY = pistonPinY - 60;
  const topBound = 180, bottomBound = 420;
  const pistonY = Math.max(topBound, Math.min(bottomBound, pistonTopY));

  ENGINE_PATHS.piston.setAttribute('y', pistonY);
  ENGINE_PATHS.ring1.setAttribute('y1', pistonY + 10); ENGINE_PATHS.ring1.setAttribute('y2', pistonY + 10);
  ENGINE_PATHS.ring2.setAttribute('y1', pistonY + 15); ENGINE_PATHS.ring2.setAttribute('y2', pistonY + 15);
  ENGINE_PATHS.conrod.setAttribute('x1', 450); ENGINE_PATHS.conrod.setAttribute('y1', pistonY + 60);
  ENGINE_PATHS.conrod.setAttribute('x2', pinX); ENGINE_PATHS.conrod.setAttribute('y2', pinY);
  ENGINE_PATHS.crankpin.setAttribute('cx', pinX); ENGINE_PATHS.crankpin.setAttribute('cy', pinY);

  ENGINE_PATHS.gas.setAttribute('y', 180);
  ENGINE_PATHS.gas.setAttribute('height', Math.max(2, pistonY - 180));

  const strokeInfo = currentStroke(S.crank_deg, S.mode);
  const gasFill = {
    'intake':     '#D8E3F0',
    'compression':'#DAD3C1',
    'power':      '#F2CDB9',
    'exhaust':    '#D7D1C4',
    'scavenge':   '#CDE1EE',
  }[strokeInfo.s] || '#D8E3F0';
  ENGINE_PATHS.gas.setAttribute('fill', gasFill);

  // Gas-flow arrow visibility per stroke
  const show = (el, on) => el && el.classList.toggle('is-on', !!on);
  if (S.mode === '4t') {
    show(ENGINE_PATHS.flowIntake, strokeInfo.s === 'intake');
    show(ENGINE_PATHS.flowExhaust, strokeInfo.s === 'exhaust');
    show(ENGINE_PATHS.flowTransfer, false);
    show(ENGINE_PATHS.flowPortEx, false);
    show(ENGINE_PATHS.flowReed, false);
    // Fire bursts at start of power stroke
    const nearPower = (S.crank_deg > 355 && S.crank_deg < 420);
    show(ENGINE_PATHS.flowFire, nearPower);
    // Valve lift
    const vi = (strokeInfo.s === 'intake')  ? 10 : 0;
    const ve = (strokeInfo.s === 'exhaust') ? 10 : 0;
    ENGINE_PATHS.valveIn.setAttribute('y', 170 + vi);
    ENGINE_PATHS.valveEx.setAttribute('y', 170 + ve);
  } else {
    show(ENGINE_PATHS.flowIntake, false);
    show(ENGINE_PATHS.flowExhaust, false);
    // 2T: ports uncovered when piston drops below them
    const exUncovered = (pistonY + 60) > 430;
    const trUncovered = (pistonY + 60) > 440;
    if (ENGINE_PATHS.portEx) ENGINE_PATHS.portEx.setAttribute('fill-opacity', exUncovered ? 1 : 0.25);
    if (ENGINE_PATHS.portTr) ENGINE_PATHS.portTr.setAttribute('fill-opacity', trUncovered ? 1 : 0.25);
    show(ENGINE_PATHS.flowTransfer, trUncovered && strokeInfo.s === 'scavenge');
    show(ENGINE_PATHS.flowPortEx, exUncovered && (strokeInfo.s === 'exhaust' || strokeInfo.s === 'scavenge'));
    show(ENGINE_PATHS.flowReed, strokeInfo.s === 'compression' || strokeInfo.s === 'power');
    const nearPower = (S.crank_deg > -5 && S.crank_deg < 25);
    show(ENGINE_PATHS.flowFire, nearPower);
  }

  // Spark flash
  const sparkDeg = (S.mode === '4t') ? 360 : 0;
  const dSpark = Math.abs(((S.crank_deg - sparkDeg + cycle) % cycle));
  const flash = (dSpark < 15 || dSpark > cycle - 15) ? 10 : 0;
  ENGINE_PATHS.sparkFlash.setAttribute('r', flash);

  // Timing needle
  const needle = ROOT.querySelector('#ute-timing-needle');
  if (needle) needle.style.left = (100 * S.crank_deg / cycle) + '%';

  // Stroke badge + caption
  const badge = ROOT.querySelector('#ute-stroke-badge');
  if (badge) { badge.textContent = strokeInfo.label; badge.setAttribute('data-s', strokeInfo.s); }
  const caption = ROOT.querySelector('#ute-caption-body');
  if (caption) caption.textContent = strokeInfo.caption;
  const strokeBody = ROOT.querySelector('#ute-stroke-body');
  if (strokeBody) strokeBody.textContent = strokeInfo.caption;

  // Live-stats panel refresh (cheap, numbers only)
  if (S.selected_part) updateLivePanel();
}

function currentStroke(deg, mode) {
  if (mode === '4t') {
    if (deg < 180) return { s:'intake', label:'Intake', caption:'Intake valve open; piston descending. Fresh air–fuel charge rushes in.' };
    if (deg < 360) return { s:'compression', label:'Compression', caption:'Both valves shut. Piston rising, charge compressing — pressure and temperature climbing fast.' };
    if (deg < 540) return { s:'power', label:'Power', caption:'Spark at TDC. Expanding gas drives the piston down. The only stroke that does work on the crank.' };
    return { s:'exhaust', label:'Exhaust', caption:'Exhaust valve opens. Rising piston pushes burnt gas out.' };
  }
  if (deg < 110) return { s:'power', label:'Power', caption:'Spark at TDC. Burning gas pushes the piston down. Below, in the crankcase, fresh charge is being compressed.' };
  if (deg < 180) return { s:'exhaust', label:'Blowdown', caption:'Piston uncovers the exhaust port. Burnt gas blows down before the transfer port opens.' };
  if (deg < 230) return { s:'scavenge', label:'Scavenge', caption:'Transfer port opens. Fresh charge from the crankcase sweeps up, pushing out remaining exhaust.' };
  return { s:'compression', label:'Compression', caption:'Piston rises past the ports. Charge above the piston is compressed; a new charge is drawn into the crankcase through the reed valve.' };
}

// ───────────────────────── Live-state panel ──────────────────────
function updateLivePanel() {
  const slot = ROOT.querySelector('#ute-live-slot');
  if (!slot) return;
  if (!S.selected_part) {
    slot.innerHTML = `<div class="ute-live-empty">Click any part — on the diagram above, on the engine below, or in the Part catalogue — to see its live state.</div>`;
    return;
  }
  const p = PARTS[S.selected_part];
  if (!p) { slot.innerHTML = ''; return; }
  const stats = livePartStats(S.selected_part);
  const statsHTML = stats.map((st) => `<div class="stat"><span class="k">${st.k}</span><span class="v">${st.v}</span></div>`).join('');
  slot.innerHTML = `
    <div class="ute-live" role="status" aria-live="polite">
      <div>
        <span class="ute-live-k">${p.tag}</span>
        <h3>${p.name}</h3>
        <p class="ute-live-desc">${p.desc}</p>
      </div>
      <div class="ute-live-stats">${statsHTML}</div>
      <button class="ute-live-close" type="button" aria-label="Clear selection" data-live-close>×</button>
    </div>`;
  const btn = slot.querySelector('[data-live-close]');
  if (btn) btn.addEventListener('click', () => selectPart(null));
}

function livePartStats(key) {
  const cycle = (S.mode === '4t') ? 720 : 360;
  const stroke = currentStroke(S.crank_deg, S.mode).s;
  const pistonSpeedMean = (2 * S.stroke_mm/1000 * S.rpm / 60);  // m/s
  const disp = displacementCC(S.bore_mm, S.stroke_mm);
  const wheelRPM = (S.rpm / GEAR.primary / GEAR.gear3 / GEAR.final);
  const wheelKmh = (wheelRPM / 60) * (2 * Math.PI * GEAR.wheel_r_m) * 3.6;
  const chainMps = (wheelRPM / 60) * (2 * Math.PI * 0.11);  // ~110 mm sprocket pitch radius
  // Rough gas pressure state (bar) — illustrative only
  const pressBar = ({intake: 0.9, compression: 10, power: 50, exhaust: 1.3, scavenge: 1.1})[stroke] || 1;
  const tempC    = ({intake: 60, compression: 350, power: 2000, exhaust: 850, scavenge: 300})[stroke] || 100;

  switch (key) {
    case 'piston':
      return [
        { k: 'Position', v: `${((S.crank_deg % 360) / 360 * 100).toFixed(0)}% of cycle` },
        { k: 'Mean speed', v: `${pistonSpeedMean.toFixed(1)} m/s` },
        { k: 'Direction', v: (stroke === 'intake' || stroke === 'power') ? 'descending' : 'ascending' },
        { k: 'Stroke', v: `${S.stroke_mm} mm` },
      ];
    case 'crankshaft':
      return [
        { k: 'Shaft angle', v: `${(S.crank_deg % 360).toFixed(0)}°` },
        { k: 'Shaft RPM', v: `${Math.round(S.rpm).toLocaleString('en-GB')}` },
        { k: 'Rev / sec', v: `${(S.rpm/60).toFixed(1)}` },
      ];
    case 'conrod':
      return [
        { k: 'Length', v: `~${Math.round(S.stroke_mm * 1.75)} mm` },
        { k: 'Big-end angle', v: `${(S.crank_deg % 360).toFixed(0)}°` },
      ];
    case 'cylinder':
      return [
        { k: 'Bore', v: `${S.bore_mm} mm` },
        { k: 'Displacement', v: `${Math.round(disp)} cc` },
        { k: 'Gas state', v: stroke.toUpperCase() },
        { k: 'Est. pressure', v: `${pressBar.toFixed(1)} bar` },
        { k: 'Est. temp', v: `${tempC} °C` },
      ];
    case 'spark_plug':
      {
        const sparkDeg = (S.mode === '4t') ? 360 : 0;
        const toSpark = ((sparkDeg - S.crank_deg + cycle) % cycle);
        return [
          { k: 'State', v: toSpark < 15 ? 'FIRING' : 'dwell' },
          { k: 'Next fire in', v: `${toSpark.toFixed(0)}° crank` },
          { k: 'Fires per rev', v: S.mode === '4t' ? '0.5' : '1.0' },
        ];
      }
    case 'valve_in':
      return [
        { k: 'State', v: stroke === 'intake' ? 'OPEN' : 'closed' },
        { k: 'Lift (max)', v: '~10 mm' },
        { k: 'Open window', v: '~235° crank' },
      ];
    case 'valve_ex':
      return [
        { k: 'State', v: stroke === 'exhaust' ? 'OPEN' : 'closed' },
        { k: 'Lift (max)', v: '~10 mm' },
        { k: 'Open window', v: '~235° crank' },
      ];
    case 'port_ex':
      return [
        { k: 'State', v: (stroke === 'exhaust' || stroke === 'scavenge') ? 'OPEN' : 'closed' },
        { k: 'Open window', v: '~140° crank' },
      ];
    case 'port_tr':
      return [
        { k: 'State', v: stroke === 'scavenge' ? 'OPEN' : 'closed' },
        { k: 'Open window', v: '~100° crank' },
      ];
    case 'engine':
      return [
        { k: 'Displacement', v: `${Math.round(disp)} cc` },
        { k: 'Mode', v: S.mode.toUpperCase() },
        { k: 'RPM', v: `${Math.round(S.rpm).toLocaleString('en-GB')}` },
      ];
    case 'carb':
      {
        // Rough mass flow at idle AFR, order-of-magnitude only
        const volPerSec = disp/1e6 * (S.rpm / 60) * (S.mode === '4t' ? 0.5 : 1);
        const airKgS = volPerSec * 1.2 * 0.85;
        const fuelGS = airKgS / 14.7 * 1000;
        return [
          { k: 'Air flow', v: `${(airKgS*1000).toFixed(1)} g/s` },
          { k: 'Fuel flow', v: `${fuelGS.toFixed(2)} g/s` },
          { k: 'Target AFR', v: `14.7 : 1` },
        ];
      }
    case 'fuel_tank':
      return [
        { k: 'Typical capacity', v: `12–18 L` },
        { k: 'Energy density', v: `~32 MJ / L` },
      ];
    case 'air_filter':
      return [
        { k: 'Flow', v: 'passes air to carb/EFI' },
        { k: 'When clogged', v: 'engine runs rich' },
      ];
    case 'exhaust':
      return [
        { k: 'Gas flow', v: (stroke === 'exhaust' || stroke === 'scavenge') ? 'ACTIVE' : 'residual' },
        { k: 'Peak temp', v: `~850 °C` },
      ];
    case 'battery':
      return [
        { k: 'Nominal', v: '12 V' },
        { k: 'Typical', v: '8–14 Ah' },
      ];
    case 'instruments':
      return [
        { k: 'RPM shown', v: `${Math.round(S.rpm).toLocaleString('en-GB')}` },
        { k: 'Speed', v: `${wheelKmh.toFixed(0)} km/h` },
      ];
    case 'headlight':
      return [
        { k: 'Typical draw', v: '55 W' },
        { k: 'Power source', v: 'battery' },
      ];
    case 'tail_light':
      return [
        { k: 'Typical draw', v: '5 W (position) / 21 W (brake)' },
      ];
    case 'seat':
      return [{ k: 'Role', v: 'rider ergonomics + chassis load point' }];
    case 'frame':
      return [{ k: 'Role', v: 'structural backbone + engine mount' }];
    case 'forks':
      return [
        { k: 'Travel', v: '~120 mm' },
        { k: 'Damping', v: 'hydraulic' },
      ];
    case 'rear_shock':
      return [
        { k: 'Travel', v: '~130 mm' },
        { k: 'Spring preload', v: 'adjustable' },
      ];
    case 'swingarm':
      return [{ k: 'Role', v: 'holds rear wheel, pivots at frame' }];
    case 'brake':
      return [
        { k: 'Role', v: 'converts KE → heat' },
        { k: 'Pads', v: 'organic / sintered' },
      ];
    case 'chain':
      return [
        { k: 'Linear speed', v: `${chainMps.toFixed(1)} m/s` },
        { k: 'Pitch', v: '525 (typ.)' },
      ];
    case 'rear_sprocket':
      return [
        { k: 'Rotation', v: `${wheelRPM.toFixed(0)} rpm` },
        { k: 'Final ratio', v: `${GEAR.final.toFixed(2)}` },
      ];
    case 'front_wheel':
      return [
        { k: 'Rotation', v: `${wheelRPM.toFixed(0)} rpm` },
        { k: 'Road speed', v: `${wheelKmh.toFixed(0)} km/h` },
      ];
    case 'rear_wheel':
      return [
        { k: 'Rotation', v: `${wheelRPM.toFixed(0)} rpm` },
        { k: 'Road speed', v: `${wheelKmh.toFixed(0)} km/h` },
        { k: 'Role', v: 'drives the bike' },
      ];
    default:
      return [{ k: 'See description', v: '→' }];
  }
}

// ───────────────────────── Selection + chrome ────────────────────
function selectPart(key) {
  S.selected_part = (S.selected_part === key || key == null) ? null : key;
  // Update parts list highlight
  ROOT.querySelectorAll('[data-part]').forEach((b) => {
    b.classList.toggle('is-on', b.getAttribute('data-part') === S.selected_part);
  });
  // Highlight on both diagrams
  applyMotoHighlight();
  applyEngineHighlight();
  updateLivePanel();
  // Scroll the overview into view on mobile so the live panel is visible
  const overview = ROOT.querySelector('.ute-overview');
  if (overview && window.matchMedia('(max-width: 960px)').matches) {
    overview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function wireChromeLocal() {
  // Mode switch
  ROOT.querySelectorAll('.ute-mode-switch button').forEach((b) => {
    b.addEventListener('click', () => {
      const m = b.getAttribute('data-mode');
      if (m === S.mode) return;
      S.mode = m;
      S.crank_deg = 0;
      render();
    });
  });
  const rt = ROOT.querySelector('.ute-run-toggle');
  if (rt) rt.addEventListener('click', toggleRun);
  const h = ROOT.querySelector('.ute-help');
  if (h) h.addEventListener('click', openHelp);
  // Collapsible params panel
  const paramsPanel = ROOT.querySelector('#ute-params-panel .ute-panel-h');
  if (paramsPanel) paramsPanel.addEventListener('click', () => {
    paramsPanel.closest('.ute-collapsible').classList.toggle('is-closed');
  });
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

function wireControls() {
  // Parameter sliders
  ROOT.querySelectorAll('input[type="range"][data-param]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const key = inp.getAttribute('data-param');
      S[key] = parseFloat(inp.value);
      const span = ROOT.querySelector(`[data-param-value="${key}"]`);
      if (span) {
        const v = S[key];
        const step = parseFloat(inp.getAttribute('step')) || 1;
        span.textContent = (step < 1) ? v.toFixed(1) : Math.round(v).toLocaleString('en-GB');
      }
      updateReadouts();
      if (S.selected_part) updateLivePanel();
    });
  });
  // Running controls
  ROOT.querySelectorAll('[data-run]').forEach((b) => {
    b.addEventListener('click', () => {
      const act = b.getAttribute('data-run');
      if (act === 'toggle') toggleRun();
      else if (act === 'step') { S.crank_deg = (S.crank_deg + 30) % ((S.mode==='4t')?720:360); updateEngineSVG(); }
    });
  });
  // Parts list
  ROOT.querySelectorAll('[data-part]').forEach((b) => {
    b.addEventListener('click', () => selectPart(b.getAttribute('data-part')));
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
  const btn = ROOT.querySelector('[data-run="toggle"]');
  if (btn) btn.textContent = S.running ? 'Pause' : 'Play';
  S.last_tick_ms = performance.now();
}

function openHelp() {
  alert([
    'Under the Engine — v0.2',
    '',
    '• Click any part on the big motorcycle (or on the engine cross-section, or in the Part catalogue). The part highlights and its live state appears below the diagram.',
    '• Toggle 4-stroke / 2-stroke in the top bar.',
    '• Space pauses / resumes the animation. Step +30° nudges the crank by hand.',
    '• Sliders change RPM, bore, stroke and compression — everything downstream recomputes.',
    '• Esc clears a selection.',
    '',
    'Next release: electric mode (motor + controller + BMS) for a side-by-side with the ICE drivetrain.',
  ].join('\n'));
}

// ───────────────────────── Loop ─────────────────────────────────
function startLoop() {
  S.last_tick_ms = performance.now();
  requestAnimationFrame(tick);
}
function tick(now) {
  const dt = Math.min(100, now - S.last_tick_ms) / 1000;
  S.last_tick_ms = now;
  if (S.running) {
    const shaftDegPerSec = (360 * S.rpm / 60) / 60;  // 60× slow-mo
    const cycleDeg = (S.mode === '4t') ? 720 : 360;
    S.crank_deg = (S.crank_deg + shaftDegPerSec * dt) % cycleDeg;
    updateEngineSVG();
  }
  requestAnimationFrame(tick);
}

// ───────────────────────── Outputs ──────────────────────────────
function updateReadouts() {
  const reads = ROOT.querySelector('#ute-reads');
  if (reads) reads.innerHTML = readoutsHTML();
}
function displacementCC(bore_mm, stroke_mm) {
  return (Math.PI / 4) * (bore_mm * bore_mm) * stroke_mm / 1000;
}
function approxTorqueNm(disp_cc, mode, cr) {
  const base = (mode === '4t') ? 10 : 8;
  const bmep_bar = base * (1 + 0.03 * (cr - 10));
  const bmep_pa = bmep_bar * 1e5;
  const V = disp_cc * 1e-6;
  const nR = (mode === '4t') ? 2 : 1;
  return bmep_pa * V / (2 * Math.PI * nR);
}

// ───────────────────────── Parts data ────────────────────────────
const PARTS = {
  engine: {
    name: 'Engine block',
    tag: 'Combustion',
    desc: 'The casting that holds the cylinder, crankshaft and transmission. On most motorcycles the engine is a stressed member of the chassis, so the frame bolts directly to it.',
  },
  cylinder: {
    name: 'Cylinder',
    tag: 'Combustion',
    desc: 'The sealed tube inside which the piston slides. Combustion happens between the piston crown and the cylinder head above it. Air-cooled cylinders are finned to shed heat.',
  },
  piston: {
    name: 'Piston',
    tag: 'Combustion',
    desc: 'The moving plug that seals the combustion chamber. It converts gas pressure into linear force, which the connecting rod turns into torque at the crank. Mean piston speed is a key stress indicator.',
  },
  conrod: {
    name: 'Connecting rod',
    tag: 'Combustion',
    desc: 'Links the piston (small end) to the crank pin (big end). It swings as the crank rotates — the geometry is what makes a reciprocating engine turn linear motion into rotation.',
  },
  crankshaft: {
    name: 'Crankshaft',
    tag: 'Combustion',
    desc: 'The shaft that collects torque from the con-rod and sends it to the gearbox. Its offset throw sets the stroke; its mass acts as a short-term flywheel between power pulses.',
  },
  spark_plug: {
    name: 'Spark plug',
    tag: 'Ignition',
    desc: 'Fires a short electric arc at its tip when the piston is near top-dead-centre on the compression stroke. The spark lights the compressed mixture and starts the power stroke.',
  },
  valve_in: {
    name: 'Intake valve (4T)',
    tag: 'Gas path',
    desc: 'Opens on the intake stroke to let fresh charge into the cylinder. Closed during compression and power so the gas stays trapped.',
  },
  valve_ex: {
    name: 'Exhaust valve (4T)',
    tag: 'Gas path',
    desc: 'Opens on the exhaust stroke to let burnt gas out as the piston rises. Closed otherwise.',
  },
  port_ex: {
    name: 'Exhaust port (2T)',
    tag: 'Gas path',
    desc: 'A rectangular opening in the cylinder wall. The piston itself opens and closes it as it moves. Opens first on the way down for blowdown.',
  },
  port_tr: {
    name: 'Transfer port (2T)',
    tag: 'Gas path',
    desc: 'Lets fresh charge rise from the crankcase into the cylinder once the piston uncovers it. Together with the exhaust port, it is what gives a 2-stroke a power stroke every revolution.',
  },
  carb: {
    name: 'Carburetor / fuel injector',
    tag: 'Fuel',
    desc: 'Meters fuel into the incoming air. A carburetor uses a venturi to pull fuel in by suction; an injector sprays measured fuel electronically. Both deliver the air–fuel ratio the engine needs (~14.7 : 1 for petrol).',
  },
  air_filter: {
    name: 'Air filter',
    tag: 'Fuel',
    desc: 'Removes dust and grit from incoming air before it reaches the cylinder. A blocked filter starves the engine and richens the mixture.',
  },
  fuel_tank: {
    name: 'Fuel tank',
    tag: 'Fuel',
    desc: 'Reservoir of petrol between the rider and the engine. Gravity-fed on simple bikes, pump-fed on fuel-injected ones.',
  },
  exhaust: {
    name: 'Exhaust',
    tag: 'Gas path',
    desc: 'Carries burnt gas away from the cylinder. A 2-stroke exhaust is tuned (an expansion chamber) so pressure waves help scavenge; a 4-stroke exhaust is a simpler pipe plus a muffler.',
  },
  battery: {
    name: 'Battery',
    tag: 'Electrical',
    desc: 'Stores enough charge to turn the starter motor and run the lights before the alternator takes over. Simple kick-start bikes may run with no battery at all.',
  },
  instruments: {
    name: 'Instruments',
    tag: 'Rider',
    desc: 'Speedometer, tachometer (RPM) and warning lights. Modern bikes bundle these into one LCD or TFT panel.',
  },
  headlight: {
    name: 'Headlight',
    tag: 'Rider',
    desc: 'Front lighting. Drawn from the battery; on older bikes it is driven directly from the alternator and only lights when the engine is running.',
  },
  tail_light: {
    name: 'Tail light',
    tag: 'Rider',
    desc: 'Rear position and brake light. Brightens on brake input.',
  },
  seat: {
    name: 'Seat',
    tag: 'Rider',
    desc: 'Where the rider sits. Not just comfort — seat height sets how much of the rider\'s weight the chassis has to control under braking and acceleration.',
  },
  frame: {
    name: 'Frame',
    tag: 'Chassis',
    desc: 'The structural backbone. Modern frames use the engine as a stressed member, with steel tubes or aluminium beams wrapping around it.',
  },
  forks: {
    name: 'Forks',
    tag: 'Chassis',
    desc: 'Front suspension. Telescopic tubes with hydraulic damping that let the front wheel follow the road and absorb braking loads.',
  },
  rear_shock: {
    name: 'Rear shock',
    tag: 'Chassis',
    desc: 'Rear suspension. One or two spring-and-damper units mounted between the swingarm and the frame.',
  },
  swingarm: {
    name: 'Swingarm',
    tag: 'Chassis',
    desc: 'The hinged arm that holds the rear wheel. Pivots at the frame and moves against the rear shock.',
  },
  brake: {
    name: 'Brake disc + caliper',
    tag: 'Chassis',
    desc: 'A steel disc clamped by a hydraulic caliper. Converts kinetic energy to heat. Most bikes have discs front and rear; some have a drum at the rear.',
  },
  chain: {
    name: 'Drive chain',
    tag: 'Transmission',
    desc: 'Transfers torque from the gearbox output sprocket to the rear wheel. Needs lubrication and tension adjustment; shaft or belt drives are alternatives.',
  },
  rear_sprocket: {
    name: 'Rear sprocket',
    tag: 'Transmission',
    desc: 'The large sprocket bolted to the rear wheel. The ratio between the small output sprocket at the gearbox and this one sets the final-drive gearing.',
  },
  front_wheel: {
    name: 'Front wheel',
    tag: 'Chassis',
    desc: 'Supports the front of the bike, steers it, and carries the brake disc. Usually alloy or spoked.',
  },
  rear_wheel: {
    name: 'Rear wheel',
    tag: 'Chassis',
    desc: 'Supports the rear of the bike, transmits engine torque to the road, and carries the rear brake disc.',
  },
};
const PART_ORDER = [
  // Engine internals first (match the stage)
  'piston', 'conrod', 'crankshaft', 'spark_plug',
  'valve_in', 'valve_ex', 'port_ex', 'port_tr',
  'cylinder', 'engine',
  // Fuel path
  'carb', 'air_filter', 'fuel_tank',
  'exhaust',
  // Electrical / rider
  'battery', 'instruments', 'headlight', 'tail_light', 'seat',
  // Chassis
  'frame', 'forks', 'rear_shock', 'swingarm', 'brake',
  // Transmission + wheels
  'chain', 'rear_sprocket', 'front_wheel', 'rear_wheel',
];

// ───────────────────────── SVG helpers ──────────────────────────
function ns(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function txt(x, y, s, anchor) {
  const t = ns('text', { x, y, fill: '#6B6963', 'font-family': 'IBM Plex Mono, monospace', 'font-size': 11, 'letter-spacing': '0.08em', 'text-anchor': anchor || 'start' });
  t.textContent = s;
  return t;
}

// ───────────────────────── Boot ─────────────────────────────────
if (ROOT) {
  render();
  wireChromeGlobal();
  startLoop();
}
