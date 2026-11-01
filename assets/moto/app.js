/*
 * Under the Engine — motorcycle anatomy explorer (v0.1).
 *
 * Mounts into <div id="ute-root"></div> in /motorcycle-anatomy.html.
 *
 * Scope (first delivery):
 *   • 4-stroke OR 2-stroke mode (toggle)
 *   • Animated engine cross-section: piston, con-rod, crank, valves (4T)
 *     or ports (2T), spark flash, cylinder shading per stroke
 *   • Timing strip showing current crank angle on the 720° / 360° cycle
 *   • Parameters: RPM, bore (mm), stroke (mm), compression ratio
 *   • Computed outputs: displacement cc, approx peak torque / power
 *   • Exploded motorcycle diagram with clickable callouts
 *
 * Light theme only. Sharp edges, 1 px rules, IBM Plex Sans + Mono.
 * Electric motor mode is the next release.
 */

const ROOT = document.getElementById('ute-root');

const ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

// ───────────────────────── State ────────────────────────────────
const S = {
  mode: '4t',            // '4t' | '2t'
  running: true,
  rpm: 2400,             // display RPM; drives the animation speed
  bore_mm: 72,
  stroke_mm: 58,
  compression: 10.5,
  crank_deg: 0,          // 0..720 for 4T; 0..360 for 2T
  selected_part: null,   // key into PARTS
  last_tick_ms: 0,
};

// Boot block is at the end of the file so every helper (including
// PARTS / PART_ORDER) is in scope before render() first runs.

// ───────────────────────── Render ────────────────────────────────
function render() {
  ROOT.innerHTML = shellHTML();
  mountEngineSVG();
  mountExplodedSVG();
  wireControls();
  updateReadouts();
}

