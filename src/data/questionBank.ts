import type { LoadedBank, Question } from '../types/exam';

const questionModules = import.meta.glob('../../questions/**/*.json', {
  eager: true,
  import: 'default'
}) as Record<string, Question[]>;

function pathSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function isUnderscorePath(path: string): boolean {
  return pathSegments(path).some((segment) => segment.startsWith('_'));
}

function flattenQuestionModules(entries: Array<[string, Question[]]>): Question[] {
  return entries.flatMap(([, questions]) => questions);
}

const BOOTSTRAP_NOTES = [
  'Only example questions are available right now, so sessions use the worked examples until reviewed shards are added under questions/.',
  'The loader is already prepared to switch to non-underscore question shards automatically once they exist.'
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

export function loadQuestionBank(): LoadedBank {
  const allEntries = Object.entries(questionModules);
  const primaryEntries = allEntries.filter(([path]) => !isUnderscorePath(path));
  const exampleEntries = allEntries.filter(([path]) => path.includes('/_examples/'));

  return resolveLoadedBank(flattenQuestionModules(primaryEntries), flattenQuestionModules(exampleEntries));
}

export function buildQuestionVersionMap(questions: Question[]): Map<string, number> {
  return new Map(questions.map((question) => [question.id, question.version ?? 1]));
}
