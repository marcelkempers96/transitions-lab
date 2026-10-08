§ / Attribution

# Data attribution and last-updated

*Every figure on the [Mineral Flows Map](/mineral-flows) traces to a specific public dataset. This page names the source for every chain, the year of the underlying data, the confidence marker it ships with, and when the Lab last touched it. Read as: what a reader would need to click through before citing.*

<p class="tool-cta"><a href="/mineral-flows" class="tool-cta-btn">Open the interactive Mineral Flows Map &rarr;</a></p>

---

## House rule

> No figure goes live on the public site until its link resolves. The map ships with `minerals.meta.status: indicative` until a BACI-driven refresh replaces the working shares with tonnes of contained metal. Every share is a rounded USGS or IEA headline value; every corridor width is a relative 1-5 weight rather than a tonne. The [research paper](/mineral-flows-research) explains the method; the [guide](/mineral-flows-guide) explains how to read it.

Dataset version: **1.4 (indicative)** · Last dataset touch: **1 October 2026** · Studies tracked: **38** · Countries: **60** · Corridors: **298** · Reserves series: **12 of 15 minerals**.

---

## Equations behind the figures

*The five expressions below do all the arithmetic on the public site. Each is a one-liner the reader can audit against the source dataset. The lower line names the paper or convention the Lab adopts.*

<div class="equations-block">

<figure class="equation">
<div class="eq-formula">HHI<sub>s</sub> = &Sigma;<sub>i</sub> s<sub>i,s</sub><sup>2</sup></div>
<figcaption class="eq-caption">
<p><b>Herfindahl-Hirschman Index for stage s.</b> Sum the squares of every country's percentage share s<sub>i,s</sub>. Above 2,500 is conventionally "highly concentrated"; above 10,000 is a monopoly. The map excludes the unlisted "rest of world" tail, so the HHI returned is a lower bound.</p>
<p class="eq-source">Hirschman (1945); Herfindahl (1950). <a href="https://scholar.google.com/scholar?q=Hirschman+1945+national+power+structure+foreign+trade" target="_blank" rel="noopener">Hirschman &rarr;</a> &middot; <a href="https://scholar.google.com/scholar?q=Herfindahl+1950+concentration+steel+industry" target="_blank" rel="noopener">Herfindahl &rarr;</a></p>
</figcaption>
</figure>

<figure class="equation">
<div class="eq-formula">T<sub>i,s</sub> &approx; s<sub>i,s</sub> &times; W<sub>s</sub></div>
<figcaption class="eq-caption">
<p><b>Approximate tonnes-per-annum.</b> Country i's annual tonnes at stage s equals that country's percentage share multiplied by the world total W<sub>s</sub> for the stage. The result is an indicative headline figure, never a transaction-level claim.</p>
<p class="eq-source">Lab convention; W<sub>s</sub> values from USGS <em>Mineral Commodity Summaries 2025</em> and IEA <em>Global Critical Minerals Outlook 2026</em>. <a href="https://pubs.usgs.gov/periodicals/mcs2025/" target="_blank" rel="noopener">USGS MCS 2025 &rarr;</a> &middot; <a href="https://www.iea.org/reports/global-critical-minerals-outlook-2026" target="_blank" rel="noopener">IEA GCMO 2026 &rarr;</a></p>
</figcaption>
</figure>

<figure class="equation">
<div class="eq-formula">v<sub>A&rarr;B</sub> = (s<sub>A</sub> &times; s<sub>B</sub>) &divide; &Sigma;<sub>B'</sub> s<sub>B'</sub></div>
<figcaption class="eq-caption">
<p><b>Mass-balanced bi-proportional link allocation.</b> The flow volume from upstream country A to downstream country B is proportional to the product of A's upstream share and B's downstream share, normalised by the sum of downstream shares. Totals in and out balance by construction.</p>
<p class="eq-source">Lab adaptation of the Fratar / RAS matrix-balancing procedure. <a href="https://scholar.google.com/scholar?q=Fratar+1954+trip+distribution+method" target="_blank" rel="noopener">Fratar (1954) &rarr;</a> &middot; <a href="https://scholar.google.com/scholar?q=Stone+1961+input+output+matrix+RAS" target="_blank" rel="noopener">Stone (1961) &rarr;</a></p>
</figcaption>
</figure>

<figure class="equation">
<div class="eq-formula">g<sub>i</sub> = R<sub>i</sub> &minus; M<sub>i</sub></div>
<figcaption class="eq-caption">
<p><b>Reserves-vs-mining gap.</b> The untapped-reserves share for country i equals its share of global reserves R<sub>i</sub> minus its share of current mining output M<sub>i</sub>. A positive g<sub>i</sub> says the country holds more of the resource than it currently produces; a negative g<sub>i</sub> says the opposite. Rendered on the Reserves tab for 12 of 15 minerals.</p>
<p class="eq-source">Lab; R<sub>i</sub> from USGS <em>Mineral Commodity Summaries 2025</em>. See the <a href="/mineral-flows-research#method-reserves">reserves method section</a>.</p>
</figcaption>
</figure>

