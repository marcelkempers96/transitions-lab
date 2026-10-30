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
  filters: { q: '', country: new Set(), stage: new Set(), flag: new Set(), pilot: new Set(), watchlist: false },
  // Map overlay toggles — all off by default except the site polygon,
  // which was the pre-existing behaviour.
  layers: readLayerPrefs(),
  // User's saved sites, kept in localStorage so a share link survives
  // a reload but no data leaves the browser.
  watchlist: readWatchlist(),
};

function readLayerPrefs() {
  const defaults = { pop1km: true, pop5km: false, natura: true, motion: true, polygon: true };
  try {
    const s = JSON.parse(localStorage.getItem('strata-layers') || 'null');
    if (s && typeof s === 'object') return Object.assign({}, defaults, s);
  } catch (_) {}
  return defaults;
}
function writeLayerPrefs() {
  try { localStorage.setItem('strata-layers', JSON.stringify(S.layers)); } catch (_) {}
}
function readWatchlist() {
  try {
    const s = JSON.parse(localStorage.getItem('strata-watchlist') || '[]');
    return new Set(Array.isArray(s) ? s.map(String) : []);
  } catch (_) { return new Set(); }
}
function writeWatchlist() {
  try { localStorage.setItem('strata-watchlist', JSON.stringify([...S.watchlist])); } catch (_) {}
}
function layerSummary() {
  const on = Object.entries(S.layers).filter(([,v])=>v).length;
  return on === 0 ? 'None on' : (on === 5 ? 'All on' : (on + ' on'));
}

// ───────────────────────── Boot ─────────────────────────────────
async function boot() {
  await loadAll();
  render();
  wireRoute();
  wireChrome();
  wireGlobalKeys();
}

async function loadAll() {
  const base = '/assets/strata/data/';
  const [cfg, sites, europe, communities] = await Promise.all([
    fetchJson(base + 'config.json'),
    fetchJson(base + 'sites.geojson'),
    loadEuropeGeo(),
    fetchJson(base + 'communities.json').catch(() => ({ communities: [] })),
  ]);
  S.config = cfg;
  S.sites = (sites.features || []).map(sortedFeature);
  S.europe = europe;
  S.communities = communities.communities || [];
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
  else if (['compare','communities','pipeline','method','data','about'].includes(raw)) { S.view = raw; S.selected = null; }
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
  // Sand strip under the topbar: a plain pilot-scope reminder, no
  // funder branding.
  const banner = `<div class="sr-pilot-banner"><strong>Iberian Pyrite Belt pilot</strong> · 10 sites across 3 Member States · four planned follow-up studies: lifecycle, social-needs fieldwork, hyperspectral validation, market study.</div>`;
  return `
    <header class="sr-topbar">
      <a class="sr-brand" href="/strata" aria-label="Strata on transitionslab.org">
        ${brandMark(22)}
        <span class="sr-brand-name">Strata</span>
        <span class="sr-brand-sub">Transitions Lab</span>
      </a>
      <nav class="sr-tabs" aria-label="Strata views">
        <a href="#map"         class="${S.view === 'map' ? 'is-current' : ''}">Map</a>
        <a href="#compare"     class="${S.view === 'compare' ? 'is-current' : ''}">Compare</a>
        <a href="#communities" class="${S.view === 'communities' ? 'is-current' : ''}">Communities</a>
        <a href="#pipeline"    class="${S.view === 'pipeline' ? 'is-current' : ''}">Pipeline</a>
        <a href="#method"      class="${S.view === 'method' ? 'is-current' : ''}">Method</a>
        <a href="#data"        class="${S.view === 'data' ? 'is-current' : ''}">Data</a>
        <a href="#about"       class="${S.view === 'about' ? 'is-current' : ''}">About</a>
      </nav>
      <div class="sr-tools">
        <button class="sr-tbtn sr-share" type="button" aria-label="Copy a share link to this view" title="Share this view (press S)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></svg>
        </button>
        <button class="sr-tbtn sr-print" type="button" aria-label="Print this view" title="Print (press P)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></svg>
        </button>
        <button class="sr-tbtn sr-help" type="button" aria-label="How to use Strata" title="Help (press ?)">
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
          <a class="sr-abtn" href="/strata-guide">Full guide: functions &amp; use cases</a>
          <a class="sr-abtn" href="/strata-method">Method</a>
          <a class="sr-abtn" href="/strata-paper">Companion paper</a>
        </div>
      </div>
    </div>
  `;
}

function currentViewHTML() {
  const wrap = (html, isMap) =>
    `<div class="sr-page${isMap ? ' is-map' : ''}">${html}</div>`;
  if (S.view === 'compare')     return wrap(comparePageHTML(),     false);
  if (S.view === 'communities') return wrap(communitiesPageHTML(), false);
  if (S.view === 'pipeline')    return wrap(pipelinePageHTML(),    false);
  if (S.view === 'method')      return wrap(methodPageHTML(),      false);
  if (S.view === 'data')        return wrap(dataPageHTML(),        false);
  if (S.view === 'about')       return wrap(aboutPageHTML(),       false);
  return wrap(mapPageInnerHTML(), true);
}

