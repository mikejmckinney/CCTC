(function(){
// CCTC question bank — real reviewed items imported from mikejmckinney/CCTC, trimmed for the prototype.
const DOMAINS = [
  {
    "id": 1,
    "name": "Transplant Education",
    "short": "Education",
    "items": 46,
    "weightPct": 31
  },
  {
    "id": 2,
    "name": "Pre-Transplant Evaluation & Management",
    "short": "Pre-transplant",
    "items": 46,
    "weightPct": 30
  },
  {
    "id": 3,
    "name": "Post-operative Monitoring & Reporting",
    "short": "Post-op",
    "items": 58,
    "weightPct": 39
  }
];

const BLUEPRINT = {
  id: "cctc-from-2026-07",
  label: "CCTC Detailed Content Outline (effective 2026-07-01)",
  scoredItems: 150,
  pretestItems: 25,
  totalItems: 175,
  timeMinutes: 180,
  productionBankTotal: 506
};

const QUESTIONS = [
  {
    "id": "cctc-1001",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "general",
    "stem": "A kidney transplant recipient calls the coordinator to confirm the date and time of an upcoming clinic visit. According to standard teaching on communication with the transplant team, how should this contact be categorized?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "An urgent matter requiring immediate after-hours contact",
        "selects": null
      },
      {
        "id": "B",
        "text": "A non-urgent matter such as appointment verification",
        "selects": null
      },
      {
        "id": "C",
        "text": "An emergency that requires activating local EMS before notifying the team",
        "selects": null
      },
      {
        "id": "D",
        "text": "A matter that should wait until the next unscheduled clinic visit",
        "selects": null
      }
    ],
    "correct": "B",
    "rationaleCorrect": "Verification of appointment date and time is explicitly listed as a non-urgent reason to contact the transplant team. Coordinators teach recipients to distinguish routine questions from urgent clinical changes.",
    "rationaleIncorrect": {
      "A": "Urgent matters include infection symptoms, rejection signs, wound drainage, chest pain, shortness of breath, bleeding, and stroke symptoms—not routine scheduling questions.",
      "C": "Routine appointment confirmation does not constitute a local EMS emergency.",
      "D": "Non-urgent matters are still appropriate to address through normal team communication channels rather than deferred indefinitely."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §h. Communication with the transplant team → ii. Non-urgent matters / iii. Urgent matters; PDF p. 111 (repo file-page index; printed margin may differ).",
        "url": null
      },
      {
        "citation": "Transplantation Nursing Secrets (Cupples & Ohler, eds., 2003).",
        "locator": "Ch. 25, Patient Education — table “Topics for Candidate Education Programs During the Waiting Period”, item 12 “When to call the coordinator after transplantation”; PDF p. 319.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-1002",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "general",
    "stem": "During pre-transplant education, a candidate asks why immunosuppressive medications must be taken consistently even when they feel well. Which teaching point BEST reflects the risk described in transplant pharmacology references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Skipped doses mainly change cosmetic side effects without affecting graft outcomes.",
        "selects": null
      },
      {
        "id": "B",
        "text": "Inadequate immunosuppression places the patient at risk for rejection.",
        "selects": null
      },
      {
        "id": "C",
        "text": "Maintenance immunosuppression is required only during the first week after transplant.",
        "selects": null
      },
      {
        "id": "D",
        "text": "Recipients may stop immunosuppression whenever they feel fatigued without notifying the team.",
        "selects": null
      }
    ],
    "correct": "B",
    "rationaleCorrect": "Transplant pharmacology references identify inadequate immunosuppression as a direct risk factor for rejection. Coordinators reinforce consistent maintenance dosing and team contact before changes.",
    "rationaleIncorrect": {
      "A": "Immunosuppression risks include rejection and infection, not only cosmetic effects.",
      "C": "Maintenance therapy begins at transplant and continues long term for most recipients.",
      "D": "Recipients should not independently stop immunosuppression; dose changes require coordinated medical management."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 4 → Introduction → A. Overview → item 3 “Risks associated to immunosuppression” → subitem a.; PDF p. 130 (repo file-page index; printed margin may differ).",
        "url": null
      },
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §6. Risks associated with transplantation → b. Organ rejection → iii. Need for lifetime immunosuppression; PDF p. 98.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-1003",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "general",
    "stem": "Which topic is explicitly listed among standard transplant discharge education subjects?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Signs and symptoms of infection",
        "selects": null
      },
      {
        "id": "B",
        "text": "DonorNet refusal code entry",
        "selects": null
      },
      {
        "id": "C",
        "text": "KDPI calculation variables",
        "selects": null
      },
      {
        "id": "D",
        "text": "Independent living donor advocate credentialing",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Discharge education curricula explicitly include signs and symptoms of infection alongside rejection recognition, medications, follow-up testing, and self-monitoring at home.",
    "rationaleIncorrect": {
      "B": "DonorNet refusal documentation is a program/UNOS operational task, not a standard patient discharge education topic.",
      "C": "KDPI is an allocation metric for clinicians and policy, not a listed discharge teaching subject.",
      "D": "Independent donor advocate roles are part of living donation evaluation, not the discharge education topic list for recipients."
    },
    "references": [
      {
        "citation": "Transplantation Nursing Secrets (Cupples & Ohler, eds., 2003).",
        "locator": "Ch. 25, Patient Education — table “Topics for Discharge Education”, item 4 “Signs and symptoms of infection”; PDF p. 320.",
        "url": null
      },
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §h. Communication with the transplant team → iii. Urgent matters (signs and symptoms of infection); PDF p. 111.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-1004",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "heart",
    "stem": "Which patient population meets standard indications for heart transplantation according to organ-specific selection references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Patients with end-stage heart failure and advanced NYHA Class III to IV symptoms when no other medical or surgical options remain",
        "selects": null
      },
      {
        "id": "B",
        "text": "Patients with mild, stable angina controlled on a single antianginal medication",
        "selects": null
      },
      {
        "id": "C",
        "text": "Asymptomatic patients with incidentally discovered mild valvular regurgitation",
        "selects": null
      },
      {
        "id": "D",
        "text": "Patients who decline all medical therapy but have preserved ejection fraction and no heart failure symptoms",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Cardiac transplantation is indicated for patients with end-stage heart failure and advanced congestive heart failure (NYHA Class III to IV) when no other medical or surgical options can improve quality of life and survival.",
    "rationaleIncorrect": {
      "B": "Stable mild angina without advanced heart failure does not meet end-stage heart failure indications for transplant.",
      "C": "Incidental mild valvular disease without advanced heart failure is not the standard transplant indication population.",
      "D": "Transplant is reserved for advanced heart failure when other options are exhausted, not for asymptomatic patients declining therapy."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 1 → Organ-Specific Evaluation → A. Heart transplantation → item 1; PDF p. 34 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-1005",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "application",
    "organ": "liver",
    "stem": "A 9-year-old liver transplant candidate is being evaluated for waitlist priority in the United States. Which allocation score applies to this candidate?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "PELD score",
        "selects": null
      },
      {
        "id": "B",
        "text": "MELD score",
        "selects": null
      },
      {
        "id": "C",
        "text": "Lung Allocation Score (LAS)",
        "selects": null
      },
      {
        "id": "D",
        "text": "KDPI",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "In the U.S. liver allocation system, MELD applies to candidates age 12 years or older, while PELD applies to candidates younger than 12 years.",
    "rationaleIncorrect": {
      "B": "MELD is used for liver candidates who are 12 years of age or older, not for a 9-year-old.",
      "C": "LAS is the lung allocation score, not used for pediatric liver waitlist priority.",
      "D": "KDPI is a kidney donor quality index, not a pediatric liver urgency score."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 1 → Liver evaluation → §6. Organ allocation → b.i (MELD for candidates ≥12 years; PELD for candidates <12 years); PDF p. 45 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-1006",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "general",
    "stem": "During pre-transplant education about transplantation risks, a kidney candidate asks what can happen if rejection is not prevented. Which teaching point is explicitly included in standard risk counseling?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Rejection can occur at any time after implantation of the organ",
        "selects": null
      },
      {
        "id": "B",
        "text": "Rejection occurs only during the first 48 hours after surgery",
        "selects": null
      },
      {
        "id": "C",
        "text": "Rejection is prevented permanently by induction therapy alone",
        "selects": null
      },
      {
        "id": "D",
        "text": "Rejection is limited to cosmetic changes without graft injury",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Transplant risk education includes that the immune system may recognize the graft as foreign and that rejection can occur at any time after implantation, supporting the need for lifelong immunosuppression monitoring.",
    "rationaleIncorrect": {
      "B": "Rejection is not confined to the immediate perioperative window; it can occur long after transplant.",
      "C": "Induction therapy does not eliminate ongoing rejection risk without maintenance immunosuppression.",
      "D": "Rejection threatens graft function and survival, not only cosmetic effects."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §6. Risks associated with transplantation → b. Organ rejection (items i–iii); PDF p. 98 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-1007",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "kidney",
    "stem": "Which CMS Conditions of Participation requirement applies specifically to living donor programs regarding the immediate post-donation period?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Centers must have a live donor postoperative management policy",
        "selects": null
      },
      {
        "id": "B",
        "text": "Centers must guarantee a fixed two-year wage replacement for every donor",
        "selects": null
      },
      {
        "id": "C",
        "text": "Centers may skip psychosocial evaluation if the donor is a family member",
        "selects": null
      },
      {
        "id": "D",
        "text": "Centers must list all living donors on the deceased-donor waiting list",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "CMS living-donor Conditions of Participation require centers to maintain a live donor postoperative management policy as part of regulated living donor care.",
    "rationaleIncorrect": {
      "B": "Financial wage replacement is not the CMS postoperative management policy requirement described in living donor regulations.",
      "C": "Psychosocial evaluation and informed consent remain required; familial relationship does not waive evaluation.",
      "D": "Living donors are not listed as deceased-donor waitlist candidates."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 7 → C. Regulatory oversight of living donor practices → CMS Conditions of Participation → item g.; PDF p. 334 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-1008",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "general",
    "stem": "What is the primary purpose of the independent living donor advocate (ILDA) in U.S. living donor transplantation programs?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Ensure informed consent standards and ethical principles are applied to living donor practice",
        "selects": null
      },
      {
        "id": "B",
        "text": "Select the recipient who will receive the donated organ",
        "selects": null
      },
      {
        "id": "C",
        "text": "Determine OPTN allocation priority for the donor's intended recipient",
        "selects": null
      },
      {
        "id": "D",
        "text": "Authorize immunosuppression dosing for the recipient after transplant",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "The ILDA exists so living donor programs have an independent advocate to ensure informed consent standards are met and ethical principles guide donation decisions.",
    "rationaleIncorrect": {
      "B": "Organ matching and acceptance remain physician and allocation-policy decisions, not the ILDA's primary role.",
      "C": "Waitlist priority is determined by OPTN allocation policy, not the ILDA.",
      "D": "Post-transplant immunosuppression management is a medical team responsibility, not the ILDA role."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 7 → C. Regulatory oversight → ACOT ILDA recommendation; PDF p. 334 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-2001",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "kidney",
    "stem": "During kidney transplant candidate evaluation, which finding is listed as a major contraindication to transplantation?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Untreated current infection",
        "selects": null
      },
      {
        "id": "B",
        "text": "Early referral when glomerular filtration rate is below 30 mL/min",
        "selects": null
      },
      {
        "id": "C",
        "text": "Completion of a smoking cessation program",
        "selects": null
      },
      {
        "id": "D",
        "text": "Well-controlled hypertension on current therapy",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Major contraindications to kidney transplantation include untreated current infection. Active infection must be addressed before proceeding with transplantation.",
    "rationaleIncorrect": {
      "B": "Early referral when approaching advanced chronic kidney disease is encouraged, not contraindicated.",
      "C": "Completion of smoking cessation is a condition that may be required for approval, not a contraindication.",
      "D": "Controlled comorbidities are evaluated individually; untreated infection is explicitly listed as a major contraindication."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 8 → Table 8.1 Major Contraindications to Kidney Transplantation → “Untreated current infection”; PDF p. 227 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-2002",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "liver",
    "stem": "Which cardiac test is included in the standard pre-transplant evaluation workup for adult liver transplant candidates?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Echocardiogram and/or cardiac stress testing",
        "selects": null
      },
      {
        "id": "B",
        "text": "Routine coronary bypass surgery before listing",
        "selects": null
      },
      {
        "id": "C",
        "text": "Cardiac catheterization for every candidate regardless of symptoms",
        "selects": null
      },
      {
        "id": "D",
        "text": "No cardiac assessment unless the candidate has chest pain",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Liver candidate evaluation includes echocardiogram and/or cardiac stress testing (dynamic or nuclear) as part of cardiac assessment before transplant.",
    "rationaleIncorrect": {
      "B": "Surgical coronary revascularization is not a universal listing requirement for all liver candidates.",
      "C": "Catheterization may be used when indicated, but the standard workup lists echocardiogram and/or stress testing—not mandatory catheterization for all.",
      "D": "Cardiac assessment is part of the structured pre-transplant evaluation, not deferred until symptomatic chest pain occurs."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 12 → pretransplant evaluation → §2. Other tests → d. Echocardiogram (ECHO) and/or cardiac stress testing; PDF p. 646 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-2003",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "application",
    "organ": "general",
    "stem": "A candidate is approved for the waiting list with conditions pending further requirements. Which condition aligns with a common program selection practice described in transplant nursing education materials?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Completion of a smoking, drug, and/or alcohol cessation program",
        "selects": null
      },
      {
        "id": "B",
        "text": "Immediate transplantation before psychosocial evaluation",
        "selects": null
      },
      {
        "id": "C",
        "text": "Permanent exclusion from any future transplant consideration",
        "selects": null
      },
      {
        "id": "D",
        "text": "Mandatory identification of a living donor before any listing",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Candidates may be approved with conditions such as completion of smoking, drug, and/or alcohol cessation programs before final listing decisions are implemented.",
    "rationaleIncorrect": {
      "B": "Psychosocial evaluation is part of interdisciplinary selection; transplantation does not proceed before required evaluations.",
      "C": "Conditional approval is not the same as permanent exclusion from transplantation.",
      "D": "Living donor availability is not a universal condition for deceased-donor waitlist activation."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §7. Selection criteria and evaluation outcome → c.ii (approved as a candidate with conditions, including smoking/drug/alcohol cessation); PDF p. 101 (§7 begins PDF p. 100).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-2004",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "kidney",
    "stem": "When a transplant program declines a deceased-donor kidney offer presented through DonorNet, what documentation must be provided to UNOS?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "A reason or refusal code",
        "selects": null
      },
      {
        "id": "B",
        "text": "No documentation when the surgeon verbally declines",
        "selects": null
      },
      {
        "id": "C",
        "text": "Documentation only for accepted offers",
        "selects": null
      },
      {
        "id": "D",
        "text": "A refusal code only when the candidate is permanently inactive",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Whenever a deceased-donor kidney offer is declined, a reason or refusal code must be provided to UNOS even though the accepting physician makes the final decision.",
    "rationaleIncorrect": {
      "B": "Verbal decline without coded documentation does not meet UNOS reporting requirements.",
      "C": "Declined offers require refusal documentation, not only accepted offers.",
      "D": "Refusal codes are required for declined offers regardless of candidate inactive status."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 5 → DonorNet paragraph (“whenever an offer is declined, a reason or ‘refusal code’ must be provided to UNOS”); PDF p. 113 (repo file-page index; printed margin may differ).",
        "url": null
      },
      {
        "citation": "OPTN/UNOS — Policy 18.3: Recording and Reporting the Outcomes of Organ Offers (HRSA).",
        "locator": "OPTN Policy 18.3 — organ-offer refusal reasons reported in DonorNet (read opening section quoting Policy 18.3 and refusal codes).",
        "url": "https://www.hrsa.gov/optn/policies-bylaws/public-comment/project-update-refusal-codes"
      },
      {
        "citation": "OPTN/UNOS — Policies (HRSA).",
        "locator": "Policy 18.3 → Recording and Reporting the Outcomes of Organ Offers (PTR refusal codes for declined organ offers); PDF p. 334 (repo file-page index; printed margin may differ).",
        "url": "https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf#page=334"
      }
    ]
  },
  {
    "id": "cctc-2005",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "A kidney candidate is listed on the UNOS waiting list but marked inactive. Which reason BEST explains inactive status according to standard waitlist management references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Evaluation is incomplete or new issues have developed that may temporarily contraindicate transplantation",
        "selects": null
      },
      {
        "id": "B",
        "text": "The candidate has completed transplantation and is awaiting discharge",
        "selects": null
      },
      {
        "id": "C",
        "text": "Inactive status permanently removes all accumulated waiting time",
        "selects": null
      },
      {
        "id": "D",
        "text": "Inactive listing means the candidate is ineligible for any future activation",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Candidates may be listed inactive when evaluation is incomplete or new issues arise that may be a contraindication to transplantation, often on a presumed temporary basis.",
    "rationaleIncorrect": {
      "B": "Inactive status applies to candidates awaiting transplant, not to recipients who have already been transplanted.",
      "C": "UNOS policy changes have allowed waiting time accrual for some inactive periods; inactive status does not automatically erase all waiting time.",
      "D": "Inactive listing is often temporary while issues are resolved, not a permanent declaration of ineligibility."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 8 → Part II: Management of the Waiting List for a Deceased Donor Kidney Transplant (inactive vs. active candidates); PDF p. 253 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-2006",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "A highly sensitized kidney waitlist candidate is due for routine waitlist management testing. According to common center practice described in pre-transplant references, how often should panel reactive antibody (PRA) testing typically be obtained?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Monthly or more frequently",
        "selects": null
      },
      {
        "id": "B",
        "text": "Once every five years regardless of clinical change",
        "selects": null
      },
      {
        "id": "C",
        "text": "Only at the time of transplant surgery",
        "selects": null
      },
      {
        "id": "D",
        "text": "Never after initial listing",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "For sensitized kidney candidates, references describe monthly or more frequent PRA testing as part of waitlist management and risk monitoring.",
    "rationaleIncorrect": {
      "B": "Sensitized candidates require much more frequent antibody monitoring than every five years.",
      "C": "PRA monitoring occurs during the waiting period, not only intraoperatively.",
      "D": "Ongoing PRA surveillance continues after listing for sensitized candidates."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 1 → kidney waitlist management → §7.c.ii (monthly or more frequent PRAs for sensitized candidates); PDF p. 55 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-2007",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "application",
    "organ": "general",
    "stem": "A liver candidate's MELD score changes after updated labs, affecting waitlist priority. What is the coordinator's responsibility regarding this change?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Educate the candidate about the waitlist status change and rationale for additional testing or procedures",
        "selects": null
      },
      {
        "id": "B",
        "text": "Withhold all waitlist information until the candidate is called in for transplant",
        "selects": null
      },
      {
        "id": "C",
        "text": "Remove the candidate from the list without team discussion",
        "selects": null
      },
      {
        "id": "D",
        "text": "Delegate all waitlist communication to the dialysis unit without transplant team involvement",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Waitlist management references assign coordinators responsibility to educate candidates about changes in waitlist status and the rationale for additional tests or procedures.",
    "rationaleIncorrect": {
      "B": "Candidates should receive education about waitlist status changes rather than being kept uninformed.",
      "C": "Listing changes require interdisciplinary team processes, not unilateral coordinator removal.",
      "D": "Transplant coordinators remain responsible for waitlist education even when dialysis centers participate in care."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §9. Waitlist management → coordinator responsibilities → item iv.; PDF p. 102 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-2008",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "heart",
    "stem": "During pre-operative coordination for an adult heart transplant, which test is listed among typical preoperative requirements before surgery?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Chest radiograph",
        "selects": null
      },
      {
        "id": "B",
        "text": "Routine elective coronary bypass for all candidates",
        "selects": null
      },
      {
        "id": "C",
        "text": "Lung allocation score calculation",
        "selects": null
      },
      {
        "id": "D",
        "text": "PELD score update",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Typical preoperative protocols include obtaining a chest radiograph along with laboratory tests and other required studies before transplant surgery.",
    "rationaleIncorrect": {
      "B": "Coronary bypass is not a universal preoperative requirement for every heart candidate.",
      "C": "LAS applies to lung allocation, not standard heart preoperative protocols.",
      "D": "PELD applies to pediatric liver allocation, not heart preoperative coordination."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 9 → Preparation of Patient for Surgery → A. Obtain preoperative tests → item 1 (chest radiograph); PDF p. 410 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-3001",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "A kidney recipient two months post-transplant feels well but serial labs show a rising serum creatinine without fever, graft pain, or urinary symptoms. Which presentation is MOST consistent with this pattern?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Acute rejection presenting as asymptomatic renal dysfunction",
        "selects": null
      },
      {
        "id": "B",
        "text": "Expected immediate postoperative diuresis",
        "selects": null
      },
      {
        "id": "C",
        "text": "Normal trough variability requiring no clinical follow-up",
        "selects": null
      },
      {
        "id": "D",
        "text": "Rejection that always presents with fever and graft tenderness",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Acute rejection episodes most commonly present as an asymptomatic rise in serum creatinine or failure of creatinine to fall. Classic fever, malaise, and graft tenderness are seen less frequently with modern immunosuppression.",
    "rationaleIncorrect": {
      "B": "Postoperative diuresis is an early operative phenomenon, not a pattern at two months with rising creatinine.",
      "C": "A rising creatinine warrants clinical evaluation; it is not assumed to be benign trough variability.",
      "D": "Fever and graft tenderness are classic but now less common presentations; asymptomatic creatinine rise is the typical pattern."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 10 → Clinical Manifestations of Acute Rejection; PDF p. 288 (repo file-page index; printed margin may differ).",
        "url": null
      },
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §h. Communication with the transplant team → iii. Urgent matters (signs and symptoms of rejection); PDF p. 111.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-3002",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "liver",
    "stem": "A liver recipient three weeks post-transplant reports oral white patches and increasing fatigue. Based on standard teaching about when to contact the transplant team, what is the MOST appropriate coordinator instruction?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Contact the transplant team promptly because possible infection symptoms are urgent matters",
        "selects": null
      },
      {
        "id": "B",
        "text": "Treat this as a non-urgent matter to discuss at the next medication refill request",
        "selects": null
      },
      {
        "id": "C",
        "text": "Stop all immunosuppression until symptoms resolve",
        "selects": null
      },
      {
        "id": "D",
        "text": "Defer contact until temperature exceeds 40°C (104°F)",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Signs and symptoms of infection are listed as urgent reasons to contact the transplant team. Coordinators instruct recipients to reach the team promptly rather than defer concerning symptoms.",
    "rationaleIncorrect": {
      "B": "Non-urgent matters include appointment verification and general diet questions—not new symptoms suggesting infection.",
      "C": "Recipients should not independently stop immunosuppression; infection evaluation requires coordinated management.",
      "D": "Urgent contact is indicated for infection symptoms without waiting for extreme fever thresholds."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §h. Communication with the transplant team → iii. Urgent matters (signs and symptoms of infection); PDF p. 111.",
        "url": null
      },
      {
        "citation": "Transplantation Nursing Secrets (Cupples & Ohler, eds., 2003).",
        "locator": "Ch. 25, Patient Education — table “Topics for Discharge Education”, item 4 “Signs and symptoms of infection”; PDF p. 320.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-3003",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "A kidney recipient maintained on cyclosporine is prescribed clarithromycin for a respiratory infection. Based on the documented drug interaction profile, what should the coordinator anticipate?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Increased cyclosporine blood levels from CYP3A4 inhibition",
        "selects": null
      },
      {
        "id": "B",
        "text": "Decreased cyclosporine levels from CYP3A4 induction",
        "selects": null
      },
      {
        "id": "C",
        "text": "No interaction because macrolides do not affect calcineurin inhibitors",
        "selects": null
      },
      {
        "id": "D",
        "text": "Mandatory independent discontinuation of cyclosporine by the patient",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Strong CYP3A4 inhibitors such as clarithromycin may increase cyclosporine concentration and effect. The team should anticipate closer drug-level monitoring and possible dose adjustment.",
    "rationaleIncorrect": {
      "B": "CYP3A4 inducers lower calcineurin inhibitor levels; clarithromycin is an inhibitor, not an inducer.",
      "C": "The cyclosporine monograph explicitly lists clarithromycin among strong CYP3A4 inhibitors that raise levels.",
      "D": "Medication changes require physician-directed management, not independent discontinuation by the recipient."
    },
    "references": [
      {
        "citation": "Saunders Nursing Drug Handbook 2024 (Wolters Kluwer; ABTC handbook lists 2020 ed.).",
        "locator": "cycloSPORINE monograph → INTERACTIONS → strong CYP3A4 inhibitors (e.g., clarithromycin); PDF p. 841 (monograph begins p. 840).",
        "url": null
      },
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → medication education → Right way → drug–drug and drug–food interactions; PDF p. 108.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-3004",
    "type": "complex_combo",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "analysis",
    "organ": "kidney",
    "stem": "A kidney recipient in the first three months post-transplant has graft dysfunction. Evaluate the following statements about differential diagnosis and presentation:",
    "elements": [
      {
        "id": "I",
        "text": "Fever with graft tenderness may reflect acute rejection or pyelonephritis."
      },
      {
        "id": "II",
        "text": "Calcineurin inhibitor toxicity commonly presents with graft tenderness."
      },
      {
        "id": "III",
        "text": "Acute rejection often presents as an asymptomatic rise in serum creatinine."
      },
      {
        "id": "IV",
        "text": "Oliguria makes calcineurin inhibitor toxicity a less likely sole explanation."
      }
    ],
    "options": [
      {
        "id": "A",
        "text": "I and II only",
        "selects": [
          "I",
          "II"
        ]
      },
      {
        "id": "B",
        "text": "I, III, and IV only",
        "selects": [
          "I",
          "III",
          "IV"
        ]
      },
      {
        "id": "C",
        "text": "II and III only",
        "selects": [
          "II",
          "III"
        ]
      },
      {
        "id": "D",
        "text": "I, II, III, and IV",
        "selects": [
          "I",
          "II",
          "III",
          "IV"
        ]
      }
    ],
    "correct": "B",
    "rationaleCorrect": "A tender graft with fever and rising creatinine may reflect rejection or pyelonephritis. Rejection commonly presents with asymptomatic creatinine rise, while CNI toxicity does not produce graft tenderness. Oliguria shifts the differential away from isolated drug toxicity toward anatomical or severe rejection causes.",
    "rationaleIncorrect": {
      "A": "Statement II is incorrect—CNI toxicity does not produce graft tenderness.",
      "C": "Statement II is incorrect even though III is correct.",
      "D": "Statement II is incorrect; not all four statements are true."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 10 → Clinical Manifestations of Acute Rejection (statements III–IV and negation of II); PDF p. 288.",
        "url": null
      },
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 9 → SURGICAL COMPLICATIONS OF KIDNEY TRANSPLANTATION opening paragraph (statement I: fever and graft tenderness); PDF p. 266.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-3005",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "recall",
    "organ": "general",
    "stem": "A coordinator is reviewing national outcome tracking for transplant programs. According to standard references on OPTN data flow, clinical data submitted by transplant centers are aggregated into which national registry?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Scientific Registry of Transplant Recipients (SRTR)",
        "selects": null
      },
      {
        "id": "B",
        "text": "Centers for Medicare & Medicaid Services Physician Fee Schedule",
        "selects": null
      },
      {
        "id": "C",
        "text": "FDA MedWatch adverse event database only",
        "selects": null
      },
      {
        "id": "D",
        "text": "National Marrow Donor Program registry",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "The SRTR contains current and past information about the full continuum of transplant activity. Data are collected by the OPTN from hospitals and OPOs and used for policy development, program analysis, and outcome reporting.",
    "rationaleIncorrect": {
      "B": "CMS fee schedules govern reimbursement, not the national transplant outcomes registry described in OPTN/SRTR references.",
      "C": "FDA MedWatch is a drug and device adverse-event system, not the primary national transplant outcomes registry.",
      "D": "The National Marrow Donor Program registry supports hematopoietic cell transplantation, not the solid-organ SRTR database."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 5 → Scientific Registry of Transplant Recipients (SRTR) subsection; PDF p. 113 (repo file-page index; printed margin may differ).",
        "url": null
      },
      {
        "citation": "Scientific Registry of Transplant Recipients (SRTR).",
        "locator": "About the SRTR page — describes the national transplant statistics registry (corroborates registry name in the answer).",
        "url": "https://www.srtr.org/about-the-registry/"
      }
    ]
  },
  {
    "id": "cctc-3006",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "recall",
    "organ": "kidney",
    "stem": "When counseling a kidney recipient about long-term risks of maintenance immunosuppression, which complication pair is emphasized in transplant pharmacology references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Opportunistic infection and malignancy",
        "selects": null
      },
      {
        "id": "B",
        "text": "Acute hyperkalemia and iron overload only",
        "selects": null
      },
      {
        "id": "C",
        "text": "Immediate primary nonfunction at two years post-transplant",
        "selects": null
      },
      {
        "id": "D",
        "text": "Permanent resolution of all pre-transplant allergies",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Long-term immunosuppression references emphasize opportunistic infection and malignancy among the most significant feared complications of prolonged therapy.",
    "rationaleIncorrect": {
      "B": "Electrolyte and iron issues are not the primary long-term immunosuppression complication pair cited in these references.",
      "C": "Primary nonfunction is an early graft event, not the described long-term immunosuppression risk pairing.",
      "D": "Immunosuppression does not permanently cure pre-transplant allergic disease."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 6 → Immunosuppressive Medications (long-term side effects: infection and malignancy); PDF p. 168 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-3007",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "A kidney recipient is eight months post-transplant with stable graft function. According to long-term follow-up references, what clinic visit interval is generally recommended through the end of the first post-transplant year?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Monthly visits",
        "selects": null
      },
      {
        "id": "B",
        "text": "One visit every two years",
        "selects": null
      },
      {
        "id": "C",
        "text": "Visits only when the recipient feels ill",
        "selects": null
      },
      {
        "id": "D",
        "text": "No transplant center follow-up after month three",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Follow-up references recommend transitioning to monthly clinic visits by six months post-transplant and maintaining that monthly schedule through the end of the first year for functioning grafts.",
    "rationaleIncorrect": {
      "B": "Biennial visits are far less frequent than the recommended first-year schedule.",
      "C": "Scheduled surveillance continues even when the recipient feels well.",
      "D": "Transplant center follow-up continues throughout the first year and beyond."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 11 → follow-up visit frequency (monthly through end of first year); PDF p. 302 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-3008",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "general",
    "stem": "A kidney recipient on discharge calls because they vomited and could not take their evening immunosuppression dose. Which instruction aligns with standard medication education?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "They should understand what to do if they miss a dose or cannot take medication due to nausea or vomiting",
        "selects": null
      },
      {
        "id": "B",
        "text": "They should permanently stop all immunosuppression after one missed dose",
        "selects": null
      },
      {
        "id": "C",
        "text": "They should double the next dose without contacting the team",
        "selects": null
      },
      {
        "id": "D",
        "text": "They should wait one week before reporting missed doses",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Discharge medication education includes teaching recipients what to do if they miss a dose or cannot take medication because of nausea, vomiting, or prolonged diarrhea.",
    "rationaleIncorrect": {
      "B": "Recipients should not independently discontinue immunosuppression after vomiting; they need team guidance.",
      "C": "Dose adjustments require coordinated medical direction, not automatic doubling.",
      "D": "Missed doses during illness require timely team contact, not delayed reporting."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → medication education (missed dose / nausea / vomiting instructions); PDF p. 107 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  }
];

// --- SCENARIOS (clinical vignette companions) ---
const SCENARIOS = [
  {
    "id": "cctc-6001",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "general",
    "stem": "You are the transplant coordinator covering the afternoon clinic line. A 52-year-old kidney recipient discharged six weeks ago calls from work. He feels well, takes medications on schedule, and reports no fever, pain, or urinary changes. He only wants to confirm whether his follow-up visit is next Tuesday at 10 a.m. as discussed at discharge. The on-call surgeon asks you to document how this contact should be triaged. How should this contact be categorized?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "An urgent matter requiring immediate after-hours contact",
        "selects": null
      },
      {
        "id": "B",
        "text": "A non-urgent matter such as appointment verification",
        "selects": null
      },
      {
        "id": "C",
        "text": "An emergency that requires activating local EMS before notifying the team",
        "selects": null
      },
      {
        "id": "D",
        "text": "A matter that should wait until the next unscheduled clinic visit",
        "selects": null
      }
    ],
    "correct": "B",
    "rationaleCorrect": "Verification of appointment date and time is explicitly listed as a non-urgent reason to contact the transplant team. Coordinators teach recipients to distinguish routine questions from urgent clinical changes.",
    "rationaleIncorrect": {
      "A": "Urgent matters include infection symptoms, rejection signs, wound drainage, chest pain, shortness of breath, bleeding, and stroke symptoms—not routine scheduling questions.",
      "C": "Routine appointment confirmation does not constitute a local EMS emergency.",
      "D": "Non-urgent matters are still appropriate to address through normal team communication channels rather than deferred indefinitely."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §h. Communication with the transplant team → ii. Non-urgent matters / iii. Urgent matters; PDF p. 111 (repo file-page index; printed margin may differ).",
        "url": null
      },
      {
        "citation": "Transplantation Nursing Secrets (Cupples & Ohler, eds., 2003).",
        "locator": "Ch. 25, Patient Education — table “Topics for Candidate Education Programs During the Waiting Period”, item 12 “When to call the coordinator after transplantation”; PDF p. 319.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6002",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "application",
    "organ": "general",
    "stem": "You are counseling a 45-year-old woman listed for liver transplantation at your center. She completed psychosocial evaluation and asks why her workup includes hepatology-specific imaging and pulmonary studies that her friend undergoing kidney evaluation did not receive. She wonders whether one standard test battery could apply to every organ. Her friend received a different protocol at another program. Which explanation BEST aligns with standard evaluation education?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Transplant programs define organ-specific protocols to validate end-organ disease and overall health for safe transplantation",
        "selects": null
      },
      {
        "id": "B",
        "text": "Every candidate receives identical testing regardless of organ or comorbidities",
        "selects": null
      },
      {
        "id": "C",
        "text": "Diagnostic testing is optional once psychosocial evaluation is complete",
        "selects": null
      },
      {
        "id": "D",
        "text": "Only blood type testing is required before listing",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Evaluation education explains that transplant programs define organ-specific diagnostic protocols to confirm end-organ disease and determine whether the patient can safely undergo transplantation.",
    "rationaleIncorrect": {
      "B": "References describe individualized, organ-specific evaluation protocols rather than one identical test panel for all candidates.",
      "C": "Diagnostic testing is a required component of evaluation, not replaced by psychosocial assessment alone.",
      "D": "Listing requires comprehensive evaluation beyond blood type alone."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → evaluation process → c. Diagnostic testing → i. (organ-specific protocols); PDF p. 97 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6003",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "application",
    "organ": "liver",
    "stem": "You are the pretransplant coordinator for a 58-year-old man with decompensated cirrhosis listed for liver transplant. He smokes half a pack daily despite counseling and wants to know why smoking matters beyond cardiovascular disease risk. He has no prior graft but asks whether tobacco affects liver transplant outcomes specifically. Pulmonary evaluation noted mild obstructive disease. Which liver-related complication should education include?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Increased incidence of hepatic artery thrombosis",
        "selects": null
      },
      {
        "id": "B",
        "text": "Elimination of all cardiovascular mortality risk after transplant",
        "selects": null
      },
      {
        "id": "C",
        "text": "Guaranteed protection against biliary complications",
        "selects": null
      },
      {
        "id": "D",
        "text": "No association between smoking and liver graft vascular complications",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Cigarette smoking in liver transplant recipients has been implicated in cardiovascular mortality and an increased incidence of hepatic artery thrombosis.",
    "rationaleIncorrect": {
      "B": "Smoking increases cardiovascular mortality risk rather than eliminating it.",
      "C": "Smoking does not protect against biliary or vascular complications.",
      "D": "Smoking is specifically associated with hepatic artery thrombosis among liver recipients."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 1 → J. Consultations → 2. Pulmonary evaluation → d. Effects of smoking in specific transplant populations → e.ii. (liver cardiovascular mortality and hepatic artery thrombosis); PDF p. 33 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6004",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "application",
    "organ": "general",
    "stem": "You are teaching the parents of a 6-year-old who received a deceased-donor kidney transplant two weeks ago. The child was discharged on high-dose induction therapy and the family is planning a return to daycare. Grandparents ask whether common childhood illnesses will behave the same as before transplant. The child currently has no fever or respiratory symptoms. Which teaching point aligns with standard infection-prevention references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Community-acquired infections can be more severe in young children, especially soon after transplant during heavy immunosuppression",
        "selects": null
      },
      {
        "id": "B",
        "text": "Community infections are always mild in children regardless of immunosuppression timing",
        "selects": null
      },
      {
        "id": "C",
        "text": "Pediatric recipients have no risk of influenza or respiratory syncytial virus after transplant",
        "selects": null
      },
      {
        "id": "D",
        "text": "Immunosuppression eliminates the need to evaluate fever in pediatric recipients",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Community-acquired infections can be more severe in young children, especially if they occur soon after transplantation and during highly immunosuppressed periods.",
    "rationaleIncorrect": {
      "B": "Severity risk is heightened in young children during early highly immunosuppressed periods rather than being uniformly mild.",
      "C": "Pediatric recipients remain at risk for common childhood illnesses including influenza and respiratory syncytial virus.",
      "D": "Fever evaluation remains important; immunosuppression increases rather than eliminates infection concern."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 17 → H. Community-acquired infections → 1. (more severe in young children soon after transplant during heavy immunosuppression); PDF p. 944 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6005",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "general",
    "stem": "You are facilitating living kidney donor evaluation for a 34-year-old sister donating to her brother. During the independent donor advocate session, she asks whether she can receive travel reimbursement from the recipient's employer. The surgeon wants confirmation that federal legal boundaries were reviewed before consent. Which legal counseling point must the coordinator include per standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "It is a federal crime to offer to donate any human organ for anything of value",
        "selects": null
      },
      {
        "id": "B",
        "text": "Financial compensation for organ donation is legally encouraged",
        "selects": null
      },
      {
        "id": "C",
        "text": "Only state law, not federal law, governs organ sales",
        "selects": null
      },
      {
        "id": "D",
        "text": "Vacation packages may be exchanged for organ donation without restriction",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Living donor education must confirm that the donor understands it is a federal crime to offer to donate any human organ for anything of value, including cash, property, and vacations.",
    "rationaleIncorrect": {
      "B": "Federal law prohibits organ sales and inducements rather than encouraging compensation.",
      "C": "Federal law specifically prohibits offering organs for valuable consideration.",
      "D": "Vacations and other items of value are explicitly named as prohibited inducements."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 7 → F. Elements Included in Education and Informed Consent → 1.d. (federal crime to offer organ for anything of value); PDF p. 340 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6006",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "application",
    "organ": "general",
    "stem": "You are reviewing home infection precautions with a 41-year-old heart recipient three weeks post-transplant. She lives alone with an indoor cat and no one else can manage litter duties indefinitely. She feels well and asks what protection is needed if she must clean the litter box herself. She already uses hand hygiene after gardening. Which teaching point aligns with standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Wear disposable gloves and a surgical mask if handling cat litter is unavoidable",
        "selects": null
      },
      {
        "id": "B",
        "text": "No precautions are needed because household pets are always sterile",
        "selects": null
      },
      {
        "id": "C",
        "text": "Recipients should handle all animal feces without gloves to build immunity",
        "selects": null
      },
      {
        "id": "D",
        "text": "Cat litter exposure is encouraged immediately after transplant to reduce stress",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Animal-safety teaching advises avoiding handling fecal matter especially cat litter where bacteria may become airborne; if unavoidable, the recipient should wear disposable gloves and a surgical mask.",
    "rationaleIncorrect": {
      "B": "Pet-related exposures can transmit infection; precautions are recommended.",
      "C": "Handling fecal matter without protection increases infection risk in immunosuppressed recipients.",
      "D": "Cat litter handling is avoided when possible rather than encouraged early post-transplant."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → infection prevention → v. Animal safety (gloves and mask if cat litter handling unavoidable); PDF p. 116 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6007",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "recall",
    "organ": "general",
    "stem": "You are conducting a post-transplant education class for adult recipients and caregivers. A kidney recipient notes a local news report about a regional foodborne illness outbreak linked to deli meat. She asks how immunosuppressed patients should respond to community alerts beyond routine kitchen hygiene. She is six months post-transplant and otherwise well. Which community-surveillance step aligns with standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Monitor local reports of foodborne illness outbreaks",
        "selects": null
      },
      {
        "id": "B",
        "text": "Ignore local outbreak reports because immunosuppression prevents foodborne illness",
        "selects": null
      },
      {
        "id": "C",
        "text": "Foodborne outbreak monitoring applies only before transplantation",
        "selects": null
      },
      {
        "id": "D",
        "text": "Recipients should seek out foods linked to active outbreaks",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Dietary infection-prevention teaching includes monitoring local reports of foodborne illness outbreaks along with safe food-handling practices.",
    "rationaleIncorrect": {
      "B": "Immunosuppressed recipients remain at increased foodborne infection risk and should monitor outbreak reports.",
      "C": "Outbreak monitoring continues as part of post-transplant dietary teaching.",
      "D": "Recipients should avoid foods linked to outbreaks rather than seeking them out."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → e. Infection prevention → iii. Dietary precautions (monitor local foodborne illness outbreaks); PDF p. 116 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6008",
    "type": "one_best",
    "domain": 1,
    "domainName": "Transplant Education",
    "domainShort": "Education",
    "cognitive": "application",
    "organ": "general",
    "stem": "You are counseling a 63-year-old lung recipient who frequently babysits twin grandchildren. The grandchildren received a live-virus rotavirus vaccine last week per their pediatrician. The recipient helps with diaper changes and wants to know whether routine grandparent duties are safe. He has no current illness and takes standard maintenance immunosuppression. Which teaching point aligns with standard infection-prevention references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Avoid changing diapers of children who were recently vaccinated with live-virus vaccines",
        "selects": null
      },
      {
        "id": "B",
        "text": "Live-vaccine shedding never occurs after pediatric vaccination",
        "selects": null
      },
      {
        "id": "C",
        "text": "Diaper changes are unrestricted regardless of recent vaccinations",
        "selects": null
      },
      {
        "id": "D",
        "text": "Only hospital staff may change diapers for vaccinated children",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Infection-prevention teaching includes avoiding changing diapers of children who were recently vaccinated, because shedding after live-virus vaccines may continue for days, weeks, or months.",
    "rationaleIncorrect": {
      "B": "Shedding after live-virus vaccination may persist for a variable period depending on vaccine and host factors.",
      "C": "Recent live-vaccine exposure warrants precautions including avoiding diaper changes when possible.",
      "D": "Household caregivers are taught these precautions rather than deferring all diaper care to hospital staff."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → e. Infection prevention → vi. Others (avoid diaper changes for recently live-vaccinated children); PDF p. 117 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6011",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "kidney",
    "stem": "You are chairing multidisciplinary selection conference for a 48-year-old man with end-stage kidney disease from diabetic nephropathy. He was hospitalized last week for cellulitis of the left leg that is still receiving IV antibiotics. Cardiology cleared him, but infectious diseases notes cultures remain positive today. The surgeon asks whether listing can proceed. Which finding is listed as a major contraindication to transplantation?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Untreated current infection",
        "selects": null
      },
      {
        "id": "B",
        "text": "Early referral when glomerular filtration rate is below 30 mL/min",
        "selects": null
      },
      {
        "id": "C",
        "text": "Completion of a smoking cessation program",
        "selects": null
      },
      {
        "id": "D",
        "text": "Well-controlled hypertension on current therapy",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Major contraindications to kidney transplantation include untreated current infection. Active infection must be addressed before proceeding with transplantation.",
    "rationaleIncorrect": {
      "B": "Early referral when approaching advanced chronic kidney disease is encouraged, not contraindicated.",
      "C": "Completion of smoking cessation is a condition that may be required for approval, not a contraindication.",
      "D": "Controlled comorbidities are evaluated individually; untreated infection is explicitly listed as a major contraindication."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 8 → Table 8.1 Major Contraindications to Kidney Transplantation → “Untreated current infection”; PDF p. 227 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6012",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "You are the on-call kidney coordinator at 2 a.m. when DonorNet generates an offer for your listed candidate. The donor is labeled Public Health Service increased-risk due to injection-drug history. The candidate is medically ready and has been waiting 18 months. Your attending asks what must occur before acceptance and OR booking. What must occur before transplantation proceeds?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "The patient is notified at the time of the organ offer and must consent to proceed",
        "selects": null
      },
      {
        "id": "B",
        "text": "The center may proceed without notifying the candidate because PHS status is confidential",
        "selects": null
      },
      {
        "id": "C",
        "text": "The candidate is automatically removed from the waitlist if PHS risk is identified",
        "selects": null
      },
      {
        "id": "D",
        "text": "PHS increased-risk designation eliminates the need for any organ-offer discussion",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "When a donor is identified as a PHS increased-risk donor, the patient is notified at the time of the organ offer and must consent before proceeding; refusal does not affect waitlist status.",
    "rationaleIncorrect": {
      "B": "PHS increased-risk status requires candidate notification and consent at offer time.",
      "C": "Candidates may refuse PHS-risk organs without losing waitlist standing.",
      "D": "PHS designation requires explicit offer-time disclosure and consent, not silent proceeding."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §8. Organ allocation → g. (PHS increased-risk donor notification and consent); PDF p. 101 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6013",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "heart",
    "stem": "You are updating a heart candidate who developed an active nontuberculous mycobacterial infection requiring prolonged therapy. The cardiologist placed him on inactive status yesterday while treatment continues. His family worries that waiting time will continue accruing during inactivity as it would for kidney candidates. You need to explain OPTN allocation rules accurately. According to OPTN Policy 3.6.A, how does waiting time accrue during inactivity?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "No waiting time accrues while the candidate remains inactive",
        "selects": null
      },
      {
        "id": "B",
        "text": "Unlimited waiting time accrues, as for kidney candidates",
        "selects": null
      },
      {
        "id": "C",
        "text": "Waiting time accrues only for the first 30 cumulative inactive days",
        "selects": null
      },
      {
        "id": "D",
        "text": "Waiting time doubles each week the candidate remains inactive",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "OPTN Table 3-3 specifies that heart candidates accrue no waiting time while inactive, unlike kidney candidates who accrue unlimited inactive waiting time.",
    "rationaleIncorrect": {
      "B": "Unlimited inactive accrual applies to kidney candidates, not heart candidates.",
      "C": "A 30-day cumulative inactive accrual limit applies to intestine candidates, not heart candidates.",
      "D": "Heart inactive waiting time does not double weekly; it does not accrue at all."
    },
    "references": [
      {
        "citation": "OPTN/UNOS — Policies (HRSA).",
        "locator": "Policy 3.6.A → Table 3-3: Waiting Time for Inactive Candidates (heart candidates accrue no waiting time while inactive); PDF p. 47 (repo file-page index; printed margin may differ).",
        "url": "https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf#page=47"
      }
    ]
  },
  {
    "id": "cctc-6014",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "kidney_pancreas",
    "stem": "You are educating a 39-year-old woman with type 1 diabetes and stage 4 CKD referred for combined organ transplant evaluation. She understands she needs a kidney but asks why pancreas transplantation might be offered simultaneously rather than kidney alone. Her nephrologist documented progressive renal insufficiency and brittle glycemic control. Which indication aligns with standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Diabetes or pancreatic exocrine insufficiency with renal insufficiency",
        "selects": null
      },
      {
        "id": "B",
        "text": "Isolated type 2 diabetes without any renal disease",
        "selects": null
      },
      {
        "id": "C",
        "text": "Renal insufficiency without any metabolic or pancreatic disorder",
        "selects": null
      },
      {
        "id": "D",
        "text": "SPK is indicated only when the candidate no longer requires insulin",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Simultaneous pancreas-kidney transplantation is indicated for diagnosis of diabetes or pancreatic exocrine insufficiency with renal insufficiency.",
    "rationaleIncorrect": {
      "B": "Type 2 diabetes accounts for a small minority of pancreas transplants; SPK pairs pancreatic and renal failure indications.",
      "C": "SPK addresses combined pancreatic/metabolic and renal insufficiency rather than isolated renal disease alone.",
      "D": "Insulin-treated diabetes with metabolic complications is typical of pancreas transplant populations rather than an exclusion."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 15 → Indications → B. Simultaneous pancreas-kidney → 1. (diabetes or exocrine insufficiency with renal insufficiency); PDF p. 825 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6015",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "general",
    "stem": "You are assembling documentation for an OPTN waiting-time modification application under Policy 3.7.A. A lung candidate's original listing date was delayed because of a data-entry error discovered after activation. The program director requests the compliance checklist before UNOS submission. Which required element must be included in the submission?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "The name and signature of the candidate's physician or surgeon",
        "selects": null
      },
      {
        "id": "B",
        "text": "Only the candidate's personal social media history",
        "selects": null
      },
      {
        "id": "C",
        "text": "A guarantee of organ offer within 30 days",
        "selects": null
      },
      {
        "id": "D",
        "text": "Proof that the candidate has never been listed before",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Waiting-time modification applications must include the requested listing date with documentation, evidence the candidate qualified under organ-specific OPTN policies, a corrective action plan if due to error, and the physician or surgeon name and signature.",
    "rationaleIncorrect": {
      "B": "Applications require clinical and listing documentation rather than social media history.",
      "C": "OPTN modification applications do not guarantee organ offers within a fixed interval.",
      "D": "Prior listing history is addressed through documentation of requested listing date and qualification, not a blanket never-listed requirement."
    },
    "references": [
      {
        "citation": "OPTN/UNOS — Policies (HRSA).",
        "locator": "Policy 3.7.A → Applications for Modifications of Waiting Time (physician/surgeon name and signature among required elements); PDF p. 50 (repo file-page index; printed margin may differ).",
        "url": "https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf#page=50"
      }
    ]
  },
  {
    "id": "cctc-6016",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "application",
    "organ": "general",
    "stem": "You are teaching pretransplant infection and malignancy risks to a newly listed kidney candidate. He reports two weeks of low-grade fevers, drenching night sweats, and cervical lymphadenopathy after finishing lymphocyte-depleting therapy during a prior hospitalization elsewhere. He has not yet received a transplant. Which clinical presentation should the coordinator associate with posttransplant lymphoproliferative disease (PTLD)?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Fever, night sweats, lymphadenopathy, or symptoms resembling infectious mononucleosis",
        "selects": null
      },
      {
        "id": "B",
        "text": "Isolated acute graft tenderness without any systemic symptoms in every case",
        "selects": null
      },
      {
        "id": "C",
        "text": "PTLD always presents with obvious skin rash and never with fever",
        "selects": null
      },
      {
        "id": "D",
        "text": "PTLD cannot involve the gastrointestinal tract or lungs",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "PTLD may present with symptoms resembling infectious mononucleosis, fever, night sweats, lymphadenopathy, weight loss, diarrhea, abdominal pain, or pulmonary lesions.",
    "rationaleIncorrect": {
      "B": "PTLD may be asymptomatic or present with systemic symptoms rather than isolated graft tenderness alone.",
      "C": "Fever and mononucleosis-like symptoms are described presentations.",
      "D": "PTLD may involve the gastrointestinal tract, lung, kidney, or other sites."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 6 → PTLD → 3. Clinical presentation (mono-like symptoms, fever, lymphadenopathy); PDF p. 281 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6017",
    "type": "one_best",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "recall",
    "organ": "general",
    "stem": "During evaluation education, a liver candidate's spouse asks whether PTLD would necessarily stay confined to the transplanted liver if it occurred later. The candidate is EBV-seronegative and will receive lymphocyte-depleting induction. You are clarifying typical organ-involvement patterns from standard references. Which organ-involvement pattern aligns with standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "The disease may involve single or multiple organs",
        "selects": null
      },
      {
        "id": "B",
        "text": "PTLD is limited to the transplanted allograft only",
        "selects": null
      },
      {
        "id": "C",
        "text": "Multiorgan involvement never occurs in PTLD",
        "selects": null
      },
      {
        "id": "D",
        "text": "PTLD involves skin only and never visceral sites",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "PTLD may involve single or multiple organs and is often extranodal, with involvement of sites such as the gastrointestinal tract, lung, or kidney.",
    "rationaleIncorrect": {
      "B": "PTLD may involve organs beyond the allograft, including extranodal sites.",
      "C": "Single or multiple organ involvement is specifically described.",
      "D": "Visceral and extranodal involvement such as GI tract, lung, or kidney may occur."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 6 → PTLD → 1.d. (may involve single or multiple organs); PDF p. 281 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6018",
    "type": "complex_combo",
    "domain": 2,
    "domainName": "Pre-Transplant Evaluation & Management",
    "domainShort": "Pre-transplant",
    "cognitive": "analysis",
    "organ": "general",
    "stem": "Your transplant program is refreshing evaluation-team education after a delayed PTLD diagnosis in a recent recipient. The quality council wants a short competency check covering organ involvement and variable presentations coordinators should recognize. Material must align with standard PTLD epidemiology and clinical presentation teaching. Evaluate the following statements:",
    "elements": [
      {
        "id": "I",
        "text": "PTLD may involve single or multiple organs."
      },
      {
        "id": "II",
        "text": "Tonsillitis may be part of PTLD clinical presentation."
      },
      {
        "id": "III",
        "text": "Weight loss is never associated with PTLD."
      },
      {
        "id": "IV",
        "text": "Lung lesion or visceral mass may occur with PTLD."
      }
    ],
    "options": [
      {
        "id": "A",
        "text": "I and II only",
        "selects": [
          "I",
          "II"
        ]
      },
      {
        "id": "B",
        "text": "I, II, and IV only",
        "selects": [
          "I",
          "II",
          "IV"
        ]
      },
      {
        "id": "C",
        "text": "II, III, and IV only",
        "selects": [
          "II",
          "III",
          "IV"
        ]
      },
      {
        "id": "D",
        "text": "I, II, III, and IV",
        "selects": [
          "I",
          "II",
          "III",
          "IV"
        ]
      }
    ],
    "correct": "B",
    "rationaleCorrect": "Single or multiple organ involvement, tonsillitis, and lung or visceral masses are cited PTLD features. Statement III is false because weight loss is listed among clinical presentations.",
    "rationaleIncorrect": {
      "A": "Statement IV is also true—lung lesion or visceral mass may occur.",
      "C": "Statement I is also true; statement III is false.",
      "D": "Statement III is false because weight loss is among listed PTLD symptoms."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 6 → PTLD → 1.d. and 3.e., i., k. (organ involvement, tonsillitis, weight loss, lung/visceral mass); PDF p. 281 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6021",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "You are reviewing clinic labs for a 44-year-old kidney recipient at eight weeks post-transplant. He denies fever, graft tenderness, dysuria, or weight change and appears comfortable today. Serial creatinine has risen from 1.4 to 1.9 mg/dL over ten days while tacrolimus troughs remain in range. The nurse asks you to prioritize the most likely explanation before additional workup. Which presentation is MOST consistent with this pattern?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Acute rejection presenting as asymptomatic renal dysfunction",
        "selects": null
      },
      {
        "id": "B",
        "text": "Expected immediate postoperative diuresis",
        "selects": null
      },
      {
        "id": "C",
        "text": "Normal trough variability requiring no clinical follow-up",
        "selects": null
      },
      {
        "id": "D",
        "text": "Rejection that always presents with fever and graft tenderness",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Acute rejection episodes most commonly present as an asymptomatic rise in serum creatinine or failure of creatinine to fall. Classic fever, malaise, and graft tenderness are seen less frequently with modern immunosuppression.",
    "rationaleIncorrect": {
      "B": "Postoperative diuresis is an early operative phenomenon, not a pattern at two months with rising creatinine.",
      "C": "A rising creatinine warrants clinical evaluation; it is not assumed to be benign trough variability.",
      "D": "Fever and graft tenderness are classic but now less common presentations; asymptomatic creatinine rise is the typical pattern."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 10 → Clinical Manifestations of Acute Rejection; PDF p. 288 (repo file-page index; printed margin may differ).",
        "url": null
      },
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → §h. Communication with the transplant team → iii. Urgent matters (signs and symptoms of rejection); PDF p. 111.",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6022",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "A 36-year-old kidney recipient on cyclosporine returns for routine follow-up complaining of progressively enlarged gums interfering with eating. Dental clearance is complete and graft function is stable. He asks whether switching to tacrolimus is reasonable solely for this cosmetic mucosal problem. Which adverse effect pairing is consistent with standard CNI references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Cyclosporine is associated with gingival hypertrophy; switching to tacrolimus may be considered for this cosmetic side effect",
        "selects": null
      },
      {
        "id": "B",
        "text": "Cyclosporine never causes gingival changes; only tacrolimus does",
        "selects": null
      },
      {
        "id": "C",
        "text": "Gingival hypertrophy requires immediate graft nephrectomy",
        "selects": null
      },
      {
        "id": "D",
        "text": "CNIs have no cosmetic or mucosal side effects",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "References note cyclosporine-associated gingival hypertrophy as a common reason to switch to tacrolimus, alongside other CNI cosmetic effects such as hirsutism.",
    "rationaleIncorrect": {
      "B": "Gingival hypertrophy is described with cyclosporine, not exclusively with tacrolimus.",
      "C": "Gingival overgrowth is managed medically and may prompt CNI switching, not nephrectomy.",
      "D": "CNIs have recognized cosmetic and mucosal adverse effects."
    },
    "references": [
      {
        "citation": "Handbook of Kidney Transplantation, 6th ed. (Danovitch, 2017).",
        "locator": "Ch. 6 → Switching Calcineurin Inhibitors (cyclosporine gingival hypertrophy); PDF p. 173 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6023",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "recall",
    "organ": "general",
    "stem": "Your transplant quality coordinator is auditing timely OPTN follow-up submissions before a UNOS site survey. A heart recipient passed the six-month transplant anniversary last month and the annual date will occur next quarter. The data manager asks when organ-specific transplant recipient follow-up forms must be submitted. After a solid-organ transplant, when must a transplant hospital submit organ-specific transplant recipient follow-up (TRF) data to meet OPTN timely data requirements?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Within 90 days after the six-month and annual transplant anniversaries",
        "selects": null
      },
      {
        "id": "B",
        "text": "Only on the day of initial waitlist registration",
        "selects": null
      },
      {
        "id": "C",
        "text": "Within 1 day of every routine medication refill request",
        "selects": null
      },
      {
        "id": "D",
        "text": "Never; TRF forms are optional for transplant hospitals",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "OPTN Policy 18 requires transplant hospitals to submit organ-specific transplant recipient follow-up (TRF) within 90 days after the six-month and annual anniversary of the transplant date until death, graft failure, or planned graft removal.",
    "rationaleIncorrect": {
      "B": "Waitlist registration triggers TCR submission, not TRF; TRF follows transplant anniversaries.",
      "C": "Medication refill requests are not the TRF submission trigger.",
      "D": "TRF is a required timely data instrument for followed recipients."
    },
    "references": [
      {
        "citation": "OPTN/UNOS — Policies (HRSA).",
        "locator": "Policy 18.1 → Data Submission Requirements (organ-specific transplant recipient follow-up [TRF] within 90 days after six-month and annual anniversaries); PDF p. 332 (repo file-page index; printed margin may differ).",
        "url": "https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf#page=332"
      }
    ]
  },
  {
    "id": "cctc-6024",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "You are co-leading discharge medication teaching for a kidney recipient going home tomorrow on tacrolimus, mycophenolate, and prednisone. The social worker notes limited health literacy and no live-in caregiver for the first week. Pharmacy is available to support structured home management tools. Which structured adherence strategy aligns with standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "A day-and-hour medication box that may be pre-loaded by the pharmacist at discharge",
        "selects": null
      },
      {
        "id": "B",
        "text": "Storing all immunosuppressants in the bathroom medicine cabinet for convenience",
        "selects": null
      },
      {
        "id": "C",
        "text": "Taking critical-dose drugs at random times without regard to drug-level draws",
        "selects": null
      },
      {
        "id": "D",
        "text": "Avoiding any written medication roster because pictures are never helpful",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Structured medication management may include a medication box with day and hour subdivisions that can be pre-loaded by the pharmacist at discharge, along with a written roster and dosing reminders.",
    "rationaleIncorrect": {
      "B": "Medications should not be stored in humid areas such as the bathroom; correct storage is part of discharge teaching.",
      "C": "Critical-dose immunosuppressants must be taken at consistent times, especially around serum drug-level draws.",
      "D": "A written medication roster with pictures, times, and doses supports accurate home dosing."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → medication education → structured approach (day/hour medication box pre-loaded by pharmacist at discharge); PDF p. 107 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6025",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "You receive a worried call at midday from the mother of a 4-year-old kidney transplant recipient at home. She reports the child has produced no urine since waking four hours ago despite normal intake yesterday. The child is alert but the mother recalls prior teaching about vascular complications. How should the coordinator classify this finding?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "An urgent graft complication such as arterial thrombosis requiring immediate team contact",
        "selects": null
      },
      {
        "id": "B",
        "text": "A non-urgent finding that may wait until the next routine refill call",
        "selects": null
      },
      {
        "id": "C",
        "text": "Expected benign postoperative diuresis requiring no notification",
        "selects": null
      },
      {
        "id": "D",
        "text": "A reason to permanently stop immunosuppression without medical guidance",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "In pediatric kidney recipients, arterial thrombosis presents with sudden anuria and is often irreversible, resulting in graft loss; sudden anuria warrants urgent transplant team evaluation.",
    "rationaleIncorrect": {
      "B": "Sudden anuria after pediatric kidney transplant is an urgent graft concern, not a routine matter.",
      "C": "Anuria reflects possible vascular thrombosis rather than expected benign diuresis.",
      "D": "Urgent symptoms require team contact and evaluation rather than unilateral immunosuppression cessation."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 17 → kidney early complications → Thrombus → b.ii. (arterial thrombosis with sudden anuria; graft loss risk); PDF p. 901 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6026",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "general",
    "stem": "A 12-year post-transplant kidney recipient attends annual survivor clinic and asks where skin cancers most often develop in transplant populations. He works outdoors and has had several actinic keratoses treated on the scalp and arms. He wants focused counseling consistent with standard teaching. Which counseling point aligns with standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Sun-exposed areas of skin are the predominant location",
        "selects": null
      },
      {
        "id": "B",
        "text": "Squamous cell carcinoma occurs only on soles of the feet never exposed to light",
        "selects": null
      },
      {
        "id": "C",
        "text": "Only mucosal surfaces inside the mouth are ever affected",
        "selects": null
      },
      {
        "id": "D",
        "text": "Skin cancer in transplant recipients is limited to covered abdominal skin only",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Sun-exposed areas of skin are the predominant location of squamous cell carcinomas in transplant recipients, supporting sun-protection counseling.",
    "rationaleIncorrect": {
      "B": "Sun-exposed rather than strictly non-exposed sites are described as predominant.",
      "C": "Cutaneous sun-exposed sites are emphasized rather than oral mucosa alone.",
      "D": "Sun-exposed areas are cited as predominant rather than covered abdominal skin exclusively."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → health maintenance → Skin care (sun-exposed areas predominant for squamous cell carcinoma); PDF p. 118 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6027",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "kidney",
    "stem": "You are reviewing long-term complications with a 55-year-old liver transplant recipient seven years post-transplant on tacrolimus-based maintenance immunosuppression. Serial creatinine has slowly worsened and nephrology documented chronic kidney disease stage 3b. The patient asks whether medication-related kidney injury can ever require another transplant. Which outcome aligns with standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Renal dysfunction may progress to renal failure requiring kidney transplantation",
        "selects": null
      },
      {
        "id": "B",
        "text": "Immunosuppression prevents all renal dysfunction after nonrenal transplant",
        "selects": null
      },
      {
        "id": "C",
        "text": "Renal dysfunction never progresses beyond mild laboratory changes",
        "selects": null
      },
      {
        "id": "D",
        "text": "Kidney transplantation is never required for immunosuppression-related renal failure",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Long-term immunosuppression teaching notes that renal dysfunction may develop over time from medications, pre-existing kidney disease, infection, or hypovolemia and may progress to renal failure requiring kidney transplantation.",
    "rationaleIncorrect": {
      "B": "Calcineurin inhibitors and other factors contribute to renal dysfunction rather than preventing it.",
      "C": "Renal dysfunction may progress to renal failure in some recipients.",
      "D": "Kidney transplantation may be required when renal failure develops."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 3 → j. Long-term effects of immunosuppression → iv. Renal dysfunction (may progress to renal failure requiring kidney transplant); PDF p. 120 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  },
  {
    "id": "cctc-6028",
    "type": "one_best",
    "domain": 3,
    "domainName": "Post-operative Monitoring & Reporting",
    "domainShort": "Post-op",
    "cognitive": "application",
    "organ": "lung",
    "stem": "You are coordinating care for a 49-year-old bilateral lung transplant recipient hospitalized with bacterial pneumonia on the transplant unit. Chest radiograph shows a new infiltrate and he remains on supplemental oxygen but is hemodynamically stable. Nursing asks which positioning and activity interventions align with standard pneumonia management for transplant recipients. Which nursing intervention aligns with standard references?",
    "elements": null,
    "options": [
      {
        "id": "A",
        "text": "Reposition the patient every 2 hours and encourage activity if ambulatory",
        "selects": null
      },
      {
        "id": "B",
        "text": "Keep the patient in one position continuously to conserve energy",
        "selects": null
      },
      {
        "id": "C",
        "text": "Discourage coughing and deep breathing to prevent fatigue",
        "selects": null
      },
      {
        "id": "D",
        "text": "Oxygen saturation monitoring is unnecessary during bacterial pneumonia",
        "selects": null
      }
    ],
    "correct": "A",
    "rationaleCorrect": "Bacterial pneumonia management includes auscultation for respiratory changes, inhalation or percussive therapy, encouraging deep breathing and coughing, monitoring supplemental oxygen, and repositioning every 2 hours with activity when ambulatory.",
    "rationaleIncorrect": {
      "B": "Repositioning every 2 hours is recommended rather than maintaining one position continuously.",
      "C": "Deep breathing and coughing are encouraged rather than discouraged.",
      "D": "Oxygen saturation and supplemental oxygen are monitored during respiratory infection."
    },
    "references": [
      {
        "citation": "Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).",
        "locator": "Ch. 13 → bacterial infection → h.v. Bacterial pneumonia (reposition every 2 hours, encourage ambulatory activity); PDF p. 735 (repo file-page index; printed margin may differ).",
        "url": null
      }
    ]
  }
];
const DEMO_HISTORY = [
  {
    "id": "sample-0",
    "daysAgo": 18,
    "hour": 9,
    "mode": "study",
    "blueprint": "cctc-from-2026-07",
    "timeUsedSeconds": null,
    "breakdown": [
      {
        "domain": 1,
        "correct": 4,
        "total": 6
      },
      {
        "domain": 2,
        "correct": 3,
        "total": 6
      },
      {
        "domain": 3,
        "correct": 4,
        "total": 7
      }
    ]
  },
  {
    "id": "sample-1",
    "daysAgo": 15,
    "hour": 14,
    "mode": "exam",
    "blueprint": "cctc-from-2026-07",
    "timeUsedSeconds": 1920,
    "breakdown": [
      {
        "domain": 1,
        "correct": 4,
        "total": 6
      },
      {
        "domain": 2,
        "correct": 4,
        "total": 6
      },
      {
        "domain": 3,
        "correct": 4,
        "total": 7
      }
    ]
  },
  {
    "id": "sample-2",
    "daysAgo": 12,
    "hour": 20,
    "mode": "exam",
    "blueprint": "cctc-thru-2026-06",
    "timeUsedSeconds": 2160,
    "breakdown": [
      {
        "domain": 1,
        "correct": 5,
        "total": 6
      },
      {
        "domain": 2,
        "correct": 4,
        "total": 6
      },
      {
        "domain": 3,
        "correct": 4,
        "total": 7
      }
    ]
  },
  {
    "id": "sample-3",
    "daysAgo": 9,
    "hour": 11,
    "mode": "study",
    "blueprint": "cctc-from-2026-07",
    "timeUsedSeconds": null,
    "breakdown": [
      {
        "domain": 1,
        "correct": 6,
        "total": 6
      },
      {
        "domain": 2,
        "correct": 4,
        "total": 6
      },
      {
        "domain": 3,
        "correct": 4,
        "total": 7
      }
    ]
  },
  {
    "id": "sample-4",
    "daysAgo": 6,
    "hour": 19,
    "mode": "exam",
    "blueprint": "cctc-from-2026-07",
    "timeUsedSeconds": 2400,
    "breakdown": [
      {
        "domain": 1,
        "correct": 5,
        "total": 6
      },
      {
        "domain": 2,
        "correct": 5,
        "total": 6
      },
      {
        "domain": 3,
        "correct": 4,
        "total": 7
      }
    ]
  },
  {
    "id": "sample-5",
    "daysAgo": 3,
    "hour": 8,
    "mode": "exam",
    "blueprint": "cctc-from-2026-07",
    "timeUsedSeconds": 2640,
    "breakdown": [
      {
        "domain": 1,
        "correct": 6,
        "total": 6
      },
      {
        "domain": 2,
        "correct": 5,
        "total": 6
      },
      {
        "domain": 3,
        "correct": 4,
        "total": 7
      }
    ]
  }
];

window.CCTC_DATA = { DOMAINS: DOMAINS, BLUEPRINT: BLUEPRINT, DEMO_HISTORY: DEMO_HISTORY, QUESTIONS: QUESTIONS, SCENARIOS: (typeof SCENARIOS!=="undefined"?SCENARIOS:[]) };
})();
