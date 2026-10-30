/*
 * Strata v0.2 — web app.
 *
 * Mounts into <div id="strata-root"></div> in strata-demo.html.
 * Imports the shared pure functions from ./core.js (same file used
 * by the pipeline, with its own self-tests).
 *
 * Views (hash routing):
 *   #map                 Home: map + left panel + optional site detail
 *   #site-<id>           Open a site card
 *   #compare             Full sortable table across all sites
 *   #method              Rendered method page
 *   #data                Rendered data sources page
 *   #about               Rendered about page
 *
 * Data: static JSON in /assets/strata/data (config, sites, context,
 * timeseries, lifecycle, community). Live Sentinel-2 reading needs a
 * pipeline that the demo does not run; the live panel on each site
 * card shows an informative empty state and sends the reader to the
 * Method page.
 */

import {
  DEFAULTS,
  CLASS,
  recoveryClock,
  lifecycleStage,
  crmaExportRow,
  STAGE_LABEL,
  round,
  searchScenes,
  itemEpsg,
  readBands,
  computeIndexRasters,
  classifyPixels,
  validMask,
  fractionValid,
  summarise,
  geometryBbox,
  expandLonLatBbox,
  lonLatBboxToUtm,
  geometryToPixelRings,
  rasterisePolygon,
  ringMask,
  trueColourRGBA,
  classRGBA,
} from './core.js';

// Palette for the class map (follows CLAUDE.md).
const CLASS_COLOURS = {
  [CLASS.INVALID]:    [0, 0, 0],
  [CLASS.VEGETATION]: [29, 107, 85],
  [CLASS.BARE]:       [207, 198, 180],
  [CLASS.BARE_IRON]:  [194, 80, 42],
  [CLASS.WATER]:      [47, 111, 159],
  [CLASS.RED_WATER]:  [226, 169, 59],
  [CLASS.OTHER]:      [142, 138, 128],
};
const CLASS_LABELS = {
  [CLASS.VEGETATION]: 'Vegetation',
  [CLASS.BARE]:       'Bare ground',
  [CLASS.BARE_IRON]:  'Bare ground, iron signal',
  [CLASS.WATER]:      'Water',
  [CLASS.RED_WATER]:  'Red or orange water',
  [CLASS.OTHER]:      'Other surface',
};

const ROOT = document.getElementById('strata-root');
if (ROOT) boot();

// ───────────────────────── State ────────────────────────────────
const S = {
  config: null,
  sites: [],              // GeoJSON features
  timeseries: {},         // id -> { polygon:[...], ring:[...] }
  context: {},            // id -> { ... }
  europe: [],             // list of {a3, a2, name, d} for the basemap
  // Interaction
  view: 'map',            // 'map' | 'compare' | 'method' | 'data' | 'about'
  selected: null,         // site id
  filters: { q: '', country: new Set(), stage: new Set(), flag: new Set(), pilot: new Set() },
};

// ───────────────────────── Boot ─────────────────────────────────
async function boot() {
  await loadAll();
  render();
  wireRoute();
  wireChrome();
}

async function loadAll() {
  const base = '/assets/strata/data/';
  const [cfg, sites, europe] = await Promise.all([
    fetchJson(base + 'config.json'),
    fetchJson(base + 'sites.geojson'),
    loadEuropeGeo(),
  ]);
  S.config = cfg;
  S.sites = (sites.features || []).map(sortedFeature);
  S.europe = europe;
  // Parallel load timeseries + context for every site.
  await Promise.all(S.sites.map(async (f) => {
    const id = f.properties.id;
    S.timeseries[id] = await fetchJson(`${base}timeseries/${id}.json`).catch(() => ({ polygon: [], ring: [] }));
    S.context[id] = await fetchJson(`${base}context/${id}.json`).catch(() => ({}));
  }));
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function loadEuropeGeo() {
  // The lab already ships the simplified country geojson used by the
  // earlier Strata demo. Reuse it. It assigns to window.STRATA_EUROPE_GEO
  // when loaded as a classic script.
  if (window.STRATA_EUROPE_GEO) return window.STRATA_EUROPE_GEO;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = '/assets/strata-europe-geo.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.STRATA_EUROPE_GEO || [];
}

function sortedFeature(f) { return f; }

// ───────────────────────── Router ───────────────────────────────
function wireRoute() {
  window.addEventListener('hashchange', applyHash);
  applyHash();
}

function applyHash() {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw || raw === 'map') { S.view = 'map'; S.selected = null; }
  else if (raw.startsWith('site-')) { S.view = 'map'; S.selected = raw.slice(5).toUpperCase(); }
  else if (['compare','method','data','about'].includes(raw)) { S.view = raw; S.selected = null; }
  else { S.view = 'map'; S.selected = null; }
  render();
}

function go(hash) { location.hash = hash; }

// ───────────────────────── Rendering ────────────────────────────
function render() {
  ROOT.innerHTML = shellHTML() + currentViewHTML();
  // One-time post-render wiring: redo these for every render since
  // we blow the DOM away each time.
  wireChrome();
  if (S.view === 'map') afterMapRender();
}

function shellHTML() {
  const banner = (S.config && S.config.demoBanner !== false)
    ? `<div class="sr-pilot-banner"><strong>Pilot version.</strong> Indicator thresholds are not yet calibrated against hyperspectral or field data; treat values as signals for follow-up, not findings.</div>`
    : '';
  return `
    <header class="sr-topbar">
      <a class="sr-brand" href="#map" aria-label="Strata home">
        ${brandMark(22)}
        <span class="sr-brand-name">Strata</span>
        <span class="sr-brand-sub">Transitions Lab</span>
      </a>
      <nav class="sr-tabs" aria-label="Strata views">
        <a href="#map"     class="${S.view === 'map' ? 'is-current' : ''}">Map</a>
        <a href="#compare" class="${S.view === 'compare' ? 'is-current' : ''}">Compare</a>
        <a href="#method"  class="${S.view === 'method' ? 'is-current' : ''}">Method</a>
        <a href="#data"    class="${S.view === 'data' ? 'is-current' : ''}">Data</a>
        <a href="#about"   class="${S.view === 'about' ? 'is-current' : ''}">About</a>
      </nav>
      <div class="sr-tools">
        <button class="sr-tbtn sr-help" type="button" aria-label="How to use Strata" title="How to use Strata">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>
        </button>
        <button class="sr-tbtn sr-theme" type="button" aria-label="Toggle theme" title="Toggle light/dark">
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          <svg class="icon-sun"  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>
      </div>
    </header>
    ${banner}
    ${onboardingHTML()}
  `;
}

function onboardingHTML() {
  let seen = false;
  try { seen = localStorage.getItem('strata-onboarded') === '2'; } catch (_) {}
  const hiddenAttr = seen ? ' hidden' : '';
  return `
    <div class="sr-onboard" id="sr-onboard"${hiddenAttr} role="dialog" aria-labelledby="sr-onboard-title" aria-modal="false">
      <div class="sr-onboard-card">
        <button class="sr-onboard-close" type="button" aria-label="Close help" data-sr-onboard-close>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
        </button>
        <span class="sr-onboard-kick">Welcome to Strata (v0.2 demo)</span>
        <h2 id="sr-onboard-title">A satellite lifecycle card for every closed mine waste site.</h2>
        <p class="sr-onboard-lead">Each dot on the map is a legacy or operating mine waste site in the pilot. Click one to open its lifecycle card: how big the heap is, what land it covers, how it has changed over ten years, and what each of three pathways (leave, rehabilitate, reprocess) would involve. Everything runs on open Copernicus data.</p>

        <div class="sr-onboard-steps">
          <div class="sr-onboard-step">
            <span class="sr-onboard-num">1</span>
            <div>
              <strong>Click a pin on the map, or any row in the list on the left.</strong><br>
              The right-hand panel opens the site's lifecycle card.
            </div>
          </div>
          <div class="sr-onboard-step">
            <span class="sr-onboard-num">2</span>
            <div>
              <strong>Scroll the card to the "Now from space (live)" panel.</strong><br>
              Hit <em>Load latest Sentinel-2 scene</em>. Your browser fetches the latest clear scene from Earth Search, reads the bands as Cloud-Optimised GeoTIFFs, and classifies every 10 m pixel into vegetation, bare ground, bare with iron signal, water, and red/orange water. Takes 8–20 s.
            </div>
          </div>
          <div class="sr-onboard-step">
            <span class="sr-onboard-num">3</span>
            <div>
              <strong>Export the site as a CRMA Article 27 row.</strong><br>
              Each card has a Download CSV button. The row carries the fields the Member State database needs; the ones Strata cannot measure from space (operator, measured metal content) are left empty, never estimated.
            </div>
          </div>
        </div>

        <span class="sr-onboard-kick">What am I looking at?</span>
        <div class="sr-onboard-legend">
          <span class="sr-onboard-sw"><span class="d" style="background:#111110"></span>Operating</span>
          <span class="sr-onboard-sw"><span class="d" style="background:#E2A93B"></span>Reopening planned</span>
          <span class="sr-onboard-sw"><span class="d" style="background:#C2502A"></span>Legacy, largely bare</span>
          <span class="sr-onboard-sw"><span class="d" style="background:#B9A98C"></span>Legacy, mixed cover</span>
          <span class="sr-onboard-sw"><span class="d" style="background:#1D6B55"></span>Vegetated / recovering</span>
          <span class="sr-onboard-sw"><span class="d" style="background:#C2502A;border-radius:50%;width:8px;height:8px;border:1.5px solid #fff;"></span>Has a flag (follow-up signal)</span>
        </div>

        <div class="sr-onboard-pilot">
          <strong>Pilot register (10 sites).</strong>
          Eight in the Iberian Pyrite Belt (acid-drainage legacy of pyrite-rich sulphide mining in southern Portugal and Spain) and two transfer sites in the Harz (Bollrich tailings pond) and Falun (Sweden). Values are illustrative pending the 2027 pilot run; the "Now from space" panel pulls real Sentinel-2 at any time.
        </div>

        <div class="sr-onboard-actions">
          <button class="sr-abtn sr-abtn-primary" type="button" data-sr-onboard-close>Got it, show me the map &rarr;</button>
          <a class="sr-abtn" href="/strata-method">Read the method</a>
          <a class="sr-abtn" href="/strata-paper">Companion paper</a>
        </div>
      </div>
    </div>
  `;
}

