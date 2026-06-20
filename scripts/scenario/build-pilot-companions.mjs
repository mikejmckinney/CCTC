#!/usr/bin/env node
/**
 * One-off generator for Phase B pilot scenario companions (cctc-6001–cctc-6030).
 * Run: node scripts/scenario/build-pilot-companions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadValidationInputs, loadQuestionItems } from '../validate/00-load-bank.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

/** Companion id → { parentId, stem } */
const PILOT_MAP = [
  {
    companionId: 'cctc-6001',
    parentId: 'cctc-1001',
    stem: `You are the transplant coordinator covering the afternoon clinic line. A 52-year-old kidney recipient discharged six weeks ago calls from work. He feels well, takes medications on schedule, and reports no fever, pain, or urinary changes. He only wants to confirm whether his follow-up visit is next Tuesday at 10 a.m. as discussed at discharge. The on-call surgeon asks you to document how this contact should be triaged. How should this contact be categorized?`,
  },
  {
    companionId: 'cctc-6002',
    parentId: 'cctc-1018',
    stem: `You are counseling a 45-year-old woman listed for liver transplantation at your center. She completed psychosocial evaluation and asks why her workup includes hepatology-specific imaging and pulmonary studies that her friend undergoing kidney evaluation did not receive. She wonders whether one standard test battery could apply to every organ. Her friend received a different protocol at another program. Which explanation BEST aligns with standard evaluation education?`,
  },
  {
    companionId: 'cctc-6003',
    parentId: 'cctc-1037',
    stem: `You are the pretransplant coordinator for a 58-year-old man with decompensated cirrhosis listed for liver transplant. He smokes half a pack daily despite counseling and wants to know why smoking matters beyond cardiovascular disease risk. He has no prior graft but asks whether tobacco affects liver transplant outcomes specifically. Pulmonary evaluation noted mild obstructive disease. Which liver-related complication should education include?`,
  },
  {
    companionId: 'cctc-6004',
    parentId: 'cctc-1057',
    stem: `You are teaching the parents of a 6-year-old who received a deceased-donor kidney transplant two weeks ago. The child was discharged on high-dose induction therapy and the family is planning a return to daycare. Grandparents ask whether common childhood illnesses will behave the same as before transplant. The child currently has no fever or respiratory symptoms. Which teaching point aligns with standard infection-prevention references?`,
  },
  {
    companionId: 'cctc-6005',
    parentId: 'cctc-1078',
    stem: `You are facilitating living kidney donor evaluation for a 34-year-old sister donating to her brother. During the independent donor advocate session, she asks whether she can receive travel reimbursement from the recipient's employer. The surgeon wants confirmation that federal legal boundaries were reviewed before consent. Which legal counseling point must the coordinator include per standard references?`,
  },
  {
    companionId: 'cctc-6006',
    parentId: 'cctc-1099',
    stem: `You are reviewing home infection precautions with a 41-year-old heart recipient three weeks post-transplant. She lives alone with an indoor cat and no one else can manage litter duties indefinitely. She feels well and asks what protection is needed if she must clean the litter box herself. She already uses hand hygiene after gardening. Which teaching point aligns with standard references?`,
  },
  {
    companionId: 'cctc-6007',
    parentId: 'cctc-1120',
    stem: `You are conducting a post-transplant education class for adult recipients and caregivers. A kidney recipient notes a local news report about a regional foodborne illness outbreak linked to deli meat. She asks how immunosuppressed patients should respond to community alerts beyond routine kitchen hygiene. She is six months post-transplant and otherwise well. Which community-surveillance step aligns with standard references?`,
  },
  {
    companionId: 'cctc-6008',
    parentId: 'cctc-1142',
    stem: `You are counseling a 63-year-old lung recipient who frequently babysits twin grandchildren. The grandchildren received a live-virus rotavirus vaccine last week per their pediatrician. The recipient helps with diaper changes and wants to know whether routine grandparent duties are safe. He has no current illness and takes standard maintenance immunosuppression. Which teaching point aligns with standard infection-prevention references?`,
  },
  {
    companionId: 'cctc-6009',
    parentId: 'cctc-1011',
    stem: `You are revising the transplant program's first-month post-discharge phone script before it is distributed to caregivers. Nursing leadership wants concise examples that separate urgent from non-urgent reasons to call. Several new coordinators will use the script during evening triage. The draft must reflect standard communication teaching without listing every possible symptom. Evaluate the following statements about when to contact the transplant team:`,
  },
  {
    companionId: 'cctc-6010',
    parentId: 'cctc-1101',
    stem: `You are preparing an infection-prevention inservice for coordinators after two late-presenting opportunistic infections in the first post-transplant year. Pharmacy asks for teaching points distinguishing Listeria and Nocardia epidemiology and organ involvement. Attendees will apply the material when counseling recipients about food safety and respiratory symptoms. Slides must reflect standard references on timing, mortality, and sites of disease. Evaluate the following statements:`,
  },
  {
    companionId: 'cctc-6011',
    parentId: 'cctc-2001',
    stem: `You are chairing multidisciplinary selection conference for a 48-year-old man with end-stage kidney disease from diabetic nephropathy. He was hospitalized last week for cellulitis of the left leg that is still receiving IV antibiotics. Cardiology cleared him, but infectious diseases notes cultures remain positive today. The surgeon asks whether listing can proceed. Which finding is listed as a major contraindication to transplantation?`,
  },
  {
    companionId: 'cctc-6012',
    parentId: 'cctc-2023',
    stem: `You are the on-call kidney coordinator at 2 a.m. when DonorNet generates an offer for your listed candidate. The donor is labeled Public Health Service increased-risk due to injection-drug history. The candidate is medically ready and has been waiting 18 months. Your attending asks what must occur before acceptance and OR booking. What must occur before transplantation proceeds?`,
  },
  {
    companionId: 'cctc-6013',
    parentId: 'cctc-2045',
    stem: `You are updating a heart candidate who developed an active nontuberculous mycobacterial infection requiring prolonged therapy. The cardiologist placed him on inactive status yesterday while treatment continues. His family worries that waiting time will continue accruing during inactivity as it would for kidney candidates. You need to explain OPTN allocation rules accurately. According to OPTN Policy 3.6.A, how does waiting time accrue during inactivity?`,
  },
  {
    companionId: 'cctc-6014',
    parentId: 'cctc-2067',
    stem: `You are educating a 39-year-old woman with type 1 diabetes and stage 4 CKD referred for combined organ transplant evaluation. She understands she needs a kidney but asks why pancreas transplantation might be offered simultaneously rather than kidney alone. Her nephrologist documented progressive renal insufficiency and brittle glycemic control. Which indication aligns with standard references?`,
  },
  {
    companionId: 'cctc-6015',
    parentId: 'cctc-2089',
    stem: `You are assembling documentation for an OPTN waiting-time modification application under Policy 3.7.A. A lung candidate's original listing date was delayed because of a data-entry error discovered after activation. The program director requests the compliance checklist before UNOS submission. Which required element must be included in the submission?`,
  },
  {
    companionId: 'cctc-6016',
    parentId: 'cctc-2111',
    stem: `You are teaching pretransplant infection and malignancy risks to a newly listed kidney candidate. He reports two weeks of low-grade fevers, drenching night sweats, and cervical lymphadenopathy after finishing lymphocyte-depleting therapy during a prior hospitalization elsewhere. He has not yet received a transplant. Which clinical presentation should the coordinator associate with posttransplant lymphoproliferative disease (PTLD)?`,
  },
  {
    companionId: 'cctc-6017',
    parentId: 'cctc-2133',
    stem: `During evaluation education, a liver candidate's spouse asks whether PTLD would necessarily stay confined to the transplanted liver if it occurred later. The candidate is EBV-seronegative and will receive lymphocyte-depleting induction. You are clarifying typical organ-involvement patterns from standard references. Which organ-involvement pattern aligns with standard references?`,
  },
  {
    companionId: 'cctc-6018',
    parentId: 'cctc-2136',
    stem: `Your transplant program is refreshing evaluation-team education after a delayed PTLD diagnosis in a recent recipient. The quality council wants a short competency check covering organ involvement and variable presentations coordinators should recognize. Material must align with standard PTLD epidemiology and clinical presentation teaching. Evaluate the following statements:`,
  },
  {
    companionId: 'cctc-6019',
    parentId: 'cctc-2148',
    stem: `A multidisciplinary education workgroup is revising PTLD symptom recognition for coordinators who field after-hours calls. Attendees requested scenarios emphasizing that presentation can be subtle or systemic rather than graft-localized. The module will be used before annual competency sign-off. Evaluate the following statements about clinical presentation:`,
  },
  {
    companionId: 'cctc-6020',
    parentId: 'cctc-2160',
    stem: `You are updating long-term survivor education slides on skin cancer after a kidney recipient developed squamous cell carcinoma on the forearms. Dermatology highlighted cumulative ultraviolet exposure and prior retransplantation in the chart review. Coordinators must reinforce prevention strategies tied to standard references. Evaluate the following statements:`,
  },
  {
    companionId: 'cctc-6021',
    parentId: 'cctc-3001',
    stem: `You are reviewing clinic labs for a 44-year-old kidney recipient at eight weeks post-transplant. He denies fever, graft tenderness, dysuria, or weight change and appears comfortable today. Serial creatinine has risen from 1.4 to 1.9 mg/dL over ten days while tacrolimus troughs remain in range. The nurse asks you to prioritize the most likely explanation before additional workup. Which presentation is MOST consistent with this pattern?`,
  },
  {
    companionId: 'cctc-6022',
    parentId: 'cctc-3023',
    stem: `A 36-year-old kidney recipient on cyclosporine returns for routine follow-up complaining of progressively enlarged gums interfering with eating. Dental clearance is complete and graft function is stable. He asks whether switching to tacrolimus is reasonable solely for this cosmetic mucosal problem. Which adverse effect pairing is consistent with standard CNI references?`,
  },
  {
    companionId: 'cctc-6023',
    parentId: 'cctc-3040',
    stem: `Your transplant quality coordinator is auditing timely OPTN follow-up submissions before a UNOS site survey. A heart recipient passed the six-month transplant anniversary last month and the annual date will occur next quarter. The data manager asks when organ-specific transplant recipient follow-up forms must be submitted. After a solid-organ transplant, when must a transplant hospital submit organ-specific transplant recipient follow-up (TRF) data to meet OPTN timely data requirements?`,
  },
  {
    companionId: 'cctc-6024',
    parentId: 'cctc-3058',
    stem: `You are co-leading discharge medication teaching for a kidney recipient going home tomorrow on tacrolimus, mycophenolate, and prednisone. The social worker notes limited health literacy and no live-in caregiver for the first week. Pharmacy is available to support structured home management tools. Which structured adherence strategy aligns with standard references?`,
  },
  {
    companionId: 'cctc-6025',
    parentId: 'cctc-3080',
    stem: `You receive a worried call at midday from the mother of a 4-year-old kidney transplant recipient at home. She reports the child has produced no urine since waking four hours ago despite normal intake yesterday. The child is alert but the mother recalls prior teaching about vascular complications. How should the coordinator classify this finding?`,
  },
  {
    companionId: 'cctc-6026',
    parentId: 'cctc-3101',
    stem: `A 12-year post-transplant kidney recipient attends annual survivor clinic and asks where skin cancers most often develop in transplant populations. He works outdoors and has had several actinic keratoses treated on the scalp and arms. He wants focused counseling consistent with standard teaching. Which counseling point aligns with standard references?`,
  },
  {
    companionId: 'cctc-6027',
    parentId: 'cctc-3123',
    stem: `You are reviewing long-term complications with a 55-year-old liver transplant recipient seven years post-transplant on tacrolimus-based maintenance immunosuppression. Serial creatinine has slowly worsened and nephrology documented chronic kidney disease stage 3b. The patient asks whether medication-related kidney injury can ever require another transplant. Which outcome aligns with standard references?`,
  },
  {
    companionId: 'cctc-6028',
    parentId: 'cctc-3146',
    stem: `You are coordinating care for a 49-year-old bilateral lung transplant recipient hospitalized with bacterial pneumonia on the transplant unit. Chest radiograph shows a new infiltrate and he remains on supplemental oxygen but is hemodynamically stable. Nursing asks which positioning and activity interventions align with standard pneumonia management for transplant recipients. Which nursing intervention aligns with standard references?`,
  },
  {
    companionId: 'cctc-6029',
    parentId: 'cctc-3004',
    stem: `You are called to evaluate a 50-year-old kidney recipient six weeks post-transplant with rising creatinine and decreased urine output over 24 hours. He reports low-grade fever and mild graft-site discomfort but is hemodynamically stable. Tacrolimus trough is elevated compared with the prior visit. The team must review common differential diagnoses before biopsy. Evaluate the following statements about differential diagnosis and presentation:`,
  },
  {
    companionId: 'cctc-6030',
    parentId: 'cctc-3108',
    stem: `Your program is revising the five-year survivor clinic checklist used by coordinators before annual visits. Leadership wants a concise review of infection prevention and bone-health monitoring supported by standard long-term care references. Coordinators will use the list when counseling stable adult recipients. Evaluate the following statements:`,
  },
];

