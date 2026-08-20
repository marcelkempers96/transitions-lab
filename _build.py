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

SERVICES = [
    ("what-we-do", "Overview"),
    ("field-research", "Field Research"),
    ("applied-research", "Impact Measurement"),
    ("european-impact-tracking", "European Impact Tracking"),
    ("monitoring-evaluation-dissemination", "Monitoring, Evaluation & Dissemination"),
    ("how-it-works", "How It Works"),
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
    ("who-we-serve", "Who we serve"),
]

NAV = [
    {"slug": "about", "href": "/about", "label": "About"},
    {"slug": "__services", "label": "Services", "dropdown": SERVICES},
    {"slug": "__expertise", "label": "Expertise", "dropdown": EXPERTISE},
    {"slug": "__work", "label": "Work", "dropdown": WORK},
    {"slug": "contact", "href": "/contact", "label": "Contact", "cta": True},
]


def render_nav(current_slug: str) -> str:
    """Return the <nav> element with the correct .current markers."""
    out = ['<nav id="menu">']
    for item in NAV:
        is_current = item["slug"] == current_slug
        # Membership in a dropdown also marks its parent as current
        in_dropdown = False
        if "dropdown" in item:
            in_dropdown = any(slug == current_slug for slug, _ in item["dropdown"])
        current_class = " current" if is_current or in_dropdown else ""

        if "dropdown" in item:
            out.append(f'  <span class="nav-group{current_class}" tabindex="0">')
            out.append(f'    <span class="nav-label">{item["label"]}</span>')
            out.append(f'    <span class="nav-dropdown">')
            for slug, label in item["dropdown"]:
                child_current = ' class="current"' if slug == current_slug else ""
                out.append(f'      <a href="/{slug}"{child_current}>{label}</a>')
            out.append(f'    </span>')
            out.append(f'  </span>')
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

