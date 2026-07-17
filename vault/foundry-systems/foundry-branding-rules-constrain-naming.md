---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/branding/
confidence: confirmed
---

# Foundry Branding Rules Constrain Naming

A hard "No" on one specific thing. Verbatim from the branding article:

> **Q: Can I use "Foundry Virtual Tabletop" in the title of my project?**
> **"No**, it has too much potential to lead to confusion and cause people to think that your project is something officially released by Foundry Gaming LLC... Please feel free to reference the name "Foundry Virtual Tabletop" within descriptive text or content of your project, but please avoid using it in the official title."

Also:
- "it is best to avoid shortening the name to Foundry. When shortening the name of the software, **'Foundry VTT' or 'FVTT'** should be used if possible."
- Foundry VTT is a trademark of Foundry Gaming LLC.
- Community Content Kit logos exist specifically to signal "made for Foundry, unofficial." They may not imply endorsement and may not be modified.

The wording is guideline-voiced rather than enforcement-termed, but the answer to the direct question is unambiguous.

**For Battleframe:** "Battleframe" is clean — it contains no Foundry branding. Avoid "Foundry Battleframe" or "Battleframe for Foundry Virtual Tabletop" as the *title*; "a system for Foundry Virtual Tabletop" in the description is fine.

## Package id rules (confirmed)

- Lower-case, no spaces, no special characters.
- **Hyphens, not underscores.**
- **The `id` must exactly match the system directory name.**

**Not found:** any list of reserved package ids. Uniqueness appears to be enforced socially, via the manual review queue.

Related: [[foundry-license-permits-selling-and-self-distribution]], [[foundry-ai-content-policy-deadline]].
