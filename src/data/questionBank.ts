import type { LoadedBank, Question } from '../types/exam';

const questionModules = import.meta.glob('../../questions/**/*.json', {
  eager: true,
  import: 'default'
}) as Record<string, Question[]>;

const SCENARIO_COMPANION_TARGET = 506;

function pathSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function isExcludedQuestionPath(path: string): boolean {
  return pathSegments(path).some((segment) => segment.startsWith('_') || segment === '.verification');
}

function isScenarioQuestionPath(path: string): boolean {
  return pathSegments(path).includes('scenario');
}

function isStandardQuestionPath(path: string): boolean {
  return !isExcludedQuestionPath(path) && !isScenarioQuestionPath(path);
}

function flattenQuestionModules(entries: Array<[string, Question[]]>): Question[] {
  return entries.flatMap(([, questions]) => questions);
}

const BOOTSTRAP_NOTES = [
  'Only example questions are available right now, so sessions use the worked examples until reviewed shards are added under questions/.',
  'The loader is already prepared to switch to non-underscore question shards automatically once they exist.'
];

const EMPTY_SCENARIO_NOTES = [
  `Scenario companion bank is empty (0/${SCENARIO_COMPANION_TARGET}). Author companions under questions/scenario/ with ids cctc-6001–cctc-6506 and companion_of pointing at a standard item.`,
];

export function resolveLoadedBank(primaryQuestions: Question[], exampleQuestions: Question[]): LoadedBank {
  if (primaryQuestions.length > 0) {
    return {
      questions: primaryQuestions,
      notes: []
    };
  }

  return {
    questions: exampleQuestions,
    notes: BOOTSTRAP_NOTES
  };
}

export interface QuestionBanks {
  standard: LoadedBank;
  scenario: LoadedBank;
}

export function loadQuestionBanks(): QuestionBanks {
  const allEntries = Object.entries(questionModules);
  const standardEntries = allEntries.filter(([path]) => isStandardQuestionPath(path));
  const scenarioEntries = allEntries.filter(([path]) => isScenarioQuestionPath(path) && !isExcludedQuestionPath(path));
  const exampleEntries = allEntries.filter(([path]) => path.includes('/_examples/'));

  const scenarioQuestions = flattenQuestionModules(scenarioEntries);

  return {
    standard: resolveLoadedBank(flattenQuestionModules(standardEntries), flattenQuestionModules(exampleEntries)),
    scenario: {
      questions: scenarioQuestions,
      notes:
        scenarioQuestions.length === 0
          ? EMPTY_SCENARIO_NOTES
          : [`Scenario companion bank: ${scenarioQuestions.length}/${SCENARIO_COMPANION_TARGET} item(s) loaded.`]
    }
  };
}

export function loadQuestionBank(): LoadedBank {
  return loadQuestionBanks().standard;
}

export function buildQuestionVersionMap(questions: Question[]): Map<string, number> {
  return new Map(questions.map((question) => [question.id, question.version ?? 1]));
}
