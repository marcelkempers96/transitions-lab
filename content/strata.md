§ / Tool

# A satellite lifecycle card for every closed mine waste site

*Strata gives each closed mine waste site a satellite lifecycle card: what it looks like now, how it has changed over ten years, how big the heap is, who lives nearby, and what each of the three pathways (leave and monitor, rehabilitate, reprocess) would involve. Pilot in the Iberian Pyrite Belt.*

<p class="article-meta"><span class="article-date">30 October 2026</span> · <span class="article-reading-time">5 min read</span></p>

<nav class="strata-pages" aria-label="Strata pages">
  <strong class="is-current">Overview</strong>
  <a href="/strata-app">Web tool</a>
  <a href="/strata-demo">Launch app &rarr;</a>
  <a href="/strata-method">Method</a>
  <a href="/strata-data-sources">Data sources</a>
  <a href="/strata-paper">Companion paper</a>
</nav>

<p class="strata-wordmark"><img src="/assets/logos/strata-lockup-black.svg" alt="Strata — a satellite lifecycle card for every closed mine waste site"></p>

Mining and quarrying produced 22.7% of the roughly 2.2 billion tonnes of waste generated in the EU in 2022 ([European Parliament](https://www.europarl.europa.eu/topics/en/article/20180328STO00751/sustainable-waste-management-what-the-eu-is-doing)). Most of that sits in heaps and tailings ponds across the continent, around sites that stopped operating decades ago. [Article 27 of the Critical Raw Materials Act](https://meetingorganizer.copernicus.org/EGU26/EGU26-9857.html) now requires Member States to build a database of these facilities, with location, area, waste volume, operator and raw material content, to judge whether critical raw materials can be recovered. Finland is assigning the task to its geological survey from [1 November 2026](https://www.gtk.fi/en/current/geological-survey-of-finland-assigned-tasks-under-the-eu-critical-raw-materials-act/).

Three people are now making the same call for each site, with different evidence of different quality. A geological survey needs to decide which closed facility deserves field sampling first. A municipality next to a heap needs to understand what each pathway would mean for the landscape and the people living beside it. A reprocessing company needs to shortlist the sites worth investigating for secondary critical raw materials. Each currently reasons from a different map.

Strata is the shared evidence base. One open method per site, satellite indicators that are the same thing in Portugal and in Sweden, and a lifecycle card that reads the same way across audiences.

## What a lifecycle card holds

Each site opens on a single scrollable page.

**Key facts.** Waste area in hectares (from the polygon). Volume proxy in cubic metres (from the Copernicus DEM). Bare ground now and vegetation now (from the latest Sentinel-2 composite). People within 1 km (from GHSL). Red water as a share of water on site (from the acid-drainage colour index).

**Now from space.** A live Sentinel-2 Level-2A scene for the site, classified pixel-by-pixel into vegetation, bare ground, bare with an iron oxide signal, water and red or orange water. The classes use the formulas in the [method page](/strata-method); the implementation is in [`strata-core.js`](https://github.com/marcelkempers96/transitions-lab/blob/main/assets/strata/core.js) and ships with twenty-six unit tests.

**Ten years of change.** A line chart of vegetation %, bare %, iron signal % and red water %, from a 2017 baseline summer composite onwards. A natural recovery clock reads whether the site is recovering, stable or declining, based on the Theil-Sen trend of vegetation cover, and gives the number of years to reach 50% vegetation at the current trend.

**Three pathways.** Leave and monitor, rehabilitate, reprocess and rehabilitate. Each column shows the satellite facts that matter for that pathway. The lifecycle view (life-cycle assessment numbers from the FIERCE service S1) sits beside them, labelled as under way until the comparison is published in June 2027.

**Around the site.** People within 1 and 5 km, Natura 2000 overlap and distance, nearest watercourse, land cover in the 500 m ring, ground motion from the European Ground Motion Service, and the long-term water history from the JRC Global Surface Water record.

**What people here told us.** A section that stays empty until the FIERCE service S2 fieldwork lands in 2027.

**Export and cite.** One click produces a CSV row keyed to the CRMA Article 27 database fields; another produces the site's GeoJSON polygon. Fields Strata cannot measure from space (operator, measured metal content) are left empty by design, never estimated.

## Pilot

Eight sites in the Iberian Pyrite Belt (Portugal and Spain, pyrite-rich volcanogenic massive sulphide deposits with public acid-drainage legacy) plus two transfer sites in Germany (the Bollrich tailings pond at Rammelsberg) and Sweden (the Falun UNESCO mining landscape). The seed register is in `sites.seed.geojson`.

The transfer sites are intentional: Bollrich is cloudier and the surface flatter than most Portuguese sites; Falun carries snow in winter and heritage constraints. Any method whose numbers do not travel to both would not travel to the next region either.

## Not what Strata does

Strata does not estimate metal grades or tonnages. It does not judge permit compliance. It takes no position on any project. The language rule is explicit: flags describe what the satellite shows, never what it means. The copy ends each flag, on first appearance, with "This is a signal for follow-up, not a finding."

## Supported by

Strata is led by Transitions Lab in Delft. Partners: Pyropower (materials-and-energy side, processing-stage experience); Social Innovation Europe (community reach across Member States and the Western Balkans).

<!--
EU FUNDING ACKNOWLEDGEMENT: activate ONLY after the FIERCE Sub-grant Agreement is signed (SGA Article 18).

Funded by the European Union. Views and opinions expressed are those of the author(s) only and do not necessarily reflect those of the European Union or European Commission. Neither the European Union nor the granting authority can be held responsible for them.

Strata is supported by the FIERCE project (Grant Agreement 101177496) under Horizon Europe.
-->

---

*See the [web tool](/strata-app) for a tour, [launch the app](/strata-demo), read the [method](/strata-method) for the equations, the [data sources](/strata-data-sources) for every licence, or the [companion paper](/strata-paper) for the longer argument.*