function currentViewHTML() {
  if (S.view === 'compare') return comparePageHTML();
  if (S.view === 'method')  return methodPageHTML();
  if (S.view === 'data')    return dataPageHTML();
  if (S.view === 'about')   return aboutPageHTML();
  return mapPageHTML();
}

// ───────────────────────── Chrome wiring ────────────────────────
function wireChrome() {
  const t = ROOT.querySelector('.sr-theme');
  if (t) t.addEventListener('click', toggleTheme);
  const h = ROOT.querySelector('.sr-help');
  if (h) h.addEventListener('click', () => {
    const ob = ROOT.querySelector('#sr-onboard'); if (ob) ob.hidden = false;
  });
  // Delegated close for the onboarding overlay
  ROOT.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-sr-onboard-close]')) {
      const ob = ROOT.querySelector('#sr-onboard');
      if (ob) ob.hidden = true;
      try { localStorage.setItem('strata-onboarded', '2'); } catch (_) {}
    }
  });
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : (cur === 'light' ? 'dark' : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark'));
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('strata-theme', next); } catch (_) {}
}

// ───────────────────────── Map page ─────────────────────────────
function mapPageHTML() {
  const visible = filteredSites();
  const haTotal = visible.reduce((a, f) => a + (S.context[f.properties.id]?.areaHa || 0), 0);
  const volTotal = visible.reduce((a, f) => a + ((S.context[f.properties.id]?.dem?.volumeAboveBaseM3 || 0) / 1_000_000), 0);
  const flagged = visible.filter((f) => (deriveCard(f).lifecycle.flags || []).length).length;

  const detailHTML = S.selected ? siteDetailHTML(S.selected) : emptyDetailHTML();
  const bodyClass = S.selected ? '' : ' no-detail';
  return `
    <div class="sr-page sr-map-page${bodyClass}">
      <aside class="sr-col sr-col-left">
        <div class="sr-facts">
          <div class="sr-fact"><span class="sr-label">Sites shown</span><span class="sr-n">${visible.length}<span class="sr-unit">/ ${S.sites.length}</span></span></div>
          <div class="sr-fact"><span class="sr-label">Total area</span><span class="sr-n">${fmtHa(haTotal)}<span class="sr-unit">ha</span></span></div>
          <div class="sr-fact"><span class="sr-label">Volume proxy</span><span class="sr-n">${round(volTotal, 1)}<span class="sr-unit">Mm³</span></span></div>
          <div class="sr-fact sr-fact--alert"><span class="sr-label">With flags</span><span class="sr-n">${flagged}</span></div>
        </div>
        <div class="sr-filters">
          <label class="sr-search" aria-label="Search">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input id="sr-q" type="search" placeholder="Search sites, municipality, country" value="${esc(S.filters.q)}">
          </label>
          <div class="sr-filter-group">
            <span class="sr-label sr-filter-label">Country</span>
            <div class="sr-chipset" id="f-country">${chipRow(['PT','ES','DE','SE'], S.filters.country, (v)=>v)}</div>
          </div>
          <div class="sr-filter-group">
            <span class="sr-label sr-filter-label">Lifecycle stage</span>
            <div class="sr-chipset" id="f-stage">${chipRow(
              ['operating','reopening_planned','legacy_bare','legacy_mixed','recovering','vegetated','insufficient_data'],
              S.filters.stage, (v)=>STAGE_LABEL[v])}</div>
          </div>
          <div class="sr-filter-group">
            <span class="sr-label sr-filter-label">Flags</span>
            <div class="sr-chipset" id="f-flag">${chipRow(
              ['new_disturbance','red_water','iron_signal','ground_motion'],
              S.filters.flag, (v)=>v.replace(/_/g,' '))}</div>
          </div>
          <div class="sr-filter-group">
            <span class="sr-label sr-filter-label">Role</span>
            <div class="sr-chipset" id="f-pilot">${chipRow(['pilot','transfer'], S.filters.pilot, (v)=>v)}</div>
          </div>
        </div>
        <div class="sr-list-head">
          <span class="sr-label">Sites <span class="sr-list-count">(${visible.length})</span></span>
        </div>
        <div class="sr-list-wrap">
          <ul class="sr-list">${listRowsHTML(visible)}</ul>
        </div>
      </aside>
      <div class="sr-col sr-col-map">
        <div id="sr-leaflet" class="sr-leaflet"></div>
        <div class="sr-basemap-switch" role="group" aria-label="Base map">
          <button type="button" data-basemap="satellite" class="is-on">Satellite</button>
          <button type="button" data-basemap="street">Street</button>
          <button type="button" data-basemap="terrain">Terrain</button>
        </div>
        <div class="sr-map-legend">
          <span class="sr-label">Lifecycle stage</span>
          <div class="sr-swatches">
            <span class="sr-sw sr-sw--op"><span class="d"></span>Operating</span>
            <span class="sr-sw sr-sw--rp"><span class="d"></span>Reopening planned</span>
            <span class="sr-sw sr-sw--lb"><span class="d"></span>Legacy, largely bare</span>
            <span class="sr-sw sr-sw--lm"><span class="d"></span>Legacy, mixed cover</span>
            <span class="sr-sw sr-sw--rc"><span class="d"></span>Recovering naturally</span>
            <span class="sr-sw sr-sw--vg"><span class="d"></span>Vegetated</span>
            <span class="sr-sw sr-sw--flag"><span class="d"></span>Has a flag</span>
          </div>
        </div>
      </div>
      ${S.selected ? `<aside class="sr-col sr-col-detail">${detailHTML}</aside>` : ''}
    </div>
  `;
}

function emptyDetailHTML() {
  // Rendered only when a site is explicitly closed; otherwise the
  // detail column is omitted from the grid.
  return `
    <div class="sr-detail-empty">
      <h3>Click a site to open its lifecycle card</h3>
      <p>Each site opens on a scrollable page with the baseline year, the latest footprint, a 10-year chart, a <em>Now from space</em> panel that pulls a live Sentinel-2 scene, pathway facts and a CRMA Article 27 CSV export.</p>
    </div>`;
}

function chipRow(values, selectedSet, label) {
  return values.map((v) =>
    `<button class="sr-chip${selectedSet.has(v) ? ' is-on' : ''}" data-val="${esc(v)}"><span class="sr-pill-dot"></span>${esc(label(v))}</button>`
  ).join('');
}

