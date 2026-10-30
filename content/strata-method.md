§ / Method behind [Strata](/strata)

# Method and data sources

*Pixel indices, pixel classes, time series, recovery clock, lifecycle stage, flags, CRMA Article 27 export — and every dataset, licence and credit line behind them. All formulas live in `strata-core.js` and ship with twenty-six unit tests that all pass.*

<p class="article-meta"><span class="article-date">30 October 2026</span> · <span class="article-reading-time">8 min read</span></p>

<nav class="strata-pages" aria-label="Strata pages">
  <a href="/strata">Overview</a>
  <a href="/strata-guide">Guide</a>
  <a href="/strata-demo">Launch app &rarr;</a>
  <strong class="is-current">Method &amp; data</strong>
  <a href="/strata-paper">Companion paper</a>
</nav>

Strata's value depends on one property: that a number reported for a legacy pyrite waste heap in Portugal means exactly the same thing as the number reported for a tailings pond in the Harz. This page sets out the rules that make that true, in the order the pipeline applies them, and then names every dataset the rules consume. Thresholds marked **starting** are the pilot values; a planned feasibility study will calibrate them against hyperspectral imagery (PRISMA, EnMAP) and field data from the pilot sites.

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

## 9. Data sources: credit where the pixels come from

Every dataset Strata uses, how the build gets it, its licence, and the exact credit line the interface must show. If a source cannot be reached, Strata shows "Not available" or "Not loaded"; it never substitutes an estimate.

### 9.1 Satellite and Earth observation

