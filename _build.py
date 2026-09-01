#!/usr/bin/env python3
"""Build the Transitions Lab static site from content/*.md.

Reads each markdown file in ./content/, converts to HTML wrapped in the
shared theme, writes to <slug>.html at the repo root. Idempotent - safe
to re-run whenever content changes.

Special handling:
  - "§ / label" as the very first line -> page eyebrow.
  - The first italic-only paragraph after the H1 -> standfirst / lede.
  - "**§ X.X / label**" lines -> section eyebrows inside the prose.
  - Absolute URLs to www.transitionslab.org/*.html -> root-relative /*.
  - <!-- IMAGE marker: ... --> HTML comments preserved as documentation.

Non-goals: this is not a general markdown parser. It handles exactly the
subset used by these content files.
"""
from __future__ import annotations
import hashlib
import html as htmllib
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT_DIR = ROOT / "content"
SITE_URL = "https://transitionslab.org"

# Cache-bust asset URLs: a short hash of the file contents is appended
# as a query string. New content → new URL → browsers refetch instead of
# serving a stale copy (iOS Safari in particular caches JS aggressively).
def _asset_hash(rel_path: str) -> str:
    p = ROOT / rel_path.lstrip("/")
    if not p.exists():
        return "0"
    h = hashlib.md5(p.read_bytes()).hexdigest()
    return h[:8]

ASSET_JS_V = _asset_hash("assets/site.js")
ASSET_CSS_V = _asset_hash("assets/theme.css")

# Post-processor: append ?v=<hash> to every /assets/img/... URL in the
# rendered HTML so a new image binary picks up a new URL, forcing
# browsers and Vercel's edge cache to refetch rather than serve the
# stale copy. Runs once per file at write time.
_IMG_URL_RE = re.compile(r'(/assets/img/[^"\')\s?#]+)')

def _cache_bust_images(html: str) -> str:
    def _rewrite(m: re.Match) -> str:
        url = m.group(1)
        h = _asset_hash(url.lstrip("/"))
        return f"{url}?v={h}"
    return _IMG_URL_RE.sub(_rewrite, html)

# Featured case per expertise page. Renders a bordered case-card at the
# top of the expertise page prose, linking to a specific case study.
# Kicker uses the same coloured-stripe treatment as home insight cards.
FEATURED_CASE: dict[str, dict[str, str]] = {
    "expertise-e-mobility":    {"slug": "case-roam",         "kind": "case",    "kicker": "Kenya · E-mobility",   "title": "Electric transport in Nairobi",           "blurb": "How electric two-wheelers cross the affordability threshold in a petrol-dominated market, with a Kenyan mobility provider.", "colour": "coral"},
    "expertise-energy":        {"slug": "case-pyropower",    "kind": "case",    "kicker": "Indonesia · Energy",   "title": "Biochar & clean energy in Lombok",         "blurb": "Smallholder farmers turn crop waste into heat, soil, and income on a decentralised, open-source kiln.", "colour": "butter"},
    "expertise-water":         {"slug": "case-mimaji",       "kind": "case",    "kicker": "Kenya · Water",         "title": "Water transparency in Nairobi",           "blurb": "Open data and community accountability change who can hold water systems to account, with the MiMaji Foundation.", "colour": "cobalt"},
    "expertise-agriculture":   {"slug": "case-pyropower",    "kind": "case",    "kicker": "Indonesia · Agriculture","title": "Biochar in Lombok",                       "blurb": "Smallholder farmers turn crop waste into energy and soil on a decentralised, open-source kiln, with Pyropower.", "colour": "coral"},
    "expertise-manufacturing": {"slug": "case-manufacturing","kind": "reading", "kicker": "East Africa · Manufacturing","title": "Assembly to Value: Local Manufacturing","blurb": "When a product moves from imported to locally assembled, whether the 'local' part actually reaches workers, suppliers, and customers.", "colour": "butter"},
    "expertise-ai-digital":    {"slug": "case-ai-digital",   "kind": "reading", "kicker": "AI & Digital",          "title": "Digital Services in Low-Connectivity Contexts","blurb": "When a digital tool designed for always-connected users meets an intermittent phone, a shared device, and a language it wasn't tested in.", "colour": "cobalt"},
    "expertise-finance":       {"slug": "case-finance",      "kind": "reading", "kicker": "Finance · Payment rails","title": "The Payment Rail: What Mobile Money Carries","blurb": "Every transition depends on one prior question: can people pay for it, over time, in the way their income actually arrives.", "colour": "butter"},
    "expertise-climate":       {"slug": "case-reef-support", "kind": "case",    "kicker": "Marine · Community rangers","title": "A Shared View of the Reef",                "blurb": "Rangers, sensors, and satellite data braided into a single picture of reef health, with Reef Support.", "colour": "coral"},
}


# Per-page topic icon shown at the top of the page-hero. Extend this
# map when a new icon lands under /assets/icons/. The value is the icon
# path; alt="" is used because the H1 already names the topic.
TOPIC_ICONS: dict[str, str] = {
    "expertise-e-mobility":    "/assets/icons/icon-emobility.png",
    "expertise-energy":        "/assets/icons/icon-energy.png",
    "expertise-water":         "/assets/icons/icon-water.png",
    "expertise-agriculture":   "/assets/icons/icon-agriculture.png",
    "expertise-manufacturing": "/assets/icons/icon-manufacturing.png",
    "expertise-ai-digital":    "/assets/icons/icon-ai-digital.png",
    "expertise-finance":       "/assets/icons/icon-finance.png",
    "expertise-climate":       "/assets/icons/icon-climate.png",
}

# Pages that get a compact "Start a study" contact block auto-appended at
# the bottom of the .prose body. Add a slug here to give it the block.
CONTACT_CTA_PAGES: set[str] = {
    "how-it-works",
    "who-we-serve",
    "what-we-do",
    "for-funders",
}

# The compact contact block. Same form as /contact but abbreviated fields.
# Submissions go to marcelxingkai@hotmail.com via FormSubmit for now.
CONTACT_CTA_HTML = """<section class="section-paper contact-cta-block" style="border-top:2px solid var(--ink);">
  <div class="wrap" style="max-width:900px;">
    <p class="eyebrow">Start a study</p>
    <h2 style="font-size:clamp(28px,4vw,44px);letter-spacing:-.02em;line-height:1.1;margin:0 0 14px;">Tell us the decision. We will design the study.</h2>
    <p style="font-size:17px;line-height:1.55;margin:0 0 28px;max-width:56ch;">Send a short note about what you need to know and who it concerns. We will come back with an approach, a timeline, and an honest view of what evidence can and cannot settle.</p>
    <form class="contact-form" action="https://formsubmit.co/marcelxingkai@hotmail.com" method="POST">
      <input type="hidden" name="_captcha" value="true">
      <input type="hidden" name="_subject" value="New enquiry from transitionslab.org">
      <input type="hidden" name="_next" value="/contact?sent=1">
      <input type="text" name="_honey" style="display:none">
      <div>
        <label for="cfx-name">Your name</label>
        <input id="cfx-name" name="name" type="text" required autocomplete="name">
      </div>
      <div>
        <label for="cfx-email">Email</label>
        <input id="cfx-email" name="email" type="email" required autocomplete="email">
      </div>
      <div class="full">
        <label for="cfx-decision">The decision you are facing</label>
        <textarea id="cfx-decision" name="decision" required placeholder="What do you need to know, and who does the answer need to come from?"></textarea>
      </div>
      <button type="submit" class="contact-submit">Send message &rarr;</button>
      <p class="form-note">Confidential from the first message. Or write to <a href="mailto:marcelxingkai@hotmail.com">marcelxingkai@hotmail.com</a> directly.</p>
    </form>
  </div>
</section>"""

# Per-page hero band colour. Adds `hero-<colour>` to <section class="page-hero">.
# Not every slug is listed — anything absent renders on the default paper hero.
HERO_COLOR: dict[str, str] = {
    # Contact (calm, inviting sky-blue)
    "contact": "sky",
    # About / audience-facing (warm coral)
    "about": "coral",
    "who-we-serve": "coral",
    "expertise": "coral",
    # Services (grounded forest)
    "what-we-do": "forest",
    "field-research": "forest",
    "impact-measurement": "forest",
    "monitoring-evaluation-dissemination": "forest",
    "how-it-works": "forest",
    "market-expansion": "forest",
    "research-development": "forest",
    "entering-a-new-context": "forest",
    "measuring-change": "coral",
    "reporting-to-funders": "cobalt",
    # Library — case studies and articles (warm butter)
    "case-studies": "butter",
    "case-roam": "butter",
    "case-pyropower": "butter",
    "case-reef-support": "butter",
    "case-mimaji": "butter",
    "case-statia": "butter",
    "case-context-entry": "butter",
    "case-rd-prototype": "butter",
    "case-manufacturing": "butter",
    "case-ai-digital": "butter",
    "case-finance": "butter",
    "articles": "butter",
    "insight-eu-us": "butter",
    "insight-eu-africa": "butter",
    "insight-transitions-outcomes": "butter",
    "insight-ai-absorptive-capacity": "butter",
    "insight-absorbing-the-gap": "butter",
    "insight-incumbents-second-life": "butter",
    "qualitative-vs-quantitative": "cobalt",
    "insight-the-reporting-loop": "butter",
    "insight-distance-work-reward": "butter",
    "insight-one-month-not-a-trend": "butter",
    "insight-anchor-tenant": "butter",
    "insight-benefits-nobody-looked-for": "butter",
    "insight-same-queue": "butter",
    "insight-what-the-bond-secures": "butter",
    "insight-hurdle-not-risk": "butter",
    "insight-capability-slow-part": "butter",
    "insight-who-holds-the-pen": "butter",
    "insight-paying-for-what-we-curtail": "butter",
    "insight-downstream-of-the-buyer": "butter",
    "insight-own-the-battery": "butter",
    "insight-nobody-buys-a-chiller": "butter",
    "insight-second-step": "butter",
    "insight-right-to-the-tree": "butter",
    "insight-behind-the-border": "butter",
    "insight-the-smelter-contract": "butter",
    "insight-cheaper-to-verify": "butter",
    "insight-customers-who-can-leave": "butter",
    "insight-warm-house-not-cheaper": "butter",
    "insight-enough-demonstrations": "butter",
    "insight-lock-in-both-ways": "butter",
    "insight-stacking-not-switching": "butter",
    "insight-ban-is-not-the-policy": "butter",
    "insight-fire-and-livelihood": "butter",
    "insight-recycled-is-a-promise": "butter",
    "insight-who-does-it-fail-for": "butter",
    "insight-municipality-is-the-instrument": "butter",
    "insight-symbiosis-not-a-site-plan": "butter",
    "insight-twenty-kilometres-off": "butter",
    "insight-wrong-money-for-a-warehouse": "butter",
    "insight-the-mandate-is-the-mine": "butter",
    "insight-trough-before-the-dividend": "butter",
    "for-funders": "cobalt",
    "esf-social-innovation": "butter",
    # Method / framework pages (deep cobalt)
    "brw": "cobalt",
    "readiness-levels": "cobalt",
    "resources": "cobalt",
    "interview-guide": "cobalt",
    "impact-tracking-template": "cobalt",
    # Research programmes (forest)
}

