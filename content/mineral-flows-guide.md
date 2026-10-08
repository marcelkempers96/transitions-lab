§ / Tool guide

# How to read the Mineral Flows Map

*A short walkthrough of what the map shows, how to move through it, and the patterns it makes visible. Paired with the [interactive tool](/mineral-flows), the [research paper](/mineral-flows-research), and the [companion article](/insight-where-transition-minerals-go).*

<p class="tool-cta"><a href="/mineral-flows" class="tool-cta-btn">Open the interactive Mineral Flows Map &rarr;</a></p>

<figure>
  <img src="/assets/img/mineral-flows-guide-desktop.jpg" alt="Desktop screenshot of the Mineral Flows Map on light theme, all-minerals view. Left: world map with multi-coloured flow bands converging on China; labelled hubs at Canada, United States, Mexico, Cuba, Argentina, Peru, Chile, Brazil, Ghana, Gabon, DR Congo, Zimbabwe, South Africa, Madagascar, Morocco, Poland, Germany, Norway, Finland, United Kingdom, Turkey, Jordan, Egypt, Kazakhstan, Mongolia, India, Myanmar, China, South Korea, Japan, Philippines, Malaysia, Indonesia, Australia and New Caledonia. A tooltip highlights a rare-earths NdFeB magnet corridor from China to the United States (relative volume 3 of 5, high confidence). Right: the Overview tab listing largest miner, largest refiner and Africa mines/refines shares for every one of the fifteen chains." class="diagram">
  <figcaption>The desktop view. Hover a corridor to dim every other flow and read its source, target, mineral form and confidence. The Overview panel on the right lists the largest miner and refiner for every chain in one sweep.</figcaption>
</figure>

---

## What's in an electric vehicle

The fifteen chains on the map are not fifteen separate stories. They cluster into four jobs the EV asks of its bill of materials. The map's group filter above the mineral chips lets you look at one job at a time.

<div class="table-scroll" role="region" aria-label="How the fifteen minerals map onto an EV" tabindex="0">
<table class="tbl ev-groups">
<thead><tr><th>Group</th><th>Minerals</th><th>What they do</th></tr></thead>
<tbody>
<tr><td><strong>Battery</strong></td><td>Lithium, nickel, cobalt, manganese, graphite, phosphate, fluorspar</td><td>Cathode, anode, electrolyte and binder of a lithium-ion pack. Seven chains, one component.</td></tr>
<tr><td><strong>Motor and wiring</strong></td><td>Rare earths, boron, copper</td><td>Permanent magnets in the drive motor and the copper that moves current to and from them.</td></tr>
<tr><td><strong>Electronics and charging</strong></td><td>Silicon metal, gallium, silver</td><td>Power chips, charger electronics, solar cells and contact paste.</td></tr>
<tr><td><strong>Beyond the EV</strong></td><td>Platinum group metals, germanium</td><td>Catalytic converters and fuel cells for one, fibre optics and sensors for the other. Included because the transition moves their demand too.</td></tr>
</tbody>
</table>
</div>

The battery chain dominates the map because seven of the fifteen minerals go into one component. Platinum group metals run the other way: they are a transition mineral by subtraction, as EV adoption replaces the catalytic converters that used them.

---

## The sixty-second tour

<ol class="guide-steps">

<li class="guide-step">
  <span class="step-n" aria-hidden="true">1</span>
  <div class="step-body">
    <h3 class="step-h">Pick a mineral.</h3>
    <p>The chip row at the top runs *All minerals* and fifteen individual chains, lithium, cobalt, nickel, copper, graphite, rare earths, manganese, platinum group metals, phosphate (the LFP battery chain), boron, gallium, germanium, silver, silicon and fluorspar. *All minerals* draws every corridor at once, coloured by mineral. Picking one recolours the map by that mineral's stage shares.</p>
  </div>
</li>

