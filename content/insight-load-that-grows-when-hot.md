§ / Insight, Energy Systems

# The Load That Grows When It Is Hot

*Malaysian data centres took a record 9.3 per cent of electricity during one hot week in August, against roughly 7 per cent on average. A load that rises with temperature is not baseload. It is peak-correlated demand, and grid planning treats it as the opposite.*

<p class="article-meta"><span class="article-date">8 September 2026</span> · <span class="article-reading-time">5 min read</span></p>

<figure>
<img src="/assets/img/insight-load-that-grows-when-hot-hero.jpg" alt="Line-art scene: a long low data centre building with rooftop cooling units, drawn beneath a high sun with heat lines rising; a thermometer stands beside the building with its column high, and a transmission tower behind it carries lines that sag visibly in the heat towards a distant town." class="diagram">
<figcaption>Everything in this picture gets harder on the same afternoon.</figcaption>
</figure>


## Data centres are planned as flat demand, and Malaysia has just shown they are not

Malaysian data centres accounted for a record 9.3 per cent of national electricity consumption during one week in August, against roughly 7 per cent on average across the year, as higher temperatures drove additional cooling demand (as reported). Authorities estimate data centres could take as much as 31 per cent of Peninsular Malaysia's electricity by 2035, and that the country may need a further 9 gigawatts of gas-fired capacity by 2032 even while phasing out coal.

The percentage is the headline. The mechanism behind it is the story, and it undermines an assumption sitting inside almost every grid plan currently being written in Southeast Asia, the Gulf, India and East Africa.

---

## Baseload is the wrong word

Data centre demand is routinely described as flat, constant and around the clock. That description is used to argue that data centres are good customers, because they improve utilisation of generation and network assets that would otherwise sit idle overnight.

The information technology load genuinely is close to flat. The cooling load is not.

Cooling energy depends on the difference between the temperature the equipment needs and the temperature outside. As ambient temperature rises, the same servers require more work to cool, chiller efficiency falls, and consumption climbs. In a tropical climate, the gap between a mild week and a hot one is large, and Malaysia has just quantified it: a jump from roughly 7 per cent to 9.3 per cent of national consumption is more than a third of additional load appearing on the same equipment doing the same computing.

So the correct description is a flat base with a weather-dependent addition on top, and the addition arrives on hot days.

**Which is the same day the rest of the system peaks.**

Residential and commercial air conditioning across the country is doing exactly the same thing for exactly the same reason. Data centre cooling demand is therefore positively correlated with system peak demand, and a load that is correlated with peak is the most expensive kind of load a system can acquire.

The distinction is not academic. A perfectly flat load lets a utility spread fixed costs over more hours without new peak capacity. A peak-correlated load requires new peak capacity, which is the most capital-intensive thing a power system buys and the least utilised. Two customers taking the same annual energy can impose entirely different capacity costs, and the tariff structures used to attract data centre investment across the region generally do not distinguish between them.

---

## The feedback that makes it worse

There is a loop here worth setting out explicitly, because each step is individually unremarkable and the sequence is not.

Higher ambient temperature raises cooling demand. Higher cooling demand raises electricity consumption. In Malaysia's case, the projected response is additional gas-fired capacity, up to 9 gigawatts by 2032, because gas is what can be built at that speed and can follow load. Additional gas generation adds emissions. Emissions contribute, at a global scale, to the warming that raised the ambient temperature.

<figure>
<img src="/assets/img/insight-load-that-grows-when-hot-loop.jpg" alt="Diagram: five labelled objects arranged in a clockwise loop. A sun with heat lines labelled 'higher ambient temperature', a rooftop chiller unit labelled 'more cooling energy', a meter dial labelled 'more electricity', a gas turbine and factory labelled 'more firm capacity built', and a small emissions cloud labelled 'more emissions'. The final closing arrow from emissions back to the sun is drawn lighter and longer, annotated 'slower, larger, and not on anybody's balance sheet'. Beside the loop, a small water droplet with a downward arrow labelled 'and the same story for water'." class="diagram">
</figure>

No single link in that chain is surprising. The consequence is that the electricity requirement of a data centre built in a hot climate is not a fixed number. It is a number that rises over the asset's life, in the same direction as the climate, and both the grid plan and the developer's cost model typically hold it constant.

There is a second-order version affecting water. Evaporative cooling is efficient and it consumes water, and it consumes more of it in exactly the conditions when water is scarcest. A facility designed around evaporative cooling in a drought-exposed catchment has a demand profile correlated with drought, which is the same structural problem in a different resource.

<aside class="tl-box">
<p><strong>The efficiency metric everyone uses is measured at the wrong moment.</strong></p>
<p>Data centre efficiency is conventionally reported as power usage effectiveness: total facility energy divided by the energy delivered to the computing equipment. A figure near one is excellent, and operators publish annual averages.</p>
<p>An annual average is the wrong statistic for a quantity that varies with weather. The number a grid planner needs is not the mean, it is the value on the hottest afternoon of the year, because that is the moment the system has to be sized for. A facility with an excellent annual average and a poor hot-day figure looks efficient in a sustainability report and expensive in a capacity plan.</p>
<p>Publishing the hot-day figure alongside the annual one would cost operators nothing, since they already hold the data at fifteen-minute resolution. It would tell a utility what it is actually being asked to serve, and it would let a regulator distinguish between facilities that invested in cooling designs resilient to heat and those that optimised for the average.</p>
<p>Nobody is asking for it. It is the single cheapest disclosure improvement available in this sector.</p>
</aside>

