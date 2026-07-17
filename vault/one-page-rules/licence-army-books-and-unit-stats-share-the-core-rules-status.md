---
tags: [wargame-research, one-page-rules]
source: https://onepagerules.com/terms-conditions
confidence: partial
---

# Army Books and Unit Stats Are No More Permissively Licensed Than the Core Rules

Direct answer to "are the army books / unit stats under the same license as the core rules?" — **Yes, in the sense that matters: neither has one.**

- The core rules are all-rights-reserved ([[licence-rules-pdf-contains-no-licence-notice]]).
- **No separate licence for army books was found anywhere.** Army data is distributed through Army Forge and per-army PDFs, none of which carry a licence grant.
- The site footer `Copyright © onepagerules All Rights Reserved` applies site-wide, army data included.

## Army data is arguably *more* exposed, not less

Three reasons the army books carry **higher** risk than the rules engine:

1. **Compilation right.** A body of unit stats is a database. Even where individual facts are unprotected, original **selection and arrangement** attracts copyright (*Feist*, 499 U.S. 340). An army book dump is close to this line; a rules engine is far from it. See [[licence-game-mechanics-are-not-copyrightable-but-text-is]].
2. **EU database right.** OPR is European. The **Database Directive (96/9/EC)** creates a *sui generis* right protecting substantial investment in obtaining/verifying/presenting a database — with **no US analogue** and **no idea/expression escape hatch**. Bulk-copying Army Forge data implicates this directly, independent of copyright.
3. **Trademark.** Faction names — "Battle Brothers", "Robot Legions", "Alien Hives" — are brand identifiers. § 102(b) offers no shelter from trademark.

## The one asymmetry worth knowing

Army Forge hosts **community and third-party** army books alongside official ones — the observed `/api/army-books/{uid}` response carries a `userId`, and its `background` text describes a fan-made "total conversion". So **some army data on Army Forge is not OPR's to license at all** — it belongs to individual community authors, under no stated terms either.

This *worsens* the bundling case rather than helping it: shipping Army Forge data would mean redistributing an unlicensed mix of OPR's IP **and** unknown third parties' IP. It is another argument for [[design-fetch-at-runtime-instead-of-bundling-sidesteps-redistribution]].

**Confidence: partial** — **confirmed** that no army-book licence was found and that the API exposes third-party books with a `userId`; the legal characterisation is inference, not legal advice. Related: [[licence-cannot-bundle-opr-rules-text-in-a-foundry-module]].
