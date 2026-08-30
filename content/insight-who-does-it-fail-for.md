§ / Insight, AI & Public Services

# Who Does It Fail For?

*A speech system built for how people actually talk, and a European warning against deploying generative AI in public health before it is validated. Both point at the same gap: an accuracy figure is an average, and a clinic experiences a distribution.*

<p class="article-meta"><span class="article-date">30 August 2026</span> · <span class="article-reading-time">6 min read</span></p>

<figure>
<img src="/assets/img/insight-who-does-it-fail-for-diagram.jpg" alt="Line-art diagram: on the left a microphone and a model panel emitting a voice waveform that then splits along a dashed fork; the upper path runs to a group of three figures, a green tick and a clean transcription; the lower path runs to a single figure of colour, an amber warning and a broken, uneven transcription." class="diagram">
<figcaption>The same model. The same waveform. Two very different experiences of it, and only the top one appears in the accuracy number.</figcaption>
</figure>


## An average accuracy figure cannot answer the only question that matters in a clinic

Nigerian company [Intron](https://www.intron.io/) has released [Sahara v2.5](https://www.intron.io/sahara), extending bilingual speech recognition across twelve African language combinations and adding a trilingual Kinyarwanda, English and French model. The system is built around code-switching, meaning it is designed for how people actually speak in healthcare, finance, courts and commerce, rather than assuming a conversation stays in one language.

Separately, a [Joint Research Centre](https://joint-research-centre.ec.europa.eu/) study published on 28 August finds that generative AI can help authorities synthesise fragmented disease outbreak information, and warns against immediate wide-scale deployment, recommending staged pilots, human oversight, validation, bias testing, interoperable data standards and training before such systems are embedded in public health surveillance.

These read as unrelated items. They are the same argument approached from opposite ends, and the argument is about the difference between a model's performance and an institution's experience of it.

---

## The number that gets reported, and the number that matters

Speech systems are evaluated on word error rate, and a deployment decision is usually made against a single figure.

That figure is an average across a test set. A clinic does not experience an average. It experiences a distribution, and the distribution is not random.

The clearest evidence for this remains Koenecke and colleagues in 2020, who tested five commercial systems from Amazon, Apple, Google, IBM and Microsoft against structured interviews with [42 white and 73 black speakers](https://doi.org/10.1073/pnas.1915768117) across five US cities. Error rates for Black speakers were [roughly double](https://doi.org/10.1073/pnas.1915768117) those for white speakers, and the disparity appeared across every system tested. The researchers located the gap in the [acoustic models rather than the language models](https://doi.org/10.1073/pnas.1915768117), indicating the systems were confused by phonological and prosodic characteristics rather than by grammar or vocabulary. Error rate rose with [dialect density](https://doi.org/10.1073/pnas.1915768117): the more a speaker exhibited features characteristic of the variety, the worse the transcription.

None of that is visible in a headline accuracy figure. A system can post an excellent aggregate score and fail catastrophically for an identifiable group, and the aggregate score is the only number that appears in a procurement document.

---

## Why this gets worse, not better, in multilingual settings

Intron's premise is correct and worth stating clearly: people switch languages mid-sentence, and a system that assumes monolingual input is not modelling the actual task. Building for code-switching is the right design decision and it addresses a real source of exclusion.

But code-switching is not a single behaviour. It is patterned, and the pattern tracks education, class, region, urbanity and generation. An urban professional in Lagos switching between English and Yoruba is doing something structurally different from a farmer in a rural district switching between the same two languages, in the proportion of each, in the register, in the accent, and in which language carries the technical vocabulary.

Training data is easiest to obtain from the speakers who are easiest to reach: urban, connected, younger, more educated, more likely to consent to recording, more likely to already use digital services. A system trained mostly on those speakers will perform well on those speakers.

Which produces the failure mode worth naming precisely.

**The errors will be distributed along the same axis as the exclusion the technology was built to remove.** A system that exists because language mismatch denies people access to health services, finance and courts will work best for the people who had the least difficulty in the first place, and worst for the ones who had the most, unless somebody deliberately builds against that.

This is not a criticism of Intron, whose entire premise is that generic models fail African speakers and that context-specific systems are needed. It is the next question after that one, and it is not answered by a benchmark.

<div class="callout c-butter">
  <span class="kicker">One average, several very different experiences</span>
  <p>A single reported accuracy figure sits at the mean of a distribution of error rates across speaker groups. The distribution is not random.</p>
  <ul>
    <li><strong>Low error rate.</strong> Urban, younger, professional register speakers sit well below the reported average, and their experience is close to the marketing.</li>
    <li><strong>The reported average.</strong> The only number that reaches a procurement decision.</li>
    <li><strong>High error rate.</strong> Rural, older speakers with dense code-switching sit well above the average, and their experience is not visible in it.</li>
  </ul>
  <p>The speakers on the right are the ones the system was built to include, and the ones least able to tell anybody it did not understand them.</p>
</div>

---

## In a clinic, an error is not a metric

The JRC's caution about public health deployment is sometimes read as institutional conservatism. It is better read as a statement about where the consequences land.

A transcription error in a consumer voice assistant produces an irritated user who repeats themselves. A transcription error in a clinical note produces a wrong dose, a missed allergy, a symptom recorded in the wrong body system, or a follow-up that never happens. In a court it produces a statement attributed to somebody who did not make it.

Two properties make this worse than the error rate suggests.

**The failure is silent.** A patient who was misunderstood usually does not know. They said what they said, they were nodded at, and the record now contains something else. There is no error message, no flagged low-confidence output visible to the person affected, and no complaint because nobody knows there is anything to complain about.

**The person failed is the least able to contest it.** Someone who speaks the institution's language fluently notices the mistake in the printout and corrects it. Someone who does not, cannot. The failure and the inability to challenge it have the same cause.

This is why staged deployment, human oversight and bias testing are not caution for its own sake. They are the only mechanisms that surface conditional failure, because conditional failure does not appear in aggregate evaluation by construction. It is the same structural blindness we described in [outcomes nobody looked for](/insight-benefits-nobody-looked-for): an instrument returns answers to the questions it was built around, and the failures outside those questions are not hidden so much as never sought.

---

## The counterfactual everybody gets wrong

There is a serious objection to everything above, and it deserves a proper answer rather than a footnote, because both sides of this argument routinely use the wrong comparison.

Critics of deploying imperfect systems in health and public services implicitly compare them to a competent human professional who speaks the patient's language and has time to listen. In much of the world that comparison is fictional. The realistic alternative is a consultation conducted in a language neither party commands well, or through a family member acting as an untrained interpreter, or through a clinician working from a partial history because the conversation could not happen. Human interpretation has its own substantial and well documented error rate, and it is not available at all in most of the settings in question.

Advocates make the mirror error, comparing the system to nothing at all and treating any capability as pure gain, which ignores that a wrong record is worse than an absent one because it will be acted upon.

The right comparison is neither. It is the system against the actual current practice in the specific setting, measured on outcomes rather than on transcription. A system with a materially worse error rate for rural speakers may still be a large improvement over what those speakers currently receive, and it may not be, and which is true is an empirical question that is almost never asked because both camps prefer their own counterfactual.

Stating it this way also makes the design implication obvious. If the system is being justified against current practice for underserved speakers, then those speakers are precisely the population the evaluation has to be built around. They are not an equity consideration to be added at the end. They are the group the business case rests on.

---

## What a deployment evaluation should require

**Error rates reported by speaker subgroup, not overall.** Language pair, register, age band, rural or urban, and code-switching density. If a supplier cannot produce this, the honest reading is that they have not measured it.

**Test sets recruited from the hardest populations, deliberately.** Standard practice is to build test sets from available data, which is the same bias that produced the training set. Recruiting specifically among older, rural and less formally educated speakers costs more and is the only way to find out what the system does for them.

**Measurement of the downstream consequence, not the transcription.** What happened to the patient, not what the model wrote. Whether the diagnosis changed, whether the medication was correct, whether the follow-up occurred. This is harder and it is the only outcome anyone should care about.

**Confidence surfaced to the person affected, not just to the operator.** A system that knows it is uncertain should say so in a way the speaker can act on, in their language. This is a design decision made early and almost never revisited.

**Somebody independent of the vendor doing the testing.** A supplier reporting the accuracy figure that determines whether it wins the contract is being asked to hold two positions. This is not an accusation, it is the same structural conflict we described in [measuring your own revenue](/insight-nobody-buys-a-chiller), and it is resolved the same way.

---

## Why this matters beyond speech

The JRC's list applies well past public health. Staged pilots, oversight, validation, bias testing, interoperable data and training are the conditions for any AI system entering an institution that makes consequential decisions about people, whether that is agricultural advisory, infrastructure inspection, benefits administration, climate risk assessment or credit.

The general form: **a model is evaluated against a benchmark and deployed into a distribution.** Benchmarks are built from data that is available. Institutions serve populations that are not evenly represented in available data. The gap between those two facts is where deployed AI systems fail, and it is invisible to every metric currently used to authorise deployment.

Closing it requires knowing who a system fails for, which requires testing on people who are hard to reach, which requires going to them. That is fieldwork, and it is the least fashionable component of any AI programme budget.

The Lab works on this in [AI and digital systems](/expertise-ai-digital), through [field research](/field-research) built around the people a technology is most likely to fail, across the places where those people live.

If you are deploying a language or decision system into a public service and want to know who it does not work for, [tell us what you need to know](/contact).

---

## Sources

- [Intron](https://www.intron.io/), Sahara v2.5 release (as reported), August 2026.
- European Commission [Joint Research Centre](https://joint-research-centre.ec.europa.eu/), study on generative AI in disease outbreak surveillance (as reported), 28 August 2026.
- Koenecke, A. et al. (2020), [Racial disparities in automated speech recognition](https://doi.org/10.1073/pnas.1915768117), *Proceedings of the National Academy of Sciences* 117(14), 7684 to 7689.

---

*This is an independent insight piece by Transitions Lab. For the Lab's applied work, see [AI & Digital Systems](/expertise-ai-digital) and [Field Research](/field-research). See also [Benefits Nobody Looked For](/insight-benefits-nobody-looked-for) on evaluation that only returns answers to the questions it was built around, and [Nobody Buys a Chiller](/insight-nobody-buys-a-chiller) on the structural conflict of a supplier reporting its own accuracy figure. To discuss a study, see [Contact](/contact).*

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