<li class="guide-step">
  <span class="step-n" aria-hidden="true">2</span>
  <div class="step-body">
    <h3 class="step-h">Move through the chain.</h3>
    <p>The stage ribbon below the chips is both the summary and the selector. Each stage shows its largest producer, a strata bar with the full country breakdown, and toggles the map's choropleth when you click it. Rare earths goes Mining → Separation and refining → NdFeB magnets; lithium goes Mining → Refining → Cathode. Watching the strata bar narrow across stages is the whole story: mining is diffuse, refining is not.</p>
    <figure class="step-figure">
      <img src="/assets/img/mineral-flows-guide-shares.jpg" alt="Zoom on the cobalt mining stage in the map's Country tab: DR Congo 76%, Indonesia 10%, Russia 3%, Philippines 1.3%, Australia 1.2%, Cuba 1.2%, Canada 1.2%, Madagascar 1%, Rest of world 4.9%. Total 99.8%.">
      <figcaption>Cobalt mining. One country takes three-quarters, eight others take the rest.</figcaption>
    </figure>
  </div>
</li>

<li class="guide-step">
  <span class="step-n" aria-hidden="true">3</span>
  <div class="step-body">
    <h3 class="step-h">Read the panel on the right.</h3>
    <p>Four tabs. **Overview** is the mineral's headline and a per-stage HHI. **Country** picks one country and shows its role across every stage plus its import and export corridors. **Stress test** removes a country and reports what fraction of each stage goes offline. **Sources** lists every figure with its year, confidence and the studies behind it.</p>
    <figure class="step-figure">
      <img src="/assets/img/mineral-flows-guide-overview-tab.jpg" alt="Copper Overview tab: 17% of world mining is in African countries, 9.5% of world refining. Concentration by stage: Mining HHI 1015 (unconcentrated), largest Chile 23%. Refining HHI 2212 (moderately concentrated), largest China 45%.">
      <figcaption>The Overview tab for copper. Two Africa shares, then per-stage HHI with the largest producer named for each stage.</figcaption>
    </figure>
  </div>
</li>

</ol>

---

## Features, one line each

- **Trade flows** toggles the arcs on and off. Off gives you a plain choropleth.
- **Africa focus** zooms to the continent and filters to corridors with an African endpoint.
- **Policy detail** lives in the side panel: pick a country in the Country tab to see its export bans, quotas, licensing rules, ownership rules and industrial-policy commitments listed, per mineral, with dates. The main map stays clean.
- **By stage** colours arcs by processing state (orange for ore / concentrate / intermediate, white for refined metal / chemical / component). **By mineral** colours arcs by which mineral they carry. The default is *by mineral* in the all-minerals view and *by stage* on a single mineral.
- **Zoom in and out** with the buttons on the right of the map or with pinch and scroll. As you zoom, more country labels appear, and the labels shrink with the zoom so they don't cover the geography.
- **Stress test** is the most useful feature for scenario reading. Pick a country, hit *stress test*, and the map hatches the country out and dims every corridor that touches it; the panel then reports how many percent of each stage is offline and how concentration among the remaining suppliers shifts.

<figure class="photo">
  <img src="/assets/img/mineral-flows-guide-stress.jpg" alt="Screenshot of the map's Stress test panel with Chile removed. Reports 20% of lithium mining offline (Australia at 46.3% of what is left; HHI 2215 becomes 2836), 24% of lithium refining offline (China at 89.5%; HHI 5225 becomes 8049), 23% of copper mining offline (DRC at 18.2%; HHI 1015 becomes 820), and 7% of copper refining offline (China at 48.4%; HHI 2212 becomes 2501). Beneath, a list of six cut corridors: lithium carbonate from Chile to China, South Korea and Japan." class="diagram">
</figure>
- **Save PNG** in the share row snaps only the map and the flow panel. Nothing else. Good for a slide.
- **Hover a flow** and every other corridor dims to the background so the selected route stands out; the tooltip names the source, target, mineral form and confidence.

---

