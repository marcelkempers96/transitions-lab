§ / Insight, AI & Digital

# When the Agent Pays

*India is preparing to let software agents spend from a person's account without approving each transaction, using a framework built for lending your card to a family member. The mechanism transfers. The thing that made it safe does not.*

<p class="article-meta"><span class="article-date">2 September 2026</span> · <span class="article-reading-time">5 min read</span></p>

<figure>
<img src="/assets/img/insight-when-the-agent-pays-hero.jpg" alt="Line-art sequence: on the left a person handing a payment card to a family member across a kitchen table, in the middle the same gesture repeated but the receiving hand belongs to a small featureless machine figure, and on the right a dispute counter with a clerk and an empty chair where the complainant would sit." class="diagram">
<figcaption>The delegation is the same shape. The person you are delegating to is not.</figcaption>
</figure>


## India is extending a family lending framework to software, and the load-bearing part does not transfer

The National Payments Corporation of India is developing a [Unified Agent Protocol](https://www.business-standard.com/finance/news/india-may-allow-agentic-ai-led-upi-transactions-under-new-npci-protocol-126070801343_1.html) that would let artificial intelligence agents make payments over the Unified Payments Interface without requiring approval for every transaction. It is expected to be presented at the Global Fintech Fest in Mumbai in September and [requires Reserve Bank of India approval](https://inc42.com/buzz/npci-to-launch-agentic-payments-on-upi-report/) before launch.

The design is careful and worth describing accurately. It builds on [UPI Circle](https://inc42.com/buzz/npci-to-launch-agentic-payments-on-upi-report/), which already lets a primary account holder delegate spending-capped payment authority to a trusted secondary user such as a family member, and Reserve Pay, which lets a user block funds once for multiple future payments. On top of that it adds a registry: an agent must be [registered, verified and authorised](https://clearingpost.com/insights/npci-unified-agent-protocol-agentic-upi/) before it can transact. Initial use cases are [low-value, high-frequency transactions](https://inc42.com/buzz/npci-to-launch-agentic-payments-on-upi-report/) such as grocery orders and routine digital purchases. Spending limits, identity checks and audit trails are expected, and a liability framework is planned, though its details have not been published.

This is being built on the largest retail payment system in the world by volume, which processed [24.51 billion transactions worth 29.82 trillion rupees in August 2026](https://techresearchonline.com/news/india-upi-agentic-payments-ai-agents/). India will be among the first countries to build national infrastructure for agentic payments, and the approach of extending an existing delegation framework rather than inventing a new rail is a sound instinct.

It is also worth being precise about what the existing framework was carrying, because the part being reused is not the part that made it work.

---

## What made UPI Circle safe was not the spending cap

Consider what actually protects you when you authorise your mother, your adult child or your business partner to spend from your account within a limit.

The cap is the smallest part of it. What does the work is that the delegate is a person you know, who has a continuing relationship with you, whose judgement you have observed over years, who can be asked what they were thinking, who is embarrassed by a mistake, and who can be argued with. If they spend badly, there is a conversation, and the conversation is a real constraint on their behaviour in advance.

**Replace that delegate with an agent and the cap remains and everything else disappears.** There is no relationship, no accumulated judgement about their reliability, no embarrassment, and no way to ask what they were thinking that produces an answer you can evaluate.

<figure>
<img src="/assets/img/insight-when-the-agent-pays-cap.jpg" alt="Diagram: two panels separated by a hairline vertical rule. Left panel, a person and a family member facing each other across a small table, with four sky-blue icons floating above them labelled 'a relationship', 'observed judgement', 'the ability to ask why', 'embarrassment'. A coral 'spending cap' rectangle sits beneath the table. Right panel, the same person facing a small machine figure across the same table. The four sky-blue icons are drawn as faint dashed outlines only, clearly absent. The coral 'spending cap' remains solid and unchanged." class="diagram">
</figure>

The formal structure of the delegation is identical. Its safety properties are not, and a numeric limit is being asked to carry a load that was previously carried by social accountability.

That is not an argument against building it. It is an argument that the framework needs a substitute for the missing element rather than an extension of the existing one, and the substitute has to be built deliberately.

---

## The distinction consumer protection rests on

The deeper problem is that agentic payments collapse a distinction that almost all payment consumer protection is built on.

Payment dispute regimes everywhere separate two categories. A transaction you authorised, which you generally cannot reverse simply because you regret it. And a transaction somebody else caused by impersonating you, which is fraud, and which the system absorbs.

The line between them is authentication. Was it you.

<figure>
<img src="/assets/img/insight-when-the-agent-pays-authorisation-line.jpg" alt="Diagram: a horizontal line across the frame with a small gate at its centre labelled 'authentication: was it you'. Above the line, a butter-yellow region labelled 'authorised: you live with it'. Below the line, a sky-blue region labelled 'unauthorised: the system absorbs it'. To the right, a dashed coral rectangle sitting awkwardly overlapping the gate and both regions, labelled 'authorised, and not intended', with a small question mark inside." class="diagram">
</figure>

An agent operating under a registered delegation is, by construction, authorised. It authenticates correctly because it was given permission to. Every transaction it makes falls on the authorised side of the line, including the ones the user did not want, did not expect, would not have made, and cannot explain.

So the category that consumer protection was designed around, the unauthorised transaction, becomes structurally impossible, and it is replaced by a new one with no established law: **the authorised transaction the principal did not intend.**

That is where the unpublished liability framework has to do its work, and it is a genuinely hard drafting problem. The candidate answers each have a cost.

**The user bears it.** Simple, and it makes delegation unattractive to exactly the cautious users who would benefit most, while pushing risk onto people least able to absorb a wrong purchase.

**The agent provider bears it.** Correct in principle and requires agent providers to be capitalised, insured and identifiable, which favours large incumbents and forecloses the small local developers who would build for underserved users.

**The merchant bears it.** Merchants will price it in, and small merchants will refuse agentic payments, which fragments the rail.

**A pooled fund bears it.** Requires a levy, a claims process and an adjudicator, which is a new institution rather than a clause.

There is no costless option. What matters is that the choice is made explicitly, published before launch, and tested against the users who will find it hardest to contest a transaction, rather than settled quietly in scheme rules.

---

## Agency costs assume you can monitor

The economics here is old and the application is new. [Jensen and Meckling's account of agency costs](https://doi.org/10.1016/0304-405X%2876%2990026-X) defines them as the sum of monitoring expenditure by the principal, bonding expenditure by the agent, and the residual loss where the agent's decisions still diverge from what the principal would have chosen.

Every term in that assumes the principal can observe enough to monitor.

Two features of this design make monitoring unusually difficult, and one of them is a deliberate virtue of the system.

**The rail does not see what was bought.** NPCI confirms that a payment request is authentic and [does not access the details of what was purchased](https://stellagent.ai/insights/india-npci-unified-agent-protocol-upi), which mirrors how UPI works today and is a genuine privacy protection. In a human-initiated system that is exactly right. In an agentic system it means the infrastructure that could detect a pattern of wrong purchases is, by design, unable to.

**Audit trails are reviewed by whoever is capable of reviewing them.** A log of forty small transactions a month is monitorable by a person with a smartphone, time and numeracy. It is not monitorable by a user with a feature phone, limited literacy, or an account operated on their behalf by a shopkeeper.

<figure>
<img src="/assets/img/insight-when-the-agent-pays-audit.jpg" alt="Three figures in a row, each with a transaction log beside them. First figure seated at a desk with a large smartphone, log fully legible with tick marks down all 40 entries, in cobalt, labelled 'audits easily'. Second figure standing with a small feature phone, the log shorter and cut off at entry 15, labelled 'audits partially'. Third figure standing beside a shopkeeper who is holding the phone and the log, in coral, labelled 'does not hold the record'." class="diagram">
</figure> UPI's reach is its great achievement, and reach means the delegation will be available to users whose ability to audit an agent is very limited.

Which produces the distributional question, and it is the same shape as the one in [automated speech systems](/insight-who-does-it-fail-for): the failure will fall hardest on the users least able to detect it and least able to contest it, which is the population the infrastructure was celebrated for reaching.

---

## What would be worth establishing before launch

The proposal is at draft stage and requires central bank approval, which is the right moment for evidence rather than after the first dispute wave.

**A dispute rate and resolution outcome, disaggregated by user segment.** Not an aggregate complaint number. Whether resolution outcomes differ for users on feature phones, in rural districts, in vernacular interfaces and at low transaction values.

**Whether users can state what they delegated.** A pilot can test this directly. Ask enrolled users, some weeks after enrolment, what their agent is permitted to buy and what the limit is. The gap between the consent recorded and the consent understood is the measure that determines whether the framework is meaningful, and it is the sort of thing established by asking rather than by reading logs.

**Revocation in practice, not in principle.** How long it takes a user to stop an agent, through which channel, and whether people who wanted to stop one succeeded. Ease of exit is the real consumer protection and it is rarely measured.

**Who ends up using it.** If uptake concentrates among users who were already well served, the framework is a convenience product. If it reaches further, the protections have to work further, and that should be established before scale rather than inferred from it.

India is building this earlier and more deliberately than anybody else, which means the rest of the world will copy whatever it settles on. That is a strong argument for the evidence being generated here, in public, at pilot stage.

The Lab works on this in [AI and digital systems](/expertise-ai-digital) and [financial inclusion](/expertise-finance), through [field research](/entering-a-new-context) with the users a system is most likely to fail.

If you are designing or approving a delegated payments framework and want the consent gap measured before launch, [tell us what you need to know](/contact).

---

## Sources

- Business Standard, [India may allow agentic AI-led UPI transactions under new NPCI protocol](https://www.business-standard.com/finance/news/india-may-allow-agentic-ai-led-upi-transactions-under-new-npci-protocol-126070801343_1.html), 9 July 2026.
- Inc42, [NPCI to launch agentic payments on UPI](https://inc42.com/buzz/npci-to-launch-agentic-payments-on-upi-report/), September 2026.
- ClearingPost summary of the [Unified Agent Protocol registration and authorisation design](https://clearingpost.com/insights/npci-unified-agent-protocol-agentic-upi/), July 2026.
- Analysis of the [UAP trust model and its relationship to UPI Circle](https://stellagent.ai/insights/india-npci-unified-agent-protocol-upi), July 2026.
- Reporting on [UPI transaction volumes and the planned liability framework](https://techresearchonline.com/news/india-upi-agentic-payments-ai-agents/), September 2026.
- Jensen, M. C. and Meckling, W. H. (1976), [Theory of the Firm: Managerial Behavior, Agency Costs and Ownership Structure](https://doi.org/10.1016/0304-405X%2876%2990026-X), *Journal of Financial Economics* 3(4), 305 to 360.

---

*This is an independent insight piece by Transitions Lab. For the Lab's applied work, see [AI & Digital Systems](/expertise-ai-digital). See also [Who Does It Fail For?](/insight-who-does-it-fail-for) on why an average accuracy figure cannot describe who a system fails, [What the Bond Is Actually Secured On](/insight-what-the-bond-secures) on enforcement mechanisms hidden inside financial products, and [The Cheaper It Gets to Verify](/insight-cheaper-to-verify) on what falling monitoring costs quietly remove. To discuss a study, see [Contact](/contact).*

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
