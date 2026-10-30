§ / Method behind [Strata](/strata)

# Same pixels, same rules, every site: how Strata measures change at critical raw materials projects

*Site selection, polygons, buffers, imagery composites, indicator formulas, validation and publication rules behind Strata. Draft method, version 0.1, to be revised after the 2027 pilot.*

<p class="article-meta"><span class="article-date">29 October 2026</span> · <span class="article-reading-time">5 min read</span></p>

<nav class="strata-pages" aria-label="Strata pages">
  <a href="/strata">Overview</a>
  <a href="/strata-app">Web tool</a>
  <a href="/strata-demo">Launch app &rarr;</a>
  <strong class="is-current">Method</strong>
  <a href="/strata-data-sources">Data sources</a>
  <a href="/strata-paper">Companion paper</a>
</nav>

Strata's value depends on one property above all: that a number reported for a lithium project in Portugal means exactly what the same number means for a nickel project in Finland. This page sets out the rules that make that true, in the order the pipeline applies them, and it will be revised in public after the 2027 pilot.

## 1. Site register

The register starts from the Commission's published list of Strategic Projects under the Critical Raw Materials Act, which after the October 2026 selection holds 93 projects in the European Union and 13 in third countries and overseas countries and territories ([European Commission, IP/26/2113](https://europa.eu/newsroom/ecpc-failover/pdf/ip-26-2113_en.pdf)). For each project the register records the public project name, value chain stage (extraction, processing, recycling, substitution or integrated), strategic raw materials, country, the selection round and the date the record was last checked. The register is versioned, because each new call adds projects and a planned third call is expected before the end of 2026.

Strata uses only information the Commission or the promoter has published. Where published coordinates are too coarse to locate a site, it is placed from imagery and from the two open global mining footprint datasets described below, and every manual placement is logged.

## 2. Monitoring polygon and buffers

Each site receives a monitoring polygon drawn around the permitted or visibly active area, plus three buffers at 500 metres, 2 kilometres and 5 kilometres. For sites that are already operating, the polygon is checked against the global mining polygons of [Maus et al. (2022)](https://pure.iiasa.ac.at/18124), which map 44,929 features from 2019 Sentinel-2 imagery, and against the finer [Tang and Werner (2023)](https://doaj.org/article/c9aab72539dd46e5867d0d0c13b84701) footprints, which trace 74,548 features such as pits, waste rock dumps, tailings dams, heap leach pads and processing plants. For sites not yet built, the polygon follows the project boundary in public permitting documents where available, and is otherwise a declared approximation.

## 3. Imagery and composites

Strata uses Copernicus Sentinel-2 Level-2A surface reflectance at 10 to 20 metre resolution as its main optical source and Sentinel-1 radar backscatter where cloud cover is persistent. For each year the pipeline builds a growing-season median composite after masking clouds and shadows, so a single cloudy or snowy acquisition cannot drive a result. The baseline year is the last full year before construction began, or, for sites operating before monitoring started, the earliest year with sufficient clear imagery from 2017 onwards.

## 4. Indicators

**Disturbed footprint.** Pixels inside the polygon classified as bare, excavated or deposited material, using thresholds on vegetation and bare soil indices calibrated against the reference polygons. Reported in hectares, with year-on-year change.

**Buffer vegetation loss.** Pixels in each buffer that move from a vegetated class in the baseline (from [ESA WorldCover 2021](https://worldcover2021.esa.int/download), refined by Sentinel-2 vegetation indices) to a non-vegetated state, reported in hectares and as a share of each buffer. The share falling inside [Natura 2000](https://sdi.eea.europa.eu/catalogue/srv/api/records/be2142b0-7dc4-42e3-afac-f7cc5f1a9ac6) sites is reported separately.

**Water and tailings extent.** Open water and wet tailings surfaces from a water index on Sentinel-2, gap-filled with Sentinel-1 backscatter, reported as maximum and minimum seasonal area. The [JRC Global Surface Water](https://data.jrc.ec.europa.eu/dataset/jrc-gswe-global-surface-water-explorer-v1) record, built from Landsat imagery since 1984, shows whether a water body pre-dates the project.

**Ground motion.** For sites in Copernicus Participating States, line-of-sight and vertical velocity statistics from the [European Ground Motion Service](https://land.copernicus.eu/en/products/european-ground-motion-service/egms-basic) within the polygon and the 500 metre buffer, with points above a stated velocity threshold flagged for attention. The service is derived from Sentinel-1 interferometry and updated annually.

**Land converted.** The ESA WorldCover 2021 class of every pixel that is now inside the disturbed footprint, reported as hectares by former class (for example tree cover, cropland, grassland, wetland).

**Downstream water colour (experimental).** A turbidity proxy from Sentinel-2 red and near-infrared reflectance in water bodies downstream of the site. It is tested for feasibility in the pilot and will not be published as an indicator unless it validates.

## 5. Validation

On operating pilot sites, the disturbed footprint is compared with the reference polygons, with a target of at least 85% overall agreement. The Maus et al. dataset reports 88.3% overall accuracy against its own control points ([IIASA](https://pure.iiasa.ac.at/18508)), which sets a realistic bar. Each indicator is published with its estimated error, the minimum mappable unit and any known confounders, such as agricultural ploughing or seasonal flooding that can mimic disturbance.

## 6. Publication rules

Every site page shows the imagery dates, method version, error margins and the full attribution required by each data licence. Promoters are contacted before a site page is first published and may submit a factual response, which is linked from the page. Indicator changes are described, not characterised: Strata reports that a footprint grew by a number of hectares, not that a project breached anything. Derived data are released under open licences compatible with their inputs, as set out on the [data sources page](/strata-data-sources).

## 7. What the method does not do

Strata does not measure emissions, water chemistry, dust, noise, labour conditions or community outcomes, and it cannot establish permit compliance. It is designed to sit beside field research, which is where the Lab's other work on how communities experience a new technology begins.

---

*See the [Strata overview](/strata), the [data sources and attribution](/strata-data-sources), the [web tool](/strata-app), and the [critical minerals flow map](/mineral-flows-research) for where these materials go once they leave the site.*