## Chain-diagram view (Sankey)

The **Chain diagram** button turns the map into a stage-by-stage flow view for the current mineral. It answers a question the world map cannot: *of the ore mined in country X, how much of it stays there through refining and how much moves on to another country?* That is the "where does value get captured" question, drawn.

<figure>
  <img src="/assets/img/mineral-flows-guide-sankey.jpg" alt="Desktop screenshot of the Mineral Flows Map's Chain diagram view for Nickel. Three vertical columns labelled Mining, Refining (all classes) and Cathode active material. Mining column shows Indonesia 59% in pink, Rest of world 12%, Philippines 9%, Russia 6%, Canada 5%, China 3%, Australia 3% and New Caledonia 3%. Refining column shows Indonesia 44% in pink, China 22%, Rest of world 12%, Japan 5%, Russia 5%, Canada 4%, Australia 3%, Norway 3%, Finland 2%. Cathode active material column shows China 85% orange, South Korea 7%, Japan 5%, Rest of world 3%. Coloured ribbons connect the columns proportional to each country's share, so Indonesia's pink block flows from mining into refining and Chinese refining feeds the cathode column. Right panel shows the single-mineral Overview tab: HHI 3650 (highly concentrated) for mining, largest Indonesia 59% (approx 2.1 Mt/y), HHI 2508 for refining (largest Indonesia 44% approx 1.5 Mt/y), HHI 7299 for cathode (largest China 85%). Each stage carries a world-total source line beneath it (USGS MCS 2025 for mining, IEA GCMO 2026 for refining and cathode)." class="diagram">
  <figcaption>Chain diagram for nickel. Indonesia's pink block moves through mining and refining almost unchanged; the cathode column then collapses into China's orange. Country colours are stable across stages, so the eye tracks one country's flow through the whole chain.</figcaption>
</figure>

<p class="tool-cta"><a href="/mineral-flows" class="tool-cta-btn">Try the Chain diagram &rarr;</a></p>

### How to read it

**Columns are stages.** Left to right: mining, refining, cathode / downstream, in the order the shipped dataset carries for the current mineral. Lithium goes Mining → Refining (carbonate + hydroxide) → Cathode active material. Rare earths goes Mining → Separation and refining → NdFeB magnets. A two-stage chain (borates, PGMs, silver, fluorspar) shows only two columns.

**Blocks are countries.** In each column, every listed producer gets a coloured block sized to its share of that stage, ranked largest-first, with an *Rest of world* bucket for the remainder. Country colours are stable across stages, so Indonesia's pink block is Indonesia in every column.

**Ribbons are the transition.** A ribbon from country A in column N to country B in column N+1 says: this share of A's mine output ends up as B's refined output (and so on). Where the shipped dataset carries a bilateral corridor for that pair (Indonesian ore into Chinese sulphate; Chilean carbonate into Korean cathode), the ribbon follows it. Where it doesn't, the remainder spreads by the downstream country's share, so every stage still totals 100%.

### When the diagram tells you something the map can't

**Stage collapse.** A country that mines a lot but refines almost nothing shows as a wide block on the left that funnels into other countries' blocks on the right. DR Congo cobalt is the canonical case: Congolese mining ≈ 76%, Congolese refining ≈ 3%; the diagram makes that gap physical.

**Chokepoint chains.** When the same country dominates every column, the diagram is basically one wide band running straight across. Graphite and rare earths look this way. A single-column stress-test on those chains isn't a scenario — the whole diagram would go dark.

**Downstream compression.** Many chains have a diffuse mining column, a moderately concentrated refining column, and one country holding the cathode / magnet / anode column. The eye reads that as blocks getting *narrower* left to right until one big block remains. That is the "processing is not one thing" story the article's finding #5 makes in prose.

### Limits