function listRowsHTML(sites) {
  if (!sites.length) return '<li style="padding:20px 18px;color:var(--mute);font-style:italic;">No sites match these filters.</li>';
  const rows = sites.slice().sort((a, b) => {
    const ca = deriveCard(a), cb = deriveCard(b);
    const fa = (ca.lifecycle.flags || []).length, fb = (cb.lifecycle.flags || []).length;
    if (fa !== fb) return fb - fa;
    return (S.context[b.properties.id]?.areaHa || 0) - (S.context[a.properties.id]?.areaHa || 0);
  });
  return rows.map((f) => {
    const p = f.properties;
    const card = deriveCard(f);
    const area = S.context[p.id]?.areaHa || 0;
    const isActive = S.selected === p.id;
    const flags = (card.lifecycle.flags || []).map((x) => x.id.replace(/_/g, ' '));
    const flagsText = flags.join(' · ');
    const metaLine = [p.id, p.municipality || '', p.country].filter(Boolean).join(' · ');
    return `
      <li>
        <button class="sr-site-row${isActive ? ' is-active' : ''}" data-stage="${card.lifecycle.stage}" data-code="${p.id}">
          <span class="sr-stage-bar"></span>
          <span class="sr-site-main">
            <span class="sr-site-name">${esc(p.name)}</span>
            <span class="sr-site-meta">${esc(metaLine)}</span>
            ${flagsText ? `<span class="sr-site-flags">${esc(flagsText)}</span>` : ''}
          </span>
          <span class="sr-site-right">
            <span class="sr-site-area">${fmtHa(area)}<span class="sr-unit">ha</span></span>
            ${flags.length ? `<span class="sr-site-alert">${flags.length} FLAG${flags.length>1?'S':''}</span>` : ''}
          </span>
        </button>
      </li>
    `;
  }).join('');
}

// Leaflet map + ESRI/OSM tile layers. Kept module-level so filter
// changes repaint only the markers.
let L_MAP = null;
let L_MARKERS = new Map();      // site id -> marker
let L_POLYGONS = new Map();     // site id -> polygon layer
let L_BASE_LAYERS = {};
let L_CURRENT_BASE = 'satellite';

function afterMapRender() {
  initLeafletMap();
  paintMarkers();
  wireFilters();
  wireListAndMap();
  wireBasemapSwitch();
}

function initLeafletMap() {
  if (typeof L === 'undefined') {
    console.warn('Leaflet not loaded yet; retrying in 200ms.');
    setTimeout(initLeafletMap, 200);
    return;
  }
  const host = ROOT.querySelector('#sr-leaflet');
  if (!host) return;
  // If we are re-rendering (hash change), destroy the previous map.
  if (L_MAP) { try { L_MAP.remove(); } catch (_) {} L_MAP = null; L_MARKERS.clear(); L_POLYGONS.clear(); L_BASE_LAYERS = {}; }

  L_MAP = L.map(host, {
    worldCopyJump: true, zoomControl: true, attributionControl: true,
    minZoom: 2, maxZoom: 18,
  });

  // Base layers.
  const esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18, attribution: 'Imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community' }
  );
  const esriLabels = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18, pane: 'overlayPane', opacity: 0.9 }
  );
  const osm = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { maxZoom: 19, attribution: '© OpenStreetMap contributors' }
  );
  const terrain = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 13, attribution: 'Terrain: Esri' }
  );

  L_BASE_LAYERS.satellite = L.layerGroup([esriSat, esriLabels]);
  L_BASE_LAYERS.street    = L.layerGroup([osm]);
  L_BASE_LAYERS.terrain   = L.layerGroup([terrain, esriLabels]);
  L_BASE_LAYERS[L_CURRENT_BASE].addTo(L_MAP);

  // Fit to the pilot bbox (or the selected site).
  if (S.selected) {
    const sel = S.sites.find((f) => f.properties.id === S.selected);
    if (sel) {
      const [cx, cy] = centroid(sel.geometry);
      L_MAP.setView([cy, cx], 13);
    } else {
      fitPilotBounds();
    }
  } else {
    fitPilotBounds();
  }
}

function fitPilotBounds() {
  if (!S.sites.length) { L_MAP.setView([42, 2], 4); return; }
  const bounds = L.latLngBounds(S.sites.map((f) => {
    const [cx, cy] = centroid(f.geometry);
    return [cy, cx];
  }));
  L_MAP.fitBounds(bounds.pad(0.4), { animate: false });
}

function paintMarkers() {
  if (!L_MAP) return;
  // Clear existing
  for (const m of L_MARKERS.values()) L_MAP.removeLayer(m);
  for (const g of L_POLYGONS.values()) L_MAP.removeLayer(g);
  L_MARKERS.clear(); L_POLYGONS.clear();

  const visible = new Set(filteredSites().map((f) => f.properties.id));

  for (const f of S.sites) {
    const p = f.properties;
    const [cx, cy] = centroid(f.geometry);
    const area = S.context[p.id]?.areaHa || 0;
    const r = Math.max(8, Math.min(22, 6 + Math.log(1 + area) * 2.5));
    const card = deriveCard(f);
    const stage = card.lifecycle.stage;
    const isActive = S.selected === p.id;
    const dim = !visible.has(p.id);
    const hasFlag = (card.lifecycle.flags || []).length > 0;

    // Site polygon (ghost outline) — only when zoomed closer
    const poly = L.polygon(flipLatLng(f.geometry.coordinates[0]), {
      color: stageHex(stage),
      weight: isActive ? 2.5 : 1.5,
      opacity: dim ? 0.3 : 0.95,
      fillOpacity: isActive ? 0.18 : 0.08,
      interactive: false,
      className: 'sr-poly',
    });
    poly.addTo(L_MAP);
    L_POLYGONS.set(p.id, poly);

    // Custom DivIcon for the stage-coloured dot
    const html = buildPinHTML(p.id, stage, r, isActive, hasFlag);
    const icon = L.divIcon({
      className: 'sr-pin-wrap' + (dim ? ' sr-pin-wrap--dim' : ''),
      html,
      iconSize: [r * 2 + 60, r * 2 + 10],
      iconAnchor: [r + 30, r + 5],
    });
    const marker = L.marker([cy, cx], { icon, keyboard: true, title: p.name });
    marker.on('click', () => {
      go(p.id === S.selected ? 'map' : 'site-' + p.id.toLowerCase());
    });
    marker.addTo(L_MAP);
    L_MARKERS.set(p.id, marker);
  }
}

function flipLatLng(ring) { return ring.map(([lon, lat]) => [lat, lon]); }

function buildPinHTML(code, stage, r, active, flag) {
  const fill = stageHex(stage);
  const stroke = (stage === 'insufficient_data') ? '#6B6963' : '#FFFFFF';
  const ring = active ? `<circle cx="${r + 30}" cy="${r + 5}" r="${r + 5}" fill="none" stroke="#111110" stroke-width="2"/>` : '';
  const flagDot = flag ? `<circle cx="${r + 30 + r - 2}" cy="${r + 5 - r + 2}" r="4" fill="#C2502A" stroke="#FFFFFF" stroke-width="1"/>` : '';
  return `
    <svg width="${r * 2 + 60}" height="${r * 2 + 10}" overflow="visible">
      ${ring}
      <circle cx="${r + 30}" cy="${r + 5}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      ${flagDot}
      <text x="${r + 30 + r + 6}" y="${r + 5 + 4}" font-family="IBM Plex Mono,monospace" font-size="10" fill="#111110" style="paint-order:stroke;stroke:#FFFFFF;stroke-width:3px;">${code}</text>
    </svg>`;
}

function stageHex(stage) {
  switch (stage) {
    case 'operating':         return '#111110';
    case 'reopening_planned': return '#E2A93B';
    case 'legacy_bare':       return '#C2502A';
    case 'legacy_mixed':      return '#B9A98C';
    case 'recovering':        return 'rgba(29,107,85,0.65)';
    case 'vegetated':         return '#1D6B55';
    default:                  return '#FFFFFF';
  }
}

function wireBasemapSwitch() {
  const row = ROOT.querySelector('.sr-basemap-switch');
  if (!row) return;
  row.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-basemap]');
    if (!btn || !L_MAP) return;
    const which = btn.getAttribute('data-basemap');
    if (which === L_CURRENT_BASE) return;
    row.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b === btn));
    if (L_BASE_LAYERS[L_CURRENT_BASE]) L_MAP.removeLayer(L_BASE_LAYERS[L_CURRENT_BASE]);
    L_CURRENT_BASE = which;
    if (L_BASE_LAYERS[which]) L_BASE_LAYERS[which].addTo(L_MAP);
  });
}

// ─── Filters, list, pins events ──────────────────────────────
function wireFilters() {
  const q = ROOT.querySelector('#sr-q');
  if (q) q.addEventListener('input', () => { S.filters.q = q.value; refreshMapOnly(); });
  for (const [id, key] of [['f-country','country'],['f-stage','stage'],['f-flag','flag'],['f-pilot','pilot']]) {
    const row = ROOT.querySelector('#' + id);
    if (!row) continue;
    row.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.sr-chip'); if (!btn) return;
      const v = btn.getAttribute('data-val');
      const set = S.filters[key];
      if (set.has(v)) set.delete(v); else set.add(v);
      btn.classList.toggle('is-on');
      refreshMapOnly();
    });
  }
}