const DOMAIN_DIRS = {
  1: 'domain-1-education',
  2: 'domain-2-pretx',
  3: 'domain-3-postop',
};

function buildCompanion(parent, { companionId, stem }) {
  const companion = structuredClone(parent);
  companion.id = companionId;
  companion.companion_of = parent.id;
  companion.status = 'draft';
  companion.version = 1;
  companion.stem = stem;
  companion.last_updated = '2026-06-05';
  companion.notes = `Scenario companion (pilot wave) paired with ${parent.id}. ${parent.notes ?? ''}`.trim();
  return companion;
}

const { bankFiles } = await loadValidationInputs();
const { allItems } = await loadQuestionItems(bankFiles);
const parentById = new Map(allItems.map((entry) => [entry.item.id, entry.item]));

const byDomain = { 1: [], 2: [], 3: [] };

for (const entry of PILOT_MAP) {
  const parent = parentById.get(entry.parentId);
  if (!parent) {
    throw new Error(`Missing parent item ${entry.parentId}`);
  }
  const companion = buildCompanion(parent, entry);
  byDomain[parent.domain].push(companion);
}

for (const [domain, items] of Object.entries(byDomain)) {
  const dir = path.join(repoRoot, 'questions/scenario', DOMAIN_DIRS[domain]);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'pilot-batch-01.json');
  fs.writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`);
  console.log(`Wrote ${items.length} items → ${path.relative(repoRoot, outPath)}`);
}

console.log(`Pilot companions: ${PILOT_MAP.length} (cctc-6001–cctc-6030)`);