// ───────────────────────── Chrome wiring ────────────────────────
function wireChrome() {
  const t = ROOT.querySelector('.sr-theme');
  if (t) t.addEventListener('click', toggleTheme);
  const h = ROOT.querySelector('.sr-help');
  if (h) h.addEventListener('click', () => {
    const ob = ROOT.querySelector('#sr-onboard'); if (ob) ob.hidden = false;
  });
  const sh = ROOT.querySelector('.sr-share');
  if (sh) sh.addEventListener('click', () => copyText(location.href, 'Link copied'));
  const pr = ROOT.querySelector('.sr-print');
  if (pr) pr.addEventListener('click', () => window.print());
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
function mapPageInnerHTML() {
  const visible = filteredSites();
  const haTotal = visible.reduce((a, f) => a + (S.context[f.properties.id]?.areaHa || 0), 0);
  const volTotal = visible.reduce((a, f) => a + ((S.context[f.properties.id]?.dem?.volumeAboveBaseM3 || 0) / 1_000_000), 0);
  const flagged = visible.filter((f) => (deriveCard(f).lifecycle.flags || []).length).length;

  const detailHTML = S.selected ? siteDetailHTML(S.selected) : emptyDetailHTML();
  const bodyClass = S.selected ? '' : ' no-detail';
  return `
    <div class="sr-map-page${bodyClass}">
      <aside class="sr-col sr-col-left sr-sheet sr-sheet--peek">
        <div class="sr-sheet-handle" role="button" tabindex="0" aria-label="Expand filters and site list" data-sr-sheet>
          <span class="sr-sheet-caption" id="sr-sheet-caption">${visible.length} sites · tap to filter</span>
        </div>
        <div class="sr-sheet-body">
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
          <div class="sr-filter-group">
            <span class="sr-label sr-filter-label">Watchlist (${S.watchlist.size})</span>
            <div class="sr-chipset" id="f-watch">
              <button class="sr-chip${S.filters.watchlist ? ' is-on' : ''}" data-val="only" aria-pressed="${S.filters.watchlist}"><span class="sr-pill-dot"></span>Only saved sites</button>
            </div>
          </div>
        </div>
        <div class="sr-list-head">
          <span class="sr-label">Sites <span class="sr-list-count">(${visible.length})</span></span>
        </div>
        <div class="sr-list-wrap">
          <ul class="sr-list">${listRowsHTML(visible)}</ul>
        </div>
        </div>
      </aside>
      <div class="sr-col sr-col-map">
        <div id="sr-leaflet" class="sr-leaflet"></div>

        <!-- Compact map-tools stack, top-right of the map. -->
        <div class="sr-map-tools" aria-label="Map tools">
          <details class="sr-mt-group" data-sr-mt="basemap">
            <summary><span class="sr-mt-label">Base</span><span class="sr-mt-value" data-sr-basemap-value>Satellite</span></summary>
            <div class="sr-mt-menu">
              <button type="button" data-basemap="satellite" class="is-on">Satellite</button>
              <button type="button" data-basemap="street">Street</button>
              <button type="button" data-basemap="terrain">Terrain</button>
            </div>
          </details>
          <details class="sr-mt-group" data-sr-mt="layers">
            <summary><span class="sr-mt-label">Layers</span><span class="sr-mt-value">${layerSummary()}</span></summary>
            <div class="sr-mt-menu sr-mt-menu--layers">
              <label class="sr-mt-check"><input type="checkbox" data-sr-layer="pop1km"  ${S.layers.pop1km  ? 'checked' : ''}><span><strong>Population within 1 km</strong><em>Orange ring around each site. People = GHSL 2025.</em></span></label>
              <label class="sr-mt-check"><input type="checkbox" data-sr-layer="pop5km"  ${S.layers.pop5km  ? 'checked' : ''}><span><strong>Population within 5 km</strong><em>Lighter outer ring, GHSL 2025.</em></span></label>
              <label class="sr-mt-check"><input type="checkbox" data-sr-layer="natura"  ${S.layers.natura  ? 'checked' : ''}><span><strong>Natura 2000 overlap</strong><em>Green halo on sites with overlap within 1 km.</em></span></label>
              <label class="sr-mt-check"><input type="checkbox" data-sr-layer="motion"  ${S.layers.motion  ? 'checked' : ''}><span><strong>Ground motion flag</strong><em>Dashed halo where EGMS subsidence > threshold.</em></span></label>
              <label class="sr-mt-check"><input type="checkbox" data-sr-layer="polygon" ${S.layers.polygon ? 'checked' : ''}><span><strong>Site polygon outline</strong><em>Shape of the waste footprint on the ground.</em></span></label>
            </div>
          </details>
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

        <!-- Lon/lat readout bottom-right -->
        <div class="sr-coord-readout" id="sr-coord" aria-live="polite" aria-atomic="true"></div>
      </div>
      ${S.selected ? `<aside class="sr-col sr-col-detail sr-sheet sr-sheet--full">
        <div class="sr-sheet-handle" role="button" tabindex="0" aria-label="Resize site card" data-sr-sheet>
          <span class="sr-sheet-caption">Site card · tap to resize</span>
          <button class="sr-sheet-close" type="button" data-sr-close aria-label="Close site card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>
        <div class="sr-sheet-body">${detailHTML}</div>
      </aside>` : ''}
    </div>`;
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
let L_BUFFERS_1K = new Map();   // site id -> leaflet circle
let L_BUFFERS_5K = new Map();   // site id -> leaflet circle
let L_HALOS = new Map();        // site id -> array of layers (natura, motion halos)
let L_SITE_LAYERS = { pop1km: null, pop5km: null, natura: null, motion: null, polygon: null };
let L_BASE_LAYERS = {};
let L_CURRENT_BASE = 'satellite';

function afterMapRender() {
  initLeafletMap();
  paintMarkers();
  wireFilters();
  wireListAndMap();
  wireBasemapSwitch();
  wireLayerToggles();
  wireMobileSheets();
  wireMapHotkeys();
}

// Close any open map-tools dropdown when the user interacts with the
// map itself, so a stray panel doesn't block pins.
function wireMapHotkeys() {
  if (!L_MAP) return;
  const close = () => ROOT.querySelectorAll('details.sr-mt-group[open]').forEach((d) => { d.open = false; });
  L_MAP.on('click dragstart zoomstart', close);
}

// ─── Mobile bottom-sheet (phone layout) ─────────────────────────
const SHEET_STATES = ['peek', 'half', 'full'];
function cycleSheet(el) {
  const current = SHEET_STATES.find((s) => el.classList.contains('sr-sheet--' + s)) || 'peek';
  const next = SHEET_STATES[(SHEET_STATES.indexOf(current) + 1) % SHEET_STATES.length];
  setSheetState(el, next);
}
function setSheetState(el, state) {
  SHEET_STATES.forEach((s) => el.classList.toggle('sr-sheet--' + s, s === state));
  // Allow Leaflet to re-measure after the animation.
  if (L_MAP && typeof L_MAP.invalidateSize === 'function') {
    setTimeout(() => { try { L_MAP.invalidateSize(false); } catch (_) {} }, 320);
  }
}
function wireMobileSheets() {
  ROOT.querySelectorAll('[data-sr-sheet]').forEach((handle) => {
    handle.addEventListener('click', (ev) => {
      // The X button inside the handle has its own close logic;
      // don't let its click bubble up to toggle the sheet.
      if (ev.target.closest('[data-sr-close]')) return;
      const sheet = handle.closest('.sr-sheet');
      if (sheet) cycleSheet(sheet);
    });
  });
  // When a site opens on narrow screens, start the detail sheet at half
  // so the map stays visible above it.
  if (window.matchMedia && window.matchMedia('(max-width: 720px)').matches) {
    const detail = ROOT.querySelector('.sr-col-detail');
    if (detail) setSheetState(detail, 'half');
  }
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

  // Group containers for the overlay layers. Each is addTo'd when the
  // corresponding toggle is on; paintMarkers populates each on every
  // repaint. Pane order sets the stack: polygons under pins, halos
  // between.
  L_SITE_LAYERS.pop5km  = L.layerGroup();
  L_SITE_LAYERS.pop1km  = L.layerGroup();
  L_SITE_LAYERS.polygon = L.layerGroup();
  L_SITE_LAYERS.natura  = L.layerGroup();
  L_SITE_LAYERS.motion  = L.layerGroup();
  applyLayerToggles();

  // Scale bar (metric only) + persistent coord readout.
  try { L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(L_MAP); } catch (_) {}
  const coord = ROOT.querySelector('#sr-coord');
  if (coord) {
    L_MAP.on('mousemove', (e) => {
      coord.textContent = fmtLat(e.latlng.lat) + ' · ' + fmtLon(e.latlng.lng);
    });
    L_MAP.on('mouseout', () => { coord.textContent = ''; });
  }

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

function applyLayerToggles() {
  if (!L_MAP) return;
  for (const key of Object.keys(L_SITE_LAYERS)) {
    const group = L_SITE_LAYERS[key];
    if (!group) continue;
    const want = !!S.layers[key];
    const have = L_MAP.hasLayer(group);
    if (want && !have) group.addTo(L_MAP);
    else if (!want && have) L_MAP.removeLayer(group);
  }
}

function fmtLat(l) { const abs = Math.abs(l).toFixed(3); return abs + '° ' + (l >= 0 ? 'N' : 'S'); }
function fmtLon(l) { const abs = Math.abs(l).toFixed(3); return abs + '° ' + (l >= 0 ? 'E' : 'W'); }

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
  // Clear existing marker + polygon layers; clear every overlay group.
  for (const m of L_MARKERS.values()) L_MAP.removeLayer(m);
  L_MARKERS.clear(); L_POLYGONS.clear(); L_BUFFERS_1K.clear(); L_BUFFERS_5K.clear(); L_HALOS.clear();
  for (const key of Object.keys(L_SITE_LAYERS)) {
    if (L_SITE_LAYERS[key]) L_SITE_LAYERS[key].clearLayers();
  }

  const visible = new Set(filteredSites().map((f) => f.properties.id));

  for (const f of S.sites) {
    const p = f.properties;
    const [cx, cy] = centroid(f.geometry);
    const ctx = S.context[p.id] || {};
    const area = ctx.areaHa || 0;
    const r = Math.max(8, Math.min(22, 6 + Math.log(1 + area) * 2.5));
    const card = deriveCard(f);
    const stage = card.lifecycle.stage;
    const isActive = S.selected === p.id;
    const dim = !visible.has(p.id);
    const hasFlag = (card.lifecycle.flags || []).length > 0;
    const latlng = [cy, cx];

    // Site polygon (ghost outline)
    const poly = L.polygon(flipLatLng(f.geometry.coordinates[0]), {
      color: stageHex(stage),
      weight: isActive ? 2.5 : 1.5,
      opacity: dim ? 0.25 : 0.95,
      fillOpacity: isActive ? 0.22 : 0.1,
      interactive: false,
      className: 'sr-poly',
    });
    L_SITE_LAYERS.polygon.addLayer(poly);
    L_POLYGONS.set(p.id, poly);

    // Population buffers (1 km orange, 5 km lighter). The circles use
    // real metric radii, so at every zoom the ring is to scale with
    // the ground. Click opens the site card.
    const buf1 = L.circle(latlng, {
      radius: 1000,
      color: '#C2502A', weight: 1.2, dashArray: '4 3',
      fillOpacity: dim ? 0.02 : 0.06, fillColor: '#C2502A',
      className: 'sr-buf sr-buf--1km',
    }).bindTooltip(`<strong>${esc(p.name)}</strong><br>People within 1 km: <strong>${fmtInt(ctx.population?.within1km)}</strong>`, { sticky: true, direction: 'top', className: 'sr-tt' });
    buf1.on('click', () => go(p.id === S.selected ? 'map' : 'site-' + p.id.toLowerCase()));
    L_SITE_LAYERS.pop1km.addLayer(buf1);
    L_BUFFERS_1K.set(p.id, buf1);

    const buf5 = L.circle(latlng, {
      radius: 5000,
      color: '#C2502A', weight: 0.8, opacity: dim ? 0.15 : 0.5,
      fillOpacity: dim ? 0.01 : 0.03, fillColor: '#C2502A',
      className: 'sr-buf sr-buf--5km',
    }).bindTooltip(`<strong>${esc(p.name)}</strong><br>People within 5 km: <strong>${fmtInt(ctx.population?.within5km)}</strong>`, { sticky: true, direction: 'top', className: 'sr-tt' });
    buf5.on('click', () => go(p.id === S.selected ? 'map' : 'site-' + p.id.toLowerCase()));
    L_SITE_LAYERS.pop5km.addLayer(buf5);
    L_BUFFERS_5K.set(p.id, buf5);

    // Natura 2000 halo — ring at ~1.5 km for sites with any overlap
    // within 1 km. Communicates "habitat sensitive" at a glance.
    const naturaHa = (ctx.natura2000?.within1kmHa || 0) + (ctx.natura2000?.withinPolygonHa || 0);
    if (naturaHa > 0) {
      const halo = L.circle(latlng, {
        radius: 1500,
        color: '#1D6B55', weight: 2, opacity: dim ? 0.3 : 0.85,
        fillOpacity: dim ? 0.02 : 0.05, fillColor: '#1D6B55',
        className: 'sr-halo sr-halo--natura',
      }).bindTooltip(`<strong>${esc(p.name)}</strong><br>Natura 2000 within 1 km: <strong>${fmtHa(naturaHa)} ha</strong>${ctx.natura2000?.distanceM != null ? '<br>Distance to protected area: <strong>' + fmtInt(ctx.natura2000.distanceM) + ' m</strong>' : ''}`, { sticky: true, direction: 'top', className: 'sr-tt' });
      L_SITE_LAYERS.natura.addLayer(halo);
    }

    // Ground-motion halo for sites that trip the EGMS flag.
    const motionShare = ctx.egms?.shareBelowThresholdPct || 0;
    const motionFlag = motionShare >= (S.config?.lifecycle?.groundMotionSharePct || 10);
    if (motionFlag) {
      const halo = L.circle(latlng, {
        radius: 2000,
        color: '#E2A93B', weight: 2, opacity: dim ? 0.3 : 0.9, dashArray: '6 4',
        fillOpacity: 0, className: 'sr-halo sr-halo--motion',
      }).bindTooltip(`<strong>${esc(p.name)}</strong><br>Ground motion: <strong>${round(motionShare, 1)}%</strong> of points subside faster than 5 mm/yr<br><em>Signal for follow-up, not a finding.</em>`, { sticky: true, direction: 'top', className: 'sr-tt' });
      L_SITE_LAYERS.motion.addLayer(halo);
    }

    // Custom DivIcon for the stage-coloured dot
    const html = buildPinHTML(p.id, stage, r, isActive, hasFlag);
    const icon = L.divIcon({
      className: 'sr-pin-wrap' + (dim ? ' sr-pin-wrap--dim' : ''),
      html,
      iconSize: [r * 2 + 60, r * 2 + 10],
      iconAnchor: [r + 30, r + 5],
    });
    const marker = L.marker(latlng, { icon, keyboard: true, title: p.name });
    marker.on('click', () => {
      go(p.id === S.selected ? 'map' : 'site-' + p.id.toLowerCase());
    });
    marker.bindPopup(markerPopupHTML(f, card, ctx), {
      maxWidth: 260, minWidth: 220, closeButton: false,
      className: 'sr-pop',
    });
    marker.on('mouseover', (e) => { e.target.openPopup(); });
    marker.addTo(L_MAP);
    L_MARKERS.set(p.id, marker);
  }
  // Make sure the overlay groups are on/off per the current prefs
  applyLayerToggles();
}

// Compact pin popup — reads at a glance, offers two actions.
function markerPopupHTML(f, card, ctx) {
  const p = f.properties;
  const lc = card.lifecycle;
  const latest = card.latest || {};
  const flagList = (lc.flags || []).map((x) => esc(x.id.replace(/_/g,' '))).join(' · ') || '—';
  const stageLabel = lc.label || STAGE_LABEL[lc.stage] || '—';
  return `
    <div class="sr-pop-head">
      <strong>${esc(p.name)}</strong>
      <span class="sr-pop-sub">${esc(p.id)} · ${esc(p.municipality || '')}${p.municipality ? ', ' : ''}${esc(p.country)}</span>
    </div>
    <div class="sr-pop-stage" data-stage="${esc(lc.stage)}">${esc(stageLabel)}</div>
    <dl class="sr-pop-facts">
      <dt>Waste area</dt><dd>${fmtHa(ctx.areaHa)} ha</dd>
      <dt>Bare now</dt><dd>${fmtPct(latest.barePct)}</dd>
      <dt>Vegetation</dt><dd>${fmtPct(latest.vegetationPct)}</dd>
      <dt>People 1 km</dt><dd>${fmtInt(ctx.population?.within1km)}</dd>
      <dt>Flags</dt><dd>${flagList}</dd>
    </dl>
    <div class="sr-pop-actions">
      <a href="#site-${esc(p.id.toLowerCase())}" class="sr-pop-cta">Open full card &rarr;</a>
    </div>
  `;
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
  const details = ROOT.querySelector('details.sr-mt-group[data-sr-mt="basemap"]');
  if (!details) return;
  details.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-basemap]');
    if (!btn || !L_MAP) return;
    ev.preventDefault();
    const which = btn.getAttribute('data-basemap');
    if (which === L_CURRENT_BASE) { details.open = false; return; }
    details.querySelectorAll('button[data-basemap]').forEach((b) => b.classList.toggle('is-on', b === btn));
    if (L_BASE_LAYERS[L_CURRENT_BASE]) L_MAP.removeLayer(L_BASE_LAYERS[L_CURRENT_BASE]);
    L_CURRENT_BASE = which;
    if (L_BASE_LAYERS[which]) L_BASE_LAYERS[which].addTo(L_MAP);
    const label = ROOT.querySelector('[data-sr-basemap-value]');
    if (label) label.textContent = btn.textContent;
    details.open = false;
  });
}