# Keyed by slug. Description falls back to the standfirst if omitted.
META: dict[str, dict[str, str]] = {
    "about": {
        "description": "About Transitions Lab, an independent research team that both publishes its own research and works on the ground for others, aligning technology with the people it is meant to serve.",
    },
    "who-we-serve": {
        "description": "Five kinds of organisation come to Transitions Lab most often — companies, funders, European consortia, NGOs, and research teams. Find the one that fits.",
    },
    "what-we-do": {
        "description": "Transitions Lab studies technologies as they meet real people. Services: field research, impact measurement, European impact tracking, monitoring and evaluation, market and expansion research.",
    },
    "case-studies": {
        "description": "Where the Lab has worked on the ground — electric transport in Nairobi, biochar in Lombok, marine monitoring in Indonesia, and more.",
    },
    "readiness-levels": {
        "description": "TRL and SRL, the two axes of readiness. A technology can be technically mature and still fail; societal readiness measures the second axis, and it decides success as often as the first.",
    },
    "expertise": {
        "description": "The eight transition areas Transitions Lab knows in depth, from e-mobility and energy access to AI, water, and marine ecosystems.",
    },
    "expertise-e-mobility": {
        "description": "How electric and shared transport crosses from novelty to default in markets built around petrol, and whether the infrastructure keeps pace with the vehicles.",
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
IMAGE_COMMENT_RE = re.compile(r"^<!--\s*IMAGE\s+[^>]*?-->\s*$")
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


def inline(text: str) -> str:
    """Apply inline transforms to a run of text. Assumes text is *not* HTML-escaped yet."""
    # Escape first so we don't corrupt user text; then re-inject our tags
    text = htmllib.escape(text, quote=False)
    # Un-escape markdown special chars we care about
    # (escaping doesn't touch *, [, ], (, ), so nothing to do)

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
    return text


@dataclass
class Page:
    slug: str
    title: str                      # H1 text
    eyebrow_top: str | None         # top "§ / label" if present
    standfirst_html: str | None     # italic lede paragraph
    body_html: str                  # body prose
    description: str                # meta description


def parse_markdown(md: str) -> tuple[str | None, str, str | None, str]:
    """Return (top_eyebrow, title, standfirst_html, body_html).

    Consumes the top "§ / label" line, the H1, and the first italic-only
    paragraph after it (as standfirst). Everything else becomes body.
    """
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

        # section eyebrow: **§ ... **
        m = SECTION_EYEBROW_RE.match(stripped)
        if m:
            close_list(list_kind); list_kind = None
            out.append(f'<p class="prose-eyebrow">{htmllib.escape(m.group(1).strip())}</p>')
            i += 1
            continue

        # horizontal rule
        if stripped == "---" or stripped == "***":
            close_list(list_kind); list_kind = None
            out.append("<hr>")
            i += 1
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
                lines[i].strip().startswith(x) for x in ("#", "- ", "> ", "---", "***", "**§")
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
    full_title = title if slug == "index" else f"{title} · Transitions Lab"

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
      <span>© Transitions Lab 2026 · Delft · Nairobi · Dutch Caribbean</span>
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

<!-- GLOBE — where we work -->
<section class="globe-sec">
  <canvas id="globe"></canvas>
  <div class="wrap">
    <div class="copy reveal">
      <p class="eyebrow">Where we work</p>
      <h2>Local partner. <span class="b">Global reach.</span></h2>
      <p>Field presence in Nairobi, coastal Indonesia, and the Dutch Caribbean, with a base in Delft. We work where the evidence is, in the language it is spoken.</p>
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

/* ===== ROTATING STAR-MAP GLOBE ===== */
(function(){
  var cv=document.getElementById('globe');if(!cv)return;var ctx=cv.getContext('2d');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W,H,DPR,R,CX,CY;
  function size(){DPR=Math.min(devicePixelRatio||1,2);W=cv.width=cv.offsetWidth*DPR;H=cv.height=cv.offsetHeight*DPR;R=Math.min(W,H)*0.52;CX=W*(window.innerWidth<860?0.5:0.66);CY=H*0.5;}
  size();addEventListener('resize',size);
  var PTS=window.innerWidth<700?800:1400,pts=[];
  for(var i=0;i<PTS;i++){var lat=(Math.random()*2-1);lat=Math.sign(lat)*Math.pow(Math.abs(lat),1.3);var latR=lat*Math.PI/2*0.9;var lonR=Math.random()*Math.PI*2;var cl=Math.random()<0.55;pts.push({lat:latR,lon:lonR,b:cl?0.9:0.4+Math.random()*0.4,s:cl?1.5:0.9});}
  var rot=0,last=performance.now(),vis=true,par=0;
  var io2=new IntersectionObserver(function(es){vis=es[0].isIntersecting;},{threshold:0});io2.observe(cv);
  var gsec=document.querySelector('.globe-sec');
  if(!reduce){addEventListener('scroll',function(){var r=gsec.getBoundingClientRect();var prog=1-(r.top+r.height/2)/innerHeight;par=Math.max(-1,Math.min(1,prog))*0.10;},{passive:true});}
  function frame(dt){
    rot+=dt*0.00006;ctx.clearRect(0,0,W,H);
    var CYo=CY+par*H;
    var halo=ctx.createRadialGradient(CX,CYo,R*0.86,CX,CYo,R*1.24);
    halo.addColorStop(0,'rgba(120,110,220,0)');halo.addColorStop(0.55,'rgba(120,110,225,0.30)');halo.addColorStop(0.74,'rgba(150,175,235,0.22)');halo.addColorStop(1,'rgba(90,120,210,0)');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(CX,CYo,R*1.24,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(CX,CYo,R,0,Math.PI*2);ctx.clip();
    var body=ctx.createRadialGradient(CX-R*0.3,CYo-R*0.3,R*0.1,CX,CYo,R);body.addColorStop(0,'#10131f');body.addColorStop(0.7,'#0a0d16');body.addColorStop(1,'#05070d');
    ctx.fillStyle=body;ctx.fillRect(CX-R,CYo-R,R*2,R*2);
    ctx.globalCompositeOperation='lighter';
    for(var j=0;j<pts.length;j++){var p=pts[j];var lon=p.lon+rot;var x3=Math.cos(p.lat)*Math.sin(lon);var z3=Math.cos(p.lat)*Math.cos(lon);var y3=Math.sin(p.lat);if(z3<0)continue;var x=CX+x3*R,y=CYo-y3*R;var d=z3;var a=p.b*Math.pow(d,0.6)*0.9;var rad=p.s*DPR*(0.5+d*0.9);ctx.fillStyle='rgba(255,'+(180+(d*40|0))+','+(90+(d*40|0))+','+a+')';ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();}
    ctx.globalCompositeOperation='source-over';
    var term=ctx.createLinearGradient(CX-R,0,CX+R,0);term.addColorStop(0,'rgba(3,4,8,0.62)');term.addColorStop(0.4,'rgba(3,4,8,0.1)');term.addColorStop(1,'rgba(3,4,8,0)');ctx.fillStyle=term;ctx.fillRect(CX-R,CYo-R,R*2,R*2);
    ctx.restore();
    ctx.beginPath();ctx.arc(CX,CYo,R,0,Math.PI*2);ctx.strokeStyle='rgba(150,140,235,0.5)';ctx.lineWidth=1.4*DPR;ctx.stroke();
  }
  if(reduce){frame(0);}else{(function loop(now){var dt=now-last;last=now;if(vis)frame(dt);requestAnimationFrame(loop);})(performance.now());}
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
