§ / Insight, E-Mobility

# A Thousand Cars, One Risk

*Tesla put around a thousand driverless Cybercabs on Austin streets this week and wants other companies to buy fleets of them. A taxi fleet with drivers is a thousand independent risks. A robotaxi fleet is one risk repeated a thousand times, and that is a different asset entirely.*

<p class="article-meta"><span class="article-date">6 September 2026</span> · <span class="article-reading-time">11 min read</span></p>

<figure>
<img src="/assets/img/insight-a-thousand-cars-one-risk-hero.jpg" alt="Line-art comparison: on the left a row of taxis each with a distinct small driver figure at the wheel, drawn with slight variations; on the right an identical row of driverless two-seater vehicles, all exactly the same, connected upward by thin dashed lines to a single cloud-shaped software icon above them." class="diagram">
<figcaption>On the left, a thousand drivers who make different mistakes. On the right, one system that makes the same one.</figcaption>
</figure>


## What actually changes when the driver comes out of the taxi

Tesla began commercial deployment of the Cybercab in Austin on 3 September, with [around a thousand vehicles that have no steering wheel, no pedals and no mirrors](https://electrek.co/2026/09/04/tesla-cybercab-nhtsa-investigation-fmvss-certification/). Public rides opened the following evening. Within hours of the launch, the National Highway Traffic Safety Administration [opened an Audit Query, AQ26002, from its Office of Defects Investigation](https://electrek.co/2026/09/04/tesla-cybercab-nhtsa-investigation-fmvss-certification/), examining how Tesla certified a vehicle without conventional manual controls.

The regulatory position is unusual and worth stating precisely. NHTSA does not pre-approve vehicles. Tesla [self-certified that the Cybercab complies with federal motor vehicle safety standards rather than applying for an exemption](https://www.axios.com/2026/09/04/tesla-cybercab-launch-austin), and the agency has confirmed [no exemption request has been filed](https://www.axios.com/2026/09/04/tesla-cybercab-launch-austin). The reason is capacity. The exemption route [caps production at 2,500 units a year](https://finance.yahoo.com/news/elon-musk-betting-teslas-future-133110784.html), and Tesla has built for [125,000](https://www.axios.com/2026/09/04/tesla-cybercab-launch-austin). NHTSA's administrator, Jonathan Morrison, framed the audit carefully, saying the agency [supports the safe development and deployment of automated vehicles](https://techcrunch.com/2026/09/04/feds-launch-investigation-into-teslas-cybercab-deployment/) while needing to establish that the law has been followed.

Most of the coverage has asked whether this is legal. That question will be settled by lawyers within a year.

The question that will still matter in five years is different, and it follows from something Tesla appears to want: [fleet owners buying Cybercabs to run their own robotaxi services](https://electrek.co/2026/09/04/tesla-cybercab-nhtsa-investigation-fmvss-certification/) rather than Tesla operating every vehicle itself. That is a specific commercial proposition, and almost nobody has examined what is actually being sold.

---

## Start by conceding the safety argument

It is tempting to treat driverless vehicles as a safety story. The evidence increasingly says that is the wrong argument to have.

Waymo published research with the reinsurer Swiss Re analysing liability claims across [25.3 million fully autonomous miles](https://waymo.com/blog/2024/12/new-swiss-re-study-waymo/), compared against human baselines drawn from [over 500,000 claims and more than 200 billion miles of exposure](https://waymo.com/blog/2024/12/new-swiss-re-study-waymo/). It found an [88 per cent reduction in property damage claims and a 92 per cent reduction in bodily injury claims](https://waymo.com/blog/2024/12/new-swiss-re-study-waymo/). The method was published in *Heliyon*, and its choice of liability claims rather than police reports is deliberate: claims data has [more consistent reporting standards and captures non-collision injuries that police reports miss](https://arxiv.org/pdf/2309.01206).

Take that seriously. On the available evidence, a mature autonomous system appears to be substantially safer per mile than a human driver.

And yet the sentence that best captures the problem comes from a lawyer rather than an engineer. Chris Hagan, an attorney at Chain Cohn Clark, put it plainly: ["Safer on average is not the same as safe in every moment."](https://www.chainlaw.com/safer-than-humans-what-crash-data-from-robotaxis-and-autonomous-vehicles-really-means-for-road-safety/) He was making a point about accountability. It is also, precisely, a point about statistics.

**A lower average is not a smaller risk. It is a differently shaped one.** That distinction is the whole of this article, and it determines who can own a robotaxi fleet, who will insure it, and how fast any of this can scale.

---

## The driver was holding a risk, not just a wheel

Consider what a conventional taxi fleet is, financially.

A company with a thousand cars and a thousand drivers holds a thousand largely independent risks. Drivers make different mistakes, at different times, for different reasons. One is tired on a Tuesday. Another misjudges a junction in October. A third has an unblemished record for twenty years.

Their errors are uncorrelated, and that independence is not a detail. It is the basis on which motor insurance functions at all. Pooling works because losses are independent, so the average is predictable even though any individual outcome is not. An insurer can price a thousand drivers with confidence precisely because they will not all crash on the same afternoon.

Now remove the drivers and replace them with one system, identically installed, identically updated, running on identical vehicles.

**The thousand independent risks become one risk instantiated a thousand times.**

<figure>
<img src="/assets/img/insight-a-thousand-cars-one-risk-distributions.jpg" alt="Chart, 'Two fleets, the same expected loss'. Two distribution curves side by side sharing a horizontal axis labelled 'losses in a single year'. Left curve narrow and tall in cobalt, labelled 'a thousand drivers: independent errors'. Right curve low and very wide in coral with a long tail extending to the right edge, labelled 'a thousand identical vehicles: one software defect'. Vertical hairline at the same point on both curves labelled 'identical mean'. Annotation over the coral tail: 'this is the part an insurer prices'. Footnote: Schematic. Transitions Lab, 2026." class="diagram">
</figure>

If the software misreads a particular combination of low sun, roadworks and an unusual junction, it does not misread it in one vehicle. It misreads it in every vehicle that meets that combination, on the same day, across the fleet, and across every other fleet running the same build. A defect is not an incident. It is a fleet-wide event, and potentially a nationwide one.

This has a name in insurance and it is not new. Baruch Berliner's [*Limits of Insurability of Risks*](https://openlibrary.org/books/OL4273613M/Limits_of_insurability_of_risks) set out the criteria that determine whether a risk can be carried by a private market at all, and independence of losses is among them, because independence is what allows the law of large numbers to operate. Recent work applying those criteria to artificial intelligence compresses them into six tests and treats [loss independence and a bounded maximum loss as the two that novel technology risks most often fail](https://arxiv.org/pdf/2605.18784).

<figure>
<img src="/assets/img/insight-a-thousand-cars-one-risk-berliner.jpg" alt="Chart, 'What autonomy does to insurability'. Six horizontal rows labelled loss frequency, assessability, moral hazard, economic feasibility, independence of losses, bounded maximum loss. The first four have short right-pointing sky arrows under a heading 'improves'. The last two have heavier left-pointing coral arrows under a heading 'degrades'. Footnote: Criteria after Berliner (1982), as compressed in recent work on AI risk. Transitions Lab, 2026." class="diagram">
</figure>

Autonomy improves several of Berliner's criteria at once. Loss frequency falls. Assessability improves, because a vehicle that records everything produces better evidence than a driver's recollection. Moral hazard largely disappears.

And it degrades the two that decide whether a market exists at all: independence, and the ceiling on a single loss event.

<aside class="tl-box">
  <p><strong>The precedent is cyber, and it took twenty years.</strong></p>
  <p>This is not the first time a technology has arrived with excellent average performance and correlated failure. Cyber risk did the same thing, and the insurance industry spent two decades working out how to carry it.</p>
  <p>The Geneva Association's <a href="https://www.genevaassociation.org/sites/default/files/research-topics-document-type/pdf_public/ga2014-if14-biener_elingwirfs.pdf">assessment of cyber insurability</a> applied Berliner's criteria directly and found the same two failing. Losses are interdependent because everybody runs the same systems, and the maximum possible loss from a single event is very hard to bound. The market that eventually emerged is not a straightforward extension of property insurance. It is smaller than the exposure, priced conservatively, and full of exclusions written precisely around the correlated part.</p>
  <p>The uncomfortable implication for autonomous fleets is that the equivalent market may take years to form, and that when it does it may exclude the software defect which is the entire reason the correlation exists. A fleet owner reading their policy in 2030 could find they are insured against everything except the one thing capable of grounding the fleet.</p>
</aside>

Nobody should read any of this as a claim that autonomous vehicles are dangerous. They may well be considerably safer, and if they are, the expected loss falls. The argument is about the shape of the distribution rather than its mean. A safer fleet with correlated failures can be harder to insure than a more dangerous fleet with independent ones, and that is not intuitive to anybody whose experience is running taxis.

---

## What a fleet owner would actually be buying

Set the proposition out plainly from the buyer's side. A company purchases two hundred Cybercabs and operates a local robotaxi service.

**The asset's safety performance is determined by someone else, continuously.** The vehicle's behaviour is a function of software updated over the air by the manufacturer. The fleet owner cannot inspect it, cannot decline an update in any meaningful commercial sense, and cannot audit the change. In a conventional fleet, the operator controls maintenance, hiring, training and supervision, which are the levers that determine risk. Here, those levers do not exist.

**The risk cannot be diversified within the fleet.** Buying more vehicles does not reduce variance, because every vehicle carries the identical exposure. The usual defence against operational risk, which is scale, does not work.

**The regulatory status of the asset is unresolved.** An open federal audit into the certification of a vehicle is not a normal condition of purchase, and if the certification position changes, the exposure falls on whoever owns the vehicles.

**The residual value depends on the manufacturer's continued support.** A vehicle with no steering wheel cannot be redeployed as anything else. Its second-hand value is entirely contingent on the software service continuing, which makes it close to the most asset-specific vehicle ever sold.

<figure>
<img src="/assets/img/insight-a-thousand-cars-one-risk-controls.jpg" alt="Diagram: at the centre, a small depot with four identical driverless two-seater vehicles parked outside, labelled 'the fleet owner's balance sheet'. Radiating outward, four dashed lines to four coral boxes outside a dashed boundary, labelled 'software behaviour, updated remotely', 'certification status', 'residual value', 'recall decisions'. Inside the dashed boundary, three sky-blue boxes labelled 'cleaning', 'charging', 'repositioning'. Caption beneath: inside the line, what the owner controls." class="diagram">
</figure>

Together, this is a highly specific asset, carrying correlated risk, controlled by a counterparty, in an unresolved regulatory position. It is the same structural situation we described for [a charging network dependent on one platform](/insight-anchor-tenant), and it is sharper here, because a charging point can serve another customer and a Cybercab cannot be driven.

So the questions a prospective fleet owner should ask are financial rather than technical. Who will insure this, at what price, and with what exclusion for software defect. Who will lend against it, and at what advance rate. What happens to the payment obligations if the fleet is grounded for a week by a regulator or a recall. And what contractual recourse exists if the software's behaviour changes and utilisation falls.

There is already a signal in the claims data. Verisk's 2025 trends reporting found that claims involving autonomous vehicles [rose from around a hundred in 2021 to more than four hundred in 2025](https://gallowaylawfirm.com/the-road-ahead-for-autonomous-vehicles-liability-insurance-and-risk/). That is a small absolute number attached to a rapidly growing fleet, and it is exactly the period in which an insurer learns what it is pricing.

<aside class="tl-box">
  <p><strong>The reinsurer may set the pace, not the regulator.</strong></p>
  <p>Everybody is watching NHTSA. It may be the wrong institution to watch.</p>
  <p>In cyber, insurers ended up functioning as de facto regulators. Because they decided what to cover, they effectively decided which security practices were mandatory, and they did it faster and far more specifically than any legislature managed. Scholarship on cyber insurance describes underwriters translating a contested risk into concrete standards that firms then had to meet in order to trade at all.</p>
  <p>The same mechanism is available here. A regulator can permit a robotaxi fleet. Only an insurer can make it financeable, and only a reinsurer can make that insurer comfortable with the correlated tail. If the capacity is not there, the vehicles are legal and unbankable, which for a fleet operator amounts to the same thing as prohibited.</p>
  <p>Which raises a question worth sitting with. If the effective rate limit on autonomous mobility turns out to be reinsurance capacity, then the pace of one of the largest urban transformations of the century will be set in Zurich and Munich, by people with no public mandate and no obligation to explain themselves.</p>
</aside>

---

## Europe has answered part of this, and it is the opposite of the usual story

On [9 December 2026](https://www.clearygottlieb.com/news-and-insights/publication-listing/the-new-eu-product-liability-reform-addressing-the-digital-age), three months from now, the revised European Product Liability Directive takes effect for products placed on the market after that date. [Directive (EU) 2024/2853](https://regulations.ai/regulations/RAI-EU-NA-E2LDPXX-2024) redefines a product to include software and artificial intelligence systems, keeps strict liability as its core principle, and means a claimant [no longer needs to establish fault where a defective product causes harm](https://www.lawyer-monthly.com/2026/06/eu-product-liability-directive-ai-software-liability-risks/). The liability cannot be excluded by contract.

Read that against the fleet ownership question and the effect is striking. In Europe, a defect in autonomous driving software is a defect in a product, and the manufacturer carries strict liability for it. A fleet owner's exposure is bounded by a legal regime rather than by whatever a supply agreement happens to say.

That is precisely the certainty an insurer needs in order to price the correlated tail, and precisely the certainty a lender needs in order to advance against the asset.

So the familiar framing, in which Europe regulates while the United States deploys, may be inverted here. A liability regime that clearly assigns software defects to the manufacturer could make third-party robotaxi fleet ownership more financeable in Europe than in a jurisdiction where the allocation is contested case by case. Law firm analysis of the directive is [explicit that it will directly affect autonomous vehicle developers](https://www.reedsmith.com/en/perspectives/2025/10/the-new-eu-product-liability-key-implications-autonomous-vehicle), and the transposition deadline arrives before most European robotaxi deployment does.

Whether it plays out that way is an empirical question, and it is worth watching, because it would be the first clear case of European liability law functioning as a deployment enabler rather than as a brake.

---

## Shenzhen has been running this for years, and almost nobody in the Western conversation mentions it

Any argument about robotaxi deployment that starts in Austin is starting in the wrong place. Shenzhen has commercial fully-driverless operations from multiple operators including [AutoX](https://www.autox.ai/), which received the Pingshan district commercial permit in 2021, [Baidu's Apollo Go](https://en.wikipedia.org/wiki/Apollo_Go), [Pony.ai](https://pony.ai/) and [WeRide](https://www.weride.ai/), running for years across designated zones and across other Chinese cities including Wuhan, Beijing and Guangzhou (as reported).

The Western robotaxi conversation almost never references this, which is a strange omission given that a working commercial deployment at scale is exactly the evidence base the argument turns on. Some of the silence is language and a walled information environment. Some of it is that Chinese operators publish little of the insurance and liability detail that would make the comparison directly usable. And some of it is that the model itself is structurally different, in ways that matter for the questions this article has been asking.

Three differences stand out.

**The operator holds the balance sheet, not a third-party buyer.** The Chinese deployment is overwhelmingly operator-run rather than sold to independent fleet buyers to run their own local services. That collapses the specific problem this article is about, a fleet owner holding correlated risk they cannot control, into a more familiar problem of a single operator carrying its own exposure. The insurability question does not disappear, but it stops being a market-formation question.

**Liability is settled by state alignment rather than by law.** Municipal permits, state-adjacent data infrastructure and state-aligned insurers sit behind the deployment in a way that no equivalent structure sits behind Austin. Whether that is a durable answer or a temporarily-suspended question is not obvious, but it is a very different arrangement from a self-certified vehicle running in a jurisdiction where the certification is under audit.

**The data question is closed.** Chinese fleets record everything and share it with the state. Whether and how it also reaches insurers is not public. A Western observer trying to price the correlated tail from Chinese claims data cannot, and neither can a Western regulator learning from Chinese operational experience.

None of that makes Shenzhen a distraction. It means the Chinese case answers the insurability question by removing it from the private market entirely, which is a genuine answer and not a transferable one. It is worth watching precisely because it is the closest thing to a working long-run robotaxi economy that anywhere has, and it does not use the model the Cybercab proposition assumes.

---

## Three pathways, and who ends up holding what

The robotaxi is one of at least three routes an electric taxi transition can take, and all three are running simultaneously in different regions. The useful comparison is not which technology is better. It is who ends up holding each thing that has to be held.

**The platform model.** A ride-hailing platform adds electric vehicles across its markets while drivers remain independent or partner-owned. The driver holds the labour and often the asset. The platform holds demand and the data. Risk stays distributed and independent, and so does income.

**The integrated fleet model.** A company owns the vehicles, employs or contracts the drivers, and runs the service end to end. The company holds the asset and the labour relationship. Risk is still driver-distributed, but capital is concentrated, and the operator can guarantee service quality in a way a platform cannot.

**The autonomous fleet model.** The fleet owner holds the asset and the operating cost. The manufacturer holds the software, and therefore the risk that actually matters. A platform holds demand. Labour largely disappears and is replaced by capital, charging infrastructure, remote supervision and cleaning.

<figure>
<img src="/assets/img/insight-a-thousand-cars-one-risk-pathways.jpg" alt="Diagram: three horizontal bands separated by hairline rules, labelled 'platform model', 'integrated fleet', 'autonomous fleet'. Each band shows four icons in a row with labels beneath: a car key for the asset, a small figure for the labour, a smartphone for the demand, and a shield for the risk that matters. Each icon sits inside a coloured circle indicating who holds it, sky for driver or worker, butter for operator, coral for manufacturer or platform. In the third band, the shield circle is coral while the key circle is butter, with a small arrow noting 'the only row where these differ'." class="diagram">
</figure>

Each distributes value differently. The third is the only one in which the party bearing the balance sheet exposure has no control over the variable that determines it.

---

## What a comparative study would actually measure

The strongest way to settle any of this is not to argue about it. It is to measure the same variables across cities sitting at different points on the same transition, and the informative cities are not the obvious ones.

| What to establish | Austin | Singapore | Shenzhen | Jakarta | Nairobi |
|---|---|---|---|---|---|
| Driver earnings as a share of the fare | Largest single cost, so autonomy has most to save | High, with structured licensing | Modest, high-scale operator fleets | Moderate, under two-wheeler competition | Low in absolute terms, and the household's whole income |
| Capital cost and availability | Cheap, deep leasing market | Cheap, state-shaped, quota-constrained | Cheap, state-shaped, mission-aligned domestic finance | Expensive, currency exposed | Very expensive, short tenor, currency exposed |
| What the driver does beyond driving | Little beyond the ride | Little, addresses well mapped | Little inside mapped zones | Route knowledge, informal access, negotiation | Addressing, road judgement, safety screening, cash |
| Charging and depot land | Available, cheap, peripheral | Scarce and centrally planned | State-coordinated at scale | Scarce, congested, informally held | Scarce, expensive, grid-constrained |
| Who currently carries the risk | Driver, then insurer | Operator, under licence conditions | Operator, state-aligned insurer, municipal permit | Driver, largely uninsured | Driver, effectively uninsured |
| Regulatory readiness for driverless | Contested and moving | Structured, permissive, deliberate | Permitted, commercial, running at scale for years | Absent | Absent |

Read down any column and the picture is coherent. Read across any row and the transferability question answers itself.

The measurements that would populate it are ordinary field research: fare economics from operators and riders, displaced driver income, vehicle utilisation across a full week rather than a peak, infrastructure requirements observed rather than modelled, passenger trust and refusal, accessibility for people the system finds difficult, charging demand against local grid capacity, regulatory readiness, and the distribution of value between labour, capital, platform and infrastructure.

None of that is exotic. It has simply never been done across a set of cities that differ in the ways that matter.

---

## Why the Austin model may not travel

The obvious objection to transplanting this to Nairobi, Jakarta or Manila is that the roads are harder: mixed traffic, weak lane markings, motorcycles, unmapped addresses. That is true and it is not the binding constraint.

The binding constraint is arithmetic. **Autonomy substitutes capital for labour, so its business case is strongest exactly where labour is most expensive and capital is cheapest.** In Austin, the driver is the largest single line in the cost of a ride. In Nairobi, the driver's earnings are a much smaller share of a much smaller fare, and capital is expensive, scarce and priced in a currency that moves. Removing the cheapest input while adding the most expensive one is not an obvious saving.

There is a second constraint, less discussed and probably more decisive. The driver in an informal or semi-formal transport system performs a great deal of work that no fare line records: finding an address that is on no map, judging whether a road is passable after rain, deciding whether a passenger is safe to carry, helping with luggage, negotiating with whoever controls the parking, knowing which route is blocked today, and handling cash.

That work does not disappear when the driver does. It moves to a remote operator, to the passenger, or to nobody. The version where it moves to nobody is the version that decides whether the service is usable at all.

This is the [technology and context question](/insight-absorbing-the-gap) in its clearest form. A Cybercab can be technically flawless while the city around it is institutionally, infrastructurally and economically unready, and the readiness that matters is not the vehicle's.

---

## What would be worth measuring first

**Insurance pricing and terms, not just premiums.** Which software-defect exclusions appear in robotaxi fleet policies is the most informative document in this sector, and none of them are public.

**Utilisation during and after a regulatory event.** Fleet grounding is the risk that decides whether the model works, and there will be grounding events. How long, how often, and who absorbed the cost.

**Where the income went.** Driver earnings displaced, set against vehicle finance, charging, cleaning, remote supervision and platform fee. The claim is that value shifts from labour to capital. It is checkable, and the distributional question is the one that will matter politically.

**What the experience is for people the system finds difficult.** Wheelchair users, people without smartphones, people whose address is not in the map, people who need help. A human driver improvises. Establishing whether the replacement does is a field question, not a simulation.

The safety argument is close to settled. The risk argument has barely started, and it will decide more.

The Lab works on this in [e-mobility and transport](/expertise-e-mobility), through [field research](/entering-a-new-context) with the riders and operators a technology actually lands on. Our [work with commercial riders in Nairobi](/case-roam) is the version of this question where the driver's earnings are not a cost line but the entire point.

If you are assessing a robotaxi fleet proposition, or writing the rules one will operate under, [tell us what you need to know](/contact).

---

## Sources

**The deployment**

- Electrek, [Tesla Cybercab is already under NHTSA investigation after launch](https://electrek.co/2026/09/04/tesla-cybercab-nhtsa-investigation-fmvss-certification/), 4 September 2026.
- Axios, [Tesla's Cybercab now available for ride-hailing](https://www.axios.com/2026/09/04/tesla-cybercab-launch-austin), 4 September 2026.
- TechCrunch, [Feds launch investigation into Tesla's Cybercab deployment](https://techcrunch.com/2026/09/04/feds-launch-investigation-into-teslas-cybercab-deployment/), 4 September 2026.
- Yahoo Finance, [reporting on Cybercab certification and production caps](https://finance.yahoo.com/news/elon-musk-betting-teslas-future-133110784.html), 2026.

**Safety evidence**

- Waymo and Swiss Re, [new study on autonomous and human driver liability claims](https://waymo.com/blog/2024/12/new-swiss-re-study-waymo/), December 2024.
- Di Lillo, L., Gode, T., Zhou, X., Atzei, M., Chen, R. and Victor, T. (2024), [Comparative safety performance of autonomous and human drivers: a real-world case study of the Waymo Driver](https://arxiv.org/pdf/2309.01206), *Heliyon* 10(14).
- Chain Cohn Clark, [what crash data from robotaxis really means for road safety](https://www.chainlaw.com/safer-than-humans-what-crash-data-from-robotaxis-and-autonomous-vehicles-really-means-for-road-safety/), March 2026.
- Galloway, [The road ahead for autonomous vehicles: liability, insurance and risk](https://gallowaylawfirm.com/the-road-ahead-for-autonomous-vehicles-liability-insurance-and-risk/), July 2026, citing Verisk ClaimSearch trends.

**Insurability**

- Berliner, B. (1982), [*Limits of Insurability of Risks*](https://openlibrary.org/books/OL4273613M/Limits_of_insurability_of_risks), Englewood Cliffs, NJ: Prentice-Hall.
- Biener, C., Eling, M. and Wirfs, J. H. (2014), [Insurability of cyber risk: an empirical analysis](https://www.genevaassociation.org/sites/default/files/research-topics-document-type/pdf_public/ga2014-if14-biener_elingwirfs.pdf), The Geneva Association.
- [The insurability frontier of AI risk: mapping threats to affirmative coverage, silent exposures and exclusions](https://arxiv.org/pdf/2605.18784), 2026.
- Biener, C. and Eling, M. (2012), [Insurability in microinsurance markets: an analysis of problems and potential solutions](https://link.springer.com/article/10.1057/gpp.2011.29), *The Geneva Papers on Risk and Insurance* 37.

**China deployments**

- [AutoX](https://www.autox.ai/), fully-driverless commercial operations in Shenzhen since 2021 under the Pingshan district permit (as reported).
- Baidu, [Apollo Go](https://en.wikipedia.org/wiki/Apollo_Go) commercial robotaxi service across multiple Chinese cities including Shenzhen, Wuhan, Beijing, Guangzhou and Chongqing (as reported).
- [Pony.ai](https://pony.ai/) commercial robotaxi operations in Shenzhen, Guangzhou and Beijing (as reported).
- [WeRide](https://www.weride.ai/) autonomous mobility deployments across Chinese and other cities (as reported).

**Liability**

- Cleary Gottlieb, [The new EU product liability reform: addressing the digital age](https://www.clearygottlieb.com/news-and-insights/publication-listing/the-new-eu-product-liability-reform-addressing-the-digital-age).
- Regulations.ai, [Directive (EU) 2024/2853 on liability for defective products](https://regulations.ai/regulations/RAI-EU-NA-E2LDPXX-2024).
- Lawyer Monthly, [EU Product Liability Directive creates new AI and software liability risks](https://www.lawyer-monthly.com/2026/06/eu-product-liability-directive-ai-software-liability-risks/), June 2026.
- Reed Smith, [The new EU Product Liability Directive: key implications for automotive and autonomous vehicle companies](https://www.reedsmith.com/en/perspectives/2025/10/the-new-eu-product-liability-key-implications-autonomous-vehicle).

---

*This is an independent insight piece by Transitions Lab. For the Lab's applied work, see [E-Mobility & Transport](/expertise-e-mobility). See also [The Anchor Tenant](/insight-anchor-tenant) on what it means to hold an asset whose value depends on one counterparty, and [Who Absorbs the Gap](/insight-absorbing-the-gap) on why the same technology behaves differently in different systems. To discuss a study, see [Contact](/contact).*

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
