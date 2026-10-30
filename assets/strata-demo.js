/*
 * Strata — the interactive site-monitor demo.
 *
 * Loaded by:
 *   /strata-demo (standalone, full-screen app page)
 *   any Lab page that embeds <div id="strata-demo"></div>
 *
 * This file is a self-contained vanilla JS component. It owns:
 *   - 16 illustrative sites across the EU plus one third-country
 *     site in Morocco (values generated for the pilot, not real
 *     indicators from a real project);
 *   - a brand header with the Strata mark + wordmark;
 *   - a light / dark theme toggle (persisted in localStorage);
 *   - a left column with totals, search, chip filters (stage,
 *     status, material, alerts-only) and a scrollable site list;
 *   - a centre column with a simplified Europe + North Africa
 *     map, lat/lon-placed pins, working zoom and recentre;
 *   - a right column with four stat tiles, a disturbed-footprint
 *     chart, a baseline-vs-latest footprint outline inside a 500 m
 *     buffer, an indicator table, and action buttons that export
 *     the site as CSV and copy a share link that re-opens the
 *     same site when loaded;
 *   - URL hash routing so a selected site is shareable, and the
 *     page re-selects it on reload.
 *
 * All data is ILLUSTRATIVE. The sand strip at the top of the tool
 * says so, and every site page says so again in the attribution
 * line at the bottom.
 */