# ────────────────────────────────────────────────────────────────────────────
# Nav
# ────────────────────────────────────────────────────────────────────────────

ABOUT = [
    ("about", "About the Lab"),
    ("who-we-serve", "Who we serve"),
    ("for-funders", "For Funders"),
    ("how-it-works", "How It Works"),
]

SERVICES = [
    ("what-we-do", "Overview"),
    ("entering-a-new-context", "Entering a New Context"),
    ("measuring-change", "Measuring Change"),
    ("reporting-to-funders", "Reporting to Funders"),
]

EXPERTISE = [
    ("expertise", "All expertise"),
    ("expertise-e-mobility", "E-Mobility & Transport"),
    ("expertise-energy", "Energy Access"),
    ("expertise-water", "Water & Sanitation"),
    ("expertise-agriculture", "Regenerative Agriculture"),
    ("expertise-manufacturing", "Local Manufacturing"),
    ("expertise-ai-digital", "AI & Digital"),
    ("expertise-finance", "Financial Inclusion"),
    ("expertise-climate", "Climate & Ecosystems"),
]

LIBRARY = [
    ("articles", "Articles &amp; insights"),
    ("case-studies", "Case studies"),
    ("resources", "Resources"),
    ("brw", "The BRW framework"),
    ("readiness-levels", "TRL &amp; SRL"),
]

NAV = [
    {"slug": "__about", "label": "About", "dropdown": ABOUT},
    {"slug": "__services", "label": "Services", "dropdown": SERVICES},
    {"slug": "__expertise", "label": "Expertise", "dropdown": EXPERTISE},
    {"slug": "__library", "label": "Reading", "dropdown": LIBRARY},
    {"slug": "contact", "href": "/contact", "label": "Contact", "cta": True},
]


def render_nav(current_slug: str) -> str:
    """Return the <nav> element.

    Dropdown groups render as native <details>/<summary> elements. The
    browser handles the toggle natively (no JS), which sidesteps every
    click/timing issue and works identically across desktop and mobile.
    """
    out = ['<nav id="menu">']
    for item in NAV:
        is_current = item["slug"] == current_slug
        in_dropdown = False
        if "dropdown" in item:
            in_dropdown = any(slug == current_slug for slug, _ in item["dropdown"])
        current_class = " current" if is_current or in_dropdown else ""

        if "dropdown" in item:
            out.append(f'  <details class="nav-group{current_class}">')
            out.append(f'    <summary class="nav-label">{item["label"]}</summary>')
            out.append(f'    <div class="nav-dropdown">')
            for slug, label in item["dropdown"]:
                child_current = ' class="current"' if slug == current_slug else ""
                # Small country/flag adornment for specific nav entries.
                label_html = label
                if slug == "european-impact-tracking":
                    label_html = (
                        f'<img src="/assets/img/eu-flag-small.jpg" alt="" '
                        f'class="nav-flag" aria-hidden="true">{label}'
                    )
                out.append(f'      <a href="/{slug}"{child_current}>{label_html}</a>')
            out.append(f'    </div>')
            out.append(f'  </details>')
        elif item.get("cta"):
            klass = "btn btn-ghost" + (" current" if is_current else "")
            out.append(f'  <a href="{item["href"]}" class="{klass}">{item["label"]}</a>')
        else:
            klass = f' class="current"' if is_current else ""
            out.append(f'  <a href="{item["href"]}"{klass}>{item["label"]}</a>')
    out.append("</nav>")
    return "\n".join(out)


# ────────────────────────────────────────────────────────────────────────────
# Per-page metadata: description, and any category label to show as eyebrow
# ────────────────────────────────────────────────────────────────────────────

