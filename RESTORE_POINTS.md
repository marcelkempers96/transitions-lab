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
