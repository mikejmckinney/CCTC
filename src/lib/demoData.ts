import type { HistoryEntry, SessionSettings, SessionResultBreakdown, Question, SessionItemSnapshot, ItemFlag } from '../types/exam';

const DEMO_DOMAINS = [
  { id: '1', label: 'Domain 1: Educator & Coordinator', examWeight: 33 },
  { id: '2', label: 'Domain 2: Pre-Transplant', examWeight: 39 },
  { id: '3', label: 'Domain 3: Post-Transplant Care', examWeight: 28 },
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBreakdown(baseScore: number): SessionResultBreakdown[] {
  return DEMO_DOMAINS.map((d) => {
    const total = randomBetween(30, 70);
    const drift = randomBetween(-12, 12);
    const pct = Math.min(100, Math.max(0, baseScore + drift));
    const correct = Math.round((pct / 100) * total);
    return { categoryId: d.id, categoryLabel: d.label, correct, total };
  });
}

function generateSettings(mode: 'exam' | 'study', questionCount: number): SessionSettings {
  return {
    blueprintId: 'cctc-from-2026-07',
    questionSet: 'standard',
    questionCount,
    timed: mode === 'exam',
    timeMinutes: mode === 'exam' ? 180 : 0,
    showTimer: true,
    mode,
    includeDrafts: mode === 'study',
    targetThreshold: 70,
  };
}

export function generateDemoHistory(): HistoryEntry[] {
  const sessions: Array<{ daysAgo: number; mode: 'exam' | 'study'; count: number; baseScore: number; duration: number }> = [
    { daysAgo: 35, mode: 'exam', count: 175, baseScore: 62, duration: 10200 },
    { daysAgo: 30, mode: 'study', count: 50, baseScore: 68, duration: 3600 },
    { daysAgo: 27, mode: 'exam', count: 175, baseScore: 65, duration: 10500 },
    { daysAgo: 23, mode: 'study', count: 25, baseScore: 72, duration: 1800 },
    { daysAgo: 20, mode: 'exam', count: 100, baseScore: 68, duration: 6600 },
    { daysAgo: 17, mode: 'study', count: 50, baseScore: 71, duration: 3300 },
    { daysAgo: 14, mode: 'exam', count: 175, baseScore: 74, duration: 9900 },
    { daysAgo: 11, mode: 'study', count: 30, baseScore: 76, duration: 2100 },
    { daysAgo: 8, mode: 'exam', count: 175, baseScore: 78, duration: 10080 },
    { daysAgo: 5, mode: 'study', count: 50, baseScore: 80, duration: 3000 },
    { daysAgo: 3, mode: 'exam', count: 175, baseScore: 82, duration: 9960 },
    { daysAgo: 1, mode: 'study', count: 25, baseScore: 85, duration: 1500 },
  ];

  return sessions.map((s, i) => {
    const date = new Date();
    date.setDate(date.getDate() - s.daysAgo);
    date.setHours(randomBetween(9, 21), randomBetween(0, 59));

    const breakdown = generateBreakdown(s.baseScore);
    const total = breakdown.reduce((sum, b) => sum + b.total, 0);
    const correct = breakdown.reduce((sum, b) => sum + b.correct, 0);
    const percent = Math.round((correct / total) * 100);

    const items: SessionItemSnapshot[] = [];
    for (let j = 0; j < Math.min(s.count, 20); j++) {
      const domain = DEMO_DOMAINS[j % 3];
      items.push({
        itemId: `demo-${i}-${j}`,
        question: {
          id: `q-${i}-${j}`,
          status: 'reviewed',
          type: j % 5 === 0 ? 'complex_combo' : 'one_best',
          domain: Number(domain.id) as 1 | 2 | 3,
          stem: `Demo question ${j + 1} for session ${i + 1}. This is a sample question about transplant coordination.`,
          options: [
            { id: 'a', text: 'Option A — correct answer' },
            { id: 'b', text: 'Option B — incorrect' },
            { id: 'c', text: 'Option C — incorrect' },
            { id: 'd', text: 'Option D — incorrect' },
          ],
          correct: 'a',
          explanation: {
            rationale_correct: 'This is the correct answer because...',
            rationale_incorrect: { b: 'Not correct because...', c: 'Not correct because...', d: 'Not correct because...' },
          },
          references: [{ citation: 'Sample Reference', url: 'https://example.com' }],
        } as Question,
        optionOrder: ['a', 'b', 'c', 'd'],
        categoryId: domain.id,
        categoryLabel: domain.label,
      });
    }

    const answers: Record<string, string | null> = {};
    for (const item of items) {
      answers[item.itemId] = Math.random() < (s.baseScore / 100) ? 'a' : 'b';
    }

    return {
      id: `demo-session-${i}`,
      completedAt: date.toISOString(),
      settings: generateSettings(s.mode, s.count),
      timeUsedSeconds: s.duration,
      itemIds: items.map((it) => it.itemId),
      items,
      answers,
      flaggedForReview: [],
      result: { correct, total, percent, estimatedPass: percent >= 70, breakdown },
    };
  });
}

export function generateDemoFlags(): ItemFlag[] {
  const now = new Date().toISOString();
  return [
    { id: 'flag-1', item_id: 'cctc-1042', version: 1, status: 'reviewed', reason: 'factual error', comment: 'The OPTN policy reference appears outdated after the 2025 revision.', session_id: 'demo-session-11', blueprint: 'cctc-from-2026-07', mode: 'exam', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), updatedAt: now },
    { id: 'flag-2', item_id: 'cctc-2087', version: 1, status: 'reviewed', reason: 'ambiguous / >1 defensible answer', comment: 'Both B and C could be correct depending on the clinical context.', session_id: 'demo-session-9', blueprint: 'cctc-from-2026-07', mode: 'study', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: now },
    { id: 'flag-3', item_id: 'cctc-3015', version: 1, status: 'reviewed', reason: 'typo / wording', comment: 'Missing word in the stem: "the patient" should be "the patient\'s".', session_id: 'demo-session-7', blueprint: 'cctc-from-2026-07', mode: 'exam', createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), updatedAt: now },
  ];
}
