# Restore points

Named snapshots to roll back to. To revert everything since a restore
point, either promote the corresponding Vercel deployment in the Vercel
dashboard, or run:

```
git revert --no-commit <this-commit>..HEAD && git commit -m "Revert to <name>"
git push
```

Vercel will redeploy automatically.

---

## `pre-restructure-2026-08-27`

- **Commit:** `889a121`
- **Subject:** Rewrite MiMaji case so it reads as an active engagement, not a placeholder
- **What is on the site at this point:**
  - Full article & case-study library with hero diagrams and ribbon-above-photo cards
  - LinkedIn / Twitter share cards wired at 1200×627 (`/assets/og/*.png`)
  - `/statement` section with background video
  - TU Delft references removed
  - MiMaji case study rewritten as an active engagement
  - Home page latest-insights row featuring Own the Battery
  - Case-studies overview with all photo cards

Named so it's easy to point at: "roll back to pre-restructure-2026-08-27".

---

## `PROGRAMME CHANGE 15 SEPT` — first commit after the change

- **Commit:** `1e2309e` (step 8, SDG page + programme SDG rows)
- **Delivered:** Nav labels (Programmes, Work with us) · six-item dropdown industrialisation first · homepage meta description and programme row rebuild · /expertise heading and intro rewrite with research-areas lines · two merges (water into energy, climate into agriculture, permanent Vercel redirects) · four title changes · butter research-areas strip and coloured SDG "Contributes to" row on every programme page · /what-we-do renamed to Work with us with ABSORBS → METHODS and a European consortia card · related-reading pass extending each programme's article coverage per file 5 · new /sdgs page with the eleven claimed / six declined index · footer Research column relabelled Programmes and gained a Research by SDG link.
- **Held over for next pass:** official UN numbered SDG SVGs to drop into `/assets/img/sdg/` (chip markup already in place; will swap on next build without content changes) · article-filter chip taxonomy on /articles is still the older category set (Governance & Minerals, Just Transition, Finance & Minerals are on cards but not chips) · optional homepage hero eyebrow "What a technology does once people live with it" not added · KvK number and PIC on /who-we-serve consortia anchor not added.

---

## `pre-major-change-2026-09-15` — aka **before PROGRAMME CHANGE 15 SEPT**

- **Rollback trigger phrase (Marcel):** "go back to before PROGRAMME CHANGE 15 SEPT"
- **Commit:** `6da43eb`
- **Subject:** Five more inline figures across three articles
- **What is on the site at this point:**
  - 58 insight articles, 105 content pages total
  - September 2026 batches published: 8, 9, 10, 11 and 12 Sept (Survey, Adoption, Load, Strategic, Thousand Cars, Factory & Town, Mine Green, Extent, Evidence, Who Buys, No Going Back, Scheduled Not Summoned, First Customer, Local Content, Permit Is Not the Project)
  - Author byline system live: `DEFAULT_AUTHOR = "Marcel Kempers"` in `_build.py` with per-slug `AUTHORS` override dict; renders on every insight article and on `/articles` listing cards
  - White cards across `.resource-card`, `.serve-grid`, `.theory-map-card`, `.case-card` and default `.page-hero` — cream ground, white plates
  - Home page **Latest insights** row leads with Permit / Factory / Mine Green
  - Illustrated heroes and multiple in-body figures on the recent batch, styled to the Register A line-art convention
  - Filter chips on `/articles` cover 11 categories, 5 geographies, Sep 2026 back to Jan 2026
  - Theory maps compact row on home linking Human Side / Economics / Innovation Dynamics / Transitions primer

Named so it's easy to point at: "roll back to pre-major-change-2026-09-15".