function refreshMapOnly() {
  // Re-render totals + list + markers without rebuilding the whole shell
  const left = ROOT.querySelector('.sr-col-left');
  if (!left) { render(); return; }
  const visible = filteredSites();
  const haTotal = visible.reduce((a, f) => a + (S.context[f.properties.id]?.areaHa || 0), 0);
  const volTotal = visible.reduce((a, f) => a + ((S.context[f.properties.id]?.dem?.volumeAboveBaseM3 || 0) / 1_000_000), 0);
  const flagged = visible.filter((f) => (deriveCard(f).lifecycle.flags || []).length).length;
  const facts = left.querySelector('.sr-facts');
  if (facts) facts.innerHTML = `
    <div class="sr-fact"><span class="sr-label">Sites shown</span><span class="sr-n">${visible.length}<span class="sr-unit">/ ${S.sites.length}</span></span></div>
    <div class="sr-fact"><span class="sr-label">Total area</span><span class="sr-n">${fmtHa(haTotal)}<span class="sr-unit">ha</span></span></div>
    <div class="sr-fact"><span class="sr-label">Volume proxy</span><span class="sr-n">${round(volTotal, 1)}<span class="sr-unit">Mm³</span></span></div>
    <div class="sr-fact sr-fact--alert"><span class="sr-label">With flags</span><span class="sr-n">${flagged}</span></div>
  `;
  const listHead = left.querySelector('.sr-list-count');
  if (listHead) listHead.textContent = `(${visible.length})`;
  const list = left.querySelector('.sr-list');
  if (list) list.innerHTML = listRowsHTML(visible);
  paintMarkers();
}

function wireListAndMap() {
  const left = ROOT.querySelector('.sr-col-left');
  if (left) left.addEventListener('click', (ev) => {
    const row = ev.target.closest('.sr-site-row'); if (!row) return;
    const code = row.getAttribute('data-code');
    go(code === S.selected ? 'map' : 'site-' + code.toLowerCase());
  });
  // Map clicks are handled by Leaflet marker click handlers set in paintMarkers().
  const detail = ROOT.querySelector('.sr-col-detail');
  if (detail) {
    detail.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-sr-close]')) { go('map'); return; }
      const dl = ev.target.closest('[data-sr-csv]'); if (dl) { downloadSiteCsv(S.selected); return; }
      const dg = ev.target.closest('[data-sr-geojson]'); if (dg) { downloadSiteGeoJson(S.selected); return; }
      const copy = ev.target.closest('[data-sr-cite]'); if (copy) { copyCitation(copy); return; }
      // Live scene load
      const liveBtn = ev.target.closest('[data-sr-live]');
      if (liveBtn) {
        const sid = liveBtn.getAttribute('data-sr-live');
        const site = S.sites.find((f) => f.properties.id === sid);
        const mount = ev.target.closest('.sr-live-sect')?.querySelector('.sr-live-mount');
        if (site && mount) loadLiveScene(site, mount);
        return;
      }
      const retry = ev.target.closest('[data-sr-live-retry]');
      if (retry) {
        const site = S.sites.find((f) => f.properties.id === S.selected);
        const mount = ev.target.closest('.sr-live-sect')?.querySelector('.sr-live-mount');
        if (site && mount) loadLiveScene(site, mount);
        return;
      }
    });
  }
}

// (zoom + pan are provided by Leaflet; no custom SVG zoom code needed.)