# Per-page SEO metadata, keyed by slug. Follows the Lab's SEO metadata guide:
# title tag format "Primary Keyword | Transitions Lab" (under 60 chars),
# meta description 140-155 chars, active voice, primary keyword natural.
# `title` here overrides the entire <title>. `description` overrides the
# default fallback (which is the standfirst).
META: dict[str, dict[str, str]] = {
    "index": {
        "title": "Transitions Lab | Technology Adoption & Transition Research",
        "description": "Independent research on technology adoption, technology transitions, societal readiness and emerging markets, grounded in applied social science and field research.",
    },
    "about": {
        "title": "About | Technology Transition Research | Transitions Lab",
        "description": "An independent research team based in Delft, studying how technologies meet real people. We publish our own research and measure impact for others, honestly.",
    },
    "who-we-serve": {
        "title": "Who We Serve | Transitions Lab",
        "description": "Independent evidence for companies entering markets, funders needing portfolio proof, European consortia, NGOs, and research teams. Find the fit.",
    },
    "what-we-do": {
        "title": "What We Do | Field Research & Impact Measurement",
        "description": "Independent field research, impact measurement, and European impact tracking for technology in the real world. Evidence you can act on, not a slide deck.",
    },
    "field-research": {
        "title": "Field Research in Emerging Markets | Transitions Lab",
        "description": "Rigorous primary research in the places it is hardest to do well: interviews, surveys, and fieldwork in emerging and developing-market contexts.",
    },
    "impact-measurement": {
        "title": "Impact Measurement | Applied Research | Transitions Lab",
        "description": "We measure what a technology or programme actually changes, for whom, and how, across reach, depth, and experience. Independent, rigorous, repeatable.",
    },
    "european-impact-tracking": {
        "title": "European Impact Tracking | Baseline to Endline | Transitions Lab",
        "description": "Independent before-and-after impact measurement for European projects, demonstrations, and socially innovative actions. Baseline, midline, endline, done right.",
    },
    "monitoring-evaluation-dissemination": {
        "title": "Monitoring, Evaluation & Dissemination | Transitions Lab",
        "description": "Independent monitoring, evaluation, and dissemination for any project, and for European projects with Grant Agreement obligations. Grounded in evaluation science.",
    },
    "market-expansion": {
        "title": "Market & Expansion Research | Transitions Lab",
        "description": "Independent field evidence for the decision to enter a new market. Who adopts, at what price, and which failure modes to name before capital is committed.",
    },
    "research-development": {
        "title": "Research & Development Support | Transitions Lab",
        "description": "Independent field evidence for R&D-stage decisions: what to build, whom to build it for, and whether the prototype meets its real environment. TRL and SRL, read together. For corporate R&D and European R&D consortia (Horizon Europe RIA/IA, EIC, EIT KICs, LIFE, ESF+).",
    },
    "entering-a-new-context": {
        "title": "Entering a New Context | Transitions Lab",
        "description": "Independent field evidence for the decision to enter a new market, launch a new product line, or extend a working model into a new geography.",
    },
    "measuring-change": {
        "title": "Measuring Change | Field Research & Impact Measurement | Transitions Lab",
        "description": "What a technology or programme actually changes, for whom, and through what pathway. Reach, depth, and experience, measured from the human side first.",
    },
    "reporting-to-funders": {
        "title": "Reporting to Funders | MED & European Impact Tracking | Transitions Lab",
        "description": "The measurement, evaluation, and dissemination that turns a project's evidence into a defensible account. Independent, set up at the start, closed with proof.",
    },
    "how-it-works": {
        "title": "How It Works | Scope, Design, Collect, Analyse, Deliver | Transitions Lab",
        "description": "From the decision you need to settle to evidence you can act on, in weeks. Five stages: scope, design, collect, analyse and benchmark, deliver.",
    },
    "esf-social-innovation": {
        "title": "ESF+ Social Innovation: Independent Measurement | Transitions Lab",
        "description": "Independent, field-based measurement for ESF+ social innovation and social experimentation projects. Evidence of what actually changed, built for transnational calls.",
    },
    "articles": {
        "title": "Articles | Transitions Lab",
        "description": "Independent analysis and opinion pieces from Transitions Lab. Evidence-first reading of the transitions and relationships we study.",
    },
    "contact": {
        "title": "Contact | Start a Research Conversation | Transitions Lab",
        "description": "Tell us the decision you are facing and we will tell you honestly whether research can help. Confidential from the first message. No cost to ask.",
    },
    "expertise": {
        "title": "Expertise | Eight Transitions We Study | Transitions Lab",
        "description": "The transitions the Lab knows deeply, from e-mobility and energy access to AI, water, agriculture, manufacturing, finance, and climate.",
    },
    "expertise-e-mobility": {
        "title": "E-Mobility & Transport Research | Transitions Lab",
        "description": "How electric and shared transport crosses from novelty to default in markets built around petrol, and whether the infrastructure keeps pace.",
    },
    "expertise-energy": {
        "title": "Energy Access & Off-Grid Systems Research | Transitions Lab",
        "description": "How decentralised energy reaches the hundreds of millions still beyond the grid, and whether it reaches them fairly and durably.",
    },
    "expertise-water": {
        "title": "Water & Sanitation Research | Transitions Lab",
        "description": "How safe water and sanitation are delivered, sustained, and trusted, in the one region where the number of people without access is still rising.",
    },
    "expertise-agriculture": {
        "title": "Regenerative Agriculture & Agri-Tech Research | Transitions Lab",
        "description": "How smallholders adopt technologies that turn waste into value and degraded land into productive soil, with GIS and spatial fieldwork.",
    },
    "expertise-manufacturing": {
        "title": "Local Manufacturing & Supply Chains Research | Transitions Lab",
        "description": "How productive capacity is built where things are used, and whether local assembly and value addition actually reach the people they promise to.",
    },
    "expertise-ai-digital": {
        "title": "AI & Digital Systems Research | Transitions Lab",
        "description": "How AI and digital tools land in contexts they were not designed for, and whether they close divides or widen them. Trust, context, competency.",
    },
    "expertise-finance": {
        "title": "Financial Inclusion & Payment Systems Research | Transitions Lab",
        "description": "How payment, credit, and financing systems carry, or block, every other transition that depends on people being able to pay over time.",
    },
    "expertise-climate": {
        "title": "Climate Resilience & Ecosystems Research | Transitions Lab",
        "description": "How communities and ecosystems adapt to a changing climate, across reefs, forests, wetlands, and biodiversity, and how monitoring drives action.",
    },
    "case-studies": {
        "title": "Case Studies | Field Research in Action | Transitions Lab",
        "description": "Where the Lab has worked on the ground: electric transport in Nairobi, biochar in Lombok, marine rangers in Indonesia. Real transitions, studied.",
    },
    "case-roam": {
        "title": "Electric Transport in Nairobi | Transitions Lab",
        "description": "How electric two-wheelers cross the affordability threshold in a petrol-dominated market, and what carries riders across it. A field case study.",
    },
    "case-pyropower": {
        "title": "Biochar & Clean Energy in Lombok: Pyropower | Transitions Lab",
        "description": "What happens when smallholder farmers turn crop waste into energy and soil on a decentralised, open-source kiln. A field case study.",
    },
    "case-reef-support": {
        "title": "Rangers for Marine Ecosystems: Reef Support | Transitions Lab",
        "description": "How community rangers, sensors, and satellite data combine into a shared, trustworthy picture of reef health. A socio-technical monitoring case study.",
    },
    "case-mimaji": {
        "title": "Water Transparency in Nairobi: MiMaji | Transitions Lab",
        "description": "How open data on water price and quality becomes an intervention in its own right, changing who can hold a water market to account. A field case study.",
    },
    "case-statia": {
        "title": "Mobility on a Small Island: St. Eustatius | Transitions Lab",
        "description": "Planning transport for a Dutch Caribbean community of a few thousand, where mainland tools fail. A public-sector field case study, in Dutch and English.",
    },
    "case-context-entry": {
        "title": "Before the Capital: A Market-Entry Study | Transitions Lab",
        "description": "What a mobility venture learned before committing capital to a new market, and how field evidence turned a hopeful expansion into a reasoned one.",
    },
    "case-rd-prototype": {
        "title": "Before the Freeze: An R&D-Stage Field Test of a Cold-Chain Prototype | Transitions Lab",
        "description": "What a European hardware venture learns when a lab-tested solar vaccine fridge meets a rural East African clinic for the first time, and how that evidence changes the next design cycle. An illustrative R&D-Support case.",
    },
    "case-manufacturing": {
        "title": "Assembly to Value: Local Manufacturing in East Africa | Transitions Lab",
        "description": "When a product moves from imported to locally assembled, whether the 'local' part actually reaches the workers, suppliers, and customers it promises to.",
    },
    "case-ai-digital": {
        "title": "Digital Services in Low-Connectivity Contexts | Transitions Lab",
        "description": "When a digital tool designed for always-connected users meets an intermittent phone, a shared device, and a language it wasn't tested in.",
    },
    "case-finance": {
        "title": "The Payment Rail: What Mobile Money Carries | Transitions Lab",
        "description": "Every transition depends on one prior question: can people pay for it, over time, in the way their income actually arrives.",
    },
    "insight-eu-us": {
        "title": "Europe Invents, America Scales: The Innovation Gap | Transitions Lab",
        "description": "Europe produces world-class innovation and struggles to commercialise it; the US does the reverse. What the asymmetry means, and where evidence fits.",
    },
    "insight-eu-africa": {
        "title": "The EU and Africa: Opportunity and the Evidence In Between | Transitions Lab",
        "description": "Europe is committing hundreds of billions to Africa, and Africa is the growth market of the century. Where the two fit, and what stands between.",
    },
    "insight-transitions-outcomes": {
        "title": "Four Ways a Transition Lands: State Capacity Against Niche Success | Transitions Lab",
        "description": "A two-axis diagnostic sorting every real socio-technical transition into one of four patterns: directed, coordinated, stalled, or bounded leapfrogging.",
    },
    "insight-ai-absorptive-capacity": {
        "title": "The Asymmetry Nobody Is Metering: AI, Climate & Absorptive Capacity | Transitions Lab",
        "description": "The AI-and-climate debate is stuck on data-centre electricity. The decisive variable is which sectors are ready to convert AI into productivity, and the fossil economy has a head start.",
    },
    "insight-absorbing-the-gap": {
        "title": "Who Absorbs the Gap: Electric Mobility Where the Grid Cannot Be Assumed | Transitions Lab",
        "description": "Where the grid is unreliable, adoption is decided by which party absorbs the volatility. A reliability ledger for reading market-entry decisions in e-mobility.",
    },
    "insight-incumbents-second-life": {
        "title": "The Incumbent's Second Life: What Travels With a Capability | Transitions Lab",
        "description": "When mining incumbents redeploy into critical minerals, capability transfers with them. So does conduct. Why one is verified and the other is not.",
    },
    "qualitative-vs-quantitative": {
        "title": "Qualitative vs Quantitative: What Numbers Can and Cannot Measure | Transitions Lab",
        "description": "A plain-language guide to the two kinds of research evidence, and how they work together. What qualitative work can tell you that numbers, on their own, never will.",
    },
    "for-funders": {
        "title": "For Funders | Portfolio Verification, SROI & the Funder Dashboard | Transitions Lab",
        "description": "Independent, field-verified evidence of what a grant portfolio is actually achieving. SROI to standard, portfolio benchmarking, and a dashboard behind which every figure has been checked.",
    },
    "insight-the-reporting-loop": {
        "title": "The Reporting Loop: Why Funders Learn From Grantees | Transitions Lab",
        "description": "The structural reason grant portfolios keep looking rosier than they are, why more dashboards and more indicators don't fix it, and what a genuine alternative would have to look like.",
    },
    "insight-distance-work-reward": {
        "title": "The Distance Between the Work and the Reward | Transitions Lab",
        "description": "One climate venture needs a verification apparatus to function. Another needs a purchase order. The difference is the distance between the person who bears the cost of change and the person who receives the benefit.",
    },
    "insight-one-month-not-a-trend": {
        "title": "One Month Is Not a Trend: Venture Money and Infrastructure Economics | Transitions Lab",
        "description": "Southeast Asian startup funding fell 84% in a month while climate companies kept raising. A percentage without its base is not a finding, and infrastructure economics do not fit a ten-year fund.",
    },
    "insight-anchor-tenant": {
        "title": "The Anchor Tenant: How Platforms Became the Utility Nobody Elected | Transitions Lab",
        "description": "Grab is putting a charging network inside its driver app. Yulu is renting out 200,000 electric bikes. Both solve an infrastructure-financing problem by owning the demand, and concentrate three dependencies on one counterparty.",
    },
    "insight-benefits-nobody-looked-for": {
        "title": "The Benefits Nobody Was Looking For | Transitions Lab",
        "description": "New evidence that upgrading informal settlements produces heat resilience raises a harder question than whether it is true. The benefit was not hidden; it was never in the results framework.",
    },
    "insight-same-queue": {
        "title": "Standing in the Same Queue | Transitions Lab",
        "description": "A 74 MW solar plant in Timor-Leste and an AI data-centre order from the same factories. Transformer lead times have doubled since 2021. Nobody publishes what small buyers in small markets are actually paying, or waiting.",
    },
    "insight-what-the-bond-secures": {
        "title": "What the Bond Is Actually Secured On | Transitions Lab",
        "description": "African off-grid solar has become an asset class by turning household repayments into collateral. The security is not the hardware. It is the ability to switch the light off, and water has no equivalent.",
    },
    "insight-hurdle-not-risk": {
        "title": "The Hurdle Is Not the Risk | Transitions Lab",
        "description": "A new vehicle aims to channel Nigerian pension savings into climate infrastructure, backed by a US$253m first-loss commitment. The evidence suggests credit risk is not what has been keeping the funds out.",
    },
    "insight-capability-slow-part": {
        "title": "Capability Is the Slow Part | Transitions Lab",
        "description": "A fabrication programme in Nigeria and a 24 GW target in Indonesia are constrained by the same thing, and it is not money. Capability formation runs on a decade timescale, not a twelve-month one.",
    },
    "insight-who-holds-the-pen": {
        "title": "Who Holds the Pen on the Standard | Transitions Lab",
        "description": "An open battery-swapping network in Kenya solves the fragmentation problem holding African motorcycle electrification back. Open architecture is a technical property; whether the standard is governed is a separate question.",
    },
    "insight-paying-for-what-we-curtail": {
        "title": "Paying for Power You Curtail | Transitions Lab",
        "description": "Kenya generates around 93 per cent of its electricity from renewables and has some of the region's most expensive power. A plan to more than triple generation does not address why.",
    },
    "insight-downstream-of-the-buyer": {
        "title": "Resilience Is Downstream of the Buyer | Transitions Lab",
        "description": "A development bank lent US$100 million to a commodity trader to reach smallholders. That is a diagnosis, and it revives an old question about bundled credit, inputs and offtake.",
    },
    "insight-own-the-battery": {
        "title": "Own the Battery, Rent the Shopfront | Transitions Lab",
        "description": "Two battery-swapping companies raised money this month with opposite architectures. The choice is a make-or-buy decision with a testable answer.",
    },
    "insight-nobody-buys-a-chiller": {
        "title": "Nobody Buys a Chiller | Transitions Lab",
        "description": "Industrial efficiency projects with three-year paybacks routinely do not get done. A new US$100 million platform treats that as a financing problem. It is mostly a risk and attention problem, and the product being sold is a counterfactual.",
    },
    "insight-second-step": {
        "title": "The Value Is in the Second Step | Transitions Lab",
        "description": "Firm power was the binding constraint on African mineral processing. It now has a working answer in the Congolese copperbelt. The tariff schedule was always the other half.",
    },
    "insight-right-to-the-tree": {
        "title": "The Right That Matters Is to the Tree | Transitions Lab",
        "description": "A US$2 billion restoration programme has launched for Asia and the Pacific. The evidence says the constraint is not ownership of the land but permission to cut the tree down.",
    },
    "insight-behind-the-border": {
        "title": "Behind the Border | Transitions Lab",
        "description": "Around 60 per cent of Africa's trade costs sit inside countries rather than at their borders. Variance, not price, is what stops firms depending on each other.",
    },
    "insight-the-smelter-contract": {
        "title": "The Smelter Contract | Transitions Lab",
        "description": "A US$45 billion compute deal includes 460 MW at one site. That is how smelters buy power, and there is sixty years of evidence about those bargains.",
    },
    "insight-cheaper-to-verify": {
        "title": "The Cheaper It Gets to Verify, the Less Anyone Visits | Transitions Lab",
        "description": "Satellite radar can now confirm whether a rice paddy was flooded, plot by plot. That is a real advance. It also removes the last budgeted reason anybody had to go and look.",
    },
    "insight-customers-who-can-leave": {
        "title": "The Customers Who Can Leave | Transitions Lab",
        "description": "South African miners are building three gigawatts of their own power. Every large customer that leaves the grid takes its share of the fixed costs with it. Tariff design decides who pays.",
    },
    "insight-warm-house-not-cheaper": {
        "title": "A Warm House Is Not a Cheaper One | Transitions Lab",
        "description": "Greece has €4.77 billion for vulnerable households. The prebound effect says the poorest will receive comfort rather than savings, which is a real benefit and not the one the fund promised.",
    },
    "insight-enough-demonstrations": {
        "title": "Europe Has Enough Demonstrations | Transitions Lab",
        "description": "European crop forecasts are down and the pilots have done their job. Feasibility evidence is not adoption evidence, because of who volunteers for a demonstration.",
    },
    "insight-lock-in-both-ways": {
        "title": "The Lock-In Runs Both Ways | Transitions Lab",
        "description": "The DRC wants to make battery precursor rather than export cobalt. The barrier is qualification, and the same mechanism that shuts the door is why it is worth opening, if the window stays open.",
    },
    "insight-stacking-not-switching": {
        "title": "Stacking, Not Switching | Transitions Lab",
        "description": "Africa will install 17 GW of solar this year and three quarters of it is invisible to official statistics. We can see it because China publishes what it ships. Capacity installed is not fuel displaced.",
    },
    "insight-ban-is-not-the-policy": {
        "title": "The Ban Is Not the Policy | Transitions Lab",
        "description": "Zimbabwe will stop lithium concentrate exports in January and has one processing plant. Morocco is starting battery production without needing a restriction at all. The difference is whether the threat is credible and whether the plant is open.",
    },
    "insight-fire-and-livelihood": {
        "title": "The Fire Was Put Out by People Making a Living | Transitions Lab",
        "description": "Europe's landscapes did not burn like this when people grazed, coppiced and farmed them. Fuel management was a by-product of a livelihood. You cannot purchase a by-product directly without changing what it costs.",
    },
    "insight-recycled-is-a-promise": {
        "title": "A Recycled Material Is a Promise | Transitions Lab",
        "description": "The Commission reviewed 120 Horizon projects to find out why circular technologies fail to scale. Not one of the recurring bottlenecks it identified is a recycling technology.",
    },
    "insight-who-does-it-fail-for": {
        "title": "Who Does It Fail For? | Transitions Lab",
        "description": "An accuracy figure is an average and a clinic experiences a distribution. The errors from a system built to include underserved speakers will fall along the same axis as the exclusion.",
    },
    "insight-municipality-is-the-instrument": {
        "title": "The Municipality Is the Instrument | Transitions Lab",
        "description": "Only 16 per cent of Europe's small municipalities have an adaptation plan. Every adaptation instrument assumes an organisation of a certain size. Below that, more funding does not help.",
    },
    "insight-symbiosis-not-a-site-plan": {
        "title": "Symbiosis Does Not Arrive on a Site Plan | Transitions Lab",
        "description": "Rwanda and Namibia are taking the industrial ecosystem as the unit of intervention. The model they are borrowing accreted over twenty years and was never designed.",
    },
    "insight-twenty-kilometres-off": {
        "title": "The Village Twenty Kilometres Off the Road | Transitions Lab",
        "description": "A corridor redistributes market access before it creates it, and the places that lose experience no measurable event.",
    },
    "insight-wrong-money-for-a-warehouse": {
        "title": "Equity Is the Wrong Money for a Warehouse | Transitions Lab",
        "description": "A Nigerian agritech has raised working capital on the domestic commercial paper market. The right instrument arriving for the first time changes what a founder should be optimising for.",
    },
    "insight-the-mandate-is-the-mine": {
        "title": "The Mandate Is the Mine | Transitions Lab",
        "description": "A R47 billion synthetic aviation fuel project in the Northern Cape is being built against demand that exists only because of an EU quota. The resource underneath this asset is legislative.",
    },
    "insight-trough-before-the-dividend": {
        "title": "The Trough Before the Dividend | Transitions Lab",
        "description": "European farm-resilience evidence shows the practice is profitable across ten years and unaffordable in year two. Adaptive capacity is a balance-sheet variable, not a knowledge variable.",
    },
    "readiness-levels": {
        "title": "TRL and SRL Explained: The Two Axes of Readiness | Transitions Lab",
        "description": "Technology Readiness Levels and Societal Readiness Levels explained, with references: what the nine levels mean, and why both axes decide success.",
    },
    "resources": {
        "title": "Resources | Frameworks, Methods & Guides | Transitions Lab",
        "description": "Frameworks, methods, and tools from the Lab's research, published openly: the BRW framework, measurement method, TRL and SRL guides, and more.",
    },
    "interview-guide": {
        "title": "In-Depth Interview Guide | Field Research Method | Transitions Lab",
        "description": "How the Lab reaches depth in qualitative fieldwork: the five-levels-down principle, the funnel structure, and the probing techniques behind it.",
    },
    "impact-tracking-template": {
        "title": "European Impact-Tracking Template | Transitions Lab",
        "description": "A fill-in framework for measuring the before-and-after impact of a European project or demonstration: baseline, midline, endline.",
    },
    "brw": {
        "title": "The BRW Framework: Bypass, Repurpose, Weaken | Transitions Lab",
        "description": "A mechanism-based typology of how niche technologies engage entrenched regimes: bypass, repurpose, or weaken, matched to the barriers they face.",
    },
}

