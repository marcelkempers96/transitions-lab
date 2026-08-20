#!/usr/bin/env python3
"""Build the Transitions Lab static site from content/*.md.

Reads each markdown file in ./content/, converts to HTML wrapped in the
shared theme, writes to <slug>.html at the repo root. Idempotent — safe
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
import html as htmllib
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT_DIR = ROOT / "content"
SITE_URL = "https://transitionslab.org"

# ────────────────────────────────────────────────────────────────────────────
# Nav
# ────────────────────────────────────────────────────────────────────────────

ABOUT = [
    ("about", "About the Lab"),
    ("geographies", "Where we work"),
    ("who-we-serve", "Who we serve"),
    ("how-it-works", "How It Works"),
    ("team", "Team"),
]

SERVICES = [
    ("what-we-do", "Overview"),
    ("field-research", "Field Research"),
    ("applied-research", "Impact Measurement"),
    ("european-impact-tracking", "European Impact Tracking"),
    ("monitoring-evaluation-dissemination", "Monitoring, Evaluation & Dissemination"),
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

WORK = [
    ("case-studies", "Case studies"),
    ("programmes", "Research programmes"),
    ("brw", "The BRW framework"),
    ("readiness-levels", "TRL & SRL"),
    ("resources", "Resources"),
]

ARTICLES = [
    ("insight-eu-us", "Europe Invents, America Scales"),
    ("insight-eu-africa", "The EU and Africa"),
    ("esf-social-innovation", "ESF+ Social Innovation"),
]

NAV = [
    {"slug": "__about", "label": "About", "dropdown": ABOUT},
    {"slug": "__services", "label": "Services", "dropdown": SERVICES},
    {"slug": "__expertise", "label": "Expertise", "dropdown": EXPERTISE},
    {"slug": "__work", "label": "Work", "dropdown": WORK},
    {"slug": "__articles", "label": "Articles", "dropdown": ARTICLES},
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
                out.append(f'      <a href="/{slug}"{child_current}>{label}</a>')
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
    "applied-research": {
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
    "how-it-works": {
        "title": "How It Works | Scope, Design, Collect, Deliver | Transitions Lab",
        "description": "From the decision you need to make to evidence you can act on, in weeks. Our four-step research process: Scope, Design, Collect, Deliver.",
    },
    "esf-social-innovation": {
        "title": "ESF+ Social Innovation: Independent Measurement | Transitions Lab",
        "description": "Independent, field-based measurement for ESF+ social innovation and social experimentation projects. Evidence of what actually changed, built for transnational calls.",
    },
    "geographies": {
        "title": "Where We Work | East Africa, Southeast Asia, Dutch Caribbean | Transitions Lab",
        "description": "The Lab works where it is rooted: East Africa, coastal Southeast Asia, and the Dutch Caribbean, Suriname and Guyana. Named local partners, not parachuted research.",
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
        "title": "Electric Transport in Nairobi: Roam | Transitions Lab",
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
    "insight-eu-us": {
        "title": "Europe Invents, America Scales: The Innovation Gap | Transitions Lab",
        "description": "Europe produces world-class innovation and struggles to commercialise it; the US does the reverse. What the asymmetry means, and where evidence fits.",
    },
    "insight-eu-africa": {
        "title": "The EU and Africa: Opportunity and the Evidence In Between | Transitions Lab",
        "description": "Europe is committing hundreds of billions to Africa, and Africa is the growth market of the century. Where the two fit, and what stands between.",
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
    "programmes": {
        "title": "Research Programmes | Transitions Lab",
        "description": "The Lab's field-grounded research on electric mobility, regenerative agriculture, environmental monitoring, water access, and finance, read through the BRW framework.",
    },
    "finance": {
        "title": "Finance & Payment Systems Programme | Transitions Lab",
        "description": "How payment, credit, and financing systems carry, or block, every other transition that depends on people being able to pay over time.",
    },
    "electrification": {
        "title": "Electric Mobility & Transport Programme | Transitions Lab",
        "description": "How electric and shared transport crosses from novelty to default in markets built around petrol, grounded in the Lab's field work with Roam in Nairobi.",
    },
    "agriculture-programme": {
        "title": "Regenerative Agriculture & Circular Systems Programme | Transitions Lab",
        "description": "How smallholders adopt technologies that turn waste into energy, soil, and income, grounded in the Lab's field work with Pyropower in Lombok.",
    },
    "monitoring": {
        "title": "Environmental Monitoring & Community Data Programme | Transitions Lab",
        "description": "How satellites, sensors, and community rangers combine into trusted environmental evidence that drives decisions, grounded in the Lab's work with Reef Support.",
    },
    "water": {
        "title": "Water Access & Transparency Programme | Transitions Lab",
        "description": "How safe water is delivered, sustained, and trusted, and how open data changes who can hold water systems to account. With the MiMaji Foundation, Nairobi.",
    },
    "brw": {
        "title": "The BRW Framework: Bypass, Repurpose, Weaken | Transitions Lab",
        "description": "A mechanism-based typology of how niche technologies engage entrenched regimes: bypass, repurpose, or weaken, matched to the barriers they face.",
    },
    "team": {
        "title": "Team | Transitions Lab",
        "description": "The people behind Transitions Lab, an independent research team studying how technologies meet real people.",
    },
}

# Pages that exist in the site map but content is not yet supplied.
# The build creates a lightweight, noindex stub so links resolve.
STUB_TITLES: dict[str, str] = {
    "field-research": "Field Research",
    "applied-research": "Impact Measurement",
    "european-impact-tracking": "European Impact Tracking",
    "monitoring-evaluation-dissemination": "Monitoring, Evaluation & Dissemination",
    "how-it-works": "How It Works",
    "contact": "Contact",
    "resources": "Resources",
    "interview-guide": "Interview Guide",
    "impact-tracking-template": "Impact Tracking Template",
    "programmes": "Programmes",
    "electrification": "Electric Mobility & Transport",
    "agriculture-programme": "Regenerative Agriculture & Circular Systems",
    "monitoring": "Environmental Monitoring & Community Data",
    "water": "Water Access & Transparency",
    "finance": "Finance & Payment Systems",
    "brw": "The BRW Framework",
    "case-roam": "Roam — Electric Transport in Nairobi",
    "case-pyropower": "Pyropower — Biochar in Lombok",
    "case-reef-support": "Reef Support — Community Marine Rangers",
    "case-mimaji": "MiMaji — Water Transparency in Nairobi",
    "case-statia": "St. Eustatius — Small-Island Mobility",
    "case-context-entry": "Market-Entry Study, East Africa",
    "insight-eu-us": "Europe Invents, America Scales",
    "insight-eu-africa": "The EU and Africa",
    "expertise-energy": "Energy Access & Off-Grid Systems",
    "expertise-water": "Water & Sanitation",
    "expertise-agriculture": "Regenerative Agriculture & Agri-Tech",
    "expertise-manufacturing": "Local Manufacturing & Supply Chains",
    "expertise-ai-digital": "AI & Digital Systems",
    "expertise-finance": "Financial Inclusion & Payment Systems",
    "expertise-climate": "Climate Resilience & Ecosystems",
    "team": "Team",
}

# Sitemap priority per section (approximate).
SITEMAP_PRIORITY = {
    "/": 1.0,
    "/about": 0.8,
    "/what-we-do": 0.9,
    "/expertise": 0.9,
    "/programmes": 0.9,
    "/who-we-serve": 0.8,
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


def strip_author_notes(md: str) -> str:
    """Remove <!-- NOTE ... --> author-only comments; keep <!-- IMAGE ... -->."""
    # Handle both single-line and multi-line note comments.
    def _drop(match: re.Match) -> str:
        body = match.group(0)
        if re.search(r"IMAGE", body, re.IGNORECASE):
            return body
        return ""
    return re.sub(r"<!--.*?-->", _drop, md, flags=re.DOTALL)


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
            # Not a standfirst — put it back in the body
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

        # section eyebrow: **§ ... ** — drop entirely; the H2 that follows
        # carries the meaning, so the eyebrow is redundant.
        m = SECTION_EYEBROW_RE.match(stripped)
        if m:
            close_list(list_kind); list_kind = None
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

            # paragraph — collect until blank line
            close_list(list_kind); list_kind = None
            para = [raw]
            i += 1
            while i < len(lines) and lines[i].strip() and not any(
                lines[i].strip().startswith(x) for x in ("#", "- ", "> ", "---", "***", "**§", "|")
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
<meta name="theme-color" content="#0F1620">
<link rel="canonical" href="{canonical}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<meta property="og:type" content="{'website' if slug == 'index' else 'article'}">
<meta property="og:site_name" content="Transitions Lab">
<meta property="og:title" content="{htmllib.escape(full_title, quote=True)}">
<meta property="og:description" content="{htmllib.escape(description, quote=True)}">
<meta property="og:url" content="{og_url}">
<meta property="og:image" content="{og_image}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{htmllib.escape(full_title, quote=True)}">
<meta name="twitter:description" content="{htmllib.escape(description, quote=True)}">
<meta name="twitter:image" content="{og_image}">
{FONT_LINKS}
<link rel="stylesheet" href="/assets/theme.css">
{extra_head}
</head>
<body>

<header class="site">
  <div class="wrap nav">
    <a href="/" class="brand"><span class="dot"></span>Transitions&nbsp;Lab</a>
    {nav_html}
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
  </div>
</header>

{body}

<footer class="site">
  <div class="wrap">
    <div>
      <a href="/" class="brand">Transitions Lab</a>
      <p class="mission">An independent research team that studies how technologies meet real people, and turns what it finds into evidence institutions and innovators can act on.</p>
    </div>
    <div>
      <h4>What we do</h4>
      <a href="/field-research">Field research</a>
      <a href="/applied-research">Impact measurement</a>
      <a href="/european-impact-tracking">European impact tracking</a>
      <a href="/monitoring-evaluation-dissemination">Monitoring &amp; evaluation</a>
      <a href="/how-it-works">How it works</a>
    </div>
    <div>
      <h4>Research</h4>
      <a href="/programmes">Programmes</a>
      <a href="/expertise">Expertise</a>
      <a href="/case-studies">Case studies</a>
      <a href="/resources">Resources</a>
      <a href="/readiness-levels">TRL &amp; SRL</a>
    </div>
    <div>
      <h4>The Lab</h4>
      <a href="/about">About</a>
      <a href="/who-we-serve">Who we serve</a>
      <a href="/contact">Contact</a>
      <a href="https://www.linkedin.com/company/transitionslab/" target="_blank" rel="noopener">LinkedIn</a>
    </div>
    <div class="legal">
      <span>© Transitions Lab 2026 · Delft, The Netherlands</span>
      <span>Independent research, no trackers</span>
    </div>
  </div>
</footer>

<script src="/assets/site.js" defer></script>
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

    page_hero = f"""<section class="page-hero">
  <div class="wrap">
    {'<p class="eyebrow">' + htmllib.escape(hero_eyebrow) + '</p>' if hero_eyebrow else ''}
    <h1>{inline(title)}</h1>
    {'<p class="lede">' + standfirst_html + '</p>' if standfirst_html else ''}
  </div>