<figure class="equation">
<div class="eq-formula">V' = V &setminus; {f : src(f) = c &or; tgt(f) = c};&nbsp;&nbsp; residual = &Sigma;<sub>f &isin; V'</sub> w<sub>f</sub></div>
<figcaption class="eq-caption">
<p><b>Stress-test counterfactual.</b> Remove country c from the corridor set V, sum the weight of the surviving flows w<sub>f</sub>, and compare to the pre-removal total. Measures how much corridor volume survives the loss of a single country, which the Stress-test tab reports.</p>
<p class="eq-source">Related to the firm-level network-robustness treatment in Sun et al. (2024). <a href="https://scholar.google.com/scholar?q=Sun+Hao+2024+firm-level+ownership+critical+minerals+Resources+Conservation+Recycling" target="_blank" rel="noopener">Find on Google Scholar &rarr;</a></p>
</figcaption>
</figure>

</div>

---

## By mineral chain

The table names the *primary* source per stage. Where more than one publication was drawn on, the additional sources are named alongside. Confidence markers are the Lab's read of how well the underlying data supports the figure at the stage's resolution: **High** for headline shares in mainstream USGS commodity summaries; **Medium** for IEA outlook chapters or industry-association estimates; **Low** for the frontier chains where public data is patchy (LFP downstream, SiC power devices).

**Primary sources used across the map** (each named short-form in the per-chain list below):

