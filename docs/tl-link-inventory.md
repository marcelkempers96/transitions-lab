# Transitions Lab: canonical link inventory, version 2

Rebuilt from a live scan of the site on 31 August 2026, replacing the version built on 22 August. That version was substantially out of date and several paths in it no longer exist. Supersede the old file.

---

## 1 Corrections to the previous inventory

**Paths that no longer resolve and must not be linked:**

| Old path | Status |
|---|---|
| `/geographies` | Gone. Linked in almost every article since 22 August and stripped at publish each time. |
| `/applied-research` | Replaced by `/measuring-change`. |
| `/monitoring-evaluation-dissemination` | Replaced by `/reporting-to-funders`. |
| `/european-impact-tracking` | No longer in navigation. Verify before using. |
| `/programmes` | Not present anywhere on the live site. |
| `/team` | Not in navigation. Verify before using. |

`/field-research` still appears in a homepage link, but the service nav now uses `/entering-a-new-context`. Prefer the latter and verify the former before relying on it.

---

## 2 Pages the series has never linked and should

| Page | Path | Use when |
|---|---|---|
| For Funders | `/for-funders` | Any piece addressed to funders or DFIs. This is a dedicated service page and it is the natural destination for roughly a third of the series. |
| Entering a New Context | `/entering-a-new-context` | Market entry, adoption, failure modes, company-facing pieces |
| Measuring Change | `/measuring-change` | Attribution, reach and depth, before-and-after |
| Reporting to Funders | `/reporting-to-funders` | MEL, consortium work packages, European grant agreements |
| Evidence Strength Pyramid | `/impact-measurement` | Any piece arguing about what a number can bear |
| Impact-Tracking Template | `/impact-tracking-template` | Baseline, midline, endline arguments |
| Qualitative vs Quantitative | `/qualitative-vs-quantitative` | Pieces arguing that numbers alone cannot answer something |
| The In-Depth Interview Guide | `/interview-guide` | Pieces about discovery, non-adopters, asking rather than modelling |
| Reef Support case | `/case-reef-support` | Marine, coastal, community monitoring. This page now exists. |

---

## 3 Full current path list

**The Lab:** `/about`, `/who-we-serve`, `/for-funders`, `/how-it-works`, `/contact`

**Services:** `/what-we-do`, `/entering-a-new-context`, `/measuring-change`, `/reporting-to-funders`

**Expertise:** `/expertise`, `/expertise-e-mobility`, `/expertise-energy`, `/expertise-water`, `/expertise-agriculture`, `/expertise-manufacturing`, `/expertise-ai-digital`, `/expertise-finance`, `/expertise-climate`

**Cases:** `/case-studies`, `/case-roam`, `/case-pyropower`, `/case-mimaji`, `/case-reef-support`

**Method and resources:** `/resources`, `/brw`, `/readiness-levels`, `/impact-measurement`, `/impact-tracking-template`, `/qualitative-vs-quantitative`, `/interview-guide`, `/articles`

**Articles, newest first:** `/insight-ban-is-not-the-policy`, `/insight-fire-and-livelihood`, `/insight-recycled-is-a-promise`, `/insight-who-does-it-fail-for`, `/insight-stacking-not-switching`, `/insight-customers-who-can-leave`, `/insight-warm-house-not-cheaper`, `/insight-enough-demonstrations`, `/insight-lock-in-both-ways`, `/insight-behind-the-border`, `/insight-the-smelter-contract`, `/insight-cheaper-to-verify`, `/insight-second-step`, `/insight-nobody-buys-a-chiller`, `/insight-right-to-the-tree`, `/insight-own-the-battery`, `/insight-paying-for-what-we-curtail`, `/insight-downstream-of-the-buyer`, `/insight-who-holds-the-pen`, `/insight-hurdle-not-risk`, `/insight-capability-slow-part`, `/insight-what-the-bond-secures`, `/insight-benefits-nobody-looked-for`, `/insight-same-queue`, `/insight-anchor-tenant`, `/insight-distance-work-reward`, `/insight-one-month-not-a-trend`, `/insight-the-reporting-loop`, `/insight-ai-absorptive-capacity`, `/insight-absorbing-the-gap`, `/insight-incumbents-second-life`, `/insight-transitions-outcomes`, `/insight-eu-us`, `/insight-eu-africa`, `/esf-social-innovation`

`/insight-the-reporting-loop`, published 15 August, was not in the previous inventory. It argues that grant portfolios look rosier than they are and is the reasoning behind `/for-funders`. It is a natural sibling for any measurement piece.

---

## 4 The article grouping question is settled

`/articles` now carries faceted filters rather than a flat list, on three axes. This resolves the grouping recommendation made repeatedly between 28 and 30 August. Stop raising it.

**Category, use exactly one:** Transitions, Energy, E-Mobility, Industrial Policy, Agriculture, Finance, Measurement, AI & Digital, EU Policy, Method

**Geography, use exactly one:** Africa, Asia, Europe, Global

**Both must be supplied in front matter from now on.** They have been assigned at publish time so far, which is avoidable work.

---

## 5 Front matter, current published shape

