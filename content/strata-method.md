§ / Method behind [Strata](/strata)

# One method, every site: the Strata v0.2 method

*Pixel indices, pixel classes, time series, recovery clock, lifecycle stage, flags, and CRMA Article 27 export. All formulas live in `strata-core.js` and ship with twenty-six unit tests that all pass.*

<p class="article-meta"><span class="article-date">30 October 2026</span> · <span class="article-reading-time">6 min read</span></p>

<nav class="strata-pages" aria-label="Strata pages">
  <a href="/strata">Overview</a>
  <a href="/strata-app">Web tool</a>
  <a href="/strata-demo">Launch app &rarr;</a>
  <a href="/strata-guide">Guide</a>
  <strong class="is-current">Method</strong>
  <a href="/strata-data-sources">Data sources</a>
  <a href="/strata-paper">Companion paper</a>
</nav>

Strata's value depends on one property: that a number reported for a legacy pyrite waste heap in Portugal means exactly the same thing as the number reported for a tailings pond in the Harz. This page sets out the rules that make that true, in the order the pipeline applies them. Thresholds marked **starting** are the pilot values; a planned feasibility study will calibrate them against hyperspectral imagery (PRISMA, EnMAP) and field data from the pilot sites.

## 1. Satellite inputs

Sentinel-2 Level-2A surface reflectance (10 m, 20 m bands resampled bilinear, SCL resampled nearest). Pixels with SCL in {0, 1, 3, 8, 9, 10, 11} are discarded as invalid. Annual composites are the summer median (1 June to 30 September) of valid pixels per site, inside the polygon and in a 500 m outer ring.

## 2. Pixel indices and starting thresholds

| Indicator | Formula (Sentinel-2 bands) | Starting threshold | Meaning on screen |
|---|---|---|---|
| NDVI | (B08 − B04) / (B08 + B04) | ≥ 0.30 → vegetation | Vegetation |
| Bare soil index (BSI) | ((B11 + B04) − (B08 + B02)) / ((B11 + B04) + (B08 + B02)) | NDVI < 0.15 and BSI > 0 → bare | Bare ground |
| Iron oxide ratio | B04 / B03 | on bare pixels, > 1.35 → iron signal | Bare ground with iron signal (oxidising sulphide waste, gossan) |
| Clay / hydroxyl ratio | B11 / B12 | map layer only in v0.2 | Clay-rich or altered material |
| MNDWI | (B03 − B11) / (B03 + B11) | > 0 and NDVI < 0.30 → water | Water |
| Red water index | (B04 − B02) / (B04 + B02), on water pixels | > 0.15 → red/orange water | Red or orange water (acid drainage colour) |

Classification order inside the pipeline is water first, then vegetation, then bare. Iron is assessed only on bare pixels. Red water is assessed only on water pixels. Percentages are of valid pixels in the region; red water % is of water pixels.

## 3. Natural recovery clock

Theil-Sen trend of vegetation % in the polygon over valid years (validPct ≥ 60):

- **reached**: current vegetation already ≥ 50% of the polygon.
- **recovering**: slope ≥ +0.5 points/year; the number of years to the 50% target is shown, capped at 100.
- **slow**: more than 100 years to the 50% target at the current trend.
- **stable**: slope between −0.5 and +0.5 points/year.
- **declining**: slope < −0.5 points/year.
- **insufficient**: fewer than five valid years.

Theil-Sen is used because it is robust to a single bad year without discarding points by hand.

## 4. Lifecycle stage

Rules in order (implemented in `lifecycleStage()`):

1. Fewer than 5 valid years → **Not enough data**.
2. Register status operating → **Operating**.
3. Register status reopening planned → **Reopening planned**.
4. Latest vegetation ≥ 60% → **Vegetated**.
5. Recovery clock recovering → **Recovering naturally**.
6. Latest bare ≥ 40% → **Legacy, largely bare**.
7. Otherwise → **Legacy, mixed cover**.

The stage carries a visual language: operating ink, reopening planned sun, legacy largely bare laterite, legacy mixed cover sand-dark, recovering naturally malachite at 60% opacity, vegetated malachite, not enough data line grey.

## 5. Flags

Independent of stage.

- **new_disturbance** — latest bare ha ≥ 110% of the earlier median and at least 2 ha more.
- **red_water** — ≥ 5% of open water on site shows a red or orange colour.
- **iron_signal** — ≥ 20% of the site surface shows the iron oxide signal.
- **ground_motion** — ≥ 10% of EGMS points subside faster than 5 mm per year.

Copy rule for every flag: on first appearance in a card the text ends "This is a signal for follow-up, not a finding." No generated text uses "illegal", "breach", "pollution" or "contamination". Permit compliance is a legal determination that only the competent authority can make.

## 6. CRMA Article 27 export

Every site exports as one CSV row keyed to the fields that Member State databases of closed extractive waste facilities need to carry (location, area, waste volume, operator, raw material content). The function `crmaExportRow()` builds the row. Three design rules:

- Fields that cannot be observed from space (`operator`, `crm_content_measured`) are **always empty**, never estimated.
- Volume is labelled as a Copernicus DEM proxy, with the DEM epoch (2011 to 2015) written into the row.
- CRM candidates come from the deposit type and are labelled as such; they are not measured content.

## 7. Reference implementation and tests

The pure functions above live in [`assets/strata/core.js`](https://github.com/marcelkempers96/transitions-lab/blob/main/assets/strata/core.js). The same file ships with twenty-six self-tests covering: UTM projection accuracy, index values on reference spectra, pixel classification, raster masks (polygon + ring), Theil-Sen robustness to a single outlier, the recovery clock state machine, the lifecycle stage rules, flag detection, and the Article 27 export row shape. Run `node core.js --test`; all twenty-six pass. The same functions are ported to Python for the pipeline; the parity test checks that identical synthetic arrays produce identical classes and summaries in JavaScript and Python.

## 8. What the method does not do

Strata does not measure metal grades, air quality, dust, noise or community outcomes. It cannot establish permit compliance. Ten-metre imagery misses small features and early earthworks. Ground motion data from EGMS covers Copernicus Participating States only.

Those limits are stated on every page where the numbers appear, not only here.

---

*See the [Strata overview](/strata), the [web tool](/strata-app) or [launch the app](/strata-demo). The [data sources](/strata-data-sources) page lists every input with its licence. The [companion paper](/strata-paper) carries the full equations, use cases and the partners.*