- [USGS *Mineral Commodity Summaries 2025*](https://pubs.usgs.gov/periodicals/mcs2025/) — mining shares for every chain.
- [IEA *Global Critical Minerals Outlook 2026* (GCMO)](https://www.iea.org/reports/global-critical-minerals-outlook-2026) — refining and cathode-active-material shares.
- [Benchmark Mineral Intelligence](https://source.benchmarkminerals.com/) — LFP and lithium-ion battery database.
- [Cobalt Institute market reports](https://www.cobaltinstitute.org/resource/) — refined cobalt data.
- [ICSG *World Copper Factbook*](https://icsg.org/copper-factbook/) — refined copper shares.
- [Johnson Matthey PGM market reports](https://matthey.com/products-and-markets/pgms-and-circularity/pgm-management/pgm-market-report) — platinum group metal flows.
- [Metals Focus / The Silver Institute, *World Silver Survey*](https://www.silverinstitute.org/all-world-silver-surveys/) — refined silver bullion.
- [IEA *Renewables 2024*](https://www.iea.org/reports/renewables-2024) — polysilicon production.
- [Yole Development SiC market tracker](https://www.yolegroup.com/strategy-insights/all-reports/) — silicon-carbide power devices.
- [BACI international-trade database (CEPII)](http://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37) — pending tonnes-of-contained-metal refresh.

### Lithium
- **Mining**, USGS *Mineral Commodity Summaries 2025* (2024 estimates). High. Last updated 30 Sep 2026.
- **Refining (carbonate + hydroxide)**, IEA *Global Critical Minerals Outlook 2026*. Medium.
- **Cathode active material**, IEA GCMO 2026, chapter figures; Benchmark Mineral Intelligence tracker. Medium.

### Cobalt
- **Mining**, USGS MCS 2025 (2024 est.). High.
- **Refining**, IEA GCMO 2026; Cobalt Institute market reports. Medium.
- **Cathode active material**, IEA GCMO 2026. Medium.

### Nickel
- **Mining**, USGS MCS 2025 (2024 est.). High.
- **Refining (all classes)**, IEA GCMO 2026. Medium.
- **Cathode active material**, IEA GCMO 2026. Medium.

### Copper
- **Mining**, USGS MCS 2025 (2024 est.). High.
- **Refining**, USGS + ICSG *World Copper Factbook*. Medium.

### Graphite
- **Mining (natural flake)**, USGS MCS 2025 (2024 est.). High.
- **Refining (anode-grade)**, IEA GCMO 2026. Medium.
- **Anode material**, IEA GCMO 2026. Medium.

### Rare earths (Nd, Pr, Dy, Tb aggregated)
- **Mining**, USGS MCS 2025 (2024 est.). High. Aggregates the four rare earths named in most EV magnet chemistries; the map does not yet split Nd / Pr / Dy / Tb, which is version 2 work.
- **Separation and refining**, IEA GCMO 2026 (records a modest 2025 decline). Medium.
- **NdFeB magnets**, IEA + industry estimates. Medium.

### Manganese
- **Mining**, USGS MCS 2025 (2024 est.). High.
- **Battery-grade sulphate**, IEA GCMO 2026. Medium.
- **Cathode active material**, IEA GCMO 2026. Medium.

### Platinum group metals
- **Mining (Pt and Pd combined)**, USGS MCS 2025 (2024 est.). Medium.
- **Refining (primary and secondary)**, Indicative; Johnson Matthey PGM market reports pending. Low.

### Phosphate (LFP chain)
- **Mining (phosphate rock)**, USGS MCS 2025 (2024 est.). High.
- **Purified phosphoric acid (LFP-grade)**, IEA GCMO 2026 LFP chapter; industry-association estimates. Medium.
- **LFP cathode material**, IEA GCMO 2026 + Benchmark Mineral Intelligence LFP tracker. Medium.

### Boron (magnet crystal + electrolyte)
- **Mining (borates)**, USGS MCS 2025 (2024 est.). High.
- **Refined borates / boric acid**, USGS + industry-association estimates. Medium.
- Context: Turkey (Eti Maden) and one US producer (Rio Tinto Boron) hold most of the world's borate supply; the map does not yet split boron output by end use (magnets vs glass vs fertiliser).

### Gallium (wide-bandgap semiconductors)
- **Primary production (bauxite/zinc co-product)**, USGS MCS 2025 - Gallium. Medium.
- **Refined gallium (>99.99%)**, USGS + industry estimates. Medium.
- Policy note: Chinese export licensing on high-purity gallium since 2023; verify current status.

### Germanium (fibre optics + ADAS cameras)
- **Primary production (zinc/coal co-product)**, USGS MCS 2025 - Germanium. Medium.
- **Refined germanium**, USGS + industry estimates. Medium.
- Policy note: Chinese export licensing on refined germanium since 2023.

### Silver (power electronics + radar)
- **Mining**, USGS MCS 2025 (2024 est.). High.
- **Refined silver bullion**, Metals Focus / The Silver Institute, *World Silver Survey 2024*. Medium.

### Silicon (metal, polysilicon, SiC)
- **Silicon metal (from quartzite)**, USGS MCS 2025 - Silicon. High.
- **Polysilicon (solar and semiconductor grade)**, IEA *Renewables 2024*. Medium.
- **Silicon carbide power devices (traction inverters)**, Yole Development SiC market tracker 2024. Low; volatile and worth re-checking before citing.

### Fluorspar (LiPF6 electrolyte + PVDF binder)
- **Mining (acid-grade CaF2)**, USGS MCS 2025 - Fluorspar. High.
- **Hydrofluoric acid (HF)**, USGS + industry estimates. Medium.

---

## Not (yet) on the map

The following are named in the EV bill of materials but not yet on the map. Adding each requires either a distinct dataset the Lab does not currently have open, or a splitting exercise on an existing chain. Each is a version-2 candidate.

- **Synthetic graphite**, currently aggregated into the graphite chain. Splitting natural vs synthetic needs petroleum-coke and needle-coke production data (Benchmark; global anode capacity trackers).
- **Rare-earth split (Nd / Pr / Dy / Tb individually)**, the map currently aggregates. A per-element split needs IMCOA or Adamas Intelligence heavy-vs-light REE production data.
- **Neodymium and dysprosium in-magnet share**, trace within NdFeB. Traceable through Argus Metals or Adamas magnet-market trackers.
- **Gold**, trace amounts on connector plating and sensors. Global gold flows are dominated by jewellery and investment demand; EV-specific isolation is not defensible without industry-specific tracker access.
- **Silicon carbide device manufacturing shares**, Yole and TrendForce publish this quarterly; currently marked Low confidence for that reason.

---

## Country coverage note

The map draws current top exporters, not deposit holders. Around a dozen African countries appear as source hubs today; the other thirty-plus hold reserves that have not yet reached international trade at meaningful volumes. See the [research paper](/mineral-flows-research#fact-1) for the reserves-versus-exports distinction and the [guide](/mineral-flows-guide) for how it plays out in the map's coverage.

---

## Refresh cadence

- **Bibliography links** are checked automatically on the first and third Monday of every month by `.github/workflows/mineral-flows-refresh.yml`. A broken link opens a GitHub issue tagged `mineral-flows`.
- **BACI trade refresh** requires a manual CEPII download and human review (per `scripts/mineral-flows-tools.py baci`). The workflow files a reminder issue on the same fortnightly cadence.
- **USGS commodity summaries** publish once a year in late January; the map is refreshed against them within four weeks of release.
- **IEA GCMO** publishes once a year (May/June); the map is refreshed within four weeks.

---

## Cite the map

Transitions Lab, *Mineral Flows Map*, version 1.1 (indicative), 30 September 2026. Available at `transitionslab.org/mineral-flows`. Data attribution: `transitionslab.org/mineral-flows-attribution`.

For the research paper: [Where Transition Minerals Go: The Evidence Base](/mineral-flows-research). For the headline article: [Where transition minerals actually go](/insight-where-transition-minerals-go). For a walkthrough of the tool: [How to read the Mineral Flows Map](/mineral-flows-guide).
