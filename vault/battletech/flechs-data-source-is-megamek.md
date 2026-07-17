---
tags: [wargame-research, battletech]
source: https://helm-kore-fragment.s3.amazonaws.com/unitList.xml
confidence: confirmed
---

# Flechs Sources Its Unit Catalog from MegaMek .mtf Data (the precedent, examined)

The task asked: *"Where does IT get its unit data from? If a live public tool sources unit data legally, that's a strong precedent worth understanding."*

**Answer: Flechs appears to source from MegaMek — which means it is NOT an example of a legal path. It inherits MegaMek's exact problem.**

## The evidence

Flechs' changelog (v7.3.8) discloses its catalog location:

> Unit list now resides at `https://helm-kore-fragment.s3.amazonaws.com/unitList.xml`

I fetched it (public S3 object, HTTP 200, ~395 KB, last modified 2026-01-20). Real excerpt:

```xml
<units>
<u d="Flea FLE-14" f="Flea FLE-14.mtf" e="2519" m="15" t="is" sn="flea" />
<u d="Celerity CLR-02-X-D" f="Celerity CLR-02-X-D.mtf" e="3052" m="15" mk="0" t="is" w="1" x="1" sn="celerity" />
<u d="Patron LoaderMech Standard" f="Patron LoaderMech.mtf" e="2550" m="15" mk="0" t="is" w="3" sn="patron loadermech" />
</units>
```

Attribute reading: `d`=display name, **`f`=filename — a `.mtf` file**, `e`=era/year, `m`=?, `t`=tech base (`is`), `w`=weight class, `sn`=search name.

**Every catalog entry points at a MegaMek `.mtf` filename.** The names (`Patron LoaderMech`, `Pompier FireMech`, `Celerity CLR-02-X-D`) match MegaMek's `mm-data` corpus. Flechs' catalog is an index over the MegaMek dataset ([[megamek-mtf-unit-format]]).

## Why this demolishes the "precedent" hope

Flechs is **not** a tool that found a legal way to license unit data. It is a fan tool built on **another fan project's** unlicensed dataset. The chain is:

> Catalyst/Topps publications → MegaMek volunteers transcribe → CC-BY-NC-SA asserted → Flechs consumes

Flechs is **downstream of the same unresolved question**, and adds a second problem: MegaMek's data is **ShareAlike**, yet I found **no MegaMek attribution or CC notice anywhere on Flechs**. If Flechs is indeed redistributing BY-NC-SA data, the attribution and ShareAlike conditions look unmet.

## What it *is* evidence of

Flechs is real, popular, free, donation-funded, publicly hosted, and **has not been shut down**. Together with MegaMek's 20+ years, that is genuine evidence about *enforcement posture* toward free, non-commercial fan tools.

**But it is evidence of tolerance, not of permission** — and tolerance is not a licence you can build a product on. See [[licensing-verdict-battletech]].

⚠️ **Inference flag:** the `.mtf` filename linkage is strong circumstantial evidence, and I confirmed the endpoint and its contents myself. I did **not** find a Flechs statement confirming its data source. Sourcing-from-MegaMek is my inference — **confidence: high but not stated by the author**.
