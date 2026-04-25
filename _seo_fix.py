#!/usr/bin/env python3
"""One-shot SEO + nav cleanup for all Transitions Lab HTML pages.

Idempotent: running it twice yields the same result. It:
  1. Replaces the old flat Finance/Electrification/Water nav block with
     the new Topics dropdown.
  2. Injects per-page SEO metadata (description, canonical, OG, Twitter,
     favicon, JSON-LD Organization on index) immediately before
     <link rel="stylesheet" ...>.
  3. Removes the dangling <li><a href="style-guide.html">Colophon</a></li>
     entry from every footer.
"""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = "https://transitionslab.org"

# Per-page metadata
PAGES: dict[str, dict[str, str]] = {
    "index.html": {
        "title": "Transitions Lab — Research on Infrastructure Transitions in Emerging Markets",
        "description": "Transitions Lab is an independent research organisation studying how infrastructure systems actually transition in emerging markets. Finance, electrification, and water access in Kenya.",
        "canonical": f"{SITE}/",
    },
    "about.html": {
        "title": "About · Transitions Lab",
        "description": "About Transitions Lab — an independent research organisation on infrastructure transitions in emerging markets, with bases in Delft, Nairobi, and the Dutch Caribbean.",
        "canonical": f"{SITE}/about.html",
    },
    "programmes.html": {
        "title": "Programmes · Transitions Lab",
        "description": "Three active research programmes at Transitions Lab — finance and payment systems, electrification and e-mobility, and water access systems — and the cross-programme BRW methodology.",
        "canonical": f"{SITE}/programmes.html",
    },
    "finance.html": {
        "title": "Finance & Payment Systems — Programme · Transitions Lab",
        "description": "Why payment-rail lock-in is the most important under-discussed problem in digital financial inclusion, and what durable interoperability at the payment layer would require.",
        "canonical": f"{SITE}/finance.html",
    },
    "electrification.html": {
        "title": "Electrification & E-Mobility — Programme · Transitions Lab",
        "description": "How electric two-wheelers are actually crossing the affordability threshold in Kenya — financing architectures, BRW strategies, and what the transition tells us about emerging-market infrastructure change.",
        "canonical": f"{SITE}/electrification.html",
    },
    "water.html": {
        "title": "Water Access Systems — Programme · Transitions Lab",
        "description": "Vendor-mediated, caretaker-brokered water distribution in Nairobi and peri-urban Kenya — and what the payment-layer lessons from mobile money imply for the sector.",
        "canonical": f"{SITE}/water.html",
    },
    "brw.html": {
        "title": "The BRW Typology — Methodology · Transitions Lab",
        "description": "Bypass · Repurpose · Weaken — a three-strategy framework for reading how new infrastructure systems navigate entrenched legacy regimes. The Lab's signature analytical contribution.",
        "canonical": f"{SITE}/brw.html",
    },
    "architectures.html": {
        "title": "The Four Financing Architectures · Transitions Lab",
        "description": "Pay-as-you-go, ride-to-own, battery-as-a-service, and concessional climate finance — the four distinct architectures in African e-mobility and what each reveals about the payment layer beneath.",
        "canonical": f"{SITE}/architectures.html",
    },
    "interoperability.html": {
        "title": "Payment-rail Interoperability · Transitions Lab",
        "description": "What durable interoperability between payment rails would actually require — across infrastructure, product, policy, and community dimensions, written from the Kenyan mobile-money context.",
        "canonical": f"{SITE}/interoperability.html",
    },
    "policy.html": {
        "title": "Regulatory Frameworks · Transitions Lab",
        "description": "An operator's-eye reading of the four regulatory instruments shaping the Lab's research terrain in Kenya — the NPS Act, Digital Credit Regulations, Data Protection Act, and National Electric Mobility Policy.",
        "canonical": f"{SITE}/policy.html",
    },
    "diaspora.html": {
        "title": "Diaspora Remittance as Infrastructure · Transitions Lab",
        "description": "Kenya received USD 4.9 billion in diaspora remittances in 2024. What would it mean to route a meaningful share of that flow directly into specific obligations rather than general-purpose cash?",
        "canonical": f"{SITE}/diaspora.html",
    },
    "articles.html": {
        "title": "Articles & Working Papers · Transitions Lab",
        "description": "Long-form articles, research briefs, field notes, and working papers from Transitions Lab — published openly, versioned, and indexed.",
        "canonical": f"{SITE}/articles.html",
    },
    "cases.html": {
        "title": "Field Cases · Transitions Lab",
        "description": "Field cases — ROAM Electric, MiMaji, and the Nairobi boda-boda economy — that ground the Lab's empirical research across the finance, electrification, and water programmes.",
        "canonical": f"{SITE}/cases.html",
    },
    "team.html": {
        "title": "Team & Advisors · Transitions Lab",
        "description": "Team and academic advisors at Transitions Lab — principal researcher Marcel Kempers, supervisors at TU Delft TPM, and the operational and institutional partner network.",
        "canonical": f"{SITE}/team.html",
    },
    "contact.html": {
        "title": "Contact · Transitions Lab",
        "description": "Contact Transitions Lab — research correspondence, partnerships, funder enquiries, and media. Substantive enquiries are handled personally by the principal researcher.",
        "canonical": f"{SITE}/contact.html",
    },
}

# New Topics dropdown nav. Function builds nav with the right `active` class.
NAV_LINKS = [
    ("index.html", "Home"),
    ("about.html", "About"),
    ("programmes.html", "Programmes"),
    # Topics dropdown injected here
    ("brw.html", "BRW Method"),
    ("articles.html", "Articles"),
    ("cases.html", "Cases"),
    ("team.html", "Team"),
    ("contact.html", "Contact"),
]
TOPICS = [
    ("finance.html", "Finance"),
    ("electrification.html", "Electrification"),
    ("water.html", "Water"),
]