function wireLayerToggles() {
  const details = ROOT.querySelector('details.sr-mt-group[data-sr-mt="layers"]');
  if (!details) return;
  details.addEventListener('change', (ev) => {
    const cb = ev.target.closest('input[data-sr-layer]');
    if (!cb) return;
    const key = cb.getAttribute('data-sr-layer');
    S.layers[key] = cb.checked;
    writeLayerPrefs();
    applyLayerToggles();
    const sum = details.querySelector('.sr-mt-value');
    if (sum) sum.textContent = layerSummary();
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
  // Watchlist chip: a plain boolean toggle rather than a Set.
  const wrow = ROOT.querySelector('#f-watch');
  if (wrow) wrow.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.sr-chip'); if (!btn) return;
    S.filters.watchlist = !S.filters.watchlist;
    btn.classList.toggle('is-on', S.filters.watchlist);
    btn.setAttribute('aria-pressed', String(S.filters.watchlist));
    refreshMapOnly();
  });
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
  const sheetCap = ROOT.querySelector('#sr-sheet-caption');
  if (sheetCap) sheetCap.textContent = `${visible.length} sites · tap to filter`;
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
      // R3 — detail tools: star (watchlist), share, print
      const star = ev.target.closest('[data-sr-star]');
      if (star) {
        if (S.watchlist.has(S.selected)) S.watchlist.delete(S.selected);
        else S.watchlist.add(S.selected);
        writeWatchlist();
        const pressed = S.watchlist.has(S.selected);
        star.setAttribute('aria-pressed', String(pressed));
        const svg = star.querySelector('svg');
        if (svg) svg.setAttribute('fill', pressed ? 'currentColor' : 'none');
        toastMsg(pressed ? 'Added to watchlist' : 'Removed from watchlist');
        refreshMapOnly();
        return;
      }
      const share = ev.target.closest('[data-sr-share]');
      if (share) {
        const url = share.getAttribute('data-url') || location.href;
        copyText(url, 'Link copied');
        return;
      }
      const prt = ev.target.closest('[data-sr-print]');
      if (prt) { window.print(); return; }
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
    if (S.filters.watchlist && !S.watchlist.has(p.id)) return false;
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
  const flagPills = (lc.flags || []).map((fl) => renderFlagChip(fl)).join('');
  const starred = S.watchlist.has(p.id);
  const siteUrl = location.origin + location.pathname + '#site-' + p.id.toLowerCase();

  return `
    <section class="sr-detail">
      <div class="sr-detail-head">
        <div class="sr-detail-tools">
          <button class="sr-detail-tool" type="button" data-sr-star aria-pressed="${starred}" aria-label="Save to watchlist" title="Save to watchlist">
            <svg viewBox="0 0 24 24" fill="${starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9z"/></svg>
          </button>
          <button class="sr-detail-tool" type="button" data-sr-share data-url="${esc(siteUrl)}" aria-label="Copy share link" title="Copy share link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></svg>
          </button>
          <button class="sr-detail-tool" type="button" data-sr-print aria-label="Print this site card" title="Print this site card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></svg>
          </button>
          <button class="sr-detail-close" data-sr-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg></button>
        </div>
        <div class="sr-detail-code">${esc(p.id)} · ${esc((p.crm_candidates||[]).join(' · ').toUpperCase() || p.deposit_type || '')}</div>
        <h2>${esc(p.name)}</h2>
        <p class="sr-detail-sub">${esc(p.municipality || '')}${p.municipality ? ', ' : ''}${esc(p.country)} · ${esc(p.region || '')}</p>
        <div class="sr-detail-pills">${stagePill}${flagPills}</div>
        <p class="sr-detail-sub" style="margin-top:10px;"><span class="sr-label">Register status</span> &nbsp; ${esc(p.status_note || '')}</p>
      </div>

      <div class="sr-sect">
        <span class="sr-label sr-sect-head">Key facts</span>
        <div class="sr-kf">
          <div class="sr-kf-cell"><span class="sr-label">Waste area (satellite)${methodMark('area')}</span><span class="sr-n">${fmtHa(area)}<span class="sr-unit">ha</span></span></div>
          <div class="sr-kf-cell"><span class="sr-label">Volume proxy${methodMark('volume')}</span><span class="sr-n">${fmtVol(vol)}<span class="sr-unit">m³ · DEM 2011–15</span></span></div>
          <div class="sr-kf-cell"><span class="sr-label">Bare ground now${methodMark('bare')}</span><span class="sr-n">${fmtPct(latest.barePct)}</span></div>
          <div class="sr-kf-cell"><span class="sr-label">Vegetation now${methodMark('veg')}</span><span class="sr-n">${fmtPct(latest.vegetationPct)}</span></div>
          <div class="sr-kf-cell"><span class="sr-label">People within 1 km${methodMark('pop1')}</span><span class="sr-n">${fmtInt(ctx.population?.within1km)}</span></div>
          <div class="sr-kf-cell"${(lc.flags || []).some((x)=>x.id==='red_water') ? ' data-alert="1"' : ''}><span class="sr-label">Red water, share of water${methodMark('redwater')}</span><span class="sr-n">${fmtPct(latest.redWaterOfWaterPct)}</span></div>
        </div>
      </div>

      <div class="sr-sect">
        <span class="sr-label sr-sect-head">Who lives nearby</span>
        ${buffersSVG(ctx.population || {})}
        <p class="sr-sect-note">Rings are to scale (not the map scale). Population from GHSL R2023A, epoch 2025.</p>
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
          ${recoveryDial(latest.vegetationPct, lc.clock)}
          <div class="sr-recovery-body">
            <span class="sr-label">Natural recovery clock</span>
            <p>${esc(lc.clock?.label || 'Not enough valid years for a trend yet.')}</p>
            <p class="sr-sect-note">Theil-Sen trend of vegetation %; 50 % is the "recovered" target. See <a href="/strata-method#3-natural-recovery-clock">the method</a>.</p>
          </div>
        </div>
      </div>

      <div class="sr-sect">
        <span class="sr-label sr-sect-head">Pathways</span>
        ${pathwaysBlock(p, lc, latest, ctx, vol)}
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

// ─── Site-card helpers (R2) ──────────────────────────────────────

// A small (?) icon that opens the method panel for a given stat key.
// Hover shows the one-sentence explanation; click opens the method
// page on the right anchor. Cheap, uses the title attribute as a
// tooltip; a real popover is overkill for a signal.
const METHOD_BLURBS = {
  area:     { tip: 'Hectares inside the site polygon from OSM / Tang & Werner 2023.', href: '/strata-method#1-satellite-inputs' },
  volume:   { tip: 'Volume above the DEM baseline, a proxy for waste tonnage. Copernicus DEM GLO-30, epoch 2011–15.', href: '/strata-method#9-data-sources' },
  bare:     { tip: 'Share of valid pixels classified as bare ground. NDVI < 0.15 and BSI > 0, summer composite.', href: '/strata-method#2-pixel-indices-and-starting-thresholds' },
  veg:      { tip: 'Share of valid pixels classified as vegetation (NDVI ≥ 0.30).', href: '/strata-method#2-pixel-indices-and-starting-thresholds' },
  iron:     { tip: 'Share of bare pixels with B04 / B03 > 1.35 (oxidising sulphide waste signal).', href: '/strata-method#2-pixel-indices-and-starting-thresholds' },
  redwater: { tip: 'Red water share of water pixels. (B04 − B02) / (B04 + B02) > 0.15.', href: '/strata-method#2-pixel-indices-and-starting-thresholds' },
  pop1:     { tip: 'Residents inside a 1 km buffer, from GHS-POP R2023A epoch 2025.', href: '/strata-method#9-data-sources' },
  pop5:     { tip: 'Residents inside a 5 km buffer, from GHS-POP R2023A epoch 2025.', href: '/strata-method#9-data-sources' },
};
function methodMark(key) {
  const b = METHOD_BLURBS[key];
  if (!b) return '';
  return `<a class="sr-method-mark" href="${esc(b.href)}" title="${esc(b.tip)}" aria-label="Method: ${esc(b.tip)}">?</a>`;
}

// Flag chip with a "Why?" expander on click. Shows the trigger value
// and the threshold so the reader can see the rule that fired.
function renderFlagChip(fl) {
  const thresholds = S.config?.lifecycle || {};
  const label = fl.id.replace(/_/g, ' ');
  let why = '';
  switch (fl.id) {
    case 'red_water':
      why = `${round(fl.value, 1)} % of water pixels, threshold ${thresholds.redWaterFlagPct ?? 5} %.`; break;
    case 'iron_signal':
      why = `${round(fl.value, 1)} % of site surface, threshold ${thresholds.ironFlagPct ?? 20} %.`; break;
    case 'ground_motion':
      why = `${round(fl.value, 1)} % of EGMS points, threshold ${thresholds.groundMotionSharePct ?? 10} %.`; break;
    case 'new_disturbance':
      why = `Bare area now ${round(fl.value, 1)} × earlier median, +${round(fl.extraHa || 0, 1)} ha above baseline.`; break;
    default:
      why = 'See the method page.';
  }
  return `<details class="sr-pill sr-pill-flag sr-flag-why"><summary>${esc(label)}</summary><em>${esc(why)}</em><br>Signal for follow-up, not a finding.</details>`;
}

// Concentric buffer rings. People inside 1 km orange, between 1 and
// 5 km in a softer orange. Sized relative, labelled with counts.
function buffersSVG(pop) {
  const inner = Number(pop.within1km) || 0;
  const outer = Number(pop.within5km) || 0;
  const ring  = Math.max(0, outer - inner);
  const w = 320, h = 160, cx = w / 2, cy = h - 10, r5 = 110, r1 = 22;
  const bar = (val, max) => Math.round(100 * (max ? val / max : 0));
  const totalBar = outer || 1;
  return `
    <div class="sr-buf-viz">
      <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Population within 1 km and 5 km of the site">
        <circle cx="${cx}" cy="${cy}" r="${r5}" fill="#C2502A" fill-opacity="0.08" stroke="#C2502A" stroke-opacity="0.5" stroke-dasharray="4 3"/>
        <circle cx="${cx}" cy="${cy}" r="${r1}" fill="#C2502A" fill-opacity="0.22" stroke="#C2502A"/>
        <circle cx="${cx}" cy="${cy}" r="1.5" fill="#111110"/>
        <text x="${cx + r1 + 6}" y="${cy - 2}" font-family="IBM Plex Mono,monospace" font-size="10" fill="#111110">1 km</text>
        <text x="${cx + r5 + 6}" y="${cy - 2}" font-family="IBM Plex Mono,monospace" font-size="10" fill="#111110">5 km</text>
      </svg>
      <dl class="sr-buf-stats">
        <div><dt>People within 1 km</dt><dd><strong>${fmtInt(inner)}</strong><span class="sr-bufbar"><span class="sr-bufbar-fill" style="width:${bar(inner, totalBar)}%;"></span></span></dd></div>
        <div><dt>People within 5 km (ring)</dt><dd><strong>${fmtInt(ring)}</strong><span class="sr-bufbar"><span class="sr-bufbar-fill sr-bufbar-fill--outer" style="width:${bar(ring, totalBar)}%;"></span></span></dd></div>
        <div><dt>People within 5 km (total)</dt><dd><strong>${fmtInt(outer)}</strong></dd></div>
      </dl>
    </div>`;
}

// Visual recovery dial. Needle at current vegetation %. 50 % target
// marked. If the clock is "recovering", years-to-target is printed.
function recoveryDial(vegPct, clock) {
  const pct = Math.max(0, Math.min(100, Number(vegPct) || 0));
  const label = clock?.state || 'insufficient';
  const colour = (pct >= 50) ? '#1D6B55' : (pct >= 25 ? '#B9A98C' : '#C2502A');
  // SVG arc: 180° from (-90°) to (+90°), bottom-up gauge
  const w = 150, h = 90, cx = w/2, cy = h - 6, r = 68;
  const toXY = (p) => {
    const a = Math.PI * (1 - p/100);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const [tx, ty] = toXY(pct);
  const [t50x, t50y] = toXY(50);
  return `
    <div class="sr-reco-dial">
      <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Vegetation ${round(pct,1)} % of a 50 % target">
        <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="#DCD7C7" stroke-width="10"/>
        <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${tx} ${ty}" fill="none" stroke="${colour}" stroke-width="10" stroke-linecap="butt"/>
        <line x1="${t50x}" y1="${t50y - 4}" x2="${t50x}" y2="${t50y + 4}" stroke="#111110" stroke-width="2"/>
        <text x="${cx}" y="${cy - 20}" text-anchor="middle" font-family="IBM Plex Sans,sans-serif" font-weight="600" font-size="18" fill="#111110">${round(pct, 0)}%</text>
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#6B6963" letter-spacing="0.08em">OF 50% TARGET</text>
      </svg>
      <span class="sr-reco-state sr-reco-state--${esc(label)}">${esc(label.toUpperCase())}</span>
    </div>`;
}

// Pathway block: three columns with evidence + an effort/outcome row.
function pathwaysBlock(p, lc, latest, ctx, vol) {
  const bulk = S.config?.bulkDensityTPerM3 || 1.8;
  const Mt = round(vol * bulk / 1_000_000, 1);
  const pop1 = Number(ctx.population?.within1km) || 0;
  const naturaFlag = (ctx.natura2000?.within1kmHa || 0) > 0 || (ctx.natura2000?.withinPolygonHa || 0) > 0;
  // Rough signal of how heavy each pathway would be. Index on 0–5.
  const leaveEffort = (lc.flags || []).length ? 2 : 1;
  const rehab = Math.min(5, 1 + Math.round(((latest.bareHa||0) + (latest.waterHa||0))/20) + (naturaFlag?1:0));
  const repro = Math.min(5, Math.round(Mt/5) + 1 + (pop1 > 500 ? 1 : 0));
  return `
    <div class="sr-pathways">
      <article class="sr-pathway" data-path="leave">
        <h4>Leave &amp; monitor</h4>
        <ul>
          <li><span class="sr-pw-k">Recovery clock</span><span class="sr-pw-v">${esc((lc.clock?.label || '—').toLowerCase())}</span></li>
          <li><span class="sr-pw-k">Flags today</span><span class="sr-pw-v">${(lc.flags||[]).length ? esc((lc.flags||[]).map(x=>x.id.replace(/_/g,' ')).join(', ')) : 'none'}</span></li>
          <li><span class="sr-pw-k">What Strata tracks</span><span class="sr-pw-v">vegetation, bare, iron, water, red water</span></li>
        </ul>
        ${effortRow('Effort', leaveEffort)}
        <div class="sr-pathway-footer">Lifecycle study under way, results expected June 2027.</div>
      </article>
      <article class="sr-pathway" data-path="rehab">
        <h4>Rehabilitate</h4>
        <ul>
          <li><span class="sr-pw-k">Bare area to treat</span><span class="sr-pw-v">${fmtHa(latest.bareHa)} ha</span></li>
          <li><span class="sr-pw-k">Water &amp; tailings</span><span class="sr-pw-v">${fmtHa(latest.waterHa)} ha</span></li>
          <li><span class="sr-pw-k">Volume to reshape</span><span class="sr-pw-v">${fmtVol(vol)} m³</span></li>
          <li><span class="sr-pw-k">Natura 2000 &lt; 1 km</span><span class="sr-pw-v">${fmtHa(ctx.natura2000?.within1kmHa)} ha</span></li>
        </ul>
        ${effortRow('Effort', rehab)}
        <div class="sr-pathway-footer">Lifecycle study under way, results expected June 2027.</div>
      </article>
      <article class="sr-pathway" data-path="repro">
        <h4>Reprocess &amp; rehabilitate</h4>
        <ul>
          <li><span class="sr-pw-k">Volume proxy</span><span class="sr-pw-v">${fmtVol(vol)} m³ (${Mt} Mt)</span></li>
          <li><span class="sr-pw-k">CRM candidates</span><span class="sr-pw-v">${esc((p.crm_candidates || []).join(', ') || '—')}<br><em>not measured</em></span></li>
          <li><span class="sr-pw-k">People within 1 km</span><span class="sr-pw-v">${fmtInt(ctx.population?.within1km)}</span></li>
          <li><span class="sr-pw-k">Nearest watercourse</span><span class="sr-pw-v">${esc(ctx.river?.name || '—')}, ${fmtInt(ctx.river?.distanceM)} m</span></li>
        </ul>
        ${effortRow('Effort', repro)}
        <div class="sr-pathway-footer">Lifecycle study under way, results expected June 2027.</div>
      </article>
    </div>`;
}

function effortRow(label, score) {
  const bars = [0,1,2,3,4].map((i) => `<span class="sr-effort-dot${i < score ? ' is-on' : ''}"></span>`).join('');
  return `<div class="sr-effort"><span class="sr-label">${esc(label)} (relative, 1–5)</span><span class="sr-effort-bars" aria-label="${score} of 5">${bars}</span></div>`;
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
      <p><strong>Pull the latest Sentinel-2 scene over this site.</strong> Your browser reads the most recent clear Sentinel-2 Level-2A acquisition via the free Earth Search STAC, downloads only the six bands + Scene Classification Layer window around this site as Cloud-Optimised GeoTIFFs, and runs the Strata classifier on every 10 m pixel: vegetation, bare ground, bare with iron oxide signal, water, red/orange water.</p>
      <button class="sr-live-btn" type="button" data-sr-live="${esc(siteId)}">Load latest Sentinel-2 scene &rarr;</button>
      <p class="sr-live-note">No account, no server. 8–20 seconds on a home connection. See <a href="#pipeline">Pipeline</a> for what runs where and <a href="#method">Method</a> for every equation.</p>
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
    <p>Strata reads Sentinel-2 Level-2A surface reflectance (10 m, 20 m bands resampled bilinear, SCL resampled nearest) and classifies every valid pixel inside each site polygon and a 500 m outer ring. Thresholds below are the pilot starting values; a planned feasibility study will calibrate them against hyperspectral imagery (PRISMA, EnMAP) and field data.</p>
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
    <p class="sr-lede">Mining and quarrying produced <strong>22.7% of the EU's 2.2 billion tonnes of waste in 2022</strong>. Article 27 of the Critical Raw Materials Act now requires every Member State to build a database of closed and abandoned extractive waste facilities — their location, area, waste volume, operator and raw material content — so that critical raw materials can be recovered where it makes sense. Strata gives each site a satellite lifecycle card so authorities, communities and reprocessors can start from the same open evidence.</p>

    <h2>Three users</h2>
    <div class="sr-aud-grid">
      <div class="sr-aud">
        <span class="sr-aud-kick">Who</span>
        <h3>Geological surveys and mining authorities</h3>
        <p>Decide which closed facility deserves field sampling first, and pre-fill area and volume for the Article 27 database. Export one row per site with the Article 27 field names. Fields Strata cannot measure from space (operator, measured metal content) are left empty by design.</p>
        <p class="sr-aud-ex"><strong>Example users:</strong> GTK (Finland, assigned the task from 1 November 2026), LNEG (Portugal, National Exploration Program 2025–2030), IGME (Spain), GBA (Austria), SGU (Sweden), BGR (Germany).</p>
      </div>
      <div class="sr-aud">
        <span class="sr-aud-kick">Who</span>
        <h3>Municipalities, residents, local NGOs</h3>
        <p>Understand what is happening on the heap next door and what each pathway (leave, rehabilitate, reprocess) would mean. Plain-language card, no login, mobile-friendly, right-of-reply for the promoter.</p>
        <p class="sr-aud-ex"><strong>Example users:</strong> Câmara Municipal de Mértola, Nerva and Minas de Riotinto town councils, Aznalcóllar residents' groups, Fundación Río Tinto, ENoLL living labs, Social Innovation Europe network partners.</p>
      </div>
      <div class="sr-aud">
        <span class="sr-aud-kick">Who</span>
        <h3>Reprocessing firms and investors</h3>
        <p>Shortlist sites worth sampling for secondary critical raw materials, with a compare table sortable by volume proxy, iron signal, access, protected area overlap and people nearby. API and audit-ready data packs in the Pro tier.</p>
        <p class="sr-aud-ex"><strong>Example users:</strong> Umicore, Boliden secondary stream, European Metal Recycling, Northvolt materials sourcing, consultancies supporting CRMA Article 27 compliance.</p>
      </div>
    </div>

    <h2>The three pathways</h2>
    <p>Every closed extractive waste facility faces a choice between three pathways. Strata gives the satellite facts that matter for each of them side by side, and a planned lifecycle study will add a formal LCA-style comparison on three impact axes.</p>
    <div class="sr-path-grid">
      <div class="sr-path">
        <h4>Leave and monitor</h4>
        <p>Vegetation returns naturally; the heap is left in place and tracked annually. Strata shows the recovery clock, flags any new disturbance, and keeps a permanent public baseline against which future reprocessing or rehabilitation can be measured.</p>
      </div>
      <div class="sr-path">
        <h4>Rehabilitate</h4>
        <p>Reshape heaps, cap tailings, treat acid drainage, restore vegetation. Strata gives the bare area to treat, the water and tailings extent, the heap volume to reshape, and the Natura 2000 overlap that constrains the design.</p>
      </div>
      <div class="sr-path">
        <h4>Reprocess and rehabilitate</h4>
        <p>Recover critical raw materials from the waste before rehabilitating. Strata gives a volume proxy and a tonnage proxy at an assumed bulk density, the CRM candidates from the deposit type (labelled as not measured), and the people and watercourse context the decision affects.</p>
      </div>
    </div>

    <h2>Partners</h2>
    <div class="sr-partners">
      <div class="sr-partner">
        <h3>Transitions Lab B.V. <span class="sr-partner-role">Lead</span></h3>
        <p>Independent socio-technical research organisation based in Delft, specialising in before-and-after measurement of technology transitions. Field operations in Nairobi and Lombok and a growing European research strand. Builds the method, the pipeline and the web tool; runs the field research that sits beside the satellite record.</p>
      </div>
      <div class="sr-partner">
        <h3>Pyropower <span class="sr-partner-role">Industry partner</span></h3>
        <p>Open-source pyrolysis and biochar technology for smallholder processing. Pyropower's operating experience on the materials-and-energy side of the extractive industry informs Strata's processing-stage indicators and the reprocessing-pathway shortlist. Reviews the reprocessing pathway in service S1.</p>
      </div>
      <div class="sr-partner">
        <h3>Social Innovation Europe <span class="sr-partner-role">Community partner</span></h3>
        <p>Network of social-innovation organisations across EU Member States and the Western Balkans. Reaches the civil society organisations, municipalities and residents' groups beside legacy mine waste; co-designs the social-needs research protocol with the fieldwork provider; disseminates the published site cards across the network.</p>
      </div>
    </div>

    <h2>Funding</h2>
    <p>The current demo deployment is on the Lab's own cash. Four planned follow-up services — lifecycle thinking, social-needs fieldwork, hyperspectral validation, and a market and business-model study — would move the tool from a working prototype to a validated public service. The Lab is pursuing funding for them openly; current status sits with Marcel.</p>

    <h2>Contact</h2>
    <p>Email <a href="mailto:marcel@transitionslab.org">marcel@transitionslab.org</a> about adding a site, hosting a community session, running Strata inside a lender's or buyer's due diligence process, or using the tool to pre-fill a national Article 27 database.</p>
  </article>`;
}