# Pages that exist in the site map but content is not yet supplied.
# The build creates a lightweight, noindex stub so links resolve.
STUB_TITLES: dict[str, str] = {
    "field-research": "Field Research",
    "impact-measurement": "Impact Measurement",
    "european-impact-tracking": "European Impact Tracking",
    "monitoring-evaluation-dissemination": "Monitoring, Evaluation & Dissemination",
    "how-it-works": "How It Works",
    "contact": "Contact",
    "resources": "Resources",
    "interview-guide": "Interview Guide",
    "impact-tracking-template": "Impact Tracking Template",
    "brw": "The BRW Framework",
    "case-roam": "Electric Transport in Nairobi",
    "case-pyropower": "Pyropower - Biochar in Lombok",
    "case-reef-support": "Reef Support - Community Marine Rangers",
    "case-mimaji": "MiMaji - Water Transparency in Nairobi",
    "case-statia": "St. Eustatius - Small-Island Mobility",
    "case-context-entry": "Market-Entry Study, East Africa",
    "case-manufacturing": "Local Manufacturing in East Africa",
    "case-ai-digital": "Digital Services in Low-Connectivity Contexts",
    "case-finance": "The Payment Rail: What Mobile Money Carries",
    "insight-eu-us": "Europe Invents, America Scales",
    "insight-eu-africa": "The EU and Africa",
    "insight-transitions-outcomes": "Four Ways a Transition Lands",
    "insight-ai-absorptive-capacity": "The Asymmetry Nobody Is Metering",
    "insight-absorbing-the-gap": "Who Absorbs the Gap",
    "insight-incumbents-second-life": "The Incumbent's Second Life",
    "qualitative-vs-quantitative": "Qualitative vs Quantitative",
    "for-funders": "For Funders",
    "insight-the-reporting-loop": "The Reporting Loop",
    "expertise-energy": "Energy Access & Off-Grid Systems",
    "expertise-water": "Water & Sanitation",
    "expertise-agriculture": "Regenerative Agriculture & Agri-Tech",
    "expertise-manufacturing": "Local Manufacturing & Supply Chains",
    "expertise-ai-digital": "AI & Digital Systems",
    "expertise-finance": "Financial Inclusion & Payment Systems",
    "expertise-climate": "Climate Resilience & Ecosystems",
}

# Sitemap priority per section (approximate).
SITEMAP_PRIORITY = {
    "/": 1.0,
    "/about": 0.8,
    "/what-we-do": 0.9,
    "/entering-a-new-context": 0.85,
    "/research-development": 0.8,
    "/measuring-change": 0.85,
    "/reporting-to-funders": 0.85,
    "/expertise": 0.9,
    "/who-we-serve": 0.8,
    "/for-funders": 0.75,
    "/case-studies": 0.85,
    "/contact": 0.6,
}


# ────────────────────────────────────────────────────────────────────────────
# Minimal markdown → HTML converter, scoped to what our content uses
# ────────────────────────────────────────────────────────────────────────────

BOLD_RE = re.compile(r"\*\*([^*][^*]*?)\*\*")
ITALIC_RE = re.compile(r"(?<![*A-Za-z0-9])\*([^*\n]+?)\*(?![*A-Za-z0-9])")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
IMAGE_COMMENT_RE = re.compile(r"^<!--\s*IMAGE\s+.*?-->\s*$", re.DOTALL)
HTML_BLOCK_OPEN_RE = re.compile(r"^<(figure|div|section|video|iframe|table|aside|picture|form|ul|ol)\b", re.IGNORECASE)
SECTION_EYEBROW_RE = re.compile(r"^\*\*(§[^*]+)\*\*\s*$")
TOPLINE_SECTION_RE = re.compile(r"^§\s+/\s*(.+)$")
ABS_LINK_RE = re.compile(r"https?://(?:www\.)?transitionslab\.org(/[^\"' )]*)?")


def rewrite_links(url: str) -> str:
    """Turn https://www.transitionslab.org/xxx.html into /xxx."""
    m = ABS_LINK_RE.match(url)
    if not m:
        return url
    path = m.group(1) or "/"
    if path.endswith(".html"):
        path = path[:-5]
    if path == "/index":
        path = "/"
    return path


