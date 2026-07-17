---
tags: [wargame-research, one-page-rules]
source: https://onepagerules.com/terms-conditions
confidence: confirmed
---

# The "OPR is CC BY-NC-SA 4.0" Claim Is a False Positive

A web search for OPR licensing returns, confidently, that OPR content is licensed **CC BY-NC-SA 4.0**. **This claim is not supported by any OPR source and should be treated as false.**

## Why it appears

The claim surfaces from search results pointing at **1d6chan** (`1d6chan.miraheze.org/wiki/One_Page_Rules`) and similar wikis. Miraheze and Fandom wikis carry a **site-wide CC BY-NC-SA footer describing the wiki's own article text**. A summariser reading that page attributes the wiki's footer licence to the *subject* of the article. The licence belongs to the wiki, not to OPR.

## Why it is wrong

Checked directly against OPR's own surfaces:

- `onepagerules.com/terms-conditions` — no mention of Creative Commons.
- The free GF core rules PDF v2.16 — a keyword scan of the extracted text for `creative commons`, `cc by`, `cc-by`, `licence`, `license`, `copyright` returned **False for every term**. See [[licence-rules-pdf-contains-no-licence-notice]].
- OPR's actual footer says the opposite: `Copyright © onepagerules All Rights Reserved`.

## Why this matters

This is exactly the failure mode that a licensing decision must not inherit. Acting on the CC claim would mean shipping OPR rules text and army data in a Foundry module believing redistribution and derivative works were permitted, when [[licence-opr-rules-have-no-open-licence]].

CC BY-NC-SA would *also* have been a poor fit even if true: the **NC** clause is notoriously ill-defined for module distribution, and **SA** would force the engine's licence. But the point is moot — the licence does not exist.

**Confidence: confirmed** that no OPR source states a CC licence. Related: [[licence-cannot-bundle-opr-rules-text-in-a-foundry-module]].
