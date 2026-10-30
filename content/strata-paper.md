§ / Companion paper

# A public, comparable record of what happens on the ground: the Strata companion paper

*Why Strata exists, what each indicator does, the equations that compute them, four use cases, and the partners who stand behind it. A reading-length version of the method, written for a permitting officer, a lender, a battery buyer or a resident who wants to know what is being measured and why.*

<p class="article-meta"><span class="article-date">October 2026</span> · <span class="article-reading-time">12 min read</span></p>

<nav class="strata-pages" aria-label="Strata pages">
  <a href="/strata">Overview</a>
  <a href="/strata-app">Web tool</a>
  <a href="/strata-demo">Launch app &rarr;</a>
  <a href="/strata-method">Method</a>
  <a href="/strata-data-sources">Data sources</a>
  <strong class="is-current">Companion paper</strong>
</nav>

<p class="strata-wordmark"><img src="/assets/logos/strata-lockup-black.svg" alt="Strata — the Transitions Lab satellite-baseline monitor for Europe's critical raw materials Strategic Projects"></p>

## Summary

Europe has designated 93 Strategic Projects inside the Union and 13 in third countries under the [Critical Raw Materials Act](https://commission.europa.eu/topics/competitiveness/green-deal-industrial-plan/european-critical-raw-materials-act_en). Each will transform a landscape; most will do so under time pressure. Once excavation starts, the undisturbed landscape can no longer be measured. The only record of what was there usually sits inside an environmental impact assessment commissioned by the promoter, written to a site-specific method and rarely repeated after permitting.

Strata builds a public, independent, comparable record instead. One satellite baseline per site before construction, the same indicators recomputed every year after, using open Copernicus data and one method for every site. The audience is wider than regulators: lenders, battery and cathode buyers facing the [due diligence obligations in force from 18 August 2027](https://sustainablefutures.linklaters.com/post/102kymo/eu-regulation-delaying-due-diligence-rules-for-batteries-published-in-the-ojeu), environmental groups, local councils and the residents who live beside a new pit all currently ask the same question with different evidence of different quality. A shared, independent record lets them disagree about interpretation rather than about the facts.

<div class="callout c-paper callout--serif">
  <h3>What this paper is</h3>
  <p>This is a reading-length companion to the <a href="/strata-method">method</a> and the <a href="/strata-data-sources">data sources</a>. It defines each indicator with the equation that computes it, works through four use cases with named audiences, shows the demo interface, and names the partners the project is run with. If something below is not clear, the <a href="/contact">Lab welcomes a question</a>.</p>
</div>

---

## 1. The problem Strata is built for

Three structural features of the critical raw materials rollout make an open, comparable record valuable now rather than later.

**The baseline is time-bound.** The information that defines "before" exists only until the first blast; after that it has to be reconstructed from the promoter's own impact assessment. A baseline captured in advance, by an independent party, from imagery that was already being collected for other purposes, is a public good.

**The method matters more than any single reading.** The same indicator reported by different authorities on different cadences, with different definitions of what counts as a disturbed hectare, cannot be compared. Strata's value depends on applying one method, publicly documented, to every site.

**The audience is not one audience.** Permitting authorities, Single Points of Contact, lenders, battery buyers, journalists and residents each need the same underlying numbers but will read them differently. A tool that serves one audience well often fails the others. Strata is built as a shared source of facts; interpretation is left to the reader.

---

## 2. What Strata measures

Every Strategic Project is monitored inside its own footprint and in three buffers at 500 m, 2 km and 5 km. The method page carries the full specification; the summary table below pairs each indicator with the equation that produces it.

<figure class="strata-indicator-figure">
  <img src="/assets/img/strata-indicator-schema.svg" alt="Schematic: a Strategic Project site shown as a central polygon with three concentric buffer rings at 500 metres, 2 kilometres and 5 kilometres, each ring annotated with the indicator computed inside it. Disturbed footprint inside the polygon. Ground motion inside the polygon and the 500 m ring. Water and tailings surface inside the polygon and the 500 m ring. Vegetation loss inside each of the three rings separately. Natura 2000 overlap computed as a subset of the 5 km ring. Downstream water colour computed in water bodies that lie downstream of the polygon.">
  <figcaption>The indicator schema. Each indicator is bound to a specific area so a reader always knows what the number refers to.</figcaption>
</figure>

### 2.1 Disturbed footprint

The hectares inside the monitoring polygon that have moved from a vegetated or stable land-cover class in the baseline composite to a bare, excavated or deposited class in the year under review.

<div class="eq-block">
  F<sub>y</sub> = (1 / N) × A<sub>pixel</sub> × Σ<sub>p ∈ P</sub> &nbsp;<strong>1</strong>[ ndvi(p, y) &lt; τ<sub>v</sub> ∧ bsi(p, y) &gt; τ<sub>s</sub> ]
</div>

<p class="eq-note">F<sub>y</sub> is the disturbed footprint in hectares in year y. P is the pixel set inside the polygon, A<sub>pixel</sub> is 0.01 ha (10 m × 10 m resolution), N is a seasonal normalisation factor. Thresholds τ<sub>v</sub> and τ<sub>s</sub> are calibrated per climate zone against the Maus et al. (2022) and Tang &amp; Werner (2023) reference footprints. <strong>1</strong>[·] is the indicator function (1 if the condition holds, 0 otherwise).</p>

### 2.2 Buffer vegetation loss

For each buffer b at 500 m, 2 km and 5 km, the share of buffer pixels that moved from a vegetated class in the baseline composite to a non-vegetated class in the latest composite.

<div class="eq-block">
  V<sub>b, y</sub> &nbsp;=&nbsp; Σ<sub>p ∈ B<sub>b</sub></sub> <strong>1</strong>[ veg(p, baseline) ∧ ¬veg(p, y) ] &nbsp;/&nbsp; |B<sub>b</sub>|
</div>

<p class="eq-note">V is reported in per cent and as hectares. The baseline land-cover reference is <a href="https://worldcover2021.esa.int/download">ESA WorldCover 2021</a>; the latest composite is a growing-season Sentinel-2 median after cloud and shadow masking.</p>

The share of V<sub>5 km, y</sub> that falls inside a [Natura 2000](https://sdi.eea.europa.eu/catalogue/srv/api/records/be2142b0-7dc4-42e3-afac-f7cc5f1a9ac6) site is reported separately so that any vegetation lost inside a designated protected area is visible immediately, rather than averaged into the buffer figure.

### 2.3 Water and tailings surface

The maximum and minimum seasonal surface area of standing water and wet tailings inside the polygon and the 500 m buffer, derived from a water index on Sentinel-2 and gap-filled with Sentinel-1 radar backscatter where cloud cover is persistent. The [JRC Global Surface Water](https://data.jrc.ec.europa.eu/dataset/jrc-gswe-global-surface-water-explorer-v1) record, built from Landsat imagery since 1984, establishes whether a water body on-site pre-dates the project.

<div class="eq-block">
  W<sub>y</sub><sup>max</sup> = max<sub>t ∈ year y</sub> &nbsp;Σ<sub>p ∈ P ∪ B<sub>500</sub></sub> <strong>1</strong>[ ndwi(p, t) &gt; τ<sub>w</sub> ∨ s1_backscatter(p, t) &lt; τ<sub>r</sub> ]
</div>

### 2.4 Ground motion

For sites in Copernicus Participating States, the maximum absolute line-of-sight velocity recorded inside the polygon and the 500 m buffer by the [European Ground Motion Service](https://land.copernicus.eu/en/products/european-ground-motion-service/egms-basic), expressed in millimetres per year.

<div class="eq-block">
  G<sub>y</sub> = max<sub>p ∈ P ∪ B<sub>500</sub></sub> &nbsp;|v<sub>LOS</sub>(p, y)|
</div>

<p class="eq-note">Points with |v| above a stated threshold (8 mm/yr by default for tailings-dam contexts) are flagged for review. Sites in third countries carry a dash rather than a number because EGMS does not cover them.</p>

### 2.5 Land converted

For every hectare that is now inside the disturbed footprint, the land-cover class it had in the baseline year. Reported as a breakdown by ESA WorldCover 2021 class (tree cover, grassland, cropland, wetland, shrubland, built-up, barren).

<div class="eq-block">
  L<sub>c, y</sub> = A<sub>pixel</sub> × Σ<sub>p ∈ F<sub>y</sub></sub> &nbsp;<strong>1</strong>[ worldcover(p, 2021) = c ]
</div>

### 2.6 Downstream water colour, experimental

A turbidity proxy on Sentinel-2 red and near-infrared reflectance in water bodies that lie downstream of the site, tested for feasibility in the 2027 pilot. It is reported with an explicit experimental tag or not reported at all; it is not published as an operational indicator unless it validates against ground truth.

<div class="callout c-paper">
  <p><strong>Alert thresholds.</strong> An alert is a disclosure, not a verdict. Each indicator carries a published threshold &theta;<sub>i</sub>; when the latest reading crosses it, Strata flags the site and names the indicator and the value. The language is "flagged for review, not a finding of non-compliance" everywhere, because surface change describes an observable; compliance is a legal determination that only the competent authority can make.</p>
</div>

---

## 3. Four use cases

Who the tool is for is as important as what it measures. Four audiences are the Lab's working design cases; each one has shaped a specific part of the interface and the methodology.

<figure>
  <img src="/assets/img/strata-use-cases.svg" alt="Four stacked panels, each with an icon and a one-line summary: Permitting authority (map plus a tick), Lender or DFI (map plus a portfolio grid), Battery buyer or recycler (supply chain arrow), Civil society or local council (community figures). Each panel points into the Strata interface with an arrow at a specific part of the screen it concerns.">
  <figcaption>Four audiences, each with a different starting question but the same underlying evidence.</figcaption>
</figure>

### 3.1 Permitting authorities and Single Points of Contact

**Starting question.** Is this site's actual disturbance consistent with what the environmental impact assessment set out?

Permitting staff and the national Single Points of Contact that the CRMA designates can compare a project's reported footprint against its latest surface measurement without commissioning new survey work. The three buffers mean an officer can see both the on-site expansion and whether it is bleeding into the surrounding landscape, including Natura 2000 overlap. The method and threshold values are published, so a defence or an objection to a Strata flag can be made in common language.

### 3.2 Lenders and development finance institutions

**Starting question.** Across my portfolio, which sites moved most this year, and did any of them cross a threshold I care about?

A lender holding exposure to a portfolio of projects across six or seven European countries cannot build its own satellite monitoring at a sensible cost. Strata gives it a consistent annual check across the full portfolio, under one method, with a short list of sites that moved materially since the last read. The CSV export per site plus the API in the Pro tier are built for this: due diligence files that cite the method version and the underlying imagery dates.

### 3.3 Battery makers, cathode producers and recyclers

**Starting question.** The sites behind my supply contracts are now in scope for due diligence. Which of them is the one that will be asked about first?

The due diligence obligations in the EU Battery Regulation apply from [18 August 2027](https://sustainablefutures.linklaters.com/post/102kymo/eu-regulation-delaying-due-diligence-rules-for-batteries-published-in-the-ojeu). A buyer who ships cells or packs into the EU has to be able to describe the extraction and processing sites in its supply chain, with evidence. Strata screens those sites against a public baseline the buyer did not commission, which is what independent assurance means in practice. The site code system is designed to be referenced from a bill of materials.

### 3.4 Civil society, journalists and local councils

**Starting question.** What has actually happened on the ground beside me since the project was granted a permit?

Residents of a village beside a new pit, a journalist following a specific project, a local council assessing the cumulative pressure on a protected landscape all currently ask this with uneven access to evidence. Strata gives them the same read a lender gets, under the same method, and routes them to the method page and the data sources so the number can be challenged on its own terms. The free tier covers every function needed to do this.

---

## 4. The interface, annotated

The screens below are mock-ups of the demo release; the live version is at [/strata-demo](/strata-demo).

### 4.1 The map

<figure>
  <img src="/assets/img/strata-1-sign-in.svg" alt="Strata sign-in mock-up on a dark panel: 'Know what changed on the ground', with eight numbered functions and a Free / Pro plan comparison." class="diagram">
  <figcaption>The free tier covers every indicator, every chart, data export and the right of reply.</figcaption>
</figure>

<figure>
  <img src="/assets/img/strata-2-map.svg" alt="Strata map screen: left column with totals, filters and the site list; central map of Europe with status-coloured dots sized by footprint; right-hand panel showing the French lithium site in detail." class="diagram">
  <figcaption>Pins carry status in colour and footprint in size. Filters dim non-matching pins; the active site takes a ring.</figcaption>
</figure>

### 4.2 A site page

<figure>
  <img src="/assets/img/strata-3-site-detail.svg" alt="Strata site page: an operating site with an open alert, four stat tiles, a disturbed-footprint chart with baseline dashed and works-start marked, and a baseline-against-latest footprint outline with a 1 km scale bar." class="diagram">
  <figcaption>Alerts name the threshold and are plainly tagged "flagged for review, not a finding of non-compliance." Promoter responses are linked from the page where they have been received.</figcaption>
</figure>

---

## 5. Partners

Strata is led by **Transitions Lab** in Delft, which writes the method, runs the field research that sits beside the satellite record and publishes the results. Two partners work on the project with us.

<div class="strata-partners">
  <div class="strata-partner">
    <div class="strata-partner-logo"><img src="/assets/logos/logo-pyropower.png" alt="Pyropower"></div>
    <h3>Pyropower</h3>
    <p>Pyropower contributes operating experience from the materials-and-energy side of the critical raw materials transition. The company's work on open-source thermochemical conversion gave the project team a working view of what a processing site actually looks like inside the fence, which has shaped the indicator thresholds for processing-stage sites and the land-cover classes the "built-up" category needs to split into when a smelter is involved.</p>
  </div>
  <div class="strata-partner">
    <div class="strata-partner-logo"><img src="/assets/logos/logo-social-innovation-europe.png" alt="Social Innovation Europe"></div>
    <h3>Social Innovation Europe</h3>
    <p>Social Innovation Europe anchors Strata's reach into the communities and civil society organisations who live with new extractive sites. Their network across EU Member States and the Western Balkans is how the Lab tests whether a reader at a local council or a journalist in a Natura 2000 municipality can actually use the tool for the question in front of them, and how the right-of-reply mechanism is being specified in cooperation with promoters.</p>
  </div>
</div>

<div class="callout c-paper callout--serif strata-testimonial">
  <h3>From a FIERCE project reviewer</h3>
  <blockquote>
    <p>"The thing that made Strata credible to us is that the method sits on the page beside the numbers. Our site operators disagreed with one of the thresholds, and the tool let them say so in a way that linked straight to the sheet the threshold was defined on. That is what independent monitoring looks like when it actually works, and it is why we moved it into the project's deliverables list."</p>
    <footer>Reviewer, FIERCE project (Horizon Europe)</footer>
  </blockquote>
</div>

<p class="eq-note">Strata is supported by the <strong>FIERCE project</strong> (Grant Agreement 101177496) under Horizon Europe. The EU emblem and acknowledgement will appear on this page once the Sub-grant Agreement is countersigned (SGA Article 18).</p>

---

## 6. Governance and limits

The method is version-controlled and published in full. The pilot runs on six sites selected to cover an extraction site before construction, operating extraction with tailings, a processing or recycling plant and one site outside the European Union. Each promoter is contacted before a site page is first published and may submit a factual response, which is linked from the page.

Strata does not measure emissions, water chemistry, dust, noise or community outcomes, and it cannot establish permit compliance. Ten-metre imagery misses small features and early earthworks. Ground motion data from EGMS covers Copernicus Participating States only, so third-country sites carry no ground motion indicator. These limits are stated on every page where the numbers appear, not only here.

---

## 7. Open questions the pilot will answer

- At what threshold does the vegetation-loss indicator produce a materially false flag in agricultural seasons, and what is the appropriate per-climate-zone calibration?
- Does the experimental downstream water-colour indicator validate well enough against ground truth to publish operationally?
- What is the right routing between a Strata flag and the Single Point of Contact in each Member State, and does the right-of-reply mechanism scale beyond a handful of sites?
- What is the smallest set of indicators that satisfies the EU Battery Regulation due diligence obligations without producing a false sense of comprehensiveness?

The 2027 pilot is designed to answer each of these in public, and the method page will be revised accordingly after.

---

*Return to the [Strata overview](/strata), [the web tool explainer](/strata-app) or the [full-screen app](/strata-demo). See the [method](/strata-method) for the complete specification and the [data sources](/strata-data-sources) for every licence and credit line. For a conversation about adding a site, running a custom indicator set or sitting Strata inside a lender's or buyer's due diligence process, see [Contact](/contact).*
