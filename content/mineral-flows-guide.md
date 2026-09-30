§ / Tool guide

# How to read the Mineral Flows Map

*A short walkthrough of what the map shows, how to move through it, and the patterns it makes visible. Paired with the [interactive tool](/mineral-flows), the [research paper](/mineral-flows-research), and the [companion article](/insight-where-transition-minerals-go).*

<figure>
  <img src="/assets/img/mineral-flows-guide-hero.jpg" alt="Dark screenshot of the Mineral Flows Map at world zoom, with a cloud of coloured arcs converging on East Asia and additional bright endpoints in China, South Africa, South Korea, Japan, Chile and other hubs. A colour legend below names lithium, cobalt, nickel, copper, graphite, rare earths, manganese and platinum group metals." class="diagram">
</figure>

<p class="tool-cta"><a href="/mineral-flows" class="tool-cta-btn">Open the interactive Mineral Flows Map &rarr;</a></p>

---

## The sixty-second tour

**1. Pick a mineral.** The chip row at the top runs *All minerals* and eight individual chains (lithium, cobalt, nickel, copper, graphite, rare earths, manganese, platinum group metals). *All minerals* draws every corridor at once, coloured by mineral. Picking one recolours the map by that mineral's stage shares.

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

## Where to go next

- [Seven Findings on the Transition-Mineral Chain](/insight-where-transition-minerals-go) — the article that draws conclusions from the map.
- [Where Transition Minerals Go: The Evidence Base](/mineral-flows-research) — the research paper listing every source behind every figure.
- [Green Industrialisation & Local Manufacturing](/expertise-manufacturing) — the Lab's programme this tool sits inside.
- [BReW framework](/brw) — the strategic lens the Lab reads these chains through.