---

## What follows for the region

Southeast Asia is acquiring data centre load quickly, and the tariffs and connection agreements being signed now will govern for a decade or more. Four things are decided in those documents and are worth deciding deliberately.

**Whether the tariff prices coincident peak.** A demand charge based on a facility's contribution at system peak, rather than on its annual energy, would price the actual cost imposed. This is standard practice for large industrial customers in many systems and it is frequently waived to attract data centre investment.

<figure>
<img src="/assets/img/insight-load-that-grows-when-hot-bills.jpg" alt="Chart, 'Identical bills, very different costs'. Two 24-hour load profiles side by side. Left blue profile perfectly flat across the day, labelled 'truly flat load'. Right coral profile flat for most of the day with a pronounced bulge in the late afternoon around 18:00, labelled 'flat load plus cooling' with a subtitle 'the same annual energy, and new capacity required'. Vertical dashed cobalt line through both charts at 18:00 labelled 'system peak'. Footnote: Schematic. Transitions Lab, 2026." class="diagram">
</figure>

**Whether flexibility is contracted rather than hoped for.** Some computing can be shifted in time or place. Some cannot. A connection agreement that specifies how much load can be curtailed or deferred on a system peak day, and at what compensation, converts an unpriced risk into a contracted service. We described [the missing market for flexibility](/insight-paying-for-what-we-curtail) in a Kenyan context, and here the counterparty is large, sophisticated and entirely capable of participating if there is a product to buy.

**Whether the cooling design is specified against a hot year, not an average one.** This is an engineering decision with a grid consequence, and the grid is not usually in the room when it is made.

**Whether the generation being built to serve it is the generation the country wanted.** Nine gigawatts of gas commissioned to serve a load that arrives faster than clean firm capacity can be built is a thirty-year asset acquired to solve a five-year timing problem, and it will still be there long after the timing problem has passed. The [customers who can build their own supply](/insight-customers-who-can-leave) have options here that the rest of the system does not.

---

## The uncomfortable geography

There is a pattern in the siting logic that deserves stating plainly.

Data centres are being attracted to tropical and subtropical countries by cheap land, cheap power, growing digital populations and welcoming policy. Those are the countries where cooling is most expensive, where grids are most stressed at peak, where the climate is warming into the range that makes cooling harder, and where the fiscal capacity to build peaking generation is most constrained.

The same facility in a cool climate would consume materially less electricity for the same computation. That is not an argument against hosting compute in hot countries, which have every right to compete for the investment and real reasons to want it. It is an argument for pricing the difference honestly rather than absorbing it in a national tariff, because absorbing it means the cost lands on every other customer.

That is the [defection dynamic in reverse](/insight-customers-who-can-leave): rather than a large customer leaving the grid, a large customer arrives on terms that shift cost onto the customers who cannot leave.

---

## What would be worth measuring

**Hot-day power usage effectiveness, published alongside the annual figure.** The disclosure described in the box above, and the most useful single number in this whole discussion.

**Data centre contribution to system peak, as a share of total load at the peak hour.** Different from annual share, and it is the number that drives capacity investment. Malaysia's 9.3 per cent weekly figure is a step towards this and not the same thing.

**Water withdrawal against catchment stress, at the same time resolution.** Annual water figures conceal the correlation entirely.

**What the tariff actually charges for.** Energy, capacity, or both, and whether the peak component was discounted to win the investment. This is public information in most jurisdictions and nobody has compiled it across the region.

A flat load is a gift to a power system. A load that is flat on mild days and much larger on hot ones is something else, and the word being used for it is doing real damage to the planning it informs.

The Lab works on this in [energy access](/expertise-energy) and [AI and digital systems](/expertise-ai-digital), and on what a large industrial arrival means for the system around it through [entering a new context](/entering-a-new-context).

If you are negotiating a connection agreement or a tariff for a large temperature-sensitive load, [tell us what you need to know](/contact).

---

## Sources

- Reporting on Malaysian data centre electricity consumption, cooling demand and generation planning (as reported), September 2026.

---

*This is an independent insight piece by Transitions Lab. For the Lab's applied work, see [Energy Access & Systems](/expertise-energy). See also [Paying for Power You Curtail](/insight-paying-for-what-we-curtail) on why flexibility is valuable everywhere and remunerated almost nowhere, [The Customers Who Can Leave](/insight-customers-who-can-leave) on how large customers shift cost onto those who cannot, and [Standing in the Same Queue](/insight-same-queue) on the physical equipment constraint underneath all of this. To discuss a study, see [Contact](/contact).*

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
