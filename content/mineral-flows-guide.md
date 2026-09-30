§ / Tool guide

# How to read the Mineral Flows Map

*A short walkthrough of what the map shows, how to move through it, and the patterns it makes visible. Paired with the [interactive tool](/mineral-flows), the [research paper](/mineral-flows-research), and the [companion article](/insight-where-transition-minerals-go).*

<p class="tool-cta"><a href="/mineral-flows" class="tool-cta-btn">Open the interactive Mineral Flows Map &rarr;</a></p>

---

## The sixty-second tour

**1. Pick a mineral.** The chip row at the top runs *All minerals* and nine individual chains (lithium, cobalt, nickel, copper, graphite, rare earths, manganese, platinum group metals, and phosphate — the last covering the LFP battery chain). *All minerals* draws every corridor at once, coloured by mineral. Picking one recolours the map by that mineral's stage shares.

**2. Move through the chain.** The stage ribbon below the chips is both the summary and the selector. Each stage shows its largest producer, a strata bar with the full country breakdown, and toggles the map's choropleth when you click it. Rare earths goes Mining → Separation and refining → NdFeB magnets; lithium goes Mining → Refining → Cathode. Watching the strata bar narrow across stages is the whole story: mining is diffuse, refining is not.

**3. Read the panel on the right.** Four tabs. **Overview** is the mineral's headline and a per-stage HHI. **Country** picks one country and shows its role across every stage plus its import and export corridors. **Stress test** removes a country and reports what fraction of each stage goes offline. **Sources** lists every figure with its year, confidence and the studies behind it.

---

## Features, one line each

- **Trade flows** toggles the arcs on and off. Off gives you a plain choropleth.
- **Africa focus** zooms to the continent and filters to corridors with an African endpoint.
- **Policy measures** adds a small diamond beside each country that has an export ban, quota, licensing rule, ownership rule or industrial-policy commitment. Click one for the detail.
- **By stage** colours arcs by processing state (orange for ore / concentrate / intermediate, white for refined metal / chemical / component). **By mineral** colours arcs by which mineral they carry. The default is *by mineral* in the all-minerals view and *by stage* on a single mineral.
- **Zoom in and out** with the buttons on the right of the map or with pinch and scroll. As you zoom, more country labels appear, and the labels shrink with the zoom so they don't cover the geography.
- **Stress test** is the most useful feature for scenario reading. Pick a country, hit *stress test*, and the map hatches the country out and dims every corridor that touches it; the panel then reports how many percent of each stage is offline and how concentration among the remaining suppliers shifts.

<figure class="photo">
  <img src="/assets/img/mineral-flows-guide-stress.jpg" alt="Screenshot of the map's Stress test panel with Chile removed. Reports 20% of lithium mining offline (Australia at 46.3% of what is left; HHI 2215 becomes 2836), 24% of lithium refining offline (China at 89.5%; HHI 5225 becomes 8049), 23% of copper mining offline (DRC at 18.2%; HHI 1015 becomes 820), and 7% of copper refining offline (China at 48.4%; HHI 2212 becomes 2501). Beneath, a list of six cut corridors: lithium carbonate from Chile to China, South Korea and Japan." class="diagram">
</figure>
- **Save PNG** in the share row snaps only the map and the flow panel. Nothing else. Good for a slide.

---

## What to look for

**Asymmetry.** Africa mines about a fifth of the world's copper but refines about a tenth. Cobalt is more extreme: 76% mined in DRC, 78% refined in China, 3% refined in DRC. The map shows those two numbers next to each other on the ribbon so the gap is impossible to miss.

**Convergence.** In the all-minerals view most arcs end at China. This is the single strongest visual pattern in the dataset. Turn *by stage* on and it becomes clearer: nearly every orange arc into China is upstream ore, nearly every white arc out of China is refined material.

**Non-obvious hubs.** Finland refines cobalt. Norway refines nickel. Belgium and Estonia sit on the map because they are refiners, not miners. The panel confirms this by naming each stage's largest producer.

**Chokepoint chains.** Graphite is the sharpest example: 79% of natural flake mined in China, 95% of anode-grade refined in China, 93% of anode material made in China. Every stage is the same country. A stress test on China for graphite takes almost the entire chain offline.

**Where a stress test is misleading.** On chains where a single country holds every stage, the stress test says "removes 90%+ at every stage", which is technically true and useless as a scenario. The interesting stress tests are on chains where removing a country reshapes the remaining hierarchy, not ones where it flattens it.

