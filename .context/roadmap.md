# CCTE Roadmap

> **Purpose**: Track the product phases for the CCTE static practice-exam app so agents can align implementation work to the actual learner-facing outcome.
>
> **Canonical product specs**: This roadmap is a phase tracker, not a substitute for the numbered prompts. For full requirements, read in order: [`.github/prompts/00-onboarding.md`](../.github/prompts/00-onboarding.md) → [`01-build-app.md`](../.github/prompts/01-build-app.md) → [`02-author-questions.md`](../.github/prompts/02-author-questions.md) → [`03-validate.md`](../.github/prompts/03-validate.md).

## Roadmap Principles

1. Keep the product static-hostable, client-side only, and offline-capable after first load.
2. Separate exam-engine behavior, content validation, and question-bank growth so each can evolve without a backend.
3. Treat reviewed clinical content and schema validation as release gates, not cleanup tasks.
4. Prefer small, testable slices that preserve resume safety and scoring correctness.

## Current Phase

**Phase 3 — Question-bank growth and validation**

Phase 1 and Phase 2 are complete on `main` (landed via [#1](https://github.com/mikejmckinney/CCTE/pull/1)). The static app, exam engine, persistence, validation tooling, and browser resume e2e coverage are in place. The next product-critical work is authoring real question shards under `questions/domain-*` per `02-author-questions.md`.

---

## Phase 1: Bootstrap and App Scaffold

**Status**: Complete (on `main`)

**Objective**: Replace template-era context with product context and stand up the static browser app shell.

### Deliverables
- Product-specific `.context` roadmap and vision files.
- Frontend scaffold for a static React/TypeScript-style app with responsive layout.
- App shell for start screen, session creation, and top-level navigation.
- Build path ready for offline-capable static hosting.

### Acceptance Criteria
- `.context` files describe CCTE rather than `ai-repo-template`.
- The app runs locally as a static client-side project.
- The shell exposes the core settings surface: blueprint, item count, timer, and mode.

---

## Phase 2: Exam Engine and Persistence

**Status**: Complete (on `main`)

**Objective**: Implement the session engine that assembles exams, freezes order, and survives interruptions.

**Canonical spec**: [`.github/prompts/01-build-app.md`](../.github/prompts/01-build-app.md) (sampling, modes, persistence, scoring, history).

### Deliverables
- Blueprint-aware session assembly and weighted sampling.
- Frozen question order and option order per session.
- IndexedDB persistence for active session, answers, bookmarks, timer, and history.
- Resume flow that restores the exact in-progress session state.

### Acceptance Criteria
- Study and Exam modes both run end-to-end.
- Save-after-each-question and save-after-navigation behavior is verified.
- Closing and reopening the app restores the active session without reshuffling.
- Score reports show overall and per-category raw breakdowns.

### Verification (closed on `main`)
- [x] Unit proof that serialized session state preserves order, option order, answers, bookmarks, and timer fields (`src/lib/sessionResume.test.ts`).
- [x] Browser e2e resume smoke: reload restores answers, bookmarks, and item position via IndexedDB (`e2e/resume.spec.mjs`; CI runs `npm run test:e2e:playwright`).
- [x] Runtime sampler honors blueprint `domain_tolerance_items` when reporting category shortages (`getScaledDomainTolerance`).
- [x] Runtime sampler approximates `cognitive_level_targets` and `organ_targets` as soft targets during bucket selection.
- [x] Prefer unseen items over recently seen items within each blueprint bucket before soft-target ranking.
- [x] Example-bank fallback documented and implemented in `src/data/questionBank.ts` until domain shards exist.

### Deferred to Phase 4
- Richer history trend view (current UI shows a short recent-score list only).

---

## Phase 3: Question-Bank Growth and Validation

**Status**: In Progress (validation + reference index in place; 433 draft items across all blueprint tasks)

**Objective**: Make the bank safe to expand while keeping schema integrity and blueprint coverage visible.

**Canonical specs**:
- Validation and CI: [`.github/prompts/03-validate.md`](../.github/prompts/03-validate.md)
- Question authoring: [`.github/prompts/02-author-questions.md`](../.github/prompts/02-author-questions.md) and [`questions/README.md`](../questions/README.md)
- **Why** reference/locator rules: [`docs/decisions/adr-030-verifiable-question-references.md`](../docs/decisions/adr-030-verifiable-question-references.md)

This phase is **not complete** until reviewed coverage is growing toward the ~500-item target with verifiable references on every item.

### Deliverables
- Build-time validation for every question file against the schema.
- Cross-field integrity checks and duplicate-id protection.
- Coverage reporting for both blueprint versions.
- Authoring workflow support for draft versus reviewed items.
- Sharded bank layout under `questions/domain-*` (≤50 items per file).
- Local PDF reference index (`npm run reference:*`) including OPTN policies bundle — see ADR-030.
- `primary_anchor` + verifiable locator standard enforced in validator — see ADR-030.

### Acceptance Criteria
- Invalid question files fail validation and block the build.
- Coverage output shows reviewed-item availability by domain or legacy section.
- The bank structure supports steady growth toward a broad reviewed practice set.

### Authoring checklist (from `02-author-questions.md`)

Use this when expanding the bank; do not duplicate the full authoring rules here.

**Content and guardrails**
- [ ] Every new item is original expression (facts OK; no copied stems, vignettes, or brain-dump material). See `00-onboarding.md` guardrails.
- [ ] Every authored item starts as `"status": "draft"`; only a human SME promotes to `"reviewed"`.
- [ ] One defensible correct answer; plausible distractors; coordinator-level scope (not NP/PA).
- [ ] `primary_anchor` set source-first; `references` with findable locators per ADR-030 / `02-author-questions.md` (textbook outline + `PDF p. N`; OPTN Policy § + `#page=N` when citing the policies PDF; no generic OPTN index URLs).
- [ ] Add OPTN policies-PDF corroboration only when a specific Policy § is already cited and verified on the indexed page (additive — keep useful HRSA URLs).
- [ ] `notes` field states what the reviewer must verify (policy versions, lab ranges, drug interactions, etc.).

**Tagging (2026-07 blueprint; legacy via crosswalk)**
- [ ] `domain` (required), `task` (recommended), `knowledge_codes` (optional).
- [ ] `cognitive_level` tagged; bank trends toward ~35% recall / 52% application / 13% analysis.
- [ ] `recipient_age` tagged (`adult` / `pediatric` / `both`); bank soft target **5–7% `pediatric`** (~5% on live CCTC exam forms; bank band allows modest sampler depth — `both` does not count).
- [ ] `organ` tagged; ~50% `general`, remainder per blueprint `organ_targets`.
- [ ] Both `one_best` and `complex_combo` formats represented across the bank.

**Structure and growth**
- [x] Shard directories created: `questions/domain-1-education/`, `domain-2-pretx/`, `domain-3-postop/` (add JSON shards at ≤50 items per file).
- [x] First draft shards landed: `batch-01.json` + `batch-02.json` in each domain (25 draft items; all `status: "draft"`; at least one item per blueprint task).
- [x] **Batch 03** (`batch-03.json` in each domain): +12 draft items (`cctc-1010`–`1013`, `2009`–`2012`, `3009`–`3012`); targeted depth on tasks `010500`, `010600`, `020100`, `020500`, `030100`, `030200`, `030300`; first **lung** organ tag; second **pediatric** item; second **`complex_combo`**; first **OPTN-primary** waitlist items (`020500`, Policy 3.4.E inactive status, `optn_policies.pdf` p. 44). Full `npm run validate` green (2026-06-06).
- [x] **Batch 04** (`batch-04.json` in each domain): +12 draft items (`cctc-1014`–`1017`, `2013`–`2016`, `3013`–`3016`); living donor financial/complication education, primary nonfunction risk, **heart/lung** and **pancreas** indications, multidisciplinary consults, DonorNet offer presentation, kidney preop urine baseline, **intestine** long-term outcomes, community MD coordination, timed IS dosing, **SPK** rejection `complex_combo` (**kidney_pancreas**). First bank coverage of `heart_lung`, `pancreas`, `intestine`, `kidney_pancreas` organ tags. Full `npm run validate` green (2026-06-05).
- [x] **Batch 05** (`batch-05.json` in each domain): +12 draft items (`cctc-1018`–`1021`, `2017`–`2020`, `3017`–`3020`); evaluation protocols & health-maintenance screening, hand-hygiene infection prevention, SRTR outcome disclosure, not-listed communication, selection-committee synthesis, **OPTN HLA/WHO** listing (`020502`), lung smoking cessation/cotinine, FAST stroke urgent contact, tacrolimus nephrotoxicity (Nursing Drug Handbook), **UNet** listing data, late-mortality `complex_combo`. Full `npm run validate` green (2026-06-05).
- [x] **Batch 36** (`batch-36.json` in each domain): +12 draft items (`cctc-1142`–`1145`, `2141`–`2144`, `3141`–`3144`); live-vaccine diaper precautions, wound cleaning, endemic travel-risk and travel-preparation `complex_combo`, PTLD extranodal/lymphadenopathy/abdominal-pain presentation, PTLD risk-factor `complex_combo`, bacterial wound dehiscence, multi-site cultures, sensitivity-guided antibiotics, bacterial-treatment `complex_combo` (adult/both only). Full `npm run validate` green (2026-06-05).
- [x] **Batch 35** (`batch-35.json` in each domain): +12 draft items (`cctc-1138`–`1141`, `2137`–`2140`, `3137`–`3140`); psychological-care monitoring, household influenza vaccination, garden/dirt infection precautions, health-maintenance `complex_combo`, PTLD night sweats/upper-respiratory/diarrhea presentation, PTLD treatment-modality `complex_combo`, bacterial-infection diagnostics (blood cultures, chest x-ray, catheter-site signs), bacterial-diagnosis `complex_combo` (adult/both only). Full `npm run validate` green (2026-06-05).
- [x] **Batch 34** (`batch-34.json` in each domain): +12 draft items (`cctc-1134`–`1137`, `2133`–`2136`, `3133`–`3136`); post-transplant travel teaching (early restriction, carry-on meds, destination provider, travel `complex_combo`), PTLD organ involvement/tonsillitis/pulmonary mass presentation, PTLD recognition `complex_combo`, bacterial-infection empiric therapy (CVL vancomycin, VRE linezolid), drainage/output changes, bacterial-management `complex_combo` (adult/both only). Full `npm run validate` green (2026-06-05).
- [x] **Batch 33** (`batch-33.json` in each domain): +12 draft items (`cctc-1130`–`1133`, `2129`–`2132`, `3129`–`3132`); healthy-diet teaching, return-to-work restrictions/vocational referral, return-to-work `complex_combo`, PTLD asymptomatic/GI-perforation presentation, HRT in selected patients, EBV mono-like-to-PTLD sequelae, communicable-disease exposure reporting, post-transplant HRT bone coordination, pediatric bacterial nonspecific signs, bacterial-infection `complex_combo`. Full `npm run validate` green (2026-06-05).
- [x] **Batch 32** (`batch-32.json` in each domain): +12 draft items (`cctc-1126`–`1129`, `2125`–`2128`, `3125`–`3128`); IUD/libido/pregnancy-registry sexual health, contraception `complex_combo`, EBV reactivation/antilymphocyte incidence, emergency contraception, pediatric PTLD age-risk, antirejection infection prophylaxis, radiotherapy/interferon PTLD therapy, visitor infection-prevention `complex_combo`. Full `npm run validate` green (2026-06-05).
- [x] **Batch 31** (`batch-31.json` in each domain): +12 draft items (`cctc-1122`–`1125`, `2121`–`2124`, `3121`–`3124`); sexual-health and pregnancy teaching, appearance changes, reproductive-health `complex_combo`, CMV-disease PTLD risk, rituximab/R-CHOP/surgery PTLD therapy, denosumab/calcitonin bone options, renal-dysfunction progression, PTLD treatment-modality `complex_combo` (adult/both only). Full `npm run validate` green (2026-06-05).
- [x] **Batch 30** (`batch-30.json` in each domain): +12 draft items (`cctc-1118`–`1121`, `2117`–`2120`, `3117`–`3120`); vigorous-activity counseling, raw-egg and foodborne-outbreak dietary teaching, hand-hygiene visitor `complex_combo`, aquarium/bird-cage avoidance, primary-EBV timing and viral-load PTLD risks, IVIG PTLD prevention, calcium/bisphosphonate/DEXA bone-health depth, bone-health `complex_combo` (adult/both only; pediatric share back within 5–7% band). Full `npm run validate` green (2026-06-05).
- [x] **Batch 29** (`batch-29.json` in each domain): +12 draft items (`cctc-1114`–`1117`, `2113`–`2116`, `3113`–`3116`); tanning-bed avoidance, hyperlipidemia lifestyle management, pet immunization, animal-safety `complex_combo`, food cross-contamination, potent-immunosuppression and CMV-mismatch PTLD risks, mTOR-inhibitor PTLD therapy, aggressive lipid/hypertension long-term care, ACS cancer screening, malignancy-prevention `complex_combo` (adult/both only). Full `npm run validate` green (2026-06-05).
- [x] **Batch 28** (`batch-28.json` in each domain): +12 draft items (`cctc-1110`–`1113`, `2109`–`2112`, `3109`–`3112`); tobacco/marijuana avoidance, post-transplant diabetes glucose teaching, hepatitis B HCC-prevention vaccination, visitor-precaution `complex_combo`, PTLD risk/incidence/presentation/treatment depth, ganciclovir PTLD prevention, nonrenal PTLD epidemiology, PTLD `complex_combo` (adult/both only). Full `npm run validate` green (2026-06-05).
- [x] **Batch 27** (`batch-27.json` in each domain): +12 draft items (`cctc-1106`–`1109`, `2105`–`2108`, `3105`–`3108`); gender-specific health-maintenance teaching (breast/testicular/prostate/Pap), health-maintenance `complex_combo`, BCC/SCC epidemiology and organ-specific incidence, baseline DEXA, post-transplant DEXA intervals, skin-cancer anatomic distribution and aggressive behavior, infection/bone-health `complex_combo` (adult/both only). Pediatric bank soft target revised to **5–7%**. Full `npm run validate` green (2026-06-05).
- [x] **Batch 26** (`batch-26.json` in each domain): +12 draft items (`cctc-1102`–`1105`, `2101`–`2104`, `3101`–`3104`); squamous-cell and sun-protection teaching, boil-water advisories, skin-cancer `complex_combo`, pretransplant cryptococcosis therapy, kidney perfusion allocation, dental/colonoscopy health maintenance, long-term skin surveillance, dental-care `complex_combo` (adult/both only). Full `npm run validate` green (2026-06-05).
- [x] **Batch 25** (`batch-25.json` in each domain): +12 draft items (`cctc-1098`–`1101`, `2097`–`2100`, `3097`–`3100`); kidney/heart smoking counseling, animal-safety and new-pet timing, Listeria/Nocardia `complex_combo`, EPTS and KDPI waitlist metrics, kidney paired donation, listeriosis transmission, Nocardia pulmonary presentation, CARV morbidity, influenza/CARV `complex_combo` (adult/both only — pediatric share nudge). Full `npm run validate` green (2026-06-05).
- [x] **Pediatric bank target** documented: `recipient_age: pediatric` soft target **5–7%** of bank (`both` excluded; live CCTC exam ~5%); `npm run validate:coverage` reports share vs band (revised 2026-06-05).
- [x] **Batch 24** (`batch-24.json` in each domain): +12 draft items (`cctc-1094`–`1097`, `2093`–`2096`, `3093`–`3096`); fixed pulmonary-hypertension contraindication, well-water Cryptosporidium precautions, pediatric acetaminophen fever guidance, heart catheterization `complex_combo`, coronary-angiography purpose, pulmonary vasodilator testing, liver smoking complications, ankle-brachial vascular screening, pediatric PCP timing, pediatric UTI epidemiology, PPD/isoniazid prophylaxis, pediatric bacterial-infection `complex_combo`. Full `npm run validate` green (2026-06-05).
- [x] **Batch 23** (`batch-23.json` in each domain): +12 draft items (`cctc-1090`–`1093`, `2089`–`2092`, `3089`–`3092`); meningococcal high-risk vaccination, post-transplant pregnancy timing, visitor infection precautions, RSV `complex_combo`, OPTN Policy 3.7 waiting-time modification, cold/warm ischemia definitions, parainfluenza pediatric/lung counseling, cardiac cath evaluation requirement, chronic rejection pediatric presentation, ischemia-reperfusion DGF mechanism, chronic rejection `complex_combo`. Full `npm run validate` green (2026-06-05).
- [x] **Batch 22** (`batch-22.json` in each domain): +12 draft items (`cctc-1086`–`1089`, `2085`–`2088`, `3085`–`3088`); rabies vocation vaccination, pediatric sexual-health HPV/hepatitis B, adenovirus `complex_combo`, HHV-6 teaching, DSA-versus-PRA distinction, evaluation viral studies and biopsy indications, prospective crossmatch timing, pediatric kidney rejection presentation, adenovirus/HHV-6 post-transplant epidemiology, delayed-graft-function supportive care. Full `npm run validate` green (2026-06-05).
- [x] **Batch 21** (`batch-21.json` in each domain): +12 draft items (`cctc-1082`–`1085`, `2081`–`2084`, `3081`–`3084`); PTA metabolic criteria, parvovirus B19 `complex_combo`, hepatorenal-failure teaching, living-donor written willingness, OPTN pancreas-islet inactive waiting time, donor physical-exam/psychosocial risk assessment, pancreatic exocrine insufficiency, donor-transmitted infection `complex_combo`, pediatric parvovirus presentation, heart late CNI-to-sirolimus CAV benefit. Full `npm run validate` green (2026-06-05).
- [x] **Batch 20** (`batch-20.json` in each domain): +12 draft items (`cctc-1078`–`1081`, `2077`–`2080`, `3077`–`3080`); living-donor federal organ-sales prohibition, JC virus/PML `complex_combo`, pediatric vascular-thrombosis teaching, pretransplant vaccine-response counseling, OPTN pancreas inactive waiting time, mTOR inhibitor classification, sirolimus/everolimus black-box warnings, sirolimus adverse-effect `complex_combo`, pediatric sudden-anuria urgent contact. Full OPTN Policy 3.6.A inactive organ set complete. Full `npm run validate` green (2026-06-05).
- [x] **Batch 19** (`batch-19.json` in each domain): +12 draft items (`cctc-1074`–`1077`, `2073`–`2076`, `3073`–`3076`); living-donor decline-right teaching, BK virus `complex_combo`, lung CMV bronchiolitis, live-vaccine interval, OPTN liver/intestine inactive waiting time, BK screening, donor chart review, sirolimus wound healing, post-transplant vaccination restart, BK nephropathy, BK risk-factor `complex_combo`. First BK-virus and sirolimus items; completes OPTN inactive-waiting-time organ set. Full `npm run validate` green (2026-06-05).
- [x] **Batch 18** (`batch-18.json` in each domain): +12 draft items (`cctc-1070`–`1073`, `2069`–`2072`, `3069`–`3072`); liver hepatopulmonary syndrome indication/evaluation, CMV organ-specific `complex_combo`, living-liver surgical-risk teaching, EBV/PTLD screening, belatacept EBV requirement, OPTN lung inactive waiting time, adult ATN signs `complex_combo`, CMV vanishing bile duct and glomerulopathy. Full `npm run validate` green (2026-06-05).
- [x] **Batch 17** (`batch-17.json` in each domain): +12 draft items (`cctc-1066`–`1069`, `2065`–`2068`, `3065`–`3068`); pediatric kidney ATN teaching, intestine GVHD incidence counseling, heart CAV as chronic rejection, CMV prevention-strategy `complex_combo`, post-transplant DSA monitoring, heart rituximab desensitization risks, SPK indication, heart preop emotional support, intestine GVHD skin-rash presentation, heart CAV/LV-dysfunction etiology, pediatric ATN monitoring `complex_combo`, TMP-SMX toxoplasma prophylaxis benefit. Nudged recall (27.3%) and analysis (8.8%) mix. Full `npm run validate` green (2026-06-05).
- [x] **Batch 16** (`batch-16.json` in each domain): +12 draft items (`cctc-1062`–`1065`, `2061`–`2064`, `3061`–`3064`); pancreas hypoglycemic-unawareness indications, pediatric intestinal oral-aversion teaching, heart-lung toxoplasmosis `complex_combo`, Eisenmenger heart-lung indication, pancreas metabolic evaluation, heart-lung evaluation scope, intestinal-failure definition, pediatric child-development consult, pancreas graft-thrombosis/dehydration, toxoplasmosis-versus-rejection biopsy, pancreas long-term fluid `complex_combo`, pediatric intestinal feeding coordination. Rare-organ depth (pancreas, heart_lung, intestine). Full `npm run validate` green (2026-06-05).
- [x] **Batch 15** (`batch-15.json` in each domain): +12 draft items (`cctc-1058`–`1061`, `2057`–`2060`, `3057`–`3060`); liver alcohol abstinence and behavioral contract, heart lifting restrictions, lifestyle `complex_combo`, living-liver donor discharge teaching, heart waitlist right-heart catheterization, lung referral timing, kidney hypercoagulability screening, liver metabolic bone disease, kidney medication-box discharge teaching, heart return-to-work counseling, lung BOS chronic rejection. **All blueprint per-task targets now met (181 items).** Full `npm run validate` green (2026-06-05).
- [x] **Batch 14** (`batch-14.json` in each domain): +12 draft items (`cctc-1054`–`1057`, `2053`–`2056`, `3053`–`3056`); transplantation-risk `complex_combo`, discharge insulin teaching, pediatric community-infection teaching, PCP waitlist coordination, required-testing priority change, waitlist-status communication, pediatric-to-adult transition, pediatric fever septic workup, post-transplant skin-cancer risk, day-after-discharge call, PPI–MMF interaction counseling. All items `organ: general`; closes general-organ blueprint gap (76/75). Full `npm run validate` green (2026-06-05).
- [x] **Batch 13** (`batch-13.json` in each domain): +12 draft items (`cctc-1050`–`1053`, `2049`–`2052`, `3049`–`3052`); obesity contraindication teaching, unpasteurized-dairy infection prevention, dietary precautions `complex_combo`, hot-tub environmental guidance, OPTN 24-hour waitlist removal, **PAK** pancreas-after-kidney evaluation, skin/dentition health-maintenance screening, pretransplant bone densitometry, new wound-drainage urgent contact, surgical wound infection debridement, tacrolimus tremor adverse effect, unilateral leg edema/lymphocele monitoring. Full `npm run validate` green (2026-06-05).
- [x] **Batch 12** (`batch-12.json` in each domain): +12 draft items (`cctc-1046`–`1049`, `2045`–`2048`, `3045`–`3048`); live-virus household precautions, osteopenia counseling, vaccination `complex_combo`, sexual-health teaching, heart inactive waiting-time rule, OPTN not-registered notification, waitlist insurance/contact reporting, **intestine** standard-of-care suitability, ostomy bleeding urgent contact, ACE-inhibitor hyperkalemia monitoring, ureteral obstruction, azathioprine bone marrow suppression. Full `npm run validate` green (2026-06-05).
- [x] **Batch 11** (`batch-11.json` in each domain): +12 draft items (`cctc-1042`–`1045`, `2041`–`2044`, `3041`–`3044`); pre-emptive kidney benefit, living liver donor risk comparison, living-donor organ quality teaching, separate live donor team advocacy, OPTN waitlist registration notification, lung waitlist health-status reporting, bronchoscopy evaluation coordination, liver MELD data for waitlist removal, post-transplant lab monitoring, PCP prophylaxis discharge planning, malignancy-prevention `complex_combo`, cyclosporine cosmetic effects. Full `npm run validate` green (2026-06-05).
- [x] **Batch 10** (`batch-10.json` in each domain): +12 draft items (`cctc-1038`–`1041`, `2037`–`2040`, `3037`–`3040`); immunosuppressant hyperlipidemia risk teaching, living-donor ESRD counseling, long-term IS side-effect `complex_combo`, psychosocial evaluator qualifications, kidney inactive waiting-time accrual (OPTN Table 3-3), **SPK** suitability (**kidney_pancreas**), donor-transmitted disease disclosure, liver HCC surveillance, oral-bleeding urgent contact, liver cholangitis lab pattern and ERCP management, OPTN TRF anniversary submission. Full `npm run validate` green (2026-06-05).
- [x] **Batch 09** (`batch-09.json` in each domain): +12 draft items (`cctc-1034`–`1037`, `2033`–`2036`, `3033`–`3036`); heart/liver smoking contraindication education, lung pulmonary rehabilitation requirement, pediatric HPV vaccination teaching, positive stress-test cardiology referral, additional specialist consultations, indeterminate evaluation outcome, lung organ-offer presentation factors, lung shortness-of-breath urgent contact, kidney urinary-leak lab pattern and management, OPTN TCR 90-day submission. Full `npm run validate` green (2026-06-05).
- [x] **Batch 08** (`batch-08.json` in each domain): +12 draft items (`cctc-1030`–`1033`, `2029`–`2032`, `3029`–`3032`); living-donor follow-up commitment, liver donor bile-leak teaching, immunosuppression side-effect risks, discharge medication `complex_combo`, approved-candidate communication (**pancreas**), smoking cessation/cotinine waitlist rule (**lung**), multidisciplinary support resources, baseline pulmonary screening (**heart**), chest-pain urgent contact, waitlist clinic attendance (**liver**), grapefruit–immunosuppression interaction, mycophenolate adverse effects. Full `npm run validate` green (2026-06-08).
- [x] **Batch 07** (`batch-07.json` in each domain): +12 draft items (`cctc-1026`–`1029`, `2025`–`2028`, `3025`–`3028`); living liver donor fever call, kidney contraindication education, deceased-donor alternate disclosure, liver rejection `complex_combo`, waitlist LAS/MELD testing, evaluation framing, heart-lung selection committee, liver cardiac stress testing, liver LFT/biopsy monitoring, rejection fever mechanism, OPTN TRR timely data, post-transplant diabetes incidence. Full `npm run validate` green (2026-06-08).
- [x] **Batch 06** (`batch-06.json` in each domain): +12 draft items (`cctc-1022`–`1025`, `2021`–`2024`, `3021`–`3024`); waitlist death risk (**pediatric**), living-donor psychosocial risks, infection-prevention `complex_combo`, travel restriction, **LAS** 6-month updates, heart PRA/crossmatch, **PHS** increased-risk donor consent, conditional approval communication, rectal-bleeding urgent contact, **CMV** prophylaxis teaching, cyclosporine gingival hypertrophy, second-year follow-up interval. Full `npm run validate` green (2026-06-05).
- [ ] After each batch, run `npm run validate` and fill under-represented domains, tasks, cognitive levels, and organs.
- [ ] Grow reviewed items toward ~500 so sampling has variety beyond a single exam.

**Reviewer / flag loop**
- [ ] Triage exported flags (`ccte-flags.json` from the app) alongside new authoring.
- [ ] On fix: edit item in repo, bump `version`, set back to `draft`, re-review; stale app flags drop on version mismatch.

### Validation tooling (done vs deferred)

**Done**
- [x] Decomposed validator (`scripts/validate/` modules + orchestrator).
- [x] Full local gate: `npm run validate` (schema + integrity + reference format + indexed content).
- [x] CI subset: `npm run validate:ci` (format + OPTN-indexed content; textbook content skipped with logged skips).
- [x] Authoring loop: `npm run validate:references`.
- [x] OPTN policies PDF index (`npm run reference:fetch-optn`, `reference:index -- optn-policies`).
- [x] Verification stubs — [`docs/reference/verification-stubs/README.md`](../docs/reference/verification-stubs/README.md), [`schema/reference-verification-stub.schema.json`](../schema/reference-verification-stub.schema.json), `questions/.verification/` (433 items as of batch 36).
- [x] `npm run reference:export-stubs` — generate `questions/.verification/<item-id>.json` from local full validate + index.
- [x] `npm run validate:stubs` — CI hard-fail: question JSON must match committed stubs (keywords, pages, Policy §).
- [x] Wire `validate:stubs` into `.github/workflows/validate.yml`.
- [x] After anchor changes: local `npm run validate` + `reference:export-stubs -- --force`; CI enforces stubs for all bank items.

**Authoring gate:** run full `npm run validate` locally before merge when changing anchors; regenerate stubs when reference metadata changes (see `03-validate.md`).

---

## Phase 4: Review Feedback, Polish, and Release Readiness

**Status**: In Progress (partial — flagging and disclaimer exist in code)

**Objective**: Finish the learner experience and prepare the static app for real study use.

**Canonical spec**: [`.github/prompts/01-build-app.md`](../.github/prompts/01-build-app.md) (flagging, responsive/a11y, disclaimer, hosting).

### Deliverables
- Item flagging workflow with stable JSON export.
- Responsive polish for phone, tablet, and laptop.
- Accessibility, disclaimer, and history-review refinements.
- Release-ready validation and deployment hygiene for static hosting.

### Acceptance Criteria
- Users can flag items anywhere they review content without mutating the bank.
- Mobile and keyboard flows are usable without layout breakage.
- The app clearly states its unofficial, independent study-aid status.
- A production static build is ready for GitHub Pages or equivalent hosting.

### Open items (known gaps vs `01-build-app.md`)
- [ ] Device-level responsive and accessibility pass (focus, contrast, one-handed mobile use).
- [ ] GitHub Pages or equivalent deploy config (`vite` `base`, hosting workflow).
- [ ] Richer history trend view (current UI shows a short recent-score list only).

---

## Near-Term Sequencing

1. ~~Land Phase 1–2 bootstrap and exam engine on `main`~~ (done — [#1](https://github.com/mikejmckinney/CCTE/pull/1)).
2. **Phase 3 bank growth** per `02-author-questions.md` — batch 37+ shards; per-task depth targets met — grow bank depth/variety, analysis/recall mix, and **`recipient_age: pediatric` within 5–7%** of bank (~500 reviewed target; 433 draft items as of batch 36).
3. ~~**Phase 3 deferred:** verification stubs + `validate:stubs` in CI~~ (done — 73 stubs committed).
4. **Phase 4 polish and static hosting** — GitHub Pages deploy, device/a11y pass, richer history trends after a small real bank exists.
