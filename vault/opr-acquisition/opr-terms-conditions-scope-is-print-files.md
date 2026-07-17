---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://onepagerules.com/terms-conditions
confidence: partial
---

# OPR's Terms Say Nothing About Scraping or APIs — They Govern 3D Print Files

I located OPR's actual terms at **https://onepagerules.com/terms-conditions** (found via sitemap; `/terms`, `/terms-of-service`, and `/legal` all 404 — note this if re-checking).

## What the terms actually say (verbatim quotes)

> "All of the provided files remain the property of onepagerules; by becoming a patron, you are given a license only for your personal use of these files."

> "You may not sell, share, distribute, rent, transfer, copy, reproduce or republish the files in any way."

> "You may also not otherwise modify, duplicate, create derivative works of, disassemble, reverse compile or reverse engineer the files in any way."

> "You may also not sell, share, distribute, rent or transfer the prints that you make in any way."

## What they do NOT say

**On automated access, scraping, crawling, robots, APIs, and data extraction: absent.** There is no clause on any of these. I looked specifically and found nothing.

## The scope caveat — this is the important part

Read the quotes closely. **"by becoming a patron"**, **"the prints that you make"** — this document governs the **Patreon 3D-printable miniature files (STLs)**, not the Army Forge API and not the rules data. It is a print-file EULA that happens to be the site's only "terms" page.

So: applying "you may not reverse engineer the files" to the Army Forge JSON API is a **stretch that the document does not obviously support**. But its *absence* of an API clause is equally not permission. **Both readings are unsupported.** Marked `partial` for exactly this reason: I am confident in the quotes; I am not confident in their scope, and neither should anyone else be.

## Supporting robots signals

- `onepagerules.com/robots.txt` → HTTP 200, contains **only** `Sitemap: https://onepagerules.com/sitemap.xml`. **No `Disallow` directives at all.**
- `army-forge.onepagerules.com/robots.txt` → 404 (SPA fallback). The app serves `<meta name="robots" content="noindex">` — a search-indexing hint, **not** an access restriction.

No technical or robots-level prohibition on fetching exists. Again: not permission, just absence of prohibition.

## Bottom line

There is **no Terms of Service clause governing API or scraping use of Army Forge.** The legal question therefore falls back on **copyright in the army-book content itself** — which is where it was always going to land. See [[import-own-list-vs-bulk-scrape]].

Related: [[opr-permission-claim-is-unverified]]