</section>"""

    prose_section = f"""<section class="light">
  <div class="wrap-prose">
    <div class="prose">
      {body_html}
    </div>
  </div>
</section>"""

    body = page_hero + "\n\n" + prose_section
    return page_shell(slug=slug, title=title, description=description, body=body)


def build_stub_page(slug: str, title: str) -> str:
    """Build a 'coming soon' stub for a page whose content isn't in yet.

    noindex so search engines don't index the placeholder.
    """
    description = f"{title} — content coming soon."
    body = f"""<section class="page-hero">
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
    is bespoke — this is the marketing surface of the site.
    """
    slug = "index"
    title = "Transitions Lab — Aligning technology with the people it is meant to serve"
    description = "Transitions Lab is an independent research team. We build deep, honest understanding of socio-technical transitions in emerging markets, so human values and lived experience shape how technologies arrive."

    nav_html = render_nav(slug)
    canonical = f"{SITE_URL}/"
    og_image = f"{SITE_URL}/assets/og-image.png"

    body = """
<!-- HERO with animated filaments -->
<section class="hero" style="min-height:88vh;display:flex;align-items:center;padding:120px 0 80px;">
  <canvas id="filaments" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;"></canvas>
  <div class="wrap" style="position:relative;z-index:3;">
    <p class="eyebrow reveal">Field research &amp; impact measurement</p>
    <h1 class="reveal d1">Aligning technology with the people it is meant to <em>serve</em>.</h1>
    <p class="lede reveal d2">An independent research team working on the ground, building deep understanding of socio-technical transitions, so human values and lived experience shape how technologies arrive in the world.</p>
    <div class="cta-row reveal d3">
      <a href="/contact" class="btn btn-solid">Start a study →</a>
      <a href="/what-we-do" class="btn btn-ghost">See how we work</a>
    </div>
  </div>
