import type { HistoryEntry, SessionSettings, SessionResultBreakdown, Question, SessionItemSnapshot, ItemFlag, ExamMode } from '../types/exam';

/**
 * First-run sample data.
 *
 * 12 sessions spanning ~30 days, with progressively improving scores
 * (62 → 85) and a mix of exam / study modes / question counts. The point
 * is to give a brand-new user a populated dashboard so the headline
 * analytics (EMA readiness, weak areas, trend chart, recommended action)
 * have data to render against on first load.
 *
 * Determinism. Every session is keyed by an integer index (0..11). The
 * question-selection PRNG is seeded with that index, so the same session
 * always picks the same question IDs and the same correct/incorrect
 * distribution. Screenshots, e2e snapshots, and reproductions stay
 * comparable across runs and machines.
 *
 * No migration. Pre-existing demo entries (without `sample: true`) are
 * left as-is; users with old fixtures are exceedingly rare since this
 * redesign is not yet live. Adding a migration would just add code with
 * no users.
 *
 * Real questions, real counts. Each session's `items[]` holds the full
 * per-session question count (175, 100, 50, 25) — the original spec,
 * not a truncated subset. Settings.questionCount matches items.length
 * exactly, so the session list shows the same number as the Review
 * screen.
 *
 * Storage. items[] contains only the per-session metadata (itemId,
 * optionOrder, categoryId, categoryLabel). The full Question is NOT
 * embedded — it is resolved at render time from the bank via
 * `lookupQuestion(index, itemId)`. This keeps per-session storage at
 * O(items × 32 bytes) instead of O(items × 5KB).
 */