function shellHTML() {
  const cycleDeg = (S.mode === '4t') ? 720 : 360;
  const part = S.selected_part ? PARTS[S.selected_part] : null;
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

    <div class="ute-bench">
      <aside class="ute-col ute-col-left">
        <section class="ute-panel">
          <div class="ute-panel-h"><span class="ute-label">Running</span></div>
          <div class="ute-run">
            <button type="button" data-run="toggle">${S.running?'Pause':'Play'}</button>
            <button type="button" data-run="step">Step +30°</button>
          </div>
          <p style="margin-top:8px;">Space bar toggles play/pause. The animation is slowed about 60× below real-time so the stroke sequence stays legible.</p>
        </section>
        <section class="ute-panel">
          <div class="ute-panel-h"><span class="ute-label">Parameters</span></div>
          ${slider('rpm',        'Engine speed',       600, 10000, 50,  S.rpm,        'rpm')}
          ${slider('bore_mm',    'Bore',               40,  110,   1,   S.bore_mm,    'mm')}
          ${slider('stroke_mm',  'Stroke',             40,  110,   1,   S.stroke_mm,  'mm')}
          ${slider('compression','Compression ratio',  6,   14,    0.1, S.compression,':1')}
        </section>
        <section class="ute-panel">
          <div class="ute-panel-h"><span class="ute-label">Click a part</span></div>
          <ul class="ute-parts" id="ute-parts-list">
            ${partsList()}
          </ul>
        </section>
      </aside>

      <main class="ute-col ute-col-stage">
        <div class="ute-stage" id="ute-stage">
          <svg class="ute-engine-svg" id="ute-engine" viewBox="0 0 900 720" preserveAspectRatio="xMidYMid meet" aria-label="Engine cross-section"></svg>
          <div class="ute-timing" aria-label="Cycle timing">
            <div class="ute-timing-track" id="ute-timing-track">
              ${timingSegmentsHTML()}
              <div class="ute-timing-needle" id="ute-timing-needle" style="left:0%;"></div>
            </div>
          </div>
          <div class="ute-stage-caption" id="ute-caption">
            <span class="ute-label">Current stroke</span>
            <p id="ute-caption-body">Press play to run the engine.</p>
          </div>
          <div class="ute-stage-hint">Drag the sliders · click a part · press ? for help</div>
        </div>
      </main>

      <aside class="ute-col ute-col-right">
        <section class="ute-panel">
          <div class="ute-panel-h">
            <span class="ute-label">Cycle</span>
            <span class="ute-stroke-badge" id="ute-stroke-badge" data-s="intake">Intake</span>
          </div>
          <p id="ute-stroke-body">The animation walks the piston through the ${S.mode==='4t'?'four-stroke':'two-stroke'} cycle. Watch the valves ${S.mode==='4t'?'open and close':'and ports uncovered by the piston'} as the crank turns.</p>
        </section>
        <section class="ute-panel">
          <div class="ute-panel-h"><span class="ute-label">Computed outputs</span></div>
          <div class="ute-reads" id="ute-reads">
            ${readoutsHTML()}
          </div>
          <p style="margin-top:10px;">Educational estimates for a naturally-aspirated single cylinder at a BMEP of ~10 bar (4T) or ~8 bar (2T). Not a dyno trace.</p>
        </section>
      </aside>
    </div>

    <section class="ute-exploded">
      <div class="ute-exploded-head">
        <h2>The whole motorcycle</h2>
        <p>Side-view with the parts you need to make a petrol motorcycle actually move. Click a label to read what it does.</p>
      </div>
      <svg class="ute-moto-svg" id="ute-moto" viewBox="0 0 1200 480" preserveAspectRatio="xMidYMid meet" aria-label="Motorcycle exploded view"></svg>
      ${part ? partDetailHTML(part) : ''}
    </section>

    <footer class="ute-foot">
      <span>Under the Engine · v0.1 · ${S.mode==='4t'?'Four-stroke':'Two-stroke'} mode · Transitions Lab</span>
      <span>Inspired by <a href="https://www.underthehood.online" target="_blank" rel="noopener">underthehood.online</a>. Next release: electric motor + controller.</span>
    </footer>
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
  const keys = PART_ORDER;
  return keys.map((k) => {
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
       {s:'exhaust', from:110, to:180, label:'Exhaust'},
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

function partDetailHTML(p) {
  return `
    <aside class="ute-part-detail" aria-live="polite">
      <div>
        <span class="ute-pd-k">${p.tag}</span>
        <h3>${p.name}</h3>
      </div>
      <p>${p.desc}</p>
    </aside>`;
}

// ───────────────────────── Engine SVG ────────────────────────────
let ENGINE_PATHS = {};

function mountEngineSVG() {
  const svg = ROOT.querySelector('#ute-engine');
  if (!svg) return;
  // Clear
  svg.innerHTML = '';
  // Static chassis (cylinder, head, crankcase, crank circle, labels)
  const g = ns('g', { id: 'ute-engine-g' });
  // Crank circle
  g.appendChild(ns('circle', { cx: 450, cy: 560, r: 70, fill: 'none', stroke: '#B9B3A4', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
  // Crankcase (box)
  g.appendChild(ns('rect', { x: 320, y: 500, width: 260, height: 190, fill: '#EFEAE0', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
  // Cylinder barrel
  g.appendChild(ns('rect', { x: 400, y: 180, width: 100, height: 340, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
  // Cooling fins (left + right)
  for (let i = 0; i < 7; i++) {
    g.appendChild(ns('line', { x1: 380, y1: 220 + i*35, x2: 400, y2: 220 + i*35, stroke: '#0A0A0A', 'stroke-width': 1 }));
    g.appendChild(ns('line', { x1: 500, y1: 220 + i*35, x2: 520, y2: 220 + i*35, stroke: '#0A0A0A', 'stroke-width': 1 }));
  }
  // Head
  g.appendChild(ns('path', { d: 'M 395 180 L 395 110 Q 395 90 415 90 L 485 90 Q 505 90 505 110 L 505 180 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
  // Spark plug stem
  g.appendChild(ns('rect', { x: 440, y: 50, width: 20, height: 50, fill: '#B9B3A4', stroke: '#0A0A0A' }));
  g.appendChild(ns('rect', { x: 437, y: 40, width: 26, height: 10, fill: '#2A2A26' }));

  // In-cylinder gas fill (updates per frame)
  const gas = ns('rect', { id: 'ute-gas', x: 402, y: 180, width: 96, height: 300, fill: '#D8E3F0', opacity: 0.65 });
  g.appendChild(gas);

  if (S.mode === '4t') {
    // Valve ports (intake left, exhaust right)
    g.appendChild(ns('rect', { x: 410, y: 100, width: 30, height: 80, fill: 'none', stroke: '#0A0A0A' }));
    g.appendChild(ns('rect', { x: 460, y: 100, width: 30, height: 80, fill: 'none', stroke: '#0A0A0A' }));
    // Intake runner (left)
    g.appendChild(ns('path', { d: 'M 410 140 L 350 130 L 350 100 L 310 100', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    // Exhaust runner (right)
    g.appendChild(ns('path', { d: 'M 490 140 L 550 130 L 550 100 L 590 100', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    // Valves (updated per frame)
    g.appendChild(ns('rect', { id: 'ute-valve-in', x: 408, y: 170, width: 34, height: 10, fill: '#2A2A26' }));
    g.appendChild(ns('rect', { id: 'ute-valve-ex', x: 458, y: 170, width: 34, height: 10, fill: '#2A2A26' }));
    // Labels
    g.appendChild(txt(300, 95, 'INTAKE', 'start'));
    g.appendChild(txt(600, 95, 'EXHAUST', 'end'));
  } else {
    // 2-stroke: ports in the cylinder wall
    // Exhaust port on the right wall, transfer port on the left wall
    g.appendChild(ns('rect', { id: 'ute-port-ex', x: 490, y: 430, width: 20, height: 50, fill: '#7A6E60', stroke: '#0A0A0A' }));
    g.appendChild(ns('rect', { id: 'ute-port-tr', x: 390, y: 440, width: 20, height: 50, fill: '#3E6FB7', stroke: '#0A0A0A' }));
    // Exhaust pipe runner
    g.appendChild(ns('path', { d: 'M 510 455 L 580 455 L 580 420 L 620 420', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    // Transfer port runner from crankcase up
    g.appendChild(ns('path', { d: 'M 390 465 L 340 465 L 340 580 L 320 580', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
    // Reed valve box at crankcase intake
    g.appendChild(ns('rect', { x: 260, y: 560, width: 60, height: 36, fill: '#FFFFFF', stroke: '#0A0A0A' }));
    g.appendChild(ns('path', { d: 'M 260 568 L 270 578 L 260 588', fill: 'none', stroke: '#0A0A0A' }));
    g.appendChild(txt(255, 548, 'REED / CARB', 'end'));
    g.appendChild(txt(625, 415, 'EXHAUST', 'start'));
    g.appendChild(txt(410, 428, 'TRANSFER', 'end'));
  }

  // Piston (updated per frame)
  g.appendChild(ns('rect', { id: 'ute-piston', x: 402, y: 380, width: 96, height: 70, fill: '#D8D4CA', stroke: '#0A0A0A', 'stroke-width': 1.5 }));
  // Piston rings
  g.appendChild(ns('line', { id: 'ute-ring-1', x1: 402, y1: 390, x2: 498, y2: 390, stroke: '#0A0A0A' }));
  g.appendChild(ns('line', { id: 'ute-ring-2', x1: 402, y1: 395, x2: 498, y2: 395, stroke: '#0A0A0A' }));

  // Connecting rod (updated per frame)
  g.appendChild(ns('line', { id: 'ute-conrod', x1: 450, y1: 440, x2: 450, y2: 560, stroke: '#0A0A0A', 'stroke-width': 4 }));

  // Crank throw (updated per frame)
  g.appendChild(ns('circle', { id: 'ute-crankpin', cx: 450, cy: 560, r: 8, fill: '#0A0A0A' }));
  g.appendChild(ns('circle', { cx: 450, cy: 560, r: 3, fill: '#F6F5F2' }));
  // Flywheel outline
  g.appendChild(ns('circle', { cx: 450, cy: 560, r: 86, fill: 'none', stroke: '#0A0A0A' }));
  g.appendChild(ns('circle', { cx: 450, cy: 560, r: 4, fill: '#0A0A0A' }));

  // Spark plug electrode (updated per frame)
  g.appendChild(ns('line', { id: 'ute-spark', x1: 450, y1: 100, x2: 450, y2: 115, stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('circle', { id: 'ute-spark-flash', cx: 450, cy: 118, r: 0, fill: '#E2A93B' }));

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
  };
}

function updateEngineSVG() {
  if (!ENGINE_PATHS.piston) return;
  const cycle = (S.mode === '4t') ? 720 : 360;
  // Crank angle on the shaft (0..360). For 4T, deg within the full cycle is 0..720 but shaft runs twice.
  const shaftDeg = S.crank_deg % 360;
  const theta = shaftDeg * Math.PI / 180;
  const crankR = 70;
  const centreX = 450, centreY = 560;
  const pinX = centreX + crankR * Math.cos(theta - Math.PI/2);
  const pinY = centreY + crankR * Math.sin(theta - Math.PI/2);
  // Con-rod length relative to stroke for the drawing (just visual).
  const rodLen = 180;
  // Piston pin Y: directly above pin along the cylinder axis (vertical).
  const pistonPinY = centreY - Math.sqrt(rodLen*rodLen - Math.pow(pinX - centreX, 2));
  const pistonTopY = pistonPinY - 60;

  // Clamp piston within cylinder
  const topBound = 180, bottomBound = 420;
  const pistonY = Math.max(topBound, Math.min(bottomBound, pistonTopY));

  ENGINE_PATHS.piston.setAttribute('y', pistonY);
  ENGINE_PATHS.ring1.setAttribute('y1', pistonY + 10); ENGINE_PATHS.ring1.setAttribute('y2', pistonY + 10);
  ENGINE_PATHS.ring2.setAttribute('y1', pistonY + 15); ENGINE_PATHS.ring2.setAttribute('y2', pistonY + 15);
  ENGINE_PATHS.conrod.setAttribute('x1', 450); ENGINE_PATHS.conrod.setAttribute('y1', pistonY + 60);
  ENGINE_PATHS.conrod.setAttribute('x2', pinX); ENGINE_PATHS.conrod.setAttribute('y2', pinY);
  ENGINE_PATHS.crankpin.setAttribute('cx', pinX); ENGINE_PATHS.crankpin.setAttribute('cy', pinY);

  // In-cylinder gas: top of gas is the head bottom (y=180), bottom of gas is the piston top.
  ENGINE_PATHS.gas.setAttribute('y', 180);
  ENGINE_PATHS.gas.setAttribute('height', Math.max(2, pistonY - 180));

  // Determine current stroke based on crank angle
  const strokeInfo = currentStroke(S.crank_deg, S.mode);
  // Gas colour follows the stroke
  const gasFill = {
    'intake': '#D8E3F0',     // light blue — fresh charge
    'compression': '#DAD3C1',// warm cream — compressing
    'power': '#F2CDB9',       // orange — combustion
    'exhaust': '#D7D1C4',    // grey — spent gas
    'scavenge': '#D8E3F0',   // light blue — fresh charge pushing out exhaust
  }[strokeInfo.s] || '#D8E3F0';
  ENGINE_PATHS.gas.setAttribute('fill', gasFill);

  if (S.mode === '4t') {
    // 4T valves: lift when their stroke is active, fully seated otherwise.
    const vi = (strokeInfo.s === 'intake')  ? 10 : 0;
    const ve = (strokeInfo.s === 'exhaust') ? 10 : 0;
    ENGINE_PATHS.valveIn.setAttribute('y', 170 + vi);
    ENGINE_PATHS.valveEx.setAttribute('y', 170 + ve);
  } else {
    // 2T: ports are uncovered when the piston drops below them.
    // Port top-edges in SVG coords: exhaust at y≈430, transfer at y≈440.
    // Piston TOP at `pistonY`; port is uncovered if piston top is above (less than) its top edge.
    const exUncovered = (pistonY + 60) > 430;  // piston bottom edge below port top
    const trUncovered = (pistonY + 60) > 440;
    ENGINE_PATHS.portEx.setAttribute('fill-opacity', exUncovered ? 1 : 0.25);
    ENGINE_PATHS.portTr.setAttribute('fill-opacity', trUncovered ? 1 : 0.25);
  }

  // Spark flash around ignition
  const sparkDeg = (S.mode === '4t') ? 360 : 0;  // TDC after compression
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
}

function currentStroke(deg, mode) {
  if (mode === '4t') {
    if (deg < 180) return { s:'intake', label:'Intake', caption:'Piston descends with the intake valve open. Fresh air–fuel charge rushes in.' };
    if (deg < 360) return { s:'compression', label:'Compression', caption:'Both valves shut. The piston rises and compresses the charge.' };
    if (deg < 540) return { s:'power', label:'Power', caption:'Spark fires near top-dead-centre. The expanding gas drives the piston down. This is the only stroke that does work.' };
    return { s:'exhaust', label:'Exhaust', caption:'Exhaust valve opens. Rising piston pushes burnt gas out.' };
  }
  // 2T
  if (deg < 110) return { s:'power', label:'Power', caption:'Spark fires at TDC. Expanding gas pushes the piston down. Fresh charge below in the crankcase is being compressed.' };
  if (deg < 180) return { s:'exhaust', label:'Blowdown', caption:'Piston uncovers the exhaust port. Burnt gas blows down before the transfer port opens.' };
  if (deg < 230) return { s:'scavenge', label:'Scavenge', caption:'Transfer port opens. Fresh charge from the crankcase sweeps up into the cylinder, pushing out remaining exhaust.' };
  return { s:'compression', label:'Compression', caption:'Piston rises past the ports. Fresh charge is compressed above the piston; a new charge is drawn into the crankcase through the reed valve.' };
}

// ───────────────────────── Motorcycle SVG ────────────────────────
function mountExplodedSVG() {
  const svg = ROOT.querySelector('#ute-moto');
  if (!svg) return;
  svg.innerHTML = '';
  const g = ns('g', { id: 'ute-moto-g' });

  // Front wheel
  g.appendChild(ns('circle', { cx: 240, cy: 360, r: 90, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('circle', { cx: 240, cy: 360, r: 40, fill: 'none', stroke: '#0A0A0A' }));
  // Rear wheel
  g.appendChild(ns('circle', { cx: 960, cy: 360, r: 90, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('circle', { cx: 960, cy: 360, r: 40, fill: 'none', stroke: '#0A0A0A' }));
  // Front disc + caliper
  g.appendChild(ns('circle', { cx: 240, cy: 360, r: 55, fill: 'none', stroke: '#0A0A0A', 'stroke-dasharray': '2 3' }));
  g.appendChild(ns('rect', { x: 275, y: 345, width: 20, height: 30, fill: '#0A0A0A' }));
  // Forks
  g.appendChild(ns('line', { x1: 290, y1: 230, x2: 240, y2: 350, stroke: '#0A0A0A', 'stroke-width': 6 }));
  g.appendChild(ns('line', { x1: 290, y1: 230, x2: 240, y2: 350, stroke: '#B9B3A4', 'stroke-width': 2 }));
  // Headlight
  g.appendChild(ns('circle', { cx: 310, cy: 240, r: 30, fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2 }));
  g.appendChild(ns('circle', { cx: 310, cy: 240, r: 10, fill: '#E2A93B' }));
  // Handlebar
  g.appendChild(ns('line', { x1: 310, y1: 220, x2: 400, y2: 180, stroke: '#0A0A0A', 'stroke-width': 3 }));
  g.appendChild(ns('line', { x1: 400, y1: 180, x2: 430, y2: 175, stroke: '#0A0A0A', 'stroke-width': 3 }));
  // Instrument
  g.appendChild(ns('rect', { x: 400, y: 160, width: 50, height: 30, fill: '#FFFFFF', stroke: '#0A0A0A' }));
  // Frame top tube
  g.appendChild(ns('path', { d: 'M 350 240 L 500 220 L 700 220 L 800 260', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 5 }));
  // Fuel tank
  g.appendChild(ns('path', { d: 'M 490 240 L 560 215 L 700 215 L 710 250 L 500 265 Z', fill: '#F6F5F2', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Air filter / airbox
  g.appendChild(ns('rect', { x: 540, y: 300, width: 70, height: 45, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Carburetor / EFI
  g.appendChild(ns('rect', { x: 610, y: 310, width: 40, height: 30, fill: '#B9B3A4', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Engine block (links to the cross-section)
  g.appendChild(ns('rect', { x: 540, y: 345, width: 170, height: 110, fill: '#EFEAE0', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Cylinder sticking up out of the engine
  g.appendChild(ns('rect', { x: 605, y: 275, width: 50, height: 70, fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': 2 }));
  for (let i = 0; i < 4; i++) {
    g.appendChild(ns('line', { x1: 595, y1: 285 + i*15, x2: 605, y2: 285 + i*15, stroke: '#0A0A0A' }));
    g.appendChild(ns('line', { x1: 655, y1: 285 + i*15, x2: 665, y2: 285 + i*15, stroke: '#0A0A0A' }));
  }
  // Exhaust header + muffler
  g.appendChild(ns('path', { d: 'M 710 400 L 820 410 L 920 400', fill: 'none', stroke: '#0A0A0A', 'stroke-width': 7 }));
  g.appendChild(ns('rect', { x: 870, y: 365, width: 120, height: 50, fill: '#DDD9CF', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Seat
  g.appendChild(ns('path', { d: 'M 720 220 L 840 220 L 870 245 L 740 255 Z', fill: '#2A2A26', stroke: '#0A0A0A', 'stroke-width': 2 }));
  // Rear shock
  g.appendChild(ns('line', { x1: 800, y1: 260, x2: 900, y2: 360, stroke: '#C2502A', 'stroke-width': 4 }));
  // Swingarm
  g.appendChild(ns('line', { x1: 710, y1: 410, x2: 960, y2: 360, stroke: '#0A0A0A', 'stroke-width': 5 }));
  // Chain (drive)
  g.appendChild(ns('line', { x1: 710, y1: 420, x2: 960, y2: 390, stroke: '#B9B3A4', 'stroke-width': 2, 'stroke-dasharray': '4 2' }));
  g.appendChild(ns('circle', { cx: 710, cy: 420, r: 14, fill: '#FFFFFF', stroke: '#0A0A0A' }));
  g.appendChild(ns('circle', { cx: 960, cy: 390, r: 22, fill: '#FFFFFF', stroke: '#0A0A0A' }));
  // Battery
  g.appendChild(ns('rect', { x: 735, y: 265, width: 50, height: 30, fill: '#F6F5F2', stroke: '#0A0A0A' }));
  // Rear light
  g.appendChild(ns('rect', { x: 850, y: 230, width: 20, height: 10, fill: '#C2502A', stroke: '#0A0A0A' }));

  // Callouts: each is a short line + dot + label
  const callouts = [
    { key: 'headlight',    x1: 310, y1: 240, x2: 240, y2: 110, label: 'Headlight' },
    { key: 'instruments',  x1: 425, y1: 175, x2: 400, y2: 110, label: 'Instruments' },
    { key: 'fuel_tank',    x1: 600, y1: 230, x2: 580, y2: 110, label: 'Fuel tank' },
    { key: 'air_filter',   x1: 575, y1: 320, x2: 560, y2: 110, label: 'Air filter' },
    { key: 'carb',         x1: 630, y1: 320, x2: 740, y2: 110, label: 'Carb / EFI' },
    { key: 'cylinder',     x1: 630, y1: 290, x2: 920, y2: 110, label: 'Cylinder (zoom)' },
    { key: 'engine',       x1: 620, y1: 420, x2: 500, y2: 465, label: 'Engine block' },
    { key: 'exhaust',      x1: 920, y1: 390, x2: 1090, y2: 300, label: 'Exhaust' },
    { key: 'battery',      x1: 760, y1: 275, x2: 1080, y2: 160, label: 'Battery' },
    { key: 'seat',         x1: 800, y1: 230, x2: 1000, y2: 100, label: 'Seat' },
    { key: 'rear_shock',   x1: 850, y1: 300, x2: 1150, y2: 230, label: 'Rear shock' },
    { key: 'swingarm',     x1: 835, y1: 390, x2: 1050, y2: 465, label: 'Swingarm' },
    { key: 'chain',        x1: 840, y1: 410, x2: 880, y2: 465, label: 'Chain' },
    { key: 'rear_sprocket',x1: 960, y1: 410, x2: 1140, y2: 465, label: 'Rear sprocket' },
    { key: 'rear_wheel',   x1: 1030,y1: 405, x2: 1170, y2: 405, label: 'Rear wheel' },
    { key: 'brake',        x1: 285, y1: 360, x2: 90,   y2: 420, label: 'Brake disc' },
    { key: 'forks',        x1: 270, y1: 280, x2: 120,  y2: 300, label: 'Forks' },
    { key: 'front_wheel',  x1: 180, y1: 360, x2: 50,   y2: 360, label: 'Front wheel' },
    { key: 'frame',        x1: 460, y1: 240, x2: 300,  y2: 180, label: 'Frame' },
    { key: 'tail_light',   x1: 860, y1: 235, x2: 1140, y2: 100, label: 'Tail light' },
  ];
  const gc = ns('g', { id: 'ute-callouts' });
  callouts.forEach((c) => {
    const grp = ns('g', { class: 'ute-callout' + (S.selected_part === c.key ? ' is-on' : ''), 'data-part': c.key });
    grp.appendChild(ns('line', { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, stroke: '#0A0A0A', 'stroke-width': 1 }));
    grp.appendChild(ns('circle', { class: 'ute-callout-dot', cx: c.x1, cy: c.y1, r: 4, fill: '#F6F5F2', stroke: '#0A0A0A' }));
    const anchor = (c.x2 < 300 || c.x2 > 1050) ? ((c.x2 > c.x1) ? 'start' : 'end') : 'middle';
    const dy = (c.y2 < c.y1) ? -8 : 14;
    const label = ns('text', { class: 'ute-callout-label', x: c.x2, y: c.y2 + dy, 'text-anchor': anchor });
    label.textContent = c.label.toUpperCase();
    grp.appendChild(label);
    gc.appendChild(grp);
  });
  g.appendChild(gc);

  svg.appendChild(g);
}

// ───────────────────────── Chrome + events ──────────────────────
function wireChrome() {
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
  // Play/pause (top-right tool)
  const rt = ROOT.querySelector('.ute-run-toggle');
  if (rt) rt.addEventListener('click', toggleRun);
  // Help button opens a short modal in the console for now (minimal)
  const h = ROOT.querySelector('.ute-help');
  if (h) h.addEventListener('click', openHelp);
  // Space bar play/pause
  if (!document.__uteKeys) {
    document.__uteKeys = true;
    document.addEventListener('keydown', (ev) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || '')) return;
      if (ev.key === ' ') { ev.preventDefault(); toggleRun(); }
      else if (ev.key === '?' || ev.key === '/') { openHelp(); }
    });
  }
}

function wireControls() {
  // Parameter sliders
  ROOT.querySelectorAll('input[type="range"][data-param]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const key = inp.getAttribute('data-param');
      S[key] = parseFloat(inp.value);
      // Update value label without a full re-render
      const span = ROOT.querySelector(`[data-param-value="${key}"]`);
      if (span) {
        const v = S[key];
        const step = parseFloat(inp.getAttribute('step')) || 1;
        span.textContent = (step < 1) ? v.toFixed(1) : Math.round(v).toLocaleString('en-GB');
      }
      updateReadouts();
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
    b.addEventListener('click', () => {
      const key = b.getAttribute('data-part');
      S.selected_part = (S.selected_part === key) ? null : key;
      render();
    });
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
    'Under the Engine — v0.1',
    '',
    '• Toggle 4-stroke / 2-stroke in the top bar.',
    '• Drag the sliders to change RPM, bore, stroke and compression.',
    '• Click a part in the left list, or any callout on the motorcycle below, to read what it does.',
    '• Space bar pauses / resumes the animation; Step +30° nudges the crank by hand.',
    '',
    'Readouts (displacement, torque, power) are educational estimates for a naturally-aspirated single at a BMEP of 10 bar (4T) or 8 bar (2T). Not a dyno trace.',
    '',
    'Next release: electric mode (motor + controller) so you can compare the two drivetrains side by side.',
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
    // At the engine's RPM we rotate the crank shaft N times per minute.
    // That is 360 * N / 60 degrees per second on the shaft.
    // Slow the animation 60× so the stroke sequence is legible.
    const shaftDegPerSec = (360 * S.rpm / 60) / 60;
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
  // BMEP-based estimate: T = BMEP * V / (2π · r)
  // Use representative BMEPs: 10 bar (4T), 8 bar (2T) at the peak-torque point.
  // Adjust very slightly for compression ratio (more CR → higher BMEP, mild).
  const base = (mode === '4t') ? 10 : 8;
  const bmep_bar = base * (1 + 0.03 * (cr - 10));
  const bmep_pa = bmep_bar * 1e5;
  const V = disp_cc * 1e-6;         // m³
  const nR = (mode === '4t') ? 2 : 1;   // crank revolutions per cycle
  // T = BMEP · V / (2π · nR). For a 2-stroke, nR=1 (one power stroke per revolution).
  return bmep_pa * V / (2 * Math.PI * nR);
}

// ───────────────────────── Parts data ────────────────────────────
const PARTS = {
  cylinder: {
    name: 'Cylinder',
    tag: 'Combustion',
    desc: 'The sealed tube inside which the piston slides. Combustion happens between the piston crown and the cylinder head above it. In an air-cooled engine, the outside of the cylinder is finned to shed heat.',
  },
  engine: {
    name: 'Engine block',
    tag: 'Combustion',
    desc: 'The casting that holds the cylinder, crankshaft and transmission. On most motorcycles the engine is a stressed member of the chassis, so the frame bolts directly to it.',
  },
  carb: {
    name: 'Carburetor / fuel injector',
    tag: 'Fuel',
    desc: 'Meters fuel into the incoming air. A carburetor uses a venturi to pull fuel in by suction; an injector sprays measured fuel electronically. Both deliver the air–fuel ratio the engine needs.',
  },
  air_filter: {
    name: 'Air filter',
    tag: 'Fuel',
    desc: 'Removes dust and grit from the incoming air before it reaches the cylinder. A blocked filter starves the engine and richens the mixture.',
  },
  fuel_tank: {
    name: 'Fuel tank',
    tag: 'Fuel',
    desc: 'Reservoir of petrol between you and the engine. Gravity-fed on simple bikes, pump-fed on fuel-injected ones.',
  },
  cylinder_cross: {
    name: 'Spark plug',
    tag: 'Ignition',
    desc: 'Fires a short electric arc across its electrode at the exact moment the piston is near top-dead-centre on the compression stroke. The spark ignites the compressed charge and starts the power stroke.',
  },
  cylinder: {
    name: 'Cylinder',
    tag: 'Combustion',
    desc: 'The sealed tube inside which the piston slides. Combustion happens between the piston crown and the cylinder head above it. In an air-cooled engine, the outside of the cylinder is finned to shed heat.',
  },
  exhaust: {
    name: 'Exhaust',
    tag: 'Gas path',
    desc: 'Carries burnt gas away from the cylinder. On a two-stroke the exhaust is tuned (an "expansion chamber") so pressure waves help scavenge the cylinder; on a four-stroke the exhaust is a simpler pipe plus a muffler.',
  },
  battery: {
    name: 'Battery',
    tag: 'Electrical',
    desc: 'Stores enough charge to turn the starter motor and run the lights before the alternator takes over. On very simple bikes with a kick-start there may be no battery at all.',
  },
  instruments: {
    name: 'Instruments',
    tag: 'Rider',
    desc: 'Speedometer, tachometer (RPM) and warning lights. Modern bikes bundle these into one LCD or TFT panel.',
  },
  headlight: {
    name: 'Headlight',
    tag: 'Rider',
    desc: 'Front lighting. Drawn from the battery; on older bikes it is driven directly from the alternator and only works when the engine is running.',
  },
  tail_light: {
    name: 'Tail light',
    tag: 'Rider',
    desc: 'Rear position and brake light.',
  },
  seat: {
    name: 'Seat',
    tag: 'Rider',
    desc: 'Where the rider sits. Not just comfort: seat height sets how much of the rider\'s weight the chassis has to control under braking and acceleration.',
  },
  frame: {
    name: 'Frame',
    tag: 'Chassis',
    desc: 'The structural backbone of the motorcycle. Modern frames use the engine as a stressed member, with steel tubes or aluminium beams wrapping around it.',
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
    desc: 'The large sprocket bolted to the rear wheel. The ratio between the small output sprocket at the gearbox and this one sets the final drive gearing.',
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
  'engine', 'cylinder', 'carb', 'air_filter', 'fuel_tank', 'exhaust',
  'battery', 'instruments', 'headlight', 'tail_light',
  'seat', 'frame', 'forks', 'rear_shock', 'swingarm', 'brake',
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
  wireChrome();
  startLoop();
}