---

## Reading the arc geometry

- **Direction.** Every arc tapers from full width at the exporter to a point at the importer. That taper is the direction cue. A small arrowhead at the target end reinforces it.
- **Width.** Arc width is proportional to the relative volume of the corridor within its mineral (1 to 5 scale in the shipped dataset; tonnes of contained metal once the BACI refresh runs).
- **Brightness.** Overlapping arcs use screen blending, so hubs where many corridors converge glow brighter without any node needing to be drawn. That is the property inherited from geoFluxus material-flow maps.
- **Opacity.** Bigger corridors are more opaque; smaller ones fade into the background. That is why the DRC-to-China cobalt arc looks solid while a 1% side flow reads as a hint.

---

## Data caveats before citing

The dataset ships with `status: indicative`. That is why the map opens with a working-data notice and why every figure in the Sources tab carries a confidence marker.

Shares are rounded 2024/2025 figures from USGS, IEA and industry association reports. Corridor widths are relative weights on a 1-to-5 scale, not tonnes of contained metal. The BACI trade pipeline (see [Where Transition Minerals Go: The Evidence Base](/mineral-flows-research)) converts these to tonnes once the CEPII release is downloaded manually. Until then, the map is a shape, not a measurement.

For the 48-country African coverage question — the paper cites 48 African countries as holding at least one transition mineral in reserve, while the map surfaces around a dozen African source hubs today because the other thirty-plus are pre-export. That gap is documented in the Sources tab.

---

## Data provenance table

Every figure the map draws is loaded from a single file, `/assets/data/mineral-flows.json`, and rendered in the browser by the standalone script at `/mineral-flows/index.html` (which uses d3 v7 for the projection and flow bands, d3-sankey v0.12 for the chain diagram, and html2canvas for the PNG export). The rows below name the primary source per (mineral, stage) pair, its underlying data year, and when the Lab last touched the value. The `basis`, `year`, `confidence` and `last_updated` fields shown here live on each stage node in the JSON and can be inspected in the browser's dev tools.

<div class="table-scroll" role="region" aria-label="Data provenance by mineral and stage" tabindex="0">

