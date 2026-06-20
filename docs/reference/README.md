# Reference PDFs (local only)

> **Architecture and commands**: [`docs/guides/reference-indexer.md`](../guides/reference-indexer.md) — single guide for how the indexer works, validation tiers, and new-workspace setup.

Textbook and policy PDFs live here for **local authoring and SME verification**. They are gitignored (`docs/reference/*.pdf`) and must not be committed.

## Standard filenames

| File | Source |
|---|---|
| `cupples-core-curriculum-2e.pdf` | *Core Curriculum for Transplant Nurses*, 2nd ed. |
| `transplantation-nursing-secrets.pdf` | *Transplantation Nursing Secrets* |
| `organ-transplantation-2e.pdf` | *Organ Transplantation*, 2nd ed. |
| `danovitch-handbook-kidney-transplantation.pdf` | *Handbook of Kidney Transplantation*, 6th ed. |
| `nursing-drug-handbook-2024.pdf` | Saunders Nursing Drug Handbook |
| `mosbys-diagnostic-lab-reference-14e.pdf` | Mosby's Diagnostic and Laboratory Test Reference, 14th ed. |
| `optn-policies.pdf` | [OPTN Policies bundle (HRSA)](https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf) |

## OPTN policies PDF

Canonical public URL:

`https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf`

Fetch locally (browser or script):

```bash
npm run reference:fetch-optn
npm run reference:index -- optn-policies
npm run reference:search -- optn-policies "Policy 18.3 refusal"
npm run reference:page -- optn-policies 412
```

If the fetch script is blocked (403), download the PDF in a browser from the HRSA policies page and save it as `docs/reference/optn-policies.pdf`, then run `reference:index`.

## Index

Page text indexes are written to `docs/reference/.index/` (also gitignored). Rebuild after adding or updating any PDF:

```bash
npm run reference:index
```