</section>

<!-- STANCE -->
<section class="stance">
  <div class="wrap">
    <p class="eyebrow reveal">The mission, stated plainly</p>
    <blockquote class="reveal d1">Technology is not destiny. It can be steered. The direction a transition takes is not fixed in advance; the difference is whether anyone was paying close, honest attention to what was happening to people on the ground, early enough for it to matter. <em>That attention is the Lab's reason to exist.</em></blockquote>
  </div>
</section>

<!-- WHAT WE BRING -->
<section class="dark glow">
  <div class="wrap">
    <div class="section-head reveal" style="max-width:56ch;">
      <p class="eyebrow">What we bring</p>
      <h2>Social science first, technical depth alongside.</h2>
      <p>Two things that rarely sit in the same room. Social-science fieldcraft, and genuine technical literacy about the systems we study. The combination is what allows us to align human values with technology in context.</p>
    </div>
    <div class="dims">
      <div class="dim reveal">
        <p class="tag">Dimension I</p>
        <h3>Reach</h3>
        <p>Who is actually being reached, and, just as important, who is being missed. Coverage, inclusion, and the gap between intended and actual participants.</p>
      </div>
      <div class="dim reveal d1">
        <p class="tag">Dimension II</p>
        <h3>Depth</h3>
        <p>How much changes for those reached. The magnitude of outcomes and whether the change is meaningful in respondents' own terms.</p>
      </div>
      <div class="dim reveal d2">
        <p class="tag">Dimension III</p>
        <h3>Experience</h3>
        <p>What it is like to be on the receiving end. Satisfaction, problems encountered, and the qualitative texture numbers alone cannot carry.</p>
      </div>
    </div>
  </div>