- Chain diagram works one mineral at a time. Pick a chip other than *All minerals* to see it; the diagram falls back to a placeholder message otherwise.
- Ribbons are allocated mass-balanced bi-proportionally: a flow A→B is proportional to A's upstream share times B's downstream share, so totals balance by construction. See the [equation on the attribution page](/mineral-flows-attribution#equations-behind-the-figures). The BACI trade refresh (see the [research paper](/mineral-flows-research#method-tonnes)) will replace these with actual contained-metal tonnages per corridor.
- Cathode / magnet / anode columns without a source-anchored share show only the world's largest producer name; the block sizes there are indicative, not audited.

---

## Reserves vs mining: the gap

The map carries a **Reserves** tab in the side panel. For every mineral where USGS publishes reserves (twelve of the fifteen), the tab lists each country's **share of world reserves** against its **share of world mining today**, and highlights the gap. A positive gap says the country holds more of the known deposits than it currently produces; a negative gap says it mines faster than its share of reserves can sustain.

The feature is most diagnostic for Africa. If a country holds 7% of the world's copper reserves but mines 2%, the Reserves tab labels it as having **latent potential**: the ground has it, the smelters have not followed yet. Clicking any mineral chip opens the full breakdown for every listed country.

Three minerals (silicon metal, gallium, germanium) have no reserves line because USGS does not publish standalone reserves for them: silicon is sand-grade quartz, and gallium and germanium are co-products of bauxite and zinc refining respectively. The tab labels these honestly rather than imputing a share.

For the method behind the reserves data, including the economic-vs-geological distinction and the year-on-year volatility, see the research paper's [Method: reserves and the mining gap](/mineral-flows-research#method-reserves) section.

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

For the 48-country African coverage question, the paper cites 48 African countries as holding at least one transition mineral in reserve. The map now lists 42 of them, including the ring of reserve-holder-but-not-yet-exporter states beyond the current top dozen; the remaining six sit below the USGS 1% rounding floor and so appear in the OTHER tail. The gap is documented in the Sources tab.

---

## Data provenance table

Every figure the map draws is loaded from a single file, `/assets/data/mineral-flows.json`, and rendered in the browser by the standalone script at `/mineral-flows/index.html` (which uses d3 v7 for the projection and flow bands, d3-sankey v0.12 for the chain diagram, and html2canvas for the PNG export). The rows below name the primary source per (mineral, stage) pair, its underlying data year, and when the Lab last touched the value. The `basis`, `year`, `confidence` and `last_updated` fields shown here live on each stage node in the JSON and can be inspected in the browser's dev tools.

<div class="table-scroll provenance-scroll" role="region" aria-label="Data provenance by mineral and stage" tabindex="0">
<table class="tbl provenance">
<thead><tr><th>Mineral</th><th>Stage</th><th>Unit</th><th>Year</th><th>Source</th><th>Conf.</th><th>Updated</th></tr></thead>
<tbody>
<tr><td>Lithium</td><td>Mining</td><td>t Li content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-lithium.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates)</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Lithium</td><td>Refining (carbonate and hydroxide)</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Lithium</td><td>Cathode active material</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook 2025/2026 chapter figures</a>; replace with IEA dataset values</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Cobalt</td><td>Mining</td><td>t Co content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-cobalt.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates)</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Cobalt</td><td>Refining</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook</a>; <a href="https://www.cobaltinstitute.org/resource-centre/" target="_blank" rel="noopener">Cobalt Institute market reports</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Cobalt</td><td>Cathode active material</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook 2025/2026 chapter figures</a>; replace with IEA dataset values</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Nickel</td><td>Mining</td><td>t Ni content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-nickel.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates)</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Nickel</td><td>Refining (all classes)</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Nickel</td><td>Cathode active material</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook 2025/2026 chapter figures</a>; replace with IEA dataset values</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Copper</td><td>Mining</td><td>kt Cu content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-copper.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates)</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Copper</td><td>Refining</td><td></td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-copper.pdf" target="_blank" rel="noopener">USGS</a>; <a href="https://icsg.org/copper-factbook/" target="_blank" rel="noopener">ICSG World Copper Factbook</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Graphite</td><td>Mining (natural flake)</td><td>kt</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-graphite.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates)</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Graphite</td><td>Refining (anode-grade)</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Graphite</td><td>Anode material</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Rare earths</td><td>Mining</td><td>t REO</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-rare-earths.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates)</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Rare earths</td><td>Separation and refining</td><td></td><td>2025</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook 2026 notes a modest decline in concentration</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Rare earths</td><td>NdFeB magnets</td><td></td><td>2024</td><td>IEA; industry estimates</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Manganese</td><td>Mining</td><td>kt Mn content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-manganese.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates)</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Manganese</td><td>Battery-grade sulphate</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Manganese</td><td>Cathode active material</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook 2025/2026 chapter figures</a>; replace with IEA dataset values</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Platinum group metals</td><td>Mining (Pt and Pd)</td><td>t</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-platinum.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates), platinum and palladium combined</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Platinum group metals</td><td>Refining (primary and secondary)</td><td></td><td>2024</td><td>Indicative; <a href="https://matthey.com/pgm-market-report" target="_blank" rel="noopener">replace with Johnson Matthey PGM market report values</a></td><td>Low</td><td>2026-09-30</td></tr>
<tr><td>Phosphate</td><td>Mining (phosphate rock)</td><td>kt P2O5 content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-phosphate.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 (2024 estimates)</a>; indicative until BACI HS 2510 refresh.</td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Phosphate</td><td>Purified phosphoric acid (LFP-grade)</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA Global Critical Minerals Outlook 2026 LFP chapter</a>; industry association estimates. Indicative.</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Phosphate</td><td>LFP cathode material</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA GCMO 2026</a>; <a href="https://source.benchmarkminerals.com/" target="_blank" rel="noopener">Benchmark Mineral Intelligence LFP tracker. Indicative until verified.</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Boron</td><td>Mining (borates)</td><td>kt B2O3 content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-boron.pdf" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2025 - Boron (2024 est.).</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Boron</td><td>Boric acid and refined borates</td><td></td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-boron.pdf" target="_blank" rel="noopener">USGS + industry association estimates. Indicative.</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Gallium</td><td>Primary production (bauxite/zinc co-product)</td><td>t Ga content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-gallium.pdf" target="_blank" rel="noopener">USGS MCS 2025 - Gallium</a>; virtually all primary from bauxite refining. Indicative.</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Gallium</td><td>Refined gallium (&gt;99.99%)</td><td></td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-gallium.pdf" target="_blank" rel="noopener">USGS MCS 2025 + industry association estimates. China dominates high-purity refining.</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Germanium</td><td>Primary production (zinc/coal co-product)</td><td>t Ge content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-germanium.pdf" target="_blank" rel="noopener">USGS MCS 2025 - Germanium</a>; recovered mainly as a zinc-refining by-product. Indicative.</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Germanium</td><td>Refined germanium</td><td></td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-germanium.pdf" target="_blank" rel="noopener">USGS + industry association estimates. Indicative.</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Silver</td><td>Mining</td><td>t Ag content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-silver.pdf" target="_blank" rel="noopener">USGS MCS 2025 - Silver (2024 est.).</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Silver</td><td>Refined silver bullion</td><td></td><td>2024</td><td><a href="https://www.silverinstitute.org/all-world-silver-surveys/" target="_blank" rel="noopener">World Silver Survey (Metals Focus) 2024 - indicative.</a></td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Silicon (metal)</td><td>Silicon metal (from quartzite)</td><td>kt Si metal</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-silicon.pdf" target="_blank" rel="noopener">USGS MCS 2025 - Silicon</a>; smelted from high-purity quartz. Indicative.</td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Silicon (metal)</td><td>Polysilicon (solar and semiconductor grade)</td><td></td><td>2024</td><td><a href="https://www.iea.org/reports/renewables-2024" target="_blank" rel="noopener">IEA Renewables 2024</a>; polysilicon global capacity distribution. Indicative.</td><td>Medium</td><td>2026-09-30</td></tr>
<tr><td>Silicon (metal)</td><td>Silicon carbide power devices (traction inverters)</td><td></td><td>2024</td><td><a href="https://www.yolegroup.com/reports/" target="_blank" rel="noopener">Yole Development SiC market tracker 2024. Indicative and volatile</a>; check before citing.</td><td>Low</td><td>2026-09-30</td></tr>
<tr><td>Fluorspar (fluorine)</td><td>Mining (acid-grade CaF2)</td><td>kt CaF2 content</td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-fluorspar.pdf" target="_blank" rel="noopener">USGS MCS 2025 - Fluorspar (2024 est.). Indicative.</a></td><td>High</td><td>2026-09-30</td></tr>
<tr><td>Fluorspar (fluorine)</td><td>Hydrofluoric acid (HF) production</td><td></td><td>2024</td><td><a href="https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-fluorspar.pdf" target="_blank" rel="noopener">USGS + industry estimates. Indicative.</a></td><td>Medium</td><td>2026-09-30</td></tr>
</tbody></table>
</div>

