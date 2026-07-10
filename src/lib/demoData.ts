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
 * Real questions. Each session's `items[]` is filled with snapshots of
 * real reviewed items drawn from the live bank, distributed across
 * domains in the same ratio as the session's per-domain breakdown.
 * `settings.questionCount` is set to the actual `items.length` so the
 * number shown in the session list matches what the user can review
 * (the previous fixture had 175q in settings but 50 items in review).
 */

const DEMO_DOMAINS = [
  { id: '1', label: 'D1: Education', examWeight: 33 },
  { id: '2', label: 'D2: Pre-Transplant', examWeight: 39 },
  { id: '3', label: 'D3: Post-Op', examWeight: 28 },
];

const SNAPSHOT_CAP = 50;

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

function pickWrongOption(question: Question, rand: () => number, excludeId: string): string {
  const wrong = question.options.filter((o) => o.id !== excludeId);
  if (wrong.length === 0) return excludeId;
  const idx = Math.floor(rand() * wrong.length);
  return wrong[idx].id;
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
  baseScore: number;
  duration: number;
}

const SESSION_SPECS: SessionSpec[] = [
  { index: 0, daysAgo: 35, mode: 'exam', baseScore: 62, duration: 10200 },
  { index: 1, daysAgo: 30, mode: 'study', baseScore: 68, duration: 3600 },
  { index: 2, daysAgo: 27, mode: 'exam', baseScore: 65, duration: 10500 },
  { index: 3, daysAgo: 23, mode: 'study', baseScore: 72, duration: 1800 },
  { index: 4, daysAgo: 20, mode: 'exam', baseScore: 68, duration: 6600 },
  { index: 5, daysAgo: 17, mode: 'study', baseScore: 71, duration: 3300 },
  { index: 6, daysAgo: 14, mode: 'exam', baseScore: 74, duration: 9900 },
  { index: 7, daysAgo: 11, mode: 'study', baseScore: 76, duration: 2100 },
  { index: 8, daysAgo: 8, mode: 'exam', baseScore: 78, duration: 10080 },
  { index: 9, daysAgo: 5, mode: 'study', baseScore: 80, duration: 3000 },
  { index: 10, daysAgo: 3, mode: 'exam', baseScore: 82, duration: 9960 },
  { index: 11, daysAgo: 1, mode: 'study', baseScore: 85, duration: 1500 },
];

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

  // Per-domain pool, deterministically shuffled.
  const byDomain = new Map<1 | 2 | 3, Question[]>();
  for (const q of bank) {
    if (q.status !== 'reviewed') continue;
    const list = byDomain.get(q.domain) ?? [];
    list.push(q);
    byDomain.set(q.domain, list);
  }

  return SESSION_SPECS.map((spec) => {
    const rand = mulberry32(0xCC1C0000 + spec.index);

    // Allocate items per domain to hit the target baseScore with a
    // reasonable per-domain split (D1: 33, D2: 39, D3: 28).
    const total = SNAPSHOT_CAP;
    const perDomainCount: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    for (let i = 0; i < total; i++) {
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
        const correct = perDomainCorrectRemaining[domainId] > 0;
        const optionOrder = q.options.map((o) => o.id);
        if (correct) {
          answers[q.id] = q.correct;
          perDomainCorrectRemaining[domainId]--;
        } else {
          answers[q.id] = pickWrongOption(q, rand, q.correct);
        }
        items.push({
          itemId: q.id,
          question: q,
          optionOrder,
          categoryId: d.id,
          categoryLabel: d.label,
        });
      }
    }

    const totalCorrect = breakdown.reduce((sum, b) => sum + b.correct, 0);
    const totalItems = breakdown.reduce((sum, b) => sum + b.total, 0);
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
 * These IDs must exist in the live bank; if any are absent the next
 * bootstrap will prune them via `pruneStaleFlags`.
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