IMAGE_COMMENT_INLINE_RE = re.compile(r"<!--\s*IMAGE\b.*?-->", re.DOTALL)
TABLE_SEP_RE = re.compile(r"^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$")


def _split_row(line: str) -> list[str]:
    """Split a markdown table row on unescaped pipes."""
    s = line.strip()
    if s.startswith("|"): s = s[1:]
    if s.endswith("|"): s = s[:-1]
    return [c.strip() for c in s.split("|")]


def _parse_table(lines: list[str], i: int) -> tuple[str, int]:
    """Parse a pipe-table starting at lines[i]. Returns (html, next_i)."""
    header = _split_row(lines[i])
    i += 2  # skip header line + separator
    rows: list[list[str]] = []
    while i < len(lines) and lines[i].strip().startswith("|"):
        rows.append(_split_row(lines[i]))
        i += 1

    parts = ['<div class="table-wrap"><table class="tbl">']
    parts.append("<thead><tr>")
    for h in header:
        parts.append(f"<th>{inline(h)}</th>")
    parts.append("</tr></thead>")
    if rows:
        parts.append("<tbody>")
        for row in rows:
            parts.append("<tr>")
            for cell in row:
                parts.append(f"<td>{inline(cell)}</td>")
            parts.append("</tr>")
        parts.append("</tbody>")
    parts.append("</table></div>")
    return "".join(parts), i


def inline(text: str) -> str:
    """Apply inline transforms to a run of text. Assumes text is *not* HTML-escaped yet.

    HTML IMAGE placeholder comments (`<!-- IMAGE ... -->`) are preserved as
    real HTML comments in the output so they stay invisible on the page but
    remain visible in view-source for whoever is later swapping images in.
    """
    # Stash any inline IMAGE comments so HTML escaping doesn't turn them
    # into literal &lt;!-- IMAGE …&gt; text on the page.
    stashed: list[str] = []

    def _stash(m: re.Match) -> str:
        stashed.append(m.group(0))
        return f"\x00IMG{len(stashed) - 1}\x00"

    text = IMAGE_COMMENT_INLINE_RE.sub(_stash, text)

    # Escape first so we don't corrupt user text; then re-inject our tags
    text = htmllib.escape(text, quote=False)

    # Links
    def link_sub(m: re.Match) -> str:
        label = m.group(1)
        raw = m.group(2)
        url = rewrite_links(raw)
        external = url.startswith("http")
        attrs = ' target="_blank" rel="noopener"' if external else ""
        return f'<a href="{htmllib.escape(url, quote=True)}"{attrs}>{label}</a>'

    text = LINK_RE.sub(link_sub, text)

    # Bold before italic (so **x** doesn't get eaten by italic pass)
    text = BOLD_RE.sub(r"<strong>\1</strong>", text)
    text = ITALIC_RE.sub(r"<em>\1</em>", text)
    text = INLINE_CODE_RE.sub(r"<code>\1</code>", text)

    # Restore the stashed HTML comments
    for idx, comment in enumerate(stashed):
        text = text.replace(f"\x00IMG{idx}\x00", comment)
    return text


@dataclass
class Page:
    slug: str
    title: str                      # H1 text
    eyebrow_top: str | None         # top "§ / label" if present
    standfirst_html: str | None     # italic lede paragraph
    body_html: str                  # body prose
    description: str                # meta description


CITE_TAG_RE = re.compile(r"</?cite\b[^>]*>", re.IGNORECASE)


def strip_author_notes(md: str) -> str:
    """Remove author-only artefacts before rendering.

      - <!-- NOTE ... --> comments (keeps <!-- IMAGE ... --> placeholders).
      - <cite index="X-Y">...</cite> tags: research-tool artefacts that
        would otherwise render as literal HTML on the page. The enclosed
        text is preserved as ordinary prose; the source list at the
        bottom of each insight/case remains the readable backlink set.
    """
    def _drop_comment(match: re.Match) -> str:
        body = match.group(0)
        if re.search(r"IMAGE", body, re.IGNORECASE):
            return body
        return ""
    md = re.sub(r"<!--.*?-->", _drop_comment, md, flags=re.DOTALL)
    md = CITE_TAG_RE.sub("", md)
    return md


def parse_markdown(md: str) -> tuple[str | None, str, str | None, str]:
    """Return (top_eyebrow, title, standfirst_html, body_html).

    Consumes the top "§ / label" line, the H1, and the first italic-only
    paragraph after it (as standfirst). Everything else becomes body.
    """
    md = strip_author_notes(md)
    lines = md.split("\n")
    top_eyebrow: str | None = None
    title: str | None = None
    standfirst: str | None = None
    body_lines: list[str] = []

    i = 0
    # 1. Optional top-line "§ / label"
    while i < len(lines) and not lines[i].strip():
        i += 1
    if i < len(lines):
        m = TOPLINE_SECTION_RE.match(lines[i].strip())
        if m:
            top_eyebrow = m.group(1).strip()
            i += 1

    # 2. H1
    while i < len(lines) and not lines[i].strip():
        i += 1
    if i < len(lines) and lines[i].startswith("# "):
        title = lines[i][2:].strip()
        i += 1
    else:
        raise ValueError("Missing H1 title")

    # 3. First italic-only paragraph = standfirst
    while i < len(lines) and not lines[i].strip():
        i += 1
    para: list[str] = []
    while i < len(lines) and lines[i].strip():
        para.append(lines[i])
        i += 1
    if para:
        joined = " ".join(l.strip() for l in para)
        if joined.startswith("*") and joined.endswith("*") and not joined.startswith("**"):
            standfirst = joined.strip("*").strip()
        else:
            # Not a standfirst - put it back in the body
            body_lines.extend(para)

    # 4. Rest is body
    body_lines.extend(lines[i:])
    body_html = md_body_to_html("\n".join(body_lines))
    standfirst_html = inline(standfirst) if standfirst else None

    return top_eyebrow, title, standfirst_html, body_html


def md_body_to_html(md: str) -> str:
    """Very small markdown parser for the subset used by these content files."""
    out: list[str] = []
    lines = md.split("\n")
    i = 0

    def close_list(kind: str | None):
        if kind:
            out.append(f"</{kind}>")

    list_kind: str | None = None  # 'ul' or 'ol'

    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()

        # blank line
        if not stripped:
            close_list(list_kind); list_kind = None
            i += 1
            continue

        # HTML passthrough (IMAGE placeholders)
        if IMAGE_COMMENT_RE.match(stripped):
            close_list(list_kind); list_kind = None
            out.append(stripped)
            i += 1
            continue

        # HTML block passthrough (<figure>…</figure>, <div>…</div>, etc.)
        # Counts nested opens/closes of the same tag so that a block like
        # <div class="stage">…<div class="stage-num">01</div>…</div> is
        # captured as ONE block instead of stopping at the inner </div>.
        block_open = HTML_BLOCK_OPEN_RE.match(stripped)
        if block_open:
            close_list(list_kind); list_kind = None
            tag = block_open.group(1).lower()
            open_re = re.compile(rf"<{tag}\b", re.IGNORECASE)
            close_re = re.compile(rf"</{tag}\s*>", re.IGNORECASE)
            block: list[str] = [raw]
            depth = len(open_re.findall(raw)) - len(close_re.findall(raw))
            i += 1
            # Slurp until every open of this tag has its matching close.
            while i < len(lines) and depth > 0:
                block.append(lines[i])
                depth += len(open_re.findall(lines[i])) - len(close_re.findall(lines[i]))
                i += 1
            out.append("\n".join(block))
            continue

        # section eyebrow: **§ ... ** - drop entirely; the H2 that follows
        # carries the meaning, so the eyebrow is redundant.
        m = SECTION_EYEBROW_RE.match(stripped)
        if m:
            close_list(list_kind); list_kind = None
            i += 1
            continue

        # One-line raw HTML: starts with a tag and either self-closes or
        # completes on the same line. Passes through unescaped so inline
        # <a>, <img>, and <p><a></p> markup stops being HTML-escaped.
        if stripped.startswith("<") and (
            stripped.endswith("/>") or
            re.search(r"</\w+\s*>\s*$", stripped) or
            re.match(r"^<img\s", stripped, re.IGNORECASE)
        ):
            close_list(list_kind); list_kind = None
            out.append(stripped)
            i += 1
            continue

        # horizontal rule
        if stripped == "---" or stripped == "***":
            close_list(list_kind); list_kind = None
            out.append("<hr>")
            i += 1
            continue

        # table: line starts with '|' AND next line is a separator ('|---|---|')
        if stripped.startswith("|") and i + 1 < len(lines) and TABLE_SEP_RE.match(lines[i + 1].strip()):
            close_list(list_kind); list_kind = None
            table_html, i = _parse_table(lines, i)
            out.append(table_html)
            continue

        # headings
        for level in (3, 2):
            prefix = "#" * level + " "
            if stripped.startswith(prefix):
                close_list(list_kind); list_kind = None
                text = stripped[len(prefix):].strip()
                out.append(f"<h{level}>{inline(text)}</h{level}>")
                i += 1
                break
        else:
            # bullet list
            if stripped.startswith("- "):
                if list_kind != "ul":
                    close_list(list_kind)
                    out.append("<ul>")
                    list_kind = "ul"
                item = stripped[2:].strip()
                out.append(f"<li>{inline(item)}</li>")
                i += 1
                continue

            # ordered list
            if re.match(r"^\d+\.\s+", stripped):
                if list_kind != "ol":
                    close_list(list_kind)
                    out.append("<ol>")
                    list_kind = "ol"
                item = re.sub(r"^\d+\.\s+", "", stripped)
                out.append(f"<li>{inline(item)}</li>")
                i += 1
                continue

            # blockquote
            if stripped.startswith("> "):
                close_list(list_kind); list_kind = None
                # collect all consecutive > lines
                parts: list[str] = []
                while i < len(lines) and lines[i].strip().startswith("> "):
                    parts.append(lines[i].strip()[2:])
                    i += 1
                out.append(f"<blockquote>{inline(' '.join(parts))}</blockquote>")
                continue

            # paragraph - collect until blank line
            close_list(list_kind); list_kind = None
            para = [raw]
            i += 1
            while i < len(lines) and lines[i].strip() and not any(
                lines[i].strip().startswith(x) for x in ("#", "- ", "> ", "---", "***", "**§", "|", "<figure", "<div", "<section", "<video", "<iframe", "<aside", "<picture")
            ) and not IMAGE_COMMENT_RE.match(lines[i].strip()):
                para.append(lines[i])
                i += 1
            joined = " ".join(l.strip() for l in para)
            out.append(f"<p>{inline(joined)}</p>")
            continue

    close_list(list_kind)
    return "\n".join(out)


