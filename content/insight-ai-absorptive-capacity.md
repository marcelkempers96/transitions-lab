§ / Insight · AI & Climate

# The Asymmetry Nobody Is Metering

*The debate about AI and climate is stuck on how much electricity data centres draw. New modelling suggests the decisive variable is different: which sectors are ready to convert AI into productivity, and the fossil economy has a forty-year head start.*

<p class="article-meta"><span class="article-date">22 August 2026</span> · <span class="article-reading-time">8 min read</span></p>

<figure>
<img src="/assets/img/insight-ai-absorptive-capacity-diagram.jpg" alt="Line-art diagram: an 'AI' chip with radiating pins on the left. A thick coral arrow leads to a red panel labelled 'Fossil economy' containing a refinery, a factory and an oil pumpjack. A thin dashed arrow leads to a yellow panel below labelled 'Clean economy' containing a wind turbine, a solar panel and a battery." class="diagram">
<figcaption>AI reaches the fossil economy first because that is the economy already built to absorb it. The clean economy has a forty-year head-start to close before the metering starts to move.</figcaption>
</figure>


## Why AI reaches the fossil economy first

Two things happened this month that belong in the same argument, and are almost never placed there.

Nvidia took a [minority stake in Cloverleaf Infrastructure](https://www.reuters.com/), a developer of power-ready sites for data centres (as reported), which works directly with utilities, energy companies and investors to secure electricity and land. Nvidia will also supply technology for optimising site selection, cooling, power and compute. It follows a separate one-and-a-half-billion-dollar investment in SB Energy. A chip company is moving down its own supply chain into electrons.

Separately, a peer-reviewed study in [*npj Climate Action*](https://www.nature.com/npjclimataction/) modelled artificial intelligence not as an electricity consumer but as a productivity amplifier operating across the whole energy economy. Under its scenarios, productivity improvements in fossil-fuel extraction can outweigh AI-enabled efficiency gains in renewables, [raising annual emissions by an estimated 0.47 to 1.8 gigatonnes](https://www.nature.com/npjclimataction/) of carbon dioxide. For AI to deliver a net reduction, the model finds that renewable-sector productivity improvements would need to be roughly four to five times greater than fossil-sector improvements.

Almost all public discussion of AI and climate is a metering exercise. Terawatt hours per data centre, power usage effectiveness, water withdrawal, the carbon intensity of the grid at the point of connection. These are measurable, which is most of why they are measured.

They are also the wrong denominator. The question is not how much energy AI consumes. It is which systems AI makes more productive, and the answer to that is not determined by policy intention. It is determined by which sectors are structurally ready to absorb it.

---

## What general-purpose technologies actually do

[Bresnahan and Trajtenberg](https://doi.org/10.1016/0304-4076%2894%2901598-T) gave economics the term *general-purpose technology* in 1995. The steam engine, electrification, the semiconductor. Three properties: pervasiveness across sectors, continuous improvement over time, and, decisively, the capacity to spawn complementary innovation in the sectors that adopt them.

That third property is where the actual value lives, and it is the one the current discussion skips. A general-purpose technology on its own produces very little. Electrification did not raise American manufacturing productivity by replacing steam engines with electric motors. [Paul David's well-known account of this](https://ideas.repec.org/a/aea/aecrev/v80y1990i2p355-61.html) shows the gains arrived roughly forty years later, once factories were physically redesigned around distributed power: single-storey layouts, machines arranged by process flow rather than by proximity to a driveshaft. The technology was available for decades before the complementary reorganisation caught up.

The implication is uncomfortable and precise. When a general-purpose technology arrives, it does not diffuse evenly. It lands first, and hardest, in the sectors that have already made the complementary investments needed to use it. Everyone else waits, sometimes for a generation.

So the honest question about AI and the energy transition is not a question about AI. It is a question about the readiness of the sectors on either side of it.

---

## Absorptive capacity, and who has been building it

Cohen and Levinthal's 1990 paper on [absorptive capacity](https://doi.org/10.2307/2393553) supplies the missing measure. A firm's ability to recognise the value of new external knowledge, assimilate it, and apply it commercially is a function of prior related investment. Absorptive capacity is cumulative and path-dependent. You cannot buy it in the year you need it.

Now compare the two sides.

<div class="callout c-coral">
  <span class="kicker">Fossil extraction</span>
  <p>Four decades building exactly the substrate AI requires. Three-dimensional seismic surveys and seismic inversion. Reservoir simulation at scale. Continuous drilling telemetry, measurement-while-drilling, downhole sensor arrays. Decades of well logs, structured, labelled, and retained because they were legally and commercially necessary to retain. Petrophysical models that are already computational. A workforce of engineers who have been running numerical optimisation on subsurface data since before the internet was a commercial product.</p>
  <p>Crucially, the value of an improvement is concentrated and immediately legible. A percentage point of recovery factor on a producing field has a number attached, and one owner receives it.</p>
</div>

<div class="callout c-cobalt">
  <span class="kicker">Renewables & efficiency</span>
  <p>A much thinner and much more fragmented estate. Data is younger, because assets are younger. It is distributed across thousands of small operators, developers, utilities and households rather than concentrated in a few dozen firms. Much of the highest-value application sits in domains where the data is institutional rather than technical: interconnection queue management, permitting, grid planning, demand response, tariff design. And the gains are diffuse. A percentage point of improvement in distribution-network utilisation is worth a great deal in aggregate and very little to any single actor with the capacity to fund the work.</p>
</div>

Set against that, the modelled requirement of a four-to-five-times productivity advantage for the renewable side is not a policy target. It is a description of a race between two competitors with radically unequal preparation.

<figure>
<svg viewBox="0 0 760 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="asym-title asym-desc" style="width:100%;height:auto;background:var(--paper);border:2px solid var(--ink);">
  <title id="asym-title">The absorptive-capacity asymmetry</title>
  <desc id="asym-desc">A comparison of the conditions that determine how quickly a sector converts AI into productivity. The fossil-extraction sector scores high on data maturity, value concentration, computational workforce and capital availability. The renewable and grid sector scores lower on each except policy attention.</desc>
  <text x="20" y="26" font-family="'Hanken Grotesk',sans-serif" font-size="13" font-weight="800" fill="#0A0A0A" letter-spacing="1.5">CONDITIONS FOR CONVERTING AI INTO PRODUCTIVITY</text>
  <line x1="20" y1="40" x2="740" y2="40" stroke="#0A0A0A" stroke-width="2"/>
  <rect x="300" y="56" width="18" height="12" fill="#EE5B22"/>
  <text x="326" y="66" font-family="'Hanken Grotesk',sans-serif" font-size="12" fill="#0A0A0A">Fossil extraction</text>
  <rect x="470" y="56" width="18" height="12" fill="#1F3F7A"/>
  <text x="496" y="66" font-family="'Hanken Grotesk',sans-serif" font-size="12" fill="#0A0A0A">Renewables & grid</text>
  <g font-family="'Hanken Grotesk',sans-serif" font-size="13" fill="#0A0A0A" font-weight="600">
    <text x="20" y="106">Maturity of the data estate</text>
    <text x="20" y="170">Concentration of the value of a gain</text>
    <text x="20" y="234">Computational engineering workforce</text>
    <text x="20" y="298">Capital available to the adopting firm</text>
    <text x="20" y="362">Policy attention & steering</text>
  </g>
  <g>
    <rect x="300" y="92" width="380" height="14" fill="#EE5B22"/>
    <rect x="300" y="110" width="120" height="14" fill="#1F3F7A"/>
    <rect x="300" y="156" width="400" height="14" fill="#EE5B22"/>
    <rect x="300" y="174" width="95" height="14" fill="#1F3F7A"/>
    <rect x="300" y="220" width="340" height="14" fill="#EE5B22"/>
    <rect x="300" y="238" width="170" height="14" fill="#1F3F7A"/>
    <rect x="300" y="284" width="360" height="14" fill="#EE5B22"/>
    <rect x="300" y="302" width="200" height="14" fill="#1F3F7A"/>
    <rect x="300" y="348" width="130" height="14" fill="#EE5B22"/>
    <rect x="300" y="366" width="330" height="14" fill="#1F3F7A"/>
  </g>
  <line x1="300" y1="84" x2="300" y2="388" stroke="#0A0A0A" stroke-width="1.5"/>
  <text x="300" y="406" font-family="'Hanken Grotesk',sans-serif" font-size="11" fill="#0A0A0A" opacity="0.7">Qualitative assessment, not measured data. Transitions Lab, 2026.</text>
</svg>
<figcaption>Policy attention is the one condition where the low-carbon side leads. Every other row describes a capability accumulated over decades, which is not the kind of thing a funding cycle can close.</figcaption>
</figure>

---

## Reading the Nvidia move through this lens

Vertical integration into power-ready land is a statement about where the binding constraint has moved. Access to accelerators was the scarcity story of 2023. Access to several hundred megawatts of firm, interconnected electricity, with a site and a utility agreement attached, is the scarcity story now. The stack has quietly become chips, then data centres, then electricity, then grids, then land, and the value is migrating down it.

Two consequences follow, and they pull in opposite directions.

**The first is competitive.** Interconnection queue positions, brownfield sites with existing grid capacity, and utility relationships are finite. They are also precisely what renewable developers need. When the best-capitalised industry on earth begins buying into that layer, it is bidding against the transition for the same scarce assets. The SB Energy investment complicates this usefully: SB Energy is a renewables developer, so some of the capital is flowing into generation rather than merely competing for it. The honest position is that both effects are real and their net sign is an empirical question rather than a rhetorical one.

**The second is structural.** If AI's climate effect runs through which sectors it makes productive, then the firms assembling the physical layer are also, incidentally, deciding who gets the compute. That is a steering decision being made through procurement rather than through policy, and nobody is currently measuring it as such.

---

## Where this leaves policy, and where it leaves evidence

Most regulatory energy is going into the efficiency of the compute: reporting requirements for data centres, power-usage-effectiveness targets, siting rules, clean-power procurement obligations. Reasonable measures, and if the *npj* modelling is directionally right, they address the smaller term.

The larger term is allocation. Which applications receive the compute, which sectors are helped to build the absorptive capacity they lack, and whether the complementary investments on the low-carbon side get made at all. This is a commercialisation problem before it is a technology problem, which is [familiar ground](/insight-eu-us). The precedent from electrification is not encouraging about waiting for this to happen on its own. Forty years is a long time to be right.

Three things follow for anyone funding, regulating, or researching in this space.

**Sectoral readiness is a measurable object and almost nobody measures it.** Data-estate maturity, workforce composition, and the concentration of the value of an improvement can all be assessed sector by sector. The same logic that sits behind [technology and societal readiness levels](/readiness-levels) applies here, and the readiness that matters is on the adopting side, not the technology side.

**The aggregate counterfactual is not recoverable, but the deployment-level one is.** Nobody will ever measure what global emissions would have been without AI. That is not a reason to stop measuring. It is a reason to measure at the level where a counterfactual can actually be constructed: specific deployments, specific sites, specific baselines, before and after. This is ordinary [impact measurement](/impact-measurement) applied to a domain that has so far preferred narrative to evidence.

**The distributional question is the one that will be asked last and matters most.** The productivity gains modelled here accrue to whoever owns the asset being optimised. Which is to say, mostly not to the countries where the extraction happens. The Lab's reading of [European capital flowing towards African growth](/insight-eu-africa) runs into the same gap, and it is a gap of evidence as much as of intention.

---

## What would show this reading to be wrong

Stated plainly, so it can be tested.

If frontier AI capability turns out to generalise well enough that a thin data estate stops being a barrier, the asymmetry narrows fast and this argument weakens considerably. If the highest-value low-carbon applications turn out to be institutional rather than technical, in permitting, queue management and grid planning, then the binding constraint is administrative capacity rather than data, and the correct intervention is public-sector capability rather than sectoral subsidy. If fossil productivity gains are absorbed by falling prices and demand response rather than by expanded extraction, the emissions arithmetic changes.

All three are open. None of them are settled by counting terawatt hours.

The Lab works on this at the boundary of [AI and digital systems](/expertise-ai-digital) and [energy access](/expertise-energy), and treats the question as an empirical one rather than a position. If you are funding work in this space and want the counterfactual built properly, [start a conversation](/contact).

---

## Sources

- Reuters, "Nvidia invests in Cloverleaf Infrastructure," 21 August 2026.
- *npj Climate Action*, "AI-driven productivity gains and global CO₂ emissions," August 2026.
- Bresnahan, T. and Trajtenberg, M. (1995), ["General purpose technologies: engines of growth?"](https://doi.org/10.1016/0304-4076%2894%2901598-T), *Journal of Econometrics* 65(1), 83–108.
- Cohen, W. and Levinthal, D. (1990), ["Absorptive Capacity: A New Perspective on Learning and Innovation"](https://doi.org/10.2307/2393553), *Administrative Science Quarterly* 35(1), 128–152.
- David, P. (1990), ["The Dynamo and the Computer: An Historical Perspective on the Modern Productivity Paradox"](https://ideas.repec.org/a/aea/aecrev/v80y1990i2p355-61.html), *American Economic Review* 80(2), 355–361.

---

*This is an independent insight piece by Transitions Lab. For the methodological spine, see the [BRW framework](/brw); for the four-quadrant reading of state capacity and niche success, see [Four Ways a Transition Lands](/insight-transitions-outcomes). To discuss a study, see [Contact](/contact).*

<div class="article-nav">
  <a class="article-nav-card" href="/articles">
    <span class="anc-label">Read more</span>
    <span class="anc-title">Articles &amp; insights</span>
    <span class="anc-cta">See all articles &rarr;</span>
  </a>
  <a class="article-nav-card" href="/case-studies">
    <span class="anc-label">See it in the field</span>
    <span class="anc-title">Case studies</span>
    <span class="anc-cta">See all case studies &rarr;</span>
  </a>
</div>