The [Data attribution page](/mineral-flows-attribution) groups the same information by mineral chain rather than by table row, and names the version and refresh cadence for the dataset.

---

## Bibliography

The guide quotes conventions and conclusions rather than individual studies. For the full reference list behind the map and its findings, see the [research paper's bibliography](/mineral-flows-research#bibliography), which includes:

- Material-flow analysis method: [Nansai et al. (2014)](/mineral-flows-research#bib-nansai-2014)
- Four-stage MFA for battery metals: [Sun et al. (2024)](/mineral-flows-research#bib-sun-2024)
- Supply resilience framework: [Sprecher et al. (2015, 2017)](/mineral-flows-research#bib-sprecher-2017), [Mancheri et al. (2019)](/mineral-flows-research#bib-mancheri-2019)
- Export restrictions: [Kowalski and Legendre (2023)](/mineral-flows-research#bib-kowalski-legendre-2023), [Andrenelli et al. (2025)](/mineral-flows-research#bib-andrenelli-2025)
- ESG and land dimensions: [Lèbre et al. (2020)](/mineral-flows-research#bib-lebre-2020), [Owen et al. (2023)](/mineral-flows-research#bib-owen-2023)
- Africa / Lobito focus: [Ndubuisi, Avenyo, Owusu and Kassa](https://documents1.worldbank.org/curated/en/099620011192519026/pdf/IDU-959b6025-1de2-4caf-98be-9c8aa42577da.pdf), [Stonor and Kitaw with UNECA (2026)](/mineral-flows-research#bib-stonor-kitaw-2026)
- Recycling ceiling: [Zeng et al. (2022)](/mineral-flows-research#bib-zeng-2022), [Dunn et al. (2021)](/mineral-flows-research#bib-dunn-2021)
- Criticality indices: [Graedel et al. (2015)](/mineral-flows-research#bib-graedel-2015), [Nassar et al. (2020)](/mineral-flows-research#bib-nassar-2020)
- Battery supply-chain architecture: [Olivetti et al. (2017)](/mineral-flows-research#bib-olivetti-2017), [Hao et al. (2022)](/mineral-flows-research#bib-hao-2022)

Every entry on the research-paper bibliography links out to a Google Scholar search for the primary paper.

---

## Where to go next

- [Where transition minerals actually go](/insight-where-transition-minerals-go), the article that draws conclusions from the map.
- [Where Transition Minerals Go: The Evidence Base](/mineral-flows-research), the research paper listing every source behind every figure.
- [Green Industrialisation & Local Manufacturing](/expertise-manufacturing), the Lab's programme this tool sits inside.
- [BReW framework](/brw), the strategic lens the Lab reads these chains through.