# ────────────────────────────────────────────────────────────────────────────
# Page template
# ────────────────────────────────────────────────────────────────────────────

FONT_LINKS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">'
)


def page_shell(*, slug: str, title: str, description: str, body: str,
               noindex: bool = False, extra_head: str = "") -> str:
    """Wrap body content in the shared page shell."""
    canonical = f"{SITE_URL}/{slug}" if slug != "index" else f"{SITE_URL}/"
    og_url = canonical
    # Prefer a slug-specific 1200x627 OG card if one exists, otherwise fall
    # back to the site-wide default. LinkedIn needs an absolute URL to a
    # real 1.91:1 image plus explicit width/height to render the large card.
    slug_og = ROOT / "assets" / "og" / f"{slug}.png"
    if slug_og.exists():
        og_image = f"{SITE_URL}/assets/og/{slug}.png"
    else:
        og_image = f"{SITE_URL}/assets/og-image.png"
    robots = "noindex, follow" if noindex else "index, follow"
    meta_title = META.get(slug, {}).get("title")
    full_title = meta_title or (title if slug == "index" else f"{title} | Transitions Lab")

    nav_html = render_nav(slug)

    head = f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{htmllib.escape(full_title)}</title>
<meta name="description" content="{htmllib.escape(description, quote=True)}">
<meta name="author" content="Transitions Lab">
<meta name="robots" content="{robots}">
<meta name="theme-color" content="#F5EDDD">
<link rel="canonical" href="{canonical}">
<link rel="icon" href="/assets/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="96x96" href="/assets/favicon-96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/assets/icon-512.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="{'website' if slug == 'index' else 'article'}">
<meta property="og:site_name" content="Transitions Lab">
<meta property="og:title" content="{htmllib.escape(full_title, quote=True)}">
<meta property="og:description" content="{htmllib.escape(description, quote=True)}">
<meta property="og:url" content="{og_url}">
<meta property="og:image" content="{og_image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="627">
<meta property="og:image:alt" content="{htmllib.escape(full_title, quote=True)}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{htmllib.escape(full_title, quote=True)}">
<meta name="twitter:description" content="{htmllib.escape(description, quote=True)}">
<meta name="twitter:image" content="{og_image}">
<meta name="twitter:image:alt" content="{htmllib.escape(full_title, quote=True)}">
{FONT_LINKS}
<link rel="stylesheet" href="/assets/theme.css?v={ASSET_CSS_V}">
{extra_head}
</head>
<body data-page="{slug}">

<header class="site">
  <div class="wrap nav">
    <a href="/" class="brand" aria-label="Transitions Lab, home"><img src="/assets/logo-dark.png" alt="Transitions Lab" class="brand-logo"></a>
    {nav_html}
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
  </div>
</header>

{body}

<footer class="site">
  <div class="wrap">
    <div>
      <a href="/" class="brand" aria-label="Transitions Lab, home"><img src="/assets/logo.png" alt="Transitions Lab" class="brand-logo brand-logo--footer"></a>
      <p class="mission">An independent research team that studies how technologies meet real people, and turns what it finds into evidence institutions and innovators can act on.</p>
    </div>
    <div>
      <h4>What we do</h4>
      <a href="/what-we-do">Overview</a>
      <a href="/entering-a-new-context">Entering a new context</a>
      <a href="/measuring-change">Measuring change</a>
      <a href="/reporting-to-funders">Reporting to funders</a>
      <a href="/how-it-works">How it works</a>
    </div>
    <div>
      <h4>Research</h4>
      <a href="/expertise">Expertise</a>
      <a href="/case-studies">Case studies</a>
      <a href="/articles">Articles</a>
      <a href="/resources">Resources</a>
      <a href="/readiness-levels">TRL &amp; SRL</a>
    </div>
    <div>
      <h4>The Lab</h4>
      <a href="/about">About</a>
      <a href="/who-we-serve">Who we serve</a>
      <a href="/for-funders">For Funders</a>
      <a href="/contact">Contact</a>
      <a href="https://www.linkedin.com/company/transitionslab/" target="_blank" rel="noopener">LinkedIn</a>
    </div>
    <div class="legal">
      <span>© Transitions Lab 2026 · Delft, The Netherlands</span>
      <span>Independent research, no trackers</span>
    </div>
  </div>
</footer>

<script src="/assets/site.js?v={ASSET_JS_V}" defer></script>
</body>
</html>
"""
    return head


def build_content_page(slug: str, md: str) -> str:
    """Convert a content markdown file to a full HTML page."""
    top_eyebrow, title, standfirst_html, body_html = parse_markdown(md)

    # Description falls back to plain-text standfirst
    meta = META.get(slug, {})
    description = meta.get("description")
    if not description:
        if standfirst_html:
            description = re.sub(r"<[^>]+>", "", standfirst_html).strip()
        else:
            description = title

    # Eyebrow in the page-hero: either the top "§ / label" or a slug-appropriate default
    hero_eyebrow = top_eyebrow or ""
    hero_color = HERO_COLOR.get(slug, "")
    hero_class = f"page-hero hero-{hero_color}" if hero_color else "page-hero"
    topic_icon = TOPIC_ICONS.get(slug, "")
    icon_html = f'<img src="{topic_icon}" alt="" class="topic-icon" aria-hidden="true">' if topic_icon else ''

    page_hero = f"""<section class="{hero_class}">
  <div class="wrap">
    {icon_html}
    {'<p class="eyebrow">' + inline(hero_eyebrow) + '</p>' if hero_eyebrow else ''}
    <h1>{inline(title)}</h1>
    {'<p class="lede">' + standfirst_html + '</p>' if standfirst_html else ''}
  </div>
</section>"""

    # Featured case study card, injected at the top of expertise-page prose
    featured = FEATURED_CASE.get(slug)
    featured_html = ""
    if featured:
        kind = featured.get("kind", "case")
        kind_label = "Featured field case" if kind == "case" else "Featured Lab reading (illustrative)"
        read_label = "Read the case" if kind == "case" else "Read the reading"
        featured_html = (
            f'<a class="case-feature c-{featured["colour"]} kind-{kind}" href="/{featured["slug"]}">'
            f'  <div class="stripe"><span class="kicker">{kind_label}</span>'
            f'<span class="tag">{featured["kicker"]}</span></div>'
            f'  <div class="body">'
            f'    <h3>{featured["title"]}</h3>'
            f'    <p>{featured["blurb"]}</p>'
            f'    <span class="read">{read_label} &rarr;</span>'
            f'  </div>'
            f'</a>'
        )

    prose_section = f"""<section class="light">
  <div class="wrap-prose">
    <div class="prose">
      {featured_html}
      {body_html}
    </div>
  </div>
</section>"""

    body = page_hero + "\n\n" + prose_section
    if slug in CONTACT_CTA_PAGES:
        body += "\n\n" + CONTACT_CTA_HTML
    return page_shell(slug=slug, title=title, description=description, body=body)


def build_stub_page(slug: str, title: str) -> str:
    """Build a 'coming soon' stub for a page whose content isn't in yet.

    noindex so search engines don't index the placeholder.
    """
    description = f"{title} - content coming soon."
    hero_color = HERO_COLOR.get(slug, "")
    hero_class = f"page-hero hero-{hero_color}" if hero_color else "page-hero"
    body = f"""<section class="{hero_class}">
  <div class="wrap">
    <p class="eyebrow">Coming soon</p>
    <h1>{inline(title)}</h1>
    <p class="lede">This page is on its way. In the meantime, see <a href="/">the home page</a> for an overview, or <a href="/contact">get in touch</a>.</p>
  </div>
</section>

<section class="light">
  <div class="wrap-prose">
    <div class="prose">
      <p>Transitions Lab is an independent research team. This page is being written as part of the site's ongoing build; it will be published shortly.</p>
      <p>If you were looking for something specific, please <a href="/contact">contact us</a>.</p>
    </div>
  </div>
</section>"""
    return page_shell(slug=slug, title=title, description=description,
                      body=body, noindex=True)


# ────────────────────────────────────────────────────────────────────────────
# Home page (custom template, uses the animated hero + sections)
# ────────────────────────────────────────────────────────────────────────────

def build_home() -> str:
    """The home page is hand-built to use the animated hero and section flow.

    Content is drawn from content/home.md thematically, but the structure
    is bespoke - this is the marketing surface of the site.
    """
    slug = "index"
    title = "Transitions Lab - Aligning technology with the people it is meant to serve"
    description = "Transitions Lab is an independent research team. We build deep, honest understanding of socio-technical transitions in emerging markets, so human values and lived experience shape how technologies arrive."

    nav_html = render_nav(slug)
    canonical = f"{SITE_URL}/"
    og_image = f"{SITE_URL}/assets/og-image.png"

    body = """
<!-- HERO - typewriter tagline on video background -->
<section class="hero has-video">
  <video class="hero-video" autoplay muted loop playsinline preload="auto" aria-hidden="true">
    <source src="/assets/media/statement.mp4" type="video/mp4">
  </video>
  <div class="hero-veil" aria-hidden="true"></div>
  <div class="wrap">
    <h1><span id="hero-headline" data-text="A transition is a decision."></span><span class="cursor" id="hero-cursor" aria-hidden="true"></span></h1>
    <p class="lede" id="hero-subhead" data-text="Every transition - energy, mobility, industry - is a series of decisions taken by someone and landing on someone else. Transitions Lab is the independent evidence that keeps those decisions honest about the people they meet."></p>
    <div class="cta-row">
      <a href="/how-it-works" class="btn btn-ink">Start a study →</a>
      <a href="/what-we-do" class="btn btn-ghost">See what we do</a>
    </div>
  </div>
</section>

