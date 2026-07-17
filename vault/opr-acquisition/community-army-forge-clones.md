---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/RobMayer/opr-army-forge
confidence: partial
---

# Community Army Forge Clones Exist But Predate the Live API

Two related repos implement a **self-contained Army Forge clone** — a list builder that does not call OPR's API at all.

- https://github.com/scudmarx/opr-army-forge (the original)
- https://github.com/RobMayer/opr-army-forge (a fork, ~345 commits on `develop`)

## What they do

From the README, verbatim:

> This is a community list builder application specific to the One Page Rules games. Army lists are driven by data from the `public/definitions` directory.

Next.js + TypeScript. Crucially: *"There are no database or API dependencies so the project will run locally."* All army data is **vendored as static JSON** in `public/definitions`.

## The interesting bit: they ship a PDF parsing tool

The README notes a JSON schema exists, but that *"the best way to author these will be to start with the pdf parsing tool"*, exposed at a `/data` route.

This is **direct evidence that, historically, extracting OPR data meant parsing the rules PDFs** — someone built a bespoke PDF-to-JSON tool because no API-shaped alternative was accessible to them.

That era is over. [[army-forge-api-army-books-endpoint]] now serves the same data as clean JSON. This repo is a **fossil of the hard way**, and its existence is part of why [[verdict-parsing-needs-no-llm]] lands where it does: even the PDF route was solved *deterministically*, without OCR or LLMs.

## Status and caveats

- **Neither is the official Army Forge.** RobMayer's is a fork of scudmarx's; the real Army Forge is closed-source.
- **No LICENSE file found** in RobMayer's repo → all rights reserved by default; do not vendor.
- Marked `partial`: I did not verify current maintenance status or how stale `public/definitions` is. Given the live API exists, it is almost certainly stale — the same trap as [[official-battlescribe-repos-are-stale]].

**Do not build on this.** It is context, not a dependency.