| Mineral | Stage | Unit | Data year | Source | Confidence | Last updated |
|---|---|---|---|---|---|---|
| Lithium | Mining | t Li content | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates) | High | 2026-09-30 |
| Lithium | Refining (carbonate and hydroxide) |  | 2024 | IEA Global Critical Minerals Outlook | Medium | 2026-09-30 |
| Lithium | Cathode active material |  | 2024 | IEA Global Critical Minerals Outlook 2025/2026 chapter figures; replace with IEA dataset values | Medium | 2026-09-30 |
| Cobalt | Mining | t Co content | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates) | High | 2026-09-30 |
| Cobalt | Refining |  | 2024 | IEA Global Critical Minerals Outlook; Cobalt Institute market reports | Medium | 2026-09-30 |
| Cobalt | Cathode active material |  | 2024 | IEA Global Critical Minerals Outlook 2025/2026 chapter figures; replace with IEA dataset values | Medium | 2026-09-30 |
| Nickel | Mining | t Ni content | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates) | High | 2026-09-30 |
| Nickel | Refining (all classes) |  | 2024 | IEA Global Critical Minerals Outlook | Medium | 2026-09-30 |
| Nickel | Cathode active material |  | 2024 | IEA Global Critical Minerals Outlook 2025/2026 chapter figures; replace with IEA dataset values | Medium | 2026-09-30 |
| Copper | Mining | kt Cu content | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates) | High | 2026-09-30 |
| Copper | Refining |  | 2024 | USGS; ICSG World Copper Factbook | Medium | 2026-09-30 |
| Graphite | Mining (natural flake) | kt | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates) | High | 2026-09-30 |
| Graphite | Refining (anode-grade) |  | 2024 | IEA Global Critical Minerals Outlook | Medium | 2026-09-30 |
| Graphite | Anode material |  | 2024 | IEA Global Critical Minerals Outlook | Medium | 2026-09-30 |
| Rare earths | Mining | t REO | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates) | High | 2026-09-30 |
| Rare earths | Separation and refining |  | 2025 | IEA Global Critical Minerals Outlook 2026 notes a modest decline in concentration | Medium | 2026-09-30 |
| Rare earths | NdFeB magnets |  | 2024 | IEA; industry estimates | Medium | 2026-09-30 |
| Manganese | Mining | kt Mn content | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates) | High | 2026-09-30 |
| Manganese | Battery-grade sulphate |  | 2024 | IEA Global Critical Minerals Outlook | Medium | 2026-09-30 |
| Manganese | Cathode active material |  | 2024 | IEA Global Critical Minerals Outlook 2025/2026 chapter figures; replace with IEA dataset values | Medium | 2026-09-30 |
| Platinum group metals | Mining (Pt and Pd) | t | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates), platinum and palladium combined | Medium | 2026-09-30 |
| Platinum group metals | Refining (primary and secondary) |  | 2024 | Indicative; replace with Johnson Matthey PGM market report values | Low | 2026-09-30 |
| Phosphate | Mining (phosphate rock) | kt P2O5 content | 2024 | USGS Mineral Commodity Summaries 2025 (2024 estimates); indicative until BACI HS 2510 refresh. | High | 2026-09-30 |
| Phosphate | Purified phosphoric acid (LFP-grade) |  | 2024 | IEA Global Critical Minerals Outlook 2026 LFP chapter; industry association estimates. Indicative. | Medium | 2026-09-30 |
| Phosphate | LFP cathode material |  | 2024 | IEA GCMO 2026; Benchmark Mineral Intelligence LFP tracker. Indicative until verified. | Medium | 2026-09-30 |
| Boron | Mining (borates) | kt B2O3 content | 2024 | USGS Mineral Commodity Summaries 2025 - Boron (2024 est.). | High | 2026-09-30 |
| Boron | Boric acid and refined borates |  | 2024 | USGS + industry association estimates. Indicative. | Medium | 2026-09-30 |
| Gallium | Primary production (bauxite/zinc co-product) | t Ga content | 2024 | USGS MCS 2025 - Gallium; virtually all primary from bauxite refining. Indicative. | Medium | 2026-09-30 |
| Gallium | Refined gallium (>99.99%) |  | 2024 | USGS MCS 2025 + industry association estimates. China dominates high-purity refining. | Medium | 2026-09-30 |
| Germanium | Primary production (zinc/coal co-product) | t Ge content | 2024 | USGS MCS 2025 - Germanium; recovered mainly as a zinc-refining by-product. Indicative. | Medium | 2026-09-30 |
| Germanium | Refined germanium |  | 2024 | USGS + industry association estimates. Indicative. | Medium | 2026-09-30 |
| Silver | Mining | t Ag content | 2024 | USGS MCS 2025 - Silver (2024 est.). | High | 2026-09-30 |
| Silver | Refined silver bullion |  | 2024 | World Silver Survey (Metals Focus) 2024 - indicative. | Medium | 2026-09-30 |
| Silicon (metal) | Silicon metal (from quartzite) | kt Si metal | 2024 | USGS MCS 2025 - Silicon; smelted from high-purity quartz. Indicative. | High | 2026-09-30 |
| Silicon (metal) | Polysilicon (solar and semiconductor grade) |  | 2024 | IEA Renewables 2024; polysilicon global capacity distribution. Indicative. | Medium | 2026-09-30 |
| Silicon (metal) | Silicon carbide power devices (traction inverters) |  | 2024 | Yole Development SiC market tracker 2024. Indicative and volatile; check before citing. | Low | 2026-09-30 |
| Fluorspar (fluorine) | Mining (acid-grade CaF2) | kt CaF2 content | 2024 | USGS MCS 2025 - Fluorspar (2024 est.). Indicative. | High | 2026-09-30 |
| Fluorspar (fluorine) | Hydrofluoric acid (HF) production |  | 2024 | USGS + industry estimates. Indicative. | Medium | 2026-09-30 |

</div>

The [Data attribution page](/mineral-flows-attribution) groups the same information by mineral chain rather than by table row, and names the version and refresh cadence for the dataset.

---

## Where to go next

- [Seven Findings on the Transition-Mineral Chain](/insight-where-transition-minerals-go) — the article that draws conclusions from the map.
- [Where Transition Minerals Go: The Evidence Base](/mineral-flows-research) — the research paper listing every source behind every figure.
- [Green Industrialisation & Local Manufacturing](/expertise-manufacturing) — the Lab's programme this tool sits inside.
- [BReW framework](/brw) — the strategic lens the Lab reads these chains through.