<!-- WHAT WE DO - service cards -->
<section class="section-white">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">What we do</p>
      <h2>Independent evidence, three ways in.</h2>
      <p>We reach the people a technology or programme actually meets, measure what changes, and report it honestly.</p>
    </div>
    <div class="what-grid">
      <a class="what-card c-butter" href="/entering-a-new-context">
        <span class="what-tag">Client question 01</span>
        <h3>Entering a new context</h3>
        <p>Independent field evidence for the decision to enter a new market or launch a new product line. Who adopts, at what price, and which failure modes to name early.</p>
        <span class="what-more">Read more →</span>
      </a>
      <a class="what-card c-coral" href="/measuring-change">
        <span class="what-tag">Client question 02</span>
        <h3>Measuring change</h3>
        <p>What actually changes, for whom, and through what pathway. Reach, depth, and experience, measured from the human side first.</p>
        <span class="what-more">Read more →</span>
      </a>
      <a class="what-card c-cobalt" href="/reporting-to-funders">
        <img class="what-flag" src="/assets/icons/icon-eu.png" alt="" aria-hidden="true">
        <span class="what-tag">Client question 03</span>
        <h3>Reporting to funders</h3>
        <p>Monitoring, evaluation, dissemination as one connected system. Independent, set up at the start, closed with proof, including for European Grant Agreements.</p>
        <span class="what-more">Read more →</span>
      </a>
    </div>
  </div>
</section>

<!-- NETWORK - short intro, expertise strip, partner-logo marquee -->
<section class="section-forest has-video" style="color:var(--paper);">
  <video class="section-video" autoplay muted loop playsinline preload="auto" aria-hidden="true">
    <source src="/assets/media/network.mp4" type="video/mp4">
  </video>
  <div class="section-veil" aria-hidden="true"></div>
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow" style="color:var(--butter);">Our network</p>
      <h2 style="color:var(--paper);">A global team of researchers, analysts, and field partners.</h2>
      <p style="color:var(--paper);">The Lab is a small core in Delft and a wider network of trained field researchers, local analysts, and long-standing partners in the places we work.</p>
    </div>

    <p class="net-expertise-label">What we bring, across sectors</p>
    <div class="net-expertise-row">
      <a href="/expertise-e-mobility">E-Mobility &amp; Transport</a>
      <a href="/expertise-energy">Energy Access &amp; Off-Grid</a>
      <a href="/expertise-water">Water &amp; Sanitation</a>
      <a href="/expertise-agriculture">Regenerative Agriculture</a>
      <a href="/expertise-manufacturing">Local Manufacturing</a>
      <a href="/expertise-ai-digital">AI &amp; Digital</a>
      <a href="/expertise-finance">Financial Inclusion</a>
      <a href="/expertise-climate">Climate Resilience</a>
    </div>

    <p style="margin-top:36px;"><a href="/expertise" class="btn btn-ghost">See all expertise &rarr;</a></p>
  </div>
</section>

<!-- WHO WE SERVE - five audience cards, deep-linked to /who-we-serve#anchor -->
<section class="section-paper">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Who we serve</p>
      <h2>Who commissions the Lab.</h2>
      <p>Five kinds of organisation, each with a different decision in front of them. Tap through for how the fit works in each case.</p>
    </div>
    <div class="serve-grid">
      <a href="/who-we-serve#companies">
        <h3>Companies &amp; innovators</h3>
        <p>Field evidence for a market you are about to enter. Who actually adopts, and why.</p>
        <span class="arrow">→</span>
      </a>
      <a href="/who-we-serve#funders">
        <h3>Funders &amp; public bodies</h3>
        <p>Portfolio-wide impact evidence that survives review and travels across projects.</p>
        <span class="arrow">→</span>
      </a>
      <a href="/who-we-serve#consortia">
        <h3>European consortia <img src="/assets/img/eu-flag-small.jpg" alt="" class="serve-flag" aria-hidden="true"></h3>
        <p>The independent measurement partner, from baseline through endline.</p>
        <span class="arrow">→</span>
      </a>
      <a href="/who-we-serve#ngos">
        <h3>NGOs &amp; programmes</h3>
        <p>Honest evidence of what is changing on the ground, reported truthfully.</p>
        <span class="arrow">→</span>
      </a>
      <a href="/who-we-serve#researchers">
        <h3>Research teams</h3>
        <p>A field partner with reach, and real technical understanding of the systems being studied.</p>
        <span class="arrow">→</span>
      </a>
    </div>
    <p style="text-align:center;margin-top:48px;"><a href="/who-we-serve" class="btn btn-ghost">See who we serve →</a></p>
  </div>
</section>

<!-- STATEMENT - forest block with big text on a video background -->
<section class="statement has-video">
  <video class="statement-video" autoplay muted loop playsinline preload="auto" aria-hidden="true">
    <source src="/assets/media/hero.mp4" type="video/mp4">
  </video>
  <div class="statement-veil" aria-hidden="true"></div>
  <div class="wrap">
    <blockquote class="reveal">The most useful thing we do is <span class="highlight">listen to the people</span> a technology is about to meet, and report what they say honestly.</blockquote>
    <cite>- Transitions Lab</cite>
    <p style="margin-top:36px;"><a href="/field-research" class="btn">See how we listen &rarr;</a></p>
  </div>
</section>

<!-- LATEST INSIGHTS - three cards with coloured stripes -->
<section class="section-white">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Latest insights</p>
      <h2>Independent reading of the transitions we study.</h2>
      <p>Published openly, alongside our commissioned work. The same evidence-first posture, applied to the big picture.</p>
    </div>
    <div class="insight-row">
      <a class="insight-card has-photo" href="/insight-transitions-outcomes">
        <div class="card-photo">
          <img src="/assets/img/insight-transitions-matrix.jpg" alt="Two-by-two matrix of state capacity against niche success. Four quadrants: Directed Transitions, Coordinated Transition, Stalled Regime, Bounded Leapfrogging.">
          <span class="kicker">Insight &middot; Transitions</span>
        </div>
        <div class="body">
          <h3>Four Ways a Transition Lands</h3>
          <p>A two-axis diagnostic that sorts every real transition into one of four patterns. Where each fails, and how the Lab reads its own cases against the matrix.</p>
          <span class="read">Read &rarr;</span>
        </div>
      </a>
      <a class="insight-card has-photo" href="/brw">
        <div class="card-photo">
          <img src="/assets/img/brw-framework.jpg" alt="Three-panel BRW illustration: Bypass shows a rider routing around a petrol station to a battery-swap station; Repurpose shows a former storefront converted to a service node offering air, water and digital services; Weaken shows a petrol station with one pump crossed out.">
          <span class="kicker">Framework &middot; Method</span>
        </div>
        <div class="body">
          <h3>The BRW Framework</h3>
          <p>Bypass, Repurpose, Weaken. Three mechanisms matched to the three barriers a niche technology actually meets, and why the choice decides what a transition reaches.</p>
          <span class="read">Read &rarr;</span>
        </div>
      </a>
      <a class="insight-card has-photo" href="/insight-wrong-money-for-a-warehouse">
        <div class="card-photo">
          <img src="/assets/img/insight-wrong-money-for-a-warehouse-diagram.jpg" alt="Line-art sequence: a warehouse stacked with grain sacks on the left; above it two funding routes drawn as separate paths, one a long arrow labelled with a ten-year horizon curving far off to the right, the other a short tight loop returning to the warehouse within one season; a harvest calendar wheel sits between them.">
          <span class="kicker">Insight &middot; Finance &amp; Agriculture</span>
        </div>
        <div class="body">
          <h3>Equity Is the Wrong Money for a Warehouse</h3>
          <p>A Nigerian agritech has raised working capital on the domestic commercial paper market. Matching the instrument to the shape of the cash flow changes what a founder should be optimising for.</p>
          <span class="read">Read &rarr;</span>
        </div>
      </a>
      <a class="insight-card has-photo desktop-only" href="/insight-the-mandate-is-the-mine">
        <div class="card-photo">
          <img src="/assets/img/insight-the-mandate-is-the-mine-hero.jpg" alt="Line-art sequence: a solar array and electrolyser in an arid landscape on the left, a tank of synthetic fuel and a cargo ship in the middle, and on the right, in place of a market or a refinery, an open legal statute book with a percentage figure on the page, drawn at the same scale as the industrial objects.">
          <span class="kicker">Insight &middot; Industrial Policy</span>
        </div>
        <div class="body">
          <h3>The Mandate Is the Mine</h3>
          <p>A R47 billion synthetic aviation fuel plant is being built against demand that exists only because of an EU quota. That is a legitimate asset and a different risk.</p>
          <span class="read">Read &rarr;</span>
        </div>
      </a>
      <a class="insight-card has-photo desktop-only" href="/insight-trough-before-the-dividend">
        <div class="card-photo">
          <img src="/assets/img/insight-trough-before-the-dividend-hero.jpg" alt="Line-art scene: a farm income curve drawn as a physical earthwork across a field, dipping into a visible trough in the middle before rising higher than it began, with a farmer and a tractor standing at the lowest point of the dip and a bank building visible on the far horizon.">
          <span class="kicker">Insight &middot; Agriculture &amp; Adaptation</span>
        </div>
        <div class="body">
          <h3>The Trough Before the Dividend</h3>
          <p>Farms are most vulnerable during the transition itself. A practice can be profitable over ten years and unaffordable in year two.</p>
          <span class="read">Read &rarr;</span>
        </div>
      </a>
      <a class="insight-card has-photo desktop-only" href="/insight-municipality-is-the-instrument">
        <div class="card-photo">
          <img src="/assets/img/insight-municipality-is-the-instrument-diagram.jpg" alt="Line-art scene: a large two-storey city hall on the left with a domed roof and flag, several staff visible at desks with laptops through the windows, and above it a single tidy document icon with a green tick. On the right, a small pitched-roof village hall with a Village Hall sign and one person at a laptop through the window, and above it a matching document icon surrounded by orange radiating lines to mark strain. A long dashed arrow crosses the empty space between the two buildings.">
          <span class="kicker">Insight &middot; Adaptation &amp; Governance</span>
        </div>
        <div class="body">
          <h3>The Municipality Is the Instrument</h3>
          <p>Only 16 per cent of Europe's small municipalities have an adaptation plan. The clearance points do not shrink with the council, and that is the constraint.</p>
          <span class="read">Read &rarr;</span>
        </div>
      </a>
    </div>
    <p style="text-align:center;margin-top:48px;"><a href="/articles" class="btn btn-ghost">See all articles →</a></p>
  </div>
</section>

