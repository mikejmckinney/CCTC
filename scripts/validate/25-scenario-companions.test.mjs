import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENARIO_COMPANION_TARGET,
  SCENARIO_ID_MAX,
  SCENARIO_ID_MIN,
  buildScenarioCompanionSummary,
  validateScenarioCompanions,
} from '../validate/25-scenario-companions.mjs';

const parentItem = {
  id: 'cctc-2041',
  status: 'reviewed',
  type: 'one_best',
  domain: 2,
  task: '020400',
  knowledge_codes: ['020401'],
  cognitive_level: 'recall',
  stem: 'Parent',
  options: [{ id: 'A', text: 'A' }],
  correct: 'A',
  explanation: { rationale_correct: 'yes', rationale_incorrect: {} },
  references: [{ citation: 'Ref' }],
  primary_anchor: { type: 'url', section: 'Policy', keywords: ['wait', 'notification'], url: 'https://example.com' },
};

function location(file, itemId, itemIndex = 0) {
  return { file, itemIndex, itemId };
}

test('validateScenarioCompanions accepts a well-formed companion item', () => {
  const standardItems = [{ item: parentItem, location: location('questions/domain-2/batch.json', 'cctc-2041') }];
  const scenarioItems = [
    {
      item: {
        ...parentItem,
        id: 'cctc-6001',
        companion_of: 'cctc-2041',
        cognitive_level: 'application',
        stem: 'You are managing a heart transplant waitlist candidate who was just admitted for decompensated heart failure. The team asks which signs and symptoms you expect on exam. Which finding set is most likely?',
      },
      location: location('questions/scenario/domain-2-pretx/pilot.json', 'cctc-6001'),
    },
  ];

  const errors = [];
  const warnings = [];
  validateScenarioCompanions(scenarioItems, standardItems, errors, warnings);

  assert.deepEqual(errors, []);
});

test('validateScenarioCompanions rejects companion without companion_of', () => {
  const scenarioItems = [
    {
      item: { ...parentItem, id: 'cctc-6001' },
      location: location('questions/scenario/domain-2/pilot.json', 'cctc-6001'),
    },
  ];

  const errors = [];
  validateScenarioCompanions(scenarioItems, [], errors, []);
  assert.ok(errors.some((line) => line.includes('$.companion_of is required')));
});

test('validateScenarioCompanions rejects duplicate companions for one parent', () => {
  const standardItems = [{ item: parentItem, location: location('questions/domain-2/batch.json', 'cctc-2041') }];
  const scenarioItems = ['cctc-6001', 'cctc-6002'].map((id, index) => ({
    item: {
      ...parentItem,
      id,
      companion_of: 'cctc-2041',
      stem: `Scenario stem ${index}`,
    },
    location: location('questions/scenario/domain-2/pilot.json', id, index),
  }));

  const errors = [];
  validateScenarioCompanions(scenarioItems, standardItems, errors, []);
  assert.ok(errors.some((line) => line.includes('duplicate scenario companion')));
});

test('buildScenarioCompanionSummary reports progress toward target', () => {
  const summary = buildScenarioCompanionSummary(
    [{ item: { status: 'reviewed' } }, { item: { status: 'draft' } }],
    [{ item: { status: 'reviewed' } }],
  );

  assert.equal(summary.target, SCENARIO_COMPANION_TARGET);
  assert.equal(summary.companionReviewed, 1);
  assert.equal(summary.companionDraft, 1);
  assert.equal(summary.companionGap, SCENARIO_COMPANION_TARGET - 1);
  assert.equal(SCENARIO_ID_MIN, 6001);
  assert.equal(SCENARIO_ID_MAX, 6506);
});