// ───────────────────────── Filtering ─────────────────────────────
function filteredSites() {
  const q = (S.filters.q || '').trim().toLowerCase();
  return S.sites.filter((f) => {
    const p = f.properties;
    if (S.filters.country.size && !S.filters.country.has(p.country)) return false;
    if (S.filters.pilot.size   && !S.filters.pilot.has(p.role))     return false;
    const card = deriveCard(f);
    if (S.filters.stage.size && !S.filters.stage.has(card.lifecycle.stage)) return false;
    if (S.filters.flag.size) {
      const have = new Set((card.lifecycle.flags || []).map((x) => x.id));
      let hit = false; for (const v of S.filters.flag) if (have.has(v)) { hit = true; break; }
      if (!hit) return false;
    }
    if (q) {
      const hay = (p.id + ' ' + p.name + ' ' + (p.municipality || '') + ' ' + p.country + ' ' + (p.crm_candidates || []).join(' ')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

// ───────────────────────── Lifecycle card derivation ─────────────
const CARD_CACHE = new Map();
function deriveCard(f) {
  const id = f.properties.id;
  if (CARD_CACHE.has(id)) return CARD_CACHE.get(id);
  const ts = S.timeseries[id] || { polygon: [] };
  const ctx = S.context[id] || {};
  const meta = { status: f.properties.status };
  const lc = lifecycleStage(ts.polygon || [], meta, { egms: ctx.egms || {} });
  const polySeries = (ts.polygon || []);
  const last = polySeries[polySeries.length - 1] || null;
  const card = {
    id,
    lifecycle: lc,
    latest: last ? {
      sceneDate: `${last.year}-08-15 (annual summer composite)`,
      vegetationPct: last.vegetationPct,
      barePct: last.barePct,
      ironPct: last.ironPct,
      redWaterOfWaterPct: last.redWaterOfWaterPct,
      waterPct: last.waterPct,
      bareHa: last.bareHa,
      waterHa: last.waterHa,
    } : {},
    context: ctx,
  };
  CARD_CACHE.set(id, card);
  return card;
}

// ───────────────────────── Site card HTML ────────────────────────
function siteDetailHTML(id) {
  const f = S.sites.find((x) => x.properties.id === id);
  if (!f) return `<div class="sr-detail-empty"><h3>Site not found</h3><p>Try <a href="#map">the list</a>.</p></div>`;
  const p = f.properties;
  const card = deriveCard(f);
  const ctx = card.context || {};
  const lc = card.lifecycle;
  const latest = card.latest || {};
  const area = ctx.areaHa || 0;
  const vol = ctx.dem?.volumeAboveBaseM3 || 0;
  const stageLabel = lc.label || STAGE_LABEL[lc.stage] || 'Unknown';

  const stagePill = `<span class="sr-pill sr-pill-stage" data-stage="${lc.stage}">${esc(stageLabel)}</span>`;
  const flagPills = (lc.flags || []).map((fl) => `<span class="sr-pill sr-pill-flag">${esc(fl.id.replace(/_/g,' '))}</span>`).join('');

  return `
    <section class="sr-detail">
      <div class="sr-detail-head">
        <button class="sr-detail-close" data-sr-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg></button>
        <div class="sr-detail-code">${esc(p.id)} · ${esc((p.crm_candidates||[]).join(' · ').toUpperCase() || p.deposit_type || '')}</div>
        <h2>${esc(p.name)}</h2>
        <p class="sr-detail-sub">${esc(p.municipality || '')}${p.municipality ? ', ' : ''}${esc(p.country)} · ${esc(p.region || '')}</p>
        <div class="sr-detail-pills">${stagePill}${flagPills}</div>
        <p class="sr-detail-sub" style="margin-top:10px;"><span class="sr-label">Register status</span> &nbsp; ${esc(p.status_note || '')}</p>
      </div>

      <div class="sr-sect">
        <span class="sr-label sr-sect-head">Key facts</span>
        <div class="sr-kf">
          <div class="sr-kf-cell"><span class="sr-label">Waste area (satellite)</span><span class="sr-n">${fmtHa(area)}<span class="sr-unit">ha</span></span></div>
          <div class="sr-kf-cell"><span class="sr-label">Volume proxy</span><span class="sr-n">${fmtVol(vol)}<span class="sr-unit">m³ · DEM 2011–15</span></span></div>
          <div class="sr-kf-cell"><span class="sr-label">Bare ground now</span><span class="sr-n">${fmtPct(latest.barePct)}</span></div>
          <div class="sr-kf-cell"><span class="sr-label">Vegetation now</span><span class="sr-n">${fmtPct(latest.vegetationPct)}</span></div>
          <div class="sr-kf-cell"><span class="sr-label">People within 1 km</span><span class="sr-n">${fmtInt(ctx.population?.within1km)}</span></div>
          <div class="sr-kf-cell"${(lc.flags || []).some((x)=>x.id==='red_water') ? ' data-alert="1"' : ''}><span class="sr-label">Red water, share of water</span><span class="sr-n">${fmtPct(latest.redWaterOfWaterPct)}</span></div>
        </div>
      </div>

      <div class="sr-sect sr-live-sect" data-site-id="${esc(p.id)}">
        <span class="sr-label sr-sect-head">Now from space (live)</span>
        <div class="sr-live-mount">${renderLiveIdle(p.id)}</div>
      </div>

      <div class="sr-sect">
        <span class="sr-label sr-sect-head">Ten years of change</span>
        <div class="sr-chart">${chartSVG(S.timeseries[id]?.polygon || [])}</div>
        <div class="sr-chart-legend">
          <span class="sr-sw sr-sw--veg"><span class="d"></span>Vegetation</span>
          <span class="sr-sw sr-sw--bare"><span class="d"></span>Bare ground</span>
          <span class="sr-sw sr-sw--iron"><span class="d"></span>Iron signal (bare)</span>
          <span class="sr-sw sr-sw--red"><span class="d"></span>Red water (of water)</span>
        </div>
        <div class="sr-recovery">
          <span class="sr-label">Natural recovery clock</span>
          <p>${esc(lc.clock?.label || 'Not enough valid years for a trend yet.')}</p>
        </div>
      </div>

      <div class="sr-sect">
        <span class="sr-label sr-sect-head">Pathways</span>
        <div class="sr-pathways">
          <div class="sr-pathway">
            <h4>Leave and monitor</h4>
            <ul>
              <li>Recovery clock: ${esc((lc.clock?.label || '—').toLowerCase())}</li>
              <li>Flags today: ${(lc.flags||[]).length ? esc((lc.flags||[]).map(x=>x.id.replace(/_/g,' ')).join(', ')) : 'none'}</li>
              <li>What Strata will keep tracking: vegetation, bare, iron, water, red water</li>
            </ul>
            <div class="sr-pathway-footer">Lifecycle study under way, results expected June 2027.</div>
          </div>
          <div class="sr-pathway">
            <h4>Rehabilitate</h4>
            <ul>
              <li>Bare area to treat: ${fmtHa((latest.bareHa))} ha</li>
              <li>Water and tailings surface: ${fmtHa(latest.waterHa)} ha</li>
              <li>Heap volume to reshape (proxy): ${fmtVol(vol)} m³</li>
              <li>Natura 2000 within 1 km: ${fmtHa(ctx.natura2000?.within1kmHa)} ha</li>
            </ul>
            <div class="sr-pathway-footer">Lifecycle study under way, results expected June 2027.</div>
          </div>
          <div class="sr-pathway">
            <h4>Reprocess and rehabilitate</h4>
            <ul>
              <li>Volume proxy: ${fmtVol(vol)} m³ (${round(vol * (S.config.bulkDensityTPerM3 || 1.8) / 1_000_000, 1)} Mt, bulk density assumed)</li>
              <li>CRM candidates (deposit type): ${esc((p.crm_candidates || []).join(', ') || '—')} <br><em>not measured</em></li>
              <li>People within 1 km: ${fmtInt(ctx.population?.within1km)}</li>
              <li>Distance to watercourse: ${esc(ctx.river?.name || '—')}, ${fmtInt(ctx.river?.distanceM)} m</li>
            </ul>
            <div class="sr-pathway-footer">Lifecycle study under way, results expected June 2027.</div>
          </div>
        </div>
      </div>

      <div class="sr-sect sr-around">
        <span class="sr-label sr-sect-head">Around the site</span>
        <dl>
          <dt>People within 5 km</dt><dd>${fmtInt(ctx.population?.within5km)}</dd>
          <dt>Natura 2000, distance</dt><dd>${fmtInt(ctx.natura2000?.distanceM)} m</dd>
          <dt>Watercourse</dt><dd>${esc(ctx.river?.name || '—')} · ${fmtInt(ctx.river?.distanceM)} m</dd>
          <dt>Ground motion (EGMS)</dt><dd>${ctx.egms?.loaded ? `${round(ctx.egms.medianMmYr, 1)} mm/yr, ${round(ctx.egms.shareBelowThresholdPct, 1)}% subsiding faster than 5 mm/yr` : 'Not loaded'}</dd>
          <dt>Long-term water (JRC GSW)</dt><dd>${fmtHa(ctx.gsw?.occurrenceOver50Ha)} ha with occurrence &gt; 50%</dd>
        </dl>
        <div class="sr-wc-bar" title="ESA WorldCover land cover in the 500 m ring">
          ${worldcoverBar(ctx.worldcoverRing || {})}
        </div>
        <p class="sr-sect-note">Ring land cover from ESA WorldCover 2021. Hover the segments for the class name.</p>
      </div>

      <div class="sr-sect">
        <span class="sr-label sr-sect-head">What people here told us</span>
        <div class="sr-community">
          <p>We are talking with residents and local organisations through 2027. Their priorities will appear here. If you live near this site or work with it, <a href="mailto:marcel@transitionslab.org?subject=Strata%20site%20${esc(p.id)}">share what you know</a>.</p>
        </div>
      </div>

      <div class="sr-sect">
        <span class="sr-label sr-sect-head">Export and cite</span>
        <div class="sr-actions">
          <button class="sr-abtn" type="button" data-sr-csv>Download CSV (Article 27)</button>
          <button class="sr-abtn" type="button" data-sr-geojson>Download GeoJSON</button>
          <button class="sr-abtn" type="button" data-sr-cite>Copy citation</button>
        </div>
        <p class="sr-sect-note">Method version ${esc(DEFAULTS.methodVersion)}. Attribution and licence apply to the exported row too.</p>
      </div>

      <div class="sr-detail-foot">
        <strong>Attribution.</strong> Contains modified Copernicus Sentinel data 2017–2026. Generated using European Union's Copernicus Land Monitoring Service information (EGMS). Copernicus DEM GLO-30. © ESA WorldCover project 2021. Source: EC JRC/Google (Global Surface Water). GHS-POP R2023A, European Commission JRC. Natura 2000 © European Union, DG Environment, distributed by the EEA. Tang and Werner (2023), CC BY 4.0. © OpenStreetMap contributors. Use of Copernicus data does not imply endorsement by the European Union.
      </div>
    </section>
  `;
}

// ─── Chart (vegetation % + bare % + iron % + red water %) ────
function chartSVG(series) {
  if (!series.length) return '<svg viewBox="0 0 320 180"><text x="10" y="20" font-family="monospace" font-size="12" fill="#888">No annual composites loaded.</text></svg>';
  const W = 320, H = 180, padL = 38, padR = 10, padT = 12, padB = 26;
  const years = series.map((p) => p.year);
  const xMin = Math.min(...years), xMax = Math.max(...years);
  function px(y) { return padL + (y - xMin) / Math.max(1, xMax - xMin) * (W - padL - padR); }
  function py(v) { return H - padB - (v / 100) * (H - padT - padB); }
  const line = (field, color, opacity = 1) => {
    const d = series.map((p, i) => (i ? 'L' : 'M') + px(p.year).toFixed(1) + ' ' + py(p[field] || 0).toFixed(1)).join(' ');
    return `<path class="cv-line" d="${d}" stroke="${color}" opacity="${opacity}"/>` +
      series.map((p) => `<circle class="cv-dot" cx="${px(p.year).toFixed(1)}" cy="${py(p[field] || 0).toFixed(1)}" r="2.3" stroke="${color}"/>`).join('');
  };
  // Grid
  let grid = '';
  for (let v = 25; v <= 75; v += 25) {
    grid += `<line class="cv-grid" x1="${padL}" y1="${py(v)}" x2="${W-padR}" y2="${py(v)}"/>`;
    grid += `<text class="cv-text" x="4" y="${py(v)+3}">${v}%</text>`;
  }
  grid += `<text class="cv-text" x="4" y="${padT+8}">100%</text>`;
  grid += `<text class="cv-text" x="4" y="${H-padB+3}">0%</text>`;
  // X labels
  grid += `<text class="cv-text" x="${px(xMin)}" y="${H-8}">${xMin}</text>`;
  const mid = years[Math.floor(years.length / 2)];
  grid += `<text class="cv-text" x="${px(mid)}" y="${H-8}" text-anchor="middle">${mid}</text>`;
  grid += `<text class="cv-text" x="${px(xMax)}" y="${H-8}" text-anchor="end">${xMax}</text>`;
  // Baseline marker
  const bx = px(xMin);
  grid += `<line class="cv-baseline" x1="${bx}" y1="${padT}" x2="${bx}" y2="${H-padB}"/>`;
  grid += `<text class="cv-text" x="${bx+4}" y="${padT+10}">baseline</text>`;
  // Lines
  const lines = [
    line('vegetationPct', 'var(--accent)'),
    line('barePct',       'var(--warn)', 0.85),
    line('ironPct',       'var(--sun)',  0.9),
    line('redWaterOfWaterPct', '#B23A47', 0.8),
  ].join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}</svg>`;
}

// ───────────────────────── Live Sentinel-2 scene ────────────────
// All of the work below runs in the browser against the Earth Search
// STAC endpoint and Cloud-Optimised GeoTIFFs on AWS. No account, no
// server, no API key. The 'geotiff' import is resolved by the
// import-map in strata-demo.html.

function renderLiveIdle(siteId) {
  return `
    <div class="sr-live-panel">
      <p><strong>Live Sentinel-2 scene.</strong> Fetches the most recent clear Sentinel-2 Level-2A acquisition over this site via the free Earth Search STAC, reads the six bands and the Scene Classification Layer from the Cloud-Optimised GeoTIFFs, and classifies every 10 m pixel into vegetation, bare ground, bare with an iron oxide signal, water and red/orange water. The classes use the formulas in the <a href="#method">method page</a>.</p>
      <button class="sr-live-btn" type="button" data-sr-live="${esc(siteId)}">Load latest Sentinel-2 scene &rarr;</button>
      <p class="sr-live-note">First load pulls the geotiff library (~400 KB) and 7 band windows (~2–5 MB). Typical total: 8 to 20 seconds on a home connection.</p>
    </div>`;
}

function renderLiveLoading(step) {
  return `
    <div class="sr-live-panel sr-live-loading">
      <div class="sr-live-spinner" aria-hidden="true"></div>
      <p class="sr-live-step"><strong>${esc(step)}</strong></p>
      <p class="sr-live-note">Reading Cloud-Optimised GeoTIFFs over HTTP range requests. The browser never downloads a whole scene; just a window around the site.</p>
    </div>`;
}

function renderLiveError(msg) {
  return `
    <div class="sr-live-panel sr-live-err">
      <p><strong>Live scene did not load.</strong> ${esc(msg)}</p>
      <p class="sr-live-note">Earth Search sometimes rate-limits browser clients. Try again in a minute. Everything else on this page runs from offline annual composites.</p>
      <button class="sr-live-btn" type="button" data-sr-live-retry>Try again</button>
    </div>`;
}

function renderLiveScene(ctx) {
  // ctx: { item, bands, idx, classes, poly, ring, polyStats, ringStats, width, height }
  const d = new Date(ctx.item.properties.datetime);
  const dateStr = d.toISOString().slice(0, 10);
  const cloud = Math.round(ctx.item.properties['eo:cloud_cover'] || 0);
  const prov = 'Earth Search (Element 84 / AWS)';
  const vf = Math.round((ctx.polyStats.validPct || 0));

  const polyPct = ctx.polyStats;
  const ringPct = ctx.ringStats;

  const legendHTML = Object.keys(CLASS_LABELS).map((k) => {
    const col = CLASS_COLOURS[k]; const label = CLASS_LABELS[k];
    const pct = polyPct && polyPct[classStatKey(+k)];
    return `<span class="sr-cls-sw"><span class="d" style="background:rgb(${col[0]},${col[1]},${col[2]})"></span>${esc(label)}${pct != null ? ' · ' + round(pct, 0) + '%' : ''}</span>`;
  }).join('');

  return `
    <div class="sr-live-result">
      <div class="sr-live-head">
        <span class="sr-label">Scene</span>
        <strong>${esc(ctx.item.id)}</strong>
        <span class="sr-live-meta">${esc(dateStr)} · ${cloud}% cloud · ${prov}</span>
      </div>
      <div class="sr-live-canvases">
        <figure>
          <canvas id="live-rgb"></canvas>
          <figcaption>True colour (B04/B03/B02, linear stretch)</figcaption>
        </figure>
        <figure>
          <canvas id="live-cls"></canvas>
          <figcaption>Pixel classes</figcaption>
        </figure>
        <figure>
          <canvas id="live-ndvi"></canvas>
          <figcaption>NDVI (brown ↔ green)</figcaption>
        </figure>
      </div>
      <div class="sr-live-legend">${legendHTML}</div>
      <div class="sr-live-stats">
        <div class="sr-live-stats-col">
          <span class="sr-label">Inside the polygon</span>
          <dl>
            <dt>Valid pixels</dt><dd>${round(vf, 0)}%</dd>
            <dt>Vegetation</dt><dd>${round(polyPct.vegetationPct, 1)}%</dd>
            <dt>Bare ground</dt><dd>${round(polyPct.barePct, 1)}%</dd>
            <dt>Of which iron signal</dt><dd>${round(polyPct.ironPct, 1)}%</dd>
            <dt>Water</dt><dd>${round(polyPct.waterPct, 1)}%</dd>
            <dt>Red of water</dt><dd>${round(polyPct.redWaterOfWaterPct, 1)}%</dd>
            <dt>Area (region)</dt><dd>${round(polyPct.regionHa, 1)} ha</dd>
          </dl>
        </div>
        <div class="sr-live-stats-col">
          <span class="sr-label">500 m ring</span>
          <dl>
            <dt>Vegetation</dt><dd>${round(ringPct.vegetationPct, 1)}%</dd>
            <dt>Bare ground</dt><dd>${round(ringPct.barePct, 1)}%</dd>
            <dt>Iron signal</dt><dd>${round(ringPct.ironPct, 1)}%</dd>
            <dt>Water</dt><dd>${round(ringPct.waterPct, 1)}%</dd>
            <dt>Area (region)</dt><dd>${round(ringPct.regionHa, 1)} ha</dd>
          </dl>
        </div>
      </div>
      <p class="sr-live-note">Contains modified Copernicus Sentinel data ${esc(dateStr.slice(0,4))}. Processed in-browser by strata-core.js. <button class="sr-live-mini" type="button" data-sr-live-retry>Reload</button></p>
    </div>`;
}

function classStatKey(k) {
  // Map CLASS constant to the summary field it corresponds to.
  if (k === CLASS.VEGETATION) return 'vegetationPct';
  if (k === CLASS.BARE)       return 'barePct';
  if (k === CLASS.BARE_IRON)  return 'ironPct';
  if (k === CLASS.WATER)      return 'waterPct';
  // Red water is reported as % of water, not % of region, so skip.
  return null;
}

async function loadLiveScene(site, mountEl) {
  const show = (html) => { mountEl.innerHTML = html; };
  const step = (msg) => { show(renderLiveLoading(msg)); };

  try {
    step('Searching Sentinel-2 scenes…');
    const siteBbox = geometryBbox(site.geometry);
    const bbox = expandLonLatBbox(siteBbox, DEFAULTS.ringMetres + 200);
    const end = new Date();
    const start = new Date(end.getTime() - 180 * 86_400_000);
    const toISO = (d) => d.toISOString().slice(0, 10);
    const scenes = await searchScenes({
      bbox, start: toISO(start), end: toISO(end),
      maxCloud: 40, limit: 10, provider: 'earthsearch',
    });
    if (!scenes.length) {
      show(renderLiveError('No Sentinel-2 scene under 40% cloud in the last 180 days over this site.'));
      return;
    }

    for (let i = 0; i < Math.min(scenes.length, 4); i++) {
      const item = scenes[i];
      const cloud = Math.round(item.properties['eo:cloud_cover'] || 0);
      try {
        step(`Reading bands from ${item.id.split('_').slice(-2).join(' ')} (${cloud}% cloud, scene ${i + 1}/${Math.min(scenes.length, 4)})…`);
        const epsg = itemEpsg(item);
        const zone = epsg % 100;
        const bboxUtm = lonLatBboxToUtm(bbox, zone);
        const bands = await readBands(item, bboxUtm, { provider: 'earthsearch', pixelSizeM: 10 });
        step('Computing indices and classes…');
        const { width, height } = bands;
        const ringsPx = geometryToPixelRings(site.geometry, zone, bboxUtm, 10);
        const poly = rasterisePolygon(ringsPx, width, height);
        const ring = ringMask(poly, width, height, 50); // 500 m / 10 m = 50 px
        const valid = validMask(bands);
        const vf = fractionValid(valid, poly);
        if (vf < 0.6) {
          step(`Scene is ${(vf * 100).toFixed(0)}% valid inside the site. Trying the next clearest scene…`);
          continue;
        }
        const idx = computeIndexRasters(bands, width * height);
        const classes = classifyPixels(idx, valid);
        const polyStats = summarise(classes, poly, 10);
        const ringStats = summarise(classes, ring, 10);
        show(renderLiveScene({ item, bands, idx, classes, poly, ring, polyStats, ringStats, width, height }));
        drawCanvases(bands, idx, classes, poly, ring);
        return;
      } catch (e) {
        console.warn('Live scene attempt failed:', e);
        step(`Scene ${i + 1} could not be read (${e.message}). Trying the next…`);
      }
    }
    show(renderLiveError('All candidate scenes could not be read. The archive may be rate-limiting the browser. Try again in a minute.'));
  } catch (e) {
    console.error('loadLiveScene failed:', e);
    show(renderLiveError(e.message || String(e)));
  }
}

function drawCanvases(bands, idx, classes, poly, ring) {
  const W = bands.width, H = bands.height;
  const sizes = { max: 320 };
  const scale = Math.min(1, sizes.max / Math.max(W, H));
  const cw = Math.max(1, Math.round(W * scale));
  const ch = Math.max(1, Math.round(H * scale));

  // True colour
  const rgb = trueColourRGBA(bands, 0.30);
  blit('live-rgb', rgb, W, H, cw, ch, { outlinePoly: poly, outlineRing: ring });

  // Classes
  const cls = classRGBA(classes, CLASS_COLOURS);
  blit('live-cls', cls, W, H, cw, ch, { outlinePoly: poly });

  // NDVI (brown -> tan -> green ramp)
  const ndvi = new Uint8ClampedArray(W * H * 4);
  const ramp = (t) => {
    if (t <= 0.1) { // bare: tan
      const u = Math.max(0, Math.min(1, (t + 0.2) / 0.3));
      return [205 - 60 * u, 180 - 40 * u, 140 - 30 * u];
    }
    const u = Math.max(0, Math.min(1, (t - 0.1) / 0.6));
    return [205 - 170 * u, 180 - 60 * u, 140 - 90 * u];
  };
  for (let i = 0; i < W * H; i++) {
    const v = idx.ndvi[i];
    if (!Number.isFinite(v)) { ndvi[i * 4 + 3] = 0; continue; }
    const [r, g, b] = ramp(v);
    ndvi[i * 4]     = r;
    ndvi[i * 4 + 1] = g;
    ndvi[i * 4 + 2] = b;
    ndvi[i * 4 + 3] = 255;
  }
  blit('live-ndvi', ndvi, W, H, cw, ch, { outlinePoly: poly });
}

function blit(canvasId, rgba, W, H, cw, ch, opts) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d');
  octx.putImageData(new ImageData(rgba, W, H), 0, 0);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(dpr, dpr);
  ctx.drawImage(off, 0, 0, W, H, 0, 0, cw, ch);
  // Draw polygon outline + optional ring outline on top
  if (opts && opts.outlinePoly) drawMaskOutline(ctx, opts.outlinePoly, W, H, cw, ch, 'rgba(255,255,255,0.95)', 1.5);
  if (opts && opts.outlineRing) drawMaskOutline(ctx, opts.outlineRing, W, H, cw, ch, 'rgba(226,169,59,0.9)', 1);
}

function drawMaskOutline(ctx, mask, W, H, cw, ch, colour, lw) {
  // Draw thin outlines of a boolean raster by walking the mask edges.
  const sx = cw / W, sy = ch / H;
  ctx.strokeStyle = colour; ctx.lineWidth = lw;
  ctx.beginPath();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      // top edge
      if (y === 0 || !mask[(y - 1) * W + x]) { ctx.moveTo(x * sx, y * sy); ctx.lineTo((x + 1) * sx, y * sy); }
      // bottom edge
      if (y === H - 1 || !mask[(y + 1) * W + x]) { ctx.moveTo(x * sx, (y + 1) * sy); ctx.lineTo((x + 1) * sx, (y + 1) * sy); }
      // left edge
      if (x === 0 || !mask[y * W + x - 1]) { ctx.moveTo(x * sx, y * sy); ctx.lineTo(x * sx, (y + 1) * sy); }
      // right edge
      if (x === W - 1 || !mask[y * W + x + 1]) { ctx.moveTo((x + 1) * sx, y * sy); ctx.lineTo((x + 1) * sx, (y + 1) * sy); }
    }
  }
  ctx.stroke();
}

function worldcoverBar(ring) {
  const entries = Object.entries(ring).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, b) => a + b[1], 0) || 100;
  const COL = {
    'Tree cover':'#1D6B55', 'Shrubland':'#B9A98C', 'Grassland':'#CFC58C', 'Cropland':'#E3B23C',
    'Built-up':'#8E8A80', 'Bare / sparse vegetation':'#CFC6B4', 'Permanent water bodies':'#2F6F9F',
    'Wetland':'#5EA3B7', 'Snow and ice':'#F5F5F5', 'Mangroves':'#4E5B38',
  };
  return entries.map(([k, v]) => `<span title="${esc(k)}: ${round(v,0)}%" style="width:${(v/total*100).toFixed(1)}%;background:${COL[k]||'#999'};"></span>`).join('');
}

// ───────────────────────── Compare page ─────────────────────────
function comparePageHTML() {
  const rows = S.sites.map((f) => {
    const p = f.properties;
    const c = deriveCard(f);
    const ctx = c.context || {};
    const l = c.latest || {};
    const lc = c.lifecycle;
    return `
      <tr>
        <td><a href="#site-${esc(p.id.toLowerCase())}">${esc(p.id)}</a></td>
        <td>${esc(p.name)}</td>
        <td>${esc(p.country)}</td>
        <td>${esc(lc.label || '')}</td>
        <td>${esc((lc.flags||[]).map((x) => x.id.replace(/_/g, ' ')).join(', '))}</td>
        <td class="num">${fmtHa(ctx.areaHa)}</td>
        <td class="num">${fmtVol(ctx.dem?.volumeAboveBaseM3)}</td>
        <td class="num">${fmtPct(l.barePct)}</td>
        <td class="num">${fmtPct(l.ironPct)}</td>
        <td class="num">${fmtPct(l.redWaterOfWaterPct)}</td>
        <td>${esc(lc.clock?.status || '')}</td>
        <td class="num">${fmtInt(ctx.population?.within1km)}</td>
        <td class="num">${fmtHa(ctx.natura2000?.within1kmHa)}</td>
        <td class="num">${ctx.egms?.shareBelowThresholdPct != null ? round(ctx.egms.shareBelowThresholdPct, 1) + '%' : 'N/L'}</td>
      </tr>`;
  }).join('');
  return `
    <div class="sr-compare-wrap">
      <h2>Compare</h2>
      <p class="sr-sect-note">All ${S.sites.length} sites in the pilot register, side by side. Click a site ID to open its lifecycle card. Columns are sortable in the next build; export the whole table as CSV or GeoJSON below.</p>
      <div class="sr-compare-actions">
        <button class="sr-abtn" type="button" data-sr-csv-all>Export all as CSV</button>
        <button class="sr-abtn" type="button" data-sr-geojson-all>Export all as GeoJSON</button>
      </div>
      <table class="sr-compare">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Country</th><th>Lifecycle stage</th><th>Flags</th>
            <th>Area ha</th><th>Volume m³</th><th>Bare %</th><th>Iron %</th><th>Red water %</th>
            <th>Recovery clock</th><th>People 1 km</th><th>Natura 1 km, ha</th><th>EGMS &lt; -5 mm/yr</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ───────────────────────── Content pages ────────────────────────
function methodPageHTML() {
  return `<article class="sr-content">
    <h1>Method</h1>
    <p>Strata reads Sentinel-2 Level-2A surface reflectance (10 m, 20 m bands resampled bilinear, SCL resampled nearest) and classifies every valid pixel inside each site polygon and a 500 m outer ring. Thresholds below are the pilot starting values; the FIERCE service S3 feasibility study will calibrate them against hyperspectral imagery (PRISMA, EnMAP) and field data.</p>
    <h2>Pixel indices</h2>
    <table>
      <thead><tr><th>Indicator</th><th>Formula</th><th>Starting threshold</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td>NDVI</td><td><code>(B08 - B04) / (B08 + B04)</code></td><td>&ge; 0.30</td><td>Vegetation</td></tr>
        <tr><td>Bare soil index</td><td><code>((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02))</code></td><td>&gt; 0 and NDVI &lt; 0.15</td><td>Bare ground</td></tr>
        <tr><td>Iron oxide ratio</td><td><code>B04 / B03</code></td><td>&gt; 1.35 on bare pixels</td><td>Bare ground with iron signal (oxidising sulphide waste, gossan)</td></tr>
        <tr><td>Clay or hydroxyl ratio</td><td><code>B11 / B12</code></td><td>map layer only in v0.2</td><td>Clay or altered material</td></tr>
        <tr><td>MNDWI</td><td><code>(B03 - B11) / (B03 + B11)</code></td><td>&gt; 0 and NDVI &lt; 0.30</td><td>Water</td></tr>
        <tr><td>Red water index</td><td><code>(B04 - B02) / (B04 + B02)</code> on water pixels</td><td>&gt; 0.15</td><td>Red or orange water (acid drainage colour)</td></tr>
      </tbody>
    </table>

    <h2>Natural recovery clock</h2>
    <p>Theil-Sen trend of vegetation % in the polygon over valid years (validPct &ge; 60). Thresholds: slope ≥ +0.5 points/year to count as recovering; years to the 50% target are capped at 100.</p>

    <h2>Lifecycle stage</h2>
    <ol>
      <li>Fewer than 5 valid years: <em>Not enough data</em>.</li>
      <li>Register status operating: <em>Operating</em>.</li>
      <li>Register status reopening planned: <em>Reopening planned</em>.</li>
      <li>Latest vegetation &ge; 60%: <em>Vegetated</em>.</li>
      <li>Recovery clock recovering: <em>Recovering naturally</em>.</li>
      <li>Latest bare &ge; 40%: <em>Legacy, largely bare</em>.</li>
      <li>Otherwise: <em>Legacy, mixed cover</em>.</li>
    </ol>

    <h2>Flags</h2>
    <ul>
      <li><strong>New disturbance.</strong> Bare ha now &ge; 110% of the earlier median and at least 2 ha more.</li>
      <li><strong>Red water.</strong> &ge; 5% of open water on site shows a red or orange colour.</li>
      <li><strong>Iron signal.</strong> &ge; 20% of the site surface shows the iron oxide signal.</li>
      <li><strong>Ground motion.</strong> &ge; 10% of EGMS points subside faster than 5 mm per year.</li>
    </ul>
    <p>Flags describe what the satellite shows. Each flag ends, on first appearance, with: <em>This is a signal for follow-up, not a finding</em>.</p>

    <h2>Reference implementation and tests</h2>
    <p>The pure functions (indices, classification, masks, recovery clock, lifecycle stage, CRMA export row) live in <code>strata-core.js</code>, shared with the Python pipeline. The module ships with 26 unit tests. Run <code>node core.js --test</code>; all 26 pass.</p>
  </article>`;
}

function dataPageHTML() {
  return `<article class="sr-content">
    <h1>Data sources</h1>
    <p>All inputs are open. If a source cannot be reached or its licence does not allow a specific use, Strata leaves the field empty and shows "Not available" or "Not loaded"; it never substitutes an estimate.</p>
    <h2>Satellite and Earth observation</h2>
    <table>
      <thead><tr><th>Dataset</th><th>Access</th><th>Licence</th></tr></thead>
      <tbody>
        <tr><td>Copernicus Sentinel-2 L2A</td><td>Earth Search STAC; Planetary Computer fallback</td><td>Free, full and open</td></tr>
        <tr><td>European Ground Motion Service (Ortho)</td><td>EGMS Explorer manual tile download</td><td>Copernicus free and open</td></tr>
        <tr><td>Copernicus DEM GLO-30</td><td>AWS bucket, public COGs</td><td>Copernicus DEM licence</td></tr>
        <tr><td>ESA WorldCover 10 m 2021 v200</td><td>AWS bucket, public COGs</td><td>CC BY 4.0</td></tr>
        <tr><td>JRC Global Surface Water</td><td>JRC dataset page</td><td>Free without restriction of use</td></tr>
        <tr><td>GHSL population grid GHS-POP R2023A</td><td>JRC Global Human Settlement Layer</td><td>CC BY 4.0 (verify)</td></tr>
      </tbody>
    </table>
    <h2>Register and context</h2>
    <table>
      <thead><tr><th>Dataset</th><th>Access</th><th>Licence</th></tr></thead>
      <tbody>
        <tr><td>OpenStreetMap</td><td>Overpass API (<code>man_made=spoil_heap</code>, <code>man_made=tailings_pond</code>, <code>landuse=quarry</code>, <code>historic=mine</code>)</td><td>ODbL 1.0</td></tr>
        <tr><td>Global mining footprint, Tang &amp; Werner (2023)</td><td>Zenodo 10.5281/zenodo.7894216</td><td>CC BY 4.0</td></tr>
        <tr><td>MIN4EU Mining Waste (EuroGeoSurveys)</td><td>EGDI metadata record (direct WFS to verify)</td><td>CC BY 4.0</td></tr>
        <tr><td>Natura 2000 sites (vector)</td><td>EEA download</td><td>CC BY 4.0</td></tr>
        <tr><td>Basemap</td><td>OpenFreeMap positron (OSM data, OpenMapTiles schema)</td><td>ODbL</td></tr>
      </tbody>
    </table>
    <p><strong>Attribution footer.</strong> Contains modified Copernicus Sentinel data [years]. Generated using European Union's Copernicus Land Monitoring Service information (EGMS). Copernicus DEM GLO-30. © ESA WorldCover project 2021. Source: EC JRC/Google (Global Surface Water). GHS-POP R2023A, European Commission JRC. Natura 2000 © European Union, DG Environment, distributed by the EEA. Tang and Werner (2023), CC BY 4.0. © OpenStreetMap contributors. Use of Copernicus data does not imply endorsement by the European Union.</p>
  </article>`;
}

function aboutPageHTML() {
  return `<article class="sr-content">
    <h1>About Strata</h1>
    <p>Strata is a satellite lifecycle card for every closed mine waste site in a region, so the people deciding what happens to it next (a geological survey compiling the <a href="https://meetingorganizer.copernicus.org/EGU26/EGU26-9857.html">CRMA Article 27 database</a>, a municipality living next to a heap, a company looking for secondary critical raw materials) start from the same open evidence, and hear from the people who live there.</p>
    <h2>Pilot</h2>
    <p>Eight sites in the Iberian Pyrite Belt (Portugal and Spain), plus two transfer sites in Germany (Rammelsberg / Bollrich) and Sweden (Falun). The seed register is in <code>sites.seed.geojson</code>.</p>
    <h2>Partners</h2>
    <ul>
      <li><strong>Transitions Lab</strong>, Delft — lead; writes the method, runs the field research, publishes.</li>
      <li><strong>Pyropower</strong> — partner; operating experience on the materials-and-energy side.</li>
      <li><strong>Social Innovation Europe</strong> — partner; reach into the communities and civil society organisations that live beside legacy sites.</li>
    </ul>
    <p>Funding acknowledgement will appear here once the FIERCE sub-grant agreement is signed.</p>
    <h2>Contact</h2>
    <p>Email <a href="mailto:marcel@transitionslab.org">marcel@transitionslab.org</a> about adding a site, running a custom indicator set or using Strata inside a lender's or buyer's due diligence process.</p>
  </article>`;
}

// ───────────────────────── Export + CSV + GeoJSON ───────────────
function downloadSiteCsv(id) {
  const f = S.sites.find((x) => x.properties.id === id);
  if (!f) return;
  const card = deriveCard(f);
  const row = crmaExportRow(f, card);
  const header = Object.keys(row);
  const line = header.map((k) => csvCell(row[k])).join(',');
  const body = header.join(',') + '\n' + line + '\n';
  download(`strata-${id.toLowerCase()}.csv`, body, 'text/csv;charset=utf-8');
}
function downloadSiteGeoJson(id) {
  const f = S.sites.find((x) => x.properties.id === id);
  if (!f) return;
  download(`strata-${id.toLowerCase()}.geojson`, JSON.stringify(f, null, 2), 'application/geo+json');
}
function copyCitation(btn) {
  const text = `Transitions Lab (2026). Strata ${DEFAULTS.methodVersion}: satellite lifecycle cards for closed mine waste sites. Pilot register. transitionslab.org/strata-demo`;
  try { navigator.clipboard.writeText(text); btn.textContent = '✓ Citation copied'; btn.classList.add('is-done'); setTimeout(()=>{btn.textContent='Copy citation';btn.classList.remove('is-done');}, 1500); } catch (_) {}
}
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ───────────────────────── Helpers ─────────────────────────────
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtInt(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-GB').format(Math.round(n));
}
function fmtHa(n) {
  if (n == null || !Number.isFinite(+n)) return '—';
  const v = +n;
  return v < 100 ? v.toFixed(1) : new Intl.NumberFormat('en-GB').format(Math.round(v));
}
function fmtPct(n) {
  if (n == null || !Number.isFinite(+n)) return '—';
  return Math.round(+n) + '%';
}
function fmtVol(n) {
  if (n == null || !Number.isFinite(+n)) return '—';
  const v = +n;
  if (v >= 1_000_000) return (v/1_000_000).toFixed(1) + ' M';
  return new Intl.NumberFormat('en-GB').format(Math.round(v));
}
function centroid(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let sx = 0, sy = 0, n = 0;
  for (const poly of polys) for (const [x, y] of poly[0]) { sx += x; sy += y; n++; }
  return [sx / n, sy / n];
}

function brandMark(size = 20) {
  // Logo from CLAUDE.md: five strata with a stepped pit; bottom band accent.
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <rect x="0"  y="2.2"  width="26" height="8.4" fill="currentColor"/>
    <rect x="48" y="2.2"  width="16" height="8.4" fill="currentColor"/>
    <rect x="0"  y="15"   width="30" height="8.4" fill="currentColor"/>
    <rect x="44" y="15"   width="20" height="8.4" fill="currentColor"/>
    <rect x="0"  y="27.8" width="34" height="8.4" fill="currentColor"/>
    <rect x="40" y="27.8" width="24" height="8.4" fill="currentColor"/>
    <rect x="0"  y="40.6" width="64" height="8.4" fill="currentColor"/>
    <rect x="0"  y="53.4" width="64" height="8.4" fill="var(--accent)"/>
  </svg>`;
}
