§ / A guide to [Strata](/strata)

# Strata guide: every function, every use case

*A walk through every function in the tool and three end-to-end use cases — a geological survey compiling an Article 27 database, a municipality beside a legacy site, a reprocessing firm screening for secondary critical raw materials.*

<p class="article-meta"><span class="article-date">30 October 2026</span> · <span class="article-reading-time">10 min read</span></p>

<nav class="strata-pages" aria-label="Strata pages">
  <a href="/strata">Overview</a>
  <a href="/strata-app">Web tool</a>
  <a href="/strata-demo">Launch app &rarr;</a>
  <strong class="is-current">Guide</strong>
  <a href="/strata-method">Method</a>
  <a href="/strata-data-sources">Data sources</a>
  <a href="/strata-paper">Companion paper</a>
</nav>

Strata is a browser tool. There is no account, no install, no server call that leaves the pilot and goes anywhere except the public Copernicus data archives. If you can open [the app](/strata-demo), you have the full tool.

This guide is in three parts. Part 1 walks through every function. Part 2 takes three real users through the tool end to end. Part 3 is the honest list of what Strata does not do.

---

## Part 1 · The functions, one by one

### Getting around

<p class="strata-guide-figure"><img src="/assets/img/strata-feat-map.jpg" alt="Strata map with the ten pilot pins over Iberia, Germany and Sweden"></p>

The app opens on the map. The topbar carries seven tabs:

- **Map** — the overview, with every pilot site shown as a coloured pin on real satellite imagery.
- **Compare** — one row per site in a sortable table.
- **Communities** — the three pilot communities beside Mina de São Domingos, Minas de Riotinto and Nerva, and Aznalcóllar.
- **Pipeline** — what runs where, from Sentinel-2 scene to CSV row.
- **Method** — a short in-app restatement of the thresholds. The full method lives on the [Method page](/strata-method).
- **Data** — the data register with every source, licence and update cadence.
- **About** — scope, partners, and how to cite.

A help icon (the "?" top right) reopens the welcome card at any time. The moon icon toggles the light / dark theme; the choice is remembered per browser.

### Function 1 — The satellite map

The map uses real ESRI World Imagery as its satellite base. Three basemaps are available at the top-right of the map (Satellite / Street / Terrain). Every pin is a lifecycle stage:

- **Operating** — black.
- **Reopening planned** — sun.
- **Legacy, largely bare** — laterite red.
- **Legacy, mixed cover** — sand.
- **Recovering naturally** — malachite at reduced opacity.
- **Vegetated** — malachite.

Pins are sized by waste footprint, so a 420 ha site reads larger than a 35 ha one at the same zoom. A small orange dot inside a pin means the site has at least one flag.

Site polygons overlay the satellite imagery under each pin, so the heap shape reads against the ground even without clicking in.

Left column at the top: four facts for whatever subset of sites is in view (sites shown, total area, DEM volume proxy, sites with flags). Below that, the filters: search by site name, municipality or country; country chips (PT, ES, DE, SE); lifecycle stage chips; flag chips; role (pilot vs. transfer). Below the filters, the full site list, where clicking a row opens the same card you get from clicking a pin.

**Phones.** The map takes the full screen. The left column collapses to a bottom sheet with three states — a peek strip, a half-screen filter + list, and a full-screen take-over. The handle at the top of the sheet cycles between them; the sheet never covers the whole map at the peek state.

### Function 2 — The lifecycle site card

<p class="strata-guide-figure"><img src="/assets/img/strata-feat-sitecard.jpg" alt="São Domingos site card: Recovering naturally pill, red water flag, waste area 110 ha, DEM volume 17.2 Mm³, bare 51 per cent, vegetation 19 per cent"></p>

Click a pin or a row in the list and the right column opens the site's card. Eight sections, always in the same order:

1. **Header.** Site name, municipality and country, geological context (e.g. Iberian Pyrite Belt), the lifecycle stage pill and any flag pills.
2. **Register status.** A one-sentence human summary of what the register says about this site today ("Mining ended in 1966 (verify)", "Reopening planned 2027", etc.). The word "verify" marks numbers a planned feasibility study is scheduled to cross-check against hyperspectral data.
3. **Key facts strip.** Six numbers that fit on a thumb: waste area (ha, satellite), volume proxy (Mm³, DEM), bare % now, vegetation % now, people within 1 km, red-water share of water on site.
4. **Now from space (live).** The live Sentinel-2 panel — covered on its own below.
5. **Ten years of change.** Time-series lines for vegetation, bare ground, iron signal and red water, with the natural recovery clock verdict ("about 52 years to reach 50% vegetation at the current trend") printed under the chart.
6. **Pathways.** Three side-by-side cards — Leave and monitor, Rehabilitate, Reprocess — with what each one would entail, cost indication, and the question each one leaves open.
7. **Around the site.** Natura 2000 overlap, EGMS motion share subsiding faster than 5 mm/yr, nearest watercourse distance, protected-area name if any.
8. **Community voices.** Pointer to the Communities tab if a pilot community sits beside this site. From 2027 onwards this section carries anonymised themes from the pilot social-needs field interviews; today it is empty by design.
9. **Export buttons.** CSV (one row, CRMA Article 27 schema) and GeoJSON (the site polygon with properties).

The close button at the top of the card returns you to the map with your filters intact.

### Function 3 — The live Sentinel-2 panel

<p class="strata-guide-figure"><img src="/assets/img/strata-feat-live.jpg" alt="Now from space live panel beside the ten-year change chart and the natural recovery clock"></p>

The Now-from-space panel is the one place where Strata actually goes out to Copernicus at the moment you click. The sequence it runs, in your browser:

1. **STAC search.** Earth Search is queried for Sentinel-2 Level-2A scenes over the site in the last 180 days with less than 40% cloud cover. The clearest acquisition wins.
2. **Window reads.** The six bands (B02, B03, B04, B08, B11, B12) and the Scene Classification Layer are read as Cloud-Optimised GeoTIFF windows (only the bounding box, not the whole scene). Typical window: a few hundred kilobytes per band.
3. **Pixel classification.** Every 10 m pixel inside the window is classified as vegetation, bare ground, bare + iron signal, water, or red/orange water. Red water is detected on water pixels only; iron signal is detected on bare pixels only.
4. **Render.** Three canvases side by side — true colour, pixel classes, NDVI — plus a stats table (polygon vs. 500 m ring) and the scene date, platform and cloud cover.

Nothing leaves your browser, no account is needed, 8 to 20 seconds on a home connection. If the request fails (cloudy fortnight, Earth Search outage) the panel says so and offers the archive date it last found.

### Function 4 — The Compare view

<p class="strata-guide-figure"><img src="/assets/img/strata-feat-compare.jpg" alt="Compare table: all ten pilot sites side by side, every lifecycle number in one view, sortable, exportable as CSV or GeoJSON"></p>

The Compare tab lays every site in one sortable table. Columns, in order: ID, name, country, lifecycle stage, flags, area (ha), DEM volume (m³), bare %, iron %, red water %, recovery clock status, people within 1 km, Natura 2000 overlap (ha within 1 km), EGMS subsidence share faster than −5 mm/yr. Click a site ID to open its card without leaving the view.

The two buttons at the top of the view produce the full-register exports:

- **Export all as CSV.** All ten sites, every column, keyed to the CRMA Article 27 database fields.
- **Export all as GeoJSON.** Every polygon with properties, released under CC BY 4.0 (CC BY-SA 4.0 where share-alike inputs were used, flagged per feature).

### Function 5 — Communities

<p class="strata-guide-figure"><img src="/assets/img/strata-feat-communities.jpg" alt="Communities view, Mina de São Domingos: landscape, livelihoods, preliminary resident concerns, three pathway-preference cards"></p>