function communitiesPageHTML() {
  const list = (S.communities || []).map((c) => {
    const siteList = (c.beside_sites || []).map((sid) => {
      const s = S.sites.find((x) => x.properties.id === sid);
      return s ? `<a href="#site-${sid.toLowerCase()}">${esc(sid)} · ${esc(s.properties.name)}</a>` : esc(sid);
    }).join(' · ');
    const concerns = (c.main_concerns_prelim || []).map((x) => `<li>${esc(x)}</li>`).join('');
    const prefs = c.pathway_preferences_prelim || {};
    return `
      <article class="sr-com">
        <header>
          <span class="sr-label">Community</span>
          <h2>${esc(c.name)}</h2>
          <p class="sr-com-meta">${esc(c.municipality)} · ${fmtInt(c.population_estimate)} residents · ${fmtInt(c.population_within_5km)} within 5 km</p>
        </header>
        <section class="sr-com-sect">
          <span class="sr-label">Mining landscape</span>
          <p>${esc(c.landscape_character)}</p>
          <p><strong>Livelihoods today:</strong> ${esc(c.livelihoods_today)}</p>
          <p><strong>Beside sites:</strong> ${siteList || '—'}</p>
        </section>
        <section class="sr-com-sect">
          <span class="sr-label">Preliminary resident concerns (replaced by anonymised S2 themes in 2027)</span>
          <ul>${concerns}</ul>
        </section>
        <section class="sr-com-sect sr-com-paths">
          <span class="sr-label">Preliminary pathway preferences</span>
          <div class="sr-com-path"><h4>Leave &amp; monitor</h4><p>${esc(prefs.leave_and_monitor || '—')}</p></div>
          <div class="sr-com-path"><h4>Rehabilitate</h4><p>${esc(prefs.rehabilitate || '—')}</p></div>
          <div class="sr-com-path"><h4>Reprocess &amp; rehabilitate</h4><p>${esc(prefs.reprocess_and_rehabilitate || '—')}</p></div>
        </section>
        <footer class="sr-com-foot">Contact point: ${esc(c.contact_point || '—')}</footer>
      </article>`;
  }).join('');

  return `<article class="sr-content sr-content-wide">
    <h1>Communities</h1>
    <p class="sr-lede">Communities beside legacy mine waste live with its dust, water and landscape, and often with its heritage and the jobs a reopening might bring. The pilot's <strong>social-needs fieldwork</strong> runs 18 semi-structured interviews and one community session per community between February and May 2027. The content below is what Strata already carries about them, and what the fieldwork will replace with anonymised themes, quotes and pathway preferences.</p>
    ${list}
    <section class="sr-s2-plan">
      <h2>S2 fieldwork plan</h2>
      <ul>
        <li><strong>Timing:</strong> February to May 2027.</li>
        <li><strong>Sample:</strong> 18 interviews (residents, municipal staff, heritage and tourism, former mine workers, local business, environmental groups).</li>
        <li><strong>Sessions:</strong> one per community, 30+ participants in total; separate sessions for groups on request.</li>
        <li><strong>Languages:</strong> Portuguese and Spanish, led by a neutral facilitator independent of Transitions Lab.</li>
        <li><strong>Topics:</strong> lived experience, priorities, heritage, trust in satellite evidence, information needs, views on each pathway.</li>
        <li><strong>Ethics:</strong> informed consent; anonymity by default; published synthesis approved by participants; neutral facilitation at Aznalcóllar, which is contested.</li>
      </ul>
    </section>
  </article>`;
}

