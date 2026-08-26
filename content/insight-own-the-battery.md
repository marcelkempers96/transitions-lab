§ / Insight, E-Mobility

# Own the Battery, Rent the Shopfront

*Two battery-swapping companies raised money this month with opposite network architectures. One partners with a few thousand fuel forecourts, the other with thousands of small shops. The choice is not a philosophy. It is a make-or-buy decision with a testable answer.*

<p class="article-meta"><span class="article-date">26 August 2026</span> · <span class="article-reading-time">4 min read</span></p>

## The make-or-buy decision inside a swap network

[Battery Smart](https://www.batterysmart.in/) has raised around US$19.5 million in Series C funding, led by Rising Tide Ventures with Ecosystem Integrity Fund and Blume Ventures participating. The company runs a decentralised swapping network for electric two- and three-wheelers, built on local partner locations rather than company-owned stations.

Read that alongside the network we [looked at yesterday](/insight-who-holds-the-pen), where [SUN Mobility](https://www.sunmobility.co.in/) and [Vivo Energy](https://www.vivoenergy.com/) are building in Kenya on fuel forecourts, with around twenty sites live and potential access to a large forecourt portfolio across the continent.

Two companies, the same underlying service, and opposite answers to the same question: which parts of this network should we own, and which should we contract for.

This gets discussed as strategy or philosophy, asset-light against asset-heavy, and it is neither. It is an old question in industrial organisation with a reasonably well established answer, and the answer is different in different markets, which is why both companies can be right.

---

## What determines where the boundary of the firm falls

Oliver Williamson's 1979 account of [transaction-cost economics](https://doi.org/10.1086/466942) gives three dimensions that determine whether an activity should sit inside a firm or be bought through a contract: how specific the assets are, how uncertain the transaction is, and how frequently it recurs. High specificity and high uncertainty push towards ownership. Low specificity and low uncertainty push towards contracting.

Apply that to the two things a swap station actually consists of.

**The batteries are high-specificity and high-uncertainty.**

They are the most valuable item in the network, they are mobile, they degrade in ways that depend on how they are handled, and their condition is difficult to observe from outside. A pack that has been charged in a hot unventilated back room for six months looks identical to one that has not, right up until it does not. This is close to a textbook case for ownership.

**The site is low-specificity.**

A shopfront in a dense neighbourhood is not specialised to battery swapping in any meaningful way. It can be exited, replaced, and substituted, and in most Indian cities there are a great many of them. Owning it buys very little that a contract does not.

So: own the batteries, rent the shopfront. Battery Smart's architecture is not a capital-efficiency trick. It is the arrangement Williamson's framework predicts, and the reason it holds is that the firm retains ownership of the asset whose mistreatment would be expensive and contracts for the asset whose substitution is easy.

---

## The thing that makes it work is not the swapping

There is a hole in that argument, and it is worth naming because it is where the real innovation sits.

The partner controls a set of behaviours that directly affect the asset the firm owns. Charging discipline, ventilation, ambient temperature, physical security, whether a damaged pack gets reported or quietly put back on the rack. These are exactly the unobservable actions that contracts handle badly, which is normally the argument for bringing the activity inside the firm.

What resolves it is cell-level telemetry. If the firm can see, remotely and continuously, the state of charge, temperature history, cycle count and fault record of every pack in every partner location, then the behaviour stops being unobservable. Damage becomes attributable. Payment can be conditioned on it.

Stated plainly: the monitoring technology is what makes the contract viable, and without it the partner model does not work at all. Telemetry here is not a product feature. It is a governance mechanism substituting for ownership, and any operator considering this architecture should evaluate it on that basis rather than as an analytics capability.

<div class="callout c-cobalt">
  <span class="kicker">Which architecture, and why</span>
  <p>Two variables decide the answer: whether qualifying sites are abundant at your target density, and whether you can observe the battery's condition well enough to attribute damage.</p>
  <ul>
    <li><strong>Sites abundant, telemetry good.</strong> Partner network. Many small hosts. Lowest capex per site, fastest rollout, thinnest margin per swap. Battery Smart in dense Indian cities.</li>
    <li><strong>Sites scarce, telemetry good.</strong> Anchor partnership. Few large site-holders. Fast, but concentrates negotiating power in one counterparty. The forecourt model.</li>
    <li><strong>Sites abundant, telemetry weak.</strong> Own the stations, or fix observability first. Fixing observability is usually cheaper than owning several hundred sites.</li>
    <li><strong>Sites scarce, telemetry weak.</strong> Own everything. Slow and capital-heavy. Defensible only where density and throughput are already proven.</li>
  </ul>
  <p>The vertical axis is the one operators underweight. Telemetry is cheaper than ownership, and it is what moves a market from the bottom row to the top.</p>
</div>

---

## Four questions before choosing an architecture

For anyone actually making this decision, the useful version is not a doctrine. It is these, answered per market rather than once at head office.

**Can you observe the asset's condition and attribute damage?**

If yes, contract for the site. If no, either fix that first or own the station. Fixing it is almost always cheaper.

**Are qualifying sites abundant or scarce at your target density?**

Delhi and Nairobi give different answers. Where sites are abundant, partnering is faster and cheaper. Where they are scarce, whoever holds them sets the terms, and a long lease or an anchor agreement is worth paying for.

**What throughput does a site need to justify dedicated staff?**

Below that threshold you need a host who has another business paying the rent and the wages. Above it, a dedicated station starts to make sense. This number decides the architecture more directly than any strategic preference.

**Who carries the electricity connection, and what happens when it fails?**

A small shop on a commercial tariff with unreliable supply is a completely different proposition from a forecourt with a dedicated connection and a generator. This is the [reliability ledger](/insight-absorbing-the-gap) question arriving inside a site agreement, and it is the one most likely to be discovered late. It also connects to a separate story about who pays for the flexibility a swap network could offer if anybody would buy it, which we set out in [Paying for Power You Curtail](/insight-paying-for-what-we-curtail).

---

## What actually travels between markets

India is described, fairly, as a laboratory for models that may later move to Africa and Southeast Asia. It is worth being precise about what would move.

The commercial logic travels. Vehicles that generate daily income cannot absorb multi-hour charging downtime, and separating battery ownership from vehicle ownership removes a large part of the upfront cost. That holds anywhere riders earn per trip.

The architecture may not travel. A partner network depends on a dense population of small retail businesses with reliable power, sufficient working capital to hold inventory, insurable premises, and enough foot traffic to make a modest per-swap commission worth the counter space. Change any one of those and the arithmetic inverts. In much of sub-Saharan Africa the constraint is the power connection at the partner site, which is why a forecourt model with its own connection and its own backup generation may be the correct architecture in Nairobi at the same time that a shopfront model is correct in Delhi.

The mistake is adopting an architecture as an identity. Both of these companies chose correctly for the market they are in. An operator entering a third market should run the four questions again rather than importing the answer.

---

Ask which asset you cannot afford to have mistreated, and own that one. Contract for everything else, and spend the savings on being able to see what your partners are doing.

The Lab works on this in [e-mobility and transport](/expertise-e-mobility) and from direct fieldwork with [commercial riders in Nairobi](/case-roam), where the difference between a swap point that works and one that does not is a daily-earnings question rather than an engineering one.

If you are deciding a network architecture for a market you do not yet know well, [that is a question worth answering with evidence](/contact).

---

## Sources

- [Battery Smart](https://www.batterysmart.in/), Series C funding round, 21 August 2026 (round size, lead and participating investors are as reported by the company).
- Williamson, O. E. (1979), ["Transaction-Cost Economics: The Governance of Contractual Relations"](https://doi.org/10.1086/466942), *Journal of Law and Economics* 22(2), 233–261.

---

*This is an independent insight piece by Transitions Lab. For the Lab's applied work, see [E-Mobility &amp; Transport](/expertise-e-mobility). To discuss a study, see [Contact](/contact).*

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