Three communities, each on its own card: the mining landscape, livelihoods today, preliminary resident concerns, three pathway-preference cards (leave / rehabilitate / reprocess), the sites each community sits beside, and the municipal contact point.

Everything on this tab is preliminary by design. The headline reminder on the tab says so: the pilot social-needs fieldwork runs 18 semi-structured interviews and one community session per community between February and May 2027, and those anonymised themes replace what you see today.

### Function 6 — Pipeline + CRMA Article 27 export

<p class="strata-guide-figure"><img src="/assets/img/strata-feat-pipeline.jpg" alt="Pipeline diagram: Sentinel-2, DEM, EGMS, WorldCover, Surface Water, GHSL and OpenStreetMap flow into strata-core.js (26 of 26 unit tests pass), out as lifecycle card, CRMA CSV, GeoJSON polygon and attribution"></p>

The Pipeline view is the data map of the tool. The left column lists every input and its licence. The centre names the in-browser classifier — `strata-core.js`, where the self-tests report **26 of 26 unit tests pass** on load — and lists the steps it runs. The right column lists what comes out: the lifecycle card you see, the CSV row keyed to the CRMA Article 27 fields, the GeoJSON polygon, and the methodology attribution that ships with every export.

Three rules worth repeating:

- **Open in, open out.** Nothing proprietary; every output is CC BY or CC BY-SA with the share-alike flag set on affected features.
- **Operator and measured metal content are always empty.** Strata cannot measure them, so it does not estimate them.
- **In-browser.** No scene, no coordinate, no indicator ever leaves your device for a Transitions Lab server.

---

## Part 2 · Three users, start to finish

### Use case A — A geological survey compiling the Article 27 database

Every Member State has to register its closed mine waste sites under Article 27 of the Critical Raw Materials Act. A survey analyst sitting with that register has a problem Strata is built for: for most historic sites there is no modern measurement at all.

**Step 1.** Open [the app](/strata-demo). Jump straight to the Compare view. Scan the register as it stands: ten pilot sites, lifecycle stages at a glance, flag pattern per column.

**Step 2.** For each site that lacks a current measurement, open the card. Confirm the waste area reads sensibly against the ground. Press **Load latest Sentinel-2 scene**. The three canvases will tell you within seconds whether the site is bare, re-vegetating, or already covered.

**Step 3.** For a site with a *reopening planned* register status, the Pathways card lays out what Leave, Rehabilitate and Reprocess would entail, so the register entry can carry the CRM-candidate rationale alongside the measured properties.

**Step 4.** Click **Export CSV**. One row keyed to the Article 27 schema, with operator and measured content left empty, DEM volume labelled as a 2011–15 Copernicus proxy, CRM candidates coming from deposit type (never from measured content).

**Step 5.** Repeat for the next site. Export all as CSV at the end if you want the whole register in one file. Attribution ships inside the exports.

**What Strata will not do.** It will not sign the register. The analyst does. Strata provides the evidence base and the trail from pixel to row.

### Use case B — A municipality beside a legacy site

A mayor or a municipal technician wants to understand what sits beside their town: how much of it, in what state, with how many people how close, and whether anything is happening on it.

**Step 1.** Open [the app](/strata-demo). Search for the municipality name in the top-left search box (e.g. *Mértola*). The site list filters to the ones in that municipality; the matching pins pulse on the map.

**Step 2.** Open the site card. The six key facts at the top are the ones a council agenda needs: how big (ha), how massive (Mm³), how exposed (bare %), how vegetated (veg %), how close to residents (people within 1 km), how coloured the water is (red water %).

**Step 3.** Open the **Communities** tab. If your community is one of the three pilots, the preliminary concerns and the pathway preferences read directly against what the satellite shows. If not, use it as a template for the questions the technician can ask residents.

**Step 4.** Open the Ten-year change panel. The natural recovery clock tells the council whether the site is recovering on its own, has stalled, or is going backwards — in years, not percentages. This is often the first time any such figure has existed for the site.

