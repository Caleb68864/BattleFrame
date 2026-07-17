---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/license/ , https://foundryvtt.com/article/publisher-handbook/ , https://foundryvtt.com/article/package-management/
confidence: confirmed
---

# Foundry's License Permits Selling and Self-Distribution

`/article/license/` **is** the "Limited License Agreement for Module Development" (there is no separate `/article/eula/` — that 404s, as do `/article/package-submission/`, `/article/packaging-guidelines/`, `/article/content-policy/`, `/article/manifest/`).

Verbatim:
> "You may create packages which utilize, reference, or duplicate portions of the software code."
> "You may distribute these packages provided they are designed to be used only in conjunction with a licensed copy of the software."
> "You are allowed to sell or lease package content which you have the rights to distribute."
> "You bear the sole responsibility to uphold intellectual property rights as required by copyright law."

From the publisher handbook:
> "You are allowed to create, publish, and sell content that is designed for Foundry Virtual Tabletop **without any need for additional agreements, contracts, or fees**."

**Listing in the official package browser is OPTIONAL.** Three install routes: manual .zip, **self-hosted manifest URL**, official browser. "Foundry also allows users the freedom to install packages from any source, not just the official list." Submission (`/creators/submit/`) is manual review, gating on rights ownership. **No system-vs-module difference found in submission criteria.**

**Caveats:**
- Publication binds you to "the most recent available version of this Software License agreement" — terms can change under you.
- Self-published work "is not secured by our Premium Content System." Using that system requires a Premium Content Agreement plus "a small fee" billed quarterly per activated Content Key. **You can sell a system independently; you just forfeit DRM.**
- `protected` (manifest field) — "Whether this package uses the protected content access system." Setting `true` makes the package vanish from your own install; the handbook says keep it `false` during development.
- `exclusive` — "Whether this package is a free Exclusive pack." **Partial** — schema description only; no policy page says who may set it. Treat as Foundry-controlled.

**On SRD / OGL content — treat as unverified, not permitted.** The licensing guide says:
> "It is usually okay to include a line or two of text from a rule-book... if the module otherwise contains a much larger volume of information you have written yourself."
> "It is not okay to take whole pages from a published rule book and place it in a FVTT addon module for distribution unless you have a license agreement that lets you do so."

**OGL, Creative Commons, and SRD are never mentioned by name anywhere.** Foundry pushes IP responsibility entirely onto the author and offers **no safe harbor**. Shipping One Page Rules / GREATHELM content is governed by *those* licenses, not by anything Foundry publishes — a question for the sibling ruleset research, not this folder.

Related: [[foundry-branding-rules-constrain-naming]].