function pipelinePageHTML() {
  // How open data flows through the browser into a lifecycle card and
  // out into the Member State database. Makes the "AI classifier" bit
  // explicit so a reader sees what is doing the work.
  return `<article class="sr-content sr-content-wide">
    <h1>Pipeline</h1>
    <p class="sr-lede">A single site opens in your browser, no server, no account. These are the pieces, in the order they run.</p>

    <div class="sr-pipe">
      <div class="sr-pipe-col">
        <span class="sr-pipe-kick">Open data in</span>
        <ul class="sr-pipe-list">
          <li><strong>Copernicus Sentinel-2 L2A</strong><br><span>Earth Search STAC, Cloud-Optimised GeoTIFF window reads. No API key.</span></li>
          <li><strong>Copernicus DEM GLO-30</strong><br><span>Heap height and volume proxy. AWS public COGs.</span></li>
          <li><strong>European Ground Motion Service</strong><br><span>Sentinel-1 InSAR, EU + EEA sites only.</span></li>
          <li><strong>ESA WorldCover 2021</strong><br><span>Land cover around each site; land converted under the footprint.</span></li>
          <li><strong>JRC Global Surface Water</strong><br><span>Whether pit lakes and ponds pre-date the latest decade.</span></li>
          <li><strong>GHSL GHS-POP R2023A</strong><br><span>People within 1 and 5 km of the site.</span></li>
          <li><strong>OpenStreetMap + Tang &amp; Werner (2023)</strong><br><span>Site polygons where available; cross-check otherwise.</span></li>
        </ul>
      </div>

      <div class="sr-pipe-arrow">→</div>

      <div class="sr-pipe-col">
        <span class="sr-pipe-kick">In-browser pipeline</span>
        <div class="sr-pipe-box">
          <h3>strata-core.js</h3>
          <p class="sr-pipe-badge">26 of 26 unit tests pass</p>
          <ol class="sr-pipe-list sr-pipe-ol">
            <li>STAC search for the clearest scene over the site (last 180 days, cloud &lt; 40%).</li>
            <li>Read six bands + Scene Classification Layer as COG windows (bbox-only download).</li>
            <li>Compute pixel indices: NDVI, BSI, iron oxide ratio, clay / hydroxyl ratio, MNDWI, red-water index.</li>
            <li><strong>Classify every 10 m pixel</strong> into vegetation, bare, bare + iron, water, red water or other. This is a transparent decision-tree classifier (ML without the mystery), one method everywhere, every threshold in a config file.</li>
            <li>Build polygon + 500 m ring masks; summarise classes inside each.</li>
            <li>Theil-Sen trend of vegetation % → natural recovery clock (years to 50% at current trend).</li>
            <li>Lifecycle stage + four flag detectors (new disturbance, red water, iron signal, ground motion).</li>
          </ol>
        </div>
      </div>

      <div class="sr-pipe-arrow">→</div>

      <div class="sr-pipe-col">
        <span class="sr-pipe-kick">Open data out</span>
        <ul class="sr-pipe-list">
          <li><strong>Lifecycle card</strong><br><span>8 sections per site: header, key facts, now-from-space, 10-year chart, pathways, around-the-site, community, export.</span></li>
          <li><strong>Compare table</strong><br><span>All sites in the register, sortable, CSV + GeoJSON export.</span></li>
          <li><strong>CRMA Article 27 CSV row</strong><br><span>Fields keyed to the Member State database schema. Operator and measured metal content left empty by design.</span></li>
          <li><strong>Site GeoJSON polygon</strong><br><span>Released under CC BY 4.0, or CC BY-SA 4.0 if any share-alike inputs were used.</span></li>
          <li><strong>Methodology link + attribution</strong><br><span>On every exported artefact. Reproducible by anyone.</span></li>
        </ul>
      </div>
    </div>

    <h2>Everything stays in the browser</h2>
    <p>The classifier runs in the user's browser. No scene, no coordinate, no indicator leaves the device for a Transitions Lab server; the only outbound calls are to the public open-data archives listed above and to the OpenStreetMap / ESRI tile servers for the base map. There is no account, no password and no payment to use any of the free-tier functions.</p>

    <h2>What AI is actually doing here</h2>
    <p>The pixel classifier is a deterministic decision tree built from the Sentinel-2 spectral literature (van der Werff &amp; van der Meer 2016; Pereira et al. 2025; Aranda Quirós 2022). It is calibrated against hyperspectral reference imagery (PRISMA, EnMAP) in a planned feasibility study. The thresholds live in <code>config.json</code>, not in the UI code, so a calibration pass changes the output without rewriting the tool. This is intentional: generative models and black-box classifiers would make Strata harder to audit, which is the opposite of what a regulator or a local council needs from a satellite record.</p>

    <h2>How it scales</h2>
    <p>Adding a new site to Strata requires only its outline. The <a href="https://metadata.europe-geology.eu/record/full/6a391dd6-444c-42c5-a052-4df60a010e58">MIN4EU Mining Waste database</a> (EuroGeoSurveys, CC BY 4.0) already lists closed extractive waste facilities across more than 20 European countries. The pilot runs ten sites; the roadmap to the full register is a configuration exercise, not a redevelopment, which is why the method was built this way from day one.</p>
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

// R3 — share, toast, keyboard
function copyText(text, okMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => toastMsg(okMsg || 'Copied'))
      .catch(() => toastMsg('Copy failed — long-press to copy'));
  } else {
    try {
      const ta = document.createElement('textarea'); ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      toastMsg(okMsg || 'Copied');
    } catch (_) { toastMsg('Copy failed'); }
  }
}
let TOAST_TIMER = null;
function toastMsg(msg) {
  let el = document.getElementById('sr-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sr-toast'; el.className = 'sr-toast'; el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg; el.classList.add('is-on');
  clearTimeout(TOAST_TIMER);
  TOAST_TIMER = setTimeout(() => el.classList.remove('is-on'), 1800);
}

function openShortcutHelp() {
  let el = document.getElementById('sr-keys');
  if (el) { el.hidden = false; return; }
  el = document.createElement('div');
  el.id = 'sr-keys'; el.className = 'sr-onboard sr-keys';
  el.innerHTML = `
    <div class="sr-onboard-card">
      <button class="sr-onboard-close" type="button" aria-label="Close" data-sr-keys-close>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
      </button>
      <span class="sr-onboard-kick">Keyboard &amp; URL shortcuts</span>
      <h2>Move around Strata fast</h2>
      <table class="sr-keys-table">
        <tbody>
          <tr><th>?</th><td>Open this help</td></tr>
          <tr><th>Esc</th><td>Close the open site card or dialog</td></tr>
          <tr><th>M</th><td>Jump to the map</td></tr>
          <tr><th>C</th><td>Compare view</td></tr>
          <tr><th>G</th><td>Guide (external page)</td></tr>
          <tr><th>W</th><td>Toggle "Watchlist only" filter</td></tr>
          <tr><th>S</th><td>Share the current view URL</td></tr>
          <tr><th>P</th><td>Print the current page (optimised for site cards)</td></tr>
          <tr><th>#site-pt-sdo</th><td>Deep-link any site: <em>#site-&lt;id&gt;</em>, lower-case</td></tr>
          <tr><th>#compare, #communities, #pipeline, #method, #data, #about</th><td>Deep-link any view</td></tr>
        </tbody>
      </table>
      <div class="sr-onboard-actions">
        <button class="sr-abtn sr-abtn-primary" type="button" data-sr-keys-close>Got it</button>
        <a class="sr-abtn" href="/strata-guide">Full guide</a>
      </div>
    </div>`;
  el.addEventListener('click', (ev) => { if (ev.target.closest('[data-sr-keys-close]') || ev.target === el) el.hidden = true; });
  document.body.appendChild(el);
}

function wireGlobalKeys() {
  // Attach once per page lifetime; the function is idempotent via the
  // __srKeysWired flag so render() calling it over again is safe.
  if (document.__srKeysWired) return;
  document.__srKeysWired = true;
  document.addEventListener('keydown', (ev) => {
    const tag = (ev.target && ev.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === '?' || ev.key === '/') { openShortcutHelp(); ev.preventDefault(); return; }
    if (ev.key === 'Escape') {
      const kb = document.getElementById('sr-keys'); if (kb && !kb.hidden) { kb.hidden = true; return; }
      const ob = ROOT && ROOT.querySelector('#sr-onboard'); if (ob && !ob.hidden) { ob.hidden = true; return; }
      if (S.selected) { go('map'); return; }
    }
    if (ev.key === 'm' || ev.key === 'M') { go('map'); return; }
    if (ev.key === 'c' || ev.key === 'C') { go('compare'); return; }
    if (ev.key === 'g' || ev.key === 'G') { location.href = '/strata-guide'; return; }
    if (ev.key === 'p' || ev.key === 'P') { window.print(); return; }
    if (ev.key === 's' || ev.key === 'S') { copyText(location.href, 'Link copied'); return; }
    if (ev.key === 'w' || ev.key === 'W') {
      S.filters.watchlist = !S.filters.watchlist;
      toastMsg(S.filters.watchlist ? 'Showing watchlist only' : 'All sites');
      refreshMapOnly();
      return;
    }
  });
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
