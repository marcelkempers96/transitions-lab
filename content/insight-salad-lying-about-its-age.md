§ / Article, Agriculture, Europe

# Your Salad Is Lying About Its Age: The Trouble With Smart Expiry Dates

*A Horizon project can now predict spoilage from sensors instead of a printed date. Buried in its own reporting is the finding that should slow everyone down: the treatment that keeps salad fresh longer does nothing to the pathogens.*

<p class="article-meta"><span class="article-date">15 October 2026</span> · <span class="article-reading-time">6 min read</span></p>

The date on a pack of food is usually described as a guess, a crude approximation that throws away edible stock because nobody can be bothered to measure. The Horizon Europe project [FOODGUARD](https://cordis.europa.eu/project/id/101136542), coordinated by the Agricultural University of Athens with an EU contribution of [€4,593,875](https://cordis.europa.eu/project/id/101136542) and running to the end of 2026, is one of several efforts to replace that guess with something better: non-invasive [near-infrared, infrared and multispectral imaging sensors](https://cordis.europa.eu/project/id/101136542/reporting) feeding machine-learning models that estimate remaining shelf life in real time, with blockchain traceability underneath and bioprotective cultures extending the window at the same time.

The reported performance is good. Spoilage prediction reaching up to 92 per cent accuracy in fish and meat, shelf life extended by one to four days, with results varying by food type and additional safety questions still open for leafy vegetables.

The date is not a guess, though. It is a standard, it is doing a specific job, and the job it does is not the one a sensor does.

## What a printed date actually is

[Leland's 1979 account of minimum quality standards](https://doi.org/10.1086/260838) is the right starting point, and it is unflattering to both sides of this argument. A minimum quality standard exists because buyers cannot assess quality before they commit. The standard raises average quality in the market, and it does so by excluding units at the bottom of the distribution, some of which would have been perfectly acceptable. That exclusion is not a flaw in the policy. It is the policy. The question Leland makes unavoidable is the ratio: how many good units are sacrificed to exclude each bad one, and who bears each kind of loss.

An expiry date is that standard in its cheapest possible form. One number, printed once, legible to a regulator, a logistics firm, a shop assistant and a tired person at a fridge door at eleven at night, costing nothing at the point of use and requiring no device, no connectivity and no training. Judged as a measurement it is terrible. Judged as an institution it is extraordinarily efficient.

Replacing it with prediction does not abolish the trade-off between waste and risk. It relocates that trade-off from a printed number, where it is visible and politically owned, into a threshold inside a model, where it is neither.

## Accuracy is the wrong number

This is where the headline figure stops being useful. [Swets's 1988 analysis of diagnostic accuracy](https://doi.org/10.1126/science.3287615) established the distinction that food-system debates keep skipping: the performance of a diagnostic system has two separate components. One is discrimination, how well the signal separates the two classes at all. The other is the decision threshold, the point on that signal at which you declare spoiled rather than fresh. A single accuracy percentage is the product of both, and it moves when you move the threshold even though the sensor has not changed.

Which means 92 per cent is not a property of the system. It is a property of the system at one threshold, under one mix of actually-fresh and actually-spoiled samples. Tune the same sensors to minimise discarded stock and you will get a different number, a different error profile and a different set of people harmed.

The thresholds are not symmetric in their consequences. A false positive, declaring good food spoiled, costs a retailer margin and the atmosphere some carbon, and the loss is diffuse, statistical and borne by whoever owns the stock. A false negative, declaring spoiled food good, costs an identifiable person their health, a food business its licence and a brand its reputation, and the loss is concentrated, legible and litigable.

Any party that bears only the first kind of loss will choose a different threshold from a party that bears the second. That is not a technical disagreement. It is the whole of the policy, and it is currently sitting unowned inside a model that was evaluated on accuracy.

<aside class="tl-box">
<strong>Somebody has to own the threshold, and right now nobody does.</strong> A printed date has a legal author. A regulator sets the framework, a manufacturer applies it, and a retailer who honoured the date has a defence. A predicted date has a model owner, a sensor vendor, an integrator and a shop, and the question of which of them chose the cut point between waste and risk has, as far as we can establish, not been asked in any of the Horizon work on this. The first serious food-safety incident involving a dynamic shelf life will be litigated on exactly that question.
</aside>

## The finding that should slow this down

Deeper in FOODGUARD's own reporting is a result that gets no attention and deserves most of it. Among the bioprotective lactic acid bacteria screened, a strain of *L. pentosus* was found to extend the shelf life of ready-to-eat salads [without an effect on pathogen growth](https://cordis.europa.eu/project/id/101136542/reporting).

Read that twice. The treatment delays spoilage. It does not delay the hazard.

Spoilage and danger are not the same thing, and food scientists have always known it, but for most of human history they have been loosely correlated. Food that smelled wrong, looked wrong or felt wrong was food that had been sitting around, and sitting around is also what lets pathogens multiply. That correlation is the entire basis of the only independent check a consumer has ever had. It is crude, it causes enormous waste, and it is theirs.

A technology that extends the sensory window while leaving pathogen growth untouched breaks that correlation on purpose. The salad looks and smells fine for longer, and whether it is safe for longer is a separate question with a separate answer. At precisely the moment the system asks consumers to override a printed date in favour of a model, it removes the fallback they would otherwise have used to sanity-check the model.

That is not an argument against the technology. It is an argument that the sensory signal has to be treated as compromised evidence from the moment biopreservation enters the supply chain, and that nothing in the current framing acknowledges this.

## Where the economics actually die

The project's reporting names its own bottleneck, and it is not sensor cost. It is that the [microbiome signature is product-specific](https://cordis.europa.eu/project/id/101136542/reporting), alongside data-quality problems in the training sets.

Product-specific means the model does not transfer. Each product, and plausibly each supplier, season and packaging format, is its own calibration exercise with its own labelled spoilage data, which has to be generated by deliberately spoiling things under controlled conditions and measuring them. Feta is not lettuce. Lettuce in May is not lettuce in November. A supermarket carries tens of thousands of lines.

The unit economics of real-time food monitoring therefore do not turn on the price of a near-infrared sensor, which falls every year. They turn on the cost of calibration per product line, which does not, because it is mostly laboratory labour. Any business case built on falling sensor costs is answering a question nobody was asking.

## Four readiness questions, and who has to answer each

The usual framing lists technical, regulatory, commercial and behavioural readiness as though they were four hurdles for one actor. They are four hurdles for four different actors, which is why they are not being cleared.

**Technical, answered by the project.** Not can it predict, but how far does a model calibrated on one product and season degrade when applied to another. Published degradation curves, not headline accuracy.

**Regulatory, answered by the food safety authority.** Whether a prediction can discharge a legal duty that is currently discharged by observing a printed date, and if so, whose prediction. Until this is settled nobody can deploy, however good the sensors.

**Commercial, answered by the retailer.** Not whether avoided waste exceeds monitoring cost in aggregate, but whether it does so per product line after calibration, which is the level at which the decision is actually made.

**Behavioural, answered by nobody yet.** Whether a shopper will accept a date that differs from the one on the pack next to it, and what happens to trust the first time the two disagree in public.

<aside class="tl-box">
<strong>The waste might not even be where the sensor is.</strong> Most food loss in European retail happens upstream of the shelf, in forecasting, ordering and distribution, where the binding constraint is how much was bought rather than how long it lasts. One to four extra days on a pack already in a chiller may simply move the discard point without reducing the quantity ordered. Measuring whether a monitoring system changes the order, rather than the discard date, would be the cheapest way to find out whether any of this reduces waste at all.
</aside>

## What we would want measured

The honest test of this technology is not a prediction accuracy. It is a conversion, and it has four stages that are each currently measured by a different party or by nobody.

**Prediction to decision.** How often does a changed estimate change what a human or a system actually does with the stock. A correct prediction that nobody acts on has no value.

**Decision to avoided waste.** Whether the changed decision reduces tonnage discarded, or moves it to a different point in the chain.

**Avoided waste to money.** Whether that reduction pays for the calibration, per line, at the margin.

**All of it against safety.** Whether the error profile at the deployed threshold, not the evaluated one, leaves the rate of illness where it was.

For consortia, the practical conclusion is to stop reporting accuracy as the headline result and start reporting the threshold and the loss ratio it implies. For regulators, it is that dynamic shelf life is a liability question before it is a technical one, and the answer determines whether any of the engineering gets used. For retailers, it is that the number to model is the cost of calibration per line, not the cost of the sensor.

And for everyone, there is the uncomfortable finding sitting in the project's own files: once biopreservation is in the chain, the way the food looks and smells stops being evidence. The system had better be right, because the fallback has been removed.

## Sources

- CORDIS, [FOODGUARD, Horizon Europe project 101136542](https://cordis.europa.eu/project/id/101136542), Agricultural University of Athens, January 2024 to December 2026.
- CORDIS, [FOODGUARD periodic reporting](https://cordis.europa.eu/project/id/101136542/reporting), for the sensor types, the machine-learning results, the *L. pentosus* finding and the stated industrial bottleneck.
- Leland, H. E. (1979), [Quacks, Lemons, and Licensing: A Theory of Minimum Quality Standards](https://doi.org/10.1086/260838), *Journal of Political Economy* 87(6), 1328 to 1346.
- Swets, J. A. (1988), [Measuring the accuracy of diagnostic systems](https://doi.org/10.1126/science.3287615), *Science* 240(4857), 1285 to 1293.

---

*See also [The Cheaper It Gets to Verify, the Less Anyone Visits](/insight-cheaper-to-verify) on what remote measurement stops seeing, [A Recycled Material Is a Promise](/insight-recycled-is-a-promise) on claims a buyer cannot check, and [Who Does It Fail For?](/insight-who-does-it-fail-for) on why an aggregate accuracy figure hides the group that matters.*
