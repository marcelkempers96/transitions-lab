§ / Tool

# A satellite lifecycle card for every closed mine waste site

*Strata gives each [closed mine waste site](/insight-closed-mine-waste) a satellite lifecycle card: what it looks like now, how it has changed over ten years, how big the heap is, who lives nearby, and what each of the three pathways (leave and monitor, rehabilitate, reprocess) would involve. Pilot in the Iberian Pyrite Belt.*

<p class="article-meta"><span class="article-date">30 October 2026</span> · <span class="article-reading-time">5 min read</span></p>

<nav class="strata-pages" aria-label="Strata pages">
  <strong class="is-current">Overview</strong>
  <a href="/strata-guide">Guide</a>
  <a href="/strata-demo">Launch app &rarr;</a>
  <a href="/strata-method">Method &amp; data</a>
  <a href="/strata-paper">Companion paper</a>
</nav>

<div class="strata-hero">
  <div class="strata-hero-globe-wrap">
    <canvas id="strata-globe" class="strata-globe" width="520" height="520" aria-hidden="true"></canvas>
    <p class="strata-hero-caption">The ten pilot sites, on an orthographic projection. Drag to rotate.</p>
  </div>
  <div class="strata-hero-body">
    <p class="strata-wordmark"><img src="/assets/logos/strata-lockup-black.svg" alt="Strata — a satellite lifecycle card for every closed mine waste site"></p>
    <p class="strata-hero-pitch">A satellite lifecycle card for every closed mine waste site, built on open Copernicus data. One method, every site, in every browser.</p>
    <p class="strata-hero-actions">
      <a href="/strata-demo" class="btn btn-ink">Launch Strata &rarr;</a>
      <a href="/strata-paper" class="btn btn-ghost">Companion paper</a>
    </p>
    <form class="strata-signup" data-strata-signup>
      <label for="strata-signup-email" class="strata-signup-label">Get the pilot update when it lands.</label>
      <div class="strata-signup-row">
        <input id="strata-signup-email" type="email" required placeholder="you@organisation.eu" autocomplete="email">
        <button type="submit">Sign up</button>
      </div>
      <p class="strata-signup-note" aria-live="polite"></p>
    </form>
  </div>
</div>