const DEMO_DOMAINS = [
  { id: '1', label: 'D1: Education', examWeight: 33 },
  { id: '2', label: 'D2: Pre-Transplant', examWeight: 39 },
  { id: '3', label: 'D3: Post-Op', examWeight: 28 },
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSettings(mode: ExamMode, questionCount: number): SessionSettings {
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

interface SessionSpec {
  index: number;
  daysAgo: number;
  mode: ExamMode;
  count: number;
  baseScore: number;
  duration: number;
}

const SESSION_SPECS: SessionSpec[] = [
  { index: 0,  daysAgo: 35, mode: 'exam',  count: 175, baseScore: 62, duration: 10200 },
  { index: 1,  daysAgo: 30, mode: 'study', count: 50,  baseScore: 68, duration: 3600 },
  { index: 2,  daysAgo: 27, mode: 'exam',  count: 175, baseScore: 65, duration: 10500 },
  { index: 3,  daysAgo: 23, mode: 'study', count: 25,  baseScore: 72, duration: 1800 },
  { index: 4,  daysAgo: 20, mode: 'exam',  count: 100, baseScore: 68, duration: 6600 },
  { index: 5,  daysAgo: 17, mode: 'study', count: 50,  baseScore: 71, duration: 3300 },
  { index: 6,  daysAgo: 14, mode: 'exam',  count: 175, baseScore: 74, duration: 9900 },
  { index: 7,  daysAgo: 11, mode: 'study', count: 30,  baseScore: 76, duration: 2100 },
  { index: 8,  daysAgo: 8,  mode: 'exam',  count: 175, baseScore: 78, duration: 10080 },
  { index: 9,  daysAgo: 5,  mode: 'study', count: 50,  baseScore: 80, duration: 3000 },
  { index: 10, daysAgo: 3,  mode: 'exam',  count: 175, baseScore: 82, duration: 9960 },
  { index: 11, daysAgo: 1,  mode: 'study', count: 25,  baseScore: 85, duration: 1500 },
];

interface BuildSessionArgs {
  spec: SessionSpec;
  byDomain: Map<1 | 2 | 3, Question[]>;
  rand: () => number;
}

function buildSessionItems({ spec, byDomain, rand }: BuildSessionArgs): {
  items: SessionItemSnapshot[];
  answers: Record<string, string | null>;
  breakdown: SessionResultBreakdown[];
  totalCorrect: number;
  totalItems: number;
} {
  // Per-domain item allocation: round-robin across the three domains so a
  // 175-item session gets ~58 / 68 / 49, a 25-item session gets ~9 / 10 / 6,
  // etc. Proportions match blueprint weights.
  const perDomainCount: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < spec.count; i++) {
    const domainId = ((i % 3) + 1) as 1 | 2 | 3;
    perDomainCount[domainId]++;
  }

  // Per-domain correct count, derived from baseScore with a small
  // deterministic drift so the breakdown isn't suspiciously uniform.
  const breakdown: SessionResultBreakdown[] = DEMO_DOMAINS.map((d) => {
    const domainId = Number(d.id) as 1 | 2 | 3;
    const t = perDomainCount[domainId];
    const drift = Math.floor(rand() * 7) - 3; // -3..+3
    const pct = Math.min(100, Math.max(0, spec.baseScore + drift));
    const c = Math.round((pct / 100) * t);
    return { categoryId: d.id, categoryLabel: d.label, correct: c, total: t };
  });

  const items: SessionItemSnapshot[] = [];
  const answers: Record<string, string | null> = {};
  const perDomainCorrectRemaining: Record<1 | 2 | 3, number> = {
    1: breakdown[0].correct,
    2: breakdown[1].correct,
    3: breakdown[2].correct,
  };

  for (const d of DEMO_DOMAINS) {
    const domainId = Number(d.id) as 1 | 2 | 3;
    const pool = (byDomain.get(domainId) ?? []).slice();
    // Deterministic shuffle of the pool for this session
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const need = perDomainCount[domainId];
    const picked = pool.slice(0, need);

    for (const q of picked) {
      const wantCorrect = perDomainCorrectRemaining[domainId] > 0;
      const wrong = q.options.filter((o) => o.id !== q.correct);
      const answer = wantCorrect
        ? q.correct
        : wrong.length > 0
          ? wrong[Math.floor(rand() * wrong.length)].id
          : q.correct;
      if (wantCorrect) {
        perDomainCorrectRemaining[domainId]--;
      }
      answers[q.id] = answer;
      items.push({
        itemId: q.id,
        optionOrder: q.options.map((o) => o.id),
        categoryId: d.id,
        categoryLabel: d.label,
      });
    }
  }

  const totalCorrect = breakdown.reduce((sum, b) => sum + b.correct, 0);
  const totalItems = breakdown.reduce((sum, b) => sum + b.total, 0);
  return { items, answers, breakdown, totalCorrect, totalItems };
}

/**
 * Build the deterministic 12-session sample history.
 *
 * @param bank Question[] — the live loaded bank. Must be non-empty.
 *   We pick from this set so every sample item is a real reviewed question.
 */
export function generateDemoHistory(bank: Question[]): HistoryEntry[] {
  if (bank.length === 0) {
    throw new Error('generateDemoHistory: bank is empty — cannot seed sample history without real questions.');
  }

  // Per-domain pool, sorted so the seed always picks the same questions.
  const byDomain = new Map<1 | 2 | 3, Question[]>();
  for (const q of bank) {
    if (q.status !== 'reviewed') continue;
    const list = byDomain.get(q.domain) ?? [];
    list.push(q);
    byDomain.set(q.domain, list);
  }
  for (const list of byDomain.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  return SESSION_SPECS.map((spec) => {
    const rand = mulberry32(0xCC1C0000 + spec.index);
    const { items, answers, breakdown, totalCorrect, totalItems } = buildSessionItems({ spec, byDomain, rand });
    const percent = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

    const date = new Date();
    date.setDate(date.getDate() - spec.daysAgo);
    date.setHours(9 + Math.floor(rand() * 12), Math.floor(rand() * 60));

    return {
      id: `sample-session-${spec.index}`,
      completedAt: date.toISOString(),
      settings: generateSettings(spec.mode, totalItems),
      timeUsedSeconds: spec.duration,
      itemIds: items.map((it) => it.itemId),
      items,
      answers,
      flaggedForReview: [],
      result: { correct: totalCorrect, total: totalItems, percent, estimatedPass: percent >= 70, breakdown },
      sample: true,
    };
  });
}

/**
 * Three deterministic sample flags pointing at real items from the bank.
 * If any target id is missing from the live bank, it is silently dropped
 * (the bootstrap pruner would strip it anyway).
 */
export function generateDemoFlags(bank: Question[]): ItemFlag[] {
  const now = new Date().toISOString();
  const pickExisting = (id: string): Question | undefined => bank.find((q) => q.id === id);
  const targets: Array<{ itemId: string; reason: ItemFlag['reason']; comment: string; sessionId: string; mode: ExamMode; daysAgo: number }> = [
    { itemId: 'cctc-1042', reason: 'factual error', comment: 'The OPTN policy reference appears outdated after the 2025 revision.', sessionId: 'sample-session-11', mode: 'exam', daysAgo: 5 },
    { itemId: 'cctc-2087', reason: 'ambiguous / >1 defensible answer', comment: 'Both B and C could be correct depending on the clinical context.', sessionId: 'sample-session-9', mode: 'study', daysAgo: 3 },
    { itemId: 'cctc-3015', reason: 'typo / wording', comment: 'Missing word in the stem: "the patient" should be "the patient\'s".', sessionId: 'sample-session-7', mode: 'exam', daysAgo: 1 },
  ];
  const result: ItemFlag[] = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const q = pickExisting(t.itemId);
    if (!q) continue;
    result.push({
      id: `sample-flag-${i + 1}`,
      item_id: q.id,
      version: q.version ?? 1,
      status: q.status,
      reason: t.reason,
      comment: t.comment,
      session_id: t.sessionId,
      blueprint: 'cctc-from-2026-07',
      mode: t.mode,
      createdAt: new Date(Date.now() - t.daysAgo * 86400000).toISOString(),
      updatedAt: now,
    });
  }
  return result;
}
