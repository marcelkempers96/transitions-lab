§ / Tool interface

# Open it, click a site, read the lifecycle card

*A short tour of the Strata web tool: what the three views do (Map, Compare, Method/Data/About), what sits on a lifecycle card, and how to export a CRMA Article 27 row. Demo release v0.2 with ten pilot sites.*

<p class="article-meta"><span class="article-date">30 October 2026</span> · <span class="article-reading-time">4 min read</span></p>

<nav class="strata-pages" aria-label="Strata pages">
  <a href="/strata">Overview</a>
  <strong class="is-current">Web tool</strong>
  <a href="/strata-demo">Launch app &rarr;</a>
  <a href="/strata-guide">Guide</a>
  <a href="/strata-method">Method</a>
  <a href="/strata-data-sources">Data sources</a>
  <a href="/strata-paper">Companion paper</a>
</nav>

Strata is built for the person who has five minutes and one question about one site: a geological survey compiling the CRMA Article 27 database, a municipality next to a heap, a company looking for secondary critical raw materials. The demo opens on a map of the pilot and lands you on a lifecycle card in two clicks.

<div class="strata-launch">
  <div class="strata-launch-head">
    <span class="eyebrow">Interactive demo</span>
    <h3>Open the full-screen app</h3>
    <p>Ten illustrative pilot sites, satellite-derived indicators, lifecycle stage, flags, recovery clock, pathways view, CRMA Article 27 CSV export. Light / dark toggle. All values are demo values until the pipeline runs on real Sentinel-2 scenes.</p>
  </div>
  <div class="strata-launch-actions">
    <a href="/strata-demo" class="btn btn-ink">Launch Strata app &rarr;</a>
    <a href="/strata-method" class="btn btn-ghost">Read the method</a>
  </div>
</div>

## Three views

**Map (home).** The pilot sites on a simplified Europe basemap, pins coloured by lifecycle stage (operating, reopening planned, legacy largely bare, legacy mixed cover, recovering naturally, vegetated, not enough data) and marked with a laterite dot if any flag is active. The left panel sums up what is on screen (sites shown, total area, volume proxy, number with flags) and carries the filters: country, lifecycle stage, flags, pilot or transfer. Zoom with the buttons, the scroll wheel, or a trackpad pinch. Pan by drag.

**Compare.** A sortable table of every site with lifecycle stage, flags, area, volume proxy, bare %, iron %, red water %, recovery clock status, people within 1 km, Natura 2000 within 1 km, EGMS share subsiding faster than 5 mm per year. One click exports the whole table as CSV; another exports every polygon as GeoJSON.

**Method, Data, About.** The pages that let a reader hold the numbers to account: every equation, every data source with its licence, and the pilot context.

## Anatomy of a lifecycle card

Each card has eight sections, in order:

1. **Header.** Site name, municipality, country, lifecycle stage pill, flag pills, the register status note, and the date of the last scene.
2. **Key facts.** Waste area, DEM volume proxy, bare ground now, vegetation now, people within 1 km, red water share.
3. **Now from space.** The live Sentinel-2 panel — true colour, classes, NDVI — and the stats inside the polygon and the 500 m ring.
4. **Ten years of change.** A line chart from the 2017 baseline forward, plus the natural recovery clock sentence (the Theil-Sen trend of vegetation % over valid years, capped at a 100-year horizon).
5. **Pathways.** Three columns: leave and monitor, rehabilitate, reprocess and rehabilitate. Each shows the satellite facts that matter for it; the life-cycle assessment numbers from a planned follow-up study sit under it when they are published.
6. **Around the site.** People within 1 and 5 km, Natura 2000 overlap and distance, nearest watercourse, land cover in the ring, ground motion, long-term water.
7. **What people here told us.** The anonymised themes and quotations from the pilot social-needs fieldwork.
8. **Export and cite.** A single-row CSV keyed to the CRMA Article 27 database fields, the site's GeoJSON polygon, a copy-citation button.

## What the demo does not do yet

The pipeline that reads Sentinel-2 from Earth Search STAC and classifies pixels is specified in `CLAUDE.md` and tested in `strata-core.js` (26 of 26 tests pass), but is not wired into the demo so the pages work without an on-demand STAC fetch. The "Now from space" panel on each card shows an explanation of what will fill it, and points at the method page. The timeseries chart, lifecycle stage, flags and CSV export are all driven by the pure functions in the core module, from offline annual composites.

The lifecycle view and the community section both stay empty until their JSON files have `status: "published"`. Marcel will populate them from the pilot study outputs in 2027.

## For partners

Strata is led by [Transitions Lab](/about). Pyropower (energy and processing-stage experience) and Social Innovation Europe (community reach) are partners. If you work on a site, run a programme that touches one, or live beside one, [talk to Marcel](/contact).

---

*See the [overview](/strata), [launch the app](/strata-demo), read the [method](/strata-method), the [data sources](/strata-data-sources), or the [companion paper](/strata-paper).*
