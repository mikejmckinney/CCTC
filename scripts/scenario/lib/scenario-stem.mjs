/**
 * Build 4–6 sentence scenario vignette stems from standard parent metadata.
 * Deterministic per parent id (variant index) for reproducible regeneration.
 */

function parseCctcNumericId(itemId) {
  const match = typeof itemId === 'string' ? itemId.match(/^cctc-(\d+)$/) : null;
  return match ? Number(match[1]) : null;
}

function variantIndex(parentId, modulo) {
  const numeric = parseCctcNumericId(parentId) ?? 0;
  return numeric % modulo;
}

function pick(list, parentId) {
  return list[variantIndex(parentId, list.length)];
}

const ORGAN_CONTEXT = {
  general: 'solid-organ transplant',
  kidney: 'kidney transplant',
  liver: 'liver transplant',
  lung: 'lung transplant',
  heart: 'heart transplant',
  kidney_pancreas: 'simultaneous pancreas-kidney transplant',
  pancreas: 'pancreas transplant',
  heart_lung: 'heart-lung transplant',
  intestine: 'intestinal transplant',
};

const AGE_SNAPSHOT = {
  adult: ['A 48-year-old', 'A 52-year-old', 'A 61-year-old', 'A 39-year-old', 'A 55-year-old'],
  pediatric: ['A 4-year-old', 'A 6-year-old', 'A 9-year-old', 'An 11-year-old', 'A 14-year-old'],
  both: ['A 45-year-old', 'A 58-year-old', 'A 50-year-old', 'A 63-year-old', 'A 41-year-old'],
};

function patientSnapshot(parent) {
  const age = pick(AGE_SNAPSHOT[parent.recipient_age] ?? AGE_SNAPSHOT.both, parent.id);
  const organ = ORGAN_CONTEXT[parent.organ] ?? ORGAN_CONTEXT.general;
  return `${age} ${organ} patient`;
}

function extractPrompt(parent) {
  const { stem, type } = parent;
  if (type === 'complex_combo') {
    const marker = 'Evaluate the following';
    const idx = stem.indexOf(marker);
    if (idx >= 0) {
      return stem.slice(idx);
    }
    return 'Evaluate the following statements:';
  }

  const questionMatch = stem.match(/([^.?!]*\?)\s*$/);
  if (questionMatch) {
    return questionMatch[1].trim();
  }
  return stem.trim();
}

const DOMAIN1_SETTINGS = [
  'covering the outpatient education clinic',
  'leading a pre-discharge teaching session',
  'on the afternoon coordinator phone line',
  'facilitating a group class for recipients and caregivers',
  'reviewing infection-prevention handouts before a home visit',
];

const DOMAIN2_SETTINGS = [
  'supporting the multidisciplinary selection meeting',
  'coordinating the pretransplant evaluation schedule',
  'on call for organ offer management',
  'updating waitlist education materials',
  'counseling a newly activated candidate and family',
];

const DOMAIN3_SETTINGS = [
  'rounding on the transplant unit',
  'reviewing results in post-transplant clinic',
  'taking an after-hours call from a recipient',
  'coordinating follow-up labs before the surgeon clinic',
  'leading discharge planning for a recipient going home tomorrow',
];

const DOMAIN1_TRIGGERS = [
  'The team wants teaching aligned with standard references before documentation is finalized.',
  'You must answer using program education materials rather than anecdote.',
  'Family members are present and ask for evidence-based guidance.',
  'The attending asks you to confirm the counseling point before it is charted.',
];

const DOMAIN2_TRIGGERS = [
  'The team must document counseling that matches OPTN policy and standard references.',
  'Selection conference is tomorrow and the chart needs accurate education notes.',
  'The candidate is anxious and requests a clear, reference-based explanation.',
  'Your program auditor flagged this topic for standardized teaching language.',
];

const DOMAIN3_TRIGGERS = [
  'Vital signs are stable, but the clinical picture still warrants coordinator input.',
  'Nursing escalated the question before the attending signs orders.',
  'The recipient is otherwise cooperative and wants guidance consistent with transplant references.',
  'You are asked to prioritize the next step using standard post-transplant teaching.',
];

function adaptCoordinatorOpener(stem) {
  const withoutPrompt = stem.split(/Evaluate the following/i)[0].trim();
  return withoutPrompt
    .replace(/^A coordinator is /i, 'You are ')
    .replace(/\.$/, '');
}

function buildComplexComboStem(parent) {
  const setup = adaptCoordinatorOpener(parent.stem);
  const audience = pick(
    [
      'Attendees will apply the material when fielding recipient calls.',
      'The module supports orientation for new coordinators.',
      'Slides must reflect standard references without copying source text.',
      'Statements will be checked against textbook and policy anchors.',
    ],
    parent.id,
  );
  const prompt = extractPrompt(parent);

  return `${setup}. ${audience} ${prompt}`;
}

function buildOneBestStem(parent) {
  const settings =
    parent.domain === 1
      ? DOMAIN1_SETTINGS
      : parent.domain === 2
        ? DOMAIN2_SETTINGS
        : DOMAIN3_SETTINGS;
  const triggers =
    parent.domain === 1
      ? DOMAIN1_TRIGGERS
      : parent.domain === 2
        ? DOMAIN2_TRIGGERS
        : DOMAIN3_TRIGGERS;

  const setting = pick(settings, parent.id);
  const snapshot = patientSnapshot(parent);
  const trigger = pick(triggers, parent.id);
  const prompt = extractPrompt(parent);

  const timeline =
    parent.domain === 3
      ? pick(
          [
            'It has been several weeks since transplant.',
            'The patient is in the first post-transplant month.',
            'This is a routine long-term follow-up visit.',
            'The patient was discharged within the past week.',
          ],
          parent.id,
        )
      : parent.domain === 2
        ? pick(
            [
              'Evaluation is underway and several consultants have already weighed in.',
              'Listing decisions are approaching and teaching must be accurate.',
              'The candidate completed initial screening last week.',
              'The workup is nearly complete pending coordinator counseling.',
            ],
            parent.id,
          )
        : pick(
            [
              'Education was started during the waiting period and continues after listing.',
              'The patient is preparing for upcoming surgery or early recovery.',
              'Teaching is being reinforced before a clinic return.',
              'The family completed initial orientation but has new questions today.',
            ],
            parent.id,
          );

  return `You are the transplant coordinator ${setting}. ${snapshot} is the focus of today's interaction. ${timeline} ${trigger} ${prompt}`;
}

export function buildScenarioStem(parent) {
  if (parent.type === 'complex_combo') {
    return buildComplexComboStem(parent);
  }
  return buildOneBestStem(parent);
}