</section>

<!-- WHERE WE WORK -->
<section class="dark glow">
  <div class="wrap" style="text-align:center;">
    <div class="reveal" style="max-width:22ch;margin:0 auto;">
      <p class="eyebrow">Where we work</p>
      <h2 style="font-family:'Hanken Grotesk',system-ui,sans-serif;font-weight:500;font-size:clamp(34px,5.5vw,72px);line-height:1.05;letter-spacing:-.02em;color:#fff;">Local partner. <span style="font-weight:800;display:block;color:var(--orange);">Global reach.</span></h2>
      <p style="color:var(--on-dark-soft);font-size:18px;margin:22px auto 0;max-width:44ch;">Based in Delft, The Netherlands. We do fieldwork in the places our research takes us, through partners who already speak the language and know the place.</p>
    </div>
  </div>
</section>

<!-- WORK -->
<section class="light">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Work</p>
      <h2>Where the Lab has been on the ground.</h2>
      <p>Most commissioned work is delivered privately. The engagements below are the ones partners have agreed to share.</p>
    </div>
    <div class="insights">
      <a class="insight reveal" href="/case-roam">
        <div class="thumb">
          <div class="kicker"><span>Case study</span><span>Kenya</span></div>
        </div>
        <div class="body">
          <h3>Electric transport in Nairobi, Roam</h3>
          <p>How electric two-wheelers cross the affordability threshold in a petrol-dominated market, and what carries riders across it.</p>
          <span class="more">Read the case →</span>
        </div>
      </a>
      <a class="insight reveal d1" href="/case-pyropower">
        <div class="thumb">
          <div class="kicker"><span>Case study</span><span>Indonesia</span></div>
        </div>
        <div class="body">
          <h3>Biochar &amp; clean energy in Lombok, Pyropower</h3>
          <p>When smallholder farmers turn crop waste into energy and soil on a decentralised, open-source kiln.</p>
          <span class="more">Read the case →</span>
        </div>
      </a>
      <a class="insight reveal d2" href="/case-reef-support">
        <div class="thumb">
          <div class="kicker"><span>Case study</span><span>Marine</span></div>
        </div>
        <div class="body">
          <h3>Rangers for marine ecosystems, Reef Support</h3>
          <p>Community rangers, sensors, and satellite data combine into a shared, trustworthy picture of reef health.</p>
          <span class="more">Read the case →</span>
        </div>
      </a>
    </div>
    <p class="reveal" style="text-align:center;margin-top:36px;"><a href="/case-studies" class="btn btn-ghost">See all case studies →</a></p>
  </div>
</section>

<!-- INSIGHTS -->
<section class="dark">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Insights</p>
      <h2>How we read the landscape.</h2>
      <p>Independent analysis of the transitions and relationships we study; the same evidence-first posture, applied to the big picture.</p>
    </div>
    <div class="approach">
      <a class="cell reveal" href="/insight-eu-us" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:var(--on-dark);">
        <div class="step">Insight</div>
        <h3 style="color:#fff;">Europe Invents, America Scales</h3>
        <p style="color:var(--on-dark-soft);">Europe produces world-class innovation and struggles to commercialise it; the US does the reverse. Where the asymmetry sits and where independent evidence fits in the gap.</p>
      </a>
      <a class="cell reveal d1" href="/insight-eu-africa" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:var(--on-dark);">
        <div class="step">Insight</div>
        <h3 style="color:#fff;">The EU and Africa</h3>
        <p style="color:var(--on-dark-soft);">Europe is committing hundreds of billions to Africa; Africa is becoming the growth market of the century. Where the two genuinely fit, and what stands between the investment and the impact.</p>
      </a>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="dark cta" style="text-align:center;padding-top:80px;padding-bottom:100px;">
  <div class="wrap reveal" style="max-width:760px;">
    <h2 style="font-family:'Hanken Grotesk',system-ui,sans-serif;font-weight:700;font-size:clamp(34px,4.4vw,52px);color:#fff;letter-spacing:-.02em;line-height:1.05;">Tell us the decision. We will design the study.</h2>
    <p style="color:var(--on-dark-soft);font-size:19px;margin:18px auto 34px;">Send a short note about what you need to know and who it concerns. We will come back with an approach, a timeline, and an honest view of what the evidence can and cannot settle.</p>
    <a href="/contact" class="btn btn-solid">Start a study →</a>
  </div>
