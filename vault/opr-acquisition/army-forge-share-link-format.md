---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/thomascgray/opr-af-to-tts/blob/master/src/utils.tsx
confidence: confirmed
---

# Army Forge Share Links Are the User-Facing Import Handle

Army Forge has a **"Share as link"** button. It produces a URL of this form:

```
https://army-forge.onepagerules.com/share?id=XXX&name=XXX
```

**Source (confirmed):** this exact string is the input-field placeholder in `opr-af-to-tts`, present identically across all six locale files (`src/locales/en.yaml` L17, plus de/es/fr/it).

## Extracting the ID

`opr-af-to-tts` parses it with a trivial regex — `src/utils.tsx`, verbatim:

```ts
export const extractIdFromUrl = (url: string) => {
  const idRegex = /id=([^&]+)/;
  const idMatch = idRegex.exec(url);
  const isBeta = url.includes("army-forge-beta.onepagerules.com");
  return [idMatch ? idMatch[1] : null, isBeta];
};
```

That `id` is then passed straight to [[army-forge-api-tts-endpoint]].

## Why this is the ideal UX for an importer

This is the whole feature in one gesture. The user:
1. Builds their list in Army Forge (the tool they already use).
2. Clicks "Share as link".
3. Pastes the link into Foundry.

The user **volunteers their own list** by performing an explicit share action. No crawling, no enumeration, no credentials, no access control touched. This is the pattern every existing OPR integration uses, and it is the one that keeps the design on the right side of [[import-own-list-vs-bulk-scrape]].

The `&name=` param is cosmetic; only `id` is needed.

Related: [[recommended-acquisition-design]]
