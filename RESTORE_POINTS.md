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
