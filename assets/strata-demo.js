/*
 * Strata demo — the interactive site monitor on /strata-app.
 *
 * Mounts into <div id="strata-demo"></div> and builds the whole
 * three-column tool in vanilla JS: left column with totals, filters,
 * search and a scrollable site list; a central map with lat/lon pins
 * on a simplified Europe + North Africa silhouette; and a right-hand
 * detail panel with four stat tiles, a disturbed-footprint time
 * series, a baseline-vs-latest footprint outline and an indicator
 * table.
 *
 * All 16 sites below are ILLUSTRATIVE. Site codes, boundaries and
 * indicator values are plausible but do not describe real projects.
 * The sand-coloured strip at the top of the tool says so.
 */

(function(){
  'use strict';

  var mount = document.getElementById('strata-demo');
  if (!mount) return;

  // ─────────────────────────────────────────────────────────────
  // Data: 16 illustrative sites across Europe + Morocco (third
  // country) covering the four value-chain stages and three
  // operational statuses, with footprint time series starting from
  // the baseline year.
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
      indicators:{
        vegLoss5kmPct:4.1,
        natura2000Pct:0.9,
        waterTailingsHa:182,
        groundMotionMmYr:8.3,
        landConverted:{'Tree cover':112,'Grassland':44,'Wetland':23},
      },
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
      indicators:{
        vegLoss5kmPct:2.8,
        natura2000Pct:0.0,
        waterTailingsHa:1.2,
        groundMotionMmYr:2.1,
        landConverted:{'Tree cover':8,'Shrubland':21,'Cropland':4},
      },
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
      indicators:{
        vegLoss5kmPct:0.0,
        natura2000Pct:12.4,
        waterTailingsHa:0,
        groundMotionMmYr:0.4,
        landConverted:{},
      },
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
      indicators:{
        vegLoss5kmPct:0.0,
        natura2000Pct:0.0,
        waterTailingsHa:0,
        groundMotionMmYr:0.5,
        landConverted:{},
      },
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
      indicators:{
        vegLoss5kmPct:0.3,
        natura2000Pct:0.0,
        waterTailingsHa:14,
        groundMotionMmYr:0.6,
        landConverted:{'Built-up':3,'Grassland':1},
      },
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
      indicators:{
        vegLoss5kmPct:1.2,
        natura2000Pct:0.0,
        waterTailingsHa:68,
        groundMotionMmYr:0.4,
        landConverted:{'Cropland':54,'Built-up':22,'Grassland':12},
      },
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
      indicators:{
        vegLoss5kmPct:0.4,
        natura2000Pct:0.0,
        waterTailingsHa:0.3,
        groundMotionMmYr:1.1,
        landConverted:{'Built-up':16,'Cropland':6,'Grassland':2},
      },
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
      indicators:{
        vegLoss5kmPct:0.6,
        natura2000Pct:0.0,
        waterTailingsHa:3,
        groundMotionMmYr:0.3,
        landConverted:{'Built-up':14,'Cropland':6},
      },
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
      indicators:{
        vegLoss5kmPct:0.2,
        natura2000Pct:0.0,
        waterTailingsHa:4,
        groundMotionMmYr:0.9,
        landConverted:{'Built-up':2,'Cropland':1},
      },
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
      indicators:{
        vegLoss5kmPct:3.9,
        natura2000Pct:0.0,
        waterTailingsHa:2.1,
        groundMotionMmYr:1.4,
        landConverted:{'Tree cover':18,'Cropland':12,'Grassland':6},
      },
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
      indicators:{
        vegLoss5kmPct:0.0,
        natura2000Pct:3.1,
        waterTailingsHa:0,
        groundMotionMmYr:0.5,
        landConverted:{'Tree cover':1},
      },
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
      indicators:{
        vegLoss5kmPct:0.0,
        natura2000Pct:4.2,
        waterTailingsHa:0,
        groundMotionMmYr:0.6,
        landConverted:{},
      },
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
      indicators:{
        vegLoss5kmPct:1.1,
        natura2000Pct:0.3,
        waterTailingsHa:0.7,
        groundMotionMmYr:0.8,
        landConverted:{'Shrubland':7,'Cropland':4,'Grassland':3},
      },
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
      indicators:{
        vegLoss5kmPct:1.6,
        natura2000Pct:0.0,
        waterTailingsHa:34,
        groundMotionMmYr:1.9,
        landConverted:{'Cropland':17,'Grassland':11,'Shrubland':2},
      },
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
      indicators:{
        vegLoss5kmPct:1.9,
        natura2000Pct:0.2,
        waterTailingsHa:19,
        groundMotionMmYr:1.1,
        landConverted:{'Shrubland':10,'Tree cover':3,'Grassland':2},
      },
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
      indicators:{
        vegLoss5kmPct:0.2,
        natura2000Pct:0.0,
        waterTailingsHa:21,
        groundMotionMmYr:null,
        landConverted:{'Barren':10,'Shrubland':6,'Cropland':1},
      },
      egmsCovered:false,
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  var state = {
    query: '',
    stages: new Set(),      // 'extraction', 'processing', 'recycling', 'integrated'
    statuses: new Set(),    // 'pre-construction', 'under-construction', 'operating'
    alertsOnly: false,
    selectedCode: null,
  };

  // ─────────────────────────────────────────────────────────────
  // Projection: lon/lat -> SVG x/y inside the map viewBox.
  // Map viewBox is 900 x 700. Window covers lon [-12, 32] and
  // lat [28, 72]. Simple cylindrical equirectangular, which is
  // fine for a visualisation at this scale.
  // ─────────────────────────────────────────────────────────────
  var MAP_W = 900, MAP_H = 700;
  var LON_MIN = -12, LON_MAX = 32;
  var LAT_MIN = 28, LAT_MAX = 72;
  function lonToX(lon){ return (lon - LON_MIN) / (LON_MAX - LON_MIN) * MAP_W; }
  function latToY(lat){ return (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * MAP_H; }

  // ─────────────────────────────────────────────────────────────
  // Formatters
  // ─────────────────────────────────────────────────────────────
  var nf = new Intl.NumberFormat('en-GB');
  function fmtHa(n){ return n == null ? '—' : nf.format(Math.round(n)); }
  function fmtPct(n){ return n == null ? '—' : (Math.round(n * 10) / 10) + '%'; }
  function fmtPctFromFraction(n){ return (Math.round(n * 1000) / 10) + '%'; }
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }
  function statusLabel(st){
    return { 'pre-construction':'Pre-construction', 'under-construction':'Under construction', 'operating':'Operating' }[st] || st;
  }
  function stageLabel(sg){
    return { 'extraction':'Extraction', 'processing':'Processing', 'recycling':'Recycling', 'integrated':'Integrated' }[sg] || sg;
  }
  function joinMaterials(ms){ return (ms || []).join(' · ').toUpperCase(); }

  // ─────────────────────────────────────────────────────────────
  // Scaffold the whole tool. All DOM is built here once; later
  // only the list, map pins and detail panel re-render.
  // ─────────────────────────────────────────────────────────────
  function buildShell(){
    mount.innerHTML = '' +
      '<div class="sd-topbar">' +
        '<div class="sd-brand">' +
          '<span class="sd-brand-mark"></span>' +
          '<strong>Strata</strong>' +
          '<span class="sd-kick">TRANSITIONS LAB</span>' +
        '</div>' +
        '<nav class="sd-topbar-nav" aria-label="Strata tool nav">' +
          '<a href="#" class="is-current" data-sd-noop>Map</a>' +
          '<a href="/strata-method" title="Open the method page">Method</a>' +
          '<a href="/strata-data-sources" title="Open the data sources page">Data sources</a>' +
        '</nav>' +
      '</div>' +
      '<div class="sd-demo-strip">DEMO VERSION  ·  SITE CODES AND INDICATOR VALUES ARE ILLUSTRATIVE AND DO NOT DESCRIBE REAL PROJECTS</div>' +
      '<div class="sd-body">' +
        '<aside class="sd-col sd-col-left">' +
          '<div class="sd-totals" id="sd-totals"></div>' +
          '<div class="sd-filters">' +
            '<label class="sd-search" aria-label="Search sites, materials, countries">' +
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
              '<input id="sd-search" type="search" placeholder="Search sites, materials, countries">' +
            '</label>' +
            '<span class="sd-filter-label">Value chain stage</span>' +
            '<div class="sd-chipset" id="sd-stages">' +
              '<button class="sd-chip" data-stage="extraction">Extraction</button>' +
              '<button class="sd-chip" data-stage="processing">Processing</button>' +
              '<button class="sd-chip" data-stage="recycling">Recycling</button>' +
              '<button class="sd-chip" data-stage="integrated">Integrated</button>' +
            '</div>' +
            '<span class="sd-filter-label">Status</span>' +
            '<div class="sd-chipset" id="sd-statuses">' +
              '<button class="sd-chip sd-chip--pre" data-status="pre-construction"><span class="sd-dot"></span>Pre-construction</button>' +
              '<button class="sd-chip sd-chip--uc"  data-status="under-construction"><span class="sd-dot"></span>Under construction</button>' +
              '<button class="sd-chip sd-chip--op"  data-status="operating"><span class="sd-dot"></span>Operating</button>' +
              '<button class="sd-chip sd-chip--alert" data-alertsonly="1"><span class="sd-dot"></span>With open alerts</button>' +
            '</div>' +
          '</div>' +
          '<div class="sd-list-wrap">' +
            '<ul class="sd-list" id="sd-list" role="list"></ul>' +
          '</div>' +
        '</aside>' +
        '<div class="sd-col sd-col-map">' +
          '<div class="sd-map-wrap">' +
            '<svg class="sd-map-svg" viewBox="0 0 ' + MAP_W + ' ' + MAP_H + '" preserveAspectRatio="xMidYMid meet">' +
              '<g id="sd-map-base"></g>' +
              '<g id="sd-map-grid"></g>' +
              '<g id="sd-map-pins"></g>' +
            '</svg>' +
          '</div>' +
          '<div class="sd-map-footer">' +
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

  function renderEmptyDetail(){
    return '<div class="sd-detail-empty">' +
      '<span class="sd-kick">Select a site</span>' +
      '<h3>Click a dot or a row.</h3>' +
      '<p>Each site opens on a single page with baseline year, latest footprint, change since baseline, a disturbed-footprint chart, the baseline-vs-latest outline inside a 500 m buffer, and the full indicator read.</p>' +
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // Base map: a simplified Europe + Morocco silhouette, drawn as
  // a filled path approximating the main landmasses within the
  // viewBox. Not a geographic reference; it is a backdrop for the
  // pins. Country shapes are suggested rather than precise.
  // ─────────────────────────────────────────────────────────────
  function paintBase(){
    var g = mount.querySelector('#sd-map-base');
    // Three paths kept simple and declarative. They were traced
    // from a low-resolution projection of the same lat/lon window
    // (lon -12..32, lat 28..72) that the pins use, so pins and
    // land line up correctly.
    g.innerHTML = '' +
      // Continental Europe + Scandinavia + Iberia + Balkans
      '<path class="sd-map-layer-land" d="' +
        'M 220 700 L 180 620 L 180 540 L 200 480 L 230 440 L 270 420 L 310 430 L 360 420 L 390 390 L 420 380 ' +
        'L 460 390 L 500 400 L 540 400 L 580 380 L 610 360 L 640 350 L 680 340 L 720 320 L 750 300 L 760 260 ' +
        'L 740 220 L 720 180 L 700 150 L 690 120 L 710 100 L 740 90 L 770 110 L 790 150 L 790 190 L 800 230 ' +
        'L 820 270 L 830 310 L 835 350 L 830 390 L 820 430 L 820 470 L 800 500 L 780 520 L 750 530 L 720 540 ' +
        'L 690 540 L 680 560 L 680 580 L 700 600 L 710 625 L 700 655 L 680 670 L 650 680 L 610 685 L 580 685 ' +
        'L 540 690 L 500 695 L 460 700 L 420 710 L 380 710 L 340 710 L 300 710 L 260 710 L 220 700 Z' +
      '"/>' +
      // British Isles (UK + Ireland)
      '<path class="sd-map-layer-land" d="' +
        'M 250 365 L 230 345 L 215 320 L 215 290 L 230 265 L 245 245 L 265 245 L 285 255 L 290 275 L 290 300 ' +
        'L 290 325 L 285 350 L 285 375 L 275 395 L 260 395 L 245 390 Z' +
      '"/>' +
      // Iceland (small, top-left; included because EGMS covers it as a Copernicus Participating State)
      '<path class="sd-map-layer-land" d="M 185 215 L 205 205 L 225 215 L 230 230 L 215 240 L 195 235 Z"/>' +
      // North Africa coast (just enough of Morocco + Algeria to anchor Bou-Azzer)
      '<path class="sd-map-layer-land" d="' +
        'M 160 700 L 180 695 L 220 695 L 260 695 L 300 695 L 340 695 L 380 695 L 420 695 L 460 695 L 500 695 ' +
        'L 540 695 L 580 695 L 620 695 L 660 695 L 700 695 L 740 695 L 780 695 L 820 695 L 860 695 L 900 695 ' +
        // down to Morocco
        'L 900 700 L 900 710 L 860 712 L 820 714 L 780 712 L 740 710 L 700 710 L 660 715 L 620 720 L 580 725 ' +
        'L 540 728 L 500 730 L 460 730 L 420 725 L 380 715 L 340 710 L 300 705 L 260 702 L 220 700 L 180 700 L 160 700 Z' +
      '"/>';
  }

  function paintGrid(){
    var g = mount.querySelector('#sd-map-grid');
    var html = '';
    // Lon lines every 10°
    for (var lon = -10; lon <= 30; lon += 10){
      var x = lonToX(lon);
      html += '<line class="sd-map-grid" x1="' + x + '" y1="0" x2="' + x + '" y2="' + MAP_H + '"/>';
      html += '<text class="sd-map-label" x="' + (x + 4) + '" y="' + (MAP_H - 6) + '">' + lon + '°</text>';
    }
    // Lat lines every 10°
    for (var lat = 30; lat <= 70; lat += 10){
      var y = latToY(lat);
      html += '<line class="sd-map-grid" x1="0" y1="' + y + '" x2="' + MAP_W + '" y2="' + y + '"/>';
      html += '<text class="sd-map-label" x="6" y="' + (y - 4) + '">' + lat + '°N</text>';
    }
    g.innerHTML = html;
  }

  // ─────────────────────────────────────────────────────────────
  // Filter + search
  // ─────────────────────────────────────────────────────────────
  function filteredSites(){
    var q = state.query.trim().toLowerCase();
    return SITES.filter(function(s){
      if (state.stages.size && !state.stages.has(s.stage)) return false;
      if (state.statuses.size && !state.statuses.has(s.status)) return false;
      if (state.alertsOnly && !s.alert) return false;
      if (q){
        var hay = (
          s.code + ' ' + s.name + ' ' + s.country + ' ' + (s.materials || []).join(' ')
        ).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function latestFootprint(s){
    if (!s.series || !s.series.length) return 0;
    return s.series[s.series.length - 1][1];
  }
  function baselineFootprint(s){
    if (!s.series || !s.series.length) return 0;
    return s.series[0][1];
  }

  // ─────────────────────────────────────────────────────────────
  // Totals
  // ─────────────────────────────────────────────────────────────
  function paintTotals(){
    var visible = filteredSites();
    var shown = visible.length;
    var preCount = visible.filter(function(s){ return s.status === 'pre-construction'; }).length;
    var disturbed = visible.reduce(function(a, s){ return a + latestFootprint(s); }, 0);
    var alerts = visible.filter(function(s){ return !!s.alert; }).length;

    var el = mount.querySelector('#sd-totals');
    el.innerHTML =
      '<div class="sd-total"><span class="sd-kick">Sites shown</span><span class="sd-n">' + shown + '<span class="sd-unit">/ ' + SITES.length + '</span></span></div>' +
      '<div class="sd-total"><span class="sd-kick">Pre-construction</span><span class="sd-n">' + preCount + '</span></div>' +
      '<div class="sd-total"><span class="sd-kick">Disturbed, 2026</span><span class="sd-n">' + nf.format(Math.round(disturbed)) + '<span class="sd-unit">ha</span></span></div>' +
      '<div class="sd-total sd-total--alert"><span class="sd-kick">Open alerts</span><span class="sd-n">' + alerts + '</span></div>';
  }

  // ─────────────────────────────────────────────────────────────
  // List
  // ─────────────────────────────────────────────────────────────
  function paintList(){
    var visible = filteredSites().sort(function(a, b){
      // Sort: alerts first, then by latest footprint desc
      var aAlert = a.alert ? 1 : 0, bAlert = b.alert ? 1 : 0;
      if (aAlert !== bAlert) return bAlert - aAlert;
      return latestFootprint(b) - latestFootprint(a);
    });
    var list = mount.querySelector('#sd-list');
    if (!visible.length){
      list.innerHTML = '<li class="sd-list-empty">No sites match. Clear filters.</li>';
      return;
    }
    list.innerHTML = visible.map(function(s){
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
          '<span>' +
            '<span class="sd-site-ha">' + fmtHa(ha) + ' ha</span>' +
            (s.alert ? '<span class="sd-site-flag">ALERT</span>' : '') +
          '</span>' +
        '</button>' +
      '</li>';
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────
  // Pins on the map
  // ─────────────────────────────────────────────────────────────
  function paintPins(){
    var g = mount.querySelector('#sd-map-pins');
    var visible = new Set(filteredSites().map(function(s){ return s.code; }));
    g.innerHTML = SITES.map(function(s){
      var cx = lonToX(s.coord.lon);
      var cy = latToY(s.coord.lat);
      var ha = latestFootprint(s);
      // Pin radius: between 4 and 14 px, log-scaled on hectares.
      var r = Math.max(5, Math.min(14, 4 + Math.log(1 + ha) * 1.6));
      var isActive = state.selectedCode === s.code;
      var isDim = !visible.has(s.code);
      var fill, stroke, strokeW;
      if (s.alert){ fill = '#C64A2E'; stroke = 'none'; strokeW = 0; }
      else if (s.status === 'pre-construction'){ fill = '#fff'; stroke = '#121212'; strokeW = 2; }
      else if (s.status === 'under-construction'){ fill = '#D7A54B'; stroke = 'none'; strokeW = 0; }
      else { fill = '#2E7A3C'; stroke = 'none'; strokeW = 0; } // operating
      var activeRing = isActive ? '<circle class="sd-pin-ring" cx="' + cx + '" cy="' + cy + '" r="' + (r + 6) + '"/>' : '';
      return '<g class="sd-pin' + (isDim ? ' is-dim' : '') + (isActive ? ' is-active' : '') + '" data-code="' + s.code + '" tabindex="0" role="button" aria-label="' + esc(s.name) + '">' +
        activeRing +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (strokeW ? ' stroke="' + stroke + '" stroke-width="' + strokeW + '"' : '') + '/>' +
        '<text class="sd-pin-label" x="' + (cx + r + 6) + '" y="' + (cy + 3) + '">' + s.code + '</text>' +
      '</g>';
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────
  // Detail panel
  // ─────────────────────────────────────────────────────────────
  function paintDetail(){
    var el = mount.querySelector('#sd-detail');
    var s = SITES.find(function(x){ return x.code === state.selectedCode; });
    if (!s){ el.innerHTML = renderEmptyDetail(); return; }
    var baseline = baselineFootprint(s);
    var latest   = latestFootprint(s);
    var delta    = latest - baseline;
    var deltaPct = baseline > 0 ? delta / baseline : null;
    var fillColor = s.alert ? '#C64A2E' : (s.status === 'operating' ? '#2E7A3C' : (s.status === 'under-construction' ? '#D7A54B' : '#121212'));
    var deltaCls  = s.status === 'pre-construction' ? '' : (delta > 0 ? ' sd-n--neg' : ' sd-n--pos');
    var deltaSign = delta > 0 ? '+' : (delta < 0 ? '' : '±');
    var worksText = s.worksStarted != null ? String(s.worksStarted) : '—';

    el.innerHTML = '' +
      '<div class="sd-detail">' +
        '<div class="sd-detail-head">' +
          '<button class="sd-detail-close" type="button" aria-label="Close site detail" data-sd-close>×</button>' +
          '<div class="sd-detail-code"><span class="sd-code-sq" style="background:' + fillColor + '"></span>' + esc(s.code) + ' · ' + esc(joinMaterials(s.materials)) + ' · ' + esc(stageLabel(s.stage).toUpperCase()) + '</div>' +
          '<h2>' + esc(s.name) + '</h2>' +
          '<div class="sd-detail-badges">' +
            renderStatusBadge(s.status) +
            (s.alert ? '<span class="sd-badge sd-badge--alert">ALERT</span>' : '') +
          '</div>' +
        '</div>' +
        (s.alert ? ('<div class="sd-alert-strip"><strong>' + esc(s.alert.title) + '.</strong> ' + esc(s.alert.body) + '</div>') : '') +
        '<div class="sd-stats">' +
          '<div class="sd-stat"><span class="sd-kick">Baseline year</span><span class="sd-n">' + s.baselineYear + '</span></div>' +
          '<div class="sd-stat"><span class="sd-kick">Footprint 2026</span><span class="sd-n">' + fmtHa(latest) + '<span class="sd-unit">ha</span></span></div>' +
          '<div class="sd-stat"><span class="sd-kick">Since baseline</span><span class="sd-n' + deltaCls + '">' + deltaSign + fmtHa(Math.abs(delta)) + '<span class="sd-unit">ha' + (deltaPct != null ? ' · ' + deltaSign + (Math.round(Math.abs(deltaPct) * 100)) + '%' : '') + '</span></span></div>' +
          '<div class="sd-stat"><span class="sd-kick">Works started</span><span class="sd-n">' + worksText + '</span></div>' +
        '</div>' +
        '<div class="sd-chart"><span class="sd-section-head">Disturbed footprint, hectares</span>' + renderChart(s, fillColor) + '</div>' +
        '<div class="sd-outline"><span class="sd-section-head">Footprint outline, baseline vs latest</span>' + renderOutline(s, fillColor) +
          '<div class="sd-outline-legend">' +
            '<span class="sd-sw sd-sw--base"><span class="sw-box"></span>Baseline ' + s.baselineYear + '</span>' +
            '<span class="sd-sw sd-sw--latest" style="color:' + fillColor + '"><span class="sw-box"></span>Latest 2026</span>' +
          '</div>' +
        '</div>' +
        '<div class="sd-indicators"><span class="sd-section-head">Indicators, 2026</span>' + renderIndicators(s) + '</div>' +
        '<div class="sd-detail-foot">' +
          (s.promoterResponse ? '<strong>Promoter response:</strong> ' + esc(s.promoterResponse) + '<br>' : '') +
          'Attribution: Contains modified Copernicus Sentinel data 2019–2026 · ESA WorldCover 2021 · ' +
          (s.egmsCovered ? 'European Ground Motion Service · ' : '') +
          'Natura 2000 © European Union, DG Environment, distributed by the EEA. See <a href="/strata-data-sources">data sources</a>.' +
        '</div>' +
      '</div>';
  }

  function renderStatusBadge(status){
    if (status === 'operating') return '<span class="sd-badge sd-badge--op">OPERATING</span>';
    if (status === 'under-construction') return '<span class="sd-badge sd-badge--uc">UNDER CONSTRUCTION</span>';
    return '<span class="sd-badge sd-badge--pre">PRE-CONSTRUCTION</span>';
  }

  // Simple line chart with baseline dashed and works-start marker.
  function renderChart(s, color){
    var W = 320, H = 150, padL = 36, padR = 8, padT = 18, padB = 22;
    var pts = s.series;
    if (!pts.length) return '';
    var years = pts.map(function(p){ return parseInt(p[0], 10); });
    var vals  = pts.map(function(p){ return p[1]; });
    var yMax = Math.max.apply(null, vals.concat([1]));
    // Round yMax up to a nice number
    yMax = niceMax(yMax);
    var xMin = years[0], xMax = years[years.length - 1];
    if (xMin === xMax) { xMax = xMin + 1; }

    function px(year){ return padL + (year - xMin) / (xMax - xMin) * (W - padL - padR); }
    function py(val){ return H - padB - (val / yMax) * (H - padT - padB); }

    var linePath = pts.map(function(p, i){
      var x = px(parseInt(p[0], 10)), y = py(p[1]);
      return (i ? 'L ' : 'M ') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
    var areaPath = linePath + ' L ' + px(xMax).toFixed(1) + ' ' + (H - padB) + ' L ' + px(xMin).toFixed(1) + ' ' + (H - padB) + ' Z';

    // Works-started marker
    var worksMarker = '';
    if (s.worksStarted != null && s.worksStarted >= xMin && s.worksStarted <= xMax){
      var wx = px(s.worksStarted);
      worksMarker = '<line class="cv-works" x1="' + wx + '" y1="' + padT + '" x2="' + wx + '" y2="' + (H - padB) + '"/>' +
        '<text class="cv-text" x="' + (wx + 4) + '" y="' + (padT + 10) + '">works start</text>';
    }
    // Baseline marker (first year)
    var bx = px(xMin);
    var baselineMarker = '<line class="cv-baseline" x1="' + bx + '" y1="' + padT + '" x2="' + bx + '" y2="' + (H - padB) + '"/>' +
      '<text class="cv-text" x="' + (bx + 4) + '" y="' + (padT + 10) + '">baseline</text>';
    // Y axis labels
    var yLabels = '' +
      '<text class="cv-value" x="4" y="' + (padT + 4) + '">' + nf.format(yMax) + '</text>' +
      '<text class="cv-value" x="4" y="' + ((padT + (H - padB)) / 2 + 4) + '">' + nf.format(Math.round(yMax / 2)) + '</text>' +
      '<text class="cv-value" x="4" y="' + (H - padB + 4) + '">0</text>';
    // X axis labels (first, mid, last)
    var midYear = years[Math.floor(years.length / 2)];
    var xLabels = '' +
      '<text class="cv-text" x="' + px(xMin) + '" y="' + (H - 6) + '">' + xMin + '</text>' +
      '<text class="cv-text" x="' + px(midYear) + '" y="' + (H - 6) + '" text-anchor="middle">' + midYear + '</text>' +
      '<text class="cv-text" x="' + px(xMax) + '" y="' + (H - 6) + '" text-anchor="end">' + xMax + '</text>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<line class="cv-axis" x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '"/>' +
      '<path class="cv-area" d="' + areaPath + '" fill="' + color + '"/>' +
      '<path class="cv-line" d="' + linePath + '" stroke="' + color + '"/>' +
      baselineMarker + worksMarker + yLabels + xLabels +
    '</svg>';
  }

  function niceMax(n){
    if (n <= 10) return 10;
    if (n <= 50) return Math.ceil(n / 10) * 10;
    if (n <= 500) return Math.ceil(n / 50) * 50;
    if (n <= 5000) return Math.ceil(n / 500) * 500;
    return Math.ceil(n / 5000) * 5000;
  }

  // Footprint outline: two concentric blobs inside a 500 m buffer ring.
  // Dimensions scale with footprint hectares, so a 1,400 ha site reads
  // visibly larger than a 20 ha one.
  function renderOutline(s, color){
    var W = 320, H = 170;
    var cx = W / 2, cy = H / 2;
    var buf = Math.min(W, H) / 2 - 10;
    var ha = Math.max(0.1, latestFootprint(s));
    var baseHa = baselineFootprint(s);
    // Scale: 1,500 ha fills the buffer. Smaller sites scale down with sqrt.
    var scaleLatest   = Math.sqrt(ha / 1500);
    var scaleBaseline = Math.sqrt(Math.max(0.001, baseHa) / 1500);
    var latestR  = Math.max(10, buf * scaleLatest);
    var baseR    = Math.max(3,  buf * scaleBaseline);

    // Draw as rough blobs rather than circles — a 6-point randomized
    // polygon per shape, seeded by the site code so each site has a
    // stable shape.
    function seededPolygon(code, r, salt){
      var seed = 0;
      for (var i = 0; i < code.length; i++) seed += code.charCodeAt(i) * (i + 1);
      seed += salt * 7;
      var pts = [];
      for (var k = 0; k < 10; k++){
        var ang = (k / 10) * Math.PI * 2;
        seed = (seed * 9301 + 49297) % 233280;
        var jitter = 0.78 + ((seed / 233280) * 0.42);
        var x = cx + Math.cos(ang) * r * jitter;
        var y = cy + Math.sin(ang) * r * jitter;
        pts.push(x.toFixed(1) + ',' + y.toFixed(1));
      }
      return pts.join(' ');
    }
    var basePoly = seededPolygon(s.code, baseR, 1);
    var latestPoly = seededPolygon(s.code, latestR, 1);

    // Scale bar: baseline = latest-year polygon width in metres is a
    // function of ha. Instead of a real bar we display a nominal "500 m
    // buffer" ring label, which matches the method page.
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + buf + '" fill="none" stroke="#B6AC94" stroke-dasharray="3 3"/>' +
      '<text x="' + (W - 14) + '" y="18" text-anchor="end" font-family="JetBrains Mono,ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10" fill="#6B6457">500 m buffer</text>' +
      (baseHa > 0 ? ('<polygon points="' + basePoly + '" fill="none" stroke="#121212" stroke-dasharray="3 2"/>') : '') +
      '<polygon points="' + latestPoly + '" fill="' + color + '" fill-opacity="0.55" stroke="' + color + '"/>' +
    '</svg>';
  }

  function renderIndicators(s){
    var ind = s.indicators || {};
    var rows = [
      ['Buffer vegetation loss, 0 to 5 km', ind.vegLoss5kmPct == null ? null : fmtPct(ind.vegLoss5kmPct)],
      ['Of which inside Natura 2000',       ind.natura2000Pct == null ? null : fmtPct(ind.natura2000Pct)],
      ['Water and tailings surface',        ind.waterTailingsHa == null ? null : (fmtHa(ind.waterTailingsHa) + ' ha')],
      ['Ground motion',                     ind.groundMotionMmYr == null ? '— (outside EGMS coverage)' : (ind.groundMotionMmYr + ' mm/yr')],
    ];
    var landPieces = Object.keys(ind.landConverted || {}).map(function(k){
      return k + ' ' + fmtHa(ind.landConverted[k]) + ' ha';
    });
    rows.push(['Land converted (former cover)', landPieces.length ? landPieces.join(', ') : '— (no change yet)']);

    return '<table><thead><tr><th>Indicator</th><th class="sd-indicators-value">Value</th></tr></thead><tbody>' +
      rows.map(function(r){
        var isNull = (r[1] == null || /^—/.test(String(r[1])));
        return '<tr><td>' + esc(r[0]) + '</td><td class="sd-indicators-value' + (isNull ? ' sd-indicators-null' : '') + '">' + esc(r[1] || '—') + '</td></tr>';
      }).join('') +
    '</tbody></table>';
  }

  // ─────────────────────────────────────────────────────────────
  // Events
  // ─────────────────────────────────────────────────────────────
  function selectSite(code, opts){
    opts = opts || {};
    state.selectedCode = (state.selectedCode === code && opts.toggleOff !== false) ? null : code;
    paintList();
    paintPins();
    paintDetail();
    if (state.selectedCode && opts.scroll !== false){
      var panel = mount.querySelector('#sd-detail');
      // Only scroll on narrow viewports where the panel is below the fold.
      if (panel && window.matchMedia('(max-width: 1100px)').matches){
        panel.scrollIntoView({behavior: 'smooth', block: 'start'});
      }
    }
  }

  function wireEvents(){
    mount.addEventListener('input', function(ev){
      if (ev.target.id === 'sd-search'){
        state.query = ev.target.value || '';
        paintTotals(); paintList(); paintPins();
      }
    });
    mount.addEventListener('click', function(ev){
      // Site row click
      var row = ev.target.closest('.sd-site-row');
      if (row){ selectSite(row.getAttribute('data-code')); return; }
      // Stage chip
      var sc = ev.target.closest('.sd-chip[data-stage]');
      if (sc){
        var k = sc.getAttribute('data-stage');
        if (state.stages.has(k)) state.stages.delete(k); else state.stages.add(k);
        sc.classList.toggle('is-on');
        paintTotals(); paintList(); paintPins(); return;
      }
      // Status chip
      var stc = ev.target.closest('.sd-chip[data-status]');
      if (stc){
        var kk = stc.getAttribute('data-status');
        if (state.statuses.has(kk)) state.statuses.delete(kk); else state.statuses.add(kk);
        stc.classList.toggle('is-on');
        paintTotals(); paintList(); paintPins(); return;
      }
      // Alerts-only chip
      var ac = ev.target.closest('.sd-chip[data-alertsonly]');
      if (ac){
        state.alertsOnly = !state.alertsOnly;
        ac.classList.toggle('is-on');
        paintTotals(); paintList(); paintPins(); return;
      }
      // Close detail
      if (ev.target.closest('[data-sd-close]')){
        state.selectedCode = null;
        paintList(); paintPins(); paintDetail(); return;
      }
      // Top nav demo-mode links: let the two real nav links to /strata-method
      // and /strata-data-sources through, but suppress the "Map" link.
      if (ev.target.closest('[data-sd-noop]')){ ev.preventDefault(); return; }
      // Map pin click
      var pin = ev.target.closest('.sd-pin');
      if (pin){ selectSite(pin.getAttribute('data-code')); return; }
    });
    mount.addEventListener('keydown', function(ev){
      // Open a focused pin with Enter / Space
      if (ev.key === 'Enter' || ev.key === ' '){
        var pin = ev.target.closest && ev.target.closest('.sd-pin');
        if (pin){ ev.preventDefault(); selectSite(pin.getAttribute('data-code')); }
      }
      if (ev.key === 'Escape' && state.selectedCode){
        state.selectedCode = null; paintList(); paintPins(); paintDetail();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Boot
  // ─────────────────────────────────────────────────────────────
  buildShell();
  paintTotals();
  paintList();
  paintPins();
  wireEvents();
})();