**Step 5.** Export CSV or GeoJSON to bring the facts into a council agenda, a planning submission, or a conversation with the regional authority.

**What Strata will not do.** It will not tell the council whether a planned reopening is in the public interest. That is a political and legal judgement. Strata is the honest baseline it rests on.

### Use case C — A reprocessing firm screening for secondary CRMs

A pyro- or hydro-metallurgical operator with spare capacity wants to know which legacy heaps in a region are plausible feedstocks: large enough, iron-signal-bearing (as a crude proxy for oxidised sulphide waste), with ground stability history, and not sitting on top of a Natura 2000 habitat.

**Step 1.** Open the **Compare** view. Sort by area descending. Shortlist by minimum area.

**Step 2.** Filter the map by the `iron_signal` flag. The pins that drop out are the ones that do not show the iron-oxide signal on the satellite; the ones that stay are the ones worth a closer look.

**Step 3.** Open each shortlisted site. Check:
- **EGMS motion share** (around the site section): a stable or slowly settling site is cheaper to work than one actively subsiding.
- **Natura 2000 overlap** (around the site section): any share > 0 is a planning red flag that belongs in the earliest conversation.
- **People within 1 km** (key facts): the social cost of dust and traffic is roughly proportional to this.
- **Register status** (header): a site with an operating or reopening-planned status is not a free screening target.

**Step 4.** Click **Load latest Sentinel-2 scene**. The pixel classes confirm whether the iron signal is a thin crust or a dominant surface — the former is a few years' feedstock, the latter is a decade.

**Step 5.** Export each shortlisted site's row and polygon. Hand the file to a hydro-/pyro- processing engineer with the honest caveat that measured metal content is empty by design.

**What Strata will not do.** It will not tell you grade. It will not quote a reprocessing cost. It will tell you which sites are large enough and surface-chemistry-plausible enough to spend the first field day on, which is the question that costs most to answer without a tool.

---

## Part 3 · Limits, and when not to use Strata

A fair guide includes the stop signs.

- **Strata does not measure metal grades or tonnages.** The DEM volume is a 2011–15 proxy. The CRM candidates are deposit-type priors, never measurements.
- **Strata does not judge permit compliance.** It flags what the satellite shows; whether that is lawful or in breach is for the competent authority to decide. The copy rule is explicit: every flag ends with "This is a signal for follow-up, not a finding."
- **Ten-metre imagery misses small features.** Early earthworks, test pits, a single truck convoy — Strata will not catch them.
- **EGMS coverage is Copernicus Participating States only.** For sites outside that footprint the ground motion column reads *N/L* (not listed).
- **Operator and measured content are empty.** By design. Where a Member State register already carries these, that register remains authoritative.
- **The pilot register is 10 sites.** The method travels; the current register is small. A planned market study expands the operating register progressively.

If the question needs a measured grade, a legal determination, or a sub-10 m feature, Strata is not the tool. For the question "what is actually on these heaps today, how are they changing, and what would three different plans mean?", it is.

---

## Keyboard, URL, and sharing shortcuts

- **Deep-link a site.** `/strata-demo#site-pt-sdo` opens São Domingos directly. Replace the ID with any of PT-SDO, PT-LOU, PT-ALJ, ES-THA, ES-RTO, ES-PDH, ES-ZAR, ES-AZN, DE-BOL, SE-FAL.
- **Deep-link a view.** `/strata-demo#compare`, `#communities`, `#pipeline`, `#method`, `#data`, `#about`.
- **Close a card.** Press *Esc* or the X at the top of the card.
- **Theme.** The moon icon toggles light / dark and is remembered per browser.
- **Help.** The "?" icon reopens the welcome card at any time.
- **Share a site.** Copy the URL after the hash and paste. It opens the card for anyone with the link, no login required.

---

*See the [Strata overview](/strata), [launch the app](/strata-demo), read the [method](/strata-method) for the equations, the [data sources](/strata-data-sources) for every licence, or the [companion paper](/strata-paper) for the longer argument.*