| # | Dataset | Used for | Access | Licence | Credit line to display |
|---|---|---|---|---|---|
| 1 | Copernicus Sentinel-2 Level-2A (10 to 20 m, 2017 onwards) | Live scene, annual composites, vegetation, bare ground, iron signal, clay ratio, water, red water | Earth Search STAC `https://earth-search.aws.element84.com/v1`, public COGs, no account. Fallback: Microsoft Planetary Computer STAC, anonymous SAS token | Free, full and open under the [Copernicus Sentinel Data Legal Notice](https://sentinel.esa.int/documents/247904/690755/Sentinel_Data_Legal_Notice) | Contains modified Copernicus Sentinel data [year] |
| 2 | European Ground Motion Service, Ortho vertical (Sentinel-1 InSAR) | Subsidence or uplift on heaps, pits and tailings dams | Manual CSV download from the EGMS Explorer | Copernicus free and open | Generated using European Union's Copernicus Land Monitoring Service information |
| 3 | Copernicus DEM GLO-30 | Heap height and waste volume proxy | AWS bucket `copernicus-dem-30m` (eu-central-1), public COGs | Copernicus DEM licence | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA |
| 4 | ESA WorldCover 10 m 2021 v200 | Land cover around each site; land converted under the footprint | AWS bucket `esa-worldcover` (eu-central-1), public COGs | CC BY 4.0 | © ESA WorldCover project / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium |
| 5 | JRC Global Surface Water (Landsat, 1984 onwards) | Whether ponds and pit lakes pre-date the latest decade; long-term water occurrence | [JRC dataset page](https://data.jrc.ec.europa.eu/dataset/jrc-gswe-global-surface-water-explorer-v1) | Produced under the Copernicus programme, free without restriction of use | Source: EC JRC/Google |
| 6 | GHSL population grid GHS-POP R2023A, 3 arc-second, epoch 2025 | People living within 1 km and 5 km of each site | JRC Global Human Settlement Layer | Free reuse with acknowledgement (CC BY 4.0) | GHS-POP R2023A, European Commission, Joint Research Centre |

### 9.2 Register and context

| # | Dataset | Used for | Access | Licence | Credit line |
|---|---|---|---|---|---|
| 7 | OpenStreetMap | Site polygons (`man_made=spoil_heap`, `man_made=tailings_pond`, `landuse=quarry`, `historic=mine`), nearest watercourse, road access | Overpass API | ODbL 1.0 (derived polygons must stay ODbL if redistributed) | © OpenStreetMap contributors |
| 8 | Global mining footprint, Tang and Werner (2023) | Site polygons where OSM is missing; cross-check | Zenodo [10.5281/zenodo.7894216](https://doi.org/10.5281/zenodo.7894216); paper [Communications Earth and Environment 4:134](https://doaj.org/article/c9aab72539dd46e5867d0d0c13b84701) | CC BY 4.0 | Tang, L. and Werner, T. T. (2023). Global mining footprint mapped from high-resolution satellite imagery |
| 9 | MIN4EU DB Mining Waste (EuroGeoSurveys, via EGDI) | Cross-check of site list; official volume, tonnage or grade where published | [EGDI metadata record](https://metadata.europe-geology.eu/record/full/6a391dd6-444c-42c5-a052-4df60a010e58) | CC BY 4.0 | MIN4EU DB Mining Waste, EuroGeoSurveys / EGDI |
| 10 | Natura 2000 sites (vector, end 2023 or later) | Protected area overlap and distance | EEA download, [catalogue record](https://sdi.eea.europa.eu/catalogue/srv/api/records/be2142b0-7dc4-42e3-afac-f7cc5f1a9ac6) | CC BY 4.0, copyright holder DG Environment | Natura 2000 data © European Union, DG Environment, distributed by the EEA |
| 11 | Basemap | Map display | [OpenFreeMap](https://openfreemap.org) vector tiles, style positron | OSM data ODbL; OpenMapTiles schema | OpenFreeMap © OpenMapTiles Data from OpenStreetMap |

The EOX Sentinel-2 cloudless mosaics from 2018 onwards are licensed CC BY-NC-SA and would block any paid tier; Strata does not use them. The 2016 mosaic is CC BY 4.0 and may be used.

### 9.3 Validation references (not loaded by the app)

| Dataset | Role | Access |
|---|---|---|
| PRISMA hyperspectral (ASI) | Cross-check Sentinel-2 iron and clay signals at pilot sites | ASI portal, free registration |
| EnMAP hyperspectral (DLR) | Same role; archive at EOWEB GeoPortal | [EnMAP data access](https://enmap.org/data_access) |
| CHIME (Copernicus, planned 2028) | Future operational hyperspectral source, 400 to 2500 nm at 30 m | [SentiWiki](https://sentiwiki.copernicus.eu/web/chime) |
| Published field data, Iberian Pyrite Belt | Acid drainage and waste mapping references | Pérez Ostalé (2014), Universidad de Huelva thesis; Aranda Quirós (2022), Río Tinto AMWI study |

### 9.4 Method references

- Iron oxide ratio and hyperspectral cross-check: Pereira, I. et al. (2025). Multi-temporal mineral mapping in two torrential basins using PRISMA hyperspectral imagery. *Remote Sensing* 17, 2582. [doi:10.3390/rs17152582](https://doi.org/10.3390/rs17152582)
- Sentinel-2 continuity for geological mapping: van der Werff, H. and van der Meer, F. (2016). Sentinel-2A MSI and Landsat 8 OLI provide data continuity for geological remote sensing. *Remote Sensing* 8(11), 883. [doi:10.3390/rs8110883](https://doi.org/10.3390/rs8110883)
- Acid mine water index on the Río Tinto with Sentinel-2: Aranda Quirós (2022), as above.
- Scale of legacy waste in the Spanish Iberian Pyrite Belt: Pérez Ostalé (2014), as above.
- Article 27 databases of closed extractive waste facilities: [EGU26-9857](https://meetingorganizer.copernicus.org/EGU26/EGU26-9857.html). Finland example of national implementation: [GTK](https://www.gtk.fi/en/current/geological-survey-of-finland-assigned-tasks-under-the-eu-critical-raw-materials-act/).

### 9.5 Attribution block for the interface footer

Show this on every page that displays data, with the year filled from the scenes shown:

> Contains modified Copernicus Sentinel data [years]. Generated using European Union's Copernicus Land Monitoring Service information (EGMS). Copernicus DEM GLO-30. © ESA WorldCover project 2021. Source: EC JRC/Google (Global Surface Water). GHS-POP R2023A, European Commission JRC. Natura 2000 © European Union, DG Environment, distributed by the EEA. Tang and Werner (2023), CC BY 4.0. © OpenStreetMap contributors. Use of Copernicus data does not imply endorsement by the European Union.

### 9.6 Strata's own outputs

Site pages and indicator tables are published under CC BY 4.0 unless they include share-alike material, in which case CC BY-SA 4.0 applies to that layer. Please cite as: Transitions Lab (2026). Strata v0.2: satellite lifecycle cards for closed mine waste sites, pilot register. transitionslab.org/strata-demo.

---

*Return to the [overview](/strata), read the [guide](/strata-guide), [launch the app](/strata-demo), or read the [companion paper](/strata-paper) for the longer argument.*