<!-- CASE STUDIES - three field cases -->
<section class="section-paper">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Case studies</p>
      <h2>Where we've worked on the ground.</h2>
      <p>Most commissioned work is delivered privately. The engagements below are the ones partners have agreed to share.</p>
    </div>
    <div class="insight-row">
      <a class="insight-card has-photo" href="/case-roam">
        <div class="card-photo">
          <img src="/assets/img/case-mobility-card.jpg" alt="A boda-boda rider in a hi-vis vest and yellow helmet on a teal electric motorcycle, threading through Nairobi traffic.">
          <span class="kicker">Kenya &middot; E-mobility</span>
        </div>
        <div class="body">
          <h3>Electric transport in Nairobi</h3>
          <p>How electric two-wheelers cross the affordability threshold in a petrol-dominated market, with a Kenyan mobility provider.</p>
          <span class="read">Read the case &rarr;</span>
        </div>
      </a>
      <a class="insight-card has-photo" href="/case-pyropower">
        <div class="card-photo">
          <img src="/assets/img/case-pyropower-hero.jpg" alt="A smallholder farmer in a straw hat holds a handful of biochar, standing beside a large kiln with a fire visible at the base.">
          <span class="kicker">Indonesia &middot; Agriculture</span>
        </div>
        <div class="body">
          <h3>Biochar in Lombok</h3>
          <p>Smallholder farmers turn crop waste into energy and soil on a decentralised, open-source kiln, with Pyropower.</p>
          <span class="read">Read the case &rarr;</span>
        </div>
      </a>
      <a class="insight-card has-photo" href="/case-mimaji">
        <div class="card-photo">
          <img src="/assets/img/case-mimaji-hero.jpg" alt="A woman and a boy at a Nairobi settlement standpipe fill yellow jerry cans; a public tap runs into the container in the foreground.">
          <span class="kicker">Kenya &middot; Water</span>
        </div>
        <div class="body">
          <h3>Water transparency in Nairobi</h3>
          <p>Open data and community accountability change who can hold water systems to account, with the MiMaji Foundation.</p>
          <span class="read">Read the case &rarr;</span>
        </div>
      </a>
    </div>
    <p style="text-align:center;margin-top:48px;"><a href="/case-studies" class="btn btn-ghost">See all case studies →</a></p>
  </div>
</section>

<!-- FREE RESOURCES - grid of downloadable frameworks and method pages -->
<section class="section-paper">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Free resources</p>
      <h2>Frameworks, methods, and tools, published openly.</h2>
      <p>The intellectual apparatus behind the Lab's work, free to download, use, and cite. A working understanding of how technologies meet real people is more useful in the world than in a drawer.</p>
    </div>
    <div class="resource-grid">
      <a class="resource-card" href="/brw">
        <span class="resource-tag">Framework</span>
        <h3>The BRW Framework</h3>
        <p>Bypass, Repurpose, Weaken. Three mechanisms matched to the three barriers a niche technology actually meets, and why the choice decides what a transition reaches.</p>
        <span class="resource-cta">Read &rarr;</span>
      </a>
      <a class="resource-card" href="/insight-transitions-outcomes">
        <span class="resource-tag">Diagnostic</span>
        <h3>Four Ways a Transition Lands</h3>
        <p>State capacity against niche success. A two-axis diagnostic that sorts every real transition into directed, coordinated, stalled or bounded leapfrogging.</p>
        <span class="resource-cta">Read &rarr;</span>
      </a>
      <a class="resource-card" href="/readiness-levels">
        <span class="resource-tag">Page + 2 PDFs</span>
        <h3>TRL &amp; SRL Explained</h3>
        <p>Technology and Societal Readiness Levels. Two nine-level scales and the missing middle where most technologies fail to cross.</p>
        <span class="resource-cta">Read &rarr;</span>
      </a>
      <a class="resource-card" href="/assets/resource-transitions-primer.pdf">
        <span class="resource-tag">PDF &middot; 8 pages</span>
        <h3>Reading a Transition: A Primer</h3>
        <p>What a socio-technical system is, why the human side comes first, and how to turn that reading into evidence.</p>
        <span class="resource-cta">Download &rarr;</span>
      </a>
      <a class="resource-card" href="/impact-measurement">
        <span class="resource-tag">Framework</span>
        <h3>The Evidence Strength Pyramid</h3>
        <p>Five tiers from activity data at the base to attributable impact at the top. The honest answer to whether a report's number is a claim, an observation, or a conclusion.</p>
        <span class="resource-cta">Read &rarr;</span>
      </a>
      <a class="resource-card" href="/impact-tracking-template">
        <span class="resource-tag">Template</span>
        <h3>Impact-Tracking Template</h3>
        <p>A fill-in baseline-midline-endline framework for any programme that needs to prove what a transition actually changed.</p>
        <span class="resource-cta">Open &rarr;</span>
      </a>
    </div>
    <p style="text-align:center;margin-top:48px;"><a href="/resources" class="btn btn-ghost">See all resources &rarr;</a></p>
  </div>
</section>

<!-- PARTNERS - logo strip -->
<section class="section-paper" style="padding:72px 0;">
  <div class="wrap" style="text-align:center;">
    <p class="eyebrow">Partners &amp; collaborators</p>
    <p style="max-width:56ch;margin:0 auto 40px;font-size:17px;line-height:1.5;">Organisations whose engagements or research base the Lab has worked with, published with, or built its methods alongside.</p>
    <div class="logo-strip">
      <a href="/case-mimaji" title="MiMaji Foundation - water transparency in Nairobi"><img src="/assets/logos/logo-mimaji.png" alt="MiMaji Foundation"></a>
      <a href="/case-reef-support" title="Reef Support - community reef monitoring"><img src="/assets/logos/logo-reef-support.png" alt="Reef Support"></a>
    </div>
  </div>
</section>

<!-- CTA - cobalt block -->
<section class="section-cobalt" style="text-align:center;">
  <div class="wrap on-dark" style="max-width:820px;">
    <p class="eyebrow">Start a study</p>
    <h2 style="font-size:clamp(34px,5vw,60px);letter-spacing:-.02em;line-height:1.05;">Tell us the decision. We will design the study.</h2>
    <p style="font-size:20px;margin:22px auto 42px;max-width:56ch;color:var(--paper);font-weight:500;">Send a short note about what you need to know and who it concerns. We will come back with an approach, a timeline, and an honest view of what evidence can and cannot settle.</p>
    <a href="/how-it-works" class="btn">Start a study →</a>
  </div>
</section>
"""

    # No canvas animation on the home page - the ambient gradient in the
    # .hero rules gives enough visual life without a moving canvas.
    return page_shell(slug=slug, title=title, description=description, body=body)


# ────────────────────────────────────────────────────────────────────────────
# 404
# ────────────────────────────────────────────────────────────────────────────

def build_404() -> str:
    body = """<section class="page-hero">
  <div class="wrap">
    <p class="eyebrow">404</p>
    <h1>Page not found.</h1>
    <p class="lede">The URL you followed does not resolve to a published page. It may have been moved, renamed, or never existed. The places below cover where most things sit.</p>
  </div>
</section>

<section class="light">
  <div class="wrap">
    <div class="approach">
      <a class="cell" href="/">
        <div class="step">Start here</div>
        <h3>Home</h3>
        <p>The Lab's overview, positioning, and routes into every part of the site.</p>
      </a>
      <a class="cell" href="/what-we-do">
        <div class="step">Services</div>
        <h3>What we do</h3>
        <p>Field research, impact measurement, European impact tracking, monitoring and evaluation, market and expansion research.</p>
      </a>
      <a class="cell" href="/case-studies">
        <div class="step">Work</div>
        <h3>Case studies</h3>
        <p>Where the Lab has worked on the ground, with named partners.</p>
      </a>
      <a class="cell" href="/contact">
        <div class="step">Contact</div>
        <h3>Talk to us</h3>
        <p>Tell us the decision you are facing and we will tell you honestly whether research can help.</p>
      </a>
    </div>
  </div>
</section>"""
    return page_shell(slug="404", title="Page not found",
                      description="The requested page does not exist. See the home page or contact the Lab.",
                      body=body, noindex=True)


# ────────────────────────────────────────────────────────────────────────────
# Sitemap
# ────────────────────────────────────────────────────────────────────────────

def build_sitemap(paths: list[str]) -> str:
    urls = []
    for p in paths:
        prio = SITEMAP_PRIORITY.get(p, 0.7)
        urls.append(f"  <url><loc>{SITE_URL}{p}</loc><changefreq>monthly</changefreq><priority>{prio}</priority></url>")
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n"


# ────────────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────────────

def main() -> None:
    # Delete old .html files at repo root that aren't going to be rebuilt.
    # We regenerate everything, so wipe any stale HTML first - but keep .git,
    # assets, content, config files.
    for old in ROOT.glob("*.html"):
        old.unlink()

    written: list[str] = []

    # 1. Home
    home_html = _cache_bust_images(build_home())
    (ROOT / "index.html").write_text(home_html, encoding="utf-8")
    written.append("/")
    print("[home]  index.html")

    # 2. Content pages
    real_slugs: set[str] = set()
    for md_path in sorted(CONTENT_DIR.glob("*.md")):
        slug = md_path.stem
        if slug == "home":
            continue  # home is bespoke
        try:
            page = build_content_page(slug, md_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[skip]  {slug}.md: {e}")
            continue
        (ROOT / f"{slug}.html").write_text(_cache_bust_images(page), encoding="utf-8")
        real_slugs.add(slug)
        written.append(f"/{slug}")
        print(f"[page]  {slug}.html")

    # 3. Stubs - for pages the site links to but haven't been written yet
    for slug, title in STUB_TITLES.items():
        if slug in real_slugs:
            continue
        (ROOT / f"{slug}.html").write_text(_cache_bust_images(build_stub_page(slug, title)), encoding="utf-8")
        print(f"[stub]  {slug}.html")
        # stubs deliberately excluded from sitemap

    # 4. 404
    (ROOT / "404.html").write_text(_cache_bust_images(build_404()), encoding="utf-8")
    print("[404]   404.html")

    # 5. Sitemap
    (ROOT / "sitemap.xml").write_text(build_sitemap(written), encoding="utf-8")
    print(f"[map]   sitemap.xml ({len(written)} urls)")


if __name__ == "__main__":
    main()