def build_nav(current: str) -> str:
    parts = ['        <nav class="masthead-nav">']
    for href, label in NAV_LINKS:
        if href == "brw.html":  # inject Topics group before brw
            topics_active = current in {h for h, _ in TOPICS}
            group_class = "nav-group is-active" if topics_active else "nav-group"
            parts.append(f'        <span class="{group_class}" tabindex="0">')
            parts.append(f'          <span class="nav-label">Topics</span>')
            parts.append(f'          <span class="nav-dropdown">')
            for thref, tlabel in TOPICS:
                active = ' class="active"' if thref == current else ""
                parts.append(f'            <a href="{thref}"{active}>{tlabel}</a>')
            parts.append(f'          </span>')
            parts.append(f'        </span>')
        active = ' class="active"' if href == current else ""
        parts.append(f'        <a href="{href}"{active}>{label}</a>')
    parts.append('        </nav>')
    return "\n".join(parts)


# Old flat nav pattern (the one used on the 12 imported pages).
# Match the entire <nav class="masthead-nav">...</nav> block, regardless of
# its exact internal whitespace.
NAV_RE = re.compile(
    r'(?:        )?<nav class="masthead-nav">.*?</nav>',
    re.DOTALL,
)


def build_seo_block(slug: str, meta: dict[str, str]) -> str:
    title = meta["title"]
    desc = meta["description"]
    url = meta["canonical"]
    og_image = f"{SITE}/assets/og-image.png"
    is_home = slug == "index.html"
    og_type = "website" if is_home else "article"

    lines = [
        f'<meta name="description" content="{desc}">',
        f'<meta name="author" content="Transitions Lab">',
        f'<meta name="robots" content="index, follow">',
        f'<meta name="theme-color" content="#1A3A52">',
        f'<link rel="canonical" href="{url}">',
        # Favicon (single SVG with the accent dot from the masthead)
        f'<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">',
        # Open Graph
        f'<meta property="og:type" content="{og_type}">',
        f'<meta property="og:site_name" content="Transitions Lab">',
        f'<meta property="og:title" content="{title}">',
        f'<meta property="og:description" content="{desc}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{og_image}">',
        f'<meta property="og:locale" content="en_GB">',
        # Twitter
        f'<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{title}">',
        f'<meta name="twitter:description" content="{desc}">',
        f'<meta name="twitter:image" content="{og_image}">',
    ]

    if is_home:
        # JSON-LD Organization for richer indexing on the home page.
        ld = (
            '<script type="application/ld+json">'
            '{'
            '"@context":"https://schema.org",'
            '"@type":"Organization",'
            '"name":"Transitions Lab",'
            f'"url":"{SITE}/",'
            '"description":"An independent research organisation studying how infrastructure transitions actually happen in emerging markets.",'
            f'"logo":"{SITE}/assets/favicon.svg",'
            '"founder":{"@type":"Person","name":"Marcel Kempers"},'
            '"foundingDate":"2026",'
            '"areaServed":["Kenya","Netherlands","Dutch Caribbean"],'
            '"sameAs":[]'
            '}'
            '</script>'
        )
        lines.append(ld)

    # Indented to match the surrounding <head> formatting.
    return "\n".join(lines)


# Pattern to find the existing meta description (default boilerplate) and
# whatever else is already there, so we can replace it cleanly.
EXISTING_META_RE = re.compile(
    r'<meta name="description"[^>]*>\s*\n',
    re.IGNORECASE,
)
# Anchor: the stylesheet link. We insert SEO block immediately before it,
# and strip any of our previously-injected SEO before doing so.
STYLESHEET_RE = re.compile(
    r'<link rel="stylesheet" href="assets/style\.css">',
)
# Strip any prior SEO block we inserted (between START and END markers).
SEO_BLOCK_RE = re.compile(
    r'<!-- SEO START -->.*?<!-- SEO END -->\s*\n?',
    re.DOTALL,
)
# Strip the broken footer link to style-guide.html.
COLOPHON_LINK_RE = re.compile(
    r'\s*<li><a href="style-guide\.html">Colophon</a></li>\s*\n',
)


def process(path: Path) -> tuple[bool, str]:
    slug = path.name
    meta = PAGES.get(slug)
    if not meta:
        return False, f"skipped (no metadata): {slug}"

    src = path.read_text(encoding="utf-8")
    original = src

    # 1. Replace nav block.
    new_nav = build_nav(slug)
    src, n_nav = NAV_RE.subn(new_nav, src, count=1)

    # 2. Strip prior SEO block, prior boilerplate description, then inject.
    src = SEO_BLOCK_RE.sub("", src)
    src = EXISTING_META_RE.sub("", src)

    seo = build_seo_block(slug, meta)
    seo_wrapped = f'<!-- SEO START -->\n{seo}\n<!-- SEO END -->\n'
    src, n_seo = STYLESHEET_RE.subn(seo_wrapped + r'<link rel="stylesheet" href="assets/style.css">', src, count=1)

    # 3. Remove broken Colophon footer link.
    src = COLOPHON_LINK_RE.sub("\n", src)

    if src != original:
        path.write_text(src, encoding="utf-8")
        return True, f"updated (nav={n_nav}, seo={n_seo}): {slug}"
    return False, f"no-change: {slug}"


def main() -> None:
    for slug in sorted(PAGES):
        path = ROOT / slug
        if not path.exists():
            print(f"missing: {slug}")
            continue
        changed, msg = process(path)
        print(("[*] " if changed else "[ ] ") + msg)


if __name__ == "__main__":
    main()