<script src="/assets/strata-world.js" defer></script>
<script>
(function(){
  'use strict';
  function boot(){
    var canvas = document.getElementById('strata-globe');
    if (!canvas) return;
    var rings = window.STRATA_WORLD_RINGS || [];
    // Ten pilot sites (lon, lat) matching sites.seed.geojson
    var SITES = [
      {id:'PT-SDO', lon:-7.502, lat:37.665},
      {id:'PT-LOU', lon:-8.426, lat:38.035},
      {id:'PT-ALJ', lon:-8.165, lat:37.877},
      {id:'ES-THA', lon:-7.125, lat:37.590},
      {id:'ES-RTO', lon:-6.590, lat:37.700},
      {id:'ES-PDH', lon:-6.553, lat:37.738},
      {id:'ES-ZAR', lon:-6.860, lat:37.705},
      {id:'ES-AZN', lon:-6.270, lat:37.520},
      {id:'DE-BOL', lon:10.455, lat:51.912},
      {id:'SE-FAL', lon:15.610, lat:60.600}
    ];

    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var dpr = window.devicePixelRatio || 1;
    function resize(){
      var sz = Math.min(canvas.clientWidth || 520, 520);
      W = canvas.width = Math.round(sz * dpr);
      H = canvas.height = Math.round(sz * dpr);
      canvas.style.width = sz + 'px';
      canvas.style.height = sz + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var cx = function(){ return W / 2; };
    var cy = function(){ return H / 2; };
    var R  = function(){ return Math.min(W, H) / 2 - 10 * dpr; };

    // State
    var centreLon = 2;  // centre of EU
    var centreLat = 45;
    var autoSpin = true;
    var drag = null;

    function project(lon, lat){
      // Orthographic
      var phi0 = centreLat * Math.PI / 180;
      var lam0 = centreLon * Math.PI / 180;
      var phi  = lat * Math.PI / 180;
      var lam  = lon * Math.PI / 180;
      var cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam - lam0);
      if (cosC < 0) return null;
      var x = Math.cos(phi) * Math.sin(lam - lam0);
      var y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lam - lam0);
      return [cx() + x * R(), cy() - y * R()];
    }

    function draw(){
      ctx.clearRect(0, 0, W, H);
      // Ocean sphere
      var r = R();
      var grad = ctx.createRadialGradient(cx() - r * 0.3, cy() - r * 0.35, r * 0.1, cx(), cy(), r);
      grad.addColorStop(0, '#F6F5F2');
      grad.addColorStop(1, '#DCD7C7');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx(), cy(), r, 0, Math.PI * 2); ctx.fill();
      // Thin rim
      ctx.strokeStyle = '#B9B3A4';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      // Graticule, 15° lon lines
      ctx.strokeStyle = 'rgba(107, 105, 99, 0.18)';
      ctx.lineWidth = 1 * dpr;
      for (var g = -180; g < 180; g += 15) {
        drawPolyline(latLineAtLon(g), false);
      }
      for (var h = -75; h <= 75; h += 15) {
        drawPolyline(parallelAtLat(h), false);
      }

      // Land
      ctx.strokeStyle = '#1D6B55';
      ctx.lineWidth = 1 * dpr;
      ctx.fillStyle = 'rgba(29, 107, 85, 0.14)';
      for (var i = 0; i < rings.length; i++) drawRing(rings[i]);

      // Pilot site pins
      for (var k = 0; k < SITES.length; k++) {
        var s = SITES[k];
        var p = project(s.lon, s.lat);
        if (!p) continue;
        ctx.fillStyle = '#C2502A';
        ctx.beginPath(); ctx.arc(p[0], p[1], 4 * dpr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }

      // Shadow for depth
      var shadow = ctx.createRadialGradient(cx() + r * 0.4, cy() + r * 0.4, r * 0.8, cx(), cy(), r);
      shadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadow.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      ctx.fillStyle = shadow;
      ctx.beginPath(); ctx.arc(cx(), cy(), r, 0, Math.PI * 2); ctx.fill();
    }

    function drawRing(flat){
      // Flat = [lon, lat, lon, lat, ...]
      // Visible segments only; break the path when we cross the terminator.
      ctx.beginPath();
      var inPath = false;
      for (var i = 0; i < flat.length; i += 2) {
        var p = project(flat[i], flat[i + 1]);
        if (p) {
          if (!inPath) { ctx.moveTo(p[0], p[1]); inPath = true; }
          else ctx.lineTo(p[0], p[1]);
        } else {
          inPath = false;
        }
      }
      ctx.stroke();
    }

    function drawPolyline(points, close){
      ctx.beginPath();
      var inPath = false;
      for (var i = 0; i < points.length; i++) {
        var p = project(points[i][0], points[i][1]);
        if (p) {
          if (!inPath) { ctx.moveTo(p[0], p[1]); inPath = true; }
          else ctx.lineTo(p[0], p[1]);
        } else { inPath = false; }
      }
      ctx.stroke();
    }

    function latLineAtLon(lon){
      var out = [];
      for (var lat = -85; lat <= 85; lat += 5) out.push([lon, lat]);
      return out;
    }
    function parallelAtLat(lat){
      var out = [];
      for (var lon = -180; lon <= 180; lon += 5) out.push([lon, lat]);
      return out;
    }

    // Animate rotation
    var last = performance.now();
    function tick(now){
      var dt = Math.min(100, now - last) / 1000;
      last = now;
      if (autoSpin && !drag) {
        centreLon = (centreLon + dt * 6) % 360; // 6 degrees per second
        if (centreLon > 180) centreLon -= 360;
      }
      draw();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Drag to rotate
    canvas.addEventListener('pointerdown', function(ev){
      drag = { x: ev.clientX, y: ev.clientY, lon0: centreLon, lat0: centreLat };
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove', function(ev){
      if (!drag) return;
      var dx = ev.clientX - drag.x;
      var dy = ev.clientY - drag.y;
      centreLon = drag.lon0 - dx * 0.4;
      centreLat = Math.max(-80, Math.min(80, drag.lat0 + dy * 0.4));
    });
    canvas.addEventListener('pointerup',    function(){ drag = null; });
    canvas.addEventListener('pointercancel',function(){ drag = null; });
    canvas.addEventListener('pointerleave', function(){ drag = null; });

    // Sign-up form reuses the newsletter endpoint, source 'strata'.
    var form = document.querySelector('[data-strata-signup]');
    if (form) form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var email = form.querySelector('input[type="email"]').value.trim();
      var note = form.querySelector('.strata-signup-note');
      note.textContent = 'Sending…';
      note.classList.remove('is-ok','is-err');
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, source: 'strata' })
      }).then(function(r){ return r.json().then(function(j){ return {s:r.status,b:j}; }); })
        .then(function(res){
          if (res.s === 200 && res.b.ok) {
            note.textContent = res.b.already ? 'You are already on the list — thank you.' : 'Thank you. You are on the list.';
            note.classList.add('is-ok');
            if (!res.b.already) form.reset();
          } else {
            note.textContent = (res.b && res.b.error) || 'Could not sign up. Please try again.';
            note.classList.add('is-err');
          }
        })
        .catch(function(){ note.textContent = 'Network error. Please try again.'; note.classList.add('is-err'); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>

Mining and quarrying produced 22.7% of the roughly 2.2 billion tonnes of waste generated in the EU in 2022 ([European Parliament](https://www.europarl.europa.eu/topics/en/article/20180328STO00751/sustainable-waste-management-what-the-eu-is-doing)). Most of that sits in heaps and tailings ponds across the continent, around sites that stopped operating decades ago. [Article 27 of the Critical Raw Materials Act](https://meetingorganizer.copernicus.org/EGU26/EGU26-9857.html) now requires Member States to build a database of these facilities, with location, area, waste volume, operator and raw material content, to judge whether critical raw materials can be recovered. Finland is assigning the task to its geological survey from [1 November 2026](https://www.gtk.fi/en/current/geological-survey-of-finland-assigned-tasks-under-the-eu-critical-raw-materials-act/).

Three people are now making the same call for each site, with different evidence of different quality. A geological survey needs to decide which closed facility deserves field sampling first. A municipality next to a heap needs to understand what each pathway would mean for the landscape and the people living beside it. A reprocessing company needs to shortlist the sites worth investigating for secondary critical raw materials. Each currently reasons from a different map.

Strata is the shared evidence base. One open method per site, satellite indicators that are the same thing in Portugal and in Sweden, and a lifecycle card that reads the same way across audiences.

## What a lifecycle card holds

Each site opens on a single scrollable page.

**Key facts.** Waste area in hectares (from the polygon). Volume proxy in cubic metres (from the Copernicus DEM). Bare ground now and vegetation now (from the latest Sentinel-2 composite). People within 1 km (from GHSL). Red water as a share of water on site (from the acid-drainage colour index).

**Now from space.** A live Sentinel-2 Level-2A scene for the site, classified pixel-by-pixel into vegetation, bare ground, bare with an iron oxide signal, water and red or orange water. The classes use the formulas in the [method page](/strata-method); the implementation is in [`strata-core.js`](https://github.com/marcelkempers96/transitions-lab/blob/main/assets/strata/core.js) and ships with twenty-six unit tests.

**Ten years of change.** A line chart of vegetation %, bare %, iron signal % and red water %, from a 2017 baseline summer composite onwards. A natural recovery clock reads whether the site is recovering, stable or declining, based on the Theil-Sen trend of vegetation cover, and gives the number of years to reach 50% vegetation at the current trend.

**Three pathways.** Leave and monitor, rehabilitate, reprocess and rehabilitate. Each column shows the satellite facts that matter for that pathway. The lifecycle view (life-cycle assessment numbers from a planned follow-up study) sits beside them, labelled as under way until the comparison is published in June 2027.

**Around the site.** People within 1 and 5 km, Natura 2000 overlap and distance, nearest watercourse, land cover in the 500 m ring, ground motion from the European Ground Motion Service, and the long-term water history from the JRC Global Surface Water record.

**What people here told us.** A section that stays empty until the pilot social-needs fieldwork lands in 2027.

**Export and cite.** One click produces a CSV row keyed to the CRMA Article 27 database fields; another produces the site's GeoJSON polygon. Fields Strata cannot measure from space (operator, measured metal content) are left empty by design, never estimated.

## How to use STRATA

Six features that cover ninety per cent of what a geological survey, a municipality or a reprocessing firm will do with the tool. Each one links straight to the feature in the live app.

<div class="strata-features strata-features--shots">
  <a class="strata-feature" href="/strata-demo#map">
    <div class="strata-feature-shot">
      <img src="/assets/img/strata-feat-map.jpg" alt="Strata overview map with the ten pilot pins across Iberia, Germany and Sweden" loading="lazy">
    </div>
    <h3>1 · Satellite map with lifecycle pins</h3>
    <p>Real ESRI World Imagery under every pin. Switch between satellite, street and terrain base maps. Pins coloured by lifecycle stage (operating, legacy largely bare, legacy mixed, recovering naturally, vegetated, reopening planned) and sized by waste footprint. Site polygons overlaid so the heap shape reads against the ground.</p>
    <span class="strata-feature-cta">Open the map &rarr;</span>
  </a>

  <a class="strata-feature" href="/strata-demo#site-pt-sdo">
    <div class="strata-feature-shot">
      <img src="/assets/img/strata-feat-sitecard.jpg" alt="São Domingos site card: stage pill, red-water flag, waste area 110 ha, DEM volume 17.2 Mm³, bare 51 per cent, vegetation 19 per cent" loading="lazy">
    </div>
    <h3>2 · Lifecycle site card</h3>
    <p>Eight sections per site: header with stage pill and flag pills, key facts strip (area, DEM volume, bare %, vegetation %, people within 1 km, red-water share), Now-from-space live panel, ten-year change chart with the natural recovery clock, three-pathway comparison (leave / rehabilitate / reprocess), around-the-site stats, community voices, export buttons.</p>
    <span class="strata-feature-cta">Open São Domingos site card &rarr;</span>
  </a>

  <a class="strata-feature" href="/strata-demo#site-es-rto">
    <div class="strata-feature-shot">
      <img src="/assets/img/strata-feat-live.jpg" alt="Now from space live panel beside the ten-year change chart and the natural recovery clock" loading="lazy">
    </div>
    <h3>3 · Live Sentinel-2 scene classifier</h3>
    <p>Press <em>Load latest Sentinel-2 scene</em> and the browser pulls the clearest Sentinel-2 L2A over the site from Earth Search, reads six bands as Cloud-Optimised GeoTIFF windows, and classifies every 10 m pixel. Three canvases side by side — true colour, pixel classes (vegetation / bare / bare+iron / water / red water), NDVI — plus a stats table for the polygon and the 500 m ring. No account, no server, 8–20 seconds.</p>
    <span class="strata-feature-cta">Run it on the Río Tinto district &rarr;</span>
  </a>

  <a class="strata-feature" href="/strata-demo#compare">
    <div class="strata-feature-shot">
      <img src="/assets/img/strata-feat-compare.jpg" alt="Compare table: all ten pilot sites side by side with lifecycle stage, flags, area, volume, bare and iron percentages, recovery clock, people within 1 km and EGMS motion share" loading="lazy">
    </div>
    <h3>4 · Compare table across every site</h3>
    <p>All ten pilot sites side by side with lifecycle stage, flags, area, DEM volume proxy, bare %, iron signal %, red-water %, recovery clock status, people within 1 km, Natura 2000 overlap, EGMS share subsiding faster than 5 mm/yr. Export the whole table as CSV or every polygon as GeoJSON in one click.</p>
    <span class="strata-feature-cta">Open the Compare view &rarr;</span>
  </a>

  <a class="strata-feature" href="/strata-demo#communities">
    <div class="strata-feature-shot">
      <img src="/assets/img/strata-feat-communities.jpg" alt="Communities view showing Mina de São Domingos with mining landscape, livelihoods, resident concerns and three pathway preference cards" loading="lazy">
    </div>
    <h3>5 · Communities</h3>
    <p>The three pilot communities (Mina de São Domingos / Mértola, Minas de Riotinto and Nerva, Aznalcóllar) with the mining landscape, livelihoods today, residents' preliminary concerns, pathway preferences, and the sites each is beside. Replaced by anonymised themes from the pilot social-needs fieldwork between February and May 2027.</p>
    <span class="strata-feature-cta">Open the Communities view &rarr;</span>
  </a>

  <a class="strata-feature" href="/strata-demo#pipeline">
    <div class="strata-feature-shot">
      <img src="/assets/img/strata-feat-pipeline.jpg" alt="Pipeline diagram: open Copernicus data in, strata-core.js classifier with 26 of 26 unit tests passing, CRMA Article 27 CSV and GeoJSON out" loading="lazy">
    </div>
    <h3>6 · Pipeline + CRMA Article 27 export</h3>
    <p>Flow from open data in (Sentinel-2, DEM, EGMS, WorldCover, GSW, GHSL, OSM) through the in-browser classifier (<em>strata-core.js</em>, 26 of 26 unit tests pass) to open data out (lifecycle card, CSV row keyed to the CRMA Article 27 fields, GeoJSON polygon, attribution). Operator and measured metal content are left empty by design, never estimated.</p>
    <span class="strata-feature-cta">Open the Pipeline view &rarr;</span>
  </a>
</div>

<p class="strata-features-guide">New to Strata? The <a href="/strata-guide"><strong>functions &amp; use-cases guide</strong></a> walks through every feature step by step and shows how a geological survey, a municipality and a reprocessing firm each use the tool end to end.</p>

## Pilot

Eight sites in the Iberian Pyrite Belt (Portugal and Spain, pyrite-rich volcanogenic massive sulphide deposits with public acid-drainage legacy) plus two transfer sites in Germany (the Bollrich tailings pond at Rammelsberg) and Sweden (the Falun UNESCO mining landscape). The seed register is in `sites.seed.geojson`.

The transfer sites are intentional: Bollrich is cloudier and the surface flatter than most Portuguese sites; Falun carries snow in winter and heritage constraints. Any method whose numbers do not travel to both would not travel to the next region either.

## Not what Strata does

Strata does not estimate metal grades or tonnages. It does not judge permit compliance. It takes no position on any project. The language rule is explicit: flags describe what the satellite shows, never what it means. The copy ends each flag, on first appearance, with "This is a signal for follow-up, not a finding."

## Supported by

Strata is led by Transitions Lab in Delft. Partners: Pyropower (materials-and-energy side, processing-stage experience); Social Innovation Europe (community reach across Member States and the Western Balkans).

<!--
EU FUNDING ACKNOWLEDGEMENT: activate ONLY if and when a sub-grant agreement is signed. Keep this block commented until then.
-->

---

*Read the [guide](/strata-guide) for a tour, [launch the app](/strata-demo), read the [method and data sources](/strata-method) for the equations and every licence, or the [companion paper](/strata-paper) for the longer argument.*