```
title:        H1, plain
eyebrow:      renders as "Insight, Minerals & Industrial Policy"
category:     one of the ten above
geography:    one of the four above
date:         renders as "30 August 2026"
reading_time: renders as "6 min read"
description:  renders as the standfirst under the H1, and as meta description,
              og:description and twitter:description. Write it to work as all four.
diagram:      /assets/img/insight-<slug>-diagram.jpg
diagram_alt:  long descriptive alt, see section 6
diagram_caption: italic line under the diagram
og_image:     /assets/og/<slug>.png, 1200 x 627, separate from the diagram
```

Note that published dates are not always the drafting date. The three earliest pieces were back-dated to 20 May, 18 June and 22 July to spread the archive. Do not assume the front matter date survives.

---

## 6 Figures: the convention is not inline SVG

**This is the largest correction.** Every article carries one commissioned line-art illustration as a JPEG at `/assets/img/insight-<slug>-diagram.jpg`, in a warm palette on a light ground. The inline SVG figures supplied in drafts are not what gets published.

The site theme colour is `#F5EDDD`, a warm cream. Draft SVGs have been built with light text for a dark ground, which is wrong for this site and part of why they are replaced.

From now on, supply for each article:

1. **An illustration brief**, three to five clauses describing a left-to-right line-art scene, written so it can be drawn directly. The published alt texts are the model. Example from `/insight-ban-is-not-the-policy`: a mine entrance with an ore cart of concentrate; then a shipping document stamped with a red no-export symbol, with a dashed arrow ending in a cross; then a refining plant under a warm sun; then a battery cell with piles of intermediate materials at its foot.
2. **The alt text**, which is the brief written as description.
3. **A one-line italic caption** that carries an argument rather than describing the image. Published example: the ban stops the export, and whether the arrow across the middle reaches the refinery, and whether other people's ore can enter it, is the whole policy.

If a chart is genuinely needed rather than an illustration, supply SVG using the light palette: cream ground, dark text, and the coral, mustard, sky and butter accents visible across the published diagrams. Never light text on transparent.

---

## 7 The closing paragraph is a required element

Every published article ends with an italic paragraph in a fixed shape that is currently being written at publish time rather than supplied. Supply it from now on.

> *This is an independent insight piece by Transitions Lab. For the Lab's applied work, see [expertise page]. See also [Article A] on [one clause saying why], [Article B] on [why], and [Article C] on [why]. To discuss a study, see [Contact](/contact).*

Two to four sibling articles, each with a clause explaining the connection rather than a bare link. This is the main backlink mechanism on the site and drafts have been omitting it.

---

## 8 In-body linking, as published

- Every statistic linked inline at the point of appearance, reference-style in draft, rendered inline.
- Academic references get DOI links where one exists. The rule against constructing a DOI stands, but note that unlinked references are being resolved manually at publish, so flag any reference whose DOI is worth finding.
- A source that cannot be resolved becomes a generic institutional link plus "(as reported)". The African Development Bank reference is the published example.
- Tables are converted to bulleted lists with bold lead-ins under a plain subheading. Supply short tables as lists directly unless the table is genuinely two-dimensional.
- Two to three prior-article links in the body, plus the closing paragraph, plus one expertise page, plus `/contact`.

---

## 9 Reading time

Calculated, never estimated. Body word count divided by 260, rounded down, excluding front matter, figure code, captions, sources and build block. Renders as "N min read". At 1,400 to 1,900 words this lands at 5 to 7 minutes.

---

## 10 External citation rule

Every factual claim carried from a source, and every statistic without exception, linked inline at the point where it appears. A sources list at the foot is not a substitute.

Reference-style in the draft, with definitions in one block beneath the sources list, so a URL is substituted once rather than in five places. Anchor text wraps the claim itself, not a bare outlet name. Cap of roughly three citations of one source per paragraph.

Academic references resolve to verified DOIs only. Never construct a DOI or a publisher URL. Primary sources over coverage of them.

**Named authors, theories and terms of art are links, not sources-list entries.** This is the gap that has required repeated post-publication audit passes. Anything named in body prose carries a hyperlink at first mention:

- **Named authors.** Kydland and Prescott, Scott's *Seeing Like a State*, Bardhan, Braverman and Stiglitz, Place and Hazell, Prebisch and Singer, Vernon. If the name appears, the link appears with it.
- **Named theories and terms of art.** The easiest to miss, because they read as ordinary language. Multi-level perspective, split incentive, voltage drop, collective-action problem, bundle of rights, group liability, rebound effect. Each links to its canonical paper at first mention.
- **Named reports.** Any report referred to by name rather than cited in passing.

The rule against constructing a DOI stands, and it is not a licence to leave a reference unlinked. Verify it, then link it. Where verification genuinely fails, say so explicitly in the build block as an item needing a link, rather than leaving unlinked prose for an audit to find later.

See `tl-reference-library.md` for the canonical source of every framework used in the series so far, with verification status. Check it before naming a concept, and add a row whenever a new framework is used.

---

## 11 Standing instruction

Rescan the live site before each batch. This inventory went stale in nine days and the drift was not visible from the drafts, because dead links and replaced figures are silently corrected at publish. The cost of the scan is two fetches.