</section>
"""

    extra_head = ""
    filament_script = """
<script>
(function(){
  var cv=document.getElementById('filaments');if(!cv)return;
  var ctx=cv.getContext('2d');var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W,H,DPR;
  function size(){DPR=Math.min(devicePixelRatio||1,2);W=cv.width=cv.offsetWidth*DPR;H=cv.height=cv.offsetHeight*DPR;}
  size();addEventListener('resize',size);
  var COLORS=[[232,100,44],[62,143,208],[143,192,234],[30,58,95],[110,99,198]];
  var N=window.innerWidth<700?70:130,strands=[];
  for(var i=0;i<N;i++){strands.push({y0:(Math.random()*1.15-0.075),amp:20+Math.random()*90,freq:0.6+Math.random()*1.6,phase:Math.random()*Math.PI*2,speed:0.15+Math.random()*0.5,col:COLORS[(Math.random()*COLORS.length)|0],alpha:0.05+Math.random()*0.14,w:0.5+Math.random()*1.0});}
  var tms=0,last=performance.now(),mx=0.5,my=0.5;
  var hero=cv.parentElement;
  hero.addEventListener('pointermove',function(e){var r=cv.getBoundingClientRect();mx=(e.clientX-r.left)/r.width;my=(e.clientY-r.top)/r.height;});
  function frame(dt){
    tms+=dt*0.001;ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
    var fx=W*(0.9+mx*0.12),fy=H*(0.46+my*0.12);
    for(var j=0;j<strands.length;j++){var s=strands[j];ctx.beginPath();var steps=40;
      for(var k=0;k<=steps;k++){var p=k/steps;var x=p*fx;var ease=p*p*(3-2*p);var baseY=s.y0*H+(fy-s.y0*H)*ease;var wave=Math.sin(s.phase+tms*s.speed+p*s.freq*Math.PI*2)*s.amp*DPR*(1-ease*0.92);var y=baseY+wave;k===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
      ctx.strokeStyle='rgba('+s.col[0]+','+s.col[1]+','+s.col[2]+','+s.alpha+')';ctx.lineWidth=s.w*DPR;ctx.stroke();}
    ctx.globalCompositeOperation='source-over';
  }
  if(reduce){frame(0);}else{(function loop(now){var dt=now-last;last=now;frame(dt);requestAnimationFrame(loop);})(performance.now());}
})();

</script>"""

    # Wrap so filament script also gets included
    html = page_shell(slug=slug, title=title, description=description,
                      body=body, extra_head=extra_head)
    return html.replace("</body>", filament_script + "\n</body>")


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
    # We regenerate everything, so wipe any stale HTML first — but keep .git,
    # assets, content, config files.
    for old in ROOT.glob("*.html"):
        old.unlink()

    written: list[str] = []

    # 1. Home
    home_html = build_home()
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
        (ROOT / f"{slug}.html").write_text(page, encoding="utf-8")
        real_slugs.add(slug)
        written.append(f"/{slug}")
        print(f"[page]  {slug}.html")

    # 3. Stubs — for pages the site links to but haven't been written yet
    for slug, title in STUB_TITLES.items():
        if slug in real_slugs:
            continue
        (ROOT / f"{slug}.html").write_text(build_stub_page(slug, title), encoding="utf-8")
        print(f"[stub]  {slug}.html")
        # stubs deliberately excluded from sitemap

    # 4. 404
    (ROOT / "404.html").write_text(build_404(), encoding="utf-8")
    print("[404]   404.html")

    # 5. Sitemap
    (ROOT / "sitemap.xml").write_text(build_sitemap(written), encoding="utf-8")
    print(f"[map]   sitemap.xml ({len(written)} urls)")


if __name__ == "__main__":
    main()