(function () {
  'use strict';

  var mount = document.getElementById('strata-demo');
  if (!mount) return;

  // ─────────────────────────────────────────────────────────────
  // Data
  // ─────────────────────────────────────────────────────────────
  var SITES = [
    {
      code:'FI-N1', country:'FI',
      name:'Nickel and cobalt mine, eastern Finland',
      materials:['nickel','cobalt'],
      stage:'integrated', status:'operating',
      coord:{lon:28.0, lat:63.6},
      baselineYear:2019, worksStarted:2008,
      series:[['2019',1210],['2020',1245],['2021',1278],['2022',1310],['2023',1335],['2024',1358],['2025',1375],['2026',1389]],
      indicators:{vegLoss5kmPct:4.1, natura2000Pct:0.9, waterTailingsHa:182, groundMotionMmYr:8.3,
        landConverted:{'Tree cover':112,'Grassland':44,'Wetland':23}},
      alert:{title:'Ground motion above 8 mm/yr at tailings dam', body:'Flagged for review, not a finding of non-compliance.'},
      egmsCovered:true,
      promoterResponse:'Received, linked from site page.',
    },
    {
      code:'SE-G1', country:'SE',
      name:'Graphite mine, northern Sweden',
      materials:['graphite'],
      stage:'extraction', status:'under-construction',
      coord:{lon:20.3, lat:67.1},
      baselineYear:2023, worksStarted:2025,
      series:[['2023',1],['2024',2],['2025',12],['2026',33]],
      indicators:{vegLoss5kmPct:2.8, natura2000Pct:0.0, waterTailingsHa:1.2, groundMotionMmYr:2.1,
        landConverted:{'Tree cover':8,'Shrubland':21,'Cropland':4}},
      alert:{title:'Buffer vegetation loss above threshold', body:'Vegetation loss within 5 km exceeds the 2.5% threshold. Flagged for review, not a finding of non-compliance.'},
      egmsCovered:true,
    },
    {
      code:'SE-R1', country:'SE',
      name:'Rare earths project, northern Sweden',
      materials:['rare earths'],
      stage:'extraction', status:'pre-construction',
      coord:{lon:20.8, lat:67.9},
      baselineYear:2024, worksStarted:null,
      series:[['2024',0],['2025',0],['2026',0]],
      indicators:{vegLoss5kmPct:0.0, natura2000Pct:12.4, waterTailingsHa:0, groundMotionMmYr:0.4,
        landConverted:{}},
      egmsCovered:true,
    },
    {
      code:'NO-R1', country:'NO',
      name:'Rare earths project, southern Norway',
      materials:['rare earths'],
      stage:'extraction', status:'pre-construction',
      coord:{lon:9.3, lat:59.3},
      baselineYear:2025, worksStarted:null,
      series:[['2025',0],['2026',0]],
      indicators:{vegLoss5kmPct:0.0, natura2000Pct:0.0, waterTailingsHa:0, groundMotionMmYr:0.5,
        landConverted:{}},
      egmsCovered:true,
    },
    {
      code:'EE-R1', country:'EE',
      name:'Rare earths processing plant, Sillamäe, Estonia',
      materials:['rare earths'],
      stage:'processing', status:'operating',
      coord:{lon:27.4, lat:59.4},
      baselineYear:2019, worksStarted:1998,
      series:[['2019',40],['2020',40],['2021',41],['2022',41],['2023',42],['2024',42],['2025',42],['2026',42]],
      indicators:{vegLoss5kmPct:0.3, natura2000Pct:0.0, waterTailingsHa:14, groundMotionMmYr:0.6,
        landConverted:{'Built-up':3,'Grassland':1}},
      egmsCovered:true,
    },
    {
      code:'PL-C1', country:'PL',
      name:'Copper smelter expansion, Lower Silesia',
      materials:['copper'],
      stage:'processing', status:'operating',
      coord:{lon:16.2, lat:51.5},
      baselineYear:2019, worksStarted:1972,
      series:[['2019',324],['2020',328],['2021',330],['2022',334],['2023',340],['2024',368],['2025',395],['2026',412]],
      indicators:{vegLoss5kmPct:1.2, natura2000Pct:0.0, waterTailingsHa:68, groundMotionMmYr:0.4,
        landConverted:{'Cropland':54,'Built-up':22,'Grassland':12}},
      alert:{title:'Water & tailings surface grew 15% year-on-year', body:'Flagged for review, not a finding of non-compliance.'},
      egmsCovered:true,
    },
    {
      code:'DE-L1', country:'DE',
      name:'Lithium refining plant, Guben, Germany',
      materials:['lithium'],
      stage:'processing', status:'under-construction',
      coord:{lon:14.7, lat:51.9},
      baselineYear:2023, worksStarted:2025,
      series:[['2023',2],['2024',4],['2025',12],['2026',24]],
      indicators:{vegLoss5kmPct:0.4, natura2000Pct:0.0, waterTailingsHa:0.3, groundMotionMmYr:1.1,
        landConverted:{'Built-up':16,'Cropland':6,'Grassland':2}},
      egmsCovered:true,
    },
    {
      code:'DE-B1', country:'DE',
      name:'Battery cathode active materials plant, Schwarzheide',
      materials:['battery materials'],
      stage:'processing', status:'operating',
      coord:{lon:13.8, lat:51.5},
      baselineYear:2020, worksStarted:2020,
      series:[['2020',58],['2021',62],['2022',68],['2023',71],['2024',74],['2025',76],['2026',78]],
      indicators:{vegLoss5kmPct:0.6, natura2000Pct:0.0, waterTailingsHa:3, groundMotionMmYr:0.3,
        landConverted:{'Built-up':14,'Cropland':6}},
      egmsCovered:true,
    },
    {
      code:'BE-C1', country:'BE',
      name:'Cobalt refining and recycling, Olen',
      materials:['cobalt'],
      stage:'recycling', status:'operating',
      coord:{lon:4.9, lat:51.2},
      baselineYear:2019, worksStarted:1990,
      series:[['2019',48],['2020',48],['2021',49],['2022',49],['2023',50],['2024',50],['2025',51],['2026',51]],
      indicators:{vegLoss5kmPct:0.2, natura2000Pct:0.0, waterTailingsHa:4, groundMotionMmYr:0.9,
        landConverted:{'Built-up':2,'Cropland':1}},
      egmsCovered:true,
    },
    {
      code:'FR-L1', country:'FR',
      name:'Lithium extraction and refining, central France',
      materials:['lithium'],
      stage:'integrated', status:'under-construction',
      coord:{lon:3.4, lat:46.2},
      baselineYear:2023, worksStarted:2025,
      series:[['2023',2],['2024',3],['2025',14],['2026',38]],
      indicators:{vegLoss5kmPct:3.9, natura2000Pct:0.0, waterTailingsHa:2.1, groundMotionMmYr:1.4,
        landConverted:{'Tree cover':18,'Cropland':12,'Grassland':6}},
      egmsCovered:true,
    },
    {
      code:'AT-L1', country:'AT',
      name:'Lithium mine, Wolfsberg, Carinthia',
      materials:['lithium'],
      stage:'extraction', status:'pre-construction',
      coord:{lon:14.9, lat:46.8},
      baselineYear:2026, worksStarted:null,
      series:[['2024',0],['2025',0],['2026',1]],
      indicators:{vegLoss5kmPct:0.0, natura2000Pct:3.1, waterTailingsHa:0, groundMotionMmYr:0.5,
        landConverted:{'Tree cover':1}},
      egmsCovered:true,
    },
    {
      code:'RO-G1', country:'RO',
      name:'Graphite project, Baia de Fier, Romania',
      materials:['graphite'],
      stage:'extraction', status:'pre-construction',
      coord:{lon:23.9, lat:45.3},
      baselineYear:2025, worksStarted:null,
      series:[['2025',0],['2026',0]],
      indicators:{vegLoss5kmPct:0.0, natura2000Pct:4.2, waterTailingsHa:0, groundMotionMmYr:0.6,
        landConverted:{}},
      egmsCovered:true,
    },
    {
      code:'PT-L1', country:'PT',
      name:'Lithium project, northern Portugal',
      materials:['lithium'],
      stage:'extraction', status:'under-construction',
      coord:{lon:-7.7, lat:41.8},
      baselineYear:2024, worksStarted:2026,
      series:[['2024',1],['2025',4],['2026',14]],
      indicators:{vegLoss5kmPct:1.1, natura2000Pct:0.3, waterTailingsHa:0.7, groundMotionMmYr:0.8,
        landConverted:{'Shrubland':7,'Cropland':4,'Grassland':3}},
      egmsCovered:true,
    },
    {
      code:'ES-W1', country:'ES',
      name:'Tungsten mine, Barruecopardo, Spain',
      materials:['tungsten'],
      stage:'integrated', status:'operating',
      coord:{lon:-6.6, lat:40.9},
      baselineYear:2019, worksStarted:2015,
      series:[['2019',98],['2020',102],['2021',108],['2022',113],['2023',118],['2024',122],['2025',126],['2026',128]],
      indicators:{vegLoss5kmPct:1.6, natura2000Pct:0.0, waterTailingsHa:34, groundMotionMmYr:1.9,
        landConverted:{'Cropland':17,'Grassland':11,'Shrubland':2}},
      egmsCovered:true,
    },
    {
      code:'GR-M1', country:'GR',
      name:'Magnesium (magnesite) complex, central Greece',
      materials:['magnesium'],
      stage:'integrated', status:'operating',
      coord:{lon:23.1, lat:40.9},
      baselineYear:2019, worksStarted:1959,
      series:[['2019',228],['2020',231],['2021',234],['2022',236],['2023',238],['2024',240],['2025',242],['2026',243]],
      indicators:{vegLoss5kmPct:1.9, natura2000Pct:0.2, waterTailingsHa:19, groundMotionMmYr:1.1,
        landConverted:{'Shrubland':10,'Tree cover':3,'Grassland':2}},
      egmsCovered:true,
    },
    {
      code:'MA-C1', country:'MA',
      name:'Cobalt and copper mine, Bou-Azzer, Morocco',
      materials:['cobalt','copper'],
      stage:'integrated', status:'operating',
      coord:{lon:-6.8, lat:30.5},
      baselineYear:2019, worksStarted:1934,
      series:[['2019',172],['2020',174],['2021',178],['2022',182],['2023',184],['2024',186],['2025',188],['2026',189]],
      indicators:{vegLoss5kmPct:0.2, natura2000Pct:0.0, waterTailingsHa:21, groundMotionMmYr:null,
        landConverted:{'Barren':10,'Shrubland':6,'Cropland':1}},
      egmsCovered:false,
    },
  ];

  // Derive the full set of materials present across the sites so
  // the material-filter chipset lists them in a stable order.
  var ALL_MATERIALS = Array.from(
    SITES.reduce(function (set, s) { (s.materials || []).forEach(function (m) { set.add(m); }); return set; }, new Set())
  ).sort();

  // ─────────────────────────────────────────────────────────────
  // Map projection (equirectangular) + viewport zoom
  // ─────────────────────────────────────────────────────────────
  var MAP_W = 900, MAP_H = 700;
  var LON_MIN = -12, LON_MAX = 32;
  var LAT_MIN = 28,  LAT_MAX = 72;
  function lonToX(lon) { return (lon - LON_MIN) / (LON_MAX - LON_MIN) * MAP_W; }
  function latToY(lat) { return (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * MAP_H; }
  var view = { x: 0, y: 0, w: MAP_W, h: MAP_H };
  function viewBox() { return view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h; }

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  var state = {
    query: '',
    stages: new Set(),
    statuses: new Set(),
    materials: new Set(),
    alertsOnly: false,
    selectedCode: null,
  };

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  var nf = new Intl.NumberFormat('en-GB');
  function fmtInt(n) { return n == null ? '—' : nf.format(Math.round(n)); }
  function fmtPct(n) { return n == null ? '—' : (Math.round(n * 10) / 10) + '%'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }
  function joinMaterials(ms) { return (ms || []).join(' · ').toUpperCase(); }
  function stageLabel(sg) { return ({extraction:'Extraction', processing:'Processing', recycling:'Recycling', integrated:'Integrated'}[sg] || sg); }
  function statusLabel(st) { return ({'pre-construction':'Pre-construction', 'under-construction':'Under construction', operating:'Operating'}[st] || st); }

  function latestFootprint(s) { return s.series.length ? s.series[s.series.length - 1][1] : 0; }
  function baselineFootprint(s) { return s.series.length ? s.series[0][1] : 0; }

  function siteFillColor(s) {
    if (s.alert) return 'var(--sd-alert)';
    if (s.status === 'operating') return 'var(--sd-op)';
    if (s.status === 'under-construction') return 'var(--sd-uc)';
    return 'var(--sd-pin-pre-fill)'; // pre-construction (outlined pin)
  }
  function siteFillCssColor(s) {
    // Non-CSS-var fallback used for inline SVG attributes where
    // currentColor and CSS vars don't cascade cleanly.
    var theme = document.documentElement.getAttribute('data-sd-theme') || 'light';
    var light = { op:'#10B981', uc:'#F59E0B', alert:'#DC2626', pre_fill:'#FFFFFF', pre_stroke:'#0A0A0B' };
    var dark  = { op:'#22C589', uc:'#FBBF24', alert:'#F87171', pre_fill:'#0B0B0C', pre_stroke:'#F7F8FA' };
    var pal = theme === 'dark' ? dark : light;
    if (s.alert) return pal.alert;
    if (s.status === 'operating') return pal.op;
    if (s.status === 'under-construction') return pal.uc;
    return pal.pre_fill;
  }
  function siteStrokeCssColor(s) {
    var theme = document.documentElement.getAttribute('data-sd-theme') || 'light';
    return theme === 'dark' ? '#F7F8FA' : '#0A0A0B';
  }

  // ─────────────────────────────────────────────────────────────
  // SVG icons
  // ─────────────────────────────────────────────────────────────
  var ICON = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="icon-moon"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    search:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
    reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1 1"/><path d="M14 10a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1-1"/></svg>',
    close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>',
    empty:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><path d="M8 11h6"/></svg>',
    brand:'<svg viewBox="0 0 100 100" fill="none" aria-hidden="true">' +
      '<rect width="100" height="100" rx="10" fill="#0A0A0B"/>' +
      '<rect x="18" y="20" width="34" height="10" fill="#F6F2E6"/>' +
      '<rect x="60" y="20" width="22" height="10" fill="#F6F2E6"/>' +
      '<rect x="18" y="36" width="42" height="10" fill="#F6F2E6"/>' +
      '<rect x="66" y="36" width="18" height="10" fill="#F6F2E6"/>' +
      '<rect x="18" y="52" width="38" height="10" fill="#F6F2E6"/>' +
      '<rect x="62" y="52" width="20" height="10" fill="#F6F2E6"/>' +
      '<rect x="18" y="66" width="64" height="10" fill="#F6F2E6"/>' +
      '<rect x="18" y="80" width="64" height="8"  fill="#35A26F"/>' +
    '</svg>',
  };

  // ─────────────────────────────────────────────────────────────
  // Shell
  // ─────────────────────────────────────────────────────────────
  function buildShell() {
    mount.innerHTML =
      '<header class="sd-topbar">' +
        '<a class="sd-brand" href="/strata" title="Open the Strata overview">' +
          '<span class="sd-brand-mark">' + ICON.brand + '</span>' +
          '<span class="sd-brand-name">Strata</span>' +
          '<span class="sd-brand-sub">Transitions Lab</span>' +
        '</a>' +
        '<nav class="sd-topbar-nav" aria-label="Strata tool nav">' +
          '<a href="#" class="is-current" data-sd-noop>Map</a>' +
          '<a href="/strata-method">Method</a>' +
          '<a href="/strata-data-sources">Data sources</a>' +
          '<a href="/strata">About</a>' +
        '</nav>' +
        '<div class="sd-topbar-tools">' +
          '<button class="sd-tbtn sd-theme-toggle" type="button" aria-label="Toggle theme" title="Toggle light/dark">' +
            ICON.moon + ICON.sun +
          '</button>' +
        '</div>' +
      '</header>' +
      '<div class="sd-demo-strip">Demo version · site codes and indicator values are illustrative and do not describe real projects</div>' +
      '<div class="sd-body">' +
        '<aside class="sd-col sd-col-left">' +
          '<div class="sd-totals" id="sd-totals"></div>' +
          '<div class="sd-filters">' +
            '<label class="sd-search" aria-label="Search sites, materials, countries">' +
              ICON.search +
              '<input id="sd-search" type="search" placeholder="Search sites, materials, countries" autocomplete="off">' +
            '</label>' +
            '<div class="sd-filter-group">' +
              '<span class="sd-filter-label">Value chain stage</span>' +
              '<div class="sd-chipset" id="sd-stages">' +
                '<button class="sd-chip" data-stage="extraction">Extraction</button>' +
                '<button class="sd-chip" data-stage="processing">Processing</button>' +
                '<button class="sd-chip" data-stage="recycling">Recycling</button>' +
                '<button class="sd-chip" data-stage="integrated">Integrated</button>' +
              '</div>' +
            '</div>' +
            '<div class="sd-filter-group">' +
              '<span class="sd-filter-label">Status</span>' +
              '<div class="sd-chipset" id="sd-statuses">' +
                '<button class="sd-chip sd-chip--pre" data-status="pre-construction"><span class="sd-dot"></span>Pre-construction</button>' +
                '<button class="sd-chip sd-chip--uc"  data-status="under-construction"><span class="sd-dot"></span>Under construction</button>' +
                '<button class="sd-chip sd-chip--op"  data-status="operating"><span class="sd-dot"></span>Operating</button>' +
                '<button class="sd-chip sd-chip--alert" data-alertsonly="1"><span class="sd-dot"></span>With open alerts</button>' +
              '</div>' +
            '</div>' +
            '<div class="sd-filter-group">' +
              '<span class="sd-filter-label">Strategic materials</span>' +
              '<div class="sd-chipset" id="sd-materials">' +
                ALL_MATERIALS.map(function (m) {
                  return '<button class="sd-chip" data-material="' + esc(m) + '">' + esc(m.replace(/\b\w/g, function (c) { return c.toUpperCase(); })) + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +
            '<button class="sd-clear" id="sd-clear" type="button" hidden>Clear all filters</button>' +
          '</div>' +
          '<div class="sd-section-head">' +
            '<div class="sd-section-title">Sites <span class="sd-count-pill" id="sd-list-count">0</span></div>' +
          '</div>' +
          '<div class="sd-list-wrap">' +
            '<ul class="sd-list" id="sd-list" role="list"></ul>' +
          '</div>' +
        '</aside>' +
        '<div class="sd-col sd-col-map">' +
          '<div class="sd-map-wrap">' +
            '<svg class="sd-map-svg" id="sd-map-svg" viewBox="' + viewBox() + '" preserveAspectRatio="xMidYMid meet">' +
              '<g id="sd-map-base"></g>' +
              '<g id="sd-map-grid"></g>' +
              '<g id="sd-map-pins"></g>' +
            '</svg>' +
          '</div>' +
          '<div class="sd-map-zoom">' +
            '<button type="button" aria-label="Zoom in"  data-zoom="in">' + ICON.plus + '</button>' +
            '<button type="button" aria-label="Zoom out" data-zoom="out">' + ICON.minus + '</button>' +
            '<button type="button" aria-label="Reset view" data-zoom="reset">' + ICON.reset + '</button>' +
          '</div>' +
          '<div class="sd-map-legend">' +
            '<span class="sd-kick">Status · size = footprint</span>' +
            '<div class="sd-swatch-row">' +
              '<span class="sd-sw sd-sw--pre"><span class="sw-dot"></span>Pre-construction</span>' +
              '<span class="sd-sw sd-sw--uc"><span class="sw-dot"></span>Under construction</span>' +
              '<span class="sd-sw sd-sw--op"><span class="sw-dot"></span>Operating</span>' +
              '<span class="sd-sw sd-sw--alert"><span class="sw-dot"></span>Open alert</span>' +
            '</div>' +
          '</div>' +
          '<span class="sd-map-attrib">Basemap: Natural Earth, simplified</span>' +
        '</div>' +
        '<aside class="sd-col sd-col-right" id="sd-detail">' +
          renderEmptyDetail() +
        '</aside>' +
      '</div>';

    paintBase();
    paintGrid();
  }

  function renderEmptyDetail() {
    return '<div class="sd-detail-empty">' +
      '<div class="sd-empty-icon">' + ICON.empty + '</div>' +
      '<h3>Select a site</h3>' +
      '<p>Click a dot on the map or a row in the list. Each site opens on a single page with the baseline, the latest footprint, the change since baseline, a chart, the footprint outline and the full indicator read.</p>' +
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // Map: base silhouette + grid
  // ─────────────────────────────────────────────────────────────
  function paintBase() {
    var g = mount.querySelector('#sd-map-base');
    g.innerHTML =
      // Continental Europe + Scandinavia + Iberia + Balkans
      '<path class="sd-map-layer-land" d="' +
        'M 220 700 L 180 620 L 180 540 L 200 480 L 230 440 L 270 420 L 310 430 L 360 420 L 390 390 L 420 380 ' +
        'L 460 390 L 500 400 L 540 400 L 580 380 L 610 360 L 640 350 L 680 340 L 720 320 L 750 300 L 760 260 ' +
        'L 740 220 L 720 180 L 700 150 L 690 120 L 710 100 L 740 90 L 770 110 L 790 150 L 790 190 L 800 230 ' +
        'L 820 270 L 830 310 L 835 350 L 830 390 L 820 430 L 820 470 L 800 500 L 780 520 L 750 530 L 720 540 ' +
        'L 690 540 L 680 560 L 680 580 L 700 600 L 710 625 L 700 655 L 680 670 L 650 680 L 610 685 L 580 685 ' +
        'L 540 690 L 500 695 L 460 700 L 420 710 L 380 710 L 340 710 L 300 710 L 260 710 L 220 700 Z' +
      '"/>' +
      // British Isles
      '<path class="sd-map-layer-land" d="' +
        'M 250 365 L 230 345 L 215 320 L 215 290 L 230 265 L 245 245 L 265 245 L 285 255 L 290 275 L 290 300 ' +
        'L 290 325 L 285 350 L 285 375 L 275 395 L 260 395 L 245 390 Z' +
      '"/>' +
      // Iceland
      '<path class="sd-map-layer-land" d="M 185 215 L 205 205 L 225 215 L 230 230 L 215 240 L 195 235 Z"/>' +
      // Morocco / N Africa coast
      '<path class="sd-map-layer-land" d="' +
        'M 160 700 L 220 695 L 300 695 L 380 695 L 460 695 L 540 695 L 620 695 L 700 695 L 780 695 L 860 695 L 900 695 ' +
        'L 900 710 L 820 714 L 740 712 L 660 715 L 580 725 L 500 730 L 420 725 L 340 710 L 260 702 L 180 700 L 160 700 Z' +
      '"/>';
  }

  function paintGrid() {
    var g = mount.querySelector('#sd-map-grid');
    var html = '';
    for (var lon = -10; lon <= 30; lon += 10) {
      var x = lonToX(lon);
      html += '<line class="sd-map-grid-line" x1="' + x + '" y1="0" x2="' + x + '" y2="' + MAP_H + '"/>';
      html += '<text class="sd-map-label" x="' + (x + 4) + '" y="' + (MAP_H - 8) + '">' + lon + '°</text>';
    }
    for (var lat = 30; lat <= 70; lat += 10) {
      var y = latToY(lat);
      html += '<line class="sd-map-grid-line" x1="0" y1="' + y + '" x2="' + MAP_W + '" y2="' + y + '"/>';
      html += '<text class="sd-map-label" x="6" y="' + (y - 4) + '">' + lat + '°N</text>';
    }
    g.innerHTML = html;
  }

  // ─────────────────────────────────────────────────────────────
  // Filter / search
  // ─────────────────────────────────────────────────────────────
  function filteredSites() {
    var q = state.query.trim().toLowerCase();
    return SITES.filter(function (s) {
      if (state.stages.size && !state.stages.has(s.stage)) return false;
      if (state.statuses.size && !state.statuses.has(s.status)) return false;
      if (state.alertsOnly && !s.alert) return false;
      if (state.materials.size) {
        var hit = false;
        for (var i = 0; i < s.materials.length; i++) {
          if (state.materials.has(s.materials[i])) { hit = true; break; }
        }
        if (!hit) return false;
      }
      if (q) {
        var hay = (s.code + ' ' + s.name + ' ' + s.country + ' ' + s.materials.join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function filtersActive() {
    return !!(state.query || state.stages.size || state.statuses.size || state.materials.size || state.alertsOnly);
  }

  // ─────────────────────────────────────────────────────────────
  // Totals + list
  // ─────────────────────────────────────────────────────────────
  function paintTotals() {
    var visible = filteredSites();
    var el = mount.querySelector('#sd-totals');
    var pre = visible.filter(function (s) { return s.status === 'pre-construction'; }).length;
    var disturbed = visible.reduce(function (a, s) { return a + latestFootprint(s); }, 0);
    var alerts = visible.filter(function (s) { return !!s.alert; }).length;
    el.innerHTML =
      '<div class="sd-total"><span class="sd-kick">Sites shown</span><span class="sd-n">' + visible.length + '<span class="sd-unit">/ ' + SITES.length + '</span></span></div>' +
      '<div class="sd-total"><span class="sd-kick">Pre-construction</span><span class="sd-n">' + pre + '</span></div>' +
      '<div class="sd-total"><span class="sd-kick">Disturbed, 2026</span><span class="sd-n">' + nf.format(Math.round(disturbed)) + '<span class="sd-unit">ha</span></span></div>' +
      '<div class="sd-total sd-total--alert"><span class="sd-kick">Open alerts</span><span class="sd-n">' + alerts + '</span></div>';

    var clear = mount.querySelector('#sd-clear');
    if (clear) clear.hidden = !filtersActive();
    var countPill = mount.querySelector('#sd-list-count');
    if (countPill) countPill.textContent = visible.length;
  }

  function paintList() {
    var visible = filteredSites().sort(function (a, b) {
      var aA = a.alert ? 1 : 0, bA = b.alert ? 1 : 0;
      if (aA !== bA) return bA - aA;
      return latestFootprint(b) - latestFootprint(a);
    });
    var list = mount.querySelector('#sd-list');
    if (!visible.length) {
      list.innerHTML = '<li class="sd-list-empty">No sites match these filters.<br>' +
        '<button class="sd-clear" type="button" data-sd-clear>Clear filters</button></li>';
      return;
    }
    list.innerHTML = visible.map(function (s) {
      var ha = latestFootprint(s);
      var isActive = state.selectedCode === s.code;
      return '<li>' +
        '<button class="sd-site-row' + (isActive ? ' is-active' : '') + (s.alert ? ' has-alert' : '') + '"' +
          ' data-status="' + s.status + '" data-code="' + s.code + '" aria-pressed="' + isActive + '">' +
          '<span class="sd-bar"></span>' +
          '<span class="sd-site-main">' +
            '<span class="sd-site-name">' + esc(s.name) + '</span>' +
            '<span class="sd-site-code">' + esc(s.code) + ' · ' + esc(joinMaterials(s.materials)) + '</span>' +
          '</span>' +
          '<span class="sd-site-right">' +
            '<span class="sd-site-ha">' + fmtInt(ha) + '<span class="sd-unit">ha</span></span>' +
            (s.alert ? '<span class="sd-site-flag">ALERT</span>' : '') +
          '</span>' +
        '</button>' +
      '</li>';
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────
  // Pins
  // ─────────────────────────────────────────────────────────────
  function paintPins() {
    var g = mount.querySelector('#sd-map-pins');
    var visibleCodes = new Set(filteredSites().map(function (s) { return s.code; }));
    g.innerHTML = SITES.map(function (s) {
      var cx = lonToX(s.coord.lon);
      var cy = latToY(s.coord.lat);
      var ha = latestFootprint(s);
      var r = Math.max(5, Math.min(14, 4 + Math.log(1 + ha) * 1.6));
      var isActive = state.selectedCode === s.code;
      var isDim = !visibleCodes.has(s.code);
      var fill = siteFillCssColor(s);
      var strokeAttr = '';
      if (s.status === 'pre-construction' && !s.alert) {
        strokeAttr = ' stroke="' + siteStrokeCssColor(s) + '" stroke-width="2"';
      }
      var ring = isActive ? '<circle class="sd-pin-ring" cx="' + cx + '" cy="' + cy + '" r="' + (r + 6) + '"/>' : '';
      return '<g class="sd-pin' + (isDim ? ' is-dim' : '') + (isActive ? ' is-active' : '') +
             '" data-code="' + s.code + '" tabindex="0" role="button" aria-label="' + esc(s.name) + '">' +
        ring +
        '<circle class="sd-pin-core" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + strokeAttr + '/>' +
        '<text class="sd-pin-label" x="' + (cx + r + 6) + '" y="' + (cy + 3) + '">' + s.code + '</text>' +
      '</g>';
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────
  // Detail panel
  // ─────────────────────────────────────────────────────────────
  function paintDetail() {
    var el = mount.querySelector('#sd-detail');
    var s = SITES.find(function (x) { return x.code === state.selectedCode; });
    if (!s) { el.innerHTML = renderEmptyDetail(); return; }
    var baseline = baselineFootprint(s), latest = latestFootprint(s);
    var delta = latest - baseline;
    var deltaPct = baseline > 0 ? delta / baseline : null;
    var fillColor = siteFillCssColor(s);
    var deltaCls = s.status === 'pre-construction' ? '' : (delta > 0 ? ' sd-n--neg' : (delta < 0 ? ' sd-n--pos' : ''));
    var deltaSign = delta > 0 ? '+' : (delta < 0 ? '−' : '±');

    el.innerHTML =
      '<section class="sd-detail">' +
        '<div class="sd-detail-head">' +
          '<button class="sd-detail-close" type="button" aria-label="Close site detail" data-sd-close>' + ICON.close + '</button>' +
          '<div class="sd-detail-code">' +
            '<span class="sd-code-sq" style="background:' + fillColor + '"></span>' +
            esc(s.code) + ' <span class="sd-code-sep">·</span> ' + esc(joinMaterials(s.materials)) +
            ' <span class="sd-code-sep">·</span> ' + esc(stageLabel(s.stage).toUpperCase()) +
            ' <span class="sd-code-sep">·</span> ' + esc(s.country) +
          '</div>' +
          '<h2>' + esc(s.name) + '</h2>' +
          '<div class="sd-detail-badges">' +
            renderStatusBadge(s.status) +
            (s.alert ? '<span class="sd-badge sd-badge--alert">ALERT</span>' : '') +
          '</div>' +
        '</div>' +
        (s.alert
          ? '<div class="sd-alert-strip"><strong>' + esc(s.alert.title) + '.</strong> ' + esc(s.alert.body) + '</div>'
          : '') +
        '<div class="sd-stats">' +
          '<div class="sd-stat"><span class="sd-kick">Baseline year</span><span class="sd-n">' + s.baselineYear + '</span></div>' +
          '<div class="sd-stat"><span class="sd-kick">Footprint 2026</span><span class="sd-n">' + fmtInt(latest) + '<span class="sd-unit">ha</span></span></div>' +
          '<div class="sd-stat"><span class="sd-kick">Since baseline</span><span class="sd-n' + deltaCls + '">' + deltaSign + fmtInt(Math.abs(delta)) +
            '<span class="sd-unit">ha' + (deltaPct != null ? ' · ' + deltaSign + Math.round(Math.abs(deltaPct) * 100) + '%' : '') + '</span></span></div>' +
          '<div class="sd-stat"><span class="sd-kick">Works started</span><span class="sd-n">' + (s.worksStarted != null ? s.worksStarted : '—') + '</span></div>' +
        '</div>' +
        '<div class="sd-detail-actions">' +
          '<button class="sd-dbtn" type="button" data-sd-download>' + ICON.download + ' Download CSV</button>' +
          '<button class="sd-dbtn" type="button" data-sd-share>' + ICON.link + ' Copy site link</button>' +
        '</div>' +
        '<div class="sd-panel sd-chart">' +
          '<div class="sd-panel-head"><span class="sd-panel-title">Disturbed footprint</span><span class="sd-panel-sub">Hectares, year-end</span></div>' +
          renderChart(s, fillColor) +
        '</div>' +
        '<div class="sd-panel sd-outline">' +
          '<div class="sd-panel-head"><span class="sd-panel-title">Footprint outline</span><span class="sd-panel-sub">Baseline vs latest, 500 m buffer</span></div>' +
          '<div class="sd-outline-wrap">' + renderOutline(s, fillColor) + '</div>' +
          '<div class="sd-outline-legend">' +
            '<span class="sd-sw sd-sw--base"><span class="sw-box"></span>Baseline ' + s.baselineYear + '</span>' +
            '<span class="sd-sw sd-sw--latest" style="color:' + fillColor + '"><span class="sw-box"></span>Latest 2026</span>' +
          '</div>' +
        '</div>' +
        '<div class="sd-panel sd-indicators">' +
          '<div class="sd-panel-head"><span class="sd-panel-title">Indicators, 2026</span><span class="sd-panel-sub">Illustrative</span></div>' +
          renderIndicators(s) +
        '</div>' +
        '<div class="sd-detail-foot">' +
          (s.promoterResponse ? '<strong>Promoter response:</strong> ' + esc(s.promoterResponse) + '<br>' : '') +
          'Attribution: Contains modified Copernicus Sentinel data 2019–2026 · ESA WorldCover 2021 · ' +
          (s.egmsCovered ? 'European Ground Motion Service · ' : '') +
          'Natura 2000 © European Union, DG Environment, distributed by the EEA. See <a href="/strata-data-sources">data sources</a>.' +
        '</div>' +
      '</section>';
  }

  function renderStatusBadge(status) {
    if (status === 'operating') return '<span class="sd-badge sd-badge--op">OPERATING</span>';
    if (status === 'under-construction') return '<span class="sd-badge sd-badge--uc">UNDER CONSTRUCTION</span>';
    return '<span class="sd-badge sd-badge--pre">PRE-CONSTRUCTION</span>';
  }

  function renderChart(s, color) {
    var W = 320, H = 180, padL = 42, padR = 10, padT = 20, padB = 26;
    var pts = s.series;
    if (!pts.length) return '';
    var years = pts.map(function (p) { return parseInt(p[0], 10); });
    var vals = pts.map(function (p) { return p[1]; });
    var yMax = niceMax(Math.max.apply(null, vals.concat([1])));
    var xMin = years[0], xMax = years[years.length - 1];
    if (xMin === xMax) xMax = xMin + 1;

    function px(year) { return padL + (year - xMin) / (xMax - xMin) * (W - padL - padR); }
    function py(val)  { return H - padB - (val / yMax) * (H - padT - padB); }

    var linePath = pts.map(function (p, i) {
      return (i ? 'L ' : 'M ') + px(parseInt(p[0], 10)).toFixed(1) + ' ' + py(p[1]).toFixed(1);
    }).join(' ');
    var areaPath = linePath + ' L ' + px(xMax).toFixed(1) + ' ' + (H - padB) + ' L ' + px(xMin).toFixed(1) + ' ' + (H - padB) + ' Z';

    // Grid lines (y)
    var grid = '';
    for (var g = 1; g <= 3; g++) {
      var y = padT + (g / 4) * (H - padT - padB);
      grid += '<line class="cv-grid" x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '"/>';
    }

    var dots = pts.map(function (p) {
      return '<circle class="cv-dot" cx="' + px(parseInt(p[0], 10)).toFixed(1) + '" cy="' + py(p[1]).toFixed(1) + '" r="2.5" stroke="' + color + '"/>';
    }).join('');

    var worksMarker = '';
    if (s.worksStarted != null && s.worksStarted >= xMin && s.worksStarted <= xMax) {
      var wx = px(s.worksStarted);
      worksMarker = '<line class="cv-works" x1="' + wx + '" y1="' + padT + '" x2="' + wx + '" y2="' + (H - padB) + '"/>' +
        '<text class="cv-text" x="' + (wx + 4) + '" y="' + (padT + 11) + '">works start</text>';
    }

    var bx = px(xMin);
    var baselineMarker = '<line class="cv-baseline" x1="' + bx + '" y1="' + padT + '" x2="' + bx + '" y2="' + (H - padB) + '"/>' +
      '<text class="cv-text" x="' + (bx + 4) + '" y="' + (padT + 11) + '">baseline</text>';

    var yLabels =
      '<text class="cv-value" x="4" y="' + (padT + 4) + '">' + nf.format(yMax) + ' ha</text>' +
      '<text class="cv-value" x="4" y="' + (H - padB + 4) + '">0</text>';
    var midYear = years[Math.floor(years.length / 2)];
    var xLabels =
      '<text class="cv-text" x="' + px(xMin) + '" y="' + (H - 8) + '">' + xMin + '</text>' +
      '<text class="cv-text" x="' + px(midYear) + '" y="' + (H - 8) + '" text-anchor="middle">' + midYear + '</text>' +
      '<text class="cv-text" x="' + px(xMax) + '" y="' + (H - 8) + '" text-anchor="end">' + xMax + '</text>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      grid +
      '<line class="cv-axis" x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '"/>' +
      '<path class="cv-area" d="' + areaPath + '" fill="' + color + '"/>' +
      '<path class="cv-line" d="' + linePath + '" stroke="' + color + '"/>' +
      dots + baselineMarker + worksMarker + yLabels + xLabels +
    '</svg>';
  }

  function niceMax(n) {
    if (n <= 10) return 10;
    if (n <= 50) return Math.ceil(n / 10) * 10;
    if (n <= 500) return Math.ceil(n / 50) * 50;
    if (n <= 5000) return Math.ceil(n / 500) * 500;
    return Math.ceil(n / 5000) * 5000;
  }

  function renderOutline(s, color) {
    var W = 320, H = 180;
    var cx = W / 2, cy = H / 2;
    var buf = Math.min(W, H) / 2 - 14;
    var ha = Math.max(0.1, latestFootprint(s));
    var baseHa = baselineFootprint(s);
    var scaleLatest = Math.sqrt(ha / 1500);
    var scaleBaseline = Math.sqrt(Math.max(0.001, baseHa) / 1500);
    var latestR = Math.max(10, buf * scaleLatest);
    var baseR = Math.max(3, buf * scaleBaseline);

    function seededPolygon(code, r, salt) {
      var seed = salt * 7;
      for (var i = 0; i < code.length; i++) seed += code.charCodeAt(i) * (i + 1);
      var pts = [];
      for (var k = 0; k < 12; k++) {
        var ang = (k / 12) * Math.PI * 2;
        seed = (seed * 9301 + 49297) % 233280;
        var jitter = 0.80 + ((seed / 233280) * 0.38);
        var x = cx + Math.cos(ang) * r * jitter;
        var y = cy + Math.sin(ang) * r * jitter;
        pts.push(x.toFixed(1) + ',' + y.toFixed(1));
      }
      return pts.join(' ');
    }
    var basePoly = seededPolygon(s.code, baseR, 1);
    var latestPoly = seededPolygon(s.code, latestR, 1);

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + buf + '" fill="none" stroke="var(--sd-rule)" stroke-dasharray="3 3"/>' +
      '<text x="' + (W - 14) + '" y="18" text-anchor="end" font-family="JetBrains Mono,ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10" fill="var(--sd-mute)">500 m buffer</text>' +
      (baseHa > 0 ? '<polygon points="' + basePoly + '" fill="none" stroke="var(--sd-mute)" stroke-dasharray="3 2"/>' : '') +
      '<polygon points="' + latestPoly + '" fill="' + color + '" fill-opacity="0.5" stroke="' + color + '" stroke-width="1.25"/>' +
    '</svg>';
  }

  function renderIndicators(s) {
    var ind = s.indicators || {};
    var rows = [
      ['Buffer vegetation loss (0 to 5 km)', ind.vegLoss5kmPct == null ? null : fmtPct(ind.vegLoss5kmPct)],
      ['Of which inside Natura 2000',        ind.natura2000Pct == null ? null : fmtPct(ind.natura2000Pct)],
      ['Water and tailings surface',         ind.waterTailingsHa == null ? null : (fmtInt(ind.waterTailingsHa) + ' ha')],
      ['Ground motion',                      ind.groundMotionMmYr == null ? '— (outside EGMS)' : (ind.groundMotionMmYr + ' mm/yr')],
    ];
    var landPieces = Object.keys(ind.landConverted || {}).map(function (k) {
      return k + ' (' + fmtInt(ind.landConverted[k]) + ' ha)';
    });
    rows.push(['Land converted', landPieces.length ? landPieces.join(', ') : '— (no change yet)']);

    return '<table><thead><tr><th>Indicator</th><th class="sd-indicators-value">Value</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var isNull = (r[1] == null || /^—/.test(String(r[1])));
        return '<tr><td>' + esc(r[0]) + '</td><td class="sd-indicators-value' + (isNull ? ' sd-indicators-null' : '') + '">' + esc(r[1] || '—') + '</td></tr>';
      }).join('') +
    '</tbody></table>';
  }

  // ─────────────────────────────────────────────────────────────
  // CSV export + share link
  // ─────────────────────────────────────────────────────────────
  function siteToCSV(s) {
    var lines = [];
    lines.push('# Strata (demo) — site export');
    lines.push('# ' + s.code + ' · ' + s.name);
    lines.push('# All values are illustrative; the 2027 pilot will produce real indicators.');
    lines.push('');
    lines.push('field,value');
    lines.push('code,' + s.code);
    lines.push('name,"' + s.name.replace(/"/g, '""') + '"');
    lines.push('country,' + s.country);
    lines.push('materials,"' + s.materials.join('; ') + '"');
    lines.push('stage,' + s.stage);
    lines.push('status,' + s.status);
    lines.push('baseline_year,' + s.baselineYear);
    lines.push('works_started,' + (s.worksStarted != null ? s.worksStarted : ''));
    lines.push('alert,"' + (s.alert ? s.alert.title.replace(/"/g, '""') : '') + '"');
    lines.push('egms_covered,' + (s.egmsCovered ? 'true' : 'false'));
    lines.push('');
    lines.push('year,disturbed_footprint_ha');
    s.series.forEach(function (p) { lines.push(p[0] + ',' + p[1]); });
    lines.push('');
    lines.push('indicator,value');
    lines.push('buffer_vegetation_loss_5km_pct,' + (s.indicators.vegLoss5kmPct != null ? s.indicators.vegLoss5kmPct : ''));
    lines.push('inside_natura_2000_pct,' + (s.indicators.natura2000Pct != null ? s.indicators.natura2000Pct : ''));
    lines.push('water_and_tailings_ha,' + (s.indicators.waterTailingsHa != null ? s.indicators.waterTailingsHa : ''));
    lines.push('ground_motion_mm_yr,' + (s.indicators.groundMotionMmYr != null ? s.indicators.groundMotionMmYr : ''));
    Object.keys(s.indicators.landConverted || {}).forEach(function (k) {
      lines.push('land_converted_' + k.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_ha,' + s.indicators.landConverted[k]);
    });
    return lines.join('\n') + '\n';
  }

  function downloadCSV(s) {
    var blob = new Blob([siteToCSV(s)], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'strata-' + s.code.toLowerCase() + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function copyShareLink(s) {
    var url = window.location.origin + window.location.pathname + '#site=' + encodeURIComponent(s.code);
    var ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
        ok = true;
      } else {
        var ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        ok = true;
      }
    } catch (_) { ok = false; }
    return ok;
  }

  // ─────────────────────────────────────────────────────────────
  // Zoom + hash routing + selection
  // ─────────────────────────────────────────────────────────────
  function applyViewBox() {
    var svg = mount.querySelector('#sd-map-svg');
    if (svg) svg.setAttribute('viewBox', viewBox());
  }
  function zoomBy(factor, cx, cy) {
    if (cx == null) { cx = view.x + view.w / 2; cy = view.y + view.h / 2; }
    var newW = Math.max(200, Math.min(MAP_W * 1.2, view.w / factor));
    var newH = newW * (MAP_H / MAP_W);
    view.x = cx - (cx - view.x) / factor;
    view.y = cy - (cy - view.y) / factor;
    view.w = newW; view.h = newH;
    // Clamp
    view.x = Math.max(-50, Math.min(MAP_W - view.w + 50, view.x));
    view.y = Math.max(-50, Math.min(MAP_H - view.h + 50, view.y));
    applyViewBox();
  }
  function resetView() {
    view = { x: 0, y: 0, w: MAP_W, h: MAP_H };
    applyViewBox();
  }

  function selectSite(code, opts) {
    opts = opts || {};
    state.selectedCode = (state.selectedCode === code && opts.toggleOff !== false) ? null : code;
    paintList(); paintPins(); paintDetail();
    if (state.selectedCode && opts.updateHash !== false) {
      try { window.history.replaceState(null, '', window.location.pathname + '#site=' + encodeURIComponent(state.selectedCode)); } catch (_) {}
    } else if (!state.selectedCode) {
      try { window.history.replaceState(null, '', window.location.pathname); } catch (_) {}
    }
    if (state.selectedCode && opts.scroll !== false) {
      var panel = mount.querySelector('#sd-detail');
      if (panel && window.matchMedia('(max-width: 1024px)').matches) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function parseHash() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    var m = /site=([A-Za-z0-9\-]+)/.exec(hash);
    if (m) {
      var code = decodeURIComponent(m[1]).toUpperCase();
      if (SITES.find(function (s) { return s.code === code; })) {
        state.selectedCode = code;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Theme toggle
  // ─────────────────────────────────────────────────────────────
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-sd-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-sd-theme', cur);
    try { localStorage.setItem('sd-theme', cur); } catch (_) {}
    // Repaint pins so their inline fill colours reflect the new theme.
    paintPins();
    if (state.selectedCode) paintDetail();
  }

  // ─────────────────────────────────────────────────────────────
  // Events
  // ─────────────────────────────────────────────────────────────
  function clearFilters() {
    state.query = '';
    state.stages.clear(); state.statuses.clear(); state.materials.clear();
    state.alertsOnly = false;
    var searchInput = mount.querySelector('#sd-search');
    if (searchInput) searchInput.value = '';
    Array.prototype.forEach.call(mount.querySelectorAll('.sd-chip.is-on'), function (c) { c.classList.remove('is-on'); });
    paintTotals(); paintList(); paintPins();
  }

  function wireEvents() {
    mount.addEventListener('input', function (ev) {
      if (ev.target.id === 'sd-search') {
        state.query = ev.target.value || '';
        paintTotals(); paintList(); paintPins();
      }
    });

    mount.addEventListener('click', function (ev) {
      // theme
      if (ev.target.closest('.sd-theme-toggle')) { toggleTheme(); return; }

      // nav Map link is a no-op (we are already on the Map view).
      if (ev.target.closest('[data-sd-noop]')) { ev.preventDefault(); return; }

      // close detail
      if (ev.target.closest('[data-sd-close]')) {
        selectSite(null);
        return;
      }

      // clear filters
      if (ev.target.closest('#sd-clear') || ev.target.closest('[data-sd-clear]')) {
        clearFilters();
        return;
      }

      // chips
      var sc = ev.target.closest('.sd-chip[data-stage]');
      if (sc) {
        var k = sc.getAttribute('data-stage');
        if (state.stages.has(k)) state.stages.delete(k); else state.stages.add(k);
        sc.classList.toggle('is-on');
        paintTotals(); paintList(); paintPins(); return;
      }
      var stc = ev.target.closest('.sd-chip[data-status]');
      if (stc) {
        var kk = stc.getAttribute('data-status');
        if (state.statuses.has(kk)) state.statuses.delete(kk); else state.statuses.add(kk);
        stc.classList.toggle('is-on');
        paintTotals(); paintList(); paintPins(); return;
      }
      var ac = ev.target.closest('.sd-chip[data-alertsonly]');
      if (ac) {
        state.alertsOnly = !state.alertsOnly;
        ac.classList.toggle('is-on');
        paintTotals(); paintList(); paintPins(); return;
      }
      var mc = ev.target.closest('.sd-chip[data-material]');
      if (mc) {
        var mkey = mc.getAttribute('data-material');
        if (state.materials.has(mkey)) state.materials.delete(mkey); else state.materials.add(mkey);
        mc.classList.toggle('is-on');
        paintTotals(); paintList(); paintPins(); return;
      }

      // zoom
      var z = ev.target.closest('.sd-map-zoom button');
      if (z) {
        var dir = z.getAttribute('data-zoom');
        if (dir === 'in') zoomBy(1.4);
        else if (dir === 'out') zoomBy(1 / 1.4);
        else resetView();
        return;
      }

      // site row
      var row = ev.target.closest('.sd-site-row');
      if (row) { selectSite(row.getAttribute('data-code')); return; }

      // map pin
      var pin = ev.target.closest('.sd-pin');
      if (pin) { selectSite(pin.getAttribute('data-code')); return; }

      // download CSV
      if (ev.target.closest('[data-sd-download]')) {
        var s1 = SITES.find(function (x) { return x.code === state.selectedCode; });
        if (s1) {
          downloadCSV(s1);
          var btn = ev.target.closest('[data-sd-download]');
          btn.classList.add('is-done');
          setTimeout(function () { btn.classList.remove('is-done'); }, 1500);
        }
        return;
      }
      // share
      if (ev.target.closest('[data-sd-share]')) {
        var s2 = SITES.find(function (x) { return x.code === state.selectedCode; });
        if (s2) {
          var ok = copyShareLink(s2);
          var btn2 = ev.target.closest('[data-sd-share]');
          var old = btn2.innerHTML;
          btn2.innerHTML = ok ? '✓ Link copied' : 'Copy failed';
          btn2.classList.toggle('is-done', ok);
          setTimeout(function () { btn2.innerHTML = old; btn2.classList.remove('is-done'); }, 1600);
        }
        return;
      }
    });

    mount.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && state.selectedCode) {
        selectSite(null);
        return;
      }
      if ((ev.key === 'Enter' || ev.key === ' ')) {
        var pin = ev.target.closest && ev.target.closest('.sd-pin');
        if (pin) { ev.preventDefault(); selectSite(pin.getAttribute('data-code')); }
      }
    });

    // Scroll-wheel zoom over the map
    var mapWrap = mount.querySelector('.sd-map-wrap');
    if (mapWrap) {
      mapWrap.addEventListener('wheel', function (ev) {
        if (!ev.deltaY) return;
        ev.preventDefault();
        var svg = mount.querySelector('#sd-map-svg');
        var rect = svg.getBoundingClientRect();
        var relX = (ev.clientX - rect.left) / rect.width;
        var relY = (ev.clientY - rect.top) / rect.height;
        var cx = view.x + relX * view.w;
        var cy = view.y + relY * view.h;
        var factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
        zoomBy(factor, cx, cy);
      }, { passive: false });

      // Click-drag pan
      var dragging = false, startX = 0, startY = 0, startVX = 0, startVY = 0;
      mapWrap.addEventListener('mousedown', function (ev) {
        if (ev.target.closest('.sd-pin, .sd-map-zoom')) return;
        dragging = true;
        startX = ev.clientX; startY = ev.clientY;
        startVX = view.x; startVY = view.y;
      });
      window.addEventListener('mousemove', function (ev) {
        if (!dragging) return;
        var svg = mount.querySelector('#sd-map-svg');
        if (!svg) return;
        var rect = svg.getBoundingClientRect();
        var dx = (ev.clientX - startX) * (view.w / rect.width);
        var dy = (ev.clientY - startY) * (view.h / rect.height);
        view.x = startVX - dx; view.y = startVY - dy;
        applyViewBox();
      });
      window.addEventListener('mouseup', function () { dragging = false; });
    }

    // Theme-sync when the OS switches
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (ev) {
        if (!localStorage.getItem('sd-theme')) {
          document.documentElement.setAttribute('data-sd-theme', ev.matches ? 'dark' : 'light');
          paintPins();
          if (state.selectedCode) paintDetail();
        }
      });
    } catch (_) {}
  }

  // ─────────────────────────────────────────────────────────────
  // Boot
  // ─────────────────────────────────────────────────────────────
  parseHash();
  buildShell();
  paintTotals();
  paintList();
  paintPins();
  wireEvents();
  if (state.selectedCode) paintDetail();
})();
